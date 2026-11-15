# Phase 2C asset manifest

All five PNGs came from the team's approved artwork folder. The team generated the artwork with ChatGPT's image-generation capability. See [AI disclosure](AI_DISCLOSURE.md).

| Subject | Original path | Final path | Dimensions | Bytes |
| --- | --- | --- | --- | ---: |
| Astronaut | `assests/Friendly Isometric Astronaut Sprite.png` | `public/assets/astronauts/astronaut.png` | 1254 × 1254 | 784,191 |
| Hydroponic Greenhouse | `assests/Futuristic Hydroponic Greenhouse Module.png` | `public/assets/buildings/greenhouse.png` | 1254 × 1254 | 1,880,837 |
| Lunar Habitat | `assests/Isometric Lunar Habitat Dome.png` | `public/assets/buildings/habitat.png` | 1254 × 1254 | 1,352,886 |
| Oxygen Station | `assests/Lunar Colony Oxygen Station.png` | `public/assets/buildings/oxygen.png` | 1254 × 1254 | 1,451,947 |
| Solar Power Station | `assests/Lunar Solar Power Station.png` | `public/assets/buildings/solar.png` | 1254 × 1254 | 1,706,398 |

The move preserved the original PNG bytes and alpha channels. In Phaser, each sprite scales uniformly from its measured silhouette and anchors at the silhouette's bottom center. This accounts for transparent padding without altering source pixels. The astronaut uses a single image and a position tween.

The rendered scene carries the visible watermark “Sprite art: AI-generated with ChatGPT.” Keep it visible in captures and add an equivalent visible watermark if exporting any individual sprite for submission. See the [2026 Space Apps watermark clarification](https://github.com/nasa/spaceapps/discussions/1947).
