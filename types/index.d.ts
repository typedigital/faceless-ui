// AUTO-GENERATED Do not edit manually.

// ─── Event Detail Types ─────────────────────────────────────────────────────────

export interface SlideChangeDetail { index: number; previousIndex: number; total: number; }
export interface DragStartDetail { index: number; }
export interface DragEndDetail { index: number; previousIndex: number; }
export interface AccordionToggleDetail { index: number; item: HTMLElement; open: boolean; }
export interface FormSubmitDetail { valid: boolean; errors: Record<string, string>; values: Record<string, string>; }
export interface InputChangeDetail { name: string; value: string; }
export interface CheckChangeDetail { name: string; value: string; checked: boolean; }

// ─── Element Interfaces ────────────────────────────────────────────────────────

export interface FacelessCarouselElement extends HTMLElement {
  itemsPerView: number;
  gap: number;
  loop: boolean;
  peek: string;
  peekType: string;
  showDots: boolean;
  autoplay: boolean;
  interval: number;
  mousewheel: boolean;
  hidePlayPause: boolean;
  noSnap: boolean;
  dragThreshold: number;
  dotLabel: string;
  speed: number;
  goTo(index: number, animate?: boolean): void;
  next(): void;
  prev(): void;
}

export interface FacelessAccordionElement extends HTMLElement {
  autoplay: boolean;
  interval: number;
  multiple: boolean;
  hidePlayPause: boolean;
  open(index: number): void;
  close(index: number): void;
  toggle(index: number): void;
}

export interface FacelessFormElement extends HTMLElement {
  action: string;
  method: string;
  enctype: string;
  setError(fieldId: any, message: any): void;
  clearError(fieldId: any): void;
  setErrors(errorsObj: any): void;
  clearErrors(): void;
  getErrors(): any;
  getValues(): any;
  reset(): void;
}

export interface FacelessInputElement extends HTMLElement {
  name: string;
  type: string;
  element: string;
  label: string;
  hint: string;
  required: boolean;
  placeholder: string;
  autocomplete: string;
  minlength: number;
  maxlength: number;
  min: number;
  max: number;
  step: number;
  pattern: string;
  rows: number;
  disabled: boolean;
  value: string;
  errorRequired: string;
  errorType: string;
  errorPattern: string;
  errorMessage: string;
}

export interface FacelessCheckboxElement extends HTMLElement {
  name: string;
  type: string;
  label: string;
  hint: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  required: boolean;
  group: string;
  errorRequired: string;
  errorMessage: string;
}

// ─── Global Augmentations ──────────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'faceless-carousel': FacelessCarouselElement;
    'faceless-accordion': FacelessAccordionElement;
    'faceless-form': FacelessFormElement;
    'faceless-input': FacelessInputElement;
    'faceless-checkbox': FacelessCheckboxElement;
  }

  interface HTMLElementEventMap {
    'slide-change': CustomEvent<SlideChangeDetail>;
    'slidechange': CustomEvent<SlideChangeDetail>;
    'drag-start': CustomEvent<DragStartDetail>;
    'dragstart': CustomEvent<DragStartDetail>;
    'drag-end': CustomEvent<DragEndDetail>;
    'dragend': CustomEvent<DragEndDetail>;
    'autoplay-pause': CustomEvent;
    'autoplaypause': CustomEvent;
    'autoplay-resume': CustomEvent;
    'autoplayresume': CustomEvent;
    'accordion-toggle': CustomEvent<AccordionToggleDetail>;
    'accordiontoggle': CustomEvent<AccordionToggleDetail>;
    'form-submit': CustomEvent<FormSubmitDetail>;
    'formsubmit': CustomEvent<FormSubmitDetail>;
    'input-change': CustomEvent<InputChangeDetail>;
    'inputchange': CustomEvent<InputChangeDetail>;
    'check-change': CustomEvent<CheckChangeDetail>;
    'checkchange': CustomEvent<CheckChangeDetail>;
  }
}
