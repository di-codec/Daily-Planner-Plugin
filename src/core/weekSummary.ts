import { TaskItem, WeekDaySummary, WeekSummary } from "./types";
import { toISODate } from "./dates";

export interface DaySnapshot {
	date: Date;
	tasks: TaskItem[];
	habits: Record<string, boolean>;
}

/** Pure aggregation over 7 already-fetched days. Habit columns are the union across all days. */
export function buildWeekSummary(
	startOfWeek: Date,
	days: DaySnapshot[],
	knownHabitNames: readonly string[],
): WeekSummary {
	const habitNames = new Set<string>(knownHabitNames);
	const daySummaries: WeekDaySummary[] = days.map((day) => {
		Object.keys(day.habits).forEach((name) => habitNames.add(name));
		return {
			date: day.date,
			iso: toISODate(day.date),
			tasksTotal: day.tasks.length,
			tasksCompleted: day.tasks.filter((task) => task.completed).length,
			habits: day.habits,
		};
	});

	const habits: Record<string, boolean[]> = {};
	habitNames.forEach((name) => {
		habits[name] = daySummaries.map((day) => Boolean(day.habits[name]));
	});

	return {
		startOfWeek,
		days: daySummaries,
		tasksTotal: daySummaries.reduce((sum, day) => sum + day.tasksTotal, 0),
		tasksCompleted: daySummaries.reduce((sum, day) => sum + day.tasksCompleted, 0),
		habits,
	};
}
