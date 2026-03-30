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
- `_syncActiveStates()` manages `data-active`, `data-visible`, `aria-hidden`, and `tabindex` on every frame

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
