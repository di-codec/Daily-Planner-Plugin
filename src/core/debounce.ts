export interface Debouncer<T> {
	/** Replaces any pending value and restarts the delay window. */
	schedule(value: T): void;
	/** Runs immediately if a value is pending; no-op otherwise. */
	flush(): void;
	/** Clears any pending value/timer without running. */
	cancel(): void;
	readonly pending: boolean;
}

/** Single-slot debounce: only the latest scheduled value survives the window. */
export function createDebouncer<T>(delayMs: number, run: (value: T) => void): Debouncer<T> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let latest: T | undefined;
	let hasPending = false;

	function flush(): void {
		if (!hasPending) {
			return;
		}
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		const value = latest as T;
		hasPending = false;
		latest = undefined;
		run(value);
	}

	return {
		schedule(value: T): void {
			latest = value;
			hasPending = true;
			if (timer !== null) {
				clearTimeout(timer);
			}
			timer = setTimeout(flush, delayMs);
		},
		flush,
		cancel(): void {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			hasPending = false;
			latest = undefined;
		},
		get pending(): boolean {
			return hasPending;
		},
	};
}
