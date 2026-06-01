// AUTO-GENERATED Do not edit manually.

import type {
  FacelessCarouselElement,
  FacelessAccordionElement,
  FacelessFormElement,
  FacelessInputElement,
  FacelessCheckboxElement,
  SlideChangeDetail,
  DragStartDetail,
  DragEndDetail,
  AccordionToggleDetail,
  FormSubmitDetail,
  InputChangeDetail,
  CheckChangeDetail,
} from './index';

type FacelessEventHandler<T> = (event: CustomEvent<T>) => void;

type WebComponentProps<T extends HTMLElement> = React.DetailedHTMLProps<React.HTMLAttributes<T>, T>;

interface FacelessCarouselProps extends WebComponentProps<FacelessCarouselElement> {
  'items-per-view'?: number | string;
  gap?: number | string;
  loop?: boolean;
  peek?: string;
  'peek-type'?: string;
  'show-dots'?: boolean;
  autoplay?: boolean;
  interval?: number | string;
  mousewheel?: boolean;
  'hide-play-pause'?: boolean;
  'no-snap'?: boolean;
  'drag-threshold'?: number | string;
  'dot-label'?: string;
  speed?: number | string;
  onSlideChange?: FacelessEventHandler<SlideChangeDetail>;
  onDragStart?: FacelessEventHandler<DragStartDetail>;
  onDragEnd?: FacelessEventHandler<DragEndDetail>;
  onAutoplayPause?: (event: CustomEvent) => void;
  onAutoplayResume?: (event: CustomEvent) => void;
  ref?: React.Ref<FacelessCarouselElement>;
}

interface FacelessAccordionProps extends WebComponentProps<FacelessAccordionElement> {
  autoplay?: boolean;
  interval?: number | string;
  multiple?: boolean;
  'hide-play-pause'?: boolean;
  onAccordionToggle?: FacelessEventHandler<AccordionToggleDetail>;
  ref?: React.Ref<FacelessAccordionElement>;
}

interface FacelessFormProps extends WebComponentProps<FacelessFormElement> {
  action?: string;
  method?: string;
  enctype?: string;
  onFormSubmit?: FacelessEventHandler<FormSubmitDetail>;
  ref?: React.Ref<FacelessFormElement>;
}

interface FacelessInputProps extends WebComponentProps<FacelessInputElement> {
  name?: string;
  type?: string;
  element?: string;
  label?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  autocomplete?: string;
  minlength?: number | string;
  maxlength?: number | string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  rows?: number | string;
  disabled?: boolean;
  value?: string;
  'error-required'?: string;
  'error-type'?: string;
  'error-pattern'?: string;
  'error-message'?: string;
  onInputChange?: FacelessEventHandler<InputChangeDetail>;
  ref?: React.Ref<FacelessInputElement>;
}

interface FacelessCheckboxProps extends WebComponentProps<FacelessCheckboxElement> {
  name?: string;
  type?: string;
  label?: string;
  hint?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  group?: string;
  'error-required'?: string;
  'error-message'?: string;
  onCheckChange?: FacelessEventHandler<CheckChangeDetail>;
  ref?: React.Ref<FacelessCheckboxElement>;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'faceless-carousel': FacelessCarouselProps;
      'faceless-accordion': FacelessAccordionProps;
      'faceless-form': FacelessFormProps;
      'faceless-input': FacelessInputProps;
      'faceless-checkbox': FacelessCheckboxProps;
    }
  }
}
