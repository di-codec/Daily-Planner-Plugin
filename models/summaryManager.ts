// // import { App, TFile } from "obsidian";
// // import { HealthTrackerManager } from "./healthTrackerModel";

// // export class SummaryManager {
// //     private app: App;
// //     private healthTrackerManager: HealthTrackerManager;

// //     constructor(app: App) {
// //         this.app = app;
// //         this.healthTrackerManager = new HealthTrackerManager(app, {
// //             mainFileDirectory: "Daily Planner",
// //             healthTrackerFileDirectory: "Health Tracker"
// //         });
// //     }

// //     private getWeeklyFilePath(date: Date): string {
// //         return this.healthTrackerManager.getFilePathByDate(date);
// //     }

// //     private countCompletedHabits(content: string): number[] {
// //         const lines = content.split("\n");
// //         // const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
// //         const completedHabits: number[] = new Array(7).fill(0);

// //         const tableStart = lines.findIndex(line => line.includes("Daily Habits Track"));
// //         if (tableStart === -1) return completedHabits;

// //         for (let i = tableStart + 1; i < lines.length && lines[i].startsWith("|"); i++) {
// //             const cells = lines[i].split("|").map(cell => cell.trim());
// //             if (cells.length < 9) continue; // Ensure valid row

// //             for (let j = 2; j <= 8; j++) {
// //                 if (cells[j].includes("- [x]")) {
// //                     completedHabits[j - 2]++;
// //                 }
// //             }
// //         }

// //         return completedHabits;
// //     }

// //     private generateMermaidChart(completedHabits: number[]): string {
// //         const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
// //         const chartData = daysOfWeek.map((day, index) => `${completedHabits[index]}`);

// //         return `
// // \`\`\`mermaid
// // ---
// // config:
// //     themeVariables:
// //         xyChart:
// //             backgroundColor: "#fff000"
// // ---
// // xychart-beta
// //     title "Completed Habits (Aug 4 - 10)"
// //     x-axis [${daysOfWeek.join(", ")}]
// //     y-axis "Exercises" 1 --> 7
// //     bar [${chartData}]
// //     line [${chartData}]
// // \`\`\`
// // `;
// //     }

// //     async generateSummary(): Promise<void> {
// //         const today = new Date();
// //         const filePath = this.getWeeklyFilePath(today);
// //         console.log(`✨ ${filePath}`)
// //         const summaryFilePath = "Daily Planner/Summary.md";
// //         let summaryFile = this.app.vault.getAbstractFileByPath(summaryFilePath) as TFile | null;

// //         try {
// //             const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
// //             if (!file) {
// //                 console.log(`No health tracker file found at ${filePath}`);
// //                 return;
// //             }

// //             const content = await this.app.vault.read(file);
// //             const completedHabits = this.countCompletedHabits(content);
// //             const mermaidChart = this.generateMermaidChart(completedHabits);

// //             let summaryContent = `# Weekly Summary - ${today.toLocaleDateString("en-GB")}\n\n`;
// //             summaryContent += `## Completed Habits\n${mermaidChart}\n`;
// //             summaryContent += `### Details\n- Total habits completed this week: ${completedHabits.reduce((a, b) => a + b, 0)}\n`;

// //             if (!summaryFile) {
// //                 summaryFile = await this.app.vault.create(summaryFilePath, summaryContent);
// //                 console.log(`Created summary file: ${summaryFilePath}`);
// //             } else {
// //                 await this.app.vault.modify(summaryFile, summaryContent);
// //                 console.log(`Updated summary file: ${summaryFilePath}`);
// //             }
// //         } catch (error) {
// //             console.error(`Error generating summary:`, error);
// //         }
// //     }
// // }

// //================================== v2



// // import { App, TFile } from "obsidian";
// // import { HealthTrackerManager } from "./healthTrackerModel";

// // export class SummaryManager {
// //     private app: App;
// //     private healthTrackerManager: HealthTrackerManager;

// //     constructor(app: App) {
// //         this.app = app;
// //         this.healthTrackerManager = new HealthTrackerManager(app, {
// //             mainFileDirectory: "Daily Planner",
// //             healthTrackerFileDirectory: "Health Tracker"
// //         });
// //     }

// //     private getWeeklyFilePath(date: Date): string {
// //         return this.healthTrackerManager.getFilePathByDate(date);
// //     }

