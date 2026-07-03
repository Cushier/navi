import { Point, Position, Size, ExtendedPosition, AbstractConfigurablePlugin, utils, Viewer, TypedEvent } from '@photo-sphere-viewer/core';
import { ColorRepresentation, Group } from 'three';

/**
 * Custom Web Component interface for `element` markers
 */
interface MarkerElement extends HTMLElement {
    updateMarker?(params: {
        marker: Marker;
        position: Point;
        viewerPosition: Position;
        zoomLevel: number;
        viewerSize: Size;
    }): void;
}
/**
 * Configuration of a marker
 */
type MarkerConfig = {
    /**
     * Path to an image
     */
    image?: string;
    /**
     * Path to an image
     */
    imageLayer?: string;
    /**
     * Path to a video
     */
    videoLayer?: string;
    /**
     * HTML content of the marker
     */
    html?: string;
    /**
     * Exiting DOM element
     */
    element?: MarkerElement;
    /**
     * Size of the square
     */
    square?: number;
    /**
     * Size of the rectangle
     */
    rect?: [number, number] | {
        width: number;
        height: number;
    };
    /**
     * Radius of the circle
     */
    circle?: number;
    /**
     * Radiuses of the ellipse
     */
    ellipse?: [number, number] | {
        rx: number;
        ry: number;
    };
    /**
     * Definition of the path
     */
    path?: string;
    /**
     * Array of points defining the polygon in spherical coordinates
     */
    polygon?: [number, number][] | [number, number][][] | [string, string][] | [string, string][][];
    /**
     * Array of points defining the polygon in pixel coordinates on the panorama image
     */
    polygonPixels?: [number, number][] | [number, number][][];
    /**
     * Array of points defining the polyline in spherical coordinates
     */
    polyline?: [number, number][] | [string, string][] | number[] | string[];
    /**
     * Array of points defining the polyline in pixel coordinates on the panorama image
     */
    polylinePixels?: [number, number][] | number[];
    /**
     * Unique identifier of the marker
     */
    id: string;
    /**
     * Position of the marker (required but for `polygon` and `polyline`)
     * The array form is used for `imageLayer` and `videoLayer`
     */
    position?: ExtendedPosition | [ExtendedPosition, ExtendedPosition, ExtendedPosition, ExtendedPosition];
    /**
     * Size of the marker (required for `image`, recommended for `html`, ignored for others)
     */
    size?: Size;
    /**
     * Rotation applied to the marker (ignored for `polygon` and `polyline`)
     */
    rotation?: string | number;
    /**
     * Applies a perspective on the image to make it look like placed on the floor or on a wall (only for `imageLayer`)
     */
    orientation?: 'front' | 'horizontal' | 'vertical-left' | 'vertical-right';
    /**
     * Configures the scale of the marker depending on the zoom level and/or the horizontal offset (ignored for `polygon`, `polyline`, `imageLayer`, `videoLayer`)
     */
    scale?: [number, number] | {
        zoom?: [number, number];
        yaw?: [number, number];
    } | ((zoomLevel: number, position: Position) => number);
    /**
     * Overrides the global `defaultHoverScale`
     * @default null
     */
    hoverScale?: boolean | number | {
        amount?: number;
        duration?: number;
        easing?: string;
    };
    /**
     * Opacity of the marker
     * @default 1
     */
    opacity?: number;
    /**
     * Drawing order
     * @default 1
     */
    zIndex?: number;
    /**
     * CSS class(es) added to the marker element (ignored for `imageLayer`, `videoLayer`)
     */
    className?: string;
    /**
     * CSS properties to set on the marker (background, border, etc.) (ignored for `imagerLayer`, `videoLayer`)
     */
    style?: Record<string, string>;
    /**
     * SVG properties to set on the marker (fill, stroke, etc.) (only for SVG markers)
     */
    svgStyle?: Record<string, string>;
    /**
     * Will make a color of the image/video transparent (only for `imagerLayer`, `videoLayer`)
     */
    chromaKey?: {
        /** @default false */
        enabled: boolean;
        /** @default 0x00ff00 */
        color?: ColorRepresentation | {
            r: number;
            g: number;
            b: number;
        };
        /** @default 0.2 */
        similarity?: number;
        /** @default 0.2 */
        smoothness?: number;
    };
    /**
     * Defines where the marker is placed toward its defined position
     * @default 'center center'
     */
    anchor?: string;
    /**
     * The zoom level which will be applied when calling `gotoMarker()` method or when clicking on the marker in the list
     * @default `current zoom level`
     */
    zoomLvl?: number;
    /**
     * Initial visibility of the marker
     * @default true
     */
    visible?: boolean;
    /**
     * Configuration of the marker tooltip
     * @default `{content: null, position: 'top center', className: null, trigger: 'hover'}`
     */
    tooltip?: string | {
        content: string;
        position?: string;
        className?: string;
        trigger?: 'hover' | 'click';
    };
    /**
     * HTML content that will be displayed on the side panel when the marker is clicked
     */
    content?: string;
    /**
     * The name that appears in the list of markers
     * @default `tooltip.content`
     */
    listContent?: string;
    /**
     * Hide the marker in the markers list
     * @default false
     */
    hideList?: boolean;
    /**
     * Autoplay of `videoLayer` markers
     * @default true
     */
    autoplay?: boolean;
    /**
     * Any custom data you want to attach to the marker
     */
    data?: any;
};
type ParsedMarkerConfig = Omit<MarkerConfig, 'rotation' | 'scale' | 'tooltip' | 'hoverScale'> & {
    rotation?: number;
    scale?: {
        zoom?: [number, number];
        yaw?: [number, number];
    } | ((zoomLevel: number, position: Position) => number);
    tooltip?: {
        content: string;
        position?: string;
        className?: string;
        trigger?: 'hover' | 'click';
    };
    hoverScale?: {
        amount: number;
        duration: number;
        easing: string;
    };
};
type MarkersPluginConfig = {
    /**
     * If a `click` event is triggered on the viewer additionally to the `select-marker` event
     * @default false
     */
    clickEventOnMarker?: boolean;
    /**
     * initial markers
     */
    markers?: MarkerConfig[];
    /**
     * Default animation speed for {@link MarkersPlugin#gotoMarker}
     * @default '8rpm'
     */
    gotoMarkerSpeed?: string | number;
    /**
     * Default mouse hover scaling parameters applied to all markers
     * (`true` = `{ amount: 2, duration: 100, easing: 'linear' }`)
     * @default null
     */
    defaultHoverScale?: boolean | number | {
        amount?: number;
        duration?: number;
        easing?: string;
    };
};
type ParsedMarkersPluginConfig = Omit<MarkersPluginConfig, 'defaultHoverScale'> & {
    defaultHoverScale?: {
        amount: number;
        duration: number;
        easing: string;
    };
};
type UpdatableMarkersPluginConfig = Omit<MarkersPluginConfig, 'markers'>;

