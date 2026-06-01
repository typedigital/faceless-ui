# TypeScript Declarations

All files in `types/` are **auto-generated**. Do not edit them manually.

# Setup

Add the relevant file(s) to the `include` array in your `tsconfig.json`:

```jsonc
// All projects — element interfaces + HTMLElementTagNameMap augmentation
{ "include": ["types/index.d.ts"] }

// React — adds JSX IntrinsicElements (faceless-carousel, etc.)
{ "include": ["types/index.d.ts", "types/react.d.ts"] }

// Vue — adds GlobalComponents augmentation for template type checking
{ "include": ["types/index.d.ts", "types/vue.d.ts"] }

// Angular — standalone directives with typed @Input/@Output
// Import directives directly in your components:
import { FacelessCarouselDirective } from 'faceless-ui/types/angular';

@Component({
  standalone: true,
  imports: [FacelessCarouselDirective],
  template: `<faceless-carousel [itemsPerView]="3" (slide-change)="onSlide($event)" />`
})
```

## Files

| File | Purpose |
|---|---|
| `types/index.d.ts` | Element interfaces (`FacelessCarouselElement`, etc.), event detail types, `HTMLElementTagNameMap` and `HTMLElementEventMap` augmentation |
| `types/react.d.ts` | JSX `IntrinsicElements` augmentation — enables typed props on `<faceless-carousel>` etc. in `.tsx` files |
| `types/vue.d.ts` | `GlobalComponents` augmentation — enables typed usage in Vue SFC templates |
| `types/angular.ts` | Standalone directives with `@Input` (including `booleanAttribute`/`numberAttribute` transforms) and `@Output`/`@HostListener` for typed event binding |

## Event Detail Types

```ts
import type {
  SlideChangeDetail,     // { index: number; previousIndex: number; total: number }
  DragStartDetail,       // { index: number }
  DragEndDetail,         // { index: number; previousIndex: number }
  AccordionToggleDetail, // { index: number; item: HTMLElement; open: boolean }
  FormSubmitDetail,      // { valid: boolean; errors: Record<string, string>; values: Record<string, string> }
  InputChangeDetail,     // { name: string; value: string }
  CheckChangeDetail,     // { name: string; value: string; checked: boolean }
} from './index';
```
