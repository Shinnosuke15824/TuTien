'use strict';
const fs=require('node:fs'),path=require('node:path');
const ALLOWED_KEYS=new Set(['nghich-thien-v2-game','nghich-thien-v2-settings']);
class PersistentStore{
  constructor(dir){this.dir=dir;this.file=path.join(dir,'nghichthien-data-v2.json');this.backupDir=path.join(dir,'backups');
    this.items={};this.pending=null;this.lastBackupAt=0;this.backupEveryMs=5*60000;
    try{this.items=this.parseData(fs.readFileSync(this.file,'utf8'));}
    catch(e){if(e.code!=='ENOENT')console.warn('Lỗi đọc dữ liệu chính:',e.message);
      // Nếu dữ liệu chính lỗi, thử bản sao lưu mới nhất có cấu trúc hợp lệ.
      for(const b of this.listBackups())try{this.items=this.parseData(fs.readFileSync(path.join(this.backupDir,b.name),'utf8'));break;}catch(_){}}
  }
  parseData(raw){const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Dữ liệu không hợp lệ');
    const clean={};for(const [k,v] of Object.entries(data))if(ALLOWED_KEYS.has(k)&&typeof v==='string')clean[k]=v;
    if(Object.keys(data).length&&!Object.keys(clean).length)throw Error('Không có khóa dữ liệu hợp lệ');
    return clean;}
  readAll(){return {...this.items};}
  setItem(key,value){if(!ALLOWED_KEYS.has(key)||typeof value!=='string'||value.length>2_000_000)throw Error('Dữ liệu không hợp lệ hoặc quá lớn.');
    this.items[key]=value;if(!this.pending)this.pending=setTimeout(()=>{this.pending=null;this.flush();},450);return {stored:true};}
  writeAtomic(){fs.mkdirSync(this.dir,{recursive:true});const t=this.file+'.tmp';fs.writeFileSync(t,JSON.stringify(this.items,null,2));fs.renameSync(t,this.file);}
  listBackups(){try{return fs.readdirSync(this.backupDir).filter(x=>/^backup-\d{13}\.json$/.test(x))
    .map(name=>({name,at:Number(name.slice(7,20))})).sort((a,b)=>b.at-a.at);}catch(_){return [];}}
  backupNow(){if(this.pending){clearTimeout(this.pending);this.pending=null;this.flush();}
    if(!fs.existsSync(this.file))this.writeAtomic();
    fs.mkdirSync(this.backupDir,{recursive:true});const time=Date.now();const name=`backup-${time}.json`;
    fs.copyFileSync(this.file,path.join(this.backupDir,name));this.lastBackupAt=time;
    for(const old of this.listBackups().slice(10))try{fs.unlinkSync(path.join(this.backupDir,old.name));}catch(_){}
    return {created:true,name,at:time,count:this.listBackups().length};}
  restoreBackup(name){if(!/^backup-\d{13}\.json$/.test(String(name||'')))throw Error('Tên bản sao lưu không hợp lệ.');
    const source=path.join(this.backupDir,name);
    const restored=this.parseData(fs.readFileSync(source,'utf8'));
    this.backupNow();this.items=restored;this.writeAtomic();return {restored:true,name};}
  flush(){if(this.pending){clearTimeout(this.pending);this.pending=null;}
    // Chỉ giữ bản sao cũ nếu đã qua 5 phút; tiết kiệm dung lượng khi liên tục thả tim.
    const needsBackup=fs.existsSync(this.file)&&Date.now()-this.lastBackupAt>=this.backupEveryMs;
    if(needsBackup){try{fs.mkdirSync(this.backupDir,{recursive:true});
      const now=Date.now(),name=`backup-${now}.json`;fs.copyFileSync(this.file,path.join(this.backupDir,name));this.lastBackupAt=now;
      for(const old of this.listBackups().slice(10))fs.unlinkSync(path.join(this.backupDir,old.name));
    }catch(e){console.warn('Không sao lưu được:',e.message);}}
    this.writeAtomic();}
}
module.exports={PersistentStore,ALLOWED_KEYS};
