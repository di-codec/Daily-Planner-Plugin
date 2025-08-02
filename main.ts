// main.ts
import { Notice, Plugin, addIcon, TAbstractFile, TFolder, TFile, WorkspaceLeaf, ItemView } from 'obsidian';
import { SelfDevManager } from './models/selfDevModel';
import { HealthTrackerManager } from "./models/healthTrackerModel";
// import { DataUIView, DATA_UI_VIEW_TYPE } from './models/dataUI';
// import { SummaryManager } from "./models/summaryManager";


export default class MyPlugin extends Plugin {
    private selfDevManager: SelfDevManager;
    private healthTrackerManager: HealthTrackerManager;

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
            new Notice(`Today tasks: ${tasks.length > 0 ? tasks.join(', ') : 'no tasks'}`);
        }
        });

        this.healthTrackerManager = new HealthTrackerManager(this.app, {
            mainFileDirectory: "Daily Planner",
            healthTrackerFileDirectory: "Health Tracker"
        });

        // Adding Health Tracker command
        this.addCommand({
            id: 'track health',
            name: 'Create Weekly Health Tracker',
            callback: async () => {
                await this.healthTrackerManager.createWeeklyFile();
                const tasks = await this.healthTrackerManager.getThisWeekSummary();
                new Notice(`Health Tracker created: ${tasks.length > 0 ? tasks.join(', ') : 'No content'}`);
            }
        });        
        
        // Structure and tasks manager creation through 2ribbon icon"
        this.addRibbonIcon('circle', 'Manager', async () => {
            const folderPath = "Daily Planner";
            const folderSelfDevPath = "Self Development";
            const folderHealthTrackerPath = "Health Tracker";
            const filePathSelfDev = `${folderPath}/${folderSelfDevPath}`;
            const filePathJobApplication = `${folderPath}/Job Application Tracker.md`;
            const folderPathHealth = `${folderPath}/${folderHealthTrackerPath}`;

            // Folder checking and creation
            let folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                console.log('Creating folder:', folderPath);
                await this.app.vault.createFolder(folderPath);
                new Notice('Directory "Daily Planner" created!');
                folder = this.app.vault.getAbstractFileByPath(folderPath);
            }

            //=================== SELF DEVELOPMENT ====================================

            // Creatin "Self Development" Folder
            if (!this.app.vault.getAbstractFileByPath(`${folderPath}/${folderSelfDevPath}`)) {
                console.log(`Creating inside directory 'Self Development': ${folderSelfDevPath}`);
                await this.app.vault.createFolder(`${folderPath}/${folderSelfDevPath}`);
                new Notice('Inside directory "Self Development" created!');
            }

            // Checking and Creation "Notes.md" file
            let fileSelfDev = this.app.vault.getAbstractFileByPath(filePathSelfDev);
            if (!fileSelfDev) {
                console.log('✅ Creating file:', filePathSelfDev);
                fileSelfDev = await this.app.vault.createFolder(filePathSelfDev);
                new Notice('✅ Direction "Self Development" created!');
            }

            if (fileSelfDev instanceof TFolder) {
                await this.selfDevManager.createDailyFile(); // Creating the section for today
                const tasks = await this.selfDevManager.getTodayTasks();
                new Notice(`Today's tasks: ${tasks.length > 0 ? tasks.join(', ') : 'no tasks found'}`);

                // Checking if tasks have been transferred today 
                const todayFilePath = this.selfDevManager.getFilePathByDate(new Date());
                const todayFile = this.app.vault.getAbstractFileByPath(todayFilePath) as TFile;
                let content = await this.app.vault.read(todayFile);
                const today = new Date().toLocaleDateString("en-GB");
                if (!content.includes(`# Migrated: ${today}`)) {
                    await this.selfDevManager.migrateUnfinishedTasks();
                    await this.app.vault.append(todayFile, `# Migrated: ${today}\n`);
                    new Notice(`Transferred unfinished tasks for today!`);
                } else {
                    new Notice('Tasks already migrated today.');
                }
            }

            // ================= HEALTH TRACKER ================================

            // Creating "Health Tracker" Folder 
            if (!this.app.vault.getAbstractFileByPath(`${folderPath}/${folderHealthTrackerPath}`)) {
                console.log(`Creating inside directory 'Health Tracker': ${folderHealthTrackerPath}`);
                await this.app.vault.createFolder(`${folderPath}/${folderHealthTrackerPath}`);
                new Notice('Inside directory "Health Tracker" created!');
            }
            // Create "Health Tracker" folder
            let filePathHealthTracker = this.app.vault.getAbstractFileByPath(folderPathHealth);
            if (!filePathHealthTracker) {
                console.log('✅ Creating folder:', folderPathHealth);
                filePathHealthTracker = await this.app.vault.createFolder(folderPathHealth);
                new Notice('✅ Direction "Health Tracker" created!');
            }

            if (filePathHealthTracker instanceof TFolder) {
                await this.healthTrackerManager.createWeeklyFile();
                const summary =  await this.healthTrackerManager.getThisWeekSummary();
                new Notice (`${summary}`);


            }
            // =================================================
       
        });

        // SummaryManager Initialization
        // const summaryManager = new SummaryManager(this.app);
        // await summaryManager.generateSummary();
    }

    async onunload() {
        console.log('unloading plugin');
    }
}

