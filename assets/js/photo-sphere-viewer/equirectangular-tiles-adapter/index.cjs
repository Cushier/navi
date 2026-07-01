/*!
 * Photo Sphere Viewer / Equirectangular Tiles Adapter 5.14.3
 * @copyright 2015-2026 Damien "Mistic" Sorel
 * @licence MIT (https://opensource.org/licenses/MIT)
 */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  EquirectangularTilesAdapter: () => EquirectangularTilesAdapter
});
module.exports = __toCommonJS(index_exports);

// src/EquirectangularTilesAdapter.ts
var import_core3 = require("@photo-sphere-viewer/core");
var import_three3 = require("three");

// ../shared/Queue.ts
var Task = class {
  constructor(id, priority, fn) {
    this.id = id;
    this.priority = priority;
    this.fn = fn;
    this.status = 1 /* PENDING */;
  }
  start() {
    this.status = 2 /* RUNNING */;
    return this.fn(this).then(
      () => {
        this.status = 4 /* DONE */;
      },
      () => {
        this.status = 5 /* ERROR */;
      }
    );
  }
  cancel() {
    this.status = 3 /* CANCELLED */;
  }
  isCancelled() {
    return this.status === 3 /* CANCELLED */;
  }
};
var Queue = class {
  constructor(concurency = 8) {
    this.concurency = concurency;
    this.runningTasks = {};
    this.tasks = {};
  }
  enqueue(task) {
    this.tasks[task.id] = task;
  }
  clear() {
    Object.values(this.tasks).forEach((task) => task.cancel());
    this.tasks = {};
    this.runningTasks = {};
  }
  setPriority(taskId, priority) {
    const task = this.tasks[taskId];
    if (task) {
      task.priority = priority;
      if (task.status === 0 /* DISABLED */) {
        task.status = 1 /* PENDING */;
      }
    }
  }
  disableAllTasks() {
    Object.values(this.tasks).forEach((task) => {
      task.status = 0 /* DISABLED */;
    });
  }
  start() {
    if (Object.keys(this.runningTasks).length >= this.concurency) {
      return;
    }
    const nextTask = Object.values(this.tasks).filter((task) => task.status === 1 /* PENDING */).sort((a, b) => b.priority - a.priority).pop();
    if (nextTask) {
      this.runningTasks[nextTask.id] = true;
      nextTask.start().then(() => {
        if (!nextTask.isCancelled()) {
          delete this.tasks[nextTask.id];
          delete this.runningTasks[nextTask.id];
          this.start();
        }
      });
      this.start();
    }
  }
};

