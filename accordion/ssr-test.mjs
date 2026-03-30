#!/usr/bin/env node

/**
 * SSR Test for <faceless-accordion>
 *
 * 1. Imports index.js in Node.js — verifies isBrowser guards prevent crashes
 * 2. Generates ssr-showcase.html server-side (= genuine SSR output)
 * 3. The generated file can be opened in a browser to test hydration
 *
 * Usage:  node accordion/ssr-test.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ──────────────────────────────────────────────
 * Step 1: Import component in Node.js
 * ────────────────────────────────────────────── */

console.log('\n⏳ SSR Test: importing accordion/index.js in Node.js …');

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

const sections = [
  {
    title: '1. Basic (Single Mode)',
    description:
      'Only one panel open at a time. Click a trigger to switch.',
    html: `
    <faceless-accordion id="basic-accordion">
      <div data-open>
        <h3 data-trigger>What is the Faceless pattern?</h3>
        <div data-panel>
          <div class="panel-content">
            The Faceless pattern separates logic and state from visual design.
            The component handles accessibility, animations, and keyboard navigation
            — styling is entirely up to the consumer.
          </div>
        </div>
      </div>
      <div>
        <h3 data-trigger>Do I need a framework?</h3>
        <div data-panel>
          <div class="panel-content">
            No. Faceless-accordion is a native Web Component with zero dependencies.
            It works with any framework or none at all.
          </div>
        </div>
      </div>
      <div>
        <h3 data-trigger>How do I control the animation?</h3>
        <div data-panel>
          <div class="panel-content">
            Via CSS variables: <code>--accordion-duration</code> and <code>--accordion-easing</code>.
            Defaults are 300ms and ease.
          </div>
        </div>
      </div>
    </faceless-accordion>`,
  },
  {
    title: '2. Multiple Mode',
    description:
      'With the <code>multiple</code> attribute, several panels can be open simultaneously.',
    html: `
    <faceless-accordion multiple>
      <div data-open>
        <h3 data-trigger>HTML</h3>
        <div data-panel>
          <div class="panel-content">
            Structures content semantically with elements like headings, lists, and sections.
          </div>
        </div>
      </div>
      <div data-open>
        <h3 data-trigger>CSS</h3>
        <div data-panel>
          <div class="panel-content">
            Controls layout, colors, typography, and animations — fully declarative.
          </div>
        </div>
      </div>
      <div>
        <h3 data-trigger>JavaScript</h3>
        <div data-panel>
          <div class="panel-content">
            Adds interactivity: event handling, DOM manipulation, and state management.
          </div>
        </div>
      </div>
      <div>
        <h3 data-trigger>Web Components</h3>
        <div data-panel>
          <div class="panel-content">
            Native browser API for reusable, encapsulated UI components — no framework required.
          </div>
        </div>
      </div>
    </faceless-accordion>`,
  },
  {
    title: '3. Disabled Items',
    description:
      'Items with <code>data-disabled</code> cannot be opened and are skipped during keyboard navigation.',
    html: `
    <faceless-accordion>
      <div>
        <h3 data-trigger>Available</h3>
        <div data-panel>
          <div class="panel-content">
            This panel can be opened and closed normally.
          </div>
        </div>
      </div>
      <div data-disabled>
        <h3 data-trigger>Locked (Premium)</h3>
        <div data-panel>
          <div class="panel-content">
            This content is not accessible.
          </div>
        </div>
      </div>
      <div>
        <h3 data-trigger>Also available</h3>
        <div data-panel>
          <div class="panel-content">
            Arrow keys skip the locked item and jump directly here.
          </div>
        </div>
      </div>
    </faceless-accordion>`,
  },
  {
    title: '4. Nested Accordion',
    description:
      'An accordion inside a panel — clicks and keystrokes in the inner accordion do not affect the outer one.',
    html: `
    <faceless-accordion>
      <div data-open>
        <h3 data-trigger>Outer Panel</h3>
        <div data-panel>
          <div class="panel-content">
            <p style="margin-bottom: 12px;">Here is a nested accordion:</p>

            <faceless-accordion class="nested-accordion" multiple>
              <div>
                <h4 data-trigger>Inner Item A</h4>
                <div data-panel>
                  <div class="panel-content">Content of A — belongs to the inner accordion.</div>
                </div>
              </div>
              <div>
                <h4 data-trigger>Inner Item B</h4>
                <div data-panel>
                  <div class="panel-content">Content of B — the outer panel stays unaffected.</div>
                </div>
              </div>
            </faceless-accordion>
          </div>
        </div>
      </div>
      <div>
        <h3 data-trigger>Second Outer Panel</h3>
        <div data-panel>
          <div class="panel-content">
            This panel is independent of the nested accordion.
          </div>
        </div>
      </div>
    </faceless-accordion>`,
  },
  {
    title: '5. External API',
    description:
      'The buttons use the public API (<code>.open()</code>, <code>.close()</code>, <code>.toggle()</code>) of the component.',
    html: `
    <div class="api-controls">
      <button onclick="document.getElementById('api-accordion').open(0)">open(0)</button>
      <button onclick="document.getElementById('api-accordion').open(1)">open(1)</button>
      <button onclick="document.getElementById('api-accordion').close(0)">close(0)</button>
      <button onclick="document.getElementById('api-accordion').toggle(2)">toggle(2)</button>
    </div>
    <faceless-accordion id="api-accordion" multiple>
      <div>
        <h3 data-trigger>Panel 0</h3>
        <div data-panel>
          <div class="panel-content">Controlled via external API.</div>
        </div>
      </div>
      <div>
        <h3 data-trigger>Panel 1</h3>
        <div data-panel>
          <div class="panel-content">Also controllable via buttons.</div>
        </div>
      </div>
      <div>
        <h3 data-trigger>Panel 2</h3>
        <div data-panel>
          <div class="panel-content">Toggle switches between open and closed.</div>
        </div>
      </div>
    </faceless-accordion>`,
  },
  {
    title: '6. Custom Timing',
    description:
      'Animation can be customized via <code>--accordion-duration</code> and <code>--accordion-easing</code>.',
    html: `
    <faceless-accordion class="slow-accordion">
      <div>
        <h3 data-trigger>Slow Animation (600ms)</h3>
        <div data-panel>
          <div class="panel-content">
            This animation takes 600ms with a cubic-bezier easing for a smoother effect.
          </div>
        </div>
      </div>
      <div>
        <h3 data-trigger>Same Speed</h3>
        <div data-panel>
          <div class="panel-content">
            All panels in this accordion share the same CSS variables.
          </div>
        </div>
      </div>
    </faceless-accordion>`,
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
     Run \`node accordion/ssr-test.mjs\` to regenerate. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faceless Accordion — SSR Showcase</title>
  <script type="module" src="index.js"></script>
  <link rel="stylesheet" href="showcase.css">
  <style>
    .claim { color: var(--td-sunset); font-weight: bold; margin-bottom: 30px; }
    .ssr-concept-banner {
      border-left: 4px solid #10b981;
      background: #ffffff;
      padding: 20px 24px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 40px;
    }
    .ssr-concept-banner p { margin: 8px 0 0; color: #4b5563; line-height: 1.6; }
    .ssr-concept-banner code {
      font-family: monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.875em;
      color: #374151;
    }
  </style>
</head>
<body>

  <h1>SSR Showcase — Accordion</h1>
  <p class="claim">Universal rendering with &lt;faceless-accordion&gt; — progressive enhancement from static HTML</p>

  <div class="ssr-concept-banner">
    <strong>This page was generated by Node.js</strong>
    <p>
      The HTML you see was emitted by <code>node accordion/ssr-test.mjs</code> — proving that
      <code>index.js</code> can be imported server-side without errors. The browser then
      hydrates the <code>&lt;faceless-accordion&gt;</code> elements progressively.
    </p>
  </div>
${sectionsHTML}

  <footer>
    Faceless UI — SSR Showcase (generated by ssr-test.mjs)
  </footer>

</body>
</html>
`;

const outPath = join(__dirname, 'ssr-showcase.html');
writeFileSync(outPath, html, 'utf-8');
console.log(`✅ ssr-showcase.html written → ${outPath}`);

console.log('\n🎉 SSR test complete. Open ssr-showcase.html in a browser to verify hydration.\n');
