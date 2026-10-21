import { readFile, readdir, lstat } from 'node:fs/promises';
import { join, resolve, extname, relative, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sampleMarkers = [
  /\b(?:TodoExampleClient|TodoOwnerPredicate|TodoOwnerPolicy)\b/,
  /\b(?:listTodos|createTodo|updateTodo|deleteTodo|parseTodo)\b/,
  /(?:todo-form|id=["']todos["']|No Todos yet|001-todos\.sql)/,
  /\btodos\s*[:({]/,
  /(?:\bdbo\s*\.\s*Todos\b|\[\s*dbo\s*\]\s*\.\s*\[\s*Todos\s*\])/i,
  /\/api\/Todo\b/,
  /examples[\\/]+todo/,
];

const requiredDesignStates = [
  'signed-out', 'no-access', 'first-run', 'empty', 'single-record',
  'populated', 'saving', 'error', 'success', 'disabled',
];

async function optionalFile(path) {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
}

function reviewRows(content) {
  const rows = new Map();
  let inMatrix = false;
  let found = false;
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) { inMatrix = false; continue; }
    const cells = line.trim().slice(1, -1).split('|').map(value => value.trim());
    if (cells.length === 3 && cells.join('|').toLowerCase() === 'state|desktop|narrow') {
      inMatrix = true;
      found = true;
      continue;
    }
    if (!inMatrix || cells.every(value => /^:?-+:?$/.test(value))) continue;
    if (cells.length !== 3) throw new Error('Invalid docs/design-review.md: coverage rows need State, Desktop and Narrow cells.');
    const state = cells[0].toLowerCase();
    if (rows.has(state)) throw new Error(`Invalid docs/design-review.md: duplicate ${cells[0]} row.`);
    rows.set(state, cells.slice(1));
  }
  return found ? rows : undefined;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function designReport(coverage, intentPresent, reviewPresent) {
  const coverageLine = coverage === undefined ? 'not summarized; no state matrix recorded' : coverage.blocked ?
    `blocked: ${plural(coverage.blocked, 'cell')}${coverage.unreviewed ? `; ${coverage.unreviewed} unreviewed` : ''}` :
    coverage.unreviewed ? `partial: ${plural(coverage.unreviewed, 'unreviewed cell')}` :
      `complete (${plural(coverage.reviewed, 'reviewed cell')})`;
  return [
    `Rendered coverage: ${coverageLine}.`,
    `Design evidence: intent ${intentPresent ? 'recorded' : 'missing'}; review ${reviewPresent ? 'recorded' : 'missing'} (content not validated).`,
    'Visual direction approval: not assessed by this check; report user feedback separately from agent assessment.',
  ];
}

function validateReviewCell(value, state, viewport) {
  if (!value) return 'unreviewed';
  if (value === 'observed' || value === 'fixed+re-reviewed' || /^n\/a:\s+\S/i.test(value)) return 'reviewed';
  if (/^blocked:\s+\S/i.test(value)) return 'blocked';
  throw new Error(`Invalid docs/design-review.md: ${state} ${viewport} has unsupported status "${value}".`);
}

async function designReviewStatus(root, content) {
  const rows = content === undefined ? undefined : reviewRows(content);
  if (!rows) return undefined;
  let required = [...requiredDesignStates];
  const roleConfig = await optionalFile(join(root, 'role-based-data.json'));
  if (roleConfig) {
    const parsed = JSON.parse(roleConfig);
    if (typeof parsed.requiredRole === 'string' && parsed.requiredRole.trim()) {
      required.push(`role: ${parsed.requiredRole.trim()}`);
    }
  }
  let reviewed = 0;
  let blocked = 0;
  let unreviewed = 0;
  for (const state of required) {
    const cells = rows.get(state.toLowerCase()) ?? ['', ''];
    for (const [index, viewport] of ['desktop', 'narrow'].entries()) {
      const status = validateReviewCell(cells[index], state, viewport);
      if (status === 'reviewed') reviewed++;
      else if (status === 'blocked') blocked++;
      else unreviewed++;
    }
  }
  return { reviewed, blocked, unreviewed };
}

async function filesBelow(root, optional = false) {
  let info;
  try { info = await lstat(root); }
  catch (error) { if (optional && error.code === 'ENOENT') return []; throw error; }
  if (!info.isDirectory()) throw new Error(`Expected design template directory: ${root}`);
  const files = [];
  async function visit(path) {
    for (const child of await readdir(path)) {
      const full = join(path, child);
      const childInfo = await lstat(full);
      if (childInfo.isSymbolicLink()) throw new Error(`Design template paths must not be symlinks: ${full}`);
      if (childInfo.isDirectory()) await visit(full);
      else if (childInfo.isFile()) files.push(relative(root, full).replaceAll('\\', '/'));
    }
  }
  await visit(root);
  return files.sort();
}

async function differentTrees(actual, template, excluded = new Set()) {
  const actualFiles = (await filesBelow(actual, true)).filter(path => !excluded.has(path));
  const templateFiles = (await filesBelow(template, true)).filter(path => !excluded.has(path));
  const paths = new Set([...actualFiles, ...templateFiles]);
  for (const path of paths) {
    const [left, right] = await Promise.all([
      readFile(join(actual, path)).catch(error => error.code === 'ENOENT' ? undefined : Promise.reject(error)),
      readFile(join(template, path)).catch(error => error.code === 'ENOENT' ? undefined : Promise.reject(error)),
    ]);
    if (!left || !right || !left.equals(right)) return true;
  }
  return false;
}

async function customizedUi(root) {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const packageRoot = basename(dirname(scriptDirectory)) === 'dist' ?
    resolve(scriptDirectory, '..', '..') : resolve(scriptDirectory, '..');
  if (resolve(root) === packageRoot) return false;
  const assets = await lstat(join(packageRoot, 'assets')).then(info => info.isDirectory(), error => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });
  const templateRoot = assets ? join(packageRoot, 'assets') : packageRoot;
  return await differentTrees(join(root, 'src', 'web'), join(templateRoot, 'src', 'web')) ||
    await differentTrees(join(root, 'public'), join(templateRoot, 'public'),
      new Set(['app.js', 'auth/redirect.js']));
}

async function exampleDependencies(path, content) {
  const { default: ts } = await import('typescript');
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
  const dependencies = new Set();
  const scopes = [new Map()];
  const literal = node => node && ts.isStringLiteralLike(node) ? node.text : undefined;
  const values = node => {
    const text = literal(node);
    if (text !== undefined) return [text];
    if (node && ts.isArrayLiteralExpression(node)) return node.elements.flatMap(values);
    if (node && ts.isIdentifier(node)) {
      for (const scope of [...scopes].reverse()) if (scope.has(node.text)) return scope.get(node.text);
    }
    if (node && ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression) ? node.expression.text :
        ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : '';
      if (['join', 'resolve'].includes(name)) {
        const parts = node.arguments.map(values);
        if (parts.length && parts.every(part => part.length === 1)) return [parts.map(part => part[0]).join('/')];
      }
    }
    return [];
  };
  const record = value => {
    if (value && /(?:^|[\\/])examples(?:[\\/]|$)/.test(value)) dependencies.add(value);
  };
  function visit(node) {
    const scoped = ts.isBlock(node) || ts.isFunctionLike(node) || ts.isForOfStatement(node);
    if (scoped) scopes.push(new Map());
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const loop = node.parent.parent;
      scopes.at(-1).set(node.name.text, values(node.initializer ??
        (ts.isForOfStatement(loop) ? loop.expression : undefined)));
    }
    if (ts.isParameter(node) && ts.isIdentifier(node.name)) scopes.at(-1).set(node.name.text, []);
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) record(literal(node.moduleSpecifier));
    if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression) ? node.expression.text :
        ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : '';
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          ['require', 'readFile', 'readFileSync', 'access', 'stat', 'lstat', 'cp', 'copyFile', 'createReadStream'].includes(name)) {
        for (const value of values(node.arguments[0])) record(value);
      }
    }
    ts.forEachChild(node, visit);
    if (scoped) scopes.pop();
  }
  visit(source);
  return [...dependencies];
}

