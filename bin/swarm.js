#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const dvalue = require('dvalue');
const packageInfo = require('../package.json');

const TrackerServer = { host: 'swarm.tw', port: 80 };
var randomName = function () {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < 5; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};
var registname, subdomain;

var gui = true;
var electron, app, Menu, Tray, BrowserWindow, ipcMain,dialog;
try {
  electron = require('electron');
  app = electron.app;
  Menu = electron.Menu;
  Tray = electron.Tray;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  dialog = electron.dialog;
} catch (e) {
  gui = false;
}

var DB = require('tingodb')().Db;
var db;
var UUID, config, folders;

var mainWindow = null;
var trayWindow = null;
var appIcon = null;

var initWin, initTrayIcon, initComm, start, hide, show, reload, startBot, close;
var initialFolder, initialLogger, checkOpen, loadConfig, assignDomain;
var homepath, upload, logs, dataset, tmp;
var infoPath, exceptionPath, threatPath, logger;
var pathPID, oldPID, PID;
var botFolder, files, bots, getBot;

// initial folder
initialFolder = function () {
  homepath = path.join(process.env.HOME || process.env.USERPROFILE, packageInfo.name);
  upload = path.join(homepath, "uploads/");
  logs = path.join(homepath, "logs/");
  dataset = path.join(homepath, "dataset/");
  tmp = path.join(homepath, "tmp/");
  folders = {
    home: homepath,
    upload: upload,
    logs: logs,
    dataset: dataset,
    tmp: tmp
  };
  if (!fs.existsSync(homepath)) { fs.mkdirSync(homepath); }
  if (!fs.existsSync(upload)) { fs.mkdirSync(upload); }
  if (!fs.existsSync(logs)) { fs.mkdirSync(logs); }
  if (!fs.existsSync(dataset)) { fs.mkdirSync(dataset); }
  if (!fs.existsSync(tmp)) { fs.mkdirSync(tmp); }
};

// initial logger
initialLogger = function () {
  infoPath = path.join(logs, 'info.log');
  exceptionPath = path.join(logs, 'exception.log');
  threatPath = path.join(logs, 'threat.log');
  log4js.configure({
    "appenders": [
      { "type": "console" },
      { "type": "file", "filename": infoPath, "category": "info", "maxLogSize": 10485760, "backups": 365 },
      { "type": "file", "filename": exceptionPath, "category": "exception", "maxLogSize": 10485760, "backups": 10 },
      { "type": "file", "filename": threatPath, "category": "threat", "maxLogSize": 10485760, "backups": 10 }
    ],
    "replaceConsole": true
  });
  logger = {
    info: log4js.getLogger('info'),
    exception: log4js.getLogger('exception'),
    threat: log4js.getLogger('threat')
  };
};

// check is open?
checkOpen = function () {
  pathPID = path.join(homepath, 'PID');
  oldPID;

  try {
    oldPID = parseInt(fs.readFileSync(pathPID));
    if(process.kill(oldPID, 0)) {
      process.exit();
    }
  }
  catch(e) {}

  // create PID file
  PID = process.pid;
  fs.writeFile(pathPID, PID, function(err) {});
};

// load config
loadConfig = function () {
  // create UUID file if not exist
  var UUID = dvalue.guid();
  var pathUUID = path.join(homepath, 'UUID');
  if(!fs.existsSync(pathUUID)) {
    fs.writeFile(pathUUID, UUID, function(err) {});
  }
  else {
    UUID = fs.readFileSync(pathUUID).toString();
  }

  config = {
    UUID: UUID,
    server: TrackerServer,
    path: folders,
    logger: logger,
    package: {
      name: packageInfo.name,
      version: packageInfo.version
    },
    powerby: packageInfo.name + " v" + packageInfo.version
  };

  //--
  registname = UUID.substr(0, 4);
  subdomain = [registname, TrackerServer.host].join(".");
};

// assignDomain
assignDomain = function (name) {
  var executor = getBot('Register');
  var fullname = [name, TrackerServer.host].join(".");
  executor.assignDomain(name, TrackerServer, function (e, d) {
    if(e) { logger.exception.info(e); }
    if(d && d.result) { logger.info.info('Access URL:', fullname); }
  });
};

// start all bot
startBot = function () {
  botFolder = path.join(__dirname, "../bots");
  files = fs.readdirSync(botFolder);
  bots = [];
  getBot = function (name) {
    var rs;
    for(var i in bots) {
      if(bots[i].name.toLowerCase() == name.toLowerCase()) { return bots[i]; }
    }
  };

  db = new DB(dataset, {});

  var sub = "js";
  var reg = new RegExp('\.' + sub + '$');
  for(var key in files) {
    if(reg.test(files[key]) && files[key].indexOf("_") == -1) {
      var Bot = require(path.join(botFolder, files[key]));
      var bot = new Bot(config);
      bots.push(bot);
      bot.name = files[key].split('.' + sub)[0];
      bot.db = db;
      bot.getBot = getBot;
    }
  }

  bots.map(function (b) {
    b.start();
  });
};

// initial and load windows
initWin = function () {
  var size = electron.screen.getPrimaryDisplay().workAreaSize;
  var trayPosition;
  if(/darwin/.test(process.platform)) {
    trayPosition = {x: (size.width - 500), y: 20};
  }
  else {
    trayPosition = {x: (size.width - 500), y: size.height - 150};
  }
  mainWindow = new BrowserWindow({frame: false, transparent: true});
  mainWindow.loadURL('file://' + __dirname + '/../index.html');
};

// initial communication
initComm = function () {
  ipcMain.on('tray', function(ev, cmd, data) {
    switch(cmd) {
      case 'assign':
        assignDomain(data.domain);
        break;
      case 'hide':
        break;
      case 'close':
        break;
      default:
    }
  });

  ipcMain.once('index', function(ev, cmd, data) {
    switch(cmd) {
      case 'finish':
        start();
        break;
      default:
    }
  });
};

initTrayIcon = function () {
  appIcon = new Tray(path.join(__dirname, '/../icon.png'));
  appIcon.on('click', show);
  appIcon.on('double-click', show);
  appIcon.on('right-click', show);

  var contextMenu = Menu.buildFromTemplate([
    { label: '開啟', click: function () { show(); } },
    { label: '隱藏', click: function () { hide(); } },
    { label: '重新載入', click: function () { reload(); } },
    { label: subdomain },
    { type: 'separator' },
    { label: '結束', click: function () {
      dialog.showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['Yes', 'No'],
          title: 'Confirm',
          message: 'Are you sure you want to quit?'
      }, function (rs) {
        if(rs === 0) {
          close();
        }
        else {
          mainWindow.focus();
        }
      });
    }}
  ]);
  appIcon.setToolTip('Swarm Storage');
  appIcon.setContextMenu(contextMenu);
};

show = function () {};
hide = function () {};
reload = function () {};
start = function () {
  mainWindow.hide();
  initTrayIcon();
  assignDomain(registname);
};
close = function () {
  appIcon.destroy();
  mainWindow.destroy();
  app.quit();
};

if(gui) {
  app.on('ready', function () {
    initialFolder();
    initialLogger();
    checkOpen();
    loadConfig();

    initWin();
    startBot();
    initComm();
  });
}
else {
  initialFolder();
  initialLogger();
  checkOpen();
  loadConfig();
  startBot();
}
