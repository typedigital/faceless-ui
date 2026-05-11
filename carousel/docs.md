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
| `hide-play-pause`| Visually hides the Play/Pause button (sr-only, still keyboard-focusable) | `false` |
| `no-snap`        | Prevents snapping to the nearest slide when paused                   | `false` |

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

### Play/Pause Button
When `autoplay` is set, the component renders an internal Play/Pause button in the Shadow DOM. It toggles between `⏸` (pause) and `▶` (play) and updates its `aria-label` accordingly.

The `hide-play-pause` attribute visually hides the button using the sr-only pattern (clipped to 1×1 px). The button remains in the tab order and is fully operable via keyboard — it is only invisible to sighted users. This is useful for carousels where the visual design does not include a pause control but accessibility compliance requires one.

External Play/Pause buttons are also supported via the `related-carousel` attribute with the `play-pause` class (see Section 7).

---

## 6. Continuous Scroll (Ticker Mode)
By setting the `speed` attribute, the carousel switches to a smooth, constant motion.

**Usage:** Ideal for logo walls or brand tickers.

**Interactivity:** Even in Ticker Mode, dragging will pause the motion for manual control.

### No-Snap Behavior
By default, when a carousel is paused (via hover, focus, or the Play/Pause button), it snaps to the nearest slide boundary. For continuous-scroll carousels this snap can be jarring. Adding the `no-snap` attribute freezes the track at its exact current position instead.

```html
<faceless-carousel autoplay speed="2" loop no-snap>
  ...
</faceless-carousel>
```

Internally, `no-snap` prevents the spring physics in `_raf()` from pulling the track to a snap point while paused, and guards the `goTo()` call in `_measure()` so that a `ResizeObserver` callback during pause does not re-snap the position.

---

## 7. Public API
The component exposes a clean API for external control:

- `next()` – Advance to the next slide
- `prev()` – Go back to the previous slide
- `goTo(index)` – Jump directly to a specific index

### Declarative External Navigation

Instead of calling the JS API from inline `onclick` handlers, buttons can declare their relationship to a carousel via the `related-carousel` attribute. The component discovers these buttons on connect and wires up the click listeners automatically.

**Button requirements:**
- `related-carousel="<id>"` — must match the carousel's `id`
- Class `prev`, `next`, or `play-pause` — declares the button's action

```html
<button class="nav-btn prev" related-carousel="my-carousel" aria-label="Previous">‹</button>

<faceless-carousel id="my-carousel" loop show-dots>
  <div class="slide">Slide 1</div>
  <div class="slide">Slide 2</div>
  <div class="slide">Slide 3</div>
</faceless-carousel>

<button class="nav-btn next" related-carousel="my-carousel" aria-label="Next">›</button>
```

**Compared to inline handlers:**

| | `related-carousel` (declarative) | `onclick` (imperative) |
|---|---|---|
| Markup | Clean, no JS in HTML | Couples HTML to a global ID |
| Cleanup | Automatic on `disconnectedCallback` | Manual |
| Carousel without `id` | Silent no-op | JS error |

**Constraints:**
- Buttons must be present in the DOM when the carousel connects. Buttons added later are not picked up (no MutationObserver).
- If the carousel has no `id`, the feature is silently disabled.
- A button with neither `prev`, `next`, nor `play-pause` class has no effect.

---

## 8. Accessibility (A11y)

