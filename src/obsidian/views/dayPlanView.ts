import { Notice } from "obsidian";
import { formatDayHeading } from "../../core/dates";
import { ScheduleEntry, TaskItem } from "../../core/types";
import { PlannerState, PlannerStore } from "../store";

/** Selected day's task checklist + schedule, each with an inline add form. Re-renders only when the day plan changes. */
export function mountDayPlanView(container: HTMLElement, store: PlannerStore): () => void {
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

		if (!state.dayPlan) {
			container.createEl("div", { cls: "dp-empty", text: "Loading..." });
			return;
		}

		renderTaskBlock(container, store, state.dayPlan.tasks);
		renderScheduleBlock(container, store, state.dayPlan.schedule);
	}
}

function renderTaskBlock(container: HTMLElement, store: PlannerStore, tasks: TaskItem[]): void {
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
		void store.addTask(text);
		input.value = "";
	};
	addBtn.addEventListener("click", submit);
	input.addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			submit();
		}
	});
}

function renderScheduleBlock(container: HTMLElement, store: PlannerStore, schedule: ScheduleEntry[]): void {
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
		void store.addSchedule(time, title);
		titleInput.value = "";
	};
	addBtn.addEventListener("click", submit);
	titleInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			submit();
		}
	});
}
