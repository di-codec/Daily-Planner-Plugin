import { describe, expect, it } from "vitest";
import {
	isLegacyHabitChecked,
	parseLegacyHealthTable,
	parseLegacyTaskPath,
	parseTrackerDateCell,
} from "../core/legacyImport";

describe("parseLegacyTaskPath", () => {
	it("parses a well-formed legacy task path", () => {
		const date = parseLegacyTaskPath("Daily Planner/✅Tasks/2025 Year/📅 August/📅 19 August.md");
		expect(date).not.toBeNull();
		expect(date?.getFullYear()).toBe(2025);
		expect(date?.getMonth()).toBe(7);
		expect(date?.getDate()).toBe(19);
	});

	it("returns null for an unrecognized shape", () => {
		expect(parseLegacyTaskPath("Daily Planner/Daily/2026/08/2026-08-19.md")).toBeNull();
	});
});

describe("parseTrackerDateCell", () => {
	it("rolls over into the next year across a December -> January boundary", () => {
		const december = new Date(2025, 11, 29);
		const parsed = parseTrackerDateCell("04 Jan", 2025, december);
		expect(parsed?.getFullYear()).toBe(2026);
		expect(parsed?.getMonth()).toBe(0);
		expect(parsed?.getDate()).toBe(4);
	});

	it("returns null for an unparsable cell", () => {
		expect(parseTrackerDateCell("no date here", 2025, null)).toBeNull();
	});
});

describe("isLegacyHabitChecked", () => {
	it("recognizes checked/unchecked variants", () => {
		expect(isLegacyHabitChecked("✅")).toBe(true);
		expect(isLegacyHabitChecked("[x]")).toBe(true);
		expect(isLegacyHabitChecked("unchecked")).toBe(false);
		expect(isLegacyHabitChecked("")).toBe(false);
	});
});

describe("parseLegacyHealthTable", () => {
	it("parses a fixture table into a per-day habit map", () => {
		const table = [
			"### 🏋️ Health Tracker",
			"",
			"| Daily Habits Track | 17 Aug | 18 Aug | 19 Aug | 20 Aug | 21 Aug | 22 Aug | 23 Aug |",
			"| Legs | ✅ | unchecked | ✅ | | | | |",
		].join("\n");
		const result = parseLegacyHealthTable(table, 2026, () => ({}));
		expect(result.get("2026-08-17")).toEqual({ legs: true });
		expect(result.get("2026-08-18")).toEqual({ legs: false });
		expect(result.get("2026-08-19")).toEqual({ legs: true });
	});

	it("returns an empty map when the table header is missing", () => {
		expect(parseLegacyHealthTable("no table here", 2026, () => ({}))).toEqual(new Map());
	});
});
