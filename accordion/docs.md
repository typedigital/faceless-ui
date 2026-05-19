# typedigital. FacelessAccordion

A lightweight, zero-dependency, and framework-agnostic web component for collapsible content sections.

It follows the **Faceless Component** pattern: decoupling state management and behavior from visual presentation. The component handles height animation, ARIA attributes, and keyboard navigation — styling is entirely up to you.

---

## 1. Core Technical Specifications

The component uses a single HTML attribute for configuration. Boolean attributes are enabled by presence alone.

| Attribute  | Description                           | Default |
|------------|---------------------------------------|---------|
| `multiple` | Allow multiple panels open at once    | `false` |

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

## 6. Public API

- `open(index)` — Open a specific panel by index
- `close(index)` — Close a specific panel by index
- `toggle(index)` — Toggle a specific panel by index

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

There is nothing to configure — server/client boundaries are not an obstacle.

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

All content lives in the light DOM — no `::part` selectors needed. Style using standard CSS with data-attribute hooks:

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
```
