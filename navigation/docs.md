# typedigital. FacelessNavigation

A lightweight, zero-dependency, and framework-agnostic web component for navigation menus.

It follows the **Faceless Component** pattern: decoupling state management and behavior from visual presentation. The component handles submenu toggling, ARIA patterns (Disclosure and Menubar), keyboard navigation, and responsive type-switching — styling is entirely up to you.

---

## 1. Core Technical Specifications

The component uses HTML attributes for configuration. Boolean attributes are enabled by presence alone.

| Attribute              | Type                              | Default     | Description                                     |
|------------------------|-----------------------------------|-------------|-------------------------------------------------|
| `type`                 | `desktop\|hamburger\|app-menu`    | `desktop`   | Navigation pattern to use                       |
| `hover-open`           | boolean                           | absent      | Open submenus on hover (desktop type only)      |
| `hover-delay`          | number (ms)                       | `200`       | Delay before hover-open triggers                |
| `close-on-click-outside` | boolean                        | present     | Close submenus when clicking outside            |

### CSS Variables

| Variable                     | Default     | Description                                       |
|------------------------------|-------------|---------------------------------------------------|
| `--nav-type`                 | `desktop`   | Responsive type-switching via media queries        |
| `--nav-transition-duration`  | `200ms`     | Transition duration for submenu open/close         |

---

## 2. Consumer Markup

There are two ways to supply navigation items. Both work identically — choose the one that fits your workflow.

### Option A: `<faceless-nav-item>` (recommended)

The `<faceless-nav-item>` helper element eliminates `<li>`, `<a>`/`<button>`, and `<ul>` boilerplate. The component renders the correct inner elements and wires them into the navigation automatically.

```html
<faceless-navigation aria-label="Main navigation" type="desktop">
  <faceless-nav-item href="/">Home</faceless-nav-item>
  <faceless-nav-item>
    Products
    <faceless-nav-item href="/a">Product A</faceless-nav-item>
    <faceless-nav-item href="/b">Product B</faceless-nav-item>
  </faceless-nav-item>
  <faceless-nav-item href="/about">About</faceless-nav-item>
</faceless-navigation>
```

**How it works:** Each `<faceless-nav-item>` renders a `[part="toggle"]` `<a>` (when `href` is set) or `<button>` (when no `href`) as its first child. Nested `<faceless-nav-item>` children are wrapped in a `[part="submenu"]` `<ul>`. Both parts are exposed as CSS parts for styling.

**Label resolution order:**
1. `label` attribute — if present, used verbatim
2. Text / inline-element children — moved into the toggle

#### `<faceless-nav-item>` API

| Attribute  | Type    | Description                                                                    |
|------------|---------|--------------------------------------------------------------------------------|
| `href`     | string  | URL for the item. Renders `<a>` when set, `<button>` when absent.             |
| `label`    | string  | Explicit label text. Overrides text/inline children.                           |
| `disabled` | boolean | Disables the toggle (`disabled` + `aria-disabled="true"`).                    |

#### CSS Parts

| Part         | Element                                                  |
|--------------|----------------------------------------------------------|
| `::part(toggle)`  | The `<a>` or `<button>` element                   |
| `::part(submenu)` | The `<ul>` wrapping child nav-items (parent only) |

#### Styling example

```css
/* Root nav items */
faceless-navigation[data-type="desktop"] > faceless-nav-item {
  display: block;
  position: relative;
}

faceless-navigation[data-type="desktop"] > faceless-nav-item > [part="toggle"] {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  color: #374151;
  background: none;
  border: none;
  cursor: pointer;
}

/* Open state */
faceless-navigation[data-type="desktop"] > faceless-nav-item[data-open] > [part="toggle"] {
  background: #f3f4f6;
}

/* Dropdown */
faceless-navigation[data-type="desktop"] > faceless-nav-item > [part="submenu"] {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  list-style: none;
  padding: 4px 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

faceless-navigation[data-type="desktop"] > faceless-nav-item > [part="submenu"][data-open] {
  display: block;
}
```

