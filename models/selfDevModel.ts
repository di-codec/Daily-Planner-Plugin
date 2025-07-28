import { App, Notice, TFile } from "obsidian";

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

    // Getting the file name by date
    private getFileNameByDate(date: Date): string {
        const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        return `📅 ${dateStr}.md`;
    }

    // Obtaining the path to the task file by date
    public getFilePathByDate(date: Date): string {
        return `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.getFileNameByDate(date)}`;
    }

    // Creating a new task file for today if it hasn't been created yet
    async createDailyFile(): Promise<void> {
        const filePath = this.getFilePathByDate(new Date());
        let file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (!file) {
            file = await this.app.vault.create(filePath, `# Self Development - ${new Date().toLocaleDateString("en-GB")}\n`);
            new Notice(`Fail "${file.name}" created!`);
        } else {
            new Notice(`Fail "${file.name}" already exists!`);
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
            // Если файл не существует — создаем и добавляем
            await this.createDailyFile();
            const newFile = this.app.vault.getAbstractFileByPath(filePath) as TFile;
            await this.app.vault.append(newFile, `- [ ] ${taskText}\n`);
        }
    }

    // Transfer incomplete tasks from yesterday to today
    async migrateUnfinishedTasks(): Promise<void> {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const yesterdayFilePath = this.getFilePathByDate(yesterday);
        const todayFilePath = this.getFilePathByDate(today);

        const yesterdayFile = this.app.vault.getAbstractFileByPath(yesterdayFilePath) as TFile | null;
        const todayFile = this.app.vault.getAbstractFileByPath(todayFilePath) as TFile | null;

        if (!(yesterdayFile instanceof TFile)) {
            new Notice("File from yesterday doesn't exists.");
            return;
        }

        const content = await this.app.vault.read(yesterdayFile);
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
        new Notice(`Transfared ${unfinishedTasks.length} tasks from file ${this.getFileNameByDate(yesterday)}!`);
    }
}
