// Copyright (c) 2020 Siemens

/**
 * Constants for plTable
 *
 * @module js/splmTableConstants
 */

var exports = {};

/** ******************************* CSS CLASS *********************************************/
// Grid
exports.CLASS_TABLE = 'aw-splm-table';
exports.CLASS_TABLE_CONTAINER = 'aw-splm-tableContainer';
exports.CLASS_WIDGET_GRID = 'aw-jswidgets-grid';
exports.CLASS_LAYOUT_COLUMN = 'aw-layout-flexColumn';
exports.CLASS_WIDGET_TABLE_DROP = 'aw-widgets-droppable';
exports.CLASS_SELECTION_ENABLED = 'aw-jswidgets-selectionEnabled';

// Container
exports.CLASS_PIN_CONTAINER = 'aw-splm-tablePinnedContainer';
exports.CLASS_PIN_CONTAINER_LEFT = 'aw-splm-tablePinnedContainerLeft';
exports.CLASS_SCROLL_CONTAINER = 'aw-splm-tableScrollContainer';

// Header
exports.CLASS_HEADER_ROW = 'aw-splm-tableHeaderRow';
exports.CLASS_COLUMN_DEF = 'aw-splm-tableColumnDefAnchor';
exports.CLASS_COLUMN_MENU_POINTER_UP = 'aw-splm-tableColumnMenuPointerUp';
exports.CLASS_COLUMN_MENU_POINTER_DOWN = 'aw-splm-tableColumnMenuPointerDown';
exports.CLASS_COLUMN_MENU_POINTER_LEFT = 'aw-splm-tableColumnMenuPointerLeft';
exports.CLASS_COLUMN_MENU_POINTER_RIGHT = 'aw-splm-tableColumnMenuPointerRight';
exports.CLASS_COLUMN_MENU_ENABLED = 'aw-splm-tableColumnMenuEnabled';
exports.CLASS_HEADER_CELL = 'aw-splm-tableHeaderCell';
exports.CLASS_HEADER_CELL_CONTENT = 'aw-splm-tableHeaderCellContents';
exports.CLASS_HEADER_CLEARFIX = 'aw-splm-tableClearfix';
exports.CLASS_HEADER_CELL_LABEL = 'aw-splm-tableHeaderCellLabel';
exports.CLASS_HEADER_CELL_SPLITTER = 'aw-splm-tableHeaderCellSplitter';
exports.CLASS_HEADER_CELL_SORT_ICON = 'aw-splm-tableHeaderCellSortIcon';
exports.CLASS_HEADER_CELL_FILTER_ICON = 'aw-splm-tableHeaderCellFilterIcon';
exports.CLASS_HEADER_CELL_FILTER_APPLIED_ICON = 'aw-splm-tableHeaderCellFilterAppliedIcon';
exports.CLASS_HEADER_MENU_ITEM_SELECTED = 'aw-splm-tableMenuItemSelected';
exports.CLASS_HEADER_CELL_INNER = 'aw-splm-tableHeaderCellInner';
exports.CLASS_HEADER_ICON = 'aw-splm-tableHeaderIcon';
exports.CLASS_HEADER_ICON_CONTAINER = 'aw-splm-tableHeaderIconContainer';
exports.CLASS_HEADER_CELL_SELECTED = 'aw-splm-tableHeaderCellSelected';
exports.CLASS_HEADER_DRAGGABLE = 'aw-splm-tableDraggable';
exports.CLASS_NO_SELECT = 'noselect';

// Content
exports.CLASS_CANVAS = 'aw-splm-tableCanvas';
exports.CLASS_VIEWPORT = 'aw-splm-tableViewport';
exports.CLASS_SCROLL_CONTENTS = 'aw-splm-tableScrollContents';
exports.CLASS_TOP_SPACE = 'aw-splm-tableTopSpace';
exports.CLASS_CELL_CONTENTS = 'aw-splm-tableCellContents';

