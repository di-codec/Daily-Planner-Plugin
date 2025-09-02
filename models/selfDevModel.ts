import { App, Notice, TFile } from "obsidian";
import { ensureFoldersExist } from "../utils/utils";
import { PassThrough } from "stream";


export class SelfDevManager {
    private app: App;
    private settings: {
        mainFileDirectory: string;
        taskFileDirectory: string;
    };

    constructor(app: App, settings: { mainFileDirectory: string; taskFileDirectory: string }) {
        this.app = app;
        this.settings = settings;
    }

    // GET the folder name by year
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

    // }
    public getFilePathByDate(date: Date): string {
        return `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.getFileNameByYear(date)}/${this.getFileNameByMonth(date)}/${this.getFileNameByDate(date)}`;
    }

    // Creating a new task file for today if it hasn't been created yet
    async createDailyFile(): Promise<void> {
        const filePath = this.getFilePathByDate(new Date());
        await ensureFoldersExist(this.app, filePath);
        let file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (!file) {
            file = await this.app.vault.create(filePath, `# ✅Tasks - ${new Date().toLocaleDateString("en-GB")}\n\n`);
            new Notice(`Fail "${file.name}" created!`);
        } else {
            PassThrough
        }
    }

    // Retrieve incomplete tasks for today
    async getTodayTasks(): Promise<string[]> {
        const filePath = this.getFilePathByDate(new Date());
        const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (file instanceof TFile) {
            const content = await this.app.vault.read(file);
            return content
                .split('\n')
                .filter(line => line.trim().startsWith('- [') && !line.trim().startsWith('- [x]'))
                .map(line => line.trim());
        }

        return [];
    }

    // Add a task to today's file
    async appendTask(taskText: string): Promise<void> {
        const filePath = this.getFilePathByDate(new Date());
        const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (file instanceof TFile) {
            await this.app.vault.append(file, `- [ ] ${taskText}\n`);
        } else {
            // If the file doesn't exist - create it and add the task
            await this.createDailyFile();
            const newFile = this.app.vault.getAbstractFileByPath(filePath) as TFile;
            await this.app.vault.append(newFile, `- [ ] ${taskText}\n`);
        }
    }

    // Transfer incomplete tasks from the last existing file in current or previous months to today
    async migrateUnfinishedTasks(): Promise<void> {
        const today = new Date();
        const todayFilePath = this.getFilePathByDate(today);
        const todayFile = this.app.vault.getAbstractFileByPath(todayFilePath) as TFile | null;

        // Get the year folder path
        const yearName = this.getFileNameByYear(today);
        const yearFolderPath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${yearName}`;
        
        const yearFolder = this.app.vault.getAbstractFileByPath(yearFolderPath);
        if (!yearFolder || !(yearFolder as any).children) {
            new Notice("No year folder found.");
            console.log(`No year folder found: ${yearFolderPath}`);
            return;
        }

        // Get all month folders and sort them by name (which includes month order)
        const monthFolders = (yearFolder as any).children
            .filter((folder: any) => folder.children && folder.name.startsWith('📅'))
            .sort((a: any, b: any) => b.name.localeCompare(a.name)); // Sort descending to check recent months first

        let lastFile: TFile | null = null;

        // Search through month folders from most recent to oldest
        for (const monthFolder of monthFolders) {
            const files = monthFolder.children
                .filter((file: any) => file instanceof TFile && file.path !== todayFilePath)
                .sort((a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime);

            if (files.length > 0) {
                lastFile = files[0] as TFile;
                console.log(`Last file found: ${lastFile.name} in ${monthFolder.name}`);
                break;
            }
        }

        if (!lastFile) {
            new Notice("No previous files found to migrate tasks from.");
            console.log(`No previous files found in any month folder`);
            return;
        }

        const content = await this.app.vault.read(lastFile);
        const unfinishedTasks = content
            .split('\n')
            .filter(line => line.trim().startsWith('- [') && !line.trim().startsWith('- [x]'))
            .map(line => line.trim());

        if (unfinishedTasks.length === 0) {
            new Notice("There are no unfinished tasks to transfer.");
            return;
        }

        if (!(todayFile instanceof TFile)) {
            await this.createDailyFile();
        }

        const file = this.app.vault.getAbstractFileByPath(todayFilePath) as TFile;
        await this.app.vault.append(file, unfinishedTasks.join('\n') + '\n');
        new Notice(`Transferred ${unfinishedTasks.length} tasks from file ${lastFile.name}!`);
    }
}