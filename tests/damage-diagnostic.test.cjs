'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {Game}=require('../game-core');
const {TikTokService}=require('../tiktok-service.cjs');

function makeGame(){let now=Date.parse('2026-11-04T02:00:00+07:00');const events=[];
 const game=new Game({now:()=>now,notify:e=>events.push(e)});
 return {game,events,advance:ms=>{now+=ms;game.tick()}};}

test('V2.1.7: bình luận gia nhập phe ngay trong trận không gây damage',()=>{
 const {game}=makeGame();game.startBattle();const before=game.bossHp;
 const hit=game.chat({userId:'u1',name:'A',text:'tiên'});
 assert.ok(hit.ok&&hit.joined);assert.equal(hit.damage,0);
 assert.equal(hit.blockReason,'comment-no-damage');assert.equal(before,game.bossHp);
});
test('V2.1.6: tim và bình luận khi chưa vào phe phải ghi rõ nguyên nhân',()=>{
 const {game}=makeGame();game.startBattle();
 const c=game.chat({userId:'u2',name:'B',text:'hello'});
 assert.equal(c.damage,0);assert.equal(c.blockReason,'comment-no-damage');
 const l=game.like({userId:'u2',name:'B',count:10});
 assert.equal(l.damage,0);assert.equal(l.blockReason,'no-faction');
});
test('V2.1.6: đang chờ boss ghi rõ waiting-boss; trong battle tim đánh được',()=>{
 const {game}=makeGame();game.chat({userId:'x',name:'X',text:'ma'});
 assert.equal(game.like({userId:'x',name:'X',count:5}).blockReason,'waiting-boss');
 game.startBattle();
 assert.ok(game.like({userId:'x',name:'X',count:5}).damage>0);
});
test('V2.1.7: spam bình luận không bao giờ gây sát thương, nhưng vẫn tăng điểm',()=>{
 const {game,advance}=makeGame();game.chat({userId:'x',name:'X',text:'ma'});game.startBattle();
 const hp=game.bossHp,oldXP=game.getPlayer('x').xp;
 for(let i=0;i<3;i++)assert.equal(game.chat({userId:'x',name:'X',text:'tấn công'}).damage,0);
 advance(750);assert.equal(game.chat({userId:'x',name:'X',text:'tấn công lại'}).damage,0);
 assert.equal(game.bossHp,hp);assert.equal(game.getPlayer('x').xp,oldXP+8+20); // 4 bình luận +2, cộng thêm thưởng daily quest khi đủ 5 bình luận tính cả lượt chọn phe
});
test('V2.1.6: khi đội hình đã đủ 30 mỗi phe, người mới bị báo no-seat',()=>{
 const {game}=makeGame();for(let i=0;i<30;i++)game.join(`p${i}`,`P${i}`,'tien');game.startBattle();
 const r=game.chat({userId:'new',name:'New',text:'tiên'});
 assert.equal(r.damage,0);assert.equal(r.joinReason,'full');assert.equal(r.blockReason,'comment-no-damage');
});
test('V2.1.6: username của TikTok được lưu và khôi phục cùng nhân vật',()=>{
 const {game}=makeGame();const p=game.join('numeric-111','S','tien').player;p.tiktokUsername='nguoixem';
 const s=game.toJSON();const loaded=new Game({now:game.now});assert.ok(loaded.load(s));
 assert.equal(loaded.getPlayer('numeric-111').tiktokUsername,'nguoixem');
 assert.notEqual(loaded.getPlayer('numeric-111').seat,null);
});

class FakeConn extends EventEmitter{
 constructor(){super();FakeConn.current=this;}
 async connect(){return {roomId:'12345678901234567890'};}
 async disconnect(){}
}
const fakeMod=()=>Promise.resolve({TikTokLiveConnection:FakeConn,
 WebcastEvent:{CHAT:'chat',LIKE:'like',FOLLOW:'follow',SHARE:'share',SOCIAL:'social'},
 ControlEvent:{DISCONNECTED:'disconnected',STREAM_END:'streamEnd',ERROR:'error'}});
test('V2.1.6: event.user rỗng vẫn lấy đúng userInfo.user và liên kết comment/like',async()=>{
 const all=[];const service=new TikTokService(x=>all.push(x),fakeMod);await service.connect('abcde',{autoReconnect:false});
 FakeConn.current.emit('chat',{user:{},userInfo:{user:{userId:'5192',uniqueId:'daohuu2026',nickname:'A'}},comment:'tiên',common:{msgId:'msg1'}});
 FakeConn.current.emit('like',{userInfo:{user:{uniqueId:'daohuu2026',nickname:'A'}},count:8,common:{msgId:'msg2'}});
 const c=all.find(e=>e.kind==='chat'),l=all.find(e=>e.kind==='like');
 assert.ok(c&&l);assert.equal(c.userId,'5192');assert.equal(l.userId,c.userId);
 assert.equal(l.count,8);
 await service.disconnect();
});

test('V2.1.6: username root + numeric id trong user không bị tách hồ sơ',async()=>{
 const all=[];const service=new TikTokService(x=>all.push(x),fakeMod);await service.connect('abcde',{autoReconnect:false});
 FakeConn.current.emit('chat',{user:{userId:'123456',nickname:'A'},uniqueId:'reala',comment:'tiên',common:{msgId:'split1'}});
 FakeConn.current.emit('like',{user:{uniqueId:'reala'},count:3,common:{msgId:'split2'}});
 const chat=all.find(e=>e.kind==='chat'),like=all.find(e=>e.kind==='like');
 assert.equal(chat.username,'reala');assert.equal(chat.userId,'123456');assert.equal(like.userId,'123456');
 await service.disconnect();
});
