// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph constants
 *
 * @module js/graphConstants
 */

'use strict';

var exports = {};

export let Precision = 0.001;

export let portRotateMap = {
    Right: 0,
    Bottom: 90,
    Left: 180,
    Top: 270
};

export let ArrowType = {
    /**
     * Default arrow
     */
    DEFAULT: 'DEFAULT',

    /**
     * Simple arrow
     */
    SIMPLE: 'SIMPLE',

    /**
     * Short arrow
     */
    SHORT: 'SHORT',

    /**
     * Diamond arrow
     */
    DIAMOND: 'DIAMOND',

    /**
     * No arrow
     */
    NONE: 'NONE',

    /**
     * Circle arrow
     */
    CIRCLE: 'CIRCLE',

    /**
     * Cross arrow
     */
    CROSS: 'CROSS',

    /**
     * Triangle arrow
     */
    TRIANGLE: 'TRIANGLE',

    /**
     * T arrow
     */
    LINE_END_TEE: 'LINE_END_TEE'
};

/**
 * Port shape
 */
export let PortShape = {
    /**
     * Void port
     */
    VOID: 'VOID',

    /**
     * Square port
     */
    SQUARE: 'SQUARE',

    /**
     * Circle port
     */
    CIRCLE: 'CIRCLE'
};

export let PanToViewOption = {
    /**
     * Auto pan into view and auto fit
     */
    AUTO: 'AUTO',

    /**
     * Pan to center and auto fit
     */
    CENTER: 'CENTER',

    /**
     * Auto pan into view and always fit
     */
    FIT: 'FIT'
};

export let DefaultDnDModifierKey = {
    MOVE: [ 'alt' ],
    COPY: [ 'alt', 'shift' ]
};

export let DefaultEdgeStyle = {
    thickness: 1.0,
    color: '(255,0,0)'
};

export let DefaultPortStyle = {
    portShape: 'SQUARE',
    borderColor: '(0, 0, 0)',
    fillColor: '(255, 255, 255)',
    thickness: 1,
    rx: 2,
    ry: 2,
    size: 24
};

export let defaultBoundarySize = {
    width: 300,
    height: 135
};
export let defaultBoundaryStyle = {
    fillColor: '(235,235,227)',
    borderColor: '(150, 150, 130)',
    thickness: 1,
    strokeDash: 'DASH'
};

export let NodeShape = {
    /**
     * A rectangular shape
     */
    RECTANGLE: 0,

    /**
     * An elliptical shape
     */
    ELLIPSE: 1
};

export let ConnectionEnd = {
    /**
     * The connection end is start point.
     */
    START: 1,

    /**
     * The connection end is end point.
     */
    END: 2,

    /**
     * The connection ends are both start and end points.
     */
    BOTH: 3,

    /**
     * he connection end is none.
     */
    NONE: 0
};

/**
 * A flag for controlling how to routing calculation the connection
 */
export let AutoRoutingtype = {
    /**
     * 0 - HV segment (Simple Orthogon Path, don't calculate obstacle avoidance)
     */
    HV_SEGMENT0: 0,

    /**
     * 1 - HV segment (Hadlock Path, obstacle avoidance)
     */
    HV_SEGMENT1: 1,

    /**
     * 2 - Straight Line.
     */
    STRAIGHT_LINE: 2,

    /**
     * 3 - HV segment (aStar Path, obstacle avoidance)
     */
    HV_SEGMENT3: 3
};

export let PortCandidateProviderType = {
    /**
     * Support node as port candidate
     */
    NODE: 'NODE',

    /**
     * Support port as port candidate
     */
    PORT: 'PORT',

    /**
     * Support node and port as port candidate
     */
    NODE_AND_PORT: 'NODE_AND_PORT'
};

/**
 * The phase of changing
 */
export let ChangePhase = {
    /**
     * The phase is starting.
     */
    START: 0,

    /**
     * The phase is delta.
     */
    DELTA: 1,

    /**
     * The phase is ended.
     */
    END: 2
};

