const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

let instanceCount = 0;

const template = isBrowser ? document.createElement('template') : null;
if (template) template.innerHTML = `
<style>
  :host {
    display: block;
    --nav-type: desktop;
    --nav-transition-duration: 200ms;
  }
  .hamburger-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    min-width: 44px;
    min-height: 44px;
  }
  :host([data-type="hamburger"]) .hamburger-toggle { display: inline-flex; }
  .hamburger-toggle:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
    border-radius: 2px;
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
<button class="hamburger-toggle" part="hamburger-toggle"
        aria-expanded="false" aria-label="Menu">
  <slot name="hamburger-icon">&#9776;</slot>
</button>
<slot></slot>
<div class="sr-announcer" aria-live="polite" aria-atomic="true"></div>
`;

const BaseElement = isBrowser ? HTMLElement : class {};

// ─── FacelessNavItem ──────────────────────────────────────────────────────────

/**
 * Optional helper element for `<faceless-navigation>`.
 * Renders an `<a>` or `<button>` toggle and an optional `<ul>` submenu directly
 * in the light DOM, so the parent navigation can discover and manage them without
 * any manual `<li>` / `<ul>` boilerplate.
 *
 * @element faceless-nav-item
 *
 * @attr {string} href - URL for the item. When present an `<a>` is rendered; otherwise a `<button>`.
 * @attr {string} label - Explicit label text. When omitted, text/inline children are used.
 * @attr {boolean} disabled - Disables the toggle.
 *
 * @csspart toggle - The rendered `<a>` or `<button>` element.
 * @csspart submenu - The `<ul>` wrapping nested `<faceless-nav-item>` children (only present when children exist).
 */
class FacelessNavItem extends BaseElement {
  static get observedAttributes() { return ['href', 'label', 'disabled']; }

  connectedCallback() {
    if (!isBrowser) return;
    this._render();
  }

  attributeChangedCallback() {
    if (!isBrowser || !this.isConnected) return;
    this._render();
  }

  _render() {
    const existingToggle = this.querySelector(':scope > [part="toggle"]');
    const existingSubmenu = this.querySelector(':scope > [part="submenu"]');

    // Rescue label nodes from existing toggle so they are not lost on re-render
    if (existingToggle && !this.getAttribute('label')) {
      while (existingToggle.firstChild) {
        this.insertBefore(existingToggle.firstChild, existingToggle);
      }
    }

    // Rescue child nav-items from existing submenu so they survive the remove
    if (existingSubmenu) {
      Array.from(existingSubmenu.children)
        .filter(el => el.tagName === 'FACELESS-NAV-ITEM')
        .forEach(item => this.appendChild(item));
    }

    if (existingToggle) existingToggle.remove();
    if (existingSubmenu) existingSubmenu.remove();

    // Separate child nav-items from label nodes
    const childNavItems = Array.from(this.children).filter(
      el => el.tagName === 'FACELESS-NAV-ITEM'
    );
    const labelNodes = Array.from(this.childNodes).filter(
      node => node.nodeType === Node.TEXT_NODE ||
              (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'FACELESS-NAV-ITEM')
    );

    // Build toggle element
    const href = this.getAttribute('href');
    const toggle = document.createElement(href ? 'a' : 'button');
    toggle.setAttribute('part', 'toggle');
    if (href) toggle.setAttribute('href', href);
    if (this.hasAttribute('disabled')) {
      toggle.setAttribute('disabled', '');
      toggle.setAttribute('aria-disabled', 'true');
    }

    const label = this.getAttribute('label');
    if (label) {
      toggle.textContent = label;
    } else {
      // Move (not clone) label nodes so the original slot is consumed
      labelNodes.forEach(node => toggle.appendChild(node));
    }

    this.insertBefore(toggle, this.firstChild);

    // Build submenu when child nav-items are present
    if (childNavItems.length > 0) {
      const ul = document.createElement('ul');
      ul.setAttribute('part', 'submenu');
      childNavItems.forEach(item => ul.appendChild(item));
      this.appendChild(ul);
    }
  }
}

if (isBrowser) customElements.define('faceless-nav-item', FacelessNavItem);

// ─── FacelessNavigation ───────────────────────────────────────────────────────

