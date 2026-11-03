'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game,REALMS,BOSSES,QUESTS,realmFor,realmIndex,factionFor,SEAT_MS,BATTLE_MS}=require('../game-core');
const make=(start=Date.parse('2026-11-04T02:00:00+07:00'))=>{let time=start;const ev=[];
  const game=new Game({now:()=>time,notify:e=>ev.push(e)});
  return {game,ev,now:()=>time,add:ms=>time+=ms};};
test('9 cảnh giới chính xác theo mốc, Phàm Nhân không hào quang',()=>{
  assert.deepEqual(REALMS.map(x=>x.at),[0,50,100,250,400,550,700,850,1100]);
  assert.equal(realmFor(0).name,'Phàm Nhân');assert.equal(REALMS[0].aura,0);
  assert.deepEqual(REALMS.map(x=>x.minutes),[0,5,15,25,40,55,65,75,90]);
  assert.equal(realmFor(49,20*60000).name,'Phàm Nhân');
  assert.equal(realmFor(50,0).name,'Phàm Nhân');
  assert.equal(realmFor(50,2*60000).name,'Phàm Nhân'); // 2 phút chưa đủ Trúc Cơ
  assert.equal(realmFor(50,5*60000).name,'Trúc Cơ Kỳ');
  assert.equal(realmFor(1100,55*60000).name,'Luyện Hư Kỳ');
  assert.equal(realmFor(1100,90*60000).name,'Độ Kiếp Kỳ');
  assert.equal(realmIndex(5000,90*60000),8);
  assert.equal(REALMS.length,9);
});
test('9 boss khác tên/ngoại hình, xoay vòng',()=>{assert.equal(BOSSES.length,9);assert.equal(new Set(BOSSES.map(x=>x.id)).size,9);
  const {game}=make();BOSSES.forEach((b,i)=>{game.roundId=i+1;assert.equal(game.boss.name,b.name);});game.roundId=10;assert.equal(game.boss.id,BOSSES[0].id);});
test('chọn phe bằng bình luận, gồm tiếng Việt có dấu',()=>{assert.equal(factionFor('Tiên'),'tien');assert.equal(factionFor('MA'),'ma');assert.equal(factionFor('Cố lên!'),null);});
test('mọi bình luận đều +2, bình luận chọn phe cũng được +2',()=>{const {game}=make();let r=game.chat({userId:'1',name:'A',text:'tiên'});
  assert.equal(r.joined,true);assert.equal(game.getPlayer('1').xp,12); // 2 bình luận +10 nhiệm vụ chọn phe
  r=game.chat({userId:'1',name:'A',text:'Chào mọi người'});assert.equal(r.score,2);assert.equal(game.getPlayer('1').xp,14);
});
test('không có thời hạn ghế; sau 24h vẫn ở đội hình',()=>{
  const {game,add}=make();game.chat({userId:'1',name:'A',text:'ma'});
  const seat=game.getPlayer('1').seat;add(24*3600000);game.tick();
  assert.equal(game.getPlayer('1').seat,seat);
  const r=game.chat({userId:'1',name:'A',text:'xin chào'});
  assert.equal(r.joined,false);assert.equal(game.getPlayer('1').seat,seat);
});
test('người mới chat thường vẫn có tu vi Phàm Nhân, chưa bị chọn phe',()=>{const {game}=make();game.chat({userId:'1',name:'B',text:'Chào bạn'});
  assert.equal(game.getPlayer('1').xp,2);assert.equal(game.getPlayer('1').faction,null);assert.equal(game.getPlayer('1').seat,null);});
test('follow +30 chỉ một lần, quest có thưởng riêng',()=>{const {game}=make();const a=game.follow({userId:'1',name:'A'});
  assert.equal(a.score,30);assert.equal(game.getPlayer('1').xp,60);assert.equal(game.follow({userId:'1',name:'A'}).already,true);assert.equal(game.getPlayer('1').xp,60);});
test('share +20, quest +40, chống share lặp trong 30 giây',()=>{const {game,add}=make();game.share({userId:'1',name:'A'});
  assert.equal(game.getPlayer('1').xp,60);assert.equal(game.share({userId:'1',name:'A'}).already,true);add(30001);
  game.share({userId:'1',name:'A'});assert.equal(game.getPlayer('1').xp,80);});
test('20 like cộng điểm và hoàn tất daily quest một lần',()=>{const {game}=make();game.like({userId:'1',name:'A',count:20});
  assert.equal(game.getPlayer('1').xp,32);game.like({userId:'1',name:'A',count:1});assert.equal(game.getPlayer('1').xp,32.1);});
