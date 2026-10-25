/* Local preferences and synthesized audio: no music downloads or game-rule changes. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),key='upc.ui.audio';
  let preferences={sfx:true,music:true};
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved){for(const name of ['sfx','music'])if(typeof saved[name]==='boolean')preferences[name]=saved[name];}}catch(_){}
  const dialog=document.createElement('dialog');dialog.id='settingsDialog';dialog.className='dialog';dialog.setAttribute('aria-labelledby','settingsTitle');
  dialog.innerHTML='<div class="dialog-title"><h2 id="settingsTitle">Settings</h2><button type="button" class="icon-button" id="settingsClose" aria-label="Close settings">×</button></div><div class="dialog-body"><div class="settings-tools" aria-label="Game controls"></div><div class="settings-audio"><label class="settings-option" for="sfxEnabled"><span><strong>Sound effects</strong><small>Soft feedback for button clicks and taps</small></span><input id="sfxEnabled" type="checkbox" role="switch"></label><label class="settings-option" for="musicEnabled"><span><strong>Background music</strong><small>Three evolving soundtracks, matched to the current phase</small></span><input id="musicEnabled" type="checkbox" role="switch"></label><p id="audioStatus">Audio starts after your first interaction and pauses when this tab is hidden.</p></div></div>';
  document.body.append(dialog);
  const labels={helpButton:'How to play',themeButton:'Appearance',installButton:'Install app',saveButton:'Save & backup'};
  for(const [id,label] of Object.entries(labels)){
    const row=document.createElement('div');row.className='settings-tool';
    const button=$(id);const caption=document.createElement('span');caption.textContent=label;
    row.append(button,caption);dialog.querySelector('.settings-tools').append(row);
  }
  const open=document.createElement('button');open.id='settingsButton';open.type='button';open.className='toolbar-button';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-controls',dialog.id);
  open.innerHTML='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg><span>Settings</span>';
  document.querySelector('.top-actions').append(open);
  open.addEventListener('click',()=>dialog.showModal());$('settingsClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  // Close this modal before an existing control opens its own dialog.
  dialog.addEventListener('click',event=>{if(event.target.closest('#helpButton,#installButton,#saveButton'))dialog.close();},true);
  let context=null,ambient=null,unlocked=false,lastClick=0;
  let nextBeat=0,beat=0,musicTimer=null,currentScore=null;
  const voices=new Set();
  function createAudio(){
    if(context)return context;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){$('audioStatus').textContent='Audio is not supported by this browser.';return null;}
    context=new Audio();ambient=context.createGain();ambient.gain.value=0;ambient.connect(context.destination);
    // A short, filtered echo adds space without noise or a continuous drone.
    const echo=context.createDelay(1),echoLevel=context.createGain(),echoFilter=context.createBiquadFilter();
    echo.delayTime.value=.375;echoLevel.gain.value=.16;echoFilter.type='lowpass';echoFilter.frequency.value=1100;
    ambient.connect(echo);echo.connect(echoFilter);echoFilter.connect(echoLevel);echoLevel.connect(context.destination);
    musicTimer=setInterval(scheduleMusic,100);
    return context;
  }
  // Each phase has its own harmony, motif, instrumentation and pulse.
  const scores={
    business:{title:'First Wire',bpm:64,division:1,steps:8,level:1,
      chords:[[45,52,60,64],[41,48,57,60],[48,55,59,64],[43,50,57,62]],
      melody:[[76,null,72,71,null,69,null,64],[72,null,69,null,67,null,64,null],[71,null,67,64,null,67,null,72],[74,null,71,null,69,null,67,null]]},
    production:{title:'Assembly Lines',bpm:88,division:2,steps:16,level:.82,
      chords:[[38,50,57,60],[34,46,53,57],[41,53,57,60],[36,48,55,60]],
      melody:[[74,null,69,72,77,null,72,69,74,null,77,76,72,null,69,null],[70,null,65,69,74,null,69,65,70,null,74,72,69,null,65,null],[72,null,69,65,77,null,72,69,76,null,72,69,65,null,69,null],[72,null,67,64,74,null,72,67,76,null,74,72,67,null,64,null]]},
    space:{title:'Beyond the Horizon',bpm:116,division:2,steps:16,level:.72,
      chords:[[40,52,59,66],[36,48,55,62],[43,55,62,69],[38,50,57,64]],
      melody:[[76,71,78,79,null,78,74,71,76,78,83,79,78,null,74,71],[76,72,79,83,null,79,78,74,76,79,84,83,79,null,78,74],[79,74,81,83,null,81,78,74,79,81,86,83,81,null,78,74],[78,74,81,78,null,76,74,69,78,81,83,81,78,76,74,null]]}
  };
  const phase=()=>window.spaceFlag===1?'space':window.humanFlag===1?'business':'production';
  function showScore(){const score=scores[phase()];$('musicEnabled').closest('label').querySelector('small').textContent=score.title+' · '+score.bpm+' BPM · '+(phase()==='space'?'Space':phase()==='production'?'Production':'Business');}
  showScore();setInterval(showScore,500);
  function fadeVoices(){
    const now=context.currentTime;
    for(const voice of voices){
      voice.envelope.gain.cancelAndHoldAtTime(now);
      voice.envelope.gain.setTargetAtTime(0,now,.14);
      for(const tone of voice.oscillators){try{tone.stop(now+.7);}catch(_){}}
    }
  }
  const frequency=midi=>440*Math.pow(2,(midi-69)/12);
  function note(midi,when,length,level,pad=false){
    const envelope=context.createGain(),filter=context.createBiquadFilter();
    filter.type='lowpass';filter.frequency.value=pad?700:1800;filter.Q.value=.3;
    envelope.gain.setValueAtTime(0,when);
    envelope.gain.linearRampToValueAtTime(level,when+(pad ? .55 : .018));
    envelope.gain.exponentialRampToValueAtTime(.0001,when+length);
    filter.connect(envelope);envelope.connect(ambient);
    const oscillators=[1,2,3].map((harmonic,i)=>{
      const tone=context.createOscillator(),gain=context.createGain();tone.type='sine';tone.frequency.value=frequency(midi)*harmonic;
      gain.gain.value=[1,.18,.045][i];tone.connect(gain);gain.connect(filter);tone.start(when);tone.stop(when+length+.05);
      tone.onended=()=>{tone.disconnect();gain.disconnect();};return tone;
    });
    const voice={oscillators,envelope,filter};voices.add(voice);
    oscillators[0].addEventListener('ended',()=>{voices.delete(voice);envelope.disconnect();filter.disconnect();});
  }
  function scheduleMusic(){
    if(!context||context.state!=='running'||!preferences.music||document.hidden)return;
    const selected=phase(),score=scores[selected];
    if(selected!==currentScore){fadeVoices();currentScore=selected;beat=0;nextBeat=context.currentTime+.15;}
    if(nextBeat<context.currentTime)nextBeat=context.currentTime+.08;
    const tick=60/score.bpm/score.division;
    while(nextBeat<context.currentTime+.25){
      const bar=Math.floor(beat/score.steps)%score.chords.length,step=beat%score.steps,chord=score.chords[bar];
      if(step===0){
        note(chord[0],nextBeat,selected==='business'?3.4:1.8,.065*score.level,true);
        chord.slice(1).forEach((pitch,i)=>note(pitch,nextBeat+i*.035,selected==='business'?4.5:2.8,.033*score.level,true));
      }
      const pitch=score.melody[bar][step];
      if(pitch!==null)note(pitch,nextBeat,selected==='business'?2.2:selected==='production'?1.15:.85,(step%4===0 ? .10 : .075)*score.level);
      // Rounded low pulses, no noisy hi-hats: energy grows without a high-frequency hiss.
      if(selected!=='business'&&step%4===0)note(chord[0],nextBeat,.26,.085*score.level);
      if(selected==='space'&&step%4===2)note(chord[1],nextBeat,.18,.045*score.level);
      nextBeat+=tick;beat++;
    }
  }
  function applyMusic(){
    if(!context)return;
    const playing=preferences.music&&!document.hidden;
    ambient.gain.setTargetAtTime(playing ? .6 : 0,context.currentTime,.12);
    if(!playing){
      for(const voice of voices){for(const tone of voice.oscillators){try{tone.stop(context.currentTime+.08);}catch(_){}}}
      nextBeat=0;beat=0;
    }else scheduleMusic();
  }
  async function activate(){
    if(!preferences.music&&!preferences.sfx)return;
    try{const audio=createAudio();if(!audio)return;unlocked=true;if(!document.hidden&&audio.state==='suspended')await audio.resume();applyMusic();}catch(_){$('audioStatus').textContent='Audio could not start. Try enabling it again.';}
  }
  function clickSound(){
    if(!preferences.sfx||!context||context.state!=='running'||document.hidden)return;
    const now=context.currentTime;if(now-lastClick<.025)return;lastClick=now;
    const tone=context.createOscillator(),gain=context.createGain();tone.type='sine';tone.frequency.setValueAtTime(850,now);tone.frequency.exponentialRampToValueAtTime(430,now+.055);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.055,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+.065);tone.connect(gain);gain.connect(context.destination);tone.start(now);tone.stop(now+.075);tone.onended=()=>{tone.disconnect();gain.disconnect();};
  }
  document.addEventListener('pointerdown',event=>{if(event.isTrusted)void activate();},{capture:true,passive:true});
  document.addEventListener('keydown',event=>{if(event.isTrusted&&(event.key==='Enter'||event.key===' '))void activate();},true);
  document.addEventListener('click',event=>{const button=event.target.closest('button');if(event.isTrusted&&button&&!button.disabled)clickSound();},true);
  for(const name of ['sfx','music']){
    const input=$(name+'Enabled');input.checked=preferences[name];
    input.addEventListener('change',()=>{preferences[name]=input.checked;try{localStorage.setItem(key,JSON.stringify(preferences));}catch(_){}applyMusic();void activate();});
  }
  document.addEventListener('visibilitychange',()=>{if(!context)return;if(document.hidden){applyMusic();ambient.gain.cancelScheduledValues(context.currentTime);ambient.gain.value=0;void context.suspend().catch(()=>{});}else if(unlocked)void activate();});
})();
