<script lang="ts">
    export let inputType = "text"
    export let placeholder = "";
    export let defaultValue = "";
    export let valueChangeCallback: any = () => { };

    let ourElement: HTMLInputElement;

    function internalValueChangeCallback(event: any) {
        valueChangeCallback(event, ourElement.value);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (ourElement.type == "number") {
            if (!(/[0-9]|Backspace|Tab|ArrowLeft|ArrowRight|Delete|Enter/.test(event.key))) {
                event.preventDefault(); 
            }
        }
    }
</script>

<input type={inputType} on:keydown={handleKeydown} bind:this={ourElement} class="input no-spinner" value={defaultValue} placeholder={placeholder} on:input={internalValueChangeCallback}>

<style>
    input {
        all: unset;
        background-color: var(--light);
        border: 1px solid var(--lighter);
        box-sizing: border-box;
        padding: 0.5rem 1rem;
        border-radius: 2.5px;
        user-select: none;
        transition: background-color 0.2s;
    }

    input::placeholder {
        color: var(--text-dimmed);
    }

    input:focus {
        background-color: var(--lightest);
    }
</style>