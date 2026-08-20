import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type DailyPlannerPlugin from "../../main";
import { DEFAULT_HABITS, DEFAULT_HABITS_SECTION_TITLE, DEFAULT_ROOT_FOLDER } from "../core/constants";
import { normalizeHabitName, normalizeHabitNames, renameHabit } from "../core/habits";
import { dailyFolderExcludePattern } from "../core/paths";

export type DayPlanLayout = "stacked" | "columns";

export interface DailyPlannerSettings {
	habits: string[];
	rootFolder: string;
	habitsSectionTitle: string;
	/** Height (px) of the calendar+day-plan zone in the planner view. null = not customized, size naturally. */
	splitTopHeight: number | null;
	/** Whether {rootFolder}/Daily should be added to Obsidian's global Excluded files list by this plugin. */
	hideDailyFolder: boolean;
	/** The exact pattern this plugin last successfully added to Excluded files, so a later rootFolder change (or a load-time re-sync) can find and swap out exactly that entry - never null while hideDailyFolder has ever been successfully applied. */
	lastAppliedExcludePattern: string | null;
	/** Tasks/Schedule arrangement in the day-plan zone: stacked (one above the other) or side-by-side columns. */
	dayPlanLayout: DayPlanLayout;
	showTasks: boolean;
	showSchedule: boolean;
}

export const DEFAULT_SETTINGS: DailyPlannerSettings = {
	habits: [...DEFAULT_HABITS],
	rootFolder: DEFAULT_ROOT_FOLDER,
	habitsSectionTitle: DEFAULT_HABITS_SECTION_TITLE,
	splitTopHeight: null,
	hideDailyFolder: false,
	lastAppliedExcludePattern: null,
	dayPlanLayout: "stacked",
	showTasks: true,
	showSchedule: true,
};

export class DailyPlannerSettingTab extends PluginSettingTab {
	plugin: DailyPlannerPlugin;

	constructor(app: App, plugin: DailyPlannerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private notifyIfExclusionSyncFailed(applied: boolean): void {
		if (applied) {
			return;
		}
		const pattern = dailyFolderExcludePattern(this.plugin.settings.rootFolder);
		new Notice(
			`Could not update Obsidian's excluded-files list automatically. ` +
				`Add "${pattern}" manually in Settings → Files and Links → Excluded files.`,
			8000,
		);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Daily Planner" });

		new Setting(containerEl)
			.setName("Root folder")
			.setDesc("Vault folder where daily notes are stored.")
			.addText((text) => {
				text.setValue(this.plugin.settings.rootFolder);
				text.onChange(async (value) => {
					const trimmed = value.trim();
					this.plugin.settings.rootFolder = trimmed || DEFAULT_ROOT_FOLDER;
					this.notifyIfExclusionSyncFailed(await this.plugin.syncDailyFolderExclusion());
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Habits section title")
			.setDesc("Heading for the habits section in each daily note, for example \"Habits\" or \"Workouts\".")
			.addText((text) => {
				text.setValue(this.plugin.settings.habitsSectionTitle);
				text.onChange(async (value) => {
					const trimmed = value.trim();
					this.plugin.settings.habitsSectionTitle = trimmed || DEFAULT_HABITS_SECTION_TITLE;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Day plan layout")
			.setDesc("Arrange Tasks and Schedule stacked (one above the other) or side by side. Can also be switched from the day-plan zone itself.")
			.addDropdown((dropdown) => {
				dropdown.addOption("stacked", "Stacked");
				dropdown.addOption("columns", "Side by side");
				dropdown.setValue(this.plugin.settings.dayPlanLayout);
				dropdown.onChange(async (value) => {
					this.plugin.settings.dayPlanLayout = value as DayPlanLayout;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Hide daily notes from the file explorer")
			.setDesc(
				"Adds the daily-notes folder to Obsidian's excluded-files list " +
					"(Settings → Files and Links → Excluded files). The files stay in the vault and " +
					"remain available through the Daily Planner panel - only explorer and search " +
					"visibility changes. This is a global Obsidian setting, not plugin-only; " +
					"you can do the same by adding that path to the list yourself.",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.hideDailyFolder);
				toggle.onChange(async (value) => {
					this.plugin.settings.hideDailyFolder = value;
					this.notifyIfExclusionSyncFailed(await this.plugin.syncDailyFolderExclusion());
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl("p", {
			text: "Habits are stored as a checklist in each daily note and shown in the week tracker. You can edit them here or from the tracker.",
		});

		this.plugin.settings.habits.forEach((name, index) => {
			new Setting(containerEl)
				.addText((text) => {
					text.setValue(name);
					text.onChange(async (value) => {
						this.plugin.settings.habits = renameHabit(this.plugin.settings.habits, name, value);
						await this.plugin.saveSettings();
					});
				})
				.addButton((btn) => {
					btn.setButtonText("Remove")
						.setWarning()
						.onClick(async () => {
							this.plugin.settings.habits.splice(index, 1);
							if (this.plugin.settings.habits.length === 0) {
								this.plugin.settings.habits = [...DEFAULT_HABITS];
							}
							await this.plugin.saveSettings();
							this.display();
						});
				});
		});

		let newHabit = "";
		new Setting(containerEl)
			.setName("New habit")
			.addText((text) => {
				text.setPlaceholder("e.g. reading");
				text.onChange((value) => {
					newHabit = value;
				});
			})
			.addButton((btn) => {
				btn.setButtonText("Add")
					.setCta()
					.onClick(async () => {
						const key = normalizeHabitName(newHabit);
						if (!key || this.plugin.settings.habits.includes(key)) {
							return;
						}
						this.plugin.settings.habits = normalizeHabitNames([...this.plugin.settings.habits, key]);
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}
}