test('nhiệm vụ ngày reset theo múi giờ Việt Nam, điểm không mất',()=>{const {game,add}=make();const p=game.makePlayer('a','A');
  for(let i=0;i<5;i++)game.chat({userId:'a',name:'A',text:'chào'});assert.equal(p.daily.claimed.includes('comments'),true);
  const prev=p.xp;add(24*3600000);game.chat({userId:'a',name:'A',text:'chào'});assert.equal(p.daily.progress.comments,1);
  assert.equal(p.daily.claimed.includes('comments'),false);assert.ok(p.xp>prev);});
test('đánh boss: sát thương đúng số tim, thưởng top +50 và phe thắng +20',()=>{const {game}=make();
  game.join('1','A','tien');game.join('2','B','ma');game.join('3','C','tien');
  game.startBattle();game.like({userId:'1',name:'A',count:45});game.like({userId:'2',name:'B',count:10});
  const a=game.getPlayer('1'),c=game.getPlayer('3'),beforeA=a.xp,beforeC=c.xp;
  const result=game.finishBattle('timeout');assert.equal(result.winningFaction,'tien');assert.equal(result.topName,'A');
  assert.equal(a.xp,beforeA+70);assert.equal(c.xp,beforeC+20);
  assert.equal(game.finishBattle('timeout'),null); // không trả thưởng lần thứ 2
});
test('hòa sát thương không có phần thưởng phe, vẫn thưởng top nếu có damage',()=>{const {game}=make();
  game.join('1','A','tien');game.join('2','B','ma');game.startBattle();
  const result=game.finishBattle('timeout');assert.equal(result.winningFaction,null);assert.equal(result.topName,'');});
test('60 chỗ: mỗi phe đúng 30, thêm người phải trả full',()=>{
 const {game}=make();for(let i=0;i<30;i++){
  assert.equal(game.join('t'+i,'A'+i,'tien').ok,true);
  assert.equal(game.join('m'+i,'B'+i,'ma').ok,true);
 }
 assert.equal(game.activePlayers().length,60);assert.equal(game.seats.length,60);
 assert.equal(game.join('extra','Extra','tien').reason,'full');
});
test('dọn đội hình không xóa tu vi, cảnh giới, phe hoặc quest',()=>{
 const {game}=make();game.chat({userId:'1',name:'A',text:'tiên'});game.like({userId:'1',name:'A',count:20});
 const p=game.getPlayer('1'),xp=p.xp;const quests=p.daily.claimed.slice();
 assert.equal(game.clearFormation(),1);assert.equal(game.activePlayers().length,0);
 assert.equal(p.xp,xp);assert.equal(p.faction,'tien');assert.deepEqual(p.daily.claimed,quests);
 game.chat({userId:'1',name:'A',text:'trở lại'});assert.notEqual(p.seat,null);
});
test('migrating V2 old 120 seats preserves XP and keeps first 30 per faction',()=>{
 const {game,now}=make();const old={version:2,players:[]};
 for(let r=0;r<10;r++)for(let c=0;c<12;c++){
  let seat=r*12+c,faction=c<6?'tien':'ma';
  old.players.push({id:'x'+seat,name:'P'+seat,faction,seat,expiresAt:now()-1000,xp:seat+700});
 }
 const loaded=new Game({now});
 assert.equal(loaded.load(old),true);assert.equal(loaded.players.size,120);
 assert.equal(loaded.activePlayers().length,60);assert.equal(loaded.getPlayer('x0').xp,700);
 assert.equal(loaded.getPlayer('x119').xp,819);
 assert.equal(loaded.getPlayer('x119').seat,null);
 assert.equal(loaded.toJSON().version,7);
});
test('events emitted for player attack and boss retaliation',()=>{
 const {game,ev,add}=make();game.join('a','A','tien');game.startBattle();game.like({userId:'a',name:'A',count:10});
 assert.ok(ev.some(x=>x.kind==='player-attack'&&x.damage>0&&x.seat===0));
 add(6001);game.tick();assert.ok(ev.some(x=>x.kind==='boss-attack'));
});
test('save/load roundtrip: XP, áo, nhiệm vụ, lượt ngồi và công đức không liên quan',()=>{const {game,now}=make();game.chat({userId:'1',name:'A',text:'tiên'});game.follow({userId:'1',name:'A'});
  const saved=game.toJSON(),loaded=new Game({now});assert.equal(loaded.load(saved),true);assert.equal(loaded.getPlayer('1').xp,game.getPlayer('1').xp);
  assert.equal(loaded.getPlayer('1').seat,game.getPlayer('1').seat);assert.deepEqual(loaded.getPlayer('1').daily.claimed,game.getPlayer('1').daily.claimed);});
