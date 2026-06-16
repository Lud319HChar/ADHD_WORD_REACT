// ==================== 持久化模块 ====================

import { wordDB } from './wordDB.js';
import { state } from './state.js';

const STORAGE_KEY_PROGRESS = 'adhd-word-progress';
const STORAGE_KEY_UNFAMILIAR = 'adhd-unfamiliar-words';

let saveTimeout = null;

export function saveProgress() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const progressData = wordDB.map(word => ({
            id: word.id,
            masteryScore: word.masteryScore,
            appearCount: word.appearCount,
            lastSeenTimeStamp: word.lastSeenTimeStamp,
            nextReviewTime: word.nextReviewTime
        }));
        localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progressData));
        saveTimeout = null;
    }, 3000);
}

export function loadProgress() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_PROGRESS);
        if (stored) {
            const progressData = JSON.parse(stored);
            progressData.forEach(progress => {
                const word = wordDB.find(w => w.id === progress.id);
                if (word) {
                    word.masteryScore = progress.masteryScore;
                    word.appearCount = progress.appearCount;
                    word.lastSeenTimeStamp = progress.lastSeenTimeStamp;
                    word.nextReviewTime = progress.nextReviewTime;
                }
            });
        }
    } catch (e) {
        console.warn('Failed to load progress:', e);
    }
}

export function saveUnfamiliarWords() {
    localStorage.setItem(STORAGE_KEY_UNFAMILIAR, JSON.stringify(state.unfamiliarWords));
}

export function loadUnfamiliarWords() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_UNFAMILIAR);
        if (stored) {
            state.unfamiliarWords = JSON.parse(stored);
            state.unfamiliarCount = state.unfamiliarWords.length;
        }
    } catch (e) {
        console.warn('Failed to load unfamiliar words:', e);
    }
}

export function clearAllData() {
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
    localStorage.removeItem(STORAGE_KEY_UNFAMILIAR);
    wordDB.forEach(word => {
        word.masteryScore = 0;
        word.appearCount = 0;
        word.lastSeenTimeStamp = 0;
        word.nextReviewTime = 0;
    });
    state.unfamiliarWords = [];
    state.todayCount = 0;
    state.knowCount = 0;
    state.unfamiliarCount = 0;
    state.combo = 0;
}

export function exportUnfamiliarWords() {
    return JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        unfamiliarWordIds: state.unfamiliarWords,
        wordCount: state.unfamiliarWords.length
    }, null, 2);
}

export function importUnfamiliarWords(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.unfamiliarWordIds && Array.isArray(data.unfamiliarWordIds)) {
            state.unfamiliarWords = [...new Set([...state.unfamiliarWords, ...data.unfamiliarWordIds])];
            saveUnfamiliarWords();
            return { success: true, count: data.unfamiliarWordIds.length };
        }
        return { success: false, error: 'Invalid format' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export function downloadUnfamiliarWords() {
    const data = exportUnfamiliarWords();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unfamiliar-words-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
}
