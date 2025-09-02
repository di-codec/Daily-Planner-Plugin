import Chart, { ChartItem } from "chart.js/auto";

const yaml = require("js-yaml");

export interface HabitChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor: string;
    }[];
}

export class TableChart {
    constructor() {}

    /**
     * Build a chart from YAML (or use demo data)
     */
    public renderChart(source: string, el: HTMLElement) {
        const container = el.createEl("div", { cls: "stacked-bar-chart-container" });
        const canvas = container.createEl("canvas");
        const ctx = canvas.getContext("2d");

        let chartData: HabitChartData;

        try {
            const parsed = yaml.load(source) as HabitChartData;
            if (parsed && parsed.labels && parsed.datasets) {
                chartData = parsed;
            } else {
                chartData = this.getDemoData();
            }
        } catch (e) {
            chartData = this.getDemoData();
        }

        if (ctx) {
            new Chart(ctx as ChartItem, { 
                type: "bar",
                data: chartData,
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: "Completed Habits Per Day",
                            font: { size: 18, weight: "bold" }
                        },
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            title: { display: true, text: "Days of Week" }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: { display: true, text: "Number of Exercises" }
                        }
                    }
                }
            });
        }
    }

    /**
     * Demo data (if YAML is empty or has an error)
     */
    private getDemoData(): HabitChartData {
        return {
            labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            datasets: [
                { label: "Glutes", data: [1, 0, 1, 0, 1, 1, 0], backgroundColor: "#ff69b4" },
                { label: "Legs", data: [1, 1, 0, 1, 1, 1, 1], backgroundColor: "#4169e1" },
                { label: "Brists", data: [1, 1, 1, 0, 1, 1, 1], backgroundColor: "#20b2aa" },
                { label: "Back", data: [0, 1, 1, 1, 1, 0, 1], backgroundColor: "#ffd700" },
                { label: "Shoulders", data: [1, 0, 1, 1, 0, 1, 1], backgroundColor: "#9370db" },
                { label: "Jogging", data: [1, 1, 1, 1, 1, 1, 0], backgroundColor: "#ffa500" },
                { label: "Yoga", data: [0, 0, 0, 1, 0, 0, 0], backgroundColor: "#696969" }
            ]
        };
    }

    /**
     * Generate a ready-made Markdown file with demo data
     */
    public generateDemoFileContent(): string {
        return `# 🏋️ Weekly Health Tracker

\`\`\`stacked-bar-chart
labels:
  - Monday
  - Tuesday
  - Wednesday
  - Thursday
  - Friday
  - Saturday
  - Sunday
datasets:
  - label: Glutes
    data: [1, 0, 1, 0, 1, 1, 0]
    backgroundColor: "#ff69b4"
  - label: Legs
    data: [1, 1, 0, 1, 1, 1, 1]
    backgroundColor: "#4169e1"
  - label: Yoga
    data: [0, 0, 0, 1, 0, 0, 0]
    backgroundColor: "#696969"
\`\`\`
`;
    }
}
