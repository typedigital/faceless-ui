const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

let instanceCount = 0;

// eslint-disable-next-line no-undef
if (isBrowser && !document.getElementById('faceless-accordion-styles')) {
  // eslint-disable-next-line no-undef
  const focusStyle = document.createElement('style');
  focusStyle.id = 'faceless-accordion-styles';
  focusStyle.textContent = `[data-trigger][role="button"]:focus-visible {
  outline: var(--accordion-focus-ring, 2px solid currentColor);
  outline-offset: var(--accordion-focus-ring-offset, 2px);
}`;
  // eslint-disable-next-line no-undef
  document.head.appendChild(focusStyle);
}

const template = isBrowser ? document.createElement('template') : null;
if (template) template.innerHTML = `
<style>
  :host {
    display: block;
    --accordion-duration: 300ms;
    --accordion-easing: ease;
  }
  @media (prefers-reduced-motion: reduce) {
    :host { --accordion-duration: 0ms; }
  }
  .play-pause-btn {
    display: none;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 1rem;
  }
  :host([autoplay]) .play-pause-btn {
    display: inline-flex;
  }
  :host([hide-play-pause]) .play-pause-btn {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .sr-announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
<button class="play-pause-btn" part="play-pause" aria-label="Pause auto-rotation">⏸</button>
<slot></slot>
<div class="sr-announcer" aria-live="off" aria-atomic="true"></div>
`;

const BaseElement = isBrowser ? HTMLElement : class {};

/**
 * A headless accordion component with single/multiple open modes, autoplay,
 * smooth height animation, and full keyboard/screen-reader support.
 * Child items use `[data-trigger]` and `[data-panel]` attributes.
 *
 * @element faceless-accordion
 *
 * @attr {boolean} multiple - Allow multiple panels open simultaneously (default: single-open).
 * @attr {boolean} autoplay - Enable automatic panel rotation.
 * @attr {number} interval - Autoplay interval in milliseconds (default: 3000).
 * @attr {boolean} hide-play-pause - Visually hide the autoplay play/pause button.
 * @attr {boolean} autoplay-paused - Pause autoplay from outside the component. The
 *   built-in button reflects its state here too, so consumers can mirror it.
 *
 * @fires {CustomEvent} accordion-toggle - Fires when a panel opens or closes. `detail: { index: number, item: HTMLElement, open: boolean }`
 * @fires {CustomEvent} accordiontoggle - Alias of `accordion-toggle`.
 *
 * @slot - Default slot for accordion items, each containing `[data-trigger]` and `[data-panel]`.
 *
 * @cssprop [--accordion-duration=300ms] - Panel open/close animation duration.
 * @cssprop [--accordion-easing=ease] - Panel animation easing function.
 * @cssprop [--accordion-focus-ring=2px solid currentColor] - Focus ring style for triggers.
 * @cssprop [--accordion-focus-ring-offset=2px] - Focus ring offset.
 */
class FacelessAccordion extends BaseElement {
  constructor() {
    super();
    if (!isBrowser) return;

    // A Shadow Root may already exist when the markup was server-rendered with
    // Declarative Shadow DOM — the parser attaches it before the upgrade runs.
    // Calling attachShadow() again would throw, so adopt what is already there.
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    this.playPauseBtn = this.shadowRoot.querySelector('.play-pause-btn');
    this.srAnnouncer = this.shadowRoot.querySelector('.sr-announcer');

    this.state = {
      items: [],
      uid: instanceCount++,
      autoplayTimer: null,
      // Bookkeeping so a pause resumes the cycle instead of restarting it.
      autoplayRemaining: null,
      autoplayCycleLength: 0,
      autoplayStartedAt: 0,
      isPaused: false,
      isUserPaused: false,
    };

    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onTransitionEnd = this._onTransitionEnd.bind(this);
    this._toggleAutoplay = this._toggleAutoplay.bind(this);
    this._onGroupFocusIn = this._onGroupFocusIn.bind(this);
    this._onGroupFocusOut = this._onGroupFocusOut.bind(this);
  }

  static get observedAttributes() {
    return ['autoplay', 'interval', 'autoplay-paused'];
  }

  attributeChangedCallback(name) {
    if (!isBrowser || !this.isConnected) return;
    if (name === 'autoplay') {
      if (this.hasAttribute('autoplay')) {
        this._startAutoplay();
      } else {
        this._stopAutoplay();
        this._updatePlayPauseButton();
      }
      this._updateAriaLive();
    }
    if (name === 'interval' && this.hasAttribute('autoplay') && !this.state.isUserPaused) {
      // A new interval invalidates the remainder measured against the old one.
      this._stopAutoplay();
      this.state.autoplayRemaining = null;
      this._startAutoplay();
    }
    if (name === 'autoplay-paused') {
      this._syncUserPausedFromAttribute();
    }
  }

