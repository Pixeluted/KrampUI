import "./styles.css";
import App from "./App.svelte";
import WindowManager from "./managers/WindowManager";
import { DataManager } from "./managers/DataManager";
import { invoke } from "@tauri-apps/api";
import { PopupManager } from "./managers/PopupManager";

const app = new App({
  target: document.getElementById("app") as HTMLElement,
});

// Prevent context menu
document.addEventListener("contextmenu", (e) => {
  e.preventDefault()
  return false;
})

invoke("init_key_events");
invoke("start_roblox_check_loop");
WindowManager.setup()
DataManager.initialize();

export default app;