/**
 * Zero-dependency, framework-agnostic navigation component.
 *
 * Implements the Faceless Component pattern: state, ARIA, and keyboard navigation
 * are handled by the component; all visual styling is left to the consumer.
 * Supports three interaction patterns — Disclosure (`desktop`), Disclosure +
 * Focus Trap (`hamburger`), and full ARIA Menubar (`app-menu`) — switchable at
 * runtime via attribute or CSS variable.
 *
 * ### Markup modes
 *
 * **Recommended — `<faceless-nav-item>`:** no `<ul>`, `<li>`, or manual ARIA needed.
 * The helper element renders the correct `<a>`/`<button>` toggle and `<ul>` submenu
 * automatically, and the navigation applies the full ARIA pattern on top.
 *
 * ```html
 * <faceless-navigation type="desktop" aria-label="Main">
 *   <faceless-nav-item href="/home">Home</faceless-nav-item>
 *   <faceless-nav-item>
 *     Products
 *     <faceless-nav-item href="/a">Product A</faceless-nav-item>
 *   </faceless-nav-item>
 * </faceless-navigation>
 * ```
 *
 * For `hamburger` and responsive layouts, wrap the items in a `<nav>` so the
 * overlay has a container to show and hide:
 *
 * ```html
 * <faceless-navigation type="hamburger" aria-label="Menu">
 *   <nav>
 *     <faceless-nav-item href="/home">Home</faceless-nav-item>
 *   </nav>
 * </faceless-navigation>
 * ```
 *
 * **Alternative — manual `<nav><ul><li>` markup:** fully backwards-compatible.
 * Auto-detects submenus from nested `<ul>` elements; use `data-toggle` /
 * `data-submenu` attributes for explicit control.
 *
 * ### Warning
 * Always provide `aria-label` on the host. The component logs a console warning
 * when it is missing so that multiple navigation landmarks on a page remain
 * distinguishable for screen reader users.
 *
 * @element faceless-navigation
 *
 * @attr {desktop|hamburger|app-menu} type - Navigation interaction pattern. Default: `desktop`.
 * @attr {boolean} hover-open - Open submenus on hover (`desktop` type only).
 * @attr {number} hover-delay - Delay in ms before hover-open triggers. Default: `200`.
 * @attr {boolean} close-on-click-outside - Close submenus when clicking outside. Enabled by default.
 * @attr {string} hamburger-label - Accessible label for the hamburger toggle. Default: `Menu`.
 *
 * @fires {CustomEvent} nav-toggle - Submenu opened or closed. `detail: { submenu: HTMLElement, open: boolean, trigger: HTMLElement }`
 * @fires {CustomEvent} navtoggle - React JSX alias for `nav-toggle`. `detail: { submenu: HTMLElement, open: boolean, trigger: HTMLElement }`
 * @fires {CustomEvent} nav-type-change - Resolved type changed (e.g. desktop → hamburger on resize). `detail: { type: string, previousType: string }`
 * @fires {CustomEvent} navtypechange - React JSX alias for `nav-type-change`. `detail: { type: string, previousType: string }`
 * @fires {CustomEvent} nav-hamburger-toggle - Hamburger overlay opened or closed. `detail: { open: boolean }`
 * @fires {CustomEvent} navhamburgertoggle - React JSX alias for `nav-hamburger-toggle`. `detail: { open: boolean }`
 *
 * @slot - Navigation content. Accepts `<faceless-nav-item>` elements (optionally wrapped in `<nav>`) or a `<nav><ul>` tree.
 * @slot hamburger-icon - Custom icon for the hamburger toggle button. Default: ☰.
 *
 * @cssprop [--nav-type=desktop] - Responsive type-switching via CSS media queries. Accepts `desktop`, `hamburger`, or `app-menu`.
 * @cssprop [--nav-transition-duration=200ms] - Duration for submenu open/close transitions.
 *
 * @csspart hamburger-toggle - The hamburger `<button>` in the Shadow DOM (`hamburger` type only).
 */