test('đột phá Trúc Cơ phải đủ 50 Tu Vi và 5 phút trong đội hình',()=>{const {game,ev,add}=make();
  game.join('1','A','tien');game.award(game.getPlayer('1'),50,'test');
  assert.equal(game.getPlayer('1').realmLevel,0);
  // Mỗi bước 15 giây, đúng với giới hạn tích lũy thời gian trong Game.tick().
  for(let i=0;i<19;i++){add(15000);game.tick();} // 04:45
  assert.equal(game.getPlayer('1').realmLevel,0);
  assert.equal(ev.filter(e=>e.kind==='levelup').length,0);
  add(15000);game.tick(); // 05:00
  const levels=ev.filter(e=>e.kind==='levelup');
  assert.equal(levels.length,1);
  assert.equal(levels[0].realm,'Trúc Cơ Kỳ');assert.equal(levels[0].to,1);
  assert.equal(game.getPlayer('1').realmLevel,1);
});
test('trò chơi không nhận quà TikTok để tăng sức mạnh',()=>{const {game}=make();assert.equal(typeof game.gift,'undefined');
  assert.equal(typeof game.sendGift,'undefined');assert.equal(QUESTS.length,7);});


test('V2.1.8: đủ 9 boss đều 10.000 HP, mỗi trận tối đa 5 phút',()=>{
 const {game,now}=make();assert.equal(BATTLE_MS,300000);
 assert.ok(BOSSES.every(b=>b.hp===10000));
 game.join('a','A','tien');game.startBattle();
 assert.equal(game.bossMaxHp,BOSSES[0].hp);
 assert.equal(game.phaseEndsAt-now(),300000);
});
test('V2.1.7: bình luận gia nhập phe hay bình luận thường KHÔNG đánh boss',()=>{
 const {game,ev,add}=make();game.startBattle();const hp=game.bossHp;
 const joined=game.chat({userId:'a',name:'A',text:'tiên'});
 assert.equal(joined.joined,true);assert.equal(joined.damage,0);assert.equal(game.bossHp,hp);
 const beforeXP=game.getPlayer('a').xp;
 const chat=game.chat({userId:'a',name:'A',text:'cố lên'});
 assert.equal(chat.damage,0);assert.equal(chat.score,2);assert.equal(game.bossHp,hp);
 assert.equal(game.getPlayer('a').xp,beforeXP+2);
 assert.equal(ev.filter(e=>e.kind==='player-attack'&&e.source==='comment').length,0);
 const heart=game.like({userId:'a',name:'A',count:5});
 assert.equal(heart.damage,5);assert.equal(heart.xp,0.5);assert.equal(game.bossHp,hp-5);
 assert.ok(ev.some(e=>e.kind==='player-attack'&&e.source==='heart'&&e.damage===5));
});
test('V2.1.3: bình luận chưa vào phe không thể gây damage',()=>{
 const {game}=make();game.startBattle();const hp=game.bossHp;
 const r=game.chat({userId:'a',name:'A',text:'xin chào'});assert.equal(r.damage,0);assert.equal(hp,game.bossHp);
});
test('V2.1.7: bình luận liên tiếp chỉ tăng tu vi, không bao giờ gây damage',()=>{
 const {game,add}=make();game.chat({userId:'a',name:'A',text:'ma'});game.startBattle();
 const hp=game.bossHp,previous=game.getPlayer('a').xp;
 const a=game.chat({userId:'a',name:'A',text:'một'});
 const b=game.chat({userId:'a',name:'A',text:'hai'});
 add(1300);const c=game.chat({userId:'a',name:'A',text:'ba'});
 assert.deepEqual([a.damage,b.damage,c.damage],[0,0,0]);
 assert.equal(game.bossHp,hp);assert.equal(game.getPlayer('a').xp,previous+6);
});


