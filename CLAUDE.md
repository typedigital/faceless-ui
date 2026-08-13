# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Faceless UI is a zero-dependency, framework-agnostic web component library implementing the **Faceless Component** pattern: logic/state/a11y are handled by the component, while visual presentation is entirely left to the consumer.

## Development

**No build system, no package manager, no dependencies.** The project is vanilla JavaScript using the Web Components API (Custom Elements + Shadow DOM). Each component is a single `.js` file imported directly via `<script>` tags.

To develop/test locally, open `carousel/showcase.html` in a browser (use a local server to avoid CORS issues with ES modules if needed).

## Architecture

### Component Structure

Each component lives in its own directory (e.g., `carousel/`) containing:
- `index.js` — The web component implementation
- `docs.md` — Feature documentation and API reference
- `showcase.html` + `showcase.css` — Interactive demo page

### FacelessCarousel (`carousel/index.js`)

Single class `FacelessCarousel extends HTMLElement`, registered as `<faceless-carousel>`.

**Shadow DOM layout:**
```
#shadowRoot (mode: open)
├── <style>          — Internal functional styles + CSS custom properties
├── div.viewport     — Overflow container, handles masking (::part="viewport"))
│   └── div.track    — Flex row, translated via transform (::part="track"))
│       └── <slot>   — Projects user-provided slide elements
└── div.dots-container — Pagination dots (::part="dots-container"))
```

**Key internals:**
- `state` object holds all mutable state (drag position, current index, autoplay timer, etc.)
- `config` object holds physics constants: `friction` (0.92), `elasticity` (0.12), `wheelThreshold` (50)
- Continuous `requestAnimationFrame` loop (`_raf`) drives all animation — interpolates `currentTranslate` toward `targetTranslate` using elasticity
- Loop mode works by cloning slides (prepend + append buffers of `ceil(itemsPerView) + 2` clones) and seamlessly teleporting position when boundaries are crossed
- `_measure()` recalculates slide dimensions from viewport width, CSS variables, and attributes — called on resize and attribute changes
- `_syncActiveStates()` manages `data-active` and `data-visible` on every frame (visual state only — ARIA is handled separately by `_applyA11yDefaults`)

**Public API:** `next()`, `prev()`, `goTo(index, animate = true)`

**Configuration:** HTML attributes (`items-per-view`, `gap`, `loop`, `peek`, `peek-type`, `show-dots`, `autoplay`, `interval`, `mousewheel`, `speed`) and CSS variables (`--items-per-view`, `--gap`, `--dot-color`, `--dot-active-color`, `--dot-size`, `--dot-active-width`). CSS variables enable responsive breakpoints via media queries.

**Conventions:**
- All private methods prefixed with `_` (not enforced by language)
- Methods are bound in constructor for use as event handlers
- Cloned slides get `.clone` class and preserve `data-slide-idx` from their original
- `data-visible` / `data-active` data attributes on slides are the primary hooks for consumer styling

## Universal Rendering (SSR / SSG / CSR)

Every component must be safe to import in non-browser environments (Node.js, Deno, Edge, SSR/SSG pipelines) without throwing errors.

### Required Pattern

Apply these five guards to every new component, in this exact order:

**1. `isBrowser` constant — top of file, before any DOM access:**
```js
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
```

**2. Conditional template creation:**
```js
const template = isBrowser ? document.createElement('template') : null;
if (template) template.innerHTML = `...`;
```

**3. Safe base class — `HTMLElement` does not exist in Node.js:**
```js
const BaseElement = isBrowser ? HTMLElement : class {};

class FacelessComponent extends BaseElement {
```

**4. Early return in all lifecycle methods:**
```js
constructor() {
  super();
  if (!isBrowser) return;
  // DOM work here
}

connectedCallback() {
  if (!isBrowser) return;
  // event listeners, queries, observers here
}

disconnectedCallback() {
  if (!isBrowser) return;
  // cleanup here
}

attributeChangedCallback() {
  if (!isBrowser) return;
  // re-render logic here
}
```

**5. Guarded registration:**
```js
if (isBrowser) customElements.define('faceless-component', FacelessComponent);
```

### Rationale

Web Components rely on `document`, `window`, `ResizeObserver`, `requestAnimationFrame`, and the Custom Elements registry — none of which exist in server runtimes. Without these guards, importing a component file in an SSR/SSG context throws immediately. With the guards, the file is safe to import anywhere: the element tag is preserved in server-rendered HTML and hydrates fully once JavaScript runs in the client. No framework-specific workarounds or configuration are needed.

