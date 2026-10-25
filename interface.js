/* Read-only UI state and navigation. All actions still use the original engine. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const write = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const mobile = matchMedia('(max-width:760px)');
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
    button.addEventListener('click',()=>{active=group.id;renderNavigation();$('resources').scrollIntoView({behavior:'instant',block:'start'});});
    group.button=button;nav.append(button);
  }
  document.body.append(nav);
  const unlocked = id => $(id) && $(id).style.display !== 'none';
  function renderNavigation(){
    const available=groups.filter(g=>g.panels.some(unlocked));
    if(!available.some(g=>g.id===active)) active=available[0]?.id||'production';
    const notices={production:window.humanFlag===1&&window.wire<1?'!':window.humanFlag!==1&&window.powMod<1?'!':'',research:String(document.querySelectorAll('#projectListTop button:not(:disabled)').length||''),strategy:unlocked('strategyEngine')&&!$('btnNewTournament').disabled?'1':'',space:unlocked('probeDesignDiv')&&window.probeTrust>window.probeUsedTrust?'!':''};
    for(const group of groups){
      group.button.hidden=!available.includes(group);group.button.setAttribute('aria-pressed',String(active===group.id));
      const badge=group.button.querySelector('.nav-badge'),notice=notices[group.id];badge.hidden=!notice;write(badge,notice);
      group.button.setAttribute('aria-label',group.label+(notice?' · '+(notice==='!'?'Needs attention':notice+' available actions'):''));
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
  strategy.insertAdjacentHTML('afterbegin','<p class="strategy-guide"><strong>Turn operations into Yomi.</strong> Create a tournament, choose a strategy, then run it. Your strategy’s score and the opponents it beats determine the reward.</p>');
  $('tournamentLabel').insertAdjacentHTML('beforebegin','<div class="strategy-progress"><strong id="strategyState"></strong><progress id="strategyProgress" max="100" value="0" aria-label="Tournament progress"></progress><p id="strategyDetail"></p></div>');
  $('tournamentStuff').insertAdjacentHTML('afterend','<details class="strategy-help"><summary>How to read the match</summary><p>Rows are the first player’s moves; columns are the second player’s moves. Each cell shows their respective points: row player, column player. The highlighted cell is the move being played. Every pair of strategies plays ten moves; the final table ranks their total scores.</p><p>Yomi funds upgrades. New strategies are unlocked through Projects. Creating a tournament spends the operations shown below; running it completes the matches automatically.</p></details>');
  let lastReward=null;
  const declareWinner=window.declareWinner;
  window.declareWinner=function(...args){const before=window.yomi;const result=declareWinner.apply(this,args);lastReward=window.yomi-before;return result;};
  document.querySelector('.exploration-instrument').insertAdjacentHTML('afterend','<p class="space-brief">Expand your reach. Speed explores faster; Exploration opens access to matter. Balance replication and hazard protection to keep your fleet growing.</p>');
  $('battleCanvasDiv').querySelector('.panel-header').insertAdjacentHTML('afterend','<div class="combat-brief"><span>TACTICAL FEED</span><strong id="combatReadiness"></strong></div>');
  function render(){
    renderNavigation();
    write($('prestigeUcounter'),String((Number(window.prestigeU)||0)+1));
    write($('prestigeScounter'),String((Number(window.prestigeS)||0)+1));
    const running=window.tourneyInProg===1&&$('btnRunTournament').disabled;
    const prepared=window.tourneyInProg===1&&!running;
    const complete=window.resultsFlag===1;
    $('tournamentStuff').hidden=!running&&!prepared&&!complete;
    $('tournamentLabel').hidden=!running&&!prepared&&!complete;
    const round=Number(window.currentRound)||0,total=Number(window.rounds)||1;
    write($('strategyState'),running?'Tournament running':prepared?'Choose your strategy':complete?'Tournament complete':'Create a tournament');
    $('strategyProgress').value=running?Math.min(100,round/total*100):complete?100:0;
    const selected=$('stratPicker').selectedOptions[0]?.textContent||'No strategy';
    write($('strategyDetail'),running?'Match '+Math.min(round+1,total)+' of '+total+' · '+selected:prepared?'Select a strategy above, then press Run.':complete?(lastReward===null?'Review the scores below.': '+'+lastReward.toLocaleString('en-US')+' Yomi earned. Review the scores below.'):'Use New Tournament below · '+$('newTourneyCost').textContent+' operations required.');
    write($('combatReadiness'),'Combat power '+(Number(window.probeCombat)||0));
  }
  render();setInterval(render,250);
})();
