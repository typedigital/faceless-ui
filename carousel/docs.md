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

## 4. Smart Peeking & Advanced Masking
**Peeking:** Reveal a portion of the next slide using percentage or pixel values (e.g., `peek="100px"`).

**Masking:** When using `peek-type="fade"`, a high-performance CSS mask creates a smooth transition at the edges.

## 5. Intelligent Autoplay
Automatically cycles through slides with built-in **Pause-on-Hover** and **Pause-on-Focus** behavior. Sliding resumes once user interaction ends.

## 6. Continuous Scroll (Ticker Mode)
By setting the `speed` attribute, the carousel switches to a smooth, constant motion.

**Usage:** Ideal for logo walls or brand tickers.

**Interactivity:** Even in Ticker Mode, dragging will pause the motion for manual control.

## 7. Public API
The component exposes a clean API for external control:

- `next()` – Advance to the next slide  
- `prev()` – Go back to the previous slide  
- `goTo(index)` – Jump directly to a specific index  

## 8. Accessibility (A11y)
- **Keyboard Support:** Full arrow key navigation  
- **Screen Readers:** Automatic management of `aria-hidden` and `tabindex` for off-screen slides  
- **Focus Sync:** Automatically scrolls slides into view when internal elements (links/buttons) receive focus  
- **Reduced Motion:** Respects system-level `prefers-reduced-motion` settings  

## 9. Styling & Customization
Use CSS Variables and Shadow Parts to style internal elements:

- `::part(viewport)` – The clipping container  
- `::part(track)` – The sliding track  
- `::part(dot)` – Individual pagination dots  
- `::part(dot-active)` – The active pill-shaped dot  
