/**
 * Mindful Digital Soul — Multi-Step Assessment Form
 * Handles form navigation, validation, data collection, and API submission.
 * 
 * Features: toast errors, numeric parsing, localStorage session,
 *           multi-step loading text, retake flow.
 */

let currentStep = 1;
const totalSteps = 4;

// Form data store
const formData = {
    Gender: '',
    Age: 21,
    Degree: '',
    'Academic Pressure': 3,
    'Work Pressure': 0,
    CGPA: 7.0,
    'Study Satisfaction': 3,
    'Job Satisfaction': 0,
    'Sleep Duration': '',
    'Dietary Habits': '',
    'Work/Study Hours': 6,
    'Financial Stress': 3,
    'Have you ever had suicidal thoughts ?': '',
    'Family History of Mental Illness': '',
};

// Loading progress messages
const LOADING_MESSAGES = [
    "Analyzing your responses...",
    "Processing wellness indicators...",
    "Evaluating sleep patterns...",
    "Computing risk factors...",
    "Generating personalized insights...",
];

function initForm() {
    setupNavigation();
    setupSliders();
    setupToggles();
    updateProgressBar();
    showStep(1);
    restoreSession();
}

// ─── Step Navigation ──────────────────────────────────────────────────────────

function setupNavigation() {
    document.querySelectorAll('[data-next]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                collectStepData(currentStep);
                saveSession();
                nextStep();
            }
        });
    });

    document.querySelectorAll('[data-prev]').forEach(btn => {
        btn.addEventListener('click', () => {
            collectStepData(currentStep);
            saveSession();
            prevStep();
        });
    });

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (validateStep(currentStep)) {
                collectStepData(currentStep);
                saveSession();
                submitForm();
            }
        });
    }

    // Retake button
    const retakeBtn = document.getElementById('retake-btn');
    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            resetForm();
        });
    }
}

function nextStep() {
    if (currentStep < totalSteps) {
        const current = document.getElementById(`step-${currentStep}`);
        if (current) current.classList.add('slide-out-left');

        setTimeout(() => {
            currentStep++;
            showStep(currentStep);
            updateProgressBar();
        }, 250);
    }
}

function prevStep() {
    if (currentStep > 1) {
        const current = document.getElementById(`step-${currentStep}`);
        if (current) current.classList.add('slide-out-right');

        setTimeout(() => {
            currentStep--;
            showStep(currentStep);
            updateProgressBar();
        }, 250);
    }
}

function showStep(step) {
    document.querySelectorAll('.form-step').forEach(s => {
        s.classList.remove('active', 'slide-out-left', 'slide-out-right');
    });
    const target = document.getElementById(`step-${step}`);
    if (target) {
        target.classList.add('active');
    }
    // Scroll form into view
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((bar, i) => {
        bar.classList.remove('active', 'completed');
        if (i + 1 < currentStep) bar.classList.add('completed');
        if (i + 1 === currentStep) bar.classList.add('active');
    });
}

// ─── Sliders ──────────────────────────────────────────────────────────────────

function setupSliders() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        const display = document.getElementById(`${slider.id}-value`);
        if (display) {
            display.textContent = slider.value;
            slider.addEventListener('input', () => {
                display.textContent = slider.value;
            });
        }
    });
}

// ─── Toggle Buttons ───────────────────────────────────────────────────────────

function setupToggles() {
    document.querySelectorAll('.toggle-group').forEach(group => {
        const buttons = group.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Clear any validation error styling
                buttons.forEach(b => b.style.borderColor = '');
            });
        });
    });
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step) {
    let valid = true;
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) return false;

    // Check required selects
    stepEl.querySelectorAll('select[required]').forEach(sel => {
        if (!sel.value) {
            sel.style.borderColor = '#FF4757';
            sel.classList.add('shake');
            valid = false;
            setTimeout(() => {
                sel.style.borderColor = '';
                sel.classList.remove('shake');
            }, 2000);
        }
    });

    // Check required inputs
    stepEl.querySelectorAll('input[required]').forEach(inp => {
        if (!inp.value || (inp.type === 'number' && isNaN(parseFloat(inp.value)))) {
            inp.style.borderColor = '#FF4757';
            inp.classList.add('shake');
            valid = false;
            setTimeout(() => {
                inp.style.borderColor = '';
                inp.classList.remove('shake');
            }, 2000);
        }
    });

    // Check toggle groups
    stepEl.querySelectorAll('.toggle-group[data-required]').forEach(group => {
        const active = group.querySelector('.toggle-btn.active');
        if (!active) {
            group.querySelectorAll('.toggle-btn').forEach(b => {
                b.style.borderColor = '#FF4757';
                b.classList.add('shake');
                setTimeout(() => {
                    b.style.borderColor = '';
                    b.classList.remove('shake');
                }, 2000);
            });
            valid = false;
        }
    });

    if (!valid && window.showToast) {
        window.showToast('Please fill in all required fields.', 'warning', 3000);
    }

    return valid;
}

