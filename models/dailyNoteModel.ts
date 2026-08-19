import { App, Notice, TFile, TFolder, parseYaml, stringifyYaml } from "obsidian";
import {
	DAILY_FOLDER,
	DEFAULT_HABITS,
	LEGACY_HEALTH_FOLDER,
	LEGACY_TASKS_FOLDER,
	PLUGIN_FOLDER,
} from "../constants";
import { addDays, formatDayHeading, getStartOfWeek, isSameDay, pad2, toISODate } from "../utils/dates";
import { ensureFoldersExist } from "../utils/utils";

export interface ScheduleEntry {
	time: string;
	title: string;
}

export interface TaskItem {
	text: string;
	completed: boolean;
}

export interface DailyFrontmatter {
	habits: Record<string, boolean>;
	schedule: ScheduleEntry[];
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

const TASK_LINE = /^\s*- \[([ xX])\]\s?(.*)$/;
const ENGLISH_MONTHS: Record<string, number> = {
	january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
	july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const ENGLISH_MONTHS_SHORT: Record<string, number> = {
	jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
	jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export class DailyNoteManager {
	constructor(private app: App) {}

	public getDailyNotePath(date: Date): string {
		const year = String(date.getFullYear());
		const month = pad2(date.getMonth() + 1);
		return `${PLUGIN_FOLDER}/${DAILY_FOLDER}/${year}/${month}/${toISODate(date)}.md`;
	}

	public getDailyNote(date: Date): TFile | null {
		const file = this.app.vault.getAbstractFileByPath(this.getDailyNotePath(date));
		return file instanceof TFile ? file : null;
	}

	/**
	 * Returns the daily note, creating it (and migrating yesterday's open tasks
	 * when the date is today) if it does not exist yet.
	 */
	async getOrCreateDailyNote(date: Date): Promise<TFile> {
		const existing = this.getDailyNote(date);
		if (existing) {
			return existing;
		}

		const file = await this.createDailyNote(date, [], defaultHabits(), []);
		if (isSameDay(date, new Date())) {
			await this.migrateUnfinishedTasks(date);
		}
		return this.getDailyNote(date) ?? file;
	}

	async getTasks(date: Date): Promise<TaskItem[]> {
		const file = this.getDailyNote(date);
		if (!file) {
			return [];
		}
		const body = await this.readBody(file);
		return parseTaskItems(body);
	}

	async addTask(date: Date, text: string): Promise<void> {
		const trimmed = text.trim();
		if (!trimmed) {
			return;
		}
		const file = await this.getOrCreateDailyNote(date);
		const body = await this.readBody(file);
		const nextBody = `${body.replace(/\s*$/, "")}\n- [ ] ${trimmed}\n`;
		await this.writeBody(file, nextBody);
	}

	async toggleTask(date: Date, index: number): Promise<void> {
		const file = this.getDailyNote(date);
		if (!file) {
			return;
		}
		const body = await this.readBody(file);
		const lines = body.split("\n");
		let taskIndex = -1;
		for (let i = 0; i < lines.length; i++) {
			if (!TASK_LINE.test(lines[i])) {
				continue;
			}
			taskIndex += 1;
			if (taskIndex !== index) {
				continue;
			}
			const match = TASK_LINE.exec(lines[i]);
			if (!match) {
				return;
			}
			const completed = match[1].toLowerCase() === "x";
			const title = match[2] ?? "";
			lines[i] = `- [${completed ? " " : "x"}] ${title}`;
			await this.writeBody(file, lines.join("\n"));
			return;
		}
	}

	async getHabits(date: Date): Promise<Record<string, boolean>> {
		const file = this.getDailyNote(date);
		if (!file) {
			return defaultHabits();
		}
		const frontmatter = await this.readFrontmatter(file);
		return frontmatter.habits;
	}

	async toggleHabit(date: Date, habitName: string): Promise<void> {
		if (!habitName) {
			return;
		}
		const file = await this.getOrCreateDailyNote(date);
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const current = normalizeHabits(fm["habits"]);
			current[habitName] = !current[habitName];
			fm["habits"] = current;
		});
	}

	async getSchedule(date: Date): Promise<ScheduleEntry[]> {
		const file = this.getDailyNote(date);
		if (!file) {
			return [];
		}
		const frontmatter = await this.readFrontmatter(file);
		return frontmatter.schedule;
	}

	async addScheduleEntry(date: Date, time: string, title: string): Promise<void> {
		const normalizedTime = normalizeTime(time);
		const trimmedTitle = title.trim();
		if (!normalizedTime || !trimmedTitle) {
			new Notice("Укажите время в формате HH:mm и название события.");
			return;
		}
		const file = await this.getOrCreateDailyNote(date);
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const schedule = normalizeSchedule(fm["schedule"]);
			schedule.push({ time: normalizedTime, title: trimmedTitle });
			schedule.sort((a, b) => a.time.localeCompare(b.time));
			fm["schedule"] = schedule;
		});
	}

	async getWeekSummary(date: Date): Promise<WeekSummary> {
		const startOfWeek = getStartOfWeek(date);
		const habitNames = new Set<string>(DEFAULT_HABITS);
		const days: WeekDaySummary[] = [];

		for (let i = 0; i < 7; i++) {
			const day = addDays(startOfWeek, i);
			const tasks = await this.getTasks(day);
			const habits = await this.getHabits(day);
			Object.keys(habits).forEach((name) => habitNames.add(name));
			days.push({
				date: day,
				iso: toISODate(day),
				tasksTotal: tasks.length,
				tasksCompleted: tasks.filter((task) => task.completed).length,
				habits,
			});
		}

		const habits: Record<string, boolean[]> = {};
		habitNames.forEach((name) => {
			habits[name] = days.map((day) => Boolean(day.habits[name]));
		});

		return {
			startOfWeek,
			days,
			tasksTotal: days.reduce((sum, day) => sum + day.tasksTotal, 0),
			tasksCompleted: days.reduce((sum, day) => sum + day.tasksCompleted, 0),
			habits,
		};
	}

	/**
	 * Copies yesterday's unchecked tasks into the target day's note.
	 * Called automatically when today's note is created.
	 */
	async migrateUnfinishedTasks(targetDate: Date = new Date()): Promise<void> {
		const yesterday = addDays(targetDate, -1);
		const unfinished = (await this.getTasks(yesterday)).filter((task) => !task.completed);
		if (unfinished.length === 0) {
			return;
		}

		const file = await this.getOrCreateDailyNoteWithoutMigration(targetDate);
		const existing = await this.getTasks(targetDate);
		const existingTexts = new Set(existing.map((task) => task.text.trim()));
		const toCopy = unfinished.filter((task) => !existingTexts.has(task.text.trim()));
		if (toCopy.length === 0) {
			return;
		}

		const body = await this.readBody(file);
		const lines = toCopy.map((task) => `- [ ] ${task.text}`).join("\n");
		const nextBody = `${body.replace(/\s*$/, "")}\n${lines}\n`;
		await this.writeBody(file, nextBody);
		new Notice(`Перенесено ${toCopy.length} незавершённых задач с ${toISODate(yesterday)}.`);
	}

	/**
	 * One-shot import from ✅Tasks daily files and ❤️Health Tracker weekly tables.
	 * Existing Daily/YYYY/MM/*.md files are left untouched. Old files are not deleted.
	 */
	async migrateLegacyData(): Promise<LegacyMigrationReport> {
		const byDay = new Map<string, { tasks: TaskItem[]; habits: Record<string, boolean> }>();

		await this.collectLegacyTasks(byDay);
		await this.collectLegacyHabits(byDay);

		let migratedDays = 0;
		let skippedExisting = 0;
		let failed = 0;

		const days = Array.from(byDay.keys()).sort();
		for (const iso of days) {
			const date = new Date(`${iso}T12:00:00`);
			if (Number.isNaN(date.getTime())) {
				failed += 1;
				continue;
			}
			if (this.getDailyNote(date)) {
				skippedExisting += 1;
				continue;
			}
			const payload = byDay.get(iso);
			if (!payload) {
				continue;
			}
			try {
				await this.createDailyNote(date, payload.tasks, payload.habits, []);
				migratedDays += 1;
			} catch (error) {
				console.error(`Failed to migrate ${iso}:`, error);
				failed += 1;
			}
		}

		const report = `Миграция: ${migratedDays} дней создано, ${skippedExisting} уже существовало, ${failed} ошибок. Старые файлы не удалялись.`;
		console.log(report);
		new Notice(report, 8000);
		return { migratedDays, skippedExisting, failed };
	}

	async getActiveDatesInMonth(year: number, monthIndex: number): Promise<Set<string>> {
		const folderPath = `${PLUGIN_FOLDER}/${DAILY_FOLDER}/${year}/${pad2(monthIndex + 1)}`;
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		const active = new Set<string>();
		if (!(folder instanceof TFolder)) {
			return active;
		}
		for (const child of folder.children) {
			if (!(child instanceof TFile) || child.extension !== "md") {
				continue;
			}
			if (await this.noteHasContent(child)) {
				active.add(child.basename);
			}
		}
		return active;
	}

	async noteHasContent(file: TFile): Promise<boolean> {
		const frontmatter = await this.readFrontmatter(file);
		if (Object.values(frontmatter.habits).some(Boolean)) {
			return true;
		}
		if (frontmatter.schedule.length > 0) {
			return true;
		}
		const tasks = parseTaskItems(await this.readBody(file));
		return tasks.length > 0;
	}

	private async getOrCreateDailyNoteWithoutMigration(date: Date): Promise<TFile> {
		const existing = this.getDailyNote(date);
		if (existing) {
			return existing;
		}
		return this.createDailyNote(date, [], defaultHabits(), []);
	}

	private async createDailyNote(
		date: Date,
		tasks: TaskItem[],
		habits: Record<string, boolean>,
		schedule: ScheduleEntry[],
	): Promise<TFile> {
		const filePath = this.getDailyNotePath(date);
		await ensureFoldersExist(this.app, filePath);
		const yaml = stringifyYaml({
			habits: mergeHabits(defaultHabits(), habits),
			schedule: normalizeSchedule(schedule),
		});
		const yamlBlock = yaml.endsWith("\n") ? yaml : `${yaml}\n`;
		const taskLines = tasks.map((task) => `- [${task.completed ? "x" : " "}] ${task.text}`).join("\n");
		const heading = `# ${formatDayHeading(date)}`;
		const body = taskLines ? `${heading}\n\n${taskLines}\n` : `${heading}\n`;
		const content = `---\n${yamlBlock}---\n${body}`;
		return this.app.vault.create(filePath, content);
	}

	private async readFrontmatter(file: TFile): Promise<DailyFrontmatter> {
		const content = await this.app.vault.read(file);
		const split = splitNote(content);
		if (split.yaml !== null) {
			const parsed = parseYaml(split.yaml) ?? {};
			return {
				habits: normalizeHabits((parsed as Record<string, unknown>)["habits"]),
				schedule: normalizeSchedule((parsed as Record<string, unknown>)["schedule"]),
			};
		}
		const cache = this.app.metadataCache.getFileCache(file);
		if (cache?.frontmatter) {
			return {
				habits: normalizeHabits(cache.frontmatter["habits"]),
				schedule: normalizeSchedule(cache.frontmatter["schedule"]),
			};
		}
		return { habits: defaultHabits(), schedule: [] };
	}

	private async readBody(file: TFile): Promise<string> {
		const content = await this.app.vault.read(file);
		const cache = this.app.metadataCache.getFileCache(file);
		const offset = cache?.frontmatterPosition?.end?.offset;
		if (typeof offset === "number") {
			return content.slice(offset).replace(/^\r?\n/, "");
		}
		return splitNote(content).body;
	}

	private async writeBody(file: TFile, body: string): Promise<void> {
		const content = await this.app.vault.read(file);
		const cache = this.app.metadataCache.getFileCache(file);
		const offset = cache?.frontmatterPosition?.end?.offset;
		const normalized = body.replace(/\s*$/, "\n");
		if (typeof offset === "number") {
			const prefix = content.slice(0, offset).replace(/\s*$/, "\n");
			await this.app.vault.modify(file, `${prefix}${normalized}`);
			return;
		}
		const split = splitNote(content);
		if (split.yaml !== null) {
			await this.app.vault.modify(file, `---\n${split.yaml}\n---\n${normalized}`);
			return;
		}
		await this.app.vault.modify(file, normalized);
	}

	private async collectLegacyTasks(
		byDay: Map<string, { tasks: TaskItem[]; habits: Record<string, boolean> }>,
	): Promise<void> {
		const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${LEGACY_TASKS_FOLDER}/`));
		for (const file of files) {
			const parsed = parseLegacyTaskPath(file.path);
			if (!parsed) {
				console.warn(`Skip unrecognized task path: ${file.path}`);
				continue;
			}
			const iso = toISODate(parsed);
			const content = await this.app.vault.read(file);
			const tasks = parseTaskItems(content);
			const current = byDay.get(iso) ?? { tasks: [], habits: defaultHabits() };
			current.tasks = current.tasks.concat(tasks);
			byDay.set(iso, current);
		}
	}

	private async collectLegacyHabits(
		byDay: Map<string, { tasks: TaskItem[]; habits: Record<string, boolean> }>,
	): Promise<void> {
		const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${LEGACY_HEALTH_FOLDER}/`));
		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const perDay = parseLegacyHealthTable(content, file);
				for (const [iso, habits] of perDay.entries()) {
					const current = byDay.get(iso) ?? { tasks: [], habits: defaultHabits() };
					current.habits = mergeHabits(current.habits, habits);
					byDay.set(iso, current);
				}
			} catch (error) {
				console.error(`Failed to parse health tracker ${file.path}:`, error);
			}
		}
	}
}