declare enum MarkerType {
    image = "image",
    html = "html",
    element = "element",
    imageLayer = "imageLayer",
    videoLayer = "videoLayer",
    polygon = "polygon",
    polygonPixels = "polygonPixels",
    polyline = "polyline",
    polylinePixels = "polylinePixels",
    square = "square",
    rect = "rect",
    circle = "circle",
    ellipse = "ellipse",
    path = "path"
}

/**
 * Displays various markers on the viewer
 */
declare class MarkersPlugin extends AbstractConfigurablePlugin<MarkersPluginConfig, ParsedMarkersPluginConfig, UpdatableMarkersPluginConfig, MarkersPluginEvents> {
    static readonly id = "markers";
    static readonly VERSION: string;
    static readonly configParser: utils.ConfigParser<MarkersPluginConfig, ParsedMarkersPluginConfig>;
    static readonly readonlyOptions: Array<keyof MarkersPluginConfig>;
    private readonly markers;
    private readonly state;
    private readonly container;
    private readonly svgContainer;
    constructor(viewer: Viewer, config: MarkersPluginConfig);
    /**
     * Toggles all markers
     */
    toggleAllMarkers(): void;
    /**
     * Shows all markers
     */
    showAllMarkers(): void;
    /**
     * Hides all markers
     */
    hideAllMarkers(): void;
    /**
     * Toggles the visibility of all tooltips
     */
    toggleAllTooltips(): void;
    /**
     *  Displays all tooltips
     */
    showAllTooltips(): void;
    /**
     * Hides all tooltips
     */
    hideAllTooltips(): void;
    /**
     * Returns the total number of markers
     */
    getNbMarkers(): number;
    /**
     * Returns all the markers
     */
    getMarkers(): Marker[];
    /**
     * Adds a new marker to viewer
     * @throws {@link PSVError} when the marker's id is missing or already exists
     */
    addMarker(config: MarkerConfig, render?: boolean): void;
    /**
     * Returns the internal marker object for a marker id
     * @throws {@link PSVError} when the marker cannot be found
     */
    getMarker(markerId: string | MarkerConfig): Marker;
    /**
     * Returns the last marker selected by the user
     */
    getCurrentMarker(): Marker;
    /**
     * Updates the existing marker with the same id
     * @description Every property can be changed but you can't change its type (Eg: `image` to `html`)
     */
    updateMarker(config: MarkerConfig, render?: boolean): void;
    /**
     * Removes a marker from the viewer
     */
    removeMarker(markerId: string | MarkerConfig, render?: boolean): void;
    /**
     * Removes multiple markers
     */
    removeMarkers(markerIds: string[], render?: boolean): void;
    /**
     * Replaces all markers
     */
    setMarkers(markers: MarkerConfig[], render?: boolean): void;
    /**
     * Removes all markers
     */
    clearMarkers(render?: boolean): void;
    /**
     * Rotate the view to face the marker
     */
    gotoMarker(markerId: string | MarkerConfig, speed?: string | number): Promise<void>;
    /**
     * Hides a marker
     */
    hideMarker(markerId: string | MarkerConfig): void;
    /**
     * Shows a marker
     */
    showMarker(markerId: string | MarkerConfig): void;
    /**
     * Forces the display of the tooltip of a marker
     */
    showMarkerTooltip(markerId: string | MarkerConfig): void;
    /**
     * Hides the tooltip of a marker
     */
    hideMarkerTooltip(markerId: string | MarkerConfig): void;
    /**
     * Toggles a marker visibility
     */
    toggleMarker(markerId: string | MarkerConfig, visible?: boolean): void;
    /**
     * Opens the panel with the content of the marker
     */
    showMarkerPanel(markerId: string | MarkerConfig): void;
    /**
     * Closes the panel if currently showing the content of a marker
     */
    hideMarkerPanel(): void;
    /**
     * Toggles the visibility of the list of markers
     */
    toggleMarkersList(): void;
    /**
     * Opens side panel with the list of markers
     */
    showMarkersList(): void;
    /**
     * Closes side panel if it contains the list of markers
     */
    hideMarkersList(): void;
    /**
     * Updates the visibility and the position of all markers
     */
    renderMarkers(): void;
    /**
     * Returns the marker associated to an event target
     */
    private __getTargetMarker;
    /**
     * Handles mouse enter events, show the tooltip for non polygon markers
     */
    private __onEnterMarker;
    /**
     * Handles mouse leave events, hide the tooltip
     */
    private __onLeaveMarker;
    /**
     * Handles mouse move events, refresh the tooltip for polygon markers
     */
    private __onHoverMarker;
    /**
     * Handles mouse click events, select the marker and open the panel if necessary
     */
    private __onClick;
    private __afterChangerMarkers;
    /**
     * Updates the visiblity of the panel and the buttons
     */
    private __refreshUi;
    /**
     * Adds or remove the objects observer if there are 3D markers
     */
    private __checkObjectsObserver;
}

