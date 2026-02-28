import {Scene} from "phaser";

export type Facing = "down" | "side" | "up";

type CharacterConfig = {
    x: number;
    y: number;
    animationPrefix: string;
    walkTextureKey: string;
    idleTextureKey: string;
    speed: number;
};

export abstract class Character {
    static preloadSpritesheets(
        loader: Phaser.Loader.LoaderPlugin,
        keyPrefix: string,
        basePath: string
    ): void {
        loader.spritesheet(`${keyPrefix}-walk`, `${basePath}/Walk.png`, {
            frameWidth: 32,
            frameHeight: 32,
            endFrame: 17,
        });

        loader.spritesheet(`${keyPrefix}-idle`, `${basePath}/Idle.png`, {
            frameWidth: 32,
            frameHeight: 32,
            endFrame: 11,
        });
    }

    protected readonly scene: Scene;
    protected readonly animationPrefix: string;
    protected readonly speed: number;
    protected facing: Facing = "down";
    protected readonly actor: Phaser.Physics.Arcade.Sprite;
    private paused = false;

    constructor(scene: Scene, config: CharacterConfig) {
        this.scene = scene;
        this.animationPrefix = config.animationPrefix;
        this.speed = config.speed;

        this.ensureAnimations(config.animationPrefix, config.walkTextureKey, config.idleTextureKey);

        this.actor = scene.physics.add.sprite(config.x, config.y, config.idleTextureKey, 0);
        this.actor.setOrigin(0.5, 0.5);
        this.actor.setCollideWorldBounds(true);
        this.actor.body!.setSize(12, 10, true);
        this.syncDepthToFeet();
        this.actor.play(`${this.animationPrefix}-idle-down`);
    }

    get sprite(): Phaser.Physics.Arcade.Sprite {
        return this.actor;
    }

    setPaused(paused: boolean): void {
        this.paused = paused;
        if (paused) {
            this.actor.setVelocity(0, 0);
            this.playForState(false);
        }
    }

    protected isPaused(): boolean {
        return this.paused;
    }

    abstract update(delta: number): void;

    protected applyMovement(vx: number, vy: number, dt: number): void {
        if (this.paused) {
            this.actor.setVelocity(0, 0);
            this.playForState(false);
            this.syncDepthToFeet();
            return;
        }

        const moving = vx !== 0 || vy !== 0;

        if (moving) {
            this.actor.setVelocity(vx * dt * this.speed, vy * dt * this.speed);
            this.facing = this.resolveFacing(vx, vy, this.facing);
        } else {
            this.actor.setVelocity(0, 0);
        }

        this.playForState(moving);
        this.syncDepthToFeet();
    }

    private syncDepthToFeet(): void {
        this.actor.setDepth(this.actor.y + this.actor.displayHeight * 0.5 - 1);
    }

    private resolveFacing(vx: number, vy: number, current: Facing): Facing {
        if (Math.abs(vx) > Math.abs(vy)) {
            this.actor.setFlipX(vx < 0);
            return "side";
        }

        if (vy < 0) {
            this.actor.setFlipX(false);
            return "up";
        }

        if (vy > 0) {
            this.actor.setFlipX(false);
            return "down";
        }

        return current;
    }

    private playForState(moving: boolean): void {
        const state = moving ? "walk" : "idle";
        this.actor.play(`${this.animationPrefix}-${state}-${this.facing}`, true);
    }

    private ensureAnimations(prefix: string, walkTextureKey: string, idleTextureKey: string): void {
        if (!this.scene.anims.exists(`${prefix}-walk-down`)) {
            this.scene.anims.create({
                key: `${prefix}-walk-down`,
                frames: this.scene.anims.generateFrameNumbers(walkTextureKey, {start: 0, end: 5}),
                frameRate: 10,
                repeat: -1,
            });
        }

        if (!this.scene.anims.exists(`${prefix}-walk-side`)) {
            this.scene.anims.create({
                key: `${prefix}-walk-side`,
                frames: this.scene.anims.generateFrameNumbers(walkTextureKey, {start: 12, end: 17}),
                frameRate: 10,
                repeat: -1,
            });
        }

        if (!this.scene.anims.exists(`${prefix}-walk-up`)) {
            this.scene.anims.create({
                key: `${prefix}-walk-up`,
                frames: this.scene.anims.generateFrameNumbers(walkTextureKey, {start: 6, end: 11}),
                frameRate: 10,
                repeat: -1,
            });
        }

        if (!this.scene.anims.exists(`${prefix}-idle-down`)) {
            this.scene.anims.create({
                key: `${prefix}-idle-down`,
                frames: this.scene.anims.generateFrameNumbers(idleTextureKey, {start: 0, end: 3}),
                frameRate: 3,
                repeat: -1,
            });
        }

        if (!this.scene.anims.exists(`${prefix}-idle-side`)) {
            this.scene.anims.create({
                key: `${prefix}-idle-side`,
                frames: this.scene.anims.generateFrameNumbers(idleTextureKey, {start: 8, end: 11}),
                frameRate: 3,
                repeat: -1,
            });
        }

        if (!this.scene.anims.exists(`${prefix}-idle-up`)) {
            this.scene.anims.create({
                key: `${prefix}-idle-up`,
                frames: this.scene.anims.generateFrameNumbers(idleTextureKey, {start: 4, end: 7}),
                frameRate: 3,
                repeat: -1,
            });
        }
    }
}