// Vestaboard character code map.
// Reference: https://docs.vestaboard.com/docs/characterCodes
//
// Codes 63-71 are colored / filled flaps. They share the visual space of a
// single flap, so we render them as Unicode block characters when going
// code -> human. Going human -> code, the block characters are not part of
// normal text input, so they round-trip only for the codes we explicitly map.

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const CODE_TO_CHAR = new Map([
  [0, ' '],
  ...LETTERS.split('').map((c, i) => [i + 1, c]),
  [27, '1'],
  [28, '2'],
  [29, '3'],
  [30, '4'],
  [31, '5'],
  [32, '6'],
  [33, '7'],
  [34, '8'],
  [35, '9'],
  [36, '0'],
  [37, '!'],
  [38, '@'],
  [39, '#'],
  [40, '$'],
  [41, '('],
  [42, ')'],
  [44, '-'],
  [46, '+'],
  [47, '&'],
  [48, '='],
  [49, ';'],
  [50, ':'],
  [52, "'"],
  [53, '"'],
  [54, '%'],
  [55, ','],
  [56, '.'],
  [59, '/'],
  [60, '?'],
  [62, '°'],
  [63, '🟥'],
  [64, '🟧'],
  [65, '🟨'],
  [66, '🟩'],
  [67, '🟦'],
  [68, '🟪'],
  [69, '⬜'],
  [70, '⬛'],
  [71, '█'],
]);

export const CHAR_TO_CODE = new Map();
for (const [code, char] of CODE_TO_CHAR) {
  // First mapping wins so letters/digits/etc. map back cleanly.
  if (!CHAR_TO_CODE.has(char)) CHAR_TO_CODE.set(char, code);
}

export const UNKNOWN_CHAR = '?';

export function codeToChar(code) {
  return CODE_TO_CHAR.get(code) ?? UNKNOWN_CHAR;
}

export function charToCode(char) {
  if (!char) return 0;
  const upper = char.toUpperCase();
  if (CHAR_TO_CODE.has(upper)) return CHAR_TO_CODE.get(upper);
  return CHAR_TO_CODE.has(char) ? CHAR_TO_CODE.get(char) : null;
}

function normalizeLayout(input) {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }
  return input;
}

// Accepts a 2D array of codes, a flat array of codes, or a JSON-encoded
// string of either. Returns a string with rows joined by newlines.
export function charactersToText(input, { cols } = {}) {
  const layout = normalizeLayout(input);
  if (!Array.isArray(layout)) return '';

  const rows = Array.isArray(layout[0]) ? layout : cols ? chunk(layout, cols) : [layout];

  return rows.map((row) => row.map(codeToChar).join('')).join('\n');
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Converts a string (with optional newlines marking row breaks) into a 2D
// array of character codes sized to `rows` x `cols`. Unknown characters
// become 0 (blank). Lines longer than `cols` are truncated; shorter lines
// are padded; missing rows are filled with blanks.
export function textToCharacters(text, { rows = 6, cols = 22 } = {}) {
  const lines = String(text ?? '').split('\n');
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const line = lines[r] ?? '';
    const row = new Array(cols).fill(0);
    let col = 0;
    for (const char of line) {
      if (col >= cols) break;
      const code = charToCode(char);
      row[col++] = code ?? 0;
    }
    grid.push(row);
  }
  return grid;
}
