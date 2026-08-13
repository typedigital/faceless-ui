# typedigital. FacelessAccordion

A lightweight, zero-dependency, and framework-agnostic web component for collapsible content sections.

It follows the **Faceless Component** pattern: decoupling state management and behavior from visual presentation. The component handles height animation, ARIA attributes, and keyboard navigation — styling is entirely up to you.

---

## 1. Core Technical Specifications

The component uses HTML attributes for configuration. Boolean attributes are enabled by presence alone.

| Attribute         | Description                                        | Default |
|-------------------|----------------------------------------------------|---------|
| `multiple`        | Allow multiple panels open at once                 | `false` |
| `autoplay`        | Cycle through items automatically                  | `false` |
| `interval`        | Time between auto-rotations (ms)                   | `3000`  |
| `hide-play-pause` | Visually hide the play/pause button (still in DOM for screen readers) | `false` |
| `autoplay-paused` | Pause autoplay from outside; also set by the built-in button | `false` |

---

## 2. Consumer Markup Convention

Each direct child of `<faceless-accordion>` is an "item". Mark elements within each item using data attributes:

```html
<faceless-accordion>
  <div>
    <h3 data-trigger>Section Title</h3>
    <div data-panel>
      <div class="content">Your content here</div>
    </div>
  </div>
  <div data-open>
    <h3 data-trigger>Initially Open</h3>
    <div data-panel>
      <div class="content">This panel starts open</div>
    </div>
  </div>
</faceless-accordion>
```

| Data Attribute  | Placed On               | Purpose                    |
|-----------------|-------------------------|----------------------------|
| `data-trigger`  | Element inside item     | Marks the clickable header |
| `data-panel`    | Element inside item     | Marks the collapsible body |
| `data-open`     | Direct child (item)     | Initially open on load     |
| `data-disabled` | Direct child (item)     | Prevents toggling          |

---

## 3. Managed Attributes

The component automatically sets and updates these attributes. Use them as hooks for styling.

**On trigger elements:**
- `aria-expanded` — `"true"` or `"false"`
- `aria-controls` — links to the panel's generated `id`
- `id` — auto-generated unique ID
- `role="button"` + `tabindex="0"` — added only to non-`<button>` triggers
- `aria-disabled="true"` — on disabled item triggers
- `data-open` — present when the item is expanded

**On panel elements:**
- `aria-labelledby` — links to the trigger's generated `id`
- `role="region"` — only assigned when the trigger has an accessible name (see § 8)
- `id` — auto-generated unique ID
- `data-open` — present when the item is expanded

**On item elements (direct children):**
- `data-open` — present when expanded

**On the host element:**
- `autoplay-paused` — present while autoplay is paused by the button or by the consumer. Not set by the hover and focus pauses, which are transient.

---

## 4. Height Animation

The component uses a CSS transition on `height` to animate panels open and closed.

**Opening:** `height: 0` → `height: <scrollHeight>px` → (transitionend) → `height: auto`

**Closing:** `height: auto` → `height: <scrollHeight>px` → (rAF) → `height: 0px`

Setting `height: auto` after opening allows dynamic content to resize naturally without a ResizeObserver.

### CSS Variable Control

| Variable                         | Description                 | Default                  |
|----------------------------------|-----------------------------|--------------------------|
| `--accordion-duration`           | Transition duration         | `300ms` (`0ms` when `prefers-reduced-motion: reduce`) |
| `--accordion-easing`             | Transition easing           | `ease`                   |
| `--accordion-focus-ring`         | Focus ring for role="button" triggers | `2px solid currentColor` |
| `--accordion-focus-ring-offset`  | Focus ring offset           | `2px`                    |
| `--accordion-autoplay-interval`  | Set by the component on the host element when autoplay starts. Reflects the current `interval` attribute value. Use this to sync external CSS progress animations. | `3000ms` |
| `--accordion-autoplay-state`     | Set by the component on the host element. `running` when autoplay is active, `paused` when stopped (hover, focus, user pause, or no autoplay). Use with `animation-play-state`. | `paused` |

```css
faceless-accordion {
  --accordion-duration: 500ms;
  --accordion-easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 5. Keyboard Navigation

Follows the WAI-ARIA Accordion Pattern:

| Key          | Action                                     |
|--------------|--------------------------------------------|
| Enter/Space  | Toggle focused trigger (non-button only)   |
| Arrow Down   | Move focus to next trigger                 |
| Arrow Up     | Move focus to previous trigger             |
| Home         | Move focus to first trigger                |
| End          | Move focus to last trigger                 |

Disabled items are skipped during arrow key navigation.

---

## 5a. Autoplay

When the `autoplay` attribute is present, the accordion cycles through items automatically. A play/pause button is rendered in the Shadow DOM.

```html
<faceless-accordion autoplay interval="2000">
  <!-- items -->
