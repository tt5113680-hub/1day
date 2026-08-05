import { createServer } from 'node:http';

export const workerServiceName = 'oneday-worker';

const port = Number(process.env.HEALTH_PORT ?? 3002);
const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', service: workerServiceName }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ status: 'not_found' }));
});

server.listen(port, '0.0.0.0');
