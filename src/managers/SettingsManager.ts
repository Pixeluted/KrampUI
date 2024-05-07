import { get, writable, type Writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import WindowManager from "./WindowManager";
import { filePaths } from "../dir-config";
import { appWindow } from "@tauri-apps/api/window";
import LogManager from "./LogManager";

export type Settings = {
  autoInject: boolean;
  topMost: boolean;
  homeToggleEnabled: boolean;
  editorFontSize: number;
  injectionDelay: number;
  autoUpdate: boolean;
  [key: string]: any;
};

export default class SettingsManager {
  private static defaultSettings: Settings = {
    autoInject: false,
    topMost: true,
    homeToggleEnabled: false,
    editorFontSize: 14,
    injectionDelay: 3,
    autoUpdate: true,
  };

  public static currentSettings: Writable<Settings> = writable(
    this.defaultSettings
  );

  public static settingsDetails = {
    autoInject: {
      name: "Auto Inject",
      description: "Automatically injects into roblox",
      type: "boolean",
    },
    injectionDelay: {
      name: "Auto Inject Delay",
      description:
        "Delay in seconds to prevent automatic injection from crashing",
      type: "number",
    },
    topMost: {
      name: "Top Most",
      description: "Makes KrampUI stay on top of all windows",
      type: "boolean",
    },
    homeToggleEnabled: {
      name: "Home Toggle Enabled",
      description:
        "When enabled, you can press Home on your keyboard to hide/show KrampUI",
      type: "boolean",
    },
    editorFontSize: {
      name: "Font Size",
      description: "Controls the editors font size",
      type: "number",
    },
    //autoUpdate: {
    //  name: "Auto Update",
    //  description: "Automatically updates to latest version on startup",
    //  type: "boolean",
    //},
  };

  public static async saveSettings() {
    const settings = get(this.currentSettings);
    const results = await FileSystemService.writeFile(
      filePaths.settings,
      JSON.stringify(settings, null, 2)
    );
    if (!results.success) {
      WindowManager.showFatalErrorPopup(
        `Failed to save settings. Error: ${results.error}`
      );

      LogManager.log(
        `Failed to save settings. Error: ${results.error}`,
        "error"
      );
    }
  }

  public static async setSetting(setting: keyof Settings, value: any) {
    if (setting === "topMost") appWindow.setAlwaysOnTop(value);

    this.currentSettings.update((settings) => {
      return { ...settings, [setting]: value };
    });
    this.saveSettings();
  }

  public static async initialize() {
    if (!(await FileSystemService.exists(filePaths.settings))) {
      const results = await FileSystemService.writeFile(
        filePaths.settings,
        JSON.stringify(this.defaultSettings, null, 2)
      );
      if (!results.success) {
        WindowManager.showFatalErrorPopup(
          `Failed to create default settings file. Error: ${results.error}`
        );

        LogManager.log(
          `Failed to create default settings file. Error: ${results.error}`,
          "error"
        );
      }
    } else {
      const settings = await FileSystemService.readFile(filePaths.settings);
      if (settings) {
        const parsedSettings = await FileSystemService.parseJSON<Settings>(
          settings
        );
        if (parsedSettings === null) {
          WindowManager.showWarningPopup(
            "Failed to parse settings file. Using default settings."
          );

          LogManager.log(
            "Failed to parse settings file. Using default settings.",
            "warn"
          );
          return;
        }

        this.currentSettings.set(parsedSettings);
      } else {
        WindowManager.showWarningPopup(
          "Failed to read settings file. Using default settings."
        );

        LogManager.log(
          "Failed to read settings file. Using default settings.",
          "warn"
        );
      }
    }

    appWindow.setAlwaysOnTop(get(this.currentSettings).topMost);
  }
}
