import { ScheduleEntry } from "./types";
import { pad2 } from "./dates";

export function normalizeTime(time: string): string | null {
	const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) {
		return null;
	}
	return `${pad2(hours)}:${match[2]}`;
}

export function sortSchedule(entries: ScheduleEntry[]): ScheduleEntry[] {
	return [...entries].sort((a, b) => a.time.localeCompare(b.time));
}

export function normalizeSchedule(raw: unknown): ScheduleEntry[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	const entries: ScheduleEntry[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") {
			continue;
		}
		const record = item as Record<string, unknown>;
		const time = normalizeTime(String(record["time"] ?? ""));
		const title = String(record["title"] ?? "").trim();
		if (time && title) {
			entries.push({ time, title });
		}
	}
	return sortSchedule(entries);
}

/** Pure validate+insert+sort. Returns null when time/title are invalid. */
export function addScheduleEntry(
	schedule: ScheduleEntry[],
	time: string,
	title: string,
): ScheduleEntry[] | null {
	const normalizedTime = normalizeTime(time);
	const trimmedTitle = title.trim();
	if (!normalizedTime || !trimmedTitle) {
		return null;
	}
	return sortSchedule([...schedule, { time: normalizedTime, title: trimmedTitle }]);
}

export function formatScheduleChecklist(schedule: ScheduleEntry[]): string {
	return schedule.map((entry) => `- ${entry.time} - ${entry.title}`).join("\n");
}

/** Accepts a hyphen or a legacy em dash between time and title. */
const SCHEDULE_LINE = /^\s*-\s*(\d{1,2}:\d{2})\s*[\u2014-]\s*(.+)$/;

export function parseScheduleChecklist(sectionBody: string): ScheduleEntry[] {
	const entries: ScheduleEntry[] = [];
	for (const line of sectionBody.split(/\r?\n/)) {
		const match = SCHEDULE_LINE.exec(line);
		if (!match) {
			continue;
		}
		const time = normalizeTime(match[1]);
		const title = match[2].trim();
		if (time && title) {
			entries.push({ time, title });
		}
	}
	return sortSchedule(entries);
}
