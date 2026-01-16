const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    overflow: hidden;
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

  ::slotted(*) {
    flex-shrink: 0;
    box-sizing: border-box;
    width: var(--internal-slide-width) !important;
    transition: transform 0.5s ease, opacity 0.5s ease, visibility 0.3s;
  }

  ::slotted(:not([data-visible])) {
    visibility: hidden !important;
    pointer-events: none;
  }

  .dots-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    padding: 20px 0;
  }
  .dots-container[hidden] { display: none; }
  .dot {
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 99px;
    border: none;
    background: var(--dot-color);
    cursor: pointer;
    padding: 0;
    transition: var(--dot-transition);
  }
  .dot.active {
    background: var(--dot-active-color);
    width: var(--dot-active-width);
  }
</style>
<div class="viewport" part="viewport">
  <div class="track" part="track" role="listbox">
    <slot></slot>
  </div>
</div>
<div class="dots-container" part="dots-container" role="tablist"></div>
`;

class EasyCarousel extends HTMLElement {
  constructor() {
    super();
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
      // Wheel State
      wheelAccumulator: 0,
      isWheelLocked: false
    };

    this.config = { friction: 0.92, elasticity: 0.12, wheelThreshold: 50 };

    this._raf = this._raf.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragMove = this._onDragMove.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
    this._onWheel = this._onWheel.bind(this);
  }

  static get observedAttributes() { 
    return ['items-per-view', 'gap', 'loop', 'peek', 'peek-type', 'show-dots', 'autoplay', 'interval', 'mousewheel']; 
  }

  attributeChangedCallback() {
    if (this.isConnected) this._measure();
  }

  connectedCallback() {
    this.viewport = this.shadowRoot.querySelector('.viewport');
    this.track = this.shadowRoot.querySelector('.track');
    this.slotEl = this.shadowRoot.querySelector('slot');
    this.dotsContainer = this.shadowRoot.querySelector('.dots-container');

    this.setAttribute('tabindex', '0');
    
    // Mouse & Touch
    this.viewport.addEventListener('mousedown', this._onDragStart);
    this.viewport.addEventListener('touchstart', this._onDragStart, { passive: false });
    window.addEventListener('mousemove', this._onDragMove);
    window.addEventListener('touchmove', this._onDragMove, { passive: false });
    window.addEventListener('mouseup', this._onDragEnd);
    window.addEventListener('touchend', this._onDragEnd);
    
    // Keyboard & Wheel
    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('focusin', this._onFocusIn);
    this.viewport.addEventListener('wheel', this._onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(this._onResize);
    this.resizeObserver.observe(this);
    
    this.slotEl.addEventListener('slotchange', () => {
      if (!this.state.isInitializing) this._init();
    });
    
    this.rafId = requestAnimationFrame(this._raf);
  }

  // --- NEU: Wheel Handler ---
  _onWheel(e) {
    if (!this.hasAttribute('mousewheel')) return;

    // Wir schauen auf deltaX (reguläres horizontales Scrollen) 
    // oder deltaY + Shift-Taste (Windows-Standard für horizontales Scrollen)
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    
    if (Math.abs(delta) < 5) return; // Ignore micro-scrolls

    e.preventDefault(); // Stoppt Browser Back/Forward Geste
    this._stopAutoplay();

    if (this.state.isWheelLocked) return;

    this.state.wheelAccumulator += delta;

    if (Math.abs(this.state.wheelAccumulator) >= this.config.wheelThreshold) {
      if (this.state.wheelAccumulator > 0) {
        this.next();
      } else {
        this.prev();
      }
      
      // Lock setzen, damit ein "Flick" nicht 10 Slides überspringt
      this.state.isWheelLocked = true;
      this.state.wheelAccumulator = 0;

      // Unlock nach kurzer Zeit
      setTimeout(() => {
        this.state.isWheelLocked = false;
      }, 400); // 400ms Cooldown für Wheel-Gesten
    }
  }

  _parsePeekValue(value, parentWidth) {
    if (!value) return 0;
    if (value.endsWith('%')) return (parseFloat(value) / 100) * parentWidth;
    return parseFloat(value) || 0;
  }

  _measure() {
    const parentWidth = this.viewport.getBoundingClientRect().width;
    if (parentWidth === 0) return;

    const style = getComputedStyle(this);
    const items = parseFloat(this.getAttribute('items-per-view')) || parseFloat(style.getPropertyValue('--items-per-view')) || 1;
    const gap = parseFloat(this.getAttribute('gap')) || parseFloat(style.getPropertyValue('--gap')) || 0;
    
    const peekAttr = this.getAttribute('peek');
    const peekPx = this._parsePeekValue(peekAttr, parentWidth);

    const totalGapWidth = gap * (Math.max(1, Math.ceil(items)) - 1);
    const slideWidth = (parentWidth - totalGapWidth - peekPx) / items;
    
    this.style.setProperty('--internal-slide-width', `${slideWidth}px`);
    this.style.setProperty('--gap', `${gap}px`);
    this.state.stride = slideWidth + gap;

    const peekType = this.getAttribute('peek-type') || 'hard';
    if (peekType === 'fade' && peekPx > 0) {
      const fadeStart = parentWidth - peekPx;
      this.style.setProperty('--mask-gradient', `linear-gradient(to right, black 0px, black ${fadeStart}px, transparent ${parentWidth}px)`);
    } else {
      this.style.setProperty('--mask-gradient', 'none');
    }
    
    this.goTo(this.state.currentIndex, false);
  }

  _syncActiveStates() {
    const { currentIndex, realCount, cloneCount } = this.state;
    const itemsVisible = parseFloat(getComputedStyle(this).getPropertyValue('--items-per-view')) || 1;
    const realIndex = ((currentIndex % realCount) + realCount) % realCount;

    const dots = this.dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === realIndex));

    const viewportStart = cloneCount + currentIndex;
    const viewportEnd = viewportStart + itemsVisible;

    Array.from(this.children).forEach((el, i) => {
      const elSlideIdx = parseInt(el.getAttribute('data-slide-idx'));
      if (elSlideIdx === realIndex) el.setAttribute('data-active', 'true');
      else el.removeAttribute('data-active');

      const isVisible = i >= viewportStart && i < Math.ceil(viewportEnd + 0.1);

      if (isVisible) {
        el.setAttribute('data-visible', 'true');
        el.removeAttribute('aria-hidden');
        const isClone = el.classList.contains('clone');
        el.querySelectorAll('a, button, input').forEach(c => c.setAttribute('tabindex', isClone ? '-1' : '0'));
      } else {
        el.removeAttribute('data-visible');
        el.setAttribute('aria-hidden', 'true');
        el.querySelectorAll('a, button, input').forEach(c => c.setAttribute('tabindex', '-1'));
      }
    });
  }

  _init() {
    this.state.isInitializing = true;
    this.querySelectorAll('.clone').forEach(el => el.remove());
    const rawSlides = Array.from(this.children).filter(el => !el.classList.contains('clone'));
    if (!rawSlides.length) { this.state.isInitializing = false; return; }

    rawSlides.forEach((slide, idx) => slide.setAttribute('data-slide-idx', idx));
    this.state.realCount = rawSlides.length;
    
    const loop = this.hasAttribute('loop');
    const itemsPerView = parseFloat(getComputedStyle(this).getPropertyValue('--items-per-view')) || 1;

    if (loop) {
      const buffer = Math.ceil(itemsPerView) + 2; 
      this.state.cloneCount = buffer;
      for (let i = 0; i < buffer; i++) {
        const originalIdx = i % this.state.realCount;
        const clone = rawSlides[originalIdx].cloneNode(true);
        clone.classList.add('clone');
        clone.setAttribute('data-slide-idx', originalIdx);
        this.appendChild(clone);
      }
      for (let i = 0; i < buffer; i++) {
        const index = (this.state.realCount - 1 - (i % this.state.realCount));
        const clone = rawSlides[index].cloneNode(true);
        clone.classList.add('clone');
        clone.setAttribute('data-slide-idx', index);
        this.prepend(clone);
      }
    } else { this.state.cloneCount = 0; }

    this._renderDots();
    setTimeout(() => { this._measure(); this.state.isInitializing = false; }, 0);
  }

  _raf() {
    const { isDragging, currentTranslate, targetTranslate, stride, realCount } = this.state;
    if (!isDragging) {
      const diff = targetTranslate - currentTranslate;
      this.state.currentTranslate += diff * this.config.elasticity;
      if (Math.abs(diff) < 0.1) {
        this.state.currentTranslate = targetTranslate;
        if (this.hasAttribute('loop')) {
          const normalizedIndex = ((this.state.currentIndex % realCount) + realCount) % realCount;
          if (this.state.currentIndex !== normalizedIndex) this.goTo(normalizedIndex, false);
        }
      }
    }
    this.track.style.transform = `translate3d(${this.state.currentTranslate}px, 0, 0)`;
    this.rafId = requestAnimationFrame(this._raf);
  }

  goTo(index, animate = true) {
    const { realCount, cloneCount, stride } = this.state;
    if (!this.hasAttribute('loop')) index = Math.max(0, Math.min(index, realCount - 1));
    this.state.currentIndex = index;
    const target = -((cloneCount + index) * stride);
    if (animate) this.state.targetTranslate = target;
    else { this.state.currentTranslate = target; this.state.targetTranslate = target; }
    this._syncActiveStates();
  }

  next() { this.goTo(this.state.currentIndex + 1); }
  prev() { this.goTo(this.state.currentIndex - 1); }

  _onDragStart(e) {
    this._stopAutoplay();
    this.state.isDragging = true;
    this.state.startX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
    this.state.prevTranslate = this.state.currentTranslate;
  }

  _onDragMove(e) {
    if (!this.state.isDragging) return;
    const x = e.pageX || (e.touches ? e.touches[0].pageX : 0);
    this.state.currentTranslate = this.state.prevTranslate + (x - this.state.startX);
  }

  _onDragEnd() {
    if (!this.state.isDragging) return;
    this.state.isDragging = false;
    const { currentTranslate, stride, cloneCount } = this.state;
    const relativePos = currentTranslate - (-(cloneCount * stride));
    this.goTo(Math.round(-(relativePos / stride)));
    if (this.hasAttribute('autoplay')) this._startAutoplay();
  }

  _onKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
  }

  _onFocusIn(e) {
    const focusedElement = e.composedPath()[0];
    const slide = focusedElement.closest('[data-slide-idx]');
    if (slide && !slide.classList.contains('clone')) {
      const index = parseInt(slide.getAttribute('data-slide-idx'));
      if (index !== this.state.currentIndex) this.goTo(index);
    }
  }

  _renderDots() {
    this.dotsContainer.innerHTML = '';
    if (!this.hasAttribute('show-dots')) return;
    for (let i = 0; i < this.state.realCount; i++) {
      const dot = document.createElement('button');
      dot.classList.add('dot');
      dot.setAttribute('part', 'dot');
      dot.addEventListener('click', () => { this.goTo(i); this._stopAutoplay(); });
      this.dotsContainer.appendChild(dot);
    }
    this._syncActiveStates();
  }

  _startAutoplay() {
    this._stopAutoplay();
    if (this.state.isPaused || this.state.isDragging) return;
    const interval = parseInt(this.getAttribute('interval')) || 3000;
    this.state.autoplayTimer = setInterval(() => {
        if (!this.hasAttribute('loop') && this.state.currentIndex >= this.state.realCount - 1) {
            this._stopAutoplay(); return;
        }
        this.next();
    }, interval);
  }

  _stopAutoplay() { if (this.state.autoplayTimer) { clearInterval(this.state.autoplayTimer); this.state.autoplayTimer = null; } }
  _toggleDots() { if (this.dotsContainer) this.dotsContainer.hidden = !this.hasAttribute('show-dots'); }
  _setPaused(paused) {
    this.state.isPaused = paused;
    if (!paused && this.hasAttribute('autoplay')) this._startAutoplay();
    else this._stopAutoplay();
  }
  _onResize() { this._measure(); }
}

customElements.define('easy-carousel', EasyCarousel);