  /**
   * Outside handle on the autoplay state: set `autoplay-paused` to pause, remove
   * it to resume. Reads back the same value the built-in button produces, so a
   * consumer with its own control can mirror whatever flipped the state.
   */
  get autoplayPaused() {
    return this.hasAttribute('autoplay-paused');
  }

  set autoplayPaused(paused) {
    this.toggleAttribute('autoplay-paused', Boolean(paused));
  }

  /** Applies an externally set `autoplay-paused` through the regular toggle. */
  _syncUserPausedFromAttribute() {
    if (this.hasAttribute('autoplay-paused') !== this.state.isUserPaused) {
      this._toggleAutoplay();
    }
  }

  connectedCallback() {
    if (!isBrowser) return;
    this.shadowRoot.querySelector('slot').addEventListener('slotchange', () => this._init());
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('transitionend', this._onTransitionEnd);
    this.playPauseBtn.addEventListener('click', this._toggleAutoplay);
    this.addEventListener('mouseenter', () => this._setPaused(true));
    this.addEventListener('mouseleave', () => this._setPaused(false));
    this.addEventListener('focusin', this._onGroupFocusIn);
    this.addEventListener('focusout', this._onGroupFocusOut);
  }

  disconnectedCallback() {
    if (!isBrowser) return;
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
    this.removeEventListener('transitionend', this._onTransitionEnd);
    this._stopAutoplay();
    cancelAnimationFrame(this._focusOutRaf);
  }

