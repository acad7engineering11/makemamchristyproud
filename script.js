document.addEventListener('DOMContentLoaded', initApp);

const state = { questions: [], currentIndex: 0, answers: {}, mode: null, quizMeta: {}, isFinished: false };
const els = {
    views: document.querySelectorAll('.view'),
    errorMsg: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    quizTitle: document.getElementById('quiz-title'),
    quizDesc: document.getElementById('quiz-desc'),
    quizAuthor: document.getElementById('quiz-author'),
    quizCount: document.getElementById('quiz-count'),
    modeInputs: document.querySelectorAll('input[name="mode"]'),
    startBtn: document.getElementById('start-btn'),
    resumeBtn: document.getElementById('resume-btn'),
    exitBtn: document.getElementById('exit-btn'), // NEW
    progressText: document.getElementById('progress-text'),
    progressFill: document.getElementById('progress-fill'),
    categoryTag: document.getElementById('category-tag'),
    questionText: document.getElementById('question-text'),
    optsContainer: document.getElementById('options-container'),
    expBox: document.getElementById('explanation-box'),
    expText: document.getElementById('explanation-text'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    finalScore: document.getElementById('final-score'),
    scoreText: document.getElementById('score-text'),
    catBreakdown: document.getElementById('category-breakdown'),
    reviewBtn: document.getElementById('review-btn'),
    restartBtn: document.getElementById('restart-btn'),
    reviewList: document.getElementById('review-list')
};

function initApp() {
    loadData();
    els.retryBtn.onclick = loadData;
    els.startBtn.onclick = startQuiz;
    els.resumeBtn.onclick = resumeQuiz;
    els.nextBtn.onclick = () => nav(1);
    els.prevBtn.onclick = () => nav(-1);
    els.submitBtn.onclick = finishQuiz;
    // NEW: Exit Button Logic
    els.exitBtn.onclick = () => {
        saveProgress(); 
        setupStart();
    };
    els.reviewBtn.onclick = () => {
        els.reviewList.classList.toggle('hidden');
        els.reviewBtn.textContent = els.reviewList.classList.contains('hidden') ? 'Review Answers' : 'Hide Review';
    };
    els.restartBtn.onclick = () => { localStorage.removeItem('quizProgress'); location.reload(); };
    els.modeInputs.forEach(i => i.addEventListener('change', (e) => {
        state.mode = e.target.value;
        localStorage.setItem('quizModePref', state.mode);
    }));
}

async function loadData() {
    showView('loading-view');
    try {
        const res = await fetch('./data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.questions || !Array.isArray(data.questions)) throw new Error('Invalid JSON format');
        state.questions = data.questions;
        state.quizMeta = { title: data.quizTitle, desc: data.quizDescription, author: data.quizAuthor };
        setupStart();
    } catch (e) {
        els.errorMsg.textContent = e.message;
        showView('error-view');
    }
}

function showView(id) {
    els.views.forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function setupStart() {
    els.quizTitle.textContent = state.quizMeta.title;
    els.quizDesc.textContent = state.quizMeta.desc;
    els.quizAuthor.textContent = state.quizMeta.author;
    els.quizCount.textContent = `${state.questions.length} Questions`;
    const savedMode = localStorage.getItem('quizModePref');
    if (savedMode) {
        state.mode = savedMode;
        const input = document.querySelector(`input[value="${savedMode}"]`);
        if (input) input.checked = true;
    }
    const prog = localStorage.getItem('quizProgress');
    if (prog) {
        const p = JSON.parse(prog);
        if (p.total === state.questions.length) els.resumeBtn.classList.remove('hidden');
    }
    showView('start-view');
}

function startQuiz() {
    if (!state.mode) return alert("Select a mode.");
    state.currentIndex = 0; state.answers = {}; state.isFinished = false;
    renderQ(); showView('quiz-view');
}

function resumeQuiz() {
    const s = JSON.parse(localStorage.getItem('quizProgress'));
    state.currentIndex = s.index; state.answers = s.answers; state.mode = s.mode;
    renderQ(); showView('quiz-view');
}

function saveProgress() {
    localStorage.setItem('quizProgress', JSON.stringify({ index: state.currentIndex, answers: state.answers, mode: state.mode, total: state.questions.length }));
}

function renderQ() {
    const q = state.questions[state.currentIndex];
    const answered = state.answers.hasOwnProperty(state.currentIndex);
    els.progressText.textContent = `Question ${state.currentIndex + 1}/${state.questions.length}`;
    els.categoryTag.textContent = q.cat || 'General';
    els.progressFill.style.width = `${((state.currentIndex)/state.questions.length)*100}%`;
    els.questionText.textContent = q.q;
    els.optsContainer.innerHTML = '';
    els.expBox.classList.add('hidden');

    q.a.forEach((txt, i) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.textContent = `${['A','B','C','D'][i]}. ${txt}`;
        btn.onclick = () => handleAns(i, btn);
        if (answered) {
            styleBtn(btn, i, q.c, state.answers[state.currentIndex]);
            if (state.mode === 'A') btn.onclick = null;
        }
        els.optsContainer.appendChild(btn);
    });

    if (state.mode === 'A' && answered) {
        els.expText.textContent = q.e;
        els.expBox.classList.remove('hidden');
    }
    updateNav();
}

function handleAns(idx, btn) {
    if (state.mode === 'A' && state.answers.hasOwnProperty(state.currentIndex)) return;
    state.answers[state.currentIndex] = idx;
    saveProgress();
    
    Array.from(els.optsContainer.children).forEach((b, i) => {
        styleBtn(b, i, state.questions[state.currentIndex].c, idx);
        if (state.mode === 'A') b.onclick = null;
    });

    if (state.mode === 'A') {
        els.expText.textContent = state.questions[state.currentIndex].e;
        els.expBox.classList.remove('hidden');
    }
}

function styleBtn(btn, i, cor, sel) {
    btn.className = 'option-btn';
    if (state.mode === 'A') {
        if (i === cor) btn.classList.add('correct');
        else if (i === sel) btn.classList.add('wrong');
        else btn.classList.add('disabled-opt');
    } else if (i === sel) btn.classList.add('selected');
}

function updateNav() {
    els.prevBtn.disabled = state.currentIndex === 0;
    els.nextBtn.classList.toggle('hidden', state.currentIndex === state.questions.length - 1);
    els.submitBtn.classList.toggle('hidden', state.currentIndex !== state.questions.length - 1);
}

function nav(dir) { state.currentIndex += dir; renderQ(); }

function finishQuiz() {
    const len = state.questions.length;
    if (Object.keys(state.answers).length < len && !confirm(`Unanswered questions remain. Submit?`)) return;
    state.isFinished = true;
    localStorage.removeItem('quizProgress');
    
    let score = 0;
    const cats = {};
    state.questions.forEach((q, i) => {
        const ok = state.answers[i] === q.c;
        if (ok) score++;
        if (!cats[q.cat]) cats[q.cat] = { t: 0, c: 0 };
        cats[q.cat].t++;
        if (ok) cats[q.cat].c++;
    });

    els.finalScore.textContent = `${Math.round((score/len)*100)}%`;
    els.scoreText.textContent = `${score}/${len} Correct`;
    els.catBreakdown.innerHTML = '<h3>Category Stats</h3>' + Object.entries(cats).map(([k, v]) => 
        `<div class="cat-row"><span>${k}</span><span>${v.c}/${v.t}</span></div>`).join('');
    
    els.reviewList.innerHTML = state.questions.map((q, i) => {
        const u = state.answers[i];
        const ok = u === q.c;
        return `<div class="review-item"><span class="review-status ${ok?'correct':'wrong'}">Q${i+1}: ${ok?'Correct':'Incorrect'}</span>
        <span class="review-q">${q.q}</span><p><b>You:</b> ${u!==undefined?q.a[u]:'Skipped'}</p>
        <p><b>Correct:</b> ${q.a[q.c]}</p><div class="explanation">${q.e}</div></div>`;
    }).join('');
    
    showView('results-view');
}