// ─── Data Collection ──────────────────────────────────────────────────────────

function collectStepData(step) {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) return;

    // Collect inputs — ensure numeric values are parsed
    stepEl.querySelectorAll('input, select').forEach(el => {
        const key = el.dataset.field;
        if (key) {
            if (el.type === 'range' || el.type === 'number') {
                formData[key] = parseFloat(el.value) || 0;
            } else {
                formData[key] = el.value;
            }
        }
    });

    // Collect toggle values
    stepEl.querySelectorAll('.toggle-group').forEach(group => {
        const key = group.dataset.field;
        const active = group.querySelector('.toggle-btn.active');
        if (key && active) {
            formData[key] = active.dataset.value;
        }
    });
}

// ─── LocalStorage Session ─────────────────────────────────────────────────────

function saveSession() {
    const cfg = window.MDS_CONFIG || {};
    if (!cfg.enableLocalStorage) return;

    try {
        const session = {
            formData: formData,
            currentStep: currentStep,
            timestamp: Date.now(),
        };
        localStorage.setItem('mds_session', JSON.stringify(session));
    } catch (e) {
        // localStorage not available — silently continue
    }
}

function restoreSession() {
    const cfg = window.MDS_CONFIG || {};
    if (!cfg.enableLocalStorage) return;

    try {
        const raw = localStorage.getItem('mds_session');
        if (!raw) return;

        const session = JSON.parse(raw);
        const ttl = cfg.localStorageTTL || 86400000;

        // Check TTL
        if (Date.now() - session.timestamp > ttl) {
            localStorage.removeItem('mds_session');
            return;
        }

        // Restore form data
        if (session.formData) {
            Object.assign(formData, session.formData);
        }

        // Restore UI state
        restoreFormUI();

        // Restore step (but stay on step 1 to let user review)
        if (session.currentStep && session.currentStep > 1) {
            if (window.showToast) {
                window.showToast('Welcome back! Your previous progress has been restored.', 'info', 4000);
            }
        }
    } catch (e) {
        // Corrupted data — clear it
        localStorage.removeItem('mds_session');
    }
}

