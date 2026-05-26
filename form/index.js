const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

let instanceCount = 0;

const template = isBrowser ? document.createElement('template') : null;
if (template) template.innerHTML = `
<style>
  :host { display: block; }
  .sr-announcer {
    position: absolute; width: 1px; height: 1px; padding: 0;
    margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0);
    white-space: nowrap; border: 0;
  }
</style>
<div class="sr-announcer" aria-live="polite" aria-atomic="true"></div>
<slot></slot>
`;

const BaseElement = isBrowser ? HTMLElement : class {};

class FacelessForm extends BaseElement {
  constructor() {
    super();
    if (!isBrowser) return;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.state = {
      uid: instanceCount++,
      fields: [],
    };

    this._form = null;

    this._onSubmit = this._onSubmit.bind(this);
    this._onSlotChange = this._onSlotChange.bind(this);

    ['action', 'method', 'enctype'].forEach(p => this._upgradeProperty(p));
  }

  // -- Property getters/setters for framework compatibility --

  get action() {
    if (!isBrowser) return '';
    return this.getAttribute('action') || '';
  }
  set action(val) {
    if (!isBrowser) return;
    val == null || val === '' ? this.removeAttribute('action') : this.setAttribute('action', val);
  }

  get method() {
    if (!isBrowser) return '';
    return this.getAttribute('method') || '';
  }
  set method(val) {
    if (!isBrowser) return;
    val == null || val === '' ? this.removeAttribute('method') : this.setAttribute('method', val);
  }

  get enctype() {
    if (!isBrowser) return '';
    return this.getAttribute('enctype') || '';
  }
  set enctype(val) {
    if (!isBrowser) return;
    val == null || val === '' ? this.removeAttribute('enctype') : this.setAttribute('enctype', val);
  }

  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  static get observedAttributes() {
    return ['action', 'method', 'enctype', 'aria-label'];
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (!isBrowser) return;
    if (!this._form) return;
    if (newVal === null) {
      this._form.removeAttribute(name);
    } else {
      this._form.setAttribute(name, newVal);
    }
  }

  connectedCallback() {
    if (!isBrowser) return;

    // Create or find <form> in light DOM
    let form = this.querySelector(':scope > form');
    if (!form) {
      form = document.createElement('form');
      form.setAttribute('novalidate', '');
      Array.from(this.childNodes).forEach(child => form.appendChild(child));
      this.appendChild(form);
    } else {
      form.setAttribute('novalidate', '');
    }
    this._form = form;

    // Forward host attributes to the <form>
    for (const attr of ['action', 'method', 'enctype', 'aria-label']) {
      if (this.hasAttribute(attr)) {
        form.setAttribute(attr, this.getAttribute(attr));
      }
    }

    // Host landmark
    this.setAttribute('role', 'region');
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Form');
    }

    this.shadowRoot.querySelector('slot').addEventListener('slotchange', this._onSlotChange);
    this.addEventListener('submit', this._onSubmit);

