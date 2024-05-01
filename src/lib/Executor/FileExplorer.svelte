<script lang="ts">
  import FileExplorerFolderEntry from "./FileExplorerFolderEntry.svelte";
  import FileExplorerFileEntry from "./FileExplorerFileEntry.svelte";
  import Dropdown from "../Dropdown.svelte";
  import type { FileData } from "../../managers/FileExplorerManager";
  import FileExplorerManager from "../../managers/FileExplorerManager";

  let currentFiles: FileData[];
  FileExplorerManager.currentFiles.subscribe((value) => {
    currentFiles = value;
  });
</script>

<div class="file-explorer">
    <FileExplorerFolderEntry name="Auto Exec" icon="fa-solid fa-robot">
        {#each currentFiles as file}
            {#if file.folder === "Auto Exec"}
                <FileExplorerFileEntry fileName={file.title} fileId={file.id} />
            {/if}
        {/each}
    </FileExplorerFolderEntry>

    {#each currentFiles as file}
        {#if file.folder === "Scripts"}
            <FileExplorerFileEntry fileName={file.title} fileId={file.id} />
        {/if}
    {/each}

    <Dropdown>
        <button data-index="1">
            <i class="fa-solid fa-file"></i>
            <span>New File</span>
        </button>
    </Dropdown>
</div>

<style>
    .file-explorer {
        background-color: var(--light);
        border: 1px solid var(--lighter);
        border-radius: 2.5px;
        box-sizing: border-box;
        user-select: none;
        overflow: auto;
        height: 100%;

        display: flex;
        flex-direction: column;
        gap: 1px;
        padding-top: 5px;
        padding-left: 5px;
    }
</style>