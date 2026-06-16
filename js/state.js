// ==================== 状态管理模块 ====================

import { STATE, TRAIN_MODES, WORD_POOLS, COMBO_THRESHOLD } from './constants.js';

function newHistory() {
    return { stack: [], pointer: -1 };
}

export let state = {
    currentState: STATE.IDLE,
    trainMode: TRAIN_MODES.SPEED_REACT,
    wordPool: WORD_POOLS.FULL,
    modeSelectActive: false,
    wordPoolSelectActive: false,
    currentSpeed: 1,
    currentWord: null,
    todayCount: 0,
    knowCount: 0,
    unfamiliarCount: 0,
    combo: 0,
    maxCombo: 0,
    playSessionID: 0,
    isProcessingInput: false,
    activeTimersPool: [],
    unfamiliarWords: [],
    recentWordsWindow: [],
    recentWordsWindowSize: 20,
    historyByMode: {
        [TRAIN_MODES.SPEED_REACT]: newHistory(),
        [TRAIN_MODES.AUTO_PLAY]: newHistory(),
        [TRAIN_MODES.FILL_BLANK]: newHistory()
    }
};

const HISTORY_MAX = 16;
const poolNames = {
    [WORD_POOLS.FULL]: '全库', [WORD_POOLS.SUPER_HF]: '特高频',
    [WORD_POOLS.PHRASES]: '短语', [WORD_POOLS.KEYWORDS]: '关键词'
};

export function currentHistory() {
    return state.historyByMode[state.trainMode];
}

export function addToHistory(wordId) {
    const h = currentHistory();
    if (h.pointer === h.stack.length - 1) {
        h.stack.push(wordId);
        if (h.stack.length > HISTORY_MAX) h.stack.shift();
        h.pointer = h.stack.length - 1;
    } else {
        h.stack = h.stack.slice(0, h.pointer + 1);
        h.stack.push(wordId);
        if (h.stack.length > HISTORY_MAX) h.stack = h.stack.slice(-HISTORY_MAX);
        h.pointer = h.stack.length - 1;
    }
    window.dispatchEvent(new CustomEvent('word-added'));
}

export function goPrevWord() {
    const h = currentHistory();
    if (h.pointer > 0) { h.pointer--; return h.stack[h.pointer]; }
    return null;
}

export function goNextWord() {
    const h = currentHistory();
    if (h.pointer < h.stack.length - 1) { h.pointer++; return h.stack[h.pointer]; }
    return null;
}

export function getNextState(currentState, event) {
    const transitions = {
        [STATE.IDLE]: { 'SPACE': STATE.PLAYING, 'PLAY': STATE.PLAYING },
        [STATE.PLAYING]: { 'SPACE': STATE.IDLE, 'PAUSE': STATE.IDLE, 'K': STATE.WAIT_RESPONSE, 'J': STATE.SHOW_ANSWER, 'SPEAK_END': STATE.WAIT_RESPONSE },
        [STATE.WAIT_RESPONSE]: { 'SPACE': STATE.PLAYING, 'K': STATE.PLAYING, 'J': STATE.SHOW_ANSWER },
        [STATE.SHOW_ANSWER]: { 'SPACE': STATE.PLAYING, 'K': STATE.PLAYING, 'J': STATE.PLAYING, 'NEXT_WORD': STATE.PLAYING }
    };
    return transitions[currentState]?.[event] || currentState;
}

export function updateState(newState) {
    state = { ...state, ...newState };
    updateUI();
}

export function invalidateSession() {
    state.playSessionID++;
    clearAllTimers();
    try { window.speechSynthesis.cancel(); } catch(e) {}
}

export function safeScheduleTimer(callback, delay) {
    const timerId = setTimeout(() => {
        state.activeTimersPool = state.activeTimersPool.filter(id => id !== timerId);
        callback();
    }, delay);
    state.activeTimersPool.push(timerId);
}

export function clearAllTimers() {
    state.activeTimersPool.forEach(timerId => clearTimeout(timerId));
    state.activeTimersPool = [];
}

export function updateCombo(newCombo) {
    state.combo = newCombo;
    if (newCombo > state.maxCombo) state.maxCombo = newCombo;
    updateComboDisplay();
}

function updateComboDisplay() {
    const el = document.getElementById('combo-container');
    if (!el) return;
    el.textContent = 'COMBO ' + state.combo;
    el.className = getComboClass(state.combo);
    if (state.combo >= COMBO_THRESHOLD.GOD) document.body.classList.add('god-mode-border');
    else document.body.classList.remove('god-mode-border');
}

function getComboClass(combo) {
    if (combo >= COMBO_THRESHOLD.GOD) return 'combo-god';
    if (combo >= COMBO_THRESHOLD.HIGH) return 'combo-high';
    if (combo >= COMBO_THRESHOLD.MID) return 'combo-mid';
    return 'combo-low';
}

function updateUI() {
    const statusEl = document.getElementById('status-indicator');
    const modeEl = document.getElementById('mode-speed-indicator');
    const statsEl = document.getElementById('stats-board');
    const hintEl = document.getElementById('start-hint');
    if (statusEl) {
        statusEl.textContent = state.modeSelectActive ? 'MODE_SEL' : state.wordPoolSelectActive ? 'POOL_SEL' : state.currentState;
        statusEl.className = state.currentState === STATE.IDLE && !state.modeSelectActive && !state.wordPoolSelectActive ? '' : 'active-status';
    }
    if (modeEl) {
        if (state.modeSelectActive) {
            modeEl.textContent = 'Space=自动播放 | W=选词库 | K=极速反应 | U=不熟训练 | M/ESC=返回';
        } else if (state.wordPoolSelectActive) {
            modeEl.textContent = '当前: ' + (poolNames[state.wordPool] || state.wordPool) + ' | A/D=切换词库 | W=返回 | M=退出';
        } else {
            modeEl.textContent = state.trainMode + ' | ' + (poolNames[state.wordPool] || state.wordPool) + ' | ' + state.currentSpeed + 'X';
        }
    }
    if (hintEl) {
        if (state.modeSelectActive) {
            hintEl.textContent = 'Space=自动播放 | W=选词库 | K=极速反应 | U=不熟训练';
            hintEl.style.display = 'block';
        } else if (state.wordPoolSelectActive) {
            hintEl.textContent = 'A/D=切换词库 [当前: ' + (poolNames[state.wordPool] || state.wordPool) + '] | W=确定';
            hintEl.style.display = 'block';
        } else {
            hintEl.style.display = 'none';
        }
    }
    if (statsEl) {
        statsEl.textContent = '今日: ' + state.todayCount + ' | 知道: ' + state.knowCount + ' | 不熟: ' + state.unfamiliarCount;
    }
}
