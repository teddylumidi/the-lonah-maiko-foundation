/* Content edited in Pages CMS is read live from GitHub, so CMS edits need no Netlify deploy. */
var LMF_RAW = 'https://raw.githubusercontent.com/teddylumidi/the-lonah-maiko-foundation/main/';
function lmfData(path) {
    var bust = '?t=' + Math.floor(Date.now() / 60000);
    return fetch(LMF_RAW + path + bust, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .catch(function () { return fetch(path, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); });
}
function lmfHash(t) {
    var x = 5381;
    for (var i = 0; i < t.length; i++) x = (Math.imul(x, 33) ^ t.charCodeAt(i)) >>> 0;
    return x.toString(16);
}
function lmfAsset(p) {
    if (!p || /^https?:/.test(p)) return p;
    var clean = p.replace(/^\//, '');
    return /^Images\/uploads\//.test(clean) ? LMF_RAW + clean : clean;
}
/**
 * The Lonah Maiko Foundation - Main JavaScript Module
 * Handles navigation, accessibility, and common functionality
 * @version 1.0.0
 */

(function() {
    'use strict';

    // ==============================================
    // Configuration
    // ==============================================
    const CONFIG = {
        breakpoints: {
            mobile: 768,
            tablet: 1024
        },
        selectors: {
            toggle: '.mobile-menu-toggle',
            nav: '.main-nav',
            navLinks: '.nav-link',
            skipLink: '.skip-link'
        },
        classes: {
            active: 'active',
            menuOpen: 'menu-open',
            loaded: 'loaded',
            visuallyHidden: 'visually-hidden'
        },
        aria: {
            expanded: 'aria-expanded',
            hidden: 'aria-hidden',
            label: 'aria-label'
        }
    };

    // ==============================================
    // Utility Functions
    // ==============================================
    const utils = {
        /**
         * Debounce function to limit execution frequency
         */
        debounce(func, wait = 100) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Check if device is mobile
         */
        isMobile() {
            return window.innerWidth < CONFIG.breakpoints.mobile;
        },

        /**
         * Safely query selector
         */
        $(selector, context = document) {
            return context.querySelector(selector);
        },

        /**
         * Safely query selector all
         */
        $$(selector, context = document) {
            return context.querySelectorAll(selector);
        },

        /**
         * Add event listener with error handling
         */
        on(element, event, handler, options = {}) {
            if (element && typeof handler === 'function') {
                element.addEventListener(event, handler, options);
            }
        },

        /**
         * Escape HTML to prevent XSS
         */
        escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    };

    // ==============================================
    // Mobile Navigation Module
    // ==============================================
    const navigation = {
        toggle: null,
        nav: null,
        isOpen: false,

        init() {
            this.toggle = utils.$(CONFIG.selectors.toggle);
            this.nav = utils.$(CONFIG.selectors.nav);

            if (!this.toggle || !this.nav) return;

            this.bindEvents();
            this.setupAccessibility();
        },

        bindEvents() {
            // Toggle button click
            utils.on(this.toggle, 'click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });

            // Close on nav link click
            utils.$$(CONFIG.selectors.navLinks, this.nav).forEach(link => {
                utils.on(link, 'click', () => {
                    if (utils.isMobile()) {
                        this.closeMenu();
                    }
                });
            });

            // Close on outside click
            utils.on(document, 'click', (e) => {
                if (this.isOpen && 
                    !this.toggle.contains(e.target) && 
                    !this.nav.contains(e.target)) {
                    this.closeMenu();
                }
            });

            // Close on escape key
            utils.on(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeMenu();
                    this.toggle.focus();
                }
            });

            // Handle resize
            utils.on(window, 'resize', utils.debounce(() => {
                if (!utils.isMobile() && this.isOpen) {
                    this.closeMenu();
                }
            }, 150));
        },

        setupAccessibility() {
            // Set initial ARIA state
            this.toggle.setAttribute(CONFIG.aria.expanded, 'false');
            this.nav.setAttribute(CONFIG.aria.hidden, 'true');

            // Add keyboard navigation within menu
            const links = utils.$$(CONFIG.selectors.navLinks, this.nav);
            links.forEach((link, index) => {
                utils.on(link, 'keydown', (e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        const next = links[index + 1] || links[0];
                        next.focus();
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prev = links[index - 1] || links[links.length - 1];
                        prev.focus();
                    }
                });
            });
        },

        toggleMenu() {
            this.isOpen ? this.closeMenu() : this.openMenu();
        },

        openMenu() {
            this.isOpen = true;
            this.nav.classList.add(CONFIG.classes.active);
            document.body.classList.add(CONFIG.classes.menuOpen);
            this.toggle.setAttribute(CONFIG.aria.expanded, 'true');
            this.nav.setAttribute(CONFIG.aria.hidden, 'false');
            
            // Focus first menu item for accessibility
            const firstLink = utils.$(CONFIG.selectors.navLinks, this.nav);
            if (firstLink) {
                setTimeout(() => firstLink.focus(), 100);
            }
        },

        closeMenu() {
            this.isOpen = false;
            this.nav.classList.remove(CONFIG.classes.active);
            document.body.classList.remove(CONFIG.classes.menuOpen);
            this.toggle.setAttribute(CONFIG.aria.expanded, 'false');
            this.nav.setAttribute(CONFIG.aria.hidden, 'true');
        }
    };

    // ==============================================
    // Lazy Loading Module
    // ==============================================
    const lazyLoad = {
        observer: null,

        init() {
            if (!('IntersectionObserver' in window)) {
                this.loadAllImages();
                return;
            }

            this.observer = new IntersectionObserver(
                (entries) => this.handleIntersection(entries),
                {
                    rootMargin: '50px 0px',
                    threshold: 0.01
                }
            );

            document.querySelectorAll('img[data-src]').forEach(img => {
                this.observer.observe(img);
            });
        },

        handleIntersection(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        },

        loadImage(img) {
            const src = img.dataset.src;
            if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                img.classList.add(CONFIG.classes.loaded);
            }
        },

        loadAllImages() {
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.loadImage(img);
            });
        }
    };

    // ==============================================
    // Accessibility Enhancements
    // ==============================================
    const accessibility = {
        init() {
            this.setupSkipLink();
            this.setupFocusIndicators();
            this.setupReducedMotion();
        },

        setupSkipLink() {
            const skipLink = utils.$(CONFIG.selectors.skipLink);
            if (skipLink) {
                utils.on(skipLink, 'click', (e) => {
                    e.preventDefault();
                    const target = utils.$(skipLink.getAttribute('href'));
                    if (target) {
                        target.tabIndex = -1;
                        target.focus();
                    }
                });
            }
        },

        setupFocusIndicators() {
            // Add visible focus indicators
            document.body.classList.add('js-focus-visible');
            
            utils.on(document, 'keydown', (e) => {
                if (e.key === 'Tab') {
                    document.body.classList.add('keyboard-navigation');
                }
            });

            utils.on(document, 'mousedown', () => {
                document.body.classList.remove('keyboard-navigation');
            });
        },

        setupReducedMotion() {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            
            const handleMotionPreference = (e) => {
                if (e.matches) {
                    document.documentElement.style.scrollBehavior = 'auto';
                }
            };

            handleMotionPreference(mediaQuery);
            mediaQuery.addEventListener('change', handleMotionPreference);
        }
    };

    // ==============================================
    // Form Validation & Security
    // ==============================================
    const forms = {
        init() {
            document.querySelectorAll('form').forEach(form => {
                if (form.dataset.externalAction) return;
                this.setupValidation(form);
                this.setupCSRFProtection(form);
                this.setupContactForm(form);
            });
        },

        setupValidation(form) {
            utils.on(form, 'submit', (e) => {
                if (!form.checkValidity()) {
                    e.preventDefault();
                    this.showValidationErrors(form);
                }
            });

            // Real-time validation
            form.querySelectorAll('input, textarea, select').forEach(field => {
                utils.on(field, 'blur', () => this.validateField(field));
                utils.on(field, 'input', () => this.clearError(field));
            });
        },

        setupContactForm(form) {
            // Contact form handled by Formsubmit.co (see contact.html)
        },

        validateField(field) {
            if (!field.checkValidity()) {
                this.showFieldError(field, field.validationMessage);
            } else {
                this.clearError(field);
            }
        },

        showFieldError(field, message) {
            field.classList.add('error');
            const errorEl = field.parentNode.querySelector('.error-message');
            if (errorEl) {
                errorEl.textContent = utils.escapeHTML(message);
                errorEl.setAttribute('role', 'alert');
            }
        },

        clearError(field) {
            field.classList.remove('error');
            const errorEl = field.parentNode.querySelector('.error-message');
            if (errorEl) {
                errorEl.textContent = '';
            }
        },

        showValidationErrors(form) {
            const firstInvalid = form.querySelector(':invalid');
            if (firstInvalid) {
                firstInvalid.focus();
            }
        },

        setupCSRFProtection(form) {
            // Add timestamp to help prevent replay attacks
            const timestamp = document.createElement('input');
            timestamp.type = 'hidden';
            timestamp.name = '_timestamp';
            timestamp.value = Date.now().toString();
            form.appendChild(timestamp);
        }
    };

    // ==============================================
    // Performance Monitoring
    // ==============================================
    const performance = {
        init() {
            if ('PerformanceObserver' in window) {
                this.observeLCP();
                this.observeFID();
                this.observeCLS();
            }
        },

        observeLCP() {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.log('LCP:', lastEntry.startTime);
                });
                observer.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch (e) {
                // LCP not supported
            }
        },

        observeFID() {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        console.log('FID:', entry.processingStart - entry.startTime);
                    });
                });
                observer.observe({ type: 'first-input', buffered: true });
            } catch (e) {
                // FID not supported
            }
        },

        observeCLS() {
            try {
                let clsValue = 0;
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                });
                observer.observe({ type: 'layout-shift', buffered: true });
            } catch (e) {
                // CLS not supported
            }
        }
    };

    // ==============================================
    // Initialize Application
    // ==============================================
    function init() {
        navigation.init();
        lazyLoad.init();
        accessibility.init();
        forms.init();
        
        // Only enable performance monitoring in development
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            performance.init();
        }

        // Mark page as loaded
        document.documentElement.classList.add('js-loaded');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Debug utilities (localhost only)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        window.LMF = { CONFIG, utils, navigation, lazyLoad };
    }
})();

