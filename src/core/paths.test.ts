import { describe, expect, it } from "vitest";
import { dailyFolderExcludePattern, getDailyFolderPath, getDailyNotePath } from "./paths";

describe("getDailyNotePath", () => {
	it("produces a zero-padded YYYY/MM/YYYY-MM-DD.md path", () => {
		const date = new Date(2026, 7, 19);
		expect(getDailyNotePath(date, "Daily Planner")).toBe("Daily Planner/Daily/2026/08/2026-08-19.md");
	});
});

describe("getDailyFolderPath", () => {
	it("produces a zero-padded YYYY/MM folder path", () => {
		expect(getDailyFolderPath(2026, 0, "Daily Planner")).toBe("Daily Planner/Daily/2026/01");
	});
});

describe("dailyFolderExcludePattern", () => {
	it("is the root folder's Daily subfolder, no glob characters", () => {
		expect(dailyFolderExcludePattern("Daily Planner")).toBe("Daily Planner/Daily");
	});

	it("follows a renamed root folder", () => {
		expect(dailyFolderExcludePattern("My Planner")).toBe("My Planner/Daily");
	});
});
