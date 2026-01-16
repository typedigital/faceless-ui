# typedigital. EasyCarousel

A lightweight, zero-dependency, and framework-agnostic web component designed for high-performance digital products.

It follows the **typedigital. philosophy**: technology-driven positive change.

---

## Core Features

- **Zero Dependencies**  
  Built with pure Vanilla JS and Shadow DOM for maximum compatibility and performance.

- **Infinite Loop**  
  Seamlessly transitions from the last to the first slide without flickering.

- **Responsive by Design**  
  Control the layout using the `items-per-view` attribute or CSS variables for different breakpoints.

- **Smart Peeking**  
  Reveal a portion of the next slide (using `%` or `px`) to encourage user interaction.

- **Advanced Masking**  
  Support for “hard” edges or a “fade” transition at the carousel edges using high-performance CSS masks.

- **Pill Pagination**  
  Interactive dots with a modern pill-style expansion animation for the active state.

- **Intelligent Autoplay**  
  Automatically cycles through slides with built-in *Pause-on-Hover* and *Pause-on-Focus* behavior.

- **Accessibility (A11y)**  
  Full keyboard support (arrow keys), screen-reader visibility management, and focus synchronization.

- **Reduced Motion Support**  
  Respects system-level `prefers-reduced-motion` settings.

---

## Technical Specifications

### Attributes

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

---

## CSS Variables

```css
easy-carousel {
  --items-per-view: 1;
  --gap: 20px;
  --dot-active-color: #FF5958; 
  --dot-color: #171D26;
}
```

## CSS Parts

You can style internal elements using `::part()`:

- `::part(viewport)` – The main container
- `::part(track)` – The sliding track
- `::part(dot)` – Individual pagination dots
- `::part(dot-active)` – The currently active pill-shaped dot

---

## Public API

The component exposes a clean API for external control:

- `next()` – Advance to the next slide
- `prev()` – Go back to the previous slide
- `goTo(index)` – Jump directly to a specific slide index
