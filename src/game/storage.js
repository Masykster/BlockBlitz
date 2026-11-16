import { STORAGE_KEYS } from './constants.js';
import { validateSavedGameState } from './logic.js';

let memoryBestScore = 0;
let memorySoundEnabled = true;
let memoryGameState = null;

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
    // Ignore storage quota or SecurityError in restricted environments
  }
}

function safeRemoveItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

export function loadBestScore() {
  const raw = safeGetItem(STORAGE_KEYS.BEST_SCORE);
  if (raw === null) return memoryBestScore;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return memoryBestScore;
  memoryBestScore = parsed;
  return parsed;
}

export function saveBestScore(value) {
  memoryBestScore = value;
  safeSetItem(STORAGE_KEYS.BEST_SCORE, String(value));
}

export function loadSoundEnabled() {
  const raw = safeGetItem(STORAGE_KEYS.SOUND_ENABLED);
  if (raw === null) return memorySoundEnabled;
  const enabled = raw !== 'false';
  memorySoundEnabled = enabled;
  return enabled;
}

export function saveSoundEnabled(enabled) {
  memorySoundEnabled = Boolean(enabled);
  safeSetItem(STORAGE_KEYS.SOUND_ENABLED, String(memorySoundEnabled));
}

export function loadGameState() {
  const raw = safeGetItem(STORAGE_KEYS.GAME_STATE);
  if (!raw) return memoryGameState;
  try {
    const parsed = JSON.parse(raw);
    const validated = validateSavedGameState(parsed);
    if (validated) {
      memoryGameState = validated;
      return validated;
    }
  } catch {
    // Fall back cleanly if stored state is corrupted
  }
  return null;
}

export function saveGameState(state) {
  const validated = validateSavedGameState(state);
  if (!validated) return;
  memoryGameState = validated;
  safeSetItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(validated));
}

export function clearGameState() {
  memoryGameState = null;
  safeRemoveItem(STORAGE_KEYS.GAME_STATE);
}
