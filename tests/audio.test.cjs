'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {supportedMusic,importMusicFile,inspectVoiceModel,inspectPiperExecutable,cleanText,renderPiper}=require('../audio-service.cjs');

async function withTemp(fn){const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'nghich-audio-test-'));try{return await fn(dir);}finally{await fsp.rm(dir,{force:true,recursive:true});}}
test('V2.2.1: Kiểm tra định dạng nhạc ngoài, không nhận file không hợp lệ',()=>{
 assert.equal(supportedMusic('Nền Tiên Hiệp.MP3'),true);
 assert.equal(supportedMusic('music.wav'),true);
 assert.equal(supportedMusic('music.flac'),true);
 assert.equal(supportedMusic('music.exe'),false);
 assert.equal(supportedMusic('music.mp3.exe'),false);
});
test('V2.2.1: Nhập nhạc ngoại vi vào thư mục userData, giữ file nguồn và tạo file URL',async()=>withTemp(async dir=>{
 const source=path.join(dir,'nhac nền.mP3'),userData=path.join(dir,'app user');
 await fsp.writeFile(source,Buffer.from('ID3\0test'));
 const result=await importMusicFile(source,userData);
 assert.equal(result.name,'nhac nền.mP3');
 assert.ok(result.path.startsWith(userData));
 assert.equal(result.url,pathToFileURL(result.path).href);
 assert.deepEqual(await fsp.readFile(result.path),await fsp.readFile(source));
 assert.ok(fs.existsSync(source));
}));
test('V2.2.1: Nhập nhạc từ chối tệp trống hoặc sai phần mở rộng',async()=>withTemp(async dir=>{
 const source=path.join(dir,'empty.wav');await fsp.writeFile(source,'');
 await assert.rejects(importMusicFile(source,dir),/nhỏ hơn 200 MB/);
 await assert.rejects(importMusicFile(path.join(dir,'unsafe.bat'),dir),/Chỉ nhận/);
}));
test('V2.2.1: Giọng AI Piper phải có .onnx và .onnx.json tương ứng',async()=>withTemp(async dir=>{
 const model=path.join(dir,'vi-VN.onnx');await fsp.writeFile(model,'model');
 await assert.rejects(inspectVoiceModel(model),/Thiếu file/);
 await fsp.writeFile(model+'.json',JSON.stringify({language:{code:'vi_VN'}}));
 const info=await inspectVoiceModel(model);
 assert.equal(info.language,'vi_VN');assert.equal(info.name,'vi-VN.onnx');
 await assert.rejects(inspectVoiceModel(path.join(dir,'voice.mp3')),/\.onnx/);
}));
test('V2.2.1: Lọc URL và dấu HTML trong câu TTS',()=>{
 assert.equal(cleanText('  Chào <b> https://example.com/hãy-xóa  bạn  '),'Chào b bạn');
 assert.equal(cleanText('a'.repeat(500)).length,220);
});
test('V2.2.1: Piper nhận câu nói, xuất WAV base64; ứng dụng không gọi shell', {skip:process.platform==='win32'}, async()=>withTemp(async dir=>{
 const model=path.join(dir,'voice.onnx');await fsp.writeFile(model,'model');
 await fsp.writeFile(model+'.json',JSON.stringify({language:{code:'vi_VN'}}));
 const engine=path.join(dir,'fake-piper');
 const source=`#!${process.execPath}\nconst fs=require('fs');const argv=process.argv.slice(2);const out=argv[argv.indexOf('--output_file')+1];const b=Buffer.alloc(44);b.write('RIFF',0);b.writeUInt32LE(36,4);b.write('WAVE',8);fs.writeFileSync(out,b);process.stdin.resume();`;
 await fsp.writeFile(engine,source,{mode:0o755});
 assert.ok((await inspectPiperExecutable(engine)).name==='fake-piper');
 const result=await renderPiper({executable:engine,modelPath:model,text:'Xin chào, đạo hữu!',rate:1.2,timeoutMs:8000});
 assert.ok(result.startsWith('data:audio/wav;base64,'));
 const wav=Buffer.from(result.split(',')[1],'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');
}));
