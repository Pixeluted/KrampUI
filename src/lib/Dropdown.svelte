<script lang="ts">
    import { onMount } from "svelte";
    import DropdownManager from "../managers/DropdownManager";
  import { cli } from "@tauri-apps/api";

    export let buttonCallbacks: Array<() => void> = [];

    let isDropdownOpen = false;
    let dropdownClone: HTMLElement | null = null;
    let ourDropdown: HTMLElement;
    let ignoreNextMouseDown = false;

    function closeDropdown() {
        const dropdownContainer = document.querySelector(".dropdown-container") as HTMLElement;

        if (dropdownClone !== null) {
            dropdownContainer.removeChild(dropdownClone);
            dropdownClone = null;
            isDropdownOpen = false;

            DropdownManager.setCurrentOpenDropdown(null);
        }
    }

    onMount(() => {
        const dropdownParent = ourDropdown.parentElement as HTMLElement;

        function isElementInOurDrodpownParent(element: HTMLElement, maxRecursion = 1) {
            if (element === dropdownParent) return true;
            if (element.parentElement === null) return false;
            if (maxRecursion <= 0) return false;
            return isElementInOurDrodpownParent(element.parentElement, maxRecursion - 1);
        }

        dropdownParent.addEventListener("mousedown", (clickEvent) => {
            if (ourDropdown === null) return;
            if (clickEvent.button !== 2) return;
            if (clickEvent.target === null) return;
            if (!isElementInOurDrodpownParent(clickEvent.target as HTMLElement)) return;
            

            if (DropdownManager.currentOpenDropdown !== null) {
                DropdownManager.currentOpenDropdown.closeDropdownFunc();
            }

            const dropdownContainer = document.querySelector(".dropdown-container") as HTMLElement;

            if (isDropdownOpen && dropdownClone !== null) {
                dropdownContainer.removeChild(dropdownClone);
                dropdownClone = null;
                isDropdownOpen = false;
            }

            dropdownClone = ourDropdown.cloneNode(true) as HTMLElement;
            dropdownClone.style.display = "flex";

            dropdownClone.childNodes.forEach((childElement) => {
                if (childElement instanceof HTMLElement && childElement.tagName === "BUTTON") {
                    childElement.addEventListener("click", () => {
                        buttonCallbacks[parseInt(childElement.dataset.index as string) - 1]();
                        closeDropdown();
                    })
                }
            })

            const offsetedX = clickEvent.clientX + 7;
            const offsetedY = clickEvent.clientY + 7;

            dropdownClone.style.left = `${offsetedX}px`;
            dropdownClone.style.top = `${offsetedY}px`;
            ignoreNextMouseDown = true;
            dropdownContainer.appendChild(dropdownClone);
            isDropdownOpen = true;
            
            DropdownManager.setCurrentOpenDropdown({
                closeDropdownFunc: closeDropdown
            })
        })

        window.addEventListener("mousedown", (clickEvent) => {
            if (ignoreNextMouseDown) {
                ignoreNextMouseDown = false;
                return;
            }

            if (isDropdownOpen && dropdownClone !== null) {
                const dropdownRect = dropdownClone.getBoundingClientRect();

                if (clickEvent.clientX < dropdownRect.left || clickEvent.clientX > dropdownRect.right || clickEvent.clientY < dropdownRect.top || clickEvent.clientY > dropdownRect.bottom) {
                    closeDropdown()
                }
            }
        })
    })
</script>

<div bind:this={ourDropdown} class="dropdown-content-container">
    <slot></slot>
</div>


<style>
    .dropdown-content-container {
        position: absolute;
        display: none; /* Hidden by default */
        min-width: 5rem;
        background-color: var(--dark);
        border: 1px solid var(--lighter);
        border-radius: 2.5px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .dropdown-content-container :global(button) {
        padding: 0.01rem 0.5rem;
        width: 100%;
        border: none;
        background-color: var(--light);
        color: var(--text);
        cursor: pointer;
        pointer-events: all;
        text-align: left;
        font-size: 13px;

        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 0.2rem;
    }

    .dropdown-content-container :global(button > span) {
        text-wrap: nowrap;
    }

    .dropdown-content-container :global(button:hover) {
        background-color: var(--lightest);
    }

    .dropdown-content-container :global(i) {
        font-size: xx-small;
    }
</style>