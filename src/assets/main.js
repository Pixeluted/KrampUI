const { invoke } = window.__TAURI__.tauri;
const { open, Command } = window.__TAURI__.shell;
const { appWindow } = window.__TAURI__.window;
const process = window.__TAURI__.process;
const dialog = window.__TAURI__.dialog;
const path = window.__TAURI__.path;
const fs = window.__TAURI__.fs;

require.config({ paths: { "vs": "./assets/monaco" }});

let websocket, websocketInterval;
let loginSection, exploitSection;
let loginForm, loginToken, loginSubmit;
let exploitIndicator, exploitTabs, exploitEditor, exploitScripts, exploitScriptsSearch, exploitScriptsFolder;
let editor, editorGetText, editorSetText, editorRefresh;
let exploitInject, exploitExecute, exploitImport, exploitExport, exploitClear, exploitKill, exploitLogout;
let prevConnected, prevActive, editorReady, tabs, injecting, autoInject;

async function minimize() {
  await appWindow.minimize();
}

async function maximize() {
  await appWindow.toggleMaximize();
}

async function isMaximized() {
  return await appWindow.isMaximized();
}

async function exit() {
  await process.exit();
}

function checkActive() {
  if (websocket && websocket.readyState === websocket.OPEN) {
    loginSection.classList.remove("active");
    exploitSection.classList.add("active");
    setupEditor();
  } else {
    exploitSection.classList.remove("active");
    loginSection.classList.add("active");
  }
}

async function getWindowPosition() {
  const position = await appWindow.innerPosition();
  return { x: position.x, y: position.y };
}

async function setWindowPosition(x, y) {
  await window.__TAURI__.window.appWindow.setPosition({ type: "Physical", x, y });
}

function initialize() {
  return new Promise(function (res) {
    websocket = new WebSocket(`wss://loader.live/?login_token="${loginToken.value}"`);

    websocket.onopen = function () {
      websocket.send(JSON.stringify({ type: 1, side_type: "browser" }));
      checkActive();

      websocketInterval = setInterval(function () {
        if (websocket.readyState !== websocket.OPEN) return clearInterval(websocketInterval);
        websocket.send(JSON.stringify({ type: 2 }));
      }, 1000);

      res(websocket.readyState === websocket.OPEN);
    };

    websocket.onmessage = function (message) {
      let json;

      try { json = JSON.parse(message.data); }
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
    };

    websocket.onerror = function () {
      checkActive();
      res(false);
    };

    websocket.onclose = function () {
      checkActive();
      res(false);
    };
  });
}

