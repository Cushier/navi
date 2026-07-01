import { PanoData, PanoDataProvider, EquirectangularAdapterConfig, AbstractAdapter, AdapterConstructor, Viewer, PanoramaPosition, Position, TextureData } from '@photo-sphere-viewer/core';
import { Texture, Group } from 'three';

/**
 * Configuration of a tiled panorama
 */
type EquirectangularTilesPanorama = {
    /**
     * low resolution panorama loaded before tiles
     */
    baseUrl?: string;
    /**
     * panoData configuration associated to low resolution panorama loaded before tiles
     */
    basePanoData?: PanoData | PanoDataProvider;
    /**
     * complete panorama width (height is always width/2)
     */
    width: number;
    /**
     * number of vertical tiles (must be a power of 2)
     */
    cols: number;
    /**
     * number of horizontal tiles (must be a power of 2)
     */
    rows: number;
    /**
     * function to build a tile url
     */
    tileUrl: (col: number, row: number) => string | null;
};
type EquirectangularTileLevel = {
    /**
     * @deprecated Not used anymore
     */
    zoomRange?: never;
    /**
     * complete panorama width (height is always width/2)
     */
    width: number;
    /**
     * number of vertical tiles (must be a power of 2)
     */
    cols: number;
    /**
     * number of horizontal tiles (must be a power of 2)
     */
    rows: number;
};
/**
 * Configuration of a tiled panorama with multiple tiles configurations
 */
type EquirectangularMultiTilesPanorama = {
    /**
     * low resolution panorama loaded before tiles
     */
    baseUrl?: string;
    /**
     * panoData configuration associated to low resolution panorama loaded before tiles
     */
    basePanoData?: PanoData | PanoDataProvider;
    /**
     * Configuration of tiles by zoom level
     */
    levels: EquirectangularTileLevel[];
    /**
     * function to build a tile url
     */
    tileUrl: (col: number, row: number, level: number) => string | null;
};
type EquirectangularTilesAdapterConfig = Omit<EquirectangularAdapterConfig, 'interpolateBackground' | 'blur' | 'shader'> & {
    /**
     * shows a warning sign on tiles that cannot be loaded
     * @default true
     */
    showErrorTile?: boolean;
    /**
     * applies a blur effect to the low resolution panorama
     * @default true
     */
    baseBlur?: boolean;
    /**
     * applies antialiasing to high resolutions tiles
     * @default true
     */
    antialias?: boolean;
};
type EquirectangularTilesPanoData = PanoData & {
    baseData: PanoData;
};

type EquirectangularTilesTextureData = TextureData<Texture, EquirectangularTilesPanorama | EquirectangularMultiTilesPanorama, EquirectangularTilesPanoData>;
/**
 * Adapter for tiled panoramas
 */
declare class EquirectangularTilesAdapter extends AbstractAdapter<EquirectangularTilesPanorama | EquirectangularMultiTilesPanorama, EquirectangularTilesPanoData, Texture, Group> {
    static readonly id = "equirectangular-tiles";
    static readonly VERSION: string;
    static readonly supportsDownload = false;
    private readonly NB_VERTICES;
    private readonly NB_GROUPS;
    private readonly config;
    private readonly state;
    private readonly queue;
    static withConfig(config: EquirectangularTilesAdapterConfig): [AdapterConstructor, any];
    constructor(viewer: Viewer, config: EquirectangularTilesAdapterConfig);
    init(): void;
    destroy(): void;
    supportsTransition(panorama: EquirectangularTilesPanorama | EquirectangularMultiTilesPanorama): boolean;
    supportsPreload(panorama: EquirectangularTilesPanorama | EquirectangularMultiTilesPanorama): boolean;
    textureCoordsToSphericalCoords(point: PanoramaPosition, data: EquirectangularTilesPanoData): Position;
    sphericalCoordsToTextureCoords(position: Position, data: EquirectangularTilesPanoData): PanoramaPosition;
    loadTexture(panorama: EquirectangularTilesPanorama | EquirectangularMultiTilesPanorama, loader?: boolean): Promise<EquirectangularTilesTextureData>;
    createMesh(panoData: EquirectangularTilesPanoData): Group;
    /**
     * Applies the base texture and starts the loading of tiles
     */
    setTexture(group: Group, textureData: EquirectangularTilesTextureData, transition: boolean): void;
    setTextureOpacity(group: Group, opacity: number): void;
    disposeTexture({ texture }: EquirectangularTilesTextureData): void;
    disposeMesh(group: Group): void;
    /**
     * Compute visible tiles and load them
     */
    private __refresh;
    /**
     * Loads tiles and change existing tiles priority
     */
    private __loadTiles;
    /**
     * Loads and draw a tile
     */
    private __loadTile;
    /**
     * Applies a new texture to the faces
     */
    private __swapMaterial;
    private __switchMesh;
    /**
     * Clears loading queue, dispose all materials
     */
    private __cleanup;
}

export { type EquirectangularMultiTilesPanorama, type EquirectangularTileLevel, EquirectangularTilesAdapter, type EquirectangularTilesAdapterConfig, type EquirectangularTilesPanoData, type EquirectangularTilesPanorama };
