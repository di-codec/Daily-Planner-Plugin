# Daily Planner Obsidian Plugin Documentation

Welcome to the documentation for the Daily Planner Obsidian plugin! This plugin helps users manage tasks, track health habits (e.g., workouts), and generate weekly summaries with visualizations. It automates file creation, task migration, and reporting in your Obsidian vault.
The plugin is built in TypeScript and integrates with Obsidian's API to create structured folders, daily/weekly files, and interactive elements like checkboxes and stacked bar charts.

## Table of Contents

- Overview
- Features
- Installation
- Usage

	- Ribbon Icon and Commands
	- Folder Structure
	- Tasks
	- Health Tracker
	- Weekly Summaries
	- Charts and Visualizations


- Configuration
- Code Structure
- Troubleshooting
- Contributing
- License

## Overview
This plugin creates a structured system in your Obsidian vault under the "Daily Planner" folder. It includes:

- **Tasks:** Daily task lists with automatic migration of unfinished tasks.
- **Health Tracker:** Weekly tables for tracking habits like workouts, with checkboxes (requires "Markdown Table Checkboxes" plugin for full interactivity).
- **Summaries:** Weekly overviews with progress bars, task statistics, and stacked bar charts for habits.

The plugin uses Obsidian's markdown features for checklists and custom code blocks for charts. It ensures folders are created dynamically and handles date-based file naming.
Screenshots of example outputs:

- **Health Tracker Summary:** A stacked bar chart showing completed habits per day.
- **Task Summary:** Progress bar and stats for completed tasks.
- **Health Tracker Table:** Weekly grid with checkboxes for habits.
- **Tasks List:** Daily checklist of tasks.

## Features

- **Automatic File Creation:** Creates daily files for tasks and weekly files for health tracking.
- **Task Migration:** Moves unfinished tasks from yesterday to today's file.
- **Habit Tracking:** Weekly tables with dynamic muscle groups/habits (inherits from previous weeks or uses defaults), requiring "Markdown Table Checkboxes" for interactive checkboxes.
- **Summaries and Stats:** Generates a "Summary.md" file with:

	- Task completion percentage and averages.
	- Stacked bar charts for habit completion.


- **Custom Charts:** Renders stacked bar charts from YAML code blocks.
- **Notifications:** Uses Obsidian's Notice system for feedback (e.g., "File created!").
- **Dynamic Inheritance:** Health tracker pulls muscle groups from the previous week's file.
- **No External Dependencies:** Relies on Obsidian's API and built-in libraries like Chart.js (imported in `stacked-bar-chart.ts`), except for the "Markdown Table Checkboxes" plugin.

## Installation

1. Download the Plugin:

	- Clone or download the repository to your local machine.
	- Copy the plugin files (e.g., `main.ts`, `manifest.json`, etc.) to your Obsidian vault's plugins folder: `your-vault/.obsidian/plugins/daily-planner/`.


2. Manifest File:
	- Ensure you have a `manifest.json` file in the plugin folder. Example:

```json
	{
  "id": "daily-planner",
  "name": "Daily Planner",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Manage tasks, health tracking, and summaries in Obsidian.",
  "author": "Diana Percatkina",
  "isDesktopOnly": false
}
```
3. Enable the Plugin:

	- Open Obsidian > Settings > Community Plugins > Browse (if not installed via BRAT).
	- Or use the Beta Reviewers Auto-update Tester (BRAT) plugin to install from GitHub.
	- Enable "Daily Planner" in the plugin list.

5. Install Required Plugin:

	- Install the "Markdown Table Checkboxes" plugin from the Obsidian Community Plugins to enable interactive checkboxes in the health tracker tables.
	- Navigate to Settings > Community Plugins, search for "Markdown Table Checkboxes", install, and enable it.

5. Build (if developing):

	- Install dependencies: `npm install` (requires Node.js).
	- Build: `npm run build`.
	- Reload Obsidian.

## Usage
### Ribbon Icon and Commands

- **Ribbon Icon:** Click the circle icon (added via `addIcon('circle', ...)`) to initialize the plugin. This creates the "Daily Planner" folder structure, migrates tasks, generates health trackers, and updates summaries.
- **Commands** (accessible via Command Palette - Ctrl/Cmd + P):

	- **Add Task:** Creates today's tasks file and lists tasks.
	- **Create Weekly Health Tracker:** Generates the weekly health table (interactive checkboxes require "Markdown Table Checkboxes" plugin).
	- **Create Chart File:** (For testing) Creates a demo stacked bar chart file.

### Folder Structure
The plugin creates the following structure in your vault:

