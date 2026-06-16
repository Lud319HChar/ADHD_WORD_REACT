// ==================== 音频模块 ====================

import { AUDIO_CONFIG } from './constants.js';
import { state } from './state.js';

let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

export function playAudio(frequency, duration, type) {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
}

export function playKnowSound() {
    playAudio(AUDIO_CONFIG.KNOW.frequency, AUDIO_CONFIG.KNOW.duration, AUDIO_CONFIG.KNOW.type);
}

export function playUnfamiliarSound() {
    playAudio(AUDIO_CONFIG.UNFAMILIAR.frequency, AUDIO_CONFIG.UNFAMILIAR.duration, AUDIO_CONFIG.UNFAMILIAR.type);
}

export function playShowMeaningSound() {
    playAudio(AUDIO_CONFIG.SHOW_MEANING.frequency, AUDIO_CONFIG.SHOW_MEANING.duration, AUDIO_CONFIG.SHOW_MEANING.type);
}

export function speakWord(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    }
}

export function speakWordAsync(text, lang, rate = 1) {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            resolve({ status: "not_supported" });
            return;
        }
        
        const capturedSessionID = state.playSessionID;
        
        window.globalAudioGarbageCollectorBucket = null;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        
        window.globalAudioGarbageCollectorBucket = utterance;
        
        utterance.onend = (event) => {
            if (state.playSessionID !== capturedSessionID) {
                resolve({ status: "aborted" });
                return;
            }
            resolve({ status: "success" });
        };
        
        utterance.onerror = (event) => {
            console.warn("TTS Service Exception intercepted:", event.error);
            resolve({ status: "error" });
        };
        
        window.speechSynthesis.speak(utterance);
    });
}