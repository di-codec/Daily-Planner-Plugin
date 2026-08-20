import { App } from "obsidian";

/** Recursively creates every folder in `filePath`'s ancestry that doesn't exist yet. */
export async function ensureFoldersExist(app: App, filePath: string): Promise<void> {
	const parts = filePath.split("/");
	parts.pop(); // remove the file name
	let currentPath = "";

	for (const part of parts) {
		currentPath += (currentPath ? "/" : "") + part;
		if (!app.vault.getAbstractFileByPath(currentPath)) {
			await app.vault.createFolder(currentPath);
		}
	}
}