// ../shared/tiles-utils.ts
var import_core = require("@photo-sphere-viewer/core");
var import_three = require("three");
function buildErrorMaterial() {
  const canvas = new OffscreenCanvas(512, 512);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${canvas.width / 5}px serif`;
  ctx.fillStyle = "#a22";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u26A0", canvas.width / 2, canvas.height / 2);
  return new import_three.MeshBasicMaterial({ map: import_core.utils.createTexture(canvas) });
}
function createWireFrame(geometry) {
  const wireframe = new import_three.WireframeGeometry(geometry);
  const line = new import_three.LineSegments(wireframe);
  line.material.depthTest = false;
  line.material.depthWrite = false;
  line.material.opacity = 0.25;
  line.material.transparent = true;
  return line;
}
var DEBUG_COLORS = ["dodgerblue", "limegreen", "indianred"];
function buildDebugTexture(image, level, id) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = DEBUG_COLORS[level % DEBUG_COLORS.length];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(image, 0, 0);
  const fontSize = image.width / 7;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = "center";
  id.split("\n").forEach((id2, i) => {
    ctx.fillText(id2, image.width / 2, image.height / 2 + fontSize * (0.3 + i));
  });
  return canvas;
}

// src/utils.ts
var import_core2 = require("@photo-sphere-viewer/core");
var import_three2 = require("three");
function isMultiTiles(panorama) {
  return !!panorama.levels;
}
function computeTileConfig(tile, level, data) {
  return {
    ...tile,
    level,
    colSize: tile.width / tile.cols,
    rowSize: tile.width / 2 / tile.rows,
    facesByCol: data.SPHERE_SEGMENTS / tile.cols,
    facesByRow: data.SPHERE_HORIZONTAL_SEGMENTS / tile.rows
  };
}
function getTileConfig(panorama, hFov, vFov, viewerSize, data) {
  let tile;
  let level;
  if (!isMultiTiles(panorama)) {
    level = 0;
    tile = { ...panorama };
  } else {
    if (viewerSize) {
      level = panorama.levels.findIndex((pLevel) => {
        const hResolution = pLevel.width / 360 * hFov;
        const vResolution = pLevel.width / 2 / 180 * vFov;
        return hResolution >= viewerSize.width && vResolution >= viewerSize.height;
      });
      if (level === -1) {
        level = panorama.levels.length - 1;
      }
    } else {
      level = 0;
    }
    tile = panorama.levels[level];
  }
  return computeTileConfig(tile, level, data);
}
function getTileConfigByIndex(panorama, level, data) {
  if (!isMultiTiles(panorama) || !panorama.levels[level]) {
    return null;
  } else {
    return computeTileConfig(panorama.levels[level], level, data);
  }
}
function checkPanoramaConfig(panorama, data) {
  if (typeof panorama !== "object" || !panorama.tileUrl) {
    throw new import_core2.PSVError("Invalid panorama configuration, are you using the right adapter?");
  }
  if (isMultiTiles(panorama)) {
    panorama.levels.forEach((level) => {
      checkTile(level, data);
      if ("zoomRange" in level) {
        import_core2.utils.logWarn('EquirectangularTilesAdapter: "zoomRange" property is deprecated and must be removed');
      }
    });
    panorama.levels.sort((a, b) => a.width - b.width);
  } else {
    checkTile(panorama, data);
  }
}
function checkTile(tile, data) {
  if (!tile.width || !tile.cols || !tile.rows) {
    throw new import_core2.PSVError("Invalid panorama configuration, are you using the right adapter?");
  }
  if (tile.cols > data.SPHERE_SEGMENTS) {
    throw new import_core2.PSVError(`Panorama cols must not be greater than ${data.SPHERE_SEGMENTS}.`);
  }
  if (tile.rows > data.SPHERE_HORIZONTAL_SEGMENTS) {
    throw new import_core2.PSVError(`Panorama rows must not be greater than ${data.SPHERE_HORIZONTAL_SEGMENTS}.`);
  }
  if (!import_three2.MathUtils.isPowerOfTwo(tile.cols) || !import_three2.MathUtils.isPowerOfTwo(tile.rows)) {
    throw new import_core2.PSVError("Panorama cols and rows must be powers of 2.");
  }
}
function getCacheKey(panorama, firstTile) {
  for (let i = 0; i < firstTile.cols; i++) {
    const url = panorama.tileUrl(i, firstTile.rows / 2, firstTile.level);
    if (url) {
      return url;
    }
  }
  return panorama.tileUrl.toString();
}

// src/EquirectangularTilesAdapter.ts
var NB_VERTICES_BY_FACE = 6;
var NB_VERTICES_BY_SMALL_FACE = 3;
var ATTR_UV = "uv";
var ATTR_POSITION = "position";
var ERROR_LEVEL = -1;
function tileId(tile) {
  return `${tile.col}x${tile.row}/${tile.config.level}`;
}
function meshes(group) {
  return group.children;
}
var getConfig = import_core3.utils.getConfigParser({
  resolution: 64,
  showErrorTile: true,
  baseBlur: true,
  antialias: true,
  debug: false,
  useXmpData: false
});
var vertexPosition = new import_three3.Vector3();
var _EquirectangularTilesAdapter = class _EquirectangularTilesAdapter extends import_core3.AbstractAdapter {
  constructor(viewer, config) {
    super(viewer);
    this.state = {
      tileConfig: null,
      tiles: {},
      faces: {},
      geom: null,
      materials: [],
      errorMaterial: null,
      inTransition: false
    };
    this.queue = new Queue();
    this.config = getConfig(config);
    this.adapter = new import_core3.EquirectangularAdapter(this.viewer, {
      shader: false,
      resolution: this.config.resolution,
      blur: this.config.baseBlur
    });
    this.SPHERE_SEGMENTS = this.config.resolution;
    this.SPHERE_HORIZONTAL_SEGMENTS = this.SPHERE_SEGMENTS / 2;
    this.NB_VERTICES = 2 * this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE + (this.SPHERE_HORIZONTAL_SEGMENTS - 2) * this.SPHERE_SEGMENTS * NB_VERTICES_BY_FACE;
    this.NB_GROUPS = this.SPHERE_SEGMENTS * this.SPHERE_HORIZONTAL_SEGMENTS;
    if (this.viewer.config.requestHeaders) {
      import_core3.utils.logWarn(
        'EquirectangularTilesAdapter fallbacks to file loader because "requestHeaders" where provided. Consider removing "requestHeaders" if you experience performances issues.'
      );
    }
  }
  static withConfig(config) {
    return [_EquirectangularTilesAdapter, config];
  }
  init() {
    super.init();
    this.viewer.addEventListener(import_core3.events.TransitionDoneEvent.type, this);
    this.viewer.addEventListener(import_core3.events.PositionUpdatedEvent.type, this);
    this.viewer.addEventListener(import_core3.events.ZoomUpdatedEvent.type, this);
  }
  destroy() {
    this.viewer.removeEventListener(import_core3.events.TransitionDoneEvent.type, this);
    this.viewer.removeEventListener(import_core3.events.PositionUpdatedEvent.type, this);
    this.viewer.removeEventListener(import_core3.events.ZoomUpdatedEvent.type, this);
    this.__cleanup();
    this.state.errorMaterial?.map?.dispose();
    this.state.errorMaterial?.dispose();
    this.adapter.destroy();
    delete this.adapter;
    delete this.state.geom;
    delete this.state.errorMaterial;
    super.destroy();
  }
  /**
   * @internal
   */
  handleEvent(e) {
    switch (e.type) {
      case import_core3.events.PositionUpdatedEvent.type:
      case import_core3.events.ZoomUpdatedEvent.type:
        this.__refresh();
        break;
      case import_core3.events.TransitionDoneEvent.type:
        this.state.inTransition = false;
        if (e.completed) {
          this.__switchMesh(this.viewer.renderer.mesh);
        }
        break;
    }
  }
  supportsTransition(panorama) {
    return !!panorama.baseUrl;
  }
  supportsPreload(panorama) {
    return !!panorama.baseUrl;
  }
  textureCoordsToSphericalCoords(point, data) {
    return this.adapter.textureCoordsToSphericalCoords(point, data);
  }
  sphericalCoordsToTextureCoords(position, data) {
    return this.adapter.sphericalCoordsToTextureCoords(position, data);
  }
  async loadTexture(panorama, loader = true) {
    checkPanoramaConfig(panorama, this);
    const firstTile = getTileConfig(panorama, 0, 0, null, this);
    const panoData = {
      isEquirectangular: true,
      fullWidth: firstTile.width,
      fullHeight: firstTile.width / 2,
      croppedWidth: firstTile.width,
      croppedHeight: firstTile.width / 2,
      croppedX: 0,
      croppedY: 0,
      poseHeading: 0,
      posePitch: 0,
      poseRoll: 0
    };
    if (panorama.baseUrl) {
      const textureData = await this.adapter.loadTexture(panorama.baseUrl, loader, panorama.basePanoData, true);
      return {
        panorama,
        panoData: {
          ...panoData,
          baseData: textureData.panoData
        },
        cacheKey: textureData.cacheKey,
        texture: textureData.texture
      };
    } else {
      return {
        panorama,
        panoData: {
          ...panoData,
          baseData: null
        },
        cacheKey: getCacheKey(panorama, firstTile),
        texture: null
      };
    }
  }
  createMesh(panoData) {
    const baseMesh = this.adapter.createMesh(panoData.baseData ?? panoData);
    const geometry = new import_three3.SphereGeometry(
      import_core3.CONSTANTS.SPHERE_RADIUS,
      this.SPHERE_SEGMENTS,
      this.SPHERE_HORIZONTAL_SEGMENTS,
      -Math.PI / 2
    ).scale(-1, 1, 1).toNonIndexed();
    geometry.clearGroups();
    let i = 0;
    let k = 0;
    for (; i < this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE; i += NB_VERTICES_BY_SMALL_FACE) {
      geometry.addGroup(i, NB_VERTICES_BY_SMALL_FACE, k++);
    }
    for (; i < this.NB_VERTICES - this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE; i += NB_VERTICES_BY_FACE) {
      geometry.addGroup(i, NB_VERTICES_BY_FACE, k++);
    }
    for (; i < this.NB_VERTICES; i += NB_VERTICES_BY_SMALL_FACE) {
      geometry.addGroup(i, NB_VERTICES_BY_SMALL_FACE, k++);
    }
    const materials = [];
    const material = new import_three3.MeshBasicMaterial({
      opacity: 0,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    for (let g = 0; g < this.NB_GROUPS; g++) {
      materials.push(material);
    }
    const tilesMesh = new import_three3.Mesh(geometry, materials);
    tilesMesh.renderOrder = 1;
    const group = new import_three3.Group();
    group.add(baseMesh);
    group.add(tilesMesh);
    return group;
  }
  /**
   * Applies the base texture and starts the loading of tiles
   */
  setTexture(group, textureData, transition) {
    const [baseMesh] = meshes(group);
    if (textureData.texture) {
      this.adapter.setTexture(baseMesh, {
        panorama: textureData.panorama.baseUrl,
        texture: textureData.texture,
        panoData: textureData.panoData.baseData
      });
    } else {
      baseMesh.visible = false;
    }
    if (transition) {
      this.state.inTransition = true;
    } else {
      this.__switchMesh(group);
    }
  }
  setTextureOpacity(group, opacity) {
    const [baseMesh] = meshes(group);
    this.adapter.setTextureOpacity(baseMesh, opacity);
  }
  disposeTexture({ texture }) {
    texture?.dispose();
  }
  disposeMesh(group) {
    const [baseMesh, tilesMesh] = meshes(group);
    baseMesh.geometry.dispose();
    baseMesh.material.dispose();
    tilesMesh.geometry.dispose();
    tilesMesh.material.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
  }
  /**
   * Compute visible tiles and load them
   */
  __refresh() {
    if (!this.state.geom || this.state.inTransition) {
      return;
    }
    const panorama = this.viewer.config.panorama;
    const tileConfig = getTileConfig(panorama, this.viewer.state.hFov, this.viewer.state.vFov, this.viewer.state.size, this);
    const verticesPosition = this.state.geom.getAttribute(ATTR_POSITION);
    const tilesToLoad = {};
    for (let i = 0; i < this.NB_VERTICES; i += 1) {
      vertexPosition.fromBufferAttribute(verticesPosition, i);
      vertexPosition.applyEuler(this.viewer.renderer.sphereCorrection);
      if (this.viewer.renderer.isObjectVisible(vertexPosition)) {
        let segmentIndex;
        if (i < this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE) {
          segmentIndex = Math.floor(i / 3);
        } else if (i < this.NB_VERTICES - this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE) {
          segmentIndex = Math.floor((i / 3 - this.SPHERE_SEGMENTS) / 2) + this.SPHERE_SEGMENTS;
        } else {
          segmentIndex = Math.floor((i - this.NB_VERTICES - this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE) / 3) + this.SPHERE_HORIZONTAL_SEGMENTS * (this.SPHERE_SEGMENTS - 1);
        }
        const segmentRow = Math.floor(segmentIndex / this.SPHERE_SEGMENTS);
        const segmentCol = segmentIndex - segmentRow * this.SPHERE_SEGMENTS;
        let config = tileConfig;
        while (config) {
          const row = Math.floor(segmentRow / config.facesByRow);
          const col = Math.floor(segmentCol / config.facesByCol);
          let angle = vertexPosition.angleTo(this.viewer.state.direction);
          if (row === 0 || row === config.rows - 1) {
            angle *= 2;
          }
          const tile = {
            row,
            col,
            angle,
            config,
            url: null
          };
          const id = tileId(tile);
          if (tilesToLoad[id]) {
            tilesToLoad[id].angle = Math.min(tilesToLoad[id].angle, angle);
            break;
          } else {
            tile.url = panorama.tileUrl(col, row, config.level);
            if (tile.url) {
              tilesToLoad[id] = tile;
              break;
            } else {
              config = getTileConfigByIndex(panorama, config.level - 1, this);
            }
          }
        }
      }
    }
    this.state.tileConfig = tileConfig;
    this.__loadTiles(Object.values(tilesToLoad));
  }
  /**
   * Loads tiles and change existing tiles priority
   */
  __loadTiles(tiles) {
    this.queue.disableAllTasks();
    tiles.forEach((tile) => {
      const id = tileId(tile);
      if (this.state.tiles[id]) {
        this.queue.setPriority(id, tile.angle);
      } else {
        this.state.tiles[id] = true;
        this.queue.enqueue(new Task(id, tile.angle, (task) => this.__loadTile(tile, task)));
      }
    });
    this.queue.start();
  }
  /**
   * Loads and draw a tile
   */
  __loadTile(tile, task) {
    return this.viewer.textureLoader.loadImage(tile.url, null, this.viewer.state.textureData.cacheKey).then((image) => {
      if (!task.isCancelled()) {
        if (this.config.debug) {
          image = buildDebugTexture(image, tile.config.level, tileId(tile));
        }
        const mipmaps = this.config.antialias && tile.config.level > 0;
        const material = new import_three3.MeshBasicMaterial({ map: import_core3.utils.createTexture(image, mipmaps) });
        this.__swapMaterial(tile, material, false);
        this.viewer.needsUpdate();
      }
    }).catch((err) => {
      if (!import_core3.utils.isAbortError(err) && !task.isCancelled() && this.config.showErrorTile) {
        if (!this.state.errorMaterial) {
          this.state.errorMaterial = buildErrorMaterial();
        }
        this.__swapMaterial(tile, this.state.errorMaterial, true);
        this.viewer.needsUpdate();
      }
    });
  }
  /**
   * Applies a new texture to the faces
   */
  __swapMaterial(tile, material, isError) {
    const uvs = this.state.geom.getAttribute(ATTR_UV);
    for (let c = 0; c < tile.config.facesByCol; c++) {
      for (let r = 0; r < tile.config.facesByRow; r++) {
        const faceCol = tile.col * tile.config.facesByCol + c;
        const faceRow = tile.row * tile.config.facesByRow + r;
        const isFirstRow = faceRow === 0;
        const isLastRow = faceRow === this.SPHERE_HORIZONTAL_SEGMENTS - 1;
        let firstVertex;
        if (isFirstRow) {
          firstVertex = faceCol * NB_VERTICES_BY_SMALL_FACE;
        } else if (isLastRow) {
          firstVertex = this.NB_VERTICES - this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE + faceCol * NB_VERTICES_BY_SMALL_FACE;
        } else {
          firstVertex = this.SPHERE_SEGMENTS * NB_VERTICES_BY_SMALL_FACE + (faceRow - 1) * this.SPHERE_SEGMENTS * NB_VERTICES_BY_FACE + faceCol * NB_VERTICES_BY_FACE;
        }
        if (isError && this.state.faces[firstVertex] > ERROR_LEVEL) {
          continue;
        }
        if (this.state.faces[firstVertex] > tile.config.level) {
          continue;
        }
        this.state.faces[firstVertex] = isError ? ERROR_LEVEL : tile.config.level;
        const matIndex = this.state.geom.groups.find((g) => g.start === firstVertex).materialIndex;
        this.state.materials[matIndex] = material;
        const top = 1 - r / tile.config.facesByRow;
        const bottom = 1 - (r + 1) / tile.config.facesByRow;
        const left = c / tile.config.facesByCol;
        const right = (c + 1) / tile.config.facesByCol;
        if (isFirstRow) {
          uvs.setXY(firstVertex, (left + right) / 2, top);
          uvs.setXY(firstVertex + 1, left, bottom);
          uvs.setXY(firstVertex + 2, right, bottom);
        } else if (isLastRow) {
          uvs.setXY(firstVertex, right, top);
          uvs.setXY(firstVertex + 1, left, top);
          uvs.setXY(firstVertex + 2, (left + right) / 2, bottom);
        } else {
          uvs.setXY(firstVertex, right, top);
          uvs.setXY(firstVertex + 1, left, top);
          uvs.setXY(firstVertex + 2, right, bottom);
          uvs.setXY(firstVertex + 3, left, top);
          uvs.setXY(firstVertex + 4, left, bottom);
          uvs.setXY(firstVertex + 5, right, bottom);
        }
      }
    }
    uvs.needsUpdate = true;
  }
  __switchMesh(group) {
    const [, tilesMesh] = meshes(group);
    this.__cleanup();
    this.state.materials = tilesMesh.material;
    this.state.geom = tilesMesh.geometry;
    if (this.config.debug) {
      const wireframe = createWireFrame(this.state.geom);
      this.viewer.renderer.addObject(wireframe);
      this.viewer.renderer.setSphereCorrection(this.viewer.config.sphereCorrection, wireframe);
    }
    setTimeout(() => this.__refresh());
  }
  /**
   * Clears loading queue, dispose all materials
   */
  __cleanup() {
    this.queue.clear();
    this.state.tiles = {};
    this.state.faces = {};
    this.state.materials = [];
    this.state.inTransition = false;
  }
};
_EquirectangularTilesAdapter.id = "equirectangular-tiles";
_EquirectangularTilesAdapter.VERSION = "5.14.3";
_EquirectangularTilesAdapter.supportsDownload = false;
var EquirectangularTilesAdapter = _EquirectangularTilesAdapter;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EquirectangularTilesAdapter
});
//# sourceMappingURL=index.cjs.map