import { TaskItem } from "./types";

/**
 * Completion percentage (0-100) for a single day, based on tasks and habits
 * (schedule entries have no done/not-done state, so they're excluded).
 * Returns 0 when there is nothing completable yet.
 */
export function dayCompletionPercent(tasks: TaskItem[], habits: Record<string, boolean>): number {
	const habitValues = Object.values(habits);
	const total = tasks.length + habitValues.length;
	if (total === 0) {
		return 0;
	}
	const completed = tasks.filter((task) => task.completed).length + habitValues.filter(Boolean).length;
	return Math.round((completed / total) * 100);
}
