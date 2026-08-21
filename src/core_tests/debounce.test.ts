import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncer } from "../core/debounce";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createDebouncer", () => {
	it("collapses multiple schedule() calls within the window into one run with the latest value", () => {
		const run = vi.fn();
		const debouncer = createDebouncer<number>(250, run);

		debouncer.schedule(1);
		vi.advanceTimersByTime(100);
		debouncer.schedule(2);
		vi.advanceTimersByTime(100);
		debouncer.schedule(3);
		vi.advanceTimersByTime(250);

		expect(run).toHaveBeenCalledTimes(1);
		expect(run).toHaveBeenCalledWith(3);
	});

	it("flush() is idempotent - a second flush with nothing pending is a no-op", () => {
		const run = vi.fn();
		const debouncer = createDebouncer<number>(250, run);

		debouncer.schedule(1);
		debouncer.flush();
		debouncer.flush();

		expect(run).toHaveBeenCalledTimes(1);
		expect(debouncer.pending).toBe(false);
	});

	it("cancel() clears the pending value without running it", () => {
		const run = vi.fn();
		const debouncer = createDebouncer<number>(250, run);

		debouncer.schedule(1);
		debouncer.cancel();
		vi.advanceTimersByTime(1000);

		expect(run).not.toHaveBeenCalled();
		expect(debouncer.pending).toBe(false);
	});
});
