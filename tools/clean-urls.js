// Clean URLs: /about instead of /about.html, / instead of /index.html.
// Idempotent; build-deploy.js also runs cleanHtml() on every page as a safety net,
// so a regenerated page can never ship .html links.
const fs = require('fs');
const ROOT = require('path').join(__dirname, '..') + '/';
const PAGES = ['index', 'about', 'cloud-solutions', 'contact', 'network-infrastructure', 'ops', 'terms', 'privacy'];
const SITE = 'https://switchops.tech';
const clean = (name) => (name === 'index' ? '/' : '/' + name);

function cleanHtml(h) {
  for (const p of PAGES) {
    const c = clean(p);
    // Absolute URLs (canonical, Open Graph, JSON-LD, sitemap).
    h = h.split(`${SITE}/${p}.html`).join(SITE + c);
    // Links: href="about.html", href="/about.html", with optional #hash or ?query.
    h = h.replace(new RegExp(`(href|action)="/?${p}\\.html([#?][^"]*)?"`, 'g'), (m, attr, tail) => {
      tail = tail || '';
      // "/#section" is fine for the homepage; "/" + "?x" also fine.
      return `${attr}="${c}${tail}"`;
    });
  }
  return h;
}
module.exports = { cleanHtml, PAGES };

if (require.main === module) {
  for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
    const h = fs.readFileSync(ROOT + f, 'utf8');
    const out = cleanHtml(h);
    if (out !== h) fs.writeFileSync(ROOT + f, out, 'utf8');
  }
  // Sitemap
  let sm = fs.readFileSync(ROOT + 'sitemap.xml', 'utf8');
  for (const p of PAGES) sm = sm.split(`${SITE}/${p}.html`).join(SITE + clean(p));
  fs.writeFileSync(ROOT + 'sitemap.xml', sm, 'utf8');
  // Scripts and the mail handler
  const js = ROOT + 'assets/script.js';
  fs.writeFileSync(js, fs.readFileSync(js, 'utf8').split('/privacy.html#p-12').join('/privacy#p-12'), 'utf8');
  const php = ROOT + 'send.php';
  let s = fs.readFileSync(php, 'utf8');
  s = s.split("header('Location: contact.html#'").join("header('Location: /contact#'")
       .split('Receives the contact.html form').join('Receives the contact page form')
       .split('redirected back to contact.html#sent').join('redirected back to /contact#sent');
  fs.writeFileSync(php, s, 'utf8');

  // Server rules
  let ht = fs.readFileSync(ROOT + '.htaccess', 'utf8');
  const a = ht.indexOf('# The product page moved');
  const b = ht.indexOf('# Branded "page not found" page.');
  if (a < 0 || b < 0) throw new Error('.htaccess markers');
  ht = ht.slice(0, a) + `# The product page moved; keep old links and search results working.
RewriteRule ^software-development(\\.html)?/?$ /ops [R=301,L]

# Clean URLs. Visitors and search engines see /about, never /about.html.
# 1) /index or /index.html -> /
RewriteCond %{THE_REQUEST} \\s/+index(\\.html)?[\\s?] [NC]
RewriteRule ^ / [R=301,L]
# 2) /page.html -> /page (THE_REQUEST = what the browser asked for, so the
#    internal rewrite in step 4 can never loop back into this redirect)
RewriteCond %{THE_REQUEST} \\s/+([^\\s?]+?)\\.html[\\s?] [NC]
RewriteRule ^ /%1 [R=301,L]
# 3) /page/ -> /page (no trailing slash on pages)
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.+)/$ /$1 [R=301,L]
# 4) Serve /page from page.html behind the scenes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+)$ $1.html [L]

` + ht.slice(b);
  if (!/DirectoryIndex/.test(ht)) ht = ht.replace('RewriteEngine On', 'DirectoryIndex index.html\nRewriteEngine On');
  fs.writeFileSync(ROOT + '.htaccess', ht, 'utf8');
  console.log('clean URLs applied');
}
