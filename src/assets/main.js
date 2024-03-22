const { invoke } = window.__TAURI__.tauri;
const { open, Command } = window.__TAURI__.shell;
const { appWindow, WebviewWindow, getAll, getCurrent } = window.__TAURI__.window;
const process = window.__TAURI__.process;
const dialog = window.__TAURI__.dialog;
const event = window.__TAURI__.event;
const path = window.__TAURI__.path;
const fs = window.__TAURI__.fs;

require.config({ paths: { "vs": "./assets/monaco" }});

let settings, loginSection, exploitSection;
let loginForm, loginSubmit;
let exploitIndicator, exploitTabs, exploitEditor, exploitScripts, exploitScriptsSearch, exploitScriptsFolder;
let editor, editorGetText, editorSetText, editorSetScroll;
let exploitInject, exploitExecute, exploitImport, exploitExport, exploitClear, exploitKill, exploitLogout;
let wsInterval, wsConnected, prevConnected, prevActive, editorReady, tabs, injecting, dataDirectory;

async function minimize() {
  await appWindow.minimize();
}

async function maximize() {
  await appWindow.toggleMaximize();
}

async function isMaximized() {
  return await appWindow.isMaximized();
}

async function isVisible() {
  return await window.__TAURI__.window.appWindow.isVisible();
}

async function show() {
  await appWindow.show();
  await appWindow.setFocus();
}

async function hide() {
  await appWindow.hide();
}

async function toggle() {
  if (await isVisible()) await hide();
  else await show();
}

async function exit() {
  await process.exit();
}

function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    clearTimeout(timeout);
    
    timeout = setTimeout(function () {
      clearTimeout(timeout);
      func(...args);
    }, wait);
  };
}

function checkActive() {
  if (wsConnected) {
    loginSection.classList.remove("active");
    exploitSection.classList.add("active");
    setupEditor();
  } else {
    exploitSection.classList.remove("active");
    loginSection.classList.add("active");
    exploitInject.classList.add("disabled");
    exploitInject.classList.add("disabled");
    exploitExecute.classList.add("disabled");
    exploitIndicator.style.color = "var(--text)";
  }
}

async function closeExistingLogin() {
  const loginWindow = getAll().find((w) => w.label === "login");

  if (loginWindow) {
    await loginWindow.close();
    await event.emit("websocket-close");
  }
}

async function injectLoginCode() {
  await evalCode("login", `
    (async function () {
      if (window.KR_LOADED) return;
      window.KR_LOADED = true;

      const { listen, emit } = window.__TAURI__.event;
      const { getCurrent } = window.__TAURI__.window;
      const loginWindow = getCurrent();

      if (window.location.pathname === "/dashboard") {
        async function getToken() {
          try {
            const response = await fetch("/dashboard/__data.json");
            const text = await response.text();
            const json = JSON.parse(text);
            const nodes = json.nodes;
            const node = nodes.find((n) => n.data?.includes("RO-EXEC"));
            const keys = node.data.find((o) => Object.keys(o).includes("token"));
            const token = node.data[keys["token"]];
            return token;
          } catch {};
        }

        const token = await getToken();

        if (token) {
          const websocket = new WebSocket(\`wss://loader.live/?login_token="\$\{token\}"\`);
          await loginWindow.hide();
          await emit("login");
          
          websocket.onopen = async function () {
            await listen("websocket-send", function (e) {
              websocket.send(e.payload);
            });

            await emit("websocket-open");
          };

          websocket.onmessage = async function (message) {
            await emit("websocket-message", message.data);
          };

          websocket.onerror = async function () {
            await emit("websocket-close");
          };

          websocket.onclose = async function () {
            await emit("websocket-close");
          };
        }
      }
    })();
  `, true);
}

async function login() {
  loginForm.classList.add("disabled");
  await closeExistingLogin();

  const window = new WebviewWindow("login", {
    title: "KrampUI (Login)",
    url: "https://loader.live",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    width: 700,
    height: 450,
    alwaysOnTop: true,
    focus: true,
    center: true,
    minimizable: false,
    maximizable: false,
    resizable: false,
    skipTaskbar: true
  });

  window.onCloseRequested(async function () {
    loginForm.classList.remove("disabled");
    await event.emit("websocket-close");
  });
}

async function createDirectory(directory, recursive) {
  try {
    await fs.createDir(directory, { dir: fs.BaseDirectory.AppConfig, recursive });
    return true;
  } catch {
    return false;
  }
}

async function readDirectory(directory, recursive) {
  try {
    const entries = await fs.readDir(directory, { dir: fs.BaseDirectory.AppConfig, recursive });
    return entries;
  } catch {
    return [];
  }
}

async function exists(path) {
  try {
    return await fs.exists(path, { dir: fs.BaseDirectory.AppConfig });
  } catch {
    return false;
  }
}

async function writeFile(file, contents) {
  try {
    await fs.writeTextFile(file, contents, { dir: fs.BaseDirectory.AppConfig });
    return true;
  } catch {
    return false;
  }
}

async function readFile(file) {
  try {
    return await fs.readTextFile(file, { dir: fs.BaseDirectory.AppConfig });
  } catch {
    return null;
  }
}

async function renameFile(file, newFile) {
  try {
    if (await exists(newFile)) return false;
    return await fs.renameFile(file, newFile, { dir: fs.BaseDirectory.AppConfig });
  } catch {
    return false;
  }
}

async function deleteFile(file) {
  try {
    await fs.removeFile(file, { dir: fs.BaseDirectory.AppConfig });
    return true;
  } catch {
    return false;
  }
}

async function deleteDirectory(directory, recursive) {
  try {
    await fs.removeDir(directory, { dir: fs.BaseDirectory.AppConfig, recursive });
    return true;
  } catch {
    return false;
  }
}

function getDataName() {
  return `kr-${randomString(20)}`;
}

function isData(f) {
  return f.name?.startsWith("kr-") && f.children;
}
async function findData() {
  const files = await readDirectory("");
  return files.filter(isData).shift();
}

async function getData() {
  const data = await findData();
  return data?.name || getDataName();
}

async function getSettings() {
  const text = await readFile(`${dataDirectory}/settings`);
  let json;
  try { json = JSON.parse(text); }
  catch { return false; };

  if (json) return {
    autoInject: json.autoInject,
    topMost: json.topMost,
    keyToggle: json.keyToggle
  };
  else {
    const settings = {
      autoInject: true,
      topMost: true,
      keyToggle: true
    };

    await setSettings(settings);
    return settings;
  }
}

async function setSettings(data) {
  await writeFile(`${dataDirectory}/settings`, JSON.stringify(data || settings));
}

async function setAutoInject(bool) {
  settings.autoInject = bool;
  await setSettings();
}

async function setTopMost(bool) {
  settings.topMost = bool;
  await setSettings();
}

async function setKeyToggle(bool) {
  settings.keyToggle = bool;
  await setSettings();
}

function randomString(length) {
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  let text = "";

  for (let i = 0; i < length; i++) {
    text += characters.charAt(values[i] % characters.length);
  }

  return text;
}

function getExecutableName() {
  return `kr-${randomString(20)}.exe`;
}

function isExecutable(f) {
  return f.name?.startsWith("kr-") && f.name?.endsWith(".exe");
}

async function getExecutables() {
  const files = await readDirectory("");
  return files.filter(isExecutable);
}

