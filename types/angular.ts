// AUTO-GENERATED Do not edit manually.

import { Directive, Input, Output, EventEmitter, HostListener, booleanAttribute, numberAttribute } from '@angular/core';
import type { SlideChangeDetail, DragStartDetail, DragEndDetail, AccordionToggleDetail, FormSubmitDetail, InputChangeDetail, CheckChangeDetail, NavTypeChangeDetail, NavHamburgerToggleDetail, NavToggleDetail } from './index';

@Directive({ selector: 'faceless-carousel', standalone: true })
export class FacelessCarouselDirective {
  @Input({ alias: 'items-per-view', transform: numberAttribute }) itemsPerView?: number;
  @Input({ transform: numberAttribute }) gap?: number;
  @Input({ transform: booleanAttribute }) loop?: boolean;
  @Input() peek?: string;
  @Input({ alias: 'peek-type' }) peekType?: string;
  @Input({ alias: 'show-dots', transform: booleanAttribute }) showDots?: boolean;
  @Input({ transform: booleanAttribute }) autoplay?: boolean;
  @Input({ transform: numberAttribute }) interval?: number;
  @Input({ transform: booleanAttribute }) mousewheel?: boolean;
  @Input({ alias: 'hide-play-pause', transform: booleanAttribute }) hidePlayPause?: boolean;
  @Input({ alias: 'no-snap', transform: booleanAttribute }) noSnap?: boolean;
  @Input({ alias: 'drag-threshold', transform: numberAttribute }) dragThreshold?: number;
  @Input({ alias: 'dot-label' }) dotLabel?: string;
  @Input({ transform: numberAttribute }) speed?: number;

  @Output('slide-change') slideChange = new EventEmitter<CustomEvent<SlideChangeDetail>>();
  @HostListener('slide-change', ['$event'])
  private _onSlideChange(e: CustomEvent<SlideChangeDetail>) { this.slideChange.emit(e); }
  @Output('drag-start') dragStart = new EventEmitter<CustomEvent<DragStartDetail>>();
  @HostListener('drag-start', ['$event'])
  private _onDragStart(e: CustomEvent<DragStartDetail>) { this.dragStart.emit(e); }
  @Output('drag-end') dragEnd = new EventEmitter<CustomEvent<DragEndDetail>>();
  @HostListener('drag-end', ['$event'])
  private _onDragEnd(e: CustomEvent<DragEndDetail>) { this.dragEnd.emit(e); }
  @Output('autoplay-pause') autoplayPause = new EventEmitter<CustomEvent>();
  @HostListener('autoplay-pause', ['$event'])
  private _onAutoplayPause(e: CustomEvent) { this.autoplayPause.emit(e); }
  @Output('autoplay-resume') autoplayResume = new EventEmitter<CustomEvent>();
  @HostListener('autoplay-resume', ['$event'])
  private _onAutoplayResume(e: CustomEvent) { this.autoplayResume.emit(e); }
}

@Directive({ selector: 'faceless-accordion', standalone: true })
export class FacelessAccordionDirective {
  @Input({ transform: booleanAttribute }) autoplay?: boolean;
  @Input({ transform: numberAttribute }) interval?: number;
  @Input({ alias: 'autoplay-paused', transform: booleanAttribute }) autoplayPaused?: boolean;
  @Input({ transform: booleanAttribute }) multiple?: boolean;
  @Input({ alias: 'hide-play-pause', transform: booleanAttribute }) hidePlayPause?: boolean;

  @Output('accordion-toggle') accordionToggle = new EventEmitter<CustomEvent<AccordionToggleDetail>>();
  @HostListener('accordion-toggle', ['$event'])
  private _onAccordionToggle(e: CustomEvent<AccordionToggleDetail>) { this.accordionToggle.emit(e); }
}

@Directive({ selector: 'faceless-form', standalone: true })
export class FacelessFormDirective {
  @Input() action?: string;
  @Input() method?: string;
  @Input() enctype?: string;
  @Input({ alias: 'announce-errors' }) announceErrors?: string;
  @Input({ alias: 'announce-cleared' }) announceCleared?: string;

