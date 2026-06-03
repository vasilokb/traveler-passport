// The path bbox for the border (before closing rect) is:
// x: 119.2, y: 1114.4, w: 1508.6, h: 338.1
// Geographic bounds should be: N:56.4, S:51.1, W:22.9, E:33.0
// 
// So the path maps:
//   West (22.9) -> x=119.2
//   East (33.0) -> x=119.2+1508.6=1627.8
//   North (56.4) -> y=1114.4
//   South (51.1) -> y=1114.4+338.1=1452.5
//
// Let's verify with Brest (52.097, 23.685) - should be SW:
//   x = 119.2 + ((23.685 - 22.9) / (33.0 - 22.9)) * 1508.6 = 119.2 + (0.785/10.1)*1508.6 = 119.2 + 117.3 = 236.5
//   y = 1114.4 + ((56.4 - 52.097) / (56.4 - 51.1)) * 338.1 = 1114.4 + (4.303/5.3)*338.1 = 1114.4 + 274.7 = 1389.1
//
// And Vitebsk (55.184, 30.205) - should be NE:
//   x = 119.2 + ((30.205 - 22.9) / (33.0 - 22.9)) * 1508.6 = 119.2 + (7.305/10.1)*1508.6 = 119.2 + 1090.8 = 1210.0
//   y = 1114.4 + ((56.4 - 55.184) / (56.4 - 51.1)) * 338.1 = 1114.4 + (1.216/5.3)*338.1 = 1114.4 + 77.6 = 1192.0

console.log('Path-derived projection:');
console.log('  Brest: (236.5, 1389.1)');
console.log('  Vitebsk: (1210.0, 1192.0)');
console.log('');
console.log('Our current projectToSVG:');
console.log('  Brest: (127.9, 1179.6)');
console.log('  Vitebsk: (1177.7, 334.6)');
console.log('');

// The path projection maps into a narrow band y=1114..1452
// Our projectToSVG maps into y=1.8..1452
// The x-ranges are similar (~119..1628 vs ~1.4..1628)
// 
// The difference is in Y:
// Path: geoN->y=1114, geoS->y=1452 (range 338)
// Ours: geoN->y=1.8, geoS->y=1452 (range 1450)
//
// Our projection uses the FULL viewBox height (1450) for the lat range
// The path uses only 338 viewBox units for the lat range
//
// This means the path was created for a projection with N/S stretching ~170%
// but mapped into a DIFFERENT viewBox than what we're using
//
// Looking at the original file header:
// "N/S stretching 170%" - this is the equirectangular projection parameter
// The viewBox 1.472 1.809 1626.241 1450.672 was supposed to be the SVG viewBox
// But the path data doesn't fit this viewBox!
//
// WAIT - let me check the ORIGINAL SVG structure more carefully.
// The original SVG might have a transform on the path's parent group
// or the viewBox in the file header might be WRONG

// Let me try: what if the viewBox should be different?
// If the path bbox is x:119, y:1114, w:1509, h:338
// and the closing rect goes to x:-1130, y:1452
// then the FULL path bbox is x:-1130, y:1114, w:2758, h:338
// That doesn't make sense either.

// Actually, the closing rectangle is:
// 0,322.469 -1470.003,0 0,0.001 z
// From endpoint (157.7, 1452.48):
//   go down 322 -> (157.7, 1774.9) 
//   go left 1470 -> (-1312.3, 1774.9)
//   go up 0.001 -> (-1312.3, 1774.9)
//   close to start (157.7, 1452.48)
// So the full path includes a triangle going way below and to the left

// The ACTUAL border of Belarus is the part from start to the point
// before the closing rectangle. Let me check what that point is.

// From the analysis: last border point before closing rect
// The path traces border, then the closing rect lines are the last 3 segments
// The closing starts after "3.724,-1.094"
// So the border ends wherever the path is at that point

// Solution: The path data IS correct for SOME viewBox, just not the one we're using.
// The simplest fix: compute the correct projectToSVG that maps cities INTO the path bbox.

// Path border bbox: x:119.2, y:1114.4, w:1508.6, h:338.1
// This maps geographic bounds:
const pathMinX = 119.2, pathMinY = 1114.4, pathW = 1508.6, pathH = 338.1;
const geoW2 = 22.9, geoE2 = 33.0, geoN2 = 56.4, geoS2 = 51.1;

function projPath(lat, lon) {
  const x = pathMinX + ((lon - geoW2) / (geoE2 - geoW2)) * pathW;
  const y = pathMinY + ((geoN2 - lat) / (geoN2 - geoS2)) * pathH;
  return {x, y};
}

console.log('Corrected projection (matching path):');
console.log('  Brest: ' + JSON.stringify(projPath(52.097, 23.685)));
console.log('  Vitebsk: ' + JSON.stringify(projPath(55.184, 30.205)));
console.log('  Grodno: ' + JSON.stringify(projPath(53.669, 23.823)));
console.log('  Minsk: ' + JSON.stringify(projPath(53.901, 27.559)));
console.log('  Gomel: ' + JSON.stringify(projPath(52.435, 30.988)));
console.log('');

// These should all be INSIDE the path bbox: x:119..1628, y:1114..1452
// Let's verify
const cities = [
  ['Brest', 52.097, 23.685],
  ['Vitebsk', 55.184, 30.205],
  ['Grodno', 53.669, 23.823],
  ['Minsk', 53.901, 27.559],
  ['Gomel', 52.435, 30.988],
  ['Polotsk', 55.485, 28.761]
];
for (const [name, lat, lon] of cities) {
  const p = projPath(lat, lon);
  const inside = p.x >= 119 && p.x <= 1628 && p.y >= 1114 && p.y <= 1452;
  console.log(name + ': (' + p.x.toFixed(1) + ', ' + p.y.toFixed(1) + ') inside=' + inside);
}
