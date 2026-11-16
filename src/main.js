import './styles/main.css';

import {
  GRID_SIZE,
  INITIAL_BOOSTER_CHARGES,
  MAX_BOOSTER_CHARGES,
  MAX_COMBO_GRACE_MOVES,
} from './game/constants.js';
import {
  calculateLineClearScore,
  canPieceFitAnywhere,
  canPieceFitAt,
  createEmptyBoard,
  generateBalancedTray,
  hasAnyValidMove,
  rotateMatrixClockwise,
  simulateLinesToClear,
} from './game/logic.js';
import {
  loadBestScore,
  loadGameState,
  loadSoundEnabled,
  saveBestScore,
  saveGameState,
  saveSoundEnabled,
} from './game/storage.js';
import { SoundFX } from './game/sound.js';
import { haptics } from './game/haptics.js';
import { ParticleSystem } from './game/particles.js';
import { setupNativeBridge } from './game/native.js';

const sfx = new SoundFX(loadSoundEnabled());

let board = createEmptyBoard();
let trayPieces = [null, null, null];
let score = 0;
let displayedScore = 0;
let bestScore = loadBestScore();
let comboCount = 0;
let movesSinceLastClear = 0;
let rerollCharges = INITIAL_BOOSTER_CHARGES;
let rotateCharges = INITIAL_BOOSTER_CHARGES;
let isGameOver = false;
let isClearing = false;
let dragState = null;
let gameOverTimeoutId = null;

// DOM References
const fxCanvas = document.getElementById('fx-canvas');
const boardGridEl = document.getElementById('board-grid');
const boardContainerEl = document.getElementById('board-container');
const floatingUiEl = document.getElementById('floating-ui');
const currentScoreEl = document.getElementById('current-score-el');
const bestScoreEl = document.getElementById('best-score-el');
const comboBadgeEl = document.getElementById('combo-badge');
const comboCountEl = document.getElementById('combo-count');
const streakDotsEl = document.getElementById('streak-dots');
const dragProxyEl = document.getElementById('drag-proxy');
const rerollBtn = document.getElementById('reroll-btn');
const rotateBtn = document.getElementById('rotate-btn');
const rerollCountEl = document.getElementById('reroll-count');
const rotateCountEl = document.getElementById('rotate-count');
const gameOverModal = document.getElementById('game-over-modal');
const exitToastEl = document.getElementById('exit-toast');

const particles = new ParticleSystem(fxCanvas);
const cellElements = [];

function persistState() {
  saveGameState({
    board,
    trayPieces,
    score,
    comboCount,
    movesSinceLastClear,
    rerollCharges,
    rotateCharges,
    isGameOver,
  });
}

function syncSoundIcons() {
  document.querySelectorAll('.sound-icon').forEach((icon) => {
    icon.className = sfx.enabled
      ? 'sound-icon fa-solid fa-volume-high'
      : 'sound-icon fa-solid fa-volume-xmark';
  });
}

function buildBoardDOM() {
  boardGridEl.innerHTML = '';
  cellElements.length = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    const rowEls = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      boardGridEl.appendChild(cell);
      rowEls.push(cell);
    }
    cellElements.push(rowEls);
  }
}

function hideGameOverModal() {
  gameOverModal.classList.add('hidden');
  gameOverModal.classList.remove('flex');
}

