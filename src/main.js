import './styles/main.css';

import {
  BLITZ_INITIAL_SECONDS,
  BOMB_DEFUSE_BONUS,
  GAME_MODES,
  GAME_MODE_LIST,
  GRID_SIZE,
  INITIAL_BOOSTERS,
  MAX_BOOSTER_CHARGES,
  MAX_COMBO_GRACE_MOVES,
  THEMES,
} from './game/constants.js';
import {
  applyHammerBlast,
  calculateLineClearScore,
  canPieceFitAnywhere,
  canPieceFitAt,
  cloneBoard,
  cloneTrayPieces,
  createEmptyBoard,
  generateBalancedTray,
  hasAnyValidMove,
  rotateMatrixClockwise,
  simulateLinesToClear,
} from './game/logic.js';
import {
  addBlitzTime,
  getAdventureLevelConfig,
  maybeSpawnBomb,
  tickBombsOnBoard,
} from './game/modes.js';
import {
  clearModeSave,
  loadBestScores,
  loadModeSave,
  loadSettings,
  loadStats,
  recordAdventureProgress,
  recordGameStarted,
  recordLineClearStats,
  resetAllStats,
  saveModeSave,
  saveSettings,
  updateBestScore,
} from './game/storage.js';
import { SoundFX } from './game/sound.js';
import { haptics } from './game/haptics.js';
import { ParticleSystem } from './game/particles.js';
import { setupNativeBridge } from './game/native.js';

let settings = loadSettings();
let bestScores = loadBestScores();
const sfx = new SoundFX(settings.soundEnabled);
haptics.setEnabled(settings.hapticsEnabled);

// Active session state
let currentScreen = 'menu'; // 'menu' | 'game'
let currentMode = 'classic';
let board = createEmptyBoard();
let trayPieces = [null, null, null];
let score = 0;
let displayedScore = 0;
let comboCount = 0;
let movesSinceLastClear = 0;
let movesCount = 0;
let currentLevel = 1;
let currentLevelTitle = '';
let targetLines = 4;
let linesClearedInRun = 0;
let timeLeft = BLITZ_INITIAL_SECONDS;
let rerollCharges = INITIAL_BOOSTERS.reroll;
let rotateCharges = INITIAL_BOOSTERS.rotate;
let hammerCharges = INITIAL_BOOSTERS.hammer;
let undoCharges = INITIAL_BOOSTERS.undo;
let undoSnapshot = null;

let isGameOver = false;
let isLevelComplete = false;
let isPaused = false;
let isClearing = false;
let isHammerTargeting = false;
let blitzIntervalId = null;
let gameOverTimeoutId = null;
let resetStatsArmedTimeout = null;

// Drag & render optimization state
let dragState = null;
let cachedBoardMetrics = null;
let snapRafId = null;
let pendingDragCoords = null;
const lastCellSignatures = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
const lastCellBombs = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

// DOM References
const mainMenuScreen = document.getElementById('main-menu-screen');
const gameScreen = document.getElementById('game-screen');
const modeCardsContainer = document.getElementById('mode-cards-container');
const fxCanvas = document.getElementById('fx-canvas');
const boardGridEl = document.getElementById('board-grid');
const boardContainerEl = document.getElementById('board-container');
const floatingUiEl = document.getElementById('floating-ui');
const hammerBannerEl = document.getElementById('hammer-banner');
const currentScoreEl = document.getElementById('current-score-el');
const bestScoreEl = document.getElementById('best-score-el');
const hudPillIcon = document.getElementById('hud-pill-icon');
const hudPillLabel = document.getElementById('hud-pill-label');
const modeStatusPill = document.getElementById('mode-status-pill');
const modeStatusIcon = document.getElementById('mode-status-icon');
const modeStatusText = document.getElementById('mode-status-text');
const comboBadgeEl = document.getElementById('combo-badge');
const comboCountEl = document.getElementById('combo-count');
const streakDotsEl = document.getElementById('streak-dots');
const dragProxyEl = document.getElementById('drag-proxy');
const exitToastEl = document.getElementById('exit-toast');

const rerollBtn = document.getElementById('reroll-btn');
const rotateBtn = document.getElementById('rotate-btn');
const hammerBtn = document.getElementById('hammer-btn');
const undoBtn = document.getElementById('undo-btn');
const rerollCountEl = document.getElementById('reroll-count');
const rotateCountEl = document.getElementById('rotate-count');
const hammerCountEl = document.getElementById('hammer-count');
const undoCountEl = document.getElementById('undo-count');

const pauseModal = document.getElementById('pause-modal');
const settingsModal = document.getElementById('settings-modal');
const statsModal = document.getElementById('stats-modal');
const levelClearModal = document.getElementById('level-clear-modal');
const gameOverModal = document.getElementById('game-over-modal');

const particles = new ParticleSystem(fxCanvas);
const cellElements = [];

function setModalVisible(modalEl, visible) {
  if (!modalEl) return;
  if (visible) {
    modalEl.classList.remove('hidden');
    modalEl.classList.add('flex');
  } else {
    modalEl.classList.add('hidden');
    modalEl.classList.remove('flex');
  }
}

function isModalVisible(modalEl) {
  return modalEl && !modalEl.classList.contains('hidden');
}

function applyTheme(themeId) {
  const validTheme = THEMES[themeId] ? themeId : 'classic';
  document.body.dataset.theme = validTheme;
  settings.theme = validTheme;
  saveSettings(settings);
  renderThemeOptions();
}

