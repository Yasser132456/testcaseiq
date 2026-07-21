import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const distributionRoot = resolve(scriptDirectory, '..', 'dist', 'testcaseiq-frontend', 'browser');
const host = process.env['DIST_HOST'] ?? '127.0.0.1';
const port = Number.parseInt(process.env['DIST_PORT'] ?? '4200', 10);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${host}`).pathname);
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  let filePath = resolve(distributionRoot, `.${pathname}`);
  if (filePath !== distributionRoot && !filePath.startsWith(`${distributionRoot}${sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) filePath = resolve(filePath, 'index.html');
  } catch {
    if (extname(pathname)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    filePath = resolve(distributionRoot, 'index.html');
  }

  try {
    const fileStats = await stat(filePath);
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-length': fileStats.size,
      'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream'
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Serving ${distributionRoot} at http://${host}:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
