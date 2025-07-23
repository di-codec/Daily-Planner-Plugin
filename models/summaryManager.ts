import { App, TFile, Notice } from "obsidian";

export class SummaryManager {
    private app: App;
    private summaryPath = "Daily Planner/Summary.md";
    private selfDevDir = "Daily Planner/Self Development";
    private healthPath = "Daily Planner/Health Tracker.md";
    private jobPath = "Daily Planner/Job Application Tracker.md";

    constructor(app: App) {
        this.app = app;
    }

    async generateSummary() {
        // Собираем последние заметки по Self Development
        const selfDevNotes = await this.getRecentSelfDevNotes(5);

        // Читаем Health и Job Application Tracker
        const healthContent = await this.readFile(this.healthPath);
        const jobContent = await this.readFile(this.jobPath);

        // Генерируем markdown
        const summary = `# Health Tracker

## Habit tracker calendar
\`\`\`mermaid
%% Здесь можно вставить mermaid-heatmap или gantt, если поддерживается
gantt
    dateFormat  YYYY-MM-DD
    axisFormat  %b
    section Exercise
    Tue  :done, 2024-01-02, 1d
    Thu  :done, 2024-01-04, 1d
    Sat  :done, 2024-01-06, 1d
\`\`\`

# Self Development

${selfDevNotes}

# Today Tasks

${jobContent ? jobContent : "No data on tasks."}
`;

        // Записываем в Summary.md
        let file = this.app.vault.getAbstractFileByPath(this.summaryPath) as TFile | null;
        if (!file) {
            await this.app.vault.create(this.summaryPath, summary);
            new Notice("Summary.md created!");
        } else {
            await this.app.vault.modify(file, summary);
            new Notice("Summary.md updated!");
        }
    }

    // Получить последние N заметок из Self Development
    private async getRecentSelfDevNotes(n: number): Promise<string> {
        const folder = this.app.vault.getAbstractFileByPath(this.selfDevDir);
        if (!folder || !("children" in folder)) return "No notes on self-development.";

        // Фильтруем только md-файлы с датой в названии
        const files = (folder.children as TFile[])
            .filter(f => f instanceof TFile && /^\d{1,2} \w+ \d{4}\.md$/.test(f.name))
            .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

        let notes = "";
        for (let i = 0; i < Math.min(n, files.length); i++) {
            const content = await this.app.vault.read(files[i]);
            notes += `## ${files[i].basename}\n${content.split('\n').slice(0, 10).join('\n')}\n\n`;
        }
        return notes || "No notes on self-development.";
    }

    private async readFile(path: string): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(path) as TFile | null;
        if (file) {
            return await this.app.vault.read(file);
        }
        return "";
    }
}