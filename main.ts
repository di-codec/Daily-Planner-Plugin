import { Notice, Plugin, addIcon, TAbstractFile, TFile } from 'obsidian';

export default class MyPlugin extends Plugin {
    async onload() {
        console.log('loading plugin');
        
        addIcon('circle', '<circle cx="50" cy="50" r="50" fill="currentColor"/>');

        this.addCommand({
            id: 'add-task',
            name: 'Add Task',
            callback: async () => {
                const folderPath = "Daily Planner";
                const filePath = `${folderPath}/Daily Tasks.md`;
                
                // Проверяем и создаём папку
                let folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                    console.log('Creating folder:', folderPath);
                    await this.app.vault.createFolder(folderPath);
                    new Notice('Directory "Daily Planner" created!');
                    folder = this.app.vault.getAbstractFileByPath(folderPath); // Повторная проверка
                    console.log('Folder exists after creation:', !!folder);
                }

                // Проверяем и создаём файл
                let file = this.app.vault.getAbstractFileByPath(filePath);
                if (!file) {
                    console.log('Creating file:', filePath);
                    file = await this.app.vault.create(filePath, "");
                    new Notice('File "Daily Tasks.md" created!');
                }

                // Проверяем тип файла и добавляем задачу
                if (file instanceof TFile) {
                    console.log('Appending to file:', file.path);
                    await this.app.vault.append(file, "- [ ] New task\n");
                    new Notice('New task added!');
                } else {
                    new Notice('Error: File is not a TFile or could not be created.');
                    console.log('File type error:', file);
                }
            }
        });

        this.addRibbonIcon('circle', 'Greet', () => {
            new Notice('New directory is created');
        });
    }

    async onunload() {
        console.log('unloading plugin');
    }
}