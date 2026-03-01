import {Scene} from "phaser";
import {configureCamera, updateCameraDeadZone} from "../systems/Camera";
import {createMap, preloadMap} from "../systems/Map";
import {handleTileClick, updateTileOutline} from "../systems/TileInteraction";
import {Character} from "../entities/Character";
import {Crop} from "../entities/Crop";
import {NPC, NpcDefinition} from "../entities/NPC";
import {PlayerCharacter} from "../entities/PlayerCharacter";
import {Shopkeeper} from "../entities/Shopkeeper";
import {UserProfile} from "../UserProfile";
import {generateCards} from '../../ai/mistral.ts';
import {preloadAchievements, registerAchievements} from '../systems/AchievementSystem';
import {feature} from '../feature';
import {restoreState} from '../GameState';

const NPCS: NpcDefinition[] = [
    {
        name: "Luke",
        textureKey: "luke",
        basePath: "assets/Characters/Luke",
        x: 500,
        y: 500,
        speed: 2,
        patrol: [
            {vx: -1, vy: 0, durationMs: 1000},
            {vx: 0, vy: -1, durationMs: 1000},
            {vx: 1, vy: 0, durationMs: 1000},
            {vx: 0, vy: 1, durationMs: 1000},
            {vx: 0, vy: 0, durationMs: 1000},
        ],
    },
];

export class Game extends Scene {
    private tileOutline!: Phaser.GameObjects.Image;
    private baseLayer!: Phaser.Tilemaps.TilemapLayer;
    private tileWidth = 16;
    private tileHeight = 16;

    private player!: PlayerCharacter;
    private npcs: NPC[] = [];
    private activeNpc: NPC | null = null;

    private shopkeeper!: Shopkeeper;
    private activeShopkeeper: Shopkeeper | null = null;

    private userProfile!: UserProfile;

    private debugKey!: Phaser.Input.Keyboard.Key;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private isConversationOpen = false;
    // The DialoguePane (in the Hud scene) can also write conversationOpen=false when
    // the player selects a closing option. This listener lets that trigger a proper
    // close (unpausing characters etc.) without the DialoguePane needing a direct
    // reference to this scene.
    // The _settingFromGame flag prevents a re-entrancy loop: registry.set() fires
    // changedata events synchronously, so without the guard, setConversationOpen()
    // would trigger this listener, which would call setConversationOpen() again, ad infinitum.
    private _settingFromGame = false;

    constructor() {
        super("Game");
    }

    preload() {
        preloadMap(this.load);
        this.load.image('tile-outline', 'assets/UI/outline.png');
        preloadAchievements(this.load);
        Crop.preloadSpritesheet(this.load);
        Character.preloadSpritesheets(this.load, "player", "assets/Characters/Player");
        NPC.preloadAll(this.load, NPCS);
        Shopkeeper.preload(this.load);
    }

