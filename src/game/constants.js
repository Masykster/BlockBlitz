export const GRID_SIZE = 8;
export const MAX_COMBO_GRACE_MOVES = 3;
export const MAX_BOOSTER_CHARGES = 5;

export const INITIAL_BOOSTERS = {
  reroll: 2,
  rotate: 2,
  hammer: 1,
  undo: 1,
};

export const BLITZ_INITIAL_SECONDS = 90;
export const BLITZ_BONUS_PER_LINE = 3;
export const BLITZ_MAX_SECONDS = 120;

export const BOMB_DEFUSE_BONUS = 50;
export const BOMB_MAX_ACTIVE = 3;

export const GAME_MODES = {
  classic: {
    id: 'classic',
    label: 'Klasik',
    desc: 'Mode endless 8×8 autentik. Kejar skor & combo tanpa batas waktu.',
    icon: 'fa-solid fa-cubes',
    accent: 'from-sky-400 to-blue-600',
  },
  bomb: {
    id: 'bomb',
    label: 'Bom Blast',
    desc: 'Blok bom muncul berkala. Pecahkan sebelum hitungan mencapai 0!',
    icon: 'fa-solid fa-bomb',
    accent: 'from-rose-500 to-orange-600',
  },
  blitz: {
    id: 'blitz',
    label: 'Time Blitz',
    desc: 'Kejar skor dalam 90 detik! Tiap baris pecah menambah +3 detik.',
    icon: 'fa-solid fa-stopwatch',
    accent: 'from-amber-400 to-orange-500',
  },
  adventure: {
    id: 'adventure',
    label: 'Petualangan',
    desc: 'Taklukkan papan rintangan bertahap dengan target baris tiap level.',
    icon: 'fa-solid fa-compass',
    accent: 'from-emerald-400 to-teal-600',
  },
};

export const GAME_MODE_LIST = [
  GAME_MODES.classic,
  GAME_MODES.bomb,
  GAME_MODES.blitz,
  GAME_MODES.adventure,
];

export const THEMES = {
  classic: {
    id: 'classic',
    label: 'Biru Galaksi',
    preview: '#263366',
  },
  midnight: {
    id: 'midnight',
    label: 'Neon Gelap',
    preview: '#1a1033',
  },
  emerald: {
    id: 'emerald',
    label: 'Hutan Zamrud',
    preview: '#0f3833',
  },
};

export const STORAGE_KEYS = {
  LEGACY_BEST_SCORE: 'blockblast_best_score',
  BEST_SCORES: 'blockblitz_best_scores_v2',
  SAVES: 'blockblitz_mode_saves_v2',
  SETTINGS: 'blockblitz_settings_v2',
  STATS: 'blockblitz_stats_v2',
};

export const BLOCK_COLORS = [
  { cls: 'color-red', hex: '#ff4b55' },
  { cls: 'color-orange', hex: '#ff8c24' },
  { cls: 'color-yellow', hex: '#ffcc29' },
  { cls: 'color-green', hex: '#2CE680' },
  { cls: 'color-cyan', hex: '#2bc4f3' },
  { cls: 'color-blue', hex: '#4c75f2' },
  { cls: 'color-purple', hex: '#b055f5' },
  { cls: 'color-pink', hex: '#ff5ca8' },
];

export const SHAPES_CATALOG = [
  // Singles & Dominoes
  { weight: 6, matrix: [[1]] },
  { weight: 7, matrix: [[1, 1]] },
  { weight: 7, matrix: [[1], [1]] },

  // Trominoes (3)
  { weight: 9, matrix: [[1, 1, 1]] },
  { weight: 9, matrix: [[1], [1], [1]] },
  { weight: 8, matrix: [[1, 1], [1, 0]] },
  { weight: 8, matrix: [[1, 1], [0, 1]] },
  { weight: 8, matrix: [[1, 0], [1, 1]] },
  { weight: 8, matrix: [[0, 1], [1, 1]] },

  // Tetrominoes (4)
  { weight: 10, matrix: [[1, 1], [1, 1]] },
  { weight: 8, matrix: [[1, 1, 1, 1]] },
  { weight: 8, matrix: [[1], [1], [1], [1]] },
  { weight: 7, matrix: [[1, 1, 1], [0, 1, 0]] },
  { weight: 7, matrix: [[0, 1, 0], [1, 1, 1]] },
  { weight: 6, matrix: [[1, 0], [1, 1], [1, 0]] },
  { weight: 6, matrix: [[0, 1], [1, 1], [0, 1]] },
  { weight: 7, matrix: [[1, 1, 1], [1, 0, 0]] },
  { weight: 7, matrix: [[1, 1, 1], [0, 0, 1]] },
  { weight: 7, matrix: [[1, 0, 0], [1, 1, 1]] },
  { weight: 7, matrix: [[0, 0, 1], [1, 1, 1]] },
  { weight: 6, matrix: [[1, 0], [1, 0], [1, 1]] },
  { weight: 6, matrix: [[0, 1], [0, 1], [1, 1]] },
  { weight: 6, matrix: [[1, 1], [1, 0], [1, 0]] },
  { weight: 6, matrix: [[1, 1], [0, 1], [0, 1]] },
  { weight: 6, matrix: [[1, 1, 0], [0, 1, 1]] },
  { weight: 6, matrix: [[0, 1, 1], [1, 1, 0]] },
  { weight: 5, matrix: [[0, 1], [1, 1], [1, 0]] },
  { weight: 5, matrix: [[1, 0], [1, 1], [0, 1]] },

  // Pentominoes & Big Classics (5 to 9)
  { weight: 5, matrix: [[1, 1, 1, 1, 1]] },
  { weight: 5, matrix: [[1], [1], [1], [1], [1]] },
  { weight: 6, matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]] },
  { weight: 6, matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]] },
  { weight: 6, matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]] },
  { weight: 6, matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]] },
  { weight: 6, matrix: [[1, 1, 1], [1, 1, 1]] },
  { weight: 6, matrix: [[1, 1], [1, 1], [1, 1]] },
  { weight: 7, matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },

  // Diagonal fun pieces
  { weight: 3, matrix: [[1, 0], [0, 1]] },
  { weight: 3, matrix: [[0, 1], [1, 0]] },
  { weight: 2, matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
  { weight: 2, matrix: [[0, 0, 1], [0, 1, 0], [1, 0, 0]] },
];