function defaultHabits(): Record<string, boolean> {
	const habits: Record<string, boolean> = {};
	for (const name of DEFAULT_HABITS) {
		habits[name] = false;
	}
	return habits;
}

function mergeHabits(
	base: Record<string, boolean>,
	overlay: Record<string, boolean>,
): Record<string, boolean> {
	return { ...base, ...overlay };
}

function normalizeHabits(raw: unknown): Record<string, boolean> {
	const habits = defaultHabits();
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return habits;
	}
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		habits[key] = Boolean(value);
	}
	return habits;
}

function normalizeSchedule(raw: unknown): ScheduleEntry[] {
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
	entries.sort((a, b) => a.time.localeCompare(b.time));
	return entries;
}

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

function parseTaskItems(content: string): TaskItem[] {
	const tasks: TaskItem[] = [];
	for (const line of content.split("\n")) {
		const match = TASK_LINE.exec(line);
		if (!match) {
			continue;
		}
		tasks.push({
			completed: match[1].toLowerCase() === "x",
			text: (match[2] ?? "").trim(),
		});
	}
	return tasks;
}

function splitNote(content: string): { yaml: string | null; body: string } {
	if (!content.startsWith("---")) {
		return { yaml: null, body: content };
	}
	const afterOpen = content.slice(3).replace(/^\r?\n/, "");
	const close = afterOpen.match(/\r?\n---[ \t]*(?:\r?\n|$)/);
	if (!close || close.index === undefined) {
		return { yaml: null, body: content };
	}
	return {
		yaml: afterOpen.slice(0, close.index),
		body: afterOpen.slice(close.index + close[0].length),
	};
}

