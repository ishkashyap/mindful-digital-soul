/**
 * Mindful Digital Soul — Scroll Reveal Animation
 * IntersectionObserver-based staggered reveal for .reveal-hidden elements.
 * 
 * Can be called globally via window.initReveal() for deferred initialization
 * (e.g., after hero boot sequence completes on index.html).
 */

(function() {
    'use strict';

    function initReveal() {
        const reveals = document.querySelectorAll('.reveal-hidden:not(.reveal-visible)');
        if (reveals.length === 0) return;

        const revealOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        };

        let staggeredDelay = 0;
        let timeoutId = null;

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('reveal-visible');
                    }, staggeredDelay);

                    staggeredDelay += 100;
                    observer.unobserve(entry.target);

                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        staggeredDelay = 0;
                    }, 100);
                }
            });
        }, revealOptions);

        reveals.forEach(reveal => {
            revealObserver.observe(reveal);
        });
    }

    // Expose globally for deferred init from main.js hero boot
    window.initReveal = initReveal;

    // Auto-init on DOMContentLoaded for pages without hero boot (resources, portfolio)
    // The hero page (index.html) calls initReveal manually after boot completes
    document.addEventListener('DOMContentLoaded', () => {
        // Only auto-init if there's no hero boot sequence on this page
        if (!document.getElementById('boot-status')) {
            initReveal();
        }
    });
})();