    create() {
        const {baseLayer, collisionsLayer, tileWidth, tileHeight, worldWidth, worldHeight} = createMap(this);

        this.baseLayer = baseLayer;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.player = new PlayerCharacter(this, 500, 500);

        // Spawn positions are relative to the map centre; add more entries to NPCS above to add characters.
        this.npcs = NPCS.map(def => new NPC(this, def));
        this.shopkeeper = new Shopkeeper(this, 600, 500);

        this.registry.set("selectedCropType", "strawberry");
        this.registry.set("gold", 0);
        this.registry.set("cropCounts", {strawberry: 5, leek: 0, potato: 0, onion: 0});
        this.registry.set("conversationOpen", false);
        this.registry.set("conversationNpc", null);
        this.registry.set("conversationDialogue", null);
        this.registry.set("shopOpen", false);
        this.registry.set("cropsHarvested", {strawberry: 0, leek: 0, potato: 0, onion: 0});
        this.registry.set("dialogueHistory", []);
        this.registry.set("gameStartedAt", Date.now());
        this.registry.set("npcsTalkedTo", [] as string[]);
        this.registry.set("totalNpcCount", NPCS.length);
        this.registry.set("cardsOpen", false);
        this.registry.set("pendingCards", []);
        this.registry.set("unlockedAchievements", [] as string[]);

        const savedState = restoreState(this.registry);
        if (savedState?.plantedCrops) {
            Crop.restore(this, savedState.plantedCrops);
        }

        this.userProfile = new UserProfile(this);
        registerAchievements(this);

        this.registry.events.on("changedata-conversationOpen", (_: unknown, value: boolean) => {
            if (this._settingFromGame) return;
            if (!value && this.isConversationOpen) this.setConversationOpen(false);
        });

        this.registry.events.on("changedata-shopOpen", (_: unknown, value: boolean) => {
            if (this._settingFromGame) return;
            if (!value && this.isConversationOpen) this.setShopOpen(false);
        });

        if (!this.scene.isActive("Hud")) {
            this.scene.launch("Hud");
        }
        this.scene.bringToTop("Hud");

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        if (collisionsLayer) {
            collisionsLayer.setCollisionByExclusion([-1, 0]);
            this.physics.add.collider(this.player.sprite, collisionsLayer);
            for (const npc of this.npcs) {
                this.physics.add.collider(npc.sprite, collisionsLayer);
            }
            this.physics.add.collider(this.shopkeeper.sprite, collisionsLayer);
        }

        const camera = this.cameras.main;
        configureCamera(camera, this.player.sprite, worldWidth, worldHeight);

        this.tileOutline = this.add.image(0, 0, 'tile-outline');
        this.tileOutline.setOrigin(0, 0);
        this.tileOutline.setDepth(100000);

        this.debugKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            handleTileClick(pointer, this, this.baseLayer, this.player.sprite, this.tileWidth, this.tileHeight, () => this.isConversationOpen);
        });

        this.scale.on(Phaser.Scale.Events.RESIZE, () => {
            updateCameraDeadZone(camera);
        });
    }

    update(_time: number, delta: number) {
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.tryToggleConversation();
        }

        if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
            this.debug();
        }

        feature.onUpdate(this, delta);

        this.player.update(delta);
        for (const npc of this.npcs) {
            npc.update(delta);
        }
        this.shopkeeper.update(delta);
        Crop.updateAll(delta);

        updateTileOutline(this, this.tileOutline, this.player.sprite, this.tileWidth, this.tileHeight);
    }

    private debug() {
        generateCards(this.userProfile.toJSON()).then(cards => {
            console.log(cards);
            this.registry.set("pendingCards", cards);
            this.registry.set("cardsOpen", true);
        });
    }

    private tryToggleConversation() {
        if (this.isConversationOpen) {
            return;
        }

        // Find the nearest interactable character within range.
        let nearestNpc: NPC | null = null;
        let nearestShopkeeper: Shopkeeper | null = null;
        let nearestDist = Infinity;

        for (const npc of this.npcs) {
            const dist = Phaser.Math.Distance.Between(
                this.player.sprite.x, this.player.sprite.y,
                npc.sprite.x, npc.sprite.y
            );
            if (dist <= 24 && dist < nearestDist) {
                nearestNpc = npc;
                nearestShopkeeper = null;
                nearestDist = dist;
            }
        }

        const shopkeeperDist = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y,
            this.shopkeeper.sprite.x, this.shopkeeper.sprite.y
        );
        if (shopkeeperDist <= 24 && shopkeeperDist < nearestDist) {
            nearestShopkeeper = this.shopkeeper;
            nearestNpc = null;
        }

        if (nearestShopkeeper) {
            this.activeShopkeeper = nearestShopkeeper;
            this.setShopOpen(true);
        } else if (nearestNpc) {
            this.activeNpc = nearestNpc;
            this.setConversationOpen(true);
        }
    }

    private setConversationOpen(open: boolean) {
        this.isConversationOpen = open;
        this.player.setPaused(open);
        if (this.activeNpc) {
            this.activeNpc.setPaused(open);
        }
        if (open && this.activeNpc) {
            feature.onNpcTalkStart(this, this.activeNpc.name);
        } else if (!open && this.activeNpc) {
            feature.onConversationEnd(this, this.activeNpc.name);
        }
        if (!open) {
            this.activeNpc = null;
        }
        // Flag must wrap the registry write because changedata fires synchronously
        // inside registry.set() — the listener would otherwise re-enter this method.
        this._settingFromGame = true;
        if (open && this.activeNpc) {
            const npcDef = NPCS.find(d => d.textureKey === this.activeNpc!.textureKey)!;
            const dialogue = this.cache.json.get(NPC.dialogueKey(npcDef));
            // Tell the DialoguePane which NPC we're talking to and supply its dialogue.
            this.registry.set("conversationNpc", {
                name: this.activeNpc.name,
                textureKey: this.activeNpc.textureKey,
            });
            this.registry.set("conversationDialogue", dialogue);
        }
        this.registry.set("conversationOpen", open);
        this._settingFromGame = false;
    }

    private setShopOpen(open: boolean) {
        this.isConversationOpen = open;
        this.player.setPaused(open);
        if (this.activeShopkeeper) {
            this.activeShopkeeper.setPaused(open);
        }
        if (!open) {
            this.activeShopkeeper = null;
        }
        this._settingFromGame = true;
        this.registry.set("shopOpen", open);
        this._settingFromGame = false;
    }
}
