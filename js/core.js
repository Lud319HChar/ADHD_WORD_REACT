// ==================== 核心引擎模块 ====================

import { STATE, TRAIN_MODES, WORD_POOLS, SPEED_CONFIG, SUPER_HF_WORDS } from './constants.js';
import { wordDB } from './wordDB.js';
import { phraseDB } from './phraseDB.js';
import { keywordsDB } from './keywordsDB.js';
import { state, updateState, invalidateSession, safeScheduleTimer, clearAllTimers, updateCombo, getNextState, addToHistory as stateAddToHistory } from './state.js';
import { speakWordAsync, playKnowSound, playUnfamiliarSound, playShowMeaningSound } from './audio.js';
import { saveProgress, saveUnfamiliarWords } from './storage.js';

export function transition(event) {
    if (state.isProcessingInput && event !== 'SPACE') return;
    const nextState = getNextState(state.currentState, event);
    if (state.currentState === nextState && event !== 'NEXT_WORD') return;
    state.isProcessingInput = true;
    const previousState = state.currentState;
    invalidateSession();
    switch (nextState) {
        case STATE.IDLE: handleIdleState(); break;
        case STATE.PLAYING: handlePlayingState(event, previousState); break;
        case STATE.WAIT_RESPONSE: handleWaitResponseState(event); break;
        case STATE.SHOW_ANSWER: handleShowAnswerState(event); break;
    }
    updateState({ currentState: nextState });
}

function handleIdleState() {
    clearAllTimers();
    document.getElementById('start-hint').style.display = 'block';
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('phonetic-display').style.display = 'none';
    document.getElementById('meaning-display').classList.remove('show-meaning');
    document.getElementById('example-display').classList.remove('show-meaning');
    state.isProcessingInput = false;
}

function handlePlayingState(event, previousState) {
    document.getElementById('start-hint').style.display = 'none';
    if (previousState === STATE.WAIT_RESPONSE) {
        playKnowSound();
        updateMastery(state.currentWord, true);
        updateCombo(state.combo + 1);
        nextWord();
    } else if (previousState === STATE.SHOW_ANSWER && state.trainMode === TRAIN_MODES.AUTO_PLAY) {
        nextWord();
    } else {
        const word = getRandomWord();
        if (!word) { state.isProcessingInput = false; return; }
        updateState({ currentWord: word });
        displayWord(word);
        stateAddToHistory(word.id);
        state.todayCount++;
        if (state.trainMode === TRAIN_MODES.AUTO_PLAY) {
            speakAndAutoShow(word);
        } else if (state.currentSpeed !== 5) {
            speakWordAsync(word.word, 'en-US', SPEED_CONFIG[state.currentSpeed].rate).then(() => {
                if (state.currentState === STATE.PLAYING) transition('SPEAK_END');
            });
        } else {
            safeScheduleTimer(() => { if (state.currentState === STATE.PLAYING) transition('SPEAK_END'); }, SPEED_CONFIG[state.currentSpeed].gap);
        }
    }
    state.isProcessingInput = false;
}

function speakAndAutoShow(word) {
    const cfg = SPEED_CONFIG[state.currentSpeed] || SPEED_CONFIG[1];
    speakWordAsync(word.word, 'en-US', cfg.rate).then(() => {
        if (state.currentState !== STATE.PLAYING) return;
        showAnswer();
        playShowMeaningSound();
        updateState({ currentState: STATE.SHOW_ANSWER });
        safeScheduleTimer(() => {
            if (state.currentState === STATE.SHOW_ANSWER) transition('NEXT_WORD');
        }, cfg.gap);
    });
}

function nextWord() {
    safeScheduleTimer(() => {
        const word = getRandomWord();
        if (word && state.currentState === STATE.PLAYING) {
            updateState({ currentWord: word });
            displayWord(word);
            stateAddToHistory(word.id);
            state.todayCount++;
            if (state.trainMode === TRAIN_MODES.AUTO_PLAY) {
                speakAndAutoShow(word);
            } else if (state.currentSpeed !== 5) {
                speakWordAsync(word.word, 'en-US', SPEED_CONFIG[state.currentSpeed].rate).then(() => {
                    if (state.currentState === STATE.PLAYING) transition('SPEAK_END');
                });
            } else {
                safeScheduleTimer(() => { if (state.currentState === STATE.PLAYING) transition('SPEAK_END'); }, SPEED_CONFIG[state.currentSpeed].gap);
            }
        }
    }, (state.trainMode === TRAIN_MODES.AUTO_PLAY ? 200 : 200 / state.currentSpeed));
}

function handleWaitResponseState(event) {
    showAnswer();
    playShowMeaningSound();
    state.isProcessingInput = false;
}

function handleShowAnswerState(event) {
    if (event === 'J') {
        playUnfamiliarSound();
        updateMastery(state.currentWord, false);
        updateCombo(0);
        addToUnfamiliar(state.currentWord);
        state.unfamiliarCount++;
    }
    showAnswer();
    playShowMeaningSound();
    state.isProcessingInput = false;
    const gap = SPEED_CONFIG[state.currentSpeed].gap;
    safeScheduleTimer(() => {
        if (state.currentState === STATE.SHOW_ANSWER) transition('NEXT_WORD');
    }, gap);
}