export async function checkApplication(root = process.cwd(), model) {
  root = resolve(root);
  const config = JSON.parse(await readFile(join(root, 'application.json'), 'utf8'));
  if (typeof config.name !== 'string' || !config.name || !Array.isArray(config.selectedExamples) ||
      config.selectedExamples.length || Object.keys(config).some(key => !['name', 'selectedExamples'].includes(key))) {
    throw new Error('Clean application validation requires a named application with selectedExamples: []');
  }
  const violations = [];
  let inspected = 0;
  async function inspect(path, optional = false, tests = false) {
    let info;
    try { info = await lstat(path); }
    catch (error) { if (optional && error.code === 'ENOENT') return; throw error; }
    if (info.isSymbolicLink()) throw new Error(`Application delivery paths must not be symlinks: ${path}`);
    if (info.isDirectory()) {
      for (const child of await readdir(path)) {
        if (['node_modules', 'obj', 'bin'].includes(child)) continue;
        await inspect(join(path, child), false, tests);
      }
    } else if (['.ts', '.mts', '.js', '.mjs', '.html', '.css', '.json', '.sql', '.sqlproj', '.xml'].includes(extname(path))) {
      if (path === join(root, 'sql', 'local', 'application-acceptance.sql')) return;
      inspected++;
      const content = await readFile(path, 'utf8');
      if (tests) {
        for (const dependency of await exampleDependencies(path, content)) {
          violations.push(`Unselected example dependency in ${path}: ${dependency}`);
        }
      } else if (sampleMarkers.some(marker => marker.test(content))) violations.push(path);
    }
  }
  for (const directory of ['src', 'public', 'dab', 'sql']) await inspect(join(root, directory));
  await inspect(join(root, 'dist', 'src'));
  for (const directory of ['tests', 'dist/tests']) await inspect(join(root, directory), true, true);
  for (const filename of ['dist/src/client.js', 'dist/src/server.js']) {
    await inspect(join(root, filename));
  }
  await inspect(join(root, 'public', 'app.js'));
  if (model) await inspect(resolve(model));
  for (const filename of ['Dockerfile']) {
    const content = await readFile(join(root, filename), 'utf8');
    for (const line of content.replace(/\\\r?\n\s*/g, ' ').split(/\r?\n/)) {
      const copy = /^\s*COPY\s+(.+)$/i.exec(line);
      if (!copy) continue;
      const argumentsText = copy[1].replace(/^(?:--\S+\s+)+/, '');
      const argumentsList = argumentsText.startsWith('[') ? JSON.parse(argumentsText) :
        (argumentsText.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(value => value.replace(/^["']|["']$/g, ''));
      if (!Array.isArray(argumentsList) || argumentsList.length < 2 || argumentsList.some(value => typeof value !== 'string')) {
        throw new Error(`Cannot validate Docker COPY arguments in ${filename}`);
      }
      const sources = argumentsList.slice(0, -1).map(value => value.replace(/\\/g, '/').replace(/\/+$/, ''));
      if (sources.some(value => value === '.' || value === '/app' || /(?:^|\/)(?:examples|tests|dist)(?:\/\*+)?$/.test(value))) {
        violations.push(`${filename}: copy only intended runtime artifacts, not the whole build/example tree`);
      }
    }
  }
  if (violations.length) throw new Error(`Unselected Todo example remains in application delivery:\n${violations.join('\n')}`);
  const [intent, review, customized] = await Promise.all([
    optionalFile(join(root, 'docs', 'design-intent.md')),
    optionalFile(join(root, 'docs', 'design-review.md')),
    customizedUi(root),
  ]);
  const intentPresent = Boolean(intent?.trim());
  const reviewPresent = Boolean(review?.trim());
  if (customized && !intentPresent) {
    console.log('Design warning: customized UI has no docs/design-intent.md.');
  }
  if (customized || intent !== undefined || review !== undefined) {
    const coverage = await designReviewStatus(root, reviewPresent ? review : undefined);
    for (const line of designReport(coverage, intentPresent, reviewPresent)) console.log(line);
  }
  console.log(`Clean application passed (${config.name}): ${inspected} source/build/schema/test files; no selected examples.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args[0] === '--selected') {
    if (args.length < 3 || args.length > 4 || !['local-simulation', 'public-demo'].includes(args[2])) {
      console.error('Usage: check-application.mjs --selected <artifact-directory> <local-simulation|public-demo> [checkout]');
      process.exitCode = 1;
    } else {
      try {
        const { checkSelectedApplication } = await import('../dist/src/application-build.js');
        const manifest = await checkSelectedApplication(resolve(args[3] ?? process.cwd()), resolve(args[1]), args[2]);
        if (manifest.name !== 'todo') {
          for (const file of manifest.files) {
            if (!['.js', '.mjs', '.html', '.css', '.sql', '.json', '.sqlproj'].includes(extname(file.path))) continue;
            const content = await readFile(join(resolve(args[1]), file.path), 'utf8');
            if (sampleMarkers.some(marker => marker.test(content))) {
              throw new Error(`Unselected Todo example remains in selected application delivery: ${file.path}`);
            }
          }
        }
        console.log(`Selected application passed (${manifest.name}, ${manifest.profile}): source/artifact checksums and shared route contract.`);
      } catch (error) { console.error(error.message); process.exitCode = 1; }
    }
  } else if (args.length > 2) { console.error('Usage: check-application.mjs [checkout] [extracted DACPAC model.xml]'); process.exitCode = 1; }
  else checkApplication(args[0], args[1]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
