// Builds /ops/userguide (file: ops-userguide.html) from the SwitchOps AI user guide Markdown.
// Header and footer are taken from ops.html so the page always matches the rest of the site.
// Re-run after editing the guide (from tools/):  node build-userguide.js ["path/to/guide.md"]
const fs = require('fs');
const { marked } = require('marked');

const ROOT = require('path').join(__dirname, '..') + '/';
const GUIDE = process.argv[2] || 'G:/My Drive/Documents/SwitchOps/SwitchOps_AI_User_Guide.md';
const OUT = ROOT + 'ops-userguide.html';
const URL = 'https://switchops.tech/ops/userguide';
const TODAY = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (t) => t.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
const pad = (n) => String(n).padStart(2, '0');

// ---------- Read and split the guide ----------
const md = fs.readFileSync(GUIDE, 'utf8').replace(/\r\n/g, '\n');
const tokens = marked.lexer(md);
const pre = [];
const chapters = [];
for (const t of tokens) {
  if (t.type === 'heading' && t.depth === 2) {
    const m = t.text.match(/^(\d+)\.\s+(.+)$/);
    chapters.push({ num: m ? +m[1] : null, title: m ? m[2] : t.text, id: slug(m ? m[2] : t.text), tokens: [] });   // "#troubleshooting", not "#18-troubleshooting"
  } else if (chapters.length) chapters[chapters.length - 1].tokens.push(t);
  else pre.push(t);
}
const docChapters = chapters.filter((c) => c.num !== null);   // drops "Contents"
const h1 = pre.find((t) => t.type === 'heading' && t.depth === 1).text;
const paras = pre.filter((t) => t.type === 'paragraph');
const versionLine = paras[0].text;                              // "**Version 1.0** · ..."
const intro = paras[1].text;
const version = (versionLine.match(/Version\s+([\d.]+)/) || [])[1] || '1.0';
const lastPara = docChapters[docChapters.length - 1].tokens.filter((t) => t.type === 'paragraph').pop();
const copyright = lastPara && lastPara.text.startsWith('©') ? lastPara.text : '';

// Where each "section N" / "N.N" reference should point.
const chapterIds = new Map(docChapters.map((c) => [c.num, c.id]));
const subIds = new Set();
docChapters.forEach((c) => c.tokens.forEach((t) => {
  if (t.type === 'heading' && t.depth === 3) { const m = t.text.match(/^(\d+)\.(\d+)/); if (m) subIds.add(`${m[1]}.${m[2]}`); }
}));
const refHref = (a, b) => (b && subIds.has(`${a}.${b}`) ? `#s-${a}-${b}` : chapterIds.has(+a) ? '#' + chapterIds.get(+a) : null);

// ---------- Inline polish (applied to text outside tags only) ----------
const CHECK = '<span class="g-yes" role="img" aria-label="Included"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
function polish(html) {
  // Links back to the site become local links.
  html = html.replace(/href="https:\/\/switchops\.tech\/ops\/userguide"/g, 'href="/ops/userguide"').replace(/href="https:\/\/switchops\.tech\/ops"/g, 'href="/ops"');
  let inLink = 0;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<')) {
      if (/^<a[\s>]/.test(part)) inLink++;
      if (/^<\/a>/.test(part)) inLink--;
      return part;
    }
    if (inLink) return part;
    return part
      .replace(/\b((?:see )?section) (\d+)(?:\.(\d+))?\b/g, (m, w, a, b) => { const h = refHref(a, b); return h ? `<a class="g-ref" href="${h}">${m}</a>` : m; })
      .replace(/\(see (\d+)\.(\d+)\)/g, (m, a, b) => { const h = refHref(a, b); return h ? `(<a class="g-ref" href="${h}">see ${a}.${b}</a>)` : m; })
      .replace(/\s?\(Pro\)/g, ' <span class="g-pill">Pro</span>')
      .replace(/✔/g, CHECK);
  }).join('');
}
const inline = (s) => polish(marked.parseInline(s));

