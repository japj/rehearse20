const { app, BrowserWindow } = require('electron');

function isDev() {
  return process.argv[2] == '--dev';
}

const createWindow = () => {
  if (isDev()) {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
  }

  const window = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#303030',
    webPreferences: {
      nodeIntegration: true,
    },
  });
  window.loadFile('index.html');
  if (isDev()) {
    window.webContents.openDevTools()
  }
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
