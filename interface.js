/* Read-only UI state and navigation. All actions still use the original engine. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const write = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const mobile = matchMedia('(max-width:760px)');
  // Both engine-owned stat groups share one desktop row, including unlocked resources.
  const metrics=document.createElement('div');metrics.className='hero-metrics';
  const primaryStats=document.querySelector('.hero>.hero-stats');
  primaryStats.before(metrics);metrics.append(primaryStats,$('heroResourceStats'));
  window.battleLEFTCOLOR='#d5f8e7';window.battleRIGHTCOLOR='#ffb3a4';window.battleEXPLODECOLOR='#9fe9dd';
  const groups = [
    {id:'production', label:'Production', icon:'factory', panels:['businessDiv','manufacturingDiv','creationDiv','wireProductionDiv','powerDiv']},
    {id:'research', label:'Research', icon:'cpu', panels:['compDiv','projectsDiv']},
    {id:'strategy', label:'Strategy', icon:'grid', panels:['investmentEngine','strategyEngine']},
    {id:'space', label:'Space', icon:'target', panels:['spaceDiv','probeDesignDiv','battleCanvasDiv']}
  ];
  // Keep dependent systems together in desktop columns without recreating engine nodes.
  const columns = [$('leftColumn'), $('middleColumn'), $('rightColumn')];
  for (const [index, ids] of [[0,groups[0].panels],[1,groups[1].panels],[2,[...groups[2].panels,...groups[3].panels]]]) {
    for (const id of ids) if ($(id)) columns[index].append($(id));
  }
  let active = 'production';
  const nav = document.createElement('nav');nav.className='mobile-nav';nav.setAttribute('aria-label','Game sections');
  for (const group of groups) {
    for(const id of group.panels) if($(id)) $(id).dataset.section=group.id;
    const button=document.createElement('button');button.type='button';button.innerHTML='<svg class="icon" aria-hidden="true"><use href="#i-'+group.icon+'"></use></svg><span>'+group.label+'</span><span class="nav-badge" hidden></span>';
    if(group.id==='research')button.insertAdjacentHTML('beforeend','<span class="nav-badge nav-points" hidden></span>');
    if(group.id==='production')button.querySelector('.nav-badge').classList.add('nav-stopped');
    button.addEventListener('click',()=>{active=group.id;renderNavigation();$('resources').scrollIntoView({behavior:'instant',block:'start'});});
    group.button=button;nav.append(button);
  }
  document.body.append(nav);
  const unlocked = id => $(id) && $(id).style.display !== 'none';
  function renderNavigation(){
    const available=groups.filter(g=>g.panels.some(unlocked));
    if(!available.some(g=>g.id===active)) active=available[0]?.id||'production';
    const points=unlocked('compDiv')?Math.max(0,Math.floor(window.humanFlag===1?Number(window.trust)-Number(window.processors)-Number(window.memory):Number(window.swarmGifts))):0;
    const stopped=Number(window.clipRate)<=0||(window.humanFlag===1&&Number(window.wire)<1);
    const notices={production:stopped?'!':'',research:unlocked('projectsDiv')?String(document.querySelectorAll('#projectListTop button:not(:disabled)').length||''):'',strategy:unlocked('strategyEngine')&&!$('btnNewTournament').disabled?'1':'',space:unlocked('probeDesignDiv')&&window.probeTrust>window.probeUsedTrust?'!':''};
    for(const group of groups){
      group.button.hidden=!available.includes(group);group.button.setAttribute('aria-pressed',String(active===group.id));
      const badge=group.button.querySelector('.nav-badge'),notice=notices[group.id];badge.hidden=!notice;write(badge,notice);
      group.button.setAttribute('aria-label',group.label+(notice?' · '+(notice==='!'?'Needs attention':notice+' available actions'):''));
      if(group.id==='production'){badge.title='Production stopped';group.button.setAttribute('aria-label','Production'+(stopped?' · Production stopped':''));}
      if(group.id==='research'){
        const pointBadge=group.button.querySelector('.nav-points');pointBadge.hidden=!points;write(pointBadge,String(points));pointBadge.title=points+' points available';badge.title=(notice||0)+' research projects ready';
        group.button.setAttribute('aria-label','Research · '+points+' points available · '+(notice||0)+' research projects ready');
      }
      for(const id of group.panels)if($(id))$(id).dataset.mobileHidden=String(mobile.matches&&active!==group.id);
    }
  }
  mobile.addEventListener('change',renderNavigation);
  let abbreviated=false;
  const toggle=$('clipCountToggle');
  function renderCount(){
    const full=$('clips').textContent.trim(),n=Number(full.replace(/,/g,''));
    let value=full;
    if(abbreviated&&Number.isFinite(n))value=n>=1e15?n.toExponential(3):new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n);
    write(toggle,value);toggle.setAttribute('aria-pressed',String(abbreviated));toggle.setAttribute('aria-label',value+' paperclips. Show '+(abbreviated?'full':'abbreviated')+' count.');
  }
  toggle.addEventListener('click',()=>{abbreviated=!abbreviated;renderCount();});
  new MutationObserver(renderCount).observe($('clips'),{childList:true,characterData:true,subtree:true});renderCount();
  const strategy=$('strategyEngine').querySelector('.panel-body');
  const resultBox=document.createElement('div');resultBox.className='strategy-result';resultBox.setAttribute('role','status');resultBox.setAttribute('aria-live','polite');resultBox.textContent='No tournament results yet.';
  strategy.querySelector('.instrument-note').replaceWith(resultBox);
  let lastReward=null;
  const declareWinner=window.declareWinner;
  window.declareWinner=function(...args){
    const before=window.yomi,messages=[],displayMessage=window.displayMessage;
    window.displayMessage=function(message,...rest){messages.push(String(message));return displayMessage.call(this,message,...rest);};
    let result;
    try{result=declareWinner.apply(this,args);}finally{window.displayMessage=displayMessage;}
    lastReward=window.yomi-before;
    const selected=window.strats[Number(window.pick)];
    const summary=messages.length?messages.join(' '):selected?selected.name+' scored '+selected.currentScore+'.':'Tournament complete.';
    write(resultBox,summary+' Total reward: +'+lastReward.toLocaleString('en-US')+' Yomi.');
    return result;
  };
  document.querySelector('.exploration-instrument').insertAdjacentHTML('afterend','<p class="space-brief">Expand your reach. Speed explores faster; Exploration opens access to matter. Balance replication and hazard protection to keep your fleet growing.</p>');
  $('battleCanvasDiv').querySelector('.panel-header').insertAdjacentHTML('afterend','<div class="combat-brief"><span>TACTICAL FEED</span><strong id="combatReadiness"></strong></div>');
  function render(){
    renderNavigation();
    const momentum=$('droneMomentum');
    momentum.hidden=Number(window.humanFlag)!==0||Number(window.spaceFlag)===1||Number(window.momentum)!==1;
    if(!momentum.hidden){
      const performance=Math.max(0,Number(window.powMod)||0)*100;
      write($('droneMomentumValue'),performance.toLocaleString('en-US',{maximumFractionDigits:1})+'%');
      write($('droneMomentumNote'),performance>=100?'+'+(performance-100).toLocaleString('en-US',{maximumFractionDigits:1})+'% speed · grows while fully powered':'Power limited · restore energy to build momentum');
    }
    write($('prestigeUcounter'),String((Number(window.prestigeU)||0)+1));
    write($('prestigeScounter'),String((Number(window.prestigeS)||0)+1));
    const running=window.tourneyInProg===1&&$('btnRunTournament').disabled;
    const prepared=window.tourneyInProg===1&&!running;
    const complete=window.resultsFlag===1;
    $('tournamentStuff').hidden=!running&&!prepared&&!complete;
    $('tournamentLabel').hidden=!running&&!prepared&&!complete;
    write($('combatReadiness'),'Combat power '+(Number(window.probeCombat)||0));
  }
  $('wireProductionDiv').querySelector('.panel-body').insertAdjacentHTML('afterbegin','<div class="instrument" id="droneMomentum" hidden><div class="instrument-kicker">Momentum · drone & factory speed</div><div class="instrument-value" id="droneMomentumValue">100%</div><div class="instrument-note" id="droneMomentumNote"></div></div>');
  render();setInterval(render,250);
})();
