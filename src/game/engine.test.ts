import { describe, expect, it } from 'vitest';
import type { Question } from '../data/types';
import {
  calculateProgress,
  chunkIntoPuzzles,
  computeLevelStatuses,
  generateChoices,
  getFeedbackHint,
  getHintForFoilType,
  isCorrectAnswer,
  isLevelComplete,
  isPuzzleUnlocked,
  shuffle,
} from './engine';

const sampleQuestion: Question = {
  level: 1,
  item: 1,
  sequence: 1,
  skill: 'CVC, short vowels',
  target: 'sat',
  foils: [
    { word: 'sit', type: 'V' },
    { word: 'sap', type: 'FC' },
    { word: 'hat', type: 'IC' },
  ],
};

describe('isCorrectAnswer', () => {
  it('detects the correct answer', () => {
    expect(isCorrectAnswer(sampleQuestion, 'sat')).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(isCorrectAnswer(sampleQuestion, ' SAT ')).toBe(true);
  });

  it('detects an incorrect answer', () => {
    expect(isCorrectAnswer(sampleQuestion, 'sit')).toBe(false);
    expect(isCorrectAnswer(sampleQuestion, 'sap')).toBe(false);
    expect(isCorrectAnswer(sampleQuestion, 'hat')).toBe(false);
  });
});

describe('generateChoices', () => {
  it('includes the target exactly once, marked correct', () => {
    const choices = generateChoices(sampleQuestion);
    const correctChoices = choices.filter((c) => c.isCorrect);
    expect(correctChoices).toHaveLength(1);
    expect(correctChoices[0].word).toBe('sat');
  });

  it('includes all three foils exactly once each, marked incorrect', () => {
    const choices = generateChoices(sampleQuestion);
    const words = choices.map((c) => c.word).sort();
    expect(words).toEqual(['hat', 'sap', 'sat', 'sit']);
    expect(choices.filter((c) => !c.isCorrect)).toHaveLength(3);
  });

  it('produces exactly 4 choices with no duplicates', () => {
    const choices = generateChoices(sampleQuestion);
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((c) => c.word)).size).toBe(4);
  });

  it('randomizes the position of the correct answer across calls', () => {
    // A fixed sequence of "random" values chosen so the shuffle produces
    // different permutations, proving position isn't hardcoded.
    let call = 0;
    const sequences = [
      [0.1, 0.2, 0.9],
      [0.9, 0.1, 0.2],
      [0.5, 0.8, 0.1],
    ];
    const positions = new Set<number>();

    for (const seq of sequences) {
      call = 0;
      const random = () => seq[call++ % seq.length];
      const choices = generateChoices(sampleQuestion, random);
      positions.add(choices.findIndex((c) => c.isCorrect));
    }

    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('shuffle', () => {
  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4];
    const copy = [...input];
    shuffle(input, () => 0.5);
    expect(input).toEqual(copy);
  });

  it('returns an array with the same elements', () => {
    const input = ['a', 'b', 'c', 'd'];
    const result = shuffle(input, () => 0.3);
    expect(result.slice().sort()).toEqual(input.slice().sort());
  });
});

describe('getHintForFoilType', () => {
  it('gives a middle-sound hint for a vowel-change foil', () => {
    expect(getHintForFoilType('V')).toMatch(/middle/i);
  });

  it('gives a last-sound hint for a final-consonant foil', () => {
    expect(getHintForFoilType('FC')).toMatch(/last/i);
  });

  it('gives a first-sound hint for an initial-consonant foil', () => {
    expect(getHintForFoilType('IC')).toMatch(/first/i);
  });

  it('never leaks the raw technical code into the hint text', () => {
    for (const code of ['V', 'FC', 'IC', 'PH', 'L1-RL']) {
      expect(getHintForFoilType(code)).not.toContain(code);
    }
  });

  it('falls back to a generic hint for an unknown or missing foil type', () => {
    expect(getHintForFoilType('SOME-UNKNOWN-CODE')).toBeTruthy();
    expect(getHintForFoilType(undefined)).toBeTruthy();
  });
});

describe('getFeedbackHint', () => {
  it('looks up the hint matching the word the learner actually picked', () => {
    expect(getFeedbackHint(sampleQuestion, 'sit')).toMatch(/middle/i);
    expect(getFeedbackHint(sampleQuestion, 'sap')).toMatch(/last/i);
    expect(getFeedbackHint(sampleQuestion, 'hat')).toMatch(/first/i);
  });

  it('handles a selected word that is not one of the known foils', () => {
    expect(getFeedbackHint(sampleQuestion, 'zzz')).toBeTruthy();
  });
});

