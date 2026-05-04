/**
 * Mindful Digital Soul — Centralized Navigation
 * Hamburger menu for mobile + scroll handler + active link detection.
 */

(function () {
    'use strict';

    function initNav() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        // ── Hamburger Toggle ──────────────────────────────────────────────
        const hamburger = document.getElementById('nav-hamburger');
        const navLinks = document.querySelector('.nav-links');

        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                const isOpen = navLinks.classList.toggle('nav-open');
                hamburger.classList.toggle('is-open', isOpen);
                hamburger.setAttribute('aria-expanded', isOpen);

                // Prevent body scroll when menu is open
                document.body.style.overflow = isOpen ? 'hidden' : '';
            });

            // Close menu when a link is clicked
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('nav-open');
                    hamburger.classList.remove('is-open');
                    hamburger.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                });
            });

            // Close menu on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navLinks.classList.contains('nav-open')) {
                    navLinks.classList.remove('nav-open');
                    hamburger.classList.remove('is-open');
                    hamburger.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            });
        }

        // ── Scroll Effect ─────────────────────────────────────────────────
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (window.scrollY > 50) {
                        navbar.classList.add('scrolled');
                    } else {
                        navbar.classList.remove('scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();
