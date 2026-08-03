export const BATTLE3_RUNTIME = Object.freeze({
  id: 'battle-3', label: 'Battle 3.0',
  pipeline: 'authored-matte-roads-cathedral', lighting: 'permanent-clear-night'
});
let proofNode;
export function activateBattle3Runtime(state){
  document.body.dataset.battleRuntime=BATTLE3_RUNTIME.id;
  window.__BATTLE_RUNTIME__={...BATTLE3_RUNTIME,stage:state?.chapter?.number||null,startedAt:Date.now()};
  if(new URLSearchParams(location.search).get('battleProof')!=='1')return;
  if(!proofNode){proofNode=document.createElement('output');proofNode.id='battleRuntimeProof';proofNode.setAttribute('aria-live','polite');document.body.append(proofNode);}
  proofNode.textContent=`${BATTLE3_RUNTIME.label} · ${BATTLE3_RUNTIME.pipeline} · stage ${state?.chapter?.number||'—'}`;
}
export function deactivateBattle3Runtime(){delete document.body.dataset.battleRuntime;proofNode?.remove();proofNode=null;}
