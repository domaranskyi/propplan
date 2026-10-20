// Bundles public/{style.css,rules.js,app.js} into dist/index.html (what Vercel serves).
const fs = require('fs'), path = require('path'); const P = (f) => path.join(__dirname, 'public', f);
let h = fs.readFileSync(P('index.html'), 'utf8');
h = h.replace('<link rel="stylesheet" href="/style.css">', () => `<style>${fs.readFileSync(P('style.css'), 'utf8')}</style>`)
  .replace('<script src="/rules.js"></script>', () => `<script>${fs.readFileSync(P('rules.js'), 'utf8')}</script>`)
  .replace('<script src="/app.js"></script>', () => `<script>${fs.readFileSync(P('app.js'), 'utf8')}</script>`);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), h);
fs.copyFileSync(P('robots.txt'), path.join(__dirname, 'dist', 'robots.txt'));
console.log('dist/index.html', h.length, 'bytes');
