/** Curated colors for the built-in default habits (shared by the week tracker and the stacked-bar-chart codeblock). */
const KNOWN_HABIT_COLORS: Record<string, string> = {
	glutes: "#ff69b4",
	legs: "#4169e1",
	wrists: "#20b2aa",
	back: "#ffd700",
	shoulders: "#9370db",
	jogging: "#ffa500",
	yoga: "#696969",
};

/** Deterministic hash so any custom habit name still gets a stable color across sessions. */
function hashColor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
		hash |= 0;
	}
	const hex = (hash & 0x00ffffff).toString(16).toUpperCase();
	return `#${"000000".slice(0, 6 - hex.length)}${hex}`;
}

/** Known habits get a curated color; anything else gets a stable hash-derived one. */
export function habitColor(name: string): string {
	return KNOWN_HABIT_COLORS[name.toLowerCase()] ?? hashColor(name.toLowerCase());
}
