// ==================== 搜索模块 ====================

import { wordDB } from './wordDB.js';
import { phraseDB } from './phraseDB.js';
import { keywordsDB } from './keywordsDB.js';

export function searchWords(query) {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();

    return wordDB
        .filter(word =>
            word.word.toLowerCase().includes(q) ||
            word.meaning.includes(q) ||
            word.phonetic.toLowerCase().includes(q) ||
            word.example.toLowerCase().includes(q)
        )
        .slice(0, 50);
}

export function searchPhrases(query) {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();

    return phraseDB
        .filter(phrase =>
            phrase.phrase.toLowerCase().includes(q) ||
            phrase.meaning.includes(q) ||
            phrase.example.toLowerCase().includes(q)
        )
        .slice(0, 30);
}

export function searchKeywords(query) {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();

    return keywordsDB
        .filter(kw =>
            kw.keyword.includes(q) ||
            kw.english.toLowerCase().includes(q) ||
            kw.description.includes(q)
        )
        .slice(0, 10);
}

export function getSuggestions(query) {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();

    const wordMatches = wordDB
        .filter(w => w.word.toLowerCase().includes(q))
        .slice(0, 5)
        .map(w => ({ type: 'word', text: w.word, subtext: w.meaning }));

    const phraseMatches = phraseDB
        .filter(p => p.phrase.toLowerCase().includes(q))
        .slice(0, 3)
        .map(p => ({ type: 'phrase', text: p.phrase, subtext: p.meaning }));

    return [...wordMatches, ...phraseMatches].slice(0, 8);
}

export function renderSearchResults(query, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const wordResults = searchWords(query);
    const phraseResults = searchPhrases(query);

    if (wordResults.length === 0 && phraseResults.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">未找到匹配结果</div>';
        return;
    }

    let html = '';

    if (phraseResults.length > 0) {
        html += '<div class="search-section-title">📝 短语匹配</div>';
        html += '<div class="search-results-grid">';
        html += phraseResults.map(p => `
            <div class="search-card phrase-card">
                <div class="search-card-word">${p.phrase}</div>
                <div class="search-card-meaning">${p.meaning}</div>
                <div class="search-card-example">${p.example}</div>
                <span class="search-card-tag">${p.category}</span>
            </div>
        `).join('');
        html += '</div>';
    }

    if (wordResults.length > 0) {
        html += '<div class="search-section-title">📖 单词匹配</div>';
        html += '<div class="search-results-grid">';
        html += wordResults.map(w => `
            <div class="search-card word-card">
                <div class="search-card-word">${w.word} <span class="search-card-phonetic">${w.phonetic}</span></div>
                <div class="search-card-meaning">${w.meaning}</div>
                <div class="search-card-example">${w.example}</div>
                <div class="tags">
                    <span class="tag category">${w.category}</span>
                    <span class="tag topic">${w.topic}</span>
                    <span class="tag level">${w.level}</span>
                </div>
            </div>
        `).join('');
        html += '</div>';
    }

    container.innerHTML = html;
}
