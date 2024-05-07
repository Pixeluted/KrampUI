import { LogicalSize, appWindow } from "@tauri-apps/api/window";
import { get, writable } from "svelte/store";
import * as monaco from "monaco-editor";
import SettingsManager from "./SettingsManager";
import { PopupManager } from "./PopupManager";
import { TabsManager } from "./TabsManager";
import LoaderManager from "./LoaderManager";
import { FileSystemService } from "../services/FilesystemService";
import { filePaths } from "../dir-config";
import LogManager from "./LogManager";

type WindowDimensions = {
  width: number;
  height: number;
};

export type InjectionStatus = "Idle" | "Injecting" | "Attached";
export type WindowOpen = "Executor" | "Settings";
export type WindowState = {
  currentWindow: WindowOpen;
  injectionStatus: InjectionStatus;
  isRobloxPresent: boolean;
  currentEditor: monaco.editor.IStandaloneCodeEditor | null;
  windowHidden: boolean;
};

export default class WindowManager {
  private static defaultWindowDimensions: WindowDimensions = {
    width: 700,
    height: 400,
  };

  private static homeToggleLock = false;

  public static currentState = writable<WindowState>({
    currentWindow: "Executor",
    injectionStatus: "Idle",
    isRobloxPresent: false,
    currentEditor: null,
    windowHidden: false,
  });

  static setup() {
    appWindow.onCloseRequested((e) => {
      e.preventDefault();
      WindowManager.exit();
    });

    appWindow.listen("toggle", () => {
      WindowManager.toggleWindow();
    });

    document.addEventListener("keydown", (keydownEvent) => {
      if (keydownEvent.key === "Home") {
        WindowManager.toggleWindow(true);
      }
    });

    appWindow.listen("key-press", (event: any) => {
      const key = event.payload.key;

      if (key === "Home") {
        WindowManager.toggleWindow();
      }
    });

    appWindow.listen("websocket-update", (event: any) => {
      const updatePayload = event.payload;

      if (updatePayload.websocket_count_update === true) {
        if (updatePayload.new_count > 0) {
          // Override injection status, since when websockets are present, the client is always attached
          WindowManager.updateInjectionStatus("Attached");
        } else if (
          updatePayload.new_count === 0 &&
          get(WindowManager.currentState).isRobloxPresent === false
        ) {
          WindowManager.updateInjectionStatus("Idle");
        }
      }
    });

    appWindow.listen("instances-update", (event: any) => {
      const currentInstances = event.payload.instances;
      let isRobloxPresentNew = currentInstances.length > 0;

      if (isRobloxPresentNew === false) {
        WindowManager.updateInjectionStatus("Idle");
      } else {
        if (get(SettingsManager.currentSettings).autoInject === true) {
          LoaderManager.handleInjectionProcess(true);
        }
      }

      WindowManager.currentState.update((state) => {
        return { ...state, isRobloxPresent: isRobloxPresentNew };
      });
    });

    appWindow.listen("quit", WindowManager.exit);
  }

  public static async initialize() {
    if (!(await FileSystemService.exists(filePaths.dimensions))) {
      await FileSystemService.writeFile(
        filePaths.dimensions,
        JSON.stringify(WindowManager.defaultWindowDimensions, null, 2)
      );
    } else {
      const dimensionsContent = await FileSystemService.readFile(
        filePaths.dimensions
      );
      if (dimensionsContent === null) {
        WindowManager.showWarningPopup(
          "Failed to read window dimensions file. Using default dimensions."
        );

        LogManager.log(
          "Failed to read window dimensions file. Using default dimensions.",
          "warn"
        );
        return;
      }

      const parsedDimensions =
        await FileSystemService.parseJSON<WindowDimensions>(dimensionsContent);
      if (parsedDimensions === null) {
        WindowManager.showWarningPopup(
          "Failed to parse window dimensions file. Using default dimensions."
        );

        LogManager.log(
          "Failed to parse window dimensions file. Using default dimensions.",
          "warn"
        );
        return;
      }

      await appWindow.setSize(
        new LogicalSize(parsedDimensions.width, parsedDimensions.height)
      );
      await appWindow.center();
    }
  }

  public static showGenericError(title: string, message: string) {
    PopupManager.showPopup({
      title,
      message,
      buttons: [
        {
          text: "Okay",
          isCloseButton: true,
        },
      ],
    });
  }

  public static showFatalErrorPopup(error: string) {
    PopupManager.showPopup({
      title: "Fatal error",
      message: error,
      buttons: [
        {
          text: "Exit",
          isCloseButton: true,
          onClick: WindowManager.exit,
        },
      ],
    });
  }

  public static showWarningPopup(error: string) {
    PopupManager.showPopup({
      title: "Warning",
      message: error,
      buttons: [
        {
          text: "Close",
          isCloseButton: true,
        },
      ],
    });
  }

  static toggleWindow(force: boolean = false) {
    if (WindowManager.homeToggleLock === true) return;

    const isHomeToggleEnabled = get(
      SettingsManager.currentSettings
    ).homeToggleEnabled;

    if (isHomeToggleEnabled === false && force === false) {
      return;
    }

    WindowManager.homeToggleLock = true;
    let isHidden = get(WindowManager.currentState).windowHidden;

    if (isHidden === true) {
      appWindow.show();
    } else {
      appWindow.hide();
    }

    WindowManager.currentState.update((state) => {
      return { ...state, windowHidden: !isHidden };
    });

    setTimeout(() => {
      WindowManager.homeToggleLock = false;
    }, 300);
  }

  static updateInjectionStatus(newInjectionStatus: InjectionStatus) {
    WindowManager.currentState.update((state) => {
      return { ...state, injectionStatus: newInjectionStatus };
    });
  }

  static toggleSettingsWindow() {
    WindowManager.currentState.update((state) => {
      if (state.currentWindow == "Executor") {
        return { ...state, currentWindow: "Settings" };
      } else {
        return { ...state, currentWindow: "Executor" };
      }
    });
  }

  static async saveWindowDimensions() {
    const currentDimensions = await appWindow.outerSize();

    await FileSystemService.writeFile(
      filePaths.dimensions,
      JSON.stringify(
        {
          width: currentDimensions.width,
          height: currentDimensions.height,
        },
        null,
        2
      )
    );
  }

  static async exit() {
    LogManager.log("Exiting application!");
    await WindowManager.saveWindowDimensions();
    await TabsManager.saveTabs();

    appWindow.close();
  }
}
