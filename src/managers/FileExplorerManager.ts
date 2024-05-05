import { get, writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import { dirPaths } from "../dir-config";
import type { FileEntry } from "@tauri-apps/api/fs";
import { invoke, path } from "@tauri-apps/api";
import WindowManager from "./WindowManager";
import { TabsManager } from "./TabsManager";

export type FileFolder = {
  folderName: string;
  folderIcon: string;
  isOpen: boolean;
};

export type FileData = {
  id: string;
  folderName: string;
  title: string;
  filePath: string;
};

export default class FileExplorerManager {
  private static allowedExtensions = ["lua", "luau", "txt"];
  private static openFolders: string[] = [];
  public static currentFiles = writable<FileData[]>([]);
  public static currentFolders = writable<FileFolder[]>([]);

  public static areWeSearching = writable(false);
  public static searchResults = writable<FileData[]>([]);

  private static getFileExtensionFromPath(path: string) {
    return path.split(".").pop() || "";
  }

  private static isDirectory(path: FileEntry) {
    return path.children !== undefined;
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

  private static async internalLoopOverFolders(): Promise<{
    files: FileData[];
    folders: FileFolder[];
  }> {
    const scriptsDirs = await FileSystemService.readDir(dirPaths.scriptsDir);
    const allFilesFound: FileData[] = [];
    const allFoldersFound: FileFolder[] = [];

    for (const dir of scriptsDirs) {
      if (!FileExplorerManager.isDirectory(dir)) continue;

      const filesFound = await FileExplorerManager.internalAddFolder(
        dir.path,
        "folder",
        false,
        true
      );
      allFilesFound.push(...filesFound.folderChildren);
      allFoldersFound.push(filesFound.folder as FileFolder);
    }

    return { files: allFilesFound, folders: allFoldersFound };
  }

  private static async internalAddFolder(
    dirPath: string,
    icon: string = "folder",
    isMainFolder: boolean,
    absolutePath: boolean = false
  ): Promise<{ folderChildren: FileData[]; folder?: FileFolder }> {
    const folderName = FileSystemService.getFileNameFromPath(dirPath);
    const folderChildren = await FileSystemService.readDir(
      dirPath,
      absolutePath
    );

    const newFileFolder: FileFolder = {
      folderName: folderName,
      folderIcon: icon,
      isOpen: FileExplorerManager.openFolders.includes(folderName),
    };

    const folderFiles: FileData[] = [];

    for (const child of folderChildren) {
      if (FileExplorerManager.isDirectory(child)) continue;

      const extension = FileExplorerManager.getFileExtensionFromPath(
        child.path
      );
      if (!FileExplorerManager.allowedExtensions.includes(extension)) continue;

      folderFiles.push({
        id: FileExplorerManager.generateUniqueID(),
        folderName: folderName,
        title: FileSystemService.getFileNameFromPath(child.path),
        filePath: child.path,
      });
    }

    if (isMainFolder) {
      return { folderChildren: folderFiles };
    } else {
      return { folderChildren: folderFiles, folder: newFileFolder };
    }
  }

  public static async toggleFolderIsOpen(folderName: string) {
    const currentFolders = get(this.currentFolders);
    const folder = currentFolders.find(
      (folder) => folder.folderName === folderName
    );
    if (!folder) return;

    FileExplorerManager.currentFolders.update((folders) => {
      return folders.map((f) => {
        if (f.folderName === folderName) {
          f.isOpen = !f.isOpen;

          if (f.isOpen) {
            FileExplorerManager.openFolders.push(f.folderName);
          } else {
            FileExplorerManager.openFolders =
              FileExplorerManager.openFolders.filter(
                (folderName) => folderName !== f.folderName
              );
          }
        }
        return f;
      });
    });
  }

  public static async newFile(folderName: string) {
    const fileName = "New File.lua";
    const filePath = await path.join(
      await FileSystemService.getAppDataPath(),
      folderName === "autoexec" ? "" : "scripts",
      folderName,
      fileName
    );

    const newFileWrittenResults = await FileSystemService.writeFile(
      filePath,
      "",
      true
    );
    if (newFileWrittenResults.success) {
      FileExplorerManager.updateFiles();
    } else {
      WindowManager.showGenericError(
        "Error while creating new file!",
        `Failed to create new file! Error: ${newFileWrittenResults.error}`
      );
    }
  }

  public static async deleteFile(fileId: string) {
    const currentFiles = get(this.currentFiles);
    const file = currentFiles.find((file) => file.id === fileId);
    if (!file) return;

    const results = await FileSystemService.deleteFile(file.filePath, true);
    if (!results.success) {
      WindowManager.showGenericError(
        "Error while deleting file!",
        `Failed to delete the file! Error: ${results.error}`
      );
    } else {
      FileExplorerManager.updateFiles();
    }
  }

  public static async updateFiles() {
    const allFilesFound: FileData[] = [];
    const allFoldersFound: FileFolder[] = [];

    const scriptsFilesFound = await this.internalAddFolder(
      dirPaths.scriptsDir,
      "folder",
      true
    );
    allFilesFound.push(...scriptsFilesFound.folderChildren);

    const autoExecFilesFound = await this.internalAddFolder(
      dirPaths.autoExecDir,
      "robot",
      false,
      false
    );
    allFilesFound.push(...autoExecFilesFound.folderChildren);
    allFoldersFound.push(autoExecFilesFound.folder as FileFolder);

    const { files, folders } = await this.internalLoopOverFolders();
    allFilesFound.push(...files);
    allFoldersFound.push(...folders);

    if (allFilesFound === get(this.currentFiles)) return;

    this.currentFiles.set(allFilesFound);
    this.currentFolders.set(allFoldersFound);
  }

  public static updateSearchInput(searchInput: string) {
    if (searchInput.trim() === "") {
      this.areWeSearching.set(false);
      this.searchResults.set([]);
      return;
    }

    this.areWeSearching.set(true);

    const currentFiles = get(this.currentFiles);
    const searchResults = currentFiles.filter((file) =>
      file.title.toLowerCase().includes(searchInput.toLowerCase())
    );

    this.searchResults.set(searchResults);
  }

  public static async initialize() {
    this.updateFiles();
    setInterval(() => {
      this.updateFiles();
    }, 5000);
  }
}
