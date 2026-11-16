import {
  BLOCK_COLORS,
  BLITZ_BONUS_PER_LINE,
  BLITZ_MAX_SECONDS,
  BOMB_MAX_ACTIVE,
  GRID_SIZE,
} from './constants.js';
import { createEmptyBoard } from './logic.js';

const PRESET_PATTERNS = [
  {
    title: 'Gerbang Permata',
    coords: [
      [2, 2], [2, 5], [5, 2], [5, 5],
      [3, 3], [3, 4], [4, 3], [4, 4],
    ],
  },
  {
    title: 'Pulau Kembar',
    coords: [
      [1, 1], [1, 2], [2, 1], [2, 2],
      [5, 5], [5, 6], [6, 5], [6, 6],
      [3, 4], [4, 3],
    ],
  },
  {
    title: 'Salib Kristal',
    coords: [
      [1, 3], [1, 4], [2, 3], [2, 4],
      [5, 3], [5, 4], [6, 3], [6, 4],
      [3, 1], [4, 1], [3, 6], [4, 6],
    ],
  },
  {
    title: 'Cincin Bintang',
    coords: [
      [1, 2], [1, 3], [1, 4], [1, 5],
      [6, 2], [6, 3], [6, 4], [6, 5],
      [2, 1], [3, 1], [4, 1], [5, 1],
      [2, 6], [3, 6], [4, 6], [5, 6],
    ],
  },
  {
    title: 'Tangga Pelangi',
    coords: [
      [0, 0], [1, 1], [2, 2], [3, 3],
      [4, 4], [5, 5], [6, 6], [7, 7],
      [0, 7], [1, 6], [6, 1], [7, 0],
    ],
  },
  {
    title: 'Menara Ganda',
    coords: [
      [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
      [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
      [3, 3], [4, 4],
    ],
  },
  {
    title: 'Papan Catur',
    coords: [
      [1, 1], [1, 3], [1, 5],
      [3, 2], [3, 4], [3, 6],
      [5, 1], [5, 3], [5, 5],
      [6, 2], [6, 4], [6, 6],
    ],
  },
  {
    title: 'Benteng Inti',
    coords: [
      [2, 2], [2, 3], [2, 4], [2, 5],
      [5, 2], [5, 3], [5, 4], [5, 5],
      [3, 2], [4, 2], [3, 5], [4, 5],
      [0, 3], [0, 4], [7, 3], [7, 4],
    ],
  },
];

function createSeededRng(seed) {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ensureNoPreCompletedLines(board) {
  for (let r = 0; r < GRID_SIZE; r++) {
    if (board[r].every((c) => c !== null)) {
      board[r][r % GRID_SIZE] = null;
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) {
      board[(c + 3) % GRID_SIZE][c] = null;
    }
  }
}

/**
 * Generate configuration and starting board for an Adventure mode level (1+).
 */
export function getAdventureLevelConfig(rawLevel = 1) {
  const level = Math.max(1, Math.floor(rawLevel));
  const board = createEmptyBoard();
  const targetLines = 4 + Math.min(20, level - 1);

  if (level <= PRESET_PATTERNS.length) {
    const preset = PRESET_PATTERNS[level - 1];
    const baseColorIdx = (level - 1) % BLOCK_COLORS.length;
    preset.coords.forEach(([r, c], idx) => {
      const color = BLOCK_COLORS[(baseColorIdx + Math.floor(idx / 2)) % BLOCK_COLORS.length];
      board[r][c] = { ...color };
    });
    return {
      level,
      title: preset.title,
      targetLines,
      board,
    };
  }

  // Deterministic procedural symmetric pattern for level 9+
  const rng = createSeededRng(level + 137);
  const desiredCount = Math.min(26, 12 + Math.floor((level - PRESET_PATTERNS.length) * 1.4));
  let placed = 0;
  let attempts = 0;

  while (placed < desiredCount && attempts < 120) {
    attempts++;
    const r = Math.floor(rng() * (GRID_SIZE / 2));
    const c = Math.floor(rng() * (GRID_SIZE / 2));
    const color = BLOCK_COLORS[Math.floor(rng() * BLOCK_COLORS.length)];
    const mirrorCoords = [
      [r, c],
      [r, GRID_SIZE - 1 - c],
      [GRID_SIZE - 1 - r, c],
      [GRID_SIZE - 1 - r, GRID_SIZE - 1 - c],
    ];

    for (const [mr, mc] of mirrorCoords) {
      if (!board[mr][mc] && placed < desiredCount) {
        board[mr][mc] = { ...color };
        placed++;
      }
    }
  }

  ensureNoPreCompletedLines(board);

  return {
    level,
    title: `Tantangan #${level}`,
    targetLines,
    board,
  };
}

/**
 * Decrement all bomb countdowns on the board by 1 move.
 * Returns whether any bomb reached 0 (exploded).
 */
export function tickBombsOnBoard(board) {
  let exploded = false;
  let activeCount = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = board[r][c];
      if (cell && typeof cell.bomb === 'number') {
        cell.bomb -= 1;
        activeCount++;
        if (cell.bomb <= 0) {
          cell.bomb = 0;
          exploded = true;
        }
      }
    }
  }

  return { exploded, activeCount };
}

/**
 * Spawn a countdown bomb on an existing non-bomb occupied cell when appropriate.
 */
export function maybeSpawnBomb(board, movesCount, rng = Math.random) {
  if (movesCount < 2) return null;

  let activeBombs = 0;
  const candidates = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      if (typeof cell.bomb === 'number') {
        activeBombs++;
      } else {
        candidates.push([r, c]);
      }
    }
  }

  if (candidates.length === 0 || activeBombs >= BOMB_MAX_ACTIVE) {
    return null;
  }

  const shouldSpawn =
    activeBombs === 0 || (movesCount - 2) % 4 === 0;

  if (!shouldSpawn) {
    return null;
  }

  const [r, c] = candidates[Math.floor(rng() * candidates.length)];
  const timer = movesCount >= 24 ? 7 : 8;
  board[r][c] = { ...board[r][c], bomb: timer };

  return { r, c, timer };
}

/**
 * Compute updated Time Blitz seconds after clearing lines.
 */
export function addBlitzTime(currentSeconds, linesCleared) {
  if (linesCleared <= 0) return currentSeconds;
  return Math.min(BLITZ_MAX_SECONDS, currentSeconds + linesCleared * BLITZ_BONUS_PER_LINE);
}
