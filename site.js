(function () {
    const nav = document.querySelector('.navbar');
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.nav-links');
    window.dataLayer = window.dataLayer || [];

    function trackSiteEvent(name, params) {
        const payload = Object.assign({
            page_location: window.location.href,
            page_path: window.location.pathname,
            page_title: document.title
        }, params || {});

        window.dataLayer.push(Object.assign({ event: name }, payload));

        if (typeof window.gtag === 'function') {
            window.gtag('event', name, payload);
        }
    }

    window.trackSiteEvent = trackSiteEvent;

    function setMenuState(isOpen) {
        if (!toggle || !menu) return;
        menu.classList.toggle('is-open', isOpen);
        toggle.classList.toggle('is-active', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        document.body.classList.toggle('menu-open', isOpen);
    }

    function closeMenu() {
        setMenuState(false);
    }

    if (toggle && menu) {
        setMenuState(false);

        toggle.addEventListener('click', function () {
            setMenuState(!menu.classList.contains('is-open'));
        });

        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', function (event) {
            if (window.innerWidth > 900 || !nav) return;
            if (!nav.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 900) {
                closeMenu();
            }
        });
    }

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (link) {
        const href = link.getAttribute('href');
        if (!href || href.indexOf('.html') === -1) return;

        if (href === currentPath) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });

    const yearTarget = document.querySelector('[data-current-year]');
    if (yearTarget) {
        yearTarget.textContent = String(new Date().getFullYear());
    }

    document.addEventListener('click', function (event) {
        const link = event.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href') || '';
        const label = (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90);

        if (href.startsWith('tel:')) {
            trackSiteEvent('phone_click', {
                contact_method: 'phone',
                link_text: label || href
            });
            return;
        }

        if (href.startsWith('mailto:')) {
            trackSiteEvent('email_click', {
                contact_method: 'email',
                link_text: label || href
            });
            return;
        }

        if (href.indexOf('contact.html') !== -1 && link.matches('.btn-nav, .btn-footer, .hero-primary, .pathway-link, .text-link')) {
            trackSiteEvent('cta_click', {
                cta_type: 'quote',
                link_text: label || 'Request a Quote',
                destination: href
            });
        }
    });

    const leadForm = document.querySelector('.lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', function () {
            trackSiteEvent('generate_lead', {
                lead_type: 'quote_request',
                form_name: 'project_inquiry'
            });
        });
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
        return;
    }

    const revealSelectors = [
        '.hero-panel',
        '.stat-card',
        '.statement-card',
        '.highlight-card',
        '.cred-item',
        '.intro-highlight',
        '.pathway-card',
        '.full-service-panel',
        '.services-summary-card',
        '.support-card',
        '.process-card-home',
        '.why-home-card',
        '.cta-detail',
        '.highlight-box',
        '.stat-box',
        '.visit-box',
        '.service-card',
        '.support-panel',
        '.process-card',
        '.detail-card',
        '.why-card',
        '.service-point',
        '.contact-form-wrap',
        '.bottom-card',
        '.footer-column',
        '.resource-card',
        '.faq-item'
    ];

    const targets = document.querySelectorAll(revealSelectors.join(','));
    if (!targets.length) return;

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.14,
        rootMargin: '0px 0px -8% 0px'
    });

    targets.forEach(function (target, index) {
        target.classList.add('reveal-ready');
        target.style.transitionDelay = String(Math.min(index % 4, 3) * 70) + 'ms';
        observer.observe(target);
    });
})();
