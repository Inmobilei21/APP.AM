/* Modelo 390 (resumen anual del IVA) en Borradores. Se abre desde la fila «Declaración anual» del 303.
   Las casillas salen de la suma de los cuatro 303 del ejercicio (y de sus líneas de facturas, para el desglose
   por tipos); cualquier casilla se puede escribir a mano. Se divide en pestañas como el 303: identificación,
   IVA devengado, IVA deducible, resultado, volumen de operaciones y operaciones específicas / prorrata.
   Se guarda en Control de declaraciones (390 · 4T). Se carga después de m303.js. */
(function(){
if(typeof taxDraftBuild!=="function"||typeof TAX_DRAFT_BUILDERS==="undefined")return;
const M="390",SRC="303",PERIOD="4T";
const num=v=>{if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const n=Number(s.includes(",")||/^-?\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,"").replace(",","."):s);return Number.isFinite(n)?n:0};
const has=v=>v!==undefined&&v!==null&&String(v).trim()!=="";
const inputValue=v=>{if(!has(v))return"";const n=num(v),[i,d]=Math.abs(n).toFixed(2).split(".");return(n<0?"-":"")+i.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+d};
const rateText=r=>String(r).replace(".",",");
if(typeof TAX_DRAFT_ANNUAL!=="undefined")TAX_DRAFT_ANNUAL[SRC]=[M,"Declaración-resumen anual del IVA"];

/* --- Casillas del modelo (ejercicio 2025) --- */
// IVA devengado: grupos con una fila por tipo [tipo, base, cuota]; other = régimen poco habitual (se pliega si está vacío).
const DEV=[
  {k:"ord",label:"Régimen ordinario",rows:[[0,"700","701"],[2,"667","668"],[4,"01","02"],[5,"702","703"],[7.5,"669","670"],[10,"03","04"],[21,"05","06"]]},
  {k:"ig",label:"Operaciones intragrupo",other:true,rows:[[0,"704","705"],[2,"671","672"],[4,"500","501"],[5,"706","707"],[7.5,"673","674"],[10,"502","503"],[21,"504","505"]]},
  {k:"caja",label:"Régimen especial del criterio de caja",other:true,rows:[[0,"708","709"],[2,"675","676"],[4,"643","644"],[5,"710","711"],[7.5,"677","678"],[10,"645","646"],[21,"647","648"]]},
  {k:"rebu",label:"Régimen especial de bienes usados, objetos de arte, antigüedades y objetos de colección",other:true,rows:[[0,"712","713"],[2,"679","680"],[4,"07","08"],[5,"714","715"],[7.5,"681","682"],[10,"09","10"],[21,"11","12"]]},
  {k:"agv",label:"Régimen especial de agencias de viaje",other:true,rows:[[21,"13","14"]]},
  {k:"aib",label:"Adquisiciones intracomunitarias de bienes",rows:[[0,"716","717"],[2,"683","684"],[4,"21","22"],[5,"718","719"],[7.5,"685","686"],[10,"23","24"],[21,"25","26"]]},
  {k:"ais",label:"Adquisiciones intracomunitarias de servicios",rows:[[0,"720","721"],[2,"687","688"],[4,"545","546"],[5,"722","723"],[7.5,"689","690"],[10,"547","548"],[21,"551","552"]]},
  {k:"isp",label:"IVA devengado en otros supuestos de inversión del sujeto pasivo",rows:[[null,"27","28"]]},
  {k:"mod",label:"Modificación de bases y cuotas",signed:true,rows:[[null,"29","30"]]},
  {k:"modig",label:"Modificación de bases y cuotas de operaciones intragrupo",signed:true,other:true,rows:[[null,"649","650"]]},
  {k:"conc",label:"Modificación de bases y cuotas por auto de declaración de concurso de acreedores",signed:true,rows:[[null,"31","32"]]}];
const RE=[[0,"663","664"],[0.26,"691","692"],[0.5,"35","36"],[0.62,"665","666"],[1,"693","694"],[1.4,"599","600"],[5.2,"601","602"],[1.75,"41","42"]];
const RE_MOD=[["Modificación recargo equivalencia","43","44"],["Modificación recargo equivalencia por auto de declaración de concurso de acreedores","45","46"]];
// IVA deducible: grupos por tipo con su total [base, cuota].
const DED=[
  {k:"ic",label:"Operaciones interiores de bienes y servicios corrientes",total:["48","49"],rows:[[2,"695","696"],[4,"190","191"],[5,"724","725"],[7.5,"697","698"],[10,"603","604"],[21,"605","606"]]},
  {k:"igc",label:"Operaciones intragrupo de bienes y servicios corrientes",other:true,total:["512","513"],rows:[[2,"745","746"],[4,"506","507"],[5,"726","727"],[7.5,"747","748"],[10,"607","608"],[21,"609","610"]]},
  {k:"ii",label:"Operaciones interiores de bienes de inversión",total:["50","51"],rows:[[2,"749","750"],[4,"196","197"],[5,"728","729"],[7.5,"751","752"],[10,"611","612"],[21,"613","614"]]},
  {k:"igi",label:"Operaciones intragrupo de bienes de inversión",other:true,total:["520","521"],rows:[[2,"753","754"],[4,"514","515"],[5,"730","731"],[7.5,"755","756"],[10,"615","616"],[21,"617","618"]]},
  {k:"imc",label:"Importaciones de bienes corrientes",total:["52","53"],rows:[[2,"757","758"],[4,"202","203"],[5,"732","733"],[7.5,"759","760"],[10,"619","620"],[21,"621","622"]]},
  {k:"imi",label:"Importaciones de bienes de inversión",total:["54","55"],rows:[[2,"761","762"],[4,"208","209"],[5,"734","735"],[7.5,"763","764"],[10,"623","624"],[21,"625","626"]]},
  {k:"aic",label:"Adquisiciones intracomunitarias de bienes corrientes",total:["56","57"],rows:[[2,"765","766"],[4,"214","215"],[5,"736","737"],[7.5,"767","768"],[10,"627","628"],[21,"629","630"]]},
  {k:"aii",label:"Adquisiciones intracomunitarias de bienes de inversión",total:["58","59"],rows:[[2,"769","770"],[4,"220","221"],[5,"738","739"],[7.5,"771","772"],[10,"631","632"],[21,"633","634"]]},
  {k:"aisd",label:"Adquisiciones intracomunitarias de servicios",total:["597","598"],rows:[[2,"773","774"],[4,"587","588"],[5,"740","741"],[7.5,"775","776"],[10,"635","636"],[21,"637","638"]]}];
const DED_OTHER=[["Compensaciones en régimen especial de la agricultura, ganadería y pesca","60","61"],["Cuotas deducibles en virtud de resolución administrativa o sentencia firmes con tipos no vigentes","660","661"],
  ["Rectificación de deducciones","639","62",true],["Rectificación de deducciones por operaciones intragrupo","651","652",true],["Regularización de bienes de inversión",null,"63",true],["Regularización por aplicación porcentaje definitivo de prorrata",null,"522",true]];
const VOL=[["99","Operaciones en régimen general"],["653","Operaciones a las que habiéndoles sido aplicado el régimen especial del criterio de caja hubieran resultado devengadas conforme a la regla general (art. 75 LIVA)"],
  ["103","Entregas intracomunitarias de bienes y servicios"],["104","Exportaciones y otras operaciones exentas con derecho a deducción"],["105","Operaciones exentas sin derecho a deducción"],
  ["110","Operaciones no sujetas por reglas de localización (excepto las incluidas en la casilla 126)"],["125","Operaciones sujetas con inversión del sujeto pasivo"],
  ["126","Operaciones no sujetas por reglas de localización acogidas a los regímenes especiales de ventanilla única"],["127","Operaciones sujetas y acogidas a los regímenes especiales de ventanilla única"],
  ["128","Operaciones intragrupo valoradas conforme a lo dispuesto en los arts. 78 y 79 LIVA"],["100","Operaciones en régimen simplificado"],["101","Operaciones en régimen especial de la agricultura, ganadería y pesca"],
  ["102","Operaciones realizadas por sujetos pasivos acogidos al régimen especial del recargo de equivalencia"],["227","Operaciones en régimen especial de bienes usados, objetos de arte, antigüedades y objetos de colección"],
  ["228","Operaciones en régimen especial de agencias de viajes"],["106","Entregas de bienes inmuebles, operaciones financieras y relativas al oro de inversión no habituales",true],["107","Entregas de bienes de inversión",true]];
const ESP=[["230","Adquisiciones interiores exentas"],["109","Adquisiciones intracomunitarias exentas"],["231","Importaciones exentas"],["232","Bases imponibles del IVA soportado no deducible"],
  ["111","Operaciones sujetas y no exentas que originan el derecho a la devolución mensual"],["113","Entregas interiores de bienes devengadas por inversión del sujeto pasivo como consecuencia de operaciones triangulares"],
  ["523","Servicios localizados en el territorio de aplicación del impuesto por inversión del sujeto pasivo"]];
const CLAVES=[["A01","Arrendadores de bienes inmuebles"],["A02","Ganadería independiente"],["A03","Resto de actividades empresariales"],["A04","Actividades profesionales de carácter artístico o deportivo"],["A05","Resto de actividades profesionales"],
  ["B01","Actividad agrícola"],["B02","Actividad ganadera dependiente"],["B03","Actividad forestal"],["B04","Producción del mejillón en batea"],["B05","Actividad pesquera"],["B06","Otras actividades no sujetas al IAE"],["C","Actividades no iniciadas"]];
const devRows=DEV.flatMap(g=>g.rows.map(([rate,b,cu])=>({g,rate,b,cu})));
const dedRows=DED.flatMap(g=>g.rows.map(([rate,b,cu])=>({g,rate,b,cu})));

/* --- Estado (Control de declaraciones · 390 · 4T) --- */
const st=()=>{const m=declarationData(M,PERIOD,taxDrafts.client,taxDraftYear()).m390||{};m.v=m.v||{};m.f=m.f||{};return m};
function save(change){const year=taxDraftYear(),key=declarationKey(M,PERIOD,taxDrafts.client,year),data=declarationData(M,PERIOD,taxDrafts.client,year);
  const m={v:{},f:{},...(data.m390||{})};m.v={...m.v};m.f={...m.f};change(m);data.m390=m;localStorage.setItem(key,JSON.stringify(data))}

/* --- Cálculo: suma de los cuatro 303 --- */
function quarters(){
  return ["1T","2T","3T","4T"].map(period=>{const control=declarationData(SRC,period,taxDrafts.client,taxDraftYear());
    if(control.notRequired)return{period,skip:true};let r=null;try{r=taxDraftBuild(SRC,period).calc}catch{}return{period,r,control}}).filter(q=>!q.skip&&q.r);
}
function calc(){
  const m=st(),v=m.v,qs=quarters(),A={},add=(n,x)=>{if(!n||!x)return;A[n]=tdRound((A[n]||0)+x)},S=n=>tdRound(qs.reduce((s,q)=>s+(Number(q.r.c[n])||0),0));
  const warn=[];
  const rowFor=(group,rate)=>{const rows=group.rows;let row=rows.find(r=>r[0]!==null&&Math.abs(r[0]-rate)<0.001);if(!row){row=rows[rows.length-1];if(rate)warn.push(`Tipo ${rateText(rate)} % de «${group.label}» sumado al ${rateText(row[0])} %`)}return row};
  const G=k=>DEV.find(g=>g.k===k),GD=k=>DED.find(g=>g.k===k);
  // Reparte un total del 303 entre los tipos según sus líneas de facturas; lo que no cuadra va al 21 %.
  const spread=(group,lines,base,cuota,cuotaOf)=>{let sb=0,sc=0;
    for(const l of lines){const rate=Number(l.tipo)||0,row=rowFor(group,rate||21),c=cuotaOf(l);add(row[1],l.base);add(row[2],c);sb+=l.base;sc+=c}
    const row=rowFor(group,21);add(row[1],tdRound(base-sb));add(row[2],tdRound(cuota-sc))};
  for(const q of qs){const c=q.r.c,rec=q.r.rec.lines||[];
    // Devengado · régimen ordinario por tipos.
    const ord=G("ord");[["150","152",0],["01","03",4],["04","06",10],["07","09",21]].forEach(([b,cu,rate])=>{const row=rowFor(ord,rate);add(row[1],c[b]);add(row[2],c[cu])});
    [["153","154","155"],["165","166","167"]].forEach(([b,t,cu])=>{if(c[b]||c[cu]){const row=rowFor(ord,Number(c[t])||0);add(row[1],c[b]);add(row[2],c[cu])}});
    // Adquisiciones intracomunitarias (10/11): por tipos según las facturas; se toman como bienes (cámbialo a servicios si lo son).
    spread(G("aib"),rec.filter(l=>l.intra&&l.base>=0),c["10"]||0,c["11"]||0,l=>l.cuota||tdRound(l.base*21/100));
    add("27",c["12"]);add("28",c["13"]);add("29",c["14"]);add("30",c["15"]);
    // Recargo de equivalencia.
    [["156","158",1.75],["168","170",0.5],["19","21",1.4],["22","24",5.2]].forEach(([b,cu,rate])=>{const row=RE.find(r=>r[0]===rate);add(row[1],c[b]);add(row[2],c[cu])});
    if(c["16"]||c["18"]){const rate=Number(c["17"])||0,row=RE.find(r=>Math.abs(r[0]-rate)<0.001)||RE[RE.length-1];add(row[1],c["16"]);add(row[2],c["18"])}
    add("43",c["25"]);add("44",c["26"]);
    // Deducible por tipos según las líneas de facturas recibidas de cada casilla del 303.
    const ded=l=>tdRound(l.cuota-(l.noDed||0)),selfC=l=>l.cuota||tdRound(l.base*21/100),inC=k=>rec.filter(l=>String(l.casilla||"").split(" · ").includes(k));
    spread(GD("ic"),inC("28"),c["28"]||0,c["29"]||0,ded);
    spread(GD("ii"),inC("30"),c["30"]||0,c["31"]||0,ded);
    spread(GD("imc"),[],c["32"]||0,c["33"]||0,ded);spread(GD("imi"),[],c["34"]||0,c["35"]||0,ded);
    spread(GD("aic"),inC("36"),c["36"]||0,c["37"]||0,selfC);spread(GD("aii"),inC("38"),c["38"]||0,c["39"]||0,selfC);
    add("639",c["40"]);add("62",c["41"]);add("61",c["42"]);add("63",c["43"]);add("522",c["44"]);
    // Volumen y operaciones específicas.
    add("99",tdRound((c["150"]||0)+(c["01"]||0)+(c["04"]||0)+(c["07"]||0)+(c["153"]||0)+(c["165"]||0)+(c["14"]||0)));
    for(const [to,from] of [["653","62"],["103","59"],["104","60"],["110","120"],["125","122"],["126","123"],["127","124"],["654","62"],["655","63"],["656","74"],["657","75"],["658","76"],["659","77"]])add(to,c[from]);
    add("230",tdSum(q.r.ceroRec||[],"base"));
    add("232",tdRound(rec.filter(l=>l.noDed>0&&l.cuota).reduce((s,l)=>s+l.base*Math.min(1,l.noDed/l.cuota),0)));
  }
  // Valor final de cada casilla: el escrito a mano o el de los trimestres.
  const c={},val=n=>has(v[n])?tdRound(num(v[n])):tdRound(A[n]||0),auto=n=>tdRound(A[n]||0);
  const all=[...devRows.flatMap(r=>[r.b,r.cu]),...RE.flatMap(r=>[r[1],r[2]]),...RE_MOD.flatMap(r=>[r[1],r[2]]),...dedRows.flatMap(r=>[r.b,r.cu]),...DED_OTHER.flatMap(r=>[r[1],r[2]]).filter(Boolean),
    ...VOL.map(r=>r[0]),...ESP.map(r=>r[0]),"654","655","656","657","658","659","85","95","96","524","662","97","98","115","116","118"];
  all.forEach(n=>{c[n]=val(n)});
  c["33"]=tdRound(devRows.reduce((s,r)=>s+c[r.b],0));c["34"]=tdRound(devRows.reduce((s,r)=>s+c[r.cu],0));
  c["47"]=tdRound(c["34"]+RE.reduce((s,r)=>s+c[r[2]],0)+c["44"]+c["46"]);
  DED.forEach(g=>{c[g.total[0]]=tdRound(g.rows.reduce((s,r)=>s+c[r[1]],0));c[g.total[1]]=tdRound(g.rows.reduce((s,r)=>s+c[r[2]],0))});
  c["64"]=tdRound(["49","513","51","521","53","55","57","59","598","61","661","62","652","63","522"].reduce((s,n)=>s+c[n],0));
  c["65"]=tdRound(c["47"]-c["64"]);c["83"]=0;c["84"]=tdRound(c["65"]+c["83"]+c["658"]);
  // Resultados de las autoliquidaciones del ejercicio.
  const res=qs.map(q=>({period:q.period,res:tdRound(q.r.c["71"]),tipo:q.r.tipo,code:q.r.code,c110:tdRound(q.r.c["110"]),c78:tdRound(q.r.c["78"]),c87:tdRound(q.r.c["87"]),amount:q.control.amount===""||q.control.amount===undefined?null:Number(q.control.amount),draft:Boolean(q.control.draft),submitted:Boolean(q.control.submitted)}));
  const first=res.find(x=>x.period==="1T"),last=res.find(x=>x.period==="4T");
  const oldCredit=first?first.c110:0,used=tdRound(res.reduce((s,x)=>s+x.c78,0));
  A["85"]=tdRound(Math.min(oldCredit,used));A["95"]=tdRound(res.reduce((s,x)=>s+Math.max(0,x.res),0));
  A["97"]=last&&last.res<0&&last.code==="C"?-last.res:0;A["98"]=last&&last.res<0&&(last.code==="D"||last.code==="X")?-last.res:0;
  A["662"]=tdRound(Math.max(0,(last?last.c87:0)-Math.max(0,oldCredit-A["85"])));
  ["85","95","97","98","662"].forEach(n=>{c[n]=val(n)});
  c["86"]=tdRound(c["84"]+c["659"]-c["85"]);
  c["108"]=tdRound(["99","653","103","104","105","110","100","101","102","125","126","127","128","227","228"].reduce((s,n)=>s+c[n],0)-c["106"]-c["107"]);
  const overrides=Object.keys(v).filter(n=>has(v[n])&&Math.abs(num(v[n])-auto(n))>0.004).map(n=>({n,manual:num(v[n]),auto:auto(n)}));
  const sum=n=>S(n);
  return{c,A,m,qs,res,warn,overrides,auto,sum,oldCredit};
}

/* --- Pantalla --- */
const cell=(n,content)=>`<div class="m303-cell"><span class="m303-n">${n}</span>${content}</div>`;
const out=v=>`<span class="m303-out">${tdEur(v)}</span>`;
function money(n,r,signed){const v=r.m.v[n],a=r.auto(n);return `<input class="m303-in${has(v)?" manual":""}${!has(v)&&a?" has-auto":""}" data-m390="${n}" inputmode="decimal" value="${escapeHtml(has(v)?inputValue(v):"")}" placeholder="${escapeHtml(inputValue(a)||"0,00")}" title="${has(v)?`Escrito a mano · de los trimestres: ${tdEur(a)}`:signed?"Admite importes negativos":"De la suma de los trimestres"}">`}
const showAll=()=>taxDrafts.m390All===true;
const rowVisible=(r,rate,b,cu)=>showAll()||rate===null||[0,4,10,21,0.5,1.4,5.2,1.75].includes(rate)||r.c[b]||r.c[cu]||has(r.m.v[b])||has(r.m.v[cu]);
const groupUsed=(r,g)=>g.rows.some(([,b,cu])=>(b&&r.c[b])||r.c[cu]||has(r.m.v[b])||has(r.m.v[cu]));
function rateRows(r,g,signed){
  return g.rows.filter(([rate,b,cu])=>rowVisible(r,rate,b,cu)).map(([rate,b,cu],i)=>`<tr${i===0?' class="m303-sep"':""}><td class="m303-l">${i===0?`<b>${escapeHtml(g.label)}</b>`:""}</td><td>${b?cell(b,money(b,r,signed)):""}</td><td>${rate===null?"":`<span class="m390-rate">${rateText(rate)} %</span>`}</td><td>${cell(cu,money(cu,r,signed))}</td></tr>`).join("");
}
// Respuestas propuestas: lo marcado en los 303 del ejercicio y las obligaciones de la ficha del cliente.
const identDefaults=r=>({d347:Boolean(taxDrafts.clientData?.obligations?.["347"]),caja:r.qs.some(q=>q.r.m?.f?.caja),destCaja:r.qs.some(q=>q.r.m?.f?.destCaja),redeme:r.qs.some(q=>q.r.m?.f?.redeme),concurso:false,sustitutiva:false,clave:"A03"});
function pageIdent(r){
  const f=r.m.f,{caja,destCaja,redeme}=identDefaults(r);
  const yn=(k,label,def)=>{const on=f[k]??def;return `<label class="m303-ck"><span>${escapeHtml(label)}</span><select data-m390f="${k}"><option value="1"${on?" selected":""}>Sí</option><option value=""${on?"":" selected"}>No</option></select></label>`};
  const obl347=identDefaults(r).d347;
  return `<div class="m390-ident">
    <div class="m390-fields"><label class="td-cf wide"><small>A · Actividad principal (la de mayor volumen de operaciones)</small><input data-m390f="actividad" value="${escapeHtml(f.actividad??"")}" placeholder="p. ej. Pintura"></label>
      <label class="td-cf"><small>B · Clave</small><select data-m390f="clave">${CLAVES.map(([k,l])=>`<option value="${k}"${(f.clave||"A03")===k?" selected":""}>${k} · ${escapeHtml(l)}</option>`).join("")}</select></label>
      <label class="td-cf"><small>C · Epígrafe IAE</small><input data-m390f="epigrafe" value="${escapeHtml(f.epigrafe??"")}" maxlength="6" placeholder="p. ej. 5056"></label>
      <label class="td-cf wide"><small>Otras actividades (opcional)</small><input data-m390f="otras" value="${escapeHtml(f.otras??"")}"></label></div>
    <div class="m390-checks">
      ${yn("d347","D · Ha efectuado operaciones por las que tenga obligación de presentar el modelo 347",obl347)}
      ${yn("redeme","Registro de devolución mensual en algún período del ejercicio",redeme)}
      ${yn("caja","¿Ha optado por el régimen especial del criterio de caja (art. 163 undecies LIVA)?",caja)}
      ${yn("destCaja","¿Ha sido destinatario de operaciones a las que se aplique el régimen especial del criterio de caja?",destCaja)}
      ${yn("concurso","¿Ha sido declarado en concurso de acreedores en este ejercicio?",false)}
      ${yn("sustitutiva","Declaración sustitutiva",false)}
      ${f.sustitutiva?`<label class="td-cf"><small>Número identificativo de la declaración anterior (13 dígitos)</small><input data-m390f="justificante" value="${escapeHtml(f.justificante??"")}" maxlength="13" inputmode="numeric"></label>`:""}
    </div>
    <p class="m303-hint">Las respuestas sobre criterio de caja y devolución mensual se proponen con lo marcado en los 303 del ejercicio. El sujeto pasivo y el representante salen de la ficha del cliente.</p></div>`;
}
function pageDev(r){
  const others=DEV.filter(g=>g.other),showOthers=showAll()||others.some(g=>groupUsed(r,g));
  return `<table class="m303-t m390-t"><thead><tr><th></th><th>Base imponible</th><th>Tipo</th><th>Cuota devengada</th></tr></thead><tbody>
    ${DEV.filter(g=>!g.other||showOthers).map(g=>rateRows(r,g,g.signed)).join("")}
    <tr class="m303-res"><td class="m303-l"><b>Total bases y cuotas IVA</b></td><td>${cell("33",out(r.c["33"]))}</td><td></td><td>${cell("34",out(r.c["34"]))}</td></tr>
    ${RE.filter(([rate,b,cu])=>showAll()||[0.5,1.4,5.2,1.75].includes(rate)||r.c[b]||r.c[cu]).map(([rate,b,cu],i)=>`<tr${i===0?' class="m303-sep"':""}><td class="m303-l">${i===0?"<b>Recargo de equivalencia</b>":""}</td><td>${cell(b,money(b,r))}</td><td><span class="m390-rate">${rateText(rate)} %</span></td><td>${cell(cu,money(cu,r))}</td></tr>`).join("")}
    ${RE_MOD.map(([l,b,cu])=>`<tr><td class="m303-l">${escapeHtml(l)}</td><td>${cell(b,money(b,r,true))}</td><td></td><td>${cell(cu,money(cu,r,true))}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td class="m303-l" colspan="3"><b>Total cuotas IVA y recargo de equivalencia</b> <small>(34 + recargos + 44 + 46)</small></td><td>${cell("47",out(r.c["47"]))}</td></tr></tfoot></table>
    <p class="m303-hint">Suma de los cuatro 303 del ejercicio. Las adquisiciones intracomunitarias (10/11 del 303) se proponen como bienes; si son servicios (Google, Meta, Amazon…), pásalas a las casillas 545 a 552. ${showOthers?"":"Los regímenes especiales sin datos (intragrupo, criterio de caja, bienes usados, agencias de viaje) están ocultos."}</p>`;
}
function pageDed(r){
  const showOthers=showAll()||DED.filter(g=>g.other).some(g=>groupUsed(r,g));
  return `<table class="m303-t m390-t"><thead><tr><th></th><th>Base imponible</th><th>Tipo</th><th>Cuota deducible</th></tr></thead><tbody>
    ${DED.filter(g=>!g.other||showOthers).map(g=>rateRows(r,g)+`<tr class="m390-sub"><td class="m303-l">Total ${escapeHtml(g.label.charAt(0).toLowerCase()+g.label.slice(1))}</td><td>${cell(g.total[0],out(r.c[g.total[0]]))}</td><td></td><td>${cell(g.total[1],out(r.c[g.total[1]]))}</td></tr>`).join("")}
    ${DED_OTHER.map(([l,b,cu,signed],i)=>`<tr${i===0?' class="m303-sep"':""}><td class="m303-l">${escapeHtml(l)}</td><td>${b?cell(b,money(b,r,signed)):""}</td><td></td><td>${cell(cu,money(cu,r,signed))}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td class="m303-l" colspan="3"><b>Suma de deducciones</b> <small>(49 + 513 + 51 + 521 + 53 + 55 + 57 + 59 + 598 + 61 + 661 + 62 + 652 + 63 + 522)</small></td><td>${cell("64",out(r.c["64"]))}</td></tr>
    <tr class="m303-res"><td class="m303-l" colspan="3"><b>Resultado régimen general (47 − 64)</b></td><td>${cell("65",out(r.c["65"]))}</td></tr></tfoot></table>
    <p class="m303-hint">Desglose por tipos con las facturas recibidas de cada trimestre; lo que no se puede asignar a un tipo (importes escritos a mano en el 303) va al 21 %.</p>`;
}
function pageRes(r){
  const line=(n,l,content,cls="")=>`<tr class="${cls}"><td class="m303-l">${escapeHtml(l)}</td><td>${cell(n,content)}</td></tr>`;
  return `<div class="m303-sec m390-sub-sec"><span>7. Resultado liquidación anual</span><em>Sujetos pasivos que tributan exclusivamente en territorio común</em></div>
    <table class="m303-t c1"><tbody>${line("65","Resultado régimen general",out(r.c["65"]))}${line("658","Regularización cuotas art. 80.Cinco.5ª LIVA",money("658",r,true))}
    ${line("84","Suma de resultados (65 + 83 + 658)",out(r.c["84"]),"m303-strong")}${line("659","IVA a la importación liquidado por la Aduana (sólo sujetos pasivos con opción de diferimiento)",money("659",r))}
    ${line("85","Compensación de cuotas del ejercicio anterior",money("85",r))}${line("86","Resultado de la liquidación (84 + 659 − 85)",out(r.c["86"]),"m303-res")}</tbody></table>
    <div class="m303-sec m390-sub-sec"><span>9. Resultado de las liquidaciones</span><em>Períodos que no tributan en el régimen especial del grupo de entidades</em></div>
    <table class="m303-t c1"><tbody>${line("95","Total resultados a ingresar en las autoliquidaciones de IVA del ejercicio",money("95",r))}
    ${line("96","Total devoluciones mensuales de IVA solicitadas por sujetos pasivos inscritos en el Registro de devolución mensual",money("96",r))}
    ${line("524","Total devoluciones solicitadas por cuotas soportadas en la adquisición de elementos de transporte (art. 30 bis RIVA)",money("524",r))}
    ${line("662","Cuotas pendientes de compensación generadas en el ejercicio y distintas de las incluidas en la casilla 97",money("662",r))}
    ${line("97","Si el resultado de la autoliquidación del último periodo es a compensar · a compensar",money("97",r))}
    ${line("98","Si el resultado de la autoliquidación del último periodo es a devolver · a devolver",money("98",r))}</tbody></table>
    ${quarterTable(r)}`;
}
function quarterTable(r){
  if(!r.res.length)return"";
  return `<h4 class="td-list-title">Autoliquidaciones del ejercicio (303)</h4><table class="td-list m390-q"><thead><tr><th>Período</th><th class="num">Devengado [27]</th><th class="num">Deducible [45]</th><th class="num">Resultado [71]</th><th>Tipo</th><th class="num">Control decl.</th></tr></thead><tbody>
    ${r.res.map(x=>{const q=r.qs.find(q=>q.period===x.period),c=q.r.c;return `<tr><td>${x.period}</td><td class="num">${tdEur(c["27"])}</td><td class="num">${tdEur(c["45"])}</td><td class="num"><b>${tdEur(x.res)}</b></td><td>${escapeHtml((q.r.tipos.find(t=>t[0]===x.tipo)||[])[1]||"")}</td><td class="num">${x.amount===null||Number.isNaN(x.amount)?'<span class="td-dim">Sin anotar</span>':`${Math.abs(x.amount-x.res)<0.005?'<span class="td-ok">✓</span>':'<span class="td-warn">⚠</span>'} ${tdEur(x.amount)}`}</td></tr>`}).join("")}</tbody>
    <tfoot><tr><td>Total</td><td class="num">${tdEur(r.sum("27"))}</td><td class="num">${tdEur(r.sum("45"))}</td><td class="num">${tdEur(r.sum("71"))}</td><td></td><td></td></tr></tfoot></table>`;
}
function pageVol(r){
  return `<table class="m303-t c1"><tbody>${VOL.map(([n,l,neg])=>`<tr><td class="m303-l">${neg?"(−) ":""}${escapeHtml(l)}</td><td>${cell(n,money(n,r))}</td></tr>`).join("")}
    <tr class="m303-res"><td class="m303-l"><b>Total volumen de operaciones (art. 121 LIVA)</b> <small>(99 + 653 + 103 + 104 + 105 + 110 + 100 + 101 + 102 + 125 + 126 + 127 + 128 + 227 + 228 − 106 − 107)</small></td><td>${cell("108",out(r.c["108"]))}</td></tr></tbody></table>
    ${ventas(r)}`;
}
// Ventas e ingresos de la contabilidad (grupo 70) para comprobar el volumen de operaciones.
function contaVentas(){const res=taxDrafts.base?.resultados||[];if(!res.length)return null;
  const ventas=res.filter(a=>String(a.cuenta).startsWith("70"));return{cuentas:ventas,total:tdRound(ventas.reduce((s,a)=>s+(a.meses||[]).reduce((x,y)=>x+y,0),0))}}
function ventas(r){const v=contaVentas();if(!v||!v.cuentas.length)return"";
  return `<h4 class="td-list-title">Ventas en la contabilidad (grupo 70)</h4><table class="td-list"><thead><tr><th>Cuenta</th><th>Nombre</th><th class="num">Importe del ejercicio</th></tr></thead><tbody>${v.cuentas.map(a=>`<tr><td>${escapeHtml(a.cuenta)}</td><td>${escapeHtml(a.nombre)}</td><td class="num">${tdEur((a.meses||[]).reduce((x,y)=>x+y,0))}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2">Total ventas</td><td class="num">${tdEur(v.total)}</td></tr></tfoot></table>`}
function pageEsp(r){
  const f=r.m.f;
  return `<div class="m303-sec m390-sub-sec"><span>11. Operaciones específicas</span><em>Importe total, aunque ya se hayan incluido en otros apartados</em></div>
    <table class="m303-t c1"><tbody>${ESP.map(([n,l])=>`<tr><td class="m303-l">${escapeHtml(l)}</td><td>${cell(n,money(n,r))}</td></tr>`).join("")}</tbody></table>
    <table class="m303-t c2"><thead><tr><th></th><th>Base imponible</th><th>Cuota</th></tr></thead><tbody>
      <tr><td class="m303-l">Entregas y servicios con criterio de caja que habrían resultado devengadas por la regla general (art. 75 LIVA)</td><td>${cell("654",money("654",r))}</td><td>${cell("655",money("655",r))}</td></tr>
      <tr><td class="m303-l">Adquisiciones a las que sea de aplicación o afecte el régimen especial del criterio de caja</td><td>${cell("656",money("656",r))}</td><td>${cell("657",money("657",r))}</td></tr></tbody></table>
    <div class="m303-sec m390-sub-sec"><span>12. Prorratas</span><em>Solo si se aplica la regla de prorrata</em></div>
    <div class="m390-fields"><label class="td-cf wide"><small>Actividad</small><input data-m390f="prActividad" value="${escapeHtml(f.prActividad??"")}"></label>
      <label class="td-cf"><small>[114] CNAE (3 dígitos)</small><input data-m390f="cnae" value="${escapeHtml(f.cnae??"")}" maxlength="3" inputmode="numeric"></label>
      <label class="td-cf"><small>[117] Tipo de prorrata</small><select data-m390f="prTipo"><option value=""${f.prTipo?"":" selected"}>—</option><option value="G"${f.prTipo==="G"?" selected":""}>G · General</option><option value="E"${f.prTipo==="E"?" selected":""}>E · Especial</option></select></label></div>
    <table class="m303-t c1"><tbody><tr><td class="m303-l">Importe total de las operaciones</td><td>${cell("115",money("115",r))}</td></tr><tr><td class="m303-l">Importe de las operaciones con derecho a deducción</td><td>${cell("116",money("116",r))}</td></tr><tr><td class="m303-l">% de prorrata definitivo</td><td>${cell("118",money("118",r))}</td></tr></tbody></table>`;
}
const PAGES=[["ident","Identificación"],["dev","IVA devengado"],["ded","IVA deducible"],["res","Resultado"],["vol","Volumen de operaciones"],["esp","Op. específicas y prorrata"]];
function checks(r){
  const out=[],ok=(t,d)=>out.push(`<div class="td-check ok">✓ <div><b>${t}</b>${d}</div></div>`),bad=(t,d,cls="warn")=>out.push(`<div class="td-check ${cls}">${cls==="bad"?"✕":"⚠"} <div><b>${t}</b>${d}</div></div>`);
  const cmp=(label,a,b,what)=>Math.abs(a-b)<0.01?ok(`${label} cuadra con los 303`,`${tdEur(a)} = suma de ${what} de los cuatro trimestres.`):bad(`${label} no cuadra con los 303`,`390: ${tdEur(a)} · suma de ${what}: ${tdEur(b)} · diferencia ${tdEur(tdRound(a-b))}.`,"bad");
  if(r.qs.length<4)bad("Faltan trimestres",`Solo hay ${r.qs.length} de 4 trimestres del 303 con datos (los marcados «Sin obligación» no cuentan).`);
  cmp("IVA devengado [47]",r.c["47"],r.sum("27"),"la casilla 27");
  cmp("IVA deducible [64]",r.c["64"],r.sum("45"),"la casilla 45");
  const sumRes=r.sum("71"),annual=tdRound(r.c["95"]-r.c["96"]-r.c["97"]-r.c["98"]-r.c["662"]);
  const resultadoTrimestres=tdRound(r.sum("46")+r.sum("76")+r.sum("77")-r.c["85"]);
  Math.abs(r.c["86"]-resultadoTrimestres)<0.01?ok("Resultado anual [86]",`${tdEur(r.c["86"])}: coincide con los resultados de los trimestres.`):bad("Resultado anual [86]",`${tdEur(r.c["86"])} frente a ${tdEur(resultadoTrimestres)} de los trimestres.`,"bad");
  out.push(`<div class="td-check ok">ℹ <div><b>Liquidaciones del ejercicio</b>Suma de resultados [71] de los 303: ${tdEur(sumRes)} · ingresado [95] ${tdEur(r.c["95"])}${r.c["97"]?` · a compensar [97] ${tdEur(r.c["97"])}`:""}${r.c["98"]?` · a devolver [98] ${tdEur(r.c["98"])}`:""}${r.c["662"]?` · pendiente [662] ${tdEur(r.c["662"])}`:""}.</div></div>`);
  const notConf=r.res.filter(x=>!x.draft&&!x.submitted).map(x=>x.period);if(notConf.length)bad("Trimestres sin confirmar",`${notConf.join(", ")}: confirma o presenta antes esos 303 para que el 390 coincida con lo declarado.`);
  const diffCtl=r.res.filter(x=>x.amount!==null&&!Number.isNaN(x.amount)&&Math.abs(x.amount-x.res)>=0.005);if(diffCtl.length)bad("Importes distintos en Control de declaraciones",diffCtl.map(x=>`${x.period}: declarado ${tdEur(x.amount)} · borrador ${tdEur(x.res)}`).join(" · "),"bad");
  const v=contaVentas();if(v)Math.abs(v.total-r.c["99"])<1?ok("Volumen cuadra con la contabilidad",`Operaciones en régimen general [99] ${tdEur(r.c["99"])} · ventas (grupo 70) ${tdEur(v.total)}${Math.abs(v.total-r.c["99"])>=0.01?` · diferencia de ${tdEur(Math.abs(tdRound(r.c["99"]-v.total)))} por redondeos`:""}.`):bad("Volumen distinto de la contabilidad",`[99] ${tdEur(r.c["99"])} · ventas de la contabilidad (grupo 70) ${tdEur(v.total)} · diferencia ${tdEur(tdRound(r.c["99"]-v.total))}. Revisa operaciones exentas, no sujetas o ingresos que no son ventas.`);
  r.warn.forEach(w=>bad("Tipo no habitual",escapeHtml(w)+"."));
  if(r.overrides.length)bad("Casillas escritas a mano",r.overrides.map(o=>`[${o.n}] ${inputValue(o.manual)||"0,00"} (trimestres: ${inputValue(o.auto)||"0,00"})`).join(" · ")+".");
  if(r.c["29"]||r.c["639"])bad("Modificaciones y rectificaciones",`Revisa que las de la casilla 29 no deban ir en la 31 (concurso o créditos incobrables) y las de la 639 en la 651 (intragrupo).`);
  return out.join("");
}
function detailHtml(){
  if(!taxDrafts.client)return"";
  const r=calc(),tab=PAGES.some(p=>p[0]===taxDrafts.m390Tab)?taxDrafts.m390Tab:"dev",data=declarationData(M,PERIOD,taxDrafts.client,taxDraftYear());
  const body={ident:pageIdent,dev:pageDev,ded:pageDed,res:pageRes,vol:pageVol,esp:pageEsp}[tab](r);
  const SEC={ident:["Datos estadísticos (3)","Sujeto pasivo, devengo y representante: de la ficha del cliente"],dev:["5. Régimen general","IVA devengado"],ded:["5. Régimen general","IVA deducible"],res:["Resultado","7 · Liquidación anual · 9 · Resultado de las liquidaciones"],vol:["10. Volumen de operaciones","Operaciones realizadas en el ejercicio"],esp:["11 · 12","Operaciones específicas y prorratas"]}[tab];
  return `<div class="td-card-head"><div><h4>Borrador modelo 390 · ejercicio ${escapeHtml(taxDraftYear())}</h4><small>${escapeHtml(taxDrafts.clientData?.cif||"")} · ${escapeHtml(taxDrafts.client)} · suma de los 303 del ejercicio</small></div>${data.prepared?`<span class="td-pill conf">Borrador confirmado el ${escapeHtml(data.prepared.split("-").reverse().join("/"))}</span>`:""}</div>
    <div class="m303-wrap m390"><nav class="m303-tabs">${PAGES.map(([k,l])=>`<button type="button" class="${k===tab?"on":""}" data-m390-tab="${k}">${l}${k==="dev"?`<small>${tdEur(r.c["47"])}</small>`:k==="ded"?`<small>${tdEur(r.c["64"])}</small>`:k==="res"?`<small>${tdEur(r.c["86"])}</small>`:k==="vol"?`<small>${tdEur(r.c["108"])}</small>`:""}</button>`).join("")}</nav>
    <div class="m303-page"><div class="m303-sec"><span>${escapeHtml(SEC[0])}</span><em>${escapeHtml(SEC[1])}</em></div>
      <div class="m390-tools">${r.overrides.length?`<button type="button" class="m303-eyebtn warn" data-m390-reset>↺ <span>Volver a la suma de los trimestres (${r.overrides.map(o=>o.n).join(", ")})</span></button>`:""}${tab==="dev"||tab==="ded"?`<label class="m390-all"><input type="checkbox" data-m390-all${showAll()?" checked":""}> Mostrar todos los tipos y regímenes</label>`:""}</div>
      ${body}</div></div>
    <div class="td-checks">${checks(r)}</div>
    <div class="m347-actions"><button type="button" class="secondary-button" data-m390-file title="Falta el diseño de registro oficial del 390 para generar el fichero">Fichero AEAT</button><button type="button" class="secondary-button" data-m390-view>Ver impreso</button><button type="button" class="primary blue-button" data-m390-confirm>${data.prepared?"Volver a confirmar":"Confirmar borrador"}</button></div>`;
}
function bind(box){
  const rerender=()=>renderTaxDraftMain();
  box.addEventListener("click",event=>event.stopPropagation());
  box.querySelectorAll("[data-m390-tab]").forEach(b=>b.addEventListener("click",()=>{taxDrafts.m390Tab=b.dataset.m390Tab;rerender()}));
  box.querySelector("[data-m390-all]")?.addEventListener("change",event=>{taxDrafts.m390All=event.target.checked;rerender()});
  box.querySelector("[data-m390-reset]")?.addEventListener("click",()=>{save(m=>{m.v={}});rerender()});
  box.querySelectorAll("[data-m390]").forEach(input=>input.addEventListener("change",()=>{const n=input.dataset.m390,raw=input.value.trim(),auto=calc().auto(n);
    save(m=>{if(raw===""||Math.abs(num(raw)-auto)<0.005)delete m.v[n];else m.v[n]=num(raw)});rerender()}));
  box.querySelectorAll("[data-m390f]").forEach(input=>input.addEventListener("change",()=>{const f=input.dataset.m390f;
    save(m=>{m.f[f]=input.tagName==="SELECT"&&["d347","redeme","caja","destCaja","concurso","sustitutiva"].includes(f)?input.value==="1":f==="justificante"?input.value.replace(/\D/g,"").slice(0,13):input.value.trim()});rerender()}));
  box.querySelector("[data-m390-confirm]")?.addEventListener("click",()=>{
    const draft=m390Draft(),key=declarationKey(M,PERIOD,taxDrafts.client,draft.year),data=declarationData(M,PERIOD,taxDrafts.client,draft.year),t=new Date();
    data.prepared=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;data.draft=draft;data.amount=draft.c["86"];localStorage.setItem(key,JSON.stringify(data));rerender();
  });
  box.querySelector("[data-m390-view]")?.addEventListener("click",()=>openForm(m390Draft(),false));
  box.querySelector("[data-m390-file]")?.addEventListener("click",()=>{const msg="Para generar el fichero de importación hace falta el diseño de registro oficial del modelo 390 (DR390, Excel de la AEAT). Cuando lo tengamos se añade aquí, igual que en el 303.";typeof appAlert==="function"?appAlert(msg,{eyebrow:"MODELO 390",title:"Fichero AEAT pendiente"}):alert(msg)});
}
function m390Draft(){const r=calc();return{model:M,year:String(taxDraftYear()),period:PERIOD,client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",c:r.c,m:{...r.m,f:{...identDefaults(r),...r.m.f}},confirmedBy:typeof signedInUser!=="undefined"&&signedInUser?.name||""}}

/* --- Impreso: casillas con importe, por apartados --- */
function formHtml(d){
  const c=d.c,f=d.m.f||{},box=(n,label)=>`<div class="af-row"><span class="af-label">${escapeHtml(label)}</span><div class="af-cell"><div class="af-box"><b>${n}</b><span>${tdFormMoney(c[n])}</span></div></div></div>`;
  const pair=(b,cu,label,rate)=>`<div class="af-row"><span class="af-label">${escapeHtml(label)}${rate!==null&&rate!==undefined?` · ${rateText(rate)} %`:""}</span>${b?`<div class="af-cell"><small>Base imponible</small><div class="af-box"><b>${b}</b><span>${tdFormMoney(c[b])}</span></div></div>`:'<div class="af-cell"></div>'}<div class="af-cell"><small>Cuota</small><div class="af-box"><b>${cu}</b><span>${tdFormMoney(c[cu])}</span></div></div></div>`;
  const nz=(...ns)=>ns.some(n=>n&&Number(c[n]));
  const dev=DEV.flatMap(g=>g.rows.filter(([,b,cu])=>nz(b,cu)).map(([rate,b,cu])=>pair(b,cu,g.label,rate))).join("")+RE.filter(([,b,cu])=>nz(b,cu)).map(([rate,b,cu])=>pair(b,cu,"Recargo de equivalencia",rate)).join("")+RE_MOD.filter(([,b,cu])=>nz(b,cu)).map(([l,b,cu])=>pair(b,cu,l)).join("");
  const ded=DED.flatMap(g=>[...g.rows.filter(([,b,cu])=>nz(b,cu)).map(([rate,b,cu])=>pair(b,cu,g.label,rate)),...(nz(...g.total)?[pair(g.total[0],g.total[1],`Total ${g.label.toLowerCase()}`)]:[])]).join("")+DED_OTHER.filter(([,b,cu])=>nz(b,cu)).map(([l,b,cu])=>pair(b,cu,l)).join("");
  const clave=CLAVES.find(k=>k[0]===(f.clave||"A03"));
  const fld=(label,value)=>`<label><small>${escapeHtml(label)}</small><span>${escapeHtml(value??"")}</span></label>`;
  return `<div class="aeat-form m390-form"><div class="af-watermark">BORRADOR</div>
    <div class="af-head"><div class="af-agency"><strong>Agencia Tributaria</strong><small>Documento preparado por Asesoría Molinero</small></div><div class="af-title"><strong>Impuesto sobre el Valor Añadido</strong><span>Declaración-resumen anual</span><em>Ejercicio ${escapeHtml(d.year)}</em></div><div class="af-model"><small>Modelo</small><b>390</b></div></div>
    <section class="af-sec"><div class="af-side">Sujeto pasivo</div><div class="af-body"><div class="af-grid af-g2">${fld("NIF",d.cif)}${fld("Apellidos y nombre o razón social",d.client)}</div><div class="af-grid af-g3">${fld("Ejercicio",d.year)}${fld("Declaración sustitutiva",f.sustitutiva?`X · ${f.justificante||""}`:"")}${fld("Concurso",f.concurso?"Sí":"No")}</div></div></section>
    <section class="af-sec"><div class="af-side">Datos estadísticos</div><div class="af-body"><div class="af-grid af-g3">${fld("A · Actividad principal",f.actividad)}${fld("B · Clave",clave?`${clave[0]} · ${clave[1]}`:"")}${fld("C · Epígrafe IAE",f.epigrafe)}</div><div class="af-grid af-g3">${fld("D · Operaciones con terceros (347)",(f.d347??false)?"X":"")}${fld("Criterio de caja",f.caja?"Sí":"No")}${fld("Destinatario criterio de caja",f.destCaja?"Sí":"No")}</div></div></section>
    <section class="af-sec"><div class="af-side">IVA devengado</div><div class="af-body">${dev||'<p class="af-line">Sin IVA devengado.</p>'}<div class="af-total">${pair("33","34","Total bases y cuotas IVA")}${box("47","Total cuotas IVA y recargo de equivalencia")}</div></div></section>
    <section class="af-sec"><div class="af-side">IVA deducible</div><div class="af-body">${ded||'<p class="af-line">Sin IVA deducible.</p>'}<div class="af-total">${box("64","Suma de deducciones")}${box("65","Resultado régimen general (47 − 64)")}</div></div></section>
    <section class="af-sec"><div class="af-side">Resultado</div><div class="af-body">${["658","84","659","85","86"].map(n=>box(n,{658:"Regularización cuotas art. 80.Cinco.5ª LIVA",84:"Suma de resultados (65 + 83 + 658)",659:"IVA a la importación liquidado por la Aduana",85:"Compensación de cuotas del ejercicio anterior",86:"Resultado de la liquidación (84 + 659 − 85)"}[n])).join("")}
      <h5>Resultado de las liquidaciones</h5>${[["95","Total resultados a ingresar en las autoliquidaciones del ejercicio"],["96","Total devoluciones mensuales solicitadas (REDEME)"],["524","Devoluciones por elementos de transporte (art. 30 bis RIVA)"],["662","Cuotas pendientes de compensación generadas en el ejercicio"],["97","A compensar"],["98","A devolver"]].filter(([n])=>Number(c[n])||["95"].includes(n)).map(([n,l])=>box(n,l)).join("")}</div></section>
    <section class="af-sec"><div class="af-side">Volumen de operaciones</div><div class="af-body">${VOL.filter(([n])=>Number(c[n])).map(([n,l])=>box(n,l)).join("")}${box("108","Total volumen de operaciones (art. 121 LIVA)")}</div></section>
    ${ESP.some(([n])=>Number(c[n]))||nz("654","655","656","657")?`<section class="af-sec"><div class="af-side">Operaciones específicas</div><div class="af-body">${ESP.filter(([n])=>Number(c[n])).map(([n,l])=>box(n,l)).join("")}${nz("654","655")?pair("654","655","Criterio de caja · entregas y servicios (regla general)"):""}${nz("656","657")?pair("656","657","Criterio de caja · adquisiciones (regla general)"):""}</div></section>`:""}
    <p class="af-foot">Borrador preparado con la suma de los modelos 303 del ejercicio${d.confirmedBy?` · ${escapeHtml(d.confirmedBy)}`:""}. No válido para su presentación.</p></div>`;
}
const FORM_CSS=`.m390-form .af-row .af-cell{width:140px}.m390-form .af-label{font-size:10.5px}`;
function openForm(d,confirmed){
  const form=formHtml(d),title=`Borrador modelo 390 ${d.year} ${d.client}`,css=(typeof AEAT_FORM_CSS!=="undefined"?AEAT_FORM_CSS:"")+FORM_CSS;
  document.querySelector("#tdFormView")?.remove();
  const view=document.createElement("div");view.id="tdFormView";view.className="td-modal";view.style.zIndex="1600";
  view.innerHTML=`<div class="td-modal-box td-form-modal"><header><div><span class="td-tag">${confirmed?"Borrador confirmado":"Vista previa del borrador"}</span><h3>Modelo 390 · ${escapeHtml(d.year)}</h3><p>${escapeHtml(d.cif?d.cif+" · ":"")}${escapeHtml(d.client)} · resultado ${tdEur(d.c["86"])}</p></div><div class="td-form-actions"><button type="button" class="secondary-button" data-print>Imprimir / guardar PDF</button><button type="button" class="td-close" aria-label="Cerrar">×</button></div></header>
    <div class="td-modal-body"><style>${css}</style>${form}</div></div>`;
  document.body.append(view);
  view.querySelector("[data-print]").addEventListener("click",()=>{const w=window.open("","_blank");if(!w)return alert("Permite las ventanas emergentes.");w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}@page{size:A4;margin:10mm}body{margin:0}.aeat-form{border:0;max-width:none;padding:0}.af-sec{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${form}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close()});
  const close=()=>{view.remove();document.removeEventListener("keydown",onKey)},onKey=e=>{if(e.key==="Escape")close()};
  view.addEventListener("click",e=>{if(e.target===view||e.target.closest(".td-close"))close()});document.addEventListener("keydown",onKey);
}
if(typeof openConfirmedTaxDraft==="function"){const previousOpen=openConfirmedTaxDraft;
  openConfirmedTaxDraft=function(key){let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}if(data.draft?.model===M)return openForm(data.draft,true);return previousOpen.apply(this,arguments)}}

/* --- Enganche con Borradores: fila «Declaración anual · Modelo 390» del 303 --- */
const previousDetail=window.taxDraftAnnualDetail;
window.taxDraftAnnualDetail=model=>model===M?detailHtml():(previousDetail?previousDetail(model):"");
if(typeof taxDraftAnnualRow==="function"){const previousRow=taxDraftAnnualRow;taxDraftAnnualRow=function(model,totals){
  if(model!==SRC)return previousRow.apply(this,arguments);
  const r=calc(),control=declarationData(M,PERIOD,taxDrafts.client,taxDraftYear()),open=taxDrafts.open==="anual";
  const status=control.submitted?["Presentado","pres"]:control.prepared?["Preparado","conf"]:["Pendiente","pend"];
  const detail=open?`<tr class="td-detail td-annual-detail"><td colspan="8"><div class="td-card" data-td-annual-detail="${M}">${detailHtml()}</div></td></tr>`:"";
  return `<tr class="td-annual${open?" open":""}" data-td-annual="${M}" tabindex="0" aria-expanded="${open}" title="Desplegar el resumen anual"><td><strong><span class="td-caret">›</span> Declaración anual · Modelo 390</strong><small>Declaración-resumen anual del IVA</small></td><td class="num">${tdEur(r.c["47"])}</td><td class="num">${tdEur(r.c["64"])}</td><td class="num"><b>${tdEur(r.c["86"])}</b></td><td class="num td-dim">—</td><td><span class="td-pill ${status[1]}">${status[0]}</span></td><td></td><td></td></tr>${detail}`;
}}
const previousMain=renderTaxDraftMain;
renderTaxDraftMain=function(){const res=previousMain.apply(this,arguments);const box=document.querySelector(`#tdMain [data-td-annual-detail="${M}"]`);if(box)bind(box);return res};
(function(){const style=document.createElement("style");style.textContent=`
.m390 .m390-rate{display:inline-block;min-width:54px;text-align:center;font-weight:800;font-size:12.5px;color:#163b8c;background:#eef2ff;border-radius:7px;padding:5px 6px}
.m390-t tr.m390-sub td{background:#f7f9fd}.m390-t tr.m390-sub .m303-l{font-weight:700;font-size:12px;color:#163b8c}
.m390-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:flex-end;margin:0 12px 6px}.m390-all{display:flex;gap:6px;align-items:center;font-size:12.5px;color:#56627c;cursor:pointer}
.m390-sub-sec{margin-top:12px}.m390-ident{padding:8px 12px}.m390-fields{display:grid;grid-template-columns:2fr 1.4fr 1fr;gap:10px;margin:0 0 12px}.m390-fields .td-cf.wide{grid-column:span 1}
.m390-fields input,.m390-fields select{width:100%;height:36px;border:1px solid #d8deea;border-radius:9px;padding:0 9px;font:inherit;font-size:13px;box-sizing:border-box;background:#fff}
.m390-checks{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}.m390-checks .m303-ck{display:flex;justify-content:space-between;gap:10px;align-items:center}.m390-checks select{height:30px;border:1px solid #d8deea;border-radius:8px;font:inherit;font-size:12.5px;padding:0 6px}
.m390-checks .td-cf input{width:100%;height:32px;border:1px solid #d8deea;border-radius:8px;padding:0 8px}
.m390-q{margin:0 12px 8px;width:calc(100% - 24px)}
@media(max-width:760px){.m390-fields,.m390-checks{grid-template-columns:1fr}}`;document.head.append(style)})();
if(document.querySelector("#tdModels")&&taxDrafts.client)renderTaxDraftMain();
})();
