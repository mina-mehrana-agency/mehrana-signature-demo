// Zero-dependency static server for the signature demo. Answers byte ranges, which the
// scroll film needs so the browser can seek inside the video.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./public', import.meta.url)));
const PORT = Number(process.env.PORT ?? 4610);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const file = resolve(join(ROOT, relative));

  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let info;
  try {
    info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  const headers = {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'Accept-Ranges': 'bytes',
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');

  if (range) {
    const start = range[1] === '' ? Math.max(0, info.size - Number(range[2])) : Number(range[1]);
    const end = range[1] !== '' && range[2] !== '' ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) {
      response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
      return;
    }
    response.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Content-Length': end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, { ...headers, 'Content-Length': info.size });
  createReadStream(file).pipe(response);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Signature demo running at http://localhost:${PORT}`);
});
