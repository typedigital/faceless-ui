# typedigital. FacelessCarousel

A lightweight, zero-dependency, and framework-agnostic web component designed for high-performance digital products.

It follows the **Faceless Component** pattern: decoupling state management and behavior from visual presentation. This allows you to use the component's logic with any styling system (Tailwind, CSS Modules, etc.).

---

## 1. Core Technical Specifications
The component is configured primarily through HTML attributes. For boolean attributes like `loop` or `autoplay`, simply adding the attribute enables the feature.

| Attribute        | Description                                                         | Default |
|------------------|---------------------------------------------------------------------|---------|
| `items-per-view` | Number of slides visible at once                                    | `1`     |
| `loop`           | Enables infinite seamless scrolling                                 | `false` |
| `gap`            | Gap between slides in pixels                                         | `0`     |
| `peek`           | Preview of the next slide (e.g. `20%` or `40px`)                     | `0`     |
| `peek-type`      | Type of edge effect: `hard` or `fade`                                | `hard`  |
| `show-dots`      | Enables interactive pagination dots                                  | `false` |
| `autoplay`       | Enables automatic sliding                                            | `false` |
| `interval`       | Autoplay delay in milliseconds                                       | `3000`  |
| `mousewheel`     | Enables horizontal scrolling via trackpad or mouse wheel            | `false` |
| `speed`          | Enables continuous scroll (Ticker Mode) when set to a number        | `none`  |

---

## 2. Layout & Responsiveness
The carousel is responsive by design. You can control the layout using the `items-per-view` attribute or CSS variables.

### Breakpoints
Use CSS variables to change the layout at different screen sizes:
```css
@media (min-width: 768px) {
  faceless-carousel {
    --items-per-view: 3;
    --gap: 20px;
  }
}
```

---

## 3. Infinite Loop
The `loop` attribute creates a seamless transition from the last slide back to the first. The component uses a smart cloning system that ensures the track always feels populated, preventing gaps regardless of the items-per-view count.

---

## 4. Smart Peeking & Advanced Masking
**Peeking:** Reveal a portion of the next slide using percentage or pixel values (e.g., `peek="100px"`).

**Masking:** When using `peek-type="fade"`, a high-performance CSS mask creates a smooth transition at the edges.

---

## 5. Intelligent Autoplay
Automatically cycles through slides with built-in **Pause-on-Hover** and **Pause-on-Focus** behavior. Sliding resumes once user interaction ends.

---

## 6. Continuous Scroll (Ticker Mode)
By setting the `speed` attribute, the carousel switches to a smooth, constant motion.

**Usage:** Ideal for logo walls or brand tickers.

**Interactivity:** Even in Ticker Mode, dragging will pause the motion for manual control.

---

## 7. Public API
The component exposes a clean API for external control:

- `next()` – Advance to the next slide  
- `prev()` – Go back to the previous slide  
- `goTo(index)` – Jump directly to a specific index  

---

## 8. Accessibility (A11y)
- **Keyboard Support:** Full arrow key navigation  
- **Screen Readers:** Automatic management of `aria-hidden` and `tabindex` for off-screen slides  
- **Focus Sync:** Automatically scrolls slides into view when internal elements (links/buttons) receive focus  
- **Reduced Motion:** Respects system-level `prefers-reduced-motion` settings  

---

## 9. Universal Rendering (SSR / SSG / CSR)

`<faceless-carousel>` works in every rendering environment without any configuration.

| Environment | Support |
|---|---|
| Browser (CSR) | Full functionality |
| Static Site Generation (SSG) | Safe — no runtime errors |
| Server-Side Rendering (SSR) | Safe — no runtime errors |
| Node.js / Deno / Edge Runtimes | Safe — no runtime errors |

**How it works:** The component detects whether a browser environment is available via `typeof window !== 'undefined'`. In non-browser contexts (Node.js, Deno, Edge, SSR pipelines), all DOM-dependent lifecycle methods exit immediately and `customElements.define` is skipped. The element tag is preserved in the server-rendered HTML and activates fully once JavaScript runs in the client.

There is nothing to configure — server/client boundaries are not an obstacle.

### SSR Test

An automated test script verifies SSR safety and generates a showcase page:

```bash
node carousel/ssr-test.mjs
```

The script:
1. **Imports `index.js` in Node.js** — fails immediately if any browser API (`HTMLElement`, `document`, `window`) leaks through the guards
2. **Generates `ssr-showcase.html`** — server-rendered HTML containing all carousel demos, identical to what a real SSR framework would emit
3. **Open in browser** — the generated file hydrates progressively, proving the full SSR → client upgrade path works

