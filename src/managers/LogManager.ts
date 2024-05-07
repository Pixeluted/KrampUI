import { filePaths } from "../dir-config";
import { FileSystemService } from "../services/FilesystemService";

export type LogType = "info" | "warn" | "error";

export default class LogManager {
  private static isReady: boolean = false;

  public static async log(message: string, type: LogType = "info") {
    if (!LogManager.isReady) {
      return;
    }

    const originalFileContent = await FileSystemService.readFile(
      filePaths.logFile
    );
    if (originalFileContent === null) return;

    const logMessage = `[${new Date()
      .toISOString()
      .toLocaleString()}|${type.toUpperCase()}] ${message}\n`;
    await FileSystemService.writeFile(
      filePaths.logFile,
      originalFileContent + logMessage
    );
  }

  public static async initialize() {
    await FileSystemService.writeFile(filePaths.logFile, "");
    LogManager.isReady = true;
  }
}
