// tools/check-imports.mjs
// Проверяет направление импортов (правило FSD §0.1):
//   shared   → только внутри shared
//   entities → shared (НЕ entities→entities, НЕ lib, НЕ app)
//   lib      → shared, entities
//   app      → любой
// Разрешение алиасов (@shared, @entities, @lib, @app) и относительных путей.
// Нарушение = exit 1.

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

const ALIASES = {
  '@app': path.join(SRC, 'app'),
  '@widgets': path.join(SRC, 'widgets'),
  '@features': path.join(SRC, 'features'),
  '@entities': path.join(SRC, 'entities'),
  '@shared': path.join(SRC, 'shared'),
  '@lib': path.join(SRC, 'lib'),
};

// Категория слоя для файла. null = вне слоёв (например, сам tools/).
function layerOf(absPath) {
  const rel = path.relative(SRC, absPath).replace(/\\/g, '/');
  if (rel.startsWith('shared/')) return 'shared';
  if (rel.startsWith('entities/')) return 'entities';
  if (rel.startsWith('lib/')) return 'lib';
  if (rel.startsWith('app/')) return 'app';
  if (rel.startsWith('widgets/')) return 'widgets';
  if (rel.startsWith('features/')) return 'features';
  return null;
}

// Резолв строки импорта в абсолютный путь (если это локальный модуль).
function resolveImport(spec, fromFile) {
  // Bare-алиас
  for (const alias of Object.keys(ALIASES)) {
    if (spec === alias || spec.startsWith(alias + '/')) {
      const rest = spec.slice(alias.length);
      return path.join(ALIASES[alias], rest);
    }
  }
  // npm-пакет (без ./ ../ и без расширения) — пропускаем
  if (!spec.startsWith('.') && !spec.startsWith('/')) {
    return null;
  }
  const base = path.resolve(path.dirname(fromFile), spec);
  return base;
}

const IMPORT_RE = /(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g;

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (/\.(js|mjs)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];

const files = await walk(SRC, []);

for (const file of files) {
  const layer = layerOf(file);
  if (!layer) continue; // вне слоёв — не проверяем
  const src = await readFile(file, 'utf8');
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[1];
    const target = resolveImport(spec, file);
    if (!target) continue; // npm-пакет
    const targetLayer = layerOf(target);
    if (!targetLayer) continue;
    const ok = allowed(layer, targetLayer);
    if (!ok) {
      violations.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        spec,
        from: layer,
        to: targetLayer,
      });
    }
  }
}

function allowed(from, to) {
  if (from === to) return true; // внутри одного слоя всегда OK
  switch (from) {
    case 'shared':
      return to === 'shared';
    case 'entities':
      return to === 'shared'; // НЕ entities, НЕ lib, НЕ app
    case 'lib':
      return to === 'shared' || to === 'entities';
    case 'app':
      return true;
    case 'widgets':
    case 'features':
      return true;
    default:
      return false;
  }
}

if (violations.length) {
  console.error('check-imports: найдены нарушения направления импортов (FSD §0.1):');
  for (const v of violations) {
    console.error(`  ${v.file}: "${v.spec}"  [${v.from} → ${v.to}]`);
  }
  console.error(`\nВсего нарушений: ${violations.length}`);
  process.exit(1);
}

console.log('check-imports: OK — нарушений направления импортов нет.');
process.exit(0);
