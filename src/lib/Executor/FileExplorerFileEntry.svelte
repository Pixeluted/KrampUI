<script lang="ts">
  import { onMount } from "svelte";
    import FileExplorerManager from "../../managers/FileExplorerManager";
    import Dropdown from "../Dropdown.svelte";

    export let fileName = "";
    export let fileId = "";

    let fileElement: HTMLElement;

    onMount(() => {
        fileElement.addEventListener("dblclick", () => {
            FileExplorerManager.openFileInTabs(fileId);
        })
    })

    let isRenaming = false;
    let currentRenameValue = fileName;
    let ignoreNextMouseDown = false;

    function renameInput(inputEvent: any) {
        const target = inputEvent.target as HTMLElement;
        if (!target) return;

        currentRenameValue = target.innerText;
    }

    function startRenaming() {
        if (isRenaming === true) return;
        let nameSpan = fileElement.querySelector("span") as HTMLElement;

        nameSpan.style.backgroundColor = "var(--darker)";
        nameSpan.style.borderRadius = "6px";
        nameSpan.contentEditable = "true";
        nameSpan.focus();
        isRenaming = true;
        ignoreNextMouseDown = true;
    }

    function stopRenaming() {
        if (isRenaming === false) return;
        let nameSpan = fileElement.querySelector("span") as HTMLElement;

        nameSpan.style.backgroundColor = "";
        nameSpan.style.borderRadius = "";
        nameSpan.contentEditable = "false";
        isRenaming = false;

        if (currentRenameValue !== fileName) {
            FileExplorerManager.renameFile(fileId, currentRenameValue);
        }
    }

    window.addEventListener("mousedown", (mouseEvent) => {
        if (ignoreNextMouseDown === true) {
            ignoreNextMouseDown = false;
            return;
        }

        if (isRenaming === true) {
            const target = mouseEvent.target as HTMLElement;
            if (!target) return;

            if (target !== fileElement && !fileElement.contains(target)) {
                stopRenaming();
            }
        }
    })

    window.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter") {
            stopRenaming();
        }
    })
</script>

<div class="file-entry" bind:this={fileElement}>
    <i class="fa-solid fa-file"></i>
    <span on:input={renameInput}>{fileName}</span>
    <Dropdown buttonCallbacks={[
        () => { FileExplorerManager.executeFile(fileId) },
        () => { startRenaming() } 
    ]}>
        <button data-index="1">
            <i class="fa-solid fa-scroll"></i>
            <span>Execute</span>
        </button>
        <button data-index="2">
            <i class="fa-solid fa-pencil"></i>
            <span>Rename</span>
        </button>
    </Dropdown>
</div>

<style>
    .file-entry {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        border-radius: 3px;
        padding: 0px 5px;
        padding-left: 3px;
        transition: background-color 0.02s linear;
        box-sizing: content-box;
    }

    .file-entry span {
        all: unset;
    }

    .file-entry:hover {
        background-color: var(--lighter);
    }

    .file-entry i {
        font-size: 12px;
    }

    .file-entry span {
        font-size: 13px;
    }
</style>