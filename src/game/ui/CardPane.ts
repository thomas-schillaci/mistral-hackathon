import {Scene} from "phaser";
import {TEXT_STYLE} from "./styles";
import {saveState} from "../GameState";

export interface FeatureCard {
    title: string;
    flavor_text: string;
    description: string;
    game_systems_touched: string[];
}

const CARD_COUNT = 3;

export class CardPane {
    static readonly REGISTRY_KEY = "cardsOpen";

    private static readonly CARD_W = 520;
    private static readonly CARD_H = 760;
    private static readonly CARD_GAP = 60;
    private static readonly CARDS_START_X = 120;
    private static readonly CARDS_Y = 150;

    private static readonly TITLE_SCALE = 3;
    private static readonly FLAVOR_SCALE = 2;
    private static readonly DEPTH = 300000;

    private readonly scene: Scene;
    private readonly overlay: Phaser.GameObjects.Graphics;
    private readonly headerText: Phaser.GameObjects.Text;

    private readonly cardBgs: Phaser.GameObjects.Graphics[] = [];
    private readonly titleTexts: Phaser.GameObjects.Text[] = [];
    private readonly flavorTexts: Phaser.GameObjects.Text[] = [];
    private readonly hitZones: Phaser.GameObjects.Rectangle[] = [];

    private cards: FeatureCard[] = [];
    private selectedIndex = 0;
    private visible = false;

    constructor(scene: Scene) {
        this.scene = scene;

        this.overlay = scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.75);
        this.overlay.fillRect(0, 0, 1920, 1080);
        this.overlay.setScrollFactor(0).setDepth(CardPane.DEPTH);

        this.headerText = scene.add
            .text(960, 55, "Expand your mind...", {...TEXT_STYLE, color: "#f0c070"})
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setScale(4)
            .setDepth(CardPane.DEPTH + 1);

        for (let i = 0; i < CARD_COUNT; i++) {
            const cx = CardPane.CARDS_START_X + i * (CardPane.CARD_W + CardPane.CARD_GAP);
            const cy = CardPane.CARDS_Y;

            const bg = scene.add.graphics().setScrollFactor(0).setDepth(CardPane.DEPTH + 1);
            this.cardBgs.push(bg);

            this.titleTexts.push(
                scene.add
                    .text(cx + 20, cy + 20, "", {
                        ...TEXT_STYLE,
                        color: "#f0c070",
                        wordWrap: {width: Math.round((CardPane.CARD_W - 40) / CardPane.TITLE_SCALE)},
                    })
                    .setScrollFactor(0)
                    .setScale(CardPane.TITLE_SCALE)
                    .setDepth(CardPane.DEPTH + 2)
            );

            this.flavorTexts.push(
                scene.add
                    .text(cx + 20, cy + 110, "", {
                        ...TEXT_STYLE,
                        color: "#c8a8d0",
                        wordWrap: {width: Math.round((CardPane.CARD_W - 40) / CardPane.FLAVOR_SCALE)},
                    })
                    .setScrollFactor(0)
                    .setScale(CardPane.FLAVOR_SCALE)
                    .setDepth(CardPane.DEPTH + 2)
            );

            const hz = scene.add
                .rectangle(
                    cx + CardPane.CARD_W / 2,
                    cy + CardPane.CARD_H / 2,
                    CardPane.CARD_W,
                    CardPane.CARD_H
                )
                .setScrollFactor(0)
                .setDepth(CardPane.DEPTH + 3)
                .setAlpha(0.001)
                .setInteractive({useHandCursor: true});
            hz.on("pointerover", () => this.selectCard(i));
            hz.on("pointerdown", () => {
                this.selectCard(i);
                this.confirm();
            });
            this.hitZones.push(hz);
        }

        scene.registry.events.on(`changedata-${CardPane.REGISTRY_KEY}`, this.onRegistryChanged, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

        this.setAllVisible(false);
    }

    private show(): void {
        this.cards = (this.scene.registry.get("pendingCards") as FeatureCard[]) ?? [];
        this.selectedIndex = 0;

        for (let i = 0; i < CARD_COUNT; i++) {
            const card = this.cards[i];
            if (!card) continue;
            this.titleTexts[i].setText(card.title);
            const titleBottom = CardPane.CARDS_Y + 20 + this.titleTexts[i].height * CardPane.TITLE_SCALE;
            this.flavorTexts[i].setY(titleBottom + 16);
            this.flavorTexts[i].setText(card.flavor_text);
        }

        this.drawCards();
        this.setAllVisible(true);
        this.visible = true;
    }

    private hide(): void {
        this.setAllVisible(false);
        this.visible = false;
    }

    private selectCard(index: number): void {
        this.selectedIndex = index;
        this.drawCards();
    }

    private confirm(): void {
        saveState(this.scene.registry);
        this.scene.registry.set(CardPane.REGISTRY_KEY, false);
        fetch('/api/implement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cards[this.selectedIndex]),
        }).then(res => {
            if (!res.ok) {
                res.json().then(body => console.error('[IMPLEMENT] Server error:', body)).catch(() => {});
                console.error(`[IMPLEMENT] Request failed with status ${res.status}`);
            }
        }).catch(err => console.error('[IMPLEMENT] Network error:', err));
    }

    private drawCards(): void {
        for (let i = 0; i < CARD_COUNT; i++) {
            const cx = CardPane.CARDS_START_X + i * (CardPane.CARD_W + CardPane.CARD_GAP);
            const cy = CardPane.CARDS_Y;
            const sel = i === this.selectedIndex;

            this.cardBgs[i].clear();
            this.cardBgs[i].fillStyle(sel ? 0x2a1a30 : 0x1a1020, sel ? 0.98 : 0.85);
            this.cardBgs[i].fillRoundedRect(cx, cy, CardPane.CARD_W, CardPane.CARD_H, 8);
            this.cardBgs[i].lineStyle(sel ? 3 : 1, sel ? 0xf0c070 : 0x6a4070, 1);
            this.cardBgs[i].strokeRoundedRect(cx, cy, CardPane.CARD_W, CardPane.CARD_H, 8);
        }
    }

    private setAllVisible(visible: boolean): void {
        this.overlay.setVisible(visible);
        this.headerText.setVisible(visible);
        for (let i = 0; i < CARD_COUNT; i++) {
            this.cardBgs[i].setVisible(visible);
            this.titleTexts[i].setVisible(visible);
            this.flavorTexts[i].setVisible(visible);
            this.hitZones[i].setVisible(visible);
        }
    }

    private onRegistryChanged(_parent: unknown, value: boolean): void {
        if (value && !this.visible) this.show();
        else if (!value && this.visible) this.hide();
    }

    private destroy(): void {
        this.scene.registry.events.off(`changedata-${CardPane.REGISTRY_KEY}`, this.onRegistryChanged, this);
        this.overlay.destroy();
        this.headerText.destroy();
        for (let i = 0; i < CARD_COUNT; i++) {
            this.cardBgs[i].destroy();
            this.titleTexts[i].destroy();
            this.flavorTexts[i].destroy();
            this.hitZones[i].destroy();
        }
    }
}