function syncSoundUI() {
  sfx.setEnabled(settings.soundEnabled);
  document.querySelectorAll('.sound-icon').forEach((icon) => {
    icon.className = settings.soundEnabled
      ? 'sound-icon fa-solid fa-volume-high'
      : 'sound-icon fa-solid fa-volume-xmark';
  });

  const pill = document.getElementById('setting-sound-pill');
  if (pill) {
    pill.textContent = settings.soundEnabled ? 'ON' : 'OFF';
    pill.className = settings.soundEnabled
      ? 'px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white'
      : 'px-3 py-1 rounded-full text-xs font-extrabold bg-slate-600 text-slate-200';
  }
}

function syncHapticsUI() {
  haptics.setEnabled(settings.hapticsEnabled);
  const pill = document.getElementById('setting-haptics-pill');
  if (pill) {
    pill.textContent = settings.hapticsEnabled ? 'ON' : 'OFF';
    pill.className = settings.hapticsEnabled
      ? 'px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white'
      : 'px-3 py-1 rounded-full text-xs font-extrabold bg-slate-600 text-slate-200';
  }
}

function renderThemeOptions() {
  const grid = document.getElementById('theme-options-grid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.values(THEMES).forEach((theme) => {
    const active = settings.theme === theme.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `rounded-xl p-2 border-2 flex flex-col items-center gap-1.5 transition-transform ${
      active ? 'border-amber-400 bg-white/10 scale-[1.03]' : 'border-white/10 bg-black/20'
    }`;

    const swatch = document.createElement('span');
    swatch.className = 'w-7 h-7 rounded-lg border border-white/30 shadow';
    swatch.style.backgroundColor = theme.preview;

    const label = document.createElement('span');
    label.className = 'text-[10px] font-bold text-white leading-tight text-center';
    label.textContent = theme.label;

    btn.appendChild(swatch);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      sfx.pickup();
      haptics.pickup();
      applyTheme(theme.id);
    });
    grid.appendChild(btn);
  });
}

function persistCurrentState() {
  if (currentScreen !== 'game') return;
  saveModeSave(currentMode, {
    mode: currentMode,
    board,
    trayPieces,
    score,
    comboCount,
    movesSinceLastClear,
    movesCount,
    level: currentLevel,
    targetLines,
    linesClearedInRun,
    timeLeft,
    rerollCharges,
    rotateCharges,
    hammerCharges,
    undoCharges,
    isGameOver,
    isLevelComplete,
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
      cell.addEventListener('click', () => onBoardCellTapped(r, c));
      boardGridEl.appendChild(cell);
      rowEls.push(cell);
      lastCellSignatures[r][c] = 'grid-cell';
      lastCellBombs[r][c] = null;
    }
    cellElements.push(rowEls);
  }
}

function showMainMenu() {
  if (currentScreen === 'game') {
    persistCurrentState();
  }
  stopBlitzTimer();
  cancelDragIfActive();
  setHammerTargeting(false);

  currentScreen = 'menu';
  setModalVisible(pauseModal, false);
  setModalVisible(gameOverModal, false);
  setModalVisible(levelClearModal, false);

  gameScreen.classList.add('hidden');
  gameScreen.classList.remove('flex');
  mainMenuScreen.classList.remove('hidden');
  mainMenuScreen.classList.add('flex');

  renderMainMenuCards();
}

function renderMainMenuCards() {
  bestScores = loadBestScores();
  const stats = loadStats();
  modeCardsContainer.innerHTML = '';

  GAME_MODE_LIST.forEach((mode) => {
    const saved = loadModeSave(mode.id);
    const hasContinuableSave = Boolean(saved && !saved.isGameOver && !saved.isLevelComplete);

    const card = document.createElement('div');
    card.className = 'theme-panel border-2 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between gap-2.5';

    const topRow = document.createElement('div');
    topRow.className = 'flex items-start justify-between gap-2.5';

    const infoWrap = document.createElement('div');
    infoWrap.className = 'flex items-center gap-3 min-w-0';

    const iconBox = document.createElement('div');
    iconBox.className = `w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br ${mode.accent} flex items-center justify-center text-white text-lg shadow`;
    const iconEl = document.createElement('i');
    iconEl.className = mode.icon;
    iconBox.appendChild(iconEl);

    const textWrap = document.createElement('div');
    textWrap.className = 'min-w-0';
    const titleEl = document.createElement('h3');
    titleEl.className = 'text-base font-extrabold text-white leading-tight';
    titleEl.textContent = mode.label;
    const descEl = document.createElement('p');
    descEl.className = 'text-[11px] text-blue-200/75 leading-snug mt-0.5';
    descEl.textContent = mode.desc;
    textWrap.appendChild(titleEl);
    textWrap.appendChild(descEl);

    infoWrap.appendChild(iconBox);
    infoWrap.appendChild(textWrap);

    const badge = document.createElement('div');
    badge.className = 'shrink-0 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1 text-right';
    const badgeLabel = document.createElement('div');
    badgeLabel.className = 'text-[9px] uppercase font-bold text-amber-300/80 leading-none';
    badgeLabel.textContent = mode.id === 'adventure' ? 'Stage' : 'Terbaik';
    const badgeVal = document.createElement('div');
    badgeVal.className = 'text-sm font-extrabold text-amber-300 leading-tight';
    badgeVal.textContent =
      mode.id === 'adventure'
        ? `Lv ${stats.highestAdventureLevel}`
        : (bestScores[mode.id] || 0).toLocaleString('id-ID');
    badge.appendChild(badgeLabel);
    badge.appendChild(badgeVal);

    topRow.appendChild(infoWrap);
    topRow.appendChild(badge);

    const btnRow = document.createElement('div');
    btnRow.className = 'flex items-center gap-2';

    if (hasContinuableSave) {
      const contBtn = document.createElement('button');
      contBtn.type = 'button';
      contBtn.className = 'btn-3d flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-extrabold border border-white/25 flex items-center justify-center gap-1.5';
      contBtn.innerHTML = '<i class="fa-solid fa-play text-[10px]"></i><span>Lanjutkan</span>';
      contBtn.addEventListener('click', () => {
        sfx.pickup();
        haptics.pickup();
        startModeGame(mode.id, true);
      });
      btnRow.appendChild(contBtn);
    }

    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = hasContinuableSave
      ? 'btn-3d px-3.5 py-2 rounded-xl theme-btn border text-white text-xs font-bold'
      : `btn-3d flex-1 py-2 rounded-xl bg-gradient-to-r ${mode.accent} text-white text-xs font-extrabold border border-white/25 flex items-center justify-center gap-1.5`;
    newBtn.innerHTML = hasContinuableSave
      ? '<span>Baru</span>'
      : '<i class="fa-solid fa-play text-[10px]"></i><span>Mainkan</span>';
    newBtn.addEventListener('click', () => {
      sfx.pickup();
      haptics.pickup();
      startModeGame(mode.id, false);
    });
    btnRow.appendChild(newBtn);

    card.appendChild(topRow);
    card.appendChild(btnRow);
    modeCardsContainer.appendChild(card);
  });
}

