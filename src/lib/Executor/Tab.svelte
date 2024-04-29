<script lang="ts">
    import { TabsManager } from "../../managers/TabsManager";

    export let isFile = false;
    export let isSelected = false;
    export let isUnsaved = false;
    export let scriptName = "Script";
    export let tabId = "";

    let draggingContainer = document.querySelector(".dragging-container") as HTMLElement;

    let tabElement: HTMLElement;
    let mouseEntered = false;
    let isMouseDown = false;
    let isDragging = false;
    let tabClone: HTMLElement | null = null;
    let currentlyHighlightedElement: HTMLElement | null = null;

    function startDragging() {
        isDragging = true;
        tabClone = tabElement.cloneNode(true) as HTMLElement;
        tabClone.style.position = "absolute";
        tabClone.style.zIndex = "1000";
        tabClone.style.pointerEvents = "none";
        draggingContainer.appendChild(tabClone);
    }

    function stopDragging() {
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

    window.addEventListener("mousedown", () => {
        isMouseDown = true;

        if (mouseEntered === true && isDragging === false) {
            setTimeout(() => {
                if (mouseEntered === false) return;
                if (isMouseDown === false) return;

                startDragging();
            }, 100);
        }
    })

    window.addEventListener("mousemove", (moveEvent) => {
        if (isDragging === true && tabClone !== null) {
            tabClone.style.left = `${moveEvent.clientX - tabClone.offsetWidth / 2}px`;
            tabClone.style.top = `${moveEvent.clientY - tabClone.offsetHeight / 2}px`;

            let finalTab;

            const target = moveEvent.target as HTMLElement;
            if (!target) return;

            if (target !== currentlyHighlightedElement) {
                if (currentlyHighlightedElement !== null) {
                    (currentlyHighlightedElement as HTMLElement).style.backgroundColor = "";
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

            if (currentlyHighlightedElement !== null) {
                (currentlyHighlightedElement as HTMLElement).style.backgroundColor = "";
                currentlyHighlightedElement = null;
            }

            currentlyHighlightedElement = finalTab;
            (finalTab as HTMLElement).style.backgroundColor = "var(--primary)";
        }
    })

    window.addEventListener("mouseup", (e) => {
        isMouseDown = false;
        console.log(e.target)

        if (isDragging === true) {
            stopDragging();

            if (currentlyHighlightedElement !== null) {
                (currentlyHighlightedElement as HTMLElement).style.backgroundColor = "";
                const finalTabId = (currentlyHighlightedElement as HTMLElement).dataset.tabId;
                if (!finalTabId) return;

                TabsManager.moveTab(tabId, finalTabId);
            }
        }
    })
</script>

<button class="tab" data-tab-id={tabId} class:selected={isSelected} bind:this={tabElement} on:mouseenter={elementMouseEntered} on:mouseleave={elementMouseLeft} on:click={() => { TabsManager.setActiveTab(tabId) } }>
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