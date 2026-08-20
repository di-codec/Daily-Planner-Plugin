import Chart, { ChartItem } from "chart.js/auto";
import * as yaml from "js-yaml";
import { habitColor } from "../core/habitColors";

export interface HabitChartData {
	labels: string[];
	datasets: {
		label: string;
		data: number[];
		backgroundColor: string;
	}[];
}

export class TableChart {
	/** Build a chart from YAML (or use demo data) */
	public renderChart(source: string, el: HTMLElement) {
		const container = el.createEl("div", { cls: "stacked-bar-chart-container" });
		const canvas = container.createEl("canvas");
		const ctx = canvas.getContext("2d");

		let chartData: HabitChartData;
		try {
			const parsed = yaml.load(source) as HabitChartData;
			chartData = parsed && parsed.labels && parsed.datasets ? parsed : this.getDemoData();
		} catch {
			chartData = this.getDemoData();
		}

		if (!ctx) {
			return;
		}
		new Chart(ctx as ChartItem, {
			type: "bar",
			data: chartData,
			options: {
				plugins: {
					title: {
						display: true,
						text: "Completed Habits Per Day",
						font: { size: 18, weight: "bold" },
					},
				},
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						stacked: true,
						title: { display: true, text: "Days of Week" },
					},
					y: {
						stacked: true,
						beginAtZero: true,
						title: { display: true, text: "Number of Exercises" },
					},
				},
			},
		});
	}

	/** Demo data (if YAML is empty or has an error). Colors match the week tracker's habit palette. */
	private getDemoData(): HabitChartData {
		const demo: [string, number[]][] = [
			["Glutes", [1, 0, 1, 0, 1, 1, 0]],
			["Legs", [1, 1, 0, 1, 1, 1, 1]],
			["Wrists", [1, 1, 1, 0, 1, 1, 1]],
			["Back", [0, 1, 1, 1, 1, 0, 1]],
			["Shoulders", [1, 0, 1, 1, 0, 1, 1]],
			["Jogging", [1, 1, 1, 1, 1, 1, 0]],
			["Yoga", [0, 0, 0, 1, 0, 0, 0]],
		];
		return {
			labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
			datasets: demo.map(([label, data]) => ({ label, data, backgroundColor: habitColor(label) })),
		};
	}
}
