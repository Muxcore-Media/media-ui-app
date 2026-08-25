import { clsx, type ClassValue } from 'clsx';

/** Tiny className joiner (clsx re-export) so components don't reach for a heavier merge lib. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