export let KeyCodes = {
    KEY_ESCAPE: 27,
    KEY_DELETE: 46,

    MOUSE_BUTTON_LEFT: 0,
    MOUSE_BUTTON_MIDDLE: 1,
    MOUSE_BUTTON_RIGHT: 2
};

/**
 * The Text overflow Mode
 */
export let TextOverflow = {
    /**
     * Do not truncate the text
     */
    NONE: 0,
    /**
     * Trim the text
     */
    TRUNCATE: 1,
    /**
     * Trim the text and add '...' at the end of the text
     */
    ELLIPSIS: 2,
    /**
     * Wrap the text
     */
    WRAP: 3
};

/**
 * The expand direction constant
 */
export let ExpandDirection = {
    /**
     * The all
     */
    ALL: 'all',
    /**
     * The backward
     */
    BACKWARD: 'backward',
    /**
     * forward
     */
    FORWARD: 'forward'
};

/**
 * The edge direction constant
 */
export let EdgeDirection = {
    /**
     * The in edge
     */
    IN: 'IN',
    /**
     * The out edge
     */
    OUT: 'OUT',
    /**
     * Both in and out edge
     */
    BOTH: 'BOTH'
};

/**
 * The Object Types enumeration
 */
export let ObjectTypes = {
    Node: 'Node',
    Port: 'Port',
    Edge: 'Connection',
    Label: 'Annotation'
};

/**
 * The layout directions map from the host application to the layout engine. object format as: {key:
 * GCLayoutDirection, value: DFInternalLayoutDirection ... }
 */
export let LayoutDirections = {
    TopToBottom: 'TopToBottom',
    BottomToTop: 'BottomToTop',
    RightToLeft: 'RightToLeft',
    LeftToRight: 'LeftToRight'
};

/**
 * The distribute directions map from the host application to the layout engine. used to control distribute position
 * for api layout.distributeNewNodes
 */
export let DistributeDirections = {
    Down: 'down',
    Up: 'up',
    Left: 'left',
    Right: 'right',
    UseLayoutDirection: 'useLayoutDirection'
};

/**
 * The global layout types supported by graph component. object format as: {key: GCLayoutType, value:
 * DFInternalLayoutType ... }
 */
export let GlobalLayoutTypes = {
    Incremental: 'Incremental',
    Hierarchical: 'Hierarchical',
    Organic: 'Organic',
    Balloon: 'Balloon',
    Snake: 'Snake'
};

/**
 * The layout mode supported by graph component.
 */
export let DFLayoutTypes = {
    IncUpdateLayout: 'IncUpdateLayout',
    SortedLayout: 'SortedLayout',
    BranchLayout: 'BranchLayout',
    ColumnLayout: 'ColumnLayout',
    IshikawaLayout: 'IshikawaLayout'
};

/**
 * The layout options supported by graph component, object format as: {key: GCCommandId, value: GCLayoutDirection or
 * GCLayoutType ... }
 */
export let LayoutOptions = {
    // LayoutDirection
    GcTopToBottomLayout: 'TopToBottom',
    GcBottomToTopLayout: 'BottomToTop',
    GcRightToLeftLayout: 'RightToLeft',
    GcLeftToRightLayout: 'LeftToRight',

    // Others, LayoutType
    GcIncrementalLayout: 'Incremental',
    GcHierarchicalLayout: 'Hierarchical',
    GcOrganicLayout: 'Organic',
    GcBalloonLayout: 'Balloon',
    GcSnakeLayout: 'Snake'
};

export let LabelOrientations = {
    /**
     * Label on the top of node
     */
    TOP: {
        refX: 0.5,
        refY: 0,
        labelAnchorX: 0.5,
        labelAnchorY: 1
    },

    /**
     * Label on the left of node
     */
    LEFT: {
        refX: 0,
        refY: 0.5,
        labelAnchorX: 1,
        labelAnchorY: 0.5
    },

    /**
     * Label on the bottom of node
     */
    BOTTOM: {
        refX: 0.5,
        refY: 1,
        labelAnchorX: 0.5,
        labelAnchorY: 0
    },

    /**
     * Label on the right of node
     */
    RIGHT: {
        refX: 1,
        refY: 0.5,
        labelAnchorX: 0,
        labelAnchorY: 0.5
    },

    /**
     * Label in the center of node
     */
    CENTER: {
        refX: 0,
        refY: 0,
        labelAnchorX: 0,
        labelAnchorY: 0
    }
};