// ---------- Blocks ----------
function table(t) {
  const isMatrix = t.rows.some((r) => r.some((c) => c.text.trim() === '✔'));
  const isPriority = t.header[0].text.trim() === 'Priority';
  const head = t.header.map((h, i) => `<th${t.align[i] === 'center' ? ' class="c"' : ''} scope="col">${inline(h.text) || '<span class="sr-only">Item</span>'}</th>`).join('');
  const rows = t.rows.map((r) => '<tr>' + r.map((c, i) => {
    let body = c.text.trim();
    if (isMatrix && i > 0 && body === '') body = '<span class="g-no" role="img" aria-label="Not included">–</span>';
    else if (isPriority && i === 0) {
      const m = body.match(/^\*\*(P\d)\s+(.+)\*\*$/);
      body = m ? `<span class="g-prio g-prio-${m[1].toLowerCase()}">${m[1]}</span> ${esc(m[2])}` : inline(body);
    } else body = inline(body);
    const label = esc(t.header[i].text.replace(/\*\*/g, '').trim());
    const tag = i === 0 ? 'th scope="row"' : 'td';
    return `<${tag}${t.align[i] === 'center' ? ' class="c"' : ''}${label ? ` data-label="${label}"` : ''}>${body}</${tag.split(' ')[0]}>`;
  }).join('') + '</tr>').join('\n');
  return `<div class="g-table${isMatrix ? ' g-matrix' : ''}${t.header.length <= 2 ? ' g-two' : ''}"><div class="g-table-scroll" tabindex="0"><table>
<thead><tr>${head}</tr></thead>
<tbody>
${rows}
</tbody></table></div></div>`;
}

function code(t) {
  const lines = t.text.split('\n').map((l) => {
    const i = l.indexOf('#');
    if (i < 0) return esc(l);
    return esc(l.slice(0, i)) + `<span class="g-cmt">${esc(l.slice(i))}</span>`;
  }).join('\n');
  return `<div class="g-code"><div class="g-code-bar"><span>${esc(t.lang || 'shell')}</span><button class="g-copy" type="button" aria-label="Copy commands">Copy</button></div><pre><code>${lines}</code></pre></div>`;
}

function block(t) {
  switch (t.type) {
    case 'space': case 'hr': return '';
    case 'heading': {
      if (t.depth === 3) {
        const m = t.text.match(/^(\d+)\.(\d+)\s+(.+)$/);
        if (m) return `<h3 id="s-${m[1]}-${m[2]}"><span class="g-h3-num">${m[1]}.${m[2]}</span>${inline(m[3])}</h3>`;
      }
      return `<h${t.depth + 1}>${inline(t.text)}</h${t.depth + 1}>`;
    }
    case 'table': return table(t);
    case 'code': return code(t);
    case 'blockquote': {
      const inner = t.tokens.map((x) => (x.type === 'paragraph' ? `<p>${inline(x.text)}</p>` : block(x))).join('');
      return `<div class="g-callout g-warn" role="note"><span class="g-callout-label">Important</span>${inner}</div>`;
    }
    case 'paragraph': {
      const raw = t.text.trim();
      // A paragraph that opens in italics is a scope note ("Pro feature.", "Cloud AI edition only").
      if (/^\*[^*]/.test(raw)) {
        const pro = /^\*Pro feature/.test(raw);
        return `<div class="g-note${pro ? ' g-note-pro' : ''}" role="note"><span class="g-note-tag">${pro ? 'Pro' : 'Note'}</span><p>${inline(raw)}</p></div>`;
      }
      return `<p>${inline(raw)}</p>`;
    }
    case 'list': {
      const tag = t.ordered ? 'ol' : 'ul';
      const items = t.items.map((it) => {
        const parts = it.tokens.map((x) => (x.type === 'text' ? inline(x.text) : x.type === 'list' ? block(x) : block(x))).join('');
        return `<li>${parts}</li>`;
      }).join('\n');
      return `<${tag} class="${t.ordered ? 'g-ol' : 'g-list'}"${t.ordered && t.start > 1 ? ` start="${t.start}"` : ''}>\n${items}\n</${tag}>`;
    }
    default: return polish(marked.parser([t]));
  }
}

