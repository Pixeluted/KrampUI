<script lang="ts">
    import { appWindow } from "@tauri-apps/api/window";
    import WindowManager, { type WindowState } from "../managers/WindowManager";

    let windowState: WindowState;
    WindowManager.currentState.subscribe(newValue => {
        windowState = newValue;
    })
</script>

<div class="titlebar">
    <div class="tb-drag" data-tauri-drag-region></div>
    <div class="brand">
        <p class="text" class:idle={windowState.injectionStatus == "Idle"} class:injecting={windowState.injectionStatus == "Injecting"} class:attached={windowState.injectionStatus == "Attached"}>KrampUI</p>
        <p class="version">(2.0.0)</p>
    </div>
    <div class="buttons">
        <button class="tb-button settings-toggle" on:click={WindowManager.toggleSettingsWindow}><i class="fa-solid fa-cog"></i></button>
        <button class="tb-button" on:click={appWindow.minimize}><i class="fa-solid fa-minus"></i></button>
        <button class="tb-button" on:click={appWindow.maximize}><i class="fa-regular fa-square"></i></button>
        <button class="tb-button exit" on:click={WindowManager.exit}><i class="fa-solid fa-times"></i></button>
    </div>
</div>

<style>
    .titlebar {
        display: flex;
        justify-content: space-between;
        background-color: var(--darker);
        width: 100%;
        height: 1.5rem;
        box-sizing: border-box;
        user-select: none;
        position: relative;
        z-index: 100;
    }

    .tb-drag {
        position: absolute;
        top: 0;
        left: 5px;
        width: 99%;
        height: 100%;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        pointer-events: none;
        margin-left: 0.5rem;
    }

    .brand .text {
        font-size: 0.8rem;
    }

    :global(.idle) {
        color: var(--text);
    }

    :global(.injecting) {
        color: var(--yellow);
    }

    :global(.attached) {
        color: var(--green);
    }

    .brand .version {
        font-size: 0.7rem;
        opacity: 75%;
    }

    .buttons {
        display: flex;
        z-index: 1;
    }

    .tb-button {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        padding: 0 0.75rem;
        height: 100%;
        box-sizing: border-box;
        transition: background-color 0.2s;
    }

    .titlebar .tb-button:hover {
        background-color: var(--light);
        cursor: pointer;
    }

    i {
        color: #b9b9b9;
    }

    .exit i {
        font-size: 0.825rem !important
    }

    .exit:hover {
        background-color: #dd353d !important
    }

    .exit:hover > * {
        color: white;
    }
</style>