function showGameOverModal(playSoundAndHaptics = true) {
  isGameOver = true;
  persistState();

  if (playSoundAndHaptics) {
    sfx.gameOver();
    haptics.gameOver();
  }

  document.getElementById('modal-score').textContent = score.toLocaleString('id-ID');
  document.getElementById('modal-best').textContent = bestScore.toLocaleString('id-ID');
  const badge = document.getElementById('new-record-badge');
  if (score > 0 && score >= bestScore) {
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
  gameOverModal.classList.remove('hidden');
  gameOverModal.classList.add('flex');
}

function initNewGame() {
  if (gameOverTimeoutId) {
    clearTimeout(gameOverTimeoutId);
    gameOverTimeoutId = null;
  }
  board = createEmptyBoard();
  trayPieces = [null, null, null];
  score = 0;
  displayedScore = 0;
  comboCount = 0;
  movesSinceLastClear = 0;
  rerollCharges = INITIAL_BOOSTER_CHARGES;
  rotateCharges = INITIAL_BOOSTER_CHARGES;
  isGameOver = false;
  isClearing = false;
  dragState = null;
  dragProxyEl.style.display = 'none';

  currentScoreEl.textContent = '0';
  bestScoreEl.textContent = bestScore.toLocaleString('id-ID');
  hideGameOverModal();

  updateComboUI();
  updateBoostersUI();
  renderBoard(null);
  spawnNewTray(true);
}

function restoreGameOrInit() {
  bestScoreEl.textContent = bestScore.toLocaleString('id-ID');
  const saved = loadGameState();
  if (!saved) {
    initNewGame();
    return;
  }

  board = saved.board;
  trayPieces = saved.trayPieces;
  score = saved.score;
  displayedScore = saved.score;
  comboCount = saved.comboCount;
  movesSinceLastClear = saved.movesSinceLastClear;
  rerollCharges = saved.rerollCharges;
  rotateCharges = saved.rotateCharges;
  isGameOver = saved.isGameOver;

  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
    bestScoreEl.textContent = bestScore.toLocaleString('id-ID');
  }

  currentScoreEl.textContent = score.toLocaleString('id-ID');
  updateComboUI();
  updateBoostersUI();
  renderBoard(null);

  if (trayPieces.every((p) => p === null)) {
    spawnNewTray(false);
    return;
  }

  renderTray(false);
  if (isGameOver || !hasAnyValidMove(board, trayPieces)) {
    showGameOverModal(false);
  } else {
    hideGameOverModal();
  }
}

function addScore(points) {
  score += points;
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
    bestScoreEl.textContent = bestScore.toLocaleString('id-ID');
  }

  currentScoreEl.classList.add('scale-110');
  setTimeout(() => currentScoreEl.classList.remove('scale-110'), 140);

  const animateStep = () => {
    if (displayedScore < score) {
      const diff = score - displayedScore;
      const step = Math.max(1, Math.ceil(diff * 0.25));
      displayedScore = Math.min(score, displayedScore + step);
      currentScoreEl.textContent = displayedScore.toLocaleString('id-ID');
      requestAnimationFrame(animateStep);
    }
  };
  requestAnimationFrame(animateStep);
}

function renderBoard(previewData = null) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const el = cellElements[r][c];
      const cellState = board[r][c];
      el.className = 'grid-cell';

      const isWillClear =
        previewData && (previewData.clearingRows.has(r) || previewData.clearingCols.has(c));

      if (cellState) {
        el.classList.add('jewel-block', cellState.cls);
        if (isWillClear) el.classList.add('will-clear');
      } else if (previewData) {
        const pr = r - previewData.r;
        const pc = c - previewData.c;
        if (
          pr >= 0 &&
          pr < previewData.piece.matrix.length &&
          pc >= 0 &&
          pc < previewData.piece.matrix[0].length &&
          previewData.piece.matrix[pr][pc] === 1
        ) {
          el.classList.add('jewel-block', previewData.piece.color.cls);
          el.classList.add(isWillClear ? 'will-clear' : 'ghost-preview');
        }
      }
    }
  }
}

function spawnNewTray(animate = true) {
  trayPieces = generateBalancedTray(board);
  renderTray(animate);
  persistState();
  checkGameOverState();
}

function renderTray(animate = false) {
  for (let i = 0; i < 3; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    slotEl.innerHTML = '';
    slotEl.style.opacity = dragState && dragState.slotIndex === i ? '0' : '1';
    slotEl.classList.remove('unplaceable', 'spawn-anim');

    const piece = trayPieces[i];
    if (!piece) continue;

    if (animate) {
      void slotEl.offsetWidth;
      slotEl.classList.add('spawn-anim');
    }

    if (!canPieceFitAnywhere(board, piece)) {
      slotEl.classList.add('unplaceable');
    }

    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;
    const maxDim = Math.max(rows, cols);
    const cellSize = maxDim >= 5 ? 15 : maxDim === 4 ? 18 : 22;

    const pieceGrid = document.createElement('div');
    pieceGrid.style.display = 'grid';
    pieceGrid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    pieceGrid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    pieceGrid.style.gap = '3px';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        if (piece.matrix[r][c] === 1) {
          cell.className = `jewel-block ${piece.color.cls}`;
          cell.style.borderRadius = '4px';
        }
        pieceGrid.appendChild(cell);
      }
    }
    slotEl.appendChild(pieceGrid);
  }
}

