import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const errors = [];
const backend = read('backend/pkg/game/settlement.go');
const layout = read('backend/pkg/game/camp_layout.go');
const viewport = read('frontend/src/components/Viewport/GameViewport.ts');
const registry = read('frontend/src/game/camp/CampLayoutRegistry.ts');
const geometry = read('frontend/src/game/IsoWorldGeometry.ts');

const worldW = Number(layout.match(/CampGridWidth\s*=\s*(\d+)/)?.[1] || 0);
const worldH = Number(layout.match(/CampGridHeight\s*=\s*(\d+)/)?.[1] || 0);
const layoutVersion = Number(layout.match(/CampLayoutVersion\s*=\s*(\d+)/)?.[1] || 0);
if (worldW !== 52 || worldH !== 38 || layoutVersion !== 5) errors.push(`world/layout inesperado: ${worldW}x${worldH} v${layoutVersion}`);
if (!registry.includes('configureSettlementTerritoryContract')) errors.push('frontend não consome contrato territorial');
if (registry.includes('export const SettlementStageBounds')) errors.push('frontend ainda contém tabela manual de bounds');
if (!viewport.includes('minimumSettlementZoom()')) errors.push('viewport perdeu proteção de zoom mínimo');
if (!viewport.includes('MIN_ARENA_ZOOM')) errors.push('viewport perdeu isolamento de zoom da arena');
if (!geometry.includes('configureSettlementWorldGeometry')) errors.push('geometria territorial não é configurável pelo contrato');

const stages = [
  ['camp', 24, 18], ['outpost', 28, 20], ['hamlet', 32, 22],
  ['village', 36, 24], ['city', 40, 28], ['kingdom', 52, 38],
];
const resolutions = [[960,420],[1280,720],[1366,768],[1600,900],[1920,1080],[2560,1440],[3440,1440]];
const tileW=32, tileH=16, originX=worldH*(tileW/2)+48, originY=24;
const worldPixelW=Math.max(960, Math.ceil(originX + worldW*(tileW/2) + 48));
const worldPixelH=Math.max(420, Math.ceil(originY + (worldW+worldH-2)*(tileH/2) + tileH/2 + 5 + 40));

function screen(x,y){ return {x:originX+(x-y)*16,y:originY+(x+y)*8}; }
let cases=0;
for(const [stage,w,h] of stages){
  const minX=Math.floor((worldW-w)/2), minY=Math.floor((worldH-h)/2);
  const maxX=minX+w, maxY=minY+h;
  const corners=[screen(minX,minY),screen(maxX-1,minY),screen(minX,maxY-1),screen(maxX-1,maxY-1)];
  const minSX=Math.min(...corners.map(p=>p.x))-30, maxSX=Math.max(...corners.map(p=>p.x))+30;
  const minSY=Math.min(...corners.map(p=>p.y))-30, maxSY=Math.max(...corners.map(p=>p.y))+30;
  for(const [rw,rh] of resolutions){
    cases++;
    const viewW=Math.min(rw,960), viewH=viewW*(7/16); // canvas lógico 16:7
    const targetW=stage==='kingdom'?worldPixelW:(maxSX-minSX);
    const targetH=stage==='kingdom'?worldPixelH:(maxSY-minSY);
    const containment=Math.min((viewW-54)/targetW,(viewH-42)/targetH);
    const centerX=stage==='kingdom'?worldPixelW/2:(minSX+maxSX)/2;
    const centerY=stage==='kingdom'?worldPixelH/2:(minSY+maxSY)/2;
    const minNoBlack=Math.max(viewW/(Math.min(centerX,worldPixelW-centerX)*2),viewH/(Math.min(centerY,worldPixelH-centerY)*2));
    const zoom=Math.max(0.65,minNoBlack,containment);
    if(!Number.isFinite(zoom) || zoom<=0 || zoom>1.45+1e-9) errors.push(`${stage} ${rw}x${rh}: zoom inválido ${zoom}`);
  }
}

const cityArea=40*28, kingdomArea=52*38;
if(kingdomArea/cityArea < 1.70) errors.push('salto Cidade→Reino menor que 70%');

console.log(JSON.stringify({layoutVersion, world:`${worldW}x${worldH}`, worldPixels:`${worldPixelW}x${worldPixelH}`, cases, cityArea, kingdomArea, kingdomGrowthPercent:Math.round((kingdomArea/cityArea-1)*1000)/10, errors:errors.length},null,2));
if(errors.length){ errors.forEach(e=>console.error('-',e)); process.exitCode=1; }
else console.log('Settlement Viewport Audit OK: 42 cenários matemáticos, Territory V5 e isolamento de zoom íntegros.');
