import { TaskItem } from "./types";

const TASK_LINE = /^\s*- \[([ xX])\]\s?(.*)$/;

export function parseTaskItems(body: string): TaskItem[] {
	const tasks: TaskItem[] = [];
	// Split on \r?\n, not just \n: a lone trailing \r left on a line defeats the
	// non-multiline `$` anchor below (`.` and end-of-string `$` both treat \r as
	// a line terminator they can't cross), silently dropping CRLF-authored lines.
	for (const line of body.split(/\r?\n/)) {
		const match = TASK_LINE.exec(line);
		if (!match) {
			continue;
		}
		tasks.push({
			completed: match[1].toLowerCase() === "x",
			text: (match[2] ?? "").trim(),
		});
	}
	return tasks;
}

export function formatTaskLine(task: TaskItem): string {
	return `- [${task.completed ? "x" : " "}] ${task.text}`;
}

export function appendTask(tasks: TaskItem[], text: string): TaskItem[] {
	const trimmed = text.trim();
	if (!trimmed) {
		return tasks;
	}
	return [...tasks, { text: trimmed, completed: false }];
}

/** Toggles the nth task (by array index, not raw line index). No-op if out of range. */
export function toggleTaskAt(tasks: TaskItem[], index: number): TaskItem[] {
	if (index < 0 || index >= tasks.length) {
		return tasks;
	}
	return tasks.map((task, i) => (i === index ? { ...task, completed: !task.completed } : task));
}

/**
 * Unfinished tasks from `yesterday` that aren't already present (by trimmed text)
 * among `todayExisting` - the set that should be copied into today's note.
 */
export function unfinishedTasksToCopy(yesterday: TaskItem[], todayExisting: TaskItem[]): TaskItem[] {
	const unfinished = yesterday.filter((task) => !task.completed);
	const existingTexts = new Set(todayExisting.map((task) => task.text.trim()));
	return unfinished.filter((task) => !existingTexts.has(task.text.trim()));
}
