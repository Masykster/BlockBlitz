export const GRID_SIZE = 8;
export const MAX_COMBO_GRACE_MOVES = 3;
export const INITIAL_BOOSTER_CHARGES = 2;
export const MAX_BOOSTER_CHARGES = 5;

export const STORAGE_KEYS = {
  BEST_SCORE: 'blockblast_best_score',
  SOUND_ENABLED: 'blockblitz_sound_enabled',
  GAME_STATE: 'blockblitz_game_state',
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
