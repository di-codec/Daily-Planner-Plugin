export function defaultHabits(knownNames: readonly string[]): Record<string, boolean> {
	const habits: Record<string, boolean> = {};
	for (const name of knownNames) {
		habits[name] = false;
	}
	return habits;
}

/**
 * Fills in any known habit not present in `raw` as false, but keeps stale/unknown
 * keys already stored in the note (e.g. a habit later removed from settings).
 */
export function normalizeHabits(raw: unknown, knownNames: readonly string[]): Record<string, boolean> {
	const habits = defaultHabits(knownNames);
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return habits;
	}
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		habits[key] = Boolean(value);
	}
	return habits;
}

export function mergeHabits(
	base: Record<string, boolean>,
	overlay: Record<string, boolean>,
): Record<string, boolean> {
	return { ...base, ...overlay };
}

export function normalizeHabitName(name: string): string {
	return name.trim().toLowerCase();
}

/** Trims, lowercases, dedupes (first occurrence wins) and drops empty entries. */
export function normalizeHabitNames(names: readonly string[]): string[] {
	const normalized = names.map(normalizeHabitName).filter((name) => name.length > 0);
	return normalized.filter((name, index) => normalized.indexOf(name) === index);
}

/** In-place rename (keeps the habit's position in the list) - a no-op if `newName` is empty after normalizing. */
export function renameHabit(habits: readonly string[], oldName: string, newName: string): string[] {
	const normalizedNew = normalizeHabitName(newName);
	if (!normalizedNew) {
		return [...habits];
	}
	return normalizeHabitNames(habits.map((name) => (name === oldName ? normalizedNew : name)));
}

const HABIT_LINE = /^\s*- \[([ xX])\]\s?(.*)$/;

function capitalize(name: string): string {
	return name.length === 0 ? name : name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatHabitChecklist(habits: Record<string, boolean>): string {
	return Object.entries(habits)
		.map(([name, done]) => `- [${done ? "x" : " "}] ${capitalize(name)}`)
		.join("\n");
}

export function parseHabitChecklist(sectionBody: string): Record<string, boolean> {
	const habits: Record<string, boolean> = {};
	for (const line of sectionBody.split(/\r?\n/)) {
		const match = HABIT_LINE.exec(line);
		if (!match) {
			continue;
		}
		const name = match[2].trim().toLowerCase();
		if (!name) {
			continue;
		}
		habits[name] = match[1].toLowerCase() === "x";
	}
	return habits;
}
