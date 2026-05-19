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
      this.dispatchEvent(new CustomEvent('form-submit', {
        bubbles: true,
        composed: true,
        detail: { valid: false, errors, values },
      }));
    } else {
      this.clearErrors();
      this.dispatchEvent(new CustomEvent('form-submit', {
        bubbles: true,
        composed: true,
        detail: { valid: true, errors: {}, values },
      }));
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
  static get observedAttributes() {
    return [
      'name', 'type', 'element', 'label', 'hint',
      'required', 'placeholder', 'autocomplete',
      'minlength', 'maxlength', 'min', 'max', 'step',
      'pattern', 'rows', 'disabled', 'value',
      'error-required', 'error-type', 'error-pattern', 'error-message',
    ];
  }

  connectedCallback() {
    if (!isBrowser) return;

    // Make this element the [data-field] wrapper
    this.setAttribute('data-field', this.getAttribute('name') || '');

    // SSR path: internal elements already pre-rendered — only sync attributes
    if (this.querySelector('[data-input]')) {
      this._wireAttributes();
      return;
    }

    this._buildDOM();
  }

  disconnectedCallback() {
    if (!isBrowser) return;
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
    fwd.forEach(attr => {
      if (this.hasAttribute(attr)) {
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
