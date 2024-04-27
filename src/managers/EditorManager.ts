import * as monaco from "monaco-editor";
import WindowManager, { type WindowState } from "./WindowManager";
import { TabsManager } from "./TabsManager";
import SettingsManager from "./SettingsManager";
import { get } from "svelte/store";

export default class EditorManager {
  public static editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private static alreadyCreated: boolean = false;
  private static editorProposals: any[] = [];
  private static dynamicEditorProposals: any[] = [];

  static getDependencyProposals(model: monaco.editor.ITextModel, position: monaco.Position): any {
    let editorProposals: any[] = this.editorProposals;
    let dynamicProposals: any[] = this.dynamicEditorProposals;
    const fullArray: { [key: string]: any }[] = [];

    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn
    };

    for (const proposal of editorProposals) {
      fullArray.push({
        ...proposal,
        range: range
      });
    }

    for (const proposal of dynamicProposals) {
      fullArray.push({
        ...proposal,
        range: range
      });
    }

    return fullArray;
  }

  static updateIntelliSense() {
    if (this.editor == null) return;
    this.dynamicEditorProposals = [];
    const editorContent = this.editor.getValue();

    let functionMatch;
    let variableMatch;

    const functionRegex = /(?:\blocal\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const variableRegex = /(?:\blocal\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;

    while ((functionMatch = functionRegex.exec(editorContent)) !== null) {
      this.dynamicEditorProposals.push({
        label: functionMatch[1],
        kind: monaco.languages.CompletionItemKind.Function,
        detail: "Function",
        insertText: functionMatch[1],
      });
    }

    while ((variableMatch = variableRegex.exec(editorContent)) !== null) {
      this.dynamicEditorProposals.push({
        label: variableMatch[1],
        kind: monaco.languages.CompletionItemKind.Variable,
        detail: "Variable",
        insertText: variableMatch[1],
      });
    }
  }

  static editorAddIntellisense(l: any, k: any, d: any, i: any) {
    let t;

    switch (k) {
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
    }

    this.editorProposals.push({
      label: l,
      kind: t,
      detail: d,
      insertText: i
    });
  }

  static async setupEditor(editorContainer: HTMLElement) {
    let currentWindowState: WindowState;
    WindowManager.currentState.subscribe(newValue => {
        currentWindowState = newValue
    });

    if (this.alreadyCreated === false) {
      monaco.languages.registerCompletionItemProvider("lua", {
        provideCompletionItems: function(model, position) {
          return {
            suggestions: EditorManager.getDependencyProposals(model, position)
          }
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
        ],
        colors: {
          "editor.background": "#191a1e",
          "editor.foreground": "#aaabad",
          "list.hoverBackground": "#2a2c32",
          "editor.selectionBackground": "#35373b",
          "editorSuggestWidget.background": "#35373b",
          "editorSuggestWidget.selectedBackground": "#2a2c32",
          "editorSuggestWidget.highlightForeground": "#aaabad",
          "editorSuggestWidget.border": "#2a2c32",
          "editorOverviewRuler.border": "#2a2c32",
          "editor.lineHighlightBackground": "#1d1e23",
          "editorCursor.foreground": "#aaabad",
          "editorGutter.background": "#17181c"
        },
      });
  
      let globalWords: string[] = [];
      let keyWords: string[] = [];
  
      for (const key of [
        "_G",
        "_VERSION",
        "Enum",
        "game",
        "plugin",
        "shared",
        "script",
        "workspace",
        "DebuggerManager",
        "elapsedTime",
        "LoadLibrary",
        "PluginManager",
        "settings",
        "tick",
        "time",
        "typeof",
        "UserSettings",
      ]) {
        this.editorAddIntellisense(key, "Variable", key, key);
        globalWords.push(key);
      }
  
      for (const key of [
        "and",
        "break",
        "do",
        "else",
        "elseif",
        "end",
        "false",
        "for",
        "function",
        "if",
        "in",
        "local",
        "nil",
        "not",
        "or",
        "repeat",
        "return",
        "then",
        "true",
        "until",
        "while",
        "continue"
      ]) {
        this.editorAddIntellisense(key, "Keyword", key, key);
        keyWords.push(key);
      }
  
      for (const key of [
        "math.abs",
        "math.acos",
        "math.asin",
        "math.atan",
        "math.atan2",
        "math.ceil",
        "math.cos",
        "math.cosh",
        "math.deg",
        "math.exp",
        "math.floor",
        "math.fmod",
        "math.frexp",
        "math.huge",
        "math.ldexp",
        "math.log",
        "math.max",
        "math.min",
        "math.modf",
        "math.pi",
        "math.pow",
        "math.rad",
        "math.random",
        "math.randomseed",
        "math.sin",
        "math.sinh",
        "math.sqrt",
        "math.tan",
        "math.tanh",
        "table.concat",
        "table.foreach",
        "table.foreachi",
        "table.sort",
        "table.insert",
        "table.remove",
        "Color3.new",
        "Instance.new",
        "BrickColor.new",
        "Vector3.new",
        "Vector2.new",
        "debug.gethook",
        "debug.getinfo",
        "debug.getlocal",
        "debug.getmetatable",
        "debug.getregistry",
        "debug.getupvalue",
        "debug.getuservalue",
        "debug.sethook",
        "debug.setlocal",
        "debug.setmetatable",
        "debug.setupvalue",
        "debug.setuservalue",
        "debug.traceback",
        "debug.upvalueid",
        "debug.upvaluejoin",
        "string.byte",
        "string.char",
        "string.dump",
        "string.find",
        "string.format",
        "string.gmatch",
        "string.gsub",
        "string.len",
        "string.lower",
        "string.match",
        "string.rep",
        "string.reverse",
        "string.sub",
        "string.upper",
        "coroutine.create",
        "coroutine.resume",
        "coroutine.running",
        "coroutine.status",
        "coroutine.wrap",
        "coroutine.yield",
        "hookmetamethod",
        "hookfunction",
        "getupvalues",
        "getconstants",
        "getsenv",
        "clonefunction",
        "cloneref",
        "fireproximityprompt",
        "firetouchinterest",
        "getconnections",
        "run_on_actor",
        "getactors",
        "getgc",
        "getrawmetatable",
        "setreadonly",
        "getgenv",
        "getloadedmodules",
        "getrenv",
        "getrunningscripts",
        "getscriptbytecode",
        "getscriptclosure",
        "getscripthash",
        "getscripts",
        "getthreadidentity",
        "setthreadidentity",
        "getnamecallmethod",
        "isreadonly",
        "setrawmetatable",
        "fireclickdetector",
        "getcallbackvalue",
        "getcustomasset",
        "gethiddenproperty",
        "gethui",
        "getinstances",
        "getnilinstances",
        "sethiddenproperty",
        "readfile",
        "listfiles",
        "writefile",
        "makefolder",
        "appendfile",
        "isfile",
        "isfolder",
        "delfile",
        "delfolder",
        "loadfile",
        "dofile",
        "invalidate",
        "iscached",
        "replace",
        "compareinstances",
        "task.wait"
      ]) {
        this.editorAddIntellisense(key, "Method", key, key);
        globalWords.push(key);
      }
  
      for (const key of [
        "Drawing",
        "debug",
        "Instance",
        "Color3",
        "Color3.fromRGB",
        "Color3.fromHSV",
        "Color3.fromHex",
        "Vector3",
        "Vector3.new",
        "Vector2",
        "Vector2.new",
        "BrickColor",
        "math",
        "table",
        "string",
        "coroutine",
        "Humanoid",
        "ClickDetector",
        "LocalScript",
        "Model",
        "ModuleScript",
        "Mouse",
        "Part",
        "Player",
        "Script",
        "Tool",
        "RunService",
        "UserInputService",
        "Workspace",
      ]) {
        this.editorAddIntellisense(key, "Class", key, key);
        globalWords.push(key);
      }
  
      for (const key of [
        "print",
        "warn",
        "wait",
        "info",
        "printidentity",
        "assert",
        "collectgarbage",
        "error",
        "getfenv",
        "getmetatable",
        "setmetatable",
        "ipairs",
        "loadfile",
        "loadstring",
        "newproxy",
        "next",
        "pairs",
        "pcall",
        "spawn",
        "task.spawn",
        "task.delay",
        "task.cancel",
        "task.defer",
        "rawequal",
        "rawget",
        "rawset",
        "select",
        "tonumber",
        "tostring",
        "type",
        "unpack",
        "xpcall",
        "delay",
        "stats",
        ":Remove()",
        ":BreakJoints()",
        ":GetChildren()",
        ":FindFirstChild()",
        ":FireServer()",
        ":InvokeServer()",
        ":ClearAllChildren()",
        ":Clone()",
        ":Destroy()",
        ":FindFirstAncestor()",
        ":FindFirstAncestorOfClass()",
        ":FindFirstAncestorWhichIsA()",
        ":FindFirstChildOfClass()",
        ":FindFirstChildWhichIsA()",
        ":GetDebugId()",
        ":GetDescendants()",
        ":GetFullName()",
        ":IsA()",
        ":GetPropertyChangedSignal()",
        ":IsAncestorOf()",
        ":IsDescendantOf()",
        ":WaitForChild()",
        ":Connect()",
        ":AncestryChanged()",
        ":Changed()",
        ":ChildAdded()",
        ":ChildRemoved()",
        ":DescendantAdded()",
        ":DescendantRemoving()",
        ":GetService()",
        ":GetObjects()",
        ":HttpGet()",
        ":Wait()",
      ]) {
        this.editorAddIntellisense(
          key,
          "Function",
          key,
          key.includes(":") ? key.substring(1, key.length) : key
        );
        globalWords.push(key)
      }
  
      for (const key of [
        "Visible",
        "Color",
        "Transparency",
        "Thickness",
        "From",
        "To",
        "Text",
        "Size",
        "Center",
        "Outline",
        "OutlineColor",
        "Position",
        "TextBounds",
        "Font",
        "Data",
        "Rounding",
        "NumSides",
        "Radius",
        "Filled",
        "PointA",
        "PointB",
        "PointC",
        "PointD",
      ]) {
        this.editorAddIntellisense(
          key,
          "Property",
          "Property for Drawing Library",
          key
        );
      }
  
      monaco.languages.setMonarchTokensProvider("lua", {
        tokenizer: {
          root: [
            [new RegExp(`\\b(${globalWords.join("|")})\\b(?!\\s*=)`, "g"), "global"],
            [new RegExp(`\\b(${keyWords.join("|")})\\b(?!\\s*=)`, "g"), "keyword"],
            [/"(?:\\.|[^\\"])*"|'(?:\\.|[^\\'])*'/gm, "string"],
            [/-?\b\d+(\.\d+)?(e[+-]?\d+)?\b/gi, "number"]
          ]
        }
      });

      SettingsManager.currentSettings.subscribe(newSettings => {
        if (this.editor === null) return;
        this.editor.updateOptions({
          fontSize: newSettings.editorFontSize
        });
      })

      this.alreadyCreated = true;
    }

    this.editor = monaco.editor.create(editorContainer, {
      language: "lua",
      theme: "dark",
      value: "real",
      fontFamily: "Fira Code",
      fontSize: get(SettingsManager.currentSettings).editorFontSize,
      acceptSuggestionOnEnter: "smart",
      suggestOnTriggerCharacters: true,
      suggestSelection: "recentlyUsed",
      folding: true,
      autoIndent: "keep",
      scrollBeyondLastLine: true,
      wordBasedSuggestions: "currentDocument",
      scrollbar: {
        verticalHasArrows: true,
      },
      minimap: {
        enabled: false,
      },
      showFoldingControls: "always",
      smoothScrolling: true,
      contextmenu: false,
      lineNumbersMinChars: 2,
      stickyScroll: {
        enabled: false
      }
    });

    this.setEditorScroll(TabsManager.getActiveTabScroll());

    window.onresize = function () {
      if (currentWindowState.currentWindow !== "Executor") return;
      EditorManager.editor?.layout();
    };

    setTimeout(() => {
        EditorManager.editor?.layout();
    }, 50)

    this.editor.onDidChangeModelContent(async function () {
      EditorManager.updateIntelliSense();
      TabsManager.updateActiveTabContent(EditorManager.getEditorText());
    });

    let scrollChangeDebaunce = false;
    this.editor.onDidScrollChange(function (e) {
      if (scrollChangeDebaunce) return;
      scrollChangeDebaunce = true;

      TabsManager.setActiveTabScroll(e.scrollTop);

      setTimeout(() => {
        scrollChangeDebaunce = false;
      }, 100);
    });

    this.editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {} //TabsManager.saveActiveTab()
    );

    this.editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR,
      () => {} //TabsManager.revertActiveTab()
    );

    this.editor.addCommand(monaco.KeyCode.Home, () => null);
    this.updateIntelliSense();
  }

  static getEditorText(): string {
    if (this.editor === null) return "";
    return this.editor.getValue();
  }

  static setEditorText(newText: string, preserveUndo: boolean = false) {
    if (this.editor === null) return;
    const model = this.editor.getModel() as monaco.editor.ITextModel;
    const range = model.getFullModelRange();

    if (preserveUndo) {
      this.editor.pushUndoStop();
      this.editor.executeEdits("", [{ range: range, text: newText }]);
    } else this.editor.setValue(newText);

    this.editor.setSelection({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    });
  }

  static setEditorScroll(scroll: number) {
    if (this.editor === null) return;
    this.editor.setScrollTop(scroll);
  }

  static focusEditor() {
    this.editor?.focus();
  }
}
