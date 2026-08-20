import { describe, expect, it } from "vitest";
import { dayCompletionPercent } from "./completion";

describe("dayCompletionPercent", () => {
	it("is 0 when there are no tasks or habits", () => {
		expect(dayCompletionPercent([], {})).toBe(0);
	});

	it("is 100 when every task and habit is done", () => {
		const tasks = [{ text: "A", completed: true }, { text: "B", completed: true }];
		expect(dayCompletionPercent(tasks, { legs: true, back: true })).toBe(100);
	});

	it("combines tasks and habits proportionally", () => {
		const tasks = [{ text: "A", completed: true }, { text: "B", completed: false }];
		expect(dayCompletionPercent(tasks, { legs: true, back: false })).toBe(50);
	});

	it("works with only habits or only tasks", () => {
		expect(dayCompletionPercent([], { legs: true, back: false })).toBe(50);
		expect(dayCompletionPercent([{ text: "A", completed: true }], {})).toBe(100);
	});
});
