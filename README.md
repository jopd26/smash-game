# Smash Fighters Online

A Super Smash Bros-style platform fighter playable online via peer-to-peer WebRTC — up to 4 players. Runs entirely in the browser, hosted on GitHub Pages.

## Play

**[Play Online →](https://yourusername.github.io/smash-game)** *(replace with your GitHub Pages URL)*

---

## Controls

| Key | Action |
|-----|--------|
| **W** | Jump / Double Jump |
| **A / D** | Move Left / Right |
| **S** | Fast Fall (air) / Drop through platform (on passthrough platform) |
| **J** | Normal Attack |
| **K** | Special Attack |
| **ESC** | Quit to menu |

### Attack Directions (while pressing attack key)

| Direction + J | Ground | Air |
|---|---|---|
| Neutral | Jab combo (3 hits) | Neutral Air |
| ← / → | Forward Tilt (tap) / Forward Smash (quick flick) | Forward/Back Air |
| ↑ | Up Tilt / Up Smash | Up Air |
| ↓ | Down Tilt / Down Smash | Down Air |
| Running + J | Dash Attack | — |

| Direction + K | Special |
|---|---|
| Neutral | Neutral Special (usually a projectile) |
| ← / → | Side Special (dash attack) |
| ↑ | Up Special (recovery) |
| ↓ | Down Special (powerful/unique) |

---

## Characters

### 🔥 Blaze — Fire Knight
*Balanced fighter. Great all-around stats with fiery offensive power.*
- **Neutral Special**: Fireball — launches a fast fire projectile
- **Side Special**: Fire Dash — lunges forward with a burning tackle
- **Up Special**: Flame Uppercut — rising fire uppercut for recovery
- **Down Special**: Magma Burst — powerful counter-burst (punishes attackers)

### ❄️ Frost — Ice Mage
*Defensive zoner. Slower movement but attacks inflict freeze stacks.*
- **Neutral Special**: Blizzard — slow icy projectile that freezes on hit
- **Side Special**: Ice Dash — sliding icy tackle with freeze
- **Up Special**: Ice Launch — shoots upward on an ice geyser
- **Down Special**: Frozen Field — wide-range area freeze (very powerful, slow startup)

### ⚡ Volt — Thunder Striker
*Fastest character. Quick jabs and lightning-fast movements.*
- **Neutral Special**: Thunderbolt — very fast electric projectile
- **Side Special**: Volt Dash — blazing-fast electric charge
- **Up Special**: Sky Strike — electric upper launcher for recovery
- **Down Special**: Thunder Clap — AoE electric explosion

### 🪨 Terra — Earth Titan
*Heaviest character. Slow but hits like a freight train.*
- **Neutral Special**: Boulder Throw — lobs a heavy gravity-affected boulder
- **Side Special**: Rock Rush — armored charging tackle
- **Up Special**: Rock Launch — launches upward (shorter range, hits hard)
- **Down Special**: Earthquake — screen-shaking quake that hits the entire stage (ground only)

---

## Online Multiplayer

1. **Host**: Click **Host Game** → share the 6-character room code with friends
2. **Join**: Click **Join Game** → enter the host's room code
3. Up to 4 players can join
4. Host clicks **Go to Character Select** when everyone is in
5. Each player selects a character and clicks **Ready!**
6. Game starts automatically once host is ready

> **Note**: Uses PeerJS (WebRTC) for peer-to-peer connections — no server needed! Multiplayer relies on STUN servers from Google. Both players need a modern browser with WebRTC support.

---

## Hosting on GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from branch** → `main` → `/ (root)`
4. Your game will be live at `https://yourusername.github.io/smash-game`

---

## Game Mechanics

- **Damage %**: Takes the place of HP. Higher % = launched farther on hit
- **Stocks**: 3 lives each. Fall off the stage = lose a stock. Last one standing wins
- **Knockback**: Scales with damage %. At 150%+ even weak attacks can KO
- **Smash Attacks**: Quickly flick the direction + J for a powered-up smash attack
- **Invincibility**: Brief invincibility frames on respawn (white flicker)
- **Freeze**: Ice attacks apply freeze stacks — enough stacks briefly paralyze
- **Meteor Smash**: Certain Down Airs spike opponents downward (instant KO off stage)
