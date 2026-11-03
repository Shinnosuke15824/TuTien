'use strict';
const {app,BrowserWindow,ipcMain,dialog} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const {PersistentStore} = require('./persistent-store.cjs');
const {TikTokService} = require('./tiktok-service.cjs');
const {importMusicFile,inspectVoiceModel,inspectPiperExecutable,renderPiper} = require('./audio-service.cjs');
// Dùng thư mục userData RIÊNG, không ảnh hưởng dự án Chánh Điện An Lạc.
// Tuyệt đối không ghi dữ liệu vào thư mục cài đặt .exe hoặc app.asar.
const legacyDataPath = path.join(app.getPath('appData'), 'nghich-thien-tu-luyen-studio');
fs.mkdirSync(legacyDataPath, {recursive:true});
app.setPath('userData', legacyDataPath);
const persistentStore = new PersistentStore(app.getPath('userData'));
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();
app.on('second-instance',()=>{
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();mainWindow.focus();
  }
});
let mainWindow = null;
let liveOutputWindow = null;
let outputSession = 0;

function studioIsReady(){return Boolean(mainWindow&&!mainWindow.isDestroyed()&&!mainWindow.webContents.isDestroyed());}
function outputIsReady(){return Boolean(liveOutputWindow&&!liveOutputWindow.isDestroyed()&&!liveOutputWindow.webContents.isDestroyed());}
function sendStudio(channel,payload){if(studioIsReady())mainWindow.webContents.send(channel,payload);}
function sendOutput(channel,payload){if(outputIsReady())liveOutputWindow.webContents.send(channel,payload);}

