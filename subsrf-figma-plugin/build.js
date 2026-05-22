// Build script — produces code.js (plugin sandbox) and ui.html (plugin UI).
// Usage:
//   node build.js          — single build (development, unminified)
//   node build.js --prod   — single build (minified)
//   node build.js --watch  — rebuild on src/** changes

const esbuild = require('esbuild');
const fs = require('fs');

const isProd  = process.argv.includes('--prod');
const isWatch = process.argv.includes('--watch');
const shared  = { bundle: true, platform: 'browser', target: 'es2017', minify: isProd };

async function buildPlugin() {
  await esbuild.build({
    ...shared,
    entryPoints: ['src/plugin/main.js'],
    outfile: 'code.js',
  });
}

async function buildUI() {
  const [jsResult, cssResult] = await Promise.all([
    esbuild.build({ ...shared, entryPoints: ['src/ui/js/main.js'], write: false }),
    esbuild.build({ entryPoints: ['src/ui/styles/main.css'], bundle: true, write: false, minify: isProd }),
  ]);

  const js  = Buffer.from(jsResult.outputFiles[0].contents).toString('utf8');
  const css = Buffer.from(cssResult.outputFiles[0].contents).toString('utf8');
  const tpl = fs.readFileSync('src/ui/index.html', 'utf8');

  const html = tpl
    .replace('<style>/* INLINE_CSS */</style>', `<style>${css}</style>`)
    .replace('<script>/* INLINE_JS */</script>', `<script>${js}</script>`);

  fs.writeFileSync('ui.html', html);
}

async function build() {
  const t = Date.now();
  await Promise.all([buildPlugin(), buildUI()]);
  console.log(`[subsrf] built in ${Date.now() - t}ms`);
}

if (isWatch) {
  build().catch(console.error);
  const debounce = (fn, ms) => { let id; return () => { clearTimeout(id); id = setTimeout(fn, ms); }; };
  const rebuild = debounce(() => build().catch(console.error), 150);
  fs.watch('src', { recursive: true }, rebuild);
  console.log('[subsrf] watching src/…');
} else {
  build().catch(e => { console.error(e); process.exit(1); });
}
