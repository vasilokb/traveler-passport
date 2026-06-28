// tools/check-xss.mjs
// Best-effort XSS regression guard для HTML-генерирующих модулей: src/app/main.js
// (рендеры виджетов до Phase D2) + feature-модули search/build.js и stamps/overlay.js
// (переименованы из main.js в Phase D1). argv[2] — override одного файла.
// Ищет потенциально небезопасные интерполяции в конструкциях:
//   html += <expr>            ;   (присваивание-накопление HTML-строки)
//   .innerHTML = <expr>       ;
//   insertAdjacentHTML(..., <expr>)
// и проверяет, что каждый интерполируемый «операнд» (по «+» на верхнем уровне,
// с учётом строковых литералов, скобок и тернарных операторов) ссылается
// только на безопасные источники: строковый литерал, число, escapeHtml(...),
// whitelisted-функцию (возвращает безопасный HTML/SVG/текст/число),
// либо на whitelisted-контролируемую переменную (данные CITIES/REGIONS,
// tier-константы, накопленная переменная `html`).
//
// ⚠️ Это НЕ статический анализатор потока данных. Назначение — ловить
// регрессии (новую небезопасную интерполяцию), а не гарантировать отсутствие
// XSS. Истинный аудит выполняется человеком по результатам сканера.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = process.argv[2] || path.join(ROOT, 'src/app/main.js');

// Whitelisted функции — возвращают безопасный (не пользовательский) HTML/SVG/текст/число.
const SAFE_FUNCS = new Set([
  // экранирование
  'escapeHtml',
  // генерация безопасного SVG/HTML из контролируемых данных
  'createStampSVG', 'computeStarPoints',
  // метки/числа из контролируемых tier-данных
  'getTierLabel', 'getTierEmoji', 'formatDateDisplay', 'getPluralSights',
  'getCheckedCount', 'getSightsCount', 'hasChecklist',
  // функции main.js, возвращающие собранную/контролируемую HTML-строку
  'buildHtml', 'renderChecklist',
]);

// Whitelisted идентификаторы — контролируемые значения (данные CITIES/REGIONS/SIGHTS,
// числа, tier-константы, накопленная HTML-строка, статичные SVG-константы).
// НЕ включает пользовательский ввод (travelerName, cityNotes, описания, имена достопримечательностей,
// названия городов) — те обязаны идти через escapeHtml.
const SAFE_IDENTS = new Set([
  // накопленная HTML-строка (собрана из безопасных чанков)
  'html',
  // tier-константы и результаты getCityTier
  'tier', 'cityTier', 'capTier', 'hasSights',
  // классовые/стилевые строки, собранные из контролируемых данных
  'regionColor', 'itemClass', 'stampTierClass', 'disabled', 'checkedClass',
  // числовая статистика (computed из state/CITIES/SIGHTS)
  'totalVisited', 'totalCities', 'totalPct', 'totalPlanned',
  'goldCount', 'silverCount', 'bronzeCount',
  'regionVisited', 'regionTotal', 'regionPct', 'regionPercent', 'pct',
  'sightsCount', 'checkedCount', 'totalCount', 'totalChecked',
  'visitCount', 'progressPct', 'percent', 'allCount', 'planCount', 'plannedCount',
  // id (контролируются статичными CITIES/SIGHTS)
  'cityId', 'today',
  // статичные SVG-константы main.js
  'svgCheck', 'svgBookmarkFilled', 'svgMedalFilled', 'svgMedal', 'svgBookmarkOutlined',
  // булевы/режимные флаги (в тернарных — ветки строки)
  'isVisited', 'capVisited', 'isChecked', 'isDefault', 'hasChecklistFlag',
  // контролируемая иконка-константа
  'statusIcon', 'notePlaceholder',
]);

// Свойства контролируемых объектов (region.*, city.* из статичных данных).
const SAFE_PROP_ROOTS = new Set(['region', 'capRegion', 'city', 'capCity', 'sight', 'visit']);
// region.name — статичные REGIONS (безопасно). city.name/description — НЕТ (escapeHtml).
const SAFE_REGION_PROPS = new Set(['id', 'color', 'name']);

// --- Строково-ориентированные помощники (string-aware) ---