function getBoardMetrics() {
  const rect = boardGridEl.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : 320;
  const cellStep = width / GRID_SIZE;
  const firstCellRect = cellElements[0]?.[0]?.getBoundingClientRect();
  const cellSize = firstCellRect && firstCellRect.width > 0 ? firstCellRect.width : cellStep - 4;
  const gap = Math.max(2, (width - cellSize * GRID_SIZE) / (GRID_SIZE - 1));
  return { rect, cellStep, cellSize, gap };
}

function startDrag(slotIndex, clientX, clientY, isTouch, touchId = null) {
  if (isClearing || isGameOver || dragState) return;
  const piece = trayPieces[slotIndex];
  if (!piece) return;

  sfx.pickup();
  haptics.pickup();

  const { cellStep, cellSize, gap } = getBoardMetrics();
  const rows = piece.matrix.length;
  const cols = piece.matrix[0].length;

  dragProxyEl.innerHTML = '';
  dragProxyEl.style.display = 'grid';
  dragProxyEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
  dragProxyEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  dragProxyEl.style.gap = `${gap}px`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      if (piece.matrix[r][c] === 1) {
        cell.className = `jewel-block ${piece.color.cls}`;
      }
      dragProxyEl.appendChild(cell);
    }
  }

  const proxyWidth = cols * cellSize + Math.max(0, cols - 1) * gap;
  const proxyHeight = rows * cellSize + Math.max(0, rows - 1) * gap;

  const slotEl = document.getElementById(`slot-${slotIndex}`);
  slotEl.style.opacity = '0';

  dragState = {
    slotIndex,
    piece,
    proxyWidth,
    proxyHeight,
    cellStep,
    isTouch,
    touchId,
    targetR: null,
    targetC: null,
  };

  moveDrag(clientX, clientY);
}

function moveDrag(clientX, clientY) {
  if (!dragState) return;

  const { rect, cellStep } = getBoardMetrics();
  const { piece, proxyWidth, proxyHeight, isTouch } = dragState;

  const verticalLift = isTouch ? 85 : 35;
  const centerX = clientX;
  const centerY = clientY - verticalLift;

  const leftX = centerX - proxyWidth / 2;
  const topY = centerY - proxyHeight / 2;

  dragProxyEl.style.left = `${leftX}px`;
  dragProxyEl.style.top = `${topY}px`;

  const rawC = (leftX - rect.left + cellStep * 0.5) / cellStep;
  const rawR = (topY - rect.top + cellStep * 0.5) / cellStep;

  const snapC = Math.floor(rawC);
  const snapR = Math.floor(rawR);

  const margin = cellStep * 1.15;
  const insideBoardBounds =
    centerX >= rect.left - margin &&
    centerX <= rect.right + margin &&
    centerY >= rect.top - margin &&
    centerY <= rect.bottom + margin;

  let validR = null;
  let validC = null;

  if (insideBoardBounds) {
    if (canPieceFitAt(board, piece, snapR, snapC)) {
      validR = snapR;
      validC = snapC;
    } else {
      const candidates = [
        [snapR, snapC],
        [snapR - 1, snapC],
        [snapR + 1, snapC],
        [snapR, snapC - 1],
        [snapR, snapC + 1],
      ];
      let bestDist = Infinity;
      for (const [cr, cc] of candidates) {
        if (canPieceFitAt(board, piece, cr, cc)) {
          const cellLeft = rect.left + cc * cellStep;
          const cellTop = rect.top + cr * cellStep;
          const dist = Math.hypot(leftX - cellLeft, topY - cellTop);
          if (dist < cellStep * 0.85 && dist < bestDist) {
            bestDist = dist;
            validR = cr;
            validC = cc;
          }
        }
      }
    }
  }

  if (validR !== dragState.targetR || validC !== dragState.targetC) {
    dragState.targetR = validR;
    dragState.targetC = validC;

    if (validR !== null && validC !== null) {
      const { clearingRows, clearingCols } = simulateLinesToClear(board, piece, validR, validC);
      renderBoard({
        r: validR,
        c: validC,
        piece,
        clearingRows,
        clearingCols,
      });
    } else {
      renderBoard(null);
    }
  }
}

