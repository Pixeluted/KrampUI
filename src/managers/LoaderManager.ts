import { get, writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import { dirPaths, filePaths } from "../dir-config";
import { dialog, invoke, path } from "@tauri-apps/api";
import { PopupManager } from "./PopupManager";
import WindowManager from "./WindowManager";
import SettingsManager from "./SettingsManager";
import { Child, Command } from "@tauri-apps/api/shell";
import LogManager from "./LogManager";

export default class LoaderManager {
  public static isLoaderPresent = writable(false);
  public static loaderPath: string = "";

  public static async inject(autoInject: boolean = false): Promise<{
    success: boolean;
    error: string;
  }> {
    if (autoInject === true) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          get(SettingsManager.currentSettings).injectionDelay * 1000
        )
      );
    }

    return new Promise(async function (resolve) {
      const loaderCommand = new Command(
        "cmd",
        [
          "/c",
          "start",
          "/b",
          "/wait",
          await path.basename(LoaderManager.loaderPath),
        ],
        { cwd: await FileSystemService.getAppPath() }
      );
      await loaderCommand.spawn();

      setTimeout(async () => {
        WindowManager.updateInjectionStatus("Attached");
      }, 5000);
    });
  }

  public static async handleInjectionProcess(autoInject: boolean = false) {
    if (get(LoaderManager.isLoaderPresent) === false) {
      return PopupManager.showPopup({
        title: "Loader not selected",
        message:
          "It looks like you don't have any loader selected. Please select the loader in settings.",
        buttons: [
          {
            text: "Okay",
            isCloseButton: true,
          },
          {
            text: "Take me to settings",
            isCloseButton: true,
            onClick: WindowManager.toggleSettingsWindow,
          },
        ],
      });
    }

    LogManager.log("Started injection processs...");

    WindowManager.updateInjectionStatus("Injecting");
    const { success, error } = await LoaderManager.inject(autoInject);

    if (success) {
      WindowManager.updateInjectionStatus("Attached");
      LogManager.log("Injection successfull");
    } else {
      WindowManager.updateInjectionStatus("Idle");
      WindowManager.showGenericError("Injection has failed", error);
      LogManager.log(`Injection failed: ${error}`, "error");
    }
  }

  public static async checkForLoader() {
    const allFilesInDir = await FileSystemService.readDir(
      await FileSystemService.getAppPath(),
      true
    );
    const ourExeName = FileSystemService.getFileNameFromPath(
      await FileSystemService.getAppName()
    );

    let loaderPresent = false;

    for (const file of allFilesInDir) {
      if (file.children !== undefined) continue;
      if (!file.name?.endsWith(".exe")) continue;
      if (file.name === ourExeName) continue;

      const [isValidLoader, error]: [boolean, string] = await invoke(
        "validate_loader",
        { executablePath: file.path }
      );

      if (isValidLoader) {
        loaderPresent = true;
        LoaderManager.loaderPath = file.path;
        LogManager.log(`Loader found: ${file.path}`);
        break;
      }
    }

    LoaderManager.isLoaderPresent.set(loaderPresent);
  }

  public static async initialize() {
    await this.checkForLoader();
  }
}
