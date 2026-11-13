/* FlightDiary CSV importer; works entirely in the browser, no third-party libraries. */
(function(){
'use strict';
const AIRPORT_COUNTRIES = {"Taipei / Taipei Songshan Airport (TSA/RCSS)": "台灣", "Tokyo / Haneda (HND/RJTT)": "日本", "Taipei / Taoyuan (TPE/RCTP)": "台灣", "Nagoya / Chubu Centrair International (NGO/RJGG)": "日本", "Kaohsiung / Kaohsiung (KHH/RCKH)": "台灣", "Tokyo / Narita (NRT/RJAA)": "日本", "Osaka / Kansai (KIX/RJBB)": "日本", "Fukuoka / Fukuoka (FUK/RJFF)": "日本", "Naha / Naha (OKA/ROAH)": "日本", "Osaka / Itami (ITM/RJOO)": "日本", "Sendai / Sendai (SDJ/RJSS)": "日本", "Toyama / Toyama (TOY/RJNT)": "日本", "Hong Kong / Hong Kong International (HKG/VHHH)": "香港", "Tottori / Tottori (TTJ/RJOR)": "日本", "Yonago / Miho (YGJ/RJOH)": "日本", "Shanghai / Pudong (PVG/ZSPD)": "中國", "Bangkok / Suvarnabhumi (BKK/VTBS)": "泰國", "Shenzhen / Shenzhen Bao'an International Airport (SZX/ZGSZ)": "中國", "Guangzhou / Canton-Baiyun (CAN/ZGGG)": "中國", "Kumamoto / Kumamoto (KMJ/RJFT)": "日本", "Takamatsu / Takamatsu (TAK/RJOT)": "日本", "Hiroshima / Hiroshima (HIJ/RJOA)": "日本", "Miyazaki / Miyazaki (KMI/RJFM)": "日本", "Kobe / Kobe (UKB/RJBE)": "日本", "Shanghai / Hongqiao (SHA/ZSSS)": "中國", "Taichung / Taichung (RMQ/RCMQ)": "台灣", "Kagoshima / Kagoshima (KOJ/RJFK)": "日本"};
const TZ = {'台灣':8,'日本':9,'中國':8,'香港':8,'澳門':8,'泰國':7,'韓國':9,'新加坡':8,'馬來西亞':8,'越南':7,'菲律賓':8,'美國':-5,'加拿大':-5};
function country(name){
 if(AIRPORT_COUNTRIES[name])return AIRPORT_COUNTRIES[name];
 const code=(name.match(/\(([A-Z0-9]{3,4})\/([A-Z0-9]{4})\)/)||[])[2]||'';
 if(/^RJ|^RO/.test(code))return '日本';if(/^RC/.test(code))return '台灣';if(/^VT/.test(code))return '泰國';if(/^Z[GSBPH]/.test(code))return '中國';if(/^VH/.test(code))return '香港';if(/^RK/.test(code))return '韓國';if(/^WM/.test(code))return '馬來西亞';if(/^WS/.test(code))return '新加坡';if(/^VV/.test(code))return '越南';if(/^RP/.test(code))return '菲律賓';
 throw Error('無法辨識機場所在國家：'+name+'。請先在 importer.js 的 AIRPORT_COUNTRIES 加入對應。');
}
function csvParse(s){
 s=s.replace(/^\uFEFF/,'');let rows=[],row=[],field='',quoted=false;
 for(let i=0;i<s.length;i++){let c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);field='';if(row.some(v=>v!==''))rows.push(row);row=[];}else field+=c;}
 if(quoted)throw Error('CSV 引號未正確結束');if(field!==''||row.length){row.push(field);rows.push(row);}return rows;
}
function parseDuration(s){let m=/^(\d+):(\d{2}):(\d{2})$/.exec(s||'');return m?(+m[1]*3600+ +m[2]*60+ +m[3]):null;}
function isoLocal(ms,offset){return new Date(ms+offset*3600000).toISOString().slice(0,19);}
function localEpoch(date,time,offset){return Date.parse(date+'T'+(time||'00:00:00')+'Z')-offset*3600000;}
function avgInterval(list){if(list.length<2)return null;return Math.round((list.at(-1).epoch-list[0].epoch)/1000/(list.length-1));}
function build(csvText, now=new Date()){
 const matrix=csvParse(csvText);if(!matrix.length)throw Error('CSV 沒有資料');const header=matrix.shift().map(x=>x.trim());
 const required=['Date','Flight number','From','To','Dep time','Arr time','Duration','Airline','Aircraft'];for(const h of required)if(!header.includes(h))throw Error('缺少必要欄位：'+h);
 const rows=matrix.map((r,i)=>Object.fromEntries(header.map((h,j)=>[h,r[j]||'']))).filter(r=>r.Date);
 const flights=rows.map((r,i)=>{
  const fromCountry=country(r.From),toCountry=country(r.To),offsetFrom=TZ[fromCountry]??8,offsetTo=TZ[toCountry]??8;
  const depEpoch=localEpoch(r.Date,r['Dep time'],offsetFrom),durationSeconds=parseDuration(r.Duration);
  let arrEpoch=localEpoch(r.Date,r['Arr time'],offsetTo);
  if(durationSeconds!=null){const estimated=depEpoch+durationSeconds*1000;const days=Math.round((estimated-arrEpoch)/86400000);arrEpoch+=days*86400000;}
  else while(arrEpoch<depEpoch)arrEpoch+=86400000;
  const completed=arrEpoch<=now.getTime();
  return {date:r.Date,flight:r['Flight number'],from:r.From,to:r.To,fromCountry,toCountry,departure:isoLocal(depEpoch,offsetFrom),arrival:isoLocal(arrEpoch,offsetTo),duration:r.Duration,durationSeconds:durationSeconds??Math.max(0,Math.round((arrEpoch-depEpoch)/1000)),airline:r.Airline,aircraft:r.Aircraft,registration:r.Registration||'',seatNumber:r['Seat number']||'',completed,_depEpoch:depEpoch,_arrEpoch:arrEpoch};
 }).sort((a,b)=>a._depEpoch-b._depEpoch);
 // A visit begins when entering a country and ends when departing it. Domestic flights extend the same visit.
 const visits=[];let active=null;
 for(const f of flights.filter(x=>x.completed)){
  if(f.fromCountry!==f.toCountry){
   if(active&&active.country===f.fromCountry){active.departure=f.departure;active.departureFlight=f.flight;active.departureAirport=f.from;active.endEpoch=f._depEpoch;active.durationSeconds=Math.max(0,Math.round((active.endEpoch-active.startEpoch)/1000));visits.push(active);active=null;}
   if(f.toCountry!=='台灣'){if(active){active=null;}active={country:f.toCountry,arrival:f.arrival,departure:null,durationSeconds:null,arrivalFlight:f.flight,departureFlight:'',arrivalAirport:f.to,departureAirport:'',startEpoch:f._arrEpoch,epoch:f._arrEpoch};}
  }
 }
 // Incomplete visits are not counted in stay metrics, but flights remain visible.
 const completedVisits=visits.filter(v=>v.departure&&v.durationSeconds!=null);
 const annual=[];const groups=new Map();for(const v of completedVisits){const y=Number(v.arrival.slice(0,4)),k=y+'|'+v.country;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(v);}
 for(const [key,list] of groups){list.sort((a,b)=>a.epoch-b.epoch);const total=list.reduce((s,v)=>s+v.durationSeconds,0);annual.push({year:Number(key.split('|')[0]),country:list[0].country,visits:list.length,avg_interval_seconds:avgInterval(list),avg_stay_seconds:Math.round(total/list.length),total_stay_seconds:total});}
 const excludedFlights=flights.filter(x=>!x.completed).map(x=>({date:x.date,flight:x.flight}));
 const cleanFlights=flights.map(({_depEpoch,_arrEpoch,...rest})=>rest);
 const cleanVisits=completedVisits.map(({startEpoch,endEpoch,epoch,...rest})=>rest);
 return {generatedAt:now.toISOString().slice(0,10),cutoff:now.toISOString(),annual,visits:cleanVisits,flights:cleanFlights,excludedFlights};
}
window.FlightCsvImporter={build,parse:csvParse};
})();