// V2.1.5 regression tests: realistic boss HP, appearance every 5 minutes, and two-part promotion gate.
test('V2.1.8: khi khởi động chờ đủ 5 phút mới xuất hiện boss',()=>{
 const {game,add}=make();assert.equal(game.phase,'prep');assert.equal(game.bossHp,10000);
 add(299000);game.tick();assert.equal(game.phase,'prep');assert.equal(game.stats().secondsLeft,1);
 add(1000);game.tick();assert.equal(game.phase,'battle');assert.equal(game.roundId,1);assert.equal(game.boss.id,'qilin');
 assert.equal(game.stats().secondsLeft,300);
});
test('V2.1.8: 9 boss luân phiên vô hạn qua 10 vòng, mỗi vòng 5 phút chờ và 5 phút chiến',()=>{
 const {game,add}=make();
 for(let r=0;r<12;r++){
  assert.equal(game.phase,'prep');assert.equal(game.boss.id,BOSSES[r%9].id);
  add(300000);game.tick();assert.equal(game.phase,'battle');assert.equal(game.roundId,r+1);
  assert.equal(game.bossHp,10000);assert.equal(game.phaseEndsAt-game.now(),300000);
  add(299999);game.tick();assert.equal(game.phase,'battle');
  add(1);game.tick();assert.equal(game.phase,'prep');assert.equal(game.roundId,r+2);
  assert.equal(game.boss.id,BOSSES[(r+1)%9].id);assert.equal(game.phaseEndsAt-game.now(),300000);
 }
});
test('V2.1.8: giết boss sớm biến mất và đếm 5 phút TỪ LÚC HẠ',()=>{
 const {game,add,ev}=make();game.join('a','A','tien');game.startBattle();
 add(30000);const top=game.damageBoss(game.getPlayer('a'),game.bossHp,'heart');
 assert.equal(top,10000);assert.equal(game.phase,'prep');assert.equal(game.roundId,2);
 assert.equal(game.lastResult.boss,'Hỏa Kỳ Lân Ma Tôn');
 assert.ok(ev.some(e=>e.kind==='boss-result'&&e.reason==='defeated'));
 assert.equal(game.phaseEndsAt-game.now(),300000);
 add(299999);game.tick();assert.equal(game.phase,'prep');
 add(1);game.tick();assert.equal(game.phase,'battle');assert.equal(game.boss.id,'wolf');
});
test('V2.1.8: mới kết nối LIVE reset về 5 phút chờ, không mất Tu Vi hay ghế',()=>{
 const {game,add,ev}=make();game.join('a','A','ma');game.award(game.getPlayer('a'),23.1,'test');
 add(300000);game.tick();assert.equal(game.phase,'battle');
 const prev=game.getPlayer('a').xp,seat=game.getPlayer('a').seat;
 game.beginLiveSession();
 assert.equal(game.phase,'prep');assert.equal(game.stats().secondsLeft,300);
 assert.equal(game.getPlayer('a').xp,prev);assert.equal(game.getPlayer('a').seat,seat);
 assert.ok(ev.some(e=>e.kind==='boss-waiting'));
});
test('V2.1.5.1: đủ điểm 2300 vẫn chờ đủ 5 phút mới lên Trúc Cơ',()=>{
 const {game,add,ev}=make();game.join('a','A','ma');game.award(game.getPlayer('a'),2300,'test');
 assert.equal(game.getPlayer('a').realmLevel,0);
 for(let i=0;i<19;i++){add(15000);game.tick();} // 4 phút 45 giây
 assert.equal(game.getPlayer('a').realmLevel,0);
 add(15000);game.tick(); // Đúng 5 phút
 assert.equal(game.getPlayer('a').realmLevel,1);
 assert.equal(ev.filter(e=>e.kind==='levelup').length,1);
});
test('V2.1.5: không cộng phút offline sau khi mở lại',()=>{
 const {game,add,now}=make();game.join('a','A','tien');add(60000);game.tick();
 const saved=game.toJSON();const earlier=game.getPlayer('a').presenceMs;
 add(3600000);const restored=new Game({now});restored.load(saved);
 assert.equal(restored.getPlayer('a').presenceMs,earlier);
});
test('V2.1.8: save V2.1.7 đang chiến chuyển về chờ 5 phút, giữ Tu Vi và 60 ghế',()=>{
 const {game,now}=make();const old={version:5,players:[{id:'a',name:'A',faction:'tien',seat:0,expiresAt:0,xp:456.7,presenceMs:40000,realmLevel:0,daily:{day:'2026-11-04',progress:{},claimed:[]}}],phase:'battle',roundId:2,phaseEndsAt:now()+70000,bossMaxHp:21250,bossHp:10625};
 assert.equal(game.load(old),true);assert.equal(game.bossMaxHp,10000);assert.equal(game.bossHp,10000);
 assert.equal(game.phase,'prep');assert.equal(game.phaseEndsAt-now(),300000);
 assert.equal(game.getPlayer('a').xp,456.7);assert.equal(game.getPlayer('a').seat,0);
});
test('V2.1.8: load/save V6 giữ lịch chờ và dữ liệu người chơi',()=>{
 const {game,add,now}=make();game.join('a','A','tien');game.award(game.getPlayer('a'),43.2,'test');add(60000);game.tick();
 const snap=game.toJSON(),restored=new Game({now});
 assert.equal(snap.version,7);assert.equal(restored.load(snap),true);
 assert.equal(restored.phase,'prep');assert.equal(restored.phaseEndsAt-now(),240000);
 assert.equal(restored.getPlayer('a').xp,game.getPlayer('a').xp);
});
// Kiểm thử biên của toàn bộ 9 cảnh giới để tránh sửa một mốc mà bỏ sót mốc khác.
test('V2.1.5.1: đủ cả Tu Vi và thời gian tại chính xác từng ngưỡng 0–90 phút',()=>{
 const minutes=[0,5,15,25,40,55,65,75,90];
 const points=[0,50,100,250,400,550,700,850,1100];
 assert.deepEqual(REALMS.map(r=>r.minutes),minutes);
 for(let level=1;level<REALMS.length;level++){
   const minMs=minutes[level]*60000;
   assert.equal(realmIndex(points[level],minMs-1),level-1,`Cảnh giới ${level}: không được lên sớm`);
   assert.equal(realmIndex(points[level]-1,minMs),level-1,`Cảnh giới ${level}: không được thiếu Tu Vi`);
   assert.equal(realmIndex(points[level],minMs),level,`Cảnh giới ${level}: phải lên đúng mốc`);
 }
});


