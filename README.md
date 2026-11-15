# Lunar Survival Academy

Lunar Survival Academy is a small 2D training game for the NASA International Space Apps Challenge 2026. The player commands a research settlement on the Moon and keeps the crew supplied for five mission days.

The official challenge is **Build a Junior Astronaut Mission Trainer**:

https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/

Phase 3 adds mission balance and educational feedback to the illustrated Phase 2C colony.

## Technology

- Phaser 3.90.0 draws the map, buildings, and astronaut.
- JavaScript ES modules hold the game rules.
- HTML and CSS are the resource bar, building panel, and mission buttons.
- Vite serves the project and builds it for production.
- Node.js runs the tests with its built-in test runner.
- Git is used for collaboration.

React, TypeScript, and a backend are not part of this project. Phaser is pinned to 3.90.0 so a later Phaser 4 release is not installed by accident.

## What you need installed

- Node.js 20.19.0 or newer, or Node.js 22.12.0 or newer. Vite 8 requires one of those. This foundation was checked with Node.js 24.15.0.
- npm, which comes with Node.js.
- A current browser.
- Git.

Check your versions:

```bash
node -v
npm -v
```

## Install

From this folder:

```bash
npm install
```

## Start the development server

```bash
npm run dev
```

Open the local address Vite prints, usually http://localhost:5173/.

## Run the tests

```bash
npm test
```

The tests check the simulation only. They do not open a browser.

## Build for production

```bash
npm run build
```

The built files go in `dist/`. To serve that build locally:

```bash
npm run preview
```

To run the tests and the production build together:

```bash
npm run check
```

## Folders

| Path | Purpose |
| --- | --- |
| `index.html` | Page structure. Member 1 can edit the layout here. |
| `src/main.js` | Starts the controller, the HTML interface, and Phaser. |
| `src/styles/main.css` | Visual styling for the page around the map. |
| `src/ui/` | Resource bar, building panel, and button behavior. |
| `src/game/` | Phaser configuration, terrain, sprite definitions, and fallback art. |
| `src/core/` | Mission rules. This code does not use Phaser or the page. |
| `src/data/` | Building names, positions, and teaching notes. |
| `public/assets/` | Phase 2C facility and crew artwork. |
| `tests/` | Automated checks for the rules. |

## How Phaser talks to the interface

Phaser draws the settlement. The simulation owns the numbers. The HTML page shows those numbers and sends player choices back.

`src/main.js` creates three objects and connects them:

1. `createGameController()` stores the mission.
2. `createSceneBridge()` is the small callback object shared with Phaser.
3. `mountInterface()` updates the page and listens to the controller.

A building click follows this path:

1. The player clicks a building on the map, or one of the building buttons.
2. `ColonyScene` highlights it and walks the astronaut to its approach point.
3. The scene calls `bridge.onBuildingSelected(buildingId)`.
4. The interface opens the shared building panel.
5. The player presses an action button.
6. The interface sends `{ type: "BUILDING_ACTION", buildingId, actionId }`.
7. The controller checks the action and, if it is valid, updates the mission.
8. Every subscriber receives the new state. The resource bar refreshes from that state.
9. If the action worked, the scene flashes the building.

Selecting a building does not spend resources. Walking is visual feedback only.

### Controller methods

Use these from the interface. Do not keep a second copy of the resource numbers.

- `getState()` returns a frozen copy of the mission.
- `subscribe(listener)` calls `listener(state)` after each successful change. It returns an unsubscribe function.
- `dispatch(command)` returns `{ ok: true, message, state }` or `{ ok: false, reason, state }`.
- `reset()` starts the mission over. It is the same as dispatching `{ type: "RESET" }`.

Commands:

```javascript
{ type: "BUILDING_ACTION", buildingId: "greenhouse", actionId: "plant" }
{ type: "END_DAY" }
{ type: "RESET" }
```

### Scene bridge methods

`ColonyScene` fills these in when the map boots:

- `selectBuilding(buildingId)`
- `clearSelection()`
- `moveAstronautTo(buildingId)`
- `playActionFeedback(buildingId)`
- `resetVisuals()`

The interface sets `onBuildingSelected(buildingId)`. `buildingId` is `null` when the selection is cleared.

## How mission state works

There is one mission object inside the controller. The page and Phaser receive copies. Changing a copy does not change the game.

The end of a day always runs in this order:

