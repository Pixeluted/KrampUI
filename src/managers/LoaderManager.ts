import { writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import { filePaths } from "../dir-config";
import { dialog, invoke } from "@tauri-apps/api";
import { PopupManager } from "./PopupManager";
import WindowManager from "./WindowManager";

export default class LoaderManager {
  public static isLoaderPresent = writable(false);

  public static async updateLoader() {
    const loaderPath = (await dialog.open({
      title: "Select loader",
      filters: [{ name: "Executable", extensions: ["exe"] }],
      multiple: false,
    })) as string;

    if (!loaderPath) return;

    const [isValidLoader, errorMessage]: [boolean, string] = await invoke(
      "validate_loader",
      { executablePath: loaderPath }
    );

    if (isValidLoader) {
      const loaderData = await FileSystemService.readBinaryFile(
        loaderPath,
        true
      );
      if (loaderData === null) {
        return WindowManager.showGenericError(
          "Error while updating loader!",
          "Failed to read the loader data!"
        );
      }

      const writeResults = await FileSystemService.writeBinaryFile(
        filePaths.loader,
        loaderData
      );
      if (!writeResults.success) {
        return WindowManager.showGenericError(
          "Error while updating loader!",
          `Failed to write the loader data! Error: ${writeResults.error}`
        );
      }

      const deleteFileResults = await FileSystemService.deleteFile(
        loaderPath,
        true
      );
      if (!deleteFileResults.success) {
        return WindowManager.showGenericError(
          "Error while updating loader!",
          `Failed to delete the orignal loader file! Error: ${deleteFileResults.error}`
        );
      }

      LoaderManager.isLoaderPresent.set(true);
    } else {
      WindowManager.showGenericError("Invalid file", errorMessage);
    }
  }

  public static async initialize() {
    this.isLoaderPresent.set(await FileSystemService.exists(filePaths.loader));
  }
}