// Row
// Note: leave this as ui-grid since most of them are defined by us
exports.CLASS_UI_GRID_ROW = 'ui-grid-row';
exports.CLASS_ROW = 'aw-splm-tableRow';
exports.CLASS_PINNED_ROW = 'aw-splm-tablePinnedRow';
exports.CLASS_ROW_ICON = 'aw-row-icon';
exports.CLASS_ROW_SELECTED = 'ui-grid-row-selected';
exports.CLASS_ROW_HOVER = 'aw-splm-tableHoverRow';

exports.CLASS_COLUMN_RESIZE_GRIP = 'aw-splm-tableColumnResizeGrip';
exports.CLASS_STATE_SELECTED = 'aw-state-selected';

// Cell specific
exports.CLASS_CELL = 'ui-grid-cell';
exports.CLASS_CELL_DYNAMIC = 'ui-grid-cellDynamic';
exports.CLASS_CELL_SELECTED = 'ui-grid-cell-selected';
exports.CLASS_CELL_COMMAND_BAR = 'aw-splm-commandBarPresent';
exports.CLASS_CELL_CHECK_MARK = 'aw-splm-tableCheckMarkPresent';
exports.CLASS_CELL_CHECKBOX = 'aw-splm-tableCheckBoxPresent';
exports.CLASS_CELL_CHECKBOX_BUTTON = 'aw-jswidgets-checkboxButton';
exports.CLASS_CELL_HOVER = 'aw-splm-tableCellHover';
exports.CLASS_TABLE_CELL_SELECTED_EDITABLE = 'aw-splm-tableCellSelectedEditable';
exports.CLASS_TABLE_CELL_SELECTED = 'aw-splm-tableCellSelected';

exports.CLASS_WIDGET_TABLE_CELL = 'aw-jswidgets-tablecell';
exports.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS = 'aw-splm-tablePropertyValueLinks';
exports.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS_DISABLED = 'aw-splm-tablePropertyValueLinksDisabled';
exports.CLASS_TABLE_CELL_TOP = 'aw-splm-tableCellTop';
exports.CLASS_TABLE_CELL_TOP_DYNAMIC = 'aw-splm-tableCellTopDynamic';
exports.CLASS_WIDGET_TABLE_NON_EDIT_CONTAINER = 'aw-jswidgets-tableNonEditContainer';
exports.CLASS_WIDGET_TABLE_CELL_TEXT = 'aw-splm-tableCellText';
exports.CLASS_WIDGET_TABLE_CELL_TEXT_DYNAMIC = 'aw-splm-tableCellTextDynamic';
exports.CLASS_WIDGET_TABLE_CELL_DRAG_HANDLE = 'aw-jswidgets-draghandle';
exports.CLASS_WIDGET_TREE_NODE_TOGGLE_CMD = 'aw-jswidgets-treeExpandCollapseCmd';
exports.CLASS_TABLE_EDIT_CELL_TOP = 'aw-splm-tableEditCellTop';
exports.CLASS_TABLE_EDIT_CELL_NON_ARRAY = 'aw-splm-tableEditNonArray';
exports.CLASS_TABLE_NON_EDIT_CELL_LIST = 'aw-jswidgets-arrayNonEditValueCellList';
exports.CLASS_TABLE_NON_EDIT_CELL_LIST_ITEM = 'aw-jswidgets-arrayValueCellListItem';
exports.CLASS_WIDGET_UI_NON_EDIT_CELL = 'aw-jswidgets-uiNonEditCell';

exports.CLASS_TREE_ROW_HEADER_BUTTONS = 'ui-grid-tree-base-row-header-buttons';
exports.CLASS_TREE_BASE_HEADER = 'ui-grid-tree-base-header';
exports.CLASS_GRID_CELL_COLOR_CONTAINER = 'aw-widgets-gridCellColorContainer';
exports.CLASS_TREE_COLOR_CONTAINER = 'aw-widgets-treeTableColorContainer';
exports.CLASS_CELL_INTERACTION = 'aw-widgets-cellInteraction';
exports.CLASS_GRID_CELL_IMAGE = 'aw-widgets-dataGridCellImage';
exports.CLASS_AW_TREE_COMMAND_CELL = 'aw-splm-tableTreeCommandCell';

