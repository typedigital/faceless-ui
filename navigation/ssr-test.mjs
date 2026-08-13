#!/usr/bin/env node

/**
 * SSR Test for `faceless-navigation` / `faceless-nav-item`
 *
 * 1. Imports index.js in Node.js — verifies isBrowser guards prevent crashes
 * 2. Generates ssr-showcase.html server-side (= genuine SSR output)
 * 3. The generated file can be opened in a browser to test hydration
 *
 * Usage:  node navigation/ssr-test.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ──────────────────────────────────────────────
 * Step 1: Import component in Node.js
 * ────────────────────────────────────────────── */

console.log('\n⏳ SSR Test: importing navigation/index.js in Node.js …');

try {
  await import('./index.js');
  console.log('✅ PASS — index.js imported without errors (isBrowser guards work)');
} catch (err) {
  console.error('❌ FAIL — index.js threw in Node.js:\n', err);
  process.exit(1);
}

/* ──────────────────────────────────────────────
 * Step 2: Generate SSR showcase HTML
 * ────────────────────────────────────────────── */

console.log('⏳ Generating ssr-showcase.html …');

/**
 * Each section is exactly what a server would emit — no `data-type`, no
 * `data-open`, no ARIA. Sections 1–3 additionally pre-render the
 * `[part="toggle"]` markup, which the component adopts instead of rebuilding.
 */

const sections = [
  {
    title: '1. Desktop — with pre-rendered toggles (recommended)',
    description:
      'The <code>[part="toggle"]</code> elements are in the HTML. The component adopts them on upgrade: no node is created, moved, or removed. Real links exist before JavaScript runs, so there is nothing left to shift.',
    html: `
    <faceless-navigation aria-label="Desktop demo" type="desktop">
      <faceless-nav-item href="#home"><a part="toggle" href="#home">Home</a></faceless-nav-item>
      <faceless-nav-item>
        <button part="toggle">Products</button>
        <ul part="submenu">
          <faceless-nav-item href="#product-a"><a part="toggle" href="#product-a">Product A</a></faceless-nav-item>
          <faceless-nav-item href="#product-b"><a part="toggle" href="#product-b">Product B</a></faceless-nav-item>
        </ul>
      </faceless-nav-item>
      <faceless-nav-item href="#about"><a part="toggle" href="#about">About</a></faceless-nav-item>
    </faceless-navigation>`,
  },
  {
    title: '2. Desktop — without pre-rendered toggles (fallback)',
    description:
      'The same navigation, emitted as bare custom elements. It works identically, but the toggles are built on the client — which is precisely the pre-upgrade window <code>preflight.css</code> covers.',
    html: `
    <faceless-navigation aria-label="Desktop fallback demo" type="desktop">
      <faceless-nav-item href="#home">Home</faceless-nav-item>
      <faceless-nav-item>
        Products
        <faceless-nav-item href="#product-a">Product A</faceless-nav-item>
        <faceless-nav-item href="#product-b">Product B</faceless-nav-item>
      </faceless-nav-item>
      <faceless-nav-item href="#about">About</faceless-nav-item>
    </faceless-navigation>`,
  },
  {
    title: '3. Hamburger — <nav> wrapper',
    description:
      'The hamburger overlay needs a <code>&lt;nav&gt;</code> container to show and hide. Note the placeholder height: this is the type where the pre-upgrade shift is largest, since the entire menu collapses into a 44px button.',
    html: `
    <faceless-navigation aria-label="Hamburger demo" type="hamburger" style="--nav-placeholder-height: 44px;">
      <nav>
        <faceless-nav-item href="#home"><a part="toggle" href="#home">Home</a></faceless-nav-item>
        <faceless-nav-item>
          <button part="toggle">Products</button>
          <ul part="submenu">
            <faceless-nav-item href="#product-a"><a part="toggle" href="#product-a">Product A</a></faceless-nav-item>
            <faceless-nav-item href="#product-b"><a part="toggle" href="#product-b">Product B</a></faceless-nav-item>
          </ul>
        </faceless-nav-item>
        <faceless-nav-item href="#contact"><a part="toggle" href="#contact">Contact</a></faceless-nav-item>
      </nav>
    </faceless-navigation>`,
  },
  {
    title: '4. Manual markup (<nav><ul><li>)',
    description:
      'Plain HTML needs no adoption logic at all — the markup is already complete and semantic. Only ARIA and the interaction pattern are added on upgrade.',
    html: `
    <faceless-navigation aria-label="Manual markup demo" type="desktop">
      <nav>
        <ul>
          <li><a href="#home">Home</a></li>
          <li>
            <button data-toggle>Products</button>
            <ul data-submenu>
              <li><a href="#product-a">Product A</a></li>
              <li><a href="#product-b">Product B</a></li>
            </ul>
          </li>
          <li><a href="#about">About</a></li>
        </ul>
      </nav>
    </faceless-navigation>`,
  },
];

