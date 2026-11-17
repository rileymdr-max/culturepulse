#!/usr/bin/env node
// Builds a readable web page from PLAYBOOK.md, for the pinned "CulturePulse Playbook" page on claude.ai.
// Usage: node scripts/build-playbook-page.mjs [output-path]
// Then publish the output with the Artifact tool to https://claude.ai/artifact/<id in CLAUDE.md>.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(tmpdir(), 'culturepulse-playbook.html');
const md = readFileSync(join(root, 'PLAYBOOK.md'), 'utf8');
const embedded = md.replace(/<\/script/gi, '<\\/script');

const html = `<title>CulturePulse Playbook</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
/* Layout: F2 brand paper page, sticky contents rail on wide screens, one column on phones. */
:root {
  --paper: #F2EDE3; --card: #FBF8F2; --ink: #111110; --muted: #5B574F;
  --green: #0B6B45; --mint: #C7F2D9; --yellow: #FFE14D; --lilac: #BBA8FF; --rule: #D9D2C3;
  --display: "Anton", Impact, "Arial Narrow", sans-serif;
  --body: "DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
  color-scheme: light;
}
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { background: var(--paper); color: var(--ink); font: 16px/1.6 var(--body); }
.wrap { max-width: 1180px; margin: 0 auto; padding-block: 32px 80px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 48px; align-items: start; }
nav.toc { position: sticky; top: calc(24px + env(safe-area-inset-top, 0px)); font-size: 14px; }
nav.toc .label { font: 600 11px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
nav.toc ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
nav.toc a { display: block; padding: 6px 10px; border-radius: 6px; color: var(--ink); text-decoration: none; border: 2px solid transparent; }
nav.toc a:hover { background: var(--card); }
nav.toc a.on { background: var(--mint); border-color: var(--ink); }
main { min-width: 0; max-width: 820px; }
h1 { font: 400 clamp(44px, 7vw, 76px)/0.95 var(--display); text-transform: uppercase; letter-spacing: .01em; margin: 0 0 12px; text-wrap: balance; }
h1 + p { font-size: 19px; color: var(--muted); margin-top: 0; }
h2 { font: 400 34px/1.05 var(--display); text-transform: uppercase; margin: 64px 0 16px; padding-top: 20px; border-top: 2px solid var(--ink); text-wrap: balance; scroll-margin-top: 16px; }
h3 { font-size: 20px; font-weight: 700; margin: 36px 0 10px; scroll-margin-top: 16px; }
p, li { max-width: 68ch; }
a { color: var(--green); text-underline-offset: 2px; }
a:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
strong { font-weight: 700; }
hr { display: none; }
code { font: 0.86em var(--mono); background: var(--card); border: 1px solid var(--rule); border-radius: 4px; padding: 1px 5px; overflow-wrap: anywhere; }
pre { background: var(--ink); color: var(--paper); border-radius: 8px; padding: 16px 18px; overflow-x: auto; font: 13px/1.6 var(--mono); }
pre code { background: none; border: 0; padding: 0; color: inherit; font-size: inherit; }
blockquote { margin: 20px 0; padding: 14px 18px; background: var(--yellow); border: 2px solid var(--ink); border-radius: 8px; box-shadow: 4px 4px 0 var(--ink); }
blockquote p { margin: 0; }
.table { overflow-x: auto; margin: 16px 0 24px; background: var(--card); border: 2px solid var(--ink); border-radius: 8px; box-shadow: 4px 4px 0 var(--ink); }
table { border-collapse: collapse; width: 100%; font-size: 14px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; vertical-align: top; padding: 9px 12px; border-bottom: 1px solid var(--rule); }
th { background: var(--mint); font-weight: 700; border-bottom: 2px solid var(--ink); white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
ul.contains-task-list, li.task-list-item { list-style: none; }
li input[type=checkbox] { margin-right: 8px; accent-color: var(--green); }
.updated { display: inline-block; font: 600 12px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; background: var(--lilac); border: 2px solid var(--ink); border-radius: 999px; padding: 6px 12px; }
.updated em { font-style: normal; }
.file { font-family: var(--mono); font-size: .9em; }
@media (max-width: 900px) {
  .wrap { grid-template-columns: minmax(0, 1fr); gap: 24px; padding-block: 20px 60px; }
  nav.toc { position: static; background: var(--card); border: 2px solid var(--ink); border-radius: 8px; padding: 14px; }
  h2 { font-size: 28px; margin-top: 48px; }
}
</style>
<div class="wrap">
  <nav class="toc" aria-label="Sections"><div class="label">Sections</div><ol id="toc"></ol></nav>
  <main id="doc"><p>Loading the playbook…</p></main>
</div>
<script type="text/plain" id="md">${embedded}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script>
(function () {
  var src = document.getElementById('md').textContent.replace(/<\\\\\\/script/gi, '<' + '/script');
  var doc = document.getElementById('doc');
  doc.innerHTML = marked.parse(src, { gfm: true });
  var slug = function (t) { return t.trim().toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-'); };
  doc.querySelectorAll('h1,h2,h3').forEach(function (h) { h.id = slug(h.textContent); });
  doc.querySelectorAll('table').forEach(function (t) { var w = document.createElement('div'); w.className = 'table'; t.parentNode.insertBefore(w, t); w.appendChild(t); });
  doc.querySelectorAll('em').forEach(function (e) { if (/^Last updated/.test(e.textContent)) { e.parentNode.classList.add('updated'); } });
  doc.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    else if (href.charAt(0) !== '#') { var s = document.createElement('span'); s.className = 'file'; s.textContent = a.textContent; a.replaceWith(s); }
  });
  // The "Contents" list duplicates the side rail, so hide it.
  var contents = document.getElementById('contents');
  if (contents) { var n = contents.nextElementSibling; contents.remove(); if (n && n.tagName === 'OL') n.remove(); }
  var toc = document.getElementById('toc'), links = [];
  doc.querySelectorAll('h2').forEach(function (h) {
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = '#' + h.id; a.textContent = h.textContent; li.appendChild(a); toc.appendChild(li); links.push([h, a]);
  });
  var mark = function () {
    var cur = links[0];
    links.forEach(function (p) { if (p[0].getBoundingClientRect().top < 120) cur = p; });
    links.forEach(function (p) { p[1].classList.toggle('on', p === cur); });
  };
  window.addEventListener('scroll', mark, { passive: true }); mark();
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
</script>
`;
writeFileSync(out, html);
console.log(out);