exports.CLASS_NATIVE_CELL_COMMANDS = 'aw-splm-tableGridCellCommands';
exports.CLASS_COMPILED_ELEMENT = 'aw-splm-tableCompiledElement';

exports.CLASS_LAYOUT_ROW_CONTAINER = 'aw-layout-flexRowContainer';

exports.CLASS_ICON_BASE = 'aw-base-icon';
exports.CLASS_ICON_TYPE = 'aw-type-icon';
exports.CLASS_SPLM_TABLE_ICON = 'aw-splm-tableIcon';
exports.CLASS_SPLM_TABLE_ICON_CONTAINER = 'aw-splm-tableIconContainer';
exports.CLASS_SPLM_TABLE_ICON_CELL = 'aw-splm-tableIconCell';
exports.CLASS_ICON_SORT_ASC = 'aw-splm-tableIconUpDir';
exports.CLASS_ICON_SORT_DESC = 'aw-splm-tableIconDownDir';
exports.CLASS_ICON_NON_SORTABLE = 'aw-splm-tableIconBlank';
exports.CLASS_ICON_SORTABLE = 'aw-splm-tableIconSortable';

exports.CLASS_UTILITY_INVISIBLE = 'invisible';
exports.CLASS_UTILITY_HIDDEN = 'hidden';

exports.COLUMN_ICON = 'icon';

// Menu
exports.CLASS_TABLE_MENU_CONTAINER = 'aw-splm-tableMenuContainer';
exports.CLASS_TABLE_MENU_POPUP = 'aw-splm-tableMenuPopup';
exports.CLASS_TABLE_MENU_ITEM = 'aw-splm-tableMenuItem';
exports.CLASS_TABLE_MENU_INPUT = 'aw-splm-tableMenuInput';
exports.CLASS_TABLE_MENU_POINTER = 'aw-splm-tableMenuPointer';
exports.CLASS_TABLE_MENU_POINTER_BACK = 'aw-splm-tableMenuPointerBack';
exports.CLASS_TABLE_MENU_POINTER_BACK_LEFT = 'aw-splm-tableMenuPointerBackLeft';
exports.CLASS_TABLE_MENU_POINTER_BACK_RIGHT = 'aw-splm-tableMenuPointerBackRight';
exports.CLASS_TABLE_MENU_POINTER_FRONT = 'aw-splm-tableMenuPointerFront';
exports.CLASS_TABLE_MENU_POINTER_FRONT_LEFT = 'aw-splm-tableMenuPointerFrontLeft';
exports.CLASS_TABLE_MENU_POINTER_FRONT_RIGHT = 'aw-splm-tableMenuPointerFrontRight';

exports.CLASS_TABLE_MENU = 'aw-splm-tableMenu';
exports.CLASS_TABLE_MENU_BUTTON = 'aw-splm-tableMenuButton';
exports.CLASS_TABLE_SCROLLED = 'aw-splm-tableScrolled';
exports.CLASS_AW_POPUP = 'aw-layout-popup';
exports.CLASS_AW_POPUP_OVERLAY = 'aw-layout-popupOverlay';

exports.CLASS_AW_CELL_LIST_ITEM = 'aw-widgets-cellListItem';
exports.CLASS_AW_CELL_TOP = 'aw-widgets-cellTop';
exports.CLASS_AW_JS_CELL_TOP = 'aw-jswidgets-cellTop';
exports.CLASS_AW_EDIT_CONTAINER = 'aw-jswidgets-tableEditContainer';
exports.CLASS_AW_IS_EDITING = 'aw-jswidgets-isEditing';
exports.CLASS_AW_EDITABLE_CELL = 'aw-jswidgets-editableGridCell';
exports.CLASS_AW_ROOT_ELEMENT = 'aw-layout-mainView';
exports.CLASS_AW_CELL_COMMANDS = 'aw-jswidgets-gridCellCommands';
exports.CLASS_AW_OLD_TEXT = 'aw-jswidgets-oldText';
exports.CLASS_AW_CHANGED_TEXT = 'aw-jswidgets-change';
exports.CLASS_AW_DISABLED_MENU_ITEM = 'aw-widgets-disabledMenuItem';

