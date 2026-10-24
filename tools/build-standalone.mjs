// Builds DermaLogic.html: the whole app in one file that opens with a
// double-click (no server needed). Run: npx esbuild@0.24.0 is fetched by `npm run build`.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(root + p, 'utf8');

const result = await build({ entryPoints: [root + 'js/app.js'], bundle: true, format: 'esm', minify: true, write: false, target: 'es2020' });
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = read('css/styles.css');
const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('assets/icon.svg')).toString('base64');

let html = read('index.html')
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}" type="image/svg+xml" />`)
  .replace(/<link rel="stylesheet" href="css\/styles.css" \/>/, () => `<style>\n${css}\n</style>`)
  .replace(/src="assets\/icon.svg"/g, `src="${icon}"`)
  .replace(/<script type="module" src="js\/app.js"><\/script>/, () => `<script type="module">\n${js}\n</script>`);

writeFileSync(root + 'DermaLogic.html', html);
console.log(`Wrote DermaLogic.html (${Math.round(html.length / 1024)} KB)`);