function stopBlitzTimer() {
  if (blitzIntervalId !== null) {
    clearInterval(blitzIntervalId);
    blitzIntervalId = null;
  }
}

function startBlitzTimerIfNeeded() {
  stopBlitzTimer();
  if (currentMode !== 'blitz') return;

  blitzIntervalId = setInterval(() => {
    if (
      currentScreen !== 'game' ||
      isPaused ||
      isGameOver ||
      isLevelComplete ||
      isModalVisible(settingsModal) ||
      isModalVisible(statsModal)
    ) {
      return;
    }

    timeLeft = Math.max(0, timeLeft - 1);
    updateModeHUD();
    if (timeLeft <= 0) {
      stopBlitzTimer();
      cancelDragIfActive();
      triggerGameOver('WAKTU HABIS!', 'Waktu Time Blitz telah berakhir.', 'fa-solid fa-stopwatch');
    }
  }, 1000);
}

function formatTimer(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function updateModeHUD() {
  bestScores = loadBestScores();
  if (currentMode === 'adventure') {
    hudPillIcon.className = 'fa-solid fa-compass text-emerald-400 text-base';
    hudPillLabel.textContent = `Stage ${currentLevel}`;
    bestScoreEl.textContent = currentLevelTitle || `Lv ${currentLevel}`;
    bestScoreEl.className = 'text-xs sm:text-sm font-extrabold text-emerald-300 leading-tight';

    modeStatusPill.classList.remove('hidden');
    modeStatusIcon.className = 'fa-solid fa-bullseye text-emerald-300';
    modeStatusText.textContent = `Target: ${Math.min(linesClearedInRun, targetLines)}/${targetLines} Baris`;
    modeStatusPill.classList.remove('border-rose-400', 'text-rose-200');
  } else {
    hudPillIcon.className = 'fa-solid fa-crown text-amber-400 text-base';
    hudPillLabel.textContent = `${GAME_MODES[currentMode].label}`;
    bestScoreEl.textContent = (bestScores[currentMode] || 0).toLocaleString('id-ID');
    bestScoreEl.className = 'text-base sm:text-lg font-extrabold text-amber-400 leading-tight';

    if (currentMode === 'blitz') {
      modeStatusPill.classList.remove('hidden');
      modeStatusIcon.className = 'fa-solid fa-stopwatch text-amber-300';
      modeStatusText.textContent = formatTimer(timeLeft);
      if (timeLeft <= 15) {
        modeStatusPill.classList.add('border-rose-400', 'text-rose-200');
      } else {
        modeStatusPill.classList.remove('border-rose-400', 'text-rose-200');
      }
    } else if (currentMode === 'bomb') {
      let bombs = 0;
      let minBomb = Infinity;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const b = board[r][c]?.bomb;
          if (typeof b === 'number') {
            bombs++;
            if (b < minBomb) minBomb = b;
          }
        }
      }
      modeStatusPill.classList.remove('hidden');
      modeStatusIcon.className = 'fa-solid fa-bomb text-rose-400';
      modeStatusText.textContent = bombs > 0 ? `Bom: ${bombs} (Min ${minBomb})` : 'Bom Aman';
      if (minBomb <= 3) {
        modeStatusPill.classList.add('border-rose-400', 'text-rose-200');
      } else {
        modeStatusPill.classList.remove('border-rose-400', 'text-rose-200');
      }
    } else {
      modeStatusPill.classList.add('hidden');
    }
  }
}

