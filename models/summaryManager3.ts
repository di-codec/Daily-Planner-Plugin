import { App, TFile, normalizePath } from "obsidian";
import { ensureFoldersExist } from "../utils/utils";
import { PassThrough } from "stream";


interface SummaryStats {
    workoutsThisWeek: number;
    focusMuscle: string;
    focusPercent: number;
    tasksCompleted: number;
    tasksTotal: number;
    streak: number;
    barData: number[];
    pieData: { label: string; value: number }[];
    deltaWorkouts: number;
    deltaTasks: number;
  }

  export class SummaryManagerTasks {
    private app: App;
  
    constructor(app: App) {
        this.app = app;
    }
    

    public async readDailyTasksFile(date:Date): Promise<{
        tasks: string[]; 
        content: string; 
        totalUnfinishedTasks: number;
        totalFinishedTasks: number;
    }>
    {
        const yearName = this.getFileNameByYear(date);
        const monthName = this.getFileNameByMonth(date);
        const startOfWeek = this.getStartOfWeek(date);
        const allUnfinishedTasks: string[] = [];
        let allContent = "";
        let totalUnfinishedTasks = 0;
        let totalFinishedTasks = 0;

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
            // console.log(`🛠️ Unfinished tasks count for ${startDay} ${startMonth}: ${unfinishedTasks.length}`);
            totalUnfinishedTasks += unfinishedTasks.length;

            const finishedTasks = content
                .split('\n')
                .filter(line => line.trim().startsWith('- [x]'))
                .map(line => line.trim());
            // console.log(`🛠️ Finished tasks count for ${startDay} ${startMonth}: ${finishedTasks.length}`);
            totalFinishedTasks += finishedTasks.length;

            allUnfinishedTasks.push(...unfinishedTasks);
            allContent += content + "\n"; // Add content with a separator
            } catch (e) {
            console.error(`Error reading file ${filePath}: ${e.message}`);
            continue; // Skip on read error
            }
        }

        console.log("======================")
        console.log(`📊 Total Unfinished Tasks for the week: ${totalUnfinishedTasks}`);
        console.log(`📊 Total Finished Tasks for the week: ${totalFinishedTasks}`);
        console.log("======================")
        return { 
            tasks: allUnfinishedTasks, 
            content: allContent.trim(),
            totalUnfinishedTasks,
            totalFinishedTasks
        };
    }

    // GET the folder name by year
    // Calculate the start of the week (Monday)
    private getStartOfWeek(date: Date): Date {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1, ...
        const offset = day === 0 ? 6 : day + 6; // Adjust for Monday start
        startOfWeek.setDate(startOfWeek.getDate() - offset);
        startOfWeek.setHours(0, 0, 0, 0); // Reset time to midnight
        return startOfWeek;
    }

    private getFileNameByYear (date: Date): string {
        const yearDate = date.toLocaleDateString("en-GB", {year: "numeric"})
        return `${yearDate} Year`
    }

    // Get the folder name by month
    private getFileNameByMonth(date: Date): string {
        const monthData = date.toLocaleDateString("en-GB", { month: "long" });
        return `📅 ${monthData}`;
    }

    // Getting the file name by date
    private getFileNameByDate(date: Date): string {
        const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "long"});
        return `📅 ${dateStr}.md`;
    }
}