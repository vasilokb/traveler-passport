const fs = require('fs');
const all = fs.readFileSync('F:\\projects\\traveler-passport\\.kilo\\plans\\belarus-border-path.txt', 'utf8');
const lines = all.split('\n');
const pathData = lines[7].trim();

let x = 0, y = 0;
let points = [];

let cmd = '';
const re = /([mclhvz])\s*|([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/gi;
let m;
let args = [];

function flush() {
  if (args.length === 0 || !cmd) return;
  if (cmd === 'm' || cmd === 'l') {
    while (args.length >= 2) {
      x += args[0]; y += args[1];
      points.push([x, y]);
      args = args.slice(2);
    }
    if (cmd === 'm') cmd = 'l';
  } else if (cmd === 'c') {
    while (args.length >= 6) {
      x += args[4]; y += args[5];
      points.push([x, y]);
      args = args.slice(6);
    }
  }
}

const tokens = pathData.match(/[mclhvz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi);
for (const t of tokens) {
  if (/^[mclhvz]$/i.test(t)) {
    flush();
    cmd = t.toLowerCase();
    args = [];
    if (cmd === 'z') break;
  } else {
    args.push(parseFloat(t));
  }
}
flush();

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const [px, py] of points) {
  if (px < minX) minX = px;
  if (py < minY) minY = py;
  if (px > maxX) maxX = px;
  if (py > maxY) maxY = py;
}

console.log('Border bbox: x=' + minX.toFixed(1) + ' y=' + minY.toFixed(1) + ' w=' + (maxX-minX).toFixed(1) + ' h=' + (maxY-minY).toFixed(1));
console.log('Points count: ' + points.length);
console.log('First 3: ' + JSON.stringify(points.slice(0,3)));
console.log('Last 3: ' + JSON.stringify(points.slice(-3)));
console.log('');
console.log('Fitting viewBox: ' + (minX-10).toFixed(1) + ' ' + (minY-10).toFixed(1) + ' ' + (maxX-minX+20).toFixed(1) + ' ' + (maxY-minY+20).toFixed(1));

// Now check: what viewBox would make the path align with our projectToSVG?
// Our projection puts Brest at (127.87, 1179.59) and Vitebsk at (1177.68, 334.64)
// Path starts at (157.7, 1452.5) - this should be SW Belarus  
// Path minY is the northernmost point - should correspond to ~56.4N
// Path maxX is the easternmost point - should correspond to ~33.0E

// If the path border bbox is correct, the viewBox should encompass it
// But we need path coords to match projectToSVG coords
// Let's check if the path's bbox roughly matches our projected city positions

console.log('');
console.log('projectToSVG reference points:');
const VBX=1.472, VBY=1.809, VBW=1626.241, VBH=1450.672;
const geoN=56.4, geoS=51.1, geoW=22.9, geoE=33.0;
function proj(lat,lon) {
  return {
    x: VBX + ((lon-geoW)/(geoE-geoW)) * VBW,
    y: VBY + ((geoN-lat)/(geoN-geoS)) * VBH
  };
}
console.log('  Brest: ' + JSON.stringify(proj(52.097,23.685)));
console.log('  Vitebsk: ' + JSON.stringify(proj(55.184,30.205)));
console.log('  Minsk: ' + JSON.stringify(proj(53.9006,27.559)));

// The path bbox doesn't match our viewBox at all
// Path goes from x=-1268 to x=201, y=1225 to y=1741
// Our viewBox is x=1.4 to x=1627.7, y=1.8 to y=1452.5
// The path is in a COMPLETELY DIFFERENT coordinate space

// This means the path data was extracted from an SVG with a DIFFERENT viewBox
// or there's a transform applied to it in the original SVG

// Solution: we need to find the actual viewBox of the original SVG
// or generate our own Belarus outline from coordinates
