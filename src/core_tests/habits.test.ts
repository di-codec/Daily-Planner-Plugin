import { describe, expect, it } from "vitest";
import {
	defaultHabits,
	formatHabitChecklist,
	mergeHabits,
	normalizeHabitName,
	normalizeHabitNames,
	normalizeHabits,
	parseHabitChecklist,
	renameHabit,
} from "../core/habits";

describe("defaultHabits", () => {
	it("maps every known name to false", () => {
		expect(defaultHabits(["legs", "back"])).toEqual({ legs: false, back: false });
	});
});

describe("normalizeHabits", () => {
	it("fills in missing known habits as false", () => {
		expect(normalizeHabits({ legs: true }, ["legs", "back"])).toEqual({ legs: true, back: false });
	});

	it("preserves stale/unknown keys already stored in the note", () => {
		expect(normalizeHabits({ legs: true, retired: true }, ["legs"])).toEqual({ legs: true, retired: true });
	});

	it("coerces truthy/falsy values to boolean", () => {
		expect(normalizeHabits({ legs: 1, back: 0 }, ["legs", "back"])).toEqual({ legs: true, back: false });
	});

	it("falls back to defaults for non-object input", () => {
		expect(normalizeHabits(null, ["legs"])).toEqual({ legs: false });
		expect(normalizeHabits(["not", "an", "object"], ["legs"])).toEqual({ legs: false });
	});
});

describe("mergeHabits", () => {
	it("lets the overlay win", () => {
		expect(mergeHabits({ legs: false, back: true }, { legs: true })).toEqual({ legs: true, back: true });
	});
});

describe("normalizeHabitName / normalizeHabitNames", () => {
	it("trims and lowercases", () => {
		expect(normalizeHabitName("  Legs ")).toBe("legs");
	});

	it("dedupes (first occurrence wins) and drops empty entries", () => {
		expect(normalizeHabitNames(["Legs", " legs", "", "  ", "Back"])).toEqual(["legs", "back"]);
	});
});

describe("renameHabit", () => {
	it("renames in place, keeping list position", () => {
		expect(renameHabit(["legs", "back", "yoga"], "back", "Reading")).toEqual(["legs", "reading", "yoga"]);
	});

	it("is a no-op if the new name is empty after normalizing", () => {
		expect(renameHabit(["legs", "back"], "back", "   ")).toEqual(["legs", "back"]);
	});
});

describe("formatHabitChecklist / parseHabitChecklist", () => {
	it("formats habits as a checklist with capitalized display names", () => {
		expect(formatHabitChecklist({ legs: true, back: false })).toBe("- [x] Legs\n- [ ] Back");
	});

	it("round-trips through parseHabitChecklist, keys lowercased", () => {
		const section = formatHabitChecklist({ legs: true, back: false });
		expect(parseHabitChecklist(section)).toEqual({ legs: true, back: false });
	});

	it("ignores non-checklist lines and empty input", () => {
		expect(parseHabitChecklist("some prose\n- not a checklist item")).toEqual({});
		expect(parseHabitChecklist("")).toEqual({});
	});
});
