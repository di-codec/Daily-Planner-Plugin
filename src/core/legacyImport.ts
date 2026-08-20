import { toISODate } from "./dates";

const ENGLISH_MONTHS: Record<string, number> = {
	january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
	july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const ENGLISH_MONTHS_SHORT: Record<string, number> = {
	jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
	jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function parseLegacyTaskPath(path: string): Date | null {
	const match = /(\d{4}) Year\/📅\s+([A-Za-z]+)\/📅\s+(\d{1,2})\s+([A-Za-z]+)\.md$/.exec(path);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const month = ENGLISH_MONTHS[match[4].toLowerCase()] ?? ENGLISH_MONTHS[match[2].toLowerCase()];
	const day = Number(match[3]);
	if (month === undefined) {
		return null;
	}
	return new Date(year, month, day);
}

export function parseTrackerDateCell(cell: string, fallbackYear: number, previous: Date | null): Date | null {
	const match = /(\d{1,2})\s+([A-Za-z]+)/.exec(cell);
	if (!match) {
		return null;
	}
	const day = Number(match[1]);
	const month = ENGLISH_MONTHS_SHORT[match[2].toLowerCase()] ?? ENGLISH_MONTHS[match[2].toLowerCase()];
	if (month === undefined) {
		return null;
	}
	let year = fallbackYear;
	if (previous && month < previous.getMonth() && previous.getMonth() - month > 6) {
		year = previous.getFullYear() + 1;
	} else if (previous) {
		year = previous.getFullYear();
		if (month < previous.getMonth() && previous.getMonth() >= 11) {
			year = previous.getFullYear() + 1;
		}
	}
	return new Date(year, month, day);
}

export function isLegacyHabitChecked(cell: string): boolean {
	const value = cell.trim();
	if (!value) {
		return false;
	}
	if (value.includes("unchecked")) {
		return false;
	}
	if (/\bchecked\b/i.test(value) || value.includes("☑️") || value.includes("✅") || /\[x\]/i.test(value)) {
		return true;
	}
	return false;
}

/**
 * Parses the "Daily Habits Track" markdown table format used by the legacy
 * weekly health tracker notes. `fallbackYear` should come from the file's
 * creation time (the table itself doesn't carry a year).
 */
export function parseLegacyHealthTable(
	content: string,
	fallbackYear: number,
	emptyHabits: () => Record<string, boolean>,
): Map<string, Record<string, boolean>> {
	const result = new Map<string, Record<string, boolean>>();
	const lines = content.split("\n");
	const headerIndex = lines.findIndex((line) => line.includes("Daily Habits Track"));
	if (headerIndex === -1) {
		return result;
	}

	const headerCells = lines[headerIndex].split("|").map((cell) => cell.trim());
	const dates: (Date | null)[] = [];
	let last: Date | null = null;
	for (let i = 2; i <= 8; i++) {
		const parsed = parseTrackerDateCell(headerCells[i] ?? "", fallbackYear, last);
		dates.push(parsed);
		if (parsed) {
			last = parsed;
		}
	}

	for (let i = headerIndex + 1; i < lines.length; i++) {
		if (!lines[i].startsWith("|")) {
			break;
		}
		const cells = lines[i].split("|").map((cell) => cell.trim());
		const group = (cells[1] ?? "").trim();
		if (!group) {
			continue;
		}
		const habitKey = group.toLowerCase();
		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			const date = dates[dayIndex];
			if (!date) {
				continue;
			}
			const iso = toISODate(date);
			const habits = result.get(iso) ?? emptyHabits();
			habits[habitKey] = isLegacyHabitChecked(cells[dayIndex + 2] ?? "");
			result.set(iso, habits);
		}
	}
	return result;
}
