import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';

childProcess.fork = () => {
  const child = new EventEmitter();
  child.exitCode = null;
  child.send = () => process.nextTick(() => { child.exitCode = 0; child.emit('exit', 0); });
  process.nextTick(() => child.emit('message', 'ready'));
  return child;
};
childProcess.spawnSync = (command, args) => {
  assert.equal(command, 'docker');
  const query = args[args.indexOf('-Q') + 1];
  return { status: query === 'SELECT * FROM dbo.Items;' ? 1 : 0, stdout: '0 0 1', stderr: '' };
};
syncBuiltinESMExports();

const tokens = [process.env.ACCEPTANCE_TOKEN_A, process.env.ACCEPTANCE_TOKEN_B];
const rows = [];
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  assert.ok([process.env.APP_ORIGIN, process.env.SQLAPPS_TEST_API === 'functions' ?
    'http://127.0.0.1:7071' : process.env.DAB_URL].includes(url.origin), 'Acceptance must target the selected API.');
  const owner = tokens.findIndex(token => options.headers.Authorization === `Bearer ${token}`);
  if (owner === -1) return Response.json({}, { status: 401 });
  if (options.method === 'POST') {
    if (url.pathname === '/api/Items') return Response.json({}, { status: 405 });
    const { Label } = JSON.parse(options.body);
    if (!Label.trim()) {
      if (process.env.SQLAPPS_TEST_OUTAGE === 'true') return Response.json({}, { status: 503 });
      return Response.json(process.env.SQLAPPS_TEST_API === 'functions' ?
        { error: 'Label must contain 1 to 120 characters.' } : { error: { code: 'DatabaseOperationFailed' } }, { status: 400 });
    }
    if (rows.some(row => row.owner === owner && row.Label === Label)) return Response.json({}, { status: 409 });
    rows.push({ Id: String(rows.length + 1), Label, owner });
    return Response.json({}, { status: 201 });
  }
  const filter = url.searchParams.get('$filter');
  return Response.json({ value: rows.filter(row => row.owner === owner &&
    (!filter || filter === `Label eq '${row.Label}'`)).map(({ owner, ...row }) => row) });
};
