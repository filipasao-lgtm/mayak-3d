const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  nodeName: process.platform,
});
