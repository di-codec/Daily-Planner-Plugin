import { DAILY_FOLDER } from "./constants";
import { pad2, toISODate } from "./dates";

export function getDailyNotePath(date: Date, rootFolder: string): string {
	const year = String(date.getFullYear());
	const month = pad2(date.getMonth() + 1);
	return `${rootFolder}/${DAILY_FOLDER}/${year}/${month}/${toISODate(date)}.md`;
}

export function getDailyFolderPath(year: number, monthIndex: number, rootFolder: string): string {
	return `${rootFolder}/${DAILY_FOLDER}/${year}/${pad2(monthIndex + 1)}`;
}

/** Bare folder-path prefix - the format Obsidian's Excluded files list matches on, not a glob pattern. */
export function dailyFolderExcludePattern(rootFolder: string): string {
	return `${rootFolder}/${DAILY_FOLDER}`;
}
