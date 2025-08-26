import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases con clsx y tailwind-merge
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}
