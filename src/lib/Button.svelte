<script lang="ts">
    import { onMount } from "svelte";
    export let buttonType: "Primary" | "Secondary" = "Primary";
    export let isDisabled = false;
    export let buttonCallback = () => {};
    export let className = "";
    
    let buttonElement: HTMLButtonElement;

    function createRippleEffect(clickEvent: MouseEvent) {
        const buttonRect = buttonElement.getBoundingClientRect()
        const x = clickEvent.clientX - buttonRect.left;
        const y = clickEvent.clientY - buttonRect.top;

        const rippleElement = document.createElement("span");
        rippleElement.style.left = `${x}px`;
        rippleElement.style.top = `${y}px`;
        rippleElement.classList.add("ripple");

        buttonElement.appendChild(rippleElement);

        setTimeout(() => {
            rippleElement.remove();
        }, 600)
    }

    async function handleButtonClick(clickEvent: MouseEvent) {
        createRippleEffect(clickEvent);
        await buttonCallback();
    }

    onMount(() => {
        if (buttonType == "Primary") {
            buttonElement.style.setProperty("--main-color", "var(--primary)");
            buttonElement.style.setProperty("--hover-color", "var(--primary)")
        } else if (buttonType == "Secondary") {
            buttonElement.style.setProperty("--main-color", "var(--dark)");
            buttonElement.style.setProperty("--hover-color", "var(--light)")
        }
    });
</script>

<button bind:this={buttonElement} on:click={handleButtonClick} class={`button ${className}`} class:disabled={isDisabled} class:secondary={buttonType === "Secondary"}>
    <slot></slot>
</button>

<style>
    button {
        all: unset;
        position: relative;
        overflow: hidden;
        background-color: var(--main-color);
        padding: 0.5rem 1rem;
        border-radius: 2.5px;
        box-sizing: border-box;
        cursor: pointer;
        text-align: center;
        user-select: none;
        transition: background-color 0.2s;
    }

    button.secondary {
        border: 0.25px solid var(--lighter);
    }

    .disabled {
        opacity: 25% !important;
        pointer-events: none !important;
    }

    button:hover {
        background-color: var(--hover-color);
    }

    :global(button .ripple) {
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: var(--lighter);
        transform: translate(-50%, -50%);
        border-radius: 50%;
        pointer-events: none;
        animation: ripples 0.6s linear forwards;
    }

    @keyframes ripples {
        0% {
            width: 0px;
            height: 0px;
            opacity: 0.5;
        }
        100% {
            width: 500px;
            height: 500px;
            opacity: 0;
        }
    }
</style>