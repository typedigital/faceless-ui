let instanceCount = 0;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    --accordion-duration: 300ms;
    --accordion-easing: ease;
  }
</style>
<slot></slot>
`;

class FacelessAccordion extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.state = { items: [], uid: instanceCount++ };

    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onTransitionEnd = this._onTransitionEnd.bind(this);
  }

  connectedCallback() {
    this.shadowRoot.querySelector('slot').addEventListener('slotchange', () => this._init());
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('transitionend', this._onTransitionEnd);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
    this.removeEventListener('transitionend', this._onTransitionEnd);
  }

  _init() {
    const children = Array.from(this.children);
    this.state.items = [];

    children.forEach((el, index) => {
      const trigger = el.querySelector(':scope > [data-trigger], :scope [data-trigger]');
      const panel = el.querySelector(':scope > [data-panel], :scope [data-panel]');
      if (!trigger || !panel) return;

      // Check nested — skip if this trigger/panel belongs to a nested accordion
      if (trigger.closest('faceless-accordion') !== this) return;
      if (panel.closest('faceless-accordion') !== this) return;

      const open = el.hasAttribute('data-open');
      const disabled = el.hasAttribute('data-disabled');

      const item = { el, trigger, panel, open, disabled, index };
      this.state.items.push(item);

      // IDs for ARIA linkage
      const triggerId = `fa${this.state.uid}-trigger-${index}`;
      const panelId = `fa${this.state.uid}-panel-${index}`;

      trigger.setAttribute('id', triggerId);
      trigger.setAttribute('aria-controls', panelId);
      panel.setAttribute('id', panelId);
      panel.setAttribute('aria-labelledby', triggerId);
      panel.setAttribute('role', 'region');

      // Role + tabindex for non-button triggers
      if (trigger.tagName !== 'BUTTON') {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
      }

      // Panel base styles for animation
      panel.style.overflow = 'hidden';
      panel.style.transition = `height var(--accordion-duration, 300ms) var(--accordion-easing, ease)`;

      if (disabled) {
        trigger.setAttribute('aria-disabled', 'true');
      }

      // Set initial state without animation
      if (open) {
        this._setOpenAttrs(item, true);
        panel.style.height = 'auto';
        panel.style.overflow = 'visible';
      } else {
        this._setOpenAttrs(item, false);
        panel.style.height = '0px';
      }
    });
  }

  _setOpenAttrs(item, open) {
    item.open = open;
    const { el, trigger, panel } = item;
    if (open) {
      el.setAttribute('data-open', '');
      trigger.setAttribute('data-open', '');
      trigger.setAttribute('aria-expanded', 'true');
      panel.setAttribute('data-open', '');
    } else {
      el.removeAttribute('data-open');
      trigger.removeAttribute('data-open');
      trigger.setAttribute('aria-expanded', 'false');
      panel.removeAttribute('data-open');
    }
  }

  _getTriggerItems() {
    return this.state.items.filter(item => !item.disabled);
  }

  _onClick(e) {
    const trigger = e.target.closest('[data-trigger]');
    if (!trigger) return;
    if (trigger.closest('faceless-accordion') !== this) return;

    const item = this.state.items.find(i => i.trigger === trigger);
    if (!item || item.disabled) return;

    this._toggle(item.index);
  }

  _onKeyDown(e) {
    const trigger = e.target.closest('[data-trigger]');
    if (!trigger) return;
    if (trigger.closest('faceless-accordion') !== this) return;

    const item = this.state.items.find(i => i.trigger === trigger);
    if (!item) return;

    const enabledItems = this._getTriggerItems();
    const currentPos = enabledItems.indexOf(item);

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (trigger.tagName !== 'BUTTON') {
          e.preventDefault();
          this._toggle(item.index);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentPos < enabledItems.length - 1) {
          enabledItems[currentPos + 1].trigger.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentPos > 0) {
          enabledItems[currentPos - 1].trigger.focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        enabledItems[0]?.trigger.focus();
        break;
      case 'End':
        e.preventDefault();
        enabledItems[enabledItems.length - 1]?.trigger.focus();
        break;
    }
  }

  _toggle(index) {
    const item = this.state.items.find(i => i.index === index);
    if (!item || item.disabled) return;

    if (item.open) {
      this._closePanel(item);
    } else {
      // In single mode, close all others first
      if (!this.hasAttribute('multiple')) {
        this.state.items.forEach(other => {
          if (other !== item && other.open) this._closePanel(other);
        });
      }
      this._openPanel(item);
    }

    this.dispatchEvent(new CustomEvent('accordion-toggle', {
      bubbles: true,
      composed: true,
      detail: { index: item.index, item: item.el, open: item.open }
    }));
  }

  _openPanel(item) {
    const { panel } = item;
    this._setOpenAttrs(item, true);
    panel.style.overflow = 'hidden';
    panel.style.height = `${panel.scrollHeight}px`;
    // Transition to scrollHeight, then transitionend sets height: auto
  }

  _closePanel(item) {
    const { panel } = item;
    // Snapshot current height, then animate to 0
    panel.style.overflow = 'hidden';
    panel.style.height = `${panel.scrollHeight}px`;
    // Force reflow so the browser registers the starting height
    panel.offsetHeight; // eslint-disable-line no-unused-expressions
    requestAnimationFrame(() => {
      panel.style.height = '0px';
    });
    this._setOpenAttrs(item, false);
  }

  _onTransitionEnd(e) {
    if (e.propertyName !== 'height') return;
    const panel = e.target.closest('[data-panel]');
    if (!panel) return;
    if (panel.closest('faceless-accordion') !== this) return;

    const item = this.state.items.find(i => i.panel === panel);
    if (!item) return;

    if (item.open) {
      panel.style.height = 'auto';
      panel.style.overflow = 'visible';
    }
  }

  // Public API
  open(index) {
    const item = this.state.items.find(i => i.index === index);
    if (!item || item.disabled || item.open) return;
    this._toggle(index);
  }

  close(index) {
    const item = this.state.items.find(i => i.index === index);
    if (!item || item.disabled || !item.open) return;
    this._toggle(index);
  }

  toggle(index) {
    this._toggle(index);
  }
}

customElements.define('faceless-accordion', FacelessAccordion);
