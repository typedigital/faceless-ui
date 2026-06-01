# Faceless UI

**Zero-dependency, framework-agnostic web components that give you behavior without imposing design.**

## The Problem

Most UI component libraries bundle logic and visuals together. You get a carousel — but it comes with its own markup structure, class names, and CSS you have to fight against to match your design. Customization becomes a battle of overrides.

## The Solution

Faceless UI separates the two concerns completely:

- **The component** owns behavior: drag physics, state, keyboard navigation, accessibility, and rendering lifecycle.
- **You** own everything visual: markup inside the component is your HTML, styled with your CSS, in your design system.

There are no default styles to override. The component exposes data attributes (`data-active`, `data-visible`) and CSS custom properties as the styling interface — you decide what they mean visually.

---

## Component Status
>
> | Component | Status |
> |---|---|
> | `<faceless-carousel>` | ✅ Production-ready |
> | `<faceless-accordion>` | 🧪 Experimental |
> | `<faceless-form>` + `<faceless-input>` + `<faceless-checkbox>` | 🧪 Experimental |
>
> Experimental components are functional and tested, but their API may change before a stable release.

---

## Quick Start

No build step, no package manager. Drop in a `<script>` tag and write HTML.

```html
<!-- 1. Load -->
<script type="module" src="/carousel/index.js"></script>

<!-- 2. Use -->
<faceless-carousel loop show-dots>
  <div class="slide">Slide 1</div>
  <div class="slide">Slide 2</div>
  <div class="slide">Slide 3</div>
</faceless-carousel>
```

```css
/* 3. Style — entirely your call */
faceless-carousel {
  --gap: 16px;
}

.slide {
  height: 400px;
  background: #f5f5f5;
  transition: opacity 0.3s;
}

/* The component sets data-active on the current slide */
.slide[data-active] {
  background: #111;
  color: #fff;
}

/* data-visible marks slides in the viewport */
.slide:not([data-visible]) {
  opacity: 0;
}
```

The component handles everything else: touch drag with momentum, infinite loop cloning, pagination dots, autoplay with pause-on-hover, full keyboard navigation, and comprehensive screen reader support.

---

## Why Faceless?

| | Typical UI Library | Faceless UI |
|---|---|---|
| Styling | Override their CSS | Write your own from scratch |
| Markup | Fixed structure | Your HTML, your classes |
| Framework | Often React/Vue-specific | Any framework or none |
| Dependencies | npm install | Single `<script>` tag |
| SSR / SSG | Often requires workarounds | Works everywhere, no config — verified by SSR test scripts |
| Bundle size | Varies, often heavy | ~10 KB, zero deps |

Faceless UI is the right choice when your product has a strong, bespoke design and you cannot afford the visual compromises that come with opinionated component libraries.

---

## Key Features

- **Design Agnostic** — Works with Tailwind, CSS Modules, plain CSS, or any other styling solution.
- **Framework Agnostic** — Vanilla Web Components. Drop into Astro, Next.js, Nuxt, SvelteKit, or plain HTML equally.
- **Universal Rendering** — Safe in SSR, SSG, Node.js, Deno, and Edge runtimes. No configuration required.
- **Accessible by Default** — Full ARIA landmark navigation, per-slide labeling, live region announcements, keyboard traversal of all slides, and focus-driven scroll sync — all built in, zero config required. See each component's docs for details.
- **Zero Dependencies** — No npm install, no build step, no runtime overhead.

---

## Components

| Component | Tag | Status |
|---|---|---|
| Carousel | `<faceless-carousel>` | ✅ Production-ready — [docs](./carousel/docs.md) |
| Accordion | `<faceless-accordion>` | 🧪 Experimental — [docs](./accordion/docs.md) |
| Form | `<faceless-form>` + `<faceless-input>` + `<faceless-checkbox>` | 🧪 Experimental — [docs](./form/docs.md) |

---

## How It Works

Each component is a Custom Element (Web Component). It manages an internal shadow DOM for functional structure (e.g. the scroll track), but all slide content lives in a `<slot>` — meaning your HTML children are rendered as-is, in your DOM, accessible to your CSS.

The component communicates state back to your elements via data attributes:

- `data-active` — set on the currently active slide
- `data-visible` — set on all slides within the viewport

Use these as CSS hooks. The component does not impose any visual output.

---

## Built-in Accessibility

Every component ships with full keyboard and screen reader support out of the box — no configuration, no ARIA attributes for the consumer to add.

| Feature | What the component does |
|---|---|
| **Landmark navigation** | Sets `role="region"` + `aria-roledescription` so screen reader users can jump past the component entirely |
| **Per-item labeling** | Each child gets `role="group"` + `aria-roledescription="slide"` + `aria-label="Slide N of M"` automatically |
| **Live region** | A visually-hidden `aria-live="polite"` region announces the current position after every navigation |
| **Full Tab access** | All focusable elements across all items (including off-screen ones) remain in the tab order; focusing an off-screen item scrolls it into view |
| **Clone isolation** | Loop-mode clones are always `aria-hidden="true"` with `tabindex="-1"` — never announced, never reachable via Tab |
| **Autoplay pause** | Autoplay automatically pauses on `mouseenter` and `focusin`, resumes on leave — screen reader and keyboard users are never interrupted |