### Documentation

Each component's `docs.md` must include a "Universal Rendering" section (see `carousel/docs.md` § 9 or `accordion/docs.md` § 9 as reference).

## Pre-Upgrade Layout

Importing safely on the server is only half of SSR support. Between the first paint and the moment a component is ready, its markup is present but unstyled and unarranged — and when the component takes over, the geometry changes. That change is a layout shift, and it is what users actually notice after a deploy with a cold cache.

**Every component ships a `preflight.css` next to its `index.js`,** and its `docs.md` documents it as a required integration step. Consumers load it before their own styles.

### The three rules

**1. Emulate the target layout where the geometry is knowable; reserve a box where it is not.**

`min-height` is only the right tool when the component grows from nothing (`faceless-input`). When light-DOM content is present but wrongly arranged, the pre-upgrade box is usually *too large*, and a min-height does nothing:

| Component | Pre-upgrade state | Preflight strategy |
|---|---|---|
| `faceless-carousel` | All slides stacked vertically | Emulate the row via `--items-per-view` / `--gap` |
| `faceless-accordion` | All panels open | Pre-collapse panels, mirror `data-open` |
| `faceless-navigation` | Raw expanded list, no styles match | Reserve a box, clip the content (three target geometries) |
| `faceless-input` / `-checkbox` | Empty inline element | `min-height`, scoped to `:not(:has([data-input]))` |

Prefer emulation driven by the same CSS custom properties the component reads — the placeholder then follows the consumer's responsive media queries for free. Document any attribute-only configuration that CSS cannot see.

**2. Gate on a readiness marker, and know which of the two windows a rule belongs to.**

`:defined` flips when the definition is registered, which is often long before the component is laid out — the accordion waits for `slotchange`, the carousel's `_deferredInit()` waits for `window.load`. So every component sets `data-ready` on its host once its layout is final, and that is the hook for anything that must hold until then. (`faceless-navigation` uses its existing `data-type` attribute rather than adding a redundant one.)

But the two hooks are not interchangeable, because there are two windows:

| Window | Hook | Shadow DOM |
|---|---|---|
| Before the upgrade | `:not(:defined)` | absent — the host must fake the entire layout |
| Upgraded, not yet ready | `:not([data-ready])` | live and already rendering its own chrome |

**Host-level rules that substitute for the Shadow DOM belong on `:not(:defined)`.** Leaving them on `:not([data-ready])` applies them *on top of* the chrome the component now renders itself — reserved space is counted twice, and releasing the marker then produces exactly the shift the placeholder was meant to prevent. `carousel/preflight.css` splits along this line: host layout and the dots/play-pause strip on `:not(:defined)`, slide sizing on `:not([data-ready])` because `--internal-slide-width` is still `0px` in that window.

Set the marker on *every* exit path of the init routine, including early returns for empty content — otherwise an empty component stays hidden forever.

Verify the split by asking, for each declaration: *does the Shadow DOM already do this once it exists?* If yes, the rule is pre-upgrade only.

**3. State the no-JavaScript consequence.**

A placeholder that hides content is a content loss when the bundle never arrives. Where that applies, `preflight.css` and `docs.md` must carry the `<noscript>` escape hatch.

### Server-rendered markup wins over any placeholder

Components that build light-DOM markup must **adopt** existing markup rather than rebuild it — `faceless-nav-item` (`[part="toggle"]`), `faceless-input` and `faceless-checkbox` (`[data-input]`), `faceless-form` (`:scope > form`). This removes the shift at the source and is mandatory for VDOM frameworks: rebuilding moves framework-owned nodes and breaks later re-renders with `NotFoundError: Failed to execute 'removeChild' on 'Node'`.

Adoption must also be idempotent — `attributeChangedCallback` may fire several times during a single upgrade, and it must only write attributes, never restructure the DOM.

### Declarative Shadow DOM

Every shadow component tolerates a Shadow Root the parser attached before the upgrade, so post-build DSD injection stays possible:

```js
if (!this.shadowRoot) {
  this.attachShadow({ mode: 'open' });
  this.shadowRoot.appendChild(template.content.cloneNode(true));
}
```

Keep styles as an inline `<style>` in the template. `adoptedStyleSheets` cannot be serialised into HTML and would break DSD.

## Accessibility (A11y)

Every component must ship with full keyboard and screen reader support. No ARIA responsibility should fall on the consumer. The following patterns are mandatory for all new components.

### Required Pattern

Apply these rules to every new component. Reference implementation: `carousel/index.js` and `carousel/docs.md` § 8.