// //     private countCompletedHabitsByExercise(content: string): { [key: string]: number[] } {
// //         const lines = content.split("\n");
// //         const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
// //         const exercises = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
// //         const completedHabits: { [key: string]: number[] } = {
// //             Glutes: new Array(7).fill(0),
// //             Legs: new Array(7).fill(0),
// //             Back: new Array(7).fill(0),
// //             Brists: new Array(7).fill(0),
// //             Shoulders: new Array(7).fill(0),
// //             Jogging: new Array(7).fill(0),
// //             Yoga: new Array(7).fill(0)
// //         };

// //         const tableStart = lines.findIndex(line => line.includes("Daily Habits Track"));
// //         if (tableStart === -1) return completedHabits;

// //         for (let i = tableStart + 1; i < lines.length && lines[i].startsWith("|"); i++) {
// //             const cells = lines[i].split("|").map(cell => cell.trim());
// //             if (cells.length < 9) continue;

// //             const exercise = cells[1].trim();
// //             if (!exercises.includes(exercise)) continue;

// //             for (let j = 2; j <= 8; j++) {
// //                 if (cells[j].includes("- [x]")) {
// //                     completedHabits[exercise][j - 2]++;
// //                 }
// //             }
// //         }

// //         return completedHabits;
// //     }

// //     private generateMermaidChart(completedHabits: { [key: string]: number[] }): string {
// //         const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
// //         const totalHabits = daysOfWeek.map((_, index) =>
// //             Object.values(completedHabits).reduce((sum, counts) => sum + counts[index], 0)
// //         );

// //         return `
// // \`\`\`mermaid
// // ---
// // config:
// //     themeVariables:
// //         xyChart:
// //             backgroundColor: "#fff000"
// // ---
// // xychart-beta
// //     title "Completed Habits (Aug 4 - 10)"
// //     x-axis [${daysOfWeek.join(", ")}]
// //     y-axis "Number of Exercises" 0 --> ${Math.max(...totalHabits) + 1}
// //     bar [${totalHabits.join(", ")}]
// // \`\`\`
// // `;
// //     }

// //     async generateSummary(): Promise<void> {
// //         const today = new Date();
// //         const filePath = this.getWeeklyFilePath(today);
// //         const summaryFilePath = "Daily Planner/Summary.md";
// //         let summaryFile = this.app.vault.getAbstractFileByPath(summaryFilePath) as TFile | null;

// //         try {
// //             const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
// //             if (!file) {
// //                 console.log(`No health tracker file found at ${filePath}`);
// //                 return;
// //             }

// //             const content = await this.app.vault.read(file);
// //             const completedHabits = this.countCompletedHabitsByExercise(content);
// //             const mermaidChart = this.generateMermaidChart(completedHabits);

// //             let summaryContent = `# Weekly Summary - ${today.toLocaleDateString("en-GB")}\n\n`;
// //             summaryContent += `## Completed Habits\n${mermaidChart}\n`;
// //             summaryContent += `### Details\n- Total habits completed this week: ${Object.values(completedHabits).reduce((sum, counts) => sum + counts.reduce((a, b) => a + b, 0), 0)}\n`;

// //             if (!summaryFile) {
// //                 summaryFile = await this.app.vault.create(summaryFilePath, summaryContent);
// //                 console.log(`Created summary file: ${summaryFilePath}`);
// //             } else {
// //                 await this.app.vault.modify(summaryFile, summaryContent);
// //                 console.log(`Updated summary file: ${summaryFilePath}`);
// //             }
// //         } catch (error) {
// //             console.error(`Error generating summary:`, error);
// //         }
// //     }
// // }








// // //================================== v3
// // import { App, TFile } from "obsidian";
// // import { HealthTrackerManager } from "./healthTrackerModel";

// // export class SummaryManager {
// //     private app: App;
// //     private healthTrackerManager: HealthTrackerManager;

// //     constructor(app: App) {
// //         this.app = app;
// //         this.healthTrackerManager = new HealthTrackerManager(app, {
// //             mainFileDirectory: "Daily Planner",
// //             healthTrackerFileDirectory: "Health Tracker"
// //         });
// //     }

// //     private getWeeklyFilePath(date: Date): string {
// //         return this.healthTrackerManager.getFilePathByDate(date);
// //     }

