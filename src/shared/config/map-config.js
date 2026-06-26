export const MAP = {
  viewBoxX: 1.472,
  viewBoxY: 1.809,
  viewBoxW: 1626.241,
  viewBoxH: 1450.672,
  geoN: 56.4,
  geoS: 51.1,
  geoW: 22.9,
  geoE: 33.0,
};

export function projectToSVG(lat, lon) {
  var x =
    MAP.viewBoxX +
    ((lon - MAP.geoW) / (MAP.geoE - MAP.geoW)) * MAP.viewBoxW;
  var y =
    MAP.viewBoxY +
    ((MAP.geoN - lat) / (MAP.geoN - MAP.geoS)) * MAP.viewBoxH;
  return { x: x, y: y };
}
