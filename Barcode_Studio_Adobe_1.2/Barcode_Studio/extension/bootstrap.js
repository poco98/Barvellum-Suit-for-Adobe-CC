(function(){
  'use strict';
  var state={ready:false,errors:[],version:'1.2.0'};
  function report(message){
    state.errors.push(String(message));
    var text='Barcode Studio could not start: '+message;
    var footer=document.getElementById('status'),box=document.getElementById('boot-status');
    if(footer)footer.textContent=text;
    if(box){box.hidden=false;box.textContent=text+' Close the Adobe app and run Install.cmd from the complete extracted package.';box.className='notice error';}
  }
  window.CodeStudioBoot=state;
  state.fail=report;
  window.addEventListener('error',function(event){
    if(event.target&&event.target.tagName==='SCRIPT')report('Missing script: '+event.target.getAttribute('src'));
    else if(!state.ready)report(event.message||'Unknown script error');
  },true);
  window.addEventListener('unhandledrejection',function(event){
    var message=event.reason&&event.reason.message||String(event.reason);
    if(!state.ready)report(message);else{var footer=document.getElementById('status');if(footer)footer.textContent='Error: '+message;}
  });
  window.addEventListener('load',function(){if(!state.ready&&!state.errors.length)report('The panel did not finish initialising.');});
})();