// //     private countCompletedHabitsByExercise(content: string): { [key: string]: number[] } {
// //         const lines = content.split("\n");
// //         const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
// //         const exercises = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
// //         const completedHabits: { [key: string]: number[] } = {
// //             Glutes: new Array(7).fill(0),
// //             Legs: new Array(7).fill(0),
// //             Back: new Array(7).fill(0),
// //             Brists: new Array(7).fill(0),
// //             Shoulders: new Array(7).fill(0),
// //             Jogging: new Array(7).fill(0),
// //             Yoga: new Array(7).fill(0)
// //         };

// //         const tableStart = lines.findIndex(line => line.includes("Daily Habits Track"));
// //         if (tableStart === -1) return completedHabits;

// //         for (let i = tableStart + 1; i < lines.length && lines[i].startsWith("|"); i++) {
// //             const cells = lines[i].split("|").map(cell => cell.trim());
// //             if (cells.length < 9) continue;

// //             const exercise = cells[1].trim();
// //             if (!exercises.includes(exercise)) continue;

// //             for (let j = 2; j <= 8; j++) {
// //                 if (cells[j].includes("- [x]")) {
// //                     completedHabits[exercise][j - 2]++;
// //                 }
// //             }
// //         }

// //         return completedHabits;
// //     }

// //     private generateChart(completedHabits: { [key: string]: number[] }): string {
// //         const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// //         const exercises = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
// //         const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#C9CBCF"];

// //         const datasets = exercises.map((exercise, index) => ({
// //             label: exercise,
// //             data: completedHabits[exercise],
// //             backgroundColor: colors[index]
// //         }));

// //         return `
// // \`\`\`dataviewjs
// // {
// //     "type": "bar",
// //     "data": {
// //         "labels": ${JSON.stringify(daysOfWeek)},
// //         "datasets": ${JSON.stringify(datasets)}
// //     },
// //     "options": {
// //         "scales": {
// //             "x": {
// //                 "stacked": true,
// //                 "title": {
// //                     "display": true,
// //                     "text": "Days of Week"
// //                 }
// //             },
// //             "y": {
// //                 "stacked": true,
// //                 "beginAtZero": true,
// //                 "title": {
// //                     "display": true,
// //                     "text": "Number of Exercises"
// //                 }
// //             }
// //         }
// //     }
// // }
// // \`\`\`
// // `;
// //     }
// //     async generateSummary(): Promise<void> {
// //         const today = new Date();
// //         const filePath = this.getWeeklyFilePath(today);
// //         const summaryFilePath = "Daily Planner/Summary.md";
// //         let summaryFile = this.app.vault.getAbstractFileByPath(summaryFilePath) as TFile | null;
    
// //     try {
// //         const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
// //             if (!file) {
// //                 console.log(`No health tracker file found at ${filePath}`);
// //                 return;
// //             }
// //             const content = await this.app.vault.read(file);
// //             const completedHabits = this.countCompletedHabitsByExercise(content);
// //             const mermaidChart = this.generateChart(completedHabits);

// //             let summaryContent = `# Weekly Summary - ${today.toLocaleDateString("en-GB")}\n\n`;
// //             summaryContent += `## Completed Habits\n${mermaidChart}\n`;
// //             summaryContent += `### Details\n- Total habits completed this week: ${Object.values(completedHabits).reduce((sum, counts) => sum + counts.reduce((a,b) => a+b, 0), 0)}\n`;
        
// //             if (!summaryFile) {
// //                 summaryFile = await this.app.vault.create(summaryFilePath, summaryContent);
// //                 console.log(`Created summary file: ${summaryFilePath}`);
// //             } else {
// //                 await this.app.vault.modify(summaryFile, summaryContent);
// //                 console.log(`Updated summary file: ${summaryFilePath}`);
// //             }
// //         } catch (error) {
// //             console.error(`Error generating summary:`, error);
// //         }
// //     }
// // }

// // ======================================================== v4



// import { App, Notice, TFile } from "obsidian";
// import { HealthTrackerManager } from "./healthTrackerModel";

// export class SummaryManager {
//     private app: App;
//     private healthTrackerManager: HealthTrackerManager;

//     constructor(app: App) {
//         this.app = app;
//         this.healthTrackerManager = new HealthTrackerManager(app, {
//             mainFileDirectory: "Daily Planner",
//             healthTrackerFileDirectory: "Health Tracker"
//         });
//     }

//     private getWeeklyFilePath(date: Date): string {
//         return this.healthTrackerManager.getFilePathByDate(date);
//     }

