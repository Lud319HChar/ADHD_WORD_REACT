// ==================== 交互模块 ====================

import { STATE, TRAIN_MODES, WORD_POOLS, WORD_CATEGORIES, WORD_TOPICS, WORD_LEVELS, MULTI_TRANSLATION_WORDS, MANY_TRANSLATION_WORDS } from './constants.js';
import { wordDB } from './wordDB.js';
import { state, currentHistory, updateState, invalidateSession, goPrevWord as stateGoPrevWord, goNextWord as stateGoNextWord } from './state.js';
import { transition, displayWord, showAnswer, addToUnfamiliar, removeFromUnfamiliar, setSpeed, setTrainMode, setWordPool } from './core.js';
import { downloadUnfamiliarWords, importUnfamiliarWords, saveUnfamiliarWords } from './storage.js';

export function handleMobileBtn(action) {
    if (action === 'SPACE') transition('SPACE');
    else if (action === 'K') transition('K');
    else if (action === 'J') transition('J');
    else if (action === 'M') toggleModeSelect();
    else if (action === 'W') toggleHistoryPanel();
    else if (action === 'L') openWordLibrary();
    else if (action === 'U') openUnfamiliarLibrary();
    else if (action === '1' || action === '2' || action === '3' || action === '5') setSpeed(parseInt(action));
}

export function handleKeyDown(e) {
    const key = e.key.toUpperCase();

    if (isWordLibraryOpen()) {
        handleWordLibraryKeys(key, e);
        return;
    }
    if (isUnfamiliarLibraryOpen()) {
        handleUnfamiliarLibraryKeys(key, e);
        return;
    }
    if (state.modeSelectActive) {
        handleModeSelectKeys(key, e);
        return;
    }
    if (state.wordPoolSelectActive) {
        handleWordPoolSelectKeys(key, e);
        return;
    }

    switch (key) {
        case ' ': case 'SPACE': e.preventDefault(); handleSpace(); break;
        case 'K': handleK(); break;
        case 'J': handleJ(); break;
        case 'A': case 'ARROWLEFT': handleA(); break;
        case 'D': case 'ARROWRIGHT': handleD(); break;
        case '1': case '2': case '3': case '5': setSpeed(parseInt(key)); break;
        case 'M': toggleModeSelect(); break;
        case 'W': toggleHistoryPanel(); break;
        case 'L': openWordLibrary(); break;
        case 'U': openUnfamiliarLibrary(); break;
    }
}

function toggleModeSelect() {
    if (state.modeSelectActive) {
        updateState({ modeSelectActive: false });
    } else {
        invalidateSession();
        state.isProcessingInput = false;
        updateState({ modeSelectActive: true, currentState: STATE.IDLE });
    }
}

function handleModeSelectKeys(key, e) {
    e.preventDefault();
    if (key === 'M' || key === 'ESCAPE') {
        updateState({ modeSelectActive: false });
    } else if (key === 'W') {
        updateState({ wordPoolSelectActive: true, modeSelectActive: false });
    } else if (key === ' ' || key === 'SPACE') {
        updateState({ modeSelectActive: false });
        setTrainMode(TRAIN_MODES.AUTO_PLAY);
        state.isProcessingInput = false;
        transition('SPACE');
    } else if (key === 'U') {
        updateState({ modeSelectActive: false });
        setTrainMode(TRAIN_MODES.SPEED_REACT);
        startUnfamiliarTraining();
    } else if (key === 'K') {
        updateState({ modeSelectActive: false });
        setTrainMode(TRAIN_MODES.SPEED_REACT);
    }
}

function handleWordPoolSelectKeys(key, e) {
    e.preventDefault();
    if (key === 'M' || key === 'ESCAPE') {
        updateState({ wordPoolSelectActive: false });
    } else if (key === 'A') {
        cycleWordPool(-1);
    } else if (key === 'D') {
        cycleWordPool(1);
    } else if (key === 'W') {
        updateState({ wordPoolSelectActive: false });
    }
}

const POOL_ORDER = [WORD_POOLS.FULL, WORD_POOLS.SUPER_HF, WORD_POOLS.PHRASES, WORD_POOLS.KEYWORDS];
function cycleWordPool(delta) {
    let idx = POOL_ORDER.indexOf(state.wordPool) + delta;
    if (idx < 0) idx = POOL_ORDER.length - 1;
    if (idx >= POOL_ORDER.length) idx = 0;
    setWordPool(POOL_ORDER[idx]);
}

