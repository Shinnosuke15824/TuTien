'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Game,GEAR,weekKey,REALMS}=require('../game-core');
const {PersistentStore}=require('../persistent-store.cjs');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
function fixture(start=Date.parse('2026-11-02T09:00:00+07:00')){let t=start;const events=[];const game=new Game({now:()=>t,notify:e=>events.push(e)});return {game,events,get now(){return t},add:(ms)=>{t+=ms;game.tick();}};}
test('V2.2: 10 tính năng mới vẫn giữ luật bình luận +2 TV và 1 tim = 1 damage, +0,1 TV',()=>{
 const {game}=fixture();game.join('a','An','tien');game.startBattle();const p=game.getPlayer('a');
 const before=p.xp,hp=game.bossHp;const chat=game.chat({userId:'a',name:'An',text:'Cố lên!'});
 assert.equal(chat.damage,0);assert.ok(p.xp>=before+2);assert.equal(game.bossHp,hp);
 const heart=game.like({userId:'a',name:'An',count:10});assert.equal(heart.damage,10);assert.equal(heart.xp,1);assert.equal(game.bossHp,hp-10);
});
test('V2.2: Boss thức tỉnh ở 50% rồi cuồng nộ ở 20%, không đổi HP tối đa',()=>{
 const {game,events,add}=fixture();game.join('a','An','tien');game.startBattle();
 assert.equal(game.bossMaxHp,10000);game.like({userId:'a',name:'An',count:5000});
 assert.equal(game.bossPhaseLevel,1);assert.equal(game.bossHp,5000);
 game.like({userId:'a',name:'An',count:3000});assert.equal(game.bossPhaseLevel,2);assert.equal(game.bossHp,2000);
 assert.deepEqual(events.filter(x=>x.kind==='boss-phase').map(x=>x.stage),[1,2]);
 add(6000);assert.equal(game.shields.tien,88);assert.equal(game.shields.ma,88);
});
test('V2.2: Cảnh báo boss trước 60 giây chỉ phát một lần mỗi lượt chờ',()=>{
 const {game,events,add}=fixture();add(239000);assert.equal(events.some(x=>x.kind==='boss-warning'),false);
 add(1000);assert.equal(events.filter(x=>x.kind==='boss-warning').length,1);
 add(20000);assert.equal(events.filter(x=>x.kind==='boss-warning').length,1);
 add(40000);assert.equal(game.phase,'battle');assert.equal(events.filter(x=>x.kind==='boss-warning').length,1);
 game.finishBattle('timeout');add(240000);assert.equal(events.filter(x=>x.kind==='boss-warning').length,2);
});
test('V2.2: Pháp bảo / trang phục / linh thú chỉ mở theo cấp và không tăng damage',()=>{
 const {game}=fixture();game.join('a','An','tien');const p=game.getPlayer('a');
 assert.equal(game.equip('a','pet','dragon').ok,false);
 p.presenceMs=100*60000;game.award(p,1200,'test');assert.equal(game.equip('a','pet','dragon').ok,true);
 assert.equal(game.equip('a','robe','void').ok,true);assert.equal(game.equip('a','artifact','seal').ok,true);
 assert.equal(p.equipment.pet,'dragon');assert.equal(p.equipment.robe,'void');
 const json=game.toJSON();const recovered=new Game({now:game.now});assert.equal(recovered.load(json),true);
 assert.deepEqual(recovered.getPlayer('a').equipment,p.equipment);
 recovered.startBattle();assert.equal(recovered.like({userId:'a',name:'An',count:17}).damage,17);
 assert.equal(GEAR.filter(g=>g.kind==='pet').length>=4,true);
});
test('V2.2: bảng xếp hạng tuần có bốn thống kê và reset thứ Hai (VN)',()=>{
 const f=fixture(Date.parse('2026-11-08T23:55:00+07:00'));const g=f.game;
 g.join('a','An','tien');g.chat({userId:'a',name:'An',text:'Tôi tu luyện!'});g.like({userId:'a',name:'An',count:12});
 assert.equal(g.weeklyRanking('likes')[0].id,'a');assert.ok(g.weeklyRanking('xp')[0].week.xp>0);
 assert.equal(weekKey(f.now),'2026-11-02');f.add(6*60000);assert.equal(weekKey(f.now),'2026-11-09');
 assert.equal(g.weeklyRanking('likes').length,0);
 g.startBattle();g.like({userId:'a',name:'An',count:7});assert.equal(g.weeklyRanking('damage')[0].week.damage,7);
 assert.equal(g.weeklyRanking('likes')[0].week.likes,7);
 assert.ok(g.weeklyRanking('presenceMs').length>=1);
});
test('V2.2: Tiên Ma Đại Chiến lúc 30 phút, 60 giây đua tim, thắng +15 TV; tim chờ không damage',()=>{
 const f=fixture();const g=f.game;g.join('a','An','tien');g.join('b','Bình','ma');
 // Thực hiện các bước 15 giây như luồng render để không bỏ qua phase khi giả lập thời gian.
 for(let i=0;i<121;i++)f.add(15000);
 assert.equal(g.phase,'prep');assert.ok(g.duel?.active,'Tiên Ma Đại Chiến phải diễn ra trong lúc chờ');
 const xp=g.getPlayer('a').xp;const hp=g.bossHp;
 g.like({userId:'a',name:'An',count:20});g.like({userId:'b',name:'Bình',count:5});
 assert.equal(g.bossHp,hp);assert.deepEqual(g.duel.scores,{tien:20,ma:5});
 f.add(60000);assert.equal(g.duel.active,false);assert.equal(g.lastDuelResult.winningFaction,'tien');
 assert.ok(g.getPlayer('a').xp>=xp+2+15,'Thưởng Tu Vi sự kiện phải cộng riêng');
 const snap=g.toJSON();assert.ok(snap.nextDuelAt>f.now);
});
test('V2.2: Lưu V7 giữ dữ liệu V6 cũ gồm 60 ghế và lịch boss 5/5',()=>{
 const {game}=fixture();game.join('a','An','tien');game.award(game.getPlayer('a'),58.2,'demo');
 const old={...game.toJSON(),version:6};delete old.players[0].equipment;delete old.players[0].week;
 const restored=new Game({now:game.now});assert.equal(restored.load(old),true);
 assert.equal(restored.toJSON().version,7);assert.equal(restored.getPlayer('a').xp,game.getPlayer('a').xp);
 assert.equal(restored.getPlayer('a').seat,0);assert.equal(restored.phase,'prep');assert.equal(restored.getPlayer('a').equipment.robe,'basic');
 assert.deepEqual(REALMS.map(r=>r.minutes),[0,5,15,25,40,55,65,75,90]);
});
test('V2.2: Sao lưu tự động và khôi phục có kiểm tra dữ liệu, chặn đường dẫn tùy ý',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nttl-v22-'));
 try{
  const st=new PersistentStore(temp);st.setItem('nghich-thien-v2-game',JSON.stringify({version:7,players:[{id:'p'}]}));st.flush();
  const backup=st.backupNow();assert.equal(backup.created,true);assert.equal(st.listBackups().length>=1,true);
  st.setItem('nghich-thien-v2-game',JSON.stringify({version:7,players:[]}));st.flush();
  assert.throws(()=>st.restoreBackup('../../../../etc/passwd'));
  st.restoreBackup(backup.name);
  assert.equal(JSON.parse(st.readAll()['nghich-thien-v2-game']).players[0].id,'p');
  const recovered=new PersistentStore(temp);assert.equal(JSON.parse(recovered.readAll()['nghich-thien-v2-game']).players[0].id,'p');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('V2.2: Sao lưu tự động phục hồi khi file chính bị hỏng',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nttl-v22-recover-'));
 try{const st=new PersistentStore(temp);st.setItem('nghich-thien-v2-game',JSON.stringify({players:[{id:'a'}]}));st.flush();st.backupNow();fs.writeFileSync(st.file,'{BROKEN');
  const recovered=new PersistentStore(temp);assert.equal(JSON.parse(recovered.readAll()['nghich-thien-v2-game']).players[0].id,'a');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
