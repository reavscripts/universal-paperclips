/* Local preferences and synthesized audio: no music downloads or game-rule changes. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),key='upc.ui.audio';
  let preferences={sfx:true,music:true};
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved){for(const name of ['sfx','music'])if(typeof saved[name]==='boolean')preferences[name]=saved[name];}}catch(_){}
  const dialog=document.createElement('dialog');dialog.id='settingsDialog';dialog.className='dialog';dialog.setAttribute('aria-labelledby','settingsTitle');
  dialog.innerHTML='<div class="dialog-title"><h2 id="settingsTitle">Settings</h2><button type="button" class="icon-button" id="settingsClose" aria-label="Close settings">×</button></div><div class="dialog-body"><div class="settings-tools" aria-label="Game controls"></div><div class="settings-audio"><label class="settings-option" for="sfxEnabled"><span><strong>Sound effects</strong><small>Soft feedback for button clicks and taps</small></span><input id="sfxEnabled" type="checkbox" role="switch"></label><label class="settings-option" for="musicEnabled"><span><strong>Background music</strong><small>Slow piano-like notes and warm, changing chords</small></span><input id="musicEnabled" type="checkbox" role="switch"></label><p id="audioStatus">Audio starts after your first interaction and pauses when this tab is hidden.</p></div></div>';
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
  let nextBeat=0,beat=0,musicTimer=null;
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
  // Eight measures in A minor: a repeating musical phrase with space between notes.
  const chords=[[45,52,60,64],[41,48,57,60],[48,55,59,64],[43,50,57,62],[45,52,59,64],[41,48,55,60],[48,55,62,64],[43,50,59,62]];
  const melody=[[76,null,72,71,null,69,null,64],[72,null,69,null,67,null,64,null],[71,null,67,64,null,67,null,72],[74,null,71,null,69,null,67,null],[76,null,79,76,null,72,null,71],[72,null,69,null,67,64,null,null],[71,null,74,76,null,72,null,67],[74,null,71,null,67,null,null,null]];
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
    if(nextBeat<context.currentTime)nextBeat=context.currentTime+.08;
    while(nextBeat<context.currentTime+.25){
      const bar=Math.floor(beat/8)%chords.length,step=beat%8;
      if(step===0){
        note(chords[bar][0],nextBeat,3.4,.065,true);
        chords[bar].slice(1).forEach((pitch,i)=>note(pitch,nextBeat+i*.07,4.5,.033,true));
      }
      const pitch=melody[bar][step];
      if(pitch!==null)note(pitch,nextBeat,2.2,step%2===0 ? .10 : .075);
      nextBeat+=.9375;beat++; // 64 BPM, a full phrase lasts one minute.
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
