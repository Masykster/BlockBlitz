import {
  BLOCK_COLORS,
  GRID_SIZE,
  INITIAL_BOOSTER_CHARGES,
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
 * Deep-clone an 8x8 board matrix.
 */
export function cloneBoard(board) {
  return board.map((row) => [...row]);
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
 * Simulate placing a piece on the board and return which rows/columns would clear.
 */
export function simulateLinesToClear(board, piece, startR, startC) {
  const tempBoard = cloneBoard(board);
  if (piece && Array.isArray(piece.matrix)) {
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[0].length; c++) {
        if (piece.matrix[r][c] === 1) {
          tempBoard[startR + r][startC + c] = piece.color || { cls: 'temp', hex: '#ffffff' };
        }
      }
    }
  }

  const clearingRows = new Set();
  const clearingCols = new Set();

  for (let r = 0; r < GRID_SIZE; r++) {
    if (tempBoard[r].every((cell) => cell !== null)) {
      clearingRows.add(r);
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (tempBoard[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) {
      clearingCols.add(c);
    }
  }

  return { clearingRows, clearingCols };
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

function normalizeColor(rawColor) {
  if (!rawColor || typeof rawColor.cls !== 'string') {
    return null;
  }
  const known = COLOR_BY_CLASS.get(rawColor.cls);
  return known ? { ...known } : null;
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
 * Returns null if the data is malformed or incompatible.
 */
export function validateSavedGameState(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

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
        const color = normalizeColor(cell);
        if (!color) return null;
        cleanRow.push(color);
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
      const color = normalizeColor(item.color);
      if (!matrix || !color) return null;
      trayPieces.push({ matrix, color });
    } else {
      return null;
    }
  }

  const score = Number.isInteger(raw.score) && raw.score >= 0 ? raw.score : null;
  const comboCount = Number.isInteger(raw.comboCount) && raw.comboCount >= 0 ? raw.comboCount : null;
  const movesSinceLastClear =
    Number.isInteger(raw.movesSinceLastClear) &&
    raw.movesSinceLastClear >= 0 &&
    raw.movesSinceLastClear < MAX_COMBO_GRACE_MOVES
      ? raw.movesSinceLastClear
      : 0;

  if (score === null || comboCount === null) {
    return null;
  }

  const clampBooster = (val) =>
    Number.isInteger(val) && val >= 0 && val <= MAX_BOOSTER_CHARGES ? val : INITIAL_BOOSTER_CHARGES;

  return {
    board,
    trayPieces,
    score,
    comboCount,
    movesSinceLastClear,
    rerollCharges: clampBooster(raw.rerollCharges),
    rotateCharges: clampBooster(raw.rotateCharges),
    isGameOver: Boolean(raw.isGameOver),
  };
}
