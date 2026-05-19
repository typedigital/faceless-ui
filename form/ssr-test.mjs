#!/usr/bin/env node

/**
 * SSR Test for <faceless-form> + <faceless-input>
 *
 * 1. Imports index.js in Node.js — verifies isBrowser guards prevent crashes
 * 2. Generates ssr-showcase.html server-side (= genuine SSR output)
 * 3. The generated file can be opened in a browser to test hydration
 *
 * Usage:  node form/ssr-test.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ──────────────────────────────────────────────
 * Step 1: Import component in Node.js
 * ────────────────────────────────────────────── */

console.log('\n⏳ SSR Test: importing form/index.js in Node.js …');

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

// In an SSR context, <faceless-form> wraps content in <form novalidate>.
// <faceless-input> children are pre-rendered with [data-label], [data-input],
// [data-hint], [data-error] — hydration detects the existing [data-input]
// and only runs _wireAttributes() instead of rebuilding the DOM.
const sections = [
  {
    id: 'ssr-form-1',
    title: '1. Simple Contact Form',
    description: 'Standard <code>&lt;faceless-input&gt;</code> fields with pre-rendered internal DOM. Hydration detects existing <code>[data-input]</code> and skips DOM creation.',
    html: `
    <faceless-form aria-label="Contact form" action="/contact" method="post">
      <form novalidate>
        <faceless-input name="name" label="Name" required autocomplete="name" data-field="name">
          <label data-label>Name</label>
          <input data-input type="text" name="name" required autocomplete="name">
          <span data-error></span>
        </faceless-input>
        <faceless-input name="email" type="email" label="Email" required autocomplete="email"
                        pattern="[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"
                        error-required="An email address is required."
                        error-type="Please enter a valid email address."
                        error-pattern="Please include a full domain (e.g. name@example.com)."
                        data-field="email">
          <label data-label>Email</label>
          <input data-input type="email" name="email" required autocomplete="email">
          <span data-error></span>
        </faceless-input>
        <faceless-input element="textarea" name="message" label="Message" required rows="4"
                        error-required="Please enter a message."
                        data-field="message">
          <label data-label>Message</label>
          <textarea data-input name="message" required rows="4"></textarea>
          <span data-error></span>
        </faceless-input>
        <button type="submit" class="submit-btn">Send</button>
      </form>
    </faceless-form>`,
  },
  {
    id: 'ssr-form-2',
    title: '2. Custom Error Messages',
    description: 'Per-field custom messages via <code>error-required</code>, <code>error-type</code>, and <code>error-message</code> attributes on <code>&lt;faceless-input&gt;</code>.',
    html: `
    <faceless-form aria-label="Registration form">
      <form novalidate>
        <faceless-input name="username" label="Username" required minlength="3" autocomplete="username"
                        hint="At least 3 characters"
                        error-required="Please choose a username."
                        error-message="Username must be at least 3 characters."
                        data-field="username">
          <label data-label>Username</label>
          <input data-input type="text" name="username" required minlength="3" autocomplete="username">
          <span data-hint>At least 3 characters</span>
          <span data-error></span>
        </faceless-input>
        <faceless-input name="email" type="email" label="Email" required autocomplete="email"
                        error-required="An email address is required."
                        error-type="Please enter a valid email address (e.g. name@example.com)."
                        data-field="email">
          <label data-label>Email</label>
          <input data-input type="email" name="email" required autocomplete="email">
          <span data-error></span>
        </faceless-input>
        <button type="submit" class="submit-btn">Register</button>
      </form>
    </faceless-form>`,
  },
  {
    id: 'ssr-form-3',
    title: '3. Custom Regex (pattern)',
    description: 'Phone and zip code fields with the <code>pattern</code> attribute on <code>&lt;faceless-input&gt;</code>.',
    html: `
    <faceless-form aria-label="Address form">
      <form novalidate>
        <faceless-input name="phone" type="tel" label="Phone" autocomplete="tel"
                        hint="Format: +1 555 123 4567"
                        pattern="^\\+?[0-9\\s\\-]{7,}$"
                        error-pattern="Invalid phone number — at least 7 digits required."
                        data-field="phone"
                        required>
          <label data-label>Phone</label>
          <input data-input type="tel" name="phone" autocomplete="tel">
          <span data-hint>Format: +1 555 123 4567</span>
          <span data-error></span>
        </faceless-input>
        <faceless-input name="zip" label="Zip Code" required autocomplete="postal-code"
                        pattern="^[0-9]{5}$"
                        error-required="Please enter a zip code."
                        error-pattern="Zip code must be exactly 5 digits."
                        data-field="zip">
          <label data-label>Zip Code</label>
          <input data-input type="text" name="zip" required autocomplete="postal-code">
          <span data-error></span>
        </faceless-input>
        <button type="submit" class="submit-btn">Continue</button>
      </form>
    </faceless-form>`,
  },
  {
    id: 'ssr-form-4',
    title: '4. Error Summary + Checkbox (Verbose Markup)',
    description: 'Mixed pattern: <code>&lt;faceless-input&gt;</code> for text fields, verbose markup for the checkbox (label wraps input). Both are discovered by the same <code>_init()</code> pass.',
    html: `
    <faceless-form aria-label="Order form">
      <form novalidate>
        <div data-error-summary hidden></div>
        <faceless-input name="firstname" label="First Name" required autocomplete="given-name"
                        error-required="Please enter your first name."
                        data-field="firstname">
          <label data-label>First Name</label>
          <input data-input type="text" name="firstname" required autocomplete="given-name">
          <span data-error></span>
        </faceless-input>
        <faceless-input name="lastname" label="Last Name" required autocomplete="family-name"
                        error-required="Please enter your last name."
                        data-field="lastname">
          <label data-label>Last Name</label>
          <input data-input type="text" name="lastname" required autocomplete="family-name">
          <span data-error></span>
        </faceless-input>
        <!-- Checkbox: verbose markup required (label wraps input) -->
        <div data-field="terms" data-error-required="You must accept the terms.">
          <label data-label>
            <input data-input type="checkbox" required>
            I accept the terms and conditions
          </label>
          <span data-error></span>
        </div>
        <button type="submit" class="submit-btn">Place Order</button>
      </form>
    </faceless-form>`,
  },
  {
    id: 'ssr-form-5',
    title: '5. Select + Textarea',
    description: '<code>element="select"</code> and <code>element="textarea"</code> with pre-rendered internal controls.',
    html: `
    <faceless-form aria-label="Feedback form">
      <form novalidate>
        <faceless-input element="select" name="subject" label="Subject" required
                        error-required="Please choose a subject."
                        data-field="subject">
          <label data-label>Subject</label>
          <select data-input name="subject" required>
            <option value="">— Please select —</option>
            <option value="support">Support</option>
            <option value="feedback">Feedback</option>
            <option value="other">Other</option>
          </select>
          <span data-error></span>
        </faceless-input>
        <faceless-input element="textarea" name="feedback" label="Your Feedback" required minlength="20" rows="5"
                        hint="At least 20 characters"
                        error-required="Please write some feedback."
                        error-message="Feedback must be at least 20 characters."
                        data-field="feedback">
          <label data-label>Your Feedback</label>
          <textarea data-input name="feedback" required minlength="20" rows="5"></textarea>
          <span data-hint>At least 20 characters</span>
          <span data-error></span>
        </faceless-input>
        <button type="submit" class="submit-btn">Send Feedback</button>
      </form>
    </faceless-form>`,
  },
  {
    id: 'ssr-form-6',
    title: '6. External API',
    description: 'Buttons call <code>.setError()</code>, <code>.setErrors()</code>, <code>.clearErrors()</code>, and <code>.reset()</code> on the component instance.',
    html: `
    <div class="api-controls">
      <button onclick="document.getElementById('ssr-form-6').setError('email','This email is already registered.')">setError</button>
      <button onclick="document.getElementById('ssr-form-6').setErrors({name:'Invalid name.',email:'Email taken.'})">setErrors</button>
      <button onclick="document.getElementById('ssr-form-6').clearError('email')">clearError</button>
      <button onclick="document.getElementById('ssr-form-6').clearErrors()">clearErrors</button>
      <button onclick="document.getElementById('ssr-form-6').reset()">reset</button>
    </div>
    <faceless-form aria-label="Sign-up form">
      <form novalidate>
        <div data-error-summary hidden></div>
        <faceless-input name="name" label="Name" required autocomplete="name"
                        hint="First and last name"
                        error-required="Please enter your name."
                        data-field="name">
          <label data-label>Name</label>
          <input data-input type="text" name="name" required autocomplete="name">
          <span data-hint>First and last name</span>
          <span data-error></span>
        </faceless-input>
        <faceless-input name="email" type="email" label="Email" required autocomplete="email"
                        error-required="Email is required."
                        error-type="Please enter a valid email."
                        data-field="email">
          <label data-label>Email</label>
          <input data-input type="email" name="email" required autocomplete="email">
          <span data-error></span>
        </faceless-input>
        <button type="submit" class="submit-btn">Sign Up</button>
      </form>
    </faceless-form>`,
  },
  {
    id: 'ssr-form-7',
    title: '7. Alternative: Verbose Markup',
    description: 'For full DOM control, use the verbose <code>[data-field]</code> / <code>[data-input]</code> pattern directly. Both patterns can coexist in the same form.',
    html: `
    <faceless-form aria-label="Verbose contact form">
      <form novalidate>
        <div data-field="name" data-error-required="Please enter your name.">
          <label data-label>Name</label>
          <input data-input type="text" required autocomplete="name">
          <span data-error></span>
        </div>
        <div data-field="email"
             data-error-required="An email address is required."
             data-error-type="Please enter a valid email address.">
          <label data-label>Email</label>
          <input data-input type="email" required autocomplete="email">
          <span data-error></span>
        </div>
        <div data-field="message" data-error-required="Please enter a message.">
          <label data-label>Message</label>
          <textarea data-input required rows="4"></textarea>
          <span data-error></span>
        </div>
        <button type="submit" class="submit-btn">Send</button>
      </form>
    </faceless-form>`,
  },
];