const sectionsHTML = sections
  .map(
    (s) => `
  <h2>${s.title}</h2>
  <p>${s.description}</p>
  ${s.html}
`
  )
  .join('\n');

const html = `<!DOCTYPE html>
<!-- ⚠️  GENERATED FILE — do not edit by hand.
     Run \`node navigation/ssr-test.mjs\` to regenerate. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faceless Navigation — SSR Showcase</title>

  <!-- Preflight first: it only applies while the component is not ready yet. -->
  <link rel="stylesheet" href="preflight.css">
  <link rel="stylesheet" href="showcase.css">
  <script type="module" src="index.js"></script>

  <noscript>
    <style>faceless-navigation:not([data-type]) > * { visibility: visible; }</style>
  </noscript>
</head>
<body>

  <h1>SSR Showcase</h1>
  <p class="claim">Universal rendering with &lt;faceless-navigation&gt; — adopt, don't rebuild</p>

  <div class="ssr-concept-banner">
    <strong>Two problems, two fixes</strong>
    <p>
      <em>Layout:</em> every consumer style is keyed on <code>[data-type]</code>, which the
      component sets only after it has resolved its type. <code>preflight.css</code> reserves
      the box and clips the unstyled tree until then, so the geometry never changes.
    </p>
    <p>
      <em>Markup:</em> <code>&lt;faceless-nav-item&gt;</code> adopts a pre-rendered
      <code>[part="toggle"]</code> instead of rebuilding it. Server-render those and the
      navigation is complete, crawlable, and clickable before any JavaScript arrives.
    </p>
  </div>

  <div class="ssr-concept-banner">
    <strong>This page was generated by Node.js</strong>
    <p>
      The HTML you see was emitted by <code>node navigation/ssr-test.mjs</code> — proving that
      <code>index.js</code> can be imported server-side without errors. The browser then
      upgrades the elements progressively.
    </p>
  </div>
${sectionsHTML}

  <h2>5. Verifying the fix</h2>
  <p>
    Open DevTools, throttle to Slow 4G with an empty cache, and reload. Compare sections 1 and 2:
    both stay geometrically stable thanks to <code>preflight.css</code>, but section 1 shows its
    links immediately while section 2 stays blank until the bundle arrives. Disabling JavaScript
    entirely leaves section 1 fully navigable and section 2 empty.
  </p>

  <footer style="margin-top: 100px; text-align: center; color: #9ca3af; font-size: 0.8rem;">
    Faceless UI — SSR Showcase (generated by ssr-test.mjs)
  </footer>

</body>
</html>
`;

const outPath = join(__dirname, 'ssr-showcase.html');
writeFileSync(outPath, html, 'utf-8');
console.log(`✅ ssr-showcase.html written → ${outPath}`);

console.log('\n🎉 SSR test complete. Open ssr-showcase.html in a browser to verify hydration.\n');
