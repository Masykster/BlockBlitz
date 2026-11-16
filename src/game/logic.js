import {
  BLOCK_COLORS,
  BLITZ_INITIAL_SECONDS,
  BLITZ_MAX_SECONDS,
  GAME_MODES,
  GRID_SIZE,
  INITIAL_BOOSTERS,
  MAX_BOOSTER_CHARGES,
  MAX_COMBO_GRACE_MOVES,
  SHAPES_CATALOG,
} from './constants.js';

const COLOR_BY_CLASS = new Map(BLOCK_COLORS.map((color) => [color.cls, color]));

/**
 * Create an empty 8x8 game board.
 */
export function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

/**
 * Deep-clone an 8x8 board matrix (preserving optional bomb counters).
 */
export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

/**
 * Deep-clone tray pieces array.
 */
export function cloneTrayPieces(trayPieces) {
  return trayPieces.map((piece) =>
    piece
      ? {
          matrix: piece.matrix.map((row) => [...row]),
          color: { ...piece.color },
        }
      : null
  );
}

/**
 * Check whether a piece can fit on the board at (startR, startC).
 */
export function canPieceFitAt(board, piece, startR, startC) {
  if (!piece || !Array.isArray(piece.matrix) || piece.matrix.length === 0) {
    return false;
  }

  const rows = piece.matrix.length;
  const cols = piece.matrix[0].length;

  if (
    startR < 0 ||
    startC < 0 ||
    startR + rows > GRID_SIZE ||
    startC + cols > GRID_SIZE
  ) {
    return false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (piece.matrix[r][c] === 1 && board[startR + r][startC + c] !== null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check whether a piece can fit anywhere on the board.
 */
export function canPieceFitAnywhere(board, piece) {
  if (!piece || !Array.isArray(piece.matrix) || piece.matrix.length === 0) {
    return false;
  }

  for (let r = 0; r <= GRID_SIZE - piece.matrix.length; r++) {
    for (let c = 0; c <= GRID_SIZE - piece.matrix[0].length; c++) {
      if (canPieceFitAt(board, piece, r, c)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Zero-allocation simulation of which rows and columns would become full
 * if `piece` were placed at `(startR, startC)`.
 */
export function simulateLinesToClear(board, piece, startR, startC) {
  const pRows = piece && Array.isArray(piece.matrix) ? piece.matrix.length : 0;
  const pCols = pRows > 0 ? piece.matrix[0].length : 0;

  const clearingRows = new Set();
  const clearingCols = new Set();

  for (let r = 0; r < GRID_SIZE; r++) {
    let rowFull = true;
    const pr = r - startR;
    const rowInPiece = pr >= 0 && pr < pRows;

    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === null) {
        const pc = c - startC;
        if (!(rowInPiece && pc >= 0 && pc < pCols && piece.matrix[pr][pc] === 1)) {
          rowFull = false;
          break;
        }
      }
    }
    if (rowFull) {
      clearingRows.add(r);
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let colFull = true;
    const pc = c - startC;
    const colInPiece = pc >= 0 && pc < pCols;

    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r][c] === null) {
        const pr = r - startR;
        if (!(colInPiece && pr >= 0 && pr < pRows && piece.matrix[pr][pc] === 1)) {
          colFull = false;
          break;
        }
      }
    }
    if (colFull) {
      clearingCols.add(c);
    }
  }

  return { clearingRows, clearingCols };
}

/**
 * Clear up to a 3x3 area centered at (centerR, centerC) using the Hammer booster.
 * Returns cleared cell coordinates, colors, and count of defused bombs.
 */
export function applyHammerBlast(board, centerR, centerC) {
  const clearedCells = [];
  let defusedBombs = 0;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = centerR + dr;
      const c = centerC + dc;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
      const cell = board[r][c];
      if (cell) {
        if (typeof cell.bomb === 'number') {
          defusedBombs++;
        }
        clearedCells.push({ r, c, color: { ...cell } });
        board[r][c] = null;
      }
    }
  }

  return { clearedCells, defusedBombs };
}

/**
 * Rotate a 2D piece matrix 90 degrees clockwise.
 */
export function rotateMatrixClockwise(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = matrix[r][c];
    }
  }
  return rotated;
}