test('V2.1.7: 1 tim = 1 damage +0,1 Tu Vi; 10 tim = 10 damage +1 Tu Vi',()=>{
 const {game}=make();game.join('a','A','tien');game.startBattle();
 const p=game.getPlayer('a'),baseXP=p.xp,hp=game.bossHp;
 const one=game.like({userId:'a',name:'A',count:1});
 assert.equal(one.xp,0.1);assert.equal(one.damage,1);assert.equal(game.bossHp,hp-1);
 const ten=game.like({userId:'a',name:'A',count:10});
 assert.equal(ten.xp,1);assert.equal(ten.damage,10);assert.equal(game.bossHp,hp-11);
 // Quest 'Thả 20 tim' chưa hoàn thành; các quest boss và join có thể cộng riêng.
 assert.equal(p.likes,11);assert.equal(Math.round((p.xp-baseXP-25)*10)/10,1.1); // thưởng boss-join +25 riêng
});


test('V2.1.7: 100 tim = 100 damage và 10 Tu Vi, riêng daily quest được thưởng thêm',()=>{
 const {game}=make();game.join('a','A','tien');game.startBattle();
 const p=game.getPlayer('a'),before=game.bossHp;
 const r=game.like({userId:'a',name:'A',count:100});
 assert.equal(r.damage,100);assert.equal(r.xp,10);assert.equal(before-game.bossHp,100);
 assert.equal(p.daily.claimed.includes('likes'),true);
 assert.equal(p.xp,10+10+30+35+25); // +10 join quest, +10 hearts, +30 likes quest, +35 damage quest, +25 boss quest
});

test('V2.1.7: 10 sự kiện 1 tim cộng chính xác 1,0 điểm, lưu lại 0,1 điểm',()=>{
 const {game,now}=make();game.join('a','A','tien');const p=game.getPlayer('a');
 for(let i=0;i<10;i++)game.like({userId:'a',name:'A',count:1});
 assert.equal(p.xp,11); // +10 nhiệm vụ gia nhập phe
 const data=game.toJSON();const other=new Game({now});other.load(data);
 assert.equal(other.getPlayer('a').xp,11);
 other.like({userId:'a',name:'A',count:1});assert.equal(other.getPlayer('a').xp,11.1);
});

test('V2.1.7: lượt tim 0 không tăng Tu Vi và damage, không tạo tim giả',()=>{
 const {game}=make();game.join('a','A','tien');game.startBattle();
 const hp=game.bossHp,likes=game.likes,xp=game.getPlayer('a').xp;
 const r=game.like({userId:'a',name:'A',count:0});
 assert.equal(r.damage,0);assert.equal(game.bossHp,hp);assert.equal(game.likes,likes);assert.equal(game.getPlayer('a').xp,xp);
});

test('V2.1.7: batch 500 tim không bị mất 300 tim do giới hạn cũ 200',()=>{
 const {game}=make();game.join('a','A','tien');game.startBattle();
 const hp=game.bossHp;const r=game.like({userId:'a',name:'A',count:500});
 assert.equal(r.damage,500);assert.equal(r.xp,50);assert.equal(game.bossHp,hp-500);
});
