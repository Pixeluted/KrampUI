<script lang="ts">
    import { invoke } from "@tauri-apps/api";
    import EditorManager from "../../managers/EditorManager";
    import type { WindowState } from "../../managers/WindowManager";
    import WindowManager from "../../managers/WindowManager";
    import Button from "../Button.svelte";
    import { TabsManager } from "../../managers/TabsManager";
    import LoaderManager from "../../managers/LoaderManager";
    import { FileSystemService } from "../../services/FilesystemService";
    import { dirPaths } from "../../dir-config";
    
    let injectButtonDisabled = false;
    let killButtonDisabled = false;
    let executeButtonDisabled = false;

    let windowState: WindowState;
    WindowManager.currentState.subscribe(newValue => {
        windowState = newValue;

        killButtonDisabled = !windowState.isRobloxPresent;
        
        if (windowState.injectionStatus == "Attached") {
            executeButtonDisabled = false;
        } else {
            executeButtonDisabled = true;
        }

        if (windowState.isRobloxPresent && windowState.injectionStatus == "Idle") {
            injectButtonDisabled = false;
        } else {
            injectButtonDisabled = true;
        }
    })

    async function openScriptsFolder() {
        const scriptsPath = `${await FileSystemService.getAppPath()}\\${dirPaths.scriptsDir}`

        await invoke("open_file_explorer", { path: scriptsPath });
    }
</script>

<div class="buttons">
    <div class="section">
        <Button buttonType="Secondary" className="left-button" isDisabled={injectButtonDisabled} buttonCallback={LoaderManager.handleInjectionProcess}>
            <i class="fa-solid fa-syringe"></i>
            <span>Inject</span>
        </Button>
        <Button buttonType="Secondary" className="right-button" isDisabled={killButtonDisabled} buttonCallback={() => { invoke("kill_roblox") }}>
            <i class="fa-solid fa-ban"></i>
            <span>Kill</span>
        </Button>
    </div>
    <div class="section">
        <Button buttonType="Secondary" className="left-button" isDisabled={executeButtonDisabled} buttonCallback={TabsManager.executeActiveTab}>
            <i class="fa-solid fa-scroll"></i>
            <span>Execute</span>
        </Button>
        <Button buttonType="Secondary" className="right-button" buttonCallback={() => { EditorManager.setEditorText("", true) }}>
            <i class="fa-solid fa-delete-left"></i>
            <span>Clear</span>
        </Button>
    </div>
    <div class="section">
        <Button buttonType="Secondary" className="left-button" buttonCallback={TabsManager.promptImportTab}>
            <i class="fa-solid fa-upload"></i>
            <span>Import</span>
        </Button>
        <Button buttonType="Secondary" className="right-button" buttonCallback={TabsManager.promptExportTab}>
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Export</span>
        </Button>
    </div>
    <div class="section">
        <Button buttonType="Secondary" buttonCallback={openScriptsFolder}>
            <i class="fa-solid fa-folder"></i>
            <span>Folder</span>
        </Button>
    </div>
</div>

<style>
    .buttons {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        padding-top: 5px;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }

    .buttons .section {
        display: flex;
        flex: 1;
    }

    :global(.left-button) {
        border-top-right-radius: 0px !important;
    }

    :global(.right-button) {
        border-top-left-radius: 0px !important;
    }

    :global(.buttons .section .button) {
        flex-grow: 1;
        padding: 0.3rem 0.8rem;
        white-space: nowrap;
    }

    :global(.buttons .section .button > *) {
        font-size: smaller;
    }

    @media only screen and (max-width: 600px) {
        .buttons .section button span {
            display: none !important;
        }
    }
</style>