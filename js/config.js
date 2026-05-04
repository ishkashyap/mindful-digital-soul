/**
 * Mindful Digital Soul — Centralized Configuration
 * Auto-detects production vs development environment.
 */

(function () {
    'use strict';

    const isLocalhost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

    // ── UPDATE THIS to your Render.com backend URL after deployment ──
    const PRODUCTION_API = 'https://mindful-digital-soul.onrender.com';

    const config = {
        // API base (no trailing slash)
        API_BASE: isLocalhost
            ? 'http://localhost:8000'
            : (PRODUCTION_API !== 'YOUR_RENDER_URL_HERE' ? PRODUCTION_API : 'http://localhost:8000'),

        get API_PREDICT() { return this.API_BASE + '/api/predict'; },
        get API_HEALTH()  { return this.API_BASE + '/api/health'; },
        get API_STATS()   { return this.API_BASE + '/api/stats'; },

        // Feature flags
        enableLocalStorage: true,
        localStorageTTL: 24 * 60 * 60 * 1000, // 24 hours

        // Performance
        maxParticles: /Mobi|Android/i.test(navigator.userAgent) ? 150 : 350,
        maxDust: /Mobi|Android/i.test(navigator.userAgent) ? 80 : 180,

        // Debug
        isProduction: !isLocalhost,
    };

    window.MDS_CONFIG = Object.freeze(config);
})();