function endDrag() {
  if (!dragState) return;

  const { slotIndex, piece, targetR, targetC } = dragState;
  const slotEl = document.getElementById(`slot-${slotIndex}`);
  dragProxyEl.style.display = 'none';
  dragState = null;

  if (targetR !== null && targetC !== null && canPieceFitAt(board, piece, targetR, targetC)) {
    slotEl.style.opacity = '1';
    placePieceOnBoard(slotIndex, piece, targetR, targetC);
  } else {
    sfx.invalid();
    haptics.invalid();
    slotEl.style.opacity = '1';
    renderBoard(null);
  }
}

function findTrackedTouch(touchList, touchId) {
  for (let i = 0; i < touchList.length; i++) {
    if (touchList[i].identifier === touchId) {
      return touchList[i];
    }
  }
  return null;
}

for (let i = 0; i < 3; i++) {
  const slotEl = document.getElementById(`slot-${i}`);

  slotEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    startDrag(i, e.clientX, e.clientY, false);
  });

  slotEl.addEventListener(
    'touchstart',
    (e) => {
      if (e.changedTouches.length > 0 && !dragState) {
        const t = e.changedTouches[0];
        startDrag(i, t.clientX, t.clientY, true, t.identifier);
      }
    },
    { passive: true }
  );
}

window.addEventListener('mousemove', (e) => {
  if (dragState && !dragState.isTouch) {
    moveDrag(e.clientX, e.clientY);
  }
});

window.addEventListener(
  'touchmove',
  (e) => {
    if (!dragState || !dragState.isTouch) return;
    const t = findTrackedTouch(e.touches, dragState.touchId) || e.touches[0];
    if (t) moveDrag(t.clientX, t.clientY);
  },
  { passive: true }
);

window.addEventListener('mouseup', () => {
  if (dragState && !dragState.isTouch) endDrag();
});

window.addEventListener('touchend', (e) => {
  if (!dragState || !dragState.isTouch) return;
  if (findTrackedTouch(e.changedTouches, dragState.touchId) || e.touches.length === 0) {
    endDrag();
  }
});

window.addEventListener('touchcancel', (e) => {
  if (!dragState || !dragState.isTouch) return;
  if (findTrackedTouch(e.changedTouches, dragState.touchId) || e.touches.length === 0) {
    endDrag();
  }
});

