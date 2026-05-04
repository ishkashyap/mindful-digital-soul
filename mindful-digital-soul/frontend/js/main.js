/**
 * Mindful Digital Soul — Three.js Hero Scene
 * Floating, pulsing abstract wireframe sphere with mouse interactivity.
 * Uses global THREE from CDN <script> tag — no import-map required.
 * Integrated with Render.com cold start buffer.
 * 
 * Fixes: particle drift bug, page visibility, adaptive quality.
 */

let scene, camera, renderer;
let sphereGroup, outerWire, innerWire, coreGlow;
let particles, dustPoints;
let mouse  = { x: 0, y: 0 };
let smooth = { x: 0, y: 0 };
let clock;
let animationId;
let particleBasePositions; // Store original positions to prevent drift

/* ── State & Colors ─────────────────────────────────────────────────────── */
let isServerLive = false;
const BOOT_COLOR = new THREE.Color(0x556688);
const LIVE_COLOR = new THREE.Color(0xE8FF00);
let currentColor = new THREE.Color(BOOT_COLOR);

/* ── Public initialiser (called from index.html) ───────────────────────── */
function initHeroScene() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    clock = new THREE.Clock();

    const cfg = window.MDS_CONFIG || {};
    const pCount = cfg.maxParticles || 350;
    const dCount = cfg.maxDust || 180;

    /* ── Scene ──────────────────────────────────────────────────────────── */
    scene = new THREE.Scene();

    /* ── Camera ─────────────────────────────────────────────────────────── */
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 5;

    /* ── Renderer ───────────────────────────────────────────────────────── */
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    /* ── Sphere Group ───────────────────────────────────────────────────── */
    sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    /* Outer wireframe */
    const outerGeo = new THREE.IcosahedronGeometry(1.8, 3);
    const outerMat = new THREE.MeshBasicMaterial({
        color: currentColor,
        wireframe: true,
        transparent: true,
        opacity: 0.20,
    });
    outerWire = new THREE.Mesh(outerGeo, outerMat);
    sphereGroup.add(outerWire);

    /* Inner wireframe */
    const innerGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const innerMat = new THREE.MeshBasicMaterial({
        color: currentColor,
        wireframe: true,
        transparent: true,
        opacity: 0.10,
    });
    innerWire = new THREE.Mesh(innerGeo, innerMat);
    sphereGroup.add(innerWire);

    /* Core glow sphere */
    const coreGeo = new THREE.IcosahedronGeometry(1.3, 2);
    const coreMat = new THREE.MeshBasicMaterial({
        color: currentColor,
        transparent: true,
        opacity: 0.045,
    });
    coreGlow = new THREE.Mesh(coreGeo, coreMat);
    sphereGroup.add(coreGlow);

    /* ── Orbiting particles ─────────────────────────────────────────────── */
    const pGeo   = new THREE.BufferGeometry();
    const pPos   = new Float32Array(pCount * 3);
    particleBasePositions = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
        const r     = 2.2 + Math.random() * 3.5;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        pPos[i * 3]     = x;
        pPos[i * 3 + 1] = y;
        pPos[i * 3 + 2] = z;
        // Store originals for wave calculation (prevents drift)
        particleBasePositions[i * 3]     = x;
        particleBasePositions[i * 3 + 1] = y;
        particleBasePositions[i * 3 + 2] = z;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
        color: currentColor,
        size: 0.025,
        transparent: true,
        opacity: 0.60,
        sizeAttenuation: true,
    });

    particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* ── Ambient dust ───────────────────────────────────────────────────── */
    const dGeo = new THREE.BufferGeometry();
    const dPos = new Float32Array(dCount * 3);

    for (let i = 0; i < dCount; i++) {
        dPos[i * 3]     = (Math.random() - 0.5) * 24;
        dPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
        dPos[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }

    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));

    const dMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.015,
        transparent: true,
        opacity: 0.25,
    });

    dustPoints = new THREE.Points(dGeo, dMat);
    scene.add(dustPoints);

    /* ── Events ─────────────────────────────────────────────────────────── */
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    /* ── Page Visibility API — pause when tab hidden ────────────────────── */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            clock.getDelta(); // Discard accumulated time
            animate();
        }
    });

    /* ── Kick off ───────────────────────────────────────────────────────── */
    animate();
    startPingLogic();
}

