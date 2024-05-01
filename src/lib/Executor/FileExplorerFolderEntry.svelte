<script lang="ts">
    import Dropdown from "../Dropdown.svelte";
import FileExplorerFileEntry from "./FileExplorerFileEntry.svelte";

    export let icon;
    export let name;
</script>

<div class="folder-container">
    <div class="info-container">
        <i class={icon}></i>
        <span>{name}</span>
        <Dropdown>
            <button data-index="1">
                <i class="fa-solid fa-folder"></i>
                <span>New File</span>
            </button>
        </Dropdown>
    </div>
    <div class="folder-content-container">
        <slot></slot>
    </div>
</div>

<style>
    .folder-container {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        gap: 5px;
        pointer-events: all;
    }

    .folder-container .info-container {
        white-space: nowrap;
        cursor: pointer;
        transition: background-color 0.02s linear;
        border-radius: 3px;
    }

    .info-container:hover {
        background-color: var(--lighter);
    }

    .folder-container .info-container i {
        font-size: 12px;
    }

    .folder-container .info-container span {
        text-wrap: nowrap;
        font-size: 13px;
    }

    .folder-content-container {
        padding-left: 8px;
    }

    .folder-content-container {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
</style>