import { App } from "obsidian";

/**
 * Obsidian's "Excluded files" list (Settings → Files and Links) is backed by
 * `app.vault.getConfig("userIgnoreFilters")` / `setConfig(...)`, which is NOT
 * part of the public plugin API - there's no type for it in obsidian.d.ts, and
 * Obsidian could rename or remove these methods in a future version without
 * notice. Every function below is defensive: if the methods aren't present at
 * runtime, they no-op and return false instead of throwing, so a future
 * Obsidian change degrades to "the toggle doesn't do anything" rather than
 * crashing the plugin.
 */
interface VaultConfigApi {
	getConfig(key: string): unknown;
	setConfig(key: string, value: unknown): void;
}

function getVaultConfigApi(app: App): VaultConfigApi | null {
	const vault = app.vault as unknown as Partial<VaultConfigApi>;
	if (typeof vault.getConfig === "function" && typeof vault.setConfig === "function") {
		return vault as VaultConfigApi;
	}
	return null;
}

function getIgnoreFilters(api: VaultConfigApi): string[] {
	const raw = api.getConfig("userIgnoreFilters");
	return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
}

/** Adds `pattern` if not already present. Returns false only if the underlying API isn't available. */
export function addExcludePattern(app: App, pattern: string): boolean {
	const api = getVaultConfigApi(app);
	if (!api) {
		return false;
	}
	const filters = getIgnoreFilters(api);
	if (!filters.includes(pattern)) {
		api.setConfig("userIgnoreFilters", [...filters, pattern]);
	}
	return true;
}

/** Removes exactly `pattern`, leaving every other entry (the user's own or another plugin's) untouched. */
export function removeExcludePattern(app: App, pattern: string): boolean {
	const api = getVaultConfigApi(app);
	if (!api) {
		return false;
	}
	const filters = getIgnoreFilters(api);
	if (filters.includes(pattern)) {
		api.setConfig("userIgnoreFilters", filters.filter((entry) => entry !== pattern));
	}
	return true;
}

/** Swaps `oldPattern` for `newPattern` (e.g. the root folder was renamed while the toggle is on). No-op if `oldPattern` wasn't present. */
export function replaceExcludePattern(app: App, oldPattern: string, newPattern: string): boolean {
	if (oldPattern === newPattern) {
		return true;
	}
	const api = getVaultConfigApi(app);
	if (!api) {
		return false;
	}
	const filters = getIgnoreFilters(api);
	if (!filters.includes(oldPattern)) {
		return true;
	}
	const next = filters.filter((entry) => entry !== oldPattern);
	if (!next.includes(newPattern)) {
		next.push(newPattern);
	}
	api.setConfig("userIgnoreFilters", next);
	return true;
}
