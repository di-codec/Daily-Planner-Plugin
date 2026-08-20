import * as yaml from "js-yaml";
import { DailyNoteData } from "./types";
import { formatHabitChecklist, parseHabitChecklist } from "./habits";
import { formatScheduleChecklist, normalizeSchedule, parseScheduleChecklist } from "./schedule";
import { formatTaskLine, parseTaskItems } from "./tasks";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const SECTION_RE = /^## (.*)$/gm;

/**
 * Sentinels use Obsidian's native %% %% comment syntax, not an HTML comment -
 * HTML comments only stay hidden in Reading view, but %% %% is guaranteed
 * invisible in Live Preview too, which is where users actually edit.
 *
 * Section identity is decided purely by sentinel presence, never by heading
 * text, so renaming the habits section title (a user setting) or reordering
 * sections never breaks re-parsing an already-migrated file.
 *
 * Known, accepted limitation: if a user manually deletes a sentinel line, that
 * section stops being recognized and falls into `extra` - the next write then
 * creates a fresh empty managed section alongside the orphaned one rather than
 * reusing it. Not solved here; left as documented behavior, not an oversight.
 */
const SENTINEL = {
	tasks: "%%dp:tasks%%",
	habits: "%%dp:habits%%",
	schedule: "%%dp:schedule%%",
} as const;

interface RawSection {
	raw: string;
	content: string;
}

function leadingContent(content: string): string {
	return content.replace(/^\n+/, "");
}

function hasSentinel(section: RawSection, sentinel: string): boolean {
	return leadingContent(section.content).startsWith(sentinel);
}

function stripSentinel(content: string, sentinel: string): string {
	const trimmed = leadingContent(content);
	if (!trimmed.startsWith(sentinel)) {
		return content;
	}
	return trimmed.slice(sentinel.length).replace(/^\r?\n/, "");
}

function splitSections(content: string): { preamble: string; sections: RawSection[] } {
	const matches = [...content.matchAll(SECTION_RE)];
	if (matches.length === 0) {
		return { preamble: content, sections: [] };
	}
	const preamble = content.slice(0, matches[0].index as number);
	const sections: RawSection[] = matches.map((match, i) => {
		const start = match.index as number;
		const end = i + 1 < matches.length ? (matches[i + 1].index as number) : content.length;
		const raw = content.slice(start, end);
		const newlineIndex = raw.indexOf("\n");
		const sectionContent = newlineIndex === -1 ? "" : raw.slice(newlineIndex + 1);
		return { raw, content: sectionContent };
	});
	return { preamble, sections };
}

interface ParsedFrontmatter {
	content: string;
	legacyHabits: unknown;
	legacySchedule: unknown;
	extraFrontmatter: Record<string, unknown>;
}

function parseFrontmatter(raw: string): ParsedFrontmatter {
	const match = FRONTMATTER_RE.exec(raw);
	if (!match) {
		return { content: raw, legacyHabits: undefined, legacySchedule: undefined, extraFrontmatter: {} };
	}
	const content = raw.slice(match[0].length);
	let parsed: unknown;
	try {
		parsed = yaml.load(match[1]);
	} catch {
		parsed = null;
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return { content, legacyHabits: undefined, legacySchedule: undefined, extraFrontmatter: {} };
	}
	const record = { ...(parsed as Record<string, unknown>) };
	const legacyHabits = record["habits"];
	const legacySchedule = record["schedule"];
	delete record["habits"];
	delete record["schedule"];
	return { content, legacyHabits, legacySchedule, extraFrontmatter: record };
}

function coerceLegacyHabits(raw: unknown): Record<string, boolean> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {};
	}
	const habits: Record<string, boolean> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		habits[key] = Boolean(value);
	}
	return habits;
}

const EMPTY_NOTE: DailyNoteData = { preamble: "", tasks: [], habits: {}, schedule: [], extra: "", extraFrontmatter: {} };

