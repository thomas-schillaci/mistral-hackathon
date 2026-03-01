export interface MapData {
    baseLayer: Phaser.Tilemaps.TilemapLayer;
    worldLayer: Phaser.Tilemaps.TilemapLayer;
    collisionsLayer: Phaser.Tilemaps.TilemapLayer | undefined;
    tileWidth: number;
    tileHeight: number;
    worldWidth: number;
    worldHeight: number;
}

export function createMap(scene: Phaser.Scene): MapData {
    const map = scene.make.tilemap({key: "map"});
    const tilesetNames = [
        "tiles-grass-summer", "tiles-grass-cliff", "tiles-grass-water",
        "tiles-base-houses", "tiles-blacksmith", "tiles-props-seasons",
        "tiles-soil", "tiles-maple-tree", "tiles-exterior",
        "tiles-picnic", "tiles-well", "tiles-stones", "tiles-carpet",
    ];
    const mapTilesets = tilesetNames
        .map(name => map.addTilesetImage(name, name))
        .filter(Boolean) as Phaser.Tilemaps.Tileset[];

    const layers: Record<string, Phaser.Tilemaps.TilemapLayer> = {};
    map.layers.forEach((layer) => {
        layers[layer.name] = map.createLayer(layer.name, mapTilesets, 0, 0)!;
    });

    return {
        baseLayer: layers.base,
        worldLayer:layers.world,
        collisionsLayer: layers.collisions,
        tileWidth: 16,
        tileHeight: 16,
        worldWidth: 960,
        worldHeight: 560,
    };
}

export function preloadMap(loader: Phaser.Loader.LoaderPlugin): void {
    loader.tilemapTiledJSON("map", "assets/maps/map.tmj");

    loader.image("tiles-grass-summer", "assets/Farm and Tileset/Tileset/Tileset Grass Summer.png");
    loader.image("tiles-grass-cliff", "assets/Farm and Tileset/Tileset/Tileset Grass Cliff Tileset Summer.png");
    loader.image("tiles-grass-water", "assets/Farm and Tileset/Tileset/Tileset Grass Water Summer.png");
    loader.image("tiles-base-houses", "assets/Exterior/Houses/NPCS houses/Base houses.png");
    loader.image("tiles-blacksmith", "assets/Exterior/Houses/NPCS houses/Blacksmith.png");
    loader.image("tiles-props-seasons", "assets/Farm and Tileset/Tileset/ALL props seasons.png");
    loader.image("tiles-soil", "assets/Farm and Tileset/Tileset/Tilled Soil and wet soil.png");
    loader.image("tiles-maple-tree", "assets/Farm and Tileset/Tree/Common/Shadow/Maple Tree.png");
    loader.image("tiles-exterior", "assets/Exterior/Exterior.png");
    loader.image("tiles-picnic", "assets/Exterior/Picnic.png");
    loader.image("tiles-well", "assets/Exterior/Well .png");
    loader.image("tiles-stones", "assets/Farm and Tileset/Props/Beach/Stones.png");
    loader.image("tiles-carpet", "assets/Farm and Tileset/Tileset/carpet.png");
}