function startModeGame(modeId, continueSaved = false, explicitAdventureLevel = null) {
  if (gameOverTimeoutId) {
    clearTimeout(gameOverTimeoutId);
    gameOverTimeoutId = null;
  }

  stopBlitzTimer();
  cancelDragIfActive();
  setHammerTargeting(false);

  currentMode = GAME_MODES[modeId] ? modeId : 'classic';
  currentScreen = 'game';

  mainMenuScreen.classList.add('hidden');
  mainMenuScreen.classList.remove('flex');
  gameScreen.classList.remove('hidden');
  gameScreen.classList.add('flex');

  setModalVisible(pauseModal, false);
  setModalVisible(gameOverModal, false);
  setModalVisible(levelClearModal, false);

  isPaused = false;
  isClearing = false;
  undoSnapshot = null;

  const saved = continueSaved ? loadModeSave(currentMode) : null;
  if (saved && !saved.isGameOver && !saved.isLevelComplete) {
    board = saved.board;
    trayPieces = saved.trayPieces;
    score = saved.score;
    displayedScore = saved.score;
    comboCount = saved.comboCount;
    movesSinceLastClear = saved.movesSinceLastClear;
    movesCount = saved.movesCount;
    currentLevel = saved.level;
    currentLevelTitle =
      currentMode === 'adventure' ? getAdventureLevelConfig(currentLevel).title : '';
    targetLines = saved.targetLines;
    linesClearedInRun = saved.linesClearedInRun;
    timeLeft = saved.timeLeft;
    rerollCharges = saved.rerollCharges;
    rotateCharges = saved.rotateCharges;
    hammerCharges = saved.hammerCharges;
    undoCharges = saved.undoCharges;
    isGameOver = false;
    isLevelComplete = false;
    if (trayPieces.every((p) => p === null)) {
      trayPieces = generateBalancedTray(board);
    }
  } else {
    recordGameStarted();
    score = 0;
    displayedScore = 0;
    comboCount = 0;
    movesSinceLastClear = 0;
    movesCount = 0;
    linesClearedInRun = 0;
    timeLeft = BLITZ_INITIAL_SECONDS;
    rerollCharges = INITIAL_BOOSTERS.reroll;
    rotateCharges = INITIAL_BOOSTERS.rotate;
    hammerCharges = INITIAL_BOOSTERS.hammer;
    undoCharges = INITIAL_BOOSTERS.undo;
    isGameOver = false;
    isLevelComplete = false;

    if (currentMode === 'adventure') {
      const stats = loadStats();
      const targetStage = explicitAdventureLevel || stats.highestAdventureLevel || 1;
      const cfg = getAdventureLevelConfig(targetStage);
      currentLevel = cfg.level;
      currentLevelTitle = cfg.title;
      targetLines = cfg.targetLines;
      board = cfg.board;
    } else {
      currentLevel = 1;
      currentLevelTitle = '';
      targetLines = 4;
      board = createEmptyBoard();
    }

    trayPieces = generateBalancedTray(board);
  }

  currentScoreEl.textContent = score.toLocaleString('id-ID');
  updateModeHUD();
  updateComboUI();
  updateBoostersUI();
  invalidateBoardDiffCache();
  renderBoard(null);
  renderTray(!continueSaved);
  persistCurrentState();
  startBlitzTimerIfNeeded();
  checkGameOverState();
}

function invalidateBoardDiffCache() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      lastCellSignatures[r][c] = '';
      lastCellBombs[r][c] = null;
    }
  }
}

function renderBoard(previewData = null) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const el = cellElements[r][c];
      const cellState = board[r][c];
      const isWillClear =
        previewData && (previewData.clearingRows.has(r) || previewData.clearingCols.has(c));

      let nextClass = 'grid-cell';
      let bombVal = null;

      if (cellState) {
        nextClass = `grid-cell jewel-block ${cellState.cls}`;
        if (isWillClear) nextClass += ' will-clear';
        if (typeof cellState.bomb === 'number') {
          bombVal = cellState.bomb;
          nextClass += cellState.bomb <= 3 ? ' bomb-cell bomb-urgent' : ' bomb-cell';
        }
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
          nextClass = `grid-cell jewel-block ${previewData.piece.color.cls} ${
            isWillClear ? 'will-clear' : 'ghost-preview'
          }`;
        }
      }

      if (nextClass !== lastCellSignatures[r][c]) {
        el.className = nextClass;
        lastCellSignatures[r][c] = nextClass;
      }

      if (bombVal !== lastCellBombs[r][c]) {
        lastCellBombs[r][c] = bombVal;
        if (bombVal === null) {
          el.textContent = '';
        } else {
          el.innerHTML = `<span class="bomb-badge"><span class="bomb-pill">${bombVal}</span></span>`;
        }
      }
    }
  }
}

function addScore(points) {
  score += points;
  const best = updateBestScore(currentMode, score);
  bestScores[currentMode] = best;
  if (currentMode !== 'adventure') {
    bestScoreEl.textContent = best.toLocaleString('id-ID');
  }

  currentScoreEl.classList.add('scale-110');
  setTimeout(() => currentScoreEl.classList.remove('scale-110'), 130);

  const animateStep = () => {
    if (displayedScore < score) {
      const diff = score - displayedScore;
      const step = Math.max(1, Math.ceil(diff * 0.28));
      displayedScore = Math.min(score, displayedScore + step);
      currentScoreEl.textContent = displayedScore.toLocaleString('id-ID');
      requestAnimationFrame(animateStep);
    } else if (displayedScore > score) {
      displayedScore = score;
      currentScoreEl.textContent = displayedScore.toLocaleString('id-ID');
    }
  };
  requestAnimationFrame(animateStep);
}

