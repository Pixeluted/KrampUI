<div align="center">
    <h3>KrampUI</h3>
    <p>Simple and lightweight frontend for Ro-Exec.</p>
    <img src="./assets/showcase.png" alt="An image which showcases KrampUI application." width="600"/>
</div>
<br />

## Tutorial + Showcase
Watch a tutorial on how to use it here: https://www.youtube.com/watch?v=VXCyulSeDS0

## Getting KrampUI

### [Download the binary](https://github.com/BitdancerStudios/KrampUI/releases/latest),

### or... compile it yourself!
1. Ensure you have `cargo` (`rustup`), `node`, and `npm` installed.
2. Run `npm install`.
3. Run `npm run start` or `npm run build` depending on what you need.
4. Access the executable at `src-tauri/target/release` or `src-tauri/target/debug`.

## Q&A
### Where is the scripts and autoexec folder?
It's located at ``%appdata%/KrampUI``, or just press the folder icon on the UI and navigate one folder up.

### Ro-Exec updated, how do I select a new loader?
Click the settings menu, and then press "Update Loader" in order to select a new loader.

### I don't see the UI, how do I fix it?
Perhaps your computer doesn't have Microsoft Edge Webview installed.</br>
Install it from <a href="https://developer.microsoft.com/en-us/microsoft-edge/webview2" target="_blank">here</a> (scroll down & install Evergreen Bootstrapper), and see if that fixes your issue.

### It's injected, why is the title gray and the inject button disabled?
You're probably in the Roblox menu, for the UI to recognize it's connected, join a game.

### How to fix it injecting but not executing scripts?
It's probably a issue with Ro-Exec. It's advised to wait until you load into game before injecting.

### What is the randomized executable stored in %appdata%/KrampUI?
That's the loader you've selected. You may delete it or replace it, but it's advised to use the Settings menu instead.

## Found a bug?
Feel free to let us know, contact one of our team members:
- Snipcola - Dipped, original owner
- [Pixeluted](https://discord.com/users/1057760003701882890)
