import {Scene} from "phaser";
import {TEXT_STYLE} from "./styles";

type DialogueOption = { label: string; next: number | null };
type DialogueLine = { text: string; options: DialogueOption[] };
type ConversationTurn = { npcText: string; playerChoice: string; timestamp: number };
type ConversationRecord = { npc: string; turns: ConversationTurn[]; startedAt: number };

export class DialoguePane {
    static readonly REGISTRY_KEY = "conversationOpen";

    private static readonly PANEL_X = 80;
    private static readonly PANEL_Y = 720;
    private static readonly PANEL_W = 1760;
    private static readonly PANEL_H = 300;
    private static readonly PORTRAIT_X = 164;
    private static readonly PORTRAIT_Y = 800;
    private static readonly PORTRAIT_SCALE = 4;
    private static readonly CONTENT_X = 320;
    private static readonly NAME_Y = 736;
    private static readonly BODY_Y = 800;
    private static readonly OPTIONS_START_Y = 890;
    private static readonly OPTION_GAP = 44;
    private static readonly TEXT_SCALE = 2;
    private static readonly NAME_SCALE = 3;
    private static readonly DEPTH = 200000;
    private static readonly MAX_OPTIONS = 2;

    private readonly scene: Scene;
    private readonly panelBg: Phaser.GameObjects.Graphics;
    private readonly portrait: Phaser.GameObjects.Sprite;
    private readonly nameText: Phaser.GameObjects.Text;
    private readonly bodyText: Phaser.GameObjects.Text;
    private readonly optionTexts: Phaser.GameObjects.Text[];
    private readonly optionHighlight: Phaser.GameObjects.Graphics;

    private readonly upKey: Phaser.Input.Keyboard.Key;
    private readonly zKey: Phaser.Input.Keyboard.Key;
    private readonly wKey: Phaser.Input.Keyboard.Key;
    private readonly downKey: Phaser.Input.Keyboard.Key;
    private readonly sKey: Phaser.Input.Keyboard.Key;
    private readonly enterKey: Phaser.Input.Keyboard.Key;
    private readonly spaceKey: Phaser.Input.Keyboard.Key;
    private readonly eKey: Phaser.Input.Keyboard.Key;
    private readonly escKey: Phaser.Input.Keyboard.Key;

    private script: DialogueLine[] = [];
    private currentLineIndex = 0;
    private selectedOptionIndex = 0;
    private visible = false;
    private currentConversation: ConversationRecord | null = null;

    constructor(scene: Scene) {
        this.scene = scene;

        this.panelBg = scene.add.graphics();
        this.panelBg.setScrollFactor(0).setDepth(DialoguePane.DEPTH);

        this.portrait = scene.add
            .sprite(DialoguePane.PORTRAIT_X, DialoguePane.PORTRAIT_Y, "luke-idle", 0)
            .setScrollFactor(0)
            .setScale(DialoguePane.PORTRAIT_SCALE)
            .setDepth(DialoguePane.DEPTH + 1);

        this.nameText = scene.add
            .text(DialoguePane.CONTENT_X, DialoguePane.NAME_Y, "", {
                ...TEXT_STYLE,
                color: "#f0c070",
            })
            .setScrollFactor(0)
            .setScale(DialoguePane.NAME_SCALE)
            .setDepth(DialoguePane.DEPTH + 2);

        this.bodyText = scene.add
            .text(DialoguePane.CONTENT_X, DialoguePane.BODY_Y, "", {
                ...TEXT_STYLE,
                wordWrap: {width: Math.round(1300 / DialoguePane.TEXT_SCALE)},
            })
            .setScrollFactor(0)
            .setScale(DialoguePane.TEXT_SCALE)
            .setDepth(DialoguePane.DEPTH + 2);

        this.optionHighlight = scene.add.graphics();
        this.optionHighlight.setScrollFactor(0).setDepth(DialoguePane.DEPTH + 2);

        this.optionTexts = Array.from({length: DialoguePane.MAX_OPTIONS}, (_, i) => {
            const text = scene.add
                .text(DialoguePane.CONTENT_X, DialoguePane.OPTIONS_START_Y + i * DialoguePane.OPTION_GAP, "", {
                    ...TEXT_STYLE,
                    color: "#cccccc",
                })
                .setScrollFactor(0)
                .setScale(DialoguePane.TEXT_SCALE)
                .setDepth(DialoguePane.DEPTH + 3)
                .setInteractive({useHandCursor: true});

            text.on("pointerover", () => this.selectOption(i));
            text.on("pointerdown", () => {
                this.selectOption(i);
                this.confirmOption();
            });

            return text;
        });

        this.upKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.zKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.wKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.downKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.sKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.enterKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.eKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.escKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        scene.registry.events.on(
            `changedata-${DialoguePane.REGISTRY_KEY}`,
            this.onRegistryChanged,
            this
        );
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

        this.setAllVisible(false);
    }

