import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_HABITS, DEFAULT_HABITS_SECTION_TITLE, DEFAULT_ROOT_FOLDER } from "./src/core/constants";
import { normalizeHabitNames } from "./src/core/habits";
import { dailyFolderExcludePattern } from "./src/core/paths";
import { addExcludePattern, removeExcludePattern, replaceExcludePattern } from "./src/obsidian/excludedFiles";
import { DailyNoteRepository } from "./src/obsidian/dailyNoteRepository";
import { DailyPlannerSettingTab, DEFAULT_SETTINGS, DailyPlannerSettings } from "./src/obsidian/settings";
import { TableChart } from "./src/obsidian/stackedBarChart";
import { LayoutSettingsAccess, PlannerView, VIEW_TYPE_PLANNER } from "./src/obsidian/views/PlannerView";
import { TextPromptModal } from "./src/obsidian/views/TextPromptModal";
import { HabitSettingsAccess } from "./src/obsidian/views/weekTrackerView";

const WIDE_LAYOUT_BREAKPOINT_PX = 900;

export default class DailyPlannerPlugin extends Plugin {
	settings!: DailyPlannerSettings;
	private dailyNotes!: DailyNoteRepository;
	private chart!: TableChart;
	private habitSettings!: HabitSettingsAccess;
	private layoutSettings!: LayoutSettingsAccess;

	async onload() {
		await this.loadSettings();
		this.dailyNotes = new DailyNoteRepository(
			this.app,
			() => this.settings.habits,
			() => this.settings.rootFolder,
			() => this.settings.habitsSectionTitle,
		);
		this.habitSettings = {
			getHabits: () => this.settings.habits,
			getHabitsSectionTitle: () => this.settings.habitsSectionTitle,
			saveHabits: async (habits) => {
				this.settings.habits = habits;
				await this.saveSettings();
			},
			saveHabitsSectionTitle: async (title) => {
				this.settings.habitsSectionTitle = title;
				await this.saveSettings();
			},
		};
		this.layoutSettings = {
			getSplitTopHeight: () => this.settings.splitTopHeight,
			saveSplitTopHeight: async (px) => {
				this.settings.splitTopHeight = px;
				await this.saveSettings();
			},
		};
		await this.syncDailyFolderExclusion();
		await this.saveSettings();
		this.chart = new TableChart();
		this.addSettingTab(new DailyPlannerSettingTab(this.app, this));

		this.registerView(
			VIEW_TYPE_PLANNER,
			(leaf) => new PlannerView(leaf, this.dailyNotes, this.habitSettings, this.layoutSettings),
		);

		this.registerMarkdownCodeBlockProcessor("stacked-bar-chart", (source, el) => {
			this.chart.renderChart(source, el);
		});

		this.addCommand({
			id: "add-task",
			name: "Add task for today",
			callback: () => {
				new TextPromptModal(this.app, "Add Task", "Task text", async (text) => {
					await this.dailyNotes.addTask(new Date(), text);
					new Notice(`Task added: ${text}`);
				}).open();
			},
		});

		this.addCommand({
			id: "migrate-legacy-daily-planner",
			name: "Migrate legacy Daily Planner notes",
			callback: async () => {
				await this.dailyNotes.migrateLegacyData();
			},
		});

		this.addCommand({
			id: "open-daily-planner-popout",
			name: "Open Daily Planner in a new window",
			callback: () => this.openPlannerPopout(),
		});

		this.addRibbonIcon("calendar-with-checkmark", "Daily Planner", () => {
			void this.activatePlannerView();
		});
	}

	async onunload() {
		await this.dailyNotes.flushAll();
	}

	/** Reuses an already-open planner leaf if there is one; otherwise opens a new split (right if wide, bottom if narrow). */
	private async activatePlannerView(): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_PLANNER);
		if (existing.length > 0) {
			await workspace.revealLeaf(existing[0]);
			return;
		}

		const isWide = workspace.containerEl.clientWidth > WIDE_LAYOUT_BREAKPOINT_PX;
		const leaf: WorkspaceLeaf = workspace.getLeaf("split", isWide ? "vertical" : "horizontal");
		await leaf.setViewState({ type: VIEW_TYPE_PLANNER, active: true });
		await workspace.revealLeaf(leaf);
	}

	/**
	 * Moves the planner into its own OS-level window (desktop only), or opens a
	 * fresh one there if it isn't open anywhere yet. This is the same native
	 * "move to new window" mechanic every Obsidian tab supports (also reachable
	 * by right-clicking the tab, or dragging it out of the main window) - this
	 * command just makes it a one-click action instead of something to discover.
	 */
	private openPlannerPopout(): void {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_PLANNER);
		if (leaves.length > 0) {
			workspace.moveLeafToPopout(leaves[0]);
			return;
		}
		const leaf = workspace.openPopoutLeaf();
		void leaf.setViewState({ type: VIEW_TYPE_PLANNER, active: true });
	}

	/**
	 * Reconciles Obsidian's global Excluded files list against `hideDailyFolder`.
	 * Called on every load (so a pattern manually removed from Excluded files, or
	 * a reinstall with `data.json` intact, self-heals) and whenever the toggle or
	 * root folder changes from the settings tab. Tracking `lastAppliedExcludePattern`
	 * (rather than always deriving it fresh from the current root folder) is what
	 * lets this also clean up a *stale* entry from a previous root folder name -
	 * without it, a rootFolder change that bypassed this method (e.g. a hand-edited
	 * data.json) would leave an orphaned pattern in the list forever, since nothing
	 * would know an old value ever existed to remove.
	 *
	 * Returns false only when the underlying (undocumented) Obsidian API isn't
	 * available and something was supposed to change - callers show a Notice.
	 */
	async syncDailyFolderExclusion(): Promise<boolean> {
		const previousPattern = this.settings.lastAppliedExcludePattern;

		if (!this.settings.hideDailyFolder) {
			if (!previousPattern) {
				return true;
			}
			const removed = removeExcludePattern(this.app, previousPattern);
			if (removed) {
				this.settings.lastAppliedExcludePattern = null;
			}
			return removed;
		}

		const currentPattern = dailyFolderExcludePattern(this.settings.rootFolder);
		const applied =
			previousPattern && previousPattern !== currentPattern
				? replaceExcludePattern(this.app, previousPattern, currentPattern)
				: addExcludePattern(this.app, currentPattern);
		if (applied) {
			this.settings.lastAppliedExcludePattern = currentPattern;
		}
		return applied;
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<DailyPlannerSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
		this.settings.habits = normalizeHabitNames(this.settings.habits);
		if (this.settings.habits.length === 0) {
			this.settings.habits = [...DEFAULT_HABITS];
		}
		this.settings.rootFolder = this.settings.rootFolder.trim() || DEFAULT_ROOT_FOLDER;
		this.settings.habitsSectionTitle = this.settings.habitsSectionTitle.trim() || DEFAULT_HABITS_SECTION_TITLE;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
