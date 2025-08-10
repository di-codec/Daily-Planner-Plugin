# Obsidian Plugin: Daily Planner

## 🧩 Description

**Daily Planner** is a plugin for [Obsidian](https://obsidian.md) that helps track daily tasks and workouts. It provides an intuitive interface for data input, visualizes metrics using charts, and automates daily note and summary management.

---

## ⚙️ Core Features

### 🏋️ Health Tracker

- Log gym sessions with:
  - Targeted muscle groups.
  - List of exercises.
- Automatically generate:
  - Bar charts showing workout frequency.
  - Pie charts showing body part focus.
- Weekly and monthly stats.
- Data stored in `Health Tracker.md`.

### ✅ Self Development

- Manage daily task lists in Markdown.
- Automatically migrate unfinished tasks to the next day.
- Track task completion:
  - Daily and weekly completion percentages.
- Visual progress displayed through charts.

### 📊 Summary Dashboard

- Aggregates data into a single `Summary.md` file:
  - Workout and task charts.
  - Overall stats overview.

---

## 📁 Folder Structure

```txt
Daily Planner
	⌊ Daily Notes
		⌊ 17 July 2025.md
		  18 July 2025.md
		  19 July 2025.md
		  20 July 2025.md
		  21 July 2025.md
		  22 July 2025.md
		  23 July 2025.md
		  Note.md
	⌊ Health Tracker
		⌊ July 2025
		      ⌊ 1 - 6.md
		  	  ⌊ 7 - 13.md
		  	  ⌊ 14 - 20.md
		  	  ⌊ 21 - 27.md
		  	  ⌊ 28 - 21.md
	⌊ Summary.md

```

---

## 🛠️ Technologies Used

- **Obsidian API** — plugin integration with the Obsidian environment.
- **TypeScript** — main development language.
- **Chart.js** — data visualization.
- **moment.js** — date handling.
- **Markdown + YAML** — data storage format.

---

## 📖 Usage Example

<!-- Add usage instructions here -->

---

## 🧾 Data Formats

### Example `Daily Notes/17 July 2025.md`

```markdown
# 17 July 2025

## Tasks
- [x] Read 10 pages
- [ ] Write a report

## Statistics
- Completed: 1/2 (50%)

# Example `Health Tracker/July 2025/ 1 - 6.md.md`

```txt
# Health Tracker

## Workout Logs
- **Date**: 24 July 2025
  - Body Parts: Legs, Core
  - Exercises: Squats (3x12), Plank (3x30s)

## Statistics
- Sessions this week: 2
- Sessions this month: 5
```
# 🔄 Automation
- Daily file creation.

- Task migration.

- Automatic chart and metric updates.

- Folder and file structure generation.

# 📤 Additional Features
- Export stats to CSV.

- Responsive chart design.

- Editable list of body parts and exercises.

# 📁 Project Structure

```kotlin
src/
├── main.ts          // Plugin core logic
├── ui/              // UI components
├── data/            // Markdown file handling
├── charts/          // Chart rendering
├── styles/          // Plugin styling
├── utils/           // Utility functions
manifest.json        // Plugin manifest
```


## To-do list:

- [x] откомментировать selfDevModel.ts
- [x] обновить selfDevModel:
  - [x] удалить файл `"Self Development Records.md"` 
  - [x] поменять `"Self Development Records.md"` на самообновляющие файлы с датами
  - [x] пофиксить дублирование задач
- [x] need to add explanation for Node.md file
- [x] solve in self development the tasks duplication
- [x] задокументировать идею этого проекта
- [ ] отредактировать "DOCUMENTATION.md" файл
- [x] Health Tracker:
	- [x] датированные директории 
	- [x] датированные документы
	- [x] имплиментация недельного календаря	
- [ ] Summary Function:
