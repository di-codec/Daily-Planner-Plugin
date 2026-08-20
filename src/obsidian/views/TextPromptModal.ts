import { App, Modal, Setting } from "obsidian";

export class TextPromptModal extends Modal {
	private value = "";

	constructor(
		app: App,
		private heading: string,
		private placeholder: string,
		private onSubmit: (value: string) => void,
	) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText(this.heading);
		new Setting(this.contentEl)
			.addText((text) => {
				text.setPlaceholder(this.placeholder);
				text.onChange((value) => {
					this.value = value;
				});
				text.inputEl.addEventListener("keydown", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						this.submit();
					}
				});
				window.setTimeout(() => text.inputEl.focus(), 20);
			})
			.addButton((btn) => {
				btn.setButtonText("Add")
					.setCta()
					.onClick(() => this.submit());
			});
	}

	onClose() {
		this.contentEl.empty();
	}

	private submit() {
		const value = this.value.trim();
		if (!value) {
			return;
		}
		this.close();
		this.onSubmit(value);
	}
}
