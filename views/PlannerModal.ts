import { Modal, Notice, App } from "obsidian";
import { WEEKDAY_LABELS_RU } from "../constants";
import { DailyNoteManager, ScheduleEntry, TaskItem } from "../models/dailyNoteModel";
import { addDays, formatDayHeading, formatMonthTitle, getStartOfWeek, isSameDay, startOfDay, toISODate } from "../utils/dates";

export class PlannerModal extends Modal {
	private dailyNotes: DailyNoteManager;
	private selectedDate: Date;
	private viewMonth: Date;
	private calendarEl!: HTMLElement;
	private dayPlanEl!: HTMLElement;
	private weekEl!: HTMLElement;
	private activeDates: Set<string> = new Set();
	private dayPlanGen = 0;
	private weekGen = 0;

	constructor(app: App, dailyNotes: DailyNoteManager) {
		super(app);
		this.dailyNotes = dailyNotes;
		this.selectedDate = startOfDay(new Date());
		this.viewMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
	}

	onOpen() {
		this.modalEl.addClass("daily-planner-modal");
		this.titleEl.setText("Ежедневник");
		this.contentEl.empty();
		this.contentEl.addClass("dp-modal-body");

		this.calendarEl = this.contentEl.createEl("div", { cls: "dp-calendar" });
		this.dayPlanEl = this.contentEl.createEl("div", { cls: "dp-day-plan" });
		this.weekEl = this.contentEl.createEl("div", { cls: "dp-week-tracker" });

		void this.load();
	}

	onClose() {
		this.contentEl.empty();
	}

	private async load(): Promise<void> {
		await this.refreshActiveDates();
		await Promise.all([this.renderCalendar(), this.renderDayPlan(), this.renderWeekTracker()]);
	}

	private async refreshActiveDates(): Promise<void> {
		this.activeDates = await this.dailyNotes.getActiveDatesInMonth(
			this.viewMonth.getFullYear(),
			this.viewMonth.getMonth(),
		);
	}

