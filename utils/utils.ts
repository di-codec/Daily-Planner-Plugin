import { App } from "obsidian";

/**
 * Рекурсивно создаёт все папки в указанном пути, если они отсутствуют.
 * @param app - Экземпляр Obsidian `App`
 * @param filePath - Полный путь до файла (включая имя файла)
 */
export async function ensureFoldersExist(app: App, filePath: string): Promise<void> {
	const parts = filePath.split("/");
	parts.pop(); // удаляем имя файла
	let currentPath = "";

	for (const part of parts) {
		currentPath += (currentPath ? "/" : "") + part;
		if (!app.vault.getAbstractFileByPath(currentPath)) {
			await app.vault.createFolder(currentPath);
		}
	}
}
