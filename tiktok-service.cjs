'use strict';
/**
 * Chánh Điện An Lạc — Bước 10
 * Kết nối TikTok LIVE từ Main Process. Không đưa URL ký hoặc cookie vào renderer.
 * API v2: TikTokLiveConnection.connect(roomId?), lỗi tổng hợp requestErrs.
 * TikTok LIVE Connector không chính thức; không bảo đảm phòng nào cũng kết nối được.
 */
const DEFAULT_RETRY_DELAYS = [5000, 10000, 20000, 40000, 60000, 90000, 120000, 120000];
const MAX_MESSAGES = 2000;
const limiter = (number, min, max) => Math.min(max, Math.max(min, number));

function redact(value) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s"']+/gi, '[URL đã ẩn]')
    .replace(/\b(sessionid|api[_-]?key|oauth|token|signature|cookie|authorization)\s*[=:]\s*[^\s,;]+/gi, '$1=[ẩn]')
    .replace(/\b(?:Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [ẩn]')
    .slice(0, 500);
}
function errorSummary(error) {
  const base = error?.exception || error || {};
  const code = redact(base.name || error?.name || 'ConnectError').slice(0, 65);
  const detail = redact(base.message || error?.info || error?.message || 'Lỗi không rõ');
  const chain = [];
  const entries = base?.config?.requestErrs || error?.config?.requestErrs;
  if (Array.isArray(entries)) {
    for (const e of entries.slice(0, 6)) {
      const route = redact(e?.routeId || e?.route || e?.source || e?.name || 'Nguồn tra cứu');
      const reason = redact(e?.error?.message || e?.message || e?.reason || 'Không trả thông tin');
      chain.push(`${route}: ${reason}`.slice(0, 165));
    }
  }
  let advice = 'Kiểm tra tài khoản đang LIVE, mạng, và mã phòng. Dữ liệu từ TikTok có thể bị chặn.';
  let category = 'lookup'; let canRetry = true; let delayMinMs = 5000;
  const all = `${code} ${detail}`;
  if (/UserOffline|offline|not live|UserNotFound|stream.?end/i.test(all)) {
    category='offline'; canRetry=false;
    advice='Phòng chưa LIVE, đã kết thúc hoặc TikTok chưa công bố thông tin. Mở phòng LIVE thật trước khi kết nối.';
  } else if (/SignatureRateLimit|rate.?limit|429/i.test(all)) {
    category='rate-limit'; delayMinMs = Math.max(60000, Number(base.retryAfter) || 0);
    advice='Đang bị giới hạn truy cập/ký kết nối. Tránh thử liên tục; đợi tối thiểu theo retry-after.';
  } else if (/SignAPI|SignatureMissing|PREMIUM|Authenticated/i.test(all)) {
    category='sign'; canRetry=false;
    advice='Dịch vụ ký kết nối từ bên thứ ba bị từ chối hoặc yêu cầu quyền. Thư viện không chính thức không bảo đảm truy cập.';
  } else if (/ERR_MODULE_NOT_FOUND|Cannot find package|Thư viện chưa được cài/i.test(all)) {
    category='missing-module';canRetry=false;advice='Thiếu tiktok-live-connector. Trong Terminal dự án chạy npm install rồi thử lại.';
  } else if (/InvalidUnique|InvalidRequest|InvalidSchema|TypeError/i.test(all)) {
    category='invalid'; canRetry=false;
    advice='Thông tin kết nối không hợp lệ. Kiểm tra username / Room ID.';
  } else if (/Room ID|room.?id|composite|all sources/i.test(all)) {
    category='lookup'; delayMinMs=60000;
    advice='Không lấy được Room ID. Chỉ nhập Room ID khi bạn có mã phòng hợp lệ; mã này bỏ qua bước tra cứu, không bỏ qua WebSocket/ký kết nối.';
  } else if (/timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|ECONNREFUSED|socket|network|websocket/i.test(all)) {
    category='network'; advice='Mạng hoặc kết nối WebSocket bị gián đoạn. Phần mềm sẽ thử lại với khoảng nghỉ tăng dần.';
  }
  return {code, detail, chain, category, canRetry, delayMinMs, advice};
}
function normalizeUsername(value) {
  const raw=String(value||'').trim();
  let username=raw;
  if(/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    if (!/(^|\.)tiktok\.com$/i.test(url.hostname)) throw Error('Chỉ chấp nhận URL TikTok.com.');
    username=url.pathname.match(/\/@([^/?#]+)/)?.[1] || '';
  }
  username=username.replace(/^@/,'').trim();
  if(!/^[A-Za-z0-9._]{2,32}$/.test(username)) throw Error('Username TikTok không hợp lệ, ví dụ @q_thang4.');
  return username;
}
function normalizeRoomId(value) {
  const roomId=String(value || '').trim();
  if (!roomId) return '';
  if (!/^\d{10,25}$/.test(roomId)) throw Error('Room ID phải là 10–25 chữ số; để trống nếu bạn không có mã chính xác.');
  return roomId;
}
// Some connector versions expose strings in event.comment, others in event.content.
function extractChatText(event){
  const raw=event?.content ?? event?.comment ?? event?.text ?? event?.message?.text ?? '';
  const data=typeof raw==='object'&&raw!==null?raw.text ?? raw.content ?? raw.comment ?? '':raw;
  return String(data||'').trim().slice(0,200);
}
function normalizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  const rawId=String(user.userId ?? user.id ?? user.uid ?? user.uniqueId ?? user.displayId ?? user.secUid ?? '').trim();
  const id=['0','undefined','null'].includes(rawId.toLowerCase())?'':rawId;
  const username=String(user.uniqueId ?? user.displayId ?? user.username ?? user.handle ?? '').replace(/^@/,'').trim();
  if (!id && !username) return null;
  return {userId:id || username, username, name:String(user.nickname || user.nickName || username || `Người xem ${id}`).slice(0,24)};
}


class TikTokService {
  constructor(notify, loadModule=()=>import('tiktok-live-connector'), options={}) {
    this.notify=notify;
    this.loadModule=loadModule;
    this.scheduler=options.scheduler || {setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id)};
    this.delays=options.retryDelays || DEFAULT_RETRY_DELAYS;
    this.wanted=false;
    this.connection=null;
    this.username=''; this.roomId=''; this.autoReconnect=true;
    this.epoch=0; this.attemptId=0; this.timer=null; this.retryCount=0;
    this.connecting=false; this.connected=false; this.ended=false;
    this.stage='idle'; this.message='Chưa kết nối'; this.lastError=null;
    this.recentIds=new Map();this.userAliases=new Map();
  }
  emit(kind,body={}) {try {this.notify({kind,...body});} catch (_) {}}
  status(stage,status,other={}) {
    this.stage=stage;this.message=status;
    this.emit('status',{stage,status,username:this.username,roomId:this.roomId,
      attempt:this.retryCount,autoReconnect:this.autoReconnect,...other});
  }
  getState() {return {stage:this.stage,status:this.message,username:this.username,roomId:this.roomId,
    connecting:this.connecting,connected:this.connected,retryCount:this.retryCount,autoReconnect:this.autoReconnect,lastError:this.lastError};}
  seen(type,id) {
    if (!id) return false;
    const key=`${type}:${String(id)}`;
    if(this.recentIds.has(key)) return true;
    this.recentIds.set(key,Date.now());
    if(this.recentIds.size>MAX_MESSAGES) this.recentIds.delete(this.recentIds.keys().next().value);
    return false;
  }
  normalizeUsername(raw) {return normalizeUsername(raw);}
  normalizeUser(user) {return normalizeUser(user);}
  resolveUser(event){
    // Không chọn event.user nếu nó là object rỗng: phiên bản connector có thể
    // đặt thông tin ở event.userInfo.user hoặc ngay trong event.
    const candidates=[event?.user,event?.userInfo?.user,event?.userInfo,event?.sender,event?.data?.user,event]
      .map(normalizeUser).filter(Boolean);
    if(!candidates.length)return null;
    // Có phiên bản tách userId trong event.user nhưng uniqueId ở lớp ngoài.
    // Gộp định danh cùng sự kiện trước khi khớp alias của người chơi.
    const info={...candidates[0]};
    const unique=candidates.find(c=>c.username);
    const numeric=candidates.find(c=>/^\d+$/.test(c.userId)&&c.userId!=='0');
    if(unique)info.username=unique.username;
    if(numeric)info.userId=numeric.userId;
    if(!info.name || info.name.startsWith('Người xem ')){
      const named=candidates.find(c=>c.name && c.name!==c.username && !c.name.startsWith('Người xem '));
      if(named)info.name=named.name;
    }
    const username=info.username.toLowerCase();
    if(username){
      const saved=this.userAliases.get(username);
      // Stabilize ID when a LIKE payload only supplies uniqueId while CHAT supplies numeric userId.
      const numeric=/^\d+$/.test(info.userId)&&info.userId!=='0';
      if(numeric) this.userAliases.set(username,info.userId);
      else if(saved)info.userId=saved;
      else this.userAliases.set(username,info.userId);
    }
    return info;
  }
  reportMissingIdentity(kind){
    const now=Date.now();if(this._lastIdentityWarning&&now-this._lastIdentityWarning<12000)return;
    this._lastIdentityWarning=now;
    this.emit('diagnostic',{message:`TikTok gửi ${kind==='like'?'tim':'bình luận'} nhưng không có ID/username người xem. Không thể gán sát thương cho tu sĩ; kiểm tra phiên bản TikTok Connector.`});
  }
  dedupe(id) {return this.seen('message',id);}

  async connect(input, options={}) {
    const username=normalizeUsername(input);
    const roomId=normalizeRoomId(options.roomId);
    const autoReconnect=options.autoReconnect !== false;
    await this.disconnect({quiet:true});
    this.username=username;this.roomId=roomId;this.autoReconnect=autoReconnect;
    this.wanted=true;this.ended=false;this.retryCount=0;this.lastError=null;this.recentIds.clear();this.userAliases.clear();
    const epoch=this.epoch;
    this.status('starting',`Đang kết nối @${username}${roomId?' bằng Room ID':''}...`);
    return this._attempt(epoch,true);
  }
  async _attempt(epoch, first=false) {
    if(!this.wanted||epoch!==this.epoch) return false;
    if(this.connecting||this.connected) return this.connected;
    this.connecting=true;
    const attemptId=++this.attemptId;
    let conn;
    try {
      this.status('connect',`Đang tải thư viện và kết nối @${this.username} (lượt ${this.retryCount+1})...`);
      const mod=await this.loadModule();
      if(!this.wanted||epoch!==this.epoch||attemptId!==this.attemptId)return false;
      if(typeof mod.TikTokLiveConnection!=='function') throw Error('Thư viện chưa được cài. Chạy npm install rồi khởi động lại.');
      conn=new mod.TikTokLiveConnection(this.username,{
        processInitialData:false,
        fetchRoomInfoOnConnect: !this.roomId,
        enableExtendedGiftInfo:false,
      });
      this.connection=conn;
      const valid=()=>this.wanted&&epoch===this.epoch&&attemptId===this.attemptId&&this.connection===conn;
      const on=(name,fn)=>conn.on(name,(event)=>{if(valid()){try{fn(event)}catch(err){this.emit('diagnostic',{message:`Lỗi xử lý sự kiện: ${redact(err?.message)}`})}}});
      on(mod.WebcastEvent?.CHAT || 'chat', event=>{
        const user=this.resolveUser(event); if(!user){this.reportMissingIdentity('chat');return;}
        const content=extractChatText(event);
        const id=String(event?.common?.msgId ?? event?.msgId ?? '');
        if(!content||this.seen('chat',id))return;
        this.emit('chat',{...user,text:content,messageId:id});
      });
      on(mod.WebcastEvent?.LIKE || 'like',event=>{
        const user=this.resolveUser(event);if(!user)this.reportMissingIdentity('like');
        const messageId=String(event?.common?.msgId ?? event?.msgId ?? '');
        if(messageId && this.seen('like',messageId))return;
        // Có userId mới phân điểm cá nhân. Sự kiện thiếu userId chỉ hiện thống kê.
        this.emit('like',{...(user||{userId:'',username:'',name:''}),
          count:limiter(Math.floor(Number(event?.count ?? event?.likeCount ?? 1)),0,10000),messageId});
      });
      // V2: follow + share are routed from social events by TikTok LIVE Connector.
      // Do not award gifts or monetary interactions.
      function socialAction(kind, event) {
        const user=this.resolveUser(event);if(!user)return;
        const messageId=String(event?.common?.msgId ?? event?.msgId ?? event?.common?.messageId ?? '');
        if(messageId && this.seen('social:'+kind,messageId))return;
        this.emit(kind,{...user,messageId});
      }
      const boundSocialAction=socialAction.bind(this);
      on(mod.WebcastEvent?.FOLLOW || 'follow', event=>boundSocialAction('follow',event));
      on(mod.WebcastEvent?.SHARE || 'share', event=>boundSocialAction('share',event));
      // Some older library versions only emit SOCIAL. New versions route recognized
      // FOLLOW/SHARE directly, so fallback is only for identifiable old payloads.
      on(mod.WebcastEvent?.SOCIAL || 'social', event=>{
        const hint=String(event?.action ?? event?.displayType ?? event?.common?.displayText?.key ?? '').toLowerCase();
        if(hint.includes('follow'))boundSocialAction('follow',event);
        else if(hint.includes('share'))boundSocialAction('share',event);
      });
      on(mod.ControlEvent?.DISCONNECTED || 'disconnected',event=>{
        if(!valid()||!this.connected)return; // Đang connect: promise reject là nơi lên lịch retry.
        this.connected=false;this.connecting=false;this.connection=null;
        this.status('disconnected',`Mất kết nối · ${redact(event?.reason||event?.code||'WebSocket đóng').slice(0,80)}`);
        this._reconnectLater(epoch,null);
      });
      on(mod.ControlEvent?.STREAM_END || 'streamEnd',()=>{
        this.ended=true;this.wanted=false;this.connected=false;this.connecting=false;this._clearTimer();
        this.status('ended','Livestream đã kết thúc. Tự kết nối lại đã dừng.');
      });
      on(mod.ControlEvent?.ERROR || 'error',err=>{
        // error có thể cũng đi kèm rejection của connect(); không tạo vòng lặp riêng.
        this.lastError=errorSummary(err);
        this.emit('diagnostic',{message:`${this.lastError.code}: ${this.lastError.detail}`});
      });
      const result=await conn.connect(this.roomId || undefined);
      if(!valid()) {try{await conn.disconnect()}catch(_){} return false;}
      this.connected=true;this.connecting=false;this.retryCount=0;this.lastError=null;
      if(result?.roomId)this.roomId=String(result.roomId);
      this.status('connected',`Đã kết nối @${this.username} · phòng ${this.roomId||'không rõ'}`);
      return true;
    } catch(error) {
      if(!this.wanted||epoch!==this.epoch||attemptId!==this.attemptId)return false;
      this.connecting=false;this.connected=false;
      const info=errorSummary(error);this.lastError=info;
      if(this.connection===conn)this.connection=null;
      if(conn){try{await conn.disconnect()}catch(_){}}
      this.status('error',`Kết nối thất bại [${info.code}]: ${info.detail}`,{error:info});
      this._reconnectLater(epoch,info);
      if(first) throw Error(`[${info.code}] ${info.detail} — ${info.advice}`);
      return false;
    }
  }
  _clearTimer() {if(this.timer!==null){this.scheduler.clearTimeout(this.timer);this.timer=null;}}
  _reconnectLater(epoch,info) {
    if(!this.wanted||this.ended||!this.autoReconnect||epoch!==this.epoch)return;
    if(info && !info.canRetry) {this.status('paused',`Dừng thử lại: ${info.advice}`,{error:info});return;}
    if(this.retryCount>=this.delays.length){this.status('paused','Đã đạt giới hạn thử lại; kiểm tra mạng và bấm Kết nối LIVE để thử lại.');return;}
    this._clearTimer();
    const base=this.delays[this.retryCount++];
    const wait=Math.max(base,info?.delayMinMs||0);
    this.status('retry',`Sẽ thử lại sau ${Math.ceil(wait/1000)} giây (lượt ${this.retryCount}/${this.delays.length})`,{retryInMs:wait,error:info||undefined});
    this.timer=this.scheduler.setTimeout(()=>{
      this.timer=null;
      if(this.wanted&&epoch===this.epoch)void this._attempt(epoch,false);
    },wait);
  }
  async disconnect({quiet=false}={}) {
    this.wanted=false;this.ended=false;this.epoch++;this.attemptId++;
    this._clearTimer();
    this.connected=false;this.connecting=false;this.retryCount=0;
    const old=this.connection;this.connection=null;
    if(old){try{await old.disconnect()}catch(_){}}
    if(!quiet)this.status('idle','Đã ngắt kết nối theo yêu cầu.');
    return true;
  }
}
module.exports={TikTokService,errorSummary,normalizeUsername,normalizeRoomId,normalizeUser,extractChatText};