function restoreFormUI() {
    // Restore input values
    document.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
        const key = el.dataset.field;
        if (key && formData[key] !== undefined && formData[key] !== '') {
            el.value = formData[key];
            // Update slider display
            if (el.type === 'range') {
                const display = document.getElementById(`${el.id}-value`);
                if (display) display.textContent = el.value;
            }
        }
    });

    // Restore toggle selections
    document.querySelectorAll('.toggle-group').forEach(group => {
        const key = group.dataset.field;
        if (key && formData[key]) {
            group.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === formData[key]);
            });
        }
    });
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submitForm() {
    const cfg = window.MDS_CONFIG || {};
    const API_URL = cfg.API_PREDICT || 'https://mindful-digital-soul.onrender.com/api/predict';

    /* ── Pre-flight: verify backend is reachable before sending data ─── */
    const health = window.MDS_Health;
    if (health && !health.isReady) {
        // Quick probe — gives the backend one last chance
        const alive = await health.check();
        if (!alive) {
            if (window.showToast) {
                window.showToast(
                    'The AI engine is still waking up. Please wait a moment and try again.',
                    'warning',
                    5000
                );
            }
            return; // Abort submission — don't show loader for a guaranteed failure
        }
    }

    const loader = document.getElementById('loading-overlay');
    const loaderText = document.getElementById('loader-text');
    if (loader) loader.classList.add('active');

    // Cycle through loading messages
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
        if (loaderText) {
            loaderText.textContent = LOADING_MESSAGES[msgIndex % LOADING_MESSAGES.length];
            msgIndex++;
        }
    }, 2000);

    // Timeout failsafe
    const timeout = setTimeout(() => {
        clearInterval(msgInterval);
        if (loader) loader.classList.remove('active');
        if (window.showToast) {
            window.showToast('The server is taking too long to respond. It may be waking up — please try again in 30 seconds.', 'warning', 6000);
        }
    }, 30000);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        clearTimeout(timeout);
        clearInterval(msgInterval);

        if (!response.ok) {
            let detail = 'Prediction failed';
            try {
                const err = await response.json();
                detail = err.detail || detail;
            } catch(e) {}
            throw new Error(detail);
        }

        const result = await response.json();

        if (loader) loader.classList.remove('active');

        // Save result to localStorage history
        saveResultToHistory(result);

        // Show dashboard with result
        showDashboard(result);

        if (window.showToast) {
            window.showToast('Assessment complete! Your results are ready.', 'success', 4000);
        }

    } catch (error) {
        clearTimeout(timeout);
        clearInterval(msgInterval);
        if (loader) loader.classList.remove('active');
        console.error('Submission error:', error);

        if (window.showToast) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                window.showToast('Unable to reach the AI server. It may be waking up — please try again in 10 seconds.', 'warning', 8000);
            } else if (error.message.includes('503') || error.message.includes('model')) {
                window.showToast('Model is warming up, please try again in 10 seconds.', 'warning', 8000);
            } else {
                window.showToast(`Something went wrong: ${error.message}. Please try again.`, 'error', 6000);
            }
        }
    }
}

function showDashboard(result) {
    // Hide the assessment form section
    const assessmentSection = document.querySelector('.assessment-section');
    if (assessmentSection) assessmentSection.style.display = 'none';

    const dashboard = document.getElementById('dashboard-section');
    if (dashboard) {
        dashboard.classList.add('visible');
        dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Dispatch custom event for dashboard.js to handle
    window.dispatchEvent(new CustomEvent('predictionResult', { detail: result }));
}

// ─── Result History (LocalStorage, privacy-first) ─────────────────────────────

function saveResultToHistory(result) {
    const cfg = window.MDS_CONFIG || {};
    if (!cfg.enableLocalStorage) return;

    try {
        const history = JSON.parse(localStorage.getItem('mds_history') || '[]');
        history.push({
            label: result.label,
            risk_score: result.risk_score,
            confidence: result.confidence,
            timestamp: Date.now(),
        });

        // Keep only last 5 results
        while (history.length > 5) history.shift();

        localStorage.setItem('mds_history', JSON.stringify(history));
    } catch (e) {
        // Silently fail
    }
}

// ─── Reset / Retake ───────────────────────────────────────────────────────────

function resetForm() {
    // Reset form data
    formData.Gender = '';
    formData.Age = 21;
    formData.Degree = '';
    formData['Academic Pressure'] = 3;
    formData['Work Pressure'] = 0;
    formData.CGPA = 7.0;
    formData['Study Satisfaction'] = 3;
    formData['Job Satisfaction'] = 0;
    formData['Sleep Duration'] = '';
    formData['Dietary Habits'] = '';
    formData['Work/Study Hours'] = 6;
    formData['Financial Stress'] = 3;
    formData['Have you ever had suicidal thoughts ?'] = '';
    formData['Family History of Mental Illness'] = '';

    // Reset UI
    document.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
        const key = el.dataset.field;
        if (key && formData[key] !== undefined) {
            el.value = formData[key];
            if (el.type === 'range') {
                const display = document.getElementById(`${el.id}-value`);
                if (display) display.textContent = el.value;
            }
        }
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Show assessment, hide dashboard
    const assessmentSection = document.querySelector('.assessment-section');
    if (assessmentSection) assessmentSection.style.display = '';

    const dashboard = document.getElementById('dashboard-section');
    if (dashboard) dashboard.classList.remove('visible');

    // Reset to step 1
    currentStep = 1;
    showStep(1);
    updateProgressBar();

    // Clear session
    try { localStorage.removeItem('mds_session'); } catch(e) {}

    // Scroll to top of assessment
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) pageHeader.scrollIntoView({ behavior: 'smooth' });
}

/* ── Expose globally ───────────────────────────────────────────────────── */
window.initForm = initForm;
