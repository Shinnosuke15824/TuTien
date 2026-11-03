'use strict';
// Âm thanh nội bộ V2.2.1: nhập nhạc vào userData và kết nối mô hình Piper TTS ngoại tuyến.
// Không dùng shell, không gọi dịch vụ mạng. Mọi file âm thanh đều do chủ máy chủ động chọn.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {randomBytes} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {spawn} = require('node:child_process');

const MUSIC_EXTENSIONS = Object.freeze(['.mp3','.wav','.ogg','.m4a','.flac']);
function supportedMusic(file){return MUSIC_EXTENSIONS.includes(path.extname(String(file||'')).toLowerCase());}
function safeFileLabel(file){return path.basename(String(file||'')).replace(/[\u0000-\u001f]/g,'').slice(0,110);}
async function importMusicFile(source, userData){
  if(!supportedMusic(source))throw Error('Chỉ nhận MP3, WAV, OGG, M4A hoặc FLAC.');
  const st=await fsp.stat(source);
  if(!st.isFile()||st.size===0||st.size>200*1024*1024)throw Error('File nhạc phải có dữ liệu và nhỏ hơn 200 MB.');
  const dir=path.join(userData,'imported-music');
  await fsp.mkdir(dir,{recursive:true});
  const target=path.join(dir,`${Date.now()}-${randomBytes(5).toString('hex')}${path.extname(source).toLowerCase()}`);
  await fsp.copyFile(source,target,fs.constants.COPYFILE_EXCL);
  return {path:target,url:pathToFileURL(target).href,name:safeFileLabel(source)};
}
async function inspectVoiceModel(modelPath){
  if(!modelPath||path.extname(modelPath).toLowerCase()!=='.onnx')throw Error('Giọng Piper phải là file .onnx.');
  const cfg=modelPath+'.json';
  const [model,config]=await Promise.all([fsp.stat(modelPath),fsp.stat(cfg)]).catch(()=>{
    throw Error('Thiếu file giọng .onnx hoặc .onnx.json cùng thư mục. Hãy tải đủ cả hai file.');
  });
  if(!model.isFile()||!config.isFile()||model.size===0||model.size>700*1024*1024||config.size>4*1024*1024)
    throw Error('Tệp giọng Piper không hợp lệ hoặc quá lớn.');
  let label='';
  try{const parsed=JSON.parse(await fsp.readFile(cfg,'utf8'));label=String(parsed.language?.name_english||parsed.language?.code||'').slice(0,80);}catch(_){throw Error('File cấu hình .onnx.json không phải JSON hợp lệ.');}
  return {path:modelPath,name:safeFileLabel(modelPath),language:label};
}
async function inspectPiperExecutable(executable){
  const st=await fsp.stat(executable).catch(()=>{throw Error('Không tìm thấy chương trình Piper. Chọn lại piper.exe.');});
  if(!st.isFile())throw Error('Đường dẫn Piper không phải tệp.');
  if(process.platform==='win32'&&path.extname(executable).toLowerCase()!=='.exe')throw Error('Trên Windows phải chọn piper.exe.');
  return {path:executable,name:safeFileLabel(executable)};
}
function cleanText(value){return String(value||'').replace(/https?:\/\/\S+/gi,'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,220);}
async function renderPiper({executable,modelPath,text,rate=1,timeoutMs=25000}){
  const spoken=cleanText(text);
  if(!spoken)throw Error('Không có nội dung để đọc.');
  await Promise.all([inspectVoiceModel(modelPath),inspectPiperExecutable(executable)]);
  const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'nghichthien-tts-'));
  const wav=path.join(dir,'speech.wav');
  try{
    await new Promise((resolve,reject)=>{
      let done=false,errors='';
      const child=spawn(executable,['--model',modelPath,'--length_scale',(1/Math.max(.7,Math.min(1.4,Number(rate)||1))).toFixed(2),'--output_file',wav],{
        windowsHide:true,shell:false,cwd:path.dirname(executable),stdio:['pipe','ignore','pipe']
      });
      const close=(error)=>{if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve();};
      const timer=setTimeout(()=>{child.kill();close(Error('Piper phản hồi quá lâu (25 giây). Kiểm tra model và tốc độ máy.'));},timeoutMs);
      child.on('error',e=>close(Error('Không chạy được Piper: '+e.message)));
      child.stderr.on('data',chunk=>{errors=(errors+String(chunk)).slice(-1800);});
      child.on('close',code=>{
        if(code!==0)close(Error('Piper lỗi (mã '+code+'): '+errors.slice(-300)));
        else close();
      });
      child.stdin.on('error',()=>{});
      child.stdin.end(spoken+'\n');
    });
    const st=await fsp.stat(wav).catch(()=>{throw Error('Piper không tạo được file WAV.');});
    if(st.size<44||st.size>16*1024*1024)throw Error('Tệp giọng Piper trống hoặc quá lớn.');
    const buf=await fsp.readFile(wav);
    if(buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WAVE')throw Error('Piper không xuất ra WAV chuẩn.');
    return 'data:audio/wav;base64,'+buf.toString('base64');
  }finally{await fsp.rm(dir,{recursive:true,force:true}).catch(()=>{});}
}
module.exports={MUSIC_EXTENSIONS,supportedMusic,safeFileLabel,importMusicFile,inspectVoiceModel,inspectPiperExecutable,cleanText,renderPiper};
