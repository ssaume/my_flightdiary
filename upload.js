(function(){
'use strict';
const $=id=>document.getElementById(id), status=$('uploadStatus');
let candidate=null;
function setStatus(message,error=false){status.textContent=message;status.style.color=error?'#b42318':'';}
// Session-only preview. No token or CSV is saved persistently.
try{const raw=sessionStorage.getItem('flightDashboardPreview');if(raw){window.FLIGHT_DATA_PREVIEW=JSON.parse(raw);setStatus('目前顯示 CSV 預覽資料。若要讓其他裝置看到，請展開「發布到 GitHub」並提交。');$('publishUpload').disabled=false;candidate=window.FLIGHT_DATA_PREVIEW;}}catch(e){sessionStorage.removeItem('flightDashboardPreview');}
$('previewUpload').addEventListener('click',async()=>{
 const file=$('csvUpload').files[0];if(!file){setStatus('請先選擇 CSV 檔案。',true);return;}
 try{
  const result=window.FlightCsvImporter.build(await file.text());
  if(!result.flights.length)throw Error('CSV 沒有有效航班');
  candidate=result;sessionStorage.setItem('flightDashboardPreview',JSON.stringify(result));
  $('publishUpload').disabled=false;
  setStatus(`解析成功：${result.flights.length} 筆航班、${result.visits.length} 筆已完成停留、${result.excludedFlights.length} 筆未完成航班。正在重新載入預覽…`);
  location.reload();
 }catch(e){setStatus('匯入失敗：'+e.message,true);}
});
function base64Utf8(str){const bytes=new TextEncoder().encode(str);let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);}
$('publishUpload').addEventListener('click',async()=>{
 if(!candidate){setStatus('請先匯入 CSV 並預覽。',true);return;}
 const owner=$('repoOwner').value.trim(),repo=$('repoName').value.trim(),branch=$('repoBranch').value.trim()||'main',token=$('githubToken').value.trim();
 if(!/^[\w.-]+$/.test(owner)||!/^[\w.-]+$/.test(repo)||!/^[\w./-]+$/.test(branch)||!token){setStatus('請完整填寫 GitHub 帳號、Repository、分支與 Token。',true);return;}
 const btn=$('publishUpload');btn.disabled=true;setStatus('正在取得 GitHub 上的 data.js 版本資訊…');
 try{
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/data.js`;
  const headers={Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'};
  const existing=await fetch(url+'?ref='+encodeURIComponent(branch),{headers,cache:'no-store'});
  if(!existing.ok)throw Error('讀取 GitHub 失敗（HTTP '+existing.status+'）。請檢查 Repository、分支與 Token 權限。');
  const info=await existing.json();
  setStatus('正在提交更新到 GitHub…');
  const content='window.FLIGHT_DATA = '+JSON.stringify(candidate,null,2)+';\n';
  const response=await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'Update FlightDiary data via dashboard',content:base64Utf8(content),sha:info.sha,branch})});
  if(!response.ok){const details=await response.json().catch(()=>({}));throw Error('GitHub 更新失敗（HTTP '+response.status+'）：'+(details.message||'請檢查權限與分支保護設定'));}
  sessionStorage.removeItem('flightDashboardPreview');window.FLIGHT_DATA_PREVIEW=null;candidate=null;
  $('githubToken').value='';setStatus('已成功提交 data.js 到 GitHub！等待 Pages 部署完成後，重新整理網站即可看到新資料。');
 }catch(e){setStatus(e.message,true);}finally{btn.disabled=!candidate;}
});
})();
