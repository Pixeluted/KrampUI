<div align="center">
    <h3>KrampUI</h3>
    <p>Simple and lightweight frontend for Ro-Exec.</p>
    <img src="./assets/showcase.png" alt="An image which showcases KrampUI application." width="600"/>
</div>
<br />

## Tutorial + Showcase
Watch a tutorial on how to use it here: https://www.youtube.com/watch?v=nSYtvobwBvU

## Getting KrampUI

### [Download the binary](https://git.snipcola.com/snipcola/KrampUI/releases/latest),

### or... compile it yourself!
1. Ensure you have `cargo` (`rustup`), `node`, and `npm` installed.
2. Run `npm install`.
3. Run `npm run start` or `npm run build` depending on what you need.
4. Access the executable at `src-tauri/target/release` or `src-tauri/target/debug`.

## Q&A

### Where is the scripts and autoexec folder?
It's located at ``%appdata%/KrampUI``, or just press the folder icon on the UI and navigate one folder up.

### I don't see the UI, how do I fix it?
Perhaps your computer doesn't have Microsoft Edge Webview installed.</br>
Install it from <a href="https://developer.microsoft.com/en-us/microsoft-edge/webview2" target="_blank">here</a> (scroll down & install Evergreen Bootstrapper), and see if that fixes your issue.

### It's injected, why is the title gray and the inject button disabled?
You're probably in the Roblox menu, for the UI to recognize it's connected, join a game.

### How to fix it injecting but not executing scripts?
There is no difference between using KrampUI to inject and running the executable yourself.
Meaning, it's a issue with Ro-Exec. It's advised to wait until you load into game before injecting.

## Found a bug?
Feel free to let me know, ``@Snipcola`` on Discord.