import { describe, expect, it } from "vitest";
import { parseNoteContent, serializeNoteContent } from "../core/noteContent";
import { DailyNoteData } from "../core/types";

const HABITS_TITLE = "Habits";

describe("parseNoteContent - current (Markdown-section) format", () => {
	it("parses tasks/habits/schedule from their sentinel-marked sections", () => {
		const raw = [
			"# 19 August 2026",
			"",
			"## Tasks",
			"%%dp:tasks%%",
			"- [x] lidl",
			"- [ ] something test 1",
			"",
			"## Habits",
			"%%dp:habits%%",
			"- [ ] Glutes",
			"- [x] Legs",
			"",
			"## Schedule",
			"%%dp:schedule%%",
			"- 12:30 - hjsdkahf",
			"",
		].join("\n");

		const note = parseNoteContent(raw);
		expect(note.preamble.trim()).toBe("# 19 August 2026");
		expect(note.tasks).toEqual([
			{ text: "lidl", completed: true },
			{ text: "something test 1", completed: false },
		]);
		expect(note.habits).toEqual({ glutes: false, legs: true });
		expect(note.schedule).toEqual([{ time: "12:30", title: "hjsdkahf" }]);
		expect(note.extra).toBe("");
		expect(note.extraFrontmatter).toEqual({});
	});

	it("identifies sections by sentinel, not by heading text - survives a renamed habits heading", () => {
		const raw = [
			"# Heading",
			"",
			"## Tasks",
			"%%dp:tasks%%",
			"",
			"## Workouts",
			"%%dp:habits%%",
			"- [x] Legs",
			"",
			"## Schedule",
			"%%dp:schedule%%",
			"",
		].join("\n");
		expect(parseNoteContent(raw).habits).toEqual({ legs: true });
	});

	it("preserves a user's own hand-added section in `extra`, without misattributing it as habits", () => {
		const raw = [
			"# Heading",
			"",
			"## Tasks",
			"%%dp:tasks%%",
			"",
			"## My notes",
			"Some prose the user wrote by hand.",
			"",
			"## Workouts",
			"%%dp:habits%%",
			"- [x] Legs",
			"",
			"## Schedule",
			"%%dp:schedule%%",
			"",
		].join("\n");
		const note = parseNoteContent(raw);
		expect(note.habits).toEqual({ legs: true });
		expect(note.extra).toContain("## My notes");
		expect(note.extra).toContain("Some prose the user wrote by hand.");
	});

	it("round-trips extra sections and frontmatter verbatim through a full parse -> serialize -> parse cycle", () => {
		const note: DailyNoteData = {
			preamble: "# Heading",
			tasks: [],
			habits: {},
			schedule: [],
			extra: "## My notes\nHand-written text.",
			extraFrontmatter: { tags: ["daily"] },
		};
		const reparsed = parseNoteContent(serializeNoteContent(note, HABITS_TITLE));
		expect(reparsed.extra).toContain("## My notes");
		expect(reparsed.extra).toContain("Hand-written text.");
		expect(reparsed.extraFrontmatter).toEqual({ tags: ["daily"] });
	});
});