function parseLegacyTaskPath(path: string): Date | null {
	const match = /(\d{4}) Year\/📅\s+([A-Za-z]+)\/📅\s+(\d{1,2})\s+([A-Za-z]+)\.md$/.exec(path);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const month = ENGLISH_MONTHS[match[4].toLowerCase()] ?? ENGLISH_MONTHS[match[2].toLowerCase()];
	const day = Number(match[3]);
	if (month === undefined) {
		return null;
	}
	return new Date(year, month, day);
}

function parseLegacyHealthTable(content: string, file: TFile): Map<string, Record<string, boolean>> {
	const result = new Map<string, Record<string, boolean>>();
	const lines = content.split("\n");
	const headerIndex = lines.findIndex((line) => line.includes("Daily Habits Track"));
	if (headerIndex === -1) {
		return result;
	}

	const headerCells = lines[headerIndex].split("|").map((cell) => cell.trim());
	const fallbackYear = new Date(file.stat.ctime).getFullYear();
	const dates: (Date | null)[] = [];
	let last: Date | null = null;
	for (let i = 2; i <= 8; i++) {
		const parsed = parseTrackerDateCell(headerCells[i] ?? "", fallbackYear, last);
		dates.push(parsed);
		if (parsed) {
			last = parsed;
		}
	}

	for (let i = headerIndex + 1; i < lines.length; i++) {
		if (!lines[i].startsWith("|")) {
			break;
		}
		const cells = lines[i].split("|").map((cell) => cell.trim());
		const group = (cells[1] ?? "").trim();
		if (!group) {
			continue;
		}
		const habitKey = group.toLowerCase();
		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			const date = dates[dayIndex];
			if (!date) {
				continue;
			}
			const iso = toISODate(date);
			const habits = result.get(iso) ?? defaultHabits();
			habits[habitKey] = isLegacyHabitChecked(cells[dayIndex + 2] ?? "");
			result.set(iso, habits);
		}
	}
	return result;
}

function parseTrackerDateCell(cell: string, fallbackYear: number, previous: Date | null): Date | null {
	const match = /(\d{1,2})\s+([A-Za-z]+)/.exec(cell);
	if (!match) {
		return null;
	}
	const day = Number(match[1]);
	const month = ENGLISH_MONTHS_SHORT[match[2].toLowerCase()] ?? ENGLISH_MONTHS[match[2].toLowerCase()];
	if (month === undefined) {
		return null;
	}
	let year = fallbackYear;
	if (previous && month < previous.getMonth() && previous.getMonth() - month > 6) {
		year = previous.getFullYear() + 1;
	} else if (previous) {
		year = previous.getFullYear();
		if (month < previous.getMonth() && previous.getMonth() >= 11) {
			year = previous.getFullYear() + 1;
		}
	}
	return new Date(year, month, day);
}

function isLegacyHabitChecked(cell: string): boolean {
	const value = cell.trim();
	if (!value) {
		return false;
	}
	if (value.includes("unchecked")) {
		return false;
	}
	if (/\bchecked\b/i.test(value) || value.includes("☑️") || value.includes("✅") || /\[x\]/i.test(value)) {
		return true;
	}
	return false;
}