function placePieceOnBoard(slotIndex, piece, startR, startC) {
  sfx.place();
  haptics.place();

  let blocksPlacedCount = 0;
  const newlyPlacedCoords = [];

  for (let r = 0; r < piece.matrix.length; r++) {
    for (let c = 0; c < piece.matrix[0].length; c++) {
      if (piece.matrix[r][c] === 1) {
        board[startR + r][startC + c] = piece.color;
        blocksPlacedCount++;
        newlyPlacedCoords.push([startR + r, startC + c]);
      }
    }
  }

  trayPieces[slotIndex] = null;

  const { clearingRows, clearingCols } = simulateLinesToClear(board, null, 0, 0);
  const totalLinesCleared = clearingRows.size + clearingCols.size;

  renderBoard(null);
  newlyPlacedCoords.forEach(([r, c]) => {
    cellElements[r][c].classList.add('just-placed');
  });

  const anchorCell = cellElements[startR][startC];
  const anchorRect = anchorCell.getBoundingClientRect();
  const boardRect = boardContainerEl.getBoundingClientRect();
  const relX = anchorRect.left - boardRect.left + anchorRect.width;
  const relY = anchorRect.top - boardRect.top;

  if (totalLinesCleared > 0) {
    comboCount++;
    movesSinceLastClear = 0;

    if (comboCount % 4 === 0) {
      rerollCharges = Math.min(MAX_BOOSTER_CHARGES, rerollCharges + 1);
      rotateCharges = Math.min(MAX_BOOSTER_CHARGES, rotateCharges + 1);
      updateBoostersUI();
    }

    const cellsToClear = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (clearingRows.has(r) || clearingCols.has(c)) {
          cellsToClear.push({ r, c, color: board[r][c] });
          board[r][c] = null;
        }
      }
    }

    const isBoardEmpty = board.every((row) => row.every((cell) => cell === null));
    const { totalEarned } = calculateLineClearScore(
      blocksPlacedCount,
      totalLinesCleared,
      comboCount,
      isBoardEmpty
    );

    sfx.clear(totalLinesCleared, comboCount);
    haptics.clear(totalLinesCleared);

    if (totalLinesCleared >= 2 || comboCount >= 2) {
      boardContainerEl.classList.remove('shake-board');
      void boardContainerEl.offsetWidth;
      boardContainerEl.classList.add('shake-board');
    }

    cellsToClear.forEach(({ r, c, color }) => {
      const el = cellElements[r][c];
      el.classList.add('clearing-cell');
      const rect = el.getBoundingClientRect();
      particles.spawnCellParticles(rect, color ? color.hex : piece.color.hex);
    });

    addScore(totalEarned);
    showFloatingScore(`+${totalEarned}`, relX, relY, true);
    showAnnouncementBanner(totalLinesCleared, comboCount, isBoardEmpty);

    if (isBoardEmpty) {
      setTimeout(() => {
        sfx.allClear();
        haptics.allClear();
      }, 220);
    }

    isClearing = true;
    persistState();
    setTimeout(() => {
      isClearing = false;
      renderBoard(null);
      afterMoveLifecycle();
    }, 280);
  } else {
    addScore(blocksPlacedCount);
    showFloatingScore(`+${blocksPlacedCount}`, relX, relY, false);

    if (comboCount > 0) {
      movesSinceLastClear++;
      if (movesSinceLastClear >= MAX_COMBO_GRACE_MOVES) {
        comboCount = 0;
        movesSinceLastClear = 0;
      }
    }
    afterMoveLifecycle();
  }

  updateComboUI();
}

function afterMoveLifecycle() {
  if (trayPieces.every((p) => p === null)) {
    spawnNewTray(true);
  } else {
    renderTray(false);
    persistState();
    checkGameOverState();
  }
}

function updateComboUI() {
  if (comboCount > 0) {
    comboCountEl.textContent = String(comboCount);
    comboBadgeEl.classList.remove('opacity-0', 'scale-90');
    comboBadgeEl.classList.add('opacity-100', 'scale-100');

    streakDotsEl.classList.remove('opacity-0');
    const remainingGrace = MAX_COMBO_GRACE_MOVES - movesSinceLastClear;
    const dots = streakDotsEl.children;
    for (let i = 0; i < 3; i++) {
      dots[i].className =
        i < remainingGrace
          ? 'w-2.5 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] transition-all'
          : 'w-2.5 h-2 rounded-full bg-slate-600/60 transition-all';
    }
  } else {
    comboBadgeEl.classList.add('opacity-0', 'scale-90');
    comboBadgeEl.classList.remove('opacity-100', 'scale-100');
    streakDotsEl.classList.add('opacity-0');
  }
}