// Идёт по expr с позиции i, отслеживая строковые литералы и глубину скобок.
// Возвращает true, если на верхнем уровне (depth 0, вне строк) встречается sep.
function splitTopLevel(expr, sep) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let strCh = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (strCh) {
      cur += c;
      if (c === '\\') { cur += expr[i + 1] || ''; i++; continue; }
      if (c === strCh) strCh = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { strCh = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; cur += c; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; cur += c; continue; }
    if (depth === 0 && c === sep) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function depthAtTop(expr) {
  // Проверяет, сбалансированы ли скобки и нет ли «висящих» строк.
  let depth = 0, strCh = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (strCh) {
      if (c === '\\') { i++; continue; }
      if (c === strCh) strCh = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { strCh = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
  }
  return depth === 0 && strCh === null;
}

function stripOuterParens(expr) {
  let s = expr.trim();
  while (s.startsWith('(') && s.endsWith(')')) {
    // Проверить, что внешние скобки — парные (а не (a) + b)).
    let depth = 0, strCh = null, matched = true;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (strCh) {
        if (c === '\\') { i++; continue; }
        if (c === strCh) strCh = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { strCh = c; continue; }
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0 && i !== s.length - 1) { matched = false; break; }
      }
    }
    if (matched) s = s.slice(1, -1).trim(); else break;
  }
  return s;
}

