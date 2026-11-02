// Deployment build: copy the site to dist/, minify CSS/JS, fingerprint their URLs
// (?v=hash, so year-long caching never serves a stale file), then zip for Hostinger.
// Run (from tools/): node build-deploy.js   -> ../switchops-site-upload.zip
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SRC = path.join(__dirname, '..') + '/';
const DIST = path.join(__dirname, 'dist') + '/';
const ZIP = SRC + 'switchops-site-upload.zip';
const PAGES = ['index.html', 'about.html', 'cloud-solutions.html', 'contact.html', 'network-infrastructure.html', 'ops.html', 'ops-userguide.html', 'terms.html', 'privacy.html', '404.html'];
const FILES = [...PAGES, 'send.php', 'robots.txt', 'sitemap.xml', '.htaccess', 'favicon.ico', 'site.webmanifest'];
const MINIFY = ['assets/styles.css', 'assets/script.js', 'assets/vendors.js', 'assets/icons.js'];
const SKIP = new Set(['img/logo.png']);  // unused legacy file

fs.rmSync(DIST, { recursive: true, force: true });
const copyDir = (rel) => {
  for (const e of fs.readdirSync(SRC + rel, { withFileTypes: true })) {
    const r = rel + '/' + e.name;
    if (SKIP.has(r)) continue;
    if (e.isDirectory()) copyDir(r);
    else { fs.mkdirSync(path.dirname(DIST + r), { recursive: true }); fs.copyFileSync(SRC + r, DIST + r); }
  }
};
for (const f of FILES) { fs.mkdirSync(DIST, { recursive: true }); fs.copyFileSync(SRC + f, DIST + f); }
copyDir('assets');
copyDir('img');

// Minify with esbuild (no bundling: each file stays a standalone script/stylesheet).
const esbuild = path.join(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
const versions = {};
for (const f of MINIFY) {
  const before = fs.statSync(SRC + f).size;
  execFileSync(esbuild, [SRC + f, '--minify', '--legal-comments=none', '--outfile=' + DIST + f, '--log-level=warning'], { shell: true });
  const out = fs.readFileSync(DIST + f);
  versions[f] = crypto.createHash('sha1').update(out).digest('hex').slice(0, 8);
  console.log(`${f}: ${Math.round(before / 1024)} KB -> ${Math.round(out.length / 1024)} KB`);
}
for (const f of ['assets/vendor/gsap.min.js', 'assets/vendor/ScrollTrigger.min.js'].filter((x) => fs.existsSync(DIST + x))) {
  versions[f] = crypto.createHash('sha1').update(fs.readFileSync(DIST + f)).digest('hex').slice(0, 8);
}

// Fingerprint references in every page (and force clean URLs as a safety net).
const { cleanHtml } = require('./clean-urls.js');
for (const p of PAGES) {
  let h = cleanHtml(fs.readFileSync(DIST + p, 'utf8'));
  for (const [f, v] of Object.entries(versions)) {
    h = h.split(`"${f}"`).join(`"${f}?v=${v}"`).split(`"/${f}"`).join(`"/${f}?v=${v}"`);
  }
  fs.writeFileSync(DIST + p, h, 'utf8');
}

// Zip (files at the top level, ready to extract into public_html).
fs.rmSync(ZIP, { force: true });
execFileSync(process.platform === 'win32' ? 'C:/Windows/System32/tar.exe' : 'tar', ['-a', '-c', '-f', ZIP, ...FILES, 'assets', 'img'], { cwd: DIST });
console.log('zip:', ZIP, Math.round(fs.statSync(ZIP).size / 1024) + ' KB');