describe('calculateProgress', () => {
  it('reports current/total and a fraction', () => {
    const progress = calculateProgress(3, 12);
    expect(progress).toEqual({ current: 3, total: 12, fraction: 0.25, label: '3 / 12' });
  });

  it('clamps completed count within [0, total]', () => {
    expect(calculateProgress(-5, 10).current).toBe(0);
    expect(calculateProgress(999, 10).current).toBe(10);
  });

  it('handles a zero-length level without dividing by zero', () => {
    expect(calculateProgress(0, 0)).toEqual({ current: 0, total: 0, fraction: 0, label: '0 / 0' });
  });
});

describe('isLevelComplete', () => {
  it('is false before the last question', () => {
    expect(isLevelComplete(11, 12)).toBe(false);
  });

  it('is true once every question is answered', () => {
    expect(isLevelComplete(12, 12)).toBe(true);
  });

  it('is false for an empty level (no questions to complete)', () => {
    expect(isLevelComplete(0, 0)).toBe(false);
  });
});

describe('chunkIntoPuzzles', () => {
  it('splits evenly-divisible items into equal-sized puzzles', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const puzzles = chunkIntoPuzzles(items, 5);
    expect(puzzles).toHaveLength(5);
    expect(puzzles.every((p) => p.length === 5)).toBe(true);
    expect(puzzles.flat()).toEqual(items); // order preserved, nothing dropped or duplicated
  });

  it('spreads a remainder across the earliest puzzles rather than dropping items', () => {
    const items = Array.from({ length: 12 }, (_, i) => i); // 12 / 5 = 2 remainder 2
    const puzzles = chunkIntoPuzzles(items, 5);
    const sizes = puzzles.map((p) => p.length);
    expect(sizes).toEqual([3, 3, 2, 2, 2]);
    expect(puzzles.flat()).toHaveLength(12);
  });

  it('caps the puzzle count so no puzzle is left empty when there are fewer items than requested', () => {
    const items = [1, 2, 3];
    const puzzles = chunkIntoPuzzles(items, 5);
    expect(puzzles).toHaveLength(3);
    expect(puzzles.every((p) => p.length > 0)).toBe(true);
  });

  it('returns an empty array for an empty level', () => {
    expect(chunkIntoPuzzles([], 5)).toEqual([]);
  });
});

describe('isPuzzleUnlocked', () => {
  it('puzzle 1 is always unlocked', () => {
    expect(isPuzzleUnlocked(1, [])).toBe(true);
  });

  it('a later puzzle is locked until the one before it is completed', () => {
    expect(isPuzzleUnlocked(2, [])).toBe(false);
    expect(isPuzzleUnlocked(2, [1])).toBe(true);
    expect(isPuzzleUnlocked(3, [1])).toBe(false);
    expect(isPuzzleUnlocked(3, [1, 2])).toBe(true);
  });
});

describe('computeLevelStatuses', () => {
  it('always makes level 1 at least available', () => {
    const statuses = computeLevelStatuses([1, 2, 3], {}, { 1: 5, 2: 5, 3: 5 });
    expect(statuses.get(1)).toBe('available');
  });

  it('locks a level until the previous level has every puzzle completed', () => {
    const statuses = computeLevelStatuses([1, 2, 3], { 1: [1, 2, 3, 4] }, { 1: 5, 2: 5, 3: 5 });
    expect(statuses.get(1)).toBe('available'); // 4 of 5 puzzles done, not yet "completed"
    expect(statuses.get(2)).toBe('locked');
    expect(statuses.get(3)).toBe('locked');
  });

  it('unlocks the next level once the previous one is fully completed', () => {
    const statuses = computeLevelStatuses([1, 2, 3], { 1: [1, 2, 3, 4, 5] }, { 1: 5, 2: 5, 3: 5 });
    expect(statuses.get(1)).toBe('completed');
    expect(statuses.get(2)).toBe('available');
    expect(statuses.get(3)).toBe('locked');
  });

  it('marks a level completed only once all of its puzzles are done', () => {
    const statuses = computeLevelStatuses([1], { 1: [1, 2, 3, 4, 5] }, { 1: 5 });
    expect(statuses.get(1)).toBe('completed');
  });
});
