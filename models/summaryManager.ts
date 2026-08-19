import { App, normalizePath } from "obsidian";
import { HABIT_COLORS, SUMMARY_PATH, WEEKDAY_LABELS_EN } from "../constants";
import { ensureFoldersExist } from "../utils/utils";
import { DailyNoteManager, WeekSummary } from "./dailyNoteModel";
import { addDays } from "../utils/dates";

export class SummaryManager {
	constructor(private app: App, private dailyNotes: DailyNoteManager) {}

	async generateWeeklySummary(date: Date, summaryPath: string = SUMMARY_PATH): Promise<void> {
		try {
			const week = await this.dailyNotes.getWeekSummary(date);
			const chartYaml = this.generateChartYaml(week);
			await ensureFoldersExist(this.app, summaryPath);

			const tasksPercent = week.tasksTotal > 0
				? Math.round((week.tasksCompleted / week.tasksTotal) * 100)
				: 0;
			const progressBlocks = Math.round(tasksPercent / 10);
			const progressBar = "█".repeat(progressBlocks) + "░".repeat(10 - progressBlocks);
			const weekRange = this.formatWeekRange(week);

			const summaryContent = `### 🏋️ Health Tracker Summary (📅 ${weekRange})

${chartYaml}

---

### ✅ Task Summary (📅 ${weekRange})
Progress:
${progressBar} **${tasksPercent}%**

📋 **Total Tasks:**  ${week.tasksTotal}
✔ **Completed:**  ${week.tasksCompleted}
⏳ **Remaining:**  ${week.tasksTotal - week.tasksCompleted}
📊 **Average per day:**  ${(week.tasksCompleted / 7).toFixed(1)} tasks`;

			await this.app.vault.adapter.write(normalizePath(summaryPath), summaryContent);
			console.log(`Summary generated at: ${summaryPath}`);
		} catch (error) {
			console.error("Error generating summary:", error);
		}
	}

	private generateChartYaml(week: WeekSummary): string {
		const yamlLines: string[] = [];
		yamlLines.push("labels:");
		WEEKDAY_LABELS_EN.forEach((day) => yamlLines.push(`  - ${day}`));
		yamlLines.push("datasets:");

		for (const [habit, values] of Object.entries(week.habits)) {
			const color = HABIT_COLORS[habit] ?? hashColor(habit);
			yamlLines.push(`  - label: ${habit}`);
			yamlLines.push(`    data: [${values.map((done) => (done ? 1 : 0)).join(", ")}]`);
			yamlLines.push(`    backgroundColor: "${color}"`);
		}

		return `
\`\`\`stacked-bar-chart
${yamlLines.join("\n")}
\`\`\`
		`.trim();
	}

	private formatWeekRange(week: WeekSummary): string {
		const start = week.startOfWeek;
		const end = addDays(start, 6);
		const startMonth = start.toLocaleDateString("en-GB", { month: "long" });
		const endMonth = end.toLocaleDateString("en-GB", { month: "long" });
		return startMonth === endMonth
			? `${start.getDate()} - ${end.getDate()} ${startMonth}`
			: `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
	}
}

function hashColor(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
		hash = hash & hash;
	}
	const color = (hash & 0x00ffffff).toString(16).toUpperCase();
	return "#" + "000000".substring(0, 6 - color.length) + color;
}
