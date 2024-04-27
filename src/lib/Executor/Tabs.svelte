<script lang="ts">
  import { afterUpdate } from "svelte";
  import { TabsManager, type TabData } from "../../managers/TabsManager";
  import Button from "../Button.svelte";
  import Tab from "./Tab.svelte";
  import EditorManager from "../../managers/EditorManager";

  let currentTabs: TabData[] = [];
  TabsManager.currentTabs.subscribe(newValue => {
    currentTabs = newValue;
  })

  afterUpdate(() => {
    EditorManager.editor?.layout();
  })
</script>

<div class="tabs">
    <div class="list">
        {#each currentTabs as tab}
            <Tab scriptName={tab.title} tabId={tab.id} isSelected={tab.isActive} isFile={tab.type === "File"} isUnsaved={tab.isModified} />
        {/each}
    </div>
    <Button buttonType="Secondary" buttonCallback={() => { TabsManager.addTab(false) }}>
        <i class="fa-solid fa-plus"></i>
    </Button>
</div>

<style>
    .tabs {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.4rem;
        width: 100%;
    }

    .list {
        flex-basis: 100%;
        display: flex;
        gap: 0.3rem;
        align-items: center;
        overflow-x: auto;
    }

    :global(.tabs .button) {
        padding: 0.05rem 0.4rem;
    }

    :global(.tabs .button > *) {
        font-size: smaller;
    }
</style>