/* UI refresh: collapse long card/bio text with a "Read more" toggle (Nov 2026) */
document.addEventListener('DOMContentLoaded', function () {
    var targets = document.querySelectorAll('.card-desc, .member-bio');
    targets.forEach(function (el) {
        if (el.querySelector('ul, ol, h5, form, table')) return; // leave structured content alone
        el.classList.add('lmf-clamp');
        if (el.scrollHeight <= el.clientHeight + 4) { el.classList.remove('lmf-clamp'); return; }
        var link = el.closest('a');
        if (link) {
            // Whole card is already a link: show a visual cue instead of a button
            var cue = document.createElement('span');
            cue.className = 'lmf-more-link';
            cue.textContent = 'Learn more →';
            el.insertAdjacentElement('afterend', cue);
            return;
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lmf-more';
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Read more';
        btn.addEventListener('click', function () {
            var open = el.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.textContent = open ? 'Show less' : 'Read more';
        });
        el.insertAdjacentElement('afterend', btn);
    });
});

/* ===== Editable content from Pages CMS (data/images.json, data/menu.json) ===== */
(function () {
    function getJSON(url) { return lmfData(url); }
    function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

    // Images: each <img data-img="page.key"> takes its path from data/images.json
    getJSON('data/images.json').then(function (map) {
        if (!map) return;
        ready(function () {
            document.querySelectorAll('img[data-img]').forEach(function (img) {
                var parts = img.getAttribute('data-img').split('.'), v = map[parts[0]] && map[parts[0]][parts[1]];
                if (!v || typeof v !== 'string') return;
                var cur = img.getAttribute('src');
                if (v.replace(/^\//, '') === (cur || '').replace(/^\//, '')) return;
                v = lmfAsset(v);
                if (img.parentNode && img.parentNode.tagName === 'PICTURE') {
                    img.parentNode.querySelectorAll('source').forEach(function (s) { s.remove(); });
                }
                img.removeAttribute('srcset');
                img.src = v;
            });
        });
    });

    // Menus: header navigation and footer links
    getJSON('data/menu.json').then(function (menu) {
        if (!menu) return;
        ready(function () {
            var here = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
            function link(item, cls) {
                var a = document.createElement('a');
                a.href = item.url || '#'; a.textContent = item.label || ''; a.className = cls;
                if (/^https?:/.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
                if ((item.url || '').replace(/\.html$/, '') === here) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
                return a;
            }
            var nav = document.getElementById('main-nav');
            if (nav && Array.isArray(menu.header) && menu.header.length) {
                nav.textContent = '';
                menu.header.forEach(function (item) { nav.appendChild(link(item, 'nav-link' + (item.button ? ' donate-btn' : ''))); });
            }
            var foot = document.querySelector('.footer-links');
            if (foot && Array.isArray(menu.footer) && menu.footer.length) {
                foot.textContent = '';
                menu.footer.forEach(function (item) { foot.appendChild(link(item, 'nav-link')); });
            }
        });
    });
})();

/* Page text edited in Pages CMS (data/text.json): replaces plain-text headings/paragraphs tagged data-text */
(function () {
    lmfData('data/text.json').then(function (map) {
        if (!map) return;
        function apply() {
            document.querySelectorAll('[data-text]').forEach(function (el) {
                var p = el.getAttribute('data-text').split('.'), v = map[p[0]] && map[p[0]][p[1]];
                if (typeof v !== 'string' || !v.trim()) return;
                var cur = el.textContent.replace(/\s+/g, ' ').trim();
                if (v.trim() === cur) return;
                // If the page's HTML was edited directly since this text was tagged, the HTML wins.
                var src = el.getAttribute('data-text-src');
                if (src && lmfHash(cur) !== src) return;
                el.textContent = v;
            });
        }
        if (document.readyState !== 'loading') apply(); else document.addEventListener('DOMContentLoaded', apply);
    });
})();

/* Extra sections added to any page in Pages CMS (data/sections.json) */
(function () {
    lmfData('data/sections.json').then(function (list) {
        if (!Array.isArray(list) || !list.length) return;
        function run() {
            var here = location.pathname.split('/').pop() || 'index.html';
            if (here === 'page.html') here = 'page.html?p=' + (new URLSearchParams(location.search).get('p') || '');
            var main = document.querySelector('main'); if (!main) return;
            list.forEach(function (sec) {
                if (!sec || (sec.page || '') !== here.replace(/^\//, '')) return;
                var el = document.createElement('section');
                el.className = 'section container cms-rich cms-section';
                var h = '';
                if (sec.image) h += '<div class="cms-section-media"><img src="' + lmfAsset(sec.image).replace(/"/g, '&quot;') + '" alt=""></div>';
                if (sec.heading) { var t = document.createElement('h3'); t.className = 'section-title'; t.textContent = sec.heading; h += t.outerHTML; }
                h += sec.body || '';
                if (sec.button_text && sec.button_link) { var a = document.createElement('a'); a.className = 'cms-section-btn'; a.href = sec.button_link; a.textContent = sec.button_text; h += a.outerHTML; }
                el.innerHTML = h;
                if (sec.position === 'top') main.insertBefore(el, main.firstChild); else main.appendChild(el);
            });
        }
        if (document.readyState !== 'loading') run(); else document.addEventListener('DOMContentLoaded', run);
    });
})();
