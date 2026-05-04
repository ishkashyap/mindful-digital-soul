/**
 * Mindful Digital Soul — 3D Dashboard
 * Animated result ring, glowing stat nodes, Three.js dashboard scene.
 * AI explanation panel, actionable suggestions, retake flow.
 * 
 * Fixes: animation stacking, zero-size canvas, cleanup on re-render.
 */

let dashScene, dashCamera, dashRenderer;
let resultRing, glowParticles;
let dashClock;
let dashAnimationId = null; // Track to prevent stacking

const COLORS = {
    excellent: 0x00FF88,
    good: 0xE8FF00,
    'needs-attention': 0xFF4757,
};

const COLOR_HEX = {
    excellent: '#00FF88',
    good: '#E8FF00',
    'needs-attention': '#FF4757',
};

function initDashboard() {
    // Listen for prediction results
    window.addEventListener('predictionResult', (e) => {
        renderResult(e.detail);
    });
}

function renderResult(result) {
    updateResultLabel(result);
    updateStatCards(result);
    updateRiskBar(result);
    renderExplanations(result);
    renderSuggestions(result);
    renderHistory();
    initDashboardScene(result);
    animateCounters();
}

// ─── Result Label ─────────────────────────────────────────────────────────────

function updateResultLabel(result) {
    const labelEl = document.getElementById('result-label');
    const confEl = document.getElementById('result-confidence');
    const msgEl = document.getElementById('result-message');
    const confidence = (typeof result.confidence === 'number' && !isNaN(result.confidence)) ? result.confidence : 0;

    if (labelEl) {
        labelEl.textContent = result.label || 'Unknown';
        labelEl.className = 'result-label';
        if (result.label === 'Excellent') labelEl.classList.add('excellent');
        else if (result.label === 'Good') labelEl.classList.add('good');
        else labelEl.classList.add('needs-attention');
    }

    if (confEl) confEl.textContent = `${confidence}% confidence`;
    if (msgEl) msgEl.textContent = result.message || 'No message available';
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

function updateStatCards(result) {
    const totalEl = document.getElementById('stat-total-users');
    const sleepEl = document.getElementById('stat-avg-sleep');
    const riskEl = document.getElementById('stat-risk-score');

    if (totalEl) totalEl.dataset.target = (typeof result.total_users === 'number' && !isNaN(result.total_users)) ? result.total_users : 0;
    if (sleepEl) sleepEl.dataset.target = (typeof result.avg_sleep_duration === 'number' && !isNaN(result.avg_sleep_duration)) ? result.avg_sleep_duration : 0;
    if (riskEl) riskEl.dataset.target = (typeof result.risk_score === 'number' && !isNaN(result.risk_score)) ? result.risk_score : 0;
}

// ─── Risk Bar ─────────────────────────────────────────────────────────────────

function updateRiskBar(result) {
    const fill = document.getElementById('risk-bar-fill');
    const scoreEl = document.getElementById('risk-score-text');
    const riskScore = (typeof result.risk_score === 'number' && !isNaN(result.risk_score)) ? result.risk_score : 0;

    if (fill) {
        fill.className = 'risk-bar-fill';
        if (result.label === 'Excellent') fill.classList.add('excellent');
        else if (result.label === 'Good') fill.classList.add('good');
        else fill.classList.add('needs-attention');

        setTimeout(() => {
            fill.style.width = `${riskScore}%`;
        }, 300);
    }

    if (scoreEl) scoreEl.textContent = `${riskScore}%`;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function animateCounters() {
    document.querySelectorAll('[data-target]').forEach(el => {
        const target = parseFloat(el.dataset.target);
        if (isNaN(target)) { el.textContent = '0'; return; }

        const isFloat = target % 1 !== 0;
        const duration = 1500;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;

            el.textContent = isFloat ? current.toFixed(1) : Math.floor(current);

            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    });
}

// ─── AI Explanation Panel ─────────────────────────────────────────────────────

function renderExplanations(result) {
    const container = document.getElementById('explanation-list');
    if (!container) return;
    if (!result.explanations || result.explanations.length === 0) {
        container.innerHTML = '<p class="explanation-empty">No detailed factor analysis available.</p>';
        return;
    }

    const STATUS_ICONS = {
        positive: '✅',
        neutral: 'ℹ️',
        risk: '⚠️',
        critical: '🚨',
        informational: '📋',
    };

    container.innerHTML = result.explanations.map(exp => `
        <div class="explanation-item explanation-${exp.status}">
            <div class="explanation-header">
                <span class="explanation-icon">${STATUS_ICONS[exp.status] || 'ℹ️'}</span>
                <span class="explanation-factor">${exp.factor}</span>
                <span class="explanation-badge badge-${exp.status}">${exp.status}</span>
            </div>
            <p class="explanation-detail">${exp.detail}</p>
            <p class="explanation-suggestion">💡 ${exp.suggestion}</p>
        </div>
    `).join('');

    // Show the panel
    const panel = document.getElementById('explanation-panel');
    if (panel) panel.classList.add('visible');
}

// ─── Suggestions Panel ────────────────────────────────────────────────────────

function renderSuggestions(result) {
    const container = document.getElementById('suggestions-list');
    if (!container) return;
    if (!result.suggestions || result.suggestions.length === 0) {
        container.innerHTML = '<p class="suggestion-empty">No specific suggestions — your indicators look healthy!</p>';
        return;
    }

    container.innerHTML = result.suggestions.map((suggestion, i) => `
        <div class="suggestion-item">
            <span class="suggestion-number">${String(i + 1).padStart(2, '0')}</span>
            <p>${suggestion}</p>
        </div>
    `).join('');

    const panel = document.getElementById('suggestions-panel');
    if (panel) panel.classList.add('visible');
}

// ─── Assessment History ───────────────────────────────────────────────────────

function renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    try {
        const history = JSON.parse(localStorage.getItem('mds_history') || '[]');
        if (history.length === 0) {
            container.innerHTML = '<p class="history-empty">This is your first assessment.</p>';
            return;
        }

        container.innerHTML = history.map((entry, i) => {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const colorClass = entry.label === 'Excellent' ? 'excellent' : entry.label === 'Good' ? 'good' : 'needs-attention';
            return `
                <div class="history-item">
                    <span class="history-date">${dateStr}</span>
                    <span class="history-label ${colorClass}">${entry.label}</span>
                    <span class="history-score">${entry.risk_score}%</span>
                </div>
            `;
        }).join('');

    } catch (e) {
        container.innerHTML = '<p class="history-empty">History unavailable.</p>';
    }

    const panel = document.getElementById('history-panel');
    if (panel) panel.classList.add('visible');
}

// ─── 3D Dashboard Scene ───────────────────────────────────────────────────────

function initDashboardScene(result) {
    const canvas = document.getElementById('dashboard-canvas');
    if (!canvas) return;

    // Cancel previous animation loop to prevent stacking
    if (dashAnimationId) {
        cancelAnimationFrame(dashAnimationId);
        dashAnimationId = null;
    }

    // Cleanup previous renderer
    if (dashRenderer) {
        dashRenderer.dispose();
    }

    // Ensure canvas has real dimensions (wait a frame if needed)
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 300;

    dashScene = new THREE.Scene();
    dashCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    dashCamera.position.set(0, 0, 6);

    dashRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    dashRenderer.setSize(width, height);
    dashRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    dashRenderer.setClearColor(0x000000, 0);

    const colorKey = result.label === 'Excellent' ? 'excellent' : result.label === 'Good' ? 'good' : 'needs-attention';
    const color = COLORS[colorKey];

    // Central torus ring
    const torusGeo = new THREE.TorusGeometry(1.2, 0.04, 16, 100);
    const torusMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    resultRing = new THREE.Mesh(torusGeo, torusMat);
    dashScene.add(resultRing);

    // Inner wireframe sphere
    const innerGeo = new THREE.IcosahedronGeometry(0.8, 2);
    const innerMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.15 });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    dashScene.add(innerMesh);

    // Orbiting nodes
    const nodePositions = [
        { x: -2.5, y: 0.8 },
        { x: 2.5, y: 0.8 },
        { x: 0, y: -1.8 },
    ];

    nodePositions.forEach(pos => {
        const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0xE8FF00 });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(pos.x, pos.y, 0);
        dashScene.add(node);

        const glowGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xE8FF00,
            transparent: true,
            opacity: 0.15,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(node.position);
        dashScene.add(glow);

        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(pos.x, pos.y, 0)];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xE8FF00, transparent: true, opacity: 0.1 });
        dashScene.add(new THREE.Line(lineGeo, lineMat));
    });

    // Floating particles
    const pCount = 100;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 10;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color, size: 0.02, transparent: true, opacity: 0.4 });
    glowParticles = new THREE.Points(pGeo, pMat);
    dashScene.add(glowParticles);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
        const w = canvas.clientWidth || 600;
        const h = canvas.clientHeight || 300;
        dashCamera.aspect = w / h;
        dashCamera.updateProjectionMatrix();
        dashRenderer.setSize(w, h);
    });
    resizeObserver.observe(canvas.parentElement);

    animateDashboard(innerMesh);
}

function animateDashboard(innerMesh) {
    if (!dashClock) dashClock = new THREE.Clock();

    function loop() {
        dashAnimationId = requestAnimationFrame(loop);

        // Pause when tab is hidden
        if (document.hidden) return;

        const t = dashClock.getElapsedTime();

        if (resultRing) {
            resultRing.rotation.x = Math.sin(t * 0.5) * 0.3;
            resultRing.rotation.y += 0.01;
        }

        if (innerMesh) {
            innerMesh.rotation.y -= 0.005;
            innerMesh.rotation.x += 0.003;
        }

        if (glowParticles) {
            glowParticles.rotation.y += 0.001;
        }

        dashRenderer.render(dashScene, dashCamera);
    }
    loop();
}

/* ── Expose globally ───────────────────────────────────────────────────── */
window.initDashboard = initDashboard;
