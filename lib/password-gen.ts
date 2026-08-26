/**
 * lib/password-gen.ts
 * Advanced password / passphrase generator with entropy estimation.
 */

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS    = "0123456789";
const SYMBOLS   = "!@#$%^&*()_+-=[]{}|;:,.<>?";

const WORD_LIST = [
  "apple","brave","cloud","dance","eagle","flame","grace","honey",
  "ivory","jewel","karma","lemon","magic","noble","ocean","pearl",
  "quest","river","solar","tiger","ultra","vivid","water","xenon",
  "yacht","zebra","amber","blaze","crisp","delta","ember","frost",
  "glide","haste","image","jolly","knack","lunar","maple","nexus",
  "orbit","pixel","quark","range","storm","trend","unity","vapor",
  "whirl","xylem","yield","zonal","arena","boost","crest","drift",
];

export type GeneratorMode = "numeric" | "alpha" | "full" | "memorable";
export type CaseMode = "lower" | "upper" | "title" | "camel" | "mixed";
export type SeparatorType = "-" | "_" | "." | "·" | " " | "number" | "none";

export interface GeneratorOptions {
  mode: GeneratorMode;
  length: number;             // chars for non-memorable, word count for memorable
  caseSensitive: CaseMode;
  separator: SeparatorType;
  includeSymbols: boolean;
  includeNumbers: boolean;
}

export interface GeneratedPassword {
  value: string;
  entropy: number;            // bits
  strength: "weak" | "fair" | "good" | "strong" | "very-strong";
}

function secureRandom(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function pickChar(charset: string): string {
  return charset[secureRandom(charset.length)];
}

function applyCaseMode(word: string, mode: CaseMode, index: number): string {
  switch (mode) {
    case "upper":  return word.toUpperCase();
    case "lower":  return word.toLowerCase();
    case "title":  return word[0].toUpperCase() + word.slice(1).toLowerCase();
    case "camel":  return index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase();
    case "mixed":  return word.split("").map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join("");
    default:       return word;
  }
}

export function generatePassword(opts: GeneratorOptions): GeneratedPassword {
  let value = "";
  let charsetSize = 0;

  if (opts.mode === "numeric") {
    charsetSize = 10;
    for (let i = 0; i < opts.length; i++) value += pickChar(DIGITS);

  } else if (opts.mode === "alpha") {
    let charset = LOWERCASE;
    if (opts.caseSensitive !== "lower") charset += UPPERCASE;
    if (opts.includeNumbers) charset += DIGITS;
    charsetSize = charset.length;
    for (let i = 0; i < opts.length; i++) value += pickChar(charset);

  } else if (opts.mode === "full") {
    let charset = LOWERCASE + UPPERCASE + DIGITS;
    if (opts.includeSymbols) charset += SYMBOLS;
    charsetSize = charset.length;
    for (let i = 0; i < opts.length; i++) value += pickChar(charset);
    // ensure at least one symbol if requested
    if (opts.includeSymbols) {
      const arr = value.split("");
      arr[secureRandom(arr.length)] = pickChar(SYMBOLS);
      value = arr.join("");
    }

  } else {
    // memorable
    const words: string[] = [];
    const count = Math.max(2, Math.min(opts.length, 10));
    for (let i = 0; i < count; i++) {
      const word = WORD_LIST[secureRandom(WORD_LIST.length)];
      words.push(applyCaseMode(word, opts.caseSensitive, i));
    }
    let sep: string;
    if (opts.separator === "number") {
      sep = String(secureRandom(10));
    } else if (opts.separator === "none") {
      sep = "";
    } else {
      sep = opts.separator;
    }
    value = words.join(sep);
    charsetSize = WORD_LIST.length;
    const entropy = Math.log2(Math.pow(charsetSize, count));
    return { value, entropy: Math.round(entropy), strength: strengthLabel(entropy) };
  }

  const entropy = opts.length * Math.log2(charsetSize);
  return { value, entropy: Math.round(entropy), strength: strengthLabel(entropy) };
}

function strengthLabel(entropy: number): GeneratedPassword["strength"] {
  if (entropy < 28) return "weak";
  if (entropy < 36) return "fair";
  if (entropy < 60) return "good";
  if (entropy < 80) return "strong";
  return "very-strong";
}
