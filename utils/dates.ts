/** Local YYYY-MM-DD (not UTC — toISOString() can shift the day). */
export function toISODate(date: Date): string {
	const y = date.getFullYear();
	const m = pad2(date.getMonth() + 1);
	const d = pad2(date.getDate());
	return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const date = new Date(year, month, day);
	if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
		return null;
	}
	return date;
}

export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
	const next = startOfDay(date);
	next.setDate(next.getDate() + days);
	return next;
}

/** Monday as the first day of the week. */
export function getStartOfWeek(date: Date): Date {
	const start = startOfDay(date);
	const day = start.getDay();
	const offset = day === 0 ? 6 : day - 1;
	start.setDate(start.getDate() - offset);
	return start;
}

export function formatDayHeading(date: Date): string {
	return date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

export function formatMonthTitle(date: Date): string {
	const title = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
	return title.charAt(0).toUpperCase() + title.slice(1);
}

export function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}
