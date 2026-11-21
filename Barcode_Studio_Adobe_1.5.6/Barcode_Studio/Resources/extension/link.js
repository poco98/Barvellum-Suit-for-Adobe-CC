(function(){
  'use strict';
  function parse(value){var address;try{address=new URL(value.trim());}catch(error){throw new Error('Enter a complete URL, for example https://example.com/manual.');}if(!/^https?:$/.test(address.protocol))throw new Error('Only http:// and https:// links are supported.');if(address.username||address.password)throw new Error('Do not include a username or password in the URL.');if(address.href.length>4096)throw new Error('The URL is too long.');return address;}
  function describe(status,url,redirects){var result={status:status,url:url,redirects:redirects};if(status>=200&&status<300){result.kind='ok';result.message='Link reached successfully (HTTP '+status+').';}else if(status===401||status===403){result.kind='warn';result.message='Server reached, but access is restricted (HTTP '+status+').';}else if(status>=400){result.kind='error';result.message='The server returned HTTP '+status+'. Check the address.';}else{result.kind='warn';result.message='The link returned HTTP '+status+'. Availability is not confirmed.';}return result;}
  async function check(value,requireOverride){
    var start=parse(value),requireNode=requireOverride||window.cep_node&&window.cep_node.require||window.require,deadline=Date.now()+12000;
    if(typeof requireNode==='function'){
      try{
        var http=requireNode('http'),https=requireNode('https');
        function visit(address,remaining,method,redirects){return new Promise(function(resolve){
          var done=false,request,timer;
          function finish(result){if(!done){done=true;clearTimeout(timer);resolve(result);}}
          var timeout=Math.max(1,Math.min(7000,deadline-Date.now()));
          if(Date.now()>=deadline){finish({kind:'warn',message:'Link check timed out. Availability is not confirmed.'});return;}
          try{request=(address.protocol==='https:'?https:http).request(address.href,{method:method,headers:{'User-Agent':'BarcodeStudio/1.3','Accept':'*/*'}},function(response){
            var status=response.statusCode||0,location=response.headers&&response.headers.location;
            if(typeof response.destroy==='function')response.destroy();
            if(done)return;
            clearTimeout(timer);
            if([301,302,303,307,308].includes(status)&&location){
              if(!remaining){finish({kind:'warn',message:'Too many redirects. Availability is not confirmed.'});return;}
              try{var next=parse(new URL(location,address).href);visit(next,remaining-1,'HEAD',redirects+1).then(finish);}catch(error){finish({kind:'error',message:error.message});}return;
            }
            if((status===405||status===501)&&method==='HEAD'){visit(address,remaining,'GET',redirects).then(finish);return;}
            finish(describe(status,address.href,redirects));
          });
          // Socket timeouts alone do not cover a stalled DNS lookup.
          timer=setTimeout(function(){finish({kind:'warn',message:'Link check timed out. Availability is not confirmed.'});request.destroy();},timeout);
          request.on('error',function(error){finish({kind:'warn',message:'Unable to confirm the link: '+error.message});});request.end();}
          catch(error){finish({kind:'warn',message:'Unable to confirm the link: '+error.message});}
        });}
        return await visit(start,5,'HEAD',0);
      }catch(noNode){/* Use the limited browser check below. */}
    }
    var controller=typeof AbortController!=='undefined'?new AbortController():null,timer=controller?setTimeout(function(){controller.abort();},8000):null;
    try{var response=await fetch(start.href,{method:'HEAD',cache:'no-store',credentials:'omit',redirect:'follow',signal:controller?controller.signal:undefined});if(response.type==='opaque'||!response.status)return {kind:'warn',message:'The browser does not expose this server’s status. Use Open link to check it manually.'};return describe(response.status,response.url||start.href,0);}
    catch(error){return {kind:'warn',message:'Availability could not be confirmed. The server may block browser checks. Use Open link to test it manually.'};}
    finally{if(timer)clearTimeout(timer);}
  }
  window.CodeLink={parse:parse,check:check,describe:describe};
})();