/**
 * Base class for all markers
 */
declare abstract class Marker {
    protected viewer: Viewer;
    protected plugin: MarkersPlugin;
    readonly type: MarkerType;
    protected element: any;
    /**
     * The final description of the marker. Either text content, image, url, SVG attributes, etc.
     */
    definition: any;
    config: ParsedMarkerConfig;
    get id(): string;
    get data(): any;
    get domElement(): HTMLElement | SVGElement;
    get threeElement(): Group;
    get video(): HTMLVideoElement;
    constructor(viewer: Viewer, plugin: MarkersPlugin, config: MarkerConfig);
    /**
     * Checks if it is a 3D marker (imageLayer, videoLayer)
     */
    is3d(): boolean;
    /**
     * Checks if it is a normal marker (image, html, element)
     */
    isNormal(): boolean;
    /**
     * Checks if it is a polygon/polyline marker
     */
    isPoly(): boolean;
    /**
     * Checks if it is an SVG marker
     */
    isSvg(): boolean;
}

/**
 * Base class for events dispatched by {@link MarkersPlugin}
 */
declare abstract class MarkersPluginEvent extends TypedEvent<MarkersPlugin> {
}
/**
 * @event Triggered when the visibility of a marker changes
 */
declare class MarkerVisibilityEvent extends MarkersPluginEvent {
    readonly marker: Marker;
    readonly visible: boolean;
    static readonly type = "marker-visibility";
    type: 'marker-visibility';
}
/**
 * @event Triggered when the animation to a marker is done
 */
declare class GotoMarkerDoneEvent extends MarkersPluginEvent {
    readonly marker: Marker;
    static readonly type = "goto-marker-done";
    type: 'goto-marker-done';
}
/**
 * @event Triggered when the user puts the cursor away from a marker
 */
declare class LeaveMarkerEvent extends MarkersPluginEvent {
    readonly marker: Marker;
    static readonly type = "leave-marker";
    type: 'leave-marker';
}
/**
 * @event Triggered when the user puts the cursor hover a marker
 */
declare class EnterMarkerEvent extends MarkersPluginEvent {
    readonly marker: Marker;
    static readonly type = "enter-marker";
    type: 'enter-marker';
}
/**
 * @event Triggered when the user clicks on a marker
 */
declare class SelectMarkerEvent extends MarkersPluginEvent {
    readonly marker: Marker;
    readonly doubleClick: boolean;
    readonly rightClick: boolean;
    static readonly type = "select-marker";
    type: 'select-marker';
}
/**
 * @event Triggered when a marker is selected from the side panel
 */
