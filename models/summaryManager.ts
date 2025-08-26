import { App, TFile, normalizePath } from "obsidian";
import { ensureFoldersExist } from "../utils/utils";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_MUSCLE_GROUPS = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
const MUSCLE_COLORS = {
    "Glutes": "#FF69B4",    // Pink
    "Legs": "#4169E1",      // Blue
    "Back": "#FFD700",      // Yellow
    "Brists": "#20B2AA",    // Teal
    "Shoulders": "#9370DB", // Purple
    "Jogging": "#FFA500",   // Orange
    "Yoga": "#808080"       // Grey
};

export class SummaryManager {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Main method for generating the summary
     */
    async generateWeeklySummary(stats: { totalTasks: number, totalUnfinishedTasks: number, totalFinishedTasks: number }, date: Date, summaryPath: string = "Daily Planner/Summary.md"): Promise<void> {
        try {
            const habitData = await this.readWeekFile(date);
            const chartYaml = this.generateChartYaml(habitData);

            await ensureFoldersExist(this.app, summaryPath);

            const { totalTasks, totalUnfinishedTasks, totalFinishedTasks } = stats;
            const tasksPercent = totalTasks > 0 ? Math.round((totalFinishedTasks / totalTasks) * 100) : 0;
            const progressBlocks = Math.round(tasksPercent / 10);
            const progressBar = "█".repeat(progressBlocks) + "░".repeat(10 - progressBlocks);

            // Get week date range for the Health header
            const HstartOfWeek = this.getStartOfWeek(date);
            const HendOfWeek = new Date(HstartOfWeek);
            HendOfWeek.setDate(HstartOfWeek.getDate() + 1);

            const HstartDate = HstartOfWeek.getDate();
            const HendDate = HendOfWeek.getDate();
            const HstartMonth = HstartOfWeek.toLocaleDateString("en-GB", { month: "long" });
            const HendMonth = HendOfWeek.toLocaleDateString("en-GB", { month: "long" });

            const HweekRange = HstartMonth === HendMonth
                ? `${HstartDate} - ${HendDate} ${HstartMonth}`
                : `${HstartDate} ${HstartMonth} - ${HendDate} ${HendMonth}`;

            // Get week date range for the Task header
            const startOfWeek = this.getStartOfWeekSelfDev(date);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const startDate = startOfWeek.getDate();
            const endDate = endOfWeek.getDate();
            const startMonth = startOfWeek.toLocaleDateString("en-GB", { month: "long" });
            const endMonth = endOfWeek.toLocaleDateString("en-GB", { month: "long" });

            const weekRange = startMonth === endMonth
                ? `${startDate} - ${endDate} ${startMonth}`
                : `${startDate} ${startMonth} - ${endDate} ${endMonth}`;

            const summaryContent = `### 🏋️ Health Tracker Summary (📅 ${HweekRange})

${chartYaml}

---

### ✅ Task Summary (📅 ${weekRange})
Progress:
${progressBar} **${tasksPercent}%**

📋 **Total Tasks:**  ${totalTasks}
✔ **Completed:**  ${totalFinishedTasks}
⏳ **Remaining:**  ${totalUnfinishedTasks}
📊 **Average per day:**  ${(totalFinishedTasks / 7).toFixed(1)} tasks`;

            await this.app.vault.adapter.write(normalizePath(summaryPath), summaryContent);
            console.log(`Summary generated at: ${summaryPath}`);
        } catch (error) {
            console.error("Error generating summary:", error);
        }
    }