</faceless-accordion>
```

### Behaviour

- The component opens the next enabled item and closes the previous one on each cycle (single-mode is enforced during autoplay regardless of the `multiple` attribute).
- Manual clicks by the user still respect the `multiple` attribute.
- After a manual toggle, the autoplay timer resets so the user gets the full interval before the next auto-rotation.
- Disabled items are skipped.
- If only one enabled item exists, the timer runs but performs no action.

### Pause Conditions

Autoplay pauses automatically when:
- The user hovers over the accordion (`mouseenter` / `mouseleave`)
- Any element inside the accordion receives focus (`focusin` / `focusout`)
- The user clicks the play/pause button (persists until clicked again)
- The `autoplay-paused` attribute is set from the outside (persists until removed)
- `prefers-reduced-motion: reduce` is active — autoplay does **not** start automatically (WCAG 2.2.2). The button remains visible so the user can start manually.

### Play/Pause Button

- Rendered inside the Shadow DOM with `part="play-pause"` for external styling.
- Shows ⏸ (pause) when playing, ▶ (play) when paused.
- `aria-label` updates to reflect the current action ("Pause auto-rotation" / "Start auto-rotation").
- Use `hide-play-pause` to visually hide the button while keeping it accessible to screen readers.

#### Controlling autoplay from the outside

`autoplay-paused` pauses autoplay when set and resumes it when removed; `autoplayPaused` is the property equivalent. The built-in button sets the same attribute, so it always reflects the current state no matter which side flipped it — that is what lets a consumer mirror its own control against it.

```jsx
<faceless-accordion autoplay interval="10000" hide-play-pause {...(isPaused ? { 'autoplay-paused': true } : {})}>
```

Combine it with `hide-play-pause` when you supply your own button: the built-in one renders ahead of the `<slot>` and would otherwise sit in the flow and push the items down.

Pausing keeps the unspent part of the running cycle and resumes it, rather than granting a full interval again. That holds for every pause — hover, focus, the button and `autoplay-paused` alike — and is what makes the `animation-play-state` progress bar below stay in step with the rotation instead of running ahead of it.

### Autoplay Timing Communication

When autoplay is active, the component sets two CSS custom properties on the host element:

- `--accordion-autoplay-interval` — the interval in ms (e.g. `3000ms`)
- `--accordion-autoplay-state` — `running` or `paused`

These inherit to all light-DOM children, enabling pure-CSS progress indicators without JavaScript:

```css
[data-trigger][data-open]::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  background: red;
  transform-origin: left;
  animation: progress var(--accordion-autoplay-interval, 3000ms) linear forwards;
  animation-play-state: var(--accordion-autoplay-state, paused);
}

@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

The `accordion-toggle` event detail also includes `autoplay: true` and `interval` (number, in ms) when fired during auto-rotation.

### Screen Reader Announcer

A visually hidden `aria-live` region announces item changes:
- `aria-live="off"` during auto-rotation (prevents excessive announcements)
- `aria-live="polite"` when paused (allows manual interactions to be announced)

---

## 6. Public API

- `open(index)` — Open a specific panel by index
- `close(index)` — Close a specific panel by index
- `toggle(index)` — Toggle a specific panel by index
- `autoplayPaused` — Read or set the paused state; reflects the `autoplay-paused` attribute

---

## 7. Events

| Event              | Detail                              | Bubbles | Composed |
|--------------------|-------------------------------------|---------|----------|
| `accordion-toggle` | `{ index, item, open }` | `true`  | `true`   |

```js
accordion.addEventListener('accordion-toggle', (e) => {
  console.log(e.detail.index, e.detail.open);
});
```

---

## 8. Accessibility

### ARIA Management
- `aria-expanded` on every trigger reflects current open/closed state
- `aria-controls` / `aria-labelledby` create bidirectional linkage between trigger and panel
- `role="region"` is only added to panels whose trigger has an accessible name (text content, `aria-label`, or `aria-labelledby`). Panels without an accessible name receive no landmark role, preventing unnamed region landmarks from flooding screen reader navigation (WCAG 4.1.2)

### Keyboard
Full WAI-ARIA Accordion Pattern (Enter/Space, Arrow keys, Home, End). Disabled items are skipped.

### Motion
The `--accordion-duration` token is automatically set to `0ms` when `prefers-reduced-motion: reduce` is active (WCAG 2.2.2). This disables the height animation without affecting other transitions on consuming components.

### Autoplay & Auto-Rotation
When `autoplay` is enabled, the component follows WCAG 2.2.2 (Pause, Stop, Hide):
- **prefers-reduced-motion**: Autoplay does not start automatically. The play/pause button remains visible for manual activation.
- **Play/Pause button**: Always reachable via keyboard. `aria-label` reflects the current state.
- **Custom control**: A consumer replacing the button drives `autoplay-paused` instead and is responsible for the accessible name of its own control.
- **Focus pause**: Any focus inside the accordion pauses auto-rotation immediately.
- **Hover pause**: Mouse hover pauses auto-rotation.
- **`aria-live`**: Set to `"off"` during auto-rotation to prevent repetitive announcements. Switches to `"polite"` when paused so manual interactions are announced.