function handleSpace() {
    if (state.currentState === STATE.IDLE) transition('SPACE');
    else if (state.currentState === STATE.PLAYING) transition('SPACE');
    else if (state.currentState === STATE.WAIT_RESPONSE) transition('SPACE');
    else if (state.currentState === STATE.SHOW_ANSWER) transition('SPACE');
}

function handleK() {
    if (state.trainMode === TRAIN_MODES.AUTO_PLAY && state.currentState !== STATE.IDLE) {
        invalidateSession();
        import('./core.js').then(m => m.skipToNext());
        return;
    }
    if (state.currentState === STATE.PLAYING || state.currentState === STATE.WAIT_RESPONSE) {
        transition('K');
    }
}

function handleJ() {
    if (state.currentState === STATE.SHOW_ANSWER) {
        if (state.currentWord && !state.unfamiliarWords.includes(state.currentWord.id >= 10000 ? state.currentWord.word : state.currentWord.id)) {
            addToUnfamiliar(state.currentWord);
            state.unfamiliarCount++;
        }
        showUnfamiliarIndicator();
        transition('SPACE');
        return;
    }
    if (state.currentState === STATE.PLAYING || state.currentState === STATE.WAIT_RESPONSE) {
        transition('J');
        showUnfamiliarIndicator();
    }
}

function handleA() {
    const wordId = stateGoPrevWord();
    if (wordId) {
        const word = findWordById(wordId);
        if (word) {
            invalidateSession();
            state.isProcessingInput = false;
            updateState({ currentWord: word });
            displayWord(word);
            showAnswer();
        }
    }
    if (isHistoryPanelOpen()) { historyAutoTrack = true; renderHistoryPanel(); }
}

function handleD() {
    const wordId = stateGoNextWord();
    if (wordId) {
        const word = findWordById(wordId);
        if (word) {
            invalidateSession();
            state.isProcessingInput = false;
            updateState({ currentWord: word });
            displayWord(word);
            showAnswer();
        }
    }
    if (isHistoryPanelOpen()) { historyAutoTrack = true; renderHistoryPanel(); }
}

function findWordById(id) {
    return wordDB.find(w => w.id === id);
}

function showUnfamiliarIndicator() {
    const indicator = document.getElementById('unfamiliar-indicator');
    indicator.classList.remove('show-unfamiliar');
    void indicator.offsetWidth;
    indicator.classList.add('show-unfamiliar');
}

function isWordLibraryOpen() {
    return document.getElementById('word-library-modal').style.display === 'block';
}

function isUnfamiliarLibraryOpen() {
    return document.getElementById('unfamiliar-library-modal').style.display === 'block';
}

function isModalOpen() {
    return isWordLibraryOpen() || isUnfamiliarLibraryOpen();
}

function closeAllModals() {
    document.getElementById('word-library-modal').style.display = 'none';
    document.getElementById('unfamiliar-library-modal').style.display = 'none';
}

export function openWordLibrary() {
    document.getElementById('word-library-modal').style.display = 'block';
    renderWordLibrary();
}

export function closeWordLibrary() {
    document.getElementById('word-library-modal').style.display = 'none';
}

export function openUnfamiliarLibrary() {
    document.getElementById('unfamiliar-library-modal').style.display = 'block';
    renderUnfamiliarLibrary();
}

export function closeUnfamiliarLibrary() {
    document.getElementById('unfamiliar-library-modal').style.display = 'none';
}

export function toggleHistoryPanel() {
    const panel = document.getElementById('history-panel');
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) { historyAutoTrack = true; renderHistoryPanel(); }
}

export function filterWords(filterType) { renderWordLibrary(filterType); }

let wordLibCursorIndex = 0;
let wordLibFilteredWords = [];
let wordLibFilterType = 'all';

