
const D=window.FLIGHT_DATA;
const yearEl=document.querySelector('#yearFilter'), countryEl=document.querySelector('#countryFilter');
[2023,2024,2025,2026].forEach(y=>yearEl.insertAdjacentHTML('beforeend',`<option>${y}</option>`));
[...new Set(D.annual.map(x=>x.country))].sort().forEach(c=>countryEl.insertAdjacentHTML('beforeend',`<option>${c}</option>`));
const pad=n=>String(n).padStart(2,'0');
function dur(sec){if(sec==null)return '—';sec=Math.max(0,Math.round(sec));const d=Math.floor(sec/86400);sec%=86400;const h=Math.floor(sec/3600);sec%=3600;const m=Math.floor(sec/60),s=sec%60;return `${d}天 ${pad(h)}時${pad(m)}分${pad(s)}秒`}
function dt(s){return s.replace('T',' ')}
function filteredAnnual(){return D.annual.filter(x=>(yearEl.value==='all'||String(x.year)===yearEl.value)&&(countryEl.value==='all'||x.country===countryEl.value))}
function filteredVisits(){return D.visits.filter(x=>(yearEl.value==='all'||x.arrival.startsWith(yearEl.value))&&(countryEl.value==='all'||x.country===countryEl.value))}
function renderKpis(rows,visits){const countries=new Set(rows.map(x=>x.country)).size,totalVisits=rows.reduce((a,b)=>a+b.visits,0),totalStay=rows.reduce((a,b)=>a+b.total_stay_seconds,0);const avg=totalVisits?Math.round(totalStay/totalVisits):0;document.querySelector('#kpis').innerHTML=`
<div class="kpi"><div class="label">造訪國家／地區</div><div class="value">${countries}</div><div class="sub">目前篩選範圍</div></div>
<div class="kpi"><div class="label">總造訪次數</div><div class="value">${totalVisits}</div><div class="sub">國內線不重複計次</div></div>
<div class="kpi"><div class="label">累積停留時間</div><div class="value">${dur(totalStay).split(' ')[0]}</div><div class="sub">${dur(totalStay)}</div></div>
<div class="kpi"><div class="label">平均每次停留</div><div class="value">${dur(avg).split(' ')[0]}</div><div class="sub">${dur(avg)}</div></div>`}
function renderTable(rows){document.querySelector('#annualBody').innerHTML=rows.sort((a,b)=>b.year-a.year||a.country.localeCompare(b.country,'zh-Hant')).map(x=>`<tr><td>${x.year}</td><td>${x.country}</td><td>${x.visits} 次</td><td>${dur(x.avg_interval_seconds)}</td><td>${dur(x.avg_stay_seconds)}</td><td>${dur(x.total_stay_seconds)}</td></tr>`).join('')||'<tr><td colspan="6">沒有符合條件的資料</td></tr>'}
function renderDetails(visits){document.querySelector('#detailCount').textContent=`${visits.length} 筆`;document.querySelector('#detailBody').innerHTML=visits.sort((a,b)=>b.arrival.localeCompare(a.arrival)).map(x=>`<tr><td>${x.country}</td><td>${dt(x.arrival)}</td><td>${dt(x.departure)}</td><td>${dur(x.durationSeconds)}</td><td>${x.arrivalFlight}</td><td>${x.departureFlight}</td></tr>`).join('')||'<tr><td colspan="6">沒有符合條件的資料</td></tr>'}
function chart(id,rows,key,format){const years=[...new Set(rows.map(x=>x.year))].sort();const grouped=years.map(y=>({year:y,value:rows.filter(x=>x.year===y).reduce((a,b)=>a+b[key],0)}));const max=Math.max(...grouped.map(x=>x.value),1);document.querySelector(id).innerHTML=grouped.map(x=>`<div class="bar-group"><div class="bar" style="height:${Math.max(4,x.value/max*220)}px"><span>${format(x.value)}</span></div><div class="xlab">${x.year}</div></div>`).join('')+(grouped.length?'':'<p>沒有資料</p>')}
function render(){const rows=filteredAnnual(), visits=filteredVisits();renderKpis(rows,visits);renderTable(rows);renderDetails(visits);chart('#visitChart',rows,'visits',v=>v+'次');chart('#stayChart',rows,'total_stay_seconds',v=>Math.round(v/86400)+'天')}
yearEl.onchange=render;countryEl.onchange=render;document.querySelector('#resetBtn').onclick=()=>{yearEl.value='all';countryEl.value='all';render()};
document.querySelector('#downloadCsv').onclick=()=>{const rows=filteredAnnual();const csv=['年份,國家／地區,造訪次數,平均到訪間隔,平均每次停留,年度總停留',...rows.map(x=>[x.year,x.country,x.visits,dur(x.avg_interval_seconds),dur(x.avg_stay_seconds),dur(x.total_stay_seconds)].join(','))].join('\n');const b=new Blob(['﻿'+csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='flight-summary.csv';a.click();URL.revokeObjectURL(a.href)};
document.querySelector('#excluded').innerHTML=`<div class="excluded">已排除 ${D.excludedFlights.length} 筆尚未出發航班：${D.excludedFlights.map(x=>`${x.date} ${x.flight}`).join('、')}</div>`;
render();