function spawnNewTray(animate = true) {
  trayPieces = generateBalancedTray(board);
  renderTray(animate);
  persistCurrentState();
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
    const cellSize = maxDim >= 5 ? 14 : maxDim === 4 ? 17 : 20;

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

function computeBoardMetrics() {
  const rect = boardGridEl.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : 320;
  const cellStep = width / GRID_SIZE;
  const firstCellRect = cellElements[0]?.[0]?.getBoundingClientRect();
  const cellSize = firstCellRect && firstCellRect.width > 0 ? firstCellRect.width : cellStep - 4;
  const gap = Math.max(2, (width - cellSize * GRID_SIZE) / (GRID_SIZE - 1));
  return { rect, cellStep, cellSize, gap };
}

function cancelDragIfActive() {
  if (snapRafId !== null) {
    cancelAnimationFrame(snapRafId);
    snapRafId = null;
  }
  pendingDragCoords = null;
  if (dragState) {
    const slotEl = document.getElementById(`slot-${dragState.slotIndex}`);
    if (slotEl) slotEl.style.opacity = '1';
    dragState = null;
  }
  dragProxyEl.style.display = 'none';
  dragProxyEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
}

function startDrag(slotIndex, clientX, clientY, isTouch, touchId = null) {
  if (
    currentScreen !== 'game' ||
    isClearing ||
    isGameOver ||
    isLevelComplete ||
    isPaused ||
    isHammerTargeting ||
    dragState
  ) {
    return;
  }

  const piece = trayPieces[slotIndex];
  if (!piece) return;

  sfx.pickup();
  haptics.pickup();

  cachedBoardMetrics = computeBoardMetrics();
  const { cellStep, cellSize, gap } = cachedBoardMetrics;
  const rows = piece.matrix.length;
  const cols = piece.matrix[0].length;

  const frag = document.createDocumentFragment();
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
      frag.appendChild(cell);
    }
  }
  dragProxyEl.appendChild(frag);

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

