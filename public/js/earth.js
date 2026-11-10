import * as THREE from 'three';

// The Earth's surface, for any page that shows the globe: the real continents
// (simplified coastlines), drawn once onto a flat map and wrapped around a
// ball. Green land, sandy deserts, pale mountains, white ice, and lighter
// water near the coasts.
//
//   const surface = createEarthSurface();
//   new THREE.Mesh(new THREE.SphereGeometry(2, 64, 48), surface.material);
//   surface.setIce(72);   // sea ice reaches down to 72° north
//   surface.partAt(uv);   // 'land', 'ocean', or 'ice' under a tap
//
// To face a place toward the camera (+z), set the ball's rotation.y to
// faceLongitude(78) (that one is India).

// Coastlines as flat lists of longitude, latitude. East and north are positive.
const LAND = [
  // North America
  [-168, 66, -156, 71, -140, 70, -125, 71, -110, 73, -95, 74, -82, 73, -75, 70, -65, 66, -64, 60, -56, 52, -60, 47, -66, 44,
    -70, 42, -74, 40, -76, 35, -81, 31, -80, 26, -82, 28, -84, 30, -89, 30, -94, 29, -97, 27, -97, 22, -95, 19, -91, 19, -90, 21,
    -87, 21, -88, 16, -84, 15, -83, 11, -80, 9, -77, 8, -80, 7, -83, 8, -86, 11, -88, 13, -92, 14, -95, 16, -100, 17, -105, 20,
    -106, 23, -110, 23, -109, 25, -113, 31, -117, 33, -121, 35, -124, 40, -124, 47, -128, 51, -132, 55, -136, 58, -141, 60,
    -148, 60, -152, 58, -158, 56, -164, 54.5, -158, 58, -162, 60, -166, 62, -165, 64.5],
  // South America
  [-77, 8, -72, 12, -68, 11.5, -62, 10.5, -57, 6, -51, 4, -50, 0, -44, -2.5, -37, -5, -35, -8, -39, -14, -39, -18, -41, -22,
    -48, -26, -49, -29, -53, -34, -57, -36, -58, -38.5, -62, -39, -65, -42, -66, -46, -69, -51, -68, -54.5, -72, -53.5, -75, -50,
    -74, -44, -73, -38, -71, -31, -70, -24, -70, -18, -76, -14, -80, -6, -81, -4, -80, -1, -80, 1, -78, 3, -77, 7],
  // Africa
  [-6, 35.8, -1, 35, 10, 37, 11, 33.5, 15, 32, 20, 31, 25, 31.5, 32, 31, 32.5, 30, 35, 24, 37, 20, 39, 15.5, 43, 12, 44, 11,
    51, 12, 50, 8, 47, 4, 42, -1.5, 39.5, -5, 39.5, -10, 40.5, -15, 36, -19, 35, -24, 32.5, -27, 30, -31, 26, -34, 20, -34.8,
    18.3, -34, 18, -30, 15, -26, 12, -18, 13.5, -12, 12, -6, 9, -1, 9.5, 4, 6, 4.3, 2, 6.2, -4, 5, -8, 4.4, -13, 8.5, -15, 11,
    -17, 14.7, -16, 19, -17, 21, -13, 27.5, -10, 30, -9.5, 33],
  // Europe and Asia
  [-9, 37, -9.5, 43, -2, 43.5, -1.5, 46, -4.5, 48.5, 2, 51, 4, 52, 8.5, 54, 8, 57, 10, 57.5, 12, 56, 11.5, 58.5, 7, 58, 5, 61,
    10, 64, 14, 67.5, 20, 70, 26, 71, 31, 70, 41, 67, 40, 64.5, 44, 66, 44, 68.5, 54, 68.5, 60, 69, 68, 68.5, 70, 73, 80, 73,
    90, 75.5, 104, 77.5, 113, 74, 130, 71, 140, 72.5, 160, 70, 170, 69.5, 180, 68.5, 190, 66, 180, 64.5, 179, 62.5, 170, 60,
    164, 60, 163, 56, 157, 51, 156, 57, 160, 61, 155, 59.5, 143, 59.3, 135, 54.5, 141, 53, 140, 48, 135, 43.5, 130, 42.5,
    128, 40, 129.4, 36, 127, 34.5, 126, 37, 125, 39.5, 121.5, 39, 122, 40.5, 118, 39, 119, 37.5, 122.5, 37, 120, 34, 122, 31,
    121, 28, 118, 24.5, 114, 22.3, 110, 21, 108, 21.5, 106, 19, 109, 15, 109.3, 11.5, 106.5, 9, 105, 8.7, 104.8, 10, 102.5, 12,
    100.8, 13.3, 99.3, 10, 101, 6.8, 103.4, 4, 104, 1.4, 101.3, 2.7, 100.3, 6, 98.3, 8, 98.6, 13, 97.5, 16.5, 94.3, 16, 94, 19,
    92, 21.5, 91, 22.5, 89, 21.7, 87, 21, 85, 19.5, 82, 16.5, 80.2, 15, 80.2, 13, 79.8, 10.3, 77.5, 8, 76.3, 9.5, 74.8, 13,
    73, 17, 72.8, 20, 72.5, 21.5, 70.5, 20.8, 69, 22.2, 67, 24.5, 62, 25.2, 57.5, 25.5, 56.5, 27, 52, 27.5, 50, 30, 48, 30,
    50.5, 26, 51.5, 24.5, 54, 24, 56.3, 26, 56.5, 24.5, 59.8, 22.5, 58, 19.5, 55, 17, 52, 16, 48.5, 14, 45, 12.8, 43.3, 12.7,
    42.5, 16.5, 39, 21.5, 37, 25, 35, 28, 34.5, 29.5, 34.3, 31.3, 35.7, 34.5, 36, 36.6, 32, 36.2, 30, 36.3, 27.5, 37, 26.3, 39.5,
    26, 40.5, 23, 40.3, 24, 38, 23, 36.5, 21.5, 37, 19.5, 40.5, 19.5, 42, 14, 45.3, 12.5, 44.5, 14, 42, 16, 41.8, 18.5, 40.2,
    17, 39, 16.5, 38, 15.7, 38, 16, 40, 12.5, 41.5, 10.3, 43.5, 8.5, 44.3, 6, 43, 3.2, 43.2, 3.2, 41.8, 0, 39.5, -0.5, 38,
    -2, 36.7, -5.3, 36.1],
  // Australia, and Tasmania
  [114, -22, 113.5, -26, 115, -31, 115.2, -34.3, 118, -35, 123.5, -34, 129, -31.7, 134, -32.5, 136, -35, 138, -33, 138.5, -35.5,
    141, -38.2, 146.3, -39, 150, -37.3, 151.3, -33.5, 153.5, -28.5, 153, -25, 149.5, -22, 146.3, -19, 145.4, -14.8, 143.5, -14,
    142.5, -10.8, 141.6, -13, 141, -17.5, 139, -17.5, 135.5, -15, 136.8, -12, 132, -11.5, 130, -12.5, 129.3, -15, 126, -14,
    122.2, -17.5, 119, -20],
  [144.7, -40.7, 148.3, -40.8, 148, -43.2, 146, -43.6, 145.2, -42.2],
  // Islands: Madagascar, Sri Lanka, Britain, Ireland, Japan, Sakhalin, Taiwan
  [49.3, -12, 50.5, -15.5, 47.5, -24.5, 45, -25.5, 43.5, -22, 44.5, -16, 47, -14],
  [79.9, 9.7, 81.8, 7.5, 81, 6, 80, 6.2, 79.8, 8],
  [-5.5, 50, 1.3, 51.2, 1.7, 52.8, -0.2, 54, -2, 56, -2, 57.6, -4, 58.6, -6, 57.5, -5, 55.5, -3, 54, -4.5, 53.3, -5, 51.8, -3, 51.4],
  [-6, 52.2, -6, 55, -8.5, 55.2, -10, 53.5, -10, 51.6],
  [130, 31.5, 131.5, 34, 135, 34, 137, 34.7, 140, 35.5, 141.5, 39, 141.5, 41.3, 140, 41, 139.5, 38.5, 136.7, 36.8, 133, 35.5,
    131, 34.3, 129.7, 33],
  [140.3, 41.6, 141.8, 45.3, 145.3, 43.5, 143.3, 42],
  [142, 46, 143.5, 50, 142.7, 54, 142, 50],
  [120.2, 23, 121.6, 25.2, 121, 22],
  // The Philippines, Borneo, Sumatra, Java, Sulawesi, New Guinea
  [120.5, 18.5, 122.2, 18.3, 122, 14, 124, 13, 120.5, 14],
  [122, 7, 126.5, 9.5, 126.2, 6.3, 124, 6.5],
  [109, 1.5, 111.5, 2.5, 115, 5, 117, 7, 119, 5, 117.8, 1, 116.5, -3.5, 114.5, -4, 111, -3, 110, -1.5],
  [95.3, 5.6, 98, 4, 103.5, -1, 106, -5.8, 104, -5.5, 101, -2.5, 98.5, 1.5],
  [105.5, -6.5, 108.5, -6.7, 111, -6.5, 114.5, -7.8, 114.3, -8.7, 108, -7.8, 105.5, -7],
  [119.5, -5.5, 119, -2.5, 120, 1, 125, 1.5, 121.5, -0.8, 123, -4.5, 120.5, -5.5],
  [131, -0.8, 134, -0.8, 135.5, -3.3, 138, -1.7, 141, -2.6, 145.8, -5, 147.5, -6, 150.5, -10.3, 147, -9.5, 144, -7.7, 142, -9.2,
    138, -8.3, 138, -6, 133, -4, 132, -2.8],
  // New Zealand, Cuba, Hispaniola, Iceland, Novaya Zemlya
  [172.7, -34.5, 175.5, -36.5, 178.5, -37.7, 177, -39.5, 175.3, -41.6, 174.7, -39.5, 173.8, -39.2, 174.6, -37.5],
  [172.7, -40.6, 174.3, -41.7, 171.2, -44.3, 170.5, -46, 168.5, -46.6, 166.5, -45.8, 168.5, -44, 171, -42.5],
  [-85, 22, -80, 23.2, -74.2, 20.2, -77.5, 19.9, -78, 21.5, -82, 22.5],
  [-74.4, 18.5, -72.8, 19.9, -68.4, 18.6, -71, 17.7],
  [-24, 65.5, -22, 66.4, -16, 66.4, -13.6, 65, -18.5, 63.4, -22.5, 64],
  [52, 71, 57, 73.5, 68, 77, 60, 76, 54, 73],
];

