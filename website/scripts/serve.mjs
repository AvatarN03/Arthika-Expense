import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Serve only the website's public files, never app or repository configuration.
const root = new URL(process.argv.includes('--dist') ? '../dist/' : '../', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/src/styles.css', ['src/styles.css', 'text/css; charset=utf-8']],
  ['/src/main.js', ['src/main.js', 'text/javascript; charset=utf-8']],
  ...['logo.svg', 'logo-reversed.svg', 'symbol.svg'].map((file) => [
    `/assets/brand/${file}`, [`assets/brand/${file}`, 'image/svg+xml'],
  ]),
  ...['manrope-regular.ttf', 'manrope-semibold.ttf', 'manrope-extrabold.ttf', 'instrument-serif-italic.ttf'].map((file) => [
    `/assets/fonts/${file}`, [`assets/fonts/${file}`, 'font/ttf'],
  ]),
]);
const port = Number(process.env.PORT || 4173);
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = files.get(pathname);
  if (!file) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  try {
    const content = await readFile(new URL(file[0], root));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error(error.message);
    response.writeHead(500).end('Cannot read website files. For preview, run npm run build first.');
  }
});
server.on('error', (error) => {
  console.error(`Website server: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`ARTHIKA website: http://127.0.0.1:${port}`);
  console.log('Independent of Expo. Refresh the browser after editing. Ctrl+C to stop.');
});
