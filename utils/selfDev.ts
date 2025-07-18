import { App, TFile, Notice, Setting, PluginSettingTab } from 'obsidian';

export async function appendSelfDevelopmentTask(app: App, file: TFile, task: string = '- [ ] New task') {
    if (file instanceof TFile) {
        try {
            console.log('Appending to file:', file.path);
            await app.vault.append(file, `${task}\n`);
            new Notice('New task added to Self Development!');
        } catch (error) {
            console.error('Failed to append to file:', error);
            new Notice('Failed to add task.');
        }
    } else {
        new Notice('Error: File is not a TFile.');
        console.log('File type error:', file);
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
}
