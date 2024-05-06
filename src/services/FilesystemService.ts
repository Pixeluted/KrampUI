import { fs, invoke, path } from "@tauri-apps/api";

export type FilesystemCallResult = {
  success: boolean;
  error: string | null;
};

type RawResult = [boolean, string | null];

export class FileSystemService {
  public static async getAppPath() {
    const executablePath = (await invoke("get_exe_path")) as string;
    return await path.dirname(executablePath);
  }

  public static async getAppName() {
    const executablePath = (await invoke("get_exe_path")) as string;
    return await path.basename(executablePath);
  }

  public static getFileNameFromPath(path: string): string {
    return path.split("\\").pop() || "";
  }

  public static async createDirectory(
    path: string,
    absolutePath: boolean = false
  ): Promise<FilesystemCallResult> {
    let fullPath: string;
    if (absolutePath) {
      fullPath = path;
    } else {
      fullPath = `${await this.getAppPath()}\\${path}`;
    }

    const [success, error]: RawResult = await invoke("create_directory", {
      path: fullPath,
    });
    return { success, error };
  }

  public static async writeFile(
    path: string,
    content: string,
    absolutePath: boolean = false
  ): Promise<FilesystemCallResult> {
    let fullPath: string;
    if (absolutePath) {
      fullPath = path;
    } else {
      fullPath = `${await this.getAppPath()}\\${path}`;
    }

    const [success, error]: RawResult = await invoke("write_file", {
      path: fullPath,
      data: content,
    });
    return { success, error };
  }

  public static async writeBinaryFile(
    path: string,
    data: Uint8Array
  ): Promise<FilesystemCallResult> {
    const fullPath = `${await this.getAppPath()}\\${path}`;
    const [success, error]: RawResult = await invoke("write_binary_file", {
      path: fullPath,
      data,
    });
    return { success, error };
  }

  public static async deleteDirectory(
    path: string
  ): Promise<FilesystemCallResult> {
    const fullPath = `${await this.getAppPath()}\\${path}`;
    const [success, error]: RawResult = await invoke("delete_directory", {
      path: fullPath,
    });
    return { success, error };
  }

  public static async deleteFile(
    path: string,
    absolutePath: boolean = false
  ): Promise<FilesystemCallResult> {
    let fullPath: string;
    if (absolutePath) {
      fullPath = path;
    } else {
      fullPath = `${await this.getAppPath()}\\${path}`;
    }

    const [success, error]: RawResult = await invoke("delete_file", {
      path: fullPath,
    });
    return { success, error };
  }

  public static async readFile(
    path: string,
    absolutePath: boolean = false
  ): Promise<string | null> {
    let fullPath: string;
    if (absolutePath) {
      fullPath = path;
    } else {
      fullPath = `${await this.getAppPath()}\\${path}`;
    }

    const [success, error]: RawResult = await invoke("read_file", {
      path: fullPath,
    });
    if (success) {
      return error;
    } else {
      return null;
    }
  }

  public static async readBinaryFile(
    path: string,
    absolutePath: boolean = false
  ): Promise<Uint8Array | null> {
    let fullPath: string;
    if (absolutePath) {
      fullPath = path;
    } else {
      fullPath = `${await this.getAppPath()}\\${path}`;
    }

    const results: any = await invoke("read_binary_file", {
      path: fullPath,
    });

    if (results.Ok) {
      return results.Ok;
    } else {
      return null;
    }
  }

  public static async renameFile(
    oldPath: string,
    newPath: string,
    absolutePath: boolean = false
  ) {
    let finalOldPath: string;
    let finalNewPath: string;

    if (absolutePath) {
      finalOldPath = oldPath;
      finalNewPath = newPath;
    } else {
      finalOldPath = `${await this.getAppPath()}\\${oldPath}`;
      finalNewPath = `${await this.getAppPath()}\\${newPath}`;
    }

    const [success, error]: RawResult = await invoke("rename_file", {
      oldPath: finalOldPath,
      newPath: finalNewPath,
    });
    return { success, error };
  }

  public static async readDir(
    dirPath: string,
    absolutePath: boolean = false
  ): Promise<fs.FileEntry[]> {
    let fullPath: string;
    if (absolutePath) {
      fullPath = dirPath;
    } else {
      fullPath = await path.join(await this.getAppPath(), dirPath);
    }

    const dirFiles = await fs.readDir(fullPath);

    return dirFiles;
  }

  public static async exists(path: string): Promise<boolean> {
    const fullPath = `${await this.getAppPath()}\\${path}`;
    const success: boolean = await invoke("exists", { path: fullPath });
    return success;
  }

  public static async parseJSON<T>(jsonString: string): Promise<T | null> {
    try {
      return JSON.parse(jsonString) as T;
    } catch (e: any) {
      return null;
    }
  }
}