---

### Option B: Manual Markup (`<nav><ul><li>`)

The classic approach using standard HTML. Nested `<ul>` elements inside `<li>` are automatically detected as submenus. The first `<a>` or `<button>` before the nested `<ul>` becomes the toggle.

> **A11y note for manual markup:** `<faceless-nav-item>` handles all ARIA and semantic structure automatically. When writing manual markup, the following responsibilities fall on you:
>
> | Responsibility | Why it matters |
> |---|---|
> | Use `<a href="…">` for real links | Screen readers and keyboard users expect `<a>` elements to navigate. Do not use `<button>` for items that navigate to a URL. |
> | Use `<button>` for toggle-only items | Items that only open a submenu (no navigation target) must be `<button>`, not `<a href="#">`. A link with `href="#"` creates a confusing and redundant Tab stop. |
> | Wrap items in `<ul>` and `<li>` | This provides screen readers with list semantics ("3 items", "item 2 of 3") via `<ul role="list">`. Without this structure, users lose spatial awareness in the menu. |
> | Wrap everything in `<nav>` | `<nav>` creates a landmark so screen reader users can navigate directly to the navigation and skip it. |
> | Always provide `aria-label` on the host | Multiple navigation landmarks on a page must be distinguishable — e.g. `aria-label="Main navigation"` vs `aria-label="Footer navigation"`. The component warns in the console if this is missing. |
>
> All ARIA state attributes (`aria-expanded`, `aria-controls`, `aria-haspopup`, `role`, `tabindex`, `id` on submenus) are set and managed exclusively by the component. **Do not add these manually** — the component will overwrite or conflict with them.

```html
<faceless-navigation aria-label="Main navigation" type="desktop">
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li>
        <a href="/products">Products</a>
        <ul>
          <li><a href="/a">Product A</a></li>
          <li><a href="/b">Product B</a></li>
        </ul>
      </li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</faceless-navigation>
```

For explicit control, use `data-toggle` and `data-submenu` attributes to override auto-detection:

```html
<li>
  <button data-toggle>Products</button>
  <ul data-submenu>
    <li><a href="/a">Product A</a></li>
  </ul>
</li>
```

**Auto-detect logic:**
1. For each `<li>`: find a direct child `<ul>` (or `[data-submenu]`)
2. If found: the first `<a>` or `<button>` before the `<ul>` becomes the toggle (or explicit `[data-toggle]`)
3. `[data-toggle]`/`[data-submenu]` always override auto-detection

---

## 3. Navigation Types

### Desktop (Disclosure Pattern)

The default type. Uses the ARIA Disclosure pattern. Submenus open on click (or hover with `hover-open`).

```html
<faceless-navigation type="desktop" aria-label="Main">
  ...
</faceless-navigation>
```

### Hamburger (Disclosure + Focus Trap)

A mobile-style navigation with a hamburger toggle button in the Shadow DOM. The `<nav>` visibility is controlled by the consumer via CSS:

```css
faceless-navigation[data-type="hamburger"] nav { display: none; }
faceless-navigation[data-hamburger-open] nav { display: block; }
```

The component does **not** set `hidden` on the `<nav>`. It sets `data-hamburger-open` on the host as a CSS hook.

```html
<faceless-navigation type="hamburger" aria-label="Mobile menu">
  ...
</faceless-navigation>
```

The hamburger icon can be replaced via the `hamburger-icon` slot:

```html
<faceless-navigation type="hamburger" aria-label="Mobile menu">
  <svg slot="hamburger-icon" viewBox="0 0 24 24">...</svg>
  <nav>...</nav>
</faceless-navigation>
```

### App-Menu (Menubar Pattern)

An application-style menubar using the full ARIA Menubar pattern with roving tabindex, arrow-key navigation, Home/End, and character search.

`<faceless-nav-item>` (recommended):