**1. Host landmark — in `connectedCallback`, after `tabindex`:**
```js
this.setAttribute('role', 'region');
this.setAttribute('aria-roledescription', '<component-type>');  // e.g. 'carousel', 'accordion'
if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', '<ComponentType>');
```
This makes the component a named landmark so screen reader users can skip past it entirely.

**2. Per-item ARIA — in `_init`, after indexing children:**
```js
rawItems.forEach((item, idx) => {
  item.setAttribute('role', 'group');
  item.setAttribute('aria-roledescription', '<item-type>');  // e.g. 'slide', 'panel'
  item.setAttribute('aria-label', `<ItemType> ${idx + 1} of ${total}`);
});
```

**3. Live region — announce state changes:**
Add a visually-hidden `aria-live="polite"` element in the Shadow DOM. Update its `textContent` on every navigation/state change so screen readers announce the new position.

Shadow DOM style:
```css
.sr-announcer {
  position: absolute; width: 1px; height: 1px; padding: 0;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```

Shadow DOM element:
```html
<div class="sr-announcer" aria-live="polite" aria-atomic="true"></div>
```

**4. Separate visual state from ARIA state:**
- Per-frame loops (`_syncActiveStates`, `_raf`) must only manage **visual** data attributes (`data-active`, `data-visible`).
- ARIA attributes (`aria-hidden`, `tabindex`) must be set **once** at init and after structural changes (e.g. clone refresh), never on every frame.
- Use a dedicated `_applyA11yDefaults()` method for this.

**5. Clone isolation (loop mode):**
```js
_applyA11yDefaults() {
  Array.from(this.children).forEach(el => {
    if (el.classList.contains('clone')) {
      el.setAttribute('aria-hidden', 'true');
      el.querySelectorAll('a, button, input').forEach(c => c.setAttribute('tabindex', '-1'));
    } else {
      el.removeAttribute('aria-hidden');
      el.querySelectorAll('a, button, input').forEach(c => c.removeAttribute('tabindex'));
    }
  });
}
```
Call this at the end of `_init()` and at the end of `_refreshClones()`.

**6. Focus-driven scroll — `_onFocusIn`:**
When any focusable element receives focus, scroll/navigate the component to bring that item fully into view. This ensures Tab navigation works for off-screen items.

**7. Autoplay pause on interaction:**
If the component has autoplay or automatic state changes, pause on `mouseenter` and `focusin`, resume on `mouseleave` and `focusout`.

### Key Principle: Visual State vs. A11y State

This separation is critical and was a hard-won lesson from the carousel implementation:

| Concern | Managed by | When updated | Attributes |
|---|---|---|---|
| Visual | `_syncActiveStates()` | Every frame (RAF) | `data-active`, `data-visible` |
| Accessibility | `_applyA11yDefaults()` | Init + structural changes | `aria-hidden`, `tabindex`, `role`, `aria-label` |

Conflating these (e.g. setting `aria-hidden` in a per-frame loop based on scroll position) blocks keyboard access to off-screen items and breaks screen reader navigation.

### Documentation

Each component's `docs.md` must include an "Accessibility" section documenting all ARIA attributes, keyboard shortcuts, screen reader behavior, and focus management (see `carousel/docs.md` § 8 as reference).

## Custom Elements Manifest (CEM)

The project uses a [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) to provide machine-readable metadata for IDE autocompletion across all frameworks.

### How It Works

JSDoc annotations on the component classes are the **single source of truth**. The `@custom-elements-manifest/analyzer` reads them and generates `custom-elements.json`.

```bash
npm run cem          # regenerates custom-elements.json
```

### Mandatory Maintenance Rule

**Every change to a component's public API must be reflected in its JSDoc annotations.** This includes:

- Adding, removing, or renaming an **attribute** → update `@attr` tags
- Adding, removing, or changing a **dispatched event** → update `@fires` tags
- Adding or removing a **CSS custom property** → update `@cssprop` tags
- Adding or removing a **`::part`** → update `@csspart` tags
- Adding or removing a **`<slot>`** → update `@slot` tags

After modifying any JSDoc annotation, run `npm run cem && npm run types` to regenerate the manifest and type declarations.

### Type Generation

`scripts/generate-types.mjs` reads `custom-elements.json` and generates all framework-specific type declarations in `types/`. It extracts everything from the CEM — **no hardcoded type configs in the script**.

- Every `@fires` tag description **must** include a backtick-quoted detail block: `` `detail: { field: type, ... }` ``
- Events with empty detail use `` `detail: {}` ``
- The generator parses these descriptions to produce typed event detail interfaces

