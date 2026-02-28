import { Scene } from "phaser";
import { Character } from "./Character";

export type PatrolStep = { vx: number; vy: number; durationMs: number };

/** Everything about an NPC. Define these once and reuse for both preload and create. */
export type NpcDefinition = {
    name: string;
    /** Key prefix used for textures and animations, e.g. "luke" → "luke-walk" / "luke-idle". */
    textureKey: string;
    /** Asset folder path, e.g. "assets/Characters/Luke". */
    basePath: string;
    x: number;
    y: number;
    speed?: number;
    /** Patrol steps played in a loop. Omit or leave empty to stand idle. */
    patrol?: PatrolStep[];
    /** Cache key for the dialogue JSON (loaded via Phaser loader). Defaults to "<textureKey>-dialogue". */
    dialogueKey?: string;
};

export class NPC extends Character {
    static preloadAll(loader: Phaser.Loader.LoaderPlugin, definitions: NpcDefinition[]): void {
        for (const def of definitions) {
            Character.preloadSpritesheets(loader, def.textureKey, def.basePath);
            const key = def.dialogueKey ?? `${def.textureKey}-dialogue`;
            loader.json(key, `assets/dialogue/${def.textureKey}.json`);
        }
    }

    static dialogueKey(def: NpcDefinition): string {
        return def.dialogueKey ?? `${def.textureKey}-dialogue`;
    }

    readonly name: string;
    readonly textureKey: string;

    private routineElapsedMs = 0;
    private readonly patrol: PatrolStep[];
    private readonly patrolTotalMs: number;

    constructor(scene: Scene, def: NpcDefinition) {
        super(scene, {
            x: def.x,
            y: def.y,
            animationPrefix: def.textureKey,
            walkTextureKey: `${def.textureKey}-walk`,
            idleTextureKey: `${def.textureKey}-idle`,
            speed: def.speed ?? 2,
        });

        this.name = def.name;
        this.textureKey = def.textureKey;
        this.patrol = def.patrol ?? [];
        this.patrolTotalMs = this.patrol.reduce((sum, s) => sum + s.durationMs, 0);
    }

    update(delta: number): void {
        if (this.isPaused() || this.patrol.length === 0) {
            this.applyMovement(0, 0, delta);
            return;
        }

        this.routineElapsedMs = (this.routineElapsedMs + delta) % this.patrolTotalMs;

        let acc = 0;
        for (const step of this.patrol) {
            acc += step.durationMs;
            if (this.routineElapsedMs < acc) {
                this.applyMovement(step.vx, step.vy, delta);
                return;
            }
        }
    }
}