async function clearExecutables() {
  const executables = await getExecutables();
  executables.map((f) => f.path).forEach(await deleteFile);
}

async function findExecutable() {
  const executables = await getExecutables();
  return executables.shift();
}

async function getExecutable() {
  const executable = await findExecutable();
  return executable?.name || getExecutableName();
}

async function setExecutable(path) {
  const currentExecutable = (await findExecutable())?.path?.toLowerCase() || "";
  if (path.toLowerCase() === currentExecutable) return;

  await clearExecutables();
  await renameFile(path, await getExecutable());
}

async function emptyScripts() {
  const scripts = Array.from(exploitScripts.querySelectorAll(".scripts > .script-container:not(.kr-auto-exec):has(> .script:not(.folder))"));
  await Promise.all(scripts.map((s) => s.remove()));
}

async function emptyAutoExec() {
  const scripts = Array.from(exploitScripts.querySelectorAll(".scripts > .script-container.kr-auto-exec"));
  await Promise.all(scripts.map((s) => s.remove()));
}

async function emptyFolders() {
  const folders = Array.from(exploitScripts.querySelectorAll(".scripts > .script-container:not(.kr-auto-exec):has(> .script.folder)"));
  await Promise.all(folders.map((f) => f.remove()));
}

function onClick(element, cb) {
  let down = false;

  element.addEventListener("mousedown", function() {
    down = true;
  });

  element.addEventListener("mouseup", function(e) {
    if (down && !element?.classList?.contains("disabled")) {
      if (e.button === 0) cb("left", e);
      else if (e.button === 1) cb("middle", e);
      else if (e.button === 2) cb("right", e);
    }

    down = false;
  });
}

function focusAtEnd(elem) {
  const selection = window.getSelection();
  selection.selectAllChildren(elem);
  selection.collapseToEnd();
}

function getSelection(elem) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  if (range.commonAncestorContainer.parentNode == elem) {
    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset
    };
  } else {
    return null;
  }
}