function updateDragSnapPreview(coords) {
  if (!dragState || !cachedBoardMetrics || !coords) return;

  const { rect, cellStep } = cachedBoardMetrics;
  const { piece } = dragState;
  const { leftX, topY, centerX, centerY } = coords;

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

function moveDrag(clientX, clientY) {
  if (!dragState) return;

  const { proxyWidth, proxyHeight, isTouch } = dragState;
  const verticalLift = isTouch ? 85 : 35;
  const centerX = clientX;
  const centerY = clientY - verticalLift;
  const leftX = centerX - proxyWidth / 2;
  const topY = centerY - proxyHeight / 2;

  // Immediate GPU-composited translation (0ms layout reflow)
  dragProxyEl.style.transform = `translate3d(${leftX}px, ${topY}px, 0)`;

  pendingDragCoords = { leftX, topY, centerX, centerY };
  if (snapRafId === null) {
    snapRafId = requestAnimationFrame(() => {
      snapRafId = null;
      if (pendingDragCoords && dragState) {
        updateDragSnapPreview(pendingDragCoords);
      }
    });
  }
}

function endDrag() {
  if (!dragState) return;

  if (snapRafId !== null) {
    cancelAnimationFrame(snapRafId);
    snapRafId = null;
  }
  if (pendingDragCoords) {
    updateDragSnapPreview(pendingDragCoords);
    pendingDragCoords = null;
  }

  const { slotIndex, piece, targetR, targetC } = dragState;
  const slotEl = document.getElementById(`slot-${slotIndex}`);
  dragProxyEl.style.display = 'none';
  dragProxyEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
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

function captureUndoSnapshot() {
  undoSnapshot = {
    board: cloneBoard(board),
    trayPieces: cloneTrayPieces(trayPieces),
    score,
    displayedScore,
    comboCount,
    movesSinceLastClear,
    movesCount,
    linesClearedInRun,
    timeLeft,
  };
}

function placePieceOnBoard(slotIndex, piece, startR, startC) {
  captureUndoSnapshot();

  sfx.place();
  haptics.place();
  movesCount++;

  let blocksPlacedCount = 0;
  const newlyPlacedCoords = [];

  for (let r = 0; r < piece.matrix.length; r++) {
    for (let c = 0; c < piece.matrix[0].length; c++) {
      if (piece.matrix[r][c] === 1) {
        board[startR + r][startC + c] = { ...piece.color };
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
    lastCellSignatures[r][c] = '';
  });

  const anchorCell = cellElements[startR][startC];
  const anchorRect = anchorCell.getBoundingClientRect();
  const boardRect = boardContainerEl.getBoundingClientRect();
  const relX = anchorRect.left - boardRect.left + anchorRect.width;
  const relY = anchorRect.top - boardRect.top;

  if (totalLinesCleared > 0) {
    comboCount++;
    movesSinceLastClear = 0;
    linesClearedInRun += totalLinesCleared;
    recordLineClearStats(totalLinesCleared, comboCount);

    if (comboCount % 4 === 0) {
      rerollCharges = Math.min(MAX_BOOSTER_CHARGES, rerollCharges + 1);
      rotateCharges = Math.min(MAX_BOOSTER_CHARGES, rotateCharges + 1);
      if (comboCount % 8 === 0) {
        hammerCharges = Math.min(MAX_BOOSTER_CHARGES, hammerCharges + 1);
      }
    }

    const cellsToClear = [];
    let defusedBombs = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (clearingRows.has(r) || clearingCols.has(c)) {
          const cell = board[r][c];
          if (cell && typeof cell.bomb === 'number') {
            defusedBombs++;
          }
          cellsToClear.push({ r, c, color: cell });
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
    const bombBonus = defusedBombs * BOMB_DEFUSE_BONUS;
    const totalPoints = totalEarned + bombBonus;

    if (currentMode === 'blitz') {
      timeLeft = addBlitzTime(timeLeft, totalLinesCleared);
    }

    sfx.clear(totalLinesCleared, comboCount);
    haptics.clear(totalLinesCleared);
    if (defusedBombs > 0) {
      setTimeout(() => sfx.defuse(), 100);
    }

    if (totalLinesCleared >= 2 || comboCount >= 2) {
      boardContainerEl.classList.remove('shake-board');
      void boardContainerEl.offsetWidth;
      boardContainerEl.classList.add('shake-board');
    }

    cellsToClear.forEach(({ r, c, color }) => {
      const el = cellElements[r][c];
      el.classList.add('clearing-cell');
      el.textContent = '';
      lastCellSignatures[r][c] = '';
      lastCellBombs[r][c] = null;
      const rect = el.getBoundingClientRect();
      particles.spawnCellParticles(rect, color ? color.hex : piece.color.hex);
    });

    addScore(totalPoints);
    const floatLabel =
      currentMode === 'blitz'
        ? `+${totalPoints} • +${totalLinesCleared * 3}d`
        : defusedBombs > 0
          ? `+${totalPoints} DEFUSE!`
          : `+${totalPoints}`;
    showFloatingScore(floatLabel, relX, relY, true);
    showAnnouncementBanner(totalLinesCleared, comboCount, isBoardEmpty);

    if (isBoardEmpty) {
      setTimeout(() => {
        sfx.allClear();
        haptics.allClear();
      }, 210);
    }

    isClearing = true;
    updateBoostersUI();
    updateComboUI();
    updateModeHUD();
    persistCurrentState();

    setTimeout(() => {
      isClearing = false;
      renderBoard(null);
      finishMoveModeLifecycle();
    }, 260);
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

    updateComboUI();
    updateBoostersUI();
    finishMoveModeLifecycle();
  }
}

function finishMoveModeLifecycle() {
  if (currentMode === 'adventure' && linesClearedInRun >= targetLines) {
    isLevelComplete = true;
    recordAdventureProgress(currentLevel + 1);
    clearModeSave('adventure');
    sfx.levelWin();
    haptics.levelWin();

    document.getElementById('level-clear-title').textContent = `STAGE ${currentLevel} SELESAI!`;
    document.getElementById('level-clear-subtitle').textContent =
      `"${currentLevelTitle}" ditaklukkan! Siap ke Stage ${currentLevel + 1}?`;
    document.getElementById('level-clear-score').textContent = score.toLocaleString('id-ID');
    setModalVisible(levelClearModal, true);
    return;
  }

  if (currentMode === 'bomb') {
    const { exploded } = tickBombsOnBoard(board);
    if (exploded) {
      renderBoard(null);
      updateModeHUD();
      triggerGameOver(
        'BOM MELEDAK!',
        'Salah satu bom mencapai hitungan 0 sebelum dihancurkan.',
        'fa-solid fa-bomb'
      );
      return;
    }
    maybeSpawnBomb(board, movesCount);
    renderBoard(null);
  }

  updateModeHUD();

  if (trayPieces.every((p) => p === null)) {
    spawnNewTray(true);
  } else {
    renderTray(false);
    persistCurrentState();
    checkGameOverState();
  }
}

function setHammerTargeting(active) {
  isHammerTargeting = Boolean(active);
  if (isHammerTargeting) {
    gameScreen.classList.add('hammer-mode');
    hammerBannerEl.classList.remove('hidden');
    hammerBtn.classList.add('ring-2', 'ring-white');
  } else {
    gameScreen.classList.remove('hammer-mode');
    hammerBannerEl.classList.add('hidden');
    hammerBtn.classList.remove('ring-2', 'ring-white');
  }
}

function onBoardCellTapped(r, c) {
  if (!isHammerTargeting || isClearing || isGameOver || isLevelComplete || isPaused) return;

  // Check if 3x3 area has at least 1 occupied cell
  let hasAnyCell = false;
  for (let dr = -1; dr <= 1 && !hasAnyCell; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && board[nr][nc]) {
        hasAnyCell = true;
        break;
      }
    }
  }

  if (!hasAnyCell) {
    sfx.invalid();
    haptics.invalid();
    return;
  }

  captureUndoSnapshot();
  hammerCharges--;
  setHammerTargeting(false);

  const { clearedCells, defusedBombs } = applyHammerBlast(board, r, c);
  sfx.hammer();
  haptics.hammer();
  if (defusedBombs > 0) {
    setTimeout(() => sfx.defuse(), 90);
  }

  boardContainerEl.classList.remove('shake-board');
  void boardContainerEl.offsetWidth;
  boardContainerEl.classList.add('shake-board');

  clearedCells.forEach(({ r: cr, c: cc, color }) => {
    const el = cellElements[cr][cc];
    const rect = el.getBoundingClientRect();
    particles.spawnCellParticles(rect, color.hex, 7);
  });

  const points = clearedCells.length * 2 + defusedBombs * BOMB_DEFUSE_BONUS;
  addScore(points);

  const anchorRect = cellElements[r][c].getBoundingClientRect();
  const boardRect = boardContainerEl.getBoundingClientRect();
  showFloatingScore(
    defusedBombs > 0 ? `+${points} PALU DEFUSE!` : `+${points}`,
    anchorRect.left - boardRect.left + anchorRect.width / 2,
    anchorRect.top - boardRect.top,
    true
  );

  renderBoard(null);
  renderTray(false);
  updateModeHUD();
  updateBoostersUI();
  persistCurrentState();
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
          ? 'w-2.5 h-2 rounded-full bg-amber-400 transition-all'
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
    isBig ? 'text-xl sm:text-2xl text-amber-300' : 'text-base text-white/90'
  }`;
  el.style.left = `${Math.min(Math.max(x, 48), boardContainerEl.clientWidth - 48)}px`;
  el.style.top = `${Math.min(Math.max(y, 28), boardContainerEl.clientHeight - 28)}px`;
  el.textContent = text;
  floatingUiEl.appendChild(el);
  setTimeout(() => el.remove(), 900);
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
  setTimeout(() => banner.remove(), 1050);
}

function updateBoostersUI() {
  rerollCountEl.textContent = String(rerollCharges);
  rotateCountEl.textContent = String(rotateCharges);
  hammerCountEl.textContent = String(hammerCharges);
  undoCountEl.textContent = String(undoCharges);

  rerollBtn.disabled = rerollCharges <= 0;
  rotateBtn.disabled = rotateCharges <= 0;
  hammerBtn.disabled = hammerCharges <= 0;
  undoBtn.disabled = undoCharges <= 0 || undoSnapshot === null;
}

function triggerGameOver(title, reason, iconClass = 'fa-solid fa-burst') {
  isGameOver = true;
  setHammerTargeting(false);
  stopBlitzTimer();
  persistCurrentState();

  sfx.gameOver();
  haptics.gameOver();

  const best = updateBestScore(currentMode, score);
  bestScores[currentMode] = best;

  document.getElementById('game-over-icon').className = iconClass;
  document.getElementById('game-over-title').textContent = title;
  document.getElementById('game-over-reason').textContent = reason;
  document.getElementById('modal-score').textContent = score.toLocaleString('id-ID');
  document.getElementById('modal-best').textContent = best.toLocaleString('id-ID');

  const badge = document.getElementById('new-record-badge');
  if (score > 0 && score >= best) {
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  setModalVisible(gameOverModal, true);
}

function checkGameOverState() {
  const remainingPieces = trayPieces.filter((p) => p !== null);
  if (remainingPieces.length === 0) return;

  if (!hasAnyValidMove(board, remainingPieces)) {
    isGameOver = true;
    persistCurrentState();
    if (gameOverTimeoutId) clearTimeout(gameOverTimeoutId);
    gameOverTimeoutId = setTimeout(() => {
      gameOverTimeoutId = null;
      if (isGameOver && currentScreen === 'game') {
        triggerGameOver(
          'TIDAK ADA RUANG!',
          'Tidak ada lagi balok yang muat di papan.',
          'fa-solid fa-burst'
        );
      }
    }, 420);
  }
}

function openPauseModal() {
  if (currentScreen !== 'game' || isGameOver || isLevelComplete) return;
  isPaused = true;
  cancelDragIfActive();
  setHammerTargeting(false);
  persistCurrentState();
  document.getElementById('pause-mode-label').textContent =
    currentMode === 'adventure'
      ? `Petualangan • Stage ${currentLevel}`
      : `Mode ${GAME_MODES[currentMode].label}`;
  setModalVisible(pauseModal, true);
}

function resumeFromPause() {
  isPaused = false;
  setModalVisible(pauseModal, false);
}

function openStatsModal() {
  const stats = loadStats();
  bestScores = loadBestScores();
  document.getElementById('stat-games-played').textContent = stats.gamesPlayed.toLocaleString('id-ID');
  document.getElementById('stat-lines-cleared').textContent = stats.totalLinesCleared.toLocaleString('id-ID');
  document.getElementById('stat-max-combo').textContent = `x${stats.maxCombo}`;
  document.getElementById('stat-adventure-level').textContent = `Lv ${stats.highestAdventureLevel}`;
  document.getElementById('stat-best-classic').textContent = (bestScores.classic || 0).toLocaleString('id-ID');
  document.getElementById('stat-best-bomb').textContent = (bestScores.bomb || 0).toLocaleString('id-ID');
  document.getElementById('stat-best-blitz').textContent = (bestScores.blitz || 0).toLocaleString('id-ID');
  setModalVisible(statsModal, true);
}

// Booster Buttons
rerollBtn.addEventListener('click', () => {
  if (isClearing || isGameOver || isLevelComplete || isPaused || rerollCharges <= 0) return;
  setHammerTargeting(false);
  rerollCharges--;
  sfx.pickup();
  haptics.pickup();
  updateBoostersUI();
  spawnNewTray(true);
});

rotateBtn.addEventListener('click', () => {
  if (isClearing || isGameOver || isLevelComplete || isPaused || rotateCharges <= 0) return;
  if (!trayPieces.some((p) => p !== null)) return;
  setHammerTargeting(false);
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
  persistCurrentState();
  checkGameOverState();
});

hammerBtn.addEventListener('click', () => {
  if (isClearing || isGameOver || isLevelComplete || isPaused || hammerCharges <= 0) return;
  sfx.pickup();
  haptics.pickup();
  setHammerTargeting(!isHammerTargeting);
});

undoBtn.addEventListener('click', () => {
  if (isClearing || isGameOver || isLevelComplete || isPaused || undoCharges <= 0 || !undoSnapshot) {
    return;
  }
  setHammerTargeting(false);
  undoCharges--;

  board = cloneBoard(undoSnapshot.board);
  trayPieces = cloneTrayPieces(undoSnapshot.trayPieces);
  score = undoSnapshot.score;
  displayedScore = undoSnapshot.score;
  comboCount = undoSnapshot.comboCount;
  movesSinceLastClear = undoSnapshot.movesSinceLastClear;
  movesCount = undoSnapshot.movesCount;
  linesClearedInRun = undoSnapshot.linesClearedInRun;
  timeLeft = undoSnapshot.timeLeft;
  undoSnapshot = null;

  sfx.pickup();
  haptics.pickup();
  currentScoreEl.textContent = score.toLocaleString('id-ID');
  invalidateBoardDiffCache();
  renderBoard(null);
  renderTray(false);
  updateComboUI();
  updateModeHUD();
  updateBoostersUI();
  persistCurrentState();
});

// Header, Menu & Modal Listeners
document.getElementById('pause-btn').addEventListener('click', () => {
  sfx.pickup();
  haptics.pickup();
  openPauseModal();
});

document.getElementById('pause-resume-btn').addEventListener('click', () => {
  sfx.pickup();
  haptics.pickup();
  resumeFromPause();
});

document.getElementById('pause-restart-btn').addEventListener('click', () => {
  sfx.pickup();
  haptics.pickup();
  startModeGame(currentMode, false, currentMode === 'adventure' ? currentLevel : null);
});

document.getElementById('pause-settings-btn').addEventListener('click', () => {
  sfx.pickup();
  setModalVisible(settingsModal, true);
});

document.getElementById('pause-menu-btn').addEventListener('click', () => {
  sfx.pickup();
  showMainMenu();
});

document.getElementById('menu-settings-btn').addEventListener('click', () => {
  sfx.pickup();
  setModalVisible(settingsModal, true);
});

document.getElementById('settings-close-btn').addEventListener('click', () => {
  sfx.pickup();
  setModalVisible(settingsModal, false);
});

document.getElementById('setting-sound-toggle').addEventListener('click', () => {
  settings.soundEnabled = !settings.soundEnabled;
  saveSettings(settings);
  syncSoundUI();
  if (settings.soundEnabled) sfx.pickup();
});

document.getElementById('setting-haptics-toggle').addEventListener('click', () => {
  settings.hapticsEnabled = !settings.hapticsEnabled;
  saveSettings(settings);
  syncHapticsUI();
  sfx.pickup();
  if (settings.hapticsEnabled) haptics.pickup();
});

document.getElementById('menu-stats-btn').addEventListener('click', () => {
  sfx.pickup();
  openStatsModal();
});

document.getElementById('stats-close-btn').addEventListener('click', () => {
  sfx.pickup();
  setModalVisible(statsModal, false);
});

let statsResetArmed = false;
document.getElementById('stats-reset-btn').addEventListener('click', () => {
  const label = document.getElementById('stats-reset-label');
  if (!statsResetArmed) {
    statsResetArmed = true;
    label.textContent = 'Ketuk Sekali Lagi untuk Konfirmasi';
    if (resetStatsArmedTimeout) clearTimeout(resetStatsArmedTimeout);
    resetStatsArmedTimeout = setTimeout(() => {
      statsResetArmed = false;
      label.textContent = 'Reset Statistik';
    }, 2500);
    return;
  }

  statsResetArmed = false;
  if (resetStatsArmedTimeout) clearTimeout(resetStatsArmedTimeout);
  label.textContent = 'Reset Statistik';
  resetAllStats();
  sfx.pickup();
  openStatsModal();
  renderMainMenuCards();
});

document.querySelectorAll('.sound-toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.soundEnabled = !settings.soundEnabled;
    saveSettings(settings);
    syncSoundUI();
    if (settings.soundEnabled) {
      sfx.pickup();
      haptics.pickup();
    }
  });
});

document.querySelectorAll('.restart-trigger-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    sfx.pickup();
    haptics.pickup();
    startModeGame(currentMode, false, currentMode === 'adventure' ? currentLevel : null);
  });
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  sfx.pickup();
  haptics.pickup();
  startModeGame(currentMode, false, currentMode === 'adventure' ? currentLevel : null);
});

document.getElementById('game-over-menu-btn').addEventListener('click', () => {
  sfx.pickup();
  showMainMenu();
});

document.getElementById('next-level-btn').addEventListener('click', () => {
  sfx.pickup();
  haptics.pickup();
  startModeGame('adventure', false, currentLevel + 1);
});

document.getElementById('level-clear-menu-btn').addEventListener('click', () => {
  sfx.pickup();
  showMainMenu();
});

function handleHardwareBack() {
  if (isModalVisible(settingsModal)) {
    setModalVisible(settingsModal, false);
    return true;
  }
  if (isModalVisible(statsModal)) {
    setModalVisible(statsModal, false);
    return true;
  }
  if (currentScreen === 'game') {
    if (isHammerTargeting) {
      setHammerTargeting(false);
      return true;
    }
    if (isModalVisible(pauseModal)) {
      resumeFromPause();
      return true;
    }
    if (isModalVisible(gameOverModal) || isModalVisible(levelClearModal)) {
      showMainMenu();
      return true;
    }
    openPauseModal();
    return true;
  }
  return false;
}

let hasBooted = false;
function bootApp() {
  if (hasBooted && cellElements.length === GRID_SIZE) return;
  hasBooted = true;

  applyTheme(settings.theme);
  syncSoundUI();
  syncHapticsUI();
  buildBoardDOM();
  showMainMenu();

  setupNativeBridge({
    exitToastEl,
    onSaveState: persistCurrentState,
    onSuspendAudio: () => sfx.suspend(),
    onResumeAudio: () => sfx.resume(),
    onPauseIfNeeded: () => {
      if (currentScreen === 'game' && currentMode === 'blitz' && !isGameOver && !isLevelComplete) {
        openPauseModal();
      }
    },
    onBackPressed: handleHardwareBack,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

window.addEventListener('resize', () => {
  particles.resize();
  if (currentScreen === 'game') {
    if (dragState) {
      cachedBoardMetrics = computeBoardMetrics();
    }
    renderTray(false);
  }
});