declare class SelectMarkerListEvent extends MarkersPluginEvent {
    readonly marker: Marker;
    static readonly type = "select-marker-list";
    type: 'select-marker-list';
}
/**
 * @event Triggered when a marker was selected and the user clicks elsewhere
 */
declare class UnselectMarkerEvent extends MarkersPluginEvent {
    readonly marker: Marker;
    static readonly type = "unselect-marker";
    type: 'unselect-marker';
}
/**
 * @event Triggered when the markers are hidden
 */
declare class HideMarkersEvent extends MarkersPluginEvent {
    static readonly type = "hide-markers";
    type: 'hide-markers';
}
/**
 * @event Triggered when the markers change
 */
declare class SetMarkersEvent extends MarkersPluginEvent {
    readonly markers: Marker[];
    static readonly type = "set-markers";
    type: 'set-markers';
}
/**
 * @event Triggered when the markers are shown
 */
declare class ShowMarkersEvent extends MarkersPluginEvent {
    static readonly type = "show-markers";
    type: 'show-markers';
}
/**
 * @event Used to alter the list of markers displayed in the side-panel
 */
declare class RenderMarkersListEvent extends MarkersPluginEvent {
    /** the list of markers to display, can be modified */
    markers: Marker[];
    static readonly type = "render-markers-list";
    type: 'render-markers-list';
}
type MarkersPluginEvents = MarkerVisibilityEvent | GotoMarkerDoneEvent | LeaveMarkerEvent | EnterMarkerEvent | SelectMarkerEvent | SelectMarkerListEvent | UnselectMarkerEvent | HideMarkersEvent | SetMarkersEvent | ShowMarkersEvent | RenderMarkersListEvent;

type events_EnterMarkerEvent = EnterMarkerEvent;
declare const events_EnterMarkerEvent: typeof EnterMarkerEvent;
type events_GotoMarkerDoneEvent = GotoMarkerDoneEvent;
declare const events_GotoMarkerDoneEvent: typeof GotoMarkerDoneEvent;
type events_HideMarkersEvent = HideMarkersEvent;
declare const events_HideMarkersEvent: typeof HideMarkersEvent;
type events_LeaveMarkerEvent = LeaveMarkerEvent;
declare const events_LeaveMarkerEvent: typeof LeaveMarkerEvent;
type events_MarkerVisibilityEvent = MarkerVisibilityEvent;
declare const events_MarkerVisibilityEvent: typeof MarkerVisibilityEvent;
type events_MarkersPluginEvent = MarkersPluginEvent;
declare const events_MarkersPluginEvent: typeof MarkersPluginEvent;
type events_MarkersPluginEvents = MarkersPluginEvents;
type events_RenderMarkersListEvent = RenderMarkersListEvent;
declare const events_RenderMarkersListEvent: typeof RenderMarkersListEvent;
type events_SelectMarkerEvent = SelectMarkerEvent;
declare const events_SelectMarkerEvent: typeof SelectMarkerEvent;
type events_SelectMarkerListEvent = SelectMarkerListEvent;
declare const events_SelectMarkerListEvent: typeof SelectMarkerListEvent;
type events_SetMarkersEvent = SetMarkersEvent;
declare const events_SetMarkersEvent: typeof SetMarkersEvent;
type events_ShowMarkersEvent = ShowMarkersEvent;
declare const events_ShowMarkersEvent: typeof ShowMarkersEvent;
type events_UnselectMarkerEvent = UnselectMarkerEvent;
declare const events_UnselectMarkerEvent: typeof UnselectMarkerEvent;
declare namespace events {
  export { events_EnterMarkerEvent as EnterMarkerEvent, events_GotoMarkerDoneEvent as GotoMarkerDoneEvent, events_HideMarkersEvent as HideMarkersEvent, events_LeaveMarkerEvent as LeaveMarkerEvent, events_MarkerVisibilityEvent as MarkerVisibilityEvent, events_MarkersPluginEvent as MarkersPluginEvent, type events_MarkersPluginEvents as MarkersPluginEvents, events_RenderMarkersListEvent as RenderMarkersListEvent, events_SelectMarkerEvent as SelectMarkerEvent, events_SelectMarkerListEvent as SelectMarkerListEvent, events_SetMarkersEvent as SetMarkersEvent, events_ShowMarkersEvent as ShowMarkersEvent, events_UnselectMarkerEvent as UnselectMarkerEvent };
}

export { Marker, type MarkerConfig, type MarkerElement, MarkerType, MarkersPlugin, type MarkersPluginConfig, type ParsedMarkerConfig, type ParsedMarkersPluginConfig, type UpdatableMarkersPluginConfig, events };
