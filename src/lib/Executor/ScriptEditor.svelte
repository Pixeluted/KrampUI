<script lang="ts">
    import { onMount } from 'svelte';
    import EditorManager from '../../managers/EditorManager';
    import { TabsManager } from '../../managers/TabsManager';

    let scriptContainer: HTMLElement;
    onMount(() => {
        EditorManager.setupEditor(scriptContainer);
        EditorManager.setEditorText(TabsManager.getActiveTabContent(), false);
        EditorManager.setEditorScroll(TabsManager.getActiveTabScroll());
    })
</script>

<div bind:this={scriptContainer} class="script-container">

</div>

<style>
    .script-container {
        height: 100%;
        border: 1px solid var(--lighter);
        border-radius: 2.5px;
        box-sizing: border-box;
        overflow: hidden;
        text-align: left;

        display: grid;
        grid-template-columns: 0px minmax(0px, auto);
    }

</style>