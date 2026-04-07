#!/usr/bin/env node

/**
 * SSR Test for <faceless-carousel>
 *
 * 1. Imports index.js in Node.js — verifies isBrowser guards prevent crashes
 * 2. Generates ssr-showcase.html server-side (= genuine SSR output)
 * 3. The generated file can be opened in a browser to test hydration
 *
 * Usage:  node carousel/ssr-test.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ──────────────────────────────────────────────
 * Step 1: Import component in Node.js
 * ────────────────────────────────────────────── */

console.log('\n⏳ SSR Test: importing carousel/index.js in Node.js …');

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
 * Each section mirrors a showcase from showcase.html.
 * The HTML is exactly what a server would emit:
 *   - <faceless-carousel> with attributes
 *   - Only original slides as children
 *   - No clones, no data-visible, no data-active, no aria-hidden
 */

const sections = [
  {
    title: '1. Live Demo',
    description:
      'The markup below is exactly what a server emits — five real slides, nothing else. After JS loads the component clones them automatically.',
    html: `
    <div class="carousel-wrapper">
      <button class="nav-btn prev" related-carousel="ssr-hero" aria-label="Previous slide">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>

      <faceless-carousel id="ssr-hero" loop show-dots mousewheel>
        <div class="slide slide--1" data-slide-idx="0">
          <span class="slide__number">01</span>
          <span class="slide__caption">Pre-rendered in HTML</span>
        </div>
        <div class="slide slide--2" data-slide-idx="1">
          <span class="slide__number">02</span>
          <span class="slide__caption">Zero Layout Flash</span>
        </div>
        <div class="slide slide--3" data-slide-idx="2">
          <span class="slide__number">03</span>
          <span class="slide__caption">Seamless Hydration</span>
        </div>
        <div class="slide slide--4" data-slide-idx="3">
          <span class="slide__number">04</span>
          <span class="slide__caption">SSR Compatible</span>
        </div>
        <div class="slide slide--5" data-slide-idx="4">
          <span class="slide__number">05</span>
          <span class="slide__caption">Production Ready</span>
        </div>
      </faceless-carousel>

      <button class="nav-btn next" related-carousel="ssr-hero" aria-label="Next slide">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>
    </div>`,
  },
  {
    title: '2. Autoplay Brands (Hard Peek)',
    description: 'Runs automatically, stops on hover or focus. 50px hard peek.',
    html: `
    <faceless-carousel autoplay interval="2500" loop items-per-view="4" gap="30" peek="50px">
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO A</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO B</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO C</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO D</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO E</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO F</div>
    </faceless-carousel>

    <p>Continuous scroll, stops on drag.</p>
    <faceless-carousel loop speed="1.5" items-per-view="4" gap="30">
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO A</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO B</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO C</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO D</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO E</div>
      <div class="slide" style="aspect-ratio: 3/1; font-size: 1.5rem;">LOGO F</div>
    </faceless-carousel>`,
  },
  {
    title: '3. A11y &amp; Interaction',
    description:
      'Navigable via Tab key. Automatically jumps to the slide when a link receives focus.',
    html: `
    <faceless-carousel id="custom-dots" items-per-view="2" gap="20" mousewheel>
      <div class="slide">
        <span>🎁</span>
        <button onclick="alert('Clicked!')">Action 1</button>
      </div>
      <div class="slide">
        <span>🚀</span>
        <a href="#">Learn more</a>
      </div>
      <div class="slide">
        <span>⭐</span>
        <button>Rate</button>
      </div>
      <div class="slide">
        <span>🔥</span>
        <a href="#">Hot Deals</a>
      </div>
    </faceless-carousel>`,
  },
  {
    title: '4. External Navigation (Buttons)',
    description:
      'Buttons use the <code>related-carousel</code> attribute to declare their target. The component wires up click listeners automatically — no <code>onclick</code> in markup.',
    html: `
    <div class="carousel-wrapper">
      <button class="nav-btn prev" related-carousel="api-demo" aria-label="Previous slide">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>

      <faceless-carousel id="api-demo" loop items-per-view="2" gap="20" show-dots mousewheel>
        <div class="slide" style="background: #fee2e2;">Slide A</div>
        <div class="slide" style="background: #fef3c7;">Slide B</div>
        <div class="slide" style="background: #dcfce7;">Slide C</div>
        <div class="slide" style="background: #dbeafe;">Slide D</div>
      </faceless-carousel>

      <button class="nav-btn next" related-carousel="api-demo" aria-label="Next slide">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>
    </div>`,
  },
  {
    title: '5. A11y Navigation Testing',
    description:
      'Tests Tab navigation across all slides, screen reader landmark skip, and live announcements. Every slide has a link and a button — including off-screen ones.',
    html: `
    <ul style="font-size: 0.85rem; color: #6b7280; margin: 8px 0 20px; padding-left: 1.2em; line-height: 1.8;">
      <li><strong>Tab</strong> — all slides are reachable, even those outside the visible viewport</li>
      <li>Focusing an off-screen slide scrolls it fully into view automatically</li>
      <li>Screen reader (NVDA: R, VoiceOver: VO+U) — landmark navigation skips the carousel entirely</li>
      <li>Screen reader: each slide is announced as "Slide N of 6, group"</li>
      <li>Navigation via arrow keys / dots / buttons — screen reader announces "Slide X of 6"</li>
    </ul>

    <div class="carousel-wrapper">
      <button class="nav-btn prev" related-carousel="a11y-demo" aria-label="Previous slide">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>

      <faceless-carousel id="a11y-demo" aria-label="Product highlights" loop items-per-view="2" gap="20" show-dots mousewheel>
        <div class="slide" style="background: #f0fdf4; flex-direction: column; gap: 12px;">
          <strong>Product 1</strong>
          <a href="#">View details →</a>
          <button>Add to cart</button>
        </div>
        <div class="slide" style="background: #fef9c3; flex-direction: column; gap: 12px;">
          <strong>Product 2</strong>
          <a href="#">View details →</a>
          <button>Add to cart</button>
        </div>
        <div class="slide" style="background: #fce7f3; flex-direction: column; gap: 12px;">
          <strong>Product 3</strong>
          <a href="#">View details →</a>
          <button>Add to cart</button>
        </div>
        <div class="slide" style="background: #e0f2fe; flex-direction: column; gap: 12px;">
          <strong>Product 4</strong>
          <a href="#">View details →</a>
          <button>Add to cart</button>
        </div>
        <div class="slide" style="background: #fde8d8; flex-direction: column; gap: 12px;">
          <strong>Product 5</strong>
          <a href="#">View details →</a>
          <button>Add to cart</button>
        </div>
        <div class="slide" style="background: #ede9fe; flex-direction: column; gap: 12px;">
          <strong>Product 6</strong>
          <a href="#">View details →</a>
          <button>Add to cart</button>
        </div>
      </faceless-carousel>

      <button class="nav-btn next" related-carousel="a11y-demo" aria-label="Next slide">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>
    </div>`,
  },
  {
    title: '6. Responsive Hero (Loop + Peek)',
    description: 'Mobile: 1 item | Desktop: 3 items | 15% peek at edges',
    html: `
    <faceless-carousel id="hero-carousel" loop show-dots peek="15%" peek-type="fade" mousewheel>
      <div class="slide">1 <p>Discover more</p></div>
      <div class="slide">2 <p>Limited time only</p></div>
      <div class="slide">3 <p>Bestseller</p></div>
      <div class="slide">4 <p>New arrivals</p></div>
      <div class="slide">5 <p>Offers</p></div>
    </faceless-carousel>`,
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
     Run \`node carousel/ssr-test.mjs\` to regenerate. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faceless Carousel — SSR Showcase</title>
  <script type="module" src="index.js"></script>
  <link rel="stylesheet" href="showcase.css">
  <link rel="stylesheet" href="ssr-showcase.css">
</head>
<body>

  <h1>SSR Showcase</h1>
  <p class="claim">Universal rendering with &lt;faceless-carousel&gt; — no clones on the server</p>

  <div class="ssr-concept-banner">
    <strong>Load, then Duplicate</strong>
    <p>
      SSR renders <em>only the original slides</em> — no clones, no special attributes.
      After JavaScript loads, the component reads the existing light DOM children and inserts
      buffer clones for seamless looping, identically to CSR. Real content is visible immediately;
      the carousel upgrades progressively.
    </p>
  </div>

  <div class="ssr-concept-banner" style="border-left-color: #10b981; margin-bottom: 20px;">
    <strong>This page was generated by Node.js</strong>
    <p>
      The HTML you see was emitted by <code>node carousel/ssr-test.mjs</code> — proving that
      <code>index.js</code> can be imported server-side without errors. The browser then
      hydrates the <code>&lt;faceless-carousel&gt;</code> elements progressively.
    </p>
  </div>
${sectionsHTML}

  <!-- ─── SSR Integration Guide ─── -->
  <h2>6. SSR Integration</h2>

  <div class="walkthrough">
    <div class="walkthrough__step">
      <div class="step-number">1</div>
      <div class="walkthrough__content">
        <strong>Server: render only the original slides</strong>
        <pre class="code-block"><code>&lt;faceless-carousel loop show-dots&gt;
  &lt;div class="slide"&gt;Slide 1&lt;/div&gt;
  &lt;div class="slide"&gt;Slide 2&lt;/div&gt;
  &lt;div class="slide"&gt;Slide 3&lt;/div&gt;
&lt;/faceless-carousel&gt;

&lt;!-- No clones. No data-ssr. No special attributes. --&gt;</code></pre>
      </div>
    </div>

    <div class="walkthrough__step">
      <div class="step-number">2</div>
      <div class="walkthrough__content">
        <strong>Client: include the component script — it self-initialises</strong>
        <pre class="code-block"><code>&lt;script type="module" src="carousel/index.js"&gt;&lt;/script&gt;

&lt;!-- ES modules load with defer semantics. The component detects
     existing children in connectedCallback and runs _init()
     to insert clones and start the animation loop. --&gt;</code></pre>
      </div>
    </div>

    <div class="walkthrough__step">
      <div class="step-number">3</div>
      <div class="walkthrough__content">
        <strong>Test: verify SSR safety from Node.js</strong>
        <pre class="code-block"><code>node carousel/ssr-test.mjs

# ✅ PASS — index.js imported without errors (isBrowser guards work)
# ⏳ Generating ssr-showcase.html …
# ✅ ssr-showcase.html written</code></pre>
      </div>
    </div>
  </div>

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