// "**Step N. Title.** text" paragraphs, with whatever follows them, become a numbered timeline.
function blocks(list) {
  const out = [];
  let steps = null;
  let step = null;
  const closeSteps = () => {
    if (!steps) return;
    out.push('<ol class="g-steps">' + steps.map((s) => `<li class="g-step"><span class="g-step-num" aria-hidden="true">${s.n}</span><div class="g-step-body"><h4>${esc(s.title)}</h4>${s.html.join('')}</div></li>`).join('\n') + '</ol>');
    steps = null; step = null;
  };
  for (const t of list) {
    const m = t.type === 'paragraph' && t.text.match(/^\*\*Step (\d+)\. (.+?)\.\*\*\s*([\s\S]*)$/);
    if (m) {
      steps = steps || [];
      step = { n: m[1], title: m[2], html: m[3] ? [`<p>${inline(m[3])}</p>`] : [] };
      steps.push(step);
      continue;
    }
    if (steps && t.type === 'heading') closeSteps();
    if (steps) { step.html.push(block(t)); continue; }
    out.push(block(t));
  }
  closeSteps();
  return out.join('\n');
}

// ---------- Chapters ----------
const proChapters = new Set();
const body = docChapters.map((c) => {
  let toks = c.tokens;
  if (copyright && c === docChapters[docChapters.length - 1]) toks = toks.filter((t) => t !== lastPara);
  const first = toks.find((t) => t.type !== 'space');
  if (first && first.type === 'paragraph' && /^\*Pro feature/.test(first.text)) proChapters.add(c.num);
  return `<section class="legal-sec g-chap" id="${c.id}" aria-labelledby="${c.id}-h">
  <h2 id="${c.id}-h"><span class="sec-num">${pad(c.num)}</span>${esc(c.title)}${proChapters.has(c.num) ? ' <span class="g-pill">Pro</span>' : ''}</h2>
${blocks(toks)}
</section>`;
}).join('\n\n');

