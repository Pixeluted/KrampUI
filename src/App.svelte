<script lang="ts">
  import { appWindow } from "@tauri-apps/api/window";
  import Titlebar from "./lib/Titlebar.svelte";
  import WindowManager, { type WindowState } from "./managers/WindowManager";
  import Executor from "./windows/Executor.svelte";
  import Settings from "./windows/Settings.svelte";
  import Popup from "./lib/Popup.svelte";
  
  let currentWindowState: WindowState;
  WindowManager.currentState.subscribe(newValue => {
    currentWindowState = newValue
  });

  (async () => {
    await appWindow.show()
    await appWindow.center();
  })()
</script>

<main>
  <Titlebar />

  {#if currentWindowState.currentWindow == "Executor"}
    <Executor />
  {:else if currentWindowState.currentWindow == "Settings"} 
    <Settings />
  {/if}

  <Popup />

  <div class="dragging-container">

  </div>
</main>


<style>
  main {
    border-radius: 3px;
    overflow: hidden;
  }

  .dragging-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>