// Seas cut back out of the land: Hudson Bay, the Baltic, the Black Sea, the Caspian.
const SEAS = [
  [-94, 58, -90, 63, -82, 64, -77, 62, -78, 56, -80, 52, -83, 55, -90, 57],
  [10, 54.5, 14, 54, 19, 54.5, 21, 57, 24, 59.5, 30, 60, 23, 60, 21.5, 61, 21.5, 63, 25, 65.5, 22, 65.8, 18, 62.5, 17, 60.5,
    18.5, 59, 16.5, 57, 14.5, 56, 13, 55.5, 12, 56.5, 10.5, 57.5],
  [28, 41.5, 28.5, 44.5, 30.5, 46.3, 33, 46, 35.5, 45.2, 37.5, 46.5, 38, 44.5, 41.5, 42, 41, 41, 36, 41.2, 32, 42, 29, 41.2],
  [49.5, 37, 54, 37, 53.5, 40.5, 52.5, 42, 50.5, 44.5, 53, 46.5, 49, 46.5, 47, 44.5, 49.5, 40.5],
];

// Land under ice all year: Greenland, Ellesmere Island, Svalbard, and
// Antarctica (which runs right around the bottom of the map).
const ICE_LAND = [
  [-72, 78, -58, 75, -53, 70, -51, 64, -44, 60, -41, 64, -32, 68, -22, 70, -20, 75, -18, 80, -30, 83, -50, 82, -65, 81],
  [-90, 76.5, -75, 76.5, -62, 82.5, -90, 82],
  [11, 79, 20, 80.5, 27, 79.5, 18, 77],
  [-200, -78, -180, -78, -160, -78, -150, -76, -130, -74.5, -105, -74, -90, -72.5, -75, -73, -68, -68, -62, -64, -57, -63.5,
    -60, -67, -62, -74, -45, -78, -30, -77, -20, -73.5, -10, -71, 0, -70, 15, -69.5, 30, -69, 40, -68.5, 52, -66, 60, -67.5,
    70, -68.5, 80, -66.5, 95, -66, 110, -66, 125, -66.5, 140, -66.5, 155, -69, 165, -71, 170, -77.5, 180, -78, 200, -78,
    200, -100, -200, -100],
];

