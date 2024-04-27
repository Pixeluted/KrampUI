<script lang="ts">
    import { TabsManager } from "../../managers/TabsManager";

    export let isFile = false;
    export let isSelected = false;
    export let isUnsaved = false;
    export let scriptName = "Script";
    export let tabId = "";
</script>

<button class="tab" class:selected={isSelected} on:click={() => { TabsManager.setActiveTab(tabId) } }>
    <i class="fa-solid fa-{isFile ? 'file' : 'scroll'}"></i>
    <span>{scriptName}</span>
    {#if isUnsaved}
        <i class="fa-solid fa-pencil"></i>
    {/if}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <i class="fa-solid fa-x" on:click={() => { TabsManager.deleteTab(tabId) }}></i>
</button>

<style>
    .tab {
        all: unset;
        display: flex;
        justify-content: center;
        align-items: center;
        border: 0.25px solid var(--lighter);
        padding: 0.1rem 0.25rem;
        background-color: var(--light);
        border-radius: 3px;
        gap: 0.28rem;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.09s linear;
    }

    .tab:hover {
        background-color: var(--lighter);
    }

    .selected {
        background-color: var(--lighter);
        opacity: 75% !important;
    }

    .tab i {
        font-size: xx-small;
    }

    .tab .fa-x {
        cursor: pointer;
    }

    .tab span {
        font-size: smaller;
    }
</style>