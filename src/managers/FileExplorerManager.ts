import { get, writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import { dirPaths } from "../dir-config";
import type { FileEntry } from "@tauri-apps/api/fs";
import { invoke, path } from "@tauri-apps/api";
import WindowManager from "./WindowManager";
import { TabsManager } from "./TabsManager";

export type FileFolder = "Scripts" | "Auto Exec";
export type FileData = {
  id: string;
  folder: FileFolder;
  title: string;
  filePath: string;
};

export default class FileExplorerManager {
  private static allowedExtensions = ["lua", "luau", "txt"];
  private static rawFiles: FileEntry[] = [];
  public static currentFiles = writable<FileData[]>([]);

  private static getFileExtensionFromPath(path: string) {
    return path.split(".").pop() || "";
  }

  private static generateUniqueID(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  public static async renameFile(fileId: string, newTitle: string) {
    const currentFiles = get(FileExplorerManager.currentFiles);
    const file = currentFiles.find((file) => file.id === fileId);
    if (!file) return;

    let originalPath = file.filePath as string;
    let newPath = await path.join(await path.dirname(originalPath), newTitle);

    const results = await FileSystemService.renameFile(
      file.filePath,
      newPath,
      true
    );
    if (!results.success) {
      WindowManager.showGenericError(
        "Error while renaming file!",
        `Failed to rename the file! Error: ${results.error}`
      );
    } else {
      FileExplorerManager.updateFiles();
    }
  }

  public static async openFileInTabs(fileId: string) {
    const currentFiles = get(FileExplorerManager.currentFiles);
    const file = currentFiles.find((file) => file.id === fileId);
    if (!file) return;

    TabsManager.addTab(true, file.filePath);
  }

  public static async executeFile(fileId: string) {
    const currentFiles = get(this.currentFiles);
    const file = currentFiles.find((file) => file.id === fileId);
    if (!file) return;

    const fileContent = await FileSystemService.readFile(file.filePath, true);
    if (fileContent === null) return;

    invoke("execute_script", { script: fileContent });
  }

  public static async updateFiles() {
    const scriptsFiles = await FileSystemService.readDir(dirPaths.scriptsDir);
    const autoExecFiles = await FileSystemService.readDir(dirPaths.autoExecDir);
    const allFiles = [...scriptsFiles, ...autoExecFiles];

    if (allFiles === this.rawFiles) return;
    this.rawFiles = allFiles;

    this.currentFiles.set([]);

    for (const file of scriptsFiles) {
      if (
        !this.allowedExtensions.includes(
          this.getFileExtensionFromPath(file.path)
        )
      )
        continue;

      this.currentFiles.update((files) => {
        files.push({
          id: this.generateUniqueID(),
          folder: "Scripts",
          title: FileSystemService.getFileNameFromPath(file.path),
          filePath: file.path,
        });
        return files;
      });
    }

    for (const file of autoExecFiles) {
      if (
        !this.allowedExtensions.includes(
          this.getFileExtensionFromPath(file.path)
        )
      )
        continue;

      this.currentFiles.update((files) => {
        files.push({
          id: this.generateUniqueID(),
          folder: "Auto Exec",
          title: FileSystemService.getFileNameFromPath(file.path),
          filePath: file.path,
        });
        return files;
      });
    }
  }

  public static async initialize() {
    this.updateFiles();
    setInterval(() => {
      this.updateFiles();
    }, 5000);
  }
}
