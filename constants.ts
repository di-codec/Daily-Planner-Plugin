/** Root folder of the plugin inside the vault. */
export const PLUGIN_FOLDER = "Daily Planner";

/** Subfolder for one-note-per-day files: Daily/YYYY/MM/YYYY-MM-DD.md */
export const DAILY_FOLDER = "Daily";

export const SUMMARY_PATH = `${PLUGIN_FOLDER}/Summary.md`;

/** Legacy locations used only by the one-shot migration command. */
export const LEGACY_TASKS_FOLDER = `${PLUGIN_FOLDER}/✅Tasks`;
export const LEGACY_HEALTH_FOLDER = `${PLUGIN_FOLDER}/❤️Health Tracker`;

/**
 * Default habit names until a settings tab exists.
 * Keys are stored lowercase in daily-note frontmatter.
 */
export const DEFAULT_HABITS: string[] = [
	"glutes",
	"legs",
	"back",
	"brists",
	"shoulders",
	"jogging",
	"yoga",
];

export const WEEKDAY_LABELS_EN = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

export const WEEKDAY_LABELS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const HABIT_COLORS: Record<string, string> = {
	glutes: "#FF69B4",
	legs: "#4169E1",
	back: "#FFD700",
	brists: "#20B2AA",
	shoulders: "#9370DB",
	jogging: "#FFA500",
	yoga: "#808080",
};