/**
 * Compute authentic Block Blast score breakdown for a move that clears lines.
 */
export function calculateLineClearScore(blocksPlacedCount, totalLinesCleared, comboCount, isBoardEmpty) {
  const lineBaseScore =
    totalLinesCleared === 1
      ? 10
      : totalLinesCleared === 2
        ? 30
        : totalLinesCleared === 3
          ? 60
          : totalLinesCleared === 4
            ? 100
            : totalLinesCleared * 35;

  const earnedPoints = blocksPlacedCount + lineBaseScore * comboCount;
  const allClearBonus = isBoardEmpty ? 300 : 0;

  return {
    lineBaseScore,
    allClearBonus,
    totalEarned: earnedPoints + allClearBonus,
  };
}

/**
 * Pick a weighted shape matrix from the catalog.
 */
export function pickWeightedShape(rng = Math.random) {
  const totalWeight = SHAPES_CATALOG.reduce((acc, item) => acc + item.weight, 0);
  let rand = rng() * totalWeight;
  for (const item of SHAPES_CATALOG) {
    rand -= item.weight;
    if (rand <= 0) {
      return item.matrix.map((row) => [...row]);
    }
  }
  return SHAPES_CATALOG[0].matrix.map((row) => [...row]);
}

/**
 * Create a random colored piece.
 */
export function createRandomPiece(rng = Math.random) {
  const matrix = pickWeightedShape(rng);
  const color = BLOCK_COLORS[Math.floor(rng() * BLOCK_COLORS.length)];
  return {
    matrix,
    color: { ...color },
  };
}

/**
 * Generate 3 tray pieces, guaranteeing at least one piece fits on the board if possible.
 */
export function generateBalancedTray(board, rng = Math.random) {
  const tray = [createRandomPiece(rng), createRandomPiece(rng), createRandomPiece(rng)];

  const anyFits = tray.some((piece) => canPieceFitAnywhere(board, piece));
  if (!anyFits) {
    const fittingCandidates = SHAPES_CATALOG.filter((shape) =>
      canPieceFitAnywhere(board, { matrix: shape.matrix })
    );
    if (fittingCandidates.length > 0) {
      const chosen = fittingCandidates[Math.floor(rng() * fittingCandidates.length)];
      const color = BLOCK_COLORS[Math.floor(rng() * BLOCK_COLORS.length)];
      const slot = Math.floor(rng() * 3);
      tray[slot] = {
        matrix: chosen.matrix.map((row) => [...row]),
        color: { ...color },
      };
    }
  }

  return tray;
}

/**
 * Determine whether at least one remaining piece in the tray can fit on the board.
 */
export function hasAnyValidMove(board, trayPieces) {
  return trayPieces.some((piece) => piece !== null && canPieceFitAnywhere(board, piece));
}

function normalizeColorCell(rawCell) {
  if (!rawCell || typeof rawCell.cls !== 'string') {
    return null;
  }
  const known = COLOR_BY_CLASS.get(rawCell.cls);
  if (!known) return null;

  const cell = { ...known };
  if (typeof rawCell.bomb === 'number' && Number.isInteger(rawCell.bomb) && rawCell.bomb >= 0 && rawCell.bomb <= 20) {
    cell.bomb = rawCell.bomb;
  }
  return cell;
}

function normalizeMatrix(rawMatrix) {
  if (!Array.isArray(rawMatrix) || rawMatrix.length === 0 || rawMatrix.length > GRID_SIZE) {
    return null;
  }

  const colCount = Array.isArray(rawMatrix[0]) ? rawMatrix[0].length : 0;
  if (colCount === 0 || colCount > GRID_SIZE) {
    return null;
  }

  let filledCount = 0;
  const matrix = [];
  for (const row of rawMatrix) {
    if (!Array.isArray(row) || row.length !== colCount) {
      return null;
    }
    const cleanRow = [];
    for (const cell of row) {
      if (cell !== 0 && cell !== 1) {
        return null;
      }
      if (cell === 1) filledCount++;
      cleanRow.push(cell);
    }
    matrix.push(cleanRow);
  }

  return filledCount > 0 ? matrix : null;
}