// Soft patches painted over the land: [longitude, latitude, half-width, half-height, color].
const SAND = '#dcc07e';
const ROCK = '#b9a98c';
const JUNGLE = '#3f9440';
const PATCHES = [
  // Deserts
  [-4, 23, 20, 11, SAND], [14, 23, 20, 11, SAND], [30, 23, 14, 11, SAND], [47, 23, 13, 11, SAND], [59, 31, 13, 8, SAND], [70, 27, 6, 5, SAND],
  [62, 42, 14, 7, SAND], [92, 41, 20, 7, SAND], [126, -25, 14, 10, SAND], [136, -26, 14, 10, SAND], [19, -24, 9, 9, SAND], [-110, 31, 10, 8, SAND],
  [-69, -24, 3, 9, SAND], [-68, -45, 4, 7, SAND], [46, 7, 5, 5, SAND],
  // Mountains and high, dry land: Tibet and the Himalayas, the Andes, the Rockies
  [88, 33, 15, 6, ROCK], [-71, -12, 4, 16, ROCK], [-112, 44, 7, 13, ROCK],
  // Rainforests: the Amazon, the Congo, Southeast Asia
  [-62, -4, 16, 12, JUNGLE], [21, 0, 13, 9, JUNGLE], [108, 2, 20, 11, JUNGLE],
];

