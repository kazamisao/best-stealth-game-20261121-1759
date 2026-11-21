[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kazamisao/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kazamisao/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
<sub>Entered on [make.fun](https://make.fun/?ref=kazamisao&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>

# Last Applause

A make.fun `best-stealth-game-20261121-1759` entry: a top-down stealth game
set in a theatre. You are the saboteur. Steal the sealed evidence from the
stage, then slip out the green back door — unseen.

- **Gold-masked guards patrol with vision cones.** Step into a cone in the
  open and suspicion climbs; stand in it too long and you are caught. A
  guard that grows suspicious walks over to investigate what it heard.
- **Cover you can read at a glance.** Prop crates block sight and movement;
  closed velvet curtains block sight but let you slip through. Stage
  spotlights make you easier to spot — cross them only when the guards look
  away.
- **Applaud to disappear.** Press **E** (or click the APPLAUSE strip) and the
  audience erupts: every guard turns to the stage and your footsteps go
  unheard for 3 seconds. The crowd needs 8 seconds before it will clap again.
- **Scenes change.** Every 20 seconds the curtains swing and the spotlights
  move — a hiding place can open or close mid-sneak.
- **Run loudly.** Hold **Shift** to run, but running footsteps carry: a guard
  close enough will come and look.
- **Three acts**, each with its own layout, patrols and spotlights. Clear all
  three for the curtain call.
- **Controls:** WASD / arrows to move, Shift to run, E or click APPLAUSE to
  trigger applause, P pause, M sound, Space / click to start and restart.
- **Sound:** everything is synthesised with WebAudio — no audio files.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only (`game/`), no build step, no network requests.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `makefun-game.ts` library.

Screenshots are staged from the real game (`game/src/shots.js`):
`1-start.png` title, `2-play.png` mid-sneak with vision cones,
`3-applause.png` the applause turning every guard to the stage,
`4-win.png` the act-complete panel.

## License

MIT — see `LICENSE`.
