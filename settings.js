/* Local preferences and synthesized audio: no music downloads or game-rule changes. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),key='upc.ui.audio';
  let preferences={sfx:true,music:true};
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved){for(const name of ['sfx','music'])if(typeof saved[name]==='boolean')preferences[name]=saved[name];}}catch(_){}
  const dialog=document.createElement('dialog');dialog.id='settingsDialog';dialog.className='dialog';dialog.setAttribute('aria-labelledby','settingsTitle');
  dialog.innerHTML='<div class="dialog-title"><h2 id="settingsTitle">Settings</h2><button type="button" class="icon-button" id="settingsClose" aria-label="Close settings">×</button></div><div class="dialog-body"><div class="settings-tools" aria-label="Game controls"></div><div class="settings-audio"><label class="settings-option" for="sfxEnabled"><span><strong>Sound effects</strong><small>Soft feedback for button clicks and taps</small></span><input id="sfxEnabled" type="checkbox" role="switch"></label><label class="settings-option" for="musicEnabled"><span><strong>Background music</strong><small>Quiet, evolving electronic ambience</small></span><input id="musicEnabled" type="checkbox" role="switch"></label><p id="audioStatus">Audio starts after your first interaction and pauses when this tab is hidden.</p></div></div>';
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
  function createAudio(){
    if(context)return context;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){$('audioStatus').textContent='Audio is not supported by this browser.';return null;}
    context=new Audio();ambient=context.createGain();ambient.gain.value=0;ambient.connect(context.destination);
    // Low, consonant tones with slow independent envelopes; no sharp loop boundary.
    for(const [i,frequency] of [55,82.4069,110,164.8138].entries()){
      const tone=context.createOscillator(),volume=context.createGain();tone.type='sine';tone.frequency.value=frequency;tone.detune.value=i%2?3:-3;volume.gain.value=.018;
      const breath=context.createOscillator(),depth=context.createGain();breath.frequency.value=.025+i*.009;depth.gain.value=.009;breath.connect(depth);depth.connect(volume.gain);tone.connect(volume);volume.connect(ambient);tone.start();breath.start();
    }
    return context;
  }
  function applyMusic(){if(!context)return;ambient.gain.setTargetAtTime(preferences.music&&!document.hidden ? .55 : 0,context.currentTime,.4);}
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
  document.addEventListener('visibilitychange',()=>{if(!context)return;if(document.hidden){ambient.gain.cancelScheduledValues(context.currentTime);ambient.gain.value=0;void context.suspend().catch(()=>{});}else if(unlocked)void activate();});
})();