function handleWordLibraryKeys(key, e) {
    switch (key) {
        case 'ESCAPE': case 'L': closeWordLibrary(); break;
        case 'W': case 'ARROWUP': e.preventDefault(); moveWordLibSelection(-getGridColumns()); break;
        case 'S': case 'ARROWDOWN': e.preventDefault(); moveWordLibSelection(getGridColumns()); break;
        case 'A': case 'ARROWLEFT': e.preventDefault(); moveWordLibSelection(-1); break;
        case 'D': case 'ARROWRIGHT': e.preventDefault(); moveWordLibSelection(1); break;
        case 'J': e.preventDefault(); markSelectedAsUnfamiliar(); break;
        case 'Q': e.preventDefault(); cycleWordLibCategory(-1); break;
        case 'E': e.preventDefault(); cycleWordLibCategory(1); break;
    }
}

function handleUnfamiliarLibraryKeys(key, e) {
    switch (key) {
        case 'ESCAPE': case 'U': closeAllModals(); break;
        case 'L': closeAllModals(); startUnfamiliarTraining(); break;
        case 'W': case 'ARROWUP': e.preventDefault(); moveUnfamiliarLibSelection(-getUnfamiliarGridColumns()); break;
        case 'S': case 'ARROWDOWN': e.preventDefault(); moveUnfamiliarLibSelection(getUnfamiliarGridColumns()); break;
        case 'A': case 'ARROWLEFT': e.preventDefault(); moveUnfamiliarLibSelection(-1); break;
        case 'D': case 'ARROWRIGHT': e.preventDefault(); moveUnfamiliarLibSelection(1); break;
        case 'J': e.preventDefault(); markUnfamiliarSelectedForRemoval(); break;
    }
}

function renderWordLibrary(filterType) {
    const grid = document.getElementById('word-library-grid');
    wordLibFilterType = filterType;
    wordLibFilteredWords = filterWordsList(filterType);
    wordLibCursorIndex = 0;
    grid.innerHTML = wordLibFilteredWords.map((word, i) => `
        <div class="word-card ${getCategoryClass(word.category)} ${MANY_TRANSLATION_WORDS.has(word.word) ? 'word-many-translations' : ''} ${i === 0 ? 'word-lib-selected' : ''}" data-word-id="${word.id}">
            <div class="word">${word.word} ${MULTI_TRANSLATION_WORDS.has(word.word) ? '<span class="multi-badge">多译</span>' : ''}</div>
            <div class="phonetic">${word.phonetic}</div>
            <div class="meaning ${MANY_TRANSLATION_WORDS.has(word.word) ? 'many-translations' : ''}">${word.meaning}</div>
            <div class="example">${word.example}</div>
            <div class="tags"><span class="tag category">${word.category}</span><span class="tag topic">${word.topic}</span><span class="tag level">${word.level}</span></div>
        </div>
    `).join('');
    updateStatsSummary();
}

function filterWordsList(type) {
    const f = {
        'all': () => wordDB, 'noun': () => wordDB.filter(w => w.category === WORD_CATEGORIES.NOUN),
        'verb': () => wordDB.filter(w => w.category === WORD_CATEGORIES.VERB),
        'adjective': () => wordDB.filter(w => w.category === WORD_CATEGORIES.ADJECTIVE),
        'adverb': () => wordDB.filter(w => w.category === WORD_CATEGORIES.ADVERB),
        'preposition': () => wordDB.filter(w => w.category === WORD_CATEGORIES.PREPOSITION),
        'academic': () => wordDB.filter(w => w.topic === WORD_TOPICS.ACADEMIC),
        'daily': () => wordDB.filter(w => w.topic === WORD_TOPICS.DAILY),
        'technology': () => wordDB.filter(w => w.topic === WORD_TOPICS.TECHNOLOGY),
        'economy': () => wordDB.filter(w => w.topic === WORD_TOPICS.ECONOMY),
        'society': () => wordDB.filter(w => w.topic === WORD_TOPICS.SOCIETY),
        'emotion': () => wordDB.filter(w => w.topic === WORD_TOPICS.EMOTION),
        'basic': () => wordDB.filter(w => w.level === WORD_LEVELS.BASIC),
        'intermediate': () => wordDB.filter(w => w.level === WORD_LEVELS.INTERMEDIATE),
        'advanced': () => wordDB.filter(w => w.level === WORD_LEVELS.ADVANCED),
    };
    return (f[type] || f['all'])();
}

