import { createServer } from 'node:http';

const port = Number(process.argv[2]);
if (process.argv[3] === 'exit') process.exit(2);
if (process.env.SQL_USER !== 'app_api' || process.env.SQL_SERVER !== '127.0.0.1') process.exit(3);
const server = createServer((_request, response) => {
  if (process.argv[3] === 'not-ready') response.statusCode = 503;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({
    clientId: process.env.AUTH_CLIENT_ID,
    redirectUri: `${new URL(process.env.APP_ORIGIN).origin}/`,
  }));
});
server.listen(port, '127.0.0.1');
process.on('SIGTERM', () => server.close(() => process.exit(0)));