### Required JSDoc Tags

Every component class must have a JSDoc block directly above the `class` declaration with at minimum:

```js
/**
 * Brief description of the component.
 *
 * @element faceless-component-name
 *
 * @attr {type} attribute-name - Description.
 * @fires {CustomEvent} event-name - Description. `detail: { ... }`
 * @slot - Default slot description.
 * @cssprop [--property-name=default] - Description.
 * @csspart part-name - Description.
 */
class FacelessComponent extends BaseElement {
```

### Reference

See `carousel/index.js`, `accordion/index.js`, and `form/index.js` for annotated examples.

## Framework Integration

Web Components work natively in the browser but each framework has quirks that affect event binding, property passing, and template type-checking. The following rules are hard-won lessons — violating them causes silent failures.

### Events: Dual-Name Dispatch (Mandatory)

Every custom event **must** be dispatched twice — once hyphenated, once lowercase-concatenated:

```js
this.dispatchEvent(new CustomEvent('slide-change', opts));   // canonical
this.dispatchEvent(new CustomEvent('slidechange', opts));     // framework alias
```

**Why:** React 19 maps JSX `onSlideChange` → `addEventListener('slidechange')` (strips `on`, lowercases first char). Since `addEventListener` is case-sensitive, `slideChange` ≠ `slidechange`. The lowercase alias ensures React JSX binding works. Vue, Angular, and Svelte use the canonical hyphenated name.

### Native Event Re-Dispatch (Light DOM Components)

For light-DOM components (`FacelessInput`, `FacelessCheckbox`) that wrap a native `<input>`:

- **`input` event**: Do **not** re-dispatch. Native `input` has `composed: true` and bubbles through everything automatically. Re-dispatching causes double-fire.
- **`change` event**: **Must** `e.stopPropagation()` on the native event and re-dispatch with `composed: true`, because native `change` has `composed: false` and would stop at a Shadow DOM boundary.
- **`blur` / `focusout`**: Re-dispatch on the host only when focus leaves the component entirely (`!this.contains(e.relatedTarget)`).

### State Before Events (Mandatory Order)

All DOM state updates (`_syncToInternals`, `_syncRadioGroup`, `_syncVisualState`) **must** complete before dispatching custom events. `dispatchEvent` is synchronous — all listeners execute inline. If state isn't updated yet, consumers reading `data-checked`, `.checked`, or form internals during the event handler see stale values.

```js
// ✅ correct order
this._syncToInternals();
this._syncRadioGroup();
this._syncVisualState();
this.dispatchEvent(new CustomEvent('check-change', opts));  // consumers see up-to-date state

// ❌ wrong — listeners fire before visual state is set
this.dispatchEvent(new CustomEvent('check-change', opts));
this._syncVisualState();
```

### Per-Framework Requirements

#### React 19

- Properties and boolean attributes bind natively via JSX.
- **Event binding caveat**: JSX `onEventName` works for the lowercase alias (`onSlidechange`, `onCheckchange`), but for complex event names it is more reliable to use `useEffect` + `ref.addEventListener('slide-change', handler)`. The React test app (`tests/react-app/`) uses this pattern exclusively.

#### Vue 3

- Requires `isCustomElement` config in `vite.config.ts` to prevent Vue from treating `<faceless-*>` as unknown Vue components:
  ```js
  vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('faceless-') } } })
  ```
- Events bind via `@slide-change="handler"` (hyphenated name, native DOM event listener under the hood).

#### Angular

- Requires `CUSTOM_ELEMENTS_SCHEMA` in every standalone component or NgModule that uses a Faceless element.
- Events bind via `(slide-change)="handler($event)"`.
- Attribute binding uses `[attr.items-per-view]="value"`. Boolean attributes use `[attr.loop]="enabled ? '' : null"` (set empty string to add, `null` to remove).
- For `<faceless-input>` with Angular forms: add `ngDefaultControl` to opt into Angular's `DefaultValueAccessor`.

#### Svelte 5

- No setup required. Events bind via `addEventListener` in `onMount` (Svelte does not have a built-in custom event directive for web components).
- Properties bind directly as attributes in the template.

### Test Apps

Framework-specific test apps live in `tests/` (`react-app`, `vue-app`, `svelte-app`, `angular-app`). Each app tests identical scenarios (C1–C6, A1–A4, F1–F5, CB1–CB6) defined in `tests/test-matrix.md`. When adding a new component or event, **all four test apps must be updated** with matching test scenarios.
