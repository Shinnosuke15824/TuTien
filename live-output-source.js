'use strict';
(function(){
  const bridge=window.liveOutputBridge;
  const status=document.getElementById('outputStatus');
  const canvas=document.getElementById('templeCanvas');
  if(!bridge||!window.TuTienLiveStream){
    if(status)status.textContent='Cầu nối cửa sổ LIVE chưa sẵn sàng. Hãy mở dự án bằng npm start.';
    return;
  }
  const messages={
    ready:'Cửa sổ LIVE đã mở, đang chuẩn bị truyền hình...',
    offered:'Đang đồng bộ khung hình 9:16...',
    connecting:'Đang nối hình tới cửa sổ LIVE...',
    connected:'Đang truyền hình trực tiếp 9:16 (không truyền âm thanh hai lần).',
    disconnected:'Đường truyền nội bộ bị ngắt. Hãy đóng/mở lại cửa sổ LIVE.',
    failed:'Không kết nối được hình. Hãy đóng/mở lại cửa sổ LIVE.',
  };
  let currentSession=0;
  let fallbackTimer=null;
  let fallbackStartTimer=null;
  function stopFallback(){
    if(fallbackStartTimer){clearTimeout(fallbackStartTimer);fallbackStartTimer=null;}
    if(fallbackTimer){clearInterval(fallbackTimer);fallbackTimer=null;}
  }
  function startFallback(sessionId){
    if(fallbackTimer)return;
    if(!canvas||!bridge.sendFrame)return;
    if(status)status.textContent='Đang phát LIVE bằng chế độ dự phòng (10 FPS), không ảnh hưởng âm thanh.';
    let busy=false;
    const send=()=>{
      if(busy||currentSession!==sessionId)return;
      busy=true;
      try{bridge.sendFrame({sessionId,image:canvas.toDataURL('image/jpeg',.76)});}
      catch(e){if(status)status.textContent='Không lấy được khung hình dự phòng: '+String(e.message||e);stopFallback();}
      finally{busy=false;}
    };
    send();fallbackTimer=setInterval(send,100);
  }
  const source=new window.TuTienLiveStream.Source({canvas,bridge,
    onStatus:(value)=>{
      if(value==='connected')stopFallback();
      if(value==='failed'||value==='disconnected'||value.startsWith('error:')){
        if(!fallbackTimer)startFallback(source.sessionId);
        return;
      }
      if(status)status.textContent=messages[value]||value;
    }
  });
  bridge.onStart(({sessionId})=>{
    currentSession=sessionId;
    stopFallback();
    void source.start(sessionId);
    // WebRTC bị hạn chế trên một số máy: tự đổi sang JPEG qua IPC khi chưa nối được.
    fallbackStartTimer=setTimeout(()=>{
      if(currentSession===sessionId&&source.peer?.connectionState!=='connected')startFallback(sessionId);
    },2500);
  });
  bridge.onSignal(packet=>{void source.handle(packet);});
  bridge.onClosed(()=>{currentSession=0;stopFallback();source.stop();if(status)status.textContent='Cửa sổ LIVE đang đóng.';});
  const open=document.getElementById('openLiveOutput');
  const close=document.getElementById('closeLiveOutput');
  open?.addEventListener('click',async()=>{
    try{
      open.disabled=true;
      await bridge.open();
      if(status)status.textContent='Đã yêu cầu mở cửa sổ LIVE 9:16.';
    }catch(e){if(status)status.textContent='Không thể mở cửa sổ: '+(e.message||e);}
    finally{open.disabled=false;}
  });
  close?.addEventListener('click',async()=>{
    try{await bridge.close();}catch(e){if(status)status.textContent=String(e.message||e);}
  });
  bridge.getState().then(state=>{
    if(status)status.textContent=state.opened?'Cửa sổ LIVE đang mở.':'Chưa mở cửa sổ LIVE.';
  }).catch(()=>{});
  window.addEventListener('beforeunload',()=>{stopFallback();source.stop();});
})();
