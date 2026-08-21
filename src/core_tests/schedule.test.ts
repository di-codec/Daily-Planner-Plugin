import { describe, expect, it } from "vitest";
import {
	addScheduleEntry,
	formatScheduleChecklist,
	normalizeSchedule,
	normalizeTime,
	parseScheduleChecklist,
} from "../core/schedule";

describe("normalizeTime", () => {
	it("zero-pads a valid single-digit hour", () => {
		expect(normalizeTime("9:05")).toBe("09:05");
	});

	it("rejects a single-digit minute", () => {
		expect(normalizeTime("9:5")).toBeNull();
	});

	it("rejects out-of-range hours/minutes", () => {
		expect(normalizeTime("24:00")).toBeNull();
		expect(normalizeTime("12:60")).toBeNull();
	});

	it("rejects garbage input", () => {
		expect(normalizeTime("not a time")).toBeNull();
	});
});

describe("normalizeSchedule", () => {
	it("drops invalid entries and sorts the rest by time", () => {
		const raw = [
			{ time: "15:00", title: "Later" },
			{ time: "not-a-time", title: "Invalid time" },
			{ time: "09:00", title: "" },
			{ time: "09:30", title: "Earlier" },
		];
		expect(normalizeSchedule(raw)).toEqual([
			{ time: "09:30", title: "Earlier" },
			{ time: "15:00", title: "Later" },
		]);
	});

	it("returns an empty list for non-array input", () => {
		expect(normalizeSchedule(null)).toEqual([]);
	});
});

describe("addScheduleEntry", () => {
	it("inserts while keeping sort order", () => {
		const schedule = [{ time: "09:00", title: "A" }, { time: "15:00", title: "C" }];
		expect(addScheduleEntry(schedule, "12:00", "B")).toEqual([
			{ time: "09:00", title: "A" },
			{ time: "12:00", title: "B" },
			{ time: "15:00", title: "C" },
		]);
	});

	it("returns null for invalid time or empty title", () => {
		expect(addScheduleEntry([], "not-a-time", "Title")).toBeNull();
		expect(addScheduleEntry([], "09:00", "  ")).toBeNull();
	});
});

describe("formatScheduleChecklist / parseScheduleChecklist", () => {
	it("formats as \"- HH:MM - Title\" lines", () => {
		expect(formatScheduleChecklist([{ time: "09:00", title: "Standup" }])).toBe("- 09:00 - Standup");
	});

	it("round-trips through parseScheduleChecklist", () => {
		const section = formatScheduleChecklist([
			{ time: "09:00", title: "Standup" },
			{ time: "14:00", title: "Client call" },
		]);
		expect(parseScheduleChecklist(section)).toEqual([
			{ time: "09:00", title: "Standup" },
			{ time: "14:00", title: "Client call" },
		]);
	});

	it("also accepts a plain hyphen separator and sorts by time", () => {
		const section = "- 15:00 - Later\n- 09:00 - Earlier";
		expect(parseScheduleChecklist(section)).toEqual([
			{ time: "09:00", title: "Earlier" },
			{ time: "15:00", title: "Later" },
		]);
	});

	it("still parses a legacy em-dash separator", () => {
		expect(parseScheduleChecklist(`- 09:00 \u2014 Standup`)).toEqual([
			{ time: "09:00", title: "Standup" },
		]);
	});

	it("ignores malformed lines", () => {
		expect(parseScheduleChecklist("not a schedule line\n- 25:00 - invalid time")).toEqual([]);
	});
});