```html
<faceless-navigation type="app-menu" aria-label="Application menu">
  <faceless-nav-item>
    File
    <faceless-nav-item href="#new">New</faceless-nav-item>
    <faceless-nav-item href="#open">Open</faceless-nav-item>
  </faceless-nav-item>
  <faceless-nav-item href="#help">Help</faceless-nav-item>
</faceless-navigation>
```

The component sets `role="menubar"` on the host, `role="none"` on each `<faceless-nav-item>`, and `role="menuitem"` / `aria-haspopup` / roving `tabindex` on each `[part="toggle"]`.

Manual markup (alternative):

```html
<faceless-navigation type="app-menu" aria-label="Application menu">
  <nav>
    <ul>
      <li>
        <button>File</button>
        <ul>
          <li><a href="#new">New</a></li>
          <li><a href="#open">Open</a></li>
        </ul>
      </li>
      <li><a href="#help">Help</a></li>
    </ul>
  </nav>
</faceless-navigation>
```

---

## 4. Responsive Type-Switching

The navigation type can be changed responsively using the `--nav-type` CSS variable with media queries:

```css
faceless-navigation {
  --nav-type: desktop;
}

@media (max-width: 768px) {
  faceless-navigation {
    --nav-type: hamburger;
  }
}
```

The component uses a `ResizeObserver` to detect changes and re-evaluates the type on every resize.

### Type Resolution Priority

1. `type` HTML attribute (highest priority)
2. `--nav-type` CSS variable (for responsive media queries)
3. `'desktop'` (default)

When the type changes, all ARIA attributes from the previous pattern are cleanly removed before the new pattern is applied.

---

## 5. Data Attributes (set by component)

| Attribute           | Element                          | Description                          |
|---------------------|----------------------------------|--------------------------------------|
| `data-type`         | Host                             | Reflects current type                |
| `data-open`         | `<li>`/`<faceless-nav-item>`, toggle, submenu | Styling hook for open submenus |
| `data-hamburger-open` | Host                           | Hamburger overlay is open            |
| `data-depth="N"`    | Submenu `<ul>`                   | Nesting depth (0-based)              |

---

## 6. Public API

| Method / Property    | Description                                    |
|----------------------|------------------------------------------------|
| `open(toggleOrIndex)` | Open a specific submenu (by toggle element or index) |
| `close(toggleOrIndex)` | Close a specific submenu                      |
| `closeAll()`         | Close all open submenus                        |
| `openHamburger()`    | Open the hamburger overlay                     |
| `closeHamburger()`   | Close the hamburger overlay                    |
| `toggleHamburger()`  | Toggle the hamburger overlay                   |
| `currentType` (getter) | Returns the current resolved type (readonly) |

---

## 7. Custom Events

| Event                    | React JSX alias       | Detail payload                                    |
|--------------------------|-----------------------|---------------------------------------------------|
| `nav-toggle`             | `navtoggle`           | `{ submenu: HTMLElement, open: boolean, trigger: HTMLElement }` |
| `nav-type-change`        | `navtypechange`       | `{ type: string, previousType: string }`          |
| `nav-hamburger-toggle`   | `navhamburgertoggle`  | `{ open: boolean }`                               |

---

## 8. Accessibility (A11y)

`<faceless-navigation>` implements the accessibility patterns recommended by the ARIA Authoring Practices Guide for [Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) and [Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/).

### 8.1 ARIA Patterns per Type

#### Desktop (Disclosure)

| Element      | ARIA                                       |
|--------------|--------------------------------------------|
| Toggle       | `aria-expanded="true/false"`, `aria-controls="submenu-id"` |
| Submenu `<ul>` | auto-generated `id`                      |

#### Hamburger (Disclosure + Focus Trap)

Same as Desktop, plus:

| Element             | ARIA                                          |
|---------------------|-----------------------------------------------|
| Hamburger Toggle    | `aria-expanded="true/false"`, `aria-controls="nav-id"` |
| `<nav>`             | auto-generated `id` if not present            |

Focus is trapped inside the nav when the hamburger is open. Escape closes the overlay and returns focus to the hamburger toggle.

