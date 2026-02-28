import {Scene} from "phaser";
import {Hotbar} from "../ui/Hotbar";
import {GoldCounter} from "../ui/GoldCounter";
import {DialoguePane} from "../ui/DialoguePane";
import {ShopPane} from "../ui/ShopPane";

export class Hud extends Scene {
    private hotbar?: Hotbar;
    private goldCounter?: GoldCounter;
    private dialoguePane?: DialoguePane;
    private shopPane?: ShopPane;

    constructor() {
        super("Hud");
    }

    create(): void {
        this.hotbar = new Hotbar(this);
        this.goldCounter = new GoldCounter(this);
        this.dialoguePane = new DialoguePane(this);
        this.shopPane = new ShopPane(this);
    }

    update(): void {
        this.hotbar?.update();
        this.dialoguePane?.update();
        this.shopPane?.update();
    }
}