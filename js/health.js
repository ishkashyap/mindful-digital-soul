/**
 * Mindful Digital Soul — Backend Health Check System
 * 
 * Production-grade health monitor for Render.com cold-start resilience.
 * Provides a single source of truth for backend readiness across all pages.
 * 
 * Usage:
 *   - Import via <script src="js/health.js"></script> AFTER config.js
 *   - Check state:   MDS_Health.isReady
 *   - Wait for ready: MDS_Health.onReady(callback)
 *   - Force check:    MDS_Health.check()
 *   - Probe once:     await MDS_Health.probe()
 * 
 * Emits custom event 'mds:backend-ready' on document when server goes live.
 * Emits custom event 'mds:backend-failed' on document after max retries.
 */

(function () {
    'use strict';

    /* ── Configuration ──────────────────────────────────────────────────── */
    const MAX_RETRIES       = 24;          // max ping attempts (24 × 3s = 72s window for cold starts)
    const PING_INTERVAL_MS  = 3000;        // time between health checks
    const REQUEST_TIMEOUT   = 10000;       // individual fetch timeout (cold starts can be slow)

    /* ── Internal State ─────────────────────────────────────────────────── */
    let _isReady        = false;
    let _isFailed       = false;
    let _isChecking     = false;           // prevents overlapping boot sequences
    let _retryCount     = 0;
    let _pingTimer      = null;
    let _readyCallbacks = [];              // queued onReady listeners

    /* ── Status Messages (cycled during boot) ───────────────────────────── */
    const STATUS_MESSAGES = [
        { text: "Connecting to AI engine...",         icon: "🔌" },
        { text: "Waking neural prediction system...", icon: "🧠" },
        { text: "Initializing wellness model...",     icon: "⚙️"  },
        { text: "Calibrating risk algorithms...",     icon: "📊" },
        { text: "Establishing secure pipeline...",    icon: "🔐" },
        { text: "Loading clinical datasets...",       icon: "📋" },
        { text: "Almost there — warming up...",       icon: "🔥" },
    ];

    /* ── Get health endpoint URL ────────────────────────────────────────── */
    function getHealthURL() {
        const cfg = window.MDS_CONFIG || {};
        return cfg.API_HEALTH || (cfg.API_BASE ? cfg.API_BASE + '/api/health' : null);
    }

    /* ── Single probe (returns {ok, status, data} or {ok:false, error}) ── */
    async function probe() {
        const url = getHealthURL();
        if (!url) {
            return { ok: false, error: 'no_url', message: 'API URL not configured' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache' },
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                let data = null;
                try { data = await response.json(); } catch (e) { /* non-JSON 200 is still OK */ }
                return { ok: true, status: response.status, data };
            } else {
                return { ok: false, error: 'http_error', status: response.status, message: `Server returned ${response.status}` };
            }
        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                return { ok: false, error: 'timeout', message: 'Health check timed out' };
            }
            return { ok: false, error: 'network', message: err.message || 'Network error' };
        }
    }

    /* ── Transition to READY state ──────────────────────────────────────── */
    function transitionToReady(probeResult) {
        if (_isReady) return;

        _isReady = true;
        _isFailed = false;
        clearInterval(_pingTimer);
        _pingTimer = null;

        console.log('✅ Backend is live:', probeResult?.data || probeResult);

        // Flush all queued callbacks
        const cbs = _readyCallbacks.splice(0);
        cbs.forEach(cb => {
            try { cb(probeResult); } catch (e) { console.error('onReady callback error:', e); }
        });

        // Dispatch DOM event for loosely-coupled listeners
        document.dispatchEvent(new CustomEvent('mds:backend-ready', { detail: probeResult }));
    }

    /* ── Transition to FAILED state ─────────────────────────────────────── */
    function transitionToFailed() {
        if (_isFailed) return;

        _isFailed = true;
        clearInterval(_pingTimer);
        _pingTimer = null;

        console.warn(`❌ Backend unreachable after ${MAX_RETRIES} attempts`);

        document.dispatchEvent(new CustomEvent('mds:backend-failed', {
            detail: { retries: _retryCount }
        }));
    }

    /* ── Start the boot check loop ──────────────────────────────────────── */
    function startBootSequence() {
        if (_isReady || _isChecking) return;
        _isChecking = true;
        _retryCount = 0;
        _isFailed = false;

        const tick = async () => {
            _retryCount++;

            const result = await probe();

            if (result.ok) {
                _isChecking = false;
                transitionToReady(result);
                return;
            }

            // Log attempt with useful context
            const errorType = result.error === 'timeout' ? '⏱️ Timeout'
                            : result.error === 'network' ? '🌐 Network'
                            : `⚠️ HTTP ${result.status}`;
            console.log(`${errorType} — attempt ${_retryCount}/${MAX_RETRIES}`);

            if (_retryCount >= MAX_RETRIES) {
                _isChecking = false;
                transitionToFailed();
            }
        };

        // Immediate first check, then interval
        tick();
        _pingTimer = setInterval(tick, PING_INTERVAL_MS);
    }

    /* ── Public API ─────────────────────────────────────────────────────── */
    const MDS_Health = {
        /** True once the backend has responded with 200 */
        get isReady()  { return _isReady; },

        /** True if all retry attempts have been exhausted */
        get isFailed() { return _isFailed; },

        /** Current retry attempt number */
        get retryCount() { return _retryCount; },

        /** Max retries configured */
        get maxRetries() { return MAX_RETRIES; },

        /** Status messages array (for UI binding) */
        get statusMessages() { return STATUS_MESSAGES; },

        /**
         * Register a callback that fires when the backend is confirmed ready.
         * If already ready, fires immediately (next microtask).
         */
        onReady(callback) {
            if (typeof callback !== 'function') return;
            if (_isReady) {
                queueMicrotask(() => callback({ ok: true, cached: true }));
            } else {
                _readyCallbacks.push(callback);
            }
        },

        /**
         * Run a single health probe. Returns {ok, error?, status?, data?}.
         * Does NOT affect the boot sequence state.
         */
        probe,

        /**
         * Start the boot check sequence (called automatically from
         * hero boot on index.html; call manually on other pages if needed).
         */
        startBootSequence,

        /**
         * Convenience: run a quick pre-flight check.
         * Returns true if backend is ready, false otherwise.
         * Useful as a gate before form submission.
         */
        async check() {
            if (_isReady) return true;
            const result = await probe();
            if (result.ok) {
                transitionToReady(result);
                return true;
            }
            return false;
        },

        /**
         * Force reset — useful after a backend re-deploy.
         * Clears all state and restarts the boot sequence.
         */
        reset() {
            _isReady = false;
            _isFailed = false;
            _isChecking = false;
            _retryCount = 0;
            clearInterval(_pingTimer);
            _pingTimer = null;
            _readyCallbacks = [];
        },
    };

    // Freeze the public API to prevent accidental mutation
    window.MDS_Health = Object.freeze(MDS_Health);
})();