#### App-Menu (Menubar)

| Element                | ARIA                                          |
|------------------------|-----------------------------------------------|
| Top-level `<ul>`       | `role="menubar"`                              |
| All `<li>`             | `role="none"`                                 |
| All `<a>`/`<button>`   | `role="menuitem"`, `tabindex` (roving)        |
| Toggle with submenu    | `aria-haspopup="true"`, `aria-expanded`       |
| Submenu `<ul>`         | `role="menu"`                                 |

### 8.2 Keyboard Navigation

#### Desktop & Hamburger

| Key            | Behaviour                                       |
|----------------|-------------------------------------------------|
| `Tab`          | Natural tab order through all links and buttons |
| `Enter`/`Space`| Toggle submenu on toggle elements               |
| `Escape`       | Close current submenu (or hamburger overlay)    |

#### App-Menu (Menubar)

| Key            | Behaviour                                                    |
|----------------|--------------------------------------------------------------|
| `ArrowRight`   | Next top-level item (or open sub-submenu)                    |
| `ArrowLeft`    | Previous top-level item (or close to parent)                 |
| `ArrowDown`    | Open submenu / next item in submenu                          |
| `ArrowUp`      | Open submenu (focus last) / previous item in submenu         |
| `Home`         | First item in current menu level                             |
| `End`          | Last item in current menu level                              |
| `Enter`/`Space`| Activate item / open submenu                                 |
| `Escape`       | Close current submenu, focus parent                          |
| Character      | Focus next item starting with that character                 |

### 8.3 Pattern Teardown on Type Switch

When the navigation type changes (e.g. desktop to hamburger via responsive CSS), all ARIA attributes from the previous pattern are cleanly removed:

- **Disclosure**: removes `aria-expanded`, `aria-controls` from toggles
- **Menubar**: removes `role`, `aria-haspopup`, `tabindex` from all items; removes `role="menubar"`/`"menu"`/`"none"`
- **Hamburger**: closes overlay, deactivates focus trap

### 8.4 Live Region

A visually-hidden `aria-live="polite"` announcer in the Shadow DOM announces state changes (e.g. "Navigation menu opened", "Submenu opened").

### 8.5 Missing Label Warning

If no `aria-label` is provided on the host, the component logs a console warning. Always provide a meaningful label:

```html
<faceless-navigation aria-label="Main navigation">
```

---

## 9. Universal Rendering (SSR / SSG / CSR)

`<faceless-navigation>` and `<faceless-nav-item>` work in every rendering environment without any configuration.

| Environment                     | Support                      |
|---------------------------------|------------------------------|
| Browser (CSR)                   | Full functionality           |
| Static Site Generation (SSG)    | Safe — no runtime errors     |
| Server-Side Rendering (SSR)     | Safe — no runtime errors     |
| Node.js / Deno / Edge Runtimes  | Safe — no runtime errors     |

**How it works:** Both components detect whether a browser environment is available via `typeof window !== 'undefined'`. In non-browser contexts, all DOM-dependent lifecycle methods exit immediately and `customElements.define` is skipped. The element tags are preserved in the server-rendered HTML and activate fully once JavaScript runs in the client.

---

## 10. Shadow DOM & Styling

### Shadow Parts

| Part                 | Element                           |
|----------------------|-----------------------------------|
| `::part(hamburger-toggle)` | The hamburger button (hamburger type only) |

### Slots

| Slot                 | Description                       |
|----------------------|-----------------------------------|
| (default)            | Navigation content                |
| `hamburger-icon`     | Custom icon for the hamburger toggle (default: ☰) |

### CSS Hooks (data attributes)

Style your navigation using the data attributes set by the component:

