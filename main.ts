// main.ts
import { Notice, Plugin, addIcon, TAbstractFile, TFolder, TFile, WorkspaceLeaf, ItemView } from 'obsidian';
import { SelfDevManager } from './models/selfDevModel';

export default class MyPlugin extends Plugin {
    private selfDevManager: SelfDevManager;

    async onload() {
        console.log('loading plugin');

        addIcon('circle', '<circle cx="50" cy="50" r="50" fill="currentColor"/>');

        this.selfDevManager = new SelfDevManager(this.app, {
            mainFileDirectory: "Daily Planner",
            taskFileDirectory: "Self Development" 
        });
        
        // Adding tasks command
        this.addCommand({
        id: 'add-task',
        name: 'Add Task',
        callback: async () => {
            await this.selfDevManager.createDailyFile();
            const tasks = await this.selfDevManager.getTodayTasks();
            new Notice(`Сегодняшние задачи: ${tasks.length > 0 ? tasks.join(', ') : 'нет задач'}`);
        }
        });
        // Structure and tasks manager creation through 2ribbon icon"
        this.addRibbonIcon('circle', 'Manager', async () => {
        const folderPath = "Daily Planner";
        const folderSelfDevPath = `Self Development`;
        const filePathSelfDev = `${folderPath}/${folderSelfDevPath}/Notes.md`;
        const filePathJobApplication = `${folderPath}/Job Application Tracker.md`;
        const filePathHealth = `${folderPath}/Health Tracker.md`;

        // Folder checking and creation
        let folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            console.log('Creating folder:', folderPath);
            await this.app.vault.createFolder(folderPath);
            new Notice('Directory "Daily Planner" created!');
            folder = this.app.vault.getAbstractFileByPath(folderPath);
        }

        // Creatin "Self Development" Folder
        if (!this.app.vault.getAbstractFileByPath(`${folderPath}/${folderSelfDevPath}`)) {
            console.log(`Creating inside directory 'Self Development': ${folderSelfDevPath}`);
            await this.app.vault.createFolder(`${folderPath}/${folderSelfDevPath}`);
            new Notice('Inside directory "Self Development" created!');
        }

        // Checking and Creation "Notes.md" file
        let fileSelfDev = this.app.vault.getAbstractFileByPath(filePathSelfDev);
        if (!fileSelfDev) {
            console.log('Creating file:', filePathSelfDev);
            fileSelfDev = await this.app.vault.create(filePathSelfDev, "`Explanetion of what this section is for`");
            new Notice('File "Notes.md" created!');
        }

        //=======================================================
        if (fileSelfDev instanceof TFile) {
            await this.selfDevManager.createDailyFile(); // Creatin the section for today
            const tasks = await this.selfDevManager.getTodayTasks();
            new Notice(`Toda tasks: ${tasks.length > 0 ? tasks.join(', ') : 'no tasks found'}`);
            await this.selfDevManager.migrateUnfinishedTasks(); // Transfare unfinished tasks
        }
        //=======================================================

        // Checking and Creation Job Application file
        let fileJobApplication = this.app.vault.getAbstractFileByPath(filePathJobApplication);
        if (!fileJobApplication) {
            console.log('Creating file:', filePathJobApplication);
            fileJobApplication = await this.app.vault.create(filePathJobApplication, "");
            new Notice('File "Job Application Tracker.md" created!');
        }

        // Checking and Creation Health Tracker file
        let fileHealth = this.app.vault.getAbstractFileByPath(filePathHealth);
        if (!fileHealth) {
            console.log('Creating file:', filePathHealth);
            fileHealth = await this.app.vault.create(filePathHealth, "");
            new Notice('File "Health Tracker.md" created!');
        }
        });
    }

    async onunload() {
        console.log('unloading plugin');
    }
}
