import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './GameButton.module.css';

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
}

/** Large, rounded, high-contrast touch target used for every primary action. */
export function GameButton({ variant = 'primary', className, children, ...rest }: GameButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}
