<div align="center">
    <h3>KrampUI</h3>
    <p>Simple and lightweight frontend for Ro-Exec.</p>
    <img src="./assets/showcase.png" alt="An image which showcases KrampUI application." width="600"/>
</div>
<br />

## Getting KrampUI
### Download the binary,
- [Standalone Application](https://git.snipcola.com/snipcola/KrampUI/releases/download/latest/krampui.exe) (single .exe)
- [Bundled Installer](https://git.snipcola.com/snipcola/KrampUI/releases/download/latest/krampui-installer.msi) (install as application)

### or... compile it yourself!
1. Ensure you have `cargo` (`rustup`), `node`, and `npm` installed.
2. Run `npm install`.
3. Run `npm run start` or `npm run build` depending on what you need.
4. Access the executable at `src-tauri/target/release` or `src-tauri/target/debug`.

## Q&A
### Where is the scripts and autoexec folder?
It's located at ``%appdata%/krampui``, or just press the folder icon on the UI and navigate one folder up.

### I don't see the UI, how do I fix it?
Perhaps your computer doesn't have Microsoft Edge Webview installed.</br>
Install it from <a href="https://developer.microsoft.com/en-us/microsoft-edge/webview2" target="_blank">here</a> (scroll down & install Evergreen Bootstrapper), and see if that fixes your issue.

## Found a bug?
Feel free to let me know, ``@Snipcola`` on Discord.