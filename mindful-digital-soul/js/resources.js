/**
 * Mindful Digital Soul — Resources Page Interactivity
 * 4-7-8 Breathing animation controller and Sleep Hygiene checklist toggles.
 */

// ─── 4-7-8 Breathing Exercise ─────────────────────────────────────────────────

const PHASES = [
    { name: 'Inhale',  duration: 4, cssClass: 'inhale',  stepId: 'step-inhale'  },
    { name: 'Hold',    duration: 7, cssClass: 'hold',    stepId: 'step-hold'    },
    { name: 'Exhale',  duration: 8, cssClass: 'exhale',  stepId: 'step-exhale'  },
];

let breathingActive = false;
let breathingInterval = null;
let breathingTimeout = null;

function initBreathing() {
    const btn = document.getElementById('btn-start-breathing');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (breathingActive) {
            stopBreathing();
        } else {
            startBreathing();
        }
    });
}

function startBreathing() {
    breathingActive = true;
    const btn = document.getElementById('btn-start-breathing');
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        Stop Exercise
    `;
    runCycle();
}

function stopBreathing() {
    breathingActive = false;
    clearTimeout(breathingTimeout);
    clearInterval(breathingInterval);

    const btn = document.getElementById('btn-start-breathing');
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Start Breathing Exercise
    `;

    // Reset visual state
    const circle = document.getElementById('breath-circle');
    const phase = document.getElementById('breath-phase');
    const timer = document.getElementById('breath-timer');
    const progress = document.getElementById('breath-ring-progress');

    circle.className = 'breath-circle';
    phase.textContent = 'Ready';
    timer.textContent = '—';
    if (progress) progress.style.strokeDashoffset = 700;

    // Reset step indicators
    document.querySelectorAll('.breath-step-indicator').forEach(s => s.classList.remove('active'));
}

function runCycle() {
    if (!breathingActive) return;
    runPhase(0);
}

function runPhase(phaseIndex) {
    if (!breathingActive) return;
    if (phaseIndex >= PHASES.length) {
        // Restart cycle
        runCycle();
        return;
    }

    const { name, duration, cssClass, stepId } = PHASES[phaseIndex];
    const circle = document.getElementById('breath-circle');
    const phaseEl = document.getElementById('breath-phase');
    const timerEl = document.getElementById('breath-timer');
    const progress = document.getElementById('breath-ring-progress');

    // Update circle class
    circle.className = 'breath-circle ' + cssClass;

    // Update phase text
    phaseEl.textContent = name;

    // Update step indicators
    document.querySelectorAll('.breath-step-indicator').forEach(s => s.classList.remove('active'));
    const activeStep = document.getElementById(stepId);
    if (activeStep) activeStep.classList.add('active');

    // Animate ring progress
    const circumference = 2 * Math.PI * 110; // r=110 from SVG
    if (progress) {
        progress.style.strokeDasharray = circumference;
        progress.style.strokeDashoffset = circumference;
        progress.style.transition = `stroke-dashoffset ${duration}s linear`;
        // Force reflow
        progress.getBoundingClientRect();
        progress.style.strokeDashoffset = 0;
    }

    // Countdown timer
    let remaining = duration;
    timerEl.textContent = remaining;

    breathingInterval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            timerEl.textContent = remaining;
        }
    }, 1000);

    // Move to next phase after duration
    breathingTimeout = setTimeout(() => {
        clearInterval(breathingInterval);
        // Reset ring for next phase
        if (progress) {
            progress.style.transition = 'none';
            progress.style.strokeDashoffset = circumference;
        }
        runPhase(phaseIndex + 1);
    }, duration * 1000);
}

// ─── Initialize ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initBreathing();
});
