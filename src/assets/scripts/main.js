const { invoke } = window.__TAURI__.tauri;
const { open, Command } = window.__TAURI__.shell;
const { appWindow } = window.__TAURI__.window;
const { getVersion } = window.__TAURI__.app;
const process = window.__TAURI__.process;
const dialog = window.__TAURI__.dialog;
const event = window.__TAURI__.event;
const path = window.__TAURI__.path;
const fs = window.__TAURI__.fs;

require.config({ paths: { "vs": "./assets/external/monaco" }});

let exploitIndicator, exploitTabs, exploitEditor, exploitScripts, exploitScriptsSearch, exploitScriptsFolder;
let editor, editorGetText, editorSetText, editorSetScroll;
let exploitInject, exploitExecute, exploitImport, exploitExport, exploitClear, exploitKill;
let connected, prevActive, editorReady, tabs, unsavedTabData, injecting, dataDirectory;
let settings, version, wsPort;

async function log(message, type = "info") {
  await invoke("log", { message, type });
}

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

let toggleLock = false;

async function show() {
  if (toggleLock) return;

  toggleLock = true;
  await appWindow.show();
  await appWindow.setFocus();
  document.body.classList.remove("kr-hidden");

  setTimeout(function () {
    toggleLock = false;
  }, 100);
}

async function hide(onlyAnimation) {
  if (toggleLock) return;

  toggleLock = true;
  document.body.classList.add("kr-hidden");

  if (!onlyAnimation) {
    setTimeout(async function () {
      await appWindow.hide();
      toggleLock = false;
    }, 100);
  }
  else toggleLock = false;
}

async function toggle(force) {
  if (await isVisible() && (force || settings.keyToggle)) await hide();
  else await show();
}

async function exit() {
  const isToggleLock = toggleLock;
  if (!isToggleLock) hide(true);

  setTimeout(async function () {
    await setUnsavedTabData();
    await process.exit();
  }, isToggleLock ? 0 : 100);
}

async function appDirectory() {
  return await path.appConfigDir();
}

async function createDirectory(directory, absolute) {
  const _path = absolute ? directory : await path.join(await appDirectory(), directory);
  return await invoke("create_directory", { path: _path });
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

async function writeFile(file, contents, absolute) {
  const _path = absolute ? file : await path.join(await appDirectory(), file);
  return await invoke("write_file", { path: _path, data: contents });
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

async function deleteDirectory(directory, absolute) {
  const _path = absolute ? directory : await path.join(await appDirectory(), directory);
  return await invoke("delete_directory", { path: _path });
}

async function deleteFile(file, absolute) {
  const _path = absolute ? file : await path.join(await appDirectory(), file);
  return await invoke("delete_file", { path: _path });
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
      autoInject: false,
      topMost: true,
      keyToggle: false
    };

    await setSettings(settings);
    return settings;
  }
}

async function setSettings(data) {
  await writeFile(`${dataDirectory}/settings`, JSON.stringify(data || settings));
}

async function getUnsavedTabData() {
  try {
    const text = await readFile(`${dataDirectory}/unsaved-tab-data`);
    const json = JSON.parse(text);
    return new Map(json);
  } catch {
    return new Map();
  }
}

