import { App, TFile, normalizePath } from "obsidian";
import { ensureFoldersExist } from "../utils/utils";



const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MUSCLE_GROUPS = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
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

    async generateWeeklySummary(stats:{totalTasks: number, totalUnfinishedTasks: number; totalFinishedTasks: number} ,date: Date, summaryPath: string = "Daily Planner/Summary.md"): Promise<void> {
        try {
            const habitData = await this.readWeekFile(date);
            const chartYaml = this.generateChartYaml(habitData);

            await ensureFoldersExist(this.app, summaryPath);

            const {totalTasks, totalUnfinishedTasks, totalFinishedTasks } = stats;
            const tasksPercent = totalTasks > 0 ? Math.round((totalFinishedTasks / totalTasks) * 100) : 0;
            const progressBlocks = Math.round(tasksPercent / 10);
            const progressBar = "█".repeat(progressBlocks) + "░".repeat(10 - progressBlocks);
            
            // Get week date range for the header
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

            const summaryContent = `# 🏋️ Health Tracker Summary

${chartYaml}

---

## ✅ Task Summary (📅 ${weekRange})
Progress:
${progressBar}

**Total Tasks:** ${totalTasks}
**Completed:** ${totalFinishedTasks}
**Remaining:** ${totalUnfinishedTasks}
**Completion Rate:** ${tasksPercent}%`;

            await this.app.vault.adapter.write(normalizePath(summaryPath), summaryContent);

            console.log(`Summary generated at: ${summaryPath}`);
        } catch (error) {
            console.error("Error generating summary:", error);
        }
    }

    /**
     *  Read SelfDev data from a specific days file
     */

    public async readDailyTasksFile(date:Date): Promise<{
        tasks: string[]; 
        content: string; 
        totalUnfinishedTasks: number;
        totalFinishedTasks: number;
        totalTasks: number;
    }>
    {
        const yearName = this.getFileNameByYear(date);
        const startOfWeek = this.getStartOfWeekSelfDev(date);
        const allUnfinishedTasks: string[] = [];
        let allContent = "";
        let totalUnfinishedTasks = 0;
        let totalFinishedTasks = 0;
        let totalTasks= 0;

        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            const startDay = current.getDate();
            const startMonth = current.toLocaleDateString("en-GB", { month: "long" });

            // Form the file path for each day
            const filePath = `Daily Planner/Self Development/${yearName}/📅 ${startMonth}/📅 ${startDay} ${startMonth}.md`;
            const file = this.app.vault.getAbstractFileByPath(filePath);

            if (!(file instanceof TFile)) {
            console.warn(`Task file not found: ${filePath}`);
            continue; // Pass if file not found
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
            allContent += content + "\n"; // Add content with a separator
            } catch (e) {
            console.error(`Error reading file ${filePath}: ${e.message}`);
            continue; // Skip on read error
            }
        }
        totalTasks = totalFinishedTasks + totalUnfinishedTasks;

        console.log("======================")
        console.log(`📊 Total Unfinished Tasks for the week: ${totalUnfinishedTasks}`);
        console.log(`📊 Total Finished Tasks for the week: ${totalFinishedTasks}`);
        console.log("======================")
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
        // Initialize the structure
        const habitData: { [muscleGroup: string]: number[] } = {};
        MUSCLE_GROUPS.forEach(group => {
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
            const weekHabitData = this.parseMarkdownTable(content);

            // Copying data
            for (const muscleGroup of MUSCLE_GROUPS) {
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
     * Parsing a markdown table
     */
    private parseMarkdownTable(content: string): { [muscleGroup: string]: number[] } {
        const lines = content.split("\n");
        const habitData: { [muscleGroup: string]: number[] } = {};
        MUSCLE_GROUPS.forEach(group => (habitData[group] = new Array(7).fill(0)));

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
                if (!MUSCLE_GROUPS.includes(muscleGroup)) continue;

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
        const datasets = MUSCLE_GROUPS.map(muscleGroup => ({
            label: muscleGroup,
            data: habitData[muscleGroup] || new Array(7).fill(0),
            backgroundColor: MUSCLE_COLORS[muscleGroup as keyof typeof MUSCLE_COLORS]
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

        // Include month if week spans two months
        return startMonth === endMonth
            ? `${startDate} - ${endDate}.md`
            : `${startDate} ${startMonth} - ${endDate} ${endMonth}.md`;
    }
    // Calculate the start of the week (Monday)
    private getStartOfWeek(date: Date): Date {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1, ...
        const offset = day === 0 ? 6 : day - 1; // Adjust for Monday start
        startOfWeek.setDate(startOfWeek.getDate() - offset);
        startOfWeek.setHours(0, 0, 0, 0); // Reset time to midnight
        return startOfWeek;
    }
    
    private getFileNameByYear (date: Date): string {
        const yearDate = date.toLocaleDateString("en-GB", {year: "numeric"})
        return `${yearDate} Year`
    }
    private getStartOfWeekSelfDev(date: Date): Date {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1, ...
        const offset = day === 0 ? 6 : day + 6; // Adjust for Monday start
        startOfWeek.setDate(startOfWeek.getDate() - offset);
        startOfWeek.setHours(0, 0, 0, 0); // Reset time to midnight
        return startOfWeek;
    }
    
}