Consumers can override the default `aria-label` with a meaningful description (e.g. `aria-label="Featured products"`). Everything else is handled internally.

Reference: [Chrome accessible carousel guide](https://developer.chrome.com/blog/accessible-carousel)

---

## Framework Integration

All components expose JavaScript property getters/setters, custom events, and `ElementInternals` — making them work in Angular, React, Vue, and Svelte without wrappers or adapters.

---

### Required Setup Per Framework

> This is the minimum configuration needed before the components will work correctly in each framework.

#### React 19

No setup required. React 19 supports custom elements and property bindings natively.

```tsx
// Properties set directly on the element
<faceless-carousel items-per-view={3} loop show-dots />
```

#### Vue 3

Mark Faceless elements as custom in `vite.config.ts` — otherwise Vue treats them as unknown components:

```ts
// vite.config.ts
vue({
  template: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('faceless-'),
    },
  },
})
```

#### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to every standalone component (or NgModule) that uses a Faceless element:

```ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ...
})
```

For `<faceless-input>` with Angular forms, add `ngDefaultControl` to opt into Angular's value accessor:

```html
<faceless-input ngDefaultControl [(ngModel)]="value" name="field"></faceless-input>
```

#### Svelte 5

No setup required. Svelte works directly with the DOM.

---

### Events

Every event fires twice — once with the canonical hyphenated name and once with a camelCase alias. React 19 JSX lowercases event names (`onCarouselChange` → `carouselchange`), so hyphenated names cannot be bound from JSX. All other frameworks support the canonical name directly.

| Component | Canonical | React JSX alias | Detail payload |
|---|---|---|---|
| Carousel | `carousel-change` | `carouselchange` | `{ index: number, total: number }` |
| Accordion | `accordion-toggle` | `accordiontoggle` | `{ index: number, item: HTMLElement, open: boolean }` |
| Form | `form-submit` | `formsubmit` | `{ valid: boolean, errors: Record<string, string>, values: Record<string, string> }` |
| Input | `input-change` | `inputchange` | `{ name: string, value: string }` |

---

### Per-Framework Snippets

**React**
```tsx
<faceless-carousel
  items-per-view={3}
  loop
  show-dots
  onCarouselChange={(e) => console.log(e.detail.index)}
/>
```

**Vue**
```vue
<faceless-carousel
  :items-per-view="3"
  :loop="true"
  show-dots
  @carousel-change="onSlideChange"
/>
```

**Angular** — use `[attr.x]` for attribute bindings, `(event-name)` for events:
```html
<faceless-carousel
  [attr.items-per-view]="itemsPerView"
  [attr.loop]="loopEnabled ? '' : null"
  show-dots
  (carousel-change)="onSlideChange($event)"
/>
```

**Svelte** — use `bind:this` to access the public API:
```svelte
<faceless-carousel
  bind:this={carouselEl}
  items-per-view={3}
  loop
  show-dots
/>
```

---

## IDE Autocompletion (Custom Elements Manifest)

Faceless UI ships a [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) (`custom-elements.json`) that describes all components, attributes, events, CSS custom properties, slots, and shadow parts in a machine-readable format. IDEs and editor plugins can consume this file to provide autocompletion in HTML templates — including Angular, Vue, Svelte, and plain HTML.

### Setup

Generate the manifest (requires Node.js):

```bash
npm install
npm run cem
```

This reads the JSDoc annotations in the component source files and produces `custom-elements.json` at the project root.

The file `custom-elements-manifest.config.mjs` defines which source files the analyzer scans via `globs`. If the directory structure changes (e.g. components are moved or new directories are added), the globs must be updated to match:

```js
// custom-elements-manifest.config.mjs
export default {
  globs: ['carousel/index.js', 'accordion/index.js', 'form/index.js'],
  // ...
};
```

### VS Code

Install the [Custom Elements Language Server](https://marketplace.visualstudio.com/items?itemName=Matsuuu.custom-elements-language-server-project) extension (`Matsuuu.custom-elements-language-server-project`). It reads `custom-elements.json` automatically via the `customElements` field in `package.json` — no additional configuration required.

After installation, typing `<faceless-` in any HTML context triggers tag completion, and attribute/event suggestions appear inside component tags.

### JetBrains (WebStorm / IntelliJ)

JetBrains IDEs support the [web-types](https://github.com/nickvdyck/web-types) format. Generate `web-types.json` from the CEM using the [`cem-plugin-jet-brains-ide-integration`](https://www.npmjs.com/package/cem-plugin-jet-brains-ide-integration) plugin, then reference it in `package.json`:

```json
{
  "web-types": "web-types.json"
}
```

### What's in the manifest?

The JSDoc annotations in the component source files are the **single source of truth**. The analyzer extracts:

| JSDoc tag | CEM field | What it describes |
|---|---|---|
| `@element` | `tagName` | Custom element tag name |
| `@attr` | `attributes` | HTML attributes with types and defaults |
| `@fires` | `events` | Dispatched events with detail payload |
| `@slot` | `slots` | Available slots |
| `@csspart` | `cssParts` | Exposed `::part()` selectors |
| `@cssprop` | `cssProperties` | CSS custom properties with defaults |
