# `<faceless-form>` — Documentation

A zero-dependency, framework-agnostic web component that wraps native form controls with built-in validation, full ARIA management, and screen-reader announcements — while leaving all visual presentation entirely to the consumer.

---

## Table of Contents

1. [Core Technical Specifications](#1-core-technical-specifications)
2. [Consumer Markup Convention](#2-consumer-markup-convention)
3. [Built-in Validation](#3-built-in-validation)
4. [Custom Error Messages](#4-custom-error-messages)
5. [Custom Regex](#5-custom-regex)
6. [Managed Attributes (Output)](#6-managed-attributes-output)
7. [Error Summary](#7-error-summary)
8. [Keyboard Navigation](#8-keyboard-navigation)
9. [Public API](#9-public-api)
10. [Events](#10-events)
11. [Accessibility](#11-accessibility)
12. [Universal Rendering](#12-universal-rendering)
13. [Styling & Customization](#13-styling--customization)
14. [Shortcut: `<faceless-input>`](#14-shortcut-faceless-input)
15. [Shortcut: `<faceless-checkbox>`](#15-shortcut-faceless-checkbox)

---

## 1. Core Technical Specifications

### Registration

```html
<script src="form/index.js" defer></script>
```

Custom element tag: `<faceless-form>`

### Shadow DOM layout

```
#shadowRoot (mode: open)
├── <style>           — Minimal functional styles
├── .sr-announcer     — Visually-hidden live region for screen reader announcements
└── <slot>            — Projects the consumer-provided <form> content
```

### Form element ownership

`<faceless-form>` **creates and owns** the `<form>` element. During `connectedCallback`, if no `<form>` is found as a direct child, the component wraps all existing children in a newly created `<form novalidate>`. If a `<form>` is already present (SSR path), it is reused and `novalidate` is set on it.

`novalidate` is always enforced — the component replaces the browser's built-in validation UI with a fully accessible custom UI.

### Host attributes forwarded to `<form>`

| Host attribute | Forwarded | Notes |
|---|---|---|
| `aria-label` | ✓ | Names the `<form>` landmark |
| `action` | ✓ | Submission URL |
| `method` | ✓ | `get` / `post` |
| `enctype` | ✓ | e.g. `multipart/form-data` |

Forwarding happens both at `connectedCallback` (initial) and in `attributeChangedCallback` (live updates).

---

## 2. Consumer Markup Convention

### Minimal example

```html
<faceless-form aria-label="Contact form" action="/contact" method="post">

  <div data-field="name"
       data-error-required="Please enter your name">
    <label data-label>Name</label>
    <input data-input type="text" required autocomplete="name">
    <span data-error></span>
  </div>

  <button type="submit">Submit</button>

</faceless-form>
```

### Full structure with all optional elements

```html
<faceless-form aria-label="Kontaktformular" action="/contact" method="post">

  <!-- Optional error summary shell -->
  <div data-error-summary hidden></div>

  <div data-field="name"
       data-error-required="Bitte gib deinen Namen ein"
       data-error-message="Ungültiger Name">
    <label data-label>Name</label>
    <input data-input type="text" required autocomplete="name">
    <span data-hint>Vor- und Nachname</span>
    <span data-error></span>
  </div>

  <div data-field="email"
       data-error-required="E-Mail-Adresse ist Pflicht"
       data-error-type="Keine gültige E-Mail-Adresse">
    <label data-label>E-Mail</label>
    <input data-input type="email" required autocomplete="email">
    <span data-error></span>
  </div>

  <div data-field="phone"
       data-pattern="^\+?[0-9\s\-]{7,}$"
       data-error-pattern="Ungültige Telefonnummer (mind. 7 Ziffern)">
    <label data-label>Telefon</label>
    <input data-input type="tel" autocomplete="tel">
    <span data-error></span>
  </div>

  <button type="submit">Absenden</button>

</faceless-form>
```

### Consumer data attribute reference (input)

| Attribute | Element | Required | Purpose |
|---|---|---|---|
| `data-field="id"` | Wrapper div | Yes | Field group; the string value is the unique key used in errors/API |
| `data-label` | `<label>` | Recommended | Visible label — linked via `for`/`id` by the component |
| `data-input` | `<input>` / `<textarea>` / `<select>` | Yes | The form control — validated and managed |
| `data-hint` | Any element | No | Supplementary hint — wired via `aria-describedby` |
| `data-error` | `<span>` | Recommended | Error message container (populated by component) |
| `data-error-summary` | `<div>` | No | Optional error summary block shell |
| `data-error-message` | Field wrapper | No | Generic custom error for any validation failure |
| `data-error-required` | Field wrapper | No | Custom error for `valueMissing` |
| `data-error-type` | Field wrapper | No | Custom error for `typeMismatch` / `badInput` |
| `data-error-pattern` | Field wrapper | No | Custom error for `patternMismatch` |
| `data-pattern` | Field wrapper | No | Regex string applied to `input[pattern]` during `_init` |

---

## 3. Built-in Validation

Validation runs on every `submit` event. The component always calls `e.preventDefault()` and drives the result via the `form-submit` event.

### Validation flow

1. `submit` event fires on the `<form>` and is intercepted by the component.
2. `e.preventDefault()` is called — the browser never navigates.
3. `input.checkValidity()` is called on every `[data-input]` inside a `[data-field]`.
4. **Errors found** → `setErrors(errors)` updates the UI; `form-submit` fires with `{ valid: false }`.
5. **No errors** → `clearErrors()` clears any stale state; `form-submit` fires with `{ valid: true }`.

### Supported native constraints (Constraint Validation API)

| Constraint | HTML attribute | `ValidityState` flag |
|---|---|---|
| Required | `required` | `valueMissing` |
| Type | `type="email"` etc. | `typeMismatch` |
| Pattern | `pattern` | `patternMismatch` |
| Min length | `minlength` | `tooShort` |
| Max length | `maxlength` | `tooLong` |
| Min/max | `min` / `max` | `rangeUnderflow` / `rangeOverflow` |
| Step | `step` | `stepMismatch` |

All native HTML constraints are respected — the component reads `input.checkValidity()` rather than re-implementing the rules.

---

## 4. Custom Error Messages

### Priority order (highest to lowest)

1. Per-error-type attribute on field wrapper (`data-error-required`, `data-error-type`, `data-error-pattern`)
2. Generic attribute on field wrapper (`data-error-message`)
3. Browser's locale-specific `input.validationMessage` (fallback)

### Per-error-type attributes

| Attribute | Fires when | `ValidityState` flags |
|---|---|---|
| `data-error-required` | Field is empty | `valueMissing` |
| `data-error-type` | Value doesn't match the input type | `typeMismatch`, `badInput` |
| `data-error-pattern` | Value doesn't match the pattern | `patternMismatch` |

### Example

```html
<div data-field="email"
     data-error-required="An email address is required."
     data-error-type="Please enter a valid email address (e.g. name@example.com).">
  <label data-label>Email</label>
  <input data-input type="email" required>
  <span data-error></span>
</div>
```

---

## 5. Custom Regex

Apply a regular expression to a field's input using `data-pattern` on the field wrapper. During `_init()`, the component copies the value to `input[pattern]`, so the native Constraint Validation API handles matching.

```html
<div data-field="phone"
     data-pattern="^\+?[0-9\s\-]{7,}$"
     data-error-pattern="Please enter a valid phone number (min. 7 digits).">
  <label data-label>Phone</label>
  <input data-input type="tel" autocomplete="tel">
  <span data-error></span>
</div>
```

The pattern is applied once at `_init()` time. If you update `data-pattern` dynamically, call `_init()` again or set `input[pattern]` directly.

---

## 6. Managed Attributes (Output)

These attributes are written by the component and serve as CSS styling hooks.

| Attribute | Element | When present |
|---|---|---|
| `data-invalid` | Field wrapper (`[data-field]`) | Field has an active validation error |

### Styling hook example

```css
/* Default field */
[data-field] input {
  border: 1px solid #d1d5db;
}

/* Invalid field — color change is accompanied by data-invalid (non-color indicator) */
[data-field][data-invalid] input {
  border-color: #ef4444;
  background-color: #fef2f2;
}

[data-field][data-invalid] [data-error] {
  display: block;
  color: #ef4444;
}
```

---

## 7. Error Summary

The error summary is an optional pattern for grouping all validation errors at the top of the form. It improves usability for long forms and is essential for screen readers.

### Shell (consumer provides)

```html
<div data-error-summary hidden></div>
```

The component:
- Sets `tabindex="-1"` on the element during `_init()` so it can receive programmatic focus.
- Populates it with a count heading and a linked list of errors after a failed submit.
- Moves focus to it when it is visible.
- Hides it again when `clearErrors()` is called.

### Generated markup (runtime)

```html
<div data-error-summary tabindex="-1">
  <p>2 Fehler in diesem Formular</p>
  <ul>
    <li><a href="#ff0-name-input">Name: Bitte gib deinen Namen ein</a></li>
    <li><a href="#ff0-email-input">E-Mail: E-Mail-Adresse ist Pflicht</a></li>
  </ul>
</div>
```

Each link targets the corresponding `[data-input]` by its generated ID, so activating it moves focus directly to the invalid field.

---

## 8. Keyboard Navigation

`<faceless-form>` preserves all native form keyboard behaviour:

| Key | Behaviour |
|---|---|
| `Tab` / `Shift+Tab` | Navigate between form controls in DOM order |
| `Enter` (on submit button) | Triggers form submission |
| `Space` (on button) | Triggers form submission |
| `Enter` (on text input) | Submits the form (native browser behaviour) |
| Arrow keys (radio groups) | Handled natively by the browser |
| `Escape` | No special handling (consumer responsibility) |

No positive `tabindex` values are set. DOM order equals visual tab order (WCAG 2.4.3).

### Focus after failed submit

1. If `[data-error-summary]` is present and visible → focus moves to the summary element.
2. Otherwise → focus moves to the first invalid `[data-input]`.

---

## 9. Public API

### `setError(fieldId, message)`

Sets a single error on the field identified by `fieldId`.

```js
form.setError('email', 'This email is already registered.');
```

### `clearError(fieldId)`

Clears the error on a single field.

```js
form.clearError('email');
```

### `setErrors(errorsObj)`

Sets multiple errors at once. Clears all existing errors first, then applies the provided map.

```js
form.setErrors({
  email: 'This email is already registered.',
  name: 'Name contains invalid characters.',
});
```

Also updates the error summary, moves focus, and announces to screen readers.

### `clearErrors()`

Clears all errors, hides the error summary, and announces to screen readers.

```js
form.clearErrors();
```

### `getErrors()`

Returns a plain object `{ fieldId: message }` for all fields that currently have an error.

```js
const errors = form.getErrors();
// { email: 'This email is already registered.' }
```

### `getValues()`

Returns a plain object of all current form values using `FormData`.

```js
const values = form.getValues();
// { name: 'Jane', email: 'jane@example.com' }
```

### `reset()`

Clears all errors and calls the native `form.reset()` to reset all controls to their default values.

```js
form.reset();
```

---

## 10. Events

### `form-submit`

Fired on every submit attempt — both valid and invalid.

| Property | Type | Description |
|---|---|---|
| `bubbles` | `true` | Bubbles up the DOM |
| `composed` | `true` | Crosses shadow DOM boundaries |
| `detail.valid` | `boolean` | `true` if all fields passed validation |
| `detail.values` | `object` | All form values as `{ fieldName: value }` |
| `detail.errors` | `object` | All errors as `{ fieldId: message }` (empty object when valid) |

```js
document.querySelector('faceless-form').addEventListener('form-submit', (e) => {
  if (e.detail.valid) {
    fetch('/submit', {
      method: 'POST',
      body: JSON.stringify(e.detail.values),
    });
  }
});
```

---

## 11. Accessibility

### WCAG 2.2 Compliance

| Success Criterion | Implementation |
|---|---|
| **1.3.1** Info and Relationships | `for`/`id` label linkage via generated UIDs; `aria-describedby` links hint and error spans |
| **1.3.5** Identify Input Purpose | Consumer sets `autocomplete` attributes; docs note included |
| **1.4.1** Use of Color | `data-invalid` data attribute accompanies all color changes as a non-color indicator |
| **1.4.11** Non-text Contrast | Input borders documented at ≥3:1 in showcase.css |
| **2.1.1** Keyboard | Native form keyboard behaviour fully preserved; no keyboard traps |
| **2.4.3** Focus Order | DOM order equals visual tab order; no positive `tabindex` values |
| **2.4.7/13** Focus Visible | `focus-visible` outline 2px solid at ≥3:1 contrast documented in showcase.css |
| **3.3.1** Error Identification | Errors delivered as text via `[data-error]` + `aria-invalid="true"` |
| **3.3.2** Labels or Instructions | `aria-required="true"` set on required inputs; `data-required` attribute on field wrapper enables visible required indicators via CSS; visible labels linked via `for`/`id` |
| **3.3.3** Error Suggestion | `data-error-*` attributes support actionable, specific messages |
| **4.1.2** Name, Role, Value | `aria-invalid`, `aria-required`, `aria-describedby` all managed by component |

### ARIA attributes managed by the component

| Attribute | Element | Value |
|---|---|---|
| `role="form"` (implicit) | `<form>` (inner) | The inner `<form>` with `aria-label` has implicit role `form`, making it a named form landmark; no explicit role is set on the host |
| `aria-label` | `<form>` (inner) | Names the form landmark; forwarded from the `<faceless-form>` host attribute |
| `aria-required="true"` | `[data-input]` | Set when `required` attribute is present |
| `aria-invalid="false"` | `[data-input]` | Default — set during `_init` |
| `aria-invalid="true"` | `[data-input]` | Set when field has an active error |
| `aria-describedby` | `[data-input]` | Space-separated list of hint ID + error ID |
| `id` | `[data-label]`, `[data-input]`, `[data-hint]`, `[data-error]` | Generated UIDs for ARIA linkage |
| `for` | `[data-label]` | Linked to `[data-input]` ID |
| `tabindex="-1"` | `[data-error-summary]` | Allows programmatic focus on the summary |
| `role="region"` | `[data-error-summary]` | Named region landmark for the error summary |
| `data-required` | `[data-field]` | Present when the field's input has `required`; CSS hook for visible required indicators |

### Generated ID format

IDs follow the pattern `ff{uid}-{fieldId}-{role}`:

- `ff0-email-input` — the input element
- `ff0-email-label` — the label element
- `ff0-email-hint` — the hint element
- `ff0-email-error` — the error element

UIDs are instance-scoped counters, ensuring uniqueness even with multiple `<faceless-form>` instances on one page.

### Live region

On first `connectedCallback`, the component creates a shared `aria-live="polite"` element with `id="faceless-form-announcer"` and appends it to `document.body`. A single element is shared across all `<faceless-form>` instances on the page. Placing the live region in the light DOM (rather than the shadow DOM) ensures reliable announcements across all major screen reader / browser combinations.

Announcements:
- The total error count after a failed submit (e.g. `"2 errors in this form"`)
- Individual field errors when `setError()` is called directly (bypasses count)
- `"All errors resolved"` when `clearErrors()` is called

The text is set via `requestAnimationFrame` to ensure reliable announcements in all screen readers.

### Screen reader experience (example flow)

1. User focuses the email input → screen reader announces: *"E-Mail, Pflichtfeld, bearbeitbares Textfeld, Hinweis: Ihre geschäftliche E-Mail-Adresse"*
2. User submits with empty email → screen reader announces: *"1 Fehler in diesem Formular"*; focus moves to the error summary.
3. User activates the summary link → focus moves to the email input.
4. User corrects the input and submits → screen reader announces: *"Alle Fehler behoben"*.

---

## 12. Universal Rendering

`<faceless-form>` is safe to import in any JavaScript environment including Node.js, Deno, and edge runtimes used by SSR/SSG frameworks.

### Guards applied

**1. `isBrowser` constant — top of file:**
```js
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
```

**2. Conditional template creation:**
```js
const template = isBrowser ? document.createElement('template') : null;
if (template) template.innerHTML = `...`;
```

**3. Safe base class:**
```js
const BaseElement = isBrowser ? HTMLElement : class {};
class FacelessForm extends BaseElement { ... }
```

**4. Early return in all lifecycle methods:**
```js
constructor() {
  super();
  if (!isBrowser) return;
  // ...
}
connectedCallback() {
  if (!isBrowser) return;
  // ...
}
```

**5. Guarded registration:**
```js
if (isBrowser) customElements.define('faceless-form', FacelessForm);
```

### SSR markup

In an SSR context, emit the form fields pre-wrapped in `<form novalidate>`:

```html
<faceless-form aria-label="Contact form" action="/contact" method="post">
  <form novalidate>
    <div data-field="name" ...>
      <label data-label>Name</label>
      <input data-input type="text" required id="ff0-name-input">
      <span data-error id="ff0-name-error"></span>
    </div>
    <button type="submit">Submit</button>
  </form>
</faceless-form>
```

When JavaScript runs in the browser, `connectedCallback` finds the existing `<form>` (`:scope > form`) and reuses it instead of creating a new one. The component then re-runs `_init()` to wire ARIA attributes.

**Always emit the `<form>` yourself when rendering from a VDOM framework.** If it is missing, the component creates one and moves every child into it — nodes that React or Vue still consider theirs. A later re-render can then fail with `NotFoundError: Failed to execute 'removeChild' on 'Node'`. With the `<form>` in your own markup, nothing is reparented.

The same applies one level down: `<faceless-input>` and `<faceless-checkbox>` adopt existing `[data-input]` markup instead of rebuilding it (see § 14 and § 15). Server-rendering the fields is what makes the form complete, usable without JavaScript, and free of layout shift.

### Pre-upgrade layout

When the field markup is *not* server-rendered, `<faceless-input>` and `<faceless-checkbox>` are empty inline elements until the component builds their contents — the form then grows by a full field height per field. Load the shipped stylesheet **before** your own:

```html
<link rel="stylesheet" href="form/preflight.css">
<link rel="stylesheet" href="your-form.css">
```

It declares `display: block` on the three hosts (none of them carry a display rule otherwise, not even after the upgrade) and reserves a per-field height while the markup is missing. The placeholder is scoped with `:not(:has([data-input]))`, so a server-rendered field is never given a min-height it might have to shrink out of.

Measure your own fields and set the variables once — the defaults assume a label above a single-line control plus an error slot:

```css
:root {
  --faceless-input-placeholder: 82px;
  --faceless-checkbox-placeholder: 28px;
}
faceless-input[element="textarea"] { --faceless-input-placeholder: 160px; }
```

Both components set `data-ready` once their markup exists, along either path. Use `:not([data-ready])` for any pre-upgrade rule of your own rather than `:not(:defined)`.

### Verification

```sh
node form/ssr-test.mjs
```

Expected output:
```
✅ PASS — index.js imported without errors (isBrowser guards work)
✅ ssr-showcase.html written → .../form/ssr-showcase.html
```

---

## 13. Styling & Customization

`<faceless-form>` imposes **no visual styles**. All styling uses standard CSS selectors targeting the data attributes.

### Recommended baseline

```css
/* Field wrapper */
[data-field] {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}

/* Label */
[data-label] {
  font-weight: 600;
  font-size: 0.875rem;
}

/* Input — 3:1 contrast border for WCAG 1.4.11 */
[data-input] {
  border: 1px solid #6b7280;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 1rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

/* Focus ring — WCAG 2.4.7/13 */
[data-input]:focus-visible {
  outline: 2px solid #FF5958;
  outline-offset: 2px;
}

/* Hint text */
[data-hint] {
  font-size: 0.8rem;
  color: #6b7280;
}

/* Error text (hidden when empty) */
[data-error]:empty {
  display: none;
}
[data-error] {
  font-size: 0.8rem;
  color: #ef4444;
}

/* Invalid state */
[data-field][data-invalid] [data-input] {
  border-color: #ef4444;
}

/* Error summary */
[data-error-summary] {
  border-left: 4px solid #ef4444;
  padding: 12px 16px;
  margin-bottom: 20px;
  background: #fef2f2;
}
[data-error-summary] ul {
  margin: 8px 0 0;
  padding-left: 20px;
}
[data-error-summary] a {
  color: #ef4444;
}
```

### No CSS custom properties

`<faceless-form>` does not expose CSS custom properties on the host. All styling is done via attribute selectors, making it straightforward to integrate with any design system or CSS methodology (BEM, Tailwind, CSS Modules, etc.).

---

## 14. Shortcut: `<faceless-input>`

`<faceless-input>` is a companion component that collapses the verbose 4–5 element field markup into a single tag. It is included in the same `index.js` file — one `<script>` tag gives you both components.

### When to use it

| Use `<faceless-input>` | Use verbose markup |
|---|---|
| Standard text, email, tel, number, url, password, date inputs | Checkboxes / radios (label wraps input — different DOM structure) |
| Textarea | Fields requiring a fully custom label structure |
| Select with `<option>` children | When you need to add arbitrary sibling elements inside the field wrapper |
| Rapid prototyping | When you need exact control over the generated DOM |

Both patterns can coexist in the same `<faceless-form>` — `<faceless-input>` fields and verbose `[data-field]` wrappers are picked up by the same `_init()` pass.

### Minimal example

```html
<faceless-form aria-label="Contact" action="/contact" method="post">

  <faceless-input
    name="email"
    type="email"
    label="E-Mail"
    required
    autocomplete="email"
    error-required="E-Mail ist Pflicht."
    error-type="Keine gültige E-Mail-Adresse.">
  </faceless-input>

  <button type="submit">Submit</button>
</faceless-form>
```

### Attribute reference

#### Input / control attributes — forwarded to the internal element

| Attribute | Forwarded to | Notes |
|---|---|---|
| `name` | `[data-input][name]` + `data-field` on host | Required — identifies the field |
| `type` | `[data-input][type]` | Defaults to `"text"`. Ignored for `element="textarea"` / `element="select"` |
| `element` | Determines tag name | `"input"` (default), `"textarea"`, or `"select"` |
| `required` | `[data-input][required]` | Boolean attribute |
| `placeholder` | `[data-input][placeholder]` | |
| `autocomplete` | `[data-input][autocomplete]` | |
| `minlength` | `[data-input][minlength]` | |
| `maxlength` | `[data-input][maxlength]` | |
| `min` | `[data-input][min]` | |
| `max` | `[data-input][max]` | |
| `step` | `[data-input][step]` | |
| `pattern` | `[data-input][pattern]` + `host.dataset.pattern` | |
| `rows` | `[data-input][rows]` | Useful for `element="textarea"` |
| `disabled` | `[data-input][disabled]` | Boolean attribute |
| `value` | `[data-input][value]` | Sets the default value |

#### Structural attributes — rendered as light DOM children

| Attribute | Rendered as | Notes |
|---|---|---|
| `label` | `<label data-label>` | Label text content |
| `hint` | `<span data-hint>` | Only created when the attribute is present |

#### Error attributes — forwarded to `host.dataset.*`

| HTML attribute | `dataset` key | Read by `<faceless-form>` as |
|---|---|---|
| `error-required` | `errorRequired` | `d.errorRequired` (`valueMissing`) |
| `error-type` | `errorType` | `d.errorType` (`typeMismatch` / `badInput`) |
| `error-pattern` | `errorPattern` | `d.errorPattern` (`patternMismatch`) |
| `error-message` | `errorMessage` | `d.errorMessage` (any other failure) |

### Textarea

```html
<faceless-input
  element="textarea"
  name="message"
  label="Nachricht"
  required
  rows="4"
  placeholder="Deine Nachricht …"
  error-required="Bitte gib eine Nachricht ein.">
</faceless-input>
```

### Select

Place `<option>` (and `<optgroup>`) elements as direct children of `<faceless-input>`. The component moves them into the internal `<select>` during upgrade.

```html
<faceless-input
  element="select"
  name="subject"
  label="Thema"
  required
  error-required="Bitte wähle ein Thema.">
  <option value="">— Bitte wählen —</option>
  <option value="support">Support</option>
  <option value="feedback">Feedback</option>
</faceless-input>
```

### Mixing verbose and shortcut in the same form

```html
<faceless-form aria-label="Mixed form">

  <!-- verbose field -->
  <div data-field="name" data-error-required="Name ist Pflicht.">
    <label data-label>Name</label>
    <input data-input type="text" required>
    <span data-error></span>
  </div>

  <!-- shortcut field -->
  <faceless-input
    name="email"
    type="email"
    label="E-Mail"
    required
    error-required="E-Mail ist Pflicht.">
  </faceless-input>

  <button type="submit">Submit</button>
</faceless-form>
```

Both fields are discovered by the same `querySelectorAll('[data-field]')` pass in `_init()`.

### `attributeChangedCallback` — live updates

Updating observed attributes after mount updates the internal element:

```js
const input = document.querySelector('faceless-input[name="email"]');
input.setAttribute('label', 'Neue Beschriftung');   // → label text updates
input.setAttribute('placeholder', 'neu@…');          // → input placeholder updates
input.removeAttribute('required');                    // → required removed from control
```

### Limitations

- **`element` changes at runtime** (e.g. from `input` to `textarea`) are not supported after the initial mount. The control tag is fixed at `connectedCallback` time.

### Universal Rendering (SSR)

`<faceless-input>` is safe to import in Node.js, Deno, and edge runtimes. All DOM access is guarded by the shared `isBrowser` constant.

In an SSR context, pre-render the internal light DOM manually:

```html
<faceless-input data-field="email" data-error-required="E-Mail ist Pflicht." ...>
  <label data-label>E-Mail</label>
  <input data-input type="email" name="email" required id="ff0-email-input">
  <span data-error id="ff0-email-error"></span>
</faceless-input>
```

When JavaScript runs in the browser, `connectedCallback` detects the existing `[data-input]` child and skips DOM creation — it only calls `_wireAttributes()` to sync `dataset.*` properties that `<faceless-form>` reads during validation.

---

## 15. Shortcut: `<faceless-checkbox>`

`<faceless-checkbox>` is a companion component for checkboxes and radio buttons. Like `<faceless-input>`, it collapses the verbose markup pattern into a single tag while producing the correct accessible DOM structure (input wrapped inside label). It is included in the same `index.js` file.

### When to use it

| Use `<faceless-checkbox>` | Use verbose markup |
|---|---|
| Standard checkboxes | Complex checkbox layouts with custom content inside the label |
| Radio groups | When you need extra elements inside the label wrapper |
| Terms & conditions, newsletter opt-in | When you need exact control over the generated DOM |

### Minimal example — Checkbox

```html
<faceless-form aria-label="Settings">

  <faceless-checkbox
    name="terms"
    label="I accept the terms and conditions"
    required
    error-required="You must accept the terms.">
  </faceless-checkbox>

  <button type="submit">Submit</button>
</faceless-form>
```

### Radio group example

Radios with the same `name` form a group. Selecting one automatically unchecks the others.

**Important:** Always wrap radio groups in `<fieldset>` with a `<legend>` so screen readers announce the group label (WCAG 1.3.1). Since all elements live in light DOM, native `<fieldset>`/`<legend>` semantics work without any ARIA workarounds.

```html
<faceless-form aria-label="Plan selection">

  <fieldset>
    <legend>Choose a plan</legend>

    <faceless-checkbox
      name="plan"
      type="radio"
      label="Free"
      value="free"
      required
      error-required="Please choose a plan.">
    </faceless-checkbox>

    <faceless-checkbox
      name="plan"
      type="radio"
      label="Pro — $9/month"
      value="pro">
    </faceless-checkbox>

    <faceless-checkbox
      name="plan"
      type="radio"
      label="Enterprise — $29/month"
      value="enterprise">
    </faceless-checkbox>
  </fieldset>

  <button type="submit">Continue</button>
</faceless-form>
```

Reset the default `<fieldset>` browser styles with:

```css
fieldset { border: none; margin: 0; padding: 0; }
legend   { font-weight: 600; font-size: 0.875rem; padding: 0; margin-bottom: 8px; }
```

### Generated DOM

```html
<faceless-checkbox data-field="terms" name="terms" label="I accept the terms">
  <!-- Generated light DOM: -->
  <label data-label>
    <input type="checkbox" data-input name="terms" value="on" />
    <span data-label-text>I accept the terms</span>
  </label>
  <span data-hint>Optional hint text</span>
  <span data-error></span>
</faceless-checkbox>
```

The `<input>` is **inside** the `<label>` — implicit label association, no `for`/`id` needed.

### Attribute reference

#### Control attributes — forwarded to the internal `<input>`

| Attribute | Forwarded to | Notes |
|---|---|---|
| `name` | `[data-input][name]` + `data-field` on host | Required — identifies the field |
| `type` | `[data-input][type]` | `"checkbox"` (default) or `"radio"` |
| `value` | `[data-input][value]` | Value sent with the form. Defaults to `"on"` |
| `checked` | `[data-input].checked` | Boolean attribute — initial checked state |
| `required` | `[data-input][required]` | Boolean attribute |
| `disabled` | `[data-input][disabled]` | Boolean attribute |

#### Structural attributes — rendered as light DOM children

| Attribute | Rendered as | Notes |
|---|---|---|
| `label` | `<span data-label-text>` inside `<label data-label>` | Label text content |
| `hint` | `<span data-hint>` | Only created when the attribute is present |

#### Error attributes — forwarded to `host.dataset.*`

| HTML attribute | `dataset` key | Read by `<faceless-form>` as |
|---|---|---|
| `error-required` | `errorRequired` | `d.errorRequired` (`valueMissing`) |
| `error-message` | `errorMessage` | `d.errorMessage` (any other failure) |

### Properties (getter/setter)

| Property | Type | Notes |
|---|---|---|
| `name` | `string` | |
| `type` | `string` | `"checkbox"` or `"radio"` |
| `label` | `string` | |
| `hint` | `string \| null` | |
| `value` | `string` | Defaults to `"on"` |
| `checked` | `boolean` | Reads from/writes to the internal `<input>` |
| `disabled` | `boolean` | |
| `required` | `boolean` | |
| `group` | `string` | Reserved for future use |
| `errorRequired` | `string` | |
| `errorMessage` | `string` | |

### Events

#### `check-change` / `checkchange`

Fired when the checkbox or radio state changes.

| Property | Type | Description |
|---|---|---|
| `bubbles` | `true` | Bubbles up the DOM |
| `composed` | `true` | Crosses shadow DOM boundaries |
| `detail.name` | `string` | The field name |
| `detail.value` | `string` | The field value |
| `detail.checked` | `boolean` | Whether the control is checked |

```js
document.querySelector('faceless-checkbox').addEventListener('check-change', (e) => {
  console.log(e.detail.checked); // true or false
});
```

#### Native events

| Event | Purpose |
|---|---|
| `change` | Native change event — Angular `CheckboxControlValueAccessor` compatibility |
| `blur` | Fires when focus leaves the component entirely (`composed: true`) |
| `focusout` | Bubbling focus-out event (`composed: true`) |

### Managed attributes (output)

| Attribute | Element | When present |
|---|---|---|
| `data-checked` | `<faceless-checkbox>` host | Control is currently checked |
| `data-field` | `<faceless-checkbox>` host | Always present — mirrors `name` |

### Radio group behaviour

When `type="radio"`, selecting a radio automatically unchecks all other `<faceless-checkbox>` elements with the same `name` within the nearest `<faceless-form>`, `<form>`, or document. The `data-checked` attribute is kept in sync.

For validation, only one radio in the group needs the `required` attribute — the browser's native constraint validation handles group-level required checks.

### Form-Associated Custom Element

`<faceless-checkbox>` is a form-associated custom element (`static formAssociated = true`). It participates in native `<form>` submission and supports:

- `formResetCallback()` — resets to the initial `checked` state
- `formDisabledCallback()` — forwards disabled state to the internal input

### Accessibility

- No additional `role` or `aria-checked` needed — the native `<input type="checkbox|radio">` provides its own semantics
- Label association is implicit via the wrapping `<label>`
- `required` attribute is forwarded to the internal `<input>`, triggering native screen reader announcements
- Error messages are linked via `aria-describedby` by `<faceless-form>` during `_init()`

### Universal Rendering (SSR)

`<faceless-checkbox>` is safe to import in Node.js, Deno, and edge runtimes. All DOM access is guarded by the shared `isBrowser` constant.

In an SSR context, pre-render the internal light DOM manually:

```html
<faceless-checkbox data-field="terms" name="terms" label="I accept the terms">
  <label data-label>
    <input data-input type="checkbox" name="terms" value="on" required>
    <span data-label-text>I accept the terms</span>
  </label>
  <span data-error></span>
</faceless-checkbox>
```

When JavaScript runs in the browser, `connectedCallback` detects the existing `[data-input]` child and skips DOM creation — it only calls `_wireAttributes()` and `_bindControlEvents()` to sync state.
