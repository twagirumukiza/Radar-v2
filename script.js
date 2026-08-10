const $=s=>document.querySelector(s);
let score=0,level=1,lives=3,running=false,audioOn=true,audioCtx=null;
let enemies=[],spawnTimer=null,raf=null,nextId=1,levelKills=0,spawned=0,scanStart=0;
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
function update(){
 $("#score").textContent=score;$("#level").textContent=level;$("#lives").textContent="♥".repeat(lives);
 $("#remaining").textContent=Math.max(0,levelTarget()-levelKills);
 $("#sweep").style.animationDuration=Math.max(1.45,4-level*.10)+"s"
}
function levelTarget(){return cfg[$("#difficulty").value].count+Math.floor((level-1)*1.5)}
function announce(){
 let b=$(".level-banner");if(!b){b=document.createElement("div");b.className="level-banner";$("#radar").appendChild(b)}
 b.textContent="NIVEAU "+level;b.classList.remove("show");void b.offsetWidth;b.classList.add("show");
 $("#status").textContent=level>=4?"VAGUE "+level+" — CIBLES VISIBLES AU BALAYAGE":"VAGUE "+level+" — PROTÉGEZ LE CENTRE";tone(620,.12,.035);setTimeout(()=>tone(850,.13,.03),130)
}
function spawnEnemy(){
 if(!running||spawned>=levelTarget())return;
 const radar=$("#radar"),e=document.createElement("button"),angle=Math.random()*Math.PI*2;
 e.className="enemy";e.setAttribute("aria-label","Menace");radar.appendChild(e);
 const item={id:nextId++,el:e,angle,r:.485,last:performance.now()};
 enemies.push(item);spawned++;
 e.addEventListener("pointerdown",ev=>{ev.preventDefault();destroyEnemy(item)});
 const base=cfg[$("#difficulty").value].spawn;
 spawnTimer=setTimeout(spawnEnemy,Math.max(300,base-level*65));
}
function destroyEnemy(item){
 if(!running||!item.el.isConnected)return;
 item.el.classList.add("hit");score+=10+level*2;levelKills++;tone(980,.06,.055,"square");
 enemies=enemies.filter(x=>x!==item);setTimeout(()=>item.el.remove(),170);update();
 checkLevel()
}
function impact(item){
 enemies=enemies.filter(x=>x!==item);item.el.remove();lives--;tone(105,.32,.09,"sawtooth");
 $("#radar").classList.remove("danger");void $("#radar").offsetWidth;$("#radar").classList.add("danger");
 $("#status").textContent="IMPACT AU CENTRE !";update();if(lives<=0)end();else checkLevel()
}
function checkLevel(){
 if(levelKills>=levelTarget() && spawned>=levelTarget() && enemies.length===0){
   clearTimeout(spawnTimer);level++;levelKills=0;spawned=0;score+=50;
   update();setTimeout(()=>{if(running){announce();spawnEnemy()}},900)
 }
}
function angleDiff(a,b){
 let d=(a-b)%360;if(d<0)d+=360;return d;
}
function updateScanVisibility(item,now){
 // Progressive mechanic: from level 4 onward, enemies are only visible
 // inside the green wake BEHIND the clockwise leading edge.
 if(level<4){
   item.el.classList.remove("scan-hidden");
   item.el.classList.add("scan-visible");
   return;
 }
 const duration=Math.max(1.45,4-level*.10)*1000;
 const sweepDeg=((now-scanStart)%duration)/duration*360;
 // Enemy angle: CSS radar 0° is upward; atan placement uses 0° at right.
 const enemyDeg=(item.angle*180/Math.PI+90+360)%360;
 // Wake width becomes narrower as difficulty rises.
 const trailWidth=Math.max(22,62-(level-4)*3.5);
 // clockwise sweep: trail occupies angles immediately BEFORE leading edge
 const behind=(sweepDeg-enemyDeg+360)%360;
 const visible=behind>=0 && behind<=trailWidth;
 item.el.classList.toggle("scan-visible",visible);
 item.el.classList.toggle("scan-hidden",!visible);
}
function loop(now){
 if(!running)return;
 const rect=$("#radar").getBoundingClientRect(),cx=rect.width/2,cy=rect.height/2;
 const diff=cfg[$("#difficulty").value];
 [...enemies].forEach(x=>{
   const dt=Math.min(40,now-x.last);x.last=now;
   const levelFactor=1+(level-1)*.075;
   x.r-=diff.speed*levelFactor*(dt/1000);
   const px=50+Math.cos(x.angle)*x.r*100,py=50+Math.sin(x.angle)*x.r*100;
   x.el.style.left=px+"%";x.el.style.top=py+"%";
   updateScanVisibility(x,now);
   const scale=Math.max(.72,1.18-x.r*.65);x.el.style.width=(22*scale)+"px";x.el.style.height=(22*scale)+"px";
   if(x.r<=.025)impact(x)
 });
 raf=requestAnimationFrame(loop)
}
function clearEnemies(){enemies.forEach(x=>x.el.remove());enemies=[];clearTimeout(spawnTimer)}
function start(){
 ctx();score=0;level=1;lives=3;levelKills=0;spawned=0;running=true;clearEnemies();
 $("#home").hidden=true;$("#game").hidden=false;update();announce();
 scanStart=performance.now();
 setTimeout(()=>{if(running)spawnEnemy()},700);raf=requestAnimationFrame(loop)
}
function end(){
 if(!running)return;running=false;clearTimeout(spawnTimer);cancelAnimationFrame(raf);clearEnemies();
 $("#finalScore").textContent=score;$("#finalLevel").textContent=level;$("#over").showModal();tone(160,.5,.07,"sawtooth")
}
function home(){running=false;clearTimeout(spawnTimer);cancelAnimationFrame(raf);clearEnemies();if($("#over").open)$("#over").close();$("#game").hidden=true;$("#home").hidden=false}
$("#start").onclick=start;
$("#again").onclick=()=>{$("#over").close();start()};
$("#back").onclick=home;
$("#quit").onclick=home;
$("#sound").onclick=()=>{audioOn=!audioOn;$("#sound").textContent=audioOn?"🔊":"🔇";if(audioOn)ctx()};
