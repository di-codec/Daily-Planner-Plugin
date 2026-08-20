import { App, Notice, TFile, TFolder } from "obsidian";
import { LEGACY_HEALTH_FOLDER, LEGACY_TASKS_FOLDER } from "../core/constants";
import { dayCompletionPercent } from "../core/completion";
import { createDebouncer, Debouncer } from "../core/debounce";
import { addDays, formatDayHeading, getStartOfWeek, isSameDay, toISODate } from "../core/dates";
import { defaultHabits, mergeHabits, normalizeHabits } from "../core/habits";
import { parseLegacyHealthTable, parseLegacyTaskPath } from "../core/legacyImport";
import { hasMeaningfulContent, parseNoteContent, serializeNoteContent } from "../core/noteContent";
import { getDailyFolderPath, getDailyNotePath as buildDailyNotePath } from "../core/paths";
import { addScheduleEntry as addScheduleEntryPure } from "../core/schedule";
import { appendTask, parseTaskItems, toggleTaskAt, unfinishedTasksToCopy } from "../core/tasks";
import type {
	DailyNoteData,
	LegacyMigrationReport,
	ScheduleEntry,
	TaskItem,
	WeekDaySummary,
	WeekSummary,
} from "../core/types";
import { buildWeekSummary } from "../core/weekSummary";
import { ensureFoldersExist } from "./ensureFoldersExist";

export type { LegacyMigrationReport, ScheduleEntry, TaskItem, WeekDaySummary, WeekSummary };

const WRITE_DEBOUNCE_MS = 250;

interface PendingWrite {
	file: TFile;
	note: DailyNoteData;
	debouncer: Debouncer<DailyNoteData>;
}

/**
 * Thin Vault/MetadataCache adapter: reads and writes daily notes, delegating all
 * parsing/aggregation/validation to src/core. Frontmatter is parsed from plain
 * file text (src/core/noteContent) rather than app.metadataCache, so reads never
 * race a not-yet-reindexed cache after a write.
 */
export class DailyNoteRepository {
	private pending = new Map<string, PendingWrite>();

	constructor(
		private app: App,
		private getHabitNames: () => string[],
		private getRootFolder: () => string,
		private getHabitsSectionTitle: () => string,
	) {}

	public getDailyNotePath(date: Date): string {
		return buildDailyNotePath(date, this.getRootFolder());
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

		const file = await this.createDailyNote(date, [], defaultHabits(this.getHabitNames()), []);
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
		const note = await this.readNote(file);
		return note.tasks;
	}

	async addTask(date: Date, text: string): Promise<void> {
		if (!text.trim()) {
			return;
		}
		const file = await this.getOrCreateDailyNote(date);
		await this.mutateNote(file, (note) => ({ ...note, tasks: appendTask(note.tasks, text) }));
	}

	async toggleTask(date: Date, index: number): Promise<void> {
		const file = this.getDailyNote(date);
		if (!file) {
			return;
		}
		await this.mutateNote(file, (note) => ({ ...note, tasks: toggleTaskAt(note.tasks, index) }));
	}

	async getHabits(date: Date): Promise<Record<string, boolean>> {
		const file = this.getDailyNote(date);
		if (!file) {
			return defaultHabits(this.getHabitNames());
		}
		const note = await this.readNote(file);
		return note.habits;
	}

	async toggleHabit(date: Date, habitName: string): Promise<void> {
		if (!habitName) {
			return;
		}
		const file = await this.getOrCreateDailyNote(date);
		await this.mutateNote(file, (note) => {
			const current = { ...note.habits, [habitName]: !note.habits[habitName] };
			return { ...note, habits: current };
		});
	}

	async getSchedule(date: Date): Promise<ScheduleEntry[]> {
		const file = this.getDailyNote(date);
		if (!file) {
			return [];
		}
		const note = await this.readNote(file);
		return note.schedule;
	}

	async addScheduleEntry(date: Date, time: string, title: string): Promise<void> {
		const file = await this.getOrCreateDailyNote(date);
		let invalid = false;
		await this.mutateNote(file, (note) => {
			const next = addScheduleEntryPure(note.schedule, time, title);
			if (next === null) {
				invalid = true;
				return note;
			}
			return { ...note, schedule: next };
		});
		if (invalid) {
			new Notice("Enter a time in HH:mm format and an event title.");
		}
	}

	async getWeekSummary(date: Date): Promise<WeekSummary> {
		const startOfWeek = getStartOfWeek(date);
		const days = [];
		for (let i = 0; i < 7; i++) {
			const day = addDays(startOfWeek, i);
			days.push({
				date: day,
				tasks: await this.getTasks(day),
				habits: await this.getHabits(day),
			});
		}
		return buildWeekSummary(startOfWeek, days, this.getHabitNames());
	}

