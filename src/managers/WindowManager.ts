import { LogicalSize, appWindow } from "@tauri-apps/api/window";
import { get, writable } from "svelte/store";
import * as monaco from "monaco-editor";
import SettingsManager from "./SettingsManager";
import { event } from "@tauri-apps/api";
import { PopupManager } from "./PopupManager";
import { TabsManager } from "./TabsManager";
import LoaderManager from "./LoaderManager";
import { FileSystemService } from "../services/FilesystemService";
import { dirPaths, filePaths } from "../dir-config";

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
      //TODO: Implement toggle
    });

    appWindow.listen("key-press", (event: any) => {
      const key = event.payload.key;

      if (key === "Home") {
        WindowManager.toggleWindow();
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
      const parsedDimensions = JSON.parse(
        (await FileSystemService.readFile(filePaths.dimensions)) as string
      ) as WindowDimensions;

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

  static toggleWindow() {
    if (get(SettingsManager.currentSettings).homeToggleEnabled === false)
      return;

    let isHidden = get(WindowManager.currentState).windowHidden;

    if (isHidden === true) {
      appWindow.show();
    } else {
      appWindow.hide();
    }

    WindowManager.currentState.update((state) => {
      return { ...state, windowHidden: !isHidden };
    });
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
    await WindowManager.saveWindowDimensions();
    await TabsManager.saveTabs();

    appWindow.close();
  }
}