//     private countTotalHabits(content: string): number {
//         const lines = content.split("\n");
//         let total = 0;
//         const tableStart = lines.findIndex(line => line.includes("Daily Habits Track"));
//         if (tableStart !== -1) {
//             for (let i = tableStart + 1; i < lines.length && lines[i].startsWith("|"); i++) {
//                 const cells = lines[i].split("|").map(cell => cell.trim());
//                 if (cells.length < 9) continue;
//                 for (let j = 2; j <= 8; j++) {
//                     if (cells[j].includes("- [x]")) {
//                         total++;
//                     }
//                 }
//             }
//         }
//         return total;
//     }

//     async generateSummary(): Promise<void> {
//         const today = new Date();
//         const filePath = this.getWeeklyFilePath(today);
//         const summaryFilePath = "Daily Planner/Summary.md";
//         let summaryFile = this.app.vault.getAbstractFileByPath(summaryFilePath) as TFile | null;

//         try {
//             const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
//             if (!file) {
//                 console.log(`No health tracker file found at ${filePath}`);
//                 return;
//             }
//             const n = "n";
//             const content = await this.app.vault.read(file);
//             const dataviewJS = `
// \`\`\`dataviewjs
// const healthTrackerPath = "${filePath}";
// const file = await dv.io.load(healthTrackerPath);

// if (!file) {
//     dv.paragraph("Health tracker file not found.");
// } else {
//     const lines = file.split("${n}");
//     const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
//     const muscleGroups = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
//     const completedHabits = Array(daysOfWeek.length).fill(0).map(() => ({ data: Array(muscleGroups.length).fill(0) }));

//     const tableStart = lines.findIndex(line => line.includes("Daily Habits Track"));
//     if (tableStart !== -1) {
//         for (let i = tableStart + 1; i < lines.length && lines[i].startsWith("|"); i++) {
//             const cells = lines[i].split("|").map(cell => cell.trim());
//             if (cells.length < 9) continue;

//             const groupIdx = muscleGroups.indexOf(cells[1].trim());
//             if (groupIdx !== -1) {
//                 for (let j = 2; j <= 8; j++) {
//                     if (cells[j].includes("- [x]")) {
//                         completedHabits[j - 2].data[groupIdx]++;
//                     }
//                 }
//             }
//         }
//     }

//     const datasets = muscleGroups.map((group, idx) => ({
//         label: group,
//         data: completedHabits.map(day => day.data[idx]),
//         backgroundColor: [
//             "#FF6384", // Glutes
//             "#36A2EB", // Legs
//             "#FFCE56", // Back
//             "#4BC0C0", // Brists
//             "#9966FF", // Shoulders
//             "#FF9F40", // Jogging
//             "#C9CBCF"  // Yoga
//         ][idx]
//     }));

//     dv.table(daysOfWeek, datasets, "bar", {
//         title: "Completed Habits (${new Date().toLocaleDateString('en-GB', { month: 'long', day: 'numeric' }) + ' ' + new Date().toLocaleDateString('en-GB', { day: 'numeric' }) + '-' + new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()})",
//         xLabel: "Days of Week",
//         yLabel: "Number of Exercises",
//         stacked: true,
//         beginAtZero: true
//     });
// }
// \`\`\`
// `;

//             let summaryContent = `# Weekly Summary - ${today.toLocaleDateString("en-GB")}\n\n`;
//             summaryContent += `## Completed Habits\n${dataviewJS}\n`;
//             summaryContent += `### Details\n- Total habits completed this week: ${this.countTotalHabits(content)}\n`;

//             if (!summaryFile) {
//                 summaryFile = await this.app.vault.create(summaryFilePath, summaryContent);
//                 console.log(`Created summary file: ${summaryFilePath}`);
//             } else {
//                 await this.app.vault.modify(summaryFile, summaryContent);
//                 console.log(`Updated summary file: ${summaryFilePath}`);
//             }
//         } catch (error) {
//             console.error(`Error generating summary:`, error);
//             new Notice(`Error generating summary: ${error.message}`);
//         }
//     }
// }

// summaryManager.ts
import { App, TFile, TFolder } from "obsidian";

export class SummaryManager {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async generateSummary() {
        const summaryFilePath = "Daily Planner/Summary.md";
    
        const weeklyData = await this.getWeeklyExerciseData(); // вызывает парсер
    
        const debugText = `\n\`\`\`json\n${JSON.stringify(weeklyData, null, 2)}\n\`\`\`\n`;
    
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const categories = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
    
