import { App, Notice, TFile, TFolder } from "obsidian";

export class HealthTrackerManager {
    private app: App;
    private settings: {
        mainFileDirectory: string;
        healthTrackerFileDirectory: string;
    };

    constructor(app: App, settings: { mainFileDirectory: string; healthTrackerFileDirectory: string }) {
        this.app = app;
        this.settings = settings;
    }

    // Get the folder name by month
    private getFileNameByMonth(date: Date): string {
        const monthData = date.toLocaleDateString("en-GB", { month: "long" });
        return `📅 ${monthData}`;
    }

    // Get the file name by week
    private getFileNameByWeek(date: Date): string {
        const startOfWeek = this.getStartOfWeek(date);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startDate = startOfWeek.getDate();
        const endDate = endOfWeek.getDate();
        const startMonth = startOfWeek.toLocaleDateString("en-GB", { month: "short" });
        const endMonth = endOfWeek.toLocaleDateString("en-GB", { month: "short" });

        // Include month if week spans two months
        return startMonth === endMonth
            ? `${startDate} - ${endDate}.md`
            : `${startDate} ${startMonth} - ${endDate} ${endMonth}.md`;
    }

    // Get the full file path by date
    public getFilePathByDate(date: Date): string {
        return `${this.settings.mainFileDirectory}/${this.settings.healthTrackerFileDirectory}/${this.getFileNameByMonth(date)}/${this.getFileNameByWeek(date)}`;
    }

    // Calculate the start of the week (Monday)
    private getStartOfWeek(date: Date): Date {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1, ...
        const offset = day === 0 ? 6 : day - 1; // Adjust for Monday start
        startOfWeek.setDate(startOfWeek.getDate() - offset);
        startOfWeek.setHours(0, 0, 0, 0); // Reset time to midnight
        return startOfWeek;
    }

    // Ensure all parent folders exist
    private async ensureFoldersExist(filePath: string): Promise<void> {
        const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));
        let folder = this.app.vault.getAbstractFileByPath(folderPath) as TFolder | null;

        if (!folder) {
            try {
                await this.app.vault.createFolder(folderPath);
                new Notice(`Created folder: ${folderPath}`);
            } catch (error) {
                console.error(`Failed to create folder ${folderPath}:`, error);
                throw new Error(`Could not create folder ${folderPath}`);
            }
        }
    }

    // Create a new weekly health tracker file if it doesn't exist
    async createWeeklyFile(): Promise<void> {
        const today = new Date();
        const filePath = this.getFilePathByDate(today);
        let file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

        if (file) {
            new Notice(`File "${file.name}" already exists!`);
            return;
        }

        // Ensure parent folders exist
        await this.ensureFoldersExist(filePath);

        const startOfWeek = this.getStartOfWeek(today);
        const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        const dates: { day: number; month: string }[] = [];

        // Collect dates and months for the week
        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            dates.push({
                day: current.getDate(),
                month: current.toLocaleDateString("en-GB", { month: "short" }),
            });
        }

        const muscleGroups = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];

        // Build table content
        let content = `# Health Tracker - ${today.toLocaleDateString("en-GB")}\n\n`;
        content += "| Weekdays           | " + daysOfWeek.join(" | ") + " |\n";
        content += "| ------------------ |" + " --- |".repeat(7) + "\n";
        content += "| Daily Habits Track | " + dates.map(d => `${d.day} ${d.month}`).join(" | ") + " |\n";

        // id Generator
        function generateId(): string {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 5; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        for (const group of muscleGroups) {
            content += `| ${group.padEnd(18)} | ` + daysOfWeek.map(() => `<input type="checkbox" unchecked id="${generateId()}">`).join(" | ") + " |\n";
        }

        try {
            file = await this.app.vault.create(filePath, content);
            new Notice(`File "${file.name}" created!`);
        } catch (error) {
            console.error(`Failed to create file ${filePath}:`, error);
            new Notice(`Error creating file "${filePath}"`);
        }
    }

    // Get summary of completed activities for the current week
    async getThisWeekSummary(): Promise<string[]> {
        const filePath = this.getFilePathByDate(new Date());
        const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
        const summary: string[] = [];

        if (!file) {
            return ["No health tracker file found for this week."];
        }

        try {
            const content = await this.app.vault.read(file);
            const lines = content.split("\n");
            const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            const muscleGroups = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];

            // Find the table start (after "Daily Habits Track")
            const tableStart = lines.findIndex(line => line.includes("Daily Habits Track"));
            if (tableStart === -1) {
                return ["Table not found in file."];
            }

            // Parse muscle group rows
            for (let i = tableStart + 1; i < lines.length && lines[i].startsWith("|"); i++) {
                const cells = lines[i].split("|").map(cell => cell.trim());
                if (cells.length < 9) continue; // Skip invalid rows

                const group = cells[1];
                if (!muscleGroups.includes(group.trim())) continue;

                // Check each day (columns 2 to 8)
                for (let j = 2; j <= 8; j++) {
                    if (cells[j].includes("- [x]")) {
                        summary.push(`${group.trim()} on ${daysOfWeek[j - 2]}`);
                    }
                }
            }

            return summary.length > 0 ? summary : ["No completed activities this week."];
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return ["Error retrieving summary."];
        }
    }
}