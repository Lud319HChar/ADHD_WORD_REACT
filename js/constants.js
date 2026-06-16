// ==================== 常量定义模块 ====================

// 训练模式（M键切换）
export const TRAIN_MODES = {
    SPEED_REACT: 'speed_react',
    AUTO_PLAY: 'auto_play',
    FILL_BLANK: 'fill_blank'
};

// 词库选择（M+W后A/D切换）
export const WORD_POOLS = {
    FULL: 'full',
    SUPER_HF: 'super_hf',
    PHRASES: 'phrases',
    KEYWORDS: 'keywords'
};

// 单词分类
export const WORD_CATEGORIES = {
    NOUN: '名词',
    VERB: '动词',
    ADJECTIVE: '形容词',
    ADVERB: '副词',
    PREPOSITION: '介词',
    OTHER: '其他'
};

// 单词主题
export const WORD_TOPICS = {
    ACADEMIC: '学术',
    DAILY: '生活',
    TECHNOLOGY: '科技',
    ECONOMY: '经济',
    SOCIETY: '社会',
    EMOTION: '情感',
    NATURE: '自然',
    OTHER: '其他'
};

// 单词难度等级
export const WORD_LEVELS = {
    BASIC: '基础',
    INTERMEDIATE: '进阶',
    ADVANCED: '高级'
};

// 系统状态
export const STATE = {
    IDLE: 'IDLE',
    PLAYING: 'PLAYING',
    WAIT_RESPONSE: 'WAIT_RESPONSE',
    SHOW_ANSWER: 'SHOW_ANSWER'
};

// 速度档位配置
export const SPEED_CONFIG = {
    1: { rate: 0.8, gap: 2000 },
    2: { rate: 1.5, gap: 1500 },
    3: { rate: 2.2, gap: 1000 },
    5: { rate: 3.0, gap: 500 }
};

// 音效配置
export const AUDIO_CONFIG = {
    KNOW: { frequency: 880, duration: 0.15, type: 'sine' },
    UNFAMILIAR: { frequency: 220, duration: 0.3, type: 'sawtooth' },
    SHOW_MEANING: { frequency: 440, duration: 0.1, type: 'sine' }
};

// Combo阈值配置
export const COMBO_THRESHOLD = {
    LOW: 0,
    MID: 5,
    HIGH: 10,
    GOD: 20
};

// 多重翻译单词列表（翻译数量 >= 3 的单词）
export const MULTI_TRANSLATION_WORDS = new Set([
    'scratch', 'sketch', 'wit', 'squeeze', 'stir', 'scatter', 'mess', 'greedy',
    'magnificent', 'argument', 'cherish', 'element', 'creation', 'rail', 'twist',
    'accent', 'senior', 'flash', 'orient', 'breed', 'connection', 'circular',
    'toll', 'reclaim', 'bankrupt', 'lease', 'secure', 'gloomy', 'witness',
    'advanced', 'civil', 'sting', 'wander', 'strip', 'original', 'discharge',
    'moral', 'package', 'amount', 'acute', 'tend', 'benefit', 'proportion',
    'liberal', 'project', 'private', 'action', 'index', 'awkward', 'constant',
    'pursue', 'pose', 'yield', 'scan', 'contract', 'shift', 'stem', 'beam',
    'confirm', 'depress', 'bloody', 'atmosphere', 'preserve', 'fertile'
]);

export const MANY_TRANSLATION_WORDS = new Set([
    'beam', 'private', 'project', 'index', 'civil', 'compound', 'tender'
]);

// 中枢面板模式
export const PANELS = {
    TRAINING: 'training',
    WORDS: 'words',
    PHRASES: 'phrases',
    SUPER_HF: 'super-hf',
    KEYWORDS: 'keywords',
    SEARCH: 'search'
};

// 特高频单词
export const SUPER_HF_WORDS = new Set([
    'economic', 'environment', 'culture', 'technology', 'global',
    'significant', 'individual', 'professional', 'financial', 'traditional',
    'corporation', 'investment', 'particular', 'available', 'establish',
    'influence', 'community', 'opportunity', 'potential', 'responsible',
    'authority', 'philosophy', 'psychology', 'independent', 'effective',
    'strategy', 'campaign', 'resource', 'maintain', 'identify',
    'specific', 'challenge', 'principle', 'context', 'function',
    'perspective', 'influence', 'complex', 'concept', 'structure',
    'approach', 'factor', 'feature', 'element', 'aspect',
    'involve', 'generate', 'reveal', 'display', 'illustrate'
]);
