<script lang="ts">
  import FileExplorerFolderEntry from "./FileExplorerFolderEntry.svelte";
  import FileExplorerFileEntry from "./FileExplorerFileEntry.svelte";
  import type { FileData, FileFolder } from "../../managers/FileExplorerManager";
  import FileExplorerManager from "../../managers/FileExplorerManager";

  let currentFiles: FileData[];
  FileExplorerManager.currentFiles.subscribe((value) => {
    currentFiles = value;
  });

  let currentFolders: FileFolder[];
  FileExplorerManager.currentFolders.subscribe((value) => {
    currentFolders = value;
  });

  let areWeSearching: boolean;
  FileExplorerManager.areWeSearching.subscribe((value) => {
    areWeSearching = value;
  });

  let searchResults: FileData[];
  FileExplorerManager.searchResults.subscribe((value) => {
    searchResults = value;
  });
</script>

<div class="file-explorer">
    {#if areWeSearching === true} 
        {#if searchResults.length === 0}
            <p class="no-files-found">No files found</p>
        {/if}
        {#each searchResults as file}
            <FileExplorerFileEntry fileName={file.title} fileId={file.id} />
        {/each}
    {:else} 
        {#each currentFolders as folder}
            <FileExplorerFolderEntry name={folder.folderName === "autoexec" ? "Auto Exec " : folder.folderName} icon={folder.folderIcon}>
                {#if folder.isOpen === true} 
                    {#each currentFiles as file}
                        {#if file.folderName === folder.folderName}
                            <FileExplorerFileEntry fileName={file.title} fileId={file.id} />
                        {/if}
                    {/each}
                {/if}
            </FileExplorerFolderEntry>
        {/each}

        {#each currentFiles as file}
            {#if file.folderName === "scripts"}
                <FileExplorerFileEntry fileName={file.title} fileId={file.id} />
            {/if}
        {/each}
    {/if}
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

    :global(.no-files-found) {
        text-align: center;
        padding-right: 6px;
    }
</style>