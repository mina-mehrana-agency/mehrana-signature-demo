// Fills the first film picture into the page so it paints with the HTML (no visible loading).
import { readFile, writeFile } from 'node:fs/promises';

const here = (path) => new URL(path, import.meta.url);
const poster = await readFile(here('./poster.webp'));
const page = await readFile(here('../src/index.html'), 'utf8');
const out = page.replace('__POSTER__', `data:image/webp;base64,${poster.toString('base64')}`);
await writeFile(here('../public/index.html'), out);
console.log(`public/index.html written (${Math.round(out.length / 1024)} KB)`);
