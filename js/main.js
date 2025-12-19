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
                this.setupValidation(form);
                this.setupCSRFProtection(form);
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

    // Expose utilities for debugging (remove in production)
    window.LMF = { CONFIG, utils, navigation, lazyLoad };
})();