```text
Daily Planner/
├── ✅ Tasks/
│   ├── YYYY Year/
│   │   ├── 📅 Month/
│   │   │   └── 📅 DD Month.md  (Daily task files)
├── ❤️ Health Tracker/
│   ├── 📅 Month/
│   │   └── DD - DD.md  (Weekly habit tables)
└── Summary.md  (Weekly summary with charts and stats)
```

### Tasks

- Daily files are created in `Daily Planner/✅ Tasks/YYYY Year/📅 Month/📅 DD Month.md`.
- Tasks are markdown checklists (e.g.,` - [ ] Task description`).
- Unfinished tasks (`- [ ]`) migrate automatically to the next day when the ribbon icon is clicked.
- Add tasks programmatically via `appendSelfDevelopmentTask(app, file, task)` from `selfDev.ts`.

Example file content:

```text
# ✅ Tasks - DD/MM/YYYY

- [x] test-1
- [x] test-2
- [ ] test-3
```

### Health Tracker

- Weekly files are created in `Daily Planner/❤️ Health Tracker/📅 Month/DD - DD.md`.
- Table format with checkboxes for habits (e.g., Glutes, Legs). Interactive checkboxes require the "Markdown Table Checkboxes" plugin.
- Habits inherit from the previous week's file or use defaults: ["Glutes", "Legs", "Back", "Brists", "Shoulders", "Jogging", "Yoga"].
- Checkboxes are HTML inputs for interactivity, fully functional with the required plugin.

Example table (as shown in the screenshot):
| Weekdays           | Mo                                           | Tu                                           | We                                           | Th                                           | Fr                                           | Sa                                           | Su                                           |
| ------------------ | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Daily Habits Track | 11 Aug                                       | 12 Aug                                       | 13 Aug                                       | 14 Aug                                       | 15 Aug                                       | 16 Aug                                       | 17 Aug                                       |
| Glutes             | <input type="checkbox" checked id="tWpNt">   | <input type="checkbox" unchecked id="wbLo2"> | <input type="checkbox" checked id="ezean">   | <input type="checkbox" unchecked id="k5r2g"> | <input type="checkbox" unchecked id="x7SpV"> | <input type="checkbox" checked id="tJei9">   | <input type="checkbox" unchecked id="e3Zhm"> |
| Legs               | <input type="checkbox" checked id="jIun4">   | <input type="checkbox" checked id="wU4OO">   | <input type="checkbox" unchecked id="yjOWm"> | <input type="checkbox" checked id="tJIHb">   | <input type="checkbox" unchecked id="bBDnX"> | <input type="checkbox" unchecked id="tKMsv"> | <input type="checkbox" unchecked id="Bk1NQ"> |
| Back               | <input type="checkbox" checked id="xfa5M">   | <input type="checkbox" checked id="LVRuO">   | <input type="checkbox" checked id="KtmgE">   | <input type="checkbox" checked id="rMx10">   | <input type="checkbox" checked id="X3Ltq">   | <input type="checkbox" unchecked id="4auZi"> | <input type="checkbox" unchecked id="cJIT0"> |
| Brists             | <input type="checkbox" unchecked id="skXdN"> | <input type="checkbox" checked id="EQ5UH">   | <input type="checkbox" checked id="cbWnd">   | <input type="checkbox" unchecked id="K6N8h"> | <input type="checkbox" checked id="QeJfj">   | <input type="checkbox" unchecked id="tia6t"> | <input type="checkbox" unchecked id="voXSK"> |
| Shoulders          | <input type="checkbox" unchecked id="YkSii"> | <input type="checkbox" unchecked id="11pQA"> | <input type="checkbox" unchecked id="MHLik"> | <input type="checkbox" checked id="uBKMC">   | <input type="checkbox" unchecked id="vjTQK"> | <input type="checkbox" unchecked id="lgiiQ"> | <input type="checkbox" unchecked id="PATjg"> |
| Jogging            | <input type="checkbox" checked id="TZFGb">   | <input type="checkbox" checked id="DMCgc">   | <input type="checkbox" checked id="UCMAS">   | <input type="checkbox" checked id="3xqvz">   | <input type="checkbox" unchecked id="x6Cuv"> | <input type="checkbox" unchecked id="qUjY7"> | <input type="checkbox" unchecked id="G4jbG"> |
| Yoga               | <input type="checkbox" unchecked id="wKWfw"> | <input type="checkbox" checked id="jgDqz">   | <input type="checkbox" unchecked id="dqU6v"> | <input type="checkbox" unchecked id="GZP20"> | <input type="checkbox" checked id="cyHdP">   | <input type="checkbox" checked id="V6PxT">   | <input type="checkbox" checked id="mOHuh">   |