describe("parseNoteContent - legacy (frontmatter) format auto-migration", () => {
	it("migrates the real 2026-08-19.md: full habits, one schedule entry, three tasks - nothing lost", () => {
		const raw = [
			"---",
			"habits:",
			"  glutes: false",
			"  legs: true",
			"  back: false",
			"  brists: false",
			"  shoulders: false",
			"  jogging: true",
			"  yoga: false",
			"schedule:",
			"  - time: '12:30'",
			"    title: hjsdkahf",
			"---",
			"# 19 August 2026",
			"- [x] lidl",
			"- [ ] something test 1",
			"- [ ] test1",
		].join("\n");

		const note = parseNoteContent(raw);
		expect(note.tasks).toEqual([
			{ text: "lidl", completed: true },
			{ text: "something test 1", completed: false },
			{ text: "test1", completed: false },
		]);
		expect(note.habits).toEqual({
			glutes: false,
			legs: true,
			back: false,
			brists: false,
			shoulders: false,
			jogging: true,
			yoga: false,
		});
		expect(note.schedule).toEqual([{ time: "12:30", title: "hjsdkahf" }]);
		expect(note.extraFrontmatter).toEqual({});

		// The very next write emits the current format - this IS the migration.
		const migrated = serializeNoteContent(note, HABITS_TITLE);
		expect(migrated).not.toContain("---");
		expect(migrated).toContain("## Tasks");
		expect(migrated).toContain("## Habits");
		expect(migrated).toContain("## Schedule");
		expect(parseNoteContent(migrated)).toEqual(note);
	});

	it("migrates the real 2026-08-17.md: all-false habits, empty schedule, no tasks, preserves the stray `test` frontmatter key", () => {
		const raw = [
			"---",
			"habits:",
			"  glutes: false",
			"  legs: false",
			"  back: false",
			"  brists: false",
			"  shoulders: false",
			"  jogging: false",
			"  yoga: false",
			"schedule: []",
			"test: something",
			"---",
			"# 17 August 2026",
		].join("\n");

		const note = parseNoteContent(raw);
		expect(note.tasks).toEqual([]);
		expect(note.schedule).toEqual([]);
		expect(Object.values(note.habits).every((v) => v === false)).toBe(true);
		expect(note.extraFrontmatter).toEqual({ test: "something" });

		const migrated = serializeNoteContent(note, HABITS_TITLE);
		expect(migrated).toContain("test: something");
	});

	it("(Bug 1 regression) extracts tasks from a bare legacy body even when the frontmatter YAML is corrupt", () => {
		const raw = "---\nhabits: [this is not valid: yaml:\n---\n# Heading\n- [x] lidl\n- [ ] open\n";
		const note = parseNoteContent(raw);
		expect(note.tasks).toEqual([
			{ text: "lidl", completed: true },
			{ text: "open", completed: false },
		]);
		expect(note.habits).toEqual({});
		expect(note.schedule).toEqual([]);
	});

	it("does not take the legacy branch for frontmatter with unrelated keys only (no habits/schedule)", () => {
		const raw = "---\ntags:\n  - daily\n---\n# Heading\n- [ ] Task\n";
		const note = parseNoteContent(raw);
		expect(note.tasks).toEqual([{ text: "Task", completed: false }]);
		expect(note.extraFrontmatter).toEqual({ tags: ["daily"] });
	});
});

describe("parseNoteContent - graceful fallback", () => {
	it("handles a completely empty file", () => {
		const note = parseNoteContent("");
		expect(note.tasks).toEqual([]);
		expect(note.habits).toEqual({});
		expect(note.schedule).toEqual([]);
	});

	it("handles CRLF line endings in both legacy and current formats", () => {
		const legacy = "---\r\nhabits:\r\n  legs: true\r\n---\r\n# Heading\r\n- [x] lidl\r\n";
		expect(parseNoteContent(legacy).habits).toEqual({ legs: true });
		expect(parseNoteContent(legacy).tasks).toEqual([{ text: "lidl", completed: true }]);

		const current = "# Heading\r\n\r\n## Tasks\r\n%%dp:tasks%%\r\n- [x] lidl\r\n";
		expect(parseNoteContent(current).tasks).toEqual([{ text: "lidl", completed: true }]);
	});

	it("never throws, even on pathological input", () => {
		expect(() => parseNoteContent("---\n[[[not yaml or markdown at all")).not.toThrow();
	});
});

describe("serializeNoteContent", () => {
	it("omits the frontmatter block entirely when there is no extraFrontmatter", () => {
		const note: DailyNoteData = { preamble: "# H", tasks: [], habits: {}, schedule: [], extra: "", extraFrontmatter: {} };
		expect(serializeNoteContent(note, HABITS_TITLE)).not.toContain("---");
	});

	it("uses the given habits section title as the literal heading text", () => {
		const note: DailyNoteData = { preamble: "# H", tasks: [], habits: {}, schedule: [], extra: "", extraFrontmatter: {} };
		expect(serializeNoteContent(note, "Workouts")).toContain("## Workouts");
	});

	it("round-trips a full note through serialize -> parse", () => {
		const note: DailyNoteData = {
			preamble: "# Heading",
			tasks: [{ text: "A", completed: true }, { text: "B", completed: false }],
			habits: { legs: true, back: false },
			schedule: [{ time: "09:00", title: "Standup" }],
			extra: "",
			extraFrontmatter: {},
		};
		expect(parseNoteContent(serializeNoteContent(note, HABITS_TITLE))).toEqual(note);
	});
});
