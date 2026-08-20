import { startOfDay } from "../core/dates";
import { ScheduleEntry, TaskItem, WeekSummary } from "../core/types";
import { DailyNoteRepository } from "./dailyNoteRepository";

export interface DayPlan {
	tasks: TaskItem[];
	schedule: ScheduleEntry[];
}

export interface PlannerState {
	selectedDate: Date;
	viewMonth: Date;
	/** iso date -> completion percent (0-100); a day absent from the map has no content. */
	activeDates: Map<string, number>;
	dayPlan: DayPlan | null;
	week: WeekSummary | null;
}

type StateKey = keyof PlannerState;
type Listener = (state: PlannerState, changed: Set<StateKey>) => void;

/**
 * Single source of truth for the planner modal. Zones subscribe and re-render
 * only on the state keys they care about (see e.g. weekTrackerView, which never
 * re-renders on `selectedDate` - only on `week`).
 */
export class PlannerStore {
	private state: PlannerState;
	private listeners = new Set<Listener>();

	private dayPlanGen = 0;
	private weekGen = 0;
	private activeDatesGen = 0;

	constructor(private repo: DailyNoteRepository, initialDate: Date = new Date()) {
		const selectedDate = startOfDay(initialDate);
		this.state = {
			selectedDate,
			viewMonth: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
			activeDates: new Map(),
			dayPlan: null,
			week: null,
		};
	}

	getState(): PlannerState {
		return this.state;
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async init(): Promise<void> {
		await Promise.all([this.reloadActiveDates(), this.reloadDayPlan(), this.reloadWeek()]);
	}

	async selectDate(date: Date): Promise<void> {
		this.setState({ selectedDate: startOfDay(date) });
		await this.reloadDayPlan();
	}

	async shiftMonth(delta: number): Promise<void> {
		const current = this.state.viewMonth;
		this.setState({ viewMonth: new Date(current.getFullYear(), current.getMonth() + delta, 1) });
		await this.reloadActiveDates();
	}

	async addTask(text: string): Promise<void> {
		await this.repo.addTask(this.state.selectedDate, text);
		await this.afterMutation();
	}

	async toggleTask(index: number): Promise<void> {
		await this.repo.toggleTask(this.state.selectedDate, index);
		await this.afterMutation();
	}

	/** Validation/Notice-on-invalid-input lives in the repository; this just reloads afterwards. */
	async addSchedule(time: string, title: string): Promise<void> {
		await this.repo.addScheduleEntry(this.state.selectedDate, time, title);
		await this.afterMutation();
	}

	async toggleHabit(date: Date, habitName: string): Promise<void> {
		await this.repo.toggleHabit(date, habitName);
		await this.afterMutation();
	}

	async flushAll(): Promise<void> {
		await this.repo.flushAll();
	}

	private setState(partial: Partial<PlannerState>): void {
		const changed = new Set<StateKey>();
		for (const key of Object.keys(partial) as StateKey[]) {
			if (!Object.is(this.state[key], partial[key])) {
				changed.add(key);
			}
		}
		if (changed.size === 0) {
			return;
		}
		this.state = { ...this.state, ...partial };
		for (const listener of this.listeners) {
			listener(this.state, changed);
		}
	}

	private async afterMutation(): Promise<void> {
		await Promise.all([this.reloadActiveDates(), this.reloadDayPlan(), this.reloadWeek()]);
	}

	private async reloadActiveDates(): Promise<void> {
		const gen = ++this.activeDatesGen;
		const activeDates = await this.repo.getMonthCompletion(
			this.state.viewMonth.getFullYear(),
			this.state.viewMonth.getMonth(),
		);
		if (gen !== this.activeDatesGen) {
			return;
		}
		this.setState({ activeDates });
	}

	private async reloadDayPlan(): Promise<void> {
		const date = this.state.selectedDate;
		const gen = ++this.dayPlanGen;
		const [tasks, schedule] = await Promise.all([this.repo.getTasks(date), this.repo.getSchedule(date)]);
		if (gen !== this.dayPlanGen) {
			return;
		}
		this.setState({ dayPlan: { tasks, schedule } });
	}

	private async reloadWeek(): Promise<void> {
		const gen = ++this.weekGen;
		const week = await this.repo.getWeekSummary(new Date());
		if (gen !== this.weekGen) {
			return;
		}
		this.setState({ week });
	}
}
