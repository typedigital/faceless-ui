# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Faceless UI is a zero-dependency, framework-agnostic web component library implementing the **Faceless Component** pattern: logic/state/a11y are handled by the component, while visual presentation is entirely left to the consumer. The only component so far is `<faceless-carousel>`.

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
