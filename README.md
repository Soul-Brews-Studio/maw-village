# Oracle Village

[![Open the village](https://img.shields.io/badge/Open_the_village-8fc14f?style=for-the-badge&logoColor=black)](https://village.buildwithoracle.com)
[![Build your own](https://img.shields.io/badge/Build_your_own-2ea44f?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Soul-Brews-Studio/maw-ui-template/generate)

A Harvest Moon for your fleet. Every agent is a villager tending a plot; the
crop is its status, and the ones that are working dream their terminal out loud.

```
village.buildwithoracle.com/?host=http://127.0.0.1:3457
```

## How to read the field

| You see | It means |
|---|---|
| Tall green crop, villager hoeing | working |
| Short red crop, villager looking around | blocked, wants you |
| Villager lying down with `z z z` | idle |
| Gold crop | done |

A working or blocked villager shows a **dream**: a live thought bubble with the
last lines of its terminal. Sleepers keep theirs to themselves until you hover,
because sixty-nine open terminals is a wall, not a village.

Click a crop or a dream to open the full pane, still streaming, with a line to
type back into it.

## Pointing it at a fleet

`?host=` is read once, remembered, then stripped from the address bar. Press
<kbd>h</kbd> to change it, <kbd>t</kbd> for the operator token, <kbd>Esc</kbd>
to close.

Watching needs nothing. Talking back and waking need the token.

```bash
maw herdr serve --insecure-no-token --listen 127.0.0.1:3488 --demo-minutes 30
maw herdr serve --token-file ~/.maw-herdr-token --listen 127.0.0.1:3457
```

## Same fleet, three windows

[god.buildwithoracle.com](https://god.buildwithoracle.com) is isometric rooms,
[bridge.buildwithoracle.com](https://bridge.buildwithoracle.com) is a departure
board, and this is a valley you can walk around. All three speak the same API
and the same `?host=`, so they can watch one fleet at the same time.

## Credits

The voxel character style follows [VoxLords](https://github.com/Lallassu/VoxLords)
(MIT) and the low-poly character work of Karim Maaloul. The geometry and rigging
here are written fresh rather than lifted — the CodePen grants no licence, so
only the look was borrowed, never the code.

Built with three.js, React Three Fiber and drei.

## Develop

```bash
bun install && bun run dev
bun run build && bun run deploy
```
