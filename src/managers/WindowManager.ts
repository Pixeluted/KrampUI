import { appWindow } from "@tauri-apps/api/window";
import { get, writable } from "svelte/store";
import * as monaco from 'monaco-editor';
import SettingsManager from "./SettingsManager";
import { event } from "@tauri-apps/api";
import { PopupManager } from "./PopupManager";
import { TabsManager } from "./TabsManager";

export type InjectionStatus = "Idle" | "Injecting" | "Attached"
export type WindowOpen = "Executor" | "Settings"
export type WindowState = {
    currentWindow: WindowOpen,
    injectionStatus: InjectionStatus,
    isRobloxPresent: boolean,
    currentEditor: monaco.editor.IStandaloneCodeEditor | null,
    windowHidden: boolean
}

export default class WindowManager {
    public static currentState = writable<WindowState>({
        currentWindow: "Executor",
        injectionStatus: "Idle",
        isRobloxPresent: false,
        currentEditor: null,
        windowHidden: false
    })

    static setup() {
        appWindow.onCloseRequested(e => {
            e.preventDefault();
            WindowManager.exit();
        })

        appWindow.listen("toggle", () => {
            //TODO: Implement toggle
        })

        appWindow.listen("key-press", (event: any) => {
            const key = event.payload.key;
            
            if (key === "Home") {
                WindowManager.toggleWindow();
            }
        })

        appWindow.listen("instances-update", (event: any) => {
            const currentInstances = event.payload.instances;
            
            WindowManager.currentState.update(state => {
                return { ...state, isRobloxPresent: currentInstances.length > 0 }
            })
        })

        appWindow.listen("quit", WindowManager.exit)
    }

    public static showFatalErrorPopup(error: string) {
        PopupManager.showPopup({
            title: "Fatal error",
            message: error,
            buttons: [
                {
                    text: "Exit",
                    isCloseButton: true,
                    onClick: WindowManager.exit
                }
            ]
        })
    }

    static toggleWindow() {
        if (get(SettingsManager.currentSettings).homeToggleEnabled === false) return;

        let isHidden = get(WindowManager.currentState).windowHidden;

        if (isHidden === true) {
            appWindow.show();
        } else {
            appWindow.hide();
        }

        WindowManager.currentState.update(state => {
            return { ...state, windowHidden: !isHidden }
        })
    }

    static updateInjectionStatus(newInjectionStatus: InjectionStatus) {
        WindowManager.currentState.update(state => {
            return { ...state, injectionStatus: newInjectionStatus }
        })
    }

    static toggleSettingsWindow() {
        WindowManager.currentState.update(state => {
            if (state.currentWindow == "Executor") {
                return { ...state, currentWindow: "Settings"}
            } else {
                return { ...state, currentWindow: "Executor"}
            }
        })
    }

    static async exit() {
        await TabsManager.saveTabs();

        appWindow.close();
    }

}