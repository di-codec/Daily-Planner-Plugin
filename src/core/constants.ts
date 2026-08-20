/** Default root folder of the plugin inside the vault (overridable via settings). */
export const DEFAULT_ROOT_FOLDER = "Daily Planner";

/** Subfolder for one-note-per-day files: <root>/Daily/YYYY/MM/YYYY-MM-DD.md */
export const DAILY_FOLDER = "Daily";

/** Legacy data always lived under the original hardcoded root, regardless of any later root-folder setting. */
export const LEGACY_TASKS_FOLDER = `${DEFAULT_ROOT_FOLDER}/✅Tasks`;
export const LEGACY_HEALTH_FOLDER = `${DEFAULT_ROOT_FOLDER}/❤️Health Tracker`;

/** Default habit names for settings (user can change them in the settings tab). */
export const DEFAULT_HABITS: string[] = [
	"glutes",
	"legs",
	"back",
	"wrists",
	"shoulders",
	"jogging",
	"yoga",
];

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Default heading text for the habits section written into each daily note (overridable via settings). */
export const DEFAULT_HABITS_SECTION_TITLE = "Habits";
