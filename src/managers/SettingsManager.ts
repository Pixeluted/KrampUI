import { get, writable, type Writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import WindowManager from "./WindowManager";

export type Settings = {
    autoInject: boolean,
    topMost: boolean,
    homeToggleEnabled: boolean,
    editorFontSize: number,
    injectionDelay: number,
    autoUpdate: boolean,
    [key: string]: any
}

export default class SettingsManager {
    private static defaultSettings: Settings = {
        autoInject: false,
        topMost: true,
        homeToggleEnabled: false,
        editorFontSize: 14,
        injectionDelay: 3,
        autoUpdate: true
    }
    public static currentSettings: Writable<Settings> = writable(this.defaultSettings);
    public static settingsDetails = {
        autoInject: {
            name: "Auto Inject",
            description: "Automatically injects into roblox",
            type: "boolean"
        },
        injectionDelay: {
            name: "Auto Inject Delay",
            description: "Delay in seconds to prevent automatic injection from crashing",
            type: "number"
        },
        topMost: {
            name: "Top Most",
            description: "Makes KrampUI stay on top of all windows",
            type: "boolean"
        },
        homeToggleEnabled: {
            name: "Home Toggle Enabled",
            description: "When enabled, you can press Home on your keyboard to hide/show KrampUI",
            type: "boolean"
        },
        editorFontSize: {
            name: "Font Size",
            description: "Controls the editors font size",
            type: "number"
        },
        autoUpdate: {
            name: "Auto Update",
            description: "Automatically updates to latest version on startup",
            type: "boolean"
        }
    }

    public static async saveSettings() {
        const settings = get(this.currentSettings);
        const results = await FileSystemService.writeFile("settings/settings.json", JSON.stringify(settings, null, 2));
        if (!results.success) {
            WindowManager.showFatalErrorPopup(`Failed to save settings. Error: ${results.error}`);
        }
    }

    public static async setSetting(setting: keyof Settings, value: any) {
        this.currentSettings.update(settings => {
            return { ...settings, [setting]: value }
        })
        this.saveSettings();
    }

    public static async initialize() {
        if (!await FileSystemService.exists("settings/settings.json")) {
            const results = await FileSystemService.writeFile("settings/settings.json", JSON.stringify(this.defaultSettings, null, 2));
            if (!results.success) {
                WindowManager.showFatalErrorPopup(`Failed to create default settings file. Error: ${results.error}`);
            }
        } else {
            const settings = await FileSystemService.readFile("settings/settings.json");
            if (settings) {
                this.currentSettings.set(JSON.parse(settings) as Settings);
            } else {
                WindowManager.showWarningPopup("Failed to read settings file. Using default settings.");
            }
        }
    }

}