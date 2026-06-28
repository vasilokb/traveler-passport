// tools/check-mutations.mjs
// Gate Phase C: в src/app/main.js не должно остаться прямых мутаций state
// (state.X = Y, state.X[Y] = Z, delete state.X[Y]). Все мутации обязаны идти через
// store.setState(...). Локальные `var state = store.getState()` (read-снимки) НЕ
// матчатся — regex ловит только присваивание/удаление. Строки-комментарии исключаются.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mainJsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'app',
  'main.js'
);

const mainJs = readFileSync(mainJsPath, 'utf-8');

// Ищем: state.X = Y | state.X[Y] = Z | state.X.push | state.X.splice | delete state.X
const mutationRegex = /\bstate\.\w+\s*(?:\[[^\]]+\])?\s*(?:=(?!=)|\.push\(|\.splice\()/g;
const deleteRegex = /\bdelete\s+state\.\w+/g;

const lines = mainJs.split('\n');
const violations = [];

function scan(regex, label) {
  const matches = [...mainJs.matchAll(regex)];
  for (const m of matches) {
    const lineNum = mainJs.slice(0, m.index).split('\n').length;
    const line = lines[lineNum - 1];
    // Исключаем строки-комментарии.
    if (line.trim().startsWith('//')) continue;
    violations.push({ lineNum, label, snippet: line.trim() });
  }
}

scan(mutationRegex, 'mutation');
scan(deleteRegex, 'delete');

if (violations.length > 0) {
  console.error(`check-mutations: найдено ${violations.length} прямых мутаций state в main.js:`);
  for (const v of violations) {
    console.error(`  строка ${v.lineNum} [${v.label}]: ${v.snippet}`);
  }
  process.exit(1);
}
console.log('check-mutations: OK — нет прямых мутаций state в main.js');
process.exit(0);
