import { describe, expect, it, vi } from 'vitest';

// Mock the generated content module so we can exercise the loader's
// validation logic against deliberately malformed spreadsheet rows,
// without depending on (or mutating) the real generated data file.
vi.mock('./content.generated.json', () => ({
  default: {
    levels: [
      { level: 1, skill: 'CVC, short vowels', wordCount: 2 },
      { level: 'not-a-number', skill: 'Broken level', wordCount: 5 }, // malformed level entry, dropped entirely
      // Note: no entry at all for level 2 — its metadata must be derived from its questions below.
    ],
    foilTypeLabels: { V: 'Vowel substitution' },
    questions: [
      {
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
      },
      {
        level: 1,
        item: 2,
        sequence: 2,
        skill: 'CVC, short vowels',
        target: '', // malformed: empty target
        foils: [{ word: 'mat', type: 'V' }],
      },
      {
        level: 1,
        item: 3,
        sequence: 3,
        skill: 'CVC, short vowels',
        target: 'cat',
        foils: [], // malformed: no foils at all
      },
      {
        level: 2,
        item: 4,
        sequence: 1,
        skill: 'Consonant blends',
        target: 'stop',
        foils: [
          { word: 'sop', type: 'OM' },
          { word: '', type: 'FC' }, // one malformed foil mixed with valid ones
          { word: 'stap', type: 'V' },
        ],
      },
      // entirely malformed row: missing level/target
      { item: 5, sequence: 2, foils: [] },
    ],
  },
}));

describe('getGameContent', () => {
  it('drops questions missing a target word', async () => {
    const { getGameContent } = await import('./loadContent');
    const content = getGameContent();
    expect(content.questions.some((q) => q.target === '')).toBe(false);
  });

  it('drops questions with no usable foils', async () => {
    const { getGameContent } = await import('./loadContent');
    const content = getGameContent();
    expect(content.questions.find((q) => q.target === 'cat')).toBeUndefined();
  });

  it('drops entirely malformed rows without throwing', async () => {
    const { getGameContent } = await import('./loadContent');
    expect(() => getGameContent()).not.toThrow();
  });

  it('keeps a question but filters out an individual malformed foil', async () => {
    const { getGameContent } = await import('./loadContent');
    const content = getGameContent();
    const stopQuestion = content.questions.find((q) => q.target === 'stop');
    expect(stopQuestion).toBeDefined();
    expect(stopQuestion?.foils.every((f) => f.word !== '')).toBe(true);
    expect(stopQuestion?.foils).toHaveLength(2);
  });

  it('keeps well-formed questions intact', async () => {
    const { getGameContent } = await import('./loadContent');
    const content = getGameContent();
    const satQuestion = content.questions.find((q) => q.target === 'sat');
    expect(satQuestion?.foils).toHaveLength(3);
  });

  it('derives level metadata from questions when the level guide entry is missing or malformed', async () => {
    const { getLevelList } = await import('./loadContent');
    const levels = getLevelList();
    const level2 = levels.find((l) => l.level === 2);
    expect(level2).toBeDefined();
    expect(level2?.skill).toBe('Consonant blends');
  });

  it('exposes foil type labels for phonics-aware feedback lookups', async () => {
    const { getFoilTypeLabel } = await import('./loadContent');
    expect(getFoilTypeLabel('V')).toBe('Vowel substitution');
    expect(getFoilTypeLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('splits a level into puzzles without losing or duplicating any of its questions', async () => {
    const { getPuzzlesForLevel, getQuestionsForLevel } = await import('./loadContent');
    const puzzles = getPuzzlesForLevel(1, 5);
    const allQuestionsInLevel = getQuestionsForLevel(1);
    expect(puzzles.flat()).toEqual(allQuestionsInLevel);
    expect(puzzles.length).toBeLessThanOrEqual(5);
  });

  it('reports how many puzzles a level actually splits into', async () => {
    const { getPuzzleCountForLevel } = await import('./loadContent');
    // Only one well-formed question survives validation for level 1 in this
    // fixture, so the puzzle count caps down instead of producing empties.
    expect(getPuzzleCountForLevel(1, 5)).toBe(1);
  });
});
