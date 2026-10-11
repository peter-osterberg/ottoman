'use strict';
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay'), play = document.getElementById('play');
const keys = new Set(), worldWidth = 5700, ground = 532;
let mode = 'ready', camera = 0, time = 0, last = 0, soundOn = true, audio, player, coins, enemies, particles = [], collected = 0, lives = 3, checkpoint = 80, jumpBuffer = 0, coyote = 0;
let boss = null, levelNumber = 1, revealTimer = 0;
const junglePlatforms = [
  {x:0,y:ground,w:920,h:150},{x:1080,y:ground,w:900,h:150},{x:2150,y:ground,w:1070,h:150},{x:3400,y:ground,w:840,h:150},{x:4420,y:ground,w:1280,h:150},
  {x:430,y:421,w:155,h:30},{x:720,y:338,w:145,h:30},{x:955,y:427,w:110,h:28},
  {x:1280,y:414,w:150,h:30},{x:1580,y:325,w:165,h:30},{x:2005,y:418,w:115,h:28},
  {x:2320,y:410,w:180,h:30},{x:2630,y:325,w:140,h:30},{x:2910,y:408,w:180,h:30},
  {x:3250,y:425,w:120,h:28},{x:3550,y:405,w:165,h:30},{x:3850,y:320,w:170,h:30},{x:4270,y:421,w:120,h:28},
  {x:4650,y:410,w:165,h:30},{x:4920,y:330,w:150,h:30}
];
const coinPositions = [[260,460],[330,460],[477,370],[545,370],[757,288],[825,288],[1008,374],[1200,460],[1320,363],[1390,363],[1618,275],[1690,275],[2062,367],[2370,359],[2440,359],[2670,274],[2740,274],[2970,357],[3310,374],[3590,354],[3660,354],[3890,269],[3960,269],[4330,370],[4700,359],[4770,359],[4960,279],[5030,279],[5210,460],[5290,460]];
const bambooPlatforms = [
  {x:0,y:ground,w:800,h:150},{x:970,y:ground,w:1010,h:150},{x:2150,y:ground,w:900,h:150},{x:3230,y:ground,w:1000,h:150},{x:4420,y:ground,w:1280,h:150},
  ...[[340,420,130],[620,300,150],[845,410,100],[1120,390,160],[1430,280,140],[1760,390,160],[2020,415,90],[2320,400,160],[2600,275,145],[2890,370,120],[3100,410,100],[3380,390,160],[3690,260,150],[3980,390,160],[4290,415,100],[4620,395,140],[4900,270,150]].map(([x,y,w])=>({x,y,w,h:30}))
];
let platforms = junglePlatforms;
const hauntedPlatforms=[
  {x:0,y:ground,w:850,h:150},{x:1020,y:ground,w:960,h:150},{x:2150,y:ground,w:990,h:150},{x:3310,y:ground,w:930,h:150},{x:4420,y:ground,w:1280,h:150},
  ...[[360,410,140],[680,295,130],[885,405,110],[1150,390,150],[1460,265,160],[1770,385,140],[2020,415,95],[2340,400,150],[2630,280,140],[2930,375,150],[3190,410,100],[3450,385,155],[3760,260,145],[4040,390,150],[4290,420,100],[4640,390,155],[4910,265,145]].map(([x,y,w])=>({x,y,w,h:30}))
];
const stealthPlatforms=[
  {x:0,y:ground,w:880,h:150},{x:1050,y:ground,w:930,h:150},{x:2150,y:ground,w:1020,h:150},{x:3340,y:ground,w:890,h:150},{x:4420,y:ground,w:1280,h:150},
  ...[[370,410,145],[670,285,150],[920,415,100],[1190,390,150],[1480,270,145],[1790,385,140],[2020,415,100],[2370,395,145],[2660,260,150],[2960,380,145],[3210,415,100],[3490,400,160],[3790,275,150],[4080,390,145],[4290,420,100],[4640,390,150],[4930,270,150]].map(([x,y,w])=>({x,y,w,h:30}))
];
function reset(level=levelNumber) {
  levelNumber=level;platforms=level===1?junglePlatforms:level===2?bambooPlatforms:level===3?hauntedPlatforms:stealthPlatforms;keys.clear();revealTimer=0;
  player = {x:80,y:ground-68,w:38,h:68,vx:0,vy:0,face:1,grounded:true,crouching:false,jumps:0,attack:0,attackCooldown:0,invincible:0};
  const positions=level===1?coinPositions:[[240,460],[300,460],[5200,460],[5280,460],...platforms.filter(p=>p.h===30).flatMap(p=>[[p.x+30,p.y-40],[p.x+p.w-30,p.y-40]])];
  coins = positions.map(([x,y])=>({x,y,taken:false}));
  enemies = (level===1?[650,1470,2470,3060,3760,4700,5130]:[570,1300,1740,2420,2810,3530,4020,4700,5130]).map((x,i)=>({x,y:ground-34,w:48,h:34,origin:x,dir:i%2?1:-1,dead:false}));
  if(level===3)enemies=[580,1190,1680,2390,2800,3590,3970,4720,5120].map((x,i)=>({x,y:ground-(i%2?110:58),w:40,h:i%2?48:58,origin:x,dir:i%2?1:-1,kind:i%2?'ghost':'zombie',dead:false}));
  if(level===4)enemies=[610,1270,1740,2430,2850,3590,4010,4720,5120].map((x,i)=>({x,y:ground-52,w:40,h:52,origin:x,dir:i%2?1:-1,kind:'stealth',dead:false}));
  particles=[];collected=0;lives=3;checkpoint=80;camera=0;jumpBuffer=0;coyote=0;updateHud();
  boss=null;document.getElementById('boss-hud').hidden=true;
  document.getElementById('chapter').textContent='KAPITEL 0'+level;
  document.getElementById('level-title').textContent=level===1?'Det förlorade templet':level===2?'Bambudjungelns dojo':level===3?'Spökzombi skogen':'Osynlighetsbanan';
  document.getElementById('location-name').textContent=level===1?'SMARAGDSKOGEN':level===2?'BAMBUSKOGEN':level===3?'SPÖKZOMBI SKOGEN':'OSYNLIGHETSSKOGEN';
  document.getElementById('crystal-icon').style.color=level===4?'#90ff9c':'';
  document.getElementById('progress-fill').style.width='0%';
  document.getElementById('level-select').value=String(level);
  document.getElementById('overlay-copy').textContent=level===4?'Samla gröna solkristaller för att avslöja osynliga fiender i tre sekunder. Följ ögonen i skuggorna!':'Samla solkristaller, hoppa över faror och hitta vägen till det förlorade templet.';
}
function updateHud() {
  document.getElementById('score').textContent=String(collected).padStart(2,'0');
  document.getElementById('total').textContent=coins.length;
  document.getElementById('hearts').textContent='♥ '.repeat(lives)+'♡ '.repeat(3-lives);
  document.getElementById('hearts').setAttribute('aria-label',lives+' liv');
}
async function tone(freq,duration=.12,type='sine',volume=.15,delay=0,endFreq=freq*.65) {
  if(!soundOn)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state!=='running')await audio.resume();if(!soundOn)return;const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(endFreq,at+duration);g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(audio.destination);o.start(at);o.stop(at+duration);}catch{soundOn=false;document.getElementById('sound').innerHTML='♪ <span>Ljud otillgängligt</span>';}
}
function showOverlay(tag,title,copy,button) {
  document.getElementById('level-choice').hidden=true;
  document.getElementById('overlay-tag').textContent=tag;document.getElementById('overlay-title').textContent=title;document.getElementById('overlay-copy').textContent=copy;
  play.innerHTML=button+' <span>→</span>';document.getElementById('start-hint').textContent='eller tryck på ↑ eller mellanslag';overlay.hidden=false;
}
function start() {tone(540);if(mode==='paused'){mode='playing';}else{reset(mode==='levelComplete'?levelNumber+1:mode==='won'?1:levelNumber);mode='playing';}overlay.hidden=true;document.getElementById('pause').textContent='Ⅱ';canvas.focus();last=performance.now();}
function pause() {if(mode==='playing'){mode='paused';keys.clear();showOverlay('TA EN ANDEPAUS','Djungeln vilar.','Äventyret finns kvar precis där du lämnade det.','Fortsätt');document.getElementById('pause').textContent='▶';}else if(mode==='paused'){mode='playing';overlay.hidden=true;document.getElementById('pause').textContent='Ⅱ';last=performance.now();}}
play.addEventListener('click',start);
document.getElementById('level-select').addEventListener('change',()=>{
  const level=Number(document.getElementById('level-select').value);
  if(mode==='ready'&&[1,2,3,4].includes(level))reset(level);
});
document.getElementById('pause').addEventListener('click',pause);
document.getElementById('sound').addEventListener('click',()=>{soundOn=!soundOn;const b=document.getElementById('sound');b.innerHTML='♪ <span>Ljud '+(soundOn?'på':'av')+'</span>';b.setAttribute('aria-label',soundOn?'Stäng av ljud':'Slå på ljud');tone(540);});
const gameShell=document.getElementById('game-shell');
function syncFullscreen(){
  const expanded=!!document.fullscreenElement||gameShell.classList.contains('game-expanded');
  const button=document.getElementById('fullscreen');
  button.textContent=expanded?'✕':'⛶';
  button.setAttribute('aria-label',expanded?'Avsluta fullskärm':'Öppna fullskärm');
  button.setAttribute('title',expanded?'Avsluta fullskärm':'Öppna fullskärm');
  document.body.classList.toggle('game-expanded-open',gameShell.classList.contains('game-expanded'));
  keys.clear();requestAnimationFrame(resize);canvas.focus();
}
document.getElementById('fullscreen').addEventListener('click',async()=>{
  if(gameShell.classList.contains('game-expanded'))gameShell.classList.remove('game-expanded');
  else if(document.fullscreenElement)await document.exitFullscreen();
  else{
    try{await gameShell.requestFullscreen();}
    catch{gameShell.classList.add('game-expanded');}
  }
  syncFullscreen();
});
document.addEventListener('fullscreenchange',syncFullscreen);
function press(code,repeat=false) {
  
  if(['Space','ArrowUp'].includes(code)&&!repeat){if(mode!=='playing'){start();return;}jumpBuffer=.14;}
  if(code==='KeyX'&&!repeat&&mode==='playing'&&player.attackCooldown===0){player.attack=.18;player.attackCooldown=.35;tone(180,.12,'sawtooth');}
  if(code==='Escape'&&!repeat){if(gameShell.classList.contains('game-expanded')){gameShell.classList.remove('game-expanded');syncFullscreen();return;}pause();}
  keys.add(code);
}
window.addEventListener('keydown',e=>{if(['SELECT','INPUT'].includes(e.target.tagName))return;if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','Escape','KeyX'].includes(e.code)){if(e.target.tagName==='BUTTON'&&['Space','Escape'].includes(e.code))return;e.preventDefault();press(e.code,e.repeat);}});
function release(code){keys.delete(code);if(['Space','ArrowUp'].includes(code)&&!keys.has('Space')&&!keys.has('ArrowUp')&&player.vy< -220)player.vy=-220;}
window.addEventListener('keyup',e=>release(e.code));
window.addEventListener('blur',()=>{keys.clear();if(mode==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
for(const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);button.setAttribute('aria-pressed','true');press(button.dataset.key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{release(button.dataset.key);button.setAttribute('aria-pressed','false');});
}
function burst(x,y,color,count=10){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*180,life:.65,color});}
function hurt(){if(player.invincible>0)return;lives--;tone(100,.3,'sawtooth',.025);burst(player.x,player.y+25,'#bd98e7');updateHud();if(lives<=0){mode='lost';showOverlay('ÄVENTYRET TAR INTE SLUT HÄR','Ett försök till?','Djungeln är full av överraskningar. Ta ett nytt språng och hitta templet.','Försök igen');}else{player.x=checkpoint;player.h=68;player.crouching=false;player.y=ground-player.h;player.vx=0;player.vy=0;player.jumps=0;player.attack=0;player.attackCooldown=0;player.grounded=true;jumpBuffer=0;coyote=0;player.invincible=2;camera=Math.max(0,checkpoint-canvas.width*.3);}}
function intersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function clawBox(){return {x:player.face>0?player.x+player.w:player.x-62,y:player.y+player.h*.25,w:62,h:player.h*.75};}
function bossPhase(phase){
  boss.phase=phase;boss.timer=0;boss.fromX=boss.x;boss.fromY=boss.y;
  if(phase==='aim'){
    boss.target=player.x+player.w/2;
    boss.landingX=Math.max(5250,Math.min(5570,boss.target+(boss.target<5450?130:-130)));
  }
  const hints={climb:'Apan klättrar upp…',aim:'Undvik markeringen!',leap:'Hoppa undan!',windup:'Slaget kommer!',stuck:'Handen sitter fast! Slå med X!',recover:'Apan klättrar snart igen…'};
  const turtleHints={guard:'Skalet skyddar! Vänta på sparken.',kickReady:'Karatespark på väg! Ducka med ↓!',kick:'Håll ↓ för att ducka!',stunned:'Ur balans! Slå med X!',recover:'Sköldpaddan återhämtar sig…'};
  const zombieHints={stalk:'Stor zombin närmar sig…',raise:'Undvik zombins stora slag!',smash:'Hoppa undan eller backa!',stunned:'Zombin är trött! Slå med X!',recover:'Zombin vaknar till igen…'};
  const stealthHints={vanish:'Monstret är osynligt. Följ ögonen!',ambushReady:'Gör dig redo! Vänta tills monstret rusar.',ambush:'Hoppa nu! Håll inne hoppknappen!',exposed:'Monstret syns! Slå med X!',recover:'Monstret försvinner igen…'};
  document.getElementById('boss-hint').textContent=boss.kind==='stealth'?stealthHints[phase]:boss.kind==='turtle'?turtleHints[phase]:boss.kind==='zombie'?zombieHints[phase]:hints[phase];
}
function hitBoss(){
  boss.health--;burst(boss.x,ground-45,'#d5b5ff',20);
  document.getElementById('boss-health').textContent='♥ '.repeat(boss.health)+'♡ '.repeat(3-boss.health);
  if(boss.health>0){tone(780,.2,'triangle');bossPhase('recover');return;}
  boss.phase='defeated';mode=levelNumber<4?'levelComplete':'won';keys.clear();
  document.getElementById('boss-hint').textContent='Bossen besegrad!';burst(boss.x,boss.y-100,'#ffe097',40);
  [523.25,659.25,783.99,1046.5,1318.51].forEach((freq,i)=>tone(freq,i===4?.55:.16,'triangle',.12,i*.17,freq));
  if(levelNumber===1)showOverlay('APBOSSEN ÄR BESEGRAD','Bana två väntar!','Templet är befriat. Fortsätt genom bambuskogen och möt dojons karatesköldpadda.','Till bana två');
  else if(levelNumber===2)showOverlay('KARATEMÄSTAREN ÄR BESEGRAD','Bana tre väntar!','Följ stigen in i Spökzombi skogen. Zombies, spöken och en jättelik zombie väntar där.','Till bana tre');
  else if(levelNumber===3)showOverlay('JÄTTEZOMBIN ÄR BESEGRAD','Bana fyra väntar!','Samla gröna solkristaller för att avslöja osynliga fiender. Supersmygmonstret väntar i skuggorna.','Till bana fyra');
  else showOverlay('SUPERSMYGMONSTRET ÄR BESEGRAT','Du vann äventyret!','Ottoman klarade alla fyra banorna och besegrade alla bossarna!','Spela från början');
}
function updateStealthBoss(dt){
  boss.timer+=dt;const t=boss.timer;
  if(boss.phase==='vanish'&&t>=1.4){
    boss.x=player.x<5450?5570:5270;boss.face=player.x<boss.x?-1:1;boss.landedHit=false;bossPhase('ambushReady');
  }else if(boss.phase==='ambushReady'&&t>=1.2){bossPhase('ambush');tone(130,.2,'sawtooth');}
  else if(boss.phase==='ambush'){
    boss.x=Math.max(5250,Math.min(5620,boss.x+boss.face*400*dt));
    if(!boss.landedHit&&intersects(player,{x:boss.x-48,y:ground-55,w:96,h:55})){boss.landedHit=true;hurt();}
    if(t>=.825)bossPhase('exposed');
  }else if(boss.phase==='exposed'){
    if(player.attack>0&&intersects(clawBox(),{x:boss.x-48,y:ground-160,w:96,h:160}))hitBoss();
    else if(t>=2.4)bossPhase('recover');
  }else if(boss.phase==='recover'&&t>=.6)bossPhase('vanish');
}
function updateZombieBoss(dt){
  boss.timer+=dt;const t=boss.timer;
  if(boss.phase==='stalk'){
    boss.face=player.x<boss.x?-1:1;boss.x=Math.max(5250,Math.min(5620,boss.x+boss.face*85*dt));
    if(t>=1.2){boss.landedHit=false;bossPhase('raise');}
  }else if(boss.phase==='raise'&&t>=.8){bossPhase('smash');tone(85,.3,'sawtooth',.08);}
  else if(boss.phase==='smash'){
    if(!boss.landedHit&&intersects(player,{x:boss.face>0?boss.x:boss.x-150,y:ground-110,w:150,h:110})){boss.landedHit=true;hurt();}
    if(t>=.35){burst(boss.x+boss.face*110,ground,'#9fa382',20);bossPhase('stunned');}
  }else if(boss.phase==='stunned'){
    if(player.attack>0&&intersects(clawBox(),{x:boss.x-50,y:ground-185,w:100,h:185}))hitBoss();
    else if(t>=2.4)bossPhase('recover');
  }else if(boss.phase==='recover'&&t>=.6)bossPhase('stalk');
}
function updateTurtleBoss(dt){
  boss.timer+=dt;const t=boss.timer;
  if(boss.phase==='guard'&&t>=1.1){boss.face=player.x<boss.x?-1:1;boss.landedHit=false;bossPhase('kickReady');}
  else if(boss.phase==='kickReady'&&t>=.7){bossPhase('kick');tone(160,.2,'sawtooth');}
  else if(boss.phase==='kick'){
    boss.x=Math.max(5250,Math.min(5620,boss.x+boss.face*560*dt));boss.y=ground-50*Math.sin(Math.min(1,t/.6)*Math.PI);
    const kick={x:boss.face>0?boss.x-20:boss.x-115,y:boss.y-80,w:135,h:35};
    if(!boss.landedHit&&intersects(player,kick)){boss.landedHit=true;hurt();}
    if(t>=.6){boss.y=ground;bossPhase(boss.landedHit?'recover':'stunned');}
  }else if(boss.phase==='stunned'){
    if(player.attack>0&&intersects(clawBox(),{x:boss.x-45,y:ground-135,w:90,h:135}))hitBoss();
    else if(t>=2.4)bossPhase('recover');
  }else if(boss.phase==='recover'&&t>=.6)bossPhase('guard');
}
function updateBoss(dt){
  if(!boss||mode!=='playing')return;
  if(boss.kind==='stealth'){updateStealthBoss(dt);return;}
  if(boss.kind==='turtle'){updateTurtleBoss(dt);return;}
  if(boss.kind==='zombie'){updateZombieBoss(dt);return;}
  boss.timer+=dt;
  const t=boss.timer;
  if(boss.phase==='climb'){
    const p=Math.min(1,t/1.2);boss.x=boss.fromX+(5590-boss.fromX)*p;boss.y=boss.fromY+(ground-300-boss.fromY)*p;
    if(t>=1.2)bossPhase('aim');
  }else if(boss.phase==='aim'){
    if(t>=.9)bossPhase('leap');
  }else if(boss.phase==='leap'){
    const p=Math.min(1,t/.65);boss.x=boss.fromX+(boss.landingX-boss.fromX)*p;boss.y=boss.fromY+(ground-boss.fromY)*p-90*Math.sin(p*Math.PI);
    if(t>=.65){boss.y=ground;burst(boss.x,ground,'#bba779',15);tone(95,.2,'triangle');bossPhase('windup');}
  }else if(boss.phase==='windup'){
    if(t>=.55){
      boss.hand={x:boss.target-38,y:ground-85,w:76,h:85};
      const hit=intersects(player,boss.hand);
      burst(boss.target,ground,'#bba779',20);tone(70,.25,'sawtooth',.09);
      if(hit)hurt();
      bossPhase(hit?'recover':'stuck');
    }
  }else if(boss.phase==='stuck'){
    if(player.attack>0&&intersects(clawBox(),boss.hand)){
      hitBoss();
    }else if(t>=3)bossPhase('recover');
  }else if(boss.phase==='recover'&&t>=.45)bossPhase('climb');
}
function update(dt){
  if(mode!=='playing')return;
  revealTimer=Math.max(0,revealTimer-dt);
  player.attack=Math.max(0,player.attack-dt);player.attackCooldown=Math.max(0,player.attackCooldown-dt);
  player.invincible=Math.max(0,player.invincible-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=player.grounded?.1:Math.max(0,coyote-dt);
  player.crouching=keys.has('ArrowDown')&&player.grounded&&jumpBuffer===0;
  const height=player.crouching?32:68;player.y+=player.h-height;player.h=height;
  const direction=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);
  player.vx=direction*(player.crouching?130:285);if(direction)player.face=direction;
  if(jumpBuffer>0&&(coyote>0||player.jumps<2)){player.jumps=(coyote>0?0:Math.max(1,player.jumps))+1;player.vy=-640;player.grounded=false;coyote=0;jumpBuffer=0;tone(player.jumps===2?620:420,.17,'triangle');}
  player.vy=Math.min(player.vy+1650*dt,950);
  player.x=Math.max(0,Math.min(worldWidth-player.w,player.x+player.vx*dt));
  if(boss)player.x=Math.max(5200,player.x);
  for(const p of platforms){if(p.h>100&&intersects(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w;}}
  const previousBottom=player.y+player.h;player.y+=player.vy*dt;player.grounded=false;
  for(const p of platforms){if(player.x<p.x+p.w&&player.x+player.w>p.x&&player.vy>=0&&previousBottom<=p.y&&player.y+player.h>=p.y){player.y=p.y-player.h;player.vy=0;player.grounded=true;player.jumps=0;}else if(p.h>100&&player.vy<0&&intersects(player,p)){player.y=p.y+p.h;player.vy=0;}}
  for(const coin of coins){if(!coin.taken&&Math.abs(player.x+player.w/2-coin.x)<30&&Math.abs(player.y+player.h/2-coin.y)<45){coin.taken=true;collected++;if(levelNumber===4)revealTimer=3;burst(coin.x,coin.y,levelNumber===4?'#90ff9c':'#f7d47e');tone(850,.1);updateHud();}}
  for(const e of enemies){if(e.dead)continue;e.x+=e.dir*(e.kind==='ghost'?75:e.kind==='zombie'?35:55)*dt;if(Math.abs(e.x-e.origin)>70)e.dir*=-1;
    if(e.kind==='ghost')e.y=ground-120+Math.sin(time*2+e.origin)*28;
    if(player.attack>0&&intersects(clawBox(),e)){e.dead=true;burst(e.x+24,e.y,'#bd98e7');tone(260,.1,'triangle');continue;}
    if(intersects(player,e)){if(player.vy>0&&previousBottom<=e.y+15){e.dead=true;player.vy=-420;burst(e.x+24,e.y,'#dca56a');tone(240,.1,'triangle');}else{hurt();break;}}
  }
  if(player.y>720)hurt();
  if(player.x>2210&&player.x<3100&&player.grounded)checkpoint=2210;
  if(player.x>4470&&player.grounded)checkpoint=4470;
  if(!boss&&player.x>5480&&mode==='playing'){
    boss={x:5590,y:ground,health:3,hand:null,kind:levelNumber===1?'ape':levelNumber===2?'turtle':levelNumber===3?'zombie':'stealth',face:-1};enemies=enemies.filter(e=>e.x<5200);
    document.getElementById('boss-title').textContent=levelNumber===1?'TEMPLETS APVÄKTARE':levelNumber===2?'DOJONS KARATEMÄSTARE':levelNumber===3?'SKOGENS JÄTTEZOMBI':'SUPERSMYGMONSTRET';
    document.getElementById('boss-hud').hidden=false;document.getElementById('boss-health').textContent='♥ ♥ ♥';bossPhase(levelNumber===1?'climb':levelNumber===2?'guard':levelNumber===3?'stalk':'vanish');
  }
  if(boss){checkpoint=5200;updateBoss(dt);}
  camera=Math.max(0,Math.min(worldWidth-canvas.width,player.x-canvas.width*.33));
  document.getElementById('progress-fill').style.width=Math.min(100,player.x/5480*100)+'%';
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
}
function shape(points,fill){ctx.fillStyle=fill;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function ellipse(x,y,rx,ry,fill,rotation=0){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);ctx.fill();}
function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function leaf(x,y,size,color,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-size*.6,-size*.55,0,-size);ctx.quadraticCurveTo(size*.65,-size*.5,0,0);ctx.fill();ctx.restore();}
function fern(x,y,size,color){for(let i=0;i<6;i++){const a=i*.19;leaf(x,y,size*(1-i*.08),color,-.35-a);leaf(x,y,size*(1-i*.08),color,.35+a);}line([[x,y],[x,y-size*.8]],color,2);}
function tree(x,y,height,width,color,foliage){
  shape([[x-width,y],[x-width*.52,y-height*.7],[x-width*.7,y-height],[x+width*.4,y-height],[x+width*.55,y-height*.6],[x+width,y]],color);
  line([[x,y-height*.43],[x-width*2,y-height*.65],[x-width*3,y-height*.77]],color,width*.5);
  line([[x,y-height*.65],[x+width*2,y-height*.8],[x+width*3,y-height*.9]],color,width*.5);
  if(levelNumber!==3)for(let i=0;i<8;i++){const a=i*2.4;ellipse(x+Math.sin(a)*width*3,y-height+Math.cos(a)*30,width*2.1,50,foliage,a*.15);}
}
function background(){
  const w=canvas.width,g=ctx.createLinearGradient(0,0,0,640);g.addColorStop(0,levelNumber===4?'#081f22':levelNumber===3?'#17192f':levelNumber===2?'#302d50':'#143f3b');g.addColorStop(.5,levelNumber===4?'#246957':levelNumber===3?'#535570':levelNumber===2?'#85855d':'#4c8a64');g.addColorStop(1,levelNumber===4?'#132f29':levelNumber===3?'#293541':levelNumber===2?'#314838':'#214e3c');ctx.fillStyle=g;ctx.fillRect(0,0,w,640);
  if(levelNumber===3){ellipse(w*.7,130,46,46,'#dcded699');ellipse(w*.7-13,121,10,8,'#b4bbc559');}
  const glow=ctx.createRadialGradient(w*.65,165,8,w*.65,165,360);glow.addColorStop(0,'#d0ddb33b');glow.addColorStop(1,'#c3d89900');ctx.fillStyle=glow;ctx.fillRect(0,0,w,640);
  for(let i=0;i<6;i++){const x=300+i*270-camera*.09;shape([[x,-20],[x+28,-20],[x-200,590],[x-380,590]],'#e7f5c809');}
  for(let layer=0;layer<3;layer++){
    const parallax=[.12,.24,.42][layer],spacing=[170,240,390][layer];
    for(let i=-1;i<Math.ceil(w/spacing)+2;i++){
      const n=i+Math.floor(camera*parallax/spacing),x=i*spacing-camera*parallax%spacing;
      tree(x,565,390+Math.sin(n*4.3)*95,layer===2?25:14,['#356d59','#285d49','#1b4c37'][layer],['#386f56','#285f45','#215237'][layer]);
      if(layer===1){ctx.strokeStyle='#477c50';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+40,0);ctx.bezierCurveTo(x-35,90,x+120,120,x+65,260);ctx.stroke();for(let j=0;j<5;j++)leaf(x+57,70+j*33,17,'#51885b',j%2?1:-1);}
    }
  }
  if(levelNumber===2){
    for(let i=-1;i<w/95+2;i++){
      const x=i*95-camera*.35%95,h=340+(i%3)*45;
      line([[x,ground],[x+12,ground-h]],'#456847',10);
      for(let j=0;j<6;j++){const y=ground-j*55;line([[x-4+j*2,y],[x+8+j*2,y]],'#91a975',3);}
      for(let j=0;j<4;j++){leaf(x+10,ground-h+50+j*30,45,'#4e7750',j%2?1.1:-1.1);}
    }
  }
  // Ruins sit behind the playable platforms.
  const ruinX=880-camera*.42;ctx.fillStyle='#547756';ctx.fillRect(ruinX,331,82,210);ctx.fillStyle='#3b6548';ctx.fillRect(ruinX+12,347,14,180);ctx.fillRect(ruinX+48,347,14,180);ctx.fillStyle='#68825b';ctx.fillRect(ruinX-15,322,112,18);fern(ruinX+30,326,33,'#619650');
  for(let i=0;i<16;i++){const x=((i*193+Math.sin(time*.2+i)*30-camera*.16)% (w+150)+w+150)%(w+150);const y=160+(i*73)%360+Math.sin(time+i)*12;ellipse(x,y,1.8,1.8,'#d9f2a14d');}
  const mist=ctx.createLinearGradient(0,350,0,550);mist.addColorStop(0,'#abdca600');mist.addColorStop(.6,'#abdca616');mist.addColorStop(1,'#abdca600');ctx.fillStyle=mist;ctx.fillRect(0,350,w,200);
  if(levelNumber===3){
    ctx.fillStyle='#5f508333';ctx.fillRect(0,0,w,640);
    for(let i=-1;i<w/180+2;i++){
      const x=i*180-camera*.55%180;ellipse(x+70,ground-70,140,22,'#d3d6eb10');
      ctx.fillStyle='#747b7e';ctx.fillRect(x,ground-42,24,42);ellipse(x+12,ground-42,12,12,'#747b7e');line([[x+12,ground-44],[x+12,ground-23]],'#3d474b',3);line([[x+6,ground-37],[x+18,ground-37]],'#3d474b',3);
    }
  }
}
function platform(p){const x=p.x-camera;if(x+p.w<0||x>canvas.width)return;ctx.fillStyle=p.h>100?'#293328':'#4d4735';ctx.fillRect(x,p.y,p.w,p.h);
  const gradient=ctx.createLinearGradient(0,p.y,0,p.y+p.h);gradient.addColorStop(0,'#5b6240');gradient.addColorStop(1,'#192b24');ctx.fillStyle=gradient;ctx.fillRect(x,p.y+8,p.w,p.h-8);
  for(let i=0;i<p.w/34;i++){ctx.fillStyle=i%2?'#798452':'#647948';ctx.fillRect(x+i*34,p.y,34,7);shape([[x+i*34,p.y+6],[x+i*34+12,p.y+18+(i%3)*5],[x+i*34+20,p.y+6]],'#527745');}
  for(let i=0;i<p.w/65;i++){const offset=i*65;line([[x+offset+15,p.y+28],[x+offset+40,p.y+28],[x+offset+49,p.y+46]],'#77816127',2);}
  if(p.h>100){for(let i=0;i<p.w/150;i++)fern(x+50+i*150,p.y+3,18+(i%3)*6,'#739456');}else{line([[x+16,p.y+18],[x+20,p.y+51],[x+10,p.y+70]],'#6d9251',2);leaf(x+15,p.y+45,13,'#6a984d',-1);}
}
function panther(){
  if(player.invincible>0&&Math.floor(time*14)%2)return;
  const x=player.x-camera+player.w/2,y=player.y+player.h;
  const running=player.grounded&&Math.abs(player.vx)>0,swing=running?Math.sin(time*15)*11:0;
  ctx.save();ctx.translate(x,y);ctx.scale(player.face,player.h/68);
  ellipse(0,1,25,5,'#00000030');
  // A curved tail, pointed mask and violet suit accents make Ottoman a panther hero.
  ctx.strokeStyle='#18212b';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-9,-25);ctx.bezierCurveTo(-32,-15,-34,-46,-44,-35+Math.sin(time*4)*4);ctx.stroke();
  line([[-7,-23],[-9+swing*.6,-11],[-12+swing, -2]],'#171c27',10);
  line([[7,-23],[7-swing*.6,-12],[10-swing,-2]],'#242937',10);
  shape([[-12,-48],[11,-48],[15,-33],[9,-21],[-10,-21],[-15,-34]],'#202632');
  line([[-12,-44],[-17-swing*.5,-32],[-19-swing*.7,-23]],'#1a202a',8);
  line([[12,-44],[player.attack>0?28:17+swing*.5,-32],[player.attack>0?40:20+swing*.7,-26]],'#2a303d',8);
  if(player.attack>0){ctx.globalAlpha=player.attack/.18;for(let i=0;i<3;i++){ctx.strokeStyle=i===1?'#e6faca':'#bda0ef';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(28+i*10,-58);ctx.quadraticCurveTo(58+i*10,-31,30+i*10,-8);ctx.stroke();}ctx.globalAlpha=1;}
  line([[-9,-47],[0,-35],[9,-47]],'#9775ba',2);
  for(let i=-1;i<=1;i++)shape([[i*6-2,-44],[i*6+2,-44],[i*6,-39]],'#c9cbd3');
  shape([[-14,-55],[-14,-70],[-7,-65],[6,-65],[14,-70],[14,-55],[9,-45],[-8,-45]],'#151e29');
  line([[-13,-62],[-7,-59]],'#715794',2);line([[13,-62],[7,-59]],'#715794',2);
  shape([[-11,-57],[-3,-55],[-5,-52],[-11,-53]],'#d0f6b0');shape([[11,-57],[3,-55],[5,-52],[11,-53]],'#d0f6b0');
  line([[-5,-49],[0,-47],[5,-49]],'#778696',1);
  line([[-10,-24],[10,-24]],'#7a5f9b',2);ctx.restore();
}
function drawZombie(x,y,scale=1,face=1,phase='stalk'){
  ctx.save();ctx.translate(x,y);ctx.scale(face*scale,scale);
  if(phase==='defeated'){ctx.globalAlpha=.5;ctx.rotate(.2);}
  const swinging=phase==='smash',raised=phase==='raise';
  ellipse(0,0,24,4,'#0003');line([[-8,-23],[-11,-3],[-18,-2]],'#373647',9);line([[8,-23],[12,-3],[18,-2]],'#454153',9);
  shape([[-16,-43],[14,-43],[18,-23],[7,-18],[0,-24],[-8,-18],[-17,-25]],'#665776');
  shape([[-6,-42],[5,-42],[10,-26],[-4,-28]],'#899971');
  const armY=raised?-64:swinging?-22:-38,armX=swinging?44:30;
  line([[-13,-39],[-20,-29],[-22,-18]],'#778c62',7);line([[13,-39],[23,armY],[armX,armY]],'#9aad7b',9);line([[armX,armY],[armX+6,armY+3]],'#b1ba8e',4);
  ctx.fillStyle='#97aa7f';ctx.fillRect(-14,-62,28,23);shape([[-14,-62],[-3,-65],[3,-61],[14,-62],[14,-55],[-14,-55]],'#7e936b');
  ctx.fillStyle='#302f34';ctx.fillRect(-10,-54,8,6);ctx.fillRect(4,-54,8,6);ctx.fillStyle='#ddcd86';ctx.fillRect(-7,-53,3,3);ctx.fillRect(7,-53,3,3);
  line([[-6,-43],[7,-45]],'#444b40',3);ctx.fillStyle='#dad4b7';ctx.fillRect(1,-45,3,4);
  if(phase==='stunned'){ctx.fillStyle='#fff0a6';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('✧ ✧',0,-74);}
  ctx.restore();
}
function drawStealthMonster(x,y,scale=1,face=1,visible=false,attacking=false){
  ctx.save();ctx.translate(x,y);ctx.scale(face*scale,scale);
  ellipse(0,0,27,4,'#081a2080');ctx.globalAlpha=visible?1:.16;
  line([[-8,-19],[-12,-3],[-21,-2]],'#162c2c',10);line([[9,-19],[15,-3],[23,-2]],'#1e3933',10);
  shape([[-18,-44],[17,-44],[22,-21],[10,-14],[0,-21],[-12,-15],[-21,-24]],'#183933');
  line([[-17,-40],[-28,-27],[-32,-16]],'#254c42',8);
  line([[16,-40],[attacking?31:26,-30],[attacking?46:29,-19]],'#315f4b',9);
  for(let i=0;i<3;i++)line([[attacking?43:27,-21+i*3],[attacking?53:37,-18+i*3]],'#b6eaca',2);
  shape([[-18,-48],[-25,-66],[-9,-57],[9,-57],[25,-66],[18,-48],[12,-37],[-12,-37]],'#142e2e');
  line([[-11,-40],[0,-35],[11,-40]],'#5da78a',2);
  ctx.globalAlpha=1;
  shape([[-14,-49],[-3,-46],[-5,-43],[-14,-45]],'#94ffac');shape([[14,-49],[3,-46],[5,-43],[14,-45]],'#94ffac');
  if(!visible){ellipse(-9,-46,11,5,'#73ff9820');ellipse(9,-46,11,5,'#73ff9820');}
  ctx.restore();
}
function enemy(e){const x=e.x-camera;if(x<-80||x>canvas.width+80||e.dead)return;
  if(e.kind==='stealth'){drawStealthMonster(x+20,e.y+e.h,1,e.dir,revealTimer>0||Math.sin(time*2+e.origin)>.9);return;}
  if(e.kind==='zombie'){drawZombie(x+20,e.y+e.h,1,e.dir);return;}
  if(e.kind==='ghost'){
    ctx.save();ctx.globalAlpha=.8;ellipse(x+20,e.y+21,20,22,'#d4e4ed');shape([[x,e.y+20],[x,e.y+48],[x+10,e.y+40],[x+20,e.y+48],[x+30,e.y+40],[x+40,e.y+48],[x+40,e.y+20]],'#d4e4ed');
    ellipse(x+12,e.y+17,4,7,'#464862');ellipse(x+28,e.y+17,4,7,'#464862');ellipse(x+20,e.y+32,5,6,'#656480');ellipse(x-3,e.y+25,8,5,'#d4e4ed',-.6);ellipse(x+43,e.y+25,8,5,'#d4e4ed',.6);ctx.restore();return;
  }
  const y=e.y+Math.sin(time*7)*1.5;ellipse(x+24,y+30,27,5,'#0003');
  for(let j=0;j<3;j++){line([[x+10+j*13,y+19],[x+5+j*13,y+31]],'#b58d55',3);}
  ellipse(x+24,y+17,24,14,'#a57c45');ellipse(x+24,y+11,19,12,'#c29c58');line([[x+10,y+12],[x+36,y+12]],'#e4c681',2);
  ellipse(x+(e.dir>0?42:6),y+15,8,9,'#d1ad6b');ellipse(x+(e.dir>0?45:3),y+12,2,2,'#172922');
}
function temple(){const x=5460-camera;if(x>canvas.width+200)return;
  if(levelNumber===4){
    ctx.fillStyle='#497669';ctx.fillRect(x-24,ground-12,204,12);
    for(const d of [-6,138]){ctx.fillStyle='#668b73';ctx.fillRect(x+d,ground-192,25,180);line([[x+d+12,ground-180],[x+d+12,ground-25]],'#b0d4a0',3);}
    shape([[x-28,ground-185],[x+75,ground-243],[x+187,ground-185]],'#70957b');
    ellipse(x+77,ground-96,60,88,'#58f88322');ellipse(x+77,ground-96,45,72,'#1a6c5455');
    shape([[x+76,ground-224],[x+88,ground-209],[x+76,ground-194],[x+64,ground-209]],'#99ffab');
    for(let i=0;i<5;i++)ellipse(x+40+i*18,ground-105+Math.sin(time*2+i)*30,2,2,'#b7ffca');
    return;
  }
  if(levelNumber===3){
    ctx.fillStyle='#6e7480';ctx.fillRect(x-25,ground-165,185,165);shape([[x-45,ground-165],[x+68,ground-220],[x+180,ground-165]],'#858691');
    ctx.fillStyle='#282b3a';ctx.fillRect(x+40,ground-118,60,118);ellipse(x+70,ground-118,30,30,'#282b3a');
    for(const d of [-8,130]){ctx.fillStyle='#a0a0a7';ctx.fillRect(x+d,ground-155,16,155);}
    line([[x+70,ground-200],[x+70,ground-173]],'#333845',4);line([[x+58,ground-189],[x+82,ground-189]],'#333845',4);
    return;
  }
  if(levelNumber===2){
    ctx.fillStyle='#8d7758';ctx.fillRect(x-35,ground-12,230,12);
    ctx.fillStyle='#62494a';ctx.fillRect(x-10,ground-175,190,165);
    ctx.fillStyle='#bf9a6d';ctx.fillRect(x+8,ground-160,153,130);
    ctx.fillStyle='#322a35';ctx.fillRect(x+47,ground-112,65,100);
    for(const d of [8,142]){ctx.fillStyle='#bf624c';ctx.fillRect(x+d,ground-172,18,160);}
    shape([[x-45,ground-169],[x+12,ground-208],[x+80,ground-231],[x+155,ground-208],[x+215,ground-169]],'#3f3748');
    line([[x-45,ground-169],[x+80,ground-195],[x+215,ground-169]],'#ae665c',7);
    ctx.fillStyle='#ead5a3';ctx.fillRect(x+34,ground-163,89,28);ctx.fillStyle='#4d3b3a';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('DOJO',x+79,ground-144);
    for(const d of [0,162]){line([[x+d,ground-170],[x+d,ground-125]],'#493a38',2);ellipse(x+d,ground-118,10,14,'#df9862');}
    return;
  }
  for(let i=0;i<4;i++){ctx.fillStyle=['#617c54','#70885a','#7d9565','#8ca16e'][i];ctx.fillRect(x-35+i*15,ground-32-i*24,220-i*30,32);}
  ctx.fillStyle='#5a7956';ctx.fillRect(x,ground-230,150,155);ctx.fillStyle='#708a5c';ctx.fillRect(x-14,ground-245,178,25);
  shape([[x-28,ground-245],[x+75,ground-302],[x+180,ground-245]],'#81976a');ctx.fillStyle='#1a3c31';ctx.fillRect(x+47,ground-182,56,105);
  const glow=ctx.createRadialGradient(x+75,ground-130,3,x+75,ground-130,70);glow.addColorStop(0,'#e9e49978');glow.addColorStop(1,'#e9e49900');ctx.fillStyle=glow;ctx.fillRect(x+5,ground-210,140,150);
  for(const offset of [12,116]){ctx.fillStyle='#91a173';ctx.fillRect(x+offset,ground-219,22,143);line([[x+offset+10,ground-210],[x+offset+10,ground-95]],'#526e4c',3);}
  shape([[x+75,ground-277],[x+89,ground-263],[x+75,ground-249],[x+61,ground-263]],'#e4d48b');fern(x+12,ground-242,26,'#63994c');
}
function drawTurtleBoss(){
  ctx.save();ctx.translate(boss.x-camera,boss.y);ctx.scale(boss.face,1);
  const kicking=boss.phase==='kick',ready=boss.phase==='kickReady',stunned=boss.phase==='stunned';
  if(boss.phase==='defeated'){ctx.globalAlpha=.55;ctx.rotate(.3);}
  ellipse(0,0,57,8,'#00000040');
  ellipse(-14,-81,40,52,'#263e2e');ellipse(-24,-82,30,43,'#3c6541');
  line([[-37,-99],[-16,-78],[-36,-59]],'#89a165',3);
  line([[-10,-49],[-20,-21],[-32,-5]],'#548553',18);
  line([[12,-48],[kicking?50:ready?28:20,kicking?-62:-25],[kicking?103:ready?32:34,kicking?-61:-5]],'#659657',20);
  line([[kicking?96:28,kicking?-61:-5],[kicking?113:43,kicking?-61:-5]],'#bddb82',12);
  ellipse(4,-87,31,40,'#759453');ellipse(8,-88,25,33,'#d1bf74');
  for(let i=0;i<3;i++)line([[-12,-107+i*19],[26,-107+i*19]],'#9f9558',2);
  line([[-21,-62],[31,-62]],'#e2dcb7',8);shape([[10,-65],[17,-55],[25,-65]],'#f4e4bb');line([[17,-55],[23,-37]],'#e2dcb7',5);
  line([[-17,-111],[-36,-90],[-30,-66]],'#56844d',17);
  line([[22,-111],[ready?44:40,ready?-123:-95],[ready?54:50,ready?-142:-111]],'#6b9958',17);
  ellipse(ready?54:50,ready?-142:-111,12,12,'#b7d580');
  ellipse(6,-142,31,28,'#71a75c');ellipse(22,-132,21,16,'#91ba6c');
  line([[-18,-150],[33,-150]],'#d77157',12);shape([[-19,-152],[-48,-160],[-31,-143]],'#d77157');
  ellipse(21,-151,5,3,'#f5ebc4');ellipse(22,-151,2,2,'#243d2a');
  line([[20,-129],[35,-132]],'#375c35',2);
  if(stunned){ctx.fillStyle='#ffe495';ctx.font='bold 20px sans-serif';ctx.textAlign='center';for(let i=0;i<3;i++){const a=time*3+i*Math.PI*2/3;ctx.fillText('✧',Math.cos(a)*38,-177+Math.sin(a)*10);}}
  ctx.restore();
}
function drawBoss(){
  if(!boss)return;
  if(boss.kind==='stealth'){drawStealthMonster(boss.x-camera,boss.y,3,boss.face,boss.phase!=='vanish'||revealTimer>0,boss.phase==='ambush'||boss.phase==='ambushReady');return;}
  if(boss.kind==='zombie'){drawZombie(boss.x-camera,boss.y,3.2,boss.face,boss.phase);return;}
  if(boss.kind==='turtle'){drawTurtleBoss();return;}
  const perch=5590-camera,x=boss.x-camera,y=boss.y;
  line([[perch+65,ground],[perch+53,ground-400]],'#4b4934',24);
  line([[perch+56,ground-330],[perch-55,ground-305]],'#5b583b',18);
  fern(perch+51,ground-390,70,'#315c36');
  if(['aim','leap','windup'].includes(boss.phase)){
    const target=boss.target-camera;
    ellipse(target,ground-2,47+Math.sin(time*12)*4,9,'#ed9a654d');
    line([[target-22,ground-18],[target+22,ground-18]],'#ffcf81',3);
    ctx.fillStyle='#ffe3a0';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText('!',target,ground-30);
  }
  ctx.save();ctx.translate(x,y);
  if(boss.phase==='defeated'){ctx.globalAlpha=.55;ctx.rotate(.18);}
  const side=boss.target===undefined||boss.target<boss.x?-1:1;
  const climbing=boss.phase==='climb',swing=climbing?Math.sin(boss.timer*13)*15:0;
  ellipse(0,0,80,10,'#00000040');
  line([[-33,-54],[-42,-13],[-60,-5]],'#3c302e',28);
  line([[33,-54],[42,-13],[60,-5]],'#493833',28);
  ellipse(0,-104,70,69,'#4c3a32');ellipse(0,-92,44,48,'#80634c');
  for(let i=0;i<3;i++)line([[-25,-112+i*14],[25,-112+i*14]],'#97785b',3);
  const shoulder=side*52;
  line([[-shoulder,-142],[-side*81,-95],[-side*83,-35-swing]],'#49372f',34);
  ellipse(-side*83,-35-swing,22,25,'#705340');
  let handX=side*88,handY=-30;
  if(climbing){handX=side*58;handY=-205+swing;}
  if(boss.phase==='aim'||boss.phase==='windup'){handX=side*60;handY=-205;}
  if(boss.phase==='stuck'||boss.phase==='recover'){handX=boss.target-boss.x;handY=-12;}
  line([[shoulder,-142],[shoulder+(handX-shoulder)*.5,-80+(handY+30)*.6],[handX,handY]],'#594034',36);
  ellipse(handX,handY,31,26,boss.phase==='stuck'?'#a98858':'#775641');
  for(let i=0;i<3;i++)line([[handX-15+i*12,handY-8],[handX-15+i*12,handY+8]],'#b29470',3);
  ellipse(-43,-168,13,16,'#705340');ellipse(43,-168,13,16,'#705340');
  ellipse(0,-168,45,46,'#4e3930');ellipse(0,-158,30,32,'#ac8865');
  ellipse(-15,-181,14,9,'#2e2825');ellipse(15,-181,14,9,'#2e2825');
  ellipse(-14,-179,4,3,'#f6c770');ellipse(14,-179,4,3,'#f6c770');
  ellipse(0,-163,14,9,'#352a27');ellipse(-5,-163,3,3,'#151b17');ellipse(5,-163,3,3,'#151b17');
  line([[-18,-142],[0,-138],[18,-142]],'#362b26',4);
  shape([[-15,-143],[-9,-132],[-5,-142]],'#f1d7ac');shape([[15,-143],[9,-132],[5,-142]],'#f1d7ac');
  if(boss.phase==='stuck'){ctx.fillStyle='#ebf1b6';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('X',handX,handY-40);}
  ctx.restore();
  if(boss.phase==='stuck')line([[boss.target-camera-27,ground+3],[boss.target-camera-12,ground+10],[boss.target-camera+7,ground+3],[boss.target-camera+30,ground+8]],'#151f18',3);
}
function render(){
  background();temple();for(const p of platforms)platform(p);
  for(const c of coins){if(c.taken)continue;const x=c.x-camera;if(x< -25||x>canvas.width+25)continue;const y=c.y+Math.sin(time*3+c.x)*4;
    const glow=ctx.createRadialGradient(x,y,1,x,y,22);glow.addColorStop(0,levelNumber===4?'#69ff8b60':'#ffda7740');glow.addColorStop(1,'#ffda7700');ctx.fillStyle=glow;ctx.fillRect(x-22,y-22,44,44);
    shape([[x,y-12],[x+9,y],[x,y+12],[x-9,y]],levelNumber===4?'#65e980':'#f0ce76');shape([[x,y-12],[x,y+12],[x-9,y]],levelNumber===4?'#b2ffc0':'#ffe7a4');line([[x,y-7],[x+4,y]],levelNumber===4?'#e1ffe7':'#fff2bf',1);
  }
  for(const e of enemies)enemy(e);drawBoss();panther();
  for(const p of particles){ctx.globalAlpha=p.life/.65;ellipse(p.x-camera,p.y,3,3,p.color);}ctx.globalAlpha=1;
  // Foreground leaves frame the world without blocking the jumping path.
  for(let i=-1;i<canvas.width/330+1;i++){const x=i*330-camera*.7%330;fern(x,654,62,'#102f25');leaf(x+100,660,75,'#163b29',.9);}
  for(let i=0;i<canvas.width/220+1;i++){const x=i*220-camera*.5%220;leaf(x,-5,95,'#12382b',2.5);leaf(x+20,-5,72,'#18432e',-2.6);}
  const vignette=ctx.createLinearGradient(0,0,0,640);vignette.addColorStop(0,'#061e2240');vignette.addColorStop(.3,'#061e2200');vignette.addColorStop(.8,'#061e2200');vignette.addColorStop(1,'#061e2250');ctx.fillStyle=vignette;ctx.fillRect(0,0,canvas.width,640);
}
function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.round(640*r.width/r.height);canvas.height=640;}
window.addEventListener('resize',resize);resize();reset();
function frame(now){const dt=Math.max(0,Math.min((now-last)/1000||0,.025));last=now;time+=dt;update(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
