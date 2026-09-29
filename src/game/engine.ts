import type { AnswerChoice, Question } from '../data/types';

/** Injectable random source so choice shuffling is deterministic in tests. */
export type RandomSource = () => number;

/**
 * Fisher-Yates shuffle. Does not mutate the input array.
 */
export function shuffle<T>(items: T[], random: RandomSource = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds the four answer choices for a question (the target plus its three
 * foils) in randomized order. The correct answer's position varies every
 * call so the learner can never infer it from button position.
 */
export function generateChoices(question: Question, random: RandomSource = Math.random): AnswerChoice[] {
  const choices: AnswerChoice[] = [
    { word: question.target, isCorrect: true },
    ...question.foils.map((foil) => ({ word: foil.word, isCorrect: false, type: foil.type })),
  ];
  return shuffle(choices, random);
}

/** Whether the selected word matches this question's target spelling. */
export function isCorrectAnswer(question: Question, selectedWord: string): boolean {
  return selectedWord.trim().toLowerCase() === question.target.trim().toLowerCase();
}

/** Looks up the foil entry a learner selected, if the word was a foil. */
export function findFoilByWord(question: Question, selectedWord: string) {
  const word = selectedWord.trim().toLowerCase();
  return question.foils.find((f) => f.word === word);
}

/**
 * Short, child-friendly hints keyed by the spreadsheet's foil-type codes.
 * Technical codes (V, FC, IC, ...) are never shown to the learner directly.
 */
const FOIL_TYPE_HINTS: Record<string, string> = {
  IC: 'Listen to the first sound.',
  FC: 'Listen to the last sound.',
  V: 'Listen to the middle sound.',
  VIS: 'Look closely at the letter shapes.',
  OM: "Listen carefully — you might be missing a sound.",
  DIG: 'Listen closely to that sound — two letters team up to make it.',
  TR: 'Check the order of the letters.',
  PH: "That sounds right, but it isn't spelled that way. Look again.",
  REG: "This word is a little different — it doesn't follow the usual pattern.",
  OVR: 'Check the spelling pattern carefully.',
  DBL: 'Check if a letter should appear twice.',
  INS: "Listen carefully — there might be an extra sound.",
  'L1-RL': 'Listen closely to the first sound — is it r or l?',
  'L1-VD': 'Listen closely to the last sound.',
  'L1-PRO': "Listen — the word doesn't start with an extra sound.",
  'L1-EPN': "Listen — there's no extra sound in the middle.",
  'L1-TH': "Listen closely to the 'th' sound.",
  'L1-VOW': 'Listen closely to the vowel sound.',
};

const DEFAULT_HINT = 'Listen again and try once more.';

/** Maps a raw foil-type code to a short, encouraging hint for the learner. */
export function getHintForFoilType(foilType: string | undefined): string {
  if (!foilType) return DEFAULT_HINT;
  return FOIL_TYPE_HINTS[foilType] ?? DEFAULT_HINT;
}

/** Convenience: the hint to show for whatever word the learner just picked. */
export function getFeedbackHint(question: Question, selectedWord: string): string {
  const foil = findFoilByWord(question, selectedWord);
  return getHintForFoilType(foil?.type);
}

export interface ProgressInfo {
  current: number;
  total: number;
  fraction: number;
  label: string;
}

/** Computes the 1-indexed "3 / 12"-style progress display for a level. */
export function calculateProgress(completedCount: number, total: number): ProgressInfo {
  const safeTotal = Math.max(total, 0);
  const current = Math.min(Math.max(completedCount, 0), safeTotal);
  return {
    current,
    total: safeTotal,
    fraction: safeTotal === 0 ? 0 : current / safeTotal,
    label: `${current} / ${safeTotal}`,
  };
}

/** Whether every question in a level has been answered correctly. */
export function isLevelComplete(completedCount: number, total: number): boolean {
  return total > 0 && completedCount >= total;
}
