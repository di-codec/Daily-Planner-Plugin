import { Notice, Plugin, addIcon, TFile } from 'obsidian';
import { appendSelfDevelopmentTask } from './utils/selfDev';


export default class MyPlugin extends Plugin {
    async onload() {
        console.log('loading plugin');
        
        addIcon('circle', '<circle cx="50" cy="50" r="50" fill="currentColor"/>');

        this.addCommand({
            id: 'add-task',
            name: 'Add Task',


            callback: async () => {}
        });

        this.addRibbonIcon('circle', 'Manager', async () => {
            const folderPath = "Daily Planner";
            const folderSelfDevPath = "Self Development";
            const filePathSelfDev = `${folderPath}/${folderSelfDevPath}/Self Development Records.md`;
            const filePathJobApplication = `${folderPath}/Job Application Tracker.md`;
            const filePathHelth = `${folderPath}/Health Tracker.md`;
                
            // Folder checking and creation
            let folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                console.log('Creating folder:', folderPath);
                await this.app.vault.createFolder(folderPath);
                new Notice('Directory "Daily Planner" created!');
                folder = this.app.vault.getAbstractFileByPath(folderPath); // Повторная проверка
                console.log('Folder exists after creation:', !!folder);
                
                console.log(`Creatinf inside directory 'Self Development': ${folderSelfDevPath}`);
                await this.app.vault.createFolder(`${folderPath}/${folderSelfDevPath}`);
                new Notice('Inside directory "Self Development" created!');
                folder = this.app.vault.getAbstractFileByPath(folderSelfDevPath);
                console.log('Inside directory exists after creation:', !!folder)

            }

            // Checking and Creation Self Development file
            let fileSelfDev = this.app.vault.getAbstractFileByPath(filePathSelfDev);
            if (!fileSelfDev) {
                console.log('Creating file:', filePathSelfDev);
                fileSelfDev = await this.app.vault.create(filePathSelfDev, "");
                new Notice('File "Self Development Records.md" created!');
            }
            if (fileSelfDev instanceof TFile) {
                await appendSelfDevelopmentTask(this.app, fileSelfDev as TFile);
            } 

            // Checking and Creaation Job Application file
            let fileJobApplication  = this.app.vault.getAbstractFileByPath(filePathJobApplication);
            if (!fileJobApplication){
                console.log('Creatin file:', filePathJobApplication);
                fileJobApplication = await this.app.vault.create(filePathJobApplication, "");
                new Notice ('File "Job Application Tracker.md" created! ');
            }

            // Checking and Creaation Job Application file
            let fileHealth  = this.app.vault.getAbstractFileByPath(filePathHelth);
            if (!fileHealth){
                console.log('Creatin file:', filePathHelth);
                fileHealth = await this.app.vault.create(filePathHelth, "");
                new Notice ('File "Health Tracker.md" created! ');
            }

            // // Проверяем тип файла и добавляем задачу
            // if (file instanceof TFile) {
            //     console.log('Appending to file:', file.path);
            //     await this.app.vault.append(file, "- [ ] New task\n");
            //     new Notice('New task added!');
            // } else {
            //     new Notice('Error: File is not a TFile or could not be created.');
            //     console.log('File type error:', file);
            // }
        });
    }

    async onunload() {
        console.log('unloading plugin');
    }
}