const DEFAULT_ICE = 73; // sea ice reaches this far from the pole, in degrees north

/** rotation.y that turns this longitude (east is positive) to face +z. */
export function faceLongitude(lon) {
  return THREE.MathUtils.degToRad(-90 - lon);
}

// A smooth closed outline through the points, so the coasts have no corners.
function outline(ctx, pts, toX, toY, shift = 0) {
  const n = pts.length / 2;
  const x = (i) => toX(pts[(i % n) * 2] + shift);
  const y = (i) => toY(pts[(i % n) * 2 + 1]);
  ctx.moveTo((x(0) + x(1)) / 2, (y(0) + y(1)) / 2);
  for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 1)) / 2, (y(i) + y(i + 1)) / 2);
  ctx.closePath();
}

// Each shape is drawn three times, a whole turn apart, so land that crosses
// the edge of the map carries on at the other edge.
function fillShapes(ctx, shapes, toX, toY) {
  ctx.beginPath();
  shapes.forEach((pts) => [-360, 0, 360].forEach((shift) => outline(ctx, pts, toX, toY, shift)));
  ctx.fill();
}

function newCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// The land alone, on a clear background.
function drawLand(width, height, { flat = false } = {}) {
  const canvas = newCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const toX = (lon) => ((lon + 180) / 360) * width;
  const toY = (lat) => ((90 - lat) / 180) * height;
  ctx.fillStyle = flat ? '#ff0000' : '#58a648';
  fillShapes(ctx, LAND, toX, toY);
  ctx.globalCompositeOperation = 'destination-out';
  fillShapes(ctx, SEAS, toX, toY);
  if (!flat) {
    // Only paint where there is land already.
    ctx.globalCompositeOperation = 'source-atop';
    // Cold, pale ground in the far north; darker forest below it.
    const cold = ctx.createLinearGradient(0, 0, 0, height);
    [[82, '#eef4f2'], [70, '#b9c9a8'], [62, '#5f9f58'], [52, '#4a964a'], [40, '#58a648'], [-60, '#58a648']]
      .forEach(([lat, color]) => cold.addColorStop((90 - lat) / 180, color));
    ctx.fillStyle = cold;
    ctx.fillRect(0, 0, width, height);
    PATCHES.forEach(([lon, lat, rx, ry, color]) => {
      ctx.save();
      ctx.translate(toX(lon), toY(lat));
      ctx.scale((rx / 360) * width, (ry / 180) * height);
      const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      fade.addColorStop(0, `${color}f0`);
      fade.addColorStop(0.45, `${color}b0`);
      fade.addColorStop(1, `${color}00`);
      ctx.fillStyle = fade;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    });
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = flat ? '#0000ff' : '#f4fbff';
  fillShapes(ctx, ICE_LAND, toX, toY);
  return canvas;
}

export function createEarthSurface({ size = 2048, doubleSided = false } = {}) {
  const width = size;
  const height = size / 2;
  const toY = (lat) => ((90 - lat) / 180) * height;

  // The map without the sea ice: ocean, then the land with a glow of
  // shallow water around it.
  const base = newCanvas(width, height);
  const land = drawLand(width, height);
  let ctx = base.getContext('2d');
  const sea = ctx.createLinearGradient(0, 0, 0, height);
  sea.addColorStop(0, '#2a6dc2');
  sea.addColorStop(0.5, '#2f84de');
  sea.addColorStop(1, '#2a6dc2');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, width, height);
  ctx.shadowColor = '#7cc4f2';
  ctx.shadowBlur = width / 130;
  ctx.drawImage(land, 0, 0);
  ctx.drawImage(land, 0, 0);
  ctx.shadowBlur = 0;

  // The finished map: the base, then the sea ice at both ends.
  const canvas = newCanvas(width, height);
  ctx = canvas.getContext('2d');
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.anisotropy = 8;

  let ice = null;
  function cap(lat, sign) {
    // A wobbly edge, which meets itself at the map's two ends.
    ctx.beginPath();
    ctx.moveTo(0, toY(sign * 100));
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      ctx.lineTo((i / 180) * width, toY(sign * (lat + 1.6 * Math.sin(a * 5 + sign) + 1.1 * Math.sin(a * 13 + 2))));
    }
    ctx.lineTo(width, toY(sign * 100));
    ctx.fill();
  }
  /** Sea ice down to this latitude (degrees north), and a little farther in the south. */
  function setIce(lat = DEFAULT_ICE) {
    const next = Math.round(lat * 4) / 4;
    if (next === ice) return;
    ice = next;
    ctx.shadowBlur = 0;
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = '#f4fbff';
    ctx.shadowColor = '#f4fbff';
    ctx.shadowBlur = width / 300;
    cap(ice, 1);
    cap(ice - 9, -1);
    map.needsUpdate = true;
  }
  setIce();

  // Shiny water, dull land.
  const rough = newCanvas(width / 2, height / 2);
  const rctx = rough.getContext('2d');
  rctx.drawImage(land, 0, 0, rough.width, rough.height);
  rctx.globalCompositeOperation = 'source-in';
  rctx.fillStyle = '#f0f0f0';
  rctx.fillRect(0, 0, rough.width, rough.height);
  rctx.globalCompositeOperation = 'destination-over';
  rctx.fillStyle = '#707070';
  rctx.fillRect(0, 0, rough.width, rough.height);
  const roughnessMap = new THREE.CanvasTexture(rough);
  roughnessMap.wrapS = THREE.RepeatWrapping;

  const material = new THREE.MeshStandardMaterial({
    map,
    roughnessMap,
    roughness: 1,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  });

  // A small copy in flat colors, to tell what a tap landed on.
  const key = drawLand(512, 256, { flat: true }).getContext('2d').getImageData(0, 0, 512, 256).data;
  /** 'land', 'ocean', or 'ice' at a spot on the ball, from a raycaster hit's uv. */
  function partAt(uv) {
    const u = ((uv.x % 1) + 1) % 1;
    const lat = (uv.y - 0.5) * 180;
    if (lat > ice || lat < -(ice - 9)) return 'ice';
    const i = (Math.min(255, Math.floor((1 - uv.y) * 256)) * 512 + Math.min(511, Math.floor(u * 512))) * 4;
    if (key[i + 2] > 128) return 'ice';
    return key[i] > 128 ? 'land' : 'ocean';
  }

  return { material, map, setIce, partAt };
}