`<faceless-carousel>` implements the accessibility patterns recommended by the [Chrome accessible carousel guide](https://developer.chrome.com/blog/accessible-carousel) and ARIA Authoring Practices.

---

### 8.1 Landmark & Skip Navigation

The host element is automatically decorated as a named ARIA landmark:

```html
role="region"
aria-roledescription="carousel"
aria-label="Carousel"  <!-- default, override with your own -->
```

Screen reader users can jump past the carousel entirely using their landmark navigation shortcut without entering the slides:

| Screen Reader | Shortcut |
|---|---|
| NVDA | `R` (next region) |
| JAWS | `;` (next region) |
| VoiceOver | `VO+U` → navigate to next region |

**Providing a meaningful label** (strongly recommended):

```html
<faceless-carousel aria-label="Featured products" loop show-dots>
  ...
</faceless-carousel>
```

The `aria-label` attribute is only set as a fallback (`"Carousel"`) if the consumer does not provide one. A descriptive label makes the landmark immediately understandable to screen reader users.

---

### 8.2 Per-Slide ARIA

Each original slide is annotated automatically during initialisation:

```html
<!-- What the component adds to every slide -->
role="group"
aria-roledescription="slide"
aria-label="Slide 1 of 5"
```

Screen readers announce each slide as **"Slide 1 of 5, group"**, giving users a clear sense of position and total count without requiring any markup from the consumer.

Clone slides (created internally for loop mode) always carry `aria-hidden="true"` and are fully removed from the accessibility tree. They are never announced or reachable via Tab.

---

### 8.3 Live Region — Dynamic Announcements

The slide container (`.track`) and a visually-hidden announcer region carry `aria-live` and `aria-atomic` attributes that are managed dynamically by `_updateAriaLive()`:

| Element | `aria-live` | `aria-atomic` |
|---|---|---|
| `.track` (slide container) | `"off"` / `"polite"` | `"false"` |
| `.sr-announcer` (position text) | `"off"` / `"polite"` | `"true"` |

The value switches based on carousel state:

| State | `aria-live` | Reason |
|---|---|---|
| Auto-rotating (not paused) | `"off"` | Suppresses a flood of announcements during automatic slide changes |
| Paused (hover, focus, or Play/Pause button) | `"polite"` | Announces slide changes triggered by user interaction |
| No `autoplay` attribute | `"polite"` | All navigation is user-initiated |
| Multi-slide (`items-per-view > 1`) | `"off"` | Multiple simultaneous content changes would produce confusing announcements |

The `.sr-announcer` is updated on every `goTo()` call with a position string (e.g. `"Slide 3 of 6"`). This fires for all navigation methods: arrow keys, dot clicks, `related-carousel` buttons, drag-snap, and autoplay — but announcements only reach the screen reader when `aria-live` is `"polite"`.

---

### 8.4 Keyboard Navigation

| Key | Behaviour |
|---|---|
| `Tab` | Moves through all interactive elements (`a`, `button`, `input`) across **all** slides, including off-screen ones |
| `Shift+Tab` | Moves backwards through the same |
| `ArrowRight` | Advances one slide (when the carousel host has focus) |
| `ArrowLeft` | Returns one slide (when the carousel host has focus) |

**Off-screen slide access via Tab** is possible because off-screen slides use `opacity: 0` + `pointer-events: none` for visual hiding — not `visibility: hidden`, which would remove elements from the tab order. As soon as a Tab keystroke reaches a child inside an off-screen slide, `_onFocusIn` fires and scrolls that slide fully into view.

---

### 8.5 Focus Sync

When any focusable element inside a slide receives focus (via Tab, Shift+Tab, or a screen reader cursor), the carousel automatically scrolls that slide fully into view by calling `goTo(index)`. This applies regardless of whether the slide is currently visible.

This means consumers do not need `scroll-into-view` logic or custom focus handlers — the component owns the scroll-on-focus behaviour entirely.

---

### 8.6 Tab Order Management

The component maintains two separate groups of managed focusable elements:

**Group 1 — Slide-internal elements** (`a`, `button`, `input` inside slides):
- Original slides: always in natural tab order (no `tabindex` attribute set)
- Clone slides: always `tabindex="-1"`, never reachable via Tab

**Group 2 — External nav buttons** (`[related-carousel]`):
- On `connectedCallback`: `tabindex` is removed (buttons are in natural tab order)
- On `disconnectedCallback`: `tabindex="-1"` is set (buttons are removed from tab order, as they have no target)

Both groups are managed by `_applyA11yDefaults()`, which runs on init and after every clone refresh.

---

### 8.7 Autoplay & Focus

Autoplay is automatically paused when:
- The mouse enters the carousel (`mouseenter`)
- Any element inside the carousel receives focus (`focusin`)

Autoplay resumes when:
- The mouse leaves (`mouseleave`)
- Focus leaves the carousel (`focusout`)

This ensures autoplay never interferes with keyboard or screen reader navigation.

---

### 8.8 Loop Teleport — Transition Suppression

In loop mode, the track position is teleported by one full `totalWidth` when it crosses a boundary, creating the illusion of infinite scroll. Without special handling, this teleport causes `data-visible` to change simultaneously on multiple slides, triggering the `opacity` fade transition on all of them — visible as a flash/flicker.

The component solves this with `_suppressTransition()`: on every teleport frame, the CSS class `no-transition` is added to the host. This activates the rule `:host(.no-transition) ::slotted(*) { transition: none !important }`, which disables all transitions for that single frame. The class is removed on the next `requestAnimationFrame`, restoring smooth transitions for all subsequent navigation.

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
- `::part(play-pause)` – The internal Play/Pause button
- `::part(dots-container)` – The wrapper around pagination dots
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
| `connectedCallback()` | Sets up event listeners, ResizeObserver, slot change handling, autoplay pause-on-hover/focus, and RAF loop; sets `role="region"`, `aria-roledescription="carousel"`, and a fallback `aria-label` on the host; wires up external nav buttons |
| `disconnectedCallback()` | Tears down all timers, observers, and global event listeners; removes click handlers from `[related-carousel]` buttons and sets their `tabindex="-1"` |

### Core Logic

| Method | Purpose |
|---|---|
| `_measure()` | Calculates slide width, stride, gap, peek, and mask gradient from attributes, CSS variables, and viewport size; updates CSS custom properties |
| `_syncActiveStates()` | Updates `data-active` and `data-visible` on every slide (including clones) based on current scroll position; does not manage `aria-hidden` or `tabindex` (those are set once by `_applyA11yDefaults`) |
| `_raf()` | `requestAnimationFrame` loop — interpolates `currentTranslate` toward `targetTranslate` using elasticity, handles continuous-scroll (speed) mode, and teleports position at loop boundaries; calls `_suppressTransition()` on each teleport to prevent opacity-flicker |
| `_parsePeekValue(value, parentWidth)` | Converts a peek attribute value (px or %) to a pixel number |

### Initialization

| Method | Purpose |
|---|---|
| `_deferredInit()` | Delays `_init()` until `document.readyState === 'complete'` so frameworks (React, Gatsby) finish hydrating dynamic content before slides are cloned |
| `_init()` | Main initialization: indexes slides with `data-slide-idx`, assigns per-slide ARIA roles and labels (`role="group"`, `aria-roledescription="slide"`, `aria-label="Slide N of M"`), creates prepend/append clone buffers for loop mode, renders dots, triggers first measurement, starts autoplay, and calls `_applyA11yDefaults()` |
| `_fixClonedSlide(clone)` | Patches images inside cloned slides — forces `opacity: 1`, `loading="eager"`, and resolves `data-src`/`data-lazy` attributes since clones lose framework JS (hydration, IntersectionObserver, onLoad handlers) |
| `_watchOriginals()` | Attaches a MutationObserver to original slides; when frameworks add child elements after initial render, triggers `_refreshClones()` to re-clone with complete DOM |
| `_refreshClones()` | Replaces every existing clone with a fresh `cloneNode(true)` copy of its original slide, preserving visibility and active state; calls `_applyA11yDefaults()` afterwards to restore clone `aria-hidden` and `tabindex="-1"` |

### Accessibility

| Method | Purpose |
|---|---|
| `_applyA11yDefaults()` | Sets `aria-hidden`/`tabindex` based on clone status, not scroll position. Group 1 — original slides: `aria-hidden` removed, `tabindex` removed from children (natural tab flow). Group 2 — clone slides: `aria-hidden="true"`, children `tabindex="-1"`. Also restores `tabindex` on associated `[related-carousel]` elements. Called on init and after every clone refresh. |
| `_suppressTransition()` | Adds `no-transition` to the host class list and schedules its removal on the next `requestAnimationFrame`. While active, the Shadow DOM rule `:host(.no-transition) ::slotted(*) { transition: none }` disables all CSS transitions for one frame, preventing opacity-flicker during loop teleports. |

### External Navigation

| Method | Purpose |
|---|---|
| `_setupExternalNavButtons()` | Queries all `[related-carousel="<id>"]` elements in the document, restores their `tabindex`, binds click/focusin/focusout handlers, and stores `{ el, handler }` pairs in `_externalNavListeners` for cleanup. Supports `prev`, `next`, and `play-pause` classes. |
| `_setupFocusManagement()` | Builds a focus chain (Play/Pause → external Prev → external Next → dots) and intercepts Tab/Shift+Tab to enforce a logical keyboard navigation order within the carousel group |
| `_teardownFocusManagement()` | Removes all keydown listeners installed by `_setupFocusManagement()` |

### Event Handlers

| Method | Purpose |
|---|---|
| `_onDragStart(e)` | Captures starting pointer position, records current translate, and attaches global move listeners |
| `_onDragMove(e)` | Updates `currentTranslate` based on pointer delta during drag |
| `_onDragEnd()` | Snaps to the nearest slide index, removes global move listeners, restarts autoplay if enabled |
| `_onKeyDown(e)` | Handles ArrowLeft/ArrowRight keyboard navigation |
| `_onFocusIn(e)` | When any focusable element inside an original slide receives focus, calls `goTo(index)` unconditionally to ensure the slide is fully scrolled into view — including slides that are only partially visible due to peek |
| `_onWheel(e)` | Accumulates mousewheel/trackpad delta and triggers `next()`/`prev()` once the threshold is reached, with a 400 ms lock to prevent rapid-fire navigation |
| `_onGroupFocusIn()` | Cancels any pending focusout debounce and pauses the carousel via `_setPaused(true)`. Listens on the host element and all external nav buttons. |
| `_onGroupFocusOut()` | Debounced via `requestAnimationFrame`: checks whether focus has truly left the carousel group (host + external buttons) before calling `_setPaused(false)` |
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
| `_setPaused(paused)` | Pauses or resumes autoplay in response to hover and focus events; calls `_updateAriaLive()` to switch the live region |
| `_toggleAutoplay()` | Toggles `isUserPaused` state (explicit Play/Pause action), stops or starts autoplay, and updates the button icon and `aria-live` |
| `_updatePlayPauseButton()` | Synchronizes the Play/Pause button text (`⏸`/`▶`) and `aria-label` with the `isUserPaused` state |
| `_updateAriaLive()` | Sets `aria-live` on `.track` and `.sr-announcer` to `"off"` (auto-rotating or multi-slide) or `"polite"` (paused / manual) |
| `_toggleDots()` | Shows or hides the dots container based on the `show-dots` attribute |
| `_renderDots()` | Creates pagination dot buttons (one per real slide) with click-to-navigate behavior |
