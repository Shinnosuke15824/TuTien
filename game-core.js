'use strict';
// Nghịch Thiên Tu Luyện V2: gameplay độc lập Canvas/Electron, có thể chạy node --test.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NghichThienGame=api;})(typeof window!=='undefined'?window:null,function(){
  const SEAT_LIMIT=60,SEAT_MS=0,PREP_MS=300000,BATTLE_MS=300000,RESULT_MS=15000;
  // Lịch V2.1.8: chờ 5 phút (không có boss) → chiến đấu tối đa 5 phút → chờ 5 phút.
  // Boss bị hạ sớm cũng chuyển về giai đoạn chờ đủ 5 phút, rồi mới ra boss kế tiếp.
  // Chỉ lượt thả tim mới gây sát thương. Bình luận dùng để tăng Tu Vi/chọn phe.
  const REALMS=[
    {name:'Phàm Nhân',at:0,minutes:0,group:'Khởi đầu',robe:'#776b78',aura:0},
    {name:'Trúc Cơ Kỳ',at:50,minutes:5,group:'Hạ Cảnh Giới',robe:'#72bee2',aura:1},
    {name:'Kết Đan Kỳ',at:100,minutes:15,group:'Hạ Cảnh Giới',robe:'#67daf4',aura:2},
    {name:'Nguyên Anh Kỳ',at:250,minutes:25,group:'Hạ Cảnh Giới',robe:'#a68af1',aura:3},
    {name:'Hóa Thần Kỳ',at:400,minutes:40,group:'Hạ Cảnh Giới',robe:'#c6a0ff',aura:4},
    {name:'Luyện Hư Kỳ',at:550,minutes:55,group:'Trung Cảnh Giới',robe:'#f2ba70',aura:5},
    {name:'Hợp Thể Kỳ',at:700,minutes:65,group:'Trung Cảnh Giới',robe:'#ffb97e',aura:6},
    {name:'Đại Thừa Kỳ',at:850,minutes:75,group:'Trung Cảnh Giới',robe:'#ffe6b6',aura:7},
    {name:'Độ Kiếp Kỳ',at:1100,minutes:90,group:'Thượng Cảnh Giới',robe:'#ffffff',aura:8},
  ];
  const BOSSES=[
    {id:'qilin',name:'Hỏa Kỳ Lân Ma Tôn',element:'Hỏa',color:'#ff8b46',hp:10000},
    {id:'wolf',name:'Huyết Ảnh Lang Vương',element:'Huyết',color:'#f55796',hp:10000},
    {id:'ape',name:'Lôi Đình Cự Viên',element:'Lôi',color:'#83bcff',hp:10000},
    {id:'snake',name:'Cửu U Xà Hoàng',element:'Độc',color:'#78dcb1',hp:10000},
    {id:'sword',name:'Thiên Ma Kiếm Chủ',element:'Kiếm',color:'#ff657f',hp:10000},
    {id:'fox',name:'Băng Phách Hồ Yêu',element:'Băng',color:'#a6eaff',hp:10000},
    {id:'ghost',name:'U Minh Quỷ Tướng',element:'U Minh',color:'#b79dff',hp:10000},
    {id:'bird',name:'Thôn Thiên Côn Bằng',element:'Phong',color:'#66d9ea',hp:10000},
    {id:'emperor',name:'Cổ Thần Ma Đế',element:'Cổ Thần',color:'#ffd074',hp:10000},
  ];
  const QUESTS=[
    {id:'comments',title:'Bình luận 5 lần',target:5,reward:20},
    {id:'likes',title:'Thả 20 tim',target:20,reward:30},
    {id:'follow',title:'Theo dõi kênh',target:1,reward:30},
    {id:'shares',title:'Chia sẻ LIVE',target:1,reward:40},
    {id:'boss',title:'Tham gia đánh boss',target:1,reward:25},
    {id:'damage',title:'Gây 20 sát thương boss',target:20,reward:35},
    {id:'join',title:'Gia nhập một phe',target:1,reward:10},
  ];
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim().replace(/\s+/g,' ');}
  function factionFor(v){const x=norm(v).replace(/^[!#\/]+/,'');if(['tien','phe tien','thanh van','vao tien','chon tien','1'].includes(x))return 'tien';if(['ma','phe ma','tu viem','vao ma','chon ma','2'].includes(x))return 'ma';return null;}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Cảnh giới cần CẢ tu vi và thời gian tham chiến trong đội hình.
  // presenceMs tích lũy khi phần mềm đang chạy; không xác minh người xem đang mở màn hình TikTok.
  function realmIndex(xp,presenceMs=0){for(let i=REALMS.length-1;i>=0;i--)if(xp>=REALMS[i].at&&presenceMs>=REALMS[i].minutes*60000)return i;return 0;}
  function realmFor(xp,presenceMs=0){const i=realmIndex(xp,presenceMs);return {...REALMS[i],index:i,nextAt:REALMS[i+1]?.at??null,nextMinutes:REALMS[i+1]?.minutes??null};}
  function vnDay(ms){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));}
  function emptyDaily(day){return {day,progress:{comments:0,likes:0,follow:0,shares:0,boss:0,damage:0,join:0},claimed:[]};}
  // Mốc tuần dùng thứ Hai theo múi giờ Việt Nam; không phụ thuộc ngôn ngữ máy livestream.
  function weekKey(ms){const day=vnDay(ms);const d=new Date(day+'T00:00:00Z');const shift=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-shift);return d.toISOString().slice(0,10);}
  const GEAR=[
    {id:'basic',kind:'robe',name:'Đạo bào mặc định',realm:0,color:'#c7c7dd'},
    {id:'cloud',kind:'robe',name:'Vân Tiêu Đạo Bào',realm:1,color:'#88e7ff'},
    {id:'phoenix',kind:'robe',name:'Phượng Vũ Tiên Y',realm:4,color:'#ffc27e'},
    {id:'void',kind:'robe',name:'Hư Không Pháp Y',realm:7,color:'#dbb3ff'},
    {id:'none',kind:'artifact',name:'Không trang bị',realm:0,color:'#9db5dd'},
    {id:'jade',kind:'artifact',name:'Ngọc Bội Tụ Linh',realm:1,color:'#8cffce'},
    {id:'sword',kind:'artifact',name:'Linh Kiếm Tinh Vân',realm:3,color:'#b8ecff'},
    {id:'seal',kind:'artifact',name:'Thiên Ấn Phù Văn',realm:6,color:'#ffdb87'},
    {id:'none',kind:'pet',name:'Không triệu hồi',realm:0,color:'#9db5dd'},
    {id:'fox',kind:'pet',name:'Cửu Vĩ Linh Hồ',realm:2,color:'#e6f4ff'},
    {id:'crane',kind:'pet',name:'Tiên Hạc',realm:4,color:'#ffdeae'},
    {id:'dragon',kind:'pet',name:'Thanh Long',realm:6,color:'#74eee0'},
  ];
  const WEEK_METRICS=['xp','likes','damage','presenceMs'];
  function emptyWeek(now){return {key:weekKey(now),xp:0,likes:0,damage:0,presenceMs:0};} 

  class Game {
    constructor({now=()=>Date.now(),notify=()=>{}}={}){
      this.now=now;this.notify=notify;this.players=new Map();this.seats=Array(SEAT_LIMIT).fill(null);
      this.likes=0;this.chatCount=0;this.shares=0;this.follows=0;this.bossesDefeated=0;this.history=[];
      this.roundId=1;this.phase='prep';this.phaseEndsAt=this.now()+PREP_MS;this.roundStartAt=0;this.bossHp=BOSSES[0].hp;this.bossMaxHp=BOSSES[0].hp;
      this.shields={tien:100,ma:100};this.damage={tien:0,ma:0};this.nextBossStrikeAt=0;
      this.lastHit=null;this.lastEvent=null;this.lastResult=null;this._lastPresenceTickAt=this.now();this._nextPresenceSaveAt=this.now()+30000;
      this.bossWarningSent=false;this.bossPhaseLevel=0;
      this.nextDuelAt=this.now()+30*60000;this.duel=null;this.duelPending=false;this.lastDuelResult=null;this.duelDurationMs=60000;

    }
    get boss(){return BOSSES[(Math.max(1,this.roundId)-1)%BOSSES.length];}
    emit(kind,detail){try{this.notify({kind,...detail});}catch(_){}}
    message(str){this.lastEvent=str;this.history.unshift({at:this.now(),message:str});this.history=this.history.slice(0,40);this.emit('message',{text:str});}
    getPlayer(id){return this.players.get(String(id));}
    makePlayer(id,name){const key=String(id||'').trim().slice(0,80);if(!key)return null;
      let p=this.players.get(key);if(!p){p={id:key,name:String(name||'Đạo hữu').trim().slice(0,32)||'Đạo hữu',faction:null,
        seat:null,expiresAt:0,xp:0,likes:0,comments:0,shares:0,followed:false,damage:0,roundDamage:0,joins:0,
        lastShareAt:0,lastHitAt:0,presenceMs:0,realmLevel:0,daily:emptyDaily(vnDay(this.now())),
        week:emptyWeek(this.now()),equipment:{robe:'basic',artifact:'none',pet:'none'}};this.players.set(key,p);}
      else if(name)p.name=String(name).trim().slice(0,32)||p.name;
      this.ensureDaily(p);return p;
    }
    ensureDaily(p){const day=vnDay(this.now());if(!p.daily||p.daily.day!==day)p.daily=emptyDaily(day);return p.daily;}
    ensureWeek(p){if(!p.week||p.week.key!==weekKey(this.now()))p.week=emptyWeek(this.now());return p.week;}
    availableGear(p,kind){const level=realmIndex(p.xp,p.presenceMs||0);return GEAR.filter(g=>g.kind===kind&&level>=g.realm);}
    equip(id,kind,itemId){const p=this.getPlayer(id);if(!p||!['robe','artifact','pet'].includes(kind))return {ok:false,reason:'invalid'};
      const item=this.availableGear(p,kind).find(g=>g.id===itemId);if(!item)return {ok:false,reason:'locked'};
      if(!p.equipment)p.equipment={robe:'basic',artifact:'none',pet:'none'};
      p.equipment[kind]=item.id;this.message(`✨ ${p.name} trang bị ${item.name}`);
      this.emit('equip',{userId:p.id,kind,itemId:item.id});return {ok:true,item,player:p};
    }
    weeklyRanking(metric='xp',limit=5){if(!WEEK_METRICS.includes(metric))return [];
      return [...this.players.values()].filter(p=>this.ensureWeek(p)[metric]>0)
        .sort((a,b)=>b.week[metric]-a.week[metric]||a.name.localeCompare(b.name,'vi')).slice(0,limit);
    }
    startDuel(){if(this.duel?.active||this.phase!=='prep')return false;
      this.duel={active:true,startedAt:this.now(),endsAt:this.now()+this.duelDurationMs,scores:{tien:0,ma:0}};
      this.duelPending=false;this.emit('duel-start',{endsAt:this.duel.endsAt});this.message('⚔ TIÊN MA ĐẠI CHIẾN! 60 giây đua tim trong lúc chờ boss · tim không gây damage boss.');return true;
    }
    finishDuel(){if(!this.duel?.active)return null;
      const scores={...this.duel.scores};const winner=scores.tien===scores.ma?null:(scores.tien>scores.ma?'tien':'ma');
      const prizes=[];if(winner)for(const p of this.activePlayers())if(p.faction===winner){this.award(p,15,'thắng Tiên Ma Đại Chiến');prizes.push(p.id);}
      const result={at:this.now(),scores,winningFaction:winner,prizeCount:prizes.length};
      this.duel.active=false;this.lastDuelResult=result;this.message(`🏆 Tiên Ma Đại Chiến kết thúc: ${winner?(winner==='tien'?'Tiên Đạo':'Ma Đạo')+' thắng':'Hai phe hòa'} · Tiên ${scores.tien} tim / Ma ${scores.ma} tim`);
      this.emit('duel-result',result);return result;
    }

    updateRealm(p){
      if(!p)return 0;
      const before=Math.max(0,Math.min(8,Number(p.realmLevel)||0));
      const after=realmIndex(p.xp,p.presenceMs||0);
      if(after>before){
        p.realmLevel=after;
        this.message(`✨ ${p.name} đột phá ${REALMS[after].name} sau ${Math.floor(p.presenceMs/60000)} phút tham chiến!`);
        this.emit('levelup',{userId:p.id,name:p.name,faction:p.faction,from:before,to:after,realm:REALMS[after].name,xp:p.xp,seat:p.seat});
      }
      return after;
    }
    award(p,amount,reason){
      const delta=clamp(Math.round((Number(amount)||0)*10)/10,0,100000);if(!delta||!p)return;
      // Cộng theo đơn vị 0,1 để tránh sai số nhị phân khi nhận nhiều tim liên tiếp.
      p.xp=Math.min(1e9,Math.round((p.xp+delta)*10)/10);
      this.ensureWeek(p).xp=Math.round((this.ensureWeek(p).xp+delta)*10)/10;
      this.emit('xp',{userId:p.id,name:p.name,amount:delta,reason,xp:p.xp});
      this.updateRealm(p);
    }
    quest(p,key,amount=1){const q=QUESTS.find(x=>x.id===key);if(!q)return;const d=this.ensureDaily(p);
      if(d.claimed.includes(key))return;d.progress[key]=Math.min(q.target,(d.progress[key]||0)+amount);
      if(d.progress[key]>=q.target){d.claimed.push(key);this.award(p,q.reward,'nhiệm vụ '+q.title);
        this.message(`📜 ${p.name} hoàn thành ${q.title} +${q.reward} tu vi`);this.emit('quest',{userId:p.id,name:p.name,key,reward:q.reward});}
    }
    activePlayers(){return [...this.players.values()].filter(p=>p.seat!==null);}
    findSeat(faction){for(let r=0;r<6;r++)for(let c=0;c<5;c++){const i=r*10+(faction==='tien'?c:5+c);if(this.seats[i]===null)return i;}return -1;}
    join(id,name,faction){if(!['tien','ma'].includes(faction))return {ok:false,reason:'invalid'};
      this.tick();let p=this.getPlayer(id);
      if(p&&p.seat!==null){if(name)p.name=String(name).trim().slice(0,32)||p.name;return {ok:true,already:true,player:p};}
      const seat=this.findSeat(faction);if(seat<0)return {ok:false,reason:'full',player:p||null};
      p=this.makePlayer(id,name);if(!p)return {ok:false,reason:'invalid'};
      p.faction=faction;p.seat=seat;p.expiresAt=0;p.joins++;this.seats[seat]=p.id;
      this.quest(p,'join');this.message(`${p.name} gia nhập ${faction==='tien'?'Tiên Đạo':'Ma Đạo'} · tham chiến không giới hạn thời gian`);
      return {ok:true,joined:true,player:p};
    }
    damageBlockReason(p){
      if(this.phase==='prep')return 'waiting-boss';
      if(this.phase==='result')return 'battle-ended';
      if(this.phase!=='battle')return 'not-battle';
      if(this.bossHp<=0)return 'boss-defeated';
      if(!p)return 'no-id';
      if(!p.faction)return 'no-faction';
      if(p.seat===null)return 'no-seat';
      return null;
    }
    damageBoss(p,damage,source){
      if(this.phase!=='battle'||!p?.faction||p.seat===null||this.bossHp<=0)return 0;
      const dealt=Math.min(this.bossHp, Math.max(0,Math.floor(Number(damage)||0)));
      if(dealt<=0)return 0;
      this.bossHp-=dealt;p.damage+=dealt;p.roundDamage+=dealt;p.lastHitAt=this.now();this.ensureWeek(p).damage+=dealt;
      this.damage[p.faction]+=dealt;this.lastHit={faction:p.faction,at:this.now(),amount:dealt,source};
      this.emit('player-attack',{userId:p.id,name:p.name,faction:p.faction,seat:p.seat,damage:dealt,source,bossId:this.boss.id});
      this.quest(p,'damage',dealt);this.quest(p,'boss');
      const ratio=this.bossHp/Math.max(1,this.bossMaxHp);
      const stage=ratio<=.2?2:ratio<=.5?1:0;
      if(stage>this.bossPhaseLevel){this.bossPhaseLevel=stage;
        this.message(stage===2?`🔥 ${this.boss.name} cuồng nộ! Còn 20% máu!`:`⚡ ${this.boss.name} thức tỉnh! Còn 50% máu!`);
        this.emit('boss-phase',{stage,bossId:this.boss.id,hp:this.bossHp,maxHp:this.bossMaxHp});}
      if(this.bossHp===0)this.finishBattle('defeated');
      return dealt;
    }
    chat({userId,name,text}){this.tick();const content=String(text||'').trim().slice(0,180);if(!content)return {ok:false,reason:'empty'};
      const p=this.makePlayer(userId,name);if(!p)return {ok:false,reason:'no-id'};this.chatCount++;p.comments++;
      let joined=null;const f=factionFor(content);
      if(f&&p.seat===null)joined=this.join(p.id,p.name,f);
      else if(p.faction&&p.seat===null)joined=this.join(p.id,p.name,p.faction);
      this.award(p,2,'bình luận');this.quest(p,'comments');
      // Bình luận KHÔNG tấn công boss: chỉ +2 Tu Vi, nhiệm vụ ngày và chọn phe.
      return {ok:true,action:'chat',score:2,damage:0,blockReason:'comment-no-damage',joined:joined?.joined===true,joinReason:joined?.reason||null,player:p};
    }
    like({userId,name,count=1}){
      this.tick();
      const numeric=Number(count);
      const qty=Number.isFinite(numeric)?clamp(Math.floor(numeric),0,10000):0;
      if(qty===0)return {ok:false,reason:'zero-count',count:0,damage:0};
      this.likes+=qty;
      const p=this.makePlayer(userId,name);if(!p)return {ok:false,reason:'no-id',count:qty,damage:0};
      p.likes+=qty;this.ensureWeek(p).likes+=qty;
      if(this.phase==='prep'&&this.duel?.active&&p.faction&&p.seat!==null)this.duel.scores[p.faction]+=qty;
      const xpGained=Math.round(qty)/10; // 1 tim = +0,1 Tu Vi
      this.award(p,xpGained,'thả tim');this.quest(p,'likes',qty);
      // 1 tim = 1 damage, không nhân theo cảnh giới. Chỉ tính khi boss đang giao chiến.
      const dealt=this.damageBoss(p,qty,'heart');
      if(dealt||qty>1)this.message(`${p.name} thả ${qty} tim · +${xpGained.toLocaleString('vi-VN',{maximumFractionDigits:1})} Tu Vi${dealt?` · ${dealt} sát thương`:''}`);
      return {ok:true,player:p,xp:xpGained,count:qty,damage:dealt,blockReason:dealt?null:this.damageBlockReason(p)};
    }
    follow({userId,name}){const p=this.makePlayer(userId,name);if(!p)return {ok:false};
      if(p.followed)return {ok:true,already:true,player:p};p.followed=true;this.follows++;
      this.award(p,30,'theo dõi kênh');this.quest(p,'follow');this.message(`🌟 ${p.name} theo dõi kênh +30 tu vi`);
      return {ok:true,score:30,player:p};}
    share({userId,name}){const p=this.makePlayer(userId,name);if(!p)return {ok:false};
      if(p.lastShareAt && this.now()-p.lastShareAt<30000)return {ok:true,already:true,player:p};
      p.lastShareAt=this.now();p.shares++;this.shares++;
      this.award(p,20,'chia sẻ LIVE');this.quest(p,'shares');this.message(`↗ ${p.name} chia sẻ LIVE +20 tu vi`);
      return {ok:true,score:20,player:p};}
    clearFormation(){
      // Dọn 60 vị trí giữa các phiên LIVE, không xóa tên, phe, cảnh giới, tu vi, nhiệm vụ.
      let cleared=0;
      for(const p of this.players.values())if(p.seat!==null){p.seat=null;p.expiresAt=0;cleared++;}
      this.seats.fill(null);
      this.message(`Đã dọn ${cleared} vị trí. Tu vi, phe và nhiệm vụ vẫn còn.`);
      return cleared;
    }
    tick(){const t=this.now();
      // Cộng thời gian khi game đang chạy, không cộng offline/treo máy.
      const delta=Math.max(0,Math.min(15000,t-this._lastPresenceTickAt));
      this._lastPresenceTickAt=t;
      if(delta>0){
        for(const p of this.players.values())if(p.seat!==null){p.presenceMs=(Number(p.presenceMs)||0)+delta;this.ensureWeek(p).presenceMs+=delta;this.updateRealm(p);}
        if(t>=this._nextPresenceSaveAt){this._nextPresenceSaveAt=t+30000;this.emit('presence-progress',{at:t});}
      }
      if(this.duel?.active&&t>=this.duel.endsAt)this.finishDuel();
      if(t>=this.nextDuelAt){this.duelPending=true;
        // Mốc sau dựa trên thời gian thực, tránh tạo hàng loạt sự kiện khi máy treo.
        this.nextDuelAt=t+30*60000;
      }
      if(this.phase==='prep'&&this.duelPending&&!this.duel?.active)this.startDuel();
      if(this.phase==='prep'&&!this.bossWarningSent&&t>=this.phaseEndsAt-60000&&t<this.phaseEndsAt){
        this.bossWarningSent=true;this.message(`⚠ Thiên địa biến động! ${this.boss.name} xuất hiện sau 60 giây!`);
        this.emit('boss-warning',{boss:this.boss,secondsLeft:Math.ceil((this.phaseEndsAt-t)/1000)});
      }
      if(this.phase==='prep'&&t>=this.phaseEndsAt){if(this.duel?.active)this.finishDuel();this.startBattle();}
      if(this.phase==='battle'){
        let guard=0;while(this.phase==='battle'&&t>=this.nextBossStrikeAt&&guard++<20){
          const bossPower=this.bossPhaseLevel===2?12:this.bossPhaseLevel===1?8:6;
          this.shields.tien=Math.max(0,this.shields.tien-bossPower);this.shields.ma=Math.max(0,this.shields.ma-bossPower);
          this.nextBossStrikeAt+=6000;this.lastHit={faction:'boss',at:t,amount:bossPower};
          this.emit('boss-attack',{bossId:this.boss.id,damage:bossPower,at:t,shields:{...this.shields}});}
        if(this.phase==='battle'&&t>=this.phaseEndsAt)this.finishBattle('timeout');}
      // Hỗ trợ save rất cũ có phase='result': quay về chu kỳ chuẩn bị mới.
      if(this.phase==='result'&&t>=this.phaseEndsAt)this.resetRound();
    }
    startBattle(){this.phase='battle';this.roundStartAt=this.now();this.phaseEndsAt=this.roundStartAt+BATTLE_MS;
      const b=this.boss;this.bossMaxHp=b.hp;this.bossHp=this.bossMaxHp;this.bossPhaseLevel=0;this.bossWarningSent=false;
      this.shields={tien:100,ma:100};this.damage={tien:0,ma:0};for(const p of this.players.values())p.roundDamage=0;
      this.nextBossStrikeAt=this.now()+6000;this.message(`⚔ ${b.name} xuất hiện! Thả tim để tấn công · 1 tim = 1 sát thương`);
      this.emit('boss-start',{boss:b,round:this.roundId});}
    finishBattle(reason='timeout'){
      if(this.phase!=='battle')return null;
      const defeatedBoss=this.boss;
      const scores={...this.damage};const winningFaction=scores.tien===scores.ma?null:(scores.tien>scores.ma?'tien':'ma');
      const top=[...this.players.values()].filter(p=>p.roundDamage>0).sort((a,b)=>b.roundDamage-a.roundDamage||a.id.localeCompare(b.id))[0]||null;
      const prizes=[];
      if(top){this.award(top,50,'top sát thương boss');prizes.push({name:top.name,amount:50,type:'top'});}
      if(winningFaction)for(const p of this.activePlayers())if(p.faction===winningFaction){this.award(p,20,'phe thắng sát thương');prizes.push({name:p.name,amount:20,type:'faction'});}
      if(reason==='defeated')this.bossesDefeated++;
      this.lastResult={boss:defeatedBoss.name,reason,winningFaction,topName:top?.name||'',topDamage:top?.roundDamage||0,
        factionRewards:prizes.filter(x=>x.type==='faction').length,damage:scores,at:this.now()};
      // Kết thúc trận: boss BIẾN MẤT ngay. Không có result kéo dài hay boss kế tiếp xuất hiện lập tức.
      this.roundId++;
      this.beginWaitingPhase();
      this.message(`🏆 ${reason==='defeated'?'Boss đã bị hạ':'Hết 5 phút giao chiến'} · ${winningFaction?(winningFaction==='tien'?'Tiên Đạo':'Ma Đạo')+' thắng sát thương':'Hai phe hòa'}${top?` · TOP ${top.name} +50`:''}. Boss kế tiếp sau 5 phút.`);
      this.emit('boss-result',{...this.lastResult});
      return this.lastResult;
    }
    beginWaitingPhase({announce=false}={}){
      this.phase='prep';this.phaseEndsAt=this.now()+PREP_MS;this.bossWarningSent=false;this.bossPhaseLevel=0;
      this.roundStartAt=0;this.nextBossStrikeAt=0;
      this.bossMaxHp=this.boss.hp;this.bossHp=this.bossMaxHp;
      this.shields={tien:100,ma:100};this.damage={tien:0,ma:0};
      this.lastHit=null;
      if(announce)this.message(`⏳ Bắt đầu LIVE: sau 5 phút ${this.boss.name} xuất hiện.`);
      this.emit('boss-waiting',{nextBoss:this.boss,round:this.roundId,secondsLeft:300});
    }
    // Chỉ gọi khi kết nối phiên LIVE mới. Không xóa hồ sơ, ghế, Tu Vi hay nhiệm vụ.
    beginLiveSession(){this.beginWaitingPhase({announce:true});
      this.nextDuelAt=this.now()+30*60000;this.duel=null;this.duelPending=false;
      return this.stats();}
    resetRound(){this.roundId++;this.beginWaitingPhase();}
    fastForward(){this.phaseEndsAt=this.now();this.tick();}
    ranking(limit=10){return [...this.players.values()].sort((a,b)=>b.xp-a.xp||b.damage-a.damage||a.name.localeCompare(b.name,'vi')).slice(0,limit);}
    damageRanking(limit=5){return [...this.players.values()].filter(p=>p.roundDamage>0).sort((a,b)=>b.roundDamage-a.roundDamage||a.name.localeCompare(b.name,'vi')).slice(0,limit);}
    stats(){this.tick();const active=this.activePlayers();return {active:active.length,tien:active.filter(x=>x.faction==='tien').length,
      ma:active.filter(x=>x.faction==='ma').length,phase:this.phase,secondsLeft:Math.max(0,Math.ceil((this.phaseEndsAt-this.now())/1000)),
      round:this.roundId,boss:this.boss,likes:this.likes,chats:this.chatCount,shares:this.shares,follows:this.follows,
      hp:this.bossHp,maxHp:this.bossMaxHp,damage:{...this.damage},shields:{...this.shields},bossesDefeated:this.bossesDefeated,
      bossStage:this.bossPhaseLevel,duel:this.duel?.active?{...this.duel,scores:{...this.duel.scores}}:null,nextDuelIn:Math.max(0,Math.ceil((this.nextDuelAt-this.now())/1000))};}
    toJSON(){return {version:7,players:[...this.players.values()].map(p=>({...p})),likes:this.likes,chatCount:this.chatCount,
      shares:this.shares,follows:this.follows,bossesDefeated:this.bossesDefeated,roundId:this.roundId,phase:this.phase,
      phaseEndsAt:this.phaseEndsAt,bossHp:this.bossHp,bossMaxHp:this.bossMaxHp,shields:this.shields,damage:this.damage,
      nextBossStrikeAt:this.nextBossStrikeAt,lastResult:this.lastResult,roundStartAt:this.roundStartAt,
      nextDuelAt:this.nextDuelAt,duel:this.duel,duelPending:this.duelPending,lastDuelResult:this.lastDuelResult,
      bossPhaseLevel:this.bossPhaseLevel,bossWarningSent:this.bossWarningSent};}
    load(raw){if(!raw||![2,3,4,5,6,7].includes(raw.version)||!Array.isArray(raw.players))return false;
      this.players.clear();this.seats.fill(null);const oldSeats=[];for(const x of raw.players.slice(0,5000)){
        if(!x||!String(x.id||'').trim())continue;const p=this.makePlayer(x.id,x.name);
        p.xp=clamp(Number(x.xp)||0,0,1e9);p.likes=clamp(Number(x.likes)||0,0,1e8);p.comments=clamp(Number(x.comments)||0,0,1e8);
        p.faction=['tien','ma'].includes(x.faction)?x.faction:null;p.followed=x.followed===true;p.shares=clamp(Number(x.shares)||0,0,1e7);
        p.damage=clamp(Number(x.damage)||0,0,1e9);p.roundDamage=clamp(Number(x.roundDamage)||0,0,1e9);
        p.lastShareAt=Number(x.lastShareAt)||0;p.lastHitAt=Number(x.lastHitAt)||0;p.lastCommentHitAt=Number(x.lastCommentHitAt)||0;
        // Lưu tên tài khoản để CHAT/LIKE vẫn tìm đúng tu sĩ khi TikTok trả ID theo định dạng khác ở phiên sau.
        p.tiktokUsername=String(x.tiktokUsername||'').toLowerCase().trim().slice(0,32);
        p.presenceMs=raw.version>=5?Math.max(0,Number(x.presenceMs)||0):0;p.realmLevel=raw.version>=5?Math.max(0,Math.min(8,Number(x.realmLevel)||0)):0;p.joins=clamp(Number(x.joins)||0,0,1e7);
        p.daily=x.daily&&typeof x.daily==='object'?x.daily:emptyDaily(vnDay(this.now()));this.ensureDaily(p);
        p.week=x.week&&x.week.key===weekKey(this.now())?{...emptyWeek(this.now()),...x.week}:emptyWeek(this.now());
        p.equipment={robe:'basic',artifact:'none',pet:'none'};
        for(const kind of ['robe','artifact','pet'])if(GEAR.some(g=>g.kind===kind&&g.id===x.equipment?.[kind]))p.equipment[kind]=x.equipment[kind];
        p.expiresAt=0;p.seat=null;
        // Cập nhật từ V2.1.1: giữ điểm, quest và phe; chuyển chỗ cũ sang lưới 60 ghế.
        // Người từng ngồi trong save cũ vẫn được xét ưu tiên dù expiresAt đã hết.
        if(Number.isInteger(x.seat)&&x.seat>=0&&x.seat<(raw.version===2?120:SEAT_LIMIT)&&p.faction){
          oldSeats.push({player:p,oldSeat:x.seat});
        }
      }
      oldSeats.sort((a,b)=>a.oldSeat-b.oldSeat);
      for(const {player} of oldSeats){const seat=this.findSeat(player.faction);if(seat===-1)continue;player.seat=seat;this.seats[seat]=player.id;}
      this.likes=Number(raw.likes)||0;this.chatCount=Number(raw.chatCount)||0;this.shares=Number(raw.shares)||0;
      this.follows=Number(raw.follows)||0;this.bossesDefeated=Number(raw.bossesDefeated)||0;this.roundId=Math.max(1,Math.floor(Number(raw.roundId)||1));
      if(raw.version<6){
        // Save V2.1.7 có thể đang giao chiến hoặc ở phase result cũ.
        // Đưa về chờ 5 phút, không mất người, ghế, tu vi, thời gian hiện diện, quest.
        this.roundId+=raw.phase==='result'?1:0;
        this.phase='prep';this.phaseEndsAt=this.now()+PREP_MS;
        this.roundStartAt=0;
        this.bossMaxHp=this.boss.hp;this.bossHp=this.bossMaxHp;
        this.lastHit=null;
        this.damage={tien:0,ma:0};
      }else{
        this.phase=['prep','battle'].includes(raw.phase)?raw.phase:'prep';
        this.phaseEndsAt=Number(raw.phaseEndsAt)||this.now()+PREP_MS;
        this.bossMaxHp=this.boss.hp;
        this.bossHp=clamp(Number(raw.bossHp ?? this.bossMaxHp),0,this.bossMaxHp);
        this.roundStartAt=Number(raw.roundStartAt)||0;
      }
      this._lastPresenceTickAt=this.now();this._nextPresenceSaveAt=this.now()+30000;
      this.shields={tien:clamp(Number(raw.shields?.tien)||0,0,100),ma:clamp(Number(raw.shields?.ma)||0,0,100)};
      if(raw.version>=6)this.damage={tien:Number(raw.damage?.tien)||0,ma:Number(raw.damage?.ma)||0};
      this.nextBossStrikeAt=this.phase==='battle'?(Number(raw.nextBossStrikeAt)||this.now()+6000):0;this.lastResult=raw.lastResult||null;
      this.nextDuelAt=raw.version>=7&&Number(raw.nextDuelAt)>this.now()?Number(raw.nextDuelAt):this.now()+30*60000;
      const validDuel=raw.version>=7&&raw.duel&&raw.duel.active===true&&Number(raw.duel.endsAt)>this.now();
      this.duel=validDuel&&this.phase==='prep'?{active:true,startedAt:Number(raw.duel.startedAt)||this.now(),endsAt:Number(raw.duel.endsAt),scores:{tien:Math.max(0,Number(raw.duel.scores?.tien)||0),ma:Math.max(0,Number(raw.duel.scores?.ma)||0)}}:null;
      this.duelPending=raw.version>=7&&raw.duelPending===true;this.lastDuelResult=raw.lastDuelResult||null;
      this.bossPhaseLevel=this.phase==='battle'?Math.max(0,Math.min(2,Number(raw.bossPhaseLevel)||0)):0;
      this.bossWarningSent=raw.version>=7&&raw.bossWarningSent===true;
      this.tick();return true;}
  }
  return {Game,REALMS,BOSSES,QUESTS,GEAR,weekKey,realmFor,realmIndex,factionFor,SEAT_LIMIT,SEAT_MS,PREP_MS,BATTLE_MS,vnDay};
});