exports.CLASS_ICON_FREEZE = 'aw-splm-tableIconFreeze';
exports.CLASS_ICON_HIDE = 'aw-splm-tableIconHide'; //placeholder icon

// Column Filter
exports.CLASS_COLUMN_MENU_FILTER_CONTAINER = 'column-filter-container';
exports.CLASS_COLUMN_MENU_FACET_CONTAINER = 'facet-filter-container';

// Cell Changed
exports.CLASS_CELL_CHANGED = 'changed';

// Tooltip
exports.CLASS_AW_TOOLTIP_POPUP = 'aw-propertyrenderjs-tooltipPopup';
exports.CLASS_TOOLTIP_POPUP = 'aw-splm-tableTooltipPopup';

// Decorators
exports.CLASS_AW_SHOW_DECORATORS = 'aw-widgets-showDecorators';
exports.CLASS_AW_CELL_COLOR_INDICATOR = 'aw-widgets-gridCellColorIndicator';
exports.CLASS_CELL_COLOR_INDICATOR = 'aw-splm-tableCellColorIndicator';

// RTF
exports.CLASS_TABLE_RTF_CELL_ITEM = 'aw-splm-tableRTFCellItem';

// DnD highlight
exports.CLASS_THEME_DROP_FRAME = 'aw-theme-dropframe';
exports.CLASS_WIDGETS_DROP_FRAME = 'aw-widgets-dropframe';
exports.CLASS_DONOT_HIGHLIGHT_INDIVIDUAL_ROWS = 'aw-noeachrow-highlight-dropframe';
exports.CLASS_PINNED_CONTAINER_DROP_FRAME = 'aw-splm-tablePinnedContainerDropFrame';
exports.CLASS_SCROLL_CONTAINER_DROP_FRAME = 'aw-splm-tableScrollContainerDropFrame';

/** ******************************* Constant *********************************************/
exports.WIDTH_COLUMN_SPLITTER = 5;
exports.WIDTH_MINIMUM_EXTRA_SPACE = 45;
exports.WIDTH_ALLOWED_MINIMUM_WIDTH = 25;
exports.WIDTH_DEFAULT_ICON_COLUMN_WIDTH = 40;
exports.WIDTH_DEFAULT_MINIMUM_WIDTH = 150;
exports.WIDTH_DEFAULT_MENU_WIDTH = 175;
exports.CUSTOM_CELL_LEFTPADDING_DEFAULT_SPACE = 5;
exports.CUSTOM_HEADER_LEFTPADDING_DEFAULT_SPACE = 2;
exports.DOUBLE_CLICK_DELAY = 300;

// LCS-138303 - Performance tuning for 14 Objectset Table case - implementation
// Define header and row height here to save computed CSS reading
exports.HEIGHT_HEADER = 24;
exports.HEIGHT_COMPACT_ROW = 24;
exports.HEIGHT_ROW = 32;
// Dynamic Row Height - Number of Rows max height equals
exports.MAX_ROW_HEIGHT_ROWS = 7;
// Should be same as .aw-splm-tableColumnMenuPointerDown and up before/after
exports.COLUMN_MENU_POINTER_HEIGHT = 10;

exports.ELEMENT_STRING_EDIT_BOX = 'textarea';
exports.ELEMENT_CONTEXT_MENU = 'aw-popup-command-bar';
exports.ELEMENT_AW_ICON = 'aw-icon';
exports.ELEMENT_AW_COMMAND = 'aw-command';
exports.ELEMENT_TABLE = exports.CLASS_TABLE;

exports.EVENT_ON_ELEM_DRAG_START = 'onElementDragStart';
exports.EVENT_ON_ELEM_DRAG_END = 'onElementDragEnd';
exports.EVENT_ON_ELEM_DRAG = 'onElementDrag';
exports.EVENT_ON_ELEM_CLICK = 'onElementClick';
exports.EVENT_ON_ELEM_DOUBLE_CLICK = 'onElementDoubleClick';

export default exports;