---

## 10. Styling & Customization
Use CSS Variables and Shadow Parts to style internal elements:

- `::part(viewport)` – The clipping container  
- `::part(track)` – The sliding track  
- `::part(dot)` – Individual pagination dots  
- `::part(dot-active)` – The active pill-shaped dot

---

## 11. Internal Method Reference

Complete reference for every method in the `FacelessCarousel` class.

### Lifecycle

| Method | Purpose |
|---|---|
| `constructor()` | Initializes Shadow DOM, state object, config constants, and binds all event handler methods |
| `observedAttributes` (static) | Declares the HTML attributes that trigger `attributeChangedCallback` |
| `attributeChangedCallback()` | Re-measures layout when any observed attribute changes |
| `connectedCallback()` | Sets up event listeners, ResizeObserver, slot change handling, autoplay pause-on-hover/focus, fallback init for deferred script loading, and starts the RAF loop |
| `disconnectedCallback()` | Tears down all timers, observers, and global event listeners |

### Core Logic

| Method | Purpose |
|---|---|
| `_measure()` | Calculates slide width, stride, gap, peek, and mask gradient from attributes, CSS variables, and viewport size; updates CSS custom properties |
| `_syncActiveStates()` | Updates `data-active`, `data-visible`, `aria-hidden`, and `tabindex` on every slide (including clones) based on current scroll position |
| `_raf()` | `requestAnimationFrame` loop — interpolates `currentTranslate` toward `targetTranslate` using elasticity, handles continuous-scroll (speed) mode, and teleports position at loop boundaries |
| `_parsePeekValue(value, parentWidth)` | Converts a peek attribute value (px or %) to a pixel number |

### Initialization

| Method | Purpose |
|---|---|
| `_deferredInit()` | Delays `_init()` until `document.readyState === 'complete'` so frameworks (React, Gatsby) finish hydrating dynamic content before slides are cloned |
| `_init()` | Main initialization: indexes slides with `data-slide-idx`, creates prepend/append clone buffers for loop mode, renders dots, triggers first measurement, starts autoplay |
| `_fixClonedSlide(clone)` | Patches images inside cloned slides — forces `opacity: 1`, `loading="eager"`, and resolves `data-src`/`data-lazy` attributes since clones lose framework JS (hydration, IntersectionObserver, onLoad handlers) |
| `_watchOriginals()` | Attaches a MutationObserver to original slides; when frameworks add child elements after initial render, triggers `_refreshClones()` to re-clone with complete DOM |
| `_refreshClones()` | Replaces every existing clone with a fresh `cloneNode(true)` copy of its original slide, preserving visibility and active state |

### Event Handlers

| Method | Purpose |
|---|---|
| `_onDragStart(e)` | Captures starting pointer position, records current translate, and attaches global move listeners |
| `_onDragMove(e)` | Updates `currentTranslate` based on pointer delta during drag |
| `_onDragEnd()` | Snaps to the nearest slide index, removes global move listeners, restarts autoplay if enabled |
| `_onKeyDown(e)` | Handles ArrowLeft/ArrowRight keyboard navigation |
| `_onFocusIn(e)` | When an interactive element inside a slide receives focus, scrolls that slide into view |
| `_onWheel(e)` | Accumulates mousewheel/trackpad delta and triggers `next()`/`prev()` once the threshold is reached, with a 400 ms lock to prevent rapid-fire navigation |
| `_onResize()` | Delegates to `_measure()` when the element is resized |

### Public API

| Method | Purpose |
|---|---|
| `goTo(index, animate)` | Navigates to a specific slide index; clamps to bounds in non-loop mode; optionally animates or jumps instantly |
| `next()` | Advances to the next slide |
| `prev()` | Returns to the previous slide |

### Autoplay & UI

| Method | Purpose |
|---|---|
| `_startAutoplay()` | Starts an interval timer that calls `next()` on each tick; stops at the last slide in non-loop mode |
| `_stopAutoplay()` | Clears the autoplay interval timer |
| `_setPaused(paused)` | Pauses or resumes autoplay in response to hover and focus events |
| `_toggleDots()` | Shows or hides the dots container based on the `show-dots` attribute |
| `_renderDots()` | Creates pagination dot buttons (one per real slide) with click-to-navigate behavior |
