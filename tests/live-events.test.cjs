'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {TikTokService}=require('../tiktok-service.cjs');
class FakeConnection extends EventEmitter{constructor(){super();FakeConnection.instance=this;}async connect(){return {roomId:'12345678901234567890'};}async disconnect(){}}
const fakeModule=()=>Promise.resolve({TikTokLiveConnection:FakeConnection,
  WebcastEvent:{CHAT:'chat',LIKE:'like',FOLLOW:'follow',SHARE:'share',SOCIAL:'social'},ControlEvent:{DISCONNECTED:'disconnected',STREAM_END:'streamEnd',ERROR:'error'}});
test('Kết nối phát sự kiện chat / like / follow / share, không phát gift',async()=>{
  const all=[];const conn=new TikTokService(e=>all.push(e),fakeModule);
  await conn.connect('@demoCreator',{autoReconnect:false});const mock=FakeConnection.instance;
  const user={userId:'123',uniqueId:'nguyendao',nickname:'Nguyên Đạo'};
  mock.emit('chat',{user,comment:'tiên',common:{msgId:'c1'}});
  mock.emit('like',{user,count:5,common:{msgId:'l1'}});
  mock.emit('follow',{user,common:{msgId:'s1'}});
  mock.emit('social',{user,action:'follow',common:{msgId:'s1'}});
  mock.emit('share',{user,common:{msgId:'s2'}});
  mock.emit('social',{user,action:'share',common:{msgId:'s2'}});
  mock.emit('gift',{user,giftId:7});
  assert.deepEqual(all.filter(e=>['chat','like','follow','share'].includes(e.kind)).map(e=>e.kind),['chat','like','follow','share']);
  assert.equal(all.some(e=>e.kind==='gift'),false);
  assert.equal(all.find(e=>e.kind==='chat').text,'tiên');
  await conn.disconnect();
});
test('Bản kết nối tự ngắt theo yêu cầu, không phát sinh retry vô hạn',async()=>{
  const all=[];const conn=new TikTokService(e=>all.push(e),fakeModule);
  await conn.connect('demoCreator',{autoReconnect:true});await conn.disconnect();
  assert.equal(conn.getState().connected,false);
  assert.equal(conn.getState().stage,'idle');
});

test('V2.1.3: TikTok content/comment object và flat user đều nhận đúng',async()=>{
 const all=[];const c=new TikTokService(e=>all.push(e),fakeModule);await c.connect('@demoCreator',{autoReconnect:false});const mock=FakeConnection.instance;
 mock.emit('chat',{userId:'777',uniqueId:'duong_hao',nickname:'Dương Hạo',comment:{text:'ma'},common:{msgId:'new-1'}});
 mock.emit('chat',{user:{userId:'888',nickname:'Huyền'},content:'tiên',common:{msgId:'new-2'}});
 const events=all.filter(e=>e.kind==='chat');assert.equal(events.length,2);
 assert.equal(events[0].text,'ma');assert.equal(events[0].userId,'777');assert.equal(events[1].text,'tiên');
 await c.disconnect();
});

test('V2.1.5: CHAT và LIKE khác cấu trúc user vẫn trỏ cùng một tu sĩ',async()=>{
 const all=[];const c=new TikTokService(e=>all.push(e),fakeModule);
 await c.connect('@demoCreator',{autoReconnect:false});const mock=FakeConnection.instance;
 mock.emit('chat',{user:{userId:'98765',uniqueId:'dao_huu_1',nickname:'Đạo hữu A'},comment:'tiên',common:{msgId:'k1'}});
 mock.emit('like',{userInfo:{user:{uniqueId:'dao_huu_1',nickname:'Đạo hữu A'}},count:4,common:{msgId:'k2'}});
 mock.emit('like',{userId:'98765',uniqueId:'dao_huu_1',nickname:'Đạo hữu A',count:2,common:{msgId:'k3'}});
 const chat=all.find(e=>e.kind==='chat'),likes=all.filter(e=>e.kind==='like');
 assert.equal(chat.userId,'98765');assert.equal(likes.length,2);
 assert.equal(likes[0].userId,chat.userId);assert.equal(likes[1].userId,chat.userId);
 assert.deepEqual(likes.map(x=>x.count),[4,2]);
 await c.disconnect();
});


test('V2.1.7: một sự kiện TikTok 501 tim giữ đúng count, không còn giới hạn 200',async()=>{
 const events=[];const c=new TikTokService(e=>events.push(e),fakeModule);
 await c.connect('@demoCreator',{autoReconnect:false});
 FakeConnection.instance.emit('like',{user:{userId:'123',uniqueId:'daohuu'},count:501,common:{msgId:'batch-501'}});
 assert.equal(events.find(e=>e.kind==='like').count,501);
 await c.disconnect();
});
