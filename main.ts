import { Notice, Plugin } from "obsidian";
import { DailyNoteManager } from "./models/dailyNoteModel";
import { SummaryManager } from "./models/summaryManager";
import { TableChart } from "./utils/stacked-bar-chart";

export default class DailyPlannerPlugin extends Plugin {
	private dailyNotes: DailyNoteManager;
	private summaryManager: SummaryManager;
	private chart: TableChart;

	async onload() {
		console.log("loading plugin 🚀");

		this.dailyNotes = new DailyNoteManager(this.app);
		this.summaryManager = new SummaryManager(this.app, this.dailyNotes);
		this.chart = new TableChart();

		this.registerMarkdownCodeBlockProcessor("stacked-bar-chart", (source, el) => {
			this.chart.renderChart(source, el);
		});

		this.addCommand({
			id: "add-task",
			name: "Add Task",
			callback: async () => {
				const today = new Date();
				await this.dailyNotes.getOrCreateDailyNote(today);
				const tasks = await this.dailyNotes.getTasks(today);
				new Notice(`Today tasks: ${tasks.length > 0 ? tasks.map((t) => t.text).join(", ") : "no tasks"}`);
			},
		});

		// Weekly markdown tables are gone — habits live in each daily note.
		// Keep the command id so existing hotkeys still work; it now refreshes Summary.md.
		this.addCommand({
			id: "track health",
			name: "Create Weekly Health Tracker",
			callback: async () => {
				const today = new Date();
				const week = await this.dailyNotes.getWeekSummary(today);
				await this.summaryManager.generateWeeklySummary(today);
				new Notice(
					`Week: ${week.tasksCompleted}/${week.tasksTotal} tasks, ${Object.keys(week.habits).length} habits. Summary.md updated.`,
				);
			},
		});

		this.addCommand({
			id: "migrate-legacy-daily-planner",
			name: "Migrate legacy Daily Planner notes",
			callback: async () => {
				await this.dailyNotes.migrateLegacyData();
			},
		});

		this.addRibbonIcon("calendar-with-checkmark", "Daily Planner", async () => {
			const today = new Date();
			const file = await this.dailyNotes.getOrCreateDailyNote(today);
			const tasks = await this.dailyNotes.getTasks(today);
			new Notice(`${file.basename}: ${tasks.length} tasks`);
		});
	}

	async onunload() {
		console.log("unloading plugin ⛔");
	}
}
