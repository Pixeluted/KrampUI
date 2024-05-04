const dirPaths = {
  settingsDir: "settings",
  autoExecDir: "autoexec",
  scriptsDir: "scripts",
};

const filePaths = {
  loader: "krampus-loader.exe",
  tabs: `${dirPaths.settingsDir}/tabs.json`,
  settings: `${dirPaths.settingsDir}/settings.json`,
  dimensions: `${dirPaths.settingsDir}/dimensions.json`,
  krampuiWebsocketCode: `${dirPaths.autoExecDir}/__KrampUI`,
};

export { dirPaths, filePaths };