```css
/* Top-level: desktop horizontal (manual markup) */
faceless-navigation[data-type="desktop"] nav > ul {
  display: flex;
}

/* Dropdown submenus (manual markup) */
faceless-navigation[data-type="desktop"] nav ul ul {
  display: none;
  position: absolute;
}
faceless-navigation[data-type="desktop"] nav ul ul[data-open] {
  display: block;
}

/* Hamburger: hide nav, show on open */
faceless-navigation[data-type="hamburger"] nav { display: none; }
faceless-navigation[data-hamburger-open] nav { display: block; }

/* Active toggle styling */
faceless-navigation li[data-open] > a,
faceless-navigation faceless-nav-item[data-open] > [part="toggle"] {
  font-weight: bold;
}
```

---

## 11. Internal Method Reference

### Lifecycle

| Method                       | Purpose                                         |
|------------------------------|-------------------------------------------------|
| `constructor()`              | Initializes Shadow DOM, state, and binds event handlers |
| `observedAttributes` (static) | Declares observed attributes: `type`, `hover-open`, `hover-delay`, `close-on-click-outside` |
| `attributeChangedCallback()` | Re-measures type on attribute changes           |
| `connectedCallback()`       | Sets up event listeners, ResizeObserver, slot change handling; logs aria-label warning |
| `disconnectedCallback()`    | Tears down listeners, observer, hover timers, and pattern ARIA |

### Core Logic

| Method                       | Purpose                                         |
|------------------------------|-------------------------------------------------|
| `_init()`                    | Detects markup mode (nav-item vs. legacy), rebuilds the item tree, and applies the current pattern |
| `_buildItemTree(ul, parent, depth)` | Recursively discovers `<li>` and `<faceless-nav-item>` items, auto-detects toggles and submenus, builds descriptor tree |
| `_buildNavItemChildren(elements, parent, depth)` | Builds descriptor tree from an array of `<faceless-nav-item>` elements (direct children or children of `<nav>`) |
| `_resolveType()`             | Resolves active type from attribute, CSS variable, or default |
| `_measure()`                 | Detects type changes and triggers pattern apply/teardown |

### Pattern Management

| Method                       | Purpose                                         |
|------------------------------|-------------------------------------------------|
| `_applyPattern()`            | Dispatches to the correct pattern apply method  |
| `_teardownPattern()`         | Removes all ARIA attributes from the previous pattern |
| `_applyDesktopPattern()`     | Sets Disclosure ARIA on toggles and submenus    |
| `_applyHamburgerPattern()`   | Sets Disclosure ARIA + wires hamburger toggle   |
| `_applyMenubarPattern()`     | Sets full Menubar ARIA roles and roving tabindex |
| `_teardownMenubarAria()`     | Removes all Menubar roles and attributes        |

### Submenu Control

| Method                       | Purpose                                         |
|------------------------------|-------------------------------------------------|
| `_openSubmenu(desc)`         | Opens a submenu, sets data-open, dispatches event |
| `_closeSubmenu(desc)`        | Closes a submenu and all children, dispatches event |
| `_toggleSubmenu(desc)`       | Toggles a submenu, closing siblings             |

### Event Handlers

| Method                       | Purpose                                         |
|------------------------------|-------------------------------------------------|
| `_onClick(e)`                | Handles click on toggle elements                |
| `_onClickOutside(e)`         | Closes submenus and hamburger on outside click  |
| `_onKeyDown(e)`              | Routes to disclosure or menubar keyboard handler |
| `_onDisclosureKeyDown(e)`    | Handles Escape, Enter/Space, Tab trap for disclosure types |
| `_onMenubarKeyDown(e)`       | Full menubar keyboard: arrows, Home/End, character search |

### Public API

| Method                       | Purpose                                         |
|------------------------------|-------------------------------------------------|
| `open(toggleOrIndex)`        | Open a specific submenu                         |
| `close(toggleOrIndex)`       | Close a specific submenu                        |
| `closeAll()`                 | Close all open submenus                         |
| `openHamburger()`            | Open hamburger overlay                          |
| `closeHamburger()`           | Close hamburger overlay                         |
| `toggleHamburger()`          | Toggle hamburger overlay                        |
| `currentType` (getter)       | Returns current resolved type                   |
