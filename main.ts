// main.ts
import { Notice, Plugin, addIcon, TAbstractFile, TFolder, TFile, WorkspaceLeaf, ItemView } from 'obsidian';
import { SelfDevManager } from './models/selfDevModel';

export default class MyPlugin extends Plugin {
  private selfDevManager: SelfDevManager;

  async onload() {
    console.log('loading plugin');

    addIcon('circle', '<circle cx="50" cy="50" r="50" fill="currentColor"/>');

    // Инициализируем SelfDevManager с настройками
    this.selfDevManager = new SelfDevManager(this.app, {
      mainFileDirectory: "Daily Planner",
      taskFileDirectory: "Self Development",
      taskFilePath: "Self Development Records.md"
    });

    // Команда для добавления задачи
    this.addCommand({
      id: 'add-task',
      name: 'Add Task',
      callback: async () => {
        await this.selfDevManager.createDailySection();
        const tasks = await this.selfDevManager.getTodayTasks();
        new Notice(`Сегодняшние задачи: ${tasks.length > 0 ? tasks.join(', ') : 'нет задач'}`);
      }
    });

    // Создание структуры и управление задачами через ribbon icon
    this.addRibbonIcon('circle', 'Manager', async () => {
      const folderPath = "Daily Planner";
      const folderSelfDevPath = "Self Development";
      const filePathSelfDev = `${folderPath}/${folderSelfDevPath}/Self Development Records.md`;
      const filePathJobApplication = `${folderPath}/Job Application Tracker.md`;
      const filePathHealth = `${folderPath}/Health Tracker.md`;

      // Folder checking and creation
      let folder = this.app.vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        console.log('Creating folder:', folderPath);
        await this.app.vault.createFolder(folderPath);
        new Notice('Directory "Daily Planner" created!');
        folder = this.app.vault.getAbstractFileByPath(folderPath);
      }

      // Создание подпапки Self Development
      if (!this.app.vault.getAbstractFileByPath(`${folderPath}/${folderSelfDevPath}`)) {
        console.log(`Creating inside directory 'Self Development': ${folderSelfDevPath}`);
        await this.app.vault.createFolder(`${folderPath}/${folderSelfDevPath}`);
        new Notice('Inside directory "Self Development" created!');
      }

      // Checking and Creation Self Development file
      let fileSelfDev = this.app.vault.getAbstractFileByPath(filePathSelfDev);
      if (!fileSelfDev) {
        console.log('Creating file:', filePathSelfDev);
        fileSelfDev = await this.app.vault.create(filePathSelfDev, "");
        new Notice('File "Self Development Records.md" created!');
      }
      if (fileSelfDev instanceof TFile) {
        await this.selfDevManager.createDailySection(); // Создаем секцию на сегодня
        const tasks = await this.selfDevManager.getTodayTasks();
        new Notice(`Сегодняшние задачи: ${tasks.length > 0 ? tasks.join(', ') : 'нет задач'}`);
        await this.selfDevManager.migrateUnfinishedTasks(); // Переносим незавершенные задачи
      }

      // Checking and Creation Job Application file
      let fileJobApplication = this.app.vault.getAbstractFileByPath(filePathJobApplication);
      if (!fileJobApplication) {
        console.log('Creating file:', filePathJobApplication);
        fileJobApplication = await this.app.vault.create(filePathJobApplication, "");
        new Notice('File "Job Application Tracker.md" created!');
      }

      // Checking and Creation Health Tracker file
      let fileHealth = this.app.vault.getAbstractFileByPath(filePathHealth);
      if (!fileHealth) {
        console.log('Creating file:', filePathHealth);
        fileHealth = await this.app.vault.create(filePathHealth, "");
        new Notice('File "Health Tracker.md" created!');
      }
    });

    // Регистрация пользовательского вида (виджета)
    this.registerView("self-dev-view", (leaf) => new SelfDevView(leaf, this.selfDevManager));

    // Добавление иконки для открытия виджета
    this.addRibbonIcon("circle", "Открыть Self Dev", () => {
      const rightLeaf = this.app.workspace.getRightLeaf(false);
      if (rightLeaf) {
        rightLeaf.setViewState({
          type: "self-dev-view",
          active: true,
        });
      }
    });
  }

  async onunload() {
    console.log('unloading plugin');
  }
}

// Класс для пользовательского вида (виджета) с формой для задач
class SelfDevView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private manager: SelfDevManager) {
    super(leaf);
  }

  getViewType() {
    return "self-dev-view";
  }

  getDisplayText() {
    return "Self Development";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();

    // Секция "Сегодняшние задачи"
    const tasks = await this.manager.getTodayTasks();
    container.createEl("h2", { text: "✅ Сегодняшние задачи" });
    const taskList = container.createEl("ul");
    tasks.forEach(task => taskList.createEl("li", { text: task }));

    // Форма для добавления новой задачи
    container.createEl("h2", { text: "🆕 Добавить задачу" });
    const form = container.createEl("form");
    const input = form.createEl("input", { type: "text", placeholder: "Введите задачу..." });
    const submit = form.createEl("button", { text: "Добавить" });
    submit.type = "submit";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const taskText = input.value.trim();
      if (taskText) {
        await this.manager.appendTask(taskText);
        input.value = "";
        this.onOpen();
        new Notice(`Задача "${taskText}" добавлена!`);
      }
    });

    // Кнопка "Создать новую секцию задач"
    container.createEl("h2", { text: "🆕 Управление" });
    const button = container.createEl("button", { text: "Создать новую секцию задач" });
    button.addEventListener("click", async () => {
      await this.manager.createDailySection();
      this.onOpen(); // Обновляем вид
    });
  }

  async onClose() {
    // Очистка при закрытии
  }
}