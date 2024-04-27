<script lang="ts">
  import Button from "../lib/Button.svelte";
  import Input from "../lib/Input.svelte";
  import type { Settings } from "../managers/SettingsManager";
  import SettingsManager from "../managers/SettingsManager";

  let currentSettings: Settings;
  SettingsManager.currentSettings.subscribe(newValue => {
    currentSettings = newValue;
  })

  function handleSettingClick(key: string) {
    const currentSetting = currentSettings[key];
    SettingsManager.setSetting(key, !currentSetting);
  }

  function handleInputChange(event: InputEvent, newValue: string, key: string) {
    let finalValue = Number.parseInt(newValue);
    finalValue = Number.isNaN(finalValue) ? 0 : finalValue;
    SettingsManager.setSetting(key, finalValue);
  }
</script>

<main>
    <div class="settings">
        {#each Object.entries(SettingsManager.settingsDetails) as [key, setting]}
            <div class="setting">
                <div class="setting-info">
                    <p class="setting-name">{setting.name}</p>
                    <p class="setting-description">{setting.description}</p>
                </div>
                {#if setting.type == "boolean"}
                    <Button buttonType="Secondary" buttonCallback={() => { handleSettingClick(key) }}>
                        <span>{currentSettings[key] == true ? "Enabled" : "Disabled"}</span>
                    </Button>
                {:else} 
                    <Input inputType="number" defaultValue={currentSettings[key]} valueChangeCallback={(event, newValue) => {
                        handleInputChange(event, newValue, key)
                    }}/>
                {/if}
            </div>
        {/each}
    </div>
</main>

<style>
    main {
        height: calc(100vh - 24px); /* Full viewport size - size of title bar */
        background-color: var(--dark);
    }

    .settings {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.5rem;
        overflow: auto;
        height: calc(100vh - 24px - 24px);;
    }

    .settings .setting {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        user-select: none;
    }

    .settings .setting > .setting-info > .setting-name {
        text-wrap: nowrap;
        font-weight: bold;
        user-select: none;
    }

    
    .settings .setting > .setting-info > .setting-description {
        font-size: 0.9rem;
        opacity: 75%;
        user-select: none;
    }

    .settings .setting > :global(button) {
        text-decoration: none;
        text-align: center;
        padding: 0.25rem;
        min-width: 10rem;
        width: 10rem;
        user-select: none;
    }

    .settings .setting > :global(input) {
        text-decoration: none;
        text-align: center;
        padding: 0.25rem;
        min-width: 10rem;
        width: 10rem;
        background-color: var(--dark);
        user-select: none;
    }


    @media only screen and (max-width: 500px) {
        .settings .setting > .setting-info > .setting-description {
            font-size: 0.75rem;
        }
    }
</style>