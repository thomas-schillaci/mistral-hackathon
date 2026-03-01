# SOWN — A Self-Writing Farming Game

> Submission for the [Mistral AI Worldwide Hackathon 2026](https://worldwide-hackathon.mistral.ai/) · March 1, 2026

**SOWN** is a top-down farming and relationship simulator built with Phaser 3 + TypeScript. As you play, three Mistral AI agents work in concert to **analyze your playstyle, propose personalized feature cards, and then write and hot-reload new TypeScript gameplay code into the running game — without ever restarting it.**

The game literally rewrites itself around you.

---

## How it works

```
Player plays  →  Profile snapshot  →  Advisor Agent (mistral-medium)
                                            │
                                   3 personalized feature cards
                                            │
                                    Player picks one card
                                            │
                             Coder Agent (codestral) + read_file tool
                                  reads relevant source files
                                  writes feature.ts
                                  TypeScript validated (tsc)
                                  retried up to 5× on errors
                                            │
                               Vite HMR reloads feature.ts live
                                            │
                                  New mechanic is now in the game
```

Three Mistral agents power the loop:

| Agent | Model | Role |
|-------|-------|------|
| **Advisor** | `mistral-medium` · JSON schema · temp 0 | Reads your player profile and generates 3 personalized feature cards (Dominant / Neglected / Wildcard) |
| **Coder** | Codestral · function calling · temp 0 | Receives a card + project snapshot, calls `read_file` on any source it needs, outputs a complete replacement `feature.ts` |
| **Librarian** | `mistral-small` · temp 0 | Summarizes each TypeScript file into a one-line architectural contract used as Coder's context |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/thomas-schillaci/mistral-hackathon.git
cd mistral-hackathon
npm install
```

### 2. Create the three agents on [Mistral Studio](https://console.mistral.ai/agents)

Open `.env.template` — every agent's model, response format, and full system prompt is documented there inline as comments.

**Advisor Agent**
- Model: `mistral-medium-latest`
- Temperature: `0`
- Response format: JSON schema (copy the schema from the comment in `.env.template`)
- System prompt: copy the `Instructions` block under `VITE_AD_AGENT_ID` in `.env.template`

**Coder Agent**
- Model: `codestral-latest`
- Temperature: `0`
- Tools: add a `read_file` function tool with a single `path` string parameter (see schema in `.env.template`)
- System prompt: copy the `Instructions` block under `VITE_CODER_AGENT_ID` in `.env.template`

**Librarian Agent**
- Model: `mistral-small-latest`
- Temperature: `0`
- System prompt: copy the `Instructions` block under `VITE_LIBRARIAN_AGENT_ID` in `.env.template`

### 3. Create `.env.local`

```bash
cp .env.template .env.local
```

Fill in the four values:

```env
VITE_MISTRAL_API_KEY=your_api_key_here
VITE_AD_AGENT_ID=ag:...        # Advisor agent ID from Mistral Studio
VITE_CODER_AGENT_ID=ag:...     # Coder agent ID from Mistral Studio
VITE_LIBRARIAN_AGENT_ID=ag:... # Librarian agent ID from Mistral Studio
```

### 4. Run

```bash
npm run dev
```

Open the URL printed by Vite (default: `http://localhost:5173`).

---

## Gameplay

- **Move** — Arrow keys or WASD
- **Interact / Till soil** — E (near NPCs, crops, or dirt)
- **Hotbar** — 1–4 to select a crop type
- **Shop** — Walk up to the shopkeeper and press E
- **Feature cards** — Appear automatically after reaching milestones. Pick one and watch the game change in real time.

The AI observes your gold, time played, NPCs you've talked to, crops harvested, achievements unlocked, and dialogue history — then tailors three cards specifically to how *you* play.

---

## Architecture

```
src/
  game/
    GameAPI.ts          ← Public surface exposed to LLM-generated code
    GameState.ts        ← Save / restore registry
    UserProfile.ts      ← Serialises player data for the Advisor
    feature.ts          ← Written by the Coder agent at runtime
    feature.ts.template ← Baseline no-op hooks (reset target)
    entities/           ← Player, NPC, Shopkeeper, Crop
    scenes/             ← Game, HUD
    systems/            ← Map, TileInteraction, AchievementSystem, Camera
    ui/                 ← CardPane, DialoguePane, ShopPane, GoldCounter, Hotbar, AchievementPane
vite-plugin-implement.mjs  ← Vite dev-server plugin: /api/analyze + /api/implement endpoints
codebase_index.json        ← Librarian-generated contracts fed to the Coder
```

`feature.ts` exports a single `feature` object with hooks (`onUpdate`, `onCropHarvested`, `onNpcTalkStart`, …). The Coder agent fills these in. Vite's HMR picks up the file change and the new mechanic is live within seconds — no reload needed.

---

## Tech stack

- [Phaser 3](https://phaser.io/) — game engine
- [Vite](https://vitejs.dev/) — bundler + dev server (HMR powers live code injection)
- [Mistral AI SDK](https://www.npmjs.com/package/@mistralai/mistralai) — agent orchestration
- TypeScript — type-checked at injection time (`tsc --noEmit`) to guard against bad generated code

---

## License

MIT
