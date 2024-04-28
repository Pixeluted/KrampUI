const dirPaths = {
  settingsDir: "settings",
  autoExecDir: "autoexec",
};

const filePaths = {
  loader: "krampus-loader.exe",
  tabs: `${dirPaths.settingsDir}/tabs.json`,
  settings: `${dirPaths.settingsDir}/settings.json`,
  krampuiWebsocketCode: `${dirPaths.autoExecDir}/__KrampUI`,
};

export { dirPaths, filePaths };
