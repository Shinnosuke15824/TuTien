'use strict';
const {contextBridge,ipcRenderer}=require('electron');
function subscribe(channel,callback){
  if(typeof callback!=='function')return ()=>{};
  const listener=(_e,payload)=>callback(payload);
  ipcRenderer.on(channel,listener);
  return ()=>ipcRenderer.removeListener(channel,listener);
}
// Cửa sổ phát không thể thêm người, gửi quà Demo, điều khiển âm thanh hay kết nối TikTok.
contextBridge.exposeInMainWorld('liveOutputReceiver',{
  ready:()=>ipcRenderer.send('live-output:ready'),
  sendSignal:packet=>ipcRenderer.send('live-output:signal',packet),
  onStart:callback=>subscribe('live-output:start',callback),
  onSignal:callback=>subscribe('live-output:signal',callback),
  onFrame:callback=>subscribe('live-output:frame',callback),
});
