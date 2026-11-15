const SURFACE = [
  [122, 398], [166, 355], [275, 310], [328, 272], [484, 233],
  [549, 194], [657, 171], [742, 203], [795, 242], [937, 271],
  [1027, 316], [1105, 350], [1165, 398], [1131, 449], [1031, 490],
  [977, 538], [872, 578], [754, 604], [650, 650], [568, 632],
  [471, 603], [347, 582], [267, 536], [232, 498], [155, 454],
];

function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function polygon(graphics, color, points, alpha = 1) {
  graphics.fillStyle(color, alpha);
  graphics.fillPoints(points.map(([x, y]) => ({ x, y })), true);
}

function trace(graphics, width, color, alpha, points) {
  graphics.lineStyle(width, color, alpha);
  graphics.strokePoints(points.map(([x, y]) => ({ x, y })), false, false);
}

function withinSurface(x, y) {
  let inside = false;
  for (let i = 0; i < SURFACE.length; i += 1) {
    const [ax, ay] = SURFACE[i];
    const [bx, by] = SURFACE[(i + 1) % SURFACE.length];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) {
      inside = !inside;
    }
  }
  return inside;
}

function drawSky(scene) {
  const sky = scene.add.graphics().setDepth(0);
  const random = seededRandom(42);
  for (let i = 0; i < 124; i += 1) {
    const x = 13 + random() * 1254;
    const y = 12 + random() * 696;
    const brightness = random();
    sky.fillStyle(i % 5 === 0 ? 0xa1c9f0 : 0xdce8f7, 0.16 + brightness * 0.52);
    sky.fillCircle(x, y, brightness > 0.89 ? 1.5 : 0.75);
    if (i % 23 === 0) {
      sky.lineStyle(1, 0xa1c9f0, 0.36);
      sky.lineBetween(x - 4, y, x + 4, y);
      sky.lineBetween(x, y - 4, x, y + 4);
    }
  }
}

function drawShelf(ground) {
  const random = seededRandom(327);
  polygon(ground, 0x090f19, SURFACE.map(([x, y]) => [x + 7, y + 25]), 0.68);
  polygon(ground, 0x353c4c, SURFACE.map(([x, y]) => [x, y + 19]));

  // The visible cliff faces run along the front half of the shelf.
  for (let i = 12; i < SURFACE.length; i += 1) {
    const [x, y] = SURFACE[i];
    const [nextX, nextY] = SURFACE[(i + 1) % SURFACE.length];
    const face = [0x464e61, 0x3c4354, 0x50596c][i % 3];
    polygon(ground, face, [[x, y], [nextX, nextY], [nextX, nextY + 19], [x, y + 19]]);
    trace(ground, 1, 0x818a9b, 0.34, [[x + 4, y + 8], [nextX - 4, nextY + 8]]);
  }

  polygon(ground, 0x828b9a, SURFACE);
  polygon(ground, 0x747f91, [
    [654, 179], [734, 207], [792, 246], [934, 277], [1099, 354],
    [1156, 399], [1126, 444], [984, 464], [930, 420], [810, 340], [735, 280],
  ]);
  polygon(ground, 0x929ba9, [
    [135, 398], [175, 359], [278, 315], [341, 273], [482, 240], [563, 202],
    [653, 181], [583, 267], [479, 297], [395, 365], [265, 411], [183, 426],
  ]);
  polygon(ground, 0x768192, [
    [248, 494], [355, 521], [488, 545], [616, 585], [748, 575], [862, 554],
    [974, 522], [863, 574], [753, 598], [650, 643], [477, 598], [351, 576],
    [273, 530],
  ]);
  trace(ground, 2, 0xc4cbd7, 0.58, [...SURFACE, SURFACE[0]]);

  for (let i = 0; i < 500; i += 1) {
    const x = 140 + random() * 1005;
    const y = 181 + random() * 457;
    if (!withinSurface(x, y)) continue;
    ground.fillStyle(i % 3 === 0 ? 0xd0d8e1 : 0x384254, 0.13 + random() * 0.14);
    ground.fillEllipse(x, y, 1 + random() * 5, 0.8 + random() * 1.8);
  }
}

