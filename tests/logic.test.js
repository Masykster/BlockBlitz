import test from 'node:test';
import assert from 'node:assert/strict';

import { BLOCK_COLORS, GRID_SIZE } from '../src/game/constants.js';
import {
  calculateLineClearScore,
  canPieceFitAt,
  canPieceFitAnywhere,
  createEmptyBoard,
  generateBalancedTray,
  hasAnyValidMove,
  rotateMatrixClockwise,
  simulateLinesToClear,
  validateSavedGameState,
} from '../src/game/logic.js';

const RED = BLOCK_COLORS[0];

test('createEmptyBoard builds an 8x8 matrix filled with nulls', () => {
  const board = createEmptyBoard();
  assert.equal(board.length, GRID_SIZE);
  for (const row of board) {
    assert.equal(row.length, GRID_SIZE);
    assert.ok(row.every((cell) => cell === null));
  }
});

test('canPieceFitAt validates boundaries and occupied collisions', () => {
  const board = createEmptyBoard();
  board[2][2] = RED;

  const square = { matrix: [[1, 1], [1, 1]], color: RED };
  assert.equal(canPieceFitAt(board, square, 0, 0), true);
  assert.equal(canPieceFitAt(board, square, 1, 1), false);
  assert.equal(canPieceFitAt(board, square, 7, 7), false);
  assert.equal(canPieceFitAt(board, square, -1, 0), false);
});

test('simulateLinesToClear detects simultaneous row and column clears', () => {
  const board = createEmptyBoard();
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== 3) board[0][c] = RED;
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r !== 0) board[r][3] = RED;
  }

  const dot = { matrix: [[1]], color: RED };
  const { clearingRows, clearingCols } = simulateLinesToClear(board, dot, 0, 3);
  assert.deepEqual([...clearingRows], [0]);
  assert.deepEqual([...clearingCols], [3]);
});

test('calculateLineClearScore computes combo multiplier and all-clear bonus', () => {
  const single = calculateLineClearScore(3, 1, 1, false);
  assert.equal(single.totalEarned, 13);

  const doubleCombo = calculateLineClearScore(4, 2, 3, false);
  assert.equal(doubleCombo.totalEarned, 4 + 30 * 3);

  const allClear = calculateLineClearScore(2, 1, 2, true);
  assert.equal(allClear.allClearBonus, 300);
  assert.equal(allClear.totalEarned, 2 + 10 * 2 + 300);
});

test('rotateMatrixClockwise rotates non-square shapes 90 degrees clockwise', () => {
  const rect = [
    [1, 1, 1],
    [1, 0, 0],
  ];
  const rotated = rotateMatrixClockwise(rect);
  assert.deepEqual(rotated, [
    [1, 1],
    [0, 1],
    [0, 1],
  ]);
});

test('generateBalancedTray guarantees at least one fitting piece when space exists', () => {
  const board = createEmptyBoard();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c] = RED;
    }
  }
  board[4][4] = null; // Only a single 1x1 space remains

  // Force RNG to keep picking the huge 3x3 square if possible
  const tray = generateBalancedTray(board, () => 0.99);
  assert.equal(tray.length, 3);
  assert.equal(
    tray.some((piece) => canPieceFitAnywhere(board, piece)),
    true
  );
  assert.equal(hasAnyValidMove(board, tray), true);
});

test('validateSavedGameState accepts valid state and rejects malformed payloads', () => {
  const board = createEmptyBoard();
  board[0][0] = RED;

  const valid = validateSavedGameState({
    board,
    trayPieces: [{ matrix: [[1]], color: RED }, null, null],
    score: 120,
    comboCount: 2,
    movesSinceLastClear: 1,
    rerollCharges: 3,
    rotateCharges: 1,
    isGameOver: false,
  });

  assert.ok(valid);
  assert.equal(valid.score, 120);
  assert.equal(valid.trayPieces[0].color.hex, RED.hex);

  assert.equal(validateSavedGameState(null), null);
  assert.equal(validateSavedGameState({ board: [], trayPieces: [] }), null);
  assert.equal(
    validateSavedGameState({
      board,
      trayPieces: [{ matrix: [[9]], color: RED }, null, null],
      score: 10,
      comboCount: 0,
    }),
    null
  );
});