    this._init();
  }

  disconnectedCallback() {
    if (!isBrowser) return;
    this.removeEventListener('submit', this._onSubmit);
    const slot = this.shadowRoot.querySelector('slot');
    if (slot) slot.removeEventListener('slotchange', this._onSlotChange);
  }

  _onSlotChange() {
    this._init();
  }

  _init() {
    if (!this._form) return;

    // Adopt children that ended up outside <form> (frameworks like Angular
    // add children after connectedCallback, so they become siblings of <form>)
    Array.from(this.childNodes).forEach(child => {
      if (child !== this._form) {
        this._form.appendChild(child);
      }
    });

    this.state.fields = [];

    const fieldEls = Array.from(this._form.querySelectorAll('[data-field]'));

    fieldEls.forEach(fieldEl => {
      // Skip fields belonging to a nested faceless-form
      if (fieldEl.closest('faceless-form') !== this) return;

      const fieldId = fieldEl.dataset.field;
      if (!fieldId) return;

      const labelEl = fieldEl.querySelector('[data-label]');
      const inputEl = fieldEl.querySelector('[data-input]');
      const hintEl = fieldEl.querySelector('[data-hint]');
      const errorEl = fieldEl.querySelector('[data-error]');

      if (!inputEl) return;

      const uid = this.state.uid;
      const inputId = `ff${uid}-${fieldId}-input`;
      const labelId = `ff${uid}-${fieldId}-label`;
      const hintId = hintEl ? `ff${uid}-${fieldId}-hint` : null;
      const errorId = errorEl ? `ff${uid}-${fieldId}-error` : null;

      // Assign IDs
      inputEl.setAttribute('id', inputId);
      if (labelEl) {
        labelEl.setAttribute('id', labelId);
        labelEl.setAttribute('for', inputId);
      }
      if (hintEl && hintId) hintEl.setAttribute('id', hintId);
      if (errorEl && errorId) errorEl.setAttribute('id', errorId);

      // aria-describedby
      const describedBy = [hintId, errorId].filter(Boolean).join(' ');
      if (describedBy) {
        inputEl.setAttribute('aria-describedby', describedBy);
      }

      // Apply custom pattern
      if (fieldEl.dataset.pattern) {
        inputEl.setAttribute('pattern', fieldEl.dataset.pattern);
      }

      // aria-required
      if (inputEl.hasAttribute('required')) {
        inputEl.setAttribute('aria-required', 'true');
      }

      // aria-invalid initial state
      inputEl.setAttribute('aria-invalid', 'false');

      this.state.fields.push({
        id: fieldId,
        el: fieldEl,
        labelEl,
        inputEl,
        hintEl,
        errorEl,
        error: null,
      });
    });

    // Error summary: make focusable
    const summaryEl = this._form.querySelector('[data-error-summary]');
    if (summaryEl) {
      summaryEl.setAttribute('tabindex', '-1');
      summaryEl.hidden = true;
    }
  }

  _onSubmit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(this._form));
    const errors = this._runValidation();

    if (Object.keys(errors).length > 0) {
      this.setErrors(errors);
      const detail = { valid: false, errors, values };
      const opts = { bubbles: true, composed: true, detail };
      this.dispatchEvent(new CustomEvent('form-submit', opts));
      this.dispatchEvent(new CustomEvent('formsubmit', opts));
    } else {
      this.clearErrors();
      const detail = { valid: true, errors: {}, values };
      const opts = { bubbles: true, composed: true, detail };
      this.dispatchEvent(new CustomEvent('form-submit', opts));
      this.dispatchEvent(new CustomEvent('formsubmit', opts));
    }
  }

  _runValidation() {
    const errors = {};
    this.state.fields.forEach(field => {
      const input = field.inputEl;
      if (input.checkValidity()) return;
      const v = input.validity;
      const d = field.el.dataset;
      let msg = '';
      if (v.valueMissing) {
        msg = d.errorRequired || d.errorMessage || input.validationMessage;
      } else if (v.typeMismatch || v.badInput) {
        msg = d.errorType || d.errorMessage || input.validationMessage;
      } else if (v.patternMismatch) {
        msg = d.errorPattern || d.errorMessage || input.validationMessage;
      } else if (v.tooShort) {
        msg = d.errorMessage || input.validationMessage;
      } else if (v.tooLong) {
        msg = d.errorMessage || input.validationMessage;
      } else if (v.rangeUnderflow || v.rangeOverflow || v.stepMismatch) {
        msg = d.errorMessage || input.validationMessage;
      } else {
        msg = d.errorMessage || input.validationMessage;
      }
      errors[field.id] = msg;
    });
    return errors;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setError(fieldId, message) {
    const field = this.state.fields.find(f => f.id === fieldId);
    if (!field) return;
    field.error = message;
    field.el.setAttribute('data-invalid', '');
    field.inputEl.setAttribute('aria-invalid', 'true');
    if (field.errorEl) field.errorEl.textContent = message;
  }

  clearError(fieldId) {
    const field = this.state.fields.find(f => f.id === fieldId);
    if (!field) return;
    field.error = null;
    field.el.removeAttribute('data-invalid');
    field.inputEl.setAttribute('aria-invalid', 'false');
    if (field.errorEl) field.errorEl.textContent = '';
  }

  setErrors(errorsObj) {
    // Clear all first
    this.state.fields.forEach(f => this.clearError(f.id));
    // Apply new errors
    Object.entries(errorsObj).forEach(([id, msg]) => this.setError(id, msg));
    this._updateErrorSummary();
    this._moveFocusToErrors();

    const count = Object.keys(errorsObj).length;
    this._announce(
      count === 1
        ? '1 error in this form'
        : `${count} errors in this form`
    );
  }

  clearErrors() {
    this.state.fields.forEach(f => this.clearError(f.id));
    const summaryEl = this._form?.querySelector('[data-error-summary]');
    if (summaryEl) {
      summaryEl.hidden = true;
      summaryEl.innerHTML = '';
    }
    this._announce('All errors resolved');
  }

  getErrors() {
    const result = {};
    this.state.fields.forEach(f => {
      if (f.error !== null) result[f.id] = f.error;
    });
    return result;
  }

  getValues() {
    if (!this._form) return {};
    return Object.fromEntries(new FormData(this._form));
  }

  reset() {
    this.clearErrors();
    this._form?.reset();
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  _updateErrorSummary() {
    if (!this._form) return;
    const summaryEl = this._form.querySelector('[data-error-summary]');
    if (!summaryEl) return;

    const invalidFields = this.state.fields.filter(f => f.error !== null);

    if (invalidFields.length === 0) {
      summaryEl.hidden = true;
      summaryEl.innerHTML = '';
      return;
    }

    summaryEl.hidden = false;
    const count = invalidFields.length;
    const items = invalidFields.map(f => {
      const labelText = f.labelEl?.textContent?.trim() || f.id;
      const inputId = `ff${this.state.uid}-${f.id}-input`;
      return `<li><a href="#${inputId}">${labelText}: ${f.error}</a></li>`;
    });

    summaryEl.innerHTML = `
      <p>${count === 1 ? '1 error in this form' : `${count} errors in this form`}</p>
      <ul>${items.join('')}</ul>
    `;
  }

  _moveFocusToErrors() {
    if (!this._form) return;
    const summaryEl = this._form.querySelector('[data-error-summary]');
    if (summaryEl && !summaryEl.hidden) {
      summaryEl.focus();
      return;
    }
    const firstInvalid = this.state.fields.find(f => f.error !== null);
    if (firstInvalid) firstInvalid.inputEl.focus();
  }

  _announce(message) {
    const announcer = this.shadowRoot.querySelector('.sr-announcer');
    if (!announcer) return;
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }
}

if (isBrowser) customElements.define('faceless-form', FacelessForm);

// ─── FacelessInput ────────────────────────────────────────────────────────────
// Shortcut companion for <faceless-form>. Renders as a [data-field] wrapper
// with internal [data-label], [data-input], optional [data-hint], and
// [data-error] in light DOM — no shadow root needed.

class FacelessInput extends BaseElement {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'name', 'type', 'element', 'label', 'hint',
      'required', 'placeholder', 'autocomplete',
      'minlength', 'maxlength', 'min', 'max', 'step',
      'pattern', 'rows', 'disabled', 'value',
      'error-required', 'error-type', 'error-pattern', 'error-message',
    ];
  }

  constructor() {
    super();
    if (!isBrowser) return;

    if (this.attachInternals) {
      this._internals = this.attachInternals();
    }

    const props = [
      'name', 'type', 'element', 'label', 'hint',
      'required', 'placeholder', 'autocomplete',
      'minLength', 'maxLength', 'min', 'max', 'step',
      'pattern', 'rows', 'disabled', 'value',
      'errorRequired', 'errorType', 'errorPattern', 'errorMessage',
    ];
    props.forEach(p => this._upgradeProperty(p));
  }

  // -- Property getters/setters for framework compatibility --

  get name() { return this.getAttribute('name') || ''; }
  set name(val) { val == null || val === '' ? this.removeAttribute('name') : this.setAttribute('name', val); }

  get type() { return this.getAttribute('type') || 'text'; }
  set type(val) { val == null || val === '' ? this.removeAttribute('type') : this.setAttribute('type', val); }

  get element() { return this.getAttribute('element') || 'input'; }
  set element(val) { val == null || val === '' ? this.removeAttribute('element') : this.setAttribute('element', val); }

  get label() { return this.getAttribute('label') || ''; }
  set label(val) { val == null || val === '' ? this.removeAttribute('label') : this.setAttribute('label', val); }

  get hint() { return this.getAttribute('hint'); }
  set hint(val) { val == null ? this.removeAttribute('hint') : this.setAttribute('hint', val); }

  get required() { return this.hasAttribute('required') && this.getAttribute('required') !== 'false'; }
  set required(val) { val && val !== 'false' ? this.setAttribute('required', '') : this.removeAttribute('required'); }

  get placeholder() { return this.getAttribute('placeholder') || ''; }
  set placeholder(val) { val == null || val === '' ? this.removeAttribute('placeholder') : this.setAttribute('placeholder', val); }

  get autocomplete() { return this.getAttribute('autocomplete') || ''; }
  set autocomplete(val) { val == null || val === '' ? this.removeAttribute('autocomplete') : this.setAttribute('autocomplete', val); }

  get minLength() { return parseInt(this.getAttribute('minlength')) || -1; }
  set minLength(val) { val == null || val < 0 ? this.removeAttribute('minlength') : this.setAttribute('minlength', String(val)); }

  get maxLength() { return parseInt(this.getAttribute('maxlength')) || -1; }
  set maxLength(val) { val == null || val < 0 ? this.removeAttribute('maxlength') : this.setAttribute('maxlength', String(val)); }

  get min() { return this.getAttribute('min') || ''; }
  set min(val) { val == null || val === '' ? this.removeAttribute('min') : this.setAttribute('min', String(val)); }

  get max() { return this.getAttribute('max') || ''; }
  set max(val) { val == null || val === '' ? this.removeAttribute('max') : this.setAttribute('max', String(val)); }

  get step() { return this.getAttribute('step') || ''; }
  set step(val) { val == null || val === '' ? this.removeAttribute('step') : this.setAttribute('step', String(val)); }

  get pattern() { return this.getAttribute('pattern') || ''; }
  set pattern(val) { val == null || val === '' ? this.removeAttribute('pattern') : this.setAttribute('pattern', val); }

  get rows() { return parseInt(this.getAttribute('rows')) || 0; }
  set rows(val) { val == null || val <= 0 ? this.removeAttribute('rows') : this.setAttribute('rows', String(val)); }

  get disabled() { return this.hasAttribute('disabled') && this.getAttribute('disabled') !== 'false'; }
  set disabled(val) { val && val !== 'false' ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

  get value() {
    const control = this.querySelector('[data-input]');
    return control ? control.value : this.getAttribute('value') || '';
  }
  set value(val) {
    this.setAttribute('value', val ?? '');
    const control = this.querySelector('[data-input]');
    if (control) control.value = val ?? '';
  }

  get errorRequired() { return this.getAttribute('error-required') || ''; }
  set errorRequired(val) { val == null || val === '' ? this.removeAttribute('error-required') : this.setAttribute('error-required', val); }

  get errorType() { return this.getAttribute('error-type') || ''; }
  set errorType(val) { val == null || val === '' ? this.removeAttribute('error-type') : this.setAttribute('error-type', val); }

  get errorPattern() { return this.getAttribute('error-pattern') || ''; }
  set errorPattern(val) { val == null || val === '' ? this.removeAttribute('error-pattern') : this.setAttribute('error-pattern', val); }

  get errorMessage() { return this.getAttribute('error-message') || ''; }
  set errorMessage(val) { val == null || val === '' ? this.removeAttribute('error-message') : this.setAttribute('error-message', val); }

  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  connectedCallback() {
    if (!isBrowser) return;

    // Make this element the [data-field] wrapper
    this.setAttribute('data-field', this.getAttribute('name') || '');

    // SSR path: internal elements already pre-rendered — only sync attributes
    if (this.querySelector('[data-input]')) {
      this._wireAttributes();
      this._bindControlEvents();
      return;
    }

    this._buildDOM();
  }

  disconnectedCallback() {
    if (!isBrowser) return;
    this._unbindControlEvents();
  }

  _bindControlEvents() {
    this._unbindControlEvents();
    const control = this.querySelector('[data-input]');
    if (!control) return;
    this._onControlInput = () => {
      this._syncToInternals();
      const detail = { name: this.getAttribute('name'), value: control.value };
      const opts = { bubbles: true, composed: true, detail };
      this.dispatchEvent(new CustomEvent('input-change', opts));
      this.dispatchEvent(new CustomEvent('inputchange', opts));
    };
    control.addEventListener('input', this._onControlInput);
    // Initial sync
    this._syncToInternals();
  }

  _unbindControlEvents() {
    if (!this._onControlInput) return;
    const control = this.querySelector('[data-input]');
    if (control) control.removeEventListener('input', this._onControlInput);
    this._onControlInput = null;
  }

  _syncToInternals() {
    if (!this._internals) return;
    const control = this.querySelector('[data-input]');
    if (!control) return;
    this._internals.setFormValue(control.value);
    if (control.validity) {
      this._internals.setValidity(control.validity, control.validationMessage, control);
    }
  }

  formResetCallback() {
    const control = this.querySelector('[data-input]');
    if (control) control.value = '';
    this._syncToInternals();
  }

  formDisabledCallback(disabled) {
    const control = this.querySelector('[data-input]');
    if (control) control.disabled = disabled;
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (!isBrowser) return;
    // Guard: internal DOM not yet built (called before connectedCallback)
    if (!this.querySelector('[data-input]')) return;

    if (name === 'label') {
      const labelEl = this.querySelector('[data-label]');
      if (labelEl) labelEl.textContent = newVal ?? '';
      return;
    }

    if (name === 'hint') {
      const hintEl = this.querySelector('[data-hint]');
      if (hintEl) hintEl.textContent = newVal ?? '';
      return;
    }

    this._wireAttributes();
  }

  _buildDOM() {
    const elementType = this.getAttribute('element') || 'input';
    const labelText = this.getAttribute('label') || '';
    const hintText = this.getAttribute('hint');

    // Label
    const labelEl = document.createElement('label');
    labelEl.setAttribute('data-label', '');
    labelEl.textContent = labelText;

    // Control
    let control;
    if (elementType === 'select') {
      control = document.createElement('select');
      // Move existing <option>/<optgroup> children into the <select>
      Array.from(this.children).forEach(child => {
        if (child.tagName === 'OPTION' || child.tagName === 'OPTGROUP') {
          control.appendChild(child);
        }
      });
    } else {
      control = document.createElement(elementType); // 'input' or 'textarea'
      if (elementType === 'input') {
        control.type = this.getAttribute('type') || 'text';
      }
    }
    control.setAttribute('data-input', '');

    // Hint (optional)
    let hintEl = null;
    if (hintText !== null) {
      hintEl = document.createElement('span');
      hintEl.setAttribute('data-hint', '');
      hintEl.textContent = hintText;
    }

    // Error container
    const errorEl = document.createElement('span');
    errorEl.setAttribute('data-error', '');

    const toAppend = [labelEl, control];
    if (hintEl) toAppend.push(hintEl);
    toAppend.push(errorEl);
    this.append(...toAppend);

    this._wireAttributes();
    this._bindControlEvents();
  }

  _wireAttributes() {
    const control = this.querySelector('[data-input]');
    if (!control) return;

    // Forward input/control attributes
    const fwd = [
      'name', 'required', 'placeholder', 'autocomplete',
      'minlength', 'maxlength', 'min', 'max', 'step',
      'disabled', 'value', 'rows',
    ];
    const booleanAttrs = new Set(['required', 'disabled']);
    fwd.forEach(attr => {
      if (booleanAttrs.has(attr)) {
        // Boolean attributes: React may set "false" as a string on custom elements
        const val = this.getAttribute(attr);
        if (val !== null && val !== 'false') {
          control.setAttribute(attr, '');
        } else {
          control.removeAttribute(attr);
        }
      } else if (this.hasAttribute(attr)) {
        control.setAttribute(attr, this.getAttribute(attr));
      } else {
        control.removeAttribute(attr);
      }
    });

    // pattern → control[pattern] + this.dataset.pattern (read by faceless-form _init)
    if (this.hasAttribute('pattern')) {
      control.setAttribute('pattern', this.getAttribute('pattern'));
      this.dataset.pattern = this.getAttribute('pattern');
    } else {
      control.removeAttribute('pattern');
      delete this.dataset.pattern;
    }

    // error-* attributes → this.dataset.* (read by faceless-form _runValidation)
    for (const [attr, key] of [
      ['error-required', 'errorRequired'],
      ['error-type', 'errorType'],
      ['error-pattern', 'errorPattern'],
      ['error-message', 'errorMessage'],
    ]) {
      if (this.hasAttribute(attr)) {
        this.dataset[key] = this.getAttribute(attr);
      } else {
        delete this.dataset[key];
      }
    }

    // Keep data-field in sync if name changes
    if (this.hasAttribute('name')) {
      this.setAttribute('data-field', this.getAttribute('name'));
    }
  }
}

if (isBrowser) customElements.define('faceless-input', FacelessInput);
