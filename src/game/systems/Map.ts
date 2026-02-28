export interface MapData {
    baseLayer: Phaser.Tilemaps.TilemapLayer;
    collisionsLayer: Phaser.Tilemaps.TilemapLayer | undefined;
    tileWidth: number;
    tileHeight: number;
    worldWidth: number;
    worldHeight: number;
}

export function createMap(scene: Phaser.Scene): MapData {
    const map = scene.make.tilemap({key: "map"});
    const sv2Tiles = map.addTilesetImage("SV2", "tiles-sv2");
    const houseTiles = map.addTilesetImage("House", "tiles-house");
    const mapTilesets = [sv2Tiles!, houseTiles!];
    const layers: Record<string, Phaser.Tilemaps.TilemapLayer> = {};

    map.layers.forEach((layer) => {
        layers[layer.name] = map.createLayer(layer.name, mapTilesets, 0, 0)!;
    });

    const worldWidthTiles = map.layers.reduce((max, l) => Math.max(max, l.width), map.width);
    const worldHeightTiles = map.layers.reduce((max, l) => Math.max(max, l.height), map.height);
    const worldWidth = worldWidthTiles * map.tileWidth;
    const worldHeight = worldHeightTiles * map.tileHeight;

    return {
        baseLayer: layers.Base,
        collisionsLayer: layers.Collisions,
        tileWidth: map.tileWidth,
        tileHeight: map.tileHeight,
        worldWidth,
        worldHeight,
    };
}

export function preloadMap(loader: Phaser.Loader.LoaderPlugin): void {
    loader.tilemapTiledJSON("map", "assets/maps/map.tmj");
    loader.image("tiles-sv2", "assets/Tileset/Tileset Spring.png");
    loader.image("tiles-house", "assets/Objects/House.png");
}
