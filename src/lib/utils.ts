import type { Snippet } from 'svelte';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, E extends Element = Element> = T & {
	ref?: E | null;
};

/** Omit child snippet from a component's props (used by shadcn-svelte select components). */
export type WithoutChild<T> = Omit<T, 'child'>;

/** Omit both children and child snippets (used by shadcn-svelte select scroll buttons). */
export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;

/** Omit children snippet from props (used by shadcn-svelte components). */
export type WithoutChildren<T> = Omit<T, 'children'>;

/** Re-export Snippet for components that need it */
export type { Snippet };
