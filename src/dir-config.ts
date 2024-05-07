const dirPaths = {
  settingsDir: "settings",
  autoExecDir: "autoexec",
  scriptsDir: "scripts",
};

const filePaths = {
  tabs: `${dirPaths.settingsDir}/tabs.json`,
  settings: `${dirPaths.settingsDir}/settings.json`,
  dimensions: `${dirPaths.settingsDir}/dimensions.json`,
  logFile: `${dirPaths.settingsDir}/log.txt`,
  krampuiWebsocketCode: `${dirPaths.autoExecDir}/__KrampUI`,
};

export { dirPaths, filePaths };
