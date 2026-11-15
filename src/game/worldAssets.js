// Bounds are the main silhouettes at alpha >= 160, measured in the original PNGs.
// Half-open bounds drive framing only. The complete textures are still rendered.
export const worldAssets = {
  habitat: {
    key: "lunar-habitat",
    path: "assets/buildings/habitat.png",
    bounds: [33, 50, 1226, 1124],
    height: 158,
  },
  oxygen: {
    key: "lunar-oxygen",
    path: "assets/buildings/oxygen.png",
    bounds: [15, 76, 1239, 1047],
    height: 151,
  },
  greenhouse: {
    key: "lunar-greenhouse",
    path: "assets/buildings/greenhouse.png",
    bounds: [11, 13, 1240, 1230],
    height: 164,
  },
  solar: {
    key: "lunar-solar",
    path: "assets/buildings/solar.png",
    bounds: [10, 92, 1243, 1150],
    height: 163,
  },
  astronaut: {
    key: "lunar-astronaut",
    path: "assets/astronauts/astronaut.png",
    bounds: [320, 128, 949, 1127],
    height: 61,
  },
};

export function addWorldImage(scene, { key, bounds, height }) {
  if (!scene.textures.exists(key)) return null;

  const [left, top, right, bottom] = bounds;
  const center = (left + right) / 2;
  const scale = height / (bottom - top);
  const image = scene.add.image(0, 0, key);
  image.setOrigin(center / image.width, bottom / image.height);
  image.setScale(scale);
  return { image, height, left: (left - center) * scale, right: (right - center) * scale };
}