function getGridColumns() {
    const grid = document.getElementById('word-library-grid');
    if (!grid || wordLibFilteredWords.length === 0) return 1;
    const cards = grid.querySelectorAll('.word-card');
    if (cards.length < 2) return 1;
    const firstTop = cards[0].getBoundingClientRect().top;
    let cols = 1;
    for (let i = 1; i < cards.length; i++) { if (Math.abs(cards[i].getBoundingClientRect().top - firstTop) < 2) cols++; else break; }
    return cols || 1;
}

function moveWordLibSelection(delta) {
    if (wordLibFilteredWords.length === 0) return;
    wordLibCursorIndex += delta;
    if (wordLibCursorIndex < 0) wordLibCursorIndex = 0;
    if (wordLibCursorIndex >= wordLibFilteredWords.length) wordLibCursorIndex = wordLibFilteredWords.length - 1;
    updateWordLibCursor();
}

function updateWordLibCursor() {
    const grid = document.getElementById('word-library-grid');
    const cards = grid.querySelectorAll('.word-card');
    cards.forEach((card, i) => card.classList.toggle('word-lib-selected', i === wordLibCursorIndex));
    if (cards[wordLibCursorIndex]) cards[wordLibCursorIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function markSelectedAsUnfamiliar() {
    if (wordLibFilteredWords.length === 0) return;
    const word = wordLibFilteredWords[wordLibCursorIndex];
    if (!word) return;
    addToUnfamiliar(word);
    showUnfamiliarIndicator();
}

const WORD_LIB_CATEGORIES = ['all','noun','verb','adjective','adverb','preposition','academic','daily','technology','economy','society','emotion','basic','intermediate','advanced'];
function cycleWordLibCategory(delta) {
    let idx = WORD_LIB_CATEGORIES.indexOf(wordLibFilterType) + delta;
    if (idx < 0) idx = WORD_LIB_CATEGORIES.length - 1;
    if (idx >= WORD_LIB_CATEGORIES.length) idx = 0;
    wordLibFilterType = WORD_LIB_CATEGORIES[idx];
    renderWordLibrary(wordLibFilterType);
    document.querySelectorAll('#category-filters .filter-btn').forEach(b => b.classList.remove('active'));
    const ab = document.querySelector(`#category-filters .filter-btn[onclick*="${wordLibFilterType}"]`);
    if (ab) ab.classList.add('active');
}

let unfLibCursorIndex = 0;
let unfLibFilteredWords = [];

function renderUnfamiliarLibrary() {
    const grid = document.getElementById('unfamiliar-library-grid');
    unfLibFilteredWords = wordDB.filter(w => state.unfamiliarWords.includes(w.id) && w.id < 10000);
    unfLibCursorIndex = 0;
    let html = `<div class="unfamiliar-actions">
        <button class="unfamiliar-action-btn" onclick="handleExportUnfamiliar()">导出不熟词</button>
        <button class="unfamiliar-action-btn" onclick="document.getElementById('import-file').click()">导入不熟词</button>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="handleImportUnfamiliar(this)">
        <span style="color:#888;margin-left:10px;font-size:0.85rem;">L=不熟训练 | WASD=移动 | J=移除</span>
    </div>`;
    html += unfLibFilteredWords.map((word, i) => `
        <div class="unfamiliar-word-card${i === 0 ? ' word-lib-selected' : ''}" data-word-id="${word.id}">
            <div class="unfamiliar-word">${word.word}</div>
            <div class="unfamiliar-phonetic">${word.phonetic}</div>
            <div class="unfamiliar-meaning ${MANY_TRANSLATION_WORDS.has(word.word) ? 'many-translations' : ''}">${word.meaning}</div>
            <div class="unfamiliar-example">${word.example}</div>
            <button class="remove-from-unfamiliar" onclick="removeWordFromUnfamiliar(${word.id})">移除</button>
        </div>
    `).join('');
    grid.innerHTML = html;
}

function getUnfamiliarGridColumns() {
    const grid = document.getElementById('unfamiliar-library-grid');
    if (!grid || unfLibFilteredWords.length === 0) return 1;
    const cards = grid.querySelectorAll('.unfamiliar-word-card');
    if (cards.length < 2) return 1;
    const firstTop = cards[0].getBoundingClientRect().top;
    let cols = 1;
    for (let i = 1; i < cards.length; i++) { if (Math.abs(cards[i].getBoundingClientRect().top - firstTop) < 2) cols++; else break; }
    return cols || 1;
}

function moveUnfamiliarLibSelection(delta) {
    if (unfLibFilteredWords.length === 0) return;
    unfLibCursorIndex += delta;
    if (unfLibCursorIndex < 0) unfLibCursorIndex = 0;
    if (unfLibCursorIndex >= unfLibFilteredWords.length) unfLibCursorIndex = unfLibFilteredWords.length - 1;
    const grid = document.getElementById('unfamiliar-library-grid');
    const cards = grid.querySelectorAll('.unfamiliar-word-card');
    cards.forEach((card, i) => card.classList.toggle('word-lib-selected', i === unfLibCursorIndex));
    if (cards[unfLibCursorIndex]) cards[unfLibCursorIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function markUnfamiliarSelectedForRemoval() {
    if (unfLibFilteredWords.length === 0) return;
    const word = unfLibFilteredWords[unfLibCursorIndex];
    if (!word) return;
    removeFromUnfamiliar(word.id);
    renderUnfamiliarLibrary();
}

function startUnfamiliarTraining() {
    if (state.unfamiliarWords.length === 0) { alert('不熟词库为空'); return; }
    updateState({ trainMode: TRAIN_MODES.SPEED_REACT, currentState: STATE.IDLE });
    invalidateSession();
}

function getCategoryClass(category) {
    const m = { [WORD_CATEGORIES.NOUN]: 'noun', [WORD_CATEGORIES.VERB]: 'verb', [WORD_CATEGORIES.ADJECTIVE]: 'adjective', [WORD_CATEGORIES.ADVERB]: 'adverb', [WORD_CATEGORIES.PREPOSITION]: 'preposition' };
    return m[category] || '';
}

function updateStatsSummary() {
    document.getElementById('total-count').textContent = wordDB.length;
    document.getElementById('noun-count').textContent = wordDB.filter(w => w.category === WORD_CATEGORIES.NOUN).length;
    document.getElementById('verb-count').textContent = wordDB.filter(w => w.category === WORD_CATEGORIES.VERB).length;
    document.getElementById('adj-count').textContent = wordDB.filter(w => w.category === WORD_CATEGORIES.ADJECTIVE).length;
    document.getElementById('adv-count').textContent = wordDB.filter(w => w.category === WORD_CATEGORIES.ADVERB).length;
}

window.handleExportUnfamiliar = function() { downloadUnfamiliarWords(); };
window.handleImportUnfamiliar = function(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const result = importUnfamiliarWords(e.target.result);
            if (result.success) { alert(`导入 ${result.count} 个不熟词`); renderUnfamiliarLibrary(); }
            else alert('导入失败: ' + result.error);
        };
        reader.readAsText(file);
    }
};

let historyAutoTrack = true;
let historyTrackerSetup = false;

function renderHistoryPanel() {
    const scroll = document.getElementById('history-scroll');
    const h = currentHistory();
    const historyWords = h.stack.map(id => findWordByIdSync(id)).filter(Boolean);
    scroll.innerHTML = historyWords.map((word, index) => `
        <div class="history-card ${index === h.pointer ? 'current' : ''}">
            <div class="history-word">${word.word}</div>
            <div class="history-meaning">${word.meaning}</div>
        </div>
    `).join('');
    scrollToHistoryCurrent();
    if (!historyTrackerSetup) { setupHistoryScrollTracker(); historyTrackerSetup = true; }
}

function findWordByIdSync(id) {
    return wordDB.find(w => w.id === id);
}

function isHistoryPanelOpen() {
    return document.getElementById('history-panel').classList.contains('show');
}

function scrollToHistoryCurrent() {
    if (!isHistoryPanelOpen()) return;
    const scroll = document.getElementById('history-scroll');
    const current = scroll.querySelector('.history-card.current');
    if (current) current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function setupHistoryScrollTracker() {
    const scroll = document.getElementById('history-scroll');
    scroll.addEventListener('wheel', () => { historyAutoTrack = false; });
    scroll.addEventListener('touchmove', () => { historyAutoTrack = false; });
}

window.removeWordFromUnfamiliar = function(wordId) { removeFromUnfamiliar(wordId); renderUnfamiliarLibrary(); };
window.addEventListener('word-added', () => { if (isHistoryPanelOpen() && historyAutoTrack) renderHistoryPanel(); });
