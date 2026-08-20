import { WEEKDAY_LABELS } from "../../core/constants";
import { formatMonthTitle, isSameDay, startOfDay, toISODate } from "../../core/dates";
import { PlannerState, PlannerStore } from "../store";

/** Month grid: navigation, day selection, a dot on days that have note content. Mounts once, re-renders in place. */
export function mountCalendarView(container: HTMLElement, store: PlannerStore): () => void {
	render(store.getState());
	return store.subscribe((state, changed) => {
		if (!changed.has("viewMonth") && !changed.has("selectedDate") && !changed.has("activeDates")) {
			return;
		}
		render(state);
	});

	function render(state: PlannerState): void {
		container.empty();

		const header = container.createEl("div", { cls: "dp-calendar-header" });
		const prev = header.createEl("button", { cls: "dp-icon-btn", text: "‹" });
		prev.setAttr("type", "button");
		prev.setAttr("aria-label", "Previous month");
		prev.addEventListener("click", () => void store.shiftMonth(-1));

		header.createEl("div", { cls: "dp-calendar-title", text: formatMonthTitle(state.viewMonth) });

		const next = header.createEl("button", { cls: "dp-icon-btn", text: "›" });
		next.setAttr("type", "button");
		next.setAttr("aria-label", "Next month");
		next.addEventListener("click", () => void store.shiftMonth(1));

		const grid = container.createEl("div", { cls: "dp-calendar-grid" });
		for (const label of WEEKDAY_LABELS) {
			grid.createEl("div", { cls: "dp-weekday", text: label });
		}

		const year = state.viewMonth.getFullYear();
		const month = state.viewMonth.getMonth();
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
			const isSelected = isSameDay(date, state.selectedDate);
			if (isSelected) {
				cell.addClass("is-selected");
			}
			const percent = state.activeDates.get(iso);
			if (percent !== undefined) {
				cell.addClass("has-note");
				cell.createEl("span", { cls: "dp-day-dot" });
				// Selected days keep their solid accent fill; the heatmap tint would fight it.
				if (!isSelected && percent > 0) {
					cell.style.backgroundColor = `color-mix(in srgb, var(--interactive-accent) ${percent}%, transparent)`;
				}
			}
			cell.addEventListener("click", () => void store.selectDate(date));
		}
	}
}
