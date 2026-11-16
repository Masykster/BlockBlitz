import test from 'node:test';
import assert from 'node:assert/strict';

import { BLOCK_COLORS, BLITZ_MAX_SECONDS, GRID_SIZE } from '../src/game/constants.js';
import {
  applyHammerBlast,
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
import {
  addBlitzTime,
  getAdventureLevelConfig,
  maybeSpawnBomb,
  tickBombsOnBoard,
} from '../src/game/modes.js';

const RED = BLOCK_COLORS[0];
const CYAN = BLOCK_COLORS[4];

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

test('zero-allocation simulateLinesToClear detects simultaneous row and column clears', () => {
  const board = createEmptyBoard();
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== 3) board[0][c] = { ...RED };
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r !== 0) board[r][3] = { ...RED };
  }

  const dot = { matrix: [[1]], color: RED };
  const { clearingRows, clearingCols } = simulateLinesToClear(board, dot, 0, 3);
  assert.deepEqual([...clearingRows], [0]);
  assert.deepEqual([...clearingCols], [3]);
  // Verify input board was not mutated
  assert.equal(board[0][3], null);
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
      board[r][c] = { ...RED };
    }
  }
  board[4][4] = null;

  const tray = generateBalancedTray(board, () => 0.99);
  assert.equal(tray.length, 3);
  assert.equal(
    tray.some((piece) => canPieceFitAnywhere(board, piece)),
    true
  );
  assert.equal(hasAnyValidMove(board, tray), true);
});

test('applyHammerBlast clears 3x3 area and counts defused bombs', () => {
  const board = createEmptyBoard();
  board[0][0] = { ...RED, bomb: 2 };
  board[0][1] = { ...CYAN };
  board[1][1] = { ...RED };
  board[5][5] = { ...CYAN };

  const { clearedCells, defusedBombs } = applyHammerBlast(board, 0, 0);
  assert.equal(clearedCells.length, 3);
  assert.equal(defusedBombs, 1);
  assert.equal(board[0][0], null);
  assert.equal(board[0][1], null);
  assert.equal(board[1][1], null);
  assert.ok(board[5][5]);
});

test('Bomb mode ticks countdowns, detects explosion, and spawns bombs safely', () => {
  const board = createEmptyBoard();
  board[2][2] = { ...RED };
  const spawned = maybeSpawnBomb(board, 2, () => 0);
  assert.ok(spawned);
  assert.equal(board[2][2].bomb, 8);

  for (let i = 0; i < 7; i++) {
    const res = tickBombsOnBoard(board);
    assert.equal(res.exploded, false);
  }
  const finalTick = tickBombsOnBoard(board);
  assert.equal(finalTick.exploded, true);
  assert.equal(board[2][2].bomb, 0);
});

test('Adventure mode generates valid non-full starting boards across preset & procedural stages', () => {
  for (let lv = 1; lv <= 15; lv++) {
    const cfg = getAdventureLevelConfig(lv);
    assert.equal(cfg.level, lv);
    assert.ok(cfg.targetLines >= 4);
    assert.equal(cfg.board.length, GRID_SIZE);

    const { clearingRows, clearingCols } = simulateLinesToClear(cfg.board, null, 0, 0);
    assert.equal(clearingRows.size, 0, `Level ${lv} should not start with pre-full row`);
    assert.equal(clearingCols.size, 0, `Level ${lv} should not start with pre-full col`);
  }
});

test('addBlitzTime adds bonus seconds and clamps to BLITZ_MAX_SECONDS', () => {
  assert.equal(addBlitzTime(50, 2), 56);
  assert.equal(addBlitzTime(BLITZ_MAX_SECONDS - 2, 3), BLITZ_MAX_SECONDS);
});

test('validateSavedGameState accepts multi-mode payloads with bombs and rejects malformed data', () => {
  const board = createEmptyBoard();
  board[0][0] = { ...RED, bomb: 5 };

  const valid = validateSavedGameState({
    mode: 'bomb',
    board,
    trayPieces: [{ matrix: [[1]], color: RED }, null, null],
    score: 250,
    comboCount: 3,
    movesSinceLastClear: 1,
    movesCount: 7,
    level: 2,
    targetLines: 6,
    linesClearedInRun: 3,
    timeLeft: 75,
    rerollCharges: 3,
    rotateCharges: 1,
    hammerCharges: 2,
    undoCharges: 1,
    isGameOver: false,
  });

  assert.ok(valid);
  assert.equal(valid.mode, 'bomb');
  assert.equal(valid.board[0][0].bomb, 5);
  assert.equal(valid.hammerCharges, 2);
  assert.equal(valid.undoCharges, 1);

  assert.equal(validateSavedGameState(null), null);
  assert.equal(validateSavedGameState({ board: [], trayPieces: [] }), null);
});
