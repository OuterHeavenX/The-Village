const CATHEDRAL_URL = new URL('../../../assets/battlefield/battle3/cathedral.png', import.meta.url).href;
let cathedralImage;
function image(){
  if(!cathedralImage){cathedralImage=new Image();cathedralImage.decoding='async';cathedralImage.src=CATHEDRAL_URL;}
  return cathedralImage;
}
export function preloadCathedral(){ image(); }

// The landmark is deliberately rendered at the actual gate coordinates. This
// makes the visible objective, enemy destination and damage state one object.
export function renderCathedralStateOverlay(ctx, { x, y, hpRatio = 1, time = 0, debug = false }) {
  ctx.save(); ctx.translate(x, y);
  const art=image(), damage=1-Math.max(0,Math.min(1,hpRatio));
  if(art.complete&&art.naturalWidth){
    const width=196,height=236;
    ctx.save();ctx.globalAlpha=.42;ctx.filter='blur(8px)';ctx.fillStyle='#020207';ctx.beginPath();ctx.ellipse(0,20,width*.47,34,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.imageSmoothingEnabled=true;ctx.drawImage(art,-width/2,-height+43,width,height);
    const glow=ctx.createRadialGradient(0,14,2,0,14,55);glow.addColorStop(0,`rgba(255,207,111,${.28+Math.sin(time*2)*.025})`);glow.addColorStop(1,'rgba(255,180,80,0)');ctx.fillStyle=glow;ctx.fillRect(-60,-48,120,110);
  }
  if (debug) { ctx.globalAlpha = .7; ctx.strokeStyle = '#ff4f86'; ctx.setLineDash([7, 5]); ctx.strokeRect(-48, -74, 96, 116); ctx.setLineDash([]); }
  if (damage > .2) {
    ctx.globalAlpha = Math.min(.48, damage * .55); ctx.strokeStyle = '#09080b'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-27, -45); ctx.lineTo(-17, -24); ctx.lineTo(-25, -5); ctx.lineTo(-10, 18); ctx.moveTo(28, -36); ctx.lineTo(17, -16); ctx.lineTo(26, 4); ctx.stroke();
  }
  if (damage > .45) {
    for (let i = 0; i < 4; i++) { const drift = Math.sin(time * .55 + i) * 9; ctx.globalAlpha = (.08 + damage * .12) * (1 - i * .12); ctx.fillStyle = '#2b2930'; ctx.beginPath(); ctx.ellipse(-20 + i * 14 + drift, -62 - i * 20, 15 + i * 3, 8 + i * 2, -.4, 0, Math.PI * 2); ctx.fill(); }
  }
  if (damage > .72) { const pulse = .55 + Math.sin(time * 7) * .18; ctx.globalAlpha = .20 * pulse; ctx.fillStyle = '#c9522d'; ctx.beginPath(); ctx.ellipse(22, 3, 18, 30, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
