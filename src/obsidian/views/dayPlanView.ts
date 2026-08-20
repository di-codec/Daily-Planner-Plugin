import { Notice } from "obsidian";
import { formatDayHeading } from "../../core/dates";
import { ScheduleEntry, TaskItem } from "../../core/types";
import { PlannerState, PlannerStore } from "../store";
import { DayPlanLayout } from "../settings";

export interface DayPlanSettingsAccess {
	getLayout: () => DayPlanLayout;
	saveLayout: (layout: DayPlanLayout) => Promise<void>;
	getShowTasks: () => boolean;
	saveShowTasks: (visible: boolean) => Promise<void>;
	getShowSchedule: () => boolean;
	saveShowSchedule: (visible: boolean) => Promise<void>;
}

type FocusTarget = "task" | "schedule-title" | null;

/** Selected day's task checklist + schedule, each with an inline add form. Re-renders when the day plan changes, or immediately when the local layout/visibility controls are used. */
export function mountDayPlanView(
	container: HTMLElement,
	store: PlannerStore,
	settings: DayPlanSettingsAccess,
): () => void {
	// Every render fully rebuilds the DOM (including the "add" inputs), so a plain
	// re-render after adding a task/event would drop focus back to nothing and the
	// user would have to click the input again to add the next one. Recording which
	// input just submitted here lets the next render refocus the fresh element.
	let focusTarget: FocusTarget = null;

	render(store.getState());
	return store.subscribe((state, changed) => {
		if (!changed.has("selectedDate") && !changed.has("dayPlan")) {
			return;
		}
		render(state);
	});

	function render(state: PlannerState): void {
		container.empty();
		container.createEl("h3", { text: formatDayHeading(state.selectedDate) });
		renderControls(container);

		if (!state.dayPlan) {
			container.createEl("div", { cls: "dp-empty", text: "Loading..." });
			return;
		}

		const showTasks = settings.getShowTasks();
		const showSchedule = settings.getShowSchedule();
		if (!showTasks && !showSchedule) {
			container.createEl("div", { cls: "dp-empty", text: "Nothing shown - use the toggles above to bring Tasks or Schedule back." });
			return;
		}

		const blocks = container.createEl("div", { cls: "dp-day-plan-blocks" });
		if (settings.getLayout() === "columns") {
			blocks.addClass("is-columns");
		}

		let taskInput: HTMLInputElement | null = null;
		let scheduleTitleInput: HTMLInputElement | null = null;
		if (showTasks) {
			taskInput = renderTaskBlock(blocks, state.dayPlan.tasks);
		}
		if (showSchedule) {
			scheduleTitleInput = renderScheduleBlock(blocks, state.dayPlan.schedule);
		}

		const pendingFocus = focusTarget;
		focusTarget = null;
		const toFocus = pendingFocus === "task" ? taskInput : pendingFocus === "schedule-title" ? scheduleTitleInput : null;
		// A 0ms delay, not a synchronous call: keeps this robust even if the browser
		// hasn't finished laying out the freshly-inserted node in the same tick.
		if (toFocus) {
			window.setTimeout(() => toFocus.focus(), 0);
		}
	}

	function renderControls(container: HTMLElement): void {
		const controls = container.createEl("div", { cls: "dp-day-plan-controls" });

		const tasksBtn = controls.createEl("button", { cls: "dp-toggle-btn", text: "Tasks" });
		tasksBtn.setAttr("type", "button");
		tasksBtn.setAttr("aria-pressed", String(settings.getShowTasks()));
		if (!settings.getShowTasks()) {
			tasksBtn.addClass("is-off");
		}
		tasksBtn.addEventListener("click", () => {
			void applyAndRerender(settings.saveShowTasks(!settings.getShowTasks()));
		});

		const scheduleBtn = controls.createEl("button", { cls: "dp-toggle-btn", text: "Schedule" });
		scheduleBtn.setAttr("type", "button");
		scheduleBtn.setAttr("aria-pressed", String(settings.getShowSchedule()));
		if (!settings.getShowSchedule()) {
			scheduleBtn.addClass("is-off");
		}
		scheduleBtn.addEventListener("click", () => {
			void applyAndRerender(settings.saveShowSchedule(!settings.getShowSchedule()));
		});

		const layoutBtn = controls.createEl("button", { cls: "dp-toggle-btn dp-layout-btn" });
		layoutBtn.setAttr("type", "button");
		const layout = settings.getLayout();
		layoutBtn.setText(layout === "stacked" ? "Stacked" : "Columns");
		layoutBtn.setAttr("aria-label", "Switch Tasks/Schedule layout");
		layoutBtn.addEventListener("click", () => {
			const next: DayPlanLayout = settings.getLayout() === "stacked" ? "columns" : "stacked";
			void applyAndRerender(settings.saveLayout(next));
		});
	}

	async function applyAndRerender(write: Promise<void>): Promise<void> {
		await write;
		render(store.getState());
	}

	function renderTaskBlock(container: HTMLElement, tasks: TaskItem[]): HTMLInputElement {
		const block = container.createEl("div", { cls: "dp-block" });
		block.createEl("h4", { text: "Tasks" });

		const list = block.createEl("div", { cls: "dp-task-list" });
		if (tasks.length === 0) {
			list.createEl("div", { cls: "dp-empty", text: "No tasks" });
		}
		tasks.forEach((task, index) => {
			const row = list.createEl("label", { cls: "dp-check-row" });
			const checkbox = row.createEl("input", { type: "checkbox" });
			checkbox.checked = task.completed;
			checkbox.addEventListener("change", () => {
				void store.toggleTask(index);
			});
			row.createEl("span", { text: task.text || "(untitled)" });
		});

		const form = block.createEl("div", { cls: "dp-inline-form" });
		const input = form.createEl("input", { type: "text", placeholder: "New task" });
		input.addClass("dp-flex-input");
		const addBtn = form.createEl("button", { text: "Add" });
		addBtn.setAttr("type", "button");
		const submit = () => {
			const text = input.value.trim();
			if (!text) {
				return;
			}
			focusTarget = "task";
			void store.addTask(text);
		};
		addBtn.addEventListener("click", submit);
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				submit();
			}
		});
		return input;
	}

	function renderScheduleBlock(container: HTMLElement, schedule: ScheduleEntry[]): HTMLInputElement {
		const block = container.createEl("div", { cls: "dp-block" });
		block.createEl("h4", { text: "Schedule" });

		const list = block.createEl("div", { cls: "dp-schedule-list" });
		if (schedule.length === 0) {
			list.createEl("div", { cls: "dp-empty", text: "No events" });
		}
		for (const entry of schedule) {
			list.createEl("div", { cls: "dp-schedule-row", text: `${entry.time} - ${entry.title}` });
		}

		const form = block.createEl("div", { cls: "dp-inline-form" });
		const timeInput = form.createEl("input", { type: "time" });
		timeInput.addClass("dp-time-input");
		const titleInput = form.createEl("input", { type: "text", placeholder: "Event" });
		titleInput.addClass("dp-flex-input");
		const addBtn = form.createEl("button", { text: "Add" });
		addBtn.setAttr("type", "button");
		const submit = () => {
			const time = timeInput.value.trim();
			const title = titleInput.value.trim();
			if (!time || !title) {
				new Notice("Enter a time and an event title.");
				return;
			}
			focusTarget = "schedule-title";
			void store.addSchedule(time, title);
		};
		addBtn.addEventListener("click", submit);
		titleInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				submit();
			}
		});
		return titleInput;
	}
}
