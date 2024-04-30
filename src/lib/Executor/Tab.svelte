<script lang="ts">
    import { invoke } from "@tauri-apps/api";
    import { TabsManager } from "../../managers/TabsManager";
    import Dropdown from "../Dropdown.svelte";

    export let isFile = false;
    export let isSelected = false;
    export let isUnsaved = false;
    export let scriptName = "Script";
    export let tabId = "";

    // Dragging
    let tabElement: HTMLElement;
    let mouseEntered = false;
    let isMouseDown = false;
    let isDragging = false;
    let tabClone: HTMLElement | null = null;
    let currentlyHighlightedElement: HTMLElement | null = null;

    function startDragging(mouseEvent: MouseEvent) {
        if (tabElement === null) return;
        const draggingContainer = document.querySelector(".dragging-container") as HTMLElement;

        isDragging = true;
        tabClone = tabElement.cloneNode(true) as HTMLElement;
        tabClone.style.position = "absolute";
        tabClone.style.zIndex = "1000";
        tabClone.style.pointerEvents = "none";

        tabClone.style.left = `${mouseEvent.clientX - tabClone.offsetWidth / 2}px`;
        tabClone.style.top = `${mouseEvent.clientY - tabClone.offsetHeight / 2}px`;

        draggingContainer.appendChild(tabClone);
    }

    function stopDragging() {
        const draggingContainer = document.querySelector(".dragging-container") as HTMLElement;

        isDragging = false;
        if (tabClone !== null) {
            draggingContainer.removeChild(tabClone);
            tabClone = null;
        }
    }

    function elementMouseEntered() {
        mouseEntered = true;
    }

    function elementMouseLeft() {
        mouseEntered = false;
    }

    window.addEventListener("mousedown", (mouseEvent) => {
        if (mouseEvent.button !== 0) return;
        isMouseDown = true;

        if (mouseEntered === true && isDragging === false) {
            setTimeout(() => {
                if (mouseEntered === false) return;
                if (isMouseDown === false) return;

                startDragging(mouseEvent);
            }, 50);
        }
    })

    window.addEventListener("mousemove", (moveEvent) => {
        if (isDragging === true && tabClone !== null) {
            tabClone.style.left = `${moveEvent.clientX - tabClone.offsetWidth / 2}px`;
            tabClone.style.top = `${moveEvent.clientY - tabClone.offsetHeight / 2}px`;

            let finalTab: HTMLElement | null = null;

            const target = moveEvent.target as HTMLElement;
            if (!target) return;

            const higlightedItem = currentlyHighlightedElement as HTMLElement

            if (target !== higlightedItem) {
                if (higlightedItem !== null) {
                    higlightedItem.style.backgroundColor = "";
                    currentlyHighlightedElement = null;
                }
            }

            if (target.classList.contains("tab")) {
                finalTab = target;
            } else {
                const targetParent = target.parentElement as HTMLElement;
                if (!targetParent) return;

                if (targetParent.classList.contains("tab")) {
                    finalTab = targetParent;
                } else {
                    return
                }
            }

            if (finalTab === tabElement) return;

            if (higlightedItem !== null) {
                higlightedItem.style.backgroundColor = "";
                currentlyHighlightedElement = null;
            }

            currentlyHighlightedElement = finalTab;
            currentlyHighlightedElement.style.backgroundColor = "var(--primary)";
        }
    })

    window.addEventListener("mouseup", (mouseEvent) => {
        if (mouseEvent.button !== 0) return;
        isMouseDown = false;

        if (isDragging === true) {
            stopDragging();
            const higlightedItem = currentlyHighlightedElement as HTMLElement

            if (higlightedItem !== null) {
                higlightedItem.style.backgroundColor = "";
                const finalTabId = higlightedItem.dataset.tabId;
                if (!finalTabId) return;

                TabsManager.moveTab(tabId, finalTabId);
            }
        }
    })

    // Rename

    let isRenaming = false;
    let currentRenameValue = scriptName;
    let ignoreNextMouseDown = false;

    function handleRenameInput(inputEvent: any) {
        const target = inputEvent.target as HTMLElement;
        if (!target) return;

        currentRenameValue = target.innerText;
    }

    function startRenaming() {
        if (isRenaming === true) return;
        let nameSpan = tabElement.querySelector("span") as HTMLElement;

        nameSpan.style.backgroundColor = "var(--darker)";
        nameSpan.style.borderRadius = "6px";
        nameSpan.contentEditable = "true";
        nameSpan.focus();
        isRenaming = true;
        ignoreNextMouseDown = true;
    }

    function stopRenaming() {
        if (isRenaming === false) return;
        let nameSpan = tabElement.querySelector("span") as HTMLElement;

        nameSpan.style.backgroundColor = "";
        nameSpan.style.borderRadius = "";
        nameSpan.contentEditable = "false";
        isRenaming = false;

        if (currentRenameValue !== scriptName) {
            TabsManager.renameTab(tabId, currentRenameValue);
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

            if (target !== tabElement && !tabElement.contains(target)) {
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

<button class="tab" data-tab-id={tabId} class:selected={isSelected} bind:this={tabElement} on:mouseenter={elementMouseEntered} on:mouseleave={elementMouseLeft} on:click={() => { TabsManager.setActiveTab(tabId) } }>
    <i class="fa-solid fa-{isFile ? 'file' : 'scroll'}"></i>
    <span on:input={handleRenameInput}>{scriptName}</span>
    {#if isUnsaved}
        <i class="fa-solid fa-pencil"></i>
    {/if}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <i class="fa-solid fa-x" on:click={() => { TabsManager.deleteTab(tabId) }}></i>
    <Dropdown buttonCallbacks={[
        () => { invoke("execute_script", { script: TabsManager.getTabContent(tabId) }) },
        () => { startRenaming() }
    ]}>
        <button data-index="1">
            <i class="fa-solid fa-scroll"></i>
            <span>Execute</span>
        </button>
        <button data-index="2">
            <i class="fa-solid fa-font"></i>
            <span>Rename</span>
        </button>
    </Dropdown>
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
        all: unset;
        font-size: smaller;
    }
</style>