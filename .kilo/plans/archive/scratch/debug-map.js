const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--window-size=430,900', '--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900 });
  await page.goto('file:///F:/projects/traveler-passport/index.html', { waitUntil: 'networkidle0' });

  // Click on the Map tab
  await page.evaluate(() => {
    var mapBtn = document.querySelector('.tab-btn[data-tab="map"]');
    if (mapBtn) mapBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const data = await page.evaluate(() => {
    var svg = document.getElementById('belarus-map');
    var pathEl = svg ? svg.querySelector('path') : null;
    var pointsLayer = document.getElementById('map-points-layer');
    var pointCount = pointsLayer ? pointsLayer.children.length : 0;
    if (!svg || !pathEl) return { error: 'SVG or path not found' };
    var bbox = pathEl.getBBox();
    
    // Check a few city dots positions vs path bbox
    var dots = pointsLayer ? pointsLayer.querySelectorAll('.map-point') : [];
    var dotPositions = [];
    for (var i = 0; i < Math.min(dots.length, 6); i++) {
      var circle = dots[i].querySelector('circle.dot');
      if (circle) {
        var cx = parseFloat(circle.getAttribute('cx'));
        var cy = parseFloat(circle.getAttribute('cy'));
        var inside = cx >= bbox.x && cx <= bbox.x + bbox.width && cy >= bbox.y && cy <= bbox.y + bbox.height;
        dotPositions.push({cx: Math.round(cx), cy: Math.round(cy), inside: inside});
      }
    }
    
    return {
      viewBox: svg.getAttribute('viewBox'),
      svg_size: { w: svg.offsetWidth, h: svg.offsetHeight },
      path_bbox: { x: Math.round(bbox.x), y: Math.round(bbox.y), w: Math.round(bbox.width), h: Math.round(bbox.height) },
      point_count: pointCount,
      sample_dots: dotPositions
    };
  });

  console.log(JSON.stringify(data, null, 2));

  await page.screenshot({ path: path.join('F:\\projects\\traveler-passport\\.kilo\\plans', 'map-final.png'), clip: { x: 0, y: 0, width: 430, height: 900 } });
  console.log('Screenshot saved');

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