function drawCraters(ground) {
  const craters = [
    [215, 401, 68, 33], [278, 430, 29, 13], [318, 340, 31, 13],
    [680, 230, 62, 28], [715, 288, 30, 14], [1034, 384, 78, 34],
    [1103, 405, 27, 13], [1012, 451, 31, 15], [661, 599, 52, 22],
    [544, 589, 26, 12], [355, 544, 36, 15], [904, 561, 32, 13],
  ];
  for (const [x, y, width, height] of craters) {
    ground.fillStyle(0x414b60, 0.17);
    ground.fillEllipse(x + 2, y + 3, width * 1.13, height * 1.12);
    ground.fillStyle(0xa6aebb, 0.8);
    ground.fillEllipse(x, y, width, height);
    ground.fillStyle(0x485367, 0.88);
    ground.fillEllipse(x, y - 1, width * 0.87, height * 0.79);
    ground.fillStyle(0x647084, 0.9);
    ground.fillEllipse(x + width * 0.045, y + height * 0.12, width * 0.72, height * 0.54);
    trace(ground, 1, 0xc8d0db, 0.58, [
      [x - width * 0.35, y + height * 0.28],
      [x - width * 0.14, y + height * 0.43],
      [x + width * 0.16, y + height * 0.44],
    ]);
  }
}

function drawRocks(ground) {
  const random = seededRandom(129);
  const groups = [[175, 429], [249, 474], [335, 370], [576, 244], [740, 246],
    [979, 322], [1083, 420], [991, 473], [828, 570], [580, 612], [413, 562]];
  for (const [gx, gy] of groups) {
    for (let i = 0; i < 4; i += 1) {
      const x = gx + random() * 24 - 12;
      const y = gy + random() * 15 - 7;
      const r = 2 + random() * (i === 0 ? 8 : 4);
      ground.fillStyle(0x303a4c, 0.27);
      ground.fillEllipse(x + r * 0.65, y + 2, r * 2.8, r * 0.85);
      polygon(ground, 0x535e70, [
        [x - r, y], [x - r * 0.28, y - r * 0.85], [x + r * 0.44, y - r * 0.8],
        [x + r, y - r * 0.16], [x + r * 0.5, y + r * 0.3], [x - r * 0.43, y + r * 0.33],
      ]);
      polygon(ground, 0xa5aebb, [
        [x - r, y], [x - r * 0.28, y - r * 0.85],
        [x + r * 0.44, y - r * 0.8], [x - r * 0.1, y - r * 0.31],
      ]);
    }
  }
}

function drawInfrastructure(graphics, buildings, crewStart) {
  const junction = [640, 458];
  const routes = buildings.map(({ x, y, approachX, approachY }) => [
    [x, y], [approachX, approachY], junction,
  ]);
  routes.push([junction, [crewStart.x, crewStart.y + 13]]);
  for (const [width, color, alpha] of [[23, 0x424e61, 0.84], [19, 0xabb4c2, 0.95], [15, 0x626e81, 1]]) {
    for (const route of routes) trace(graphics, width, color, alpha, route);
    graphics.fillStyle(color, alpha);
    graphics.fillCircle(...junction, width / 2);
  }
  for (const [start, end] of routes.map((route) => route.slice(-2))) {
    for (const fraction of [0.25, 0.5, 0.75]) {
      const x = start[0] + (end[0] - start[0]) * fraction;
      const y = start[1] + (end[1] - start[1]) * fraction;
      graphics.fillStyle(0x91e9eb, 0.9);
      graphics.fillEllipse(x, y, 7, 3);
    }
  }

  for (const { x, y, padWidth } of buildings) {
    const half = padWidth / 2;
    const shape = [[x - half, y - 10], [x - half + 14, y - 29], [x + half - 30, y - 29],
      [x + half, y - 12], [x + half - 12, y + 13], [x - half + 29, y + 13]];
    polygon(graphics, 0x485466, shape.map(([px, py]) => [px, py + 4]));
    polygon(graphics, 0x9ba9b9, shape);
    polygon(graphics, 0x738196, shape.map(([px, py]) => [
      x + (px - x) * 0.955, y + (py - y) * 0.86,
    ]));
    for (const side of [-1, 1]) {
      const signalX = x + side * (half - 22);
      graphics.fillStyle(0x4ed3de, 0.22);
      graphics.fillEllipse(signalX, y + 4, 27, 10);
      graphics.fillStyle(0xa2f3f0, 0.9);
      graphics.fillEllipse(signalX, y + 3, 9, 3);
    }
    for (let offset = 0; offset < 4; offset += 1) {
      const stripe = x + half - 59 + offset * 7;
      trace(graphics, 2, 0xf1c378, 0.8, [[stripe, y + 10], [stripe + 4, y + 5]]);
    }
  }
}

export function drawLunarTerrain(scene, buildings, crewStart) {
  drawSky(scene);
  const ground = scene.add.graphics().setDepth(1);
  drawShelf(ground);
  drawCraters(ground);
  drawRocks(ground);
  drawInfrastructure(scene.add.graphics().setDepth(2), buildings, crewStart);
}
