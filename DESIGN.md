# Oracle Village — design

## World
Broad daylight in a farming valley. god is a dark room and Bridge is a dark
board, so this one is deliberately the opposite: somewhere you would want to
stand, not a console you monitor.

## The one mapping
Status is the crop, and nothing else has to be learned:

| status | crop | villager |
|---|---|---|
| working | tall, green, swaying | hoeing, body dipping into each swing |
| blocked | short, red, wilted | upright, arms out, looking around |
| idle | sprouted, pale green | lying down, breathing, `z z z` |
| done | gold | asleep |

## Dreams
A thought bubble with a real terminal in it, floating over the villager's head.
Shown unasked for working and blocked panes — the ones you are most likely to
want — and on hover for everyone else.

The server streams at most sixteen previews, so the budget is spent on exactly
those: the busy, the stuck, the hovered, and the open one.

## Characters
Voxel, every part a box, nothing smoothed, chunky proportions. Each villager is
rigged with real joints — hips, shoulders, neck — because a capsule cannot show
the difference between hoeing and sleeping, and that difference is the whole
interface. Hat colour is the engine: claude, codex, gemini and the rest each get
their own, with a deterministic fallback so an unknown engine still reads.

## Palette
Sky `#bfe3f0`, grass `#8fc14f`, soil `#8d6248`, paper `#fdf6e6`, wood `#a9754a`.
Crops: working `#5fbf4a`, blocked `#e05b3c`, idle `#9fd17a`, done `#f0c24b`.

## Camera
Orthographic in feel, never tumbling past the horizon — a village has an up.
It reframes itself to fit the whole valley whenever the fleet changes size, then
leaves the operator's panning alone.

## Type
Silkscreen for the interface, JetBrains Mono for anything a terminal produced.