function setSelection(elem, startOffset, endOffset) {
  const selection = window.getSelection();
  const range = document.createRange();
  
  startOffset = Math.min(startOffset, elem.textContent.length);
  endOffset = Math.min(endOffset, elem.textContent.length);
  endOffset = Math.max(endOffset, startOffset);

  range.setStart(elem.firstChild, startOffset);
  range.setEnd(elem.firstChild, endOffset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function changeContentEditableText(elem, text) {
  const selection = getSelection(elem);
  elem.innerText = text;
  if (selection !== null) setSelection(elem, selection.startOffset, selection.endOffset);
}

let expandedFolders = new Map();

function isSearching() {
  return (exploitScriptsSearch.value && exploitScriptsSearch.value !== "");
}

function getExpanded(name) {
  return isSearching() || expandedFolders.get(name);
}

function setExpanded(name, val) {
  expandedFolders.set(name, val);
}

function removeExpanded(name) {
  expandedFolders.delete(name);
}

async function addFolder({ name, path, scripts }, autoExec) {
  const container = document.createElement("div");
  const folder = document.createElement("div");
  const folderScripts = document.createElement("div");
  const icon = document.createElement("i");

  const dropdown = document.createElement("div");
  const dropdownNewFile = document.createElement("div");
  const dropdownNewFileIcon = document.createElement("i");
  const dropdownExplorer = document.createElement("div");
  const dropdownExplorerIcon = document.createElement("i");
  const dropdownRename = document.createElement("div");
  const dropdownRenameIcon = document.createElement("i");
  const dropdownDelete = document.createElement("div");
  const dropdownDeleteIcon = document.createElement("i");

  container.className = "script-container kr-dropdown";
  if (autoExec) container.classList.add("kr-auto-exec");
  folder.className = "script folder";
  folder.spellcheck = false;
  folder.innerText = name;
  icon.className = autoExec ? "fa-solid fa-robot" : "fa-solid fa-folder";
  folder.append(icon);
  folderScripts.className = "folder-scripts";
  if (getExpanded(name)) folderScripts.classList.add("expanded");

  dropdown.className = "kr-dropdown-content";
  dropdownNewFile.innerText = "New File";
  dropdownNewFileIcon.className = "fa-solid fa-file";
  dropdownExplorer.innerText = "View Folder";
  dropdownExplorerIcon.className = "fa-solid fa-folder-tree";
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownDelete.innerText = "Delete";
  dropdownDeleteIcon.className = "fa-solid fa-delete-left";

  dropdownNewFile.append(dropdownNewFileIcon);
  dropdownExplorer.append(dropdownExplorerIcon);
  dropdownRename.append(dropdownRenameIcon);
  dropdownDelete.append(dropdownDeleteIcon);
  dropdown.append(dropdownNewFile);
  dropdown.append(dropdownExplorer);

  if (!autoExec) {
    dropdown.append(dropdownRename);
    dropdown.append(dropdownDelete);
  }

  scripts.forEach(async (s) => await addScript(s, { name, element: folderScripts }, autoExec));

  folder.addEventListener("click", function () {
    if (folder.contentEditable !== "true" && !isSearching()) {
      const expanded = !getExpanded(name);
      setExpanded(name, expanded);
      folderScripts.classList.toggle("expanded", expanded);
    }
  });

  folder.addEventListener("input", function () {
    if (folder.contentEditable === "true") changeContentEditableText(folder, folder.innerText.replace(/[<>:"/\\|?*]/g, ""));
  });

  async function enter(e) {
    if (folder.contentEditable === "true") {
      if (e) e.preventDefault();
      dropdown.classList.remove("disabled");
      folder.contentEditable = false;
      folder.innerText = folder.innerText.trim();

      if (folder.innerText.trim() === "") folder.innerText = name;

      folder.append(icon);
      const result = await renameFile(path, `scripts/${folder.innerText}`);
      setExpanded(folder.innerText, getExpanded(name));
      removeExpanded(name);
      loadScripts(result === false);
    }
  }

  folder.addEventListener("blur", enter);
  folder.addEventListener("keydown", function (e) {
    if (e.key === "Enter") enter();
  });

  dropdownNewFile.addEventListener("click", async function () {
    await newFile(name, autoExec);
    setExpanded(name, true);
    folderScripts.classList.add("expanded");
  });

  dropdownRename.addEventListener("click", async function () {
    dropdown.classList.add("disabled");
    icon.remove();
    folder.contentEditable = true;
    folder.focus();
    focusAtEnd(folder);
  });

  dropdownExplorer.addEventListener("click", function () {
    open(path);
  });

  dropdownDelete.addEventListener("click", async function () {
    await deleteDirectory(path, true);
    removeExpanded(name);
    loadScripts();
  });

  container.append(folder);
  container.append(folderScripts);
  container.append(dropdown);

  const script = exploitScripts.querySelector(".script-container:has(.script:not(.folder)");
  if (script) exploitScripts.insertBefore(container, script);
  else exploitScripts.append(container);
}

async function getFilePath(folder, autoExec) {
  let number = 0;

  async function get() {
    number = number + 1;
    const path = autoExec ? `autoexec/Script ${number}.lua` : folder ? `scripts/${folder}/Script ${number}.lua` : `scripts/Script ${number}.lua`;
    return (await exists(path)) ? await get() : path;
  }

  return await get();
}

async function getFolderPath() {
  let number = 0;

  async function get() {
    number = number + 1;
    const path = `scripts/Folder ${number}`;
    return (await exists(path)) ? await get() : path;
  }

  return await get();
}

async function newFile(folder, autoExec) {
  await writeFile(await getFilePath(folder, autoExec), "");
  loadScripts();
}

async function newFolder() {
  await createDirectory(await getFolderPath(), true);
  loadScripts();
}

async function addScript({ name, path: _path }, folder, autoExec) {
  const container = document.createElement("div");
  const script = document.createElement("div");
  const icon = document.createElement("i");

  const dropdown = document.createElement("div");
  const dropdownExecute = document.createElement("div");
  const dropdownExecuteIcon = document.createElement("i");
  const dropdownExport = document.createElement("div");
  const dropdownExportIcon = document.createElement("i");
  const dropdownRename = document.createElement("div");
  const dropdownRenameIcon = document.createElement("i");
  const dropdownDelete = document.createElement("div");
  const dropdownDeleteIcon = document.createElement("i");

  container.className = "script-container kr-dropdown";
  script.className = "script";
  script.spellcheck = false;
  script.innerText = name;
  icon.className = "fa-solid fa-file";
  script.append(icon);

  dropdown.className = "kr-dropdown-content";
  dropdownExecute.innerText = "Execute";
  dropdownExecuteIcon.className = "fa-solid fa-scroll";
  dropdownExport.innerText = "Export To";
  dropdownExportIcon.className = "fa-solid fa-floppy-disk";
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownDelete.innerText = "Delete";
  dropdownDeleteIcon.className = "fa-solid fa-delete-left";

  dropdownExecute.append(dropdownExecuteIcon);
  dropdownExport.append(dropdownExportIcon);
  dropdownRename.append(dropdownRenameIcon);
  dropdownDelete.append(dropdownDeleteIcon);
  dropdown.append(dropdownExecute);
  dropdown.append(dropdownExport);
  dropdown.append(dropdownRename);
  dropdown.append(dropdownDelete);

  const extension = name.split(".").pop();

  let selected = false;
  let selectedFolder = null;

  function select() {
    selected = true;
    script.classList.add("selected");
  }

  function unselect() {
    selected = false;
    script.style.pointerEvents = "auto";
    script.style.position = "static";
    script.style.zIndex = "0";
    script.classList.remove("selected");
    if (selectedFolder) selectedFolder.classList.remove("highlight");
    selectedFolder = null;
  }

  script.addEventListener("click", async function () {
    if (script.contentEditable === "true") return;
    await addScriptTab(_path);
  });

  script.addEventListener("mousedown", function (e) {
    if (e.button === 0 && script.contentEditable !== "true") select();
  });

  window.addEventListener("mouseup", async function () {
    if (selectedFolder) {
      const isAutoExec = selectedFolder.parentElement?.classList.contains("kr-auto-exec");
      const isScripts = selectedFolder.classList.contains("scripts");

      let newPath = isAutoExec ? `autoexec/${name}` : isScripts ? `scripts/${name}` : `scripts/${selectedFolder.innerText}/${name}`;
      newPath = await path.join(await path.appConfigDir(), newPath);

      const result = await renameFile(_path, newPath);
      if (!isScripts) setExpanded(selectedFolder.innerText, true);

      if (result !== false) {
        tabs = tabs.map(function (t) {
          if (t.path === _path) t.path = newPath;
          return t;
        });
        
        await setTabs();
      }

      loadScripts(result === false);
    }

    if (selected) unselect();
  });

  window.addEventListener("mousemove", function (e) {
    if (script.contentEditable !== "true" && selected) {
      script.style.pointerEvents = "none";
      script.style.position = "absolute";
      script.style.zIndex = "10";
      script.style.top = "1px";

      const scriptWidth = script.clientWidth;
      const scriptHeight = script.clientHeight;
      const offset = 10;
      const offsetX = (e.clientX + scriptWidth / 2 > window.innerWidth) ? window.innerWidth - (scriptWidth + offset) : e.clientX - scriptWidth / 2;
      const offsetY = (e.clientY + scriptHeight / 2 > window.innerHeight) ? window.innerHeight - (scriptHeight + offset) : e.clientY - scriptHeight / 2;

      script.style.top = `${offsetY}px`;
      script.style.left = `${offsetX}px`;

      if (selectedFolder) selectedFolder.classList.remove("highlight");
      if ((e.target?.classList.contains("script") && e.target?.classList.contains("folder")) || e.target?.classList.contains("scripts")) {
        selectedFolder = e.target;
        selectedFolder.classList.add("highlight");
      } else selectedFolder = null;
    }
    else if (selected) unselect();
  });

  dropdownExport.addEventListener("click", async function () {
    const text = editorGetText() || "";
    await writeFile(_path, text);
    loadScripts(true);
  });

  dropdownExecute.addEventListener("click", async function () {
    const text = await readFile(_path);
    execute(text);
  });

  script.addEventListener("input", function () {
    if (script.contentEditable === "true") changeContentEditableText(script, script.innerText.replace(/[^\w\s.-]/g, ""));
  });

  async function enter(e) {
    if (script.contentEditable === "true") {
      if (e) e.preventDefault();
      dropdown.classList.remove("disabled");
      script.contentEditable = false;
      script.innerText = script.innerText.trim();

      if (!script.innerText.toLowerCase().endsWith(".lua") && !script.innerText.toLowerCase().endsWith(".txt")) {
        script.innerText = `${script.innerText}.${extension}`;
      }

      let defaultName = script.innerText.split(".");
      defaultName.pop();
      defaultName = defaultName.join("");

      if (defaultName.trim() === "") script.innerText = name;

      script.append(icon);
      const result = await renameFile(_path, autoExec ? `autoexec/${script.innerText}` : folder ? `scripts/${folder.name}/${script.innerText}` : `scripts/${script.innerText}`);
      
      if (result !== false) {
        const tab = tabs.find((t) => t.path === _path);
        if (tab) renameTab(tab.id, script.innerText, true);
      }

      loadScripts(result === false);
    }
  }

  script.addEventListener("blur", enter);
  script.addEventListener("keydown", function (e) {
    if (e.key === "Enter") enter();
  });

  dropdownRename.addEventListener("click", async function () {
    dropdown.classList.add("disabled");
    icon.remove();
    let defaultName = script.innerText.split(".");
    defaultName.pop();
    defaultName = defaultName.join("");
    script.contentEditable = true;
    script.innerText = defaultName;
    script.focus();
    focusAtEnd(script);
  });

  dropdownDelete.addEventListener("click", async function () {
    await deleteFile(_path);
    loadScripts();

    const tab = tabs.find((t) => t.path === _path);
    if (tab) await deleteTab(tab.id);
  });

  container.append(script);
  container.append(dropdown);
  (folder ? folder.element : exploitScripts).append(container);
}

let prevScripts;
let prevFolders;
let prevAutoExec;
let prevTabs;

function parseScripts(files) {
  return files
    .filter((s) => s.path && s.name)
    .filter((s) => [".lua", ".txt"].some((e) => s.name.endsWith(e)))
    .filter((s) => s.name.toLowerCase().includes((exploitScriptsSearch.value || "")?.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseFolders(files, scriptsOnly) {
  return files
    .filter((f) => f.path && f.name && f.children)
    .filter((f) => {
      const scripts = parseScripts(f.children);
      const namesCheck = f.name.toLowerCase().includes((exploitScriptsSearch.value || "")?.toLowerCase());
      const scriptsCheck = scripts.some((s) => s.name.toLowerCase().includes((exploitScriptsSearch.value || "")?.toLowerCase()));

      if (scriptsOnly && scripts.length === 0) {
        return true;
      }

      return scriptsOnly
        ? scriptsCheck
        : namesCheck || scriptsCheck;
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

async function populateScripts(scripts, force) {
  const scriptNames = scripts.map((s) => s.name);
  if (!force && scriptNames.join(",") === prevScripts) return;
  prevScripts = scriptNames.join(",");
  emptyScripts();
  scripts.forEach(async (s) => await addScript(s));
}

let autoExecPath;

async function addAutoExecFolder(force) {
  if (!autoExecPath) autoExecPath = await path.join(await path.appConfigDir(), "autoexec");
  const files = await readDirectory("autoexec");
  const folder = parseFolders([{ path: autoExecPath, name: "Auto-Exec", children: files }], true).pop();
  
  if (files && folder) {
    const { name, path, children } = folder;
    const names = children.map((c) => c.name).join(",");

    if (!force && names === prevAutoExec) return;
    prevAutoExec = names;

    emptyAutoExec();
    await addFolder({ name, path, scripts: parseScripts(children) }, true);
  } else emptyAutoExec();
}

async function populateFolders(folders, force) {
  const folderNames = folders.map((f) => f.name);
  const folderScripts = folders.map((f) => parseScripts(f.children)).flat();
  const folderScriptNames = folderScripts.map((s) => s.name);
  const finalNames = `${folderNames},${folderScriptNames}`;
  if (!force && finalNames === prevFolders) return;
  prevFolders = finalNames;
  emptyFolders();
  folders.forEach(async ({ name, path, children }) => await addFolder({ name, path, scripts: parseScripts(children) }));
}

function checkAutoExec() {
  const autoExec = exploitScripts.querySelector(".script-container.kr-auto-exec");

  if (autoExec && exploitScripts.firstChild !== autoExec) {
    exploitScripts.removeChild(autoExec);
    exploitScripts.insertBefore(autoExec, exploitScripts.firstChild);
  }
}

async function loadScripts(force) {
  if (!await exists("scripts")) await createDirectory("scripts", true);
  const files = await readDirectory("scripts", true);
  const scripts = parseScripts(files);
  const folders = parseFolders(files);

  await populateFolders(folders, force);
  await populateScripts(scripts, force);
  await addAutoExecFolder(force);
  checkAutoExec();
}

async function getTabContent(tab) {
  const script = tab.path;
  let content = "";

  if (script) {
    const text = await readFile(tab.path);
    if (text) content = text;
  } else {
    content = await readFile(`${dataDirectory}/tabs-data/${tab.id}`) || "";
  }

  return content;
}

async function setTabContent(tab, content) {
  const script = tab.path;

  if (script) {
    writeFile(tab.path, content);
  } else {
    writeFile(`${dataDirectory}/tabs-data/${tab.id}`, content);
  }
}

async function setTabScroll(tab, scroll) {
  tabs = tabs.map(function (t) {
    if (t.id === tab.id) t.scroll = scroll;
    return t;
  });

  await setTabs();
}

async function getActiveTabContent() {
  const tab = tabs.find((t) => t.active === true);
  return tab ? await getTabContent(tab) : "";
}

async function setActiveTabContent(content) {
  const tab = tabs.find((t) => t.active === true);
  if (tab) await setTabContent(tab, content);
}

async function setActiveTabScroll(scroll) {
  const tab = tabs.find((t) => t.active === true);
  if (tab) await setTabScroll(tab, scroll);
}

async function getTabs() {
  const text = await readFile(`${dataDirectory}/tabs`);
  let json;
  try { json = JSON.parse(text); }
  catch { return false; };
  return json || false;
}

async function setTabs() {
  await writeFile(`${dataDirectory}/tabs`, JSON.stringify(tabs));
}

async function addTab(data, dontLoad) {
  if (data.active) {
    tabs = tabs.map(function (t) {
      t.active = false;
      return t;
    });
  }

  tabs.push({ ...data, id: randomString(20) });
  await setTabs();
  if (editorSetText) editorSetText(await getActiveTabContent());
  if (editorSetScroll) editorSetScroll(0);
  if (dontLoad !== true) populateTabs();
}

async function deleteTab(id, force) {
  if (tabs.length === 1) return;
  let order = 0;
  
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;
  
  const tabIndex = tabs.indexOf(tab);
  const newTab = tabs[tabIndex - 1] || tabs[tabIndex + 1];

  if (force && tab.path) {
    await deleteFile(tab.path);
  }

  if (!tab.path) {
    await deleteFile(`${dataDirectory}/tabs-data/${tab.id}`);
  }

  tabs = tabs
    .filter(function (t) {
      return t.id !== id;
    })
    .map(function (t) {
      order = order + 1;
      if (tab?.active) {
        if (t.id === newTab?.id) t.active = true;
        else t.active = false;
      }
      t.order = order;
      return t;
    });

  const activeTab = tabs.find((t) => t.active === true);
  const scroll = activeTab?.scroll;
  await setTabs();
  if (editorSetText) editorSetText(await getActiveTabContent());
  if (editorSetScroll) editorSetScroll(scroll || 0);
  populateTabs();
}

async function renameTab(id, newName, force) {
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;

  const script = tab.path;

  if (script) {
    const directory = await getDirectory(tab.path);
    const newPath = `${directory}\\${newName}`;
    if (!force) await renameFile(tab.path, newPath);

    tabs = tabs.map(function (t) {
      if (t.id === id) t.path = newPath;
      return t;
    });
  } else {
    tabs = tabs.map(function (t) {
      if (t.id === id) t.name = newName;
      return t;
    });
  }

  await setTabs();
  populateTabs(force);
  loadScripts();
}

async function changeTabOrder(id, newOrder) {
  const tabToChange = tabs.find((t) => t.id === id);
  const oldOrder = tabToChange.order;
  
  tabs.forEach((t) => {
    if (t.id !== id) {
      if (t.order >= newOrder && t.order < oldOrder) {
        t.order++;
      } else if (t.order <= newOrder && t.order > oldOrder) {
        t.order--;
      }
    } else {
      t.order = newOrder;
    }
  });

  await setTabs();
  populateTabs(true);
}

async function setTabActive(id) {
  const tab = tabs.find((t) => t.id === id);
  if (tab?.active) return;

  tabs = tabs.map(function (t) {
    t.active = t.id === id;
    return t;
  });

  const scroll = tab?.scroll;
  await setTabs();
  if (editorSetText) editorSetText(await getActiveTabContent());
  if (editorSetScroll) editorSetScroll(scroll || 0);
  populateTabs(true);
}

function getDirectory(p) {
  const path = p.split(/[\\\/]/);
  if (path[path.length - 1].includes(".")) path.pop();
  return path.join("\\");
}

function getTabName(tab) {
  const script = tab.path;
  if (script) return tab.path.split(/[\\\/]/).pop();
  else return tab.name;
}

function getNextOrder() {
  const orders = tabs.map((t) => t.order);
  let largest = orders[0] || 1;

  for (var i = 0; i < orders.length; i++) {
    if (orders[i] > largest) largest = orders[i];
  }

  return largest + 1;
}

async function addNewTab(dontLoad) {
  await addTab({ name: "Script", order: getNextOrder(), active: true, scroll: 0 }, dontLoad);
}

async function addScriptTab(path) {
  const tab = tabs.find((t) => t.path === path);

  if (tab) setTabActive(tab.id);
  else await addTab({ path, order: getNextOrder(), active: true, scroll: 0 });
}

async function setupTabs() {
  await createDirectory(`${dataDirectory}/tabs-data`, true);
  tabs = await getTabs() || [];
  if (tabs.length === 0) await addNewTab(true);
}

function emptyTabElems() {
  exploitTabs.innerHTML = "";
}

function addTabElem(info) {
  const script = info.path;
  const tabDropdown = document.createElement("div");
  const tab = document.createElement("div");
  const icon = document.createElement("i");

  const dropdown = document.createElement("div");
  const dropdownExecute = document.createElement("div");
  const dropdownExecuteIcon = document.createElement("i");
  const dropdownExplorerFolder = document.createElement("div");
  const dropdownExplorerFolderIcon = document.createElement("i");
  const dropdownRename = document.createElement("div");
  const dropdownRenameIcon = document.createElement("i");
  const dropdownDelete = document.createElement("div");
  const dropdownDeleteIcon = document.createElement("i");
  const dropdownClose = document.createElement("div");
  const dropdownCloseIcon = document.createElement("i");

  const name = getTabName(info);
  const extension = name.split(".").pop();

  tab.setAttribute("kr-id", info.id);
  tabDropdown.className = "kr-dropdown";
  dropdown.className = "kr-dropdown-content";
  dropdownExecute.innerText = "Execute";
  dropdownExecuteIcon.className = "fa-solid fa-scroll";
  dropdownExplorerFolder.innerText = "View Folder";
  dropdownExplorerFolderIcon.className = "fa-solid fa-folder-tree";
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownDelete.innerText = "Delete";
  dropdownDeleteIcon.className = "fa-solid fa-delete-left";
  dropdownClose.innerText = "Close";
  dropdownCloseIcon.className = "fa-solid fa-times";
  dropdownExecute.append(dropdownExecuteIcon);
  dropdownExplorerFolder.append(dropdownExplorerFolderIcon);
  dropdownRename.append(dropdownRenameIcon);
  dropdownDelete.append(dropdownDeleteIcon);
  dropdownClose.append(dropdownCloseIcon);
  dropdown.append(dropdownExecute);
  if (script) dropdown.append(dropdownExplorerFolder);
  dropdown.append(dropdownRename);
  if (tabs.length > 1) dropdown.append(dropdownDelete);
  if (script && tabs.length > 1) dropdown.append(dropdownClose);

  let selected = false;
  let selectedTab = null;

  function select() {
    selected = true;
    tab.classList.add("selected");
    exploitTabs.classList.add("selecting");
  }

  function unselect() {
    selected = false;
    tab.style.pointerEvents = "auto";
    tab.style.position = "static";
    tab.style.zIndex = "0";
    tab.classList.remove("selected");
    if (selectedTab) selectedTab.classList.remove("highlight");
    selectedTab = null;
  }

  tab.addEventListener("mousedown", function (e) {
    if (e.button === 0 && tab.contentEditable !== "true" && tabs.length > 1) select();
  });

  window.addEventListener("mouseup", async function () {
    if (selectedTab) {
      const id = selectedTab?.getAttribute("kr-id") || "";
      const tab = tabs.find((t) => t.id === id);
      if (tab) await changeTabOrder(info.id, tab.order);
    }

    if (selected) unselect();
  });

  window.addEventListener("mousemove", function (e) {
    if (tab.contentEditable !== "true" && selected) {
      tab.style.pointerEvents = "none";
      tab.style.zIndex = "10";
      tab.style.position = "absolute";
      tab.style.top = "1px";

      const tabWidth = tab.clientWidth;
      const tabHeight = tab.clientHeight;
      const offset = 10;
      const offsetX = (e.clientX + tabWidth / 2 > window.innerWidth) ? window.innerWidth - (tabWidth + offset) : e.clientX - tabWidth / 2;
      const offsetY = (e.clientY + tabHeight / 2 > window.innerHeight) ? window.innerHeight - (tabHeight + offset) : e.clientY - tabHeight / 2;

      tab.style.top = `${offsetY}px`;
      tab.style.left = `${offsetX}px`;

      if (selectedTab) selectedTab.classList.remove("highlight");
      if (e.target?.classList.contains("kr-tab")) {
        selectedTab = e.target
        selectedTab.classList.add("highlight");
      } else selectedTab = null;
    }
    else if (selected) unselect();
  });

  dropdownDelete.addEventListener("click", () => deleteTab(info.id, true));
  dropdownClose.addEventListener("click", () => deleteTab(info.id));

  tab.addEventListener("input", function () {
    if (tab.contentEditable === "true") changeContentEditableText(tab, tab.innerText.replace(/[<>:"/\\|?*]/g, ""));
  });

  async function enter(e) {
    if (tab.contentEditable === "true") {
      if (e) e.preventDefault();
      
      dropdown.classList.remove("disabled");
      tab.contentEditable = false;
      tab.innerText = tab.innerText.trim();

      if (script && (!tab.innerText.toLowerCase().endsWith(".lua") && !tab.innerText.toLowerCase().endsWith(".txt"))) {
        tab.innerText = `${tab.innerText}.${extension}`;
      }

      if (script) {
        let defaultName = tab.innerText.split(".");
        defaultName.pop();
        defaultName = defaultName.join("");
        if (defaultName.trim() === "") tab.innerText = name;
      } else if (tab.innerText.trim() === "") tab.innerText = name;

      tab.append(icon);
      await renameTab(info.id, tab.innerText);
    }
  }

  tab.addEventListener("blur", enter);
  tab.addEventListener("keydown", function (e) {
    if (e.key === "Enter") enter();
  });

  dropdownExecute.addEventListener("click", async function () {
    const text = await getTabContent(info);
    execute(text);
  });

  if (script) {  
    dropdownExplorerFolder.addEventListener("click", function () {
      open(getDirectory(info.path));
    });
  }

  dropdownRename.addEventListener("click", async function () {
    dropdown.classList.add("disabled");
    icon.remove();
    tab.contentEditable = true;
    if (script) {
      let defaultName = tab.innerText.split(".");
      defaultName.pop();
      defaultName = defaultName.join("");
      tab.innerText = defaultName;
    }
    tab.focus();
    focusAtEnd(tab);
  });

  tab.className = "kr-tab";
  tab.spellcheck = false;
  tab.innerText = name;
  if (info.active) tab.classList.add("active");
  icon.className = script ? "fa-solid fa-file" : "fa-solid fa-scroll";
  tab.append(icon);
  tab.addEventListener("click", function () {
    if (tab.contentEditable !== "true") setTabActive(info.id);
  });

  tabDropdown.append(tab);
  tabDropdown.append(dropdown);
  exploitTabs.append(tabDropdown);
  if (info.active) tab.scrollIntoView();
}

function populateTabs(force) {
  if (!force && JSON.stringify(prevTabs) === JSON.stringify(tabs)) return;
  prevTabs = tabs;

  emptyTabElems();
  tabs.sort((a, b) => a.order - b.order).forEach(async (t) => await addTabElem(t));
}

async function askForExecutable() {
  exploitInject.classList.add("disabled");

  const selected = await dialog.open({
    title: "Select Ro-Exec",
    defaultPath: await path.downloadDir(),
    filters: [
      {
        name: "Ro-Exec Executable",
        extensions: ["exe"]
      }
    ]
  });

  if (selected) {
    await setExecutable(selected);
    if (!prevConnected && !injecting && prevActive) exploitInject.classList.remove("disabled");
    return true;
  }

  if (!prevConnected && !injecting && prevActive) exploitInject.classList.remove("disabled");
  return false;
}

async function isRobloxRunning() {
  return await invoke("is_process_running", { name: "RobloxPlayerBeta" });
}

async function killRoblox() {
  return await invoke("kill_process", { name: "RobloxPlayerBeta" });
}

let evalInterval;

async function evalCode(name, code) {
  return await invoke("eval", { name, code });
}

async function inject() {
  let executable = await findExecutable();

  if (!executable) {
    if (!await askForExecutable()) return;
    executable = await findExecutable();
  }

  injecting = true;
  exploitInject.classList.add("disabled");
  exploitIndicator.style.color = "var(--yellow)";

  const command = new Command("cmd", ["/c", "start", "/b", "/wait", executable.path], { cwd: await path.appConfigDir() });

  let isDone;
  let child;
  let injInterval;

  async function killCheck() {
    if (child) await child.kill();
  }

  async function done() {
    if (injInterval) clearInterval(injInterval);
    if (isDone) return;
    isDone = true;
    injecting = false;
    if (!prevConnected && prevActive) exploitInject.classList.remove("disabled");
    exploitIndicator.style.color = `var(--${prevConnected ? "green" : "text"})`;
    await killCheck();
  }

  function onData(line) {
    const text = line ? line.trim() : "";
    const blacklist = ["error:", "redownload", "create a ticket", "make a ticket", "cannot find user"];

    if (blacklist.some((s) => text.toLowerCase().includes(s)) && !text.toLowerCase().endsWith(":")) {
      alert(`[Ro-Exec] ${text}`);
      done();
    }
  }

  injInterval = setInterval(function () {
    if (!prevActive && !isDone) done();
  }, 100);

  command.on("close", done);
  command.on("error", done);

  command.stdout.on("data", onData);
  command.stderr.on("data", onData);

  try { child = await command.spawn(); }
  catch { done(); };

  setTimeout(done, 60 * 1000);
}

async function execute(customText) {
  try {
    const text = typeof customText === "string" ? customText : editorGetText();

    if (text && wsConnected) {
      await event.emit("websocket-send", `<SCRIPT>${text}`);
    }

    return true;
  } catch {
    return false;
  }
}


async function _import() {
  exploitImport.classList.add("disabled");

  const selected = await dialog.open({
    title: "Import Script",
    defaultPath: await path.join(await path.appConfigDir(), "scripts"),
    filters: [
      {
        name: "LUA Files",
        extensions: ["lua"]
      },
      {
        name: "Text Files",
        extensions: ["txt"]
      }
    ]
  });

  if (selected) {
    await addScriptTab(selected);
    exploitImport.classList.remove("disabled");
    return true;
  }

  exploitImport.classList.remove("disabled");
  return false;
}

async function _export() {
  exploitExport.classList.add("disabled");

  const selected = await dialog.save({
    title: "Export Script",
    defaultPath: await path.join(await path.appConfigDir(), "scripts"),
    filters: [
      {
        name: "LUA File",
        extensions: ["lua"]
      },
      {
        name: "Text File",
        extensions: ["txt"]
      }
    ]
  });

  if (selected) {
    const text = editorGetText() || "";
    await writeFile(selected, text);
    exploitExport.classList.remove("disabled");
    loadScripts();
    return true;
  }

  exploitExport.classList.remove("disabled");
  return false;
}

function clear() {
  if (editorSetText) editorSetText("", true);
}

async function kill() {
  if (await isRobloxRunning()) await killRoblox();
}

async function logout() {
  await closeExistingLogin();
}

async function openFolder() {
  try {
    await open(await path.join(await path.appConfigDir(), "scripts"));
    return true;
  } catch {
    return false;
  }
}

function setupEditor() {
  if (editorReady) return;
  editorReady = true;

  require(["vs/editor/editor.main"], async function() {
    let editorProposals = [];
    let dynamicEditorProposals = [];

    function getDependencyProposals() {
      return [...editorProposals, ...dynamicEditorProposals];
    }

    monaco.languages.registerCompletionItemProvider("lua", {
      provideCompletionItems: function() {
        return getDependencyProposals();
      }
    });

    monaco.editor.defineTheme("dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "global", foreground: "84d6f7", fontStyle: "bold" },
        { token: "keyword", foreground: "f86d7c", fontStyle: "bold" },
        { token: "comment", foreground: "388234" },
        { token: "number", foreground: "ffc600" },
        { token: "string", foreground: "adf195" },
        { token: "custom", foreground: "66ffcc", fontStle: "bold" },
      ],
      colors: {
        "editor.background": "#191a1e"
      }
    });

    editor = monaco.editor.create(exploitEditor, {
      language: "lua",
      theme: "dark",
      value: await getActiveTabContent(),
      fontFamily: "Source Sans 3",
      fontSize: 13,
      acceptSuggestionOnEnter: "smart",
      suggestOnTriggerCharacters: true,
      suggestSelection: "recentlyUsed",
      folding: true,
      autoIndent: true,
      scrollBeyondLastLine: false,
      wordBasedSuggestions : true,
      scrollbar: {
        verticalHasArrows: true,
      },
      minimap: {
        enabled: false,
      },
      showFoldingControls: "always",
      smoothScrolling: true,
      contextmenu: true,
      lineNumbersMinChars: 2
    });

    window.onresize = function() {
      editor.layout();
    };

    editorGetText = function() {
      return editor.getValue();
    }
    
    editorSetText = function(x, preserveUndo) {
      const model = editor.getModel();
      const range = model.getFullModelRange();

      if (preserveUndo) {
        editor.pushUndoStop();
        editor.executeEdits("", [{ range: range, text: x }]);
      } else editor.setValue(x);

      editor.setSelection({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
    }

    editorSetScroll = function(top) {
      try { editor.setScrollTop(top); }
      catch { };
    }

    const tab = tabs.find((t) => t.active === true);
    if (tab) editorSetScroll(tab.scroll || 0);

    function editorAddIntellisense(l, k, d, i) {
      let t;
        
      switch(k) {
        case "Class":
          t = monaco.languages.CompletionItemKind.Class;
          break;
        case "Color":
          t = monaco.languages.CompletionItemKind.Color;
          break;
        case "Constructor":
          t = monaco.languages.CompletionItemKind.Constructor;
          break;
        case "Enum":
          t = monaco.languages.CompletionItemKind.Enum;
          break;
        case "Field":
          t = monaco.languages.CompletionItemKind.Field;
          break;
        case "File":
          t = monaco.languages.CompletionItemKind.File;
          break;
        case "Folder":
          t = monaco.languages.CompletionItemKind.Folder;
          break;
        case "Function":
          t = monaco.languages.CompletionItemKind.Function;
          break;
        case "Interface":
          t = monaco.languages.CompletionItemKind.Interface;
          break;
        case "Keyword":
          t = monaco.languages.CompletionItemKind.Keyword;
          break;
        case "Method":
          t = monaco.languages.CompletionItemKind.Method;
          break;
        case "Module":
          t = monaco.languages.CompletionItemKind.Module;
          break;
        case "Property":
          t = monaco.languages.CompletionItemKind.Property;
          break;
        case "Reference":
          t = monaco.languages.CompletionItemKind.Reference;
          break;
        case "Snippet":
          t = monaco.languages.CompletionItemKind.Snippet;
          break;
        case "Text":
          t = monaco.languages.CompletionItemKind.Text;
          break;
        case "Unit":
          t = monaco.languages.CompletionItemKind.Unit;
          break;
        case "Value":
          t = monaco.languages.CompletionItemKind.Value;
          break;
        case "Variable":
          t = monaco.languages.CompletionItemKind.Variable;
          break;
      };
        
      editorProposals.push({
        label: l,
        kind: t,
        detail: d,
        insertText: i
      });
    };

    for (const key of ["_G", "_VERSION", "Enum", "game", "plugin", "shared", "script", "workspace", "DebuggerManager", "elapsedTime", "LoadLibrary", "PluginManager", "settings", "tick", "time", "typeof", "UserSettings"]) {
      editorAddIntellisense(key, "Keyword", key, key);
    }

    for (const key of ["and", "break", "do", "else", "elseif", "end", "false", "for", "function", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while"]) {
      editorAddIntellisense(key, "Variable", key, key);
    }

    for (const key of ["math.abs", "math.acos", "math.asin", "math.atan", "math.atan2", "math.ceil", "math.cos", "math.cosh", "math.deg", "math.exp", "math.floor", "math.fmod", "math.frexp", "math.huge", "math.ldexp", "math.log", "math.max", "math.min", "math.modf", "math.pi", "math.pow", "math.rad", "math.random", "math.randomseed", "math.sin", "math.sinh", "math.sqrt", "math.tan", "math.tanh", "table.concat", "table.foreach", "table.foreachi", "table.sort", "table.insert", "table.remove", "Color3.new", "Instance.new", "BrickColor.new", "Vector3.new", "Vector2.new", "debug.gethook", "debug.getinfo", "debug.getlocal", "debug.getmetatable", "debug.getregistry", "debug.getupvalue", "debug.getuservalue", "debug.sethook", "debug.setlocal", "debug.setmetatable", "debug.setupvalue", "debug.setuservalue", "debug.traceback", "debug.upvalueid", "debug.upvaluejoin", "string.byte", "string.char", "string.dump", "string.find", "string.format", "string.gmatch", "string.gsub", "string.len", "string.lower", "string.match", "string.rep", "string.reverse", "string.sub", "string.upper", "coroutine.create", "coroutine.resume", "coroutine.running", "coroutine.status", "coroutine.wrap", "coroutine.yield"]) {
      editorAddIntellisense(key, "Method", key, key);
    }

    for (const key of ["Drawing", "debug", "Instance", "Color3", "Vector3", "Vector2", "BrickColor", "math", "table", "string", "coroutine", "Humanoid", "ClickDetector", "LocalScript", "Model", "ModuleScript", "Mouse", "Part", "Player", "Script", "Tool", "RunService", "UserInputService", "Workspace"]) {
      editorAddIntellisense(key, "Class", key, key);
    }

    for (const key of ["print", "warn", "wait", "info", "printidentity", "assert", "collectgarbage", "error", "getfenv", "getmetatable", "setmetatable", "ipairs", "loadfile", "loadstring", "newproxy", "next", "pairs", "pcall", "spawn", "rawequal", "rawget", "rawset", "select", "tonumber", "tostring", "type", "unpack", "xpcall", "delay", "stats", ":Remove()", ":BreakJoints()", ":GetChildren()", ":FindFirstChild()", ":FireServer()", ":InvokeServer()", ":ClearAllChildren()", ":Clone()", ":Destroy()", ":FindFirstAncestor()", ":FindFirstAncestorOfClass()", ":FindFirstAncestorWhichIsA()", ":FindFirstChildOfClass()", ":FindFirstChildWhichIsA()", ":GetDebugId()", ":GetDescendants()", ":GetFullName()", ":IsA()", ":GetPropertyChangedSignal()", ":IsAncestorOf()", ":IsDescendantOf()", ":WaitForChild()", ":Connect()", ":AncestryChanged()", ":Changed()", ":ChildAdded()", ":ChildRemoved()", ":DescendantAdded()", ":DescendantRemoving()", ":GetService()", ":GetObjects()", ":HttpGet()", ":Wait()"]) {
      editorAddIntellisense(key, "Function", key, key.includes(":") ? key.substring(1, key.length) : key);
    }

    for (const key of ["Visible", "Color", "Transparency", "Thickness", "From", "To", "Text", "Size", "Center", "Outline", "OutlineColor", "Position", "TextBounds", "Font", "Data", "Rounding", "NumSides", "Radius", "Filled", "PointA", "PointB", "PointC", "PointD"]) {
      editorAddIntellisense(key, "Property", "Property for Drawing Library", key);
    }

    function updateIntelliSense() {
      dynamicEditorProposals = [];
      const editorContent = editor.getValue();

      let functionMatch;
      let variableMatch;

      const functionRegex = /(?:\blocal\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
      const variableRegex = /(?:\blocal\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
    
      while ((functionMatch = functionRegex.exec(editorContent)) !== null) {
        dynamicEditorProposals.push({ label: functionMatch[1], kind: monaco.languages.CompletionItemKind.Function, detail: "Function", insertText: functionMatch[1] });
      }
    
      while ((variableMatch = variableRegex.exec(editorContent)) !== null) {
        dynamicEditorProposals.push({ label: variableMatch[1], kind: monaco.languages.CompletionItemKind.Variable, detail: "Variable", insertText: variableMatch[1] });
      }
    }

    const setContent = debounce(function (text) {
      setActiveTabContent(text);
    }, 150);

    editor.onDidChangeModelContent(function () {
      updateIntelliSense();
      setContent(editorGetText());
    });

    editor.onDidScrollChange(function (e) {
      setActiveTabScroll(e.scrollTop);
    });

    editor.addCommand(monaco.KeyCode.Home, () => null);
    updateIntelliSense();
  });
}

async function checkRobloxActive() {
  const newActive = await isRobloxRunning();
  
  if (prevActive !== newActive && wsConnected && prevConnected !== undefined) {
    prevActive = newActive;
    
    if (newActive) {
      if (!prevConnected && injecting !== true) {
        if (settings.autoInject && await findExecutable()) inject();
        else exploitInject.classList.remove("disabled");
      }
      exploitKill.classList.remove("disabled");
    } else {
      exploitInject.classList.add("disabled");
      exploitKill.classList.add("disabled");
    }
  }
}

window.addEventListener("DOMContentLoaded", async function () {
  // Prevent Events
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", function(e) {
    if (e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r")) {
      e.preventDefault();
    }

    if (e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.metaKey && e.key === "f")) {
      e.preventDefault();
    }
  });

  // Set-up
  dataDirectory = await getData();
  await createDirectory("", true);
  await createDirectory(dataDirectory, true);
  await createDirectory("scripts", true);
  await createDirectory("autoexec", true);
  setInterval(injectLoginCode, 100);

  // Events
  event.listen("login", function () {
    loginForm.classList.remove("disabled");
  });

  event.listen("websocket-open", async function () {
    wsConnected = true;
    await event.emit("websocket-send", JSON.stringify({ type: 1, side_type: "browser" }));
    checkActive();

    wsInterval = setInterval(async function () {
      if (!wsConnected) return clearInterval(wsInterval);
      await event.emit("websocket-send", JSON.stringify({ type: 2 }));
    }, 1000);
  });

  event.listen("websocket-message", function (e) {
    const message = e.payload;
    
    let json;

    try { json = JSON.parse(message); }
    catch { return; };

    if (json.status) {
      const connected = json.status === "connected";

      if (prevConnected === connected) {
        return;
      } else {
        prevConnected = connected;
      }

      exploitIndicator.style.color = `var(--${connected ? "green" : "text"})`;

      if (connected) {
        exploitExecute.classList.remove("disabled");
        exploitInject.classList.add("disabled");
      } else {
        if (prevActive) exploitInject.classList.remove("disabled");
        exploitExecute.classList.add("disabled");
      }
    }
  });

  event.listen("websocket-close", async function () {
    wsConnected = false;
    await closeExistingLogin();
    checkActive();
  });

  // Titlebar
  document.querySelector(".tb-button.minimize").addEventListener("click", minimize);
  document.querySelector(".tb-button.maximize").addEventListener("click", maximize);
  document.querySelector(".tb-button.exit").addEventListener("click", exit);

  // Maximized
  async function checkMaximized() {
    const maximized = await isMaximized();
    document.body.classList.toggle("kr-maximized", maximized);
  }

  checkMaximized();
  window.addEventListener("resize", checkMaximized);

  // Settings
  settings = await getSettings();

  // Sections
  loginSection = document.querySelector("body > .login");
  exploitSection = document.querySelector("body > .exploit");

  // Login
  loginForm = document.querySelector(".login .form");
  loginSubmit = document.querySelector(".login .kr-button.submit");
  loginSubmit.addEventListener("click", login);

  // Exploit
  exploitIndicator = document.querySelector(".kr-titlebar .brand .text");
  exploitTabs = document.querySelector(".exploit .main .container .tabs .list");
  exploitEditor = document.querySelector(".exploit .main .container .editor");
  exploitScripts = document.querySelector(".exploit .main .container-2 .scripts");
  exploitScriptsSearch = document.querySelector(".exploit .main .container-2 .kr-input.search");
  exploitScriptsFolder = document.querySelector(".kr-folder");

  // Scripts
  await loadScripts();
  exploitScriptsSearch.addEventListener("input", loadScripts);
  setInterval(loadScripts, 1000);

  document.querySelector(".kr-scripts-new-file").addEventListener("click", () => newFile());
  document.querySelector(".kr-scripts-new-folder").addEventListener("click", () => newFolder());

  // Tabs
  await setupTabs();
  populateTabs(true);
  document.querySelector(".kr-add-tab").addEventListener("click", addNewTab);

  // Buttons
  exploitInject = document.querySelector(".kr-inject");
  exploitExecute = document.querySelector(".kr-execute");
  exploitImport = document.querySelector(".kr-import");
  exploitExport = document.querySelector(".kr-export");
  exploitClear = document.querySelector(".kr-clear");
  exploitKill = document.querySelector(".kr-kill");
  exploitLogout = document.querySelector(".kr-logout");
  exploitExecute.addEventListener("click", execute);
  exploitImport.addEventListener("click", _import);
  exploitExport.addEventListener("click", _export);
  exploitClear.addEventListener("click", clear);
  exploitKill.addEventListener("click", kill);
  exploitLogout.addEventListener("click", logout);
  exploitScriptsFolder.addEventListener("click", openFolder);

  // Inject Button
  exploitInject.addEventListener("click", inject);
  document.querySelector(".kr-dropdown-select").addEventListener("click", askForExecutable);
  document.querySelector(".kr-dropdown-delete").addEventListener("click", function () {
    if (!injecting) clearExecutables();
  });

  // Auto Inject
  function checkAutoInject() {
    document.querySelector(".kr-dropdown-automatic .fa-solid").className = `fa-solid fa-${settings.autoInject ? "check" : "times"}`;
  }

  checkAutoInject();
  document.querySelector(".kr-dropdown-automatic").addEventListener("click", async function () {
    await setAutoInject(!settings.autoInject);
    checkAutoInject();
  });

  // Top Most
  async function checkTopMost() {
    document.querySelector(".kr-dropdown-top-most .fa-solid").className = `fa-solid fa-${settings.topMost ? "check" : "times"}`;
    await appWindow.setAlwaysOnTop(settings.topMost);
  }

  await checkTopMost();
  document.querySelector(".kr-dropdown-top-most").addEventListener("click", async function () {
    await setTopMost(!settings.topMost);
    await checkTopMost();
  });

  // Key Toggle
  function checkKeyToggle() {
    document.querySelector(".kr-dropdown-key-toggle .fa-solid").className = `fa-solid fa-${settings.keyToggle ? "check" : "times"}`;
  }

  await invoke("init_key_events", { window: appWindow });
  await checkKeyToggle();
  
  document.querySelector(".kr-dropdown-key-toggle").addEventListener("click", async function () {
    await setKeyToggle(!settings.keyToggle);
    await checkKeyToggle();
  });
  
  event.listen("key-press", function (e) {
    const key = (e?.payload?.message || "")?.toLowerCase();
    if (key === "home" && settings.keyToggle) toggle();
  });

  window.addEventListener("keyup", function (e) {
    const key = (e?.key || "")?.toLowerCase();
    if (key === "home" && settings.keyToggle) toggle();
  });

  // Active
  checkRobloxActive();
  setInterval(checkRobloxActive, 1000);

  // Dropdowns
  function findDropdown(e) {
    if (e.classList.contains("kr-dropdown")) return e;
    return e.parentElement && findDropdown(e.parentElement);
  }

  onClick(window, async function(button, e) {
    const foundDropdown = findDropdown(e.target);
    const foundDropdownContent = foundDropdown && Array.from(foundDropdown?.querySelectorAll(".kr-dropdown-content")).find((d) => d.parentElement === foundDropdown);
    const dropdowns = Array.from(document.querySelectorAll(".kr-dropdown"));

    await Promise.all(dropdowns.map((d) => {
      if (d !== foundDropdown) d.querySelector(".kr-dropdown-content.active")?.classList.remove("active");
    }));

    if (foundDropdownContent && e.target.parentElement === foundDropdownContent) {
      foundDropdownContent.classList.remove("active");
    } else if (foundDropdownContent) {
      if (foundDropdown.classList.contains("left")) {
        if (button === "left") foundDropdownContent.classList.toggle("active");
        else if (button === "right") foundDropdownContent.classList.remove("active");
      } else {
        if (button === "right") foundDropdownContent.classList.toggle("active");
        else if (button === "left") foundDropdownContent.classList.remove("active");
      }

      if (foundDropdownContent.classList.contains("active")) {
        const dropdownWidth = foundDropdownContent.clientWidth;
        const dropdownHeight = foundDropdownContent.clientHeight;
        const offset = 10;
        const offsetX = (e.clientX + dropdownWidth + offset > window.innerWidth) ? window.innerWidth - (dropdownWidth + offset) : e.clientX;
        const offsetY = (e.clientY + dropdownHeight + offset > window.innerHeight) ? window.innerHeight - (dropdownHeight + offset) : e.clientY + offset;

        foundDropdownContent.style.top = `${offsetY}px`;
        foundDropdownContent.style.left = `${offsetX}px`;
      }
    }
  });
});