async function setUnsavedTabData() {
  const array = Array.from(unsavedTabData);
  const text = JSON.stringify(array);
  await writeFile(`${dataDirectory}/unsaved-tab-data`, text);
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

async function injectAutoExec() {
  const text = `
    while not getgenv().KR_READY and task.wait(1) do
      pcall(function()
        getgenv().KR_WEBSOCKET = websocket.connect("ws://127.0.0.1:${wsPort}")
        getgenv().KR_WEBSOCKET:Send("connect")
        getgenv().KR_READY = true

        getgenv().KR_WEBSOCKET.OnMessage:Connect(function(message)
          pcall(function()
            loadstring(message)()
          end)
        end)
      end)
    end
  `;

  await writeFile("autoexec/__krampui", text.replace(/(--.*$|\/\*[\s\S]*?\*\/)/gm, "").replace(/\s+/g, " ").trim());
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
  await Promise.all(executables.map((f) => f.path).map((path) => deleteFile(path, true)));
}

async function findExecutable() {
  const executables = await getExecutables();
  return executables.shift();
}

async function getExecutable() {
  const executable = await findExecutable();
  return executable?.name || getExecutableName();
}

async function askForExecutable(select) {
  if (!select) {
    const existingExecutable = await findExecutable();
    if (existingExecutable) return existingExecutable;
    exploitInject.classList.add("disabled");
  }

  const selected = await dialog.open({
    title: "Select Executable",
    defaultPath: await path.downloadDir(),
    filters: [
      {
        name: "Ro-Exec Loader",
        extensions: ["exe"]
      }
    ]
  });

  if (selected) {
    const [isKrampusLoader, errorMessage] = await invoke("validate_executable", { executablePath: selected });
    if (isKrampusLoader) {
      await clearExecutables();
      await renameFile(selected, await getExecutable());
    } else {
      alert(errorMessage);
    }
  }

  const executable = await findExecutable();
  if (!select && !executable) exploitInject.classList.remove("disabled");
  return executable;
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
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownDelete.innerText = "Delete";
  dropdownDeleteIcon.className = "fa-solid fa-delete-left";

  dropdownNewFile.append(dropdownNewFileIcon);
  dropdownRename.append(dropdownRenameIcon);
  dropdownDelete.append(dropdownDeleteIcon);
  dropdown.append(dropdownNewFile);

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
  await createDirectory(await getFolderPath());
  loadScripts();
}

async function addScript({ name, path: _path }, folder, autoExec) {  const container = document.createElement("div");
  const script = document.createElement("div");
  const icon = document.createElement("i");

  const dropdown = document.createElement("div");
  const dropdownExecute = document.createElement("div");
  const dropdownExecuteIcon = document.createElement("i");
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
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownDelete.innerText = "Delete";
  dropdownDeleteIcon.className = "fa-solid fa-delete-left";

  dropdownExecute.append(dropdownExecuteIcon);
  dropdownRename.append(dropdownRenameIcon);
  dropdownDelete.append(dropdownDeleteIcon);
  dropdown.append(dropdownExecute);
  dropdown.append(dropdownRename);
  dropdown.append(dropdownDelete);

  const extension = name.split(".").pop();

  let selected = false;
  let selectedFolder = null;
  let isMouseDown = false;
  let mouseDownTime;
  let scriptClone;

  function select(e) {
    selected = true;
    if (scriptClone) scriptClone.remove();
    scriptClone = script.cloneNode(true);
    scriptClone.className = "script";
    scriptClone.style.backgroundColor = "var(--lighter)";
    script.parentElement.append(scriptClone);
    moveToCursor(e);
    script.classList.add("selected");
  }

  function unselect() {
    selected = false;
    if (scriptClone) scriptClone.remove();
    script.classList.remove("selected");
    if (selectedFolder) selectedFolder.classList.remove("highlight");
    selectedFolder = null;
  }

  function moveToCursor(e) {
    scriptClone.style.pointerEvents = "none";
    scriptClone.style.position = "absolute";
    scriptClone.style.zIndex = "10";

    const scriptWidth = scriptClone.clientWidth;
    const scriptHeight = scriptClone.clientHeight;
    const offset = 10;
    const offsetX = (e.clientX + scriptWidth / 2 > window.innerWidth) ? window.innerWidth - (scriptWidth + offset) : e.clientX - scriptWidth / 2;
    const offsetY = (e.clientY + scriptHeight / 2 > window.innerHeight) ? window.innerHeight - (scriptHeight + offset) : e.clientY - scriptHeight / 2;

    scriptClone.style.top = `${offsetY}px`;
    scriptClone.style.left = `${offsetX}px`;
  }

  script.addEventListener("click", async function () {
    if (script.contentEditable === "true") return;
    await addScriptTab(_path);
  });

  script.addEventListener("mousedown", function (e) {
    isMouseDown = true;

    if (e.button === 0 && script.contentEditable !== "true") {
      mouseDownTime = Date.now();
      setTimeout(function () {
        if (isMouseDown && Date.now() - mouseDownTime >= 175) select(e);
      }, 175);
    }
  });

  window.addEventListener("mouseup", async function () {
    isMouseDown = false;

    if (selectedFolder) {
      const isAutoExec = selectedFolder.parentElement?.classList.contains("kr-auto-exec");
      const isScripts = selectedFolder.classList.contains("scripts");

      let newPath = isAutoExec ? `autoexec/${name}` : isScripts ? `scripts/${name}` : `scripts/${selectedFolder.innerText}/${name}`;
      newPath = await path.join(await appDirectory(), newPath);

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
      if (scriptClone) moveToCursor(e);

      if (selectedFolder) selectedFolder.classList.remove("highlight");
      if ((e.target?.classList.contains("script") && e.target?.classList.contains("folder")) || e.target?.classList.contains("scripts")) {
        selectedFolder = e.target;
        selectedFolder.classList.add("highlight");
      } else if ((e.target?.parentElement?.classList.contains("script") && e.target?.parentElement?.classList.contains("folder")) || e.target?.parentElement?.classList.contains("scripts")) {
        selectedFolder = e.target.parentElement;
        selectedFolder.classList.add("highlight");
      } else selectedFolder = null;
    }
    else if (selected) unselect();
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

      if (!script.innerText.toLowerCase().endsWith(".lua") && !script.innerText.toLowerCase().endsWith(".luau") && !script.innerText.toLowerCase().endsWith(".txt")) {
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
    await deleteFile(_path, true);
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
    .filter((s) => [".lua", ".luau", ".txt"].some((e) => s.name.endsWith(e)))
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
  if (!autoExecPath) autoExecPath = await path.join(await appDirectory(), "autoexec");
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

async function getTabContent(tab, force) {
  const script = tab.path;
  let content = "";

  if (!force) {
    const unsavedTab = unsavedTabData.get(tab?.id);
    if (unsavedTab && unsavedTab?.content !== null) return unsavedTab.content;
  }

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
    writeFile(tab.path, content, true);
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

function roundToTen(num) {
  return Math.round(num / 10) * 10;
}

async function getActiveTabContent() {
  const tab = tabs.find((t) => t.active === true);
  return tab ? await getTabContent(tab) : "";
}

function getActiveTabName() {
  const tab = tabs.find((t) => t.active === true);
  return tab ? getTabName(tab) : "";
}

async function setActiveTabContent(content) {
  const tab = tabs.find((t) => t.active === true);
  
  if (tab) {
    const tabContent = await getTabContent(tab, true);
    const unsavedTab = unsavedTabData.get(tab.id);

    if (content !== tabContent) {
      if (unsavedTab) unsavedTabData.set(tab.id, { content, scroll: roundToTen(unsavedTab.scroll || tab.scroll || 0) });
      else unsavedTabData.set(tab.id, { content, scroll: roundToTen(tab.scroll || 0) });
    } else if (unsavedTab && unsavedTab.scroll === roundToTen(tab.scroll)) unsavedTabData.delete(tab.id);

    populateTabs(true);
  }
}

async function setActiveTabScroll(_scroll) {
  const tab = tabs.find((t) => t.active === true);
  const scroll = roundToTen(_scroll);
  
  if (tab) {
    const unsavedTab = unsavedTabData.get(tab.id);

    if (scroll !== roundToTen(tab.scroll)) {
      if (unsavedTab) unsavedTabData.set(tab.id, { content: unsavedTab.content || null, scroll });
      else unsavedTabData.set(tab.id, { content: null, scroll });
    } else if (unsavedTab && unsavedTab.content === null) unsavedTabData.delete(tab.id);

    populateTabs(true);
  }
}

async function saveTabContent(tab) {
  const unsavedTab = unsavedTabData.get(tab.id);
  
  if (unsavedTab) {
    if (unsavedTab.content !== null) await setTabContent(tab, unsavedTab.content);
    await setTabScroll(tab, unsavedTab.scroll);
    unsavedTabData.delete(tab.id);
    populateTabs(true);
  }
}

async function revertTabContent(tab) {
  const unsavedTab = unsavedTabData.get(tab.id);

  if (unsavedTab) {
    const content = await getTabContent(tab, true);
    await setTabContent(tab, content || "");
    await setTabScroll(tab, tab.scroll || 0);
    if (editorSetText) editorSetText(content || "");
    if (editorSetScroll) editorSetScroll(tab.scroll || 0);
    unsavedTabData.delete(tab.id);
    populateTabs(true);
  }
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

  scrollIntoView = true;
  tabs.push({ ...data, id: randomString(20) });
  await setTabs();
  if (editorSetText) editorSetText(await getActiveTabContent());
  if (editorSetScroll) editorSetScroll(0);
  if (dontLoad !== true) populateTabs();
}

async function deleteTab(id, onlyFiles) {
  if (tabs.length === 1) return;
  let order = 0;
  
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;

  const unsavedTab = unsavedTabData.get(tab.id);
  if (unsavedTab) unsavedTabData.delete(tab.id);
  
  const tabIndex = tabs.indexOf(tab);
  const newTab = tabs[tabIndex - 1] || tabs[tabIndex + 1];

  if (!tab.path) {
    await deleteFile(`${dataDirectory}/tabs-data/${tab.id}`);
  }

  if (!onlyFiles) {
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
    const unsavedTab = unsavedTabData.get(activeTab?.id);
    const scroll = activeTab?.scroll;
    await setTabs();
    if (editorSetText) editorSetText(await getActiveTabContent());
    if (editorSetScroll) editorSetScroll((unsavedTab ? unsavedTab.scroll : scroll) || 0);
    populateTabs();
  }
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
  const unsavedTab = unsavedTabData.get(tab.id);
  if (unsavedTab) {
    if (editorSetText) {
      if (unsavedTab.content !== null) editorSetText(unsavedTab.content || "");
      else editorSetText(await getActiveTabContent());
    }
    if (editorSetScroll) editorSetScroll(unsavedTab.scroll || 0);
  } else {
    if (editorSetText) editorSetText(await getActiveTabContent());
    if (editorSetScroll) editorSetScroll(scroll || 0);
  }
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
  if (orders.length === 0) return 1;
  let largest = orders[0];

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

  if (tab) {
    scrollIntoView = true;
    setTabActive(tab.id);
  }
  else await addTab({ path, order: getNextOrder(), active: true, scroll: 0 });
}

async function setupTabs() {
  await createDirectory(`${dataDirectory}/tabs-data`);
  tabs = await getTabs() || [];
  if (tabs.length === 0) await addNewTab(true);
}

function emptyTabElems() {
  exploitTabs.innerHTML = "";
}

let scrollIntoView = false;

function addTabElem(info) {
  const script = info.path;
  const tabDropdown = document.createElement("div");
  const tab = document.createElement("div");
  const icon = document.createElement("i");
  const closeIcon = document.createElement("i");
  const editIcon = document.createElement("i");

  const dropdown = document.createElement("div");
  const dropdownExecute = document.createElement("div");
  const dropdownExecuteIcon = document.createElement("i");
  const dropdownRename = document.createElement("div");
  const dropdownRenameIcon = document.createElement("i");

  const name = getTabName(info);
  const extension = name.split(".").pop();

  tab.setAttribute("kr-id", info.id);
  tabDropdown.className = "kr-dropdown";
  dropdown.className = "kr-dropdown-content";
  dropdownExecute.innerText = "Execute";
  dropdownExecuteIcon.className = "fa-solid fa-scroll";
  dropdownRename.innerText = "Rename";
  dropdownRenameIcon.className = "fa-solid fa-font";
  dropdownExecute.append(dropdownExecuteIcon);
  dropdownRename.append(dropdownRenameIcon);
  dropdown.append(dropdownExecute);
  dropdown.append(dropdownRename);

  let selected = false;
  let selectedTab = null;
  let isMouseDown = false;
  let mouseDownTime;
  let tabClone;

  function select(e) {
    selected = true;
    if (tabClone) tabClone.remove();
    tabClone = tab.cloneNode(true);
    tabClone.className = "kr-tab";
    tabClone.style.backgroundColor = "var(--lighter)";
    tab.parentElement.append(tabClone);
    moveToCursor(e);
    tab.classList.add("selected");
  }

  function unselect() {
    selected = false;
    if (tabClone) tabClone.remove();
    tab.classList.remove("selected");
    if (selectedTab) selectedTab.classList.remove("highlight");
    selectedTab = null;
  }

  function moveToCursor(e) {
    tabClone.style.pointerEvents = "none";
    tabClone.style.zIndex = "10";
    tabClone.style.position = "absolute";

    const tabWidth = tabClone.clientWidth;
    const tabHeight = tabClone.clientHeight;
    const offset = 10;
    const offsetX = (e.clientX + tabWidth / 2 > window.innerWidth) ? window.innerWidth - (tabWidth + offset) : e.clientX - tabWidth / 2;
    const offsetY = (e.clientY + tabHeight / 2 > window.innerHeight) ? window.innerHeight - (tabHeight + offset) : e.clientY - tabHeight / 2;

    tabClone.style.top = `${offsetY}px`;
    tabClone.style.left = `${offsetX}px`;
  }

  tab.addEventListener("mousedown", function (e) {
    isMouseDown = true;

    if (e.button === 0 && tab.contentEditable !== "true" && tabs.length > 1) {
      mouseDownTime = Date.now();
      setTimeout(function () {
        if (isMouseDown && Date.now() - mouseDownTime >= 175) select(e);
      }, 175);
    }
  });

  window.addEventListener("mouseup", async function () {
    isMouseDown = false;

    if (selectedTab) {
      const id = selectedTab?.getAttribute("kr-id") || "";
      const tab = tabs.find((t) => t.id === id);
      if (tab) await changeTabOrder(info.id, tab.order);
    }

    if (selected) unselect();
  });

  window.addEventListener("mousemove", function (e) {
    if (tab.contentEditable !== "true" && selected) {
      if (tabClone) moveToCursor(e);

      if (selectedTab) selectedTab.classList.remove("highlight");
      if (e.target?.classList.contains("kr-tab")) {
        selectedTab = e.target;
        selectedTab.classList.add("highlight");
      } else if (e.target?.parentElement?.classList.contains("kr-tab")) {
        selectedTab = e.target.parentElement;
        selectedTab.classList.add("highlight");
      } else selectedTab = null;
    }
    else if (selected) unselect();
  });

  closeIcon.addEventListener("click", function () {
    deleteTab(info.id);
  });

  tab.addEventListener("input", function () {
    if (tab.contentEditable === "true") changeContentEditableText(tab, tab.innerText.replace(/[<>:"/\\|?*]/g, ""));
  });

  async function enter(e) {
    if (tab.contentEditable === "true") {
      if (e) e.preventDefault();
      
      dropdown.classList.remove("disabled");
      tab.contentEditable = false;
      tab.innerText = tab.innerText.trim();

      if (script && (!tab.innerText.toLowerCase().endsWith(".lua") && !tab.innerText.toLowerCase().endsWith(".luau") && !tab.innerText.toLowerCase().endsWith(".txt"))) {
        tab.innerText = `${tab.innerText}.${extension}`;
      }

      if (script) {
        let defaultName = tab.innerText.split(".");
        defaultName.pop();
        defaultName = defaultName.join("");
        if (defaultName.trim() === "") tab.innerText = name;
      } else if (tab.innerText.trim() === "") tab.innerText = name;

      tab.append(icon);
      if (unsavedTabData.get(info.id)) tab.append(editIcon);
      if (tabs.length > 1) tab.append(closeIcon);
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

  dropdownRename.addEventListener("click", async function () {
    dropdown.classList.add("disabled");
    icon.remove();
    editIcon.remove();
    closeIcon.remove();
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
  editIcon.className = "fa-solid fa-pencil";
  editIcon.style = "order: -1";
  closeIcon.className = "fa-solid fa-times";
  closeIcon.style = "order: -2";
  tab.append(icon);
  if (unsavedTabData.get(info.id)) tab.append(editIcon);
  if (tabs.length > 1) tab.append(closeIcon);
  tab.addEventListener("click", function (e) {
    if (tab.contentEditable !== "true" && !info.active && !e.target?.classList.contains("fa-times")) {
      setTabActive(info.id);
    }
  });

  tabDropdown.append(tab);
  tabDropdown.append(dropdown);
  exploitTabs.append(tabDropdown);

  if (info.active && scrollIntoView) {
    tab.scrollIntoView();
    scrollIntoView = false;
  }
}

function populateTabs(force) {
  if (!force && JSON.stringify(prevTabs) === JSON.stringify(tabs)) return;
  prevTabs = tabs;

  emptyTabElems();
  tabs.sort((a, b) => a.order - b.order).forEach(async (t) => await addTabElem(t));
}

async function isRobloxRunning() {
  return await invoke("is_roblox_running");
}

async function killRoblox() {
  return await invoke("kill_roblox");
}

let evalInterval;

async function evalCode(name, code) {
  return await invoke("eval", { name, code });
}

async function inject(autoInject) {
  const executable = await askForExecutable();
  if (!executable) return;

  injecting = true;
  exploitInject.classList.add("disabled");
  exploitIndicator.style.color = "var(--yellow)";

  if (autoInject) await new Promise(function (resolve) {
    setTimeout(() => resolve(), 5000);
  });

  const command = new Command("cmd", ["/c", "start", "/b", "/wait", executable.name], { cwd: await appDirectory() });

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
    if (!connected && prevActive) exploitInject.classList.remove("disabled");
    exploitIndicator.style.color = `var(--${connected ? "green" : "text"})`;
    await killCheck();
  }

  function onData(line) {
    const text = line ? line.trim() : "";
    const errors = ["error:", "redownload", "create a ticket", "make a ticket", "cannot find user", "mismatch", "out of date", "failed to", "no active subscription"];

    if (errors.some((s) => text.toLowerCase().includes(s)) && !text.toLowerCase().endsWith(":")) {
      alert(`[Ro-Exec] ${text}`);
      done();
    } else {
      exploitInject.classList.add("disabled");
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

    if (text && connected) {
      await invoke("execute_script", { text });
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
    defaultPath: await path.join(await appDirectory(), "scripts"),
    filters: [
      {
        name: "Script",
        extensions: ["lua", "luau", "txt"]
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

  const tabName = getActiveTabName();
  const tabNameSplit = tabName.split(".");
  const extension = tabNameSplit.length > 1 ? tabNameSplit.pop() : null;

  const filters = [
    ...(extension ? [{
      name: "Current File",
      extensions: [extension]
    }] : []),
    {
      name: "Lua File",
      extensions: ["lua"]
    },
    {
      name: "LuaU File",
      extensions: ["luau"]
    },
    {
      name: "Text File",
      extensions: ["txt"]
    }
  ];

  const selected = await dialog.save({
    title: "Export Script",
    defaultPath: await path.join(await appDirectory(), "scripts", tabName),
    filters
  });

  if (selected) {
    const text = editorGetText() || "";
    await writeFile(selected, text, true);

    const currentTab = tabs.find((t) => t.active === true);

    if (currentTab && !tabs.find((t) => t.path === selected)) {
      unsavedTabData.delete(currentTab.id);
      await deleteTab(currentTab.id, true);
      tabs = tabs.map(function (t) {
        if (t.active && !t.path) return {
          path: selected,
          order: currentTab.order,
          active: true,
          scroll: currentTab.scroll
        }
        else return t;
      });
      await setTabs();
      populateTabs();
    }

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

async function openFolder() {
  try {
    await open(await path.join(await appDirectory(), "scripts"));
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
        { token: "string", foreground: "adf195" }
      ],
      colors: {
        "editor.background": "#191c29",
        "editor.foreground": "#c6cff3",
        "list.hoverBackground": "#2f354e",
        "editor.selectionBackground": "#282d42",
        "editorSuggestWidget.background": "#282d42",
        "editorSuggestWidget.selectedBackground": "#2f354e",
        "editorSuggestWidget.highlightForeground": "#c6cff3",
        "editorSuggestWidget.border": "#2f354e",
        "editorOverviewRuler.border": "#2f354e",
        "editor.lineHighlightBackground": "#1d2130",
        "editorCursor.foreground": "#c6cff3",
        "editor.selectionHighlightBorder": "#282d42",
        "editorGutter.background": "#171a26"
      }
    });

    editor = monaco.editor.create(exploitEditor, {
      language: "lua",
      theme: "dark",
      value: await getActiveTabContent(),
      fontFamily: "Fira Code",
      fontSize: 12,
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

    editor.onDidChangeModelContent(function () {
      updateIntelliSense();
      setActiveTabContent(editorGetText());
    });

    editor.onDidScrollChange(function (e) {
      setActiveTabScroll(e.scrollTop);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function () {
      const activeTab = tabs.find((t) => t.active === true);
      if (activeTab) saveTabContent(activeTab);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_R, function () {
      const activeTab = tabs.find((t) => t.active === true);
      if (activeTab) revertTabContent(activeTab);
    });

    editor.addCommand(monaco.KeyCode.Home, () => null);
    updateIntelliSense();
  });
}

async function checkRobloxActive() {
  const newActive = await isRobloxRunning();
  
  if (prevActive !== newActive) {
    prevActive = newActive;
    
    if (newActive) {
      if (!connected && injecting !== true) {
        if (settings.autoInject && await findExecutable()) inject(true);
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
    if (
      e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r") ||
      e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.metaKey && e.key === "f") ||
      e.key === "F7" ||
      (e.ctrlKey && e.key === "k") || (e.metaKey && e.key === "k")
    ) {
      e.preventDefault();
    }
  });

  // Set-up
  version = await getVersion();
  dataDirectory = await getData();
  unsavedTabData = await getUnsavedTabData();
  await createDirectory("");
  await createDirectory(dataDirectory);
  await createDirectory("scripts");
  await createDirectory("autoexec");
  setupEditor();

  // Version
  const versionElem = document.querySelector(".kr-titlebar .version");
  if (version && versionElem) versionElem.textContent = `(${version})`; 

  // Events
  event.listen("update", function (e) {
    const _connected = e.payload?.message || false;
    
    if (connected === _connected) return;
    else connected = _connected;

    exploitIndicator.style.color = `var(--${connected ? "green" : "text"})`;

    if (connected) {
      exploitExecute.classList.remove("disabled");
      exploitInject.classList.add("disabled");
    } else {
      if (!prevActive) exploitInject.classList.remove("disabled");
      exploitExecute.classList.add("disabled");
    }
  });

  event.listen("exit", async function () {
    await exit();
  });

  event.listen("toggle", async function () {
    await toggle(true);
  });

  // Set-up Websocket
  wsPort = 54349;

  await injectAutoExec();
  await invoke("init_websocket", { port: wsPort });

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

  // Exploit
  exploitIndicator = document.querySelector(".kr-titlebar .brand .text");
  exploitTabs = document.querySelector(".exploit .main .container .tabs .list");
  exploitEditor = document.querySelector(".exploit .main .container .editor");
  exploitScripts = document.querySelector(".exploit .main .container-2 .scripts");
  exploitScriptsSearch = document.querySelector(".exploit .main .container-2 .kr-input.search");
  exploitScriptsFolder = document.querySelector(".kr-folder");

  exploitTabs.addEventListener("wheel", function (e) {
    e.preventDefault();
    exploitTabs.scrollLeft += (e.deltaY / 2);
  });

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
  exploitExecute.addEventListener("click", execute);
  exploitImport.addEventListener("click", _import);
  exploitExport.addEventListener("click", _export);
  exploitClear.addEventListener("click", clear);
  exploitKill.addEventListener("click", kill);
  exploitScriptsFolder.addEventListener("click", openFolder);

  // Inject
  exploitInject.addEventListener("click", () => inject());
  document.querySelector(".kr-dropdown-select-loader").addEventListener("click", () => askForExecutable(true));
  document.querySelector(".kr-dropdown-delete-loader").addEventListener("click", clearExecutables);

  // Auto Inject
  function checkAutoInject() {
    document.querySelector(".kr-dropdown-auto-inject .fa-solid").className = `fa-solid fa-${settings.autoInject ? "check" : "times"}`;
  }

  checkAutoInject();
  document.querySelector(".kr-dropdown-auto-inject").addEventListener("click", async function () {
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
    if (key === "home") toggle();
  });

  window.addEventListener("keyup", function (e) {
    const key = (e?.key || "")?.toLowerCase();
    if (key === "home") toggle();
  });

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

  // Roblox Checks
  checkRobloxActive();
  setInterval(checkRobloxActive, 1000);

  // Show
  show();
});