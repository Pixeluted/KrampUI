<script lang="ts">
  import ExecutorButtons from "../lib/Executor/ExecutorButtons.svelte";
  import Input from "../lib/Input.svelte";
  import Tabs from "../lib/Executor/Tabs.svelte";
  import ScriptEditor from "../lib/Executor/ScriptEditor.svelte";
  import FileExplorer from "../lib/Executor/FileExplorer.svelte";
  import FileExplorerManager from "../managers/FileExplorerManager";

  function handleSearchInput(_, newValue: string) {
    FileExplorerManager.updateSearchInput(newValue);
  }
</script>

<main>
    <ExecutorButtons/>
    <div class="content-container">
        <div class="tab-editor-container">
            <Tabs/>
            <ScriptEditor/>
        </div>
        <div class="search-file-explorer-container">
            <Input placeholder="Search" valueChangeCallback={handleSearchInput} />
            <FileExplorer/>
        </div>
    </div>
</main>

<style>
    main {
        height: calc(100vh - 24px); /* Full viewport size - size of title bar */
        background-color: var(--dark);
    }

    .content-container {
        display: flex;
        height: calc(100vh - 24px - 35px - 20px);  /* Full viewport size - size of title bar - size of buttons - size of tabs */
        margin-top: 8px;
        margin-right: 8px;
        margin-left: 8px;
        gap: 0.5rem;
    }

    .search-file-explorer-container {
        display: flex;
        flex-direction: column;
        gap: 0.26rem;
        overflow: auto;
        max-width: 12rem;
    }

    .tab-editor-container {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        flex: 1;
        min-width: 50%;
    }

    .search-file-explorer-container :global(input) {
        padding: 0.7rem 0.3rem;
        height: 15px;
        font-size: smaller;
    }
</style>