function showFloatingScore(text, x, y, isBig) {
  const el = document.createElement('div');
  el.className = `score-float absolute font-extrabold pointer-events-none z-30 ${
    isBig ? 'text-2xl sm:text-3xl text-amber-300' : 'text-lg text-white/90'
  }`;
  el.style.left = `${Math.min(Math.max(x, 40), boardContainerEl.clientWidth - 40)}px`;
  el.style.top = `${Math.min(Math.max(y, 30), boardContainerEl.clientHeight - 30)}px`;
  el.textContent = text;
  floatingUiEl.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function showAnnouncementBanner(lines, combo, isAllClear) {
  let label = '';
  let iconClass = 'fa-solid fa-bolt';
  let gradient = 'from-yellow-300 via-amber-400 to-orange-500';

  if (isAllClear) {
    label = 'PERFECT CLEAR! +300';
    iconClass = 'fa-solid fa-star';
    gradient = 'from-emerald-300 via-cyan-300 to-blue-400';
  } else if (combo >= 5) {
    label = `UNBELIEVABLE! COMBO x${combo}`;
    iconClass = 'fa-solid fa-fire-flame-curved';
    gradient = 'from-fuchsia-400 via-pink-400 to-amber-300';
  } else if (combo >= 2) {
    label = `COMBO x${combo}!`;
    iconClass = 'fa-solid fa-bolt';
  } else if (lines >= 4) {
    label = 'FANTASTIC! 4 BARIS!';
    iconClass = 'fa-solid fa-burst';
  } else if (lines === 3) {
    label = 'TRIPLE CLEAR!';
    iconClass = 'fa-solid fa-wand-magic-sparkles';
  } else if (lines === 2) {
    label = 'DOUBLE CLEAR!';
    iconClass = 'fa-solid fa-thumbs-up';
  } else {
    return;
  }

  const banner = document.createElement('div');
  banner.className = `combo-banner absolute left-1/2 top-1/2 whitespace-nowrap text-2xl sm:text-3xl font-extrabold bg-gradient-to-b ${gradient} bg-clip-text text-transparent z-40 pointer-events-none flex items-center gap-2`;

  const iconEl = document.createElement('i');
  iconEl.className = `${iconClass} text-amber-300 drop-shadow`;
  const textEl = document.createElement('span');
  textEl.textContent = label;

  banner.appendChild(iconEl);
  banner.appendChild(textEl);
  floatingUiEl.appendChild(banner);
  setTimeout(() => banner.remove(), 1100);
}

function updateBoostersUI() {
  rerollCountEl.textContent = String(rerollCharges);
  rotateCountEl.textContent = String(rotateCharges);
  rerollBtn.disabled = rerollCharges <= 0;
  rotateBtn.disabled = rotateCharges <= 0;
}

rerollBtn.addEventListener('click', () => {
  if (isClearing || isGameOver || rerollCharges <= 0) return;
  rerollCharges--;
  sfx.pickup();
  haptics.pickup();
  updateBoostersUI();
  spawnNewTray(true);
});

rotateBtn.addEventListener('click', () => {
  if (isClearing || isGameOver || rotateCharges <= 0) return;
  if (!trayPieces.some((p) => p !== null)) return;

  rotateCharges--;
  sfx.pickup();
  haptics.pickup();
  for (let i = 0; i < 3; i++) {
    if (trayPieces[i]) {
      trayPieces[i].matrix = rotateMatrixClockwise(trayPieces[i].matrix);
    }
  }
  updateBoostersUI();
  renderTray(true);
  persistState();
  checkGameOverState();
});

function checkGameOverState() {
  const remainingPieces = trayPieces.filter((p) => p !== null);
  if (remainingPieces.length === 0) return;

  if (!hasAnyValidMove(board, remainingPieces)) {
    isGameOver = true;
    persistState();
    if (gameOverTimeoutId) clearTimeout(gameOverTimeoutId);
    gameOverTimeoutId = setTimeout(() => {
      gameOverTimeoutId = null;
      if (isGameOver) {
        showGameOverModal(true);
      }
    }, 450);
  }
}

document.querySelectorAll('.sound-toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nextEnabled = !sfx.enabled;
    sfx.setEnabled(nextEnabled);
    saveSoundEnabled(nextEnabled);
    syncSoundIcons();
    if (nextEnabled) {
      sfx.pickup();
      haptics.pickup();
    }
  });
});

document.querySelectorAll('.restart-trigger-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    sfx.pickup();
    haptics.pickup();
    initNewGame();
  });
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  sfx.pickup();
  haptics.pickup();
  initNewGame();
});

let hasBooted = false;
function bootGame() {
  if (hasBooted && cellElements.length === GRID_SIZE) return;
  hasBooted = true;
  syncSoundIcons();
  buildBoardDOM();
  restoreGameOrInit();
  setupNativeBridge({
    exitToastEl,
    onSaveState: persistState,
    onSuspendAudio: () => sfx.suspend(),
    onResumeAudio: () => sfx.resume(),
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}

window.addEventListener('resize', () => {
  particles.resize();
  renderTray(false);
});