    /**
     * Read SelfDev data from a specific day's file
     */
    public async readDailyTasksFile(date: Date): Promise<{
        tasks: string[];
        content: string;
        totalUnfinishedTasks: number;
        totalFinishedTasks: number;
        totalTasks: number;
    }> {
        const yearName = this.getFileNameByYear(date);
        const startOfWeek = this.getStartOfWeekSelfDev(date);
        const allUnfinishedTasks: string[] = [];
        let allContent = "";
        let totalUnfinishedTasks = 0;
        let totalFinishedTasks = 0;
        let totalTasks = 0;

        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            const startDay = current.getDate();
            const startMonth = current.toLocaleDateString("en-GB", { month: "long" });

            const filePath = `Daily Planner/Self Development/${yearName}/📅 ${startMonth}/📅 ${startDay} ${startMonth}.md`;
            const file = this.app.vault.getAbstractFileByPath(filePath);

            if (!(file instanceof TFile)) {
                console.warn(`Task file not found: ${filePath}`);
                continue;
            }

            try {
                const content = await this.app.vault.read(file);
                const unfinishedTasks = content
                    .split('\n')
                    .filter(line => line.trim().startsWith('- [') && !line.trim().startsWith('- [x]'))
                    .map(line => line.trim());
                totalUnfinishedTasks += unfinishedTasks.length;

                const finishedTasks = content
                    .split('\n')
                    .filter(line => line.trim().startsWith('- [x]'))
                    .map(line => line.trim());
                totalFinishedTasks += finishedTasks.length;

                allUnfinishedTasks.push(...unfinishedTasks);
                allContent += content + "\n";
            } catch (e) {
                console.error(`Error reading file ${filePath}: ${e.message}`);
                continue;
            }
        }
        totalTasks = totalFinishedTasks + totalUnfinishedTasks;
        return {
            tasks: allUnfinishedTasks,
            content: allContent.trim(),
            totalUnfinishedTasks,
            totalFinishedTasks,
            totalTasks
        };
    }

    /**
     * Read Health Tracker data from a specific week file
     */
    private async readWeekFile(date: Date): Promise<{ [muscleGroup: string]: number[] }> {
        const muscleGroups = await this.getMuscleGroupsFromHealthTracker(date); // Dynamic list
        const habitData: { [muscleGroup: string]: number[] } = {};
        muscleGroups.forEach(group => {
            habitData[group] = new Array(7).fill(0);
        });

        const monthName = this.getFileNameByMonth(date);
        const weekName = this.getFileNameByWeek(date);

        const filePath = `Daily Planner/Health Tracker/${monthName}/${weekName}`;
        const file = this.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) {
            console.warn(`Week file not found: ${filePath}`);
            return habitData;
        }

        try {
            const content = await this.app.vault.read(file);
            const weekHabitData = this.parseMarkdownTable(content, muscleGroups);

            for (const muscleGroup of muscleGroups) {
                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                    habitData[muscleGroup][dayIndex] = weekHabitData[muscleGroup]?.[dayIndex] || 0;
                }
            }
        } catch (e) {
            console.error(`Error reading week file: ${filePath}`, e);
        }

        return habitData;
    }

    /**
     * Parsing a markdown table with dynamic muscle groups
     */
    private parseMarkdownTable(content: string, muscleGroups: string[]): { [muscleGroup: string]: number[] } {
        const lines = content.split("\n");
        const habitData: { [muscleGroup: string]: number[] } = {};
        muscleGroups.forEach(group => (habitData[group] = new Array(7).fill(0)));

        let inTable = false;
        for (const line of lines) {
            if (!line.trim() || line.includes("Weekdays") || line.includes("---") || line.includes("Daily Habits Track")) {
                if (line.includes("Weekdays")) inTable = true;
                continue;
            }

            if (inTable && line.includes("|")) {
                const columns = line.split("|");
                if (columns.length < 9) continue;

                const muscleGroup = columns[1].trim();
                if (!muscleGroups.includes(muscleGroup)) continue;

                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                    const cellIndex = dayIndex + 2;
                    if (cellIndex < columns.length) {
                        const cell = columns[cellIndex].trim();
                        if (cell.includes("☑️") || cell.includes("unchecked")) {
                            habitData[muscleGroup][dayIndex] = 0;
                        } else {
                            habitData[muscleGroup][dayIndex]++;
                        }
                    }
                }
            }
        }
        return habitData;
    }

    /**
     * Assembly of YAML data for the stacked-bar-chart block
     */
    private generateChartYaml(habitData: { [muscleGroup: string]: number[] }): string {
        const muscleGroups = Object.keys(habitData); // Dynamic list from data
        const datasets = muscleGroups.map(muscleGroup => ({
            label: muscleGroup,
            data: habitData[muscleGroup] || new Array(7).fill(0),
            backgroundColor: MUSCLE_COLORS[muscleGroup as keyof typeof MUSCLE_COLORS] || "#808080" // Fallback color
        }));

        const yamlLines: string[] = [];
        yamlLines.push("labels:");
        WEEKDAYS.forEach(day => yamlLines.push(`  - ${day}`));
        yamlLines.push("datasets:");
        datasets.forEach(ds => {
            yamlLines.push(`  - label: ${ds.label}`);
            yamlLines.push(`    data: [${ds.data.join(", ")}]`);
            yamlLines.push(`    backgroundColor: "${ds.backgroundColor}"`);
        });

        return `
\`\`\`stacked-bar-chart
${yamlLines.join("\n")}
\`\`\`
        `.trim();
    }

    /**
     * Helper methods: month name and week name
     */
    private getFileNameByMonth(date: Date): string {
        const monthData = date.toLocaleDateString("en-GB", { month: "long" });
        return `📅 ${monthData}`;
    }

    private getFileNameByWeek(date: Date): string {
        const startOfWeek = this.getStartOfWeek(date);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startDate = startOfWeek.getDate();
        const endDate = endOfWeek.getDate();
        const startMonth = startOfWeek.toLocaleDateString("en-GB", { month: "short" });
        const endMonth = endOfWeek.toLocaleDateString("en-GB", { month: "short" });

        return startMonth === endMonth
            ? `${startDate} - ${endDate}.md`
            : `${startDate} ${startMonth} - ${endDate} ${endMonth}.md`;
    }

    // Calculate the start of the week (Monday) for Health Tracker
    private getStartOfWeek(date: Date): Date {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1, ...
        const offset = day === 0 ? 6 : day - 1; // Adjust for Monday start
        startOfWeek.setDate(startOfWeek.getDate() - offset);
        startOfWeek.setHours(0, 0, 0, 0); // Reset time to midnight
        return startOfWeek;
    }

    private getFileNameByYear(date: Date): string {
        const yearDate = date.toLocaleDateString("en-GB", { year: "numeric" });
        return `${yearDate} Year`;
    }

    private getStartOfWeekSelfDev(date: Date): Date {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1, ...
        const offset = day === 0 ? 6 : day + 6; // Adjust for Monday start (error in the original, fixed)
        startOfWeek.setDate(startOfWeek.getDate() - offset);
        startOfWeek.setHours(0, 0, 0, 0); // Reset time to midnight
        return startOfWeek;
    }

    /**
     * Get muscle groups from the previous Health Tracker file
     */
    private async getMuscleGroupsFromHealthTracker(date: Date): Promise<string[]> {
        const previousWeekStart = new Date(this.getStartOfWeek(date));
        previousWeekStart.setDate(previousWeekStart.getDate() - 7); // Switch to the previous week

        const previousPath = `Daily Planner/Health Tracker/${this.getFileNameByMonth(previousWeekStart)}/${this.getFileNameByWeek(previousWeekStart)}`;
        const previousFile = this.app.vault.getAbstractFileByPath(normalizePath(previousPath)) as TFile | null;

        if (!previousFile) {
            console.warn(`Previous week file not found: ${previousPath}. Using default muscle groups.`);
            return DEFAULT_MUSCLE_GROUPS;
        }

        try {
            const content = await this.app.vault.read(previousFile);
            const lines = content.split("\n");

            const tableStart = lines.findIndex(line => line.includes("Daily Habits Track"));
            if (tableStart === -1) {
                return DEFAULT_MUSCLE_GROUPS; // Fallback if the table is corrupted
            }

            const muscleGroups: string[] = [];
            for (let i = tableStart + 1; i < lines.length && lines[i].startsWith("|"); i++) {
                const cells = lines[i].split("|").map(cell => cell.trim());
                if (cells.length < 2) continue;

                const group = cells[1];
                if (group) {
                    muscleGroups.push(group); // Extract the muscle group from the second column
                }
            }

            return muscleGroups.length > 0 ? muscleGroups : DEFAULT_MUSCLE_GROUPS;
        } catch (error) {
            console.error(`Error parsing previous week file ${previousPath}:`, error);
            return DEFAULT_MUSCLE_GROUPS; // Fallback to default
        }
    }
}