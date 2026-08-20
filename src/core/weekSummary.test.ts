import { describe, expect, it } from "vitest";
import { buildWeekSummary, DaySnapshot } from "./weekSummary";
import { getStartOfWeek, toISODate } from "./dates";

function day(date: Date, tasksTotal: number, tasksCompleted: number, habits: Record<string, boolean>): DaySnapshot {
	const tasks = [
		...Array.from({ length: tasksCompleted }, () => ({ text: "done", completed: true })),
		...Array.from({ length: tasksTotal - tasksCompleted }, () => ({ text: "open", completed: false })),
	];
	return { date, tasks, habits };
}

describe("buildWeekSummary", () => {
	it("aggregates totals and unions habit names across days", () => {
		const start = getStartOfWeek(new Date(2026, 7, 19));
		const days: DaySnapshot[] = [
			day(start, 2, 1, { legs: true }),
			...Array.from({ length: 6 }, (_, i) => day(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i + 1), 1, 1, { back: true })),
		];
		const week = buildWeekSummary(start, days, ["legs"]);
		expect(week.tasksTotal).toBe(8);
		expect(week.tasksCompleted).toBe(7);
		expect(Object.keys(week.habits).sort()).toEqual(["back", "legs"]);
		expect(week.habits.legs).toEqual([true, false, false, false, false, false, false]);
	});

	it("handles a week crossing a month boundary", () => {
		const start = getStartOfWeek(new Date(2026, 0, 29)); // Jan 26 - Feb 1, 2026
		const days: DaySnapshot[] = Array.from({ length: 7 }, (_, i) =>
			day(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), 0, 0, {}),
		);
		const week = buildWeekSummary(start, days, []);
		expect(week.days.map((d) => d.iso)).toEqual([
			"2026-01-26",
			"2026-01-27",
			"2026-01-28",
			"2026-01-29",
			"2026-01-30",
			"2026-01-31",
			"2026-02-01",
		]);
	});

	it("handles a week crossing a year boundary", () => {
		const start = getStartOfWeek(new Date(2026, 0, 1)); // Dec 29, 2025 - Jan 4, 2026
		const days: DaySnapshot[] = Array.from({ length: 7 }, (_, i) =>
			day(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), 0, 0, {}),
		);
		const week = buildWeekSummary(start, days, []);
		expect(week.days[0].iso).toBe("2025-12-29");
		expect(week.days[6].iso).toBe("2026-01-04");
	});

	it("returns zeroed totals and no habit rows for an all-empty week", () => {
		const start = getStartOfWeek(new Date(2026, 7, 19));
		const days: DaySnapshot[] = Array.from({ length: 7 }, (_, i) =>
			day(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), 0, 0, {}),
		);
		const week = buildWeekSummary(start, days, []);
		expect(week.tasksTotal).toBe(0);
		expect(week.tasksCompleted).toBe(0);
		expect(week.habits).toEqual({});
		expect(toISODate(week.startOfWeek)).toBe(toISODate(start));
	});
});
