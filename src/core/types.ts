export interface ScheduleEntry {
	time: string;
	title: string;
}

export interface TaskItem {
	text: string;
	completed: boolean;
}

export interface DailyNoteData {
	/** Raw text before the first "## " section - normally "# <heading>". Preserved verbatim, never regenerated after creation. */
	preamble: string;
	tasks: TaskItem[];
	habits: Record<string, boolean>;
	schedule: ScheduleEntry[];
	/** Any "## ..." section a user hand-added that isn't one of the three managed ones, preserved verbatim. */
	extra: string;
	/** Any frontmatter key other than habits/schedule (tags, aliases, a user's own experiment), round-tripped as-is. */
	extraFrontmatter: Record<string, unknown>;
}

export interface WeekDaySummary {
	date: Date;
	iso: string;
	tasksTotal: number;
	tasksCompleted: number;
	habits: Record<string, boolean>;
}

export interface WeekSummary {
	startOfWeek: Date;
	days: WeekDaySummary[];
	tasksTotal: number;
	tasksCompleted: number;
	habits: Record<string, boolean[]>;
}

export interface LegacyMigrationReport {
	migratedDays: number;
	skippedExisting: number;
	failed: number;
}