const words = md.replace(/[`*#|>\-]/g, ' ').split(/\s+/).filter(Boolean).length;
const minutes = Math.max(1, Math.round(words / 220));

// ---------- Start-here cards (summaries checked against the guide text) ----------
const QUICK = [
  [1, 'clipboard-check', 'Server, firewall ports and device requirements.'],
  [2, 'terminal', 'A guided wizard. Most installs take 5 to 15 minutes.'],
  [3, 'lock', 'Sign in, change the default password, set up your team.'],
  [10, 'diagnose', 'Priorities, AI root-cause analysis and engineer reviews.'],
  [11, 'configure', 'Templates, previews, checkpoints and rollback.'],
  [18, 'tool', 'What to check when something does not work.'],
].filter(([n]) => chapterIds.has(n));
const quick = `<nav class="g-quick" aria-label="Start here">
  ${QUICK.map(([n, icon, text]) => {
    const c = docChapters.find((x) => x.num === n);
    return `<a class="g-quick-card" href="#${c.id}"><span class="g-quick-top"><span class="icon" data-icon="${icon}"></span><span class="g-quick-num">${pad(n)}</span></span><strong>${esc(c.title)}</strong><span>${esc(text)}</span></a>`;
  }).join('\n  ')}
</nav>`;

// ---------- Page shell from ops.html ----------
const ops = fs.readFileSync(ROOT + 'ops.html', 'utf8');
const rootify = (h) => h.replace(/(src|href)="(img|assets)\//g, '$1="/$2/');
const top = rootify(ops.slice(ops.indexOf('<body>'), ops.indexOf('</header>') + '</header>'.length))
  .replace(/ aria-current="page"/g, '');
const foot = rootify(ops.slice(ops.indexOf('<footer class="site">')));

const TITLE = 'SwitchOps AI User Guide | Install, Set Up & Troubleshoot';
const DESC = 'The SwitchOps AI user guide: server requirements, installation, discovery, monitoring, AI incident analysis, configuration push, licensing and troubleshooting.';
const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://switchops.tech/' },
      { '@type': 'ListItem', position: 2, name: 'SwitchOps AI', item: 'https://switchops.tech/ops' },
      { '@type': 'ListItem', position: 3, name: 'User guide', item: URL },
    ] },
    { '@type': 'TechArticle', '@id': URL + '#guide', headline: h1, name: h1, description: DESC, url: URL,
      inLanguage: 'en', version, datePublished: TODAY, dateModified: TODAY, wordCount: words,
      image: 'https://switchops.tech/img/product/dashboard.webp',
      author: { '@id': 'https://switchops.tech/#organization' }, publisher: { '@id': 'https://switchops.tech/#organization' },
      about: { '@type': 'SoftwareApplication', name: 'SwitchOps AI', url: 'https://switchops.tech/ops', applicationCategory: 'BusinessApplication', operatingSystem: 'Ubuntu Server 24.04 LTS' },
      hasPart: docChapters.map((c) => ({ '@type': 'WebPageElement', name: c.title, url: `${URL}#${c.id}` })) },
  ],
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${URL}">
<meta name="theme-color" content="#080808">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SwitchOps Tech">
<meta property="og:locale" content="en_GB">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:url" content="${URL}">
<meta property="og:image" content="https://switchops.tech/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="SwitchOps Tech: infrastructure, cloud, and software, built to work as one.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="https://switchops.tech/img/og-image.png">
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/img/logo-mark.svg">
<link rel="icon" type="image/png" sizes="192x192" href="/img/favicon-192.png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/assets/styles.css">
</head>
${top}

<section class="page-hero legal-hero guide-hero">
  <div class="hero-beams"></div>
  <div class="container">
    <div class="crumb"><a href="/">Home</a> / <a href="/ops">SwitchOps AI</a> / User guide</div>
    <h1>SwitchOps AI <span class="dim2">User Guide</span></h1>
    <p class="lead">${polish(marked.parseInline(intro))}</p>
    <div class="legal-meta">
      <span><b>Version</b>${esc(version)}</span>
      <span><b>Chapters</b>${docChapters.length}</span>
      <span><b>Supports</b>Cisco IOS and IOS-XE</span>
    </div>
  </div>
</section>

<section class="legal guide" data-guide>
  <div class="container legal-grid">
    <aside class="legal-toc guide-toc" aria-label="Guide contents">
      <div class="g-search">
        <label class="sr-only" for="g-search">Search the guide</label>
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="g-search" type="search" placeholder="Search the guide" autocomplete="off" spellcheck="false">
        <kbd aria-hidden="true">/</kbd>
      </div>
      <p class="g-search-status" aria-live="polite"></p>
      <details open>
        <summary>Contents</summary>
        <ol>
${docChapters.map((c) => `          <li><a href="#${c.id}"><span>${pad(c.num)}</span>${esc(c.title)}</a></li>`).join('\n')}
        </ol>
      </details>
      <div class="toc-actions">
        <button class="btn btn-outline" type="button" data-print>Print or save as PDF</button>
        <a class="toc-back" href="/ops">← Back to SwitchOps AI</a>
      </div>
    </aside>

    <article class="legal-doc guide-doc">
      <h2 class="sr-only">Start here</h2>
      ${quick}
      <div class="g-empty" hidden><p>No chapter mentions “<span></span>”. Try a shorter word, or <a href="mailto:contact@switchops.tech">ask our support team</a>.</p></div>

${body}

      <div class="doc-end g-end">
        <div><strong>Still stuck?</strong><p>Our engineers answer every support email. Include your licence ID and SwitchOps version.</p></div>
        <div class="btn-row"><a class="btn btn-primary" href="mailto:contact@switchops.tech">Email support</a><a class="btn btn-outline" href="/contact?interest=SwitchOps%20AI%20demo">Book a demo</a></div>
      </div>
      ${copyright ? `<p class="g-legal">${polish(marked.parseInline(copyright))}</p>` : ''}
    </article>
  </div>
</section>

${foot}`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`ops-userguide.html: ${docChapters.length} chapters, ${words} words, ~${minutes} min, Pro chapters: ${[...proChapters].join(', ') || 'none'}`);
