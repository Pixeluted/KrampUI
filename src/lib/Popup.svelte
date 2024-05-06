<script lang="ts">
    import { PopupManager, type ButtonData, type PopupState } from "../managers/PopupManager";
    import Button from "./Button.svelte";

    let currentPopupState: PopupState;
    PopupManager.currentPopupState.subscribe(newValue => {
        currentPopupState = newValue;
    });

    function handleButtonClick(buttonData: ButtonData) {
        if (buttonData.isCloseButton) {
            PopupManager.closePopup();
        }

        if (buttonData.onClick) {
            buttonData.onClick();
        }
    }
</script>

{#if currentPopupState.popupVisible && currentPopupState.currentPopup}
    <div class="popup-background"> </div>

    <div class="popup-container">
        <div class="popup-content">
            <h1>{currentPopupState.currentPopup.title}</h1>
            <span>{currentPopupState.currentPopup.message}</span>
            <div class="buttons">
                {#each currentPopupState.currentPopup.buttons as button}
                    <Button buttonType="Secondary" buttonCallback={() => { handleButtonClick(button) }}>
                        <span>{button.text}</span>
                    </Button>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .popup-background {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 99;
        background-color: var(--light);
        opacity: 50%;
        width: 100%;
        height: calc(100vh - 24px);
    }

    .popup-container {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 99;
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .popup-content {
        position: fixed;
        z-index: 99;
        background-color: rgb(30, 31, 36);
        border: 0.25px solid var(--lighter);
        border-radius: 5px;
        opacity: 100%;
        padding: 1rem;

        display: flex;
        flex-direction: column;

        max-width: 30rem;
    }

    .popup-content h1 {
        font-size: larger;
        text-align: center;
        user-select: none;
    }

    .popup-content span {
        text-align: center;
        user-select: none;
    }

    .buttons {
        display: flex;
        margin-top: 10px;
        justify-content: center;
        gap: 1rem;
    }

    .buttons :global(button) {
        background-color: var(--lightest);
        min-width: 3rem;
        height: 1.5rem;
        flex-grow: 1;
        flex-basis: 3rem;
        box-sizing: border-box;

        display: flex;
        align-items: center;
        justify-content: center;
    }

    .buttons :global(button span) {
        font-size: smaller;
        text-align: center;
    }
</style>