import { get, writable } from "svelte/store";
import { FileSystemService } from "../services/FilesystemService";
import EditorManager from "./EditorManager";
import WindowManager from "./WindowManager";
import { dialog } from "@tauri-apps/api";
import Tab from "../lib/Executor/Tab.svelte";

export type TabType = "File" | "Ephemeral";
export type TabData = {
  id: string;
  type: TabType;
  filePath?: string;
  tabScroll: number;
  tabOrder: number;
  title: string;
  content: string;
  isModified: boolean;
  isActive: boolean;
};

export class TabsManager {
  private static defaultTabContent = 'print("KrampUI on top")';
  private static defaultTabs: TabData[] = [
    {
      id: this.generateUniqueID(),
      type: "Ephemeral",
      tabOrder: 0,
      tabScroll: 0,
      title: "Script",
      content: this.defaultTabContent,
      isModified: false,
      isActive: true,
    },
  ];

  public static currentTabs = writable<TabData[]>(this.defaultTabs);
  public static activeTab: TabData = this.currentTabs[0];

  private static generateUniqueID(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private static updateTabOrder() {
    this.currentTabs.update((tabs) => {
      tabs.forEach((tab, index) => {
        tab.tabOrder = index;
      });
      return tabs;
    });
  }

  public static async saveTabs() {
    const tabs = get(this.currentTabs);
    const results = await FileSystemService.writeFile(
      "settings/tabs.json",
      JSON.stringify(tabs, null, 2)
    );

    if (!results.success) {
      WindowManager.showFatalErrorPopup(
        `Failed to save tabs. Error: ${results.error}`
      );
    }
  }

  public static getActiveTabContent(): string {
    if (this.activeTab === undefined) return "";
    return this.activeTab.content;
  }

  public static getActiveTabScroll(): number {
    if (this.activeTab === undefined) return 0;
    return this.activeTab.tabScroll;
  }

  public static updateActiveTabContent(content: string) {
    if (this.activeTab === undefined) return;

    this.currentTabs.update((tabs) => {
      tabs.forEach((tab) => {
        if (tab.isActive) {
          tab.content = content;
        }
      });
      return tabs;
    });

    this.saveTabs();
  }

  public static setActiveTabScroll(scroll: number) {
    if (this.activeTab === undefined) return;

    this.currentTabs.update((tabs) => {
      tabs.forEach((tab) => {
        if (tab.isActive) {
          tab.tabScroll = scroll;
        }
      });
      return tabs;
    });

    this.saveTabs();
  }

  public static setActiveTab(tabId: string) {
    if (this.activeTab !== undefined && tabId === this.activeTab.id) return;

    this.currentTabs.update((tabs) => {
      tabs.forEach((tab) => {
        tab.isActive = tab.id === tabId;
      });
      return tabs;
    });

    this.activeTab = get(this.currentTabs).find(
      (tab) => tab.isActive
    ) as TabData;

    EditorManager.setEditorScroll(this.getActiveTabScroll());
    EditorManager.setEditorText(this.getActiveTabContent());
    this.saveTabs();
  }

  public static async promptImportTab() {
    const dialogResults = await dialog.open({
      title: "Import Script",
      filters: [
        {
          name: "Scripts",
          extensions: ["lua", "luau", "txt"],
        },
      ],
      multiple: false,
    });

    if (!dialogResults) {
      return;
    }

    const filePath = dialogResults as string;
    TabsManager.addTab(true, filePath);
  }

  public static async promptExportTab() {
    const dialogResults = await dialog.save({
      title: "Export Script",
      filters: [
        {
          name: "Lua Script",
          extensions: ["lua", "luau"],
        },
        {
          name: "Text File",
          extensions: ["txt"],
        },
      ],
    });

    if (!dialogResults) {
      return;
    }

    const filePath = dialogResults as string;
    const content = TabsManager.getActiveTabContent();
    const results = await FileSystemService.writeFile(filePath, content, true);

    if (!results.success) {
      WindowManager.showWarningPopup(
        `Failed to export script. Error: ${results.error}`
      );
    } else {
      TabsManager.currentTabs.update((tabs) => {
        tabs.forEach((tab) => {
          if (tab.isActive) {
            tab.title = FileSystemService.getFileNameFromPath(filePath);
            tab.type = "File";
            tab.filePath = filePath;
          }
        });
        return tabs;
      });
    }
  }

  public static async addTab(isFile: boolean, filePath?: string) {
    const newTabId = this.generateUniqueID();
    let newTabContent = this.defaultTabContent;

    if (isFile) {
      let content = await FileSystemService.readFile(filePath as string, true);
      newTabContent = content || "";
    }

    this.currentTabs.update((tabs) => {
      tabs.forEach((tab) => {
        tab.isActive = false;
      });

      tabs.push({
        id: newTabId,
        type: isFile ? "File" : "Ephemeral",
        filePath: filePath,
        tabOrder: tabs.length,
        tabScroll: 0,
        title: isFile
          ? FileSystemService.getFileNameFromPath(filePath as string)
          : "Script",
        content: newTabContent,
        isModified: false,
        isActive: true,
      });

      return tabs;
    });

    this.setActiveTab(newTabId);
    this.updateTabOrder();
    this.saveTabs();
  }

  public static deleteTab(tabId: string) {
    if (get(this.currentTabs).length === 1) {
      return;
    }

    this.currentTabs.update((tabs) => {
      const index = tabs.findIndex((tab) => tab.id === tabId);
      if (tabs[index - 1] !== undefined) {
        this.setActiveTab(tabs[index - 1].id);
      } else {
        this.setActiveTab(tabs[index + 1].id);
      }
      tabs.splice(index, 1);
      return tabs;
    });

    this.updateTabOrder();
    this.saveTabs();
  }

  private static findActiveTab(): string {
    const tabs = get(this.currentTabs);
    const activeTab = tabs.find((tab) => tab.isActive);
    return activeTab ? activeTab.id : tabs[0].id;
  }

  public static async saveActiveTab() {
    if (this.activeTab === undefined) return;

    const currentTab = this.activeTab;
    if (currentTab.type == "File" && currentTab.isModified) {
      const saveResults = await FileSystemService.writeFile(
        currentTab.filePath as string,
        currentTab.content,
        true
      );

      if (!saveResults.success) {
        WindowManager.showWarningPopup(
          `Failed to save script. Error: ${saveResults.error}`
        );
      } else {
        this.currentTabs.update((tabs) => {
          tabs.forEach((tab) => {
            if (tab.isActive) {
              tab.isModified = false;
            }
          });
          return tabs;
        });
      }
    }
  }

  public static contentChangedOnActiveTab(newContent: string) {
    if (this.activeTab === undefined) return;

    const currentTab = this.activeTab;
    if (currentTab.type == "File" && !currentTab.isModified) {
      if (newContent == currentTab.content) return;

      this.currentTabs.update((tabs) => {
        tabs.forEach((tab) => {
          if (tab.isActive) {
            tab.isModified = true;
          }
        });
        return tabs;
      });
    }

    TabsManager.updateActiveTabContent(newContent);
  }

  public static async initialize() {
    if (!(await FileSystemService.exists("settings/tabs.json"))) {
      const results = await FileSystemService.writeFile(
        "settings/tabs.json",
        JSON.stringify(this.defaultTabs, null, 2)
      );
      if (!results.success) {
        WindowManager.showFatalErrorPopup(
          `Failed to create default tabs settings file. Error: ${results.error}`
        );
      }
    } else {
      const content = await FileSystemService.readFile("settings/tabs.json");
      if (content) {
        this.currentTabs.set(JSON.parse(content));
      } else {
        WindowManager.showWarningPopup(
          "Failed to read tabs file. Using default tabs."
        );
      }
    }

    this.setActiveTab(this.findActiveTab());
  }
}
