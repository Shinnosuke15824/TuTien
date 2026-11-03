'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const canvas=$('templeCanvas'),ctx=canvas.getContext('2d',{alpha:false});
  const W=720,H=1280;
  const {Game,REALMS,BOSSES,QUESTS,GEAR,realmFor,realmIndex}=window.NghichThienGame;
  const SETTINGS_KEY='nghich-thien-v2-settings',GAME_KEY='nghich-thien-v2-game';
  let stateDirty=false,settingsDirty=false,liveConnected=false,lastUI=0,lastSave=0;
  let selectedId='',levelAnimation=null,phaseFlash=null;
  const liveStats={chats:0,likes:0,heartCount:0,lastEventAt:0,lastStatus:'Demo'};
  const levelQueue=[];
  const combatFx=[]; // Luồng VFX nội bộ, đồng bộ Canvas phát LIVE, không tạo kết nối TikTok thứ hai.
  const images={};
  let artMode='cinematic';
  const imagePaths={back:'assets/backgrounds/bong_lai_nguoi_dung_9x16.jpg'};
  for(let i=0;i<9;i++)for(const f of ['tien','ma'])imagePaths[`${f}_${i}`]=`assets/cinematic/${f}_${i}.png`;
  BOSSES.forEach(b=>imagePaths[`boss_${b.id}`]=`assets/cinematic/bosses_v214/${b.id}.png`);
  function refreshBossAssetStatus(){
    const target=$('bossAssetsStatus');
    if(!target)return;
    let readyCount=0;const errors=[];
    for(const b of BOSSES){
      const im=images[`boss_${b.id}`];
      if(im?.naturalWidth>0)readyCount++;
      else if(im?.complete)errors.push(b.name);
    }
    if(errors.length){
      target.textContent=`LỖI ẢNH BOSS: ${errors.join(', ')}. Kiểm tra assets/cinematic/bosses_v214 và chép lại bản vá.`;
      target.style.color='#ffb0a7';
    }else{
      target.textContent=readyCount===BOSSES.length
        ?`✓ Đã tải đủ ${readyCount}/9 ảnh boss riêng V2.1.5 (không dùng icon đa giác).`
        :`Đang kiểm tra ảnh boss V2.1.5: ${readyCount}/9...`;
      target.style.color=readyCount===BOSSES.length?'#95dfbd':'#d2ba8d';
    }
  }
  for(const [k,path] of Object.entries(imagePaths)){
    const im=new Image();
    im.addEventListener('load', refreshBossAssetStatus);
    im.addEventListener('error',()=>{
      const msg=`Không tải được ${path}. Vui lòng chép nguyên thư mục assets/cinematic/bosses_v214`;
      console.error(msg);
      if(k.startsWith('boss_')){log(msg); refreshBossAssetStatus();}
    });
    im.src=window.__assetURLs?.[path]||path;images[k]=im;
  }
  function updateArtMode(mode){
    artMode=mode==='classic'?'classic':'cinematic';
    const paths={back:artMode==='classic'?'assets/backgrounds/tien-ma-canh.png':'assets/backgrounds/bong_lai_nguoi_dung_9x16.jpg'};
    for(let i=0;i<9;i++)for(const f of ['tien','ma'])paths[`${f}_${i}`]=artMode==='classic'?`assets/characters/${f}_${i}.png`:`assets/cinematic/${f}_${i}.png`;
    // Bộ boss V2.1.4 luôn dùng bản chi tiết, kể cả khi chọn nền/nhân vật classic.
    BOSSES.forEach(b=>paths[`boss_${b.id}`]=`assets/cinematic/bosses_v214/${b.id}.png`);
    for(const [key,path] of Object.entries(paths))if(images[key]){const uri=window.__assetURLs?.[path]||path;if(images[key].src!==uri)images[key].src=uri;}
    saveSettings();
  }
  const ready=key=>images[key]?.complete&&images[key]?.naturalWidth>0;
  const game=new Game({notify:(event)=>{stateDirty=true;handleGameEvent(event);}});
  const music=$('music');
  const DEFAULT_MUSIC='assets/audio/linh-khi-nguyen-ban.wav';
  let chosenMusic=null;let voiceModel=null,piperEngine=null;
  const speechQueue=[];let speechBusy=false,speechAudible=false,speechDropCount=0,speechEpoch=0,currentSpeechAudio=null,currentSpeechFinish=null;
  let savedSystemVoice='',systemVoiceReady=false;
  const voiceStatus=()=>document.getElementById('speechStatus');
  const updateSpeechStatus=(value)=>{const el=voiceStatus();if(el)el.textContent=value;};
  const musicPercent=()=>Number($('musicVolume').value)/100;
  const voicePercent=()=>Number($('voiceVolume').value)/100;
  const musicDuckFactor=()=>speechAudible&&$('duckMusic').checked?.22:1;
  function applyMusicVolume(){music.volume=Math.min(1,Math.max(0,musicPercent()*musicDuckFactor()));}
  function updateMusicName(){
    $('musicFileLabel').textContent=chosenMusic?`Đang chọn: ${chosenMusic.name} (đã nhập vào thư mục ứng dụng)`:'Đang chọn: Linh khí nguyên bản (mặc định)';
  }
  function setMusicFile(item){
    const wasPlaying=!music.paused;
    music.pause();chosenMusic=item?.url?item:null;
    music.src=chosenMusic?.url||DEFAULT_MUSIC;music.load();
    applyMusicVolume();updateMusicName();
    if(wasPlaying&&$('playMusic').checked)music.play().catch(e=>{$('musicStatus').textContent='Không phát được nhạc: '+e.message;});
    saveSettings();
  }
  function updateVoiceOptions(){
    const usePiper=$('voiceSource').value==='piper';
    $('piperVoiceOptions').hidden=!usePiper;
    $('systemVoiceOptions').hidden=usePiper;
  }
  function updatePiperLabels(){
    $('piperEngineLabel').textContent=piperEngine?.name?`Chương trình: ${piperEngine.name}`:'Chưa chọn piper.exe';
    $('voiceModelLabel').textContent=voiceModel?.name?`Model giọng: ${voiceModel.name}${voiceModel.language?' · '+voiceModel.language:''}`:'Chưa chọn model giọng .onnx';
  }
  function refreshSystemVoices(){
    const combo=$('systemVoice');const selected=savedSystemVoice||combo.value||'';
    const voices=window.speechSynthesis?.getVoices?.()||[];
    combo.replaceChildren(new Option('Tự chọn giọng tiếng Việt',''));
    for(const voice of [...voices].sort((a,b)=>((a.lang||'').startsWith('vi')?-1:1)-((b.lang||'').startsWith('vi')?-1:1))){
      combo.add(new Option(`${voice.name} (${voice.lang})${voice.localService?' · trong máy':''}`,voice.voiceURI||voice.name));
    }
    combo.value=[...combo.options].some(o=>o.value===selected)?selected:'';
    systemVoiceReady=voices.length>0;
    if(!voices.length)updateSpeechStatus('Máy chưa công bố giọng đọc. Có thể cần cài thêm giọng tiếng Việt trong Windows.');
    return voices;
  }
  function speak(value,asAlert=false,force=false){
    if(!force&&!(asAlert?$('alertVoice').checked:$('readChat').checked))return false;
    const clean=String(value||'').replace(/https?:\/\/\S+/gi,'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,160);
    if(!clean)return false;
    if(speechQueue.length>=16){
      if(asAlert)speechQueue.pop();
      else{speechDropCount++;updateSpeechStatus(`Quá nhiều bình luận: bỏ ${speechDropCount} câu để tránh chậm LIVE.`);return false;}
    }
    if(asAlert)speechQueue.unshift({text:clean,alert:true});else speechQueue.push({text:clean,alert:false});
    updateSpeechStatus(`Đang xếp ${speechQueue.length} câu giọng đọc...`);
    void pumpSpeech();return true;
  }
  function stopSpeech(){
    speechEpoch++;speechQueue.length=0;
    try{window.speechSynthesis?.cancel();}catch(_){ }
    if(currentSpeechAudio){currentSpeechAudio.pause();currentSpeechAudio.src='';currentSpeechAudio=null;}
    const finish=currentSpeechFinish;currentSpeechFinish=null;
    if(finish)finish(true);else{speechBusy=false;applyMusicVolume();}
    updateSpeechStatus('Đã dừng giọng đọc, nhạc nền vẫn hoạt động độc lập.');
  }
  async function pumpSpeech(){
    if(speechBusy||!speechQueue.length)return;
    const item=speechQueue.shift(),token=++speechEpoch;
    speechBusy=true;
    let done=false,watchdog=null;
    const finish=(stopped=false)=>{
      if(done)return;done=true;clearTimeout(watchdog);currentSpeechFinish=null;
      if(currentSpeechAudio){currentSpeechAudio.pause();currentSpeechAudio=null;}
      speechBusy=false;speechAudible=false;applyMusicVolume();
      if(stopped)return;
      if(speechQueue.length)void pumpSpeech();
      else updateSpeechStatus('Giọng đọc sẵn sàng.');
    };
    currentSpeechFinish=finish;
    try{
      if($('voiceSource').value==='piper'){
        if(!window.desktopAudio?.synthesize)throw Error('Giọng Piper chỉ chạy trong phần mềm Electron (npm start).');
        if(!piperEngine?.path||!voiceModel?.path)throw Error('Chưa chọn piper.exe hoặc model .onnx + .onnx.json.');
        updateSpeechStatus(`Piper đang tạo giọng: ${item.text.slice(0,55)}...`);
        const src=await window.desktopAudio.synthesize({engine:piperEngine.path,model:voiceModel.path,text:item.text,rate:Number($('voiceRate').value)/100});
        if(token!==speechEpoch){finish(true);return;}
        const player=new Audio(src);currentSpeechAudio=player;player.volume=voicePercent();speechAudible=true;applyMusicVolume();
        player.onended=()=>finish();player.onerror=()=>{updateSpeechStatus('Không phát được WAV do Piper tạo ra.');finish();};
        watchdog=setTimeout(()=>{updateSpeechStatus('Giọng Piper quá dài hoặc bị kẹt.');finish();},Math.max(18000,item.text.length*220+6000));
        await player.play();
      }else{
        if(!('speechSynthesis' in window))throw Error('Không tìm thấy trình đọc Windows/Chromium.');
        const u=new SpeechSynthesisUtterance(item.text);u.lang='vi-VN';u.rate=Number($('voiceRate').value)/100;u.pitch=1;u.volume=voicePercent();
        const voices=refreshSystemVoices();
        const voice=voices.find(v=>(v.voiceURI||v.name)===$('systemVoice').value)||voices.find(v=>String(v.lang).toLowerCase().startsWith('vi'));
        if(voice)u.voice=voice;
        else updateSpeechStatus('Chưa có giọng tiếng Việt; Windows có thể dùng giọng dự phòng.');
        u.onend=()=>finish();u.onerror=e=>{updateSpeechStatus('Giọng Windows lỗi: '+String(e.error||'không rõ'));finish();};
        watchdog=setTimeout(()=>{try{window.speechSynthesis.cancel();}catch(_){ }finish();},Math.max(14000,item.text.length*180+4500));
        speechAudible=true;applyMusicVolume();window.speechSynthesis.speak(u);
      }
    }catch(error){
      if(token===speechEpoch)updateSpeechStatus(`Không thể đọc: ${error.message}`);
      finish(true); // Không ngắt nhạc nền khi giọng đọc gặp lỗi.
      if(speechQueue.length)void pumpSpeech();
    }
  }
  window.speechSynthesis?.addEventListener?.('voiceschanged',refreshSystemVoices);
  function log(text){const li=document.createElement('li');li.textContent=text;$('activity').prepend(li);while($('activity').children.length>18)$('activity').lastElementChild.remove();}
  function handleGameEvent(e){
    if(e.kind==='message')log(e.text);
    if(e.kind==='levelup'&&!String(e.userId).startsWith('crowd:')){levelQueue.push({startAt:Date.now(),...e});speak(`${e.name} đột phá thành công! ${e.realm}.`,true);}
    if(e.kind==='boss-result')speak(`Trận chiến kết thúc. ${e.topName?`Đạo hữu ${e.topName} đứng đầu sát thương.`:''}`,true);
    if(e.kind==='boss-warning'){speak(`Thiên địa biến động! ${e.boss.name} sẽ giáng lâm sau một phút. Chuẩn bị chiến đấu!`,true);phaseFlash={at:performance.now(),text:'BOSS SẮP XUẤT HIỆN',color:'#ffcf70',duration:4500};}
    if(e.kind==='boss-phase'){phaseFlash={at:performance.now(),text:e.stage===2?'BOSS CUỒNG NỘ · 20% HP':'BOSS THỨC TỈNH · 50% HP',color:e.stage===2?'#ff6771':'#ffe18b',duration:4800};speak(e.stage===2?'Ma khí cuồng nộ! Boss chỉ còn hai mươi phần trăm máu!':'Boss thức tỉnh! Máu đã xuống năm mươi phần trăm!',true);}
    if(e.kind==='duel-start'){speak('Tiên Ma Đại Chiến bắt đầu! Hai phe thi đua tim trong một phút!',true);phaseFlash={at:performance.now(),text:'TIÊN MA ĐẠI CHIẾN',color:'#e9c3ff',duration:5000};}
    if(e.kind==='duel-result'){speak(e.winningFaction?`${e.winningFaction==='tien'?'Tiên Đạo':'Ma Đạo'} chiến thắng Tiên Ma Đại Chiến!`:'Tiên Ma Đại Chiến kết thúc hòa!',true);}

    if(e.kind==='player-attack'){combatFx.push({type:'cultivator',start:performance.now(),seat:e.seat,faction:e.faction,damage:e.damage,userId:e.userId,level:realmIndex(game.getPlayer(e.userId)?.xp||0,game.getPlayer(e.userId)?.presenceMs||0)});}
    if(e.kind==='boss-attack'){combatFx.push({type:'boss',start:performance.now(),damage:e.damage,phase:e.bossId});}
    if(combatFx.length>24)combatFx.splice(0,combatFx.length-24);
  }
  function getSettings(){return {
    username:$('liveUsername').value.trim(),autoReconnect:$('autoReconnect').checked,
    readChat:$('readChat').checked,alertVoice:$('alertVoice').checked,
    musicVolume:Number($('musicVolume').value),volume:Number($('musicVolume').value),
    voiceVolume:Number($('voiceVolume').value),voiceRate:Number($('voiceRate').value),
    duckMusic:$('duckMusic').checked,voiceSource:$('voiceSource').value,
    systemVoice:$('systemVoice').value,voiceModel,piperEngine,chosenMusic,
    visualStyle:$('visualStyle').value
  };}
  async function persist(key,value){const raw=JSON.stringify(value);try{localStorage.setItem(key,raw);}catch(_){ }try{await window.desktopStorage?.setItem(key,raw);}catch(e){console.warn('Không lưu được dữ liệu ứng dụng:',e);}}
  async function restore(){
    let native={};try{native=await window.desktopStorage?.readAll()||{};}catch(_){ }
    const get=key=>{let raw=native[key];if(!raw){try{raw=localStorage.getItem(key);}catch(_){ }}try{return JSON.parse(raw||'null');}catch(_){return null;}};
    const previous=get(GAME_KEY);if(previous){game.load(previous);if(previous.version<7)stateDirty=true;}
    const s=get(SETTINGS_KEY)||{};
    $('liveUsername').value=s.username||'';$('autoReconnect').checked=s.autoReconnect!==false;
    $('readChat').checked=s.readChat!==false;$('alertVoice').checked=s.alertVoice!==false;
    $('musicVolume').value=Number.isFinite(s.musicVolume)?s.musicVolume:(Number.isFinite(s.volume)?s.volume:25);
    $('musicVolumeValue').textContent=$('musicVolume').value+'%';
    $('voiceVolume').value=Number.isFinite(s.voiceVolume)?s.voiceVolume:95;
    $('voiceVolumeValue').textContent=$('voiceVolume').value+'%';
    $('voiceRate').value=Number.isFinite(s.voiceRate)?s.voiceRate:95;
    $('voiceRateValue').textContent=(Number($('voiceRate').value)/100).toFixed(2).replace('.',',')+'×';
    $('duckMusic').checked=s.duckMusic!==false;
    $('voiceSource').value=s.voiceSource==='piper'?'piper':'system';
    voiceModel=s.voiceModel?.path?s.voiceModel:null;piperEngine=s.piperEngine?.path?s.piperEngine:null;
    savedSystemVoice=s.systemVoice||'';refreshSystemVoices();updateVoiceOptions();updatePiperLabels();
    chosenMusic=s.chosenMusic?.url?s.chosenMusic:null;
    music.src=chosenMusic?.url||DEFAULT_MUSIC;music.load();updateMusicName();applyMusicVolume();
    $('visualStyle').value=s.visualStyle==='classic'?'classic':'cinematic';updateArtMode($('visualStyle').value);
    $('playMusic').checked=false;updateUI();
  }
  function saveSettings(){settingsDirty=true;}
  async function maybeSave(t){if(t-lastSave<1700)return;lastSave=t;if(stateDirty){stateDirty=false;await persist(GAME_KEY,game.toJSON());}if(settingsDirty){settingsDirty=false;await persist(SETTINGS_KEY,getSettings());}}
  window.addEventListener('beforeunload',()=>{try{localStorage.setItem(GAME_KEY,JSON.stringify(game.toJSON()));localStorage.setItem(SETTINGS_KEY,JSON.stringify(getSettings()));}catch(_){ }stopSpeech();});

  // Ghép các kiểu ID mà TikTok trả lại cho cùng một username với người đang ngồi.
  // Không suy đoán dựa vào nickname vì nickname có thể trùng nhau.
  const liveAliases=new Map();
  const normalizeLiveUsername=value=>String(value||'').replace(/^@/,'').trim().toLowerCase();
  function viewerEvent(e){
    const username=normalizeLiveUsername(e?.username||e?.uniqueId||'');
    const incomingId=String(e?.userId||e?.id||'').trim();
    if(!username)return {...e,userId:incomingId};
    let id=liveAliases.get(username);
    if(!id){
      const existing=[...game.players.values()].find(p=>p.tiktokUsername===username);
      id=existing?.id||(incomingId&&game.getPlayer(incomingId)?incomingId:null)||incomingId||`tt:${username}`;
      liveAliases.set(username,id);
    }
    const p=game.getPlayer(id);
    if(p&&!p.tiktokUsername){p.tiktokUsername=username;stateDirty=true;}
    return {...e,userId:id,username};
  }
  const damageStatusMessage={
    'waiting-boss':'Đang chờ boss (chỉ đánh được khi thanh trạng thái là ĐANG CHIẾN ĐẤU).',
    'battle-ended':'Boss đã bị hạ hoặc hết giờ; chờ boss tiếp theo.',
    'not-battle':'Chưa đến giai đoạn giao chiến.',
    'boss-defeated':'Boss đã hết máu.',
    'no-id':'TikTok chưa gửi ID người xem nên không thể ghi sát thương cá nhân.',
    'no-faction':'Người xem chưa vào phe: bình luận TIÊN hoặc MA.',
    'no-seat':'Phe đã đầy hoặc người xem chưa ở đội hình: tối đa 30 người mỗi phe.',
    'comment-cooldown':'Bình luận quá nhanh; mỗi người gây đòn tối đa một lần mỗi 0,7 giây.'
  };
  let lastCombatReason='';let lastCombatReasonAt=0;
  function setCombatStatus(message,ok=false){
    const el=$('combatStatus');if(!el)return;
    el.textContent=message;el.style.color=ok?'#9ff0bc':'#ffd6a2';
  }
  function explainDamage(kind,payload,result){
    if(kind==='chat'&&result?.ok){
      setCombatStatus(`✓ Đã nhận bình luận của ${payload.name||payload.username||'Đạo hữu'}: +2 Tu Vi. Bình luận không gây sát thương; thả tim mới đánh boss.`,true);
      return;
    }
    if(result?.damage>0){
      const suffix=game.phase==='prep'
        ? `Boss vừa bị hạ và biến mất. Boss tiếp theo xuất hiện sau ${fmt(game.stats().secondsLeft)}.`
        : `Boss còn ${fm(game.bossHp)}/${fm(game.bossMaxHp)} HP.`;
      setCombatStatus(`✓ ${payload.name||payload.username||'Đạo hữu'}: thả tim gây ${fm(result.damage)} sát thương. ${suffix}`,true);
      return;
    }
    const reason=result?.blockReason||(!result?.ok?'no-id':null);
    const message=damageStatusMessage[reason]||'Sự kiện đến nhưng không có sát thương; kiểm tra kết nối và trạng thái boss.';
    setCombatStatus(`Đã nhận ${kind==='chat'?'bình luận':'tim'} · 0 sát thương: ${message}`);
    if(reason!==lastCombatReason||Date.now()-lastCombatReasonAt>6000){log(`⚠ ${message}`);lastCombatReason=reason;lastCombatReasonAt=Date.now();}
  }
  function handleChat(e){
    const incoming=viewerEvent(e);
    const payload={userId:incoming.userId,name:String(incoming.name||incoming.username||'Đạo hữu'),text:String(incoming.text||'')};
    const result=game.chat(payload);
    if(result.ok){
      if(liveConnected){liveStats.chats++;liveStats.lastEventAt=Date.now();}
      if(incoming.username&&result.player&&!result.player.tiktokUsername){result.player.tiktokUsername=incoming.username;stateDirty=true;}
      speak(`Bình luận của ${payload.name}: ${payload.text}`);
      explainDamage('chat',payload,result);
    }else if(result.reason==='no-id')explainDamage('chat',payload,{blockReason:'no-id'});
    return result;
  }
  function handleLike(e){
    const incoming=viewerEvent(e);
    const result=game.like(incoming);
    if(result.ok&&liveConnected){liveStats.likes++;liveStats.heartCount+=result.count||0;liveStats.lastEventAt=Date.now();}
    if(result.ok&&incoming.username&&result.player&&!result.player.tiktokUsername){result.player.tiktokUsername=incoming.username;stateDirty=true;}
    explainDamage('like',incoming,result);
    if(result.damage>0)log(`❤ ${result.player.name} thả tim gây ${fm(result.damage)} sát thương boss.`);
    return result;
  }
  const handleFollow=e=>game.follow(viewerEvent(e));const handleShare=e=>game.share(viewerEvent(e));

  function updateUI(){
    const s=game.stats();$('statActive').textContent=s.active;$('statTien').textContent=s.tien;$('statMa').textContent=s.ma;$('statLikes').textContent=s.likes.toLocaleString('vi-VN');
    $('timerSummary').textContent=fmt(s.secondsLeft);
    $('battleSummary').textContent=s.phase==='prep'?`Vòng ${s.round} · chờ boss ${fmt(s.secondsLeft)} · ${s.boss.name}`:s.phase==='battle'?`Vòng ${s.round} · ${s.boss.name} · ${s.hp}/${s.maxHp}`:'Đang phát thưởng trận chiến';
    const list=$('leaderboard');list.replaceChildren();const ranks=game.ranking(8);
    if(!ranks.length){const li=document.createElement('li');li.textContent='Chưa có người chơi';list.append(li);}else ranks.forEach((p,i)=>{const li=document.createElement('li'),name=document.createElement('span'),score=document.createElement('span');name.textContent=`${i+1}. ${p.name.slice(0,18)} · ${realmFor(p.xp,p.presenceMs).name}`;score.textContent=fXp(p.xp);li.append(name,score);list.append(li);});
    const select=$('questPlayer'),prev=select.value;const ids=[...game.players.keys()];
    if(ids.length!==select.options.length-1||ids.some((id,i)=>select.options[i+1]?.value!==id)){
      select.replaceChildren(new Option('Chọn một tu sĩ',''));
      for(const p of game.players.values())select.add(new Option(`${p.name} · ${fXp(p.xp)} tu vi`,p.id));
      select.value=ids.includes(prev)?prev:(ids.includes(selectedId)?selectedId:(ranks[0]?.id||''));
    }else for(let i=0;i<ids.length;i++){const p=game.getPlayer(ids[i]);select.options[i+1].textContent=`${p.name} · ${fXp(p.xp)} tu vi`;}
    selectedId=select.value;const p=game.getPlayer(selectedId);const questBox=$('dailyQuests');questBox.replaceChildren();
    if(p){const level=realmFor(p.xp,p.presenceMs);$('playerSummary').textContent=`${p.name} · ${level.name} (${level.group}) · ${fXp(p.xp)} Tu Vi · Đã tham chiến ${Math.floor((p.presenceMs||0)/60000)} phút${level.nextAt!==null?` · Cấp kế: ${level.nextAt} điểm + ${level.nextMinutes} phút (còn ${fXp(Math.max(0,level.nextAt-p.xp))} điểm, ${Math.max(0,level.nextMinutes-Math.floor((p.presenceMs||0)/60000))} phút)`:' · Đỉnh phong'}`;
      for(const q of QUESTS){const progress=Math.min(q.target,Number(p.daily.progress[q.id])||0);const done=p.daily.claimed.includes(q.id);const box=document.createElement('div');box.className='quest'+(done?' finished':'');
        const label=document.createElement('div'),title=document.createElement('b'),sub=document.createElement('span'),reward=document.createElement('div'),bar=document.createElement('div'),fill=document.createElement('div');
        title.textContent=q.title;sub.textContent=`${progress}/${q.target} · đặt lại mỗi ngày`;label.append(title,sub);reward.className='reward';reward.textContent=done?'✓ Đã nhận':`+${q.reward}`;bar.className='bar';fill.style.width=`${progress/q.target*100}%`;bar.append(fill);box.append(label,reward,bar);questBox.append(box);}
    }else $('playerSummary').textContent='Người mới bắt đầu ở Phàm Nhân (0 tu vi).';
    const table=$('realmTable');if(!table.children.length){REALMS.forEach((r,i)=>{const row=document.createElement('div');row.className='realm-row';const name=document.createElement('span'),points=document.createElement('b');name.textContent=`${i===0?'◇':'✦'} ${r.name} · ${r.group}`;points.textContent=`${r.at} điểm · ${r.minutes} phút`;row.append(name,points);table.append(row);});}
    updateAdvancedUI(s,p);
  }
  function updateAdvancedUI(s,p){
    const progress=$('realmProgress');if(p){const lv=realmIndex(p.xp,p.presenceMs||0);
      if(lv>=8){progress.textContent=`${p.name}: Độ Kiếp Kỳ đỉnh phong · ${fXp(p.xp)} Tu Vi · ${Math.floor((p.presenceMs||0)/60000)} phút`;}
      else{const r=REALMS[lv+1],prev=REALMS[lv],xpRatio=clamp01((p.xp-prev.at)/Math.max(1,r.at-prev.at)),min=Math.floor((p.presenceMs||0)/60000),timeRatio=clamp01((min-prev.minutes)/Math.max(1,r.minutes-prev.minutes));
        progress.replaceChildren();const head=document.createElement('b');head.textContent=`${p.name} → ${r.name}`;progress.append(head);
        for(const [label,value,ratio,klass] of [[`Tu Vi: ${fXp(p.xp)} / ${r.at}`,xpRatio,'xp'],[`Thời gian: ${min} / ${r.minutes} phút`,timeRatio,'time']]){
          const line=document.createElement('div');line.style.marginTop='7px';line.textContent=label;
          const bar=document.createElement('div');bar.className='upgrade-bar '+klass;const fill=document.createElement('span');fill.style.width=`${Math.round(100*ratio)}%`;bar.append(fill);progress.append(line,bar);}
      }}else progress.textContent='Chọn một tu sĩ trong bảng Nhiệm vụ để xem hai điều kiện đột phá.';
    for(const kind of ['robe','artifact','pet']){
      const select=$(`${kind}Equip`);if(!select)continue;
      const possible=p?game.availableGear(p,kind):GEAR.filter(g=>g.kind===kind&&g.realm===0);
      const signature=possible.map(g=>g.id).join('|');
      if(select.dataset.options!==signature){select.replaceChildren();for(const g of possible)select.add(new Option(`${g.name} · cấp ${REALMS[g.realm].name}`,g.id));select.dataset.options=signature;select.dataset.player='';}
      const equipped=p?.equipment?.[kind]|| (kind==='robe'?'basic':'none');
      if(select.dataset.player!==p?.id){select.value=possible.some(g=>g.id===equipped)?equipped:possible[0]?.id||'';select.dataset.player=p?.id||'';}
    }
    const weekly=$('weeklyRanking');if(weekly){weekly.replaceChildren();
      for(const [key,label,unit] of [['xp','Tu Vi tuần','TV'],['likes','Tim tuần','❤'],['damage','Sát thương tuần','DMG'],['presenceMs','Thời gian tuần','phút']]){
        const section=document.createElement('section');const title=document.createElement('h3');title.textContent=label;section.append(title);
        const rankings=game.weeklyRanking(key,5);if(!rankings.length){const line=document.createElement('p');line.textContent='Chưa có thành tích';section.append(line);}else rankings.forEach((entry,i)=>{const line=document.createElement('p');const value=key==='presenceMs'?Math.floor(entry.week[key]/60000):entry.week[key];line.textContent=`${i+1}. ${entry.name.slice(0,12)} · ${fXp(value)} ${unit}`;section.append(line);});weekly.append(section);
      }
    }
    const duel=$('duelStatus'),duelScores=$('duelScores');if(s.duel?.active){duel.textContent=`⚔ ĐẠI CHIẾN ĐANG DIỄN RA · còn ${fmt(Math.max(0,Math.ceil((s.duel.endsAt-Date.now())/1000)))} · +15 TV cho phe thắng`;
      duelScores.textContent=`TIÊN ĐẠO ❤ ${fm(s.duel.scores.tien)}      VS      MA ĐẠO ❤ ${fm(s.duel.scores.ma)}`;}
    else{duel.textContent=`Đại chiến kế tiếp trong ${fmt(s.nextDuelIn)} · 60 giây đua tim ở giai đoạn chờ boss`;
      const result=game.lastDuelResult;duelScores.textContent=result?`Trận gần nhất: Tiên ${fm(result.scores.tien)} · Ma ${fm(result.scores.ma)} tim`:'Sự kiện đầu tiên sau 30 phút tham gia LIVE';}
    const health=$('liveHealth');if(health){const age=liveStats.lastEventAt?Math.floor((Date.now()-liveStats.lastEventAt)/1000):null;
      health.textContent=`Kết nối: ${liveStats.lastStatus}\nBình luận LIVE đã nhận: ${liveStats.chats}\nSự kiện tim đã nhận: ${liveStats.likes} · ${fm(liveStats.heartCount)} tim\nSự kiện cuối: ${age===null?'chưa có':age+' giây trước'}\nTrạng thái boss: ${s.phase==='battle'?'chiến đấu':'đang chờ'} · ${fm(s.hp)}/${fm(s.maxHp)} HP`;
    }
  }


  const fXp=n=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:1});
  const clamp01=x=>Math.max(0,Math.min(1,x));const smooth=x=>{const t=clamp01(x);return t*t*(3-2*t);};const fm=n=>Math.round(n).toLocaleString('vi-VN');
  function fmt(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
  function box(x,y,w,h,fill,stroke=null,r=9){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=1.6;ctx.strokeStyle=stroke;ctx.stroke();}}
  function text(s,x,y,size=15,color='#f6e5bc',align='center',weight=700,maxWidth=1000){ctx.font=`${weight} ${size}px "Segoe UI", Arial, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(String(s),x,y,maxWidth);}
  function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,2*Math.PI);ctx.fillStyle=fill;ctx.fill();}
  function drawImg(name,x,y,w,h,alpha=1){if(!ready(name))return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(images[name],x,y,w,h);ctx.restore();}
  // V2.1.2: 60 tu sĩ = 6 hàng x 10 (5 Tiên + 5 Ma); dành đủ không gian hiển thị.
  function getSeatPos(seat){
    const row=Math.floor(seat/10), col=seat%10;
    const local=col<5?col:col-5;
    const x=(col<5?42:422)+local*64;
    return {x,y:920+row*55,h:80+row*1.3,row};
  }
  function aura(x,y,h,level,t,faction,hero=false){
    if(level<=0)return;const tiers=['','#4dd7ff','#4cdfff','#a788ff','#d28aff','#ffc46b','#ffae67','#ffe6ac','#ffffff'];const color=tiers[level];const radius=(hero?90:30)*(1+level*.085);const cy=y-h*.52;
    ctx.save();ctx.globalCompositeOperation='screen';const grad=ctx.createRadialGradient(x,cy,2,x,cy,radius);const alpha=(.08+level*.041)*(.85+.15*Math.sin(t*.003+x));
    grad.addColorStop(0,`${color}${Math.round(alpha*255).toString(16).padStart(2,'0')}`);grad.addColorStop(.45,`${color}${Math.round(alpha*.45*255).toString(16).padStart(2,'0')}`);grad.addColorStop(1,`${color}00`);ellipse(x,cy,radius,radius*1.18,grad);
    const rings=level<=2?1:level<=5?2:3;for(let i=0;i<rings;i++){ctx.save();ctx.translate(x,cy);ctx.rotate(t*.00022*(i%2?-1:1)+i*.46);ctx.strokeStyle=color;ctx.globalAlpha=(.10+.02*level)/(i+1);ctx.lineWidth=hero?4:1.3;ctx.beginPath();ctx.ellipse(0,0,radius*(.62+i*.17),radius*(.98-i*.07),.07,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(level>=4)for(let k=0;k<level*2;k++){const a=k*2.4+t*.001*(k%2?-1:1);const rr=radius*(.48+(.32*((k*7)%9)/9));ellipse(x+Math.cos(a)*rr,cy+Math.sin(a)*rr*.9,hero?2.5:1.15,hero?2.5:1.15,color);}if(level===8)for(let k=0;k<6;k++){const a=k*Math.PI/3+t*.00035;const xx=x+Math.cos(a)*radius*.9,yy=cy+Math.sin(a)*radius;ctx.strokeStyle='#fff9d6';ctx.lineWidth=hero?2.6:1.1;ctx.globalAlpha=.40+.20*Math.sin(t*.004+k);ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+12*(hero?2:1),yy-12*(hero?2:1));ctx.lineTo(xx-4,yy-19*(hero?2:1));ctx.stroke();}
    ctx.restore();
  }
  // Linh thú và pháp bảo thuần thẩm mỹ; không can thiệp game.like / damageBoss.
  function drawPet(p,pos,t,zoomHero){
    const kind=p.equipment?.pet;if(!kind||kind==='none')return;
    const lv=realmIndex(p.xp,p.presenceMs||0);const minimum={fox:2,crane:4,dragon:6};if(lv<(minimum[kind]||99))return;
    const size=zoomHero?31:10,px=pos.x+(zoomHero?102:pos.h*.38),py=pos.y-(zoomHero?112:pos.h*.46)+Math.sin(t*.004+(p.seat||0))*3;
    ctx.save();ctx.shadowBlur=zoomHero?22:8;ctx.shadowColor=kind==='dragon'?'#5bffdc':kind==='crane'?'#ffe3a4':'#d0e9ff';
    const color=kind==='dragon'?'#6cebd5':kind==='crane'?'#fff0c7':'#e2e9ff';
    if(kind==='fox'){ellipse(px,py,size*.8,size*.66,color);for(const side of [-1,1]){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(px+side*size*.35,py-size*.3);ctx.lineTo(px+side*size*.7,py-size*1.1);ctx.lineTo(px,py-size*.6);ctx.fill();}ellipse(px+size*.78,py+size*.2,size*.8,size*.26,'#9bd7ff');}
    else if(kind==='crane'){ellipse(px,py,size*.45,size*.86,color);ctx.beginPath();ctx.moveTo(px-size*1.2,py-size*.2);ctx.lineTo(px,py);ctx.lineTo(px+size*1.2,py-size*.2);ctx.strokeStyle=color;ctx.lineWidth=zoomHero?5:2;ctx.stroke();ellipse(px+size*.2,py-size*.8,size*.19,size*.21,'#ffc878');}
    else {ctx.strokeStyle=color;ctx.lineWidth=zoomHero?7:3;ctx.beginPath();ctx.moveTo(px-size,py+size*.3);ctx.quadraticCurveTo(px+size,py+size*.2,px,py-size*.85);ctx.stroke();ellipse(px,py-size*.7,size*.36,size*.26,color);ellipse(px+size*.25,py-size*.78,size*.08,size*.08,'#fff1a2');}
    ctx.restore();
  }
  function drawEquipment(p,pos,t,zoomHero){const robe=p.equipment?.robe||'basic',artifact=p.equipment?.artifact||'none';
    const lv=realmIndex(p.xp,p.presenceMs||0);const cy=pos.y,h=zoomHero?290:pos.h;
    if(robe!=='basic'&&lv>=(robe==='cloud'?1:robe==='phoenix'?4:7)){
      const color=robe==='cloud'?'#8de9ff':robe==='phoenix'?'#ffb768':'#d6aaff';
      ctx.save();ctx.globalAlpha=.72;ctx.shadowBlur=zoomHero?26:7;ctx.shadowColor=color;ctx.strokeStyle=color;ctx.lineWidth=zoomHero?3.5:1.2;
      ctx.beginPath();ctx.moveTo(pos.x-h*.14,cy-h*.55);ctx.quadraticCurveTo(pos.x-h*.25,cy-h*.12,pos.x-h*.17,cy-h*.04);ctx.moveTo(pos.x+h*.14,cy-h*.55);ctx.quadraticCurveTo(pos.x+h*.26,cy-h*.12,pos.x+h*.17,cy-h*.04);ctx.stroke();ctx.restore();}
    if(artifact!=='none'&&lv>=(artifact==='jade'?1:artifact==='sword'?3:6)){
      const color=artifact==='jade'?'#75ffd8':artifact==='sword'?'#c2eaff':'#ffd88e';
      const ax=pos.x+h*.27,ay=cy-h*.39;ctx.save();ctx.shadowBlur=zoomHero?20:7;ctx.shadowColor=color;ctx.strokeStyle=color;ctx.lineWidth=zoomHero?3:1.5;
      if(artifact==='sword'){ctx.beginPath();ctx.moveTo(ax-h*.1,ay+h*.2);ctx.lineTo(ax+h*.1,ay-h*.18);ctx.moveTo(ax-h*.12,ay+h*.1);ctx.lineTo(ax+h*.05,ay+h*.15);ctx.stroke();}
      else if(artifact==='seal'){ctx.strokeRect(ax-h*.11,ay-h*.11,h*.22,h*.22);ctx.beginPath();ctx.arc(ax,ay,h*.07,0,2*Math.PI);ctx.stroke();}
      else{ellipse(ax,ay,h*.095,h*.14,color);}ctx.restore();}
    drawPet(p,pos,t,zoomHero);
  }
  function character(p,pos,t,zoomHero=false){const lv=realmIndex(p.xp,p.presenceMs),w=zoomHero?(artMode==='classic'?210:236):pos.h*(artMode==='classic'?.82:.92),h=zoomHero?290:pos.h,cy=zoomHero?pos.y+12:pos.y;ctx.save();ellipse(pos.x,cy+2,zoomHero?77:pos.h*.28,zoomHero?14:pos.h*.095,'rgba(4,7,26,.67)');const dy=Math.sin(t*.0017+(p.seat||0)*.83)*(zoomHero?2:.7);aura(pos.x,cy+dy,h,lv,t,p.faction||'tien',zoomHero);if(!zoomHero&&p.lastHitAt&&Date.now()-p.lastHitAt<680){ctx.save();ctx.globalCompositeOperation='screen';const c=p.faction==='tien'?'#b3eeff':'#ebacff';const pulse=.6+.4*Math.sin(t*.022);ellipse(pos.x,cy-h*.54,h*.46,h*.47,c+'44');ctx.strokeStyle=c;ctx.globalAlpha=.65*pulse;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(pos.x,cy-h*.52,h*.32,-.7,1.65);ctx.stroke();ctx.restore();}drawImg(`${p.faction||'tien'}_${lv}`,pos.x-w/2,cy-h+dy,w,h);drawEquipment(p,{x:pos.x,y:cy},t,zoomHero);ctx.restore();}

  function drawBackground(t){
    if(ready('back'))drawImg('back',0,0,W,H);else{const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0b1a38');sky.addColorStop(.5,'#162b59');sky.addColorStop(1,'#090d1a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);}const veil=ctx.createLinearGradient(0,0,0,H);veil.addColorStop(0,'rgba(7,13,37,.34)');veil.addColorStop(.42,'rgba(9,20,39,.23)');veil.addColorStop(1,'rgba(5,8,23,.55)');ctx.fillStyle=veil;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalCompositeOperation='screen';const moon=ctx.createRadialGradient(565,78,4,565,78,92);moon.addColorStop(0,'rgba(255,249,211,.92)');moon.addColorStop(.35,'rgba(221,228,255,.42)');moon.addColorStop(1,'rgba(221,228,255,0)');ellipse(565,78,90,90,moon);for(let i=0;i<26;i++){const yy=(i*61+1280-(t*.02)%1360)%1360,x=(i*43)%W+Math.sin(t*.0005+i)*14;ellipse(x,yy,1.6+(i%3)*.7,1.6+(i%3)*.7,i%2?'rgba(126,220,255,.34)':'rgba(255,208,147,.24)');}const leftAura=ctx.createRadialGradient(185,1020,20,185,1020,330);leftAura.addColorStop(0,'rgba(87,204,255,.18)');leftAura.addColorStop(1,'rgba(87,204,255,0)');ellipse(185,1020,330,200,leftAura);const rightAura=ctx.createRadialGradient(535,1020,20,535,1020,330);rightAura.addColorStop(0,'rgba(219,107,255,.16)');rightAura.addColorStop(1,'rgba(219,107,255,0)');ellipse(535,1020,330,200,rightAura);ctx.restore();
  }
  function drawBoss(t,s){
    if(s.phase!=='battle')return; // Trong 5 phút chuẩn bị chỉ hiện nền Bồng Lai, KHÔNG vẽ boss.
    const b=s.boss,cx=360,cy=425,bob=Math.sin(t*.0022)*7,hit=game.lastHit;
    const attacked=hit&&hit.faction!=='boss'&&Date.now()-hit.at<350;
    const tremor=attacked?Math.sin(t*.11)*3:0;
    const core=ctx.createRadialGradient(cx,cy,3,cx,cy,220);
    core.addColorStop(0,b.color+'77');core.addColorStop(.43,b.color+'2c');core.addColorStop(1,b.color+'00');ellipse(cx,cy,214,206,core);
    // Pháp trận huyền ảo, lõi đồng tâm và phù văn xoay, không có logo hoạt hình.
    ctx.save();ctx.translate(cx,cy+108);ctx.rotate(t*.00015);
    for(let i=0;i<4;i++){ctx.strokeStyle=i%2?b.color:'#f7d7a4';ctx.globalAlpha=.19-i*.022;ctx.lineWidth=2.8-i*.3;
      ctx.beginPath();ctx.ellipse(0,0,132+i*23,44+i*8,i*.14,0,Math.PI*2);ctx.stroke();}
    for(let k=0;k<18;k++){const a=k*Math.PI/9+t*.00014;const x1=Math.cos(a)*142,y1=Math.sin(a)*46;ctx.globalAlpha=.38;
      ctx.strokeStyle=b.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(Math.cos(a)*156,Math.sin(a)*52);ctx.stroke();}
    ctx.restore();
    const morphScale=s.bossStage===2?1.13:s.bossStage===1?1.06:1;
    const w=(b.id==='qilin'?360:312)*morphScale,h=(b.id==='qilin'?404:335)*morphScale;
    ctx.save();ctx.translate(tremor,0);
    if(artMode==='cinematic'){ctx.shadowColor=b.color;ctx.shadowBlur=22;ctx.filter=s.bossStage===2?'contrast(1.3) saturate(1.35) hue-rotate(-18deg) brightness(1.15) drop-shadow(0px 0px 24px rgba(255,51,66,.8))':s.bossStage===1?'contrast(1.25) saturate(1.15) brightness(1.1) drop-shadow(0px 0px 22px rgba(255,208,102,.7))':'contrast(1.17) saturate(.98) drop-shadow(0px 12px 12px rgba(2,5,20,.75))';}
    if(ready('boss_'+b.id)){
      drawImg('boss_'+b.id,cx-w/2,cy-h*.58+bob,w,h,s.phase==='result'?.60:1);
    }else if(images['boss_'+b.id]?.complete){
      box(cx-137,cy-45,274,90,'rgba(29,13,23,.93)','rgba(255,167,139,.70)',12);
      text('THIẾU ẢNH BOSS',cx,cy-12,19,'#ffc4ae');
      text('Chép lại assets/cinematic/bosses_v214',cx,cy+18,10,'#f2dcbd');
    }
    ctx.restore();
    if(attacked){ctx.save();ctx.globalCompositeOperation='screen';const flash=1-Math.min(1,(Date.now()-hit.at)/350);
      ellipse(cx,cy,65+80*(1-flash),70+80*(1-flash),`rgba(255,242,194,${(.29*flash).toFixed(3)})`);ctx.restore();}
    if(s.bossStage>0){ctx.save();ctx.globalCompositeOperation='screen';const enraged=s.bossStage>=2;
      ctx.strokeStyle=enraged?'#ff6378':'#ffe08e';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=enraged?45:25;
      for(let i=0;i<(enraged?8:4);i++){const angle=i*Math.PI/(enraged?4:2)+t*.0007*(i%2?-1:1),r=155+18*Math.sin(t*.003+i);
        ctx.lineWidth=enraged?4.2:2.3;ctx.globalAlpha=.22+.22*Math.sin(t*.005+i)**2;
        ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r*.9);
        ctx.lineTo(cx+Math.cos(angle+.36)*(r+42),cy+Math.sin(angle+.36)*(r+40)*.8);ctx.stroke();}
      ctx.restore();
      if(enraged){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.12+.055*Math.sin(t*.009);ctx.fillStyle='#ea2235';ctx.fillRect(194,220,334,445);ctx.restore();}
    }
  }
  function drawPlayers(t){
    const active=game.activePlayers().sort((a,b)=>a.seat-b.seat);
    for(const p of active){const pos=getSeatPos(p.seat);
      const c=p.faction==='ma'?'rgba(215,124,255,.28)':'rgba(119,220,255,.27)';
      ctx.save();ctx.globalCompositeOperation='screen';const r=pos.h*.32;
      const g=ctx.createRadialGradient(pos.x,pos.y+4,2,pos.x,pos.y+4,r);
      g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');ellipse(pos.x,pos.y+5,r,r*.32,g);
      ctx.strokeStyle=p.faction==='ma'?'rgba(230,151,255,.58)':'rgba(121,219,255,.55)';ctx.lineWidth=1.25;
      ctx.beginPath();ctx.ellipse(pos.x,pos.y+7,r,r*.16,0,0,2*Math.PI);ctx.stroke();ctx.restore();
      character(p,pos,t,false);
    }
    // Draw labels in a second pass over sprite images; each has name + current realm.
    for(const p of active){
      const pos=getSeatPos(p.seat),lv=realmIndex(p.xp,p.presenceMs),name=p.name.length>9?p.name.slice(0,8)+'…':p.name;
      const rank=REALMS[lv].name.replace(' Kỳ','');const y=pos.y-pos.h*.32;
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
      ctx.font='bold 9.4px "Segoe UI",Arial,sans-serif';ctx.strokeStyle='rgba(3,8,24,.99)';ctx.lineWidth=3.8;
      ctx.strokeText(name,pos.x,y-4,58);ctx.fillStyle='#fff4df';ctx.fillText(name,pos.x,y-4,58);
      ctx.font='bold 8.6px "Segoe UI",Arial,sans-serif';ctx.strokeText(rank,pos.x,y+9,58);
      ctx.fillStyle=lv===0?'#d2dfeb':p.faction==='tien'?'#9cecff':'#f4b0ff';ctx.fillText(rank,pos.x,y+9,58);
      ctx.restore();
      // Thanh xanh = Tu Vi; thanh tím = phút tham chiến. Dùng các mốc liền kề để giữ chữ rõ trên 60 ô.
      if(lv<8){const last=REALMS[lv],next=REALMS[lv+1];const xp=clamp01((p.xp-last.at)/(next.at-last.at)),minutes=clamp01(((p.presenceMs||0)/60000-last.minutes)/(next.minutes-last.minutes));
        const bx=pos.x-22,by=y+18;box(bx,by,44,3.3,'rgba(8,13,24,.85)',null,1.6);if(xp>0)box(bx,by,44*xp,3.3,'#5cf3db',null,1.6);
        box(bx,by+5,44,3.3,'rgba(8,13,24,.85)',null,1.6);if(minutes>0)box(bx,by+5,44*minutes,3.3,'#deabff',null,1.6);
      }
    }
    const haze=ctx.createLinearGradient(0,1190,0,1280);haze.addColorStop(0,'rgba(7,12,28,0)');haze.addColorStop(1,'rgba(3,7,18,.43)');ctx.fillStyle=haze;ctx.fillRect(0,1190,720,90);
  }
  // Pháp thuật xuất hiện khi người xem thả tim/gây dame trong trận đánh;
  // Boss trả đòn 6 giây/lần, có đường đạn, đốm sáng, vòng xung kích và lóe khiên.
  // V2.1.3: pháp thuật nhiều lớp và số sát thương; boss phản công bằng thiên lôi/vòng xung kích.
  function drawCombatFx(t){
    const ease=x=>1-Math.pow(1-clamp01(x),3);
    const line=(pts,color,width,blur=0)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))ctx.lineTo(p[0],p[1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.stroke();};
    for(let i=combatFx.length-1;i>=0;i--){
      const fx=combatFx[i],age=t-fx.start,life=fx.type==='boss'?2350:1850;
      if(age>=life){combatFx.splice(i,1);continue;}
      const p=clamp01(age/life),opacity=Math.min(1,p*9,(1-p)*3.7);
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=opacity;
      if(fx.type==='cultivator'){
        if(!Number.isInteger(fx.seat)||fx.seat<0||fx.seat>=60){ctx.restore();continue;}
        const pos=getSeatPos(fx.seat),start={x:pos.x,y:pos.y-pos.h*.77},end={x:360+Math.sin(fx.seat)*30,y:420};
        const side=fx.faction==='ma'?1:-1;
        const bend={x:360+side*120,y:695};
        const curve=q=>({x:(1-q)**2*start.x+2*(1-q)*q*bend.x+q*q*end.x,y:(1-q)**2*start.y+2*(1-q)*q*bend.y+q*q*end.y});
        const q=ease(Math.min(1,p*1.25)),lead=curve(q),tail=Math.max(0,q-.23);
        const skill=Math.max(0,Math.min(8,fx.level||0));
        const spellColors=['#8fd6ff','#4ddfff','#ffac67','#bca0ff','#8fe8ff','#eec16e','#f5a9ff','#ffd9a6','#fffad4'];
        const color=skill>=2?spellColors[skill]:(fx.faction==='ma'?'#e75dff':'#44dbff');
        const pts=Array.from({length:15},(_,k)=>{const z=tail+(q-tail)*k/14;const v=curve(z);return[v.x+Math.sin(z*28+fx.seat)*Math.sin(Math.PI*(k/14))*6,v.y];});
        line(pts,color,21,22);line(pts,'#fffbeb',6,15);line(pts,'#ffffff',2.3,5);
        // Cấp cảnh giới mở thêm hình thái kiếm khí / hỏa cầu / kiếm trận / thiên lôi / phù ấn.
        if(skill>=1){ctx.save();ctx.translate(lead.x,lead.y);ctx.rotate(Math.atan2(end.y-start.y,end.x-start.x)+Math.PI/2);
          ctx.strokeStyle='#fff8e0';ctx.lineWidth=2+skill*.18;ctx.beginPath();ctx.moveTo(0,-10-skill*2);ctx.lineTo(5+skill*.5,5);ctx.lineTo(0,11);ctx.lineTo(-5-skill*.5,5);ctx.closePath();ctx.stroke();ctx.restore();}
        if(skill>=2)for(let k=0;k<Math.min(skill+1,7);k++){const a=k*Math.PI*2/Math.min(skill+1,7)+age*.005;
          const rr=18+skill*4;ellipse(lead.x+Math.cos(a)*rr,lead.y+Math.sin(a)*rr,2.5+skill*.45,2.5+skill*.45,skill===2?'#ff9854':color);}
        if(skill>=3){ctx.strokeStyle=color;ctx.lineWidth=1.3+skill*.2;ctx.beginPath();ctx.arc(lead.x,lead.y,22+skill*6,0,Math.PI*1.7);ctx.stroke();}
        if(skill>=4){ctx.strokeStyle='#edfaff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lead.x-23,lead.y-17);ctx.lineTo(lead.x-7,lead.y+5);ctx.lineTo(lead.x+7,lead.y-15);ctx.lineTo(lead.x+21,lead.y+17);ctx.stroke();}
        if(skill>=6){ctx.save();ctx.translate(lead.x,lead.y);ctx.rotate(age*.004);ctx.strokeStyle=color;ctx.lineWidth=2;
          ctx.strokeRect(-18-skill*3,-18-skill*3,36+skill*6,36+skill*6);ctx.restore();}

        ctx.shadowBlur=22;ellipse(lead.x,lead.y,12+5*Math.sin(age*.03),12+5*Math.sin(age*.03),color);
        ellipse(lead.x,lead.y,6,6,'#fffef4');
        for(let j=0;j<13;j++){const a=j*2.4+age*.009+fx.seat,r=15+(j%5)*7;
          ellipse(lead.x+Math.cos(a)*r,lead.y+Math.sin(a)*r,2+(j%3),2+(j%3),j%3===0?'#fffde9':color);}
        if(q>=.88){const expand=clamp01((q-.88)/.12);ctx.strokeStyle='#fff7bf';ctx.lineWidth=6*(1-expand);ctx.shadowBlur=30;ctx.beginPath();ctx.arc(end.x,end.y,16+100*expand,0,Math.PI*2);ctx.stroke();}
        // Number floats up from the struck boss; display only measured damage.
        if(p>.48){ctx.save();ctx.globalAlpha=opacity*(1-clamp01((p-.85)/.15));ctx.font='bold 22px Georgia, serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#160c24';ctx.strokeText('-'+fm(fx.damage),end.x+30,end.y-45-(p-.48)*110);ctx.fillStyle='#fff1a0';ctx.fillText('-'+fm(fx.damage),end.x+30,end.y-45-(p-.48)*110);ctx.restore();}
      }else{
        const q=ease(Math.min(1,p*1.22)),start=[360,419];
        // Cross-field crimson shockwave and lightning, separate visible impact on each faction.
        for(const [j,tx,ty,col] of [[0,172,1045,'#57ceff'],[1,545,1045,'#dc77ff']]){
          const xx=start[0]+(tx-start[0])*q,yy=start[1]+(ty-start[1])*q;
          const points=[[...start]];for(let k=1;k<=16;k++){const w=k/16*q;points.push([start[0]+(tx-start[0])*w+Math.sin(k*6.9+j+age*.014)*19*w,start[1]+(ty-start[1])*w]);}
          line(points,'#ff743d',23,29);line(points,'#fff0af',8,24);line(points,'#ffffff',3,9);
          ellipse(xx,yy,14,14,'#ffdbad');
          if(q>.82){const e=clamp01((q-.82)/.18);ctx.strokeStyle=col;ctx.lineWidth=9*(1-e);ctx.shadowColor=col;ctx.shadowBlur=38;
            ctx.beginPath();ctx.ellipse(tx,ty,18+145*e,8+45*e,0,0,Math.PI*2);ctx.stroke();
            for(let j2=0;j2<10;j2++){const a=j2*.628+age*.011,rr=20+92*e;ellipse(tx+Math.cos(a)*rr,ty+Math.sin(a)*rr*.38,5*(1-e)+1,5*(1-e)+1,col);}}
        }
        if(p>.17&&p<.72){ctx.save();ctx.globalAlpha=opacity*.4;const flash=ctx.createRadialGradient(360,420,0,360,420,230);flash.addColorStop(0,'rgba(255,204,140,.76)');flash.addColorStop(1,'rgba(251,95,60,0)');ellipse(360,420,230,230,flash);ctx.restore();}
      }
      ctx.restore();
    }
  }
  // V2.1.1: Bỏ HỘP GIAO DIỆN GIẢ ở hai góc (LIVE/eye/settings). Mọi điều khiển thật
  // vẫn đầy đủ tại cửa sổ Studio, không xóa sự kiện hoặc dữ liệu.
  function titleText(value,x,y,size,color='#ffe6ac'){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${size}px Georgia, "Times New Roman", serif`;
    ctx.lineWidth=3;ctx.strokeStyle='rgba(18,12,20,.9)';ctx.shadowColor='rgba(255,181,92,.52)';ctx.shadowBlur=13;
    ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);ctx.restore();
  }
  function drawTop(t,s){
    // Giữ toàn bộ số liệu trong khu boss / panels; không có nút giả đè lên nền tiên giới.
    const b=s.boss;
    titleText('NGHỊCH THIÊN TU LUYỆN',360,43,29);
    text('TIÊN MA SONG ĐẠO  ·  TRẬN CHIẾN CẢNH GIỚI',360,77,12,'#e8d4c2');
    box(194,105,333,80,'rgba(23,12,28,.88)','rgba(247,190,118,.6)',12);
    text(s.phase==='prep'?'ĐANG CHỜ BOSS - TU LUYỆN':s.phase==='battle'?'ĐANG CHIẾN ĐẤU':'KẾT THÚC TRẬN',344,122,11,'#ffe4a4');
    titleText(s.phase==='prep'?'Sắp đến: '+b.name:b.name,356,143,s.phase==='prep'?15:19,'#fff0d4');
    if(s.phase==='battle'){
      box(207,162,304,12,'rgba(20,16,29,.96)',null,7);
      const hp=Math.max(0,Math.min(1,s.hp/s.maxHp));
      if(hp>0){ctx.save();ctx.beginPath();ctx.roundRect(207,162,304*hp,12,6);const grad=ctx.createLinearGradient(207,0,511,0);grad.addColorStop(0,'#e64743');grad.addColorStop(.58,'#fd8e57');grad.addColorStop(1,'#ffe091');ctx.fillStyle=grad;ctx.fill();ctx.restore();}
      text(`${fm(s.hp)} / ${fm(s.maxHp)}  ·  ${Math.round(hp*100)}%${s.bossStage===2?' · CUỒNG NỘ':s.bossStage===1?' · THỨC TỈNH':''}`,360,168,9,'#fff0df');
    }else{
      text(s.secondsLeft<=60?'⚠ THIÊN ĐỊA BIẾN ĐỘNG · BOSS SẮP ĐẾN!':'Chưa có boss · Bình luận chọn phe và tích lũy Tu Vi',360,169,10,'#d6e9fa');
    }
    box(551,110,153,75,'rgba(17,18,35,.90)','rgba(243,198,119,.46)',12);
    text(s.phase==='prep'?'BOSS ĐẾN SAU':'THỜI GIAN ĐÁNH',628,131,12,'#ffdcaa');
    titleText(fmt(s.secondsLeft),628,163,27,'#ffe0a1');
    box(194,195,334,33,'rgba(9,23,44,.89)','rgba(255,218,135,.70)',9);
    text('💬 COMMENT "TIÊN" HOẶC "MA" ĐỂ GIA NHẬP PHE',361,211,13,'#fff0c7','center',800,312);
    text('Bình luận +2 Tu Vi · Chỉ tim đánh boss · 1 tim = 1 sát thương',360,244,11,'#d5efff','center',600,335);
  }
  function panel(x,y,w,h,title){
    const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'rgba(12,21,40,.94)');g.addColorStop(1,'rgba(14,19,39,.91)');
    box(x,y,w,h,g,'rgba(242,202,128,.59)',10);
    box(x+5,y+6,w-10,30,'rgba(109,72,39,.50)',null,7);
    text(title,x+w/2,y+21,12,'#ffdfa1');
    ctx.save();ctx.strokeStyle='rgba(246,200,120,.32)';ctx.lineWidth=1;
    for(const [px,py,sgx,sgy] of [[x+8,y+8,1,1],[x+w-8,y+8,-1,1],[x+8,y+h-8,1,-1],[x+w-8,y+h-8,-1,-1]]){
      ctx.beginPath();ctx.moveTo(px+sgx*12,py);ctx.lineTo(px,py);ctx.lineTo(px,py+sgy*12);ctx.stroke();}
    ctx.restore();
  }
  function drawPanels(s){
    // Các bảng nằm TRỌN VẸN phía trên đường y=836; tu sĩ bắt đầu từ y>=860.
    const left=14,right=535,w=171;
    const best=game.ranking(1)[0];
    panel(left,104,w,143,'THÔNG TIN TU SĨ');
    if(best){
      drawImg(`${best.faction||'tien'}_${realmIndex(best.xp,best.presenceMs)}`,23,151,49,56,.98);
      text(best.name.slice(0,14),123,161,15,'#ffedc7','center',700,104);
      text('Cảnh giới: '+realmFor(best.xp,best.presenceMs).name,120,186,10,'#d7e6f5','center',600,112);
      text('Tu vi: '+fXp(best.xp),120,211,12,'#ffd6a2');
    }else{
      text('Chưa có tu sĩ',99,169,12,'#d6e6fa');
      text('Bình luận TIÊN / MA',99,197,11,'#ffd2a1');
    }
    panel(left,258,w,205,'NHIỆM VỤ HẰNG NGÀY');
    QUESTS.forEach((q,i)=>{const y=306+i*22;
      text('• '+q.title,25,y,9.8,'#e5ecf6','left',600,129);
      text('+'+q.reward,174,y,10,'#ffe29d','right');
    });
    panel(left,475,w,137,'HƯỚNG DẪN TU LUYỆN');
    ['Bình luận: +2 Tu Vi','Tim: +0,1 Tu Vi +1 damage','Theo dõi kênh: +30','Chia sẻ LIVE: +20','TIÊN / MA để chọn phe'].forEach((line,i)=>text('• '+line,25,517+i*18,9.7,'#e1e9f3','left',600,145));
    panel(left,623,w,211,'HỆ THỐNG CẢNH GIỚI');
    REALMS.forEach((r,i)=>{const y=666+i*18;
      text(`${i===0?'◇':'✦'} ${r.name}`,26,y,10,i<5?'#dbe9f8':'#ffe5b1','left',600,114);
      text(`${r.at} · ${r.minutes}p`,174,y,9.4,'#ffdfa0','right');
    });
    panel(right,196,w,178,'TOP SÁT THƯƠNG BOSS');
    const topD=game.damageRanking(5);if(!topD.length)text('Chưa có sát thương',620,269,11,'#bfccdd');
    topD.forEach((p,i)=>{const y=244+i*25;
      text(`${i+1}. ${p.name.slice(0,10)}`,544,y,10.2,'#f2e4d8','left',600,124);
      text(fm(p.roundDamage),696,y,10,'#ffe1a1','right');
    });
    // Luân phiên TOP tổng và TOP tuần trên LIVE, không cần bổ sung bảng che khu 60 tu sĩ.
    const topMode=['server','xp','likes','damage','presenceMs'][Math.floor(performance.now()/9500)%5];
    const topTitle={server:'TOP TU VI TOÀN SERVER',xp:'TOP TU VI TUẦN',likes:'TOP TIM TUẦN',damage:'TOP DAMAGE TUẦN',presenceMs:'TOP PHÚT TU LUYỆN TUẦN'}[topMode];
    panel(right,385,w,176,topTitle);
    const topXP=topMode==='server'?game.ranking(5):game.weeklyRanking(topMode,5);if(!topXP.length)text('Chưa có tu sĩ',620,458,11,'#bfccdd');
    topXP.forEach((p,i)=>{const y=431+i*25;
      text(`${i+1}. ${p.name.slice(0,10)}`,544,y,10.2,'#d8e8f6','left',600,124);
      text(fXp(topMode==='server'?p.xp:topMode==='presenceMs'?Math.floor(p.week.presenceMs/60000):p.week[topMode]),696,y,10,'#ffe1a1','right');
    });
    panel(right,572,w,118,'SỰ KIỆN HIỆN TẠI');
    const eventLines=s.duel?.active?
      ['ĐẠI CHIẾN · CÒN '+fmt(Math.ceil((s.duel.endsAt-Date.now())/1000)),`Tiên ${s.duel.scores.tien} ❤ · Ma ${s.duel.scores.ma} ❤`,'Phe thắng: +15 TV / người']:
      ['Boss 50%/20%: thức tỉnh','Top boss: +50 · Phe +20','Đại chiến sau '+fmt(s.nextDuelIn)];
    eventLines.forEach((e,i)=>text('• '+e,545,614+i*21,9.7,'#e6e9f7','left',600,147));
    panel(right,701,w,133,'THÔNG BÁO THĂNG CẤP');
    const notices=game.history.filter(h=>/đột phá|theo dõi|chia sẻ|Boss|TOP/.test(h.message)).slice(0,4);
    if(!notices.length)text('Chưa có thông báo',620,757,11,'#bfcfe1');
    notices.forEach((n,i)=>text('• '+n.message.slice(0,25),545,744+i*20,9.5,'#e2edfb','left',600,150));
    // Bảng chiến trường ở TRUNG TÂM, kết thúc trước khu nhân vật.
    box(194,674,159,71,'rgba(11,47,74,.92)','rgba(121,220,255,.53)',12);
    box(367,674,158,71,'rgba(64,25,85,.92)','rgba(222,147,254,.5)',12);
    titleText('TIÊN ĐẠO',274,691,17,'#c5f6ff');
    text(`${s.tien} người`,274,710,11,'#ddfaff');
    text(fm(s.damage.tien)+' sát thương',274,729,12,'#fff1e4');
    titleText('MA ĐẠO',446,691,17,'#f2c1ff');
    text(`${s.ma} người`,446,710,11,'#fae5ff');
    text(fm(s.damage.ma)+' sát thương',446,729,12,'#fff1e4');
    titleText('VS',360,704,19,'#ffe0a3');
    if(s.phase==='battle'){
      box(205,747,137,7,'rgba(8,23,38,.85)',null,4);box(205,747,137*s.shields.tien/100,7,'#74d7fd',null,4);
      box(378,747,137,7,'rgba(25,11,45,.85)',null,4);box(378,747,137*s.shields.ma/100,7,'#db94ff',null,4);
    }
    // Dãy điểm danh 6 tu sĩ dẫn đầu: chỉ hiển thị tên, không xếp ảnh ngồi đè lên hàng chính.
    const leaders=game.ranking(6);
    if(s.duel?.active){box(194,770,332,61,'rgba(43,18,65,.95)','rgba(241,188,255,.77)',12);
      titleText('⚔ TIÊN MA ĐẠI CHIẾN',360,788,15,'#ffe2ba');
      text(`TIÊN ❤ ${fm(s.duel.scores.tien)}       ·       MA ❤ ${fm(s.duel.scores.ma)}`,360,809,14,'#d7edff');
      text(`Còn ${fmt(Math.max(0,Math.ceil((s.duel.endsAt-Date.now())/1000)))} · tim không damage boss lúc chờ`,360,823,9,'#d6ccff');}
    else if(leaders.length){box(195,777,330,55,'rgba(7,16,38,.75)','rgba(247,208,143,.28)',10);
      text('ĐẠO HỮU NỔI BẬT',360,790,10,'#ffdc9b');
      leaders.forEach((p,i)=>{const cx=224+i*53;text(p.name.slice(0,7),cx,811,8.5,'#eff4ff');});
    }
    // Thanh sự kiện cuộn nằm SAU toàn bộ tu sĩ, không che phần chân.
    box(25,1236,670,33,'rgba(9,13,29,.92)','rgba(255,215,145,.28)',12);
    text((game.lastEvent||'Bình luận bất kỳ để tăng tu vi · TIÊN / MA để nhập môn').slice(0,82),360,1252,11,'#ffebc5');
  }
  // Linh khí hội tụ ở cả hai phe trong 5 phút giao chiến: VFX nhịp trận, không tự tính damage.
  function drawBattleEnergy(t,s){
    if(s.phase!=='battle')return;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const [side,col] of [[0,'#50dcff'],[1,'#dc72ff']]){
      const cx=side?540:180;
      for(let k=0;k<3;k++){
        const y=915+k*116,a=.10+.05*Math.sin(t*.002+k+side);
        ctx.strokeStyle=col;ctx.globalAlpha=a;ctx.lineWidth=4;
        ctx.shadowColor=col;ctx.shadowBlur=16;
        ctx.beginPath();ctx.moveTo(cx+15*Math.sin(t*.001+k),y);
        ctx.quadraticCurveTo(360+(side?70:-70),740,360,480);ctx.stroke();
      }
      const pulse=.65+.35*Math.sin(t*.005+side);
      const g=ctx.createRadialGradient(cx,1065,2,cx,1065,110);
      g.addColorStop(0,col+'55');g.addColorStop(1,col+'00');
      ctx.globalAlpha=.22*pulse;ellipse(cx,1065,110,45,g);
    }
    ctx.restore();
  }
  function drawWorld(t,s){drawBackground(t);if(s.phase==='battle')drawBoss(t,s);drawPlayers(t);drawBattleEnergy(t,s);if(s.phase==='battle')drawCombatFx(t);}
  function drawMilestoneNotice(t){if(!phaseFlash)return;const age=t-phaseFlash.at;if(age>phaseFlash.duration){phaseFlash=null;return;}
    const alpha=Math.min(1,age/250,(phaseFlash.duration-age)/600);ctx.save();ctx.globalAlpha=Math.max(0,alpha);
    box(202,262,317,52,'rgba(16,10,33,.93)',phaseFlash.color,14);
    titleText(phaseFlash.text,360,288,19,phaseFlash.color);ctx.restore();
  }
  function drawTribulation(t,level,progress){const cx=436,cy=419;ctx.save();ctx.globalCompositeOperation='screen';
    const pulse=.3+.65*Math.sin(progress*Math.PI);ctx.globalAlpha=pulse;ctx.shadowColor=level>=6?'#ffe6ac':'#b6dcff';ctx.shadowBlur=23;
    for(let i=0;i<6;i++){const x=cx+(i-2.5)*62,base=cy-90-(i%3)*20;
      ctx.strokeStyle=level>=6?'#ffdfac':i%2?'#b5f2ff':'#f0dbff';ctx.lineWidth=3+(i%3);
      ctx.beginPath();ctx.moveTo(x-25,225);for(let k=1;k<=7;k++)ctx.lineTo(x+Math.sin(k*2.3+i+t*.003)*19,225+(base-225)*k/7);ctx.stroke();}
    ctx.restore();
  }
  function zoomState(now){if(!levelAnimation&&levelQueue.length)levelAnimation={...levelQueue.shift(),startAt:now};if(levelAnimation&&now-levelAnimation.startAt>5100){levelAnimation=null;if(levelQueue.length)levelAnimation={...levelQueue.shift(),startAt:now};}return levelAnimation;}
  function drawBreakthrough(t,ev,progress){
    const p=game.getPlayer(ev.userId);if(!p)return;const lvl=Math.min(8,ev.to);const fadeIn=smooth(progress/.16),fadeOut=smooth((1-progress)/.18),alpha=fadeIn*fadeOut;const shade=lvl>=6?'#ffd783':lvl>=3?'#d8abff':'#8be5ff';
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgba(2,4,12,.42)';ctx.fillRect(0,0,W,H);box(196,262,490,324,'rgba(15,11,24,.93)','rgba(255,215,137,.62)',22);const burst=ctx.createRadialGradient(436,424,10,436,424,190);burst.addColorStop(0,shade+'aa');burst.addColorStop(.4,shade+'33');burst.addColorStop(1,shade+'00');ellipse(436,424,190,190,burst);ctx.save();ctx.translate(436,424);ctx.rotate(t*.00018);for(let i=0;i<4;i++){ctx.strokeStyle=shade;ctx.globalAlpha=.48/(i+1);ctx.lineWidth=3.4-i*.5;ctx.beginPath();ctx.ellipse(0,0,134+i*17,94+i*11,.18*i,0,Math.PI*2);ctx.stroke();}ctx.restore();drawTribulation(t,lvl,progress);text('Đột Phá Cảnh Giới!',442,312,31,'#ffe7ad');text(p.name,565,387,27,'#fff4da');text('đã thăng cấp lên',565,418,15,'#ffecbf');text(ev.realm,565,462,33,shade);text('Tu Vi: '+fXp(p.xp),565,512,21,'#8cffaa');character(p,{x:330,y:552,h:250,row:0},t,true);ctx.restore();
  }

  let lastFrame=0;
  function frame(t){if(t-lastFrame>36){lastFrame=t;const s=game.stats();const ev=zoomState(t);ctx.clearRect(0,0,W,H);if(ev){const player=game.getPlayer(ev.userId);const pos=player?.seat!==null?getSeatPos(player.seat):{x:360,y:1000};const progress=clamp01((t-ev.startAt)/5100);const zoom=1+1.2*smooth(Math.min(progress/.26,1))*(1-smooth((progress-.79)/.21));ctx.save();ctx.translate(360-pos.x*zoom,660-pos.y*zoom);ctx.scale(zoom,zoom);drawWorld(t,s);ctx.restore();drawTop(t,s);drawPanels(s);drawBreakthrough(t,ev,progress);}else{drawWorld(t,s);drawTop(t,s);drawPanels(s);}drawMilestoneNotice(t);if(t-lastUI>900){lastUI=t;updateUI();}void maybeSave(t);}requestAnimationFrame(frame);}

  const mayDemo=()=>{if(liveConnected){log('Ngắt kết nối LIVE trước khi sử dụng nút Demo.');return false;}return true;};
  const demo=()=>{const name=$('demoName').value.trim()||'Minh An';return {userId:'demo:'+name.toLowerCase(),name};};
  function doDemoFaction(f){if(!mayDemo())return;const d=demo(),r=handleChat({...d,text:f});if(!r.ok)log(r.reason==='full'?'Phe đã đủ 30 người.':'Không thể gia nhập phe.');else if(!r.joined)log('Đang ở phe này rồi; vị trí của bạn được giữ lâu dài.');selectedId=d.userId;updateUI();}
  $('demoTien').addEventListener('click',()=>doDemoFaction('tiên'));$('demoMa').addEventListener('click',()=>doDemoFaction('ma'));
  $('demoChat').addEventListener('click',()=>{if(!mayDemo())return;const d=demo();const r=handleChat({...d,text:$('demoComment').value.trim()||'Cố lên!'});selectedId=d.userId;updateUI();if(!r.ok)log('Bình luận không hợp lệ.');});
  $('demoLikes').addEventListener('click',()=>{if(!mayDemo())return;const d=demo();handleLike({...d,count:10});selectedId=d.userId;updateUI();});
  $('demoFollow').addEventListener('click',()=>{if(!mayDemo())return;const d=demo();const r=game.follow(d);if(r.already)log('Theo dõi đã được cộng trước đó, không cộng lại.');selectedId=d.userId;updateUI();});
  $('demoShare').addEventListener('click',()=>{if(!mayDemo())return;const d=demo();const r=game.share(d);if(r.already)log('Chia sẻ đang trong thời gian chờ 30 giây.');selectedId=d.userId;updateUI();});
  $('demoBreakthrough').addEventListener('click',()=>{if(liveConnected)return log('Chỉ được thử tăng cấp trực tiếp khi ở chế độ Demo.');const d=demo();const p=game.makePlayer(d.userId,d.name);game.award(p,60,'mô phỏng đột phá');selectedId=d.userId;updateUI();});
  $('demoCrowd').addEventListener('click',()=>{if(!mayDemo())return;let added=0;const stamp=Date.now();for(let i=0;i<30;i++){const id=`crowd:${stamp}:${i}`,name=['Lâm Tiêu','Diệp Nhi','Bạch Vân','Tử Y','Hàn Kiếm','Vân Dao'][i%6]+` ${i+1}`;const r=game.join(id,name,i%2===0?'tien':'ma');if(r.ok){added++;if(i%4===0)game.award(r.player,(i%8+1)*34,'demo');}}log(`Đã thêm ${added} tu sĩ mẫu.`);updateUI();});
  const bossSelect=$('demoBoss');BOSSES.forEach((b,i)=>bossSelect.add(new Option(`${i+1}. ${b.name}`,i)));
  $('startBoss').addEventListener('click',()=>{if(liveConnected)return log('Ngắt LIVE trước khi chọn boss Demo.');if(game.phase==='battle')game.finishBattle('demo');game.roundId=Number(bossSelect.value)+1;game.startBattle();updateUI();});
  $('demoDuel').addEventListener('click',()=>{if(!mayDemo())return;
    if(game.phase==='battle')game.finishBattle('demo');if(game.duel?.active)game.finishDuel();
    const started=game.startDuel();if(started)log('Đại chiến Demo bắt đầu! Trong 60 giây tim được tính theo phe, không đánh boss.');updateUI();});
  $('demoBossPhase').addEventListener('click',()=>{if(!mayDemo())return;
    if(game.phase!=='battle')game.startBattle();
    game.bossHp=2000;game.bossPhaseLevel=2;game.emit('boss-phase',{stage:2,bossId:game.boss.id,hp:2000,maxHp:10000});stateDirty=true;updateUI();});
  $('demoAscend').addEventListener('click',()=>{if(!mayDemo())return;
    const d=demo();let p=game.getPlayer(d.userId);if(!p){game.join(d.userId,d.name,'tien');p=game.getPlayer(d.userId);}
    if(!p)return;
    const lv=realmIndex(p.xp,p.presenceMs||0);if(lv>=8){log('Tu sĩ đã đạt Độ Kiếp Kỳ.');return;}
    const target=REALMS[lv+1];p.presenceMs=Math.max(p.presenceMs||0,target.minutes*60000);
    game.award(p,Math.max(0,target.at-p.xp),'đột phá Demo');game.updateRealm(p);stateDirty=true;selectedId=d.userId;updateUI();
    log('Demo đã mô phỏng đủ Tu Vi và thời gian để xem Thiên Kiếp. Không áp dụng trong LIVE thật.');});
  $('clearFormation').addEventListener('click',()=>{
    if(liveConnected)return log('Ngắt TikTok LIVE trước khi dọn đội hình.');
    if(!confirm('Giải tán đội hình 60 người? Toàn bộ Tu Vi, phe, cảnh giới và daily quest vẫn được giữ.'))return;
    const total=game.clearFormation();stateDirty=true;updateUI();log(`Đã làm trống ${total} vị trí, dữ liệu tu sĩ vẫn giữ nguyên.`);
  });
  $('resetAll').addEventListener('click',()=>{if(liveConnected)return log('Ngắt LIVE trước khi xóa dữ liệu.');if(!confirm('Xóa dữ liệu riêng của Nghịch Thiên Tu Luyện V2?'))return;game.players.clear();game.seats.fill(null);game.roundId=1;game.phase='prep';game.phaseEndsAt=Date.now()+300000;game.likes=game.chatCount=game.follows=game.shares=game.bossesDefeated=0;game.damage={tien:0,ma:0};game.shields={tien:100,ma:100};game.bossMaxHp=BOSSES[0].hp;game.bossHp=game.bossMaxHp;game.roundStartAt=0;game.nextBossStrikeAt=0;game.nextDuelAt=Date.now()+30*60000;game.duel=null;game.duelPending=false;game.lastDuelResult=null;game.bossWarningSent=false;game.bossPhaseLevel=0;game._lastPresenceTickAt=Date.now();game.history=[];game.lastEvent=null;game.lastResult=null;selectedId='';levelAnimation=null;levelQueue.length=0;stateDirty=true;updateUI();log('Đã làm lại dữ liệu Demo V2.2.0.');});
  $('questPlayer').addEventListener('change',()=>{selectedId=$('questPlayer').value;updateUI();});

  $('visualStyle').addEventListener('change',()=>updateArtMode($('visualStyle').value));
  $('applyEquipment').addEventListener('click',()=>{const id=$('questPlayer').value;if(!id)return $('equipStatus').textContent='Hãy chọn tu sĩ tại mục Nhiệm vụ trước.';
    const results=['robe','artifact','pet'].map(kind=>game.equip(id,kind,$(`${kind}Equip`).value));
    $('equipStatus').textContent=results.every(r=>r.ok)?'✓ Đã trang bị, hiệu ứng được cập nhật trên LIVE 9:16.':'Một trang bị chưa mở khóa hoặc không hợp lệ.';
    updateUI();});
  async function showBackups(){if(!window.desktopStorage?.listBackups){$('backupStatus').textContent='Tự sao lưu khả dụng khi chạy bằng Electron (npm start), không hỗ trợ trong trình duyệt Demo.';return;}
    try{const items=await window.desktopStorage.listBackups();$('backupStatus').textContent=items.length?`${items.length} bản sao lưu gần nhất · ${new Date(items[0].at).toLocaleString('vi-VN')}`:'Chưa có bản sao lưu. Bấm Sao lưu ngay để tạo bản đầu tiên.';}
    catch(e){$('backupStatus').textContent='Không đọc được danh sách sao lưu: '+e.message;}}
  $('backupNow').addEventListener('click',async()=>{if(!window.desktopStorage?.backup)return showBackups();
    try{await persist(GAME_KEY,game.toJSON());await persist(SETTINGS_KEY,getSettings());
      const result=await window.desktopStorage.backup();$('backupStatus').textContent='✓ Đã sao lưu: '+new Date(result.at).toLocaleString('vi-VN');log('Đã tạo bản sao lưu thủ công.');}
    catch(e){$('backupStatus').textContent='Sao lưu thất bại: '+e.message;}});
  $('restoreBackup').addEventListener('click',async()=>{if(liveConnected){$('backupStatus').textContent='Ngắt TikTok LIVE trước khi khôi phục dữ liệu.';return;}if(!window.desktopStorage?.restoreBackup)return showBackups();
    try{const list=await window.desktopStorage.listBackups();if(!list.length)return $('backupStatus').textContent='Chưa có bản sao lưu để khôi phục.';
      if(!confirm(`Khôi phục dữ liệu từ ${new Date(list[0].at).toLocaleString('vi-VN')}?\n\nDữ liệu hiện tại sẽ được tự sao lưu trước. Ứng dụng sẽ tải lại.`))return;
      await window.desktopStorage.restoreBackup(list[0].name);location.reload();}
    catch(e){$('backupStatus').textContent='Không thể khôi phục: '+e.message;}});
  void showBackups();
  $('readChat').addEventListener('change',saveSettings);
  $('alertVoice').addEventListener('change',saveSettings);
  $('voiceSource').addEventListener('change',()=>{stopSpeech();updateVoiceOptions();saveSettings();});
  $('systemVoice').addEventListener('change',()=>{savedSystemVoice=$('systemVoice').value;saveSettings();});
  $('refreshVoices').addEventListener('click',()=>{refreshSystemVoices();updateSpeechStatus(systemVoiceReady?'Đã quét lại giọng Windows.':'Chưa tìm thấy giọng Windows.');});
  $('voiceRate').addEventListener('input',()=>{$('voiceRateValue').textContent=(Number($('voiceRate').value)/100).toFixed(2).replace('.',',')+'×';saveSettings();});
  $('voiceVolume').addEventListener('input',()=>{$('voiceVolumeValue').textContent=$('voiceVolume').value+'%';if(currentSpeechAudio)currentSpeechAudio.volume=voicePercent();saveSettings();});
  $('choosePiper').addEventListener('click',async()=>{try{
    if(!window.desktopAudio?.choosePiper)throw Error('Mở ứng dụng Electron bằng npm start để chọn file.');
    const item=await window.desktopAudio.choosePiper();if(!item)return;piperEngine=item;updatePiperLabels();saveSettings();
    updateSpeechStatus('Đã chọn chương trình Piper. Tiếp tục chọn model .onnx nếu chưa có.');
  }catch(e){updateSpeechStatus('Chọn Piper thất bại: '+e.message);}});
  $('chooseVoiceModel').addEventListener('click',async()=>{try{
    if(!window.desktopAudio?.chooseVoiceModel)throw Error('Mở ứng dụng Electron bằng npm start để chọn file.');
    const item=await window.desktopAudio.chooseVoiceModel();if(!item)return;voiceModel=item;updatePiperLabels();saveSettings();
    updateSpeechStatus('Đã chọn giọng '+item.name+'. Bấm Thử giọng đọc.');
  }catch(e){updateSpeechStatus('Chọn giọng thất bại: '+e.message);}});
  $('testVoice').addEventListener('click',()=>speak('Nghịch Thiên Tu Luyện. Bình luận tiên hoặc ma để gia nhập phe. Bình luận cộng hai tu vi. Mỗi tim gây một sát thương lên boss.',true,true));
  $('stopVoice').addEventListener('click',stopSpeech);
  $('musicVolume').addEventListener('input',()=>{$('musicVolumeValue').textContent=$('musicVolume').value+'%';applyMusicVolume();saveSettings();});
  $('duckMusic').addEventListener('change',()=>{applyMusicVolume();saveSettings();});
  async function playMusic(){try{applyMusicVolume();await music.play();$('musicStatus').textContent='♫ Đang phát nhạc nền · '+(chosenMusic?.name||'Linh khí nguyên bản');return true;
    }catch(e){$('musicStatus').textContent='Không phát được nhạc: '+e.message;log('Không thể phát nhạc: '+e.message);return false;}}
  $('playMusic').addEventListener('change',async()=>{
    if($('playMusic').checked){if(!await playMusic())$('playMusic').checked=false;}
    else{music.pause();$('musicStatus').textContent='Nhạc nền đã tắt.';}saveSettings();
  });
  $('testMusic').addEventListener('click',async()=>{if(await playMusic()){$('playMusic').checked=true;saveSettings();}});
  $('pauseMusic').addEventListener('click',()=>{music.pause();$('playMusic').checked=false;$('musicStatus').textContent='Đã tạm dừng nhạc nền.';saveSettings();});
  $('chooseMusic').addEventListener('click',async()=>{try{
    if(!window.desktopAudio?.chooseMusic)throw Error('Mở ứng dụng Electron bằng npm start để chọn file.');
    const item=await window.desktopAudio.chooseMusic();if(!item)return;
    setMusicFile(item);$('musicStatus').textContent='Đã nhập nhạc: '+item.name+'. Bấm Nghe thử nhạc.';
  }catch(e){$('musicStatus').textContent='Nhập nhạc thất bại: '+e.message;}});
  $('resetMusic').addEventListener('click',()=>{setMusicFile(null);$('musicStatus').textContent='Đã chọn lại nhạc mặc định.';});
  music.addEventListener('error',()=>{$('musicStatus').textContent='Không đọc được file nhạc. Hãy chọn lại file MP3 hoặc WAV hợp lệ.';});

  $('liveUsername').addEventListener('input',saveSettings);$('autoReconnect').addEventListener('change',saveSettings);
  let liveSessionStarted=false;
  function liveStatus(value,stage='idle'){liveStats.lastStatus=value;if(stage==='ended'||stage==='idle')liveSessionStarted=false;$('connectionStatus').textContent=value;$('liveBadge').textContent=stage==='connected'?'● ĐANG LIVE':stage==='retry'?'● KẾT NỐI LẠI':'● CHẾ ĐỘ DEMO';liveConnected=['starting','connecting','connect','connected','retry'].includes(stage);
    if(stage==='connected'&&!liveSessionStarted){liveSessionStarted=true;game.beginLiveSession();stateDirty=true;log('Bắt đầu phiên LIVE: 5 phút chuẩn bị, boss chưa xuất hiện.');updateUI();}
  }
  $('connectLive').addEventListener('click',async()=>{const user=$('liveUsername').value.trim();if(!user)return liveStatus('Nhập username tài khoản đang LIVE.');$('connectLive').disabled=true;liveSessionStarted=false;liveStatus('Đang kết nối...','connecting');saveSettings();try{await window.desktopTikTok.connect(user,{roomId:$('roomId').value.trim(),autoReconnect:$('autoReconnect').checked});}catch(e){liveStatus(`Kết nối lỗi: ${e.message}`);$('diagnostic').textContent=String(e.message);}finally{$('connectLive').disabled=false;}});
  $('disconnectLive').addEventListener('click',async()=>{try{await window.desktopTikTok?.disconnect();}catch(e){log(e.message);}liveSessionStarted=false;liveStatus('Đã ngắt LIVE.');});
  window.desktopTikTok?.onEvent(e=>{if(e.kind==='status'){liveStatus(e.status,e.stage);if(e.error)$('diagnostic').textContent=JSON.stringify(e.error,null,2);return;}if(e.kind==='diagnostic'){$('diagnostic').textContent=String(e.message||'Không có lỗi');return;}if(e.kind==='chat')handleChat(e);if(e.kind==='like')handleLike(e);if(e.kind==='follow')handleFollow(e);if(e.kind==='share')handleShare(e);});

  if(!window.liveOutputBridge)$('outputStatus').textContent='Cửa sổ phát chỉ mở được trong Electron (npm start).';
  void restore();requestAnimationFrame(frame);
  window.__NghichThienDebug={bossAssetAudit:()=>BOSSES.map(b=>({id:b.id,ok:ready(`boss_${b.id}`),src:images[`boss_${b.id}`]?.src})),game,handleChat,handleLike,handleFollow,handleShare,images,updateUI,getSeatPos,artMode:()=>artMode,combatFx,liveStats};
})();
