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
    
    // public async GenerateWeekSummary(date:Date): Promise<{
    //     tasks: { description: string; completed: boolean }[];
    //     migratedDate: string | null; }> 
    // {
    //     const yearName = `${date.getFullYear().toString()} Year`;
    //     const monthName = `📅 ${date.toLocaleDateString("en-GB", { month: "long" })}`;
    //     const dayName = `📅 ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long"})}.md`;
    //     const filePath = `Daily Planner/Self Development/${yearName}/${monthName}/${dayName}`;

    //     const file = this.app.vault.getAbstractFileByPath(normalizePath(filePath));

    //     if (!(file instanceof TFile)) {
    //         console.warn(`File not found: ${filePath}`);
    //         return { tasks: [], migratedDate: null };
    //     }

    //     try {
    //         const content = await this.app.vault.read(file);
    //         return this.parseContent(content);
    //     } catch (error) {
    //         console.error(`Error reading file ${filePath}:`, error);
    //         return { tasks: [], migratedDate: null };
    //     }
    // }
    private calculateStartWeek(date: Date): string{
        const startOfWeek = this.getStartOfWeek(date);
        const DaysOfWeek = new Date(startOfWeek);
        // const dates: {day: number; month: string}[]=[];
        for (let i = 0; i < 7; i++ ){
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            const startDay =current.getDate();
            const startMonth = current.toLocaleDateString("eng-GB", {month: "long"});
            // dates.push({
            //     day: current.getDate(),
            //     month: current.toLocaleDateString("en-GB", { day: "numeric", month: "long"}),
            // });

            DaysOfWeek.setDate(startOfWeek.getDate() +i);
            // console.log(`✅ Every Day Of Week: ${DaysOfWeek}`);
            // const TasksPath = `Daily Planner/Self Development/${yearName}/${monthName}/${dates}`;
            // // console.log(`✅ Start Of Week: ${dates}`);
            console.log(`✅ Start Of Week: 📅 ${startDay} ${startMonth}`);
            // console.log(`📅 ${dates}.md`)

        }
        // const TasksPath = `Daily Planner/Self Development/${yearName}/${monthName}/${dates}`;
        // console.log(`✅ Start Of Week: ${TasksPath}`);
        // console.log(``)
        return``
    }

    public async readDailyTasksFile(date:Date): Promise<{
        tasks: string[]; content: string; }>
    {
        const yearName = this.getFileNameByYear(date);
        const monthName = this.getFileNameByMonth(date);
        const dayName = this.getFileNameByDate(date);
        const startOfWeek = this.calculateStartWeek(date);
        await startOfWeek;
        // const startOfWeek = this.getStartOfWeek(date);
        // const DaysOfWeek = new Date(startOfWeek);
        // const dates: {day: number; month: string}[]=[];
        // for (let i = 0; i < 7; i++ ){
        //     const current = new Date(startOfWeek);
        //     current.setDate(startOfWeek.getDate() + i);
        //     dates.push({
        //         day: current.getDate(),
        //         month: current.toLocaleDateString("en-GB", { day: "numeric", month: "long"}),
        //     });

        //     DaysOfWeek.setDate(startOfWeek.getDate() +i);
        //     // console.log(`✅ Every Day Of Week: ${DaysOfWeek}`);
        //     // const TasksPath = `Daily Planner/Self Development/${yearName}/${monthName}/${dates}`;
        //     // // console.log(`✅ Start Of Week: ${dates}`);
        //     // console.log(`✅ Start Of Week: ${TasksPath}`);
        //     return `📅 ${dates}.md`

        // }
        // const TasksPath = `Daily Planner/Self Development/${yearName}/${monthName}/${dates}`;
        // console.log(`✅ Start Of Week: ${TasksPath}`);


        const filePath = `Daily Planner/Self Development/${yearName}/${monthName}/${dayName}`;
        const file = this.app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)){
            console.warn(`Task file not found: ${filePath}`);
            return { tasks: [], content: ""} ;
        }

        try {
            const content = await this.app.vault.read(file);
            const unfinishedTasks = content
                .split('\n')
                .filter(line => line.trim().startsWith('- [')&& !line.trim().startsWith('- [x]'))
                .map(line => line.trim());
            console.log(`🛠️ Unfinished tasks count:: ${unfinishedTasks.length}`)
            
            const finishedTasks = content
                .split('\n')
                .filter(line => line.trim().startsWith('- [x]'))
                .map(line => line.trim());
            console.log(`🛠️ Finished tasks count:: ${finishedTasks.length}`)
            return { tasks: unfinishedTasks, content };

        } catch (e){
            console.log(`Error: ${e.message}`)
            return {tasks: [], content: ""}
        }
    }

    // private parseContent(content: string): {
    //     tasks: { description: string; completed: boolean }[];
    //     migratedDate: string | null;
    // } {
    //     const lines = content.split("\n");
    //     const tasks: { description: string; completed: boolean }[] = [];
    //     let migratedDate: string | null = null;

    //     let inTasksSection = false;

    //     for (const line of lines) {
    //         const trimmedLine = line.trim();

    //         // Пропускаем пустые строки и заголовок
    //         if (!trimmedLine || trimmedLine.startsWith("#")) {
    //             continue;
    //         }

    //         // Определяем начало секции задач (после заголовка)
    //         if (trimmedLine === "-----------------") {
    //             inTasksSection = false; // После разделителя переходим к миграции
    //             continue;
    //         }

    //         if (inTasksSection && trimmedLine.startsWith("- [")) {
    //             const match = trimmedLine.match(/^- \[([ x])\] (.*)/);
    //             if (match) {
    //                 const completed = match[1].trim() === "x";
    //                 const description = match[2].trim();
    //                 tasks.push({ description, completed });
    //             }
    //         } else if (trimmedLine.startsWith("Migrated:")) {
    //             migratedDate = trimmedLine.replace("Migrated:", "").trim();
    //         } else if (!inTasksSection && tasks.length === 0) {
    //             inTasksSection = true; // Активируем парсинг задач после заголовка
    //         }
    //     }

    //     return { tasks, migratedDate };
    // }


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