class FacelessNavigation extends BaseElement {
  constructor() {
    super();
    if (!isBrowser) return;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.state = {
      type: 'desktop',
      items: [],
      tree: [],
      openSubmenus: new Set(),
      hamburgerOpen: false,
      focusTrapActive: false,
      uid: instanceCount++,
      menubarActiveIndex: 0,
      flatIndex: 0,
    };

    this._hoverTimers = new Map();

    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onClickOutside = this._onClickOutside.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  static get observedAttributes() {
    return ['type', 'hover-open', 'hover-delay', 'close-on-click-outside', 'hamburger-label'];
  }

  attributeChangedCallback(name) {
    if (!isBrowser || !this.isConnected) return;
    if (name === 'hamburger-label' && this.hamburgerToggle) {
      this.hamburgerToggle.setAttribute('aria-label', this.getAttribute('hamburger-label') || 'Menu');
      return;
    }
    this._measure();
  }

  connectedCallback() {
    if (!isBrowser) return;

    this.hamburgerToggle = this.shadowRoot.querySelector('.hamburger-toggle');
    this.srAnnouncer = this.shadowRoot.querySelector('.sr-announcer');

    const hamburgerLabel = this.getAttribute('hamburger-label');
    if (hamburgerLabel) this.hamburgerToggle.setAttribute('aria-label', hamburgerLabel);

    if (!this.hasAttribute('aria-label')) {
      console.warn(`<faceless-navigation${this.id ? ` id="${this.id}"` : ''}> is missing an aria-label. Provide a descriptive label, e.g. aria-label="Main navigation".`);
    }

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('focusin', this._onFocusIn);
    this.hamburgerToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleHamburger();
    });
    this.hamburgerToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleHamburger();
      }
    });

    document.addEventListener('click', this._onClickOutside);

    this.resizeObserver = new ResizeObserver(this._onResize);
    this.resizeObserver.observe(this);

    this.shadowRoot.querySelector('slot:not([name])').addEventListener('slotchange', () => this._init());

    if (this.querySelector('nav') || this.querySelector('ul') || this.querySelector('faceless-nav-item')) {
      this._init();
    }
  }

  disconnectedCallback() {
    if (!isBrowser) return;
    document.removeEventListener('click', this._onClickOutside);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this._clearAllHoverTimers();
    this._teardownPattern();
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  _init() {
    // Teardown before rebuild so _measure() re-enters the first-run branch
    // and _applyPattern() (including _setupHover) is always called on fresh descriptors
    if (this.hasAttribute('data-type')) {
      this._teardownPattern();
    }

    this.state.flatIndex = 0;
    this.state.items = [];
    this.state.tree = [];
    this.state.openSubmenus.clear();

    // Nav-item mode 1: direct <faceless-nav-item> children (no <nav> wrapper)
    const directNavItems = Array.from(this.children)
      .filter(el => el.tagName === 'FACELESS-NAV-ITEM');

    if (directNavItems.length > 0) {
      this.state.tree = this._buildNavItemChildren(directNavItems, null, 0);
      this._measure();
      return;
    }

    const nav = this.querySelector('nav');

    // Nav-item mode 2: <faceless-nav-item> children inside <nav> (hamburger, responsive)
    if (nav) {
      const navItemsInNav = Array.from(nav.children)
        .filter(el => el.tagName === 'FACELESS-NAV-ITEM');
      if (navItemsInNav.length > 0) {
        this.state.tree = this._buildNavItemChildren(navItemsInNav, null, 0);
        this._measure();
        return;
      }
    }

    // Legacy mode: <nav><ul> structure (unchanged)
    const rootUl = nav ? nav.querySelector(':scope > ul') : this.querySelector(':scope > ul');
    if (!rootUl) return;

    this.state.tree = this._buildItemTree(rootUl, null, 0);

    this._measure();
  }

  _buildItemTree(ul, parent, depth) {
    const items = [];
    const lis = Array.from(ul.children).filter(el => el.tagName === 'LI' || el.tagName === 'FACELESS-NAV-ITEM');

    lis.forEach(li => {
      if (li.closest('faceless-navigation') !== this) return;

      const descriptor = {
        el: li,
        toggle: null,
        submenu: null,
        links: [],
        parent: parent,
        children: [],
        depth: depth,
        open: false,
        flatIndex: this.state.flatIndex++,
      };

      // Find submenu: explicit [data-submenu] or auto-detect child <ul>
      const explicitSubmenu = li.querySelector(':scope > [data-submenu]');
      const autoSubmenu = explicitSubmenu || li.querySelector(':scope > ul');
      descriptor.submenu = autoSubmenu || null;

      // Collect direct <a> children
      descriptor.links = Array.from(li.querySelectorAll(':scope > a'));

      // Find toggle: explicit [data-toggle] or auto-detect first <a>/<button> before submenu
      const explicitToggle = li.querySelector(':scope > [data-toggle]');
      if (explicitToggle) {
        descriptor.toggle = explicitToggle;
      } else if (descriptor.submenu) {
        // Auto-detect: first <a> or <button> direct child
        descriptor.toggle = li.querySelector(':scope > a, :scope > button');
      }

      if (descriptor.submenu) {
        descriptor.submenu.setAttribute('data-depth', depth);
        descriptor.children = this._buildItemTree(descriptor.submenu, descriptor, depth + 1);
      }

      this.state.items.push(descriptor);
      items.push(descriptor);
    });

    return items;
  }

  _buildNavItemChildren(elements, parent, depth) {
    const items = [];
    elements.forEach(el => {
      if (el.closest('faceless-navigation') !== this) return;
      const descriptor = {
        el,
        toggle: el.querySelector(':scope > [part="toggle"]'),
        submenu: el.querySelector(':scope > [part="submenu"]'),
        links: Array.from(el.querySelectorAll(':scope > a[part="toggle"]')),
        parent,
        children: [],
        depth,
        open: false,
        flatIndex: this.state.flatIndex++,
      };
      if (descriptor.submenu) {
        descriptor.submenu.setAttribute('data-depth', depth);
        descriptor.children = this._buildItemTree(descriptor.submenu, descriptor, depth + 1);
      }
      this.state.items.push(descriptor);
      items.push(descriptor);
    });
    return items;
  }

  // ─── Type Resolution & Measurement ────────────────────────────────────────

  _resolveType() {
    const attr = this.getAttribute('type');
    if (attr && ['desktop', 'hamburger', 'app-menu'].includes(attr)) return attr;
    const css = getComputedStyle(this).getPropertyValue('--nav-type').trim().replace(/['"]/g, '');
    if (css && ['desktop', 'hamburger', 'app-menu'].includes(css)) return css;
    return 'desktop';
  }

  _measure() {
    const newType = this._resolveType();
    const oldType = this.state.type;

    if (newType !== oldType) {
      this._teardownPattern();
      this.state.type = newType;
      this._applyPattern();

      this.dispatchEvent(new CustomEvent('nav-type-change', {
        bubbles: true, composed: true,
        detail: { type: newType, previousType: oldType },
      }));
      this.dispatchEvent(new CustomEvent('navtypechange', {
        bubbles: true, composed: true,
        detail: { type: newType, previousType: oldType },
      }));
    } else if (!this.hasAttribute('data-type')) {
      // First run
      this.state.type = newType;
      this._applyPattern();
    }
  }

  _onResize() { this._measure(); }

  // ─── Pattern Apply / Teardown ─────────────────────────────────────────────

  _applyPattern() {
    this.setAttribute('data-type', this.state.type);

    switch (this.state.type) {
      case 'desktop':
        this._applyDesktopPattern();
        break;
      case 'hamburger':
        this._applyHamburgerPattern();
        break;
      case 'app-menu':
        this._applyMenubarPattern();
        break;
    }
  }

  _teardownPattern() {
    const type = this.state.type;
    this.closeAll();

    // Teardown disclosure (desktop + hamburger)
    if (type === 'desktop' || type === 'hamburger') {
      this.state.items.forEach(desc => {
        // Remove hover listeners before descriptors are discarded
        if (desc._hoverEnter) desc.el.removeEventListener('mouseenter', desc._hoverEnter);
        if (desc._hoverLeave) desc.el.removeEventListener('mouseleave', desc._hoverLeave);
        if (desc.toggle) {
          desc.toggle.removeAttribute('aria-expanded');
          desc.toggle.removeAttribute('aria-controls');
        }
        if (desc.submenu) {
          desc.submenu.removeAttribute('id');
        }
      });
    }

    // Teardown hamburger specifics
    if (type === 'hamburger') {
      this._closeHamburger(true);
      const nav = this.querySelector('nav');
      if (nav) nav.removeAttribute('id');
      this.hamburgerToggle.setAttribute('aria-expanded', 'false');
      this.hamburgerToggle.removeAttribute('aria-controls');
    }

    // Teardown menubar
    if (type === 'app-menu') {
      this._teardownMenubarAria();
    }

    this.removeAttribute('data-type');
    this.removeAttribute('data-hamburger-open');
  }

  // ─── Desktop Pattern (Disclosure) ─────────────────────────────────────────

  _applyDesktopPattern() {
    this.state.items.forEach(desc => {
      if (!desc.toggle || !desc.submenu) return;
      const submenuId = `fn${this.state.uid}-sub-${desc.flatIndex}`;
      desc.submenu.setAttribute('id', submenuId);
      desc.toggle.setAttribute('aria-expanded', 'false');
      desc.toggle.setAttribute('aria-controls', submenuId);
    });

    if (this.hasAttribute('hover-open')) {
      this._setupHover();
    }
  }

  // ─── Hamburger Pattern ────────────────────────────────────────────────────

  _applyHamburgerPattern() {
    // Same disclosure ARIA as desktop
    this.state.items.forEach(desc => {
      if (!desc.toggle || !desc.submenu) return;
      const submenuId = `fn${this.state.uid}-sub-${desc.flatIndex}`;
      desc.submenu.setAttribute('id', submenuId);
      desc.toggle.setAttribute('aria-expanded', 'false');
      desc.toggle.setAttribute('aria-controls', submenuId);
    });

    const nav = this.querySelector('nav');
    if (nav) {
      if (!nav.id) nav.id = `fn${this.state.uid}-nav`;
      this.hamburgerToggle.setAttribute('aria-controls', nav.id);
    }
    this.hamburgerToggle.setAttribute('aria-expanded', 'false');
  }

  openHamburger() {
    if (this.state.type !== 'hamburger' || this.state.hamburgerOpen) return;
    this._openHamburger();
  }

  closeHamburger() {
    if (!this.state.hamburgerOpen) return;
    this._closeHamburger();
  }

  toggleHamburger() {
    if (this.state.hamburgerOpen) {
      this._closeHamburger();
    } else {
      this._openHamburger();
    }
  }

  _openHamburger() {
    this.state.hamburgerOpen = true;
    this.setAttribute('data-hamburger-open', '');
    this.hamburgerToggle.setAttribute('aria-expanded', 'true');
    this._activateFocusTrap();

    this._announce('Navigation menu opened');

    const firstFocusable = this._getFocusTrapElements()[0];
    if (firstFocusable) firstFocusable.focus();

    this.dispatchEvent(new CustomEvent('nav-hamburger-toggle', {
      bubbles: true, composed: true,
      detail: { open: true },
    }));
    this.dispatchEvent(new CustomEvent('navhamburgertoggle', {
      bubbles: true, composed: true,
      detail: { open: true },
    }));
  }

  _closeHamburger(silent) {
    this.state.hamburgerOpen = false;
    this.removeAttribute('data-hamburger-open');
    this.hamburgerToggle.setAttribute('aria-expanded', 'false');
    this._deactivateFocusTrap();

    if (!silent) this._announce('Navigation menu closed');

    if (!silent) {
      this.dispatchEvent(new CustomEvent('nav-hamburger-toggle', {
        bubbles: true, composed: true,
        detail: { open: false },
      }));
      this.dispatchEvent(new CustomEvent('navhamburgertoggle', {
        bubbles: true, composed: true,
        detail: { open: false },
      }));
    }
  }

  // ─── Focus Trap (Hamburger) ───────────────────────────────────────────────

  _activateFocusTrap() {
    this.state.focusTrapActive = true;
  }

  _deactivateFocusTrap() {
    this.state.focusTrapActive = false;
  }

  _getFocusTrapElements() {
    const nav = this.querySelector('nav');
    if (!nav) return [];
    const focusable = nav.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    return Array.from(focusable).filter(el => {
      return el.offsetParent !== null || el.getClientRects().length > 0;
    });
  }

  // ─── App-Menu (Menubar) Pattern ───────────────────────────────────────────

  _applyMenubarPattern() {
    // Nav-item mode
    if (this.state.items.length > 0 && this.state.items[0].el.tagName === 'FACELESS-NAV-ITEM') {
      const nav = this.querySelector('nav');
      const host = nav && Array.from(nav.children).some(el => el.tagName === 'FACELESS-NAV-ITEM')
        ? nav : this;
      host.setAttribute('role', 'menubar');
      this._menubarHost = host;
      this._applyMenubarRolesNavItems(this.state.tree, true);
      this._updateRovingTabindex();
      return;
    }

    // Legacy mode
    const nav = this.querySelector('nav');
    const rootUl = nav ? nav.querySelector(':scope > ul') : this.querySelector(':scope > ul');
    if (!rootUl) return;

    rootUl.setAttribute('role', 'menubar');
    this._applyMenubarRoles(rootUl, true);
    this._updateRovingTabindex();
  }

  _applyMenubarRolesNavItems(descriptors, isRoot) {
    descriptors.forEach(desc => {
      if (desc.el.closest('faceless-navigation') !== this) return;
      desc.el.setAttribute('role', 'none');

      if (desc.toggle) {
        desc.toggle.setAttribute('role', 'menuitem');
        desc.toggle.setAttribute('tabindex', '-1');
      }

      if (desc.toggle && desc.submenu) {
        desc.toggle.setAttribute('aria-haspopup', 'menu');
        desc.toggle.setAttribute('aria-expanded', 'false');
        const submenuId = `fn${this.state.uid}-sub-${desc.flatIndex}`;
        desc.submenu.setAttribute('id', submenuId);
        desc.submenu.setAttribute('role', 'menu');
        desc.toggle.setAttribute('aria-controls', submenuId);
        this._applyMenubarRolesNavItems(desc.children, false);
      }
    });
  }

  _removeMenubarRolesNavItems(items) {
    items.forEach(desc => {
      desc.el.removeAttribute('role');
      if (desc.toggle) {
        desc.toggle.removeAttribute('role');
        desc.toggle.removeAttribute('tabindex');
        desc.toggle.removeAttribute('aria-haspopup');
        desc.toggle.removeAttribute('aria-expanded');
        desc.toggle.removeAttribute('aria-controls');
      }
      if (desc.submenu) {
        desc.submenu.removeAttribute('role');
        desc.submenu.removeAttribute('id');
      }
      if (desc.children.length) this._removeMenubarRolesNavItems(desc.children);
    });
  }

  _applyMenubarRoles(ul, isRoot) {
    if (!isRoot) {
      ul.setAttribute('role', 'menu');
    }

    const lis = Array.from(ul.children).filter(el => el.tagName === 'LI');
    lis.forEach(li => {
      if (li.closest('faceless-navigation') !== this) return;
      li.setAttribute('role', 'none');

      const desc = this.state.items.find(d => d.el === li);
      if (!desc) return;

      // Set role=menuitem on interactive elements
      const interactive = li.querySelector(':scope > a, :scope > button');
      if (interactive) {
        interactive.setAttribute('role', 'menuitem');
        interactive.setAttribute('tabindex', '-1');
      }

      if (desc.toggle && desc.submenu) {
        desc.toggle.setAttribute('aria-haspopup', 'menu');
        desc.toggle.setAttribute('aria-expanded', 'false');
        const submenuId = `fn${this.state.uid}-sub-${desc.flatIndex}`;
        desc.submenu.setAttribute('id', submenuId);
        desc.toggle.setAttribute('aria-controls', submenuId);

        // Recurse into submenu
        this._applyMenubarRoles(desc.submenu, false);
      }
    });
  }

  _teardownMenubarAria() {
    // Nav-item mode
    if (this._menubarHost) {
      this._menubarHost.removeAttribute('role');
      this._menubarHost = null;
      this._removeMenubarRolesNavItems(this.state.items);
      return;
    }

    // Legacy mode
    const nav = this.querySelector('nav');
    const rootUl = nav ? nav.querySelector(':scope > ul') : this.querySelector(':scope > ul');
    if (!rootUl) return;

    rootUl.removeAttribute('role');
    this._removeMenubarRoles(rootUl);
  }

  _removeMenubarRoles(ul) {
    ul.removeAttribute('role');
    const lis = Array.from(ul.children).filter(el => el.tagName === 'LI');
    lis.forEach(li => {
      li.removeAttribute('role');
      const interactive = li.querySelector(':scope > a, :scope > button');
      if (interactive) {
        interactive.removeAttribute('role');
        interactive.removeAttribute('tabindex');
        interactive.removeAttribute('aria-haspopup');
        interactive.removeAttribute('aria-expanded');
        interactive.removeAttribute('aria-controls');
      }
      const sub = li.querySelector(':scope > ul');
      if (sub) {
        sub.removeAttribute('role');
        sub.removeAttribute('id');
        this._removeMenubarRoles(sub);
      }
    });
  }

  _getTopLevelMenuitems() {
    // Nav-item mode
    if (this.state.tree.length > 0 && this.state.tree[0].el.tagName === 'FACELESS-NAV-ITEM') {
      return this.state.tree.map(desc => desc.toggle).filter(Boolean);
    }

    // Legacy mode
    const nav = this.querySelector('nav');
    const rootUl = nav ? nav.querySelector(':scope > ul') : this.querySelector(':scope > ul');
    if (!rootUl) return [];
    return Array.from(rootUl.children)
      .filter(li => li.tagName === 'LI' && li.closest('faceless-navigation') === this)
      .map(li => li.querySelector(':scope > a, :scope > button'))
      .filter(Boolean);
  }

  _getMenuitemsInMenu(ul) {
    // Nav-item mode: submenu <ul> contains <faceless-nav-item> children
    const navItems = Array.from(ul.children).filter(el => el.tagName === 'FACELESS-NAV-ITEM');
    if (navItems.length > 0) {
      return navItems.map(item => item.querySelector(':scope > [part="toggle"]')).filter(Boolean);
    }

    // Legacy mode
    return Array.from(ul.children)
      .filter(li => li.tagName === 'LI' && li.closest('faceless-navigation') === this)
      .map(li => li.querySelector(':scope > a, :scope > button'))
      .filter(Boolean);
  }

  _updateRovingTabindex() {
    const topItems = this._getTopLevelMenuitems();
    if (!topItems.length) return;

    const activeIndex = Math.min(this.state.menubarActiveIndex, topItems.length - 1);
    topItems.forEach((item, i) => {
      item.setAttribute('tabindex', i === activeIndex ? '0' : '-1');
    });
  }

  // ─── Screen Reader Announcements ──────────────────────────────────────────

  _announce(message) {
    if (!this.srAnnouncer) return;
    this.srAnnouncer.textContent = '';
    this.srAnnouncer.textContent = message;
  }

  // ─── Submenu Open / Close ─────────────────────────────────────────────────

  _openSubmenu(desc) {
    if (!desc || !desc.submenu || desc.open) return;
    desc.open = true;
    this.state.openSubmenus.add(desc);

    desc.el.setAttribute('data-open', '');
    if (desc.toggle) {
      desc.toggle.setAttribute('data-open', '');
      desc.toggle.setAttribute('aria-expanded', 'true');
    }
    desc.submenu.setAttribute('data-open', '');

    const openName = desc.toggle ? desc.toggle.textContent.trim() : '';
    this._announce(openName ? `${openName} submenu opened` : 'Submenu opened');

    this.dispatchEvent(new CustomEvent('nav-toggle', {
      bubbles: true, composed: true,
      detail: { submenu: desc.submenu, open: true, trigger: desc.toggle },
    }));
    this.dispatchEvent(new CustomEvent('navtoggle', {
      bubbles: true, composed: true,
      detail: { submenu: desc.submenu, open: true, trigger: desc.toggle },
    }));
  }

  _closeSubmenu(desc, announce = true) {
    if (!desc || !desc.open) return;

    // Capture focus state before DOM changes
    const focusInSubmenu = desc.submenu && desc.submenu.contains(document.activeElement);

    desc.open = false;
    this.state.openSubmenus.delete(desc);

    // Close children silently — parent announcement is sufficient
    desc.children.forEach(child => this._closeSubmenu(child, false));

    desc.el.removeAttribute('data-open');
    if (desc.toggle) {
      desc.toggle.removeAttribute('data-open');
      desc.toggle.setAttribute('aria-expanded', 'false');
    }
    if (desc.submenu) desc.submenu.removeAttribute('data-open');

    // Return focus to toggle if it was inside the closing submenu
    if (focusInSubmenu && desc.toggle) desc.toggle.focus();

    if (announce) {
      const closeName = desc.toggle ? desc.toggle.textContent.trim() : '';
      this._announce(closeName ? `${closeName} submenu closed` : 'Submenu closed');
    }

    this.dispatchEvent(new CustomEvent('nav-toggle', {
      bubbles: true, composed: true,
      detail: { submenu: desc.submenu, open: false, trigger: desc.toggle },
    }));
    this.dispatchEvent(new CustomEvent('navtoggle', {
      bubbles: true, composed: true,
      detail: { submenu: desc.submenu, open: false, trigger: desc.toggle },
    }));
  }

  _toggleSubmenu(desc) {
    if (desc.open) {
      this._closeSubmenu(desc);
    } else {
      // Close siblings silently — the open announcement is sufficient context
      const siblings = desc.parent ? desc.parent.children : this.state.tree;
      siblings.forEach(sib => {
        if (sib !== desc && sib.open) this._closeSubmenu(sib, false);
      });
      this._openSubmenu(desc);
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  open(toggleOrIndex) {
    this._suppressClickOutside = true;
    setTimeout(() => { this._suppressClickOutside = false; }, 0);
    const desc = this._resolveDescriptor(toggleOrIndex);
    if (!desc || desc.open) return;
    const siblings = desc.parent ? desc.parent.children : this.state.tree;
    siblings.forEach(sib => {
      if (sib !== desc && sib.open) this._closeSubmenu(sib, false);
    });
    this._openSubmenu(desc);
  }

  close(toggleOrIndex) {
    const desc = this._resolveDescriptor(toggleOrIndex);
    if (desc && desc.open) this._closeSubmenu(desc);
  }

  closeAll() {
    this.state.items.forEach(desc => {
      if (desc.open) this._closeSubmenu(desc, false);
    });
  }

  get currentType() {
    return this.state.type;
  }

  _resolveDescriptor(toggleOrIndex) {
    if (typeof toggleOrIndex === 'number') {
      return this.state.items.filter(d => d.submenu)[toggleOrIndex] || null;
    }
    if (toggleOrIndex instanceof HTMLElement) {
      return this.state.items.find(d => d.toggle === toggleOrIndex || d.el === toggleOrIndex) || null;
    }
    return null;
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────

  _onClick(e) {
    const target = e.target.closest('a, button, [data-toggle]');
    if (!target) return;
    if (target.closest('faceless-navigation') !== this) return;

    const desc = this.state.items.find(d => d.toggle === target);
    if (!desc || !desc.submenu) return;

    // For links with submenus: first click opens submenu, doesn't navigate
    if (target.tagName === 'A' && target.hasAttribute('href')) {
      if (!desc.open) {
        e.preventDefault();
        this._toggleSubmenu(desc);
        return;
      }
      // If already open, let the link navigate
      return;
    }

    e.preventDefault();
    this._toggleSubmenu(desc);
  }

  _onClickOutside(e) {
    if (this._suppressClickOutside) return;
    if (this.getAttribute('close-on-click-outside') === 'false') return;
    if (this.contains(e.target)) return;
    if (this.shadowRoot.contains(e.target)) return;

    this.closeAll();
    if (this.state.hamburgerOpen) {
      this._closeHamburger();
    }
  }

  _onFocusIn(e) {
    // In hamburger mode, ensure focus stays trapped
    if (this.state.type === 'hamburger' && this.state.hamburgerOpen && this.state.focusTrapActive) {
      // Focus is inside, that's fine
    }
  }

  // ─── Keyboard Navigation ──────────────────────────────────────────────────

  _onKeyDown(e) {
    if (this.state.type === 'app-menu') {
      this._onMenubarKeyDown(e);
      return;
    }

    // Desktop and Hamburger keyboard
    this._onDisclosureKeyDown(e);
  }

  _onDisclosureKeyDown(e) {
    const target = e.target;

    // Escape: close current submenu or hamburger
    if (e.key === 'Escape') {
      if (this.state.hamburgerOpen && this.state.type === 'hamburger') {
        // If inside a submenu, close it first
        const desc = this._findDescriptorForElement(target);
        if (desc && desc.parent && desc.parent.open) {
          this._closeSubmenu(desc.parent);
          if (desc.parent.toggle) desc.parent.toggle.focus();
          e.preventDefault();
          return;
        }
        this._closeHamburger();
        this.hamburgerToggle.focus();
        e.preventDefault();
        return;
      }

      const desc = this._findDescriptorForElement(target);
      if (desc) {
        // Find the nearest open ancestor
        let current = desc;
        // If this item itself is open, close it
        if (current.open) {
          this._closeSubmenu(current);
          if (current.toggle) current.toggle.focus();
          e.preventDefault();
          return;
        }
        // Otherwise close the parent
        if (current.parent && current.parent.open) {
          this._closeSubmenu(current.parent);
          if (current.parent.toggle) current.parent.toggle.focus();
          e.preventDefault();
          return;
        }
      }

      // Close all
      this.closeAll();
      e.preventDefault();
      return;
    }

    // Enter / Space on toggle
    if (e.key === 'Enter' || e.key === ' ') {
      const desc = this.state.items.find(d => d.toggle === target);
      if (desc && desc.submenu) {
        // For buttons, prevent default (for links, Enter navigates naturally if submenu is open)
        if (target.tagName === 'BUTTON' || target.hasAttribute('data-toggle')) {
          e.preventDefault();
          this._toggleSubmenu(desc);
        } else if (target.tagName === 'A') {
          if (!desc.open) {
            e.preventDefault();
            this._toggleSubmenu(desc);
          }
          // If open, let Enter follow the link
        }
      }
    }

    // Tab trap for hamburger
    if (e.key === 'Tab' && this.state.type === 'hamburger' && this.state.hamburgerOpen && this.state.focusTrapActive) {
      const elements = this._getFocusTrapElements();
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || this.shadowRoot.activeElement === this.hamburgerToggle) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          this.hamburgerToggle.focus();
        }
      }
    }
  }

  _onMenubarKeyDown(e) {
    const target = e.target;
    const desc = this.state.items.find(d => d.toggle === target || d.links.includes(target));
    if (!desc) return;

    const topItems = this._getTopLevelMenuitems();
    const isTopLevel = desc.depth === 0;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        if (isTopLevel) {
          // Move to next top-level item
          const idx = topItems.indexOf(target);
          const next = topItems[(idx + 1) % topItems.length];
          if (next) {
            this._menubarFocusItem(next, topItems);
          }
        } else {
          // Open sub-submenu if available
          if (desc.submenu && !desc.open) {
            this._openSubmenu(desc);
            const firstChild = this._getMenuitemsInMenu(desc.submenu)[0];
            if (firstChild) firstChild.focus();
          } else {
            // Move to next top-level item and open its submenu
            const topIdx = this._getTopLevelIndexForDesc(desc);
            const nextTopIdx = (topIdx + 1) % topItems.length;
            this._closeAllMenubarSubmenus();
            this._menubarFocusItem(topItems[nextTopIdx], topItems);
            const nextTopDesc = this.state.items.find(d => d.toggle === topItems[nextTopIdx] || d.links.includes(topItems[nextTopIdx]));
            if (nextTopDesc && nextTopDesc.submenu) {
              this._openSubmenu(nextTopDesc);
              const firstChild = this._getMenuitemsInMenu(nextTopDesc.submenu)[0];
              if (firstChild) firstChild.focus();
            }
          }
        }
        break;
      }

      case 'ArrowLeft': {
        e.preventDefault();
        if (isTopLevel) {
          const idx = topItems.indexOf(target);
          const prev = topItems[(idx - 1 + topItems.length) % topItems.length];
          if (prev) {
            this._menubarFocusItem(prev, topItems);
          }
        } else {
          // Close this submenu and go to parent
          if (desc.parent && desc.parent.open) {
            this._closeSubmenu(desc.parent);
            if (desc.parent.toggle) desc.parent.toggle.focus();
          } else {
            // Move to prev top-level
            const topIdx = this._getTopLevelIndexForDesc(desc);
            const prevTopIdx = (topIdx - 1 + topItems.length) % topItems.length;
            this._closeAllMenubarSubmenus();
            this._menubarFocusItem(topItems[prevTopIdx], topItems);
            const prevTopDesc = this.state.items.find(d => d.toggle === topItems[prevTopIdx] || d.links.includes(topItems[prevTopIdx]));
            if (prevTopDesc && prevTopDesc.submenu) {
              this._openSubmenu(prevTopDesc);
              const firstChild = this._getMenuitemsInMenu(prevTopDesc.submenu)[0];
              if (firstChild) firstChild.focus();
            }
          }
        }
        break;
      }

      case 'ArrowDown': {
        e.preventDefault();
        if (isTopLevel) {
          // Open submenu and focus first item
          if (desc.submenu) {
            if (!desc.open) this._openSubmenu(desc);
            const firstChild = this._getMenuitemsInMenu(desc.submenu)[0];
            if (firstChild) firstChild.focus();
          }
        } else {
          // Move to next item in current menu
          const parentUl = target.closest('ul');
          if (parentUl) {
            const menuItems = this._getMenuitemsInMenu(parentUl);
            const idx = menuItems.indexOf(target);
            const next = menuItems[(idx + 1) % menuItems.length];
            if (next) next.focus();
          }
        }
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        if (isTopLevel) {
          // Open submenu and focus last item
          if (desc.submenu) {
            if (!desc.open) this._openSubmenu(desc);
            const items = this._getMenuitemsInMenu(desc.submenu);
            const lastChild = items[items.length - 1];
            if (lastChild) lastChild.focus();
          }
        } else {
          const parentUl = target.closest('ul');
          if (parentUl) {
            const menuItems = this._getMenuitemsInMenu(parentUl);
            const idx = menuItems.indexOf(target);
            const prev = menuItems[(idx - 1 + menuItems.length) % menuItems.length];
            if (prev) prev.focus();
          }
        }
        break;
      }

      case 'Home': {
        e.preventDefault();
        if (isTopLevel) {
          this._menubarFocusItem(topItems[0], topItems);
        } else {
          const parentUl = target.closest('ul');
          if (parentUl) {
            const items = this._getMenuitemsInMenu(parentUl);
            if (items[0]) items[0].focus();
          }
        }
        break;
      }

      case 'End': {
        e.preventDefault();
        if (isTopLevel) {
          this._menubarFocusItem(topItems[topItems.length - 1], topItems);
        } else {
          const parentUl = target.closest('ul');
          if (parentUl) {
            const items = this._getMenuitemsInMenu(parentUl);
            if (items.length) items[items.length - 1].focus();
          }
        }
        break;
      }

      case 'Enter':
      case ' ': {
        if (desc.submenu && !desc.open) {
          e.preventDefault();
          this._openSubmenu(desc);
          const firstChild = this._getMenuitemsInMenu(desc.submenu)[0];
          if (firstChild) firstChild.focus();
        } else if (target.tagName === 'A' && target.hasAttribute('href')) {
          // Let links navigate
        } else if (desc.submenu && desc.open) {
          e.preventDefault();
          this._closeSubmenu(desc);
        }
        break;
      }

      case 'Escape': {
        e.preventDefault();
        if (!isTopLevel && desc.parent) {
          this._closeSubmenu(desc.parent);
          if (desc.parent.toggle) desc.parent.toggle.focus();
        } else {
          this._closeAllMenubarSubmenus();
          if (topItems[this.state.menubarActiveIndex]) {
            topItems[this.state.menubarActiveIndex].focus();
          }
        }
        break;
      }

      default: {
        // Character search
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          const char = e.key.toLowerCase();
          let searchItems;
          if (isTopLevel) {
            searchItems = topItems;
          } else {
            const parentUl = target.closest('ul');
            searchItems = parentUl ? this._getMenuitemsInMenu(parentUl) : [];
          }
          const idx = searchItems.indexOf(target);
          for (let i = 1; i <= searchItems.length; i++) {
            const candidate = searchItems[(idx + i) % searchItems.length];
            if (candidate.textContent.trim().toLowerCase().startsWith(char)) {
              candidate.focus();
              if (isTopLevel) this._menubarFocusItem(candidate, topItems);
              break;
            }
          }
        }
        break;
      }
    }
  }

  _menubarFocusItem(item, topItems) {
    const idx = topItems.indexOf(item);
    if (idx !== -1) this.state.menubarActiveIndex = idx;
    this._updateRovingTabindex();
    item.focus();
  }

  _getTopLevelIndexForDesc(desc) {
    let current = desc;
    while (current.parent) current = current.parent;
    const topItems = this._getTopLevelMenuitems();
    const topToggle = current.toggle || current.links[0];
    return topItems.indexOf(topToggle);
  }

  _closeAllMenubarSubmenus() {
    this.state.tree.forEach(desc => {
      if (desc.open) this._closeSubmenu(desc, false);
    });
  }

  // ─── Hover ────────────────────────────────────────────────────────────────

  _setupHover() {
    this.state.items.forEach(desc => {
      if (!desc.submenu) return;

      const delay = parseInt(this.getAttribute('hover-delay')) || 200;

      const onEnter = () => {
        this._clearHoverTimer(desc);
        this._hoverTimers.set(desc, setTimeout(() => {
          // Close siblings
          const siblings = desc.parent ? desc.parent.children : this.state.tree;
          siblings.forEach(sib => {
            if (sib !== desc && sib.open) this._closeSubmenu(sib);
          });
          this._openSubmenu(desc);
        }, delay));
      };

      const onLeave = () => {
        this._clearHoverTimer(desc);
        this._hoverTimers.set(desc, setTimeout(() => {
          this._closeSubmenu(desc);
        }, delay));
      };

      desc.el.addEventListener('mouseenter', onEnter);
      desc.el.addEventListener('mouseleave', onLeave);

      // Store for cleanup
      desc._hoverEnter = onEnter;
      desc._hoverLeave = onLeave;
    });
  }

  _clearHoverTimer(desc) {
    const timer = this._hoverTimers.get(desc);
    if (timer) {
      clearTimeout(timer);
      this._hoverTimers.delete(desc);
    }
  }

  _clearAllHoverTimers() {
    this._hoverTimers.forEach(timer => clearTimeout(timer));
    this._hoverTimers.clear();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _findDescriptorForElement(el) {
    // Walk up from el to find the nearest descriptor
    let current = el;
    while (current && current !== this) {
      const desc = this.state.items.find(d =>
        d.el === current || d.toggle === current || d.submenu === current
      );
      if (desc) return desc;
      current = current.parentElement;
    }
    return null;
  }
}

if (isBrowser) customElements.define('faceless-navigation', FacelessNavigation);
