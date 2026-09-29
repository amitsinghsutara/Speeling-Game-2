/** A single incorrect spelling option paired with the phonics pattern it tests. */
export interface Foil {
  word: string;
  /** Raw codebook code, e.g. "IC", "FC", "V", "PH". Never shown to the learner. */
  type: string;
}

/** One spelling item as authored in the source spreadsheet. */
export interface Question {
  level: number;
  item: number;
  sequence: number;
  skill: string;
  target: string;
  foils: Foil[];
}

/** Metadata describing one level's theme and size, independent of its questions. */
export interface LevelInfo {
  level: number;
  skill: string;
  wordCount: number;
}

/** The full game content package produced from the spreadsheet. */
export interface GameContent {
  levels: LevelInfo[];
  /** Maps a foil code (e.g. "V") to its human-readable name, e.g. "Vowel substitution". */
  foilTypeLabels: Record<string, string>;
  questions: Question[];
}

/** One generated answer choice shown on the question screen. */
export interface AnswerChoice {
  word: string;
  isCorrect: boolean;
  /** Foil type code, absent on the correct answer. */
  type?: string;
}