        const traces = categories.map(category => ({
            x: days,
            y: days.map(day => weeklyData[day]?.[category] ?? 0),
            name: category,
            type: 'bar'
        }));
    
        const htmlContent = `
    \`\`\`html
    <div id="healthChart" style="height: 400px;"></div>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script>
        Plotly.newPlot('healthChart', ${JSON.stringify(traces)}, {
            barmode: 'stack',
            title: 'Weekly Health Tracker',
            xaxis: { title: 'Days of Week' },
            yaxis: { title: 'Number of Exercises' },
            legend: { orientation: "h" }
        });
    </script>
    \`\`\`
    `;
    
        const file = await this.getOrCreate(summaryFilePath);
        await this.app.vault.modify(file, `# Summary\n\n${htmlContent}${debugText}`);
    }
    

    private async getOrCreate(path: string): Promise<TFile> {
        let file = this.app.vault.getAbstractFileByPath(path);
        if (!file) {
            return await this.app.vault.create(path, "");
        }
        return file as TFile;
    }

    private async getWeeklyExerciseData(): Promise<Record<string, Record<string, number>>> {
        const basePath = "Daily Planner/Health Tracker";
        const rootFolder = this.app.vault.getAbstractFileByPath(basePath) as TFolder;

        const weeklyData: Record<string, Record<string, number>> = {};

        if (!rootFolder) return weeklyData;

        // Перебираем папки месяцев
        for (const monthFolder of rootFolder.children) {
            if (monthFolder instanceof TFolder) {
                // Перебираем недельные файлы внутри месяца
                for (const file of monthFolder.children) {
                    if (file instanceof TFile && file.extension === "md") {
                        const content = await this.app.vault.read(file);
                        const parsed = this.parseWeeklyHealthData(content);
                        // Слияние данных по дням
                        for (const day of Object.keys(parsed)) {
                            if (!weeklyData[day]) weeklyData[day] = {};
                            for (const [category, count] of Object.entries(parsed[day])) {
                                weeklyData[day][category] = (weeklyData[day][category] || 0) + count;
                            }
                        }
                    }
                }
            }
        }

        return weeklyData;
    }

    // private parseWeeklyHealthData(content: string): Record<string, Record<string, number>> {
    //     const result: Record<string, Record<string, number>> = {};
    //     const lines = content.split('\n');

    //     let currentDay: string | null = null;

    //     for (const line of lines) {
    //         const trimmed = line.trim();

    //         // Ищем день недели
    //         const dayMatch = trimmed.match(/^###\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i);
    //         if (dayMatch) {
    //             currentDay = dayMatch[1];
    //             result[currentDay] = {};
    //             continue;
    //         }

    //         // Парсим упражнения
    //         if (currentDay && trimmed.startsWith('-')) {
    //             const [rawCategory] = trimmed.substring(1).split(':').map(s => s.trim());
    //             if (rawCategory) {
    //                 result[currentDay][rawCategory] = (result[currentDay][rawCategory] || 0) + 1;
    //             }
    //         }
    //     }

    //     return result;
    // }

    private parseWeeklyHealthData(content: string): Record<string, Record<string, number>> {
        const result: Record<string, Record<string, number>> = {};
    
        const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        const fullDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
        const lines = content.split("\n");
        const tableLines = lines.filter(line => line.includes("|"));
    
        if (tableLines.length < 3) return result;
    
        // Парсим заголовки
        const headers = tableLines[1].split("|").map(h => h.trim());
        const columnToDay: Record<number, string> = {};
        for (let i = 0; i < headers.length; i++) {
            const shortDay = headers[i];
            const idx = weekdays.indexOf(shortDay);
            if (idx !== -1) {
                columnToDay[i] = fullDays[idx];
                result[fullDays[idx]] = {};
            }
        }
    
        // Парсим строки с чекбоксами
        for (const line of tableLines.slice(3)) {
            const cells = line.split("|").map(cell => cell.trim());
            if (cells.length < 2) continue;
    
            const category = cells[0];
            for (let i = 1; i < cells.length; i++) {
                const day = columnToDay[i];
                if (!day) continue;
    
                const inputHTML = cells[i];
                const isChecked = /<input[^>]+checked/i.test(inputHTML); // ищем checked
                if (isChecked) {
                    if (!result[day][category]) result[day][category] = 0;
                    result[day][category]++;
                }
            }
        }
    
        return result;
    }
    
}