    update(): void {
        if (!this.visible) return;

        const optionCount = this.script[this.currentLineIndex].options.length;

        if (Phaser.Input.Keyboard.JustDown(this.upKey) || Phaser.Input.Keyboard.JustDown(this.zKey) || Phaser.Input.Keyboard.JustDown(this.wKey)) {
            this.selectOption((this.selectedOptionIndex - 1 + optionCount) % optionCount);
        }
        if (Phaser.Input.Keyboard.JustDown(this.downKey) || Phaser.Input.Keyboard.JustDown(this.sKey)) {
            this.selectOption((this.selectedOptionIndex + 1) % optionCount);
        }
        if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.confirmOption();
        }
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.scene.registry.set(DialoguePane.REGISTRY_KEY, false);
        }
    }

    private show(): void {
        const npc = this.scene.registry.get("conversationNpc") as { name: string; textureKey: string } | null;
        this.nameText.setText(npc?.name ?? "");
        this.portrait.play(`${npc?.textureKey ?? "luke"}-idle-down`);

        this.script = this.scene.registry.get("conversationDialogue") as DialogueLine[] ?? [];
        this.currentLineIndex = 0;
        this.selectedOptionIndex = 0;
        this.currentConversation = { npc: npc?.name ?? "unknown", turns: [], startedAt: Date.now() };

        this.drawPanel();
        this.goToLine(0);
        this.setAllVisible(true);
        this.visible = true;
    }

    private hide(): void {
        if (this.currentConversation && this.currentConversation.turns.length > 0) {
            const history = [...(this.scene.registry.get("dialogueHistory") as ConversationRecord[])];
            history.push(this.currentConversation);
            this.scene.registry.set("dialogueHistory", history);

            const npcsTalkedTo = this.scene.registry.get("npcsTalkedTo") as string[];
            if (!npcsTalkedTo.includes(this.currentConversation.npc)) {
                this.scene.registry.set("npcsTalkedTo", [...npcsTalkedTo, this.currentConversation.npc]);
            }
        }
        this.currentConversation = null;
        this.setAllVisible(false);
        this.visible = false;
    }

    private goToLine(index: number): void {
        if (index < 0 || index >= this.script.length) {
            console.error(`[DialoguePane] goToLine(${index}) out of bounds (script length: ${this.script.length}). Closing dialogue.`);
            this.scene.registry.set(DialoguePane.REGISTRY_KEY, false);
            return;
        }

        this.currentLineIndex = index;
        this.selectedOptionIndex = 0;

        const line = this.script[index];
        this.bodyText.setText(line.text);

        line.options.forEach((opt, i) => {
            this.optionTexts[i].setText(opt.label).setVisible(true);
        });
        for (let i = line.options.length; i < DialoguePane.MAX_OPTIONS; i++) {
            this.optionTexts[i].setVisible(false);
        }

        this.refreshOptionVisuals();
    }

    private selectOption(index: number): void {
        this.selectedOptionIndex = index;
        this.refreshOptionVisuals();
    }

    private confirmOption(): void {
        const line = this.script[this.currentLineIndex];
        const option = line.options[this.selectedOptionIndex];

        this.currentConversation?.turns.push({
            npcText: line.text,
            playerChoice: option.label,
            timestamp: Date.now(),
        });

        if (option.next === null) {
            this.scene.registry.set(DialoguePane.REGISTRY_KEY, false);
        } else {
            this.goToLine(option.next);
        }
    }

    private refreshOptionVisuals(): void {
        this.optionTexts.forEach((text, i) => {
            text.setStyle({color: i === this.selectedOptionIndex ? "#f0c070" : "#cccccc"});
        });
        this.drawHighlight();
    }

    private drawPanel(): void {
        const {PANEL_X, PANEL_Y, PANEL_W, PANEL_H} = DialoguePane;
        this.panelBg.clear();
        this.panelBg.fillStyle(0x1a1020, 0.93);
        this.panelBg.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
        this.panelBg.lineStyle(2, 0xc8778a, 1);
        this.panelBg.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    }

    private drawHighlight(): void {
        const y = DialoguePane.OPTIONS_START_Y + this.selectedOptionIndex * DialoguePane.OPTION_GAP;
        const rowHeight = DialoguePane.TEXT_SCALE * 10 + 8;
        this.optionHighlight.clear();
        this.optionHighlight.fillStyle(0x3d2040, 0.7);
        this.optionHighlight.fillRoundedRect(
            DialoguePane.CONTENT_X - 8,
            y - 4,
            900,
            rowHeight,
            4
        );
    }

    private setAllVisible(visible: boolean): void {
        this.panelBg.setVisible(visible);
        this.portrait.setVisible(visible);
        this.nameText.setVisible(visible);
        this.bodyText.setVisible(visible);
        this.optionHighlight.setVisible(visible);
        this.optionTexts.forEach(t => t.setVisible(visible));
    }

    private onRegistryChanged(_parent: unknown, value: boolean): void {
        if (value && !this.visible) this.show();
        else if (!value && this.visible) this.hide();
    }

    private destroy(): void {
        this.scene.registry.events.off(
            `changedata-${DialoguePane.REGISTRY_KEY}`,
            this.onRegistryChanged,
            this
        );
        this.panelBg.destroy();
        this.portrait.destroy();
        this.nameText.destroy();
        this.bodyText.destroy();
        this.optionHighlight.destroy();
        this.optionTexts.forEach(t => t.destroy());
    }
}
