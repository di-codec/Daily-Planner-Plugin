import { Notice } from "obsidian";
import { DEFAULT_HABITS, WEEKDAY_LABELS } from "../../core/constants";
import { addDays } from "../../core/dates";
import { habitColor } from "../../core/habitColors";
import { normalizeHabitName, normalizeHabitNames, renameHabit } from "../../core/habits";
import { PlannerState, PlannerStore } from "../store";

export interface HabitSettingsAccess {
	getHabits: () => string[];
	getHabitsSectionTitle: () => string;
	saveHabits: (habits: string[]) => Promise<void>;
	saveHabitsSectionTitle: (title: string) => Promise<void>;
}

/** Sticky current-week habit/task tracker, plus an inline habit-list editor. Deliberately ignores `selectedDate` - only re-renders when `week` changes (the editor toggle is local state, handled outside the store). */
export function mountWeekTrackerView(
	container: HTMLElement,
	store: PlannerStore,
	habitSettings: HabitSettingsAccess,
): () => void {
	let editorOpen = false;

	render(store.getState());
	return store.subscribe((state, changed) => {
		if (!changed.has("week")) {
			return;
		}
		render(state);
	});

	function render(state: PlannerState): void {
		container.empty();

		const header = container.createEl("div", { cls: "dp-week-header" });
		header.createEl("h3", { text: "This week" });
		const editBtn = header.createEl("button", { cls: "dp-icon-btn dp-edit-habits-btn", text: "✎" });
		editBtn.setAttr("type", "button");
		editBtn.setAttr("aria-label", "Edit habits");
		editBtn.addEventListener("click", () => {
			editorOpen = !editorOpen;
			render(store.getState());
		});

		if (editorOpen) {
			renderHabitEditor(container);
		}

		if (!state.week) {
			container.createEl("div", { cls: "dp-empty", text: "Loading..." });
			return;
		}
		const week = state.week;

		const end = addDays(week.startOfWeek, 6);
		container.createEl("div", { cls: "dp-week-range", text: formatWeekRange(week.startOfWeek, end) });

		const percent = week.tasksTotal > 0 ? Math.round((week.tasksCompleted / week.tasksTotal) * 100) : 0;
		const progress = container.createEl("div", { cls: "dp-progress" });
		const track = progress.createEl("div", { cls: "dp-progress-track" });
		const fill = track.createEl("div", { cls: "dp-progress-fill" });
		fill.style.width = `${percent}%`;
		progress.createEl("div", {
			cls: "dp-progress-label",
			text: `${percent}% · ${week.tasksCompleted}/${week.tasksTotal} tasks`,
		});

		const tableWrap = container.createEl("div", { cls: "dp-week-table-wrap" });
		const table = tableWrap.createEl("div", { cls: "dp-week-table" });
		const head = table.createEl("div", { cls: "dp-week-row is-head" });
		head.createEl("div", { cls: "dp-week-habit-name", text: habitSettings.getHabitsSectionTitle() });
		for (let i = 0; i < 7; i++) {
			const day = addDays(week.startOfWeek, i);
			const cell = head.createEl("div", { cls: "dp-week-day-head" });
			cell.createEl("div", { text: WEEKDAY_LABELS[i] });
			cell.createEl("div", { cls: "dp-week-day-num", text: String(day.getDate()) });
		}

		const habitNames = Object.keys(week.habits);
		if (habitNames.length === 0) {
			container.createEl("div", { cls: "dp-empty", text: "No habits" });
			return;
		}

		for (const habitName of habitNames) {
			const row = table.createEl("div", { cls: "dp-week-row" });
			row.createEl("div", { cls: "dp-week-habit-name", text: habitName });
			const flags = week.habits[habitName];
			const color = habitColor(habitName);
			for (let i = 0; i < 7; i++) {
				const day = addDays(week.startOfWeek, i);
				const done = Boolean(flags[i]);
				const cell = row.createEl("button", { cls: "dp-week-check" + (done ? " is-done" : "") });
				cell.setAttr("type", "button");
				cell.setAttr("aria-pressed", String(done));
				cell.setAttr("aria-label", `${habitName} - ${WEEKDAY_LABELS[i]}`);
				cell.style.setProperty("--dp-habit-color", color);
				cell.addEventListener("click", () => void store.toggleHabit(day, habitName));
			}
		}
	}

	function renderHabitEditor(container: HTMLElement): void {
		const panel = container.createEl("div", { cls: "dp-habit-editor" });

		const titleRow = panel.createEl("div", { cls: "dp-inline-form" });
		titleRow.createEl("span", { cls: "dp-habit-editor-label", text: "Section title" });
		const titleInput = titleRow.createEl("input", { type: "text" });
		titleInput.value = habitSettings.getHabitsSectionTitle();
		titleInput.addClass("dp-flex-input");
		titleInput.addEventListener("change", () => {
			const value = titleInput.value.trim();
			void save(habitSettings.saveHabitsSectionTitle(value || habitSettings.getHabitsSectionTitle()));
		});

		for (const name of habitSettings.getHabits()) {
			const row = panel.createEl("div", { cls: "dp-inline-form" });
			const input = row.createEl("input", { type: "text" });
			input.value = name;
			input.addClass("dp-flex-input");
			input.addEventListener("change", () => {
				void save(habitSettings.saveHabits(renameHabit(habitSettings.getHabits(), name, input.value)));
			});
			const removeBtn = row.createEl("button", { text: "×" });
			removeBtn.setAttr("type", "button");
			removeBtn.setAttr("aria-label", `Remove habit "${name}"`);
			removeBtn.addEventListener("click", () => {
				const remaining = habitSettings.getHabits().filter((h) => h !== name);
				void save(habitSettings.saveHabits(remaining.length > 0 ? remaining : [...DEFAULT_HABITS]));
			});
		}

		const addRow = panel.createEl("div", { cls: "dp-inline-form" });
		const addInput = addRow.createEl("input", { type: "text", placeholder: "New habit" });
		addInput.addClass("dp-flex-input");
		const addBtn = addRow.createEl("button", { text: "Add" });
		addBtn.setAttr("type", "button");
		const submitAdd = () => {
			const key = normalizeHabitName(addInput.value);
			if (!key) {
				return;
			}
			const current = habitSettings.getHabits();
			if (current.includes(key)) {
				new Notice("That habit already exists.");
				return;
			}
			void save(habitSettings.saveHabits(normalizeHabitNames([...current, key])));
		};
		addBtn.addEventListener("click", submitAdd);
		addInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				submitAdd();
			}
		});
	}

	/** Persists a habit-list edit, then reloads day/week data (habit set changed) and re-renders. Adding/renaming/deleting a habit only ever touches settings - never an existing note file. */
	async function save(write: Promise<void>): Promise<void> {
		await write;
		await store.init();
		render(store.getState());
	}
}

function formatWeekRange(start: Date, end: Date): string {
	const startMonth = start.toLocaleDateString("en-GB", { month: "long" });
	const endMonth = end.toLocaleDateString("en-GB", { month: "long" });
	if (startMonth === endMonth && start.getFullYear() === end.getFullYear()) {
		return `${start.getDate()}-${end.getDate()} ${startMonth} ${start.getFullYear()}`;
	}
	return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}
