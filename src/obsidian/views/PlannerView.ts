import { ItemView, WorkspaceLeaf } from "obsidian";
import { DailyNoteRepository } from "../dailyNoteRepository";
import { PlannerStore } from "../store";
import { mountCalendarView } from "./calendarView";
import { DayPlanSettingsAccess, mountDayPlanView } from "./dayPlanView";
import { HabitSettingsAccess, mountWeekTrackerView } from "./weekTrackerView";

export const VIEW_TYPE_PLANNER = "daily-planner-view";

export interface LayoutSettingsAccess {
	/** null = never customized; the top zone stays naturally sized until the user first drags the handle. */
	getSplitTopHeight: () => number | null;
	saveSplitTopHeight: (px: number) => Promise<void>;
}

const MIN_ZONE_HEIGHT_PX = 120;

/** Docked workspace panel - Obsidian's own leaf/tab UI handles docking, dragging, and detaching. */
export class PlannerView extends ItemView {
	private store: PlannerStore;
	private unsubscribers: (() => void)[] = [];
	private topZoneHeight: number | null = null;
	private dragCleanup: (() => void) | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		dailyNotes: DailyNoteRepository,
		private habitSettings: HabitSettingsAccess,
		private layoutSettings: LayoutSettingsAccess,
		private dayPlanSettings: DayPlanSettingsAccess,
	) {
		super(leaf);
		this.icon = "calendar-with-checkmark";
		this.navigation = false;
		this.store = new PlannerStore(dailyNotes);
	}

	getViewType(): string {
		return VIEW_TYPE_PLANNER;
	}

	getDisplayText(): string {
		return "Daily Planner";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("daily-planner-view");
		this.contentEl.addClass("dp-modal-body");

		const topZone = this.contentEl.createEl("div", { cls: "dp-top-zone" });
		const calendarEl = topZone.createEl("div", { cls: "dp-calendar" });
		const dayPlanEl = topZone.createEl("div", { cls: "dp-day-plan" });

		const handle = this.contentEl.createEl("div", { cls: "dp-resize-handle" });
		handle.setAttr("role", "separator");
		handle.setAttr("aria-orientation", "horizontal");
		handle.setAttr("aria-label", "Resize panels");

		const weekEl = this.contentEl.createEl("div", { cls: "dp-week-tracker" });

		this.topZoneHeight = this.layoutSettings.getSplitTopHeight();
		this.applyTopZoneHeight(topZone);
		this.setupResize(handle, topZone);

		this.unsubscribers = [
			mountCalendarView(calendarEl, this.store),
			mountDayPlanView(dayPlanEl, this.store, this.dayPlanSettings),
			mountWeekTrackerView(weekEl, this.store, this.habitSettings),
		];

		await this.store.init();
	}

	async onClose(): Promise<void> {
		this.dragCleanup?.();
		this.dragCleanup = null;
		this.unsubscribers.forEach((unsubscribe) => unsubscribe());
		this.unsubscribers = [];
		this.contentEl.empty();
		await this.store.flushAll();
	}

	private applyTopZoneHeight(topZone: HTMLElement): void {
		if (this.topZoneHeight === null) {
			topZone.style.removeProperty("height");
			return;
		}
		topZone.style.height = `${this.topZoneHeight}px`;
	}

	/** Clamped against THIS panel's own container height, never the outer window - correct in both a narrow sidebar split and a wide popped-out window. */
	private clampTopZoneHeight(px: number, handle: HTMLElement): number {
		const containerHeight = this.contentEl.clientHeight;
		const maxTop = Math.max(MIN_ZONE_HEIGHT_PX, containerHeight - handle.clientHeight - MIN_ZONE_HEIGHT_PX);
		return Math.min(Math.max(px, MIN_ZONE_HEIGHT_PX), maxTop);
	}

	private setupResize(handle: HTMLElement, topZone: HTMLElement): void {
		const onMouseDown = (event: MouseEvent) => {
			if (event.button !== 0) {
				return;
			}
			event.preventDefault();
			const startY = event.clientY;
			const startHeight = topZone.getBoundingClientRect().height;
			handle.addClass("is-dragging");

			const onMouseMove = (moveEvent: MouseEvent) => {
				const delta = moveEvent.clientY - startY;
				this.topZoneHeight = this.clampTopZoneHeight(startHeight + delta, handle);
				this.applyTopZoneHeight(topZone);
			};
			const onMouseUp = () => {
				handle.removeClass("is-dragging");
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
				if (this.topZoneHeight !== null) {
					void this.layoutSettings.saveSplitTopHeight(this.topZoneHeight);
				}
			};
			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
		};
		handle.addEventListener("mousedown", onMouseDown);
		this.dragCleanup = () => handle.removeEventListener("mousedown", onMouseDown);
	}
}
