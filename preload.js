'use strict';
const {contextBridge,ipcRenderer}=require('electron');
function subscribe(channel,callback){
  if(typeof callback!=='function')return ()=>{};
  const listener=(_e,payload)=>callback(payload);
  ipcRenderer.on(channel,listener);
  return ()=>ipcRenderer.removeListener(channel,listener);
}
contextBridge.exposeInMainWorld('desktop',{
  appName:'Nghịch Thiên Tu Luyện',version:'2.2.1',platform:process.platform,
});
contextBridge.exposeInMainWorld('desktopStorage',{
  readAll:()=>ipcRenderer.invoke('storage:read-all'),
  setItem:(key,value)=>ipcRenderer.invoke('storage:set-item',key,value),
  backup:()=>ipcRenderer.invoke('storage:backup'),
  listBackups:()=>ipcRenderer.invoke('storage:list-backups'),
  restoreBackup:name=>ipcRenderer.invoke('storage:restore-backup',name),
});
contextBridge.exposeInMainWorld('desktopTikTok',{
  connect:(username,options={})=>ipcRenderer.invoke('tiktok:connect',username,options),
  disconnect:()=>ipcRenderer.invoke('tiktok:disconnect'),
  getState:()=>ipcRenderer.invoke('tiktok:state'),
  onEvent:callback=>subscribe('tiktok:event',callback),
});
contextBridge.exposeInMainWorld('liveOutputBridge',{
  open:()=>ipcRenderer.invoke('live-output:open'),
  close:()=>ipcRenderer.invoke('live-output:close'),
  getState:()=>ipcRenderer.invoke('live-output:state'),
  sendSignal:packet=>ipcRenderer.send('live-output:signal',packet),
  sendFrame:packet=>ipcRenderer.send('live-output:frame',packet),
  onStart:callback=>subscribe('live-output:start',callback),
  onSignal:callback=>subscribe('live-output:signal',callback),
  onClosed:callback=>subscribe('live-output:closed',callback),
});

contextBridge.exposeInMainWorld('desktopAudio',{
  chooseMusic:()=>ipcRenderer.invoke('audio:choose-music'),
  chooseVoiceModel:()=>ipcRenderer.invoke('audio:choose-model'),
  choosePiper:()=>ipcRenderer.invoke('audio:choose-engine'),
  synthesize:payload=>ipcRenderer.invoke('audio:tts',payload),
});
