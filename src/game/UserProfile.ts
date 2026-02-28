import { Scene } from "phaser";

type ConversationTurn = { npcText: string; playerChoice: string; timestamp: number };
type ConversationRecord = { npc: string; turns: ConversationTurn[]; startedAt: number };

export type ProfileSnapshot = {
    gold: number;
    timePlayedMs: number;
    npcsTalkedToPercent: string;
    cropsHarvested: Record<string, number>;
    dialogueHistory: ConversationRecord[];
};

export class UserProfile {
    private readonly scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    toJSON(): ProfileSnapshot {
        const npcsTalkedTo = this.scene.registry.get("npcsTalkedTo") as string[];
        const totalNpcCount = this.scene.registry.get("totalNpcCount") as number;

        return {
            gold: this.scene.registry.get("gold") as number,
            timePlayedMs: Date.now() - (this.scene.registry.get("gameStartedAt") as number),
            npcsTalkedToPercent: `${totalNpcCount > 0 ? 100 * npcsTalkedTo.length / totalNpcCount : 0}%`,
            cropsHarvested: { ...this.scene.registry.get("cropsHarvested") },
            dialogueHistory: [...this.scene.registry.get("dialogueHistory")],
        };
    }
}
