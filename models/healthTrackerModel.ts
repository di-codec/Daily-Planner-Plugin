import {App, Notice, TFile} from "obsidian";
export class HealthTrackerManager{
    private app: App;
    private settings: {
        mainfileDirectory: string;
        healthTrackerFileDirectory: string;
    };

    constructor (app: App, settings: {mainfileDirectory: string; healthTrackerFileDirectory: string}){
        this.app = app;
        this.settings = settings;
    }

    // Getting the file name by month
    private getFileNameByMonth(date:Date):string {
        const monthData = date.toLocaleDateString("en-GB",{month:"long"});
        return`📅 ${monthData}`
    }

    // Getting the file name by week
    private getFileNameByWeek(date: Date): string {
        const startOfWeek = new Date(date);
        const dayOfWeek = date.getDate();

        const offset = (dayOfWeek + 6) % 7;

        startOfWeek.setDate(date.getDate() - offset);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startDate = startOfWeek.getDate();
        const endDay = endOfWeek.getDate();

        return `${startDate} - ${endDay}.md`

    }

    // Obtaining the path to the task file by date
    public getFilePathByDate(date:Date): string {
        return `${this.settings.mainfileDirectory}/${this.settings.healthTrackerFileDirectory}/${this.getFileNameByMonth(date)}/${this.getFileNameByWeek(date)}`
    }

    // Creating a new Gym Tracker file fot the week if it hasn't been created yet
    async createWeeklyFile(): Promise<void> {
        const filePath = this.getFilePathByDate(new Date());

    }

}