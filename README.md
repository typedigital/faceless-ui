# Faceless UI

**Zero-dependency, framework-agnostic web components that give you behavior without imposing design.**

---

## The Problem

Most UI component libraries bundle logic and visuals together. You get a carousel — but it comes with its own markup structure, class names, and CSS you have to fight against to match your design. Customization becomes a battle of overrides.

## The Solution

Faceless UI separates the two concerns completely:

- **The component** owns behavior: drag physics, state, keyboard navigation, accessibility, and rendering lifecycle.
- **You** own everything visual: markup inside the component is your HTML, styled with your CSS, in your design system.

There are no default styles to override. The component exposes data attributes (`data-active`, `data-visible`) and CSS custom properties as the styling interface — you decide what they mean visually.

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

The component handles everything else: touch drag with momentum, infinite loop cloning, pagination dots, autoplay with pause-on-hover, keyboard navigation, and screen reader attributes.

---

## Why Faceless?

| | Typical UI Library | Faceless UI |
|---|---|---|
| Styling | Override their CSS | Write your own from scratch |
| Markup | Fixed structure | Your HTML, your classes |
| Framework | Often React/Vue-specific | Any framework or none |
| Dependencies | npm install | Single `<script>` tag |
| SSR / SSG | Often requires workarounds | Works everywhere, no config |
| Bundle size | Varies, often heavy | ~10 KB, zero deps |

Faceless UI is the right choice when your product has a strong, bespoke design and you cannot afford the visual compromises that come with opinionated component libraries.

---

## Key Features

- **Design Agnostic** — Works with Tailwind, CSS Modules, plain CSS, or any other styling solution.
- **Framework Agnostic** — Vanilla Web Components. Drop into Astro, Next.js, Nuxt, SvelteKit, or plain HTML equally.
- **Universal Rendering** — Safe in SSR, SSG, Node.js, Deno, and Edge runtimes. No configuration required.
- **Accessible by Default** — `aria-hidden`, `tabindex`, focus management, and keyboard navigation handled automatically.
- **Zero Dependencies** — No npm install, no build step, no runtime overhead.

---

## Components

| Component | Tag | Status |
|---|---|---|
| Carousel | `<faceless-carousel>` | Available — [docs](./carousel/docs.md) |
| Accordion | `<faceless-accordion>` | Available — [docs](./accordion/docs.md) |

---

## How It Works

Each component is a Custom Element (Web Component). It manages an internal shadow DOM for functional structure (e.g. the scroll track), but all slide content lives in a `<slot>` — meaning your HTML children are rendered as-is, in your DOM, accessible to your CSS.

The component communicates state back to your elements via data attributes:

- `data-active` — set on the currently active slide
- `data-visible` — set on all slides within the viewport

Use these as CSS hooks. The component does not impose any visual output.
