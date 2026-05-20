import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes safely — handles conflicts and conditionals.
 * Usage: cn('px-4 py-2', isActive && 'bg-blue-600', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
