import {Scene} from "phaser";
import {Hotbar} from "../ui/Hotbar";
import {GoldCounter} from "../ui/GoldCounter";
import {DialoguePane} from "../ui/DialoguePane";
import {ShopPane} from "../ui/ShopPane";
import {CardPane} from "../ui/CardPane";
import {AchievementPane, Achievement} from "../ui/AchievementPane";
import {TutorialPane} from "../ui/TutorialPane";

export class Hud extends Scene {
    private hotbar?: Hotbar;
    private goldCounter?: GoldCounter;
    private dialoguePane?: DialoguePane;
    private shopPane?: ShopPane;
    private cardPane?: CardPane;
    private achievementPane?: AchievementPane;
    private tutorialPane?: TutorialPane;

    constructor() {
        super("Hud");
    }

    create(): void {
        this.hotbar = new Hotbar(this);
        this.goldCounter = new GoldCounter(this);
        this.dialoguePane = new DialoguePane(this);
        this.shopPane = new ShopPane(this);
        this.cardPane = new CardPane(this);
        const achievements = (this.cache.json.get("achievements") ?? []) as Achievement[];
        this.achievementPane = new AchievementPane(this, achievements);
        this.tutorialPane = new TutorialPane(this);
    }

    update(): void {
        this.hotbar?.update();
        this.dialoguePane?.update();
        this.shopPane?.update();
    }
}