export let TextAlignment = {
    /**
     * Left alignment
     */
    LEFT: 0,

    /**
     * Center alignment
     */
    CENTER: 1,

    /**
     * Right alignment
     */
    RIGHT: 2,

    /**
     * Justified alignment
     */
    JUSTIFY: 3,

    /**
     * Starting alignment
     */
    START: 4,

    /**
     * Middle alignment
     */
    MIDDLE: 5,

    /**
     * Ending alignment
     */
    END: 6,

    /**
     * Top alignment
     */
    TOP: 7,

    /**
     * Alphabetical alignment
     */
    ALPHABETIC: 8,

    /**
     * Central alignment
     */
    CENTRAL: 9,

    /**
     * Hanging indent alignment.
     */
    HANGING: 10
};

/**
 * The default normal node width.
 */
export let DefaultNodeWidth = 300;

/**
 * The default normal node height.
 */
export let DefaultNodeHeight = 125;

/**
 * The modifiable property class
 */
export let MODIFIABLE_PROPERTY_CLASS = 'aw-graph-modifiableProperty';

/**
 * The header height binding name property
 */
export let HEADER_HEIGHT_PROP = 'HEADER_HEIGHT';

/**
 * The static bind data.
 */
export let StaticBindData = {
    GC_NODE_MODIFIABLE_TITLE_CLASS: 'aw-graph-modifiableProperty aw-widgets-cellListCellTitle',
    GC_NODE_TITLE_CLASS: 'aw-widgets-cellListCellTitle',
    GC_NODE_MODIFIABLE_PROPERTY_CLASS: 'aw-graph-modifiableProperty aw-widgets-propertyLabel aw-base-small',
    GC_NODE_PROPERTY_CLASS: 'aw-widgets-propertyLabel aw-base-small',
    GC_COMMAND_CLASS: 'aw-graph-tileCommand',
    GC_COMMAND_SELECTED_CLASS: 'aw-state-selected',
    GC_HIDDEN_CLASS: 'hidden'
};

/**
 * Jumper priority type.
 * "HORIZONTAL" - the jumper show on the horizontal line
 * "VERTICAL" - the jumper show on the vertical line
 */
export let JumperPriorityType = {
    HORIZONTAL: 0,
    VERTICAL: 1
};

/**
 * Jumper type.
 * "NONE" - the jumper has no type
 * "ARC" - the jumper type is arc
 * "GAP" - the jumper type is gap
 */
export let JumperType = {
    NONE: 0,
    ARC: 1,
    GAP: 2
};

/**
 * The default jumper size.
 */
export let DefaultJumperSize = {
    width: 10,
    height: 10
};

export let LabelPreferences = {
    hasBackground: true,
    backgroundFillColor: 'argb(1,244,244,244)',
    backgroundStyleClass: 'aw-graph-labelBackground',
    backgroundAnchor: [ 0.5, 0.5 ],
    textAnchor: [ 0.5, 0.5 ],
    contentStyleClass: 'aw-widgets-label aw-base-normal aw-graph-label',
    allowWrapping: false,
    textOverflow: 'ELLIPSIS',
    maxMoveDistance: 500,
    maxWidth: 128,
    minWidth: 50
};

export let PortLabelPlacementRule = {
    NONE: 0,
    FLIP: 1,
    ROTATE: 2
};

/**
 * NodeHeightUpdateStrategy The strategy is height changing of word wrap.The default is KEEP_LARGE
 * KEEP_LARGE means that change the node height as keeping the larger value when wrapped height change
 * FIT_WRAP means that the node height as fitting to the wrapped text height plus padding value.
 * NODE means that doesn't change the node height
 */