	/**
	 * Copies yesterday's unchecked tasks into the target day's note.
	 * Called automatically when today's note is created.
	 */
	async migrateUnfinishedTasks(targetDate: Date = new Date()): Promise<void> {
		const yesterday = addDays(targetDate, -1);
		const yesterdayTasks = await this.getTasks(yesterday);
		if (!yesterdayTasks.some((task) => !task.completed)) {
			return;
		}

		const file = await this.getOrCreateDailyNoteWithoutMigration(targetDate);
		const existing = await this.getTasks(targetDate);
		const toCopy = unfinishedTasksToCopy(yesterdayTasks, existing);
		if (toCopy.length === 0) {
			return;
		}

		await this.mutateNote(file, (note) => ({ ...note, tasks: [...note.tasks, ...toCopy] }));
		new Notice(`Moved ${toCopy.length} unfinished tasks from ${toISODate(yesterday)}.`);
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

		const report = `Migration: ${migratedDays} days created, ${skippedExisting} already existed, ${failed} failed. Old files were not deleted.`;
		new Notice(report, 8000);
		return { migratedDays, skippedExisting, failed };
	}

	/** iso date -> completion percent (0-100), for every day in the month that has any content. Days absent from the map have no content at all. */
	async getMonthCompletion(year: number, monthIndex: number): Promise<Map<string, number>> {
		const folderPath = getDailyFolderPath(year, monthIndex, this.getRootFolder());
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		const completion = new Map<string, number>();
		if (!(folder instanceof TFolder)) {
			return completion;
		}
		for (const child of folder.children) {
			if (!(child instanceof TFile) || child.extension !== "md") {
				continue;
			}
			const note = await this.readNote(child);
			if (!hasMeaningfulContent(note)) {
				continue;
			}
			completion.set(child.basename, dayCompletionPercent(note.tasks, note.habits));
		}
		return completion;
	}

	/** Writes out any debounced changes immediately. Call before the plugin/modal goes away. */
	async flushAll(): Promise<void> {
		const habitsSectionTitle = this.getHabitsSectionTitle();
		const writes: Promise<void>[] = [];
		for (const entry of this.pending.values()) {
			entry.debouncer.cancel();
			writes.push(this.app.vault.modify(entry.file, serializeNoteContent(entry.note, habitsSectionTitle)));
		}
		this.pending.clear();
		await Promise.all(writes);
	}

	private async getOrCreateDailyNoteWithoutMigration(date: Date): Promise<TFile> {
		const existing = this.getDailyNote(date);
		if (existing) {
			return existing;
		}
		return this.createDailyNote(date, [], defaultHabits(this.getHabitNames()), []);
	}

	private async createDailyNote(
		date: Date,
		tasks: TaskItem[],
		habits: Record<string, boolean>,
		schedule: ScheduleEntry[],
	): Promise<TFile> {
		const filePath = this.getDailyNotePath(date);
		await ensureFoldersExist(this.app, filePath);
		const note: DailyNoteData = {
			preamble: `# ${formatDayHeading(date)}`,
			tasks,
			habits: mergeHabits(defaultHabits(this.getHabitNames()), habits),
			schedule,
			extra: "",
			extraFrontmatter: {},
		};
		return this.app.vault.create(filePath, serializeNoteContent(note, this.getHabitsSectionTitle()));
	}

	/** Read-your-writes: prefers an in-memory pending edit over the file on disk. Habits are always reconciled against current settings here, so any mutation (not just habit toggles) writes back a fully-known habit set. */
	private async readNote(file: TFile): Promise<DailyNoteData> {
		const pending = this.pending.get(file.path);
		if (pending) {
			return pending.note;
		}
		const parsed = parseNoteContent(await this.app.vault.read(file));
		return { ...parsed, habits: normalizeHabits(parsed.habits, this.getHabitNames()) };
	}

	private async mutateNote(
		file: TFile,
		mutate: (note: DailyNoteData) => DailyNoteData,
	): Promise<DailyNoteData> {
		const base = await this.readNote(file);
		const next = mutate(base);
		this.scheduleWrite(file, next);
		return next;
	}

	private scheduleWrite(file: TFile, note: DailyNoteData): void {
		const existing = this.pending.get(file.path);
		if (existing) {
			existing.note = note;
			existing.debouncer.schedule(note);
			return;
		}
		const debouncer = createDebouncer<DailyNoteData>(WRITE_DEBOUNCE_MS, (value) => {
			this.pending.delete(file.path);
			void this.app.vault.modify(file, serializeNoteContent(value, this.getHabitsSectionTitle())).catch((error) => {
				console.error(`Failed to write ${file.path}:`, error);
			});
		});
		this.pending.set(file.path, { file, note, debouncer });
		debouncer.schedule(note);
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
			const current = byDay.get(iso) ?? { tasks: [], habits: defaultHabits(this.getHabitNames()) };
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
				const fallbackYear = new Date(file.stat.ctime).getFullYear();
				const perDay = parseLegacyHealthTable(content, fallbackYear, () => defaultHabits(this.getHabitNames()));
				for (const [iso, habits] of perDay.entries()) {
					const current = byDay.get(iso) ?? { tasks: [], habits: defaultHabits(this.getHabitNames()) };
					current.habits = mergeHabits(current.habits, habits);
					byDay.set(iso, current);
				}
			} catch (error) {
				console.error(`Failed to parse health tracker ${file.path}:`, error);
			}
		}
	}
}
