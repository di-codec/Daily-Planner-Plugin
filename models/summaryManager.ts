import { App, TFile, TFolder, Vault, normalizePath } from "obsidian";
import { ensureFoldersExist } from "../utils/utils";



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
            const habitData = await this.aggregateLatestWeekData();
            const chartContent = this.generateObsidianChart(habitData);
            
            // Ensure parent folders exist before writing the file
            await ensureFoldersExist(this.app, summaryPath);
            
            const summaryContent = `# Health Tracker Summary\n\n${chartContent}\n`;
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
     * Find the most recent weekly tracker file under Daily Planner/Health Tracker
     */
    private findLatestWeekFile(): TFile | null {
        const healthTrackerPath = "Daily Planner/Health Tracker";
        const root = this.app.vault.getAbstractFileByPath(healthTrackerPath);
        if (!(root instanceof TFolder)) return null;

        let newest: TFile | null = null;
        let newestMtime = 0;

        for (const month of root.children) {
            if (month instanceof TFolder) {
                for (const child of month.children) {
                    if (child instanceof TFile && child.extension === 'md') {
                        const mtime = child.stat?.mtime ?? 0;
                        if (mtime > newestMtime) {
                            newestMtime = mtime;
                            newest = child;
                        }
                    }
                }
            }
        }
        return newest;
    }

    /**
     * Aggregate data from the latest weekly tracker file only
     */
    private async aggregateLatestWeekData(): Promise<{ [muscleGroup: string]: number[] }> {
        const habitData: { [muscleGroup: string]: number[] } = {};
        MUSCLE_GROUPS.forEach(group => {
            habitData[group] = new Array(7).fill(0);
        });

        const latest = this.findLatestWeekFile();
        if (!latest) {
            console.warn('No weekly tracker files found under Daily Planner/Health Tracker');
            return habitData;
        }

        try {
            const content = await this.app.vault.read(latest);
            const weekData = this.parseMarkdownTable(content);
            MUSCLE_GROUPS.forEach(group => {
                for (let i = 0; i < 7; i++) {
                    habitData[group][i] = weekData[group]?.[i] || 0;
                }
            });
        } catch (err) {
            console.error('Error reading latest week file:', latest.path, err);
        }

        return habitData;
    }

    /**
     * Generate HTML chart for external viewing
     */
    async generateHtmlChartFile(summaryPath: string = "Daily Planner/Chart.html"): Promise<void> {
        try {
            const habitData = await this.aggregateAllTrackerData();
            await this.generateHtmlChart(habitData, summaryPath);
        } catch (error) {
            console.error('Error generating HTML chart:', error);
        }
    }

    /**
     * Generate a test summary with sample data for demonstration
     */
    async generateTestSummary(summaryPath: string = "Daily Planner/Test Summary.md"): Promise<void> {
        // Sample data matching your example
        const testData = {
            "Glutes": [1, 0, 1, 0, 1, 1, 0],
            "Legs": [1, 1, 0, 1, 1, 1, 1],
            "Back": [0, 1, 1, 1, 1, 0, 1],
            "Brists": [1, 1, 1, 0, 1, 1, 1],
            "Shoulders": [1, 0, 1, 1, 0, 1, 1],
            "Jogging": [1, 1, 1, 1, 1, 1, 0],
            "Yoga": [0, 0, 0, 1, 0, 0, 0]
        };

        const chartContent = this.generateObsidianChart(testData);
        
        // Ensure parent folders exist before writing the file
        await ensureFoldersExist(this.app, summaryPath);
        
        const summaryContent = `# Health Tracker Test Summary\n\nThis is a test summary with sample data.\n\n${chartContent}\n`;
        await this.app.vault.adapter.write(normalizePath(summaryPath), summaryContent);
        console.log(`Test summary generated at: ${summaryPath}`);
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
        const chartContent = this.generateObsidianChart(habitData);

        // Ensure parent folders exist before writing the file
        await ensureFoldersExist(this.app, summaryPath);

        const summaryContent = `# Health Tracker Summary\n\n${chartContent}\n`;
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
                        // Count completed habits - check for checked checkboxes
                        if (cell.includes('checked') || cell.includes('☑️')) {
                            habitData[muscleGroup][dayIndex] = 1;
                        } else {
                            habitData[muscleGroup][dayIndex] = 0;
                        }
                    }
                }
            }
        }

        return habitData;
    }

    /**
     * Generate Obsidian-compatible chart visualization using Mermaid or ASCII art
     * This method creates a chart that works within Obsidian's markdown rendering
     */
    private generateObsidianChart(habitData: { [muscleGroup: string]: number[] }): string {
        // Debug: Log the data being processed
        console.log('Generating Obsidian chart with data:', JSON.stringify(habitData, null, 2));
        
        // Create a Mermaid chart that works in Obsidian
        const mermaidChart = this.generateMermaidChart(habitData);
        
        // Create a text-based summary table for better compatibility
        const summaryTable = this.generateSummaryTable(habitData);
        
        // Create a visual representation using ASCII art
        const asciiChart = this.generateAsciiChart(habitData);
        
        return `${mermaidChart}\n\n${summaryTable}\n\n${asciiChart}`;
    }

    /**
     * Generate Mermaid chart for Obsidian compatibility
     */
    private generateMermaidChart(habitData: { [muscleGroup: string]: number[] }): string {
        let mermaidCode = '```mermaid\n';
        mermaidCode += 'xychart-beta\n';
        mermaidCode += '    title "Weekly Health Habits Summary"\n';
        mermaidCode += '    x-axis [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]\n';
        mermaidCode += '    y-axis "Number of Exercises" 0 --> 5\n';
        
        // Add data series for each muscle group
        MUSCLE_GROUPS.forEach((group) => {
            const data = habitData[group] || new Array(7).fill(0);
            
            mermaidCode += `    bar [${data.join(', ')}] ::${group}\n`;
        });
        
        mermaidCode += '```';
        
        return mermaidCode;
    }

    /**
     * Generate a summary table showing the data
     */
    private generateSummaryTable(habitData: { [muscleGroup: string]: number[] }): string {
        let table = '## Weekly Exercise Summary\n\n';
        table += '| Muscle Group | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday | Total |\n';
        table += '|-------------|' + '------|'.repeat(7) + '-------|\n';
        
        let weeklyTotals: { [group: string]: number } = {};
        
        MUSCLE_GROUPS.forEach(group => {
            const data = habitData[group] || new Array(7).fill(0);
            const total = data.reduce((sum, val) => sum + val, 0);
            weeklyTotals[group] = total;
            
            table += `| **${group}** | ${data.map(val => val > 0 ? `**${val}**` : '0').join(' | ')} | **${total}** |\n`;
        });
        
        // Add total row
        const grandTotal = Object.values(weeklyTotals).reduce((sum, val) => sum + val, 0);
        table += '| **TOTAL** |' + '------|'.repeat(7) + ` **${grandTotal}** |\n`;
        
        return table;
    }

    /**
     * Generate ASCII art chart for visual representation
     */
    private generateAsciiChart(habitData: { [muscleGroup: string]: number[] }): string {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const maxValue = 5; // Maximum exercises per day
        
        let asciiChart = '## Visual Chart Representation\n\n';
        asciiChart += 'Exercises per day (0-5):\n\n';
        asciiChart += 'Day:    ' + days.map(day => day.padStart(4)).join('\t') + '\n';
        asciiChart += 'Level:  ' + '----'.repeat(11) + '\n\n';
        
        // Create stacked bar representation
        for (let level = maxValue; level > 0; level--) {
            let row = `Level ${level}: `;
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                let dayTotal = 0;
                MUSCLE_GROUPS.forEach(group => {
                    const data = habitData[group] || new Array(7).fill(0);
                    dayTotal += data[dayIndex] || 0;
                });
                // Cap to display max range (0-5) so columns are not always fully filled
                const capped = Math.min(dayTotal, maxValue);
                if (capped >= level) {
                    row += ' ██ ';
                    // row += ' <span style="color: #de1818">████ ';
                } else {
                    row += '    ';
                }
            }
            asciiChart += row + '\n';
        }
        
        asciiChart += 'Level:  ' + '----'.repeat(11) + '\n';
        asciiChart += 'Day:    ' + days.map(day => day.padStart(4)).join('\t') + '\n\n';
        
        // Add legend
        asciiChart += 'Legend:\n';
        MUSCLE_GROUPS.forEach(group => {
            const color = MUSCLE_COLORS[group as keyof typeof MUSCLE_COLORS];
            const total = (habitData[group] || new Array(7).fill(0)).reduce((sum, val) => sum + val, 0);
            asciiChart += `• ${group}: ${total} exercises this week\n`;
        });
        
        // asciiChart += '```\n';
        
        return asciiChart;
    }

    /**
     * Generate HTML file with Chart.js chart for external viewing
     * This creates a standalone HTML file that can be opened in a browser
     */
    
    async generateHtmlChart(habitData: { [muscleGroup: string]: number[] }, outputPath: string = "Daily Planner/Chart.html"): Promise<void> {
        const chartHtml = this.generateChartJsChart(habitData);
        
        // Ensure parent folders exist
        await ensureFoldersExist(this.app, outputPath);
        
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Tracker Chart</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: linear-gradient(135deg,rgb(250, 245, 245) 0%, #c3cfe2 100%);
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #2c3e50; 
            text-align: center; 
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏋️ Health Tracker Weekly Summary</h1>
        ${chartHtml}
    </div>
</body>
</html>`;
        
        await this.app.vault.adapter.write(normalizePath(outputPath), htmlContent);
        console.log(`HTML chart generated at: ${outputPath}`);
    }

    /**
     * Generate Chart.js chart (kept for compatibility, but not recommended for Obsidian)
     */
    private generateChartJsChart(habitData: { [muscleGroup: string]: number[] }): string {
        // Debug: Log the data being processed
        console.log(`Gluetes${JSON.stringify(habitData.data[0], null, 2)}`)
        console.log('Generating Chart.js chart with data:', JSON.stringify(habitData, null, 2));
        
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
                        text: 'Weekly Health Habits Summary',
                        font: {
                            size: 20,
                            weight: 'bold',
                            family: 'Arial, sans-serif'
                        },
                        color: '#2c3e50',
                        padding: 20
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#fff',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Days of Week',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#34495e'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Number of Completed Exercises',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#34495e'
                        },
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#7f8c8d'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        };
        // console.log(`Gluetes${JSON.stringify(chartConfig.data.datasets[0].data, null, 2)}`); // TODO: remove this
        // console.log(`Legs${JSON.stringify(chartConfig.data.datasets[1].data, null, 2)}`); // TODO: remove this
        // console.log(`Back${JSON.stringify(chartConfig.data.datasets[2].data, null, 2)}`); // TODO: remove this
        // console.log(`Brists${JSON.stringify(chartConfig.data.datasets[3].data, null, 2)}`); // TODO: remove this
        // console.log(`Shoulders${JSON.stringify(chartConfig.data.datasets[4].data, null, 2)}`); // TODO: remove this
        // console.log(`Jogging${JSON.stringify(chartConfig.data.datasets[5].data, null, 2)}`); // TODO: remove this
        console.log(`Yoga${JSON.stringify(chartConfig.data.datasets, null, 2)}`); // TODO: remove this
        return `
<div style="width: 100%; height: 600px; position: relative; margin: 20px 0; padding: 20px; border-radius: 10px; background: linear-gradient(135deg,rgb(40, 118, 235) 0%, #c3cfe2 100%);">
    <canvas id="habitChart"></canvas>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const ctx = document.getElementById('habitChart');
        if (ctx) {
            new Chart(ctx, ${JSON.stringify(chartConfig, null, 2)});
        }
    });
</script>
        `.trim();
    }
}
