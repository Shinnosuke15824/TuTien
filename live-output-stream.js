/* Nghịch Thiên Tu Luyện — truyền hình Canvas 9:16 giữa hai cửa sổ Electron bằng WebRTC.
   Không có máy chủ WebRTC bên ngoài; chỉ dùng ICE host nội bộ trên cùng máy. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TuTienLiveStream=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const RTC_CONFIG={iceServers:[]};
  function safeText(e){return String(e?.message||e||'Lỗi không xác định').slice(0,220);}
  class BasePeer {
    constructor({bridge,onStatus=()=>{},PeerConnection}={}) {
      this.bridge=bridge;
      this.onStatus=onStatus;
      this.PeerConnection=PeerConnection||globalThis.RTCPeerConnection;
      this.peer=null;this.sessionId=0;this.pendingIce=[];
      this.failed=false;
    }
    status(s){try{this.onStatus(s);}catch(_){}}
    reset(){
      if(this.peer){this.peer.onicecandidate=null;this.peer.onconnectionstatechange=null;this.peer.ontrack=null;
        try{this.peer.close();}catch(_){}}
      this.peer=null;this.pendingIce=[];this.failed=false;
    }
    makePeer(sessionId){
      if(!this.PeerConnection)throw Error('Chromium không hỗ trợ RTCPeerConnection.');
      this.reset();this.sessionId=sessionId;
      const peer=new this.PeerConnection(RTC_CONFIG);this.peer=peer;
      peer.onicecandidate=e=>{
        if(this.peer===peer && e.candidate)this.send({type:'ice',candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate});
      };
      peer.onconnectionstatechange=()=>{
        if(this.peer!==peer)return;
        if(peer.connectionState==='connected')this.status('connected');
        else if(peer.connectionState==='failed')this.status('failed');
        else if(peer.connectionState==='disconnected')this.status('disconnected');
        else if(peer.connectionState==='connecting')this.status('connecting');
      };
      return peer;
    }
    send(data){if(this.sessionId&&this.bridge?.sendSignal)this.bridge.sendSignal({sessionId:this.sessionId,...data});}
    async addIce(candidate){
      if(!this.peer)return;
      if(!this.peer.remoteDescription){this.pendingIce.push(candidate);return;}
      try{await this.peer.addIceCandidate(candidate);}catch(e){this.status('ICE: '+safeText(e));}
    }
    async flushIce(){
      const all=this.pendingIce.splice(0);
      for(const c of all)await this.addIce(c);
    }
    fail(e){this.status('error: '+safeText(e));this.failed=true;}
    stop(){this.reset();this.sessionId=0;}
  }
  class Source extends BasePeer {
    constructor({canvas,...options}={}){super(options);this.canvas=canvas;this.stream=null;this.generation=0;}
    stop(){
      this.generation++;
      super.stop();
      if(this.stream){for(const track of this.stream.getTracks())try{track.stop();}catch(_){}this.stream=null;}
    }
    async start(sessionId){
      if(!Number.isInteger(sessionId)||sessionId<=0)return;
      this.stop();
      const generation=this.generation;
      try{
        if(!this.canvas||typeof this.canvas.captureStream!=='function')throw Error('Canvas captureStream không được hỗ trợ.');
        const peer=this.makePeer(sessionId);
        this.stream=this.canvas.captureStream(30);
        const tracks=this.stream.getVideoTracks();
        if(!tracks.length)throw Error('Không lấy được khung hình Canvas.');
        tracks.forEach(track=>peer.addTrack(track,this.stream));
        const offer=await peer.createOffer({offerToReceiveAudio:false,offerToReceiveVideo:false});
        if(generation!==this.generation)return;
        await peer.setLocalDescription(offer);
        if(generation!==this.generation)return;
        this.send({type:'offer',description:{type:peer.localDescription.type,sdp:peer.localDescription.sdp}});
        this.status('offered');
      }catch(e){if(generation===this.generation)this.fail(e);}
    }
    async handle(packet){
      if(!packet||packet.sessionId!==this.sessionId||!this.peer)return;
      try{
        if(packet.type==='answer'){
          await this.peer.setRemoteDescription(packet.description);
          await this.flushIce();
        } else if(packet.type==='ice')await this.addIce(packet.candidate);
      }catch(e){this.fail(e);}
    }
  }
  class Receiver extends BasePeer {
    constructor({onStream=()=>{},...options}={}){super(options);this.onStream=onStream;}
    start(sessionId){
      if(!Number.isInteger(sessionId)||sessionId<=0)return;
      try{
        const peer=this.makePeer(sessionId);
        peer.ontrack=e=>{
          if(this.peer!==peer)return;
          const stream=e.streams&&e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
          this.onStream(stream);
          this.status('receiving');
        };
        this.status('ready');
      }catch(e){this.fail(e);}
    }
    async handle(packet){
      if(!packet||packet.sessionId!==this.sessionId||!this.peer)return;
      try{
        if(packet.type==='offer'){
          await this.peer.setRemoteDescription(packet.description);
          await this.flushIce();
          const answer=await this.peer.createAnswer();
          await this.peer.setLocalDescription(answer);
          this.send({type:'answer',description:{type:this.peer.localDescription.type,sdp:this.peer.localDescription.sdp}});
        }else if(packet.type==='ice')await this.addIce(packet.candidate);
      }catch(e){this.fail(e);}
    }
  }
  return {Source,Receiver};
});