### Focus Ring — Non-Button Triggers
When a non-`<button>` element is used as a trigger (e.g. a `<div>` or `<h3>`), the component adds `role="button"` and `tabindex="0"`. Because browsers only apply their native focus ring to interactive elements, the component injects a single global stylesheet on first registration to ensure `:focus-visible` is visible:

```css
[data-trigger][role="button"]:focus-visible {
  outline: var(--accordion-focus-ring, 2px solid currentColor);
  outline-offset: var(--accordion-focus-ring-offset, 2px);
}
```

Override the CSS custom properties to match your design system:

```css
faceless-accordion {
  --accordion-focus-ring: 2px solid #FF5959;
  --accordion-focus-ring-offset: 4px;
}
```

Native `<button>` triggers are unaffected — they retain their browser default focus ring.

### Focus Preservation on Re-Initialisation
When the slot content changes (e.g. a framework re-render triggers `slotchange`), `_init()` re-runs. The component captures the currently focused trigger before resetting state and restores focus after re-initialisation, preventing loss of keyboard position mid-interaction.

### Accessible Name Validation
If a trigger has no accessible name at init time, `console.warn` fires with the item index and guidance. This catches misconfigured markup early during development.

### Disabled State
`aria-disabled="true"` is set on the trigger. Because `aria-disabled` does not suppress pointer events or prevent focus, **consumers must add the following CSS** to complete the disabled behaviour:

```css
[data-disabled] {
  opacity: 0.5;
  pointer-events: none;
}
```

Without `pointer-events: none`, a mouse user can still click a disabled trigger and the click will be ignored by the component logic — but the cursor does not communicate non-interactivity. Without `opacity`, the visual affordance of being disabled is absent.

---

## 9. Universal Rendering (SSR / SSG / CSR)

`<faceless-accordion>` works in every rendering environment without any configuration.

| Environment | Support |
|---|---|
| Browser (CSR) | Full functionality |
| Static Site Generation (SSG) | Safe — no runtime errors |
| Server-Side Rendering (SSR) | Safe — no runtime errors |
| Node.js / Deno / Edge Runtimes | Safe — no runtime errors |

**How it works:** The component detects whether a browser environment is available via `typeof window !== 'undefined'`. In non-browser contexts, all DOM-dependent lifecycle methods exit immediately and `customElements.define` is skipped. The element tag is preserved in the server-rendered HTML and activates fully once JavaScript runs in the client.

Importing is safe without configuration. Rendering *without a layout shift* needs one stylesheet — see § 9.1.

### 9.1 Pre-upgrade layout (required for SSR/SSG)

Panels are light-DOM children, so they are in the server-rendered HTML — and they are all open. `_init()` collapses the closed ones by setting `height: 0`. Until that runs, the accordion renders at full expanded height and then snaps shut.

Load the shipped stylesheet **before** your own:

```html
<link rel="stylesheet" href="accordion/preflight.css">
<link rel="stylesheet" href="your-accordion.css">
```

It pre-collapses the panels exactly as the component will, mirroring your `data-open` markers, so the height never changes.

**Use `:not([data-ready])`, not `:not(:defined)`,** for any pre-upgrade rule of your own. This matters more here than for the other components: the accordion never initialises from `connectedCallback` — it waits for `slotchange`, which fires asynchronously after the upgrade. There is therefore always a window in which the element is `:defined` but every panel is still open. `data-ready` is set at the end of `_init()`.

**Add the noscript escape hatch.** Without JavaScript, `data-ready` never appears and every panel stays collapsed — that is a content loss, not a cosmetic one:

```html
<noscript>
  <style>faceless-accordion:not([data-ready]) [data-panel] { display: block; }</style>
</noscript>
```

### SSR Test

An automated test script verifies SSR safety and generates a showcase page:

```bash
node accordion/ssr-test.mjs
```

The script:
1. **Imports `index.js` in Node.js** — fails immediately if any browser API (`HTMLElement`, `document`, `window`) leaks through the guards
2. **Generates `ssr-showcase.html`** — server-rendered HTML containing all accordion demos, identical to what a real SSR framework would emit
3. **Open in browser** — the generated file hydrates progressively, proving the full SSR → client upgrade path works

---

## 10. Styling & Customization

All content lives in the light DOM — style using standard CSS with data-attribute hooks. The play/pause button lives in the Shadow DOM and is stylable via `::part(play-pause)`:

```css
/* Active item */
faceless-accordion > div[data-open] {
  border-color: blue;
}

/* Trigger hover */
[data-trigger]:hover {
  color: blue;
}

/* Chevron rotation */
[data-trigger]::after {
  content: '';
  transform: rotate(45deg);
  transition: transform 300ms ease;
}
[data-trigger][data-open]::after {
  transform: rotate(-135deg);
}

/* Disabled items — both rules are required for correct UX */
[data-disabled] {
  opacity: 0.5;
  pointer-events: none;
}

/* Panel inner padding (use a wrapper to avoid height conflicts) */
.panel-content {
  padding: 16px;
}

/* Play/pause button (Shadow DOM — use ::part) */
faceless-accordion::part(play-pause) {
  color: inherit;
  font-size: 1.25rem;
}
```
