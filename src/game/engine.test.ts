import { describe, expect, it } from 'vitest';
import type { Question } from '../data/types';
import {
  calculateProgress,
  generateChoices,
  getFeedbackHint,
  getHintForFoilType,
  isCorrectAnswer,
  isLevelComplete,
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