// Классификация одного операнда (после stripOuterParens и учёта тернара).
function isSafeOperand(expr) {
  const s = expr.trim();
  if (!s) return true;
  // Строковый литерал
  if (/^(['"`])(?:\\.|.)*\1$/.test(s)) return true;
  // Число (возможно с %)
  if (/^-?\d+(\.\d+)?%?$/.test(s)) return true;
  // Вызов функции: name(...)
  const callM = s.match(/^([A-Za-z_$][\w$]*)\s*\([\s\S]*\)$/);
  if (callM && SAFE_FUNCS.has(callM[1])) return true;
  // Идентификатор или доступ к свойству
  const identM = s.match(/^([A-Za-z_$][\w$]*)((?:\.[A-Za-z_$][\w$]*)*)$/);
  if (identM) {
    const base = identM[1];
    const props = identM[2] ? identM[2].slice(1).split('.') : [];
    if (SAFE_IDENTS.has(base) && props.length === 0) return true;
    if (SAFE_PROP_ROOTS.has(base)) {
      if (base === 'region' || base === 'capRegion') {
        return props.length === 1 && SAFE_REGION_PROPS.has(props[0]);
      }
      // city.id / capCity.id / sight.id — id контролируется статичными CITIES/SIGHTS
      if (base === 'city' || base === 'capCity' || base === 'sight') {
        return props.length === 1 && props[0] === 'id';
      }
      // visit.date — дата в формате YYYY-MM-DD (контролируется валидацией loadState)
      if (base === 'visit') {
        return props.length === 1 && props[0] === 'date';
      }
    }
    return false;
  }
  return false;
}

// Рекурсивный сбор «небезопасных» подвыражений. expr — выражение (без outer-присваивания).
// Обрабатывает: конкатенацию по «+», тернар «cond ? a : b» (ветки проверяются независимо),
// оборачивающие скобки, и итоговую классификацию операнда.
function gatherUnsafe(expr, out) {
  let s = expr.trim();
  if (!s) return;
  s = stripOuterParens(s);
  // Тернар на верхнем уровне — проверять ПЕРВЫМ (до «+»), иначе «+» внутри веток
  // разобьёт выражение неправильно.
  if (indexOfTopLevel(s, '?') !== -1) {
    const qIdx = indexOfTopLevel(s, '?');
    const rest = s.slice(qIdx + 1);
    // Ветки разделены первой верхнеуровневой «:».
    const colonIdx = indexOfTopLevel(rest, ':');
    if (colonIdx !== -1) {
      const a = rest.slice(0, colonIdx);
      const b = rest.slice(colonIdx + 1);
      gatherUnsafe(a, out);
      gatherUnsafe(b, out);
      return;
    }
  }
  // Конкатенация на верхнем уровне — разбить и анализировать каждую часть.
  const plusParts = splitTopLevel(s, '+');
  if (plusParts.length > 1) {
    for (const p of plusParts) gatherUnsafe(p, out);
    return;
  }
  // Одиночный операнд — классифицировать.
  if (!isSafeOperand(s)) out.push(s);
}

function indexOfTopLevel(expr, sep) {
  let depth = 0, strCh = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (strCh) {
      if (c === '\\') { i++; continue; }
      if (c === strCh) strCh = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { strCh = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && c === sep) return i;
  }
  return -1;
}

// Извлечь RHS выражения интерполяции, начиная с позиции оператора.
// rhsStart — индекс символа сразу после оператора присваивания / открывающей скобки insertAdjacentHTML.
// Возвращает { expr, endLine } с учётом строковых литералов.
function extractRhs(text, rhsStart, mode) {
  // mode: 'assign' — до верхнего ';'; 'call' — до верхнего ')', балансируя открытую скобку insertAdjacentHTML
  let i = rhsStart;
  let strCh = null;
  let depth = 0;
  const start = i;
  while (i < text.length) {
    const c = text[i];
    if (strCh) {
      if (c === '\\') { i += 2; continue; }
      if (c === strCh) strCh = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { strCh = c; i++; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; i++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (mode === 'call' && depth === 0) break; // закрытие скобки insertAdjacentHTML
      depth--; i++; continue;
    }
    if (mode === 'assign' && depth === 0 && c === ';') break;
    i++;
  }
  return text.slice(start, i);
}

// --- Сканирование ---

// Файлы, генерирующие HTML-строки/записывающие innerHTML. По умолчанию — main.js
// (рендеры виджетов до Phase D2) + feature-модули, переименованные из main.js в
// Phase D1 (search/build.js, stamps/overlay.js). argv[2] — override одного файла
// (обратная совместимость).
const DEFAULT_TARGETS = [
  path.join(ROOT, 'src/app/main.js'),
  path.join(ROOT, 'src/features/search/build.js'),
  path.join(ROOT, 'src/features/stamps/overlay.js'),
];

const TARGETS = process.argv[2] ? [path.resolve(process.argv[2])] : DEFAULT_TARGETS;

const allViolations = [];

const RE_ASSIGN = /(\bhtml\s*\+=|\.innerHTML\s*=)/g;
const RE_CALL = /insertAdjacentHTML\s*\(/g;

function processAssign(src, re, mode, targetPath, violations) {
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(src)) !== null) {
    const matchEnd = m.index + m[0].length;
    const rhs = extractRhs(src, matchEnd, mode);
    const lineNo = src.slice(0, m.index).split('\n').length;
    const unsafe = [];
    gatherUnsafe(rhs, unsafe);
    if (unsafe.length) {
      violations.push({
        file: path.relative(ROOT, targetPath).replace(/\\/g, '/'),
        line: lineNo,
        header: src.split('\n')[lineNo - 1].trim().slice(0, 90),
        findings: unsafe,
      });
    }
  }
}

function processInsertAdjacentHTML(src, targetPath, violations) {
  let m;
  RE_CALL.lastIndex = 0;
  while ((m = RE_CALL.exec(src)) !== null) {
    const openParen = m.index + m[0].length - 1; // позиция '('
    let i = openParen + 1, depth = 0, strCh = null, commaIdx = -1;
    while (i < src.length) {
      const c = src[i];
      if (strCh) {
        if (c === '\\') { i += 2; continue; }
        if (c === strCh) strCh = null;
        i++; continue;
      }
      if (c === '"' || c === "'" || c === '`') { strCh = c; i++; continue; }
      if (c === '(' || c === '[' || c === '{') { depth++; i++; continue; }
      if (c === ')' || c === ']' || c === '}') {
        if (depth === 0) break;
        depth--; i++; continue;
      }
      if (depth === 0 && c === ',') { commaIdx = i; break; }
      i++;
    }
    if (commaIdx === -1) continue;
    const rhs = extractRhs(src, commaIdx + 1, 'call');
    const lineNo = src.slice(0, m.index).split('\n').length;
    const unsafe = [];
    gatherUnsafe(rhs, unsafe);
    if (unsafe.length) {
      violations.push({
        file: path.relative(ROOT, targetPath).replace(/\\/g, '/'),
        line: lineNo,
        header: src.split('\n')[lineNo - 1].trim().slice(0, 90),
        findings: unsafe,
      });
    }
  }
}

for (const target of TARGETS) {
  let src;
  try {
    src = await readFile(target, 'utf8');
  } catch {
    // Файла может не быть (напр. argv override) — пропускаем.
    continue;
  }
  processAssign(src, RE_ASSIGN, 'assign', target, allViolations);
  processInsertAdjacentHTML(src, target, allViolations);
}

const violations = allViolations;

if (violations.length) {
  console.error('check-xss: потенциально небезопасные интерполяции:');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}: ${v.header}`);
    for (const f of v.findings) {
      console.error(`        → подозрительный операнд: ${f.slice(0, 100)}`);
    }
  }
  console.error(`\nВсего подозрительных мест: ${violations.length}`);
  console.error('Если операнд контролируем (статичные данные/число) — добавьте идентификатор');
  console.error('в SAFE_IDENTS / SAFE_FUNCS в tools/check-xss.mjs либо оберните в escapeHtml(...).');
  process.exit(1);
}

console.log('check-xss: OK — небезопасных интерполяций не найдено (' + TARGETS.map(t => path.relative(ROOT, t).replace(/\\/g, '/')).join(', ') + ').');
process.exit(0);
