export const REGIONS = [
  { id: "minsk", name: "Минск", color: "#2980B9" },
  { id: "minsk_obl", name: "Минская", color: "#E74C3C" },
  { id: "brest", name: "Брестская", color: "#3498DB" },
  { id: "grodno", name: "Гродненская", color: "#27AE60" },
  { id: "vitebsk", name: "Витебская", color: "#F39C12" },
  { id: "mogilev", name: "Могилёвская", color: "#9B59B6" },
  { id: "gomel", name: "Гомельская", color: "#1ABC9C" },
];

export const REGION_ICONS = {
  minsk: '<path d="M48 38 L50 32 L52 26 L54 24 L46 24 L48 26 L50 32 L50 38 L42 38 L42 40 L58 40 L58 38 Z M46 22 L54 22 L54 24 L46 24 Z" fill="currentColor"/>',
  minsk_obl: '<path d="M40 40 L40 28 L42 26 L46 24 L50 26 L54 24 L58 26 L60 28 L60 40 Z M48 30 L48 36 M44 33 L52 33" fill="currentColor"/>',
  brest: '<path d="M38 40 L38 26 L42 22 L44 22 L44 26 L46 26 L46 22 L54 22 L54 26 L56 26 L56 22 L58 22 L62 26 L62 40 Z M50 28 L50 36 M46 32 L54 32" fill="currentColor"/>',
  grodno: '<path d="M44 40 L44 30 L42 28 L42 22 L46 22 L46 28 L50 28 L50 22 L54 22 L54 28 L52 30 L52 40 Z M48 32 L48 38" fill="currentColor"/>',
  vitebsk: '<path d="M42 40 L42 30 L38 26 L40 22 L44 20 L46 22 L46 18 L48 16 L50 18 L50 22 L52 20 L56 22 L58 26 L54 30 L54 40 Z M48 24 L48 36" fill="currentColor"/>',
  mogilev: '<path d="M42 40 L42 32 L44 30 L44 26 L40 24 L40 22 L46 22 L46 24 L50 24 L50 22 L56 22 L56 24 L52 26 L52 30 L54 32 L54 40 Z M48 34 L48 38" fill="currentColor"/>',
  gomel: '<path d="M38 40 L38 30 L40 28 L40 24 L42 22 L44 22 L44 24 L48 24 L48 22 L52 22 L52 24 L56 24 L56 22 L58 22 L60 24 L60 28 L62 30 L62 40 Z M50 26 L50 36" fill="currentColor"/>',
};

export function createStampSVG(regionId, tier) {
  tier = tier || "bronze";
  var inner = REGION_ICONS[regionId] || "";
  var ring = "";
  var openTag = "";
  var closeTag = "";

  if (tier === "silver") {
    ring = '<circle cx="50" cy="50" r="47" fill="none" stroke="#C0C0C0" stroke-width="2.5" opacity="0.8"/>';
  } else if (tier === "gold") {
    ring = '<circle cx="50" cy="50" r="47" fill="none" stroke="#FFD700" stroke-width="2.5" opacity="0.6"/>';
    openTag = '<g color="#FFD700">';
    closeTag = '</g>';
  }

  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    ring +
    openTag +
    '<g transform="translate(0, 10)">' +
    '<path d="M50 5 L54 8 L58 6 L61 10 L65 9 L67 13 L71 13 L72 17 L76 18 L76 22 L80 24 L79 28 L82 31 L80 35 L83 38 L80 41 L82 44 L79 47 L80 50 L77 53 L78 56 L74 58 L74 62 L70 63 L69 67 L65 67 L63 71 L59 70 L57 74 L53 72 L50 75 L47 72 L43 74 L41 70 L37 71 L35 67 L31 67 L30 63 L26 62 L26 58 L22 56 L23 53 L20 50 L21 47 L18 44 L20 41 L17 38 L20 35 L18 31 L21 28 L20 24 L24 22 L24 18 L28 17 L29 13 L33 13 L35 9 L39 10 L42 6 L46 8 Z" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.5"/>' +
    '<g transform="translate(0, 10)">' + inner + '</g>' +
    '</g>' +
    closeTag +
    '</svg>';
}

export function computeStarPoints(cx, cy, outerR) {
  var innerR = outerR * 0.382;
  var pts = [];
  for (var i = 0; i < 10; i++) {
    var angle = -Math.PI / 2 + i * Math.PI / 5;
    var radius = (i % 2 === 0) ? outerR : innerR;
    pts.push(
      (cx + radius * Math.cos(angle)).toFixed(1) + "," +
      (cy + radius * Math.sin(angle)).toFixed(1)
    );
  }
  return pts.join(" ");
}
