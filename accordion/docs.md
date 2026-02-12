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
- `role="region"`
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

| Variable               | Description        | Default |
|------------------------|--------------------|---------|
| `--accordion-duration` | Transition duration | `300ms` |
| `--accordion-easing`   | Transition easing   | `ease`  |

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

- **ARIA:** Automatic `aria-expanded`, `aria-controls`, `aria-labelledby`, and `role="region"` management
- **Keyboard:** Full WAI-ARIA Accordion Pattern support
- **Disabled State:** `aria-disabled="true"` on disabled triggers, skipped in keyboard navigation
- **Nested Safety:** Events from nested accordions do not propagate to parent accordions

---

## 9. Styling & Customization

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

/* Disabled items */
[data-disabled] {
  opacity: 0.5;
  pointer-events: none;
}

/* Panel inner padding (use a wrapper to avoid height conflicts) */
.panel-content {
  padding: 16px;
}
```
