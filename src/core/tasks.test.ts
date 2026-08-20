import { describe, expect, it } from "vitest";
import { appendTask, formatTaskLine, parseTaskItems, toggleTaskAt, unfinishedTasksToCopy } from "./tasks";

describe("parseTaskItems", () => {
	it("parses [ ], [x], and [X], ignoring non-task lines", () => {
		const body = "# Heading\n- [ ] Todo\n- [x] Done\n- [X] Also done\nnot a task\n";
		expect(parseTaskItems(body)).toEqual([
			{ text: "Todo", completed: false },
			{ text: "Done", completed: true },
			{ text: "Also done", completed: true },
		]);
	});
});

describe("appendTask / toggleTaskAt", () => {
	it("appends a new incomplete task", () => {
		expect(appendTask([{ text: "Existing", completed: true }], "New task")).toEqual([
			{ text: "Existing", completed: true },
			{ text: "New task", completed: false },
		]);
	});

	it("trims the new task's text and no-ops on empty/whitespace-only input", () => {
		expect(appendTask([], "  padded  ")).toEqual([{ text: "padded", completed: false }]);
		const tasks = [{ text: "Existing", completed: false }];
		expect(appendTask(tasks, "   ")).toBe(tasks);
	});

	it("toggles by array index, leaving other tasks untouched", () => {
		const tasks = [
			{ text: "First", completed: false },
			{ text: "Second", completed: true },
		];
		expect(toggleTaskAt(tasks, 1)).toEqual([
			{ text: "First", completed: false },
			{ text: "Second", completed: false },
		]);
	});

	it("is a no-op for an out-of-range index", () => {
		const tasks = [{ text: "Only task", completed: false }];
		expect(toggleTaskAt(tasks, 5)).toBe(tasks);
		expect(toggleTaskAt(tasks, -1)).toBe(tasks);
	});
});

describe("formatTaskLine", () => {
	it("formats completed and incomplete tasks", () => {
		expect(formatTaskLine({ text: "A", completed: true })).toBe("- [x] A");
		expect(formatTaskLine({ text: "B", completed: false })).toBe("- [ ] B");
	});
});

describe("unfinishedTasksToCopy", () => {
	it("copies only yesterday's unfinished tasks not already present today", () => {
		const yesterday = [
			{ text: "Done already", completed: true },
			{ text: "Still open", completed: false },
			{ text: "Already carried over", completed: false },
		];
		const today = [{ text: "Already carried over", completed: false }];
		expect(unfinishedTasksToCopy(yesterday, today)).toEqual([{ text: "Still open", completed: false }]);
	});

	it("returns an empty list when everything is done or already copied", () => {
		expect(unfinishedTasksToCopy([{ text: "Done", completed: true }], [])).toEqual([]);
	});
});
