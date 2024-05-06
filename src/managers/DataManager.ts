import { appWindow } from "@tauri-apps/api/window";
import { dirPaths } from "../dir-config";
import { FileSystemService } from "../services/FilesystemService";
import FileExplorerManager from "./FileExplorerManager";
import LoaderManager from "./LoaderManager";
import { PopupManager } from "./PopupManager";
import SettingsManager from "./SettingsManager";
import { TabsManager } from "./TabsManager";
import WindowManager from "./WindowManager";

export class DataManager {
  private static async checkForNewUser() {
    const doesSettingsExist = await FileSystemService.exists(
      dirPaths.settingsDir
    );
    const doesScriptsExist = await FileSystemService.exists(
      dirPaths.scriptsDir
    );
    const doesAutoExecExist = await FileSystemService.exists(
      dirPaths.autoExecDir
    );

    return !doesSettingsExist && !doesScriptsExist && !doesAutoExecExist;
  }

  private static async setupNewUser() {}

  public static async initialize() {
    if (await DataManager.checkForNewUser()) {
      await PopupManager.showPopup({
        title: "Welcome to KrampUI!",
        message:
          "It seems like you're a new user. We will now setup few directors in your current directory in order to get started. Please click okay to continue.",
        buttons: [
          {
            text: "Okay",
            isCloseButton: true,
          },
          {
            text: "Cancel",
            isCloseButton: true,
            onClick: appWindow.close,
          },
        ],
      });
    }

    if (!(await FileSystemService.exists(dirPaths.settingsDir))) {
      const results = await FileSystemService.createDirectory(
        dirPaths.settingsDir
      );
      if (!results.success) {
        WindowManager.showFatalErrorPopup(
          `Failed to create settings directory. Error: ${results.error}`
        );
      }
    }

    if (!(await FileSystemService.exists(dirPaths.scriptsDir))) {
      const results = await FileSystemService.createDirectory(
        dirPaths.scriptsDir
      );
      if (!results.success) {
        WindowManager.showFatalErrorPopup(
          `Failed to create scripts directory. Error: ${results.error}`
        );
      }
    }

    await WindowManager.initialize();
    await SettingsManager.initialize();
    await TabsManager.initialize();
    await LoaderManager.initialize();
    await FileExplorerManager.initialize();
  }
}
