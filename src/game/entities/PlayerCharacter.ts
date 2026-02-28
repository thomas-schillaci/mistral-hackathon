import { Scene } from "phaser";
import { Character } from "./Character";

export class PlayerCharacter extends Character {
    private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private readonly keys: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        Z: Phaser.Input.Keyboard.Key;
        Q: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    constructor(scene: Scene, x: number, y: number) {
        super(scene, {
            x,
            y,
            animationPrefix: "player",
            walkTextureKey: "player-walk",
            idleTextureKey: "player-idle",
            speed: 6,
        });

        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.keys = scene.input.keyboard!.addKeys("W,A,Z,Q,S,D") as {
            W: Phaser.Input.Keyboard.Key;
            A: Phaser.Input.Keyboard.Key;
            Z: Phaser.Input.Keyboard.Key;
            Q: Phaser.Input.Keyboard.Key;
            S: Phaser.Input.Keyboard.Key;
            D: Phaser.Input.Keyboard.Key;
        };
    }

    update(delta: number): void {
        if (this.isPaused()) {
            this.applyMovement(0, 0, delta);
            return;
        }

        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.keys.A.isDown || this.keys.Q.isDown) {
            vx = -1;
        } else if (this.cursors.right.isDown || this.keys.D.isDown) {
            vx = 1;
        }

        if (this.cursors.up.isDown || this.keys.W.isDown || this.keys.Z.isDown) {
            vy = -1;
        } else if (this.cursors.down.isDown || this.keys.S.isDown) {
            vy = 1;
        }

        this.applyMovement(vx, vy, delta);
    }
}