/**
 * Pure text -> data parsing. Handles both the current Markdown-section format
 * and the legacy frontmatter-only format (auto-migrated: the very next
 * `serializeNoteContent` call emits the current format, no separate migration
 * step needed). Never throws - any parse failure falls back to empty data.
 *
 * Deliberately does NOT take the current `habitsSectionTitle` setting - section
 * identity is decided by sentinel, not heading text, so parsing needs no
 * knowledge of the current (possibly since-renamed) setting value at all.
 */
export function parseNoteContent(raw: string): DailyNoteData {
	try {
		return parseNoteContentUnsafe(raw);
	} catch {
		return { ...EMPTY_NOTE, preamble: raw };
	}
}

function parseNoteContentUnsafe(raw: string): DailyNoteData {
	const { content, legacyHabits, legacySchedule, extraFrontmatter } = parseFrontmatter(raw);
	const { preamble, sections } = splitSections(content);

	if (sections.length === 0) {
		// Bare/legacy body (or a corrupt-YAML fallback) - task extraction never
		// depends on whether the frontmatter YAML happened to parse.
		const firstLineEnd = content.indexOf("\n");
		const headingLine = firstLineEnd === -1 ? content : content.slice(0, firstLineEnd + 1);
		return {
			preamble: headingLine.trim(),
			tasks: parseTaskItems(content),
			habits: coerceLegacyHabits(legacyHabits),
			schedule: legacySchedule !== undefined ? normalizeSchedule(legacySchedule) : [],
			extra: "",
			extraFrontmatter,
		};
	}

	const tasksSection = sections.find((s) => hasSentinel(s, SENTINEL.tasks));
	const habitsSection = sections.find((s) => hasSentinel(s, SENTINEL.habits));
	const scheduleSection = sections.find((s) => hasSentinel(s, SENTINEL.schedule));
	const extra = sections
		.filter((s) => s !== tasksSection && s !== habitsSection && s !== scheduleSection)
		.map((s) => s.raw.trimEnd())
		.join("\n\n");

	return {
		preamble: preamble.trim(),
		tasks: tasksSection ? parseTaskItems(stripSentinel(tasksSection.content, SENTINEL.tasks)) : [],
		habits: habitsSection ? parseHabitChecklist(stripSentinel(habitsSection.content, SENTINEL.habits)) : {},
		schedule: scheduleSection ? parseScheduleChecklist(stripSentinel(scheduleSection.content, SENTINEL.schedule)) : [],
		extra,
		extraFrontmatter,
	};
}

/** Always emits the current Markdown-section format - no frontmatter block unless `extraFrontmatter` has keys. */
export function serializeNoteContent(note: DailyNoteData, habitsSectionTitle: string): string {
	const parts: string[] = [];

	if (Object.keys(note.extraFrontmatter).length > 0) {
		const yamlText = yaml.dump(note.extraFrontmatter, { lineWidth: -1 });
		parts.push(`---\n${yamlText}---`);
	}

	const preamble = note.preamble.trim();
	if (preamble) {
		parts.push(preamble);
	}

	parts.push(`## Tasks\n${SENTINEL.tasks}\n${note.tasks.map(formatTaskLine).join("\n")}`.trimEnd());
	parts.push(`## ${habitsSectionTitle}\n${SENTINEL.habits}\n${formatHabitChecklist(note.habits)}`.trimEnd());
	parts.push(`## Schedule\n${SENTINEL.schedule}\n${formatScheduleChecklist(note.schedule)}`.trimEnd());

	const extra = note.extra.trim();
	if (extra) {
		parts.push(extra);
	}

	return `${parts.join("\n\n")}\n`;
}

export function hasMeaningfulContent(note: DailyNoteData): boolean {
	if (Object.values(note.habits).some(Boolean)) {
		return true;
	}
	if (note.schedule.length > 0) {
		return true;
	}
	return note.tasks.length > 0;
}