/* ── Mouse handler ──────────────────────────────────────────────────────── */
function onMouseMove(e) {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

/* ── Resize handler ─────────────────────────────────────────────────────── */
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ── Animation loop ─────────────────────────────────────────────────────── */
function animate() {
    animationId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    /* ─ State Transitions & Lerping ─ */
    if (isServerLive) {
        currentColor.lerp(LIVE_COLOR, 0.02);
    }
    
    outerWire.material.color.copy(currentColor);
    innerWire.material.color.copy(currentColor);
    coreGlow.material.color.copy(currentColor);
    particles.material.color.copy(currentColor);

    /* ─ Smooth mouse follow ─ */
    smooth.x += (mouse.x - smooth.x) * 0.04;
    smooth.y += (mouse.y - smooth.y) * 0.04;

    /* ─ Sphere auto-rotation ─ */
    sphereGroup.rotation.y += 0.0025;
    sphereGroup.rotation.x += 0.0008;

    /* ─ Mouse tilt ─ */
    if (isServerLive) {
        sphereGroup.rotation.x += (smooth.y * 0.4 - sphereGroup.rotation.x) * 0.015;
        sphereGroup.rotation.y += (smooth.x * 0.4 - sphereGroup.rotation.y) * 0.015;
    } else {
        sphereGroup.rotation.x += (0 - sphereGroup.rotation.x) * 0.015;
        sphereGroup.rotation.y += (0 - sphereGroup.rotation.y) * 0.015;
    }

    /* ─ Inner wireframe counter-rotate ─ */
    innerWire.rotation.y -= 0.004;
    innerWire.rotation.z += 0.002;

    /* ─ Breathing scale ─ */
    const breatheSpeed = isServerLive ? 0.8 : 0.4;
    const breathe = 1 + Math.sin(t * breatheSpeed) * 0.045;
    sphereGroup.scale.set(breathe, breathe, breathe);

    /* ─ Breathing opacity ─ */
    outerWire.material.opacity = 0.155 + Math.sin(t * breatheSpeed) * 0.066;

    /* ─ Core glow pulsing ─ */
    const corePulseSpeed = isServerLive ? 1.2 : 0.6;
    const coreScaleSpeed = isServerLive ? 1.0 : 0.5;
    coreGlow.material.opacity = 0.033 + Math.sin(t * corePulseSpeed) * 0.028;
    const coreScale = 1 + Math.sin(t * coreScaleSpeed) * 0.06;
    coreGlow.scale.set(coreScale, coreScale, coreScale);

    /* ─ Particles slow orbit ─ */
    particles.rotation.y += 0.0015;
    particles.rotation.x += 0.0005;

    /* ─ Particle breathing (using BASE positions to prevent drift) ─ */
    const pArr = particles.geometry.attributes.position.array;
    for (let i = 0; i < pArr.length; i += 3) {
        const bx = particleBasePositions[i];
        const by = particleBasePositions[i + 1];
        const bz = particleBasePositions[i + 2];
        const dist = Math.sqrt(bx * bx + by * by + bz * bz);
        const wave = Math.sin(t * 0.4 + dist * 0.5) * 0.002;
        const f = 1 + wave;
        pArr[i]     = bx * f;
        pArr[i + 1] = by * f;
        pArr[i + 2] = bz * f;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    /* ─ Dust slow drift ─ */
    dustPoints.rotation.y += 0.0003;

    renderer.render(scene, camera);
}

/* ── Hero Boot Sequence (delegates to MDS_Health) ───────────────────────── */
function startPingLogic() {
    const health = window.MDS_Health;
    if (!health) {
        console.warn('MDS_Health not loaded — skipping boot sequence');
        setLiveImmediate();
        return;
    }

    const bootStatus  = document.getElementById('boot-status');
    const heroContent = document.getElementById('hero-main-content');
    const ctaButton   = document.getElementById('cta-button');

    const messages = health.statusMessages;
    let msgIndex = 0;

    /* ── Disable CTA until backend is confirmed ready ───────────────── */
    if (ctaButton) {
        ctaButton.classList.add('cta-disabled');
        ctaButton.setAttribute('aria-disabled', 'true');
        ctaButton.addEventListener('click', function guard(e) {
            if (!health.isReady) {
                e.preventDefault();
                if (window.showToast) {
                    window.showToast('The AI engine is still booting — please wait a moment.', 'info', 3000);
                }
            }
        });
    }

    /* ── Cycle status messages with retry counter ───────────────────── */
    const msgTimer = setInterval(() => {
        if (health.isReady || health.isFailed) { clearInterval(msgTimer); return; }
        if (bootStatus) {
            const msg = messages[msgIndex % messages.length];
            const attempt = health.retryCount;
            const max = health.maxRetries;
            bootStatus.textContent = `${msg.icon}  ${msg.text}`;
            // Show subtle progress indicator after first few attempts
            if (attempt >= 3) {
                bootStatus.textContent += `  [${attempt}/${max}]`;
            }
            msgIndex++;
        }
    }, 2500);

    /* ── Handle SUCCESS — backend is live ───────────────────────────── */
    document.addEventListener('mds:backend-ready', () => {
        clearInterval(msgTimer);

        if (bootStatus) {
            bootStatus.textContent = "✅  Neural Connection Established — System Live";
        }

        // Enable CTA
        if (ctaButton) {
            ctaButton.classList.remove('cta-disabled');
            ctaButton.removeAttribute('aria-disabled');
        }

        // Transition hero scene colors (handled by animate() via isServerLive)
        isServerLive = true;

        // Reveal hero content after a short dramatic pause
        setTimeout(() => {
            if (bootStatus) bootStatus.classList.add('fade-out');
            if (heroContent) heroContent.classList.add('fade-visible');
            if (window.initReveal) window.initReveal();
        }, 1200);
    }, { once: true });

    /* ── Handle FAILURE — all retries exhausted ────────────────────── */
    document.addEventListener('mds:backend-failed', () => {
        clearInterval(msgTimer);

        if (bootStatus) {
            bootStatus.innerHTML = `
                ⚠️  Server is currently unavailable.
                <button id="boot-retry-btn" style="
                    margin-left: 0.8rem;
                    padding: 0.4rem 1.2rem;
                    background: var(--yellow);
                    color: var(--black);
                    border: none;
                    border-radius: 100px;
                    font-family: var(--font-heading);
                    font-weight: 700;
                    font-size: 0.75rem;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Retry</button>
            `;
            bootStatus.classList.remove('fade-out');
            // Stop the pulsing animation on failure
            bootStatus.style.animation = 'none';
        }

        // Show toast notification
        if (window.showToast) {
            window.showToast(
                'The AI server is currently sleeping. This is normal on free-tier hosting — tap Retry or wait a moment.',
                'warning',
                8000
            );
        }

        // Still reveal hero content so the page isn't stuck
        if (heroContent) heroContent.classList.add('fade-visible');
        if (window.initReveal) window.initReveal();

        // Retry button handler
        const retryBtn = document.getElementById('boot-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (bootStatus) {
                    bootStatus.innerHTML = '';
                    bootStatus.textContent = '🔄  Retrying connection...';
                    bootStatus.style.animation = 'text-pulse 2s infinite ease-in-out';
                }
                health.reset();
                health.startBootSequence();
                // Re-bind the message cycler
                msgIndex = 0;
                const retryMsgTimer = setInterval(() => {
                    if (health.isReady || health.isFailed) { clearInterval(retryMsgTimer); return; }
                    if (bootStatus) {
                        const msg = messages[msgIndex % messages.length];
                        bootStatus.textContent = `${msg.icon}  ${msg.text}  [${health.retryCount}/${health.maxRetries}]`;
                        msgIndex++;
                    }
                }, 2500);
            });
        }
    }, { once: true });

    /* ── Kick off the health check sequence ─────────────────────────── */
    health.startBootSequence();
}

/**
 * Fallback: go live immediately if health module is missing.
 * Used only as a safety net — health.js should always be loaded.
 */
function setLiveImmediate() {
    isServerLive = true;
    const bootStatus = document.getElementById('boot-status');
    const heroContent = document.getElementById('hero-main-content');
    if (bootStatus) bootStatus.classList.add('fade-out');
    if (heroContent) heroContent.classList.add('fade-visible');
    if (window.initReveal) window.initReveal();
}

/* ── Expose globally ───────────────────────────────────────────────────── */
window.initHeroScene = initHeroScene;