async function login() {
  loginForm.classList.add("disabled");
  await setToken(loginToken.value);
  await initialize();
  loginForm.classList.remove("disabled");
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

async function readFile(file, noDir) {
  try {
    return await fs.readTextFile(file, { dir: noDir ? undefined : fs.BaseDirectory.AppConfig });
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

async function readBinary(file, noDir) {
  try {
    return await fs.readBinaryFile(file, { dir: noDir ? undefined : fs.BaseDirectory.AppConfig });
  } catch {
    return null;
  }
}

async function writeBinary(file, contents) {
  try {
    await fs.writeBinaryFile(file, contents, { dir: fs.BaseDirectory.AppConfig });
    return true;
  } catch {
    return false;
  }
}

async function deleteFile(file, noDir) {
  try {
    await fs.removeFile(file, { dir: noDir ? undefined : fs.BaseDirectory.AppConfig });
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

async function getToken() {
  return await readFile("kr-token");
}

async function setToken(token) {
  return await writeFile("kr-token", token);
}

async function getAutoInject() {
  const text = await readFile("kr-auto-inject");
  return text ? text === "true" : false;
}

async function setAutoInject(bool) {
  return await writeFile("kr-auto-inject", bool.toString());
}

async function checkExecutable() {
  return await exists("kr-executable.exe");
}

async function setExecutable(data) {
  return await writeBinary("kr-executable.exe", data);
}

async function emptyScripts() {
  const scripts = Array.from(exploitScripts.querySelectorAll(".scripts > .script-container:has(> .script:not(.folder))"));
  await Promise.all(scripts.map((s) => s.remove()));
}

async function emptyFolders() {
  const folders = Array.from(exploitScripts.querySelectorAll(".scripts > .script-container:has(> .script.folder)"));
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

async function addFolder({ name, path, scripts }) {
  const container = document.createElement("div");
  const folder = document.createElement("div");
  const folderScripts = document.createElement("div");
  const icon = document.createElement("i");

  const dropdown = document.createElement("div");
  const dropdownNewFile = document.createElement("div");
  const dropdownNewFileIcon = document.createElement("i");
  const dropdownRename = document.createElement("div");
  const dropdownRenameIcon = document.createElement("i");
  const dropdownDelete = document.createElement("div");
  const dropdownDeleteIcon = document.createElement("i");

  container.className = "script-container kr-dropdown";
  folder.className = "script folder";
  folder.spellcheck = false;
  folder.innerText = name;
  icon.className = "fa-solid fa-folder";
  folder.append(icon);
  folderScripts.className = "folder-scripts";
  if (getExpanded(name)) folderScripts.classList.add("expanded");

  dropdown.className = "kr-dropdown-content";
  dropdownNewFile.innerText = "New File";
  dropdownNewFileIcon.className = "fa-solid fa-file";
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownDelete.innerText = "Delete";
  dropdownDeleteIcon.className = "fa-solid fa-delete-left";

  dropdownNewFile.append(dropdownNewFileIcon);
  dropdownRename.append(dropdownRenameIcon);
  dropdownDelete.append(dropdownDeleteIcon);
  dropdown.append(dropdownNewFile);
  dropdown.append(dropdownRename);
  dropdown.append(dropdownDelete);

  scripts.forEach(async (s) => await addScript(s, { name, element: folderScripts }));

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
    await newFile(name);
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

async function getFilePath(folder) {
  let number = 0;

  async function get() {
    number = number + 1;
    const path = folder ? `scripts/${folder}/Script ${number}.lua` : `scripts/Script ${number}.lua`;
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

async function newFile(folder) {
  await writeFile(await getFilePath(folder), "");
  loadScripts();
}

async function newFolder() {
  await createDirectory(await getFolderPath(), true);
  loadScripts();
}

async function addScript({ name, path }, folder) {
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
  dropdownExport.innerText = "Export";
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
    const text = await readFile(path);
    if (editorSetText) editorSetText(text);
  });

  script.addEventListener("mousedown", function (e) {
    if (e.button === 0 && script.contentEditable !== "true") select();
  });

  window.addEventListener("mouseup", async function () {
    if (selectedFolder) {
      const isScripts = selectedFolder.classList.contains("scripts");
      const result = await renameFile(path, isScripts ? `scripts/${name}` : `scripts/${selectedFolder.innerText}/${name}`);
      if (!isScripts) setExpanded(selectedFolder.innerText, true);
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
    await writeFile(path, text);
    loadScripts(true);
  });

  dropdownExecute.addEventListener("click", async function () {
    const text = await readFile(path);
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
      const result = await renameFile(path, folder ? `scripts/${folder.name}/${script.innerText}` : `scripts/${script.innerText}`);
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
    await deleteFile(path);
    loadScripts();
  });

  container.append(script);
  container.append(dropdown);
  (folder ? folder.element : exploitScripts).append(container);
}

let prevScripts;
let prevFolders;

function parseScripts(files) {
  return files
    .filter((s) => s.path && s.name)
    .filter((s) => [".lua", ".txt"].some((e) => s.name.endsWith(e)))
    .filter((s) => s.name.toLowerCase().includes((exploitScriptsSearch.value || "")?.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseFolders(files) {
  return files
    .filter((f) => f.path && f.name && f.children)
    .filter((f) => {
      const scripts = parseScripts(f.children);
      return f.name.toLowerCase().includes((exploitScriptsSearch.value || "")?.toLowerCase()) || scripts.some((s) => s.name.toLowerCase().includes((exploitScriptsSearch.value || "")?.toLowerCase()));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function populateScripts(scripts, force) {
  const scriptNames = scripts.map((s) => s.name);
  if (!force && scriptNames.join(",") === prevScripts) return;
  prevScripts = scriptNames.join(",");
  emptyScripts();
  
  scripts.forEach(async (s) => await addScript(s));
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

async function loadScripts(force) {
  if (!await exists("scripts")) await createDirectory("scripts", true);
  const files = await readDirectory("scripts", true);
  const scripts = parseScripts(files);
  const folders = parseFolders(files);

  await populateFolders(folders, force);
  await populateScripts(scripts, force);
}

async function getTabContent(tab) {
  const script = tab.path;
  let content = "";

  if (script) {
    // TODO: script get content logic
  } else {
    content = tab.data || "";
  }

  return content;
}

async function setTabContent(tab, content) {
  const script = tab.path;

  if (script) {
    // TODO: script set content logic
  } else {
    tabs = tabs.map((t) => {
      if (t.name === tab.name) tab.data = content;
      return t;
    });
    await setTabs();
    populateTabs();
  }
}

async function getActiveTabContent() {
  const tab = tabs.find((t) => t.active === true);
  return tab ? await getTabContent(tab) : "";
}

async function setActiveTabContent(content) {
  const tab = tabs.find((t) => t.active === true);
  if (tab) await setTabContent(tab, content);
}

async function getTabs() {
  const text = await readFile("kr-tabs");
  let json;
  try { json = JSON.parse(text); }
  catch { return false; };
  return json || false;
}

async function setTabs() {
  await writeFile("kr-tabs", JSON.stringify(tabs));
}

async function addTab(data, dontLoad) {
  if (data.active) {
    tabs = tabs.map(function (t) {
      t.active = false;
      return t;
    });
  }

  tabs.push(data);
  await setTabs();
  if (editorSetText) editorSetText(await getActiveTabContent());
  if (dontLoad !== true) populateTabs();
}

async function deleteTab(name) {
  if (tabs.length === 1) return;
  let order = 0;
  
  const tab = tabs.find((t) => t.name === name);
  if (!tab) return;
  
  const tabIndex = tabs.indexOf(tab);
  const newTab = tabs[tabIndex - 1] || tabs[tabIndex + 1];
  const script = tab.path;

  if (script) {
    // TODO: script delete logic
  } else {
    tabs = tabs
      .filter(function (t) {
        return t.name !== name;
      })
      .map(function (t) {
        order = order + 1;
        if (tab?.active) {
          if (t.name === newTab?.name) t.active = true;
          else t.active = false;
        }
        t.order = order;
        return t;
      });
  }

  await setTabs();
  if (editorSetText) editorSetText(await getActiveTabContent());
  populateTabs();
}

async function renameTab(name, newName) {
  if (tabs.find((t) => t.name === newName)) return;

  const tab = tabs.find((t) => t.name === name);
  if (!tab) return;

  const script = tab.path;

  if (script) {
    // TODO: script rename logic
  } else {
    tabs = tabs.map(function (t) {
      if (t.name === name) t.name = newName;
      return t;
    });
  }

  await setTabs();
  populateTabs();
}

async function changeTabOrder(name, newOrder) {
  const tabToChange = tabs.find(tab => tab.name === name);
  const oldOrder = tabToChange.order;
  
  tabs.forEach((t) => {
    if (t.name !== name) {
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
  populateTabs();
}

async function setTabActive(name) {
  if (tabs.find((t) => t.name === name)?.active) return;

  tabs = tabs.map(function (t) {
    t.active = t.name === name;
    return t;
  });
  
  await setTabs();
  if (editorSetText) editorSetText(await getActiveTabContent());
  populateTabs();
}

function getNextScriptTab() {
  let number = 0;

  function get() {
    number = number + 1;
    if (tabs.find((t) => t.name === `Script ${number}`)) return get();
    return number;
  }

  return get();
}

function getNextOrder() {
  let number = 0;

  function get() {
    number = number + 1;
    if (tabs.find((t) => t.order === number)) return get();
    return number;
  }

  return get();
}

async function addNewTab(dontLoad) {
  await addTab({ name: `Script ${getNextScriptTab()}`, data: "", order: getNextOrder(), active: true }, dontLoad);
}

async function setupTabs() {
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
  const dropdownRename = document.createElement("div");
  const dropdownRenameIcon = document.createElement("i");
  const dropdownDelete = document.createElement("div");
  const dropdownDeleteIcon = document.createElement("i");

  tabDropdown.className = "kr-dropdown";
  dropdown.className = "kr-dropdown-content";
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownDelete.innerText = "Delete";
  dropdownDeleteIcon.className = "fa-solid fa-delete-left";

  dropdownRename.append(dropdownRenameIcon);
  dropdownDelete.append(dropdownDeleteIcon);
  dropdown.append(dropdownRename);
  dropdown.append(dropdownDelete);

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
      const tab = tabs.find((t) => t.name === selectedTab?.innerText);
      if (tab) await changeTabOrder(info.name, tab.order);
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

  dropdownDelete.addEventListener("click", () => deleteTab(info.name));

  tab.addEventListener("input", function () {
    if (tab.contentEditable === "true") changeContentEditableText(tab, tab.innerText.replace(/[<>:"/\\|?*]/g, ""));
  });

  async function enter(e) {
    if (tab.contentEditable === "true") {
      if (e) e.preventDefault();
      dropdown.classList.remove("disabled");
      tab.contentEditable = false;
      tab.innerText = tab.innerText.trim();

      if (tab.innerText.trim() === "") tab.innerText = info.name;

      tab.append(icon);
      await renameTab(info.name, tab.innerText);
    }
  }

  tab.addEventListener("blur", enter);
  tab.addEventListener("keydown", function (e) {
    if (e.key === "Enter") enter();
  });

  dropdownRename.addEventListener("click", async function () {
    dropdown.classList.add("disabled");
    icon.remove();
    tab.contentEditable = true;
    tab.focus();
    focusAtEnd(tab);
  });

  tab.className = "kr-tab";
  tab.innerText = info.name;
  if (info.active) tab.classList.add("active");
  icon.className = script ? "fa-solid fa-file" : "fa-solid fa-scroll";
  tab.append(icon);
  tab.addEventListener("click", function () {
    if (tab.contentEditable !== "true") setTabActive(info.name);
  });

  tabDropdown.append(tab);
  tabDropdown.append(dropdown);
  exploitTabs.append(tabDropdown);
  if (info.active) tab.scrollIntoView();
}

function populateTabs() {
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
    const data = await readBinary(selected, true);
    
    if (data) {
      await setExecutable(data);
      try { await deleteFile(selected, true); }
      catch {};
      if (!prevConnected && !injecting && prevActive) exploitInject.classList.remove("disabled");
      return true;
    }
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

async function inject(ignoreIfNoExecutable) {
  if (!await isRobloxRunning()) {
    return;
  }

  if (!await checkExecutable()) {
    if (ignoreIfNoExecutable || !await askForExecutable()) return;
  }

  try {
    injecting = true;
    exploitInject.classList.add("disabled");
    exploitIndicator.style.color = "var(--yellow)";

    const command = new Command("kr-inject", [], { cwd: await path.appConfigDir() });

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

    injInterval = setInterval(function () {
      if (!prevActive && !isDone) done();
    }, 100);

    command.on("close", done);
    command.once("error", done);

    child = await command.spawn();
    setTimeout(done, 120 * 1000);
    
    return true;
  } catch {
    return false;
  }
}

function execute(customText) {
  try {
    const text = typeof customText === "string" ? customText : editorGetText();

    if (text && websocket && websocket.readyState === websocket.OPEN) {
      websocket.send(`<SCRIPT>${text}`);
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
    const text = await readFile(selected, true);
    if (text && editorSetText) editorSetText(text);
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
  if (editorSetText) editorSetText("");
}

async function kill() {
  if (await isRobloxRunning()) await killRoblox();
}

async function logout() {
  if (websocket) websocket.close();
  prevConnected = null;
  checkActive();
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
    
    editorSetText = function(x) {
      editor.setValue(x);
    }

    editorRefresh = function() {
      const text = getText();
      setText("");
      editor.trigger("keyboard", "type", { text: text });
    }

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

    if (editorSetText) editorSetText(await getActiveTabContent());
    editor.onDidChangeModelContent(async function() {
      updateIntelliSense();
      await setActiveTabContent(editorGetText());
    });

    updateIntelliSense();
  });
}

async function checkRobloxActive() {
  const newActive = await isRobloxRunning();
  
  if (prevActive !== newActive && websocket && websocket.readyState === websocket.OPEN && prevConnected !== undefined) {
    prevActive = newActive;
    
    if (newActive) {
      if (!prevConnected && injecting !== true) {
        if (autoInject) inject(true);
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
  await createDirectory("", true);
  await createDirectory("scripts", true);
  await createDirectory("autoexec", true);

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

  // Sections
  loginSection = document.querySelector("body > .login");
  exploitSection = document.querySelector("body > .exploit");

  // Login
  loginForm = document.querySelector(".login .form");
  loginToken = document.querySelector(".login .kr-input.token");
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
  populateTabs();
  document.querySelector(".kr-add-tab").addEventListener("click", addNewTab);

  // Auto Login
  const token = await getToken();

  if (token && token !== "") {
    loginToken.value = token;
    login();
  }

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
    if (!injecting) deleteFile("kr-executable.exe");
  });

  // Auto Inject
  async function checkAutoInject() {
    document.querySelector(".kr-dropdown-automatic .fa-solid").className = `fa-solid fa-${autoInject ? "check" : "times"}`;
  }

  autoInject = await getAutoInject();
  await checkAutoInject();

  document.querySelector(".kr-dropdown-automatic").addEventListener("click", async function () {
    autoInject = !autoInject;
    await setAutoInject(autoInject);
    await checkAutoInject();
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
      if (button === "right") foundDropdownContent.classList.toggle("active");
      else if (button === "left") foundDropdownContent.classList.remove("active");

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