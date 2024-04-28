import { get, writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import { dirPaths, filePaths } from "../dir-config";
import { dialog, invoke, path } from "@tauri-apps/api";
import { PopupManager } from "./PopupManager";
import WindowManager from "./WindowManager";
import SettingsManager from "./SettingsManager";
import { Child, Command } from "@tauri-apps/api/shell";

export default class LoaderManager {
  public static isLoaderPresent = writable(false);
  public static wsPort = Math.floor(Math.random() * 48128) + 1024;

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
        ["/c", "start", "/b", "/wait", "krampus-loader.exe"],
        { cwd: await path.appConfigDir() }
      );
      let loaderChild: Child;
      let robloxKillCheck: number;
      let killTimeout: number;

      function onOutput(line: string) {
        line = line.trim();
        const errors = [
          "error:",
          "redownload",
          "create a ticket",
          "make a ticket",
          "cannot find user",
          "mismatch",
          "out of date",
          "failed to",
          "no active subscription",
        ];

        if (line.toLowerCase().includes("already attached")) {
          resolve({ success: true, error: "" });
        } else if (
          errors.some((s) => line.toLowerCase().includes(s)) &&
          !line.endsWith(":")
        ) {
          resolve({ success: false, error: line });
        } else if (line.toLowerCase().includes("success")) {
          resolve({ success: true, error: "" });
        }
      }

      loaderCommand.stdout.on("data", onOutput);
      loaderCommand.stderr.on("data", onOutput);

      try {
        loaderChild = await loaderCommand.spawn();
      } catch (error) {
        console.log(error);
        resolve({
          success: false,
          error:
            "Failed to start injector! Check whether the loader is present!",
        });
      }

      robloxKillCheck = setInterval(async function () {
        if (get(WindowManager.currentState).isRobloxPresent === false) {
          WindowManager.updateInjectionStatus("Idle");
          await loaderChild.kill();
          clearTimeout(killTimeout);
          clearInterval(robloxKillCheck);
          resolve({
            success: false,
            error: "Roblox was closed while injecting",
          });
        }
      }, 500);

      killTimeout = setTimeout(async function () {
        await loaderChild.kill();
        clearInterval(robloxKillCheck);
      }, 15000);
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

    WindowManager.updateInjectionStatus("Injecting");
    const { success, error } = await LoaderManager.inject(autoInject);

    if (success) {
      WindowManager.updateInjectionStatus("Attached");
    } else {
      WindowManager.updateInjectionStatus("Idle");
      WindowManager.showGenericError("Injection has failed", error);
    }
  }

  public static async setupWebsocket() {
    if (!(await FileSystemService.exists(dirPaths.autoExecDir))) {
      const dirResults = await FileSystemService.createDirectory(
        dirPaths.autoExecDir
      );
      if (!dirResults.success) {
        return WindowManager.showFatalErrorPopup(
          `Failed to create autoexec directory. Error: ${dirResults.error}`
        );
      }
    }

    const code = `
    while task.wait(0.25) do
        if getgenv().KR_READY then
            return
        end

        pcall(function()
            getgenv().KR_WEBSOCKET = websocket.connect("ws://127.0.0.1:${this.wsPort}")
            getgenv().KR_WEBSOCKET:Send("connect")
            getgenv().KR_READY = true
            local lastAlive = nil

            getgenv().KR_WEBSOCKET.OnMessage:Connect(function(message)
                if message == "kr-ping" then
                    lastAlive = os.time()
                else
                    local func, err = loadstring(message)

                    if not func then
                        error(err)
                    else
                        task.spawn(func)
                    end
                end
            end)

            while getgenv().KR_READY and task.wait(0.1) do
                if lastAlive and os.time() - lastAlive > 1 then
                    pcall(function ()
                        getgenv().KR_WEBSOCKET:Close()
                    end)

                    getgenv().KR_READY = false
                end
            end
        end)
    end
        `
      .replace(/(--.*$|\/\*[\s\S]*?\*\/)/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    const results = await FileSystemService.writeFile(
      filePaths.krampuiWebsocketCode,
      code
    );

    if (!results.success) {
      return WindowManager.showFatalErrorPopup(
        `Failed to create websocket code file. Error: ${results.error}`
      );
    }
  }

  public static async checkForLoader() {
    const isLoaderPresent = await FileSystemService.exists(filePaths.loader);
    this.isLoaderPresent.set(isLoaderPresent);
  }

  public static async initialize() {
    await this.checkForLoader();
    await this.setupWebsocket();
    invoke("initialize_websocket", { port: this.wsPort });
  }
}
