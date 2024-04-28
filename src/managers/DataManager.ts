import { dirPaths } from "../dir-config";
import { FileSystemService } from "../services/FilesystemService";
import LoaderManager from "./LoaderManager";
import SettingsManager from "./SettingsManager";
import { TabsManager } from "./TabsManager";
import WindowManager from "./WindowManager";

export class DataManager {
  public static async initialize() {
    if (!(await FileSystemService.exists(""))) {
      const results = await FileSystemService.createDirectory("");
      if (!results.success) {
        WindowManager.showFatalErrorPopup(
          `Failed to create application data directory. Error: ${results.error}`
        );
      }
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

    await SettingsManager.initialize();
    await TabsManager.initialize();
    await LoaderManager.initialize();
  }
}
