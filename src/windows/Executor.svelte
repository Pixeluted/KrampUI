<script lang="ts">
  import ExecutorButtons from "../lib/Executor/ExecutorButtons.svelte";
  import Input from "../lib/Input.svelte";
  import Tabs from "../lib/Executor/Tabs.svelte";
  import ScriptEditor from "../lib/Executor/ScriptEditor.svelte";
  import FileExplorer from "../lib/Executor/FileExplorer.svelte";

</script>

<main>
    <ExecutorButtons/>
    <div class="content-container">
        <div class="tab-editor-container">
            <Tabs/>
            <ScriptEditor/>
        </div>
        <div class="search-file-explorer-container">
            <Input placeholder="Search"/>
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
        width: auto;
        margin-top: 8px;
        margin-right: 8px;
        margin-left: 8px;
        gap: 0.5rem;
    }

    .search-file-explorer-container {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        gap: 0.26rem;
    }

    .tab-editor-container {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        width: 90%;
    }

    @media only screen and (max-width: 600px) {
        .tab-editor-container {
            width: 70%;
        }
    }

    .search-file-explorer-container :global(input) {
        padding: 0.7rem 0.3rem;
        height: 15px;
        width: 100%;
        font-size: smaller;
    }
</style>