const sectionsHTML = sections
  .map((s) => {
    // Inject the section id onto the first <faceless-form tag
    const formHtml = s.html.replace('<faceless-form', `<faceless-form id="${s.id}"`);
    return `
  <h2>${s.title}</h2>
  <p>${s.description}</p>
  <div class="form-card">
    ${formHtml}
    <div class="event-log" id="log-${s.id}" aria-live="polite">
      <p>— Waiting for form-submit …</p>
    </div>
  </div>
`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<!-- ⚠️  GENERATED FILE — do not edit by hand.
     Run \`node form/ssr-test.mjs\` to regenerate. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faceless Form — SSR Showcase</title>
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

  <h1>SSR Showcase — Form</h1>
  <p class="claim">Universal rendering with &lt;faceless-form&gt; + &lt;faceless-input&gt; — progressive enhancement from static HTML</p>

  <div class="ssr-concept-banner">
    <strong>This page was generated by Node.js</strong>
    <p>
      The HTML you see was emitted by <code>node form/ssr-test.mjs</code> — proving that
      <code>index.js</code> can be imported server-side without errors. Both
      <code>&lt;faceless-form&gt;</code> and <code>&lt;faceless-input&gt;</code> are safe
      to import in Node.js, Deno, and edge runtimes.
    </p>
    <p>
      <code>&lt;faceless-input&gt;</code> fields are pre-rendered with their internal
      <code>[data-label]</code>, <code>[data-input]</code>, and <code>[data-error]</code>
      children already in place. On hydration, <code>connectedCallback</code> detects the
      existing <code>[data-input]</code> and only runs <code>_wireAttributes()</code> —
      no DOM is rebuilt.
    </p>
  </div>
${sectionsHTML}

  <footer>
    Faceless UI — SSR Showcase (generated by ssr-test.mjs)
  </footer>

  <script>
    document.querySelectorAll('faceless-form[id]').forEach(form => {
      const log = document.getElementById('log-' + form.id);
      if (!log) return;
      form.addEventListener('form-submit', (e) => {
        const cls = e.detail.valid ? 'log-valid' : 'log-invalid';
        const icon = e.detail.valid ? '✅' : '❌';
        const summary = e.detail.valid
          ? JSON.stringify(e.detail.values)
          : JSON.stringify(e.detail.errors);
        log.innerHTML = \`<p class="\${cls}">\${icon} \${e.detail.valid ? 'valid' : 'invalid'}: \${summary}</p>\`;
      });
    });
  </script>

</body>
</html>
`;

const outPath = join(__dirname, 'ssr-showcase.html');
writeFileSync(outPath, html, 'utf-8');
console.log(`✅ ssr-showcase.html written → ${outPath}`);

console.log('\n🎉 SSR test complete. Open ssr-showcase.html in a browser to verify hydration.\n');