	private async renderCalendar(): Promise<void> {
		this.calendarEl.empty();

		const header = this.calendarEl.createEl("div", { cls: "dp-calendar-header" });
		const prev = header.createEl("button", { cls: "dp-icon-btn", text: "‹" });
		prev.setAttr("type", "button");
		prev.setAttr("aria-label", "Предыдущий месяц");
		prev.addEventListener("click", () => void this.shiftMonth(-1));

		header.createEl("div", { cls: "dp-calendar-title", text: formatMonthTitle(this.viewMonth) });

		const next = header.createEl("button", { cls: "dp-icon-btn", text: "›" });
		next.setAttr("type", "button");
		next.setAttr("aria-label", "Следующий месяц");
		next.addEventListener("click", () => void this.shiftMonth(1));

		const grid = this.calendarEl.createEl("div", { cls: "dp-calendar-grid" });
		for (const label of WEEKDAY_LABELS_RU) {
			grid.createEl("div", { cls: "dp-weekday", text: label });
		}

		const year = this.viewMonth.getFullYear();
		const month = this.viewMonth.getMonth();
		const first = new Date(year, month, 1);
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const mondayOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
		const today = startOfDay(new Date());

		for (let i = 0; i < mondayOffset; i++) {
			grid.createEl("div", { cls: "dp-day is-empty" });
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month, day);
			const iso = toISODate(date);
			const cell = grid.createEl("button", { cls: "dp-day", text: String(day) });
			cell.setAttr("type", "button");
			if (isSameDay(date, today)) {
				cell.addClass("is-today");
			}
			if (isSameDay(date, this.selectedDate)) {
				cell.addClass("is-selected");
			}
			if (this.activeDates.has(iso)) {
				cell.addClass("has-note");
				cell.createEl("span", { cls: "dp-day-dot" });
			}
			cell.addEventListener("click", () => void this.selectDate(date));
		}
	}

	private async selectDate(date: Date): Promise<void> {
		this.selectedDate = startOfDay(date);
		await Promise.all([this.renderCalendar(), this.renderDayPlan()]);
	}

	private async shiftMonth(delta: number): Promise<void> {
		this.viewMonth = new Date(this.viewMonth.getFullYear(), this.viewMonth.getMonth() + delta, 1);
		await this.refreshActiveDates();
		await this.renderCalendar();
	}

	private async renderDayPlan(): Promise<void> {
		const gen = ++this.dayPlanGen;
		this.dayPlanEl.empty();
		this.dayPlanEl.createEl("h3", { text: formatDayHeading(this.selectedDate) });

		const tasks = await this.dailyNotes.getTasks(this.selectedDate);
		const schedule = await this.dailyNotes.getSchedule(this.selectedDate);
		if (gen !== this.dayPlanGen) {
			return;
		}

		this.renderTaskBlock(tasks);
		this.renderScheduleBlock(schedule);
	}

	private renderTaskBlock(tasks: TaskItem[]): void {
		const block = this.dayPlanEl.createEl("div", { cls: "dp-block" });
		block.createEl("h4", { text: "Задачи" });

		const list = block.createEl("div", { cls: "dp-task-list" });
		if (tasks.length === 0) {
			list.createEl("div", { cls: "dp-empty", text: "Нет задач" });
		}
		tasks.forEach((task, index) => {
			const row = list.createEl("label", { cls: "dp-check-row" });
			const checkbox = row.createEl("input", { type: "checkbox" });
			checkbox.checked = task.completed;
			checkbox.addEventListener("change", () => {
				void this.onToggleTask(index);
			});
			row.createEl("span", { text: task.text || "(без названия)" });
		});

		const form = block.createEl("div", { cls: "dp-inline-form" });
		const input = form.createEl("input", { type: "text", placeholder: "Новая задача" });
		input.addClass("dp-flex-input");
		const addBtn = form.createEl("button", { text: "Добавить" });
		addBtn.setAttr("type", "button");
		const submit = () => void this.onAddTask(input);
		addBtn.addEventListener("click", submit);
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				submit();
			}
		});
	}

	private renderScheduleBlock(schedule: ScheduleEntry[]): void {
		const block = this.dayPlanEl.createEl("div", { cls: "dp-block" });
		block.createEl("h4", { text: "Расписание" });

		const list = block.createEl("div", { cls: "dp-schedule-list" });
		if (schedule.length === 0) {
			list.createEl("div", { cls: "dp-empty", text: "Нет событий" });
		}
		for (const entry of schedule) {
			list.createEl("div", { cls: "dp-schedule-row", text: `${entry.time} — ${entry.title}` });
		}

		const form = block.createEl("div", { cls: "dp-inline-form" });
		const timeInput = form.createEl("input", { type: "time" });
		timeInput.addClass("dp-time-input");
		const titleInput = form.createEl("input", { type: "text", placeholder: "Событие" });
		titleInput.addClass("dp-flex-input");
		const addBtn = form.createEl("button", { text: "Добавить" });
		addBtn.setAttr("type", "button");
		const submit = () => void this.onAddSchedule(timeInput, titleInput);
		addBtn.addEventListener("click", submit);
		titleInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				submit();
			}
		});
	}

	private async renderWeekTracker(): Promise<void> {
		const gen = ++this.weekGen;
		this.weekEl.empty();
		this.weekEl.createEl("h3", { text: "Текущая неделя" });

		const week = await this.dailyNotes.getWeekSummary(new Date());
		if (gen !== this.weekGen) {
			return;
		}

		const end = addDays(week.startOfWeek, 6);
		const range = formatWeekRange(week.startOfWeek, end);
		this.weekEl.createEl("div", { cls: "dp-week-range", text: range });

		const percent = week.tasksTotal > 0 ? Math.round((week.tasksCompleted / week.tasksTotal) * 100) : 0;
		const filled = Math.round(percent / 10);
		const bar = "█".repeat(filled) + "░".repeat(10 - filled);
		this.weekEl.createEl("div", {
			cls: "dp-progress",
			text: `${bar}  ${percent}%  ·  ${week.tasksCompleted}/${week.tasksTotal} задач`,
		});

		const table = this.weekEl.createEl("div", { cls: "dp-week-table" });
		const head = table.createEl("div", { cls: "dp-week-row is-head" });
		head.createEl("div", { cls: "dp-week-habit-name", text: "Привычки" });
		for (let i = 0; i < 7; i++) {
			const day = addDays(week.startOfWeek, i);
			const cell = head.createEl("div", { cls: "dp-week-day-head" });
			cell.createEl("div", { text: WEEKDAY_LABELS_RU[i] });
			cell.createEl("div", { cls: "dp-week-day-num", text: String(day.getDate()) });
		}

		const habitNames = Object.keys(week.habits);
		if (habitNames.length === 0) {
			this.weekEl.createEl("div", { cls: "dp-empty", text: "Нет привычек" });
			return;
		}

		for (const habitName of habitNames) {
			const row = table.createEl("div", { cls: "dp-week-row" });
			row.createEl("div", { cls: "dp-week-habit-name", text: habitName });
			const flags = week.habits[habitName];
			for (let i = 0; i < 7; i++) {
				const day = addDays(week.startOfWeek, i);
				const cell = row.createEl("label", { cls: "dp-week-check" });
				const checkbox = cell.createEl("input", { type: "checkbox" });
				checkbox.checked = Boolean(flags[i]);
				checkbox.addEventListener("change", () => {
					void this.onToggleHabit(day, habitName);
				});
			}
		}
	}

	private async onToggleTask(index: number): Promise<void> {
		await this.dailyNotes.toggleTask(this.selectedDate, index);
		await this.refreshAfterMutation();
	}

	private async onAddTask(input: HTMLInputElement): Promise<void> {
		const text = input.value.trim();
		if (!text) {
			return;
		}
		await this.dailyNotes.addTask(this.selectedDate, text);
		input.value = "";
		await this.refreshAfterMutation();
	}

	private async onAddSchedule(timeInput: HTMLInputElement, titleInput: HTMLInputElement): Promise<void> {
		const time = timeInput.value.trim();
		const title = titleInput.value.trim();
		if (!time || !title) {
			new Notice("Укажите время и название события.");
			return;
		}
		await this.dailyNotes.addScheduleEntry(this.selectedDate, time, title);
		titleInput.value = "";
		await this.refreshAfterMutation();
	}

	private async onToggleHabit(date: Date, habitName: string): Promise<void> {
		await this.dailyNotes.toggleHabit(date, habitName);
		await this.refreshAfterMutation();
	}

	private async refreshAfterMutation(): Promise<void> {
		await this.refreshActiveDates();
		await Promise.all([this.renderCalendar(), this.renderDayPlan(), this.renderWeekTracker()]);
	}
}

function formatWeekRange(start: Date, end: Date): string {
	const startMonth = start.toLocaleDateString("ru-RU", { month: "long" });
	const endMonth = end.toLocaleDateString("ru-RU", { month: "long" });
	if (startMonth === endMonth && start.getFullYear() === end.getFullYear()) {
		return `${start.getDate()}–${end.getDate()} ${startMonth} ${start.getFullYear()}`;
	}
	return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}
