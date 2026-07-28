const D = window.FLIGHT_DATA;
const yearEl = document.querySelector('#yearFilter');
const countryEl = document.querySelector('#countryFilter');
const years = [...new Set(D.annual.map(x => x.year))].sort((a,b)=>a-b);
const countries = [...new Set(D.annual.map(x => x.country))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
let selectedSummaryCountry = null;

years.forEach(y => yearEl.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`));
countries.forEach(c => countryEl.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));

document.querySelector('#rangeLabel').textContent = `${years[0]}–${years.at(-1)}`;
document.querySelector('#heroRange').textContent = `${years[0]}–${years.at(-1)}`;

const pad = n => String(n).padStart(2,'0');
function dur(sec){
  if(sec == null) return '—';
  sec = Math.max(0, Math.round(sec));
  const d = Math.floor(sec/86400); sec %= 86400;
  const h = Math.floor(sec/3600); sec %= 3600;
  const m = Math.floor(sec/60), s = sec%60;
  return `${d}天 ${pad(h)}時${pad(m)}分${pad(s)}秒`;
}
function dt(s){ return s ? s.replace('T',' ') : '—'; }
function esc(v=''){ return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function filteredAnnual(){
  return D.annual.filter(x =>
    (yearEl.value === 'all' || String(x.year) === yearEl.value) &&
    (countryEl.value === 'all' || x.country === countryEl.value)
  );
}
function baseFilteredVisits(){
  return D.visits.filter(x =>
    (yearEl.value === 'all' || x.arrival.startsWith(yearEl.value)) &&
    (countryEl.value === 'all' || x.country === countryEl.value)
  );
}
function filteredVisits(){
  return baseFilteredVisits().filter(x => !selectedSummaryCountry || x.country === selectedSummaryCountry);
}
function filteredFlights(){
  return D.flights.filter(x =>
    (yearEl.value === 'all' || x.date.startsWith(yearEl.value)) &&
    (countryEl.value === 'all' || x.fromCountry === countryEl.value || x.toCountry === countryEl.value)
  );
}

function renderKpis(rows){
  const countryCount = new Set(rows.map(x=>x.country)).size;
  const totalVisits = rows.reduce((a,b)=>a+b.visits,0);
  const totalStay = rows.reduce((a,b)=>a+b.total_stay_seconds,0);
  const avg = totalVisits ? Math.round(totalStay/totalVisits) : 0;
  document.querySelector('#kpis').innerHTML = `
    <div class="kpi"><div class="label">造訪國家／地區</div><div class="value">${countryCount}</div><div class="sub">目前篩選範圍</div></div>
    <div class="kpi"><div class="label">總造訪次數</div><div class="value">${totalVisits}</div><div class="sub">跨境抵達才計次</div></div>
    <div class="kpi"><div class="label">累積停留時間</div><div class="value">${dur(totalStay).split(' ')[0]}</div><div class="sub">${dur(totalStay)}</div></div>
    <div class="kpi"><div class="label">平均每次停留</div><div class="value">${dur(avg).split(' ')[0]}</div><div class="sub">${dur(avg)}</div></div>`;
}

function renderTable(rows){
  const title = yearEl.value === 'all' ? `${years[0]}–${years.at(-1)} 年度實績` : `${yearEl.value} 年度實績`;
  document.querySelector('#annualTitle').textContent = title;
  document.querySelector('#annualBody').innerHTML = rows
    .slice().sort((a,b)=>b.year-a.year || a.country.localeCompare(b.country,'zh-Hant'))
    .map(x => `<tr class="annual-row ${selectedSummaryCountry===x.country?'selected':''}" data-country="${esc(x.country)}">
      <td>${x.year}</td>
      <td><button class="country-link" data-country="${esc(x.country)}">${esc(x.country)}</button></td>
      <td>${x.visits} 次</td><td>${dur(x.avg_interval_seconds)}</td>
      <td>${dur(x.avg_stay_seconds)}</td><td>${dur(x.total_stay_seconds)}</td>
    </tr>`).join('') || '<tr><td colspan="6">沒有符合條件的資料</td></tr>';
}

function renderDetails(visits){
  const suffix = selectedSummaryCountry ? ` · 已鎖定 ${selectedSummaryCountry}` : '';
  document.querySelector('#detailCount').textContent = `${visits.length} 筆${suffix}`;
  document.querySelector('#detailHint').textContent = selectedSummaryCountry ? `點擊頁面空白處可解除「${selectedSummaryCountry}」篩選` : '點擊上方年度實績中的國家，可快速篩選此表';
  document.querySelector('#detailBody').innerHTML = visits.slice().sort((a,b)=>b.arrival.localeCompare(a.arrival)).map(x=>`
    <tr><td>${esc(x.country)}</td><td>${dt(x.arrival)}</td><td>${dt(x.departure)}</td>
    <td>${dur(x.durationSeconds)}</td><td>${esc(x.arrivalFlight)}</td><td>${esc(x.departureFlight)}</td>
    <td>${esc(x.arrivalAirport)}</td><td>${esc(x.departureAirport)}</td></tr>`).join('') || '<tr><td colspan="8">沒有符合條件的資料</td></tr>';
}

function renderFlights(flights){
  document.querySelector('#flightCount').textContent = `${flights.length} 筆`;
  document.querySelector('#flightBody').innerHTML = flights.slice().sort((a,b)=>b.departure.localeCompare(a.departure)).map(x=>`
    <tr class="${x.completed?'':'future-row'}"><td>${x.date}</td><td>${esc(x.flight)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td>
    <td>${dt(x.departure)}</td><td>${dt(x.arrival)}</td><td>${esc(x.duration)}</td><td>${esc(x.airline)}</td>
    <td>${esc(x.aircraft)}</td><td>${esc(x.registration)||'—'}</td><td>${esc(x.seatNumber)||'—'}</td><td>${x.completed?'已完成':'未出發'}</td></tr>`).join('') || '<tr><td colspan="12">沒有符合條件的資料</td></tr>';
}

function chart(id,rows,key,format){
  const grouped = [...new Set(rows.map(x=>x.year))].sort().map(year=>({year,value:rows.filter(x=>x.year===year).reduce((a,b)=>a+b[key],0)}));
  const max = Math.max(...grouped.map(x=>x.value),1);
  document.querySelector(id).innerHTML = grouped.map(x=>`<div class="bar-group"><div class="bar" style="height:${Math.max(4,x.value/max*220)}px"><span>${format(x.value)}</span></div><div class="xlab">${x.year}</div></div>`).join('') || '<p>沒有資料</p>';
}

function render(){
  const rows = filteredAnnual();
  renderKpis(rows);
  renderTable(rows);
  renderDetails(filteredVisits());
  renderFlights(filteredFlights());
  chart('#visitChart',rows,'visits',v=>v+'次');
  chart('#stayChart',rows,'total_stay_seconds',v=>Math.round(v/86400)+'天');
}

function clearRowSelection(){
  if(!selectedSummaryCountry) return;
  selectedSummaryCountry = null;
  renderTable(filteredAnnual());
  renderDetails(filteredVisits());
}

yearEl.addEventListener('change',()=>{ selectedSummaryCountry=null; render(); });
countryEl.addEventListener('change',()=>{ selectedSummaryCountry=null; render(); });
document.querySelector('#resetBtn').addEventListener('click',()=>{ yearEl.value='all'; countryEl.value='all'; selectedSummaryCountry=null; render(); });

document.querySelector('#annualBody').addEventListener('click',e=>{
  const btn=e.target.closest('.country-link');
  if(!btn) return;
  e.stopPropagation();
  const c=btn.dataset.country;
  selectedSummaryCountry = selectedSummaryCountry===c ? null : c;
  renderTable(filteredAnnual());
  renderDetails(filteredVisits());
  document.querySelector('#detailsCard').scrollIntoView({behavior:'smooth',block:'start'});
});
document.querySelector('#annualTableCard').addEventListener('click',e=>e.stopPropagation());
document.querySelector('#detailsCard').addEventListener('click',e=>e.stopPropagation());
document.addEventListener('click',clearRowSelection);

document.querySelector('#downloadCsv').addEventListener('click',()=>{
  const rows=filteredAnnual();
  const csv=['年份,國家／地區,造訪次數,平均到訪間隔,平均每次停留,年度總停留',...rows.map(x=>[x.year,x.country,x.visits,dur(x.avg_interval_seconds),dur(x.avg_stay_seconds),dur(x.total_stay_seconds)].join(','))].join('\n');
  const b=new Blob(['﻿'+csv],{type:'text/csv'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download='flight-summary.csv';a.click();URL.revokeObjectURL(a.href);
});

document.querySelector('#excluded').innerHTML=`<div class="excluded">已排除 ${D.excludedFlights.length} 筆尚未出發航班：${D.excludedFlights.map(x=>`${x.date} ${x.flight}`).join('、')}</div>`;
render();
