import { invoke, path } from "@tauri-apps/api";

export type FilesystemCallResult = {
    success: boolean,
    error: string | null
}

type RawResult = [boolean, string | null]

export class FileSystemService {
    private static async getAppDataPath() {
        return await path.appDataDir();
    }

    public static async createDirectory(path: string): Promise<FilesystemCallResult> {
        const fullPath = `${await this.getAppDataPath()}\\${path}`;
        const [success, error]: RawResult = await invoke("create_directory", { path: fullPath });
        return { success, error };
    }

    public static async writeFile(path: string, content: string): Promise<FilesystemCallResult> {
        const fullPath = `${await this.getAppDataPath()}\\${path}`;
        const [success, error]: RawResult = await invoke("write_file", { path: fullPath, data: content });
        return { success, error };
    }

    public static async writeBinaryFile(path: string, data: Uint8Array): Promise<FilesystemCallResult> {
        const fullPath = `${await this.getAppDataPath()}\\${path}`;
        const [success, error]: RawResult = await invoke("write_binary_file", { path: fullPath, data });
        return { success, error };
    }

    public static async deleteDirectory(path: string): Promise<FilesystemCallResult> {
        const fullPath = `${await this.getAppDataPath()}\\${path}`;
        const [success, error]: RawResult = await invoke("delete_directory", { path: fullPath });
        return { success, error };
    }

    public static async deleteFile(path: string): Promise<FilesystemCallResult> {
        const fullPath = `${await this.getAppDataPath()}\\${path}`;
        const [success, error]: RawResult = await invoke("delete_file", { path: fullPath });
        return { success, error };
    }

    public static async readFile(path: string): Promise<string | null> {
        const fullPath = `${await this.getAppDataPath()}\\${path}`;
        const [success, error]: RawResult = await invoke("read_file", { path: fullPath });
        if (success) {
            return error;
        } else {
            return null;
        }
    }

    public static async exists(path: string): Promise<boolean> {
        const fullPath = `${await this.getAppDataPath()}\\${path}`;
        const success: boolean = await invoke("exists", { path: fullPath });
        return success;
    }
}