export let NodeHeightUpdateStrategy = {
    KEEP_LARGE: 'KEEP_LARGE',
    FIT_WRAP: 'FIT_WRAP',
    NONE: 'NONE'
};

/**
 * SortedLayout related constants
 */
export let SortedLayout = {
    ShowOption: {
        SEARCH_NEW_LOCATION: 1
    }
};

/* branch layout related enums START */
export let BranchLayout = {
    /**
     * Branch out direction. Four options: "leftToRight, (default) "rightToLeft", "topToBottom", "bottomToTop"
     */
    BranchOutDirection: {
        LEFT_TO_RIGHT: 'leftToRight',
        RIGHT_TO_LEFT: 'rightToLeft',
        TOP_TO_BOTTOM: 'topToBottom',
        BOTTOM_TO_TOP: 'bottomToTop'
    },
    /**
     * NodeGrowDirectionInBranch This must be perpendicular to the branchLayoutDirection If branchGrowDirection is
     * "leftToRight" or "rightToLeft": This parameter should be: "topToBottom"(default) "bottomToTop" If
     * branchGrowDirection is "topToBottom" or "bottomToTop": This parameter should be: "leftToRight"(default)
     * "rightToLeft"
     */
    NodeGrowDirection: {
        LEFT_TO_RIGHT: 'leftToRight',
        RIGHT_TO_LEFT: 'rightToLeft',
        TOP_TO_BOTTOM: 'topToBottom',
        BOTTOM_TO_TOP: 'bottomToTop'
    },
    /**
     * PathRoutingType "HV"(default) - Connections will be routed orthogonally. Used to avoid crossing Nodes
     * "straightLine" - Connections will be a straight line from one node to another node. It will cross any nodes
     * found along is path.
     */
    RoutingType: {
        HV: 'HV',
        STRAIGHTLINE: 'straightLine'
    },
    /**
     * Insert place
     */
    InsertPlace: {
        BEFORE: 'before',
        AFTER: 'after'
    }

};
/* branch layout related enums END */

/**
 * The default svg string to create port candidate
 */
export let PortCandidateTemplate = {
    Default: {
        // The DF later than DF1926 upgraded the port candidate feature and
        // the workaround to merge single candidator to a whole one doesn't work any more.
        // Just remove the transform=\'translate({x} {y})\' template paramenters
        Normal: '<g><line x1=\'0\' y1=\'0\' x2=\'10\' y2=\'10\' stroke=\'blue\' ></line><line x1=\'10\' y1=\'0\' x2=\'0\' y2=\'10\' stroke=\'blue\'></line></g>',
        Highlight: '<circle cx=\'5\' cy=\'5\' r=\'5\' stroke=\'black\' stroke-width=\'1\' fill=\'red\' ></circle>'
    }
};

export let NodePortPosition = {
    TOP: 'TOP',
    RIGHT: 'RIGHT',
    BOTTOM: 'BOTTOM',
    LEFT: 'LEFT'
};

export default exports = {
    Precision,
    portRotateMap,
    ArrowType,
    PortShape,
    PanToViewOption,
    DefaultDnDModifierKey,
    DefaultEdgeStyle,
    DefaultPortStyle,
    defaultBoundarySize,
    defaultBoundaryStyle,
    NodeShape,
    ConnectionEnd,
    AutoRoutingtype,
    PortCandidateProviderType,
    ChangePhase,
    KeyCodes,
    TextOverflow,
    ExpandDirection,
    EdgeDirection,
    ObjectTypes,
    LayoutDirections,
    DistributeDirections,
    GlobalLayoutTypes,
    DFLayoutTypes,
    LayoutOptions,
    LabelOrientations,
    TextAlignment,
    DefaultNodeWidth,
    DefaultNodeHeight,
    MODIFIABLE_PROPERTY_CLASS,
    HEADER_HEIGHT_PROP,
    StaticBindData,
    JumperPriorityType,
    JumperType,
    DefaultJumperSize,
    LabelPreferences,
    PortLabelPlacementRule,
    NodeHeightUpdateStrategy,
    SortedLayout,
    BranchLayout,
    PortCandidateTemplate,
    NodePortPosition
};