  _init() {
    // Capture focus context before clearing state.
    // slotchange fires on framework re-renders; without this the focused trigger loses
    // focus, breaking keyboard navigation mid-interaction.
    const focusedEl = document.activeElement; // eslint-disable-line no-undef
    const focusedIndex = this.state.items.findIndex(
      (i) => i.trigger === focusedEl || i.trigger.contains(focusedEl),
    );

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

      const hasAccessibleName = trigger.textContent.trim()
        || trigger.getAttribute('aria-label')
        || trigger.getAttribute('aria-labelledby');

      if (hasAccessibleName) {
        panel.setAttribute('role', 'region');
      } else {
        panel.removeAttribute('role');
        // eslint-disable-next-line no-console
        console.warn(`[faceless-accordion] Item ${index}: trigger has no accessible name. Add text content, aria-label, or aria-labelledby.`);
      }

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

    if (focusedIndex !== -1) {
      const refocusItem = this.state.items.find((i) => i.index === focusedIndex);
      if (refocusItem) {
        refocusItem.trigger.focus();
      }
    }

    if (this.hasAttribute('autoplay')) {
      const hasOpenItem = this.state.items.some(i => i.open);
      if (!hasOpenItem) {
        const firstEnabled = this._getTriggerItems()[0];
        if (firstEnabled) {
          this._setOpenAttrs(firstEnabled, true);
          firstEnabled.panel.style.height = 'auto';
          firstEnabled.panel.style.overflow = 'visible';
        }
      }
      this._startAutoplay();
      this._updateAriaLive();
    }

    // Panels now carry their real open/closed height. Release the pre-upgrade
    // placeholder, which was keeping closed panels collapsed (see preflight.css).
    this.setAttribute('data-ready', '');
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

    if (this.hasAttribute('autoplay') && !this.state.isUserPaused && !this.state.isPaused) {
      // The open item changes, so the next cycle starts from scratch. Stop
      // first: _startAutoplay would otherwise bank the remainder on its way in.
      this._stopAutoplay();
      this.state.autoplayRemaining = null;
      this._startAutoplay();
    }

    if (item.open) {
      this._closePanel(item);
    } else {
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
      detail: { index: item.index, item: item.el, open: item.open },
    }));
  }

  _openPanel(item) {
    const { panel } = item;
    this._setOpenAttrs(item, true);
    panel.style.overflow = 'hidden';
    panel.style.height = `${panel.scrollHeight}px`;
  }

  _closePanel(item) {
    const { panel } = item;
    panel.style.overflow = 'hidden';
    panel.style.height = `${panel.scrollHeight}px`;
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

  _startAutoplay() {
    this._stopAutoplay();
    if (this.state.isPaused || this.state.isUserPaused) return;

    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return; // eslint-disable-line no-undef

    const interval = parseInt(this.getAttribute('interval')) || 3000;
    this.style.setProperty('--accordion-autoplay-interval', `${interval}ms`);
    const tick = () => {
      this._beginAutoplayCycle(interval);
      const enabledItems = this._getTriggerItems();
      if (enabledItems.length <= 1) return;

      const currentOpen = enabledItems.find(i => i.open);
      const currentOpenIndex = currentOpen ? enabledItems.indexOf(currentOpen) : -1;
      const nextIndex = (currentOpenIndex + 1) % enabledItems.length;
      const nextItem = enabledItems[nextIndex];

      if (nextItem.open) return;

      this.state.items.forEach(i => {
        if (i.open) this._closePanel(i);
      });
      this._openPanel(nextItem);

      this.dispatchEvent(new CustomEvent('accordion-toggle', {
        bubbles: true,
        composed: true,
        detail: { index: nextItem.index, item: nextItem.el, open: true, autoplay: true, interval },
      }));

      this.srAnnouncer.textContent = `Item ${nextItem.index + 1} of ${enabledItems.length}`;
    };

    // A pause stores what was left of the cycle. Serve that remainder first and
    // only then fall back into the regular rhythm — otherwise every pause would
    // silently grant a full interval again, and a progress indicator driven by
    // --accordion-autoplay-state would run ahead of the rotation.
    const wait = this.state.autoplayRemaining === null ? interval : this.state.autoplayRemaining;
    this.state.autoplayRemaining = null;
    this._beginAutoplayCycle(wait);

    if (wait === interval) {
      this.state.autoplayTimer = setInterval(tick, interval);
    } else {
      this.state.autoplayTimer = setTimeout(() => {
        tick();
        this.state.autoplayTimer = setInterval(tick, interval);
      }, wait);
    }
    this.style.setProperty('--accordion-autoplay-state', 'running');
  }

  /** Marks the start of a cycle of `length` ms, for the remaining-time maths. */
  _beginAutoplayCycle(length) {
    this.state.autoplayCycleLength = length;
    this.state.autoplayStartedAt = Date.now();
  }

  _stopAutoplay() {
    if (this.state.autoplayTimer) {
      // Carry the unspent part of the cycle over to the next start.
      const elapsed = Date.now() - this.state.autoplayStartedAt;
      this.state.autoplayRemaining = Math.max(0, this.state.autoplayCycleLength - elapsed);
      clearTimeout(this.state.autoplayTimer);
      clearInterval(this.state.autoplayTimer);
      this.state.autoplayTimer = null;
    }
    this.style.setProperty('--accordion-autoplay-state', 'paused');
  }

  _setPaused(paused) {
    this.state.isPaused = paused;
    if (paused) {
      this._stopAutoplay();
    } else if (this.hasAttribute('autoplay') && !this.state.isUserPaused) {
      this._startAutoplay();
    }
    this._updateAriaLive();
  }

  _toggleAutoplay() {
    this.state.isUserPaused = !this.state.isUserPaused;
    if (this.state.isUserPaused) {
      this._stopAutoplay();
    } else if (this.hasAttribute('autoplay')) {
      this.state.isPaused = false;
      this._startAutoplay();
    }
    this._updatePlayPauseButton();
    this._updateAriaLive();
    // Reflected so the attribute stays the single readable source of truth.
    this.toggleAttribute('autoplay-paused', this.state.isUserPaused);
  }

  _updatePlayPauseButton() {
    if (!this.playPauseBtn) return;
    const paused = this.state.isUserPaused;
    this.playPauseBtn.textContent = paused ? '\u25B6' : '\u23F8';
    this.playPauseBtn.setAttribute('aria-label', paused ? 'Start auto-rotation' : 'Pause auto-rotation');
  }

  _updateAriaLive() {
    if (!this.srAnnouncer) return;
    const isAutoRotating = this.hasAttribute('autoplay')
      && !this.state.isPaused
      && !this.state.isUserPaused;
    this.srAnnouncer.setAttribute('aria-live', isAutoRotating ? 'off' : 'polite');
  }

  _onGroupFocusIn() {
    cancelAnimationFrame(this._focusOutRaf);
    this._setPaused(true);
  }

  _onGroupFocusOut() {
    cancelAnimationFrame(this._focusOutRaf);
    this._focusOutRaf = requestAnimationFrame(() => {
      const active = document.activeElement; // eslint-disable-line no-undef
      if (!this.contains(active)) {
        this._setPaused(false);
      }
    });
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

if (isBrowser) customElements.define('faceless-accordion', FacelessAccordion);
