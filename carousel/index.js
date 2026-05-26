const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const template = isBrowser ? document.createElement('template') : null;
if (template) template.innerHTML = `
<style>
  :host {
    display: flex;
    flex-direction: column;
    position: relative;
    --items-per-view: 1;
    --gap: 0px;
    --internal-slide-width: 0px;
    --dot-color: #d1d5db;
    --dot-active-color: #3b82f6;
    --dot-size: 8px;
    --dot-active-width: 24px;
    --dot-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --mask-gradient: none;
  }

  .viewport {
    order: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    touch-action: pan-y;
    -webkit-mask-image: var(--mask-gradient);
    mask-image: var(--mask-gradient);
  }

  .track {
    display: flex;
    height: 100%;
    width: max-content;
    gap: var(--gap);
    will-change: transform;
  }

  ::slotted(:not([slot])) {
    flex-shrink: 0;
    box-sizing: border-box;
    width: var(--internal-slide-width) !important;
    transition: transform 0.5s ease, opacity 0.5s ease !important;
    interactivity: inert;
  }

  ::slotted([data-visible]) {
    interactivity: auto;
  }

  ::slotted(:not([data-visible]):not([slot])) {
    opacity: 0 !important;
    pointer-events: none;
  }

  :host(.no-transition) ::slotted(:not([slot])) {
    transition: none !important;
  }

  .play-pause-btn {
    order: 2;
    display: none;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 1rem;
    align-self: center;
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

  .dots-container {
    order: 3;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0;
    padding: 20px 0;
  }
  .dots-container[hidden] { display: none; }
  .dots-container:empty { display: none; }
  .dot {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
  }
  .dot::after {
    content: '';
    display: block;
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 99px;
    background: var(--dot-color);
    transition: var(--dot-transition);
  }
  .dot.active::after {
    background: var(--dot-active-color);
    width: var(--dot-active-width);
  }

  .sr-announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
<button class="play-pause-btn" part="play-pause" aria-label="Pause auto-rotation">\u23F8</button>
<div class="dots-container" part="dots-container" role="tablist"></div>
<div class="viewport" part="viewport">
  <div class="track" part="track" role="listbox" aria-live="off" aria-atomic="false">
    <slot></slot>
  </div>
</div>
<div class="sr-announcer" aria-live="off" aria-atomic="true"></div>
`;

const BaseElement = isBrowser ? HTMLElement : class {};

class FacelessCarousel extends BaseElement {
  constructor() {
    super();
    if (!isBrowser) return;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.state = {
      isDragging: false,
      startX: 0,
      currentTranslate: 0,
      targetTranslate: 0,
      stride: 0,
      currentIndex: 0,
      realCount: 0,
      cloneCount: 0,
      isInitializing: false,
      autoplayTimer: null,
      isPaused: false,
      isUserPaused: false,
      wheelAccumulator: 0,
      isWheelLocked: false
    };

    this.config = { friction: 0.92, elasticity: 0.12, wheelThreshold: 50 };

    this._externalNavListeners = [];
    this._externalPrev = null;
    this._externalNext = null;
    this._focusChainCleanup = [];

    this._raf = this._raf.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragMove = this._onDragMove.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._toggleAutoplay = this._toggleAutoplay.bind(this);
    this._onGroupFocusIn = this._onGroupFocusIn.bind(this);
    this._onGroupFocusOut = this._onGroupFocusOut.bind(this);
  }

  static get observedAttributes() {
    return ['items-per-view', 'gap', 'loop', 'peek', 'peek-type', 'show-dots', 'autoplay', 'interval', 'mousewheel', 'hide-play-pause', 'no-snap', 'drag-threshold'];
  }

  attributeChangedCallback() {
    if (!isBrowser) return;
    if (this.isConnected) {
      this._measure();
      this._toggleDots();
    }
  }

  connectedCallback() {
    if (!isBrowser) return;
    this.viewport = this.shadowRoot.querySelector('.viewport');
    this.track = this.shadowRoot.querySelector('.track');
    this.slotEl = this.shadowRoot.querySelector('slot');
    this.dotsContainer = this.shadowRoot.querySelector('.dots-container');
    this.srAnnouncer = this.shadowRoot.querySelector('.sr-announcer');
    this.playPauseBtn = this.shadowRoot.querySelector('.play-pause-btn');

    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'region');
    this.setAttribute('aria-roledescription', 'carousel');
    if (!this.hasAttribute('aria-label')) {
      console.warn(`<faceless-carousel${this.id ? ` id="${this.id}"` : ''}> is missing an aria-label. Provide a descriptive label for the carousel content, e.g. aria-label="Partner logos".`);
    }

