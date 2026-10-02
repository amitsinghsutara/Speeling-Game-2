import type { AnswerChoice } from '../data/types';
import { AnswerButton, type AnswerButtonState } from './AnswerButton';
import styles from './AnswerGrid.module.css';

interface AnswerGridProps {
  choices: AnswerChoice[];
  selectedWord: string | null;
  status: 'unanswered' | 'correct' | 'incorrect';
  incorrectWords: string[];
  onSelect: (word: string) => void;
}

function resolveState(
  choice: AnswerChoice,
  selectedWord: string | null,
  status: 'unanswered' | 'correct' | 'incorrect',
  incorrectWords: string[],
): AnswerButtonState {
  if (status === 'correct' && choice.word === selectedWord) return 'correct';
  if (status === 'incorrect' && choice.word === selectedWord) return 'wrong';
  if (incorrectWords.includes(choice.word)) return 'disabled';
  if (status === 'correct') return 'locked';
  return 'idle';
}

/** The 2x2 grid of answer choices for the current question. */
export function AnswerGrid({ choices, selectedWord, status, incorrectWords, onSelect }: AnswerGridProps) {
  return (
    <div className={styles.grid} role="group" aria-label="Choose the correct spelling">
      {choices.map((choice, index) => (
        <AnswerButton
          key={choice.word}
          word={choice.word}
          state={resolveState(choice, selectedWord, status, incorrectWords)}
          index={index}
          onClick={() => onSelect(choice.word)}
        />
      ))}
    </div>
  );
}
