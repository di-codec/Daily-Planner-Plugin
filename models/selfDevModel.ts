// Импортируем необходимые типы и классы из Obsidian API
import { App, Notice, TFile } from "obsidian";

// Класс для управления ежедневными задачами пользователя
export class SelfDevManager {
    private app: App; // Экземпляр Obsidian-приложения
    private settings: {
        mainFileDirectory: string;   // Основная папка (корень)
        taskFileDirectory: string;   // Папка, где лежит файл с задачами
        taskFilePath: string;        // Путь к файлу задач
    };

    // Конструктор класса — получает приложение и настройки
    constructor(app: App, settings: { mainFileDirectory: string; taskFileDirectory: string; taskFilePath: string }) {
        this.app = app;
        this.settings = settings;
    }

    // Метод: создать ежедневную секцию задач на сегодня, если её ещё нет
    async createDailySection(): Promise<void> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        let file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        // Если файл задач не существует — создаём его
        if (!file) {
            file = await this.app.vault.create(filePath, "");
            new Notice(`Файл ${this.settings.taskFilePath} создан!`);
        }

        if (file instanceof TFile) {
            const content = await this.app.vault.read(file);
            // Получаем сегодняшнюю дату в формате "17 July 2025"
            const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
            const sectionHeader = `## 📅 ${today}\n- [ ]\n`;

            // Если секция с сегодняшней датой ещё не создана — добавляем
            if (!content.includes(`## 📅 ${today}`)) {
                await this.app.vault.append(file, sectionHeader);
                new Notice(`Секция для ${today} создана!`);
            } else {
                new Notice(`Секция для ${today} уже существует!`);
            }
        }
    }

    // Метод: получить список незавершённых задач на сегодня
    async getTodayTasks(): Promise<string[]> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (file instanceof TFile) {
            const content = await this.app.vault.read(file);
            const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
            const sectionStart = `## 📅 ${today}\n`;

            // Определяем конец секции (следующий заголовок ## 📅)
            const sectionEnd = content.indexOf(`## 📅`, content.indexOf(sectionStart) + 1);
            const sectionContent = sectionEnd === -1 
                ? content.substring(content.indexOf(sectionStart)) 
                : content.substring(content.indexOf(sectionStart), sectionEnd);

            // Фильтруем строки: оставляем только незавершённые задачи (- [ ])
            const tasks = sectionContent.split('\n')
                .filter(line => line.trim().startsWith('- [') && !line.trim().startsWith('- [x]'))
                .map(line => line.trim());

            return tasks;
        }
        return [];
    }

    // Метод: переносит незавершённые задачи со вчера на сегодня
    async migrateUnfinishedTasks(): Promise<void> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (file instanceof TFile) {
            const content = await this.app.vault.read(file);

            // Получаем даты
            const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

            const yesterdaySectionStart = content.indexOf(`## 📅 ${yesterdayStr}\n`);

            if (yesterdaySectionStart !== -1) {
                const yesterdaySectionEnd = content.indexOf(`## 📅`, yesterdaySectionStart + 1);
                const sectionContent = yesterdaySectionEnd === -1
                    ? content.substring(yesterdaySectionStart)
                    : content.substring(yesterdaySectionStart, yesterdaySectionEnd);

                const unfinishedTasks = sectionContent.split('\n')
                    .filter(line => line.trim().startsWith('- [') && !line.trim().startsWith('- [x]'))
                    .map(line => line.trim());

                if (unfinishedTasks.length > 0) {
                    // Создаём секцию на сегодня, если её ещё нет
                    const todaySectionStart = content.indexOf(`## 📅 ${today}\n`);
                    if (todaySectionStart === -1) {
                        await this.createDailySection();
                    }

                    // Добавляем задачи в конец файла
                    await this.app.vault.append(file, unfinishedTasks.join('\n') + '\n');
                    new Notice(`Перенесено ${unfinishedTasks.length} незавершенных задач из ${yesterdayStr}!`);

                    // Удаляем задачи из вчерашней секции
                    const newContent = content.replace(sectionContent, sectionContent.replace(unfinishedTasks.join('\n'), '').trim());
                    await this.app.vault.modify(file, newContent);
                }
            }
        }
    }

    // Метод: добавляет новую задачу в файл
    public async appendTask(taskText: string): Promise<void> {
        const filePath = `${this.settings.mainFileDirectory}/${this.settings.taskFileDirectory}/${this.settings.taskFilePath}`;
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            await this.app.vault.append(file, `- [ ] ${taskText}\n`);
        }
    }
}