    this.viewport.addEventListener('mousedown', this._onDragStart);
    this.viewport.addEventListener('touchstart', this._onDragStart, { passive: false });
    window.addEventListener('mouseup', this._onDragEnd);
    window.addEventListener('touchend', this._onDragEnd);

    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('focusin', this._onFocusIn);
    this.viewport.addEventListener('wheel', this._onWheel, { passive: false });
    this.playPauseBtn.addEventListener('click', this._toggleAutoplay);

    this.resizeObserver = new ResizeObserver(this._onResize);
    this.resizeObserver.observe(this);

    this.slotEl.addEventListener('slotchange', () => {
      if (!this.state.isInitializing) this._deferredInit();
    });

    if (this.children.length > 0 && !this.state.isInitializing) {
      this._deferredInit();
    }

    // Defer so sibling buttons (NextButton after carousel in DOM) are rendered
    setTimeout(() => this._setupExternalNavButtons(), 0);

    this.addEventListener('mouseenter', () => this._setPaused(true));
    this.addEventListener('mouseleave', () => this._setPaused(false));
    this.addEventListener('focusin', this._onGroupFocusIn);
    this.addEventListener('focusout', this._onGroupFocusOut);

    this.rafId = requestAnimationFrame(this._raf);
  }

  disconnectedCallback() {
    if (!isBrowser) return;
    cancelAnimationFrame(this.rafId);
    this._stopAutoplay();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this._hydrationObserver) this._hydrationObserver.disconnect();
    clearTimeout(this._hydrationTimer);
    window.removeEventListener('mouseup', this._onDragEnd);
    window.removeEventListener('touchend', this._onDragEnd);
    window.removeEventListener('mousemove', this._onDragMove);
    window.removeEventListener('touchmove', this._onDragMove);
    cancelAnimationFrame(this._focusOutRaf);
    this._teardownFocusManagement();
    this._externalNavListeners.forEach(({ el, handler }) => {
      el.removeEventListener('click', handler);
      el.removeEventListener('focusin', this._onGroupFocusIn);
      el.removeEventListener('focusout', this._onGroupFocusOut);
      el.removeAttribute('tabindex');
    });
    this._externalNavListeners = [];
    this._externalPrev = null;
    this._externalNext = null;
  }

  _onWheel(e) {
    if (!this.hasAttribute('mousewheel')) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

    if (Math.abs(delta) < 5) return;

    e.preventDefault();
    this._stopAutoplay();

    if (this.state.isWheelLocked) return;

    this.state.wheelAccumulator += delta;

    if (Math.abs(this.state.wheelAccumulator) >= this.config.wheelThreshold) {
      if (this.state.wheelAccumulator > 0) {
        this.next();
      } else {
        this.prev();
      }

      this.state.isWheelLocked = true;
      this.state.wheelAccumulator = 0;

      setTimeout(() => {
        this.state.isWheelLocked = false;
      }, 400);
    }
  }

  _parsePeekValue(value, parentWidth) {
    if (!value) return 0;
    if (value.endsWith('%')) return (parseFloat(value) / 100) * parentWidth;
    return parseFloat(value) || 0;
  }

  _measure() {
    const parentWidth = this.viewport.getBoundingClientRect().width;
    this.state.viewportWidth = parentWidth;
    if (parentWidth === 0) return;

    const style = getComputedStyle(this);
    const items = parseFloat(this.getAttribute('items-per-view')) || parseFloat(style.getPropertyValue('--items-per-view')) || 1;
    const gap = parseFloat(this.getAttribute('gap')) || parseFloat(style.getPropertyValue('--gap')) || 0;

    const firstChild = Array.from(this.children).find(el => !el.slot);
    let childMargin = 0;
    if (firstChild) {
      const cs = getComputedStyle(firstChild);
      childMargin = (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
    }

    const peekAttr = this.getAttribute('peek');
    const peekPx = this._parsePeekValue(peekAttr, this.state.viewportWidth);

    const totalGapWidth = gap * (Math.max(1, Math.ceil(items)) - 1);
    const totalMarginWidth = childMargin * items;
    const slideWidth = (this.state.viewportWidth - totalGapWidth - totalMarginWidth - peekPx) / items;

    this.style.setProperty('--internal-slide-width', `${slideWidth}px`);
    this.style.setProperty('--gap', `${gap}px`);
    this.state.stride = slideWidth + gap + childMargin;
    this.state.itemsVisible = items;

    const peekType = this.getAttribute('peek-type') || 'hard';
    if (peekType === 'fade' && peekPx > 0) {
      const fadeStart = this.state.viewportWidth - peekPx;
      this.style.setProperty('--mask-gradient', `linear-gradient(to right, black 0px, black ${fadeStart}px, transparent ${parentWidth}px)`);
    } else {
      this.style.setProperty('--mask-gradient', 'none');
    }

    const noSnapWhilePaused = this.hasAttribute('no-snap')
      && (this.state.isPaused || this.state.isUserPaused);
    if (!noSnapWhilePaused) {
      this.goTo(this.state.currentIndex, false);
    }

    this._updateAriaLive();
  }

  _syncActiveStates() {
    const { currentIndex, realCount, cloneCount, stride, itemsVisible } = this.state;
    if (!stride) return;

    const realIndex = ((currentIndex % realCount) + realCount) % realCount;

    const dots = this.dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, idx) => {
      const isActive = idx === realIndex;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', String(isActive));
    });

    const visibleStart = cloneCount + currentIndex;
    const visibleEnd = visibleStart + Math.ceil(itemsVisible || 1);

    Array.from(this.children).filter(el => !el.slot).forEach((el, i) => {
      const elSlideIdx = parseInt(el.getAttribute('data-slide-idx'));
      const wasActive = el.hasAttribute('data-active');
      const isActive = elSlideIdx === realIndex;
      if (isActive && !wasActive) el.setAttribute('data-active', 'true');
      else if (!isActive && wasActive) el.removeAttribute('data-active');

      const isVisible = i >= visibleStart && i < visibleEnd;
      const wasVisible = el.hasAttribute('data-visible');
      if (isVisible !== wasVisible) {
        if (isVisible) {
          el.setAttribute('data-visible', 'true');
          el.removeAttribute('aria-hidden');
          el.querySelectorAll('a, button, input, select, textarea').forEach(c => c.removeAttribute('tabindex'));
        } else {
          el.removeAttribute('data-visible');
          el.setAttribute('aria-hidden', 'true');
          el.querySelectorAll('a, button, input, select, textarea').forEach(c => c.setAttribute('tabindex', '-1'));
        }
      }
    });
  }

  _suppressTransition() {
    this.classList.add('no-transition');
    requestAnimationFrame(() => this.classList.remove('no-transition'));
  }

  _applyA11yDefaults() {
    // JS fallback for browsers without CSS interactivity: inert support.
    // All slides start hidden; _syncActiveStates() reveals visible ones.
    Array.from(this.children).filter(el => !el.slot).forEach(el => {
      el.setAttribute('aria-hidden', 'true');
      el.querySelectorAll('a, button, input, select, textarea').forEach(c => c.setAttribute('tabindex', '-1'));
    });
  }

  _setupExternalNavButtons() {
    if (!this.id) return;
    document.querySelectorAll('[related-carousel="' + this.id + '"]').forEach(el => {
      const handler = () => {
        if (el.classList.contains('prev')) this.prev();
        else if (el.classList.contains('next')) this.next();
        else if (el.classList.contains('play-pause')) this._toggleAutoplay();
      };
      el.addEventListener('click', handler);
      el.addEventListener('focusin', this._onGroupFocusIn);
      el.addEventListener('focusout', this._onGroupFocusOut);
      this._externalNavListeners.push({ el, handler });

      if (el.classList.contains('prev')) {
        this._externalPrev = el;
        el.setAttribute('tabindex', '-1');
      } else if (el.classList.contains('next')) {
        this._externalNext = el;
        el.setAttribute('tabindex', '-1');
      }
    });
    this._setupFocusManagement();
  }

  _setupFocusManagement() {
    this._teardownFocusManagement();

    const chain = [];
    if (this.hasAttribute('autoplay') && this.playPauseBtn) chain.push(this.playPauseBtn);
    if (this._externalPrev) chain.push(this._externalPrev);
    if (this._externalNext) chain.push(this._externalNext);
    this.dotsContainer.querySelectorAll('.dot').forEach(d => chain.push(d));

    if (chain.length === 0) return;

    const addListener = (el, event, handler) => {
      el.addEventListener(event, handler);
      this._focusChainCleanup.push(() => el.removeEventListener(event, handler));
    };

    // Tab on host → first chain element
    addListener(this, 'keydown', (e) => {
      if (e.key !== 'Tab' || e.shiftKey) return;
      if (e.composedPath()[0] !== this) return;
      e.preventDefault();
      chain[0].focus();
    });

    // Tab / Shift+Tab between chain elements
    chain.forEach((el, i) => {
      addListener(el, 'keydown', (e) => {
        if (e.key !== 'Tab') return;
        e.stopPropagation();

        if (e.shiftKey) {
          e.preventDefault();
          if (i === 0) this.focus();
          else chain[i - 1].focus();
        } else if (i < chain.length - 1) {
          e.preventDefault();
          chain[i + 1].focus();
        } else {
          // Last chain element → focus first active slide content
          const activeSlide = this.querySelector('[data-active]:not(.clone)');
          if (activeSlide) {
            const focusable = activeSlide.querySelector('a, button, input, select, textarea, [tabindex="0"]');
            if (focusable) { e.preventDefault(); focusable.focus(); return; }
          }
          // No focusable slide content: let browser handle (exit carousel)
        }
      });
    });
  }

  _teardownFocusManagement() {
    if (this._focusChainCleanup) {
      this._focusChainCleanup.forEach(fn => fn());
      this._focusChainCleanup = [];
    }
  }

  _deferredInit() {
    if (document.readyState === 'complete') {
      this._init();
    } else {
      window.addEventListener('load', () => this._init(), { once: true });
    }
  }

  _fixClonedSlide(clone) {
    clone.querySelectorAll('img').forEach(img => {
      img.style.opacity = '1';
      img.setAttribute('loading', 'eager');
      const lazySrc = img.getAttribute('data-src') || img.getAttribute('data-lazy');
      if (lazySrc && !img.getAttribute('src')) {
        img.setAttribute('src', lazySrc);
      }
    });
  }

  _init() {
    this.state.isInitializing = true;
    this.querySelectorAll('.clone').forEach(el => el.remove());
    const rawSlides = Array.from(this.children).filter(el => !el.classList.contains('clone') && !el.slot);
    if (!rawSlides.length) { this.state.isInitializing = false; return; }

    rawSlides.forEach((slide, idx) => slide.setAttribute('data-slide-idx', idx));
    this.state.realCount = rawSlides.length;

    const total = rawSlides.length;
    rawSlides.forEach((slide, idx) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `Slide ${idx + 1} of ${total}`);
    });

    const loop = this.hasAttribute('loop');
    const itemsPerView = parseFloat(this.getAttribute('items-per-view')) || parseFloat(getComputedStyle(this).getPropertyValue('--items-per-view')) || 1;
    if (loop) {
      const buffer = Math.ceil(itemsPerView) + 2;
      this.state.cloneCount = buffer;
      for (let i = 0; i < buffer; i++) {
        const originalIdx = i % this.state.realCount;
        const clone = rawSlides[originalIdx].cloneNode(true);
        clone.classList.add('clone');
        clone.setAttribute('data-slide-idx', originalIdx);
        this._fixClonedSlide(clone);
        this.appendChild(clone);
      }
      for (let i = 0; i < buffer; i++) {
        const index = (this.state.realCount - 1 - (i % this.state.realCount));
        const clone = rawSlides[index].cloneNode(true);
        clone.classList.add('clone');
        clone.setAttribute('data-slide-idx', index);
        this._fixClonedSlide(clone);
        this.prepend(clone);
      }
    } else { this.state.cloneCount = 0; }

    this._renderDots();
    setTimeout(() => {
      this._measure();
      this.state.isInitializing = false;
      if (this.hasAttribute('autoplay')) this._startAutoplay();
      this._updateAriaLive();
    }, 0);

    this._applyA11yDefaults();
    this._watchOriginals();
  }

  _watchOriginals() {
    if (this._hydrationObserver) this._hydrationObserver.disconnect();

    const rawSlides = Array.from(this.children).filter(el => !el.classList.contains('clone') && !el.slot);

    this._hydrationObserver = new MutationObserver(() => {
      clearTimeout(this._hydrationTimer);
      this._hydrationTimer = setTimeout(() => {
        this._hydrationObserver.disconnect();
        this._refreshClones();
      }, 200);
    });

    rawSlides.forEach(slide => {
      this._hydrationObserver.observe(slide, { childList: true, subtree: true });
    });
  }

  _refreshClones() {
    const rawSlides = Array.from(this.children).filter(el => !el.classList.contains('clone') && !el.slot);
    const clones = Array.from(this.querySelectorAll('.clone'));

    clones.forEach(clone => {
      const originalIdx = parseInt(clone.getAttribute('data-slide-idx'));
      const original = rawSlides[originalIdx];
      if (!original) return;

      const newClone = original.cloneNode(true);
      newClone.classList.add('clone');
      newClone.setAttribute('data-slide-idx', originalIdx);
      this._fixClonedSlide(newClone);

      if (clone.hasAttribute('data-visible')) newClone.setAttribute('data-visible', 'true');
      if (clone.hasAttribute('data-active')) newClone.setAttribute('data-active', 'true');

      clone.replaceWith(newClone);
    });

    this._applyA11yDefaults();
  }

  _raf() {
    const { isDragging, currentTranslate, targetTranslate, stride, realCount, cloneCount } = this.state;

    if (!stride || this.state.isInitializing) {
      this.rafId = requestAnimationFrame(this._raf);
      return;
    }

    const speed = parseFloat(this.getAttribute('speed'));

    if (!isDragging) {
      if (!isNaN(speed) && speed !== 0 && !this.state.isUserPaused && !this.state.isPaused) {
        this.state.currentTranslate -= speed;
        this.state.targetTranslate = this.state.currentTranslate;
      } else if (this.hasAttribute('no-snap') && (this.state.isPaused || this.state.isUserPaused)) {
        this.state.targetTranslate = this.state.currentTranslate;
      } else {
        const diff = targetTranslate - currentTranslate;
        this.state.currentTranslate += diff * this.config.elasticity;
      }

      if (this.hasAttribute('loop')) {
        const totalWidth = realCount * stride;
        const startOfReal = -(cloneCount * stride);
        const endOfReal = -((cloneCount + realCount) * stride);

        if (this.state.currentTranslate > startOfReal) {
          this.state.currentTranslate -= totalWidth;
          this.state.targetTranslate -= totalWidth;
          this._suppressTransition();
        } else if (this.state.currentTranslate <= endOfReal) {
          this.state.currentTranslate += totalWidth;
          this.state.targetTranslate += totalWidth;
          this._suppressTransition();
        }
      }
    }

    this.track.style.transform = `translate3d(${this.state.currentTranslate}px, 0, 0)`;

    const startOfReal = -(cloneCount * stride);
    const relativePos = this.state.currentTranslate - startOfReal;
    this.state.currentIndex = Math.round(-(relativePos / stride));

    this._syncActiveStates();
    this.rafId = requestAnimationFrame(this._raf);
  }

  goTo(index, animate = true) {
    const { realCount, cloneCount, stride } = this.state;
    if (!this.hasAttribute('loop')) index = Math.max(0, Math.min(index, realCount - 1));
    this.state.currentIndex = index;
    const target = -((cloneCount + index) * stride);
    if (animate) this.state.targetTranslate = target;
    else { this.state.currentTranslate = target; this.state.targetTranslate = target; }
    const realIdx = ((index % realCount) + realCount) % realCount;
    if (this.srAnnouncer) this.srAnnouncer.textContent = `Slide ${realIdx + 1} of ${realCount}`;
    this._syncActiveStates();
  }

  next() { this.goTo(this.state.currentIndex + 1); }
  prev() { this.goTo(this.state.currentIndex - 1); }

  _onDragStart(e) {
    this._stopAutoplay();
    this.state.isDragging = true;
    this.state.startX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
    this.state.prevTranslate = this.state.currentTranslate;
    window.addEventListener('mousemove', this._onDragMove);
    window.addEventListener('touchmove', this._onDragMove, { passive: false });
  }

  _onDragMove(e) {
    if (!this.state.isDragging) return;
    const x = e.pageX || (e.touches ? e.touches[0].pageX : 0);
    this.state.currentTranslate = this.state.prevTranslate + (x - this.state.startX);
  }

  _onDragEnd() {
    if (!this.state.isDragging) return;
    this.state.isDragging = false;
    window.removeEventListener('mousemove', this._onDragMove);
    window.removeEventListener('touchmove', this._onDragMove);
    const { currentTranslate, prevTranslate, stride, cloneCount } = this.state;
    const threshold = parseFloat(this.getAttribute('drag-threshold')) || 0.2;
    const dragDelta = currentTranslate - prevTranslate;
    const relativePos = currentTranslate - (-(cloneCount * stride));
    const exactIndex = -(relativePos / stride);
    const fraction = exactIndex - Math.floor(exactIndex);
    let targetIndex;
    if (dragDelta < 0) {
      targetIndex = fraction >= threshold ? Math.ceil(exactIndex) : Math.floor(exactIndex);
    } else {
      targetIndex = (1 - fraction) >= threshold ? Math.floor(exactIndex) : Math.ceil(exactIndex);
    }
    this.goTo(targetIndex);
    if (this.hasAttribute('autoplay') && !this.state.isUserPaused) this._startAutoplay();
  }

  _onKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
  }

  _onFocusIn(e) {
    const focusedElement = e.composedPath()[0];
    const slide = focusedElement.closest('[data-slide-idx]');
    if (!slide || slide.classList.contains('clone')) return;
    const index = parseInt(slide.getAttribute('data-slide-idx'));
    this.goTo(index);
  }

  _renderDots() {
    this.dotsContainer.innerHTML = '';
    if (!this.hasAttribute('show-dots') || this.getAttribute('show-dots') === 'false') return;
    for (let i = 0; i < this.state.realCount; i++) {
      const dot = document.createElement('button');
      dot.classList.add('dot');
      dot.setAttribute('part', 'dot');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.setAttribute('aria-selected', 'false');
      dot.addEventListener('click', () => { this.goTo(i); this._stopAutoplay(); });
      this.dotsContainer.appendChild(dot);
    }
    this._syncActiveStates();
    this._setupFocusManagement();
  }

  _startAutoplay() {
    this._stopAutoplay();
    if (this.state.isPaused || this.state.isDragging || this.state.isUserPaused) return;
    const interval = parseInt(this.getAttribute('interval')) || 3000;
    this.state.autoplayTimer = setInterval(() => {
        if (!this.hasAttribute('loop') && this.state.currentIndex >= this.state.realCount - 1) {
            this._stopAutoplay(); return;
        }
        this.next();
    }, interval);
  }

  _stopAutoplay() { if (this.state.autoplayTimer) { clearInterval(this.state.autoplayTimer); this.state.autoplayTimer = null; } }
  _toggleDots() {
    if (!this.dotsContainer) return;
    const active = this.hasAttribute('show-dots') && this.getAttribute('show-dots') !== 'false';
    this.dotsContainer.hidden = !active;
    if (active && this.dotsContainer.children.length === 0) {
      this._renderDots();
    }
  }
  _onGroupFocusIn() {
    cancelAnimationFrame(this._focusOutRaf);
    this._setPaused(true);
  }

  _onGroupFocusOut() {
    cancelAnimationFrame(this._focusOutRaf);
    this._focusOutRaf = requestAnimationFrame(() => {
      const active = document.activeElement;
      const isInCarousel = this.contains(active);
      const isOnExternalNav = this._externalNavListeners.some(({ el }) => el === active || el.contains(active));
      if (!isInCarousel && !isOnExternalNav) {
        this._setPaused(false);
      }
    });
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
  }

  _updatePlayPauseButton() {
    const paused = this.state.isUserPaused;
    if (this.playPauseBtn) {
      this.playPauseBtn.textContent = paused ? '\u25B6' : '\u23F8';
      this.playPauseBtn.setAttribute('aria-label', paused ? 'Start auto-rotation' : 'Pause auto-rotation');
    }
    this._externalNavListeners.forEach(({ el }) => {
      if (el.classList.contains('play-pause')) {
        el.setAttribute('data-paused', String(paused));
        el.setAttribute('aria-label', paused ? 'Start auto-rotation' : 'Pause auto-rotation');
      }
    });
  }

  _updateAriaLive() {
    if (!this.track || !this.srAnnouncer) return;

    const style = getComputedStyle(this);
    const itemsPerView = parseFloat(this.getAttribute('items-per-view'))
      || parseFloat(style.getPropertyValue('--items-per-view'))
      || 1;
    const isMultiSlide = itemsPerView > 1;

    const isAutoRotating = this.hasAttribute('autoplay')
      && !this.state.isPaused
      && !this.state.isUserPaused;

    const value = (isMultiSlide || isAutoRotating) ? 'off' : 'polite';
    this.track.setAttribute('aria-live', value);
    this.srAnnouncer.setAttribute('aria-live', value);
  }
  _onResize() { this._measure(); }
}

if (isBrowser) customElements.define('faceless-carousel', FacelessCarousel);