1. Confirm the mission is still active.
2. Subtract daily supplies once: 5 power, 7 oxygen, 6 food, and 3 water.
3. If a crop is growing, try to pay its upkeep. Growth advances only when the full upkeep is paid.
4. Apply a scheduled event, if one is due.
5. Check for defeat or victory.
6. On a surviving day before day 5, advance the day and restore 2 actions.

The simulated storm adds 65 fictional risk points once, at the end of Day 3. The meter starts at 35, so use Prepare Radiation Shelter before ending Day 3. The warning explains sheltering, and the risk meter uses no radiation-dose units.

The mission ends in victory after the day 5 check if power, oxygen, food, and water are all above 0 and radiation risk is below 100. A critical resource at 0, or radiation risk at 100, is a defeat. After either ending, further actions and day changes are rejected until restart.

### Checking the mission balance

Advancing without taking any building actions ends the mission on Day 3. One verified route is:

| Day | Actions before End Day |
| --- | --- |
| 1 | Maintain Solar Array and Plant Lettuce |
| 2 | Prepare Radiation Shelter and Care for Crops |
| 3 | Harvest Lettuce and Operate Oxygen System |
| 4 | Maintain Solar Array |
| 5 | End Day with the remaining supplies |

Crop care raises the harvest but uses an action, power, and water. Keep enough power for oxygen production and greenhouse upkeep. The Mission Log keeps the storm forecast, shortage messages, and recovery advice for review.

## Add a building action

1. Put any new balance number in `src/core/constants.js`.
2. Add an action object to `BUILDING_ACTIONS` in `src/core/buildingActions.js`. Give it an `id`, `buildingId`, name, description, costs, effects, and `actionsConsumed`.
3. If the action needs a new rule, teach `assessBuildingAction` that rule before it spends anything.
4. Add a test in `tests/buildingActions.test.js` for the success case and at least one rejection.
5. Run `npm test`.

The building panel lists actions for a building automatically. An invalid action must leave the mission unchanged.

## Colony artwork

The [asset manifest](ASSET_MANIFEST.md) records the five approved PNGs. `src/game/worldAssets.js` defines their texture keys, deployed paths, and sprite framing. `ColonyScene.preload` uses Vite's base URL to load them, and the existing Phaser shapes serve as fallbacks for unavailable textures.

`src/game/scenes/lunarTerrain.js` draws the starfield, lunar shelf, craters, paths, and foundations from deterministic placement. Buildings sort by their ground position. The crew moves directly to each building's approach point and renders above the building layer.

The scene fits a 1280 × 720 canvas. Portrait screens have space above and below the canvas, with the HUD and building sheet still available. When building for a repository subpath, set the Vite base for both the build and the preview:

```bash
npm run build -- --base=/lunar-survival-academy/
npm run preview -- --base=/lunar-survival-academy/
```

## Work together with GitHub

Clone the [team repository](https://github.com/CapsCodes234/lunar-survival-academy). Before editing, pull the latest changes to `main` using `git pull --ff-only`. Create a feature branch, commit, and open a pull request.

Avoid editing the same file at the same time. The interface files and the simulation files are separated so that is easier. See the handoff notes below.

Do not commit `node_modules/` or `dist/`. They are listed in `.gitignore`.

## What is complete

- Vite project, Phaser map, four buildings, and one astronaut.
- Building selection, highlight, and walk-to animation.
- Resource bar, one shared action panel, End Day, and Restart.
- Building actions, including greenhouse planting, crop care, and harvest.
- Daily consumption, the Day 3 radiation warning, victory, defeat, and restart.
- Automated tests for the rules, a winning route, and a failed no-action route.
- Educational guidance in the existing building panels, notifications, and Mission Log.

## What is not finished

- Three active astronauts, pathfinding, and animation frames.
- Integration of a verified NASA source from the official challenge’s Resources list. See [NASA verification status](NASA_SOURCES.md).
- More mission events, tutorials, and sound.

## Which numbers are simplified

Resource costs, rewards, daily consumption, growth times, and radiation risk are fictional gameplay values defined in `src/core/constants.js`. This distinction appears in the building notes and the NASA Science / References view.

## Where NASA references must be added

The official challenge lists DONKI, RadLab, and OSDR. The team still needs to choose a specific archived event or study for the game. Record its title, date, URL, and intended use in [NASA sources](NASA_SOURCES.md), then connect it to the corresponding scenario or facility note.

`AI_DISCLOSURE.md` records the AI assistance used to draft this foundation. Update it if the team uses another tool.