// TikTok kết nối 1 lần duy nhất; hệ thống gameplay không dùng quà tặng.
const service=new TikTokService(event=>{
  if(studioIsReady())mainWindow.webContents.send('tiktok:event',event);
});
function authorized(event){
  if(!studioIsReady()||event.sender!==mainWindow.webContents)
    throw Error('Chỉ cửa sổ quản lý mới có quyền điều khiển ứng dụng.');
}
function createWindow(){
  mainWindow=new BrowserWindow({
    width:1380,height:900,minWidth:980,minHeight:650,
    title:'Nghịch Thiên Tu Luyện — Studio V2.2.1',backgroundColor:'#0b1020',autoHideMenuBar:true,
    icon:path.join(__dirname,'build','icon.ico'),
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('closed',()=>{mainWindow=null;if(outputIsReady())liveOutputWindow.close();});
}
function startOutputPairing(){
  if(!studioIsReady()||!outputIsReady())return;
  outputSession += 1;
  // Đánh thức người nhận trước để tránh mất gói offer đầu tiên.
  sendOutput('live-output:start',{sessionId:outputSession});
  sendStudio('live-output:start',{sessionId:outputSession});
}
function createLiveOutput(){
  if(outputIsReady()){
    liveOutputWindow.show();liveOutputWindow.focus();
    return {opened:true,alreadyOpen:true};
  }
  liveOutputWindow=new BrowserWindow({
    width:450,height:800,useContentSize:true,minWidth:315,minHeight:560,
    maximizable:false,fullscreenable:false,
    title:'Nghịch Thiên Tu Luyện — LIVE 9:16',
    backgroundColor:'#000000',autoHideMenuBar:true,show:false,
    icon:path.join(__dirname,'build','icon.ico'),
    webPreferences:{preload:path.join(__dirname,'live-output-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}
  });
  liveOutputWindow.setAspectRatio(9/16);
  liveOutputWindow.on('closed',()=>{
    liveOutputWindow=null;
    outputSession+=1;
    sendStudio('live-output:closed',{reason:'closed'});
  });
  liveOutputWindow.once('ready-to-show',()=>{
    if(outputIsReady())liveOutputWindow.show();
  });
  liveOutputWindow.loadFile('live-output.html');
  return {opened:true,alreadyOpen:false};
}


// Thư mục %APPDATA% lưu trạng thái người ngồi, công đức, cấu hình âm thanh và LIVE.
// Chỉ cửa sổ quản lý có quyền đọc/ghi; cửa sổ phát 9:16 không được truy cập.
ipcMain.handle('storage:read-all',event=>{authorized(event);return persistentStore.readAll();});
ipcMain.handle('storage:set-item',(event,key,value)=>{authorized(event);return persistentStore.setItem(key,value);});
ipcMain.handle('storage:backup',event=>{authorized(event);return persistentStore.backupNow();});
ipcMain.handle('storage:list-backups',event=>{authorized(event);return persistentStore.listBackups();});
ipcMain.handle('storage:restore-backup',(event,name)=>{authorized(event);return persistentStore.restoreBackup(name);});

// Chỉ cửa sổ Studio được mở hộp thoại và yêu cầu tổng hợp giọng; cửa sổ LIVE không thể.
ipcMain.handle('audio:choose-music',async event=>{
  authorized(event);
  const result=await dialog.showOpenDialog(mainWindow,{title:'Chọn nhạc nền đã tải về',properties:['openFile'],filters:[{name:'Nhạc MP3 / WAV / OGG / M4A / FLAC',extensions:['mp3','wav','ogg','m4a','flac']}]});
  if(result.canceled||!result.filePaths?.length)return null;
  return importMusicFile(result.filePaths[0],app.getPath('userData'));
});
ipcMain.handle('audio:choose-model',async event=>{
  authorized(event);
  const result=await dialog.showOpenDialog(mainWindow,{title:'Chọn giọng Piper (.onnx, cần file .onnx.json bên cạnh)',properties:['openFile'],filters:[{name:'Piper ONNX',extensions:['onnx']}]});
  if(result.canceled||!result.filePaths?.length)return null;
  return inspectVoiceModel(result.filePaths[0]);
});
ipcMain.handle('audio:choose-engine',async event=>{
  authorized(event);
  const result=await dialog.showOpenDialog(mainWindow,{title:'Chọn piper.exe đã tải về',properties:['openFile'],filters:[{name:'Piper chương trình',extensions:process.platform==='win32'?['exe']:['*']}]});
  if(result.canceled||!result.filePaths?.length)return null;
  return inspectPiperExecutable(result.filePaths[0]);
});
ipcMain.handle('audio:tts',async(event,payload)=>{
  authorized(event);
  if(!payload||typeof payload!=='object')throw Error('Dữ liệu giọng không hợp lệ.');
  return renderPiper({executable:String(payload.engine||''),modelPath:String(payload.model||''),text:String(payload.text||''),rate:payload.rate});
});

ipcMain.handle('tiktok:connect',async(event,input,options)=>{
  authorized(event);
  if(typeof input!=='string'||input.length>180)throw Error('Username không hợp lệ');
  return service.connect(input,{
    roomId:typeof options?.roomId==='string'?options.roomId.slice(0,32):'',
    autoReconnect:options?.autoReconnect!==false,
  });
});
ipcMain.handle('tiktok:disconnect',async(event)=>{authorized(event);return service.disconnect();});
ipcMain.handle('tiktok:state',async(event)=>{authorized(event);return service.getState();});

ipcMain.handle('live-output:open',(event)=>{authorized(event);return createLiveOutput();});
ipcMain.handle('live-output:close',(event)=>{
  authorized(event);
  if(outputIsReady())liveOutputWindow.close();
  return {opened:false};
});
ipcMain.handle('live-output:state',(event)=>{
  authorized(event);
  return {opened:outputIsReady(),sessionId:outputSession};
});
// Dự phòng WebRTC: truyền JPEG nội bộ tối đa 10 FPS. Không sử dụng Internet.
ipcMain.on('live-output:frame',(event,packet)=>{
  if(!studioIsReady()||event.sender!==mainWindow.webContents||!outputIsReady())return;
  if(!packet||packet.sessionId!==outputSession||typeof packet.image!=='string')return;
  if(packet.image.length>750_000||!packet.image.startsWith('data:image/jpeg;base64,'))return;
  sendOutput('live-output:frame',packet);
});
ipcMain.on('live-output:ready',event=>{
  if(!outputIsReady()||event.sender!==liveOutputWindow.webContents)return;
  startOutputPairing();
});
// Signaling WebRTC chỉ giữa hai cửa sổ nội bộ. Không mở cổng mạng hay máy chủ web.
ipcMain.on('live-output:signal',(event,packet)=>{
  const fromStudio=studioIsReady()&&event.sender===mainWindow.webContents;
  const fromOutput=outputIsReady()&&event.sender===liveOutputWindow.webContents;
  if(!fromStudio&&!fromOutput)return;
  if(!packet||typeof packet!=='object'||packet.sessionId!==outputSession)return;
  if(!['offer','answer','ice'].includes(packet.type))return;
  if(JSON.stringify(packet).length>64_000)return;
  if(packet.type==='ice'){
    if(!packet.candidate||typeof packet.candidate.candidate!=='string')return;
  } else if(!packet.description||typeof packet.description.sdp!=='string'||packet.description.type!==packet.type){return;}
  if(fromStudio)sendOutput('live-output:signal',packet);
  else sendStudio('live-output:signal',packet);
});

app.whenReady().then(()=>{
  if (!hasSingleInstanceLock) return;
  if(process.platform==='win32')app.setAppUserModelId('vn.nghichthien.tuluyen.studio');
  createWindow();
  app.on('activate',()=>{if(!studioIsReady())createWindow();});
});
app.on('before-quit',()=>{
  try{persistentStore.flush();}catch(error){console.error('Lỗi lưu dữ liệu lúc thoát:',error);}
  void service.disconnect({quiet:true});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
