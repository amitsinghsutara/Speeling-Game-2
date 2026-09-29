import rawContent from './content.generated.json';
import type { GameContent, LevelInfo, Question } from './types';

/**
 * Validates and normalizes a single question, returning null if it is
 * missing data the game engine cannot work without. Malformed rows are
 * dropped rather than crashing the app.
 */
function normalizeQuestion(value: unknown): Question | null {
  if (!value || typeof value !== 'object') return null;
  const q = value as Partial<Question>;

  if (typeof q.level !== 'number' || Number.isNaN(q.level)) return null;
  if (typeof q.target !== 'string' || q.target.trim() === '') return null;
  if (!Array.isArray(q.foils) || q.foils.length === 0) return null;

  const foils = q.foils
    .filter(
      (f): f is { word: string; type: string } =>
        !!f && typeof f.word === 'string' && f.word.trim() !== '' && typeof f.type === 'string',
    )
    .map((f) => ({ word: f.word.trim().toLowerCase(), type: f.type.trim() }));

  if (foils.length === 0) return null;

  return {
    level: q.level,
    item: typeof q.item === 'number' ? q.item : 0,
    sequence: typeof q.sequence === 'number' ? q.sequence : 0,
    skill: typeof q.skill === 'string' ? q.skill : '',
    target: q.target.trim().toLowerCase(),
    foils,
  };
}

function normalizeLevel(value: unknown): LevelInfo | null {
  if (!value || typeof value !== 'object') return null;
  const l = value as Partial<LevelInfo>;
  if (typeof l.level !== 'number' || typeof l.skill !== 'string') return null;
  return {
    level: l.level,
    skill: l.skill,
    wordCount: typeof l.wordCount === 'number' ? l.wordCount : 0,
  };
}

function buildContent(): GameContent {
  const source = rawContent as {
    levels?: unknown[];
    foilTypeLabels?: Record<string, string>;
    questions?: unknown[];
  };

  const questions = (source.questions ?? [])
    .map(normalizeQuestion)
    .filter((q): q is Question => q !== null)
    .sort((a, b) => a.level - b.level || a.sequence - b.sequence);

  const levelsFromGuide = (source.levels ?? [])
    .map(normalizeLevel)
    .filter((l): l is LevelInfo => l !== null);

  // Fall back to deriving level metadata from the questions themselves if
  // the level guide is missing or incomplete for a given level.
  const levelNumbersWithQuestions = new Set(questions.map((q) => q.level));
  const knownLevelNumbers = new Set(levelsFromGuide.map((l) => l.level));

  const derivedLevels: LevelInfo[] = [];
  for (const levelNumber of levelNumbersWithQuestions) {
    if (knownLevelNumbers.has(levelNumber)) continue;
    const questionsInLevel = questions.filter((q) => q.level === levelNumber);
    derivedLevels.push({
      level: levelNumber,
      skill: questionsInLevel[0]?.skill ?? `Level ${levelNumber}`,
      wordCount: questionsInLevel.length,
    });
  }

  const levels = [...levelsFromGuide, ...derivedLevels].sort((a, b) => a.level - b.level);

  return {
    levels,
    foilTypeLabels: source.foilTypeLabels ?? {},
    questions,
  };
}

let cachedContent: GameContent | null = null;

/** Returns the parsed, validated game content. Loaded and cached once. */
export function getGameContent(): GameContent {
  if (!cachedContent) {
    cachedContent = buildContent();
  }
  return cachedContent;
}

export function getLevelList(): LevelInfo[] {
  return getGameContent().levels;
}

export function getQuestionsForLevel(level: number): Question[] {
  return getGameContent()
    .questions.filter((q) => q.level === level)
    .sort((a, b) => a.sequence - b.sequence);
}

export function getFoilTypeLabel(code: string): string {
  return getGameContent().foilTypeLabels[code] ?? code;
}