/**
 * Validate and normalize persisted game state loaded from storage.
 */
export function validateSavedGameState(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const mode = typeof raw.mode === 'string' && GAME_MODES[raw.mode] ? raw.mode : 'classic';

  if (!Array.isArray(raw.board) || raw.board.length !== GRID_SIZE) {
    return null;
  }

  const board = [];
  for (const row of raw.board) {
    if (!Array.isArray(row) || row.length !== GRID_SIZE) {
      return null;
    }
    const cleanRow = [];
    for (const cell of row) {
      if (cell === null) {
        cleanRow.push(null);
      } else {
        const normalized = normalizeColorCell(cell);
        if (!normalized) return null;
        cleanRow.push(normalized);
      }
    }
    board.push(cleanRow);
  }

  if (!Array.isArray(raw.trayPieces) || raw.trayPieces.length !== 3) {
    return null;
  }

  const trayPieces = [];
  for (const item of raw.trayPieces) {
    if (item === null) {
      trayPieces.push(null);
    } else if (item && typeof item === 'object') {
      const matrix = normalizeMatrix(item.matrix);
      const color = normalizeColorCell(item.color);
      if (!matrix || !color) return null;
      trayPieces.push({ matrix, color: { cls: color.cls, hex: color.hex } });
    } else {
      return null;
    }
  }

  const score = Number.isInteger(raw.score) && raw.score >= 0 ? raw.score : null;
  const comboCount = Number.isInteger(raw.comboCount) && raw.comboCount >= 0 ? raw.comboCount : null;
  if (score === null || comboCount === null) {
    return null;
  }

  const movesSinceLastClear =
    Number.isInteger(raw.movesSinceLastClear) &&
    raw.movesSinceLastClear >= 0 &&
    raw.movesSinceLastClear < MAX_COMBO_GRACE_MOVES
      ? raw.movesSinceLastClear
      : 0;

  const clampBooster = (val, fallback) =>
    Number.isInteger(val) && val >= 0 && val <= MAX_BOOSTER_CHARGES ? val : fallback;

  const level = Number.isInteger(raw.level) && raw.level >= 1 ? raw.level : 1;
  const targetLines = Number.isInteger(raw.targetLines) && raw.targetLines >= 1 ? raw.targetLines : 4;
  const linesClearedInRun =
    Number.isInteger(raw.linesClearedInRun) && raw.linesClearedInRun >= 0 ? raw.linesClearedInRun : 0;
  const movesCount = Number.isInteger(raw.movesCount) && raw.movesCount >= 0 ? raw.movesCount : 0;
  const timeLeft =
    typeof raw.timeLeft === 'number' && Number.isFinite(raw.timeLeft)
      ? Math.max(0, Math.min(BLITZ_MAX_SECONDS, Math.round(raw.timeLeft)))
      : BLITZ_INITIAL_SECONDS;

  return {
    mode,
    board,
    trayPieces,
    score,
    comboCount,
    movesSinceLastClear,
    movesCount,
    level,
    targetLines,
    linesClearedInRun,
    timeLeft,
    rerollCharges: clampBooster(raw.rerollCharges, INITIAL_BOOSTERS.reroll),
    rotateCharges: clampBooster(raw.rotateCharges, INITIAL_BOOSTERS.rotate),
    hammerCharges: clampBooster(raw.hammerCharges, INITIAL_BOOSTERS.hammer),
    undoCharges: clampBooster(raw.undoCharges, INITIAL_BOOSTERS.undo),
    isGameOver: Boolean(raw.isGameOver),
    isLevelComplete: Boolean(raw.isLevelComplete),
  };
}
