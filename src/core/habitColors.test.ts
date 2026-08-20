import { describe, expect, it } from "vitest";
import { habitColor } from "./habitColors";

describe("habitColor", () => {
	it("returns a fixed color for known default habits, case-insensitively", () => {
		expect(habitColor("legs")).toBe("#4169e1");
		expect(habitColor("Legs")).toBe("#4169e1");
	});

	it("returns a stable hex color for an unknown habit name", () => {
		const first = habitColor("reading");
		const second = habitColor("reading");
		expect(first).toBe(second);
		expect(first).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});

	it("gives different unknown names different colors (in the common case)", () => {
		expect(habitColor("reading")).not.toBe(habitColor("meditation"));
	});
});
