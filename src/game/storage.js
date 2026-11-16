import { GAME_MODES, STORAGE_KEYS, THEMES } from './constants.js';
import { validateSavedGameState } from './logic.js';

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  hapticsEnabled: true,
  theme: 'classic',
};

const DEFAULT_BEST_SCORES = {
  classic: 0,
  bomb: 0,
  blitz: 0,
  adventure: 0,
};

const DEFAULT_STATS = {
  gamesPlayed: 0,
  totalLinesCleared: 0,
  maxCombo: 0,
  highestAdventureLevel: 1,
};

let memorySettings = { ...DEFAULT_SETTINGS };
let memoryBestScores = { ...DEFAULT_BEST_SCORES };
let memoryStats = { ...DEFAULT_STATS };
let memorySaves = {};

function safeGetItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore restricted storage errors
  }
}

function readJson(key) {
  const raw = safeGetItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadSettings() {
  const parsed = readJson(STORAGE_KEYS.SETTINGS);
  if (!parsed || typeof parsed !== 'object') {
    return { ...memorySettings };
  }
  const clean = {
    soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    hapticsEnabled: typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : true,
    theme: typeof parsed.theme === 'string' && THEMES[parsed.theme] ? parsed.theme : 'classic',
  };
  memorySettings = clean;
  return { ...clean };
}

export function saveSettings(settings) {
  const clean = {
    soundEnabled: Boolean(settings.soundEnabled),
    hapticsEnabled: Boolean(settings.hapticsEnabled),
    theme: THEMES[settings.theme] ? settings.theme : 'classic',
  };
  memorySettings = clean;
  safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(clean));
}

export function loadBestScores() {
  const parsed = readJson(STORAGE_KEYS.BEST_SCORES);
  const scores = { ...DEFAULT_BEST_SCORES, ...memoryBestScores };

  if (parsed && typeof parsed === 'object') {
    for (const modeId of Object.keys(GAME_MODES)) {
      if (Number.isInteger(parsed[modeId]) && parsed[modeId] >= 0) {
        scores[modeId] = parsed[modeId];
      }
    }
  }

  // Migrate legacy single-mode classic best score
  const legacyRaw = safeGetItem(STORAGE_KEYS.LEGACY_BEST_SCORE);
  const legacyParsed = Number.parseInt(legacyRaw || '0', 10);
  if (!Number.isNaN(legacyParsed) && legacyParsed > scores.classic) {
    scores.classic = legacyParsed;
  }

  memoryBestScores = scores;
  return { ...scores };
}

export function updateBestScore(modeId, score) {
  const scores = loadBestScores();
  const validMode = GAME_MODES[modeId] ? modeId : 'classic';
  if (score > scores[validMode]) {
    scores[validMode] = score;
    memoryBestScores = scores;
    safeSetItem(STORAGE_KEYS.BEST_SCORES, JSON.stringify(scores));
    if (validMode === 'classic') {
      safeSetItem(STORAGE_KEYS.LEGACY_BEST_SCORE, String(score));
    }
  }
  return scores[validMode];
}

export function loadStats() {
  const parsed = readJson(STORAGE_KEYS.STATS);
  if (!parsed || typeof parsed !== 'object') {
    return { ...memoryStats };
  }
  const clean = {
    gamesPlayed: Number.isInteger(parsed.gamesPlayed) && parsed.gamesPlayed >= 0 ? parsed.gamesPlayed : 0,
    totalLinesCleared:
      Number.isInteger(parsed.totalLinesCleared) && parsed.totalLinesCleared >= 0
        ? parsed.totalLinesCleared
        : 0,
    maxCombo: Number.isInteger(parsed.maxCombo) && parsed.maxCombo >= 0 ? parsed.maxCombo : 0,
    highestAdventureLevel:
      Number.isInteger(parsed.highestAdventureLevel) && parsed.highestAdventureLevel >= 1
        ? parsed.highestAdventureLevel
        : 1,
  };
  memoryStats = clean;
  return { ...clean };
}

function writeStats(stats) {
  memoryStats = { ...stats };
  safeSetItem(STORAGE_KEYS.STATS, JSON.stringify(memoryStats));
}

export function recordGameStarted() {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  writeStats(stats);
  return stats;
}

export function recordLineClearStats(linesCleared, comboCount) {
  const stats = loadStats();
  if (linesCleared > 0) {
    stats.totalLinesCleared += linesCleared;
  }
  if (comboCount > stats.maxCombo) {
    stats.maxCombo = comboCount;
  }
  writeStats(stats);
  return stats;
}

export function recordAdventureProgress(level) {
  const stats = loadStats();
  if (level > stats.highestAdventureLevel) {
    stats.highestAdventureLevel = level;
    writeStats(stats);
  }
  return stats;
}

export function resetAllStats() {
  const fresh = { ...DEFAULT_STATS };
  writeStats(fresh);
  return fresh;
}

function loadAllModeSavesMap() {
  const parsed = readJson(STORAGE_KEYS.SAVES);
  const result = {};
  if (parsed && typeof parsed === 'object') {
    for (const modeId of Object.keys(GAME_MODES)) {
      if (parsed[modeId]) {
        const valid = validateSavedGameState(parsed[modeId]);
        if (valid) result[modeId] = valid;
      }
    }
  }
  memorySaves = { ...result, ...memorySaves };
  return result;
}

export function loadModeSave(modeId) {
  if (!GAME_MODES[modeId]) return null;
  const saves = loadAllModeSavesMap();
  return saves[modeId] || memorySaves[modeId] || null;
}

export function saveModeSave(modeId, state) {
  if (!GAME_MODES[modeId]) return;
  const validated = validateSavedGameState({ ...state, mode: modeId });
  if (!validated) return;
  const all = loadAllModeSavesMap();
  all[modeId] = validated;
  memorySaves[modeId] = validated;
  safeSetItem(STORAGE_KEYS.SAVES, JSON.stringify(all));
}

export function clearModeSave(modeId) {
  const all = loadAllModeSavesMap();
  delete all[modeId];
  delete memorySaves[modeId];
  safeSetItem(STORAGE_KEYS.SAVES, JSON.stringify(all));
}
