import "./styles.css";
import App from "./App.svelte";
import WindowManager from "./managers/WindowManager";
import { DataManager } from "./managers/DataManager";
import { invoke } from "@tauri-apps/api";
import LogManager from "./managers/LogManager";

(async () => {
  await LogManager.initialize();
  LogManager.log("Application started");

  invoke("init_key_events");
  invoke("start_roblox_check_loop");

  WindowManager.setup();
  DataManager.initialize();
})();

const app = new App({
  target: document.getElementById("app") as HTMLElement,
});

// Prevent context menu
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  return false;
});

document.addEventListener("error", (e) => {
  LogManager.log(`Uncaught error: ${e}`);
});

export default app;
