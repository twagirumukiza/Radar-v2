const $=s=>document.querySelector(s);
let score=0,level=1,lives=3,running=false,audioOn=true,audioCtx=null;
let objects=[],spawnTimer=null,raf=null,nextId=1,kills=0,spawned=0;
const cfg={
 easy:{speed:.030,spawn:1500,count:6},
 normal:{speed:.040,spawn:1200,count:8},
 hard:{speed:.052,spawn:900,count:10}
};
function ctx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function tone(f=500,d=.08,vol=.06,type="sine"){
 if(!audioOn)return;const a=ctx(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);
 o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.start();o.stop(a.currentTime+d)
}
function target(){return cfg[$("#difficulty").value].count+Math.floor((level-1)*1.5)}
function hearts(){
 const full=Math.floor(lives),half=lives-full;
 return "♥".repeat(full)+(half>=.5?"♡":"");
}
function update(){
 $("#score").textContent=score;$("#level").textContent=level;$("#lives").textContent=hearts();
 $("#remaining").textContent=Math.max(0,target()-kills);
 $("#sweep").style.animationDuration=Math.max(1.45,4-level*.10)+"s"
}
function announce(){
 let b=$(".level-banner");if(!b){b=document.createElement("div");b.className="level-banner";$("#radar").appendChild(b)}
 b.textContent="NIVEAU "+level;b.classList.remove("show");void b.offsetWidth;b.classList.add("show");
 $("#status").textContent=level>=3?"VAGUE "+level+" — IDENTIFIEZ LES CONTACTS":"VAGUE "+level+" — PROTÉGEZ LE CENTRE";
 tone(620,.12,.035);setTimeout(()=>tone(850,.13,.03),130)
}
function makeObject(){
 if(!running||spawned>=target())return;
 const radar=$("#radar"),el=document.createElement("button"),angle=Math.random()*Math.PI*2;
 // Levels 1-2: classic red enemies. Level 3+: some contacts start green.
 let kind="red",revealed=true;
 if(level>=3 && Math.random()<Math.min(.65,.35+(level-3)*.035)){kind=Math.random()<.58?"red":"yellow";revealed=false}
 el.className=revealed?"enemy":"contact-v4";
 el.setAttribute("aria-label","Contact radar");radar.appendChild(el);
 const item={id:nextId++,el,angle,r:.485,last:performance.now(),kind,revealed,done:false};
 objects.push(item);spawned++;
 el.addEventListener("pointerdown",ev=>{ev.preventDefault();shoot(item)});
 const base=cfg[$("#difficulty").value].spawn;
 spawnTimer=setTimeout(makeObject,Math.max(300,base-level*65))
}
function reveal(item){
 if(item.revealed||level<3)return;
 // Must change no later than the second ring: reveal around outer/second-circle zone.
 item.revealed=true;item.el.className="contact-v4 "+item.kind;
 if(item.kind==="red")tone(760,.07,.025);
 else tone(520,.07,.018)
}
function removeObj(item){
 objects=objects.filter(x=>x!==item);item.done=true;
}
function shoot(item){
 if(!running||item.done||!item.el.isConnected)return;
 if(!item.revealed){ // green: neutral, don't reward blind firing
   $("#status").textContent="CONTACT NON IDENTIFIÉ";tone(240,.08,.025);return;
 }
 if(item.kind==="yellow"){
   lives=Math.max(0,lives-.5);$("#status").textContent="AMI TOUCHÉ : −½ VIE";
   tone(125,.32,.075,"sawtooth");item.el.classList.add("vanish");removeObj(item);
   setTimeout(()=>item.el.remove(),330);update();if(lives<=0)end();else checkLevel();return;
 }
 score+=10+level*2;kills++;$("#status").textContent="MENACE DÉTRUITE";
 tone(980,.06,.055,"square");item.el.classList.add("hit");removeObj(item);
 setTimeout(()=>item.el.remove(),170);update();checkLevel()
}
function redImpact(item){
 removeObj(item);item.el.remove();lives=Math.max(0,lives-1);tone(105,.32,.09,"sawtooth");
 $("#radar").classList.remove("danger");void $("#radar").offsetWidth;$("#radar").classList.add("danger");
 $("#status").textContent="IMPACT AU CENTRE !";update();if(lives<=0)end();else checkLevel()
}
function yellowExit(item){
 removeObj(item);item.el.classList.add("vanish");$("#status").textContent="CONTACT AMI SORTI DE LA ZONE";
 tone(420,.08,.018);setTimeout(()=>item.el.remove(),330);checkLevel()
}
function checkLevel(){
 // Level ends once all spawned objects have resolved; only destroyed threats count in ENNEMIS.
 if(spawned>=target() && objects.length===0){
   clearTimeout(spawnTimer);level++;kills=0;spawned=0;score+=50;update();
   setTimeout(()=>{if(running){announce();makeObject()}},900)
 }
}
function loop(now){
 if(!running)return;
 const diff=cfg[$("#difficulty").value];
 [...objects].forEach(x=>{
   if(x.done)return;
   const dt=Math.min(40,now-x.last);x.last=now;
   const factor=1+(level-1)*.075;
   x.r-=diff.speed*factor*(dt/1000);
   // Reveal green contacts by the second concentric circle at the latest.
   if(!x.revealed && x.r<=.365)reveal(x);
   const px=50+Math.cos(x.angle)*x.r*100,py=50+Math.sin(x.angle)*x.r*100;
   x.el.style.left=px+"%";x.el.style.top=py+"%";
   const scale=Math.max(.72,1.18-x.r*.65);x.el.style.width=(22*scale)+"px";x.el.style.height=(22*scale)+"px";
   // Yellow contacts disappear naturally at the last/inner circle; red continues to center.
   if(x.revealed && x.kind==="yellow" && x.r<=.125)yellowExit(x);
   else if(x.kind==="red" && x.r<=.025)redImpact(x)
 });
 raf=requestAnimationFrame(loop)
}
function clearObjects(){objects.forEach(x=>x.el.remove());objects=[];clearTimeout(spawnTimer)}
function start(){
 ctx();score=0;level=1;lives=3;kills=0;spawned=0;running=true;clearObjects();
 $("#home").hidden=true;$("#game").hidden=false;update();announce();
 setTimeout(()=>{if(running)makeObject()},700);raf=requestAnimationFrame(loop)
}
function end(){
 if(!running)return;running=false;clearTimeout(spawnTimer);cancelAnimationFrame(raf);clearObjects();
 $("#finalScore").textContent=score;$("#finalLevel").textContent=level;$("#over").showModal();tone(160,.5,.07,"sawtooth")
}
function home(){running=false;clearTimeout(spawnTimer);cancelAnimationFrame(raf);clearObjects();if($("#over").open)$("#over").close();$("#game").hidden=true;$("#home").hidden=false}
$("#start").onclick=start;
$("#again").onclick=()=>{$("#over").close();start()};
$("#back").onclick=home;
$("#quit").onclick=home;
$("#sound").onclick=()=>{audioOn=!audioOn;$("#sound").textContent=audioOn?"🔊":"🔇";if(audioOn)ctx()};