export function getRandomWord() {
    let pool;
    if (state.wordPool === WORD_POOLS.SUPER_HF) {
        pool = wordDB.filter(w => SUPER_HF_WORDS.has(w.word));
    } else if (state.wordPool === WORD_POOLS.PHRASES) {
        pool = phraseDB.map((p, i) => ({ id: i + 10000, word: p.phrase, phonetic: '', meaning: p.meaning, example: p.example, category: p.category, topic: '', level: '', masteryScore: 0, appearCount: 0, lastSeenTimeStamp: 0, nextReviewTime: 0 }));
    } else if (state.wordPool === WORD_POOLS.KEYWORDS) {
        const kwWordIds = new Set();
        keywordsDB.forEach(kw => kw.wordIds.forEach(id => kwWordIds.add(id)));
        pool = wordDB.filter(w => kwWordIds.has(w.id));
    } else {
        pool = wordDB;
    }
    if (pool.length === 0) pool = wordDB;

    const availableWords = pool.filter(word => !state.recentWordsWindow.includes(word.id) && Date.now() >= word.nextReviewTime);
    if (availableWords.length === 0) return pool[Math.floor(Math.random() * pool.length)];

    const totalWeight = availableWords.reduce((sum, word) => {
        const baseWeight = Math.max(1, 11 - (word.masteryScore || 0));
        const timeFactor = 1 + (Date.now() - (word.lastSeenTimeStamp || 0)) / (3600000 * 24);
        return sum + baseWeight * timeFactor;
    }, 0);

    let random = Math.random() * totalWeight;
    for (const word of availableWords) {
        const baseWeight = Math.max(1, 11 - (word.masteryScore || 0));
        const timeFactor = 1 + (Date.now() - (word.lastSeenTimeStamp || 0)) / (3600000 * 24);
        random -= baseWeight * timeFactor;
        if (random <= 0) {
            state.recentWordsWindow.push(word.id);
            if (state.recentWordsWindow.length > state.recentWordsWindowSize) state.recentWordsWindow.shift();
            return word;
        }
    }
    return availableWords[0];
}

export function displayWord(word) {
    document.getElementById('word-display').textContent = word.word;
    document.getElementById('word-display').style.display = 'block';
    document.getElementById('phonetic-display').textContent = word.phonetic || '';
    document.getElementById('phonetic-display').style.display = 'block';
    document.getElementById('meaning-display').classList.remove('show-meaning');
    document.getElementById('example-display').classList.remove('show-meaning');
}

export function showAnswer() {
    if (!state.currentWord) return;
    document.getElementById('meaning-display').textContent = state.currentWord.meaning;
    document.getElementById('meaning-display').classList.add('show-meaning');
    document.getElementById('example-display').textContent = state.currentWord.example || '';
    document.getElementById('example-display').classList.add('show-meaning');
}

function updateMastery(word, success) {
    if (!word || word.id >= 10000) return;
    const targetWord = wordDB.find(w => w.id === word.id);
    if (!targetWord) return;
    if (success) {
        targetWord.masteryScore = Math.min(10, targetWord.masteryScore + 1);
        targetWord.nextReviewTime = Date.now() + targetWord.masteryScore * 30 * 60 * 1000;
        state.knowCount++;
    } else {
        targetWord.masteryScore = Math.max(-10, targetWord.masteryScore - 2);
        targetWord.nextReviewTime = Date.now() + 90 * 1000;
        state.unfamiliarCount++;
    }
    targetWord.appearCount++;
    targetWord.lastSeenTimeStamp = Date.now();
    updateState({ currentWord: { ...targetWord } });
    saveProgress();
}

export function addToUnfamiliar(word) {
    const id = word.id >= 10000 ? word.word : word.id;
    if (!state.unfamiliarWords.includes(id)) {
        state.unfamiliarWords.push(id);
        saveUnfamiliarWords();
    }
}

export function removeFromUnfamiliar(wordId) {
    state.unfamiliarWords = state.unfamiliarWords.filter(id => id !== wordId);
    saveUnfamiliarWords();
}

export function skipToNext() {
    const word = getRandomWord();
    if (!word) return;
    updateState({ currentWord: word, currentState: STATE.PLAYING });
    displayWord(word);
    stateAddToHistory(word.id);
    state.todayCount++;
    if (state.trainMode === TRAIN_MODES.AUTO_PLAY) {
        speakAndAutoShow(word);
    } else {
        if (state.currentSpeed !== 5) {
            speakWordAsync(word.word, 'en-US', SPEED_CONFIG[state.currentSpeed].rate).then(() => {
                if (state.currentState === STATE.PLAYING) transition('SPEAK_END');
            });
        } else {
            safeScheduleTimer(() => { if (state.currentState === STATE.PLAYING) transition('SPEAK_END'); }, SPEED_CONFIG[state.currentSpeed].gap);
        }
    }
}

export function setSpeed(speed) {
    if (SPEED_CONFIG[speed]) {
        updateState({ currentSpeed: speed });
        invalidateSession();
        if (state.currentState === STATE.PLAYING) {
            handlePlayingState('SPEED_CHANGE', STATE.PLAYING);
        }
    }
}

export function setTrainMode(mode) {
    updateState({ trainMode: mode, modeSelectActive: false, wordPoolSelectActive: false });
    invalidateSession();
}

export function setWordPool(pool) {
    updateState({ wordPool: pool });
}
