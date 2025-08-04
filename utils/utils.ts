import { App } from "obsidian";

/**
 * Recursively creates all folders in the specified path if they do not exist.
 * @param app - Instance of Obsidian `App`
 * @param filePath - Full path to the file (including the file name)
 */
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
