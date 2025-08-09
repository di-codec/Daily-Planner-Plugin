import { App, TFile, TFolder, Vault, normalizePath } from "obsidian";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MUSCLE_GROUPS = ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"];
const MUSCLE_COLORS = {
    "Glutes": "#FF69B4",    // Pink
    "Legs": "#4169E1",      // Blue
    "Back": "#FFD700",      // Yellow
    "Brists": "#20B2AA",    // Teal
    "Shoulders": "#9370DB", // Purple
    "Jogging": "#FFA500",   // Orange
    "Yoga": "#808080"       // Grey
};

export class SummaryManager {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Generate summary from all tracker files in Health Tracker directories
     * @param summaryPath Path where to save the summary file
     */
    async generateWeeklySummary(summaryPath: string = "Daily Planner/Summary.md"): Promise<void> {
        try {
            const habitData = await this.aggregateAllTrackerData();
            const chartHtml = this.generateChartJsChart(habitData);
            
            const summaryContent = `# Health Tracker Summary\n\n${chartHtml}\n`;
            await this.app.vault.adapter.write(normalizePath(summaryPath), summaryContent);
            console.log(`Summary generated at: ${summaryPath}`);
        } catch (error) {
            console.error('Error generating summary:', error);
        }
    }

    /**
     * Scan all Health Tracker directories and aggregate habit data by muscle group
     */
    private async aggregateAllTrackerData(): Promise<{ [muscleGroup: string]: number[] }> {
        // Initialize data structure: each muscle group has an array of 7 days
        const habitData: { [muscleGroup: string]: number[] } = {};
        MUSCLE_GROUPS.forEach(group => {
            habitData[group] = new Array(7).fill(0);
        });

        const healthTrackerPath = "Daily Planner/Health Tracker";
        
        const healthTrackerFolder = this.app.vault.getAbstractFileByPath(healthTrackerPath);
        if (!(healthTrackerFolder instanceof TFolder)) {
            console.warn(`Health Tracker folder not found at: ${healthTrackerPath}`);
            return habitData;
        }

        // Iterate through all month folders
        for (const monthFolder of healthTrackerFolder.children) {
            if (monthFolder instanceof TFolder) {
                // Process each week file in the month folder
                for (const weekFile of monthFolder.children) {
                    if (weekFile instanceof TFile && weekFile.extension === 'md') {
                        try {
                            const content = await this.app.vault.read(weekFile);
                            const weekHabitData = this.parseMarkdownTable(content);
                            
                            // Add to total counts for each muscle group
                            for (const muscleGroup of MUSCLE_GROUPS) {
                                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                                    habitData[muscleGroup][dayIndex] += weekHabitData[muscleGroup]?.[dayIndex] || 0;
                                }
                            }
                        } catch (error) {
                            console.error(`Error reading file ${weekFile.path}:`, error);
                        }
                    }
                }
            }
        }

        return habitData;
    }

    /**
     * Generate summary from a single tracker file (legacy method, kept for compatibility)
     */
    async generateSummary(trackerFilePath: string, summaryPath: string = "Daily Planner/Summary.md"): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(trackerFilePath);
        if (!(file instanceof TFile)) {
            console.warn(`Health Tracker file not found at path: ${trackerFilePath}`);
            return;
        }

        const content = await this.app.vault.read(file);
        const habitData = this.parseMarkdownTable(content);
        const chartHtml = this.generateChartJsChart(habitData);

        const summaryContent = `# Health Tracker Summary\n\n${chartHtml}\n`;
        await this.app.vault.adapter.write(normalizePath(summaryPath), summaryContent);
    }

    /**
     * Parse markdown table and count completed habits (☑️) for each muscle group and day
     */
    private parseMarkdownTable(content: string): { [muscleGroup: string]: number[] } {
        const lines = content.split("\n");
        const habitData: { [muscleGroup: string]: number[] } = {};
        
        // Initialize data structure
        MUSCLE_GROUPS.forEach(group => {
            habitData[group] = new Array(7).fill(0);
        });
        
        // Find table rows containing habit data
        let inTable = false;
        for (const line of lines) {
            // Skip empty lines and headers
            if (!line.trim() || line.includes('Weekdays') || line.includes('---') || line.includes('Daily Habits Track')) {
                if (line.includes('Weekdays')) {
                    inTable = true;
                }
                continue;
            }
            
            // Process habit rows
            if (inTable && line.includes('|')) {
                const columns = line.split('|');
                
                // Skip if not enough columns (should have at least 9: empty + habit name + 7 days)
                if (columns.length < 9) continue;
                
                // Extract muscle group name (second column)
                const muscleGroup = columns[1].trim();
                
                // Only process known muscle groups
                if (!MUSCLE_GROUPS.includes(muscleGroup)) continue;
                
                // Check days columns (indices 2-8 for Mo-Su)
                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                    const cellIndex = dayIndex + 2; // Skip empty first column and habit name column
                    if (cellIndex < columns.length) {
                        const cell = columns[cellIndex].trim();
                        // Count completed habits (☑️ emoji or HTML checked)
                        if (cell.includes('☑️') || cell.includes('unchecked')) {
                            habitData[muscleGroup][dayIndex] = 0;
                        } else {
                            habitData[muscleGroup][dayIndex]++;
                        }
                    }
                }
            }
        }

        return habitData;
    }

    /**
     * Generate Chart.js stacked bar chart showing completed habits per muscle group per day
     */
    private generateChartJsChart(habitData: { [muscleGroup: string]: number[] }): string {
        const datasets = MUSCLE_GROUPS.map(muscleGroup => ({
            label: muscleGroup,
            data: habitData[muscleGroup] || new Array(7).fill(0),
            backgroundColor: MUSCLE_COLORS[muscleGroup as keyof typeof MUSCLE_COLORS],
            borderColor: MUSCLE_COLORS[muscleGroup as keyof typeof MUSCLE_COLORS],
            borderWidth: 1
        }));

        const chartConfig = {
            type: 'bar',
            data: {
                labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Completed Habits Per Day',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Days of Week'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Number of Exercises'
                        },
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        };
        console.log(`${JSON.stringify(chartConfig.data.datasets[0].data, null, 2)}`); // TODO: remove this
        return `
<div style="width: 100%; height: 500px; position: relative;">
    <canvas id="habitChart"></canvas>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
    const ctx = document.getElementById('habitChart').getContext('2d');
    new Chart(ctx, ${JSON.stringify(chartConfig, null, 2)});
</script>
        `.trim();
    }
}
