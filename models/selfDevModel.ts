// selfDevModel.ts
import { App, Notice, TFile } from "obsidian";

export class SelfDevManager {
    private app: App;
    private settings: {
        mainFileDirectory: string;
        taskFileDirectory: string;
        taskFilePath: string;
    };

    constructor(app: App, settings: { mainFileDirectory: string; taskFileDirectory: string; taskFilePath: string }) {
        this.app = app;
        this.settings = settings;
    }

    // Метод для создания новой секции с задачами на сегодня
    async createDailySection(): Promise<void> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        let file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        // Создаем файл, если он не существует
        if (!file) {
        file = await this.app.vault.create(filePath, "");
        new Notice(`Файл ${this.settings.taskFilePath} создан!`);
        }

        if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); // 17 July 2025
        const sectionHeader = `## 📅 ${today}\n- [ ]\n`;

        // Проверяем, существует ли секция на сегодня
        if (!content.includes(`## 📅 ${today}`)) {
            await this.app.vault.append(file, sectionHeader);
            new Notice(`Секция для ${today} создана!`);
        } else {
            new Notice(`Секция для ${today} уже существует!`);
        }
        }
    }

    // Метод для получения задач на сегодня
    async getTodayTasks(): Promise<string[]> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); // 17 July 2025
        const sectionStart = `## 📅 ${today}\n`;
        const sectionEnd = content.indexOf(`## 📅`, content.indexOf(sectionStart) + 1); // Следующий заголовок

        const sectionContent = sectionEnd === -1 ? content.substring(content.indexOf(sectionStart)) : content.substring(content.indexOf(sectionStart), sectionEnd);
        const tasks = sectionContent.split('\n')
            .filter(line => line.trim().startsWith('- [') && !line.trim().startsWith('- [x]'))
            .map(line => line.trim());

        return tasks;
        }
        return [];
    }

    // Метод для переноса незавершенных задач
    async migrateUnfinishedTasks(): Promise<void> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

        const yesterdaySectionStart = content.indexOf(`## 📅 ${yesterdayStr}\n`);
        if (yesterdaySectionStart !== -1) {
            const yesterdaySectionEnd = content.indexOf(`## 📅`, yesterdaySectionStart + 1);
            const sectionContent = yesterdaySectionEnd === -1 ? content.substring(yesterdaySectionStart) : content.substring(yesterdaySectionStart, yesterdaySectionEnd);
            const unfinishedTasks = sectionContent.split('\n')
            .filter(line => line.trim().startsWith('- [') && !line.trim().startsWith('- [x]'))
            .map(line => line.trim());

            if (unfinishedTasks.length > 0) {
            const todaySectionStart = content.indexOf(`## 📅 ${today}\n`);
            if (todaySectionStart === -1) {
                await this.createDailySection();
            }
            await this.app.vault.append(file, unfinishedTasks.join('\n') + '\n');
            new Notice(`Перенесено ${unfinishedTasks.length} незавершенных задач из ${yesterdayStr}!`);

            // Удаляем перенесенные задачи (опционально, можно закомментировать)
            const newContent = content.replace(sectionContent, sectionContent.replace(unfinishedTasks.join('\n'), '').trim());
            await this.app.vault.modify(file, newContent);
            }
        }
        }
    }

    // Добавляем задачу в файл задач
    public async appendTask(taskText: string): Promise<void> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
        await this.app.vault.append(file, `- [ ] ${taskText}\n`);
        }
    }
}