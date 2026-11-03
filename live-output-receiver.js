'use strict';
(function(){
  const bridge=window.liveOutputReceiver;
  const video=document.getElementById('liveStream');
  const fallback=document.getElementById('liveFallback');
  const message=document.getElementById('streamMessage');
  function note(text,hide=false){message.textContent=text;message.hidden=hide;}
  if(!bridge||!window.TuTienLiveStream){
    note('Thiếu cầu nối LIVE. Hãy chạy Electron bằng npm start.');return;
  }
  let currentSession=0;
  const receiver=new window.TuTienLiveStream.Receiver({bridge,
    onStream:stream=>{
      video.srcObject=stream;
      void video.play().catch(()=>{});
    },
    onStatus:value=>{
      if(value==='ready')note('Đang chờ hình từ cửa sổ quản lý...');
      else if(value==='connected'){
        video.hidden=false;fallback.hidden=true;
        note('',true);
      }
      else if(value==='failed'||value==='disconnected')note('Mất kết nối hình. Đóng rồi mở lại cửa sổ LIVE.');
      else if(value.startsWith('error:'))note(value);
    }
  });
  bridge.onStart(({sessionId})=>{
    currentSession=sessionId;video.srcObject=null;video.hidden=false;fallback.hidden=true;
    receiver.start(sessionId);
  });
  bridge.onSignal(packet=>{void receiver.handle(packet);});
  bridge.onFrame(packet=>{
    if(!packet||packet.sessionId!==currentSession||typeof packet.image!=='string')return;
    if(receiver.peer?.connectionState==='connected')return;
    fallback.src=packet.image;
    fallback.hidden=false;video.hidden=true;
    note('',true);
  });
  // Đăng ký event trước rồi mới báo sẵn sàng, tránh mất SDP đầu tiên.
  bridge.ready();
  window.addEventListener('beforeunload',()=>receiver.stop());
})();