  @Output('form-submit') formSubmit = new EventEmitter<CustomEvent<FormSubmitDetail>>();
  @HostListener('form-submit', ['$event'])
  private _onFormSubmit(e: CustomEvent<FormSubmitDetail>) { this.formSubmit.emit(e); }
}

@Directive({ selector: 'faceless-input', standalone: true })
export class FacelessInputDirective {
  @Input() name?: string;
  @Input() type?: string;
  @Input() element?: string;
  @Input() label?: string;
  @Input() hint?: string;
  @Input({ transform: booleanAttribute }) required?: boolean;
  @Input() placeholder?: string;
  @Input() autocomplete?: string;
  @Input({ transform: numberAttribute }) minlength?: number;
  @Input({ transform: numberAttribute }) maxlength?: number;
  @Input({ transform: numberAttribute }) min?: number;
  @Input({ transform: numberAttribute }) max?: number;
  @Input({ transform: numberAttribute }) step?: number;
  @Input() pattern?: string;
  @Input({ transform: numberAttribute }) rows?: number;
  @Input({ transform: booleanAttribute }) disabled?: boolean;
  @Input() value?: string;
  @Input({ alias: 'error-required' }) errorRequired?: string;
  @Input({ alias: 'error-type' }) errorType?: string;
  @Input({ alias: 'error-pattern' }) errorPattern?: string;
  @Input({ alias: 'error-message' }) errorMessage?: string;

  @Output('input-change') inputChange = new EventEmitter<CustomEvent<InputChangeDetail>>();
  @HostListener('input-change', ['$event'])
  private _onInputChange(e: CustomEvent<InputChangeDetail>) { this.inputChange.emit(e); }
}

@Directive({ selector: 'faceless-checkbox', standalone: true })
export class FacelessCheckboxDirective {
  @Input() name?: string;
  @Input() type?: string;
  @Input() label?: string;
  @Input() hint?: string;
  @Input() value?: string;
  @Input({ transform: booleanAttribute }) checked?: boolean;
  @Input({ transform: booleanAttribute }) disabled?: boolean;
  @Input({ transform: booleanAttribute }) required?: boolean;
  @Input() group?: string;
  @Input({ alias: 'error-required' }) errorRequired?: string;
  @Input({ alias: 'error-message' }) errorMessage?: string;

  @Output('check-change') checkChange = new EventEmitter<CustomEvent<CheckChangeDetail>>();
  @HostListener('check-change', ['$event'])
  private _onCheckChange(e: CustomEvent<CheckChangeDetail>) { this.checkChange.emit(e); }
}

@Directive({ selector: 'faceless-nav-item', standalone: true })
export class FacelessNavItemDirective {
  @Input() href?: string;
  @Input() label?: string;
  @Input({ transform: booleanAttribute }) disabled?: boolean;
}

@Directive({ selector: 'faceless-navigation', standalone: true })
export class FacelessNavigationDirective {
  @Input() type?: string;
  @Input({ alias: 'hover-open', transform: booleanAttribute }) hoverOpen?: boolean;
  @Input({ alias: 'hover-delay', transform: numberAttribute }) hoverDelay?: number;
  @Input({ alias: 'close-on-click-outside', transform: booleanAttribute }) closeOnClickOutside?: boolean;
  @Input({ alias: 'hamburger-label' }) hamburgerLabel?: string;

  @Output('nav-type-change') navTypeChange = new EventEmitter<CustomEvent<NavTypeChangeDetail>>();
  @HostListener('nav-type-change', ['$event'])
  private _onNavTypeChange(e: CustomEvent<NavTypeChangeDetail>) { this.navTypeChange.emit(e); }
  @Output('nav-hamburger-toggle') navHamburgerToggle = new EventEmitter<CustomEvent<NavHamburgerToggleDetail>>();
  @HostListener('nav-hamburger-toggle', ['$event'])
  private _onNavHamburgerToggle(e: CustomEvent<NavHamburgerToggleDetail>) { this.navHamburgerToggle.emit(e); }
  @Output('nav-toggle') navToggle = new EventEmitter<CustomEvent<NavToggleDetail>>();
  @HostListener('nav-toggle', ['$event'])
  private _onNavToggle(e: CustomEvent<NavToggleDetail>) { this.navToggle.emit(e); }
}

