import { describe, expect, it } from "vitest";
import {
	addDays,
	formatDayHeading,
	formatMonthTitle,
	getStartOfWeek,
	isSameDay,
	parseISODate,
	toISODate,
} from "./dates";

describe("toISODate / parseISODate", () => {
	it("round-trips and zero-pads", () => {
		const date = new Date(2026, 0, 5); // Jan 5, 2026
		expect(toISODate(date)).toBe("2026-01-05");
		expect(parseISODate("2026-01-05")).toEqual(date);
	});

	it("rejects malformed or impossible dates", () => {
		expect(parseISODate("not-a-date")).toBeNull();
		expect(parseISODate("2026-02-30")).toBeNull();
	});
});

describe("getStartOfWeek", () => {
	it("treats Monday as the first day of the week", () => {
		// Sunday 2026-08-23 -> Monday 2026-08-17
		const sunday = new Date(2026, 7, 23);
		expect(toISODate(getStartOfWeek(sunday))).toBe("2026-08-17");

		// Mid-week Wednesday 2026-08-19 -> same Monday
		const wednesday = new Date(2026, 7, 19);
		expect(toISODate(getStartOfWeek(wednesday))).toBe("2026-08-17");
	});
});

describe("addDays across a week", () => {
	it("crosses a month boundary", () => {
		const start = getStartOfWeek(new Date(2026, 0, 29)); // week of Jan 26 - Feb 1, 2026
		const isoDays = Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
		expect(isoDays).toEqual([
			"2026-01-26",
			"2026-01-27",
			"2026-01-28",
			"2026-01-29",
			"2026-01-30",
			"2026-01-31",
			"2026-02-01",
		]);
	});

	it("crosses a year boundary", () => {
		const start = getStartOfWeek(new Date(2026, 0, 1)); // week of Dec 29, 2025 - Jan 4, 2026
		const isoDays = Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
		expect(isoDays).toEqual([
			"2025-12-29",
			"2025-12-30",
			"2025-12-31",
			"2026-01-01",
			"2026-01-02",
			"2026-01-03",
			"2026-01-04",
		]);
	});
});

describe("isSameDay", () => {
	it("is false for the same day-of-month in a different month", () => {
		expect(isSameDay(new Date(2026, 0, 15), new Date(2026, 1, 15))).toBe(false);
	});

	it("is true for identical dates with different time-of-day", () => {
		expect(isSameDay(new Date(2026, 0, 15, 9), new Date(2026, 0, 15, 23))).toBe(true);
	});
});

describe("formatting (en-GB)", () => {
	it("formats a day heading and a capitalized month title", () => {
		const date = new Date(2026, 7, 19);
		expect(formatDayHeading(date)).toContain("2026");
		const title = formatMonthTitle(date);
		expect(title.charAt(0)).toBe(title.charAt(0).toUpperCase());
	});
});
