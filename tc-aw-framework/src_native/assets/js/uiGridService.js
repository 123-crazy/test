// Copyright (c) 2020 Siemens

/**
 * This module contains class definitions that are unique to the 'ui-grid' implementation (used by decl grid)
 *
 * @module js/uiGridService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import commandSvc from 'js/command.service';
import appCtxSvc from 'js/appCtxService';
import commandPanelSvc from 'js/commandPanel.service';
import localeSvc from 'js/localeService';
import $ from 'jquery';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var _uiGridConstants = {
    dataChange: {
        ALL: 'all',
        COLUMN: 'column',
        ROW: 'row'
    }
};

/**
 * {Boolean} TRUE if '_evaluatePlaceHolders' should log activity and details for 'placeHolders'.
 */
var _debug_logRenderActivity;

/**
 * {Boolean} TRUE if details about 'scroll to' activity should be logged.
 */
var _debug_logScrollActivity;

/**
 * Compare the non-function properties of the given two objects. Recurse (if neceesary) to compare
 * properties in arrays.
 *
 * @param {Object} testA - First Object to compare.
 * @param {Object} testB - Second Object to compare.
 *
 * @returns {Boolean} TRUE if the given value objects are 'equal'
 */
function _compare( testA, testB ) {
    var areEqual = true;

    var propNamesA = Object.keys( testA );
    var propNamesB = Object.keys( testB );

    if( propNamesA.length !== propNamesB.length ) {
        return false;
    }

    for( var ndx = 0; ndx < propNamesA.length; ndx++ ) {
        var propName = propNamesA[ ndx ];

        var valueA = testA[ propName ];

        /** Do not compare functions */
        if( !_.isFunction( valueA ) ) {
            var valueB = testB[ propName ];

            // Check for simple eqality
            if( valueA !== valueB ) {
                // Handle arrays specifically
                if( _.isArray( valueA ) ) {
                    if( valueB.length !== valueA.length ) {
                        return false;
                    }

                    for( var ndx2 = 0; ndx2 < valueA.length; ndx2++ ) {
                        if( !_compare( valueA[ ndx2 ], valueB[ ndx2 ] ) ) {
                            return false;
                        }
                    }
                } else if( _.isObject( valueA ) ) {
                    // We skip checking complex objects
                } else {
                    return false;
                }
            }
        }
    }

    return areEqual;
}

/**
 * Define public API
 */
var exports = {};

/**
 * Create a 'ui-grid' column definition instance based on the given 'aw-table' column information.
 *
 * @class UiGridColumnDef
 *
 * @param {AwTableColumnInfo} tableColumnInfo - Column info
 */
var UiGridColumnDef = function( tableColumnInfo ) {
    var gcSelf = this; // eslint-disable-line consistent-this

    // --------------------------------------------------------------
    // Constructor Initialization
    // --------------------------------------------------------------

    /**
     * Set all of the 'ui-grid' column options to match all the 'aw-table' column options with the same name.
     */
    _.forEach( tableColumnInfo, function( optionValue, optionName ) {
        gcSelf[ optionName ] = optionValue;
    } );

    /**
     * {CustomMenuArray} - custom menu
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    if( !gcSelf.menuItems ) {
        gcSelf.menuItems = [];
    }

    gcSelf.menuItems = _loadDefaultUiGridColumnMenus( gcSelf );

    /**
     * {Boolean} - enable the hiding of column menus.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    gcSelf.enableHiding = false;

    /**
     * {Boolean} - disabling the pinning menu.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    gcSelf.enablePinning = false;

    /**
     * Assure we have a valid 'field' and 'cellTemplate' property
     */
    if( !gcSelf.field && tableColumnInfo && tableColumnInfo.name ) {
        gcSelf.field = tableColumnInfo.name;
    }

    if( !gcSelf.cellTemplate ) {
        var isTreeNavigation = tableColumnInfo ? tableColumnInfo.isTreeNavigation : false;
        var isTableCommand = tableColumnInfo ? tableColumnInfo.isTableCommand : false;

        // icon column is special
        if( gcSelf.name === 'icon' ) {
            gcSelf.cellTemplate = '<aw-table-icon-cell vmo="row.entity"></aw-table-icon-cell>';
            gcSelf.width = 40;
            gcSelf.displayName = '';
            gcSelf.enableColumnResizing = false;
        } else if( isTreeNavigation ) {
            gcSelf.cellTemplate = '<aw-treetable-command-cell class="aw-jswidgets-tablecell" ' + //
                'prop="row.entity.props[col.field]" vmo="row.entity" ' + //
                'commands="col.colDef.commands" anchor="col.colDef.commandsAnchor" rowindex="rowRenderIndex" row="row" ></aw-treetable-command-cell>';
        } else if( isTableCommand ) {
            gcSelf.cellTemplate = '<aw-table-command-cell class="aw-jswidgets-tablecell" ' + //
                'prop="row.entity.props[col.field]" vmo="row.entity" ' + //
                'commands="col.colDef.commands" anchor="col.colDef.commandsAnchor"  ' + //
                'modifiable="{{col.colDef.modifiable}}" rowindex="rowRenderIndex" row="row" ></aw-table-command-cell>';
        } else {
            gcSelf.cellTemplate = '<aw-table-cell class="aw-jswidgets-tablecell" ' + //
                'prop="row.entity.props[col.field]" hint="{{col.colDef.renderingHint}}" ' + //
                'parameter-map="col.colDef.parameters" modifiable="{{col.colDef.modifiable}}" rowindex="rowRenderIndex" ></aw-table-cell>';
        }
    }
};

/**
 * @memberOf module:js/uiGridService~UiGridOptions
 *
 * @param {Object} gcSelf  reference of grid column
 *
 * @return {CustomMenuArray} array of custom menu
 */
function _loadDefaultUiGridColumnMenus( gcSelf ) {
    var _uiGridMenus = {};
    _uiGridMenus.freezeMenu = localeSvc.getLoadedTextFromKey( 'treeTableMessages.freezeMenu' );
    _uiGridMenus.unfreezeMenu = localeSvc.getLoadedTextFromKey( 'treeTableMessages.unfreezeMenu' );
    // freeze menu defination
    var _freezeMenu = {
        title: _uiGridMenus.freezeMenu,
        action: function() {
            eventBus.publish( this.grid.appScope.$parent.gridid + '.tableFreezeColumns', {
                grid: this,
                freezeColBoolean: true
            } );
        },
        shown: function() {
            var colSelf = this; // eslint-disable-line consistent-this
            var lastFreezeCol = null;
            if( colSelf.grid ) {
                colSelf.grid.columns.forEach( function( col, index ) {
                    // 0th index is for icon which is always pinnned.
                    if( col.renderContainer === 'left' && index > 1 ) {
                        lastFreezeCol = col;
                    }
                } );

                if( lastFreezeCol && lastFreezeCol.field === colSelf.context.col.field ||
                    colSelf.context.col.field === 'icon' ) {
                    return false;
                } else if( colSelf.context.col.field === colSelf.grid.columns[ 1 ].field ) {
                    return false;
                }
            }

            return true;
        }
    };

    // unfreeze menu defination
    var _unfreezeMenu = {
        title: _uiGridMenus.unfreezeMenu,
        action: function() {
            eventBus.publish( this.grid.appScope.$parent.gridid + '.tableFreezeColumns', {
                grid: this,
                freezeColBoolean: false
            } );
        },
        shown: function() {
            var colSelf = this; // eslint-disable-line consistent-this
            var lastFreezeCol = null;
            if( colSelf.grid ) {
                colSelf.grid.columns.forEach( function( col, index ) {
                    // 0th index is for icon which is always pinnned.
                    if( col.renderContainer === 'left' && index > 0 ) {
                        lastFreezeCol = col;
                    }
                } );
                if( colSelf.context.col.field === 'icon' ) {
                    return false;
                } else if( colSelf.context.col.field === colSelf.grid.columns[ 1 ].field ) {
                    return false;
                } else if( lastFreezeCol && lastFreezeCol.field === colSelf.context.col.field ) {
                    return true;
                }
            }
            return false;
        }
    };

    // pushing custom menus at the top of grid column menus
    gcSelf.menuItems.unshift( _freezeMenu, _unfreezeMenu );

    return gcSelf.menuItems;
}

/**
 * Create the 'ui-grid' options object that drives 'ui-grid'. This is constructed using inputs from awTable and
 * 'ui-grid' specific defaults. Transforms the properties of the given 'AwTableViewModel' into a 'ui-grid'
 * compatible options format.
 *
 * @class UiGridOptions
 *
 * @param {ScopeObject} $scope - The settings to use when generating the returned 'UiGridOptions' object.
 *
 * @param {UiGridWrapper} gridWrapper - The Object with various callback methods necessary to interact with
 *            'ui-grid'.
 *
 * @param {AwTableViewModel} tableViewModel - The Object with various options and associated providers to access
 *            while performing the operations of the service.
 */
var UiGridOptions = function( $scope, gridWrapper, tableViewModel ) {
    var goSelf = this; // eslint-disable-line consistent-this

    // --------------------------------------------------------------
    // Class Properties (Public)
    // --------------------------------------------------------------

    /**
     * {Number} never: 0, always: 1, when needed: 2 Note: '1' is needed to trigger the scrollbarplaceholder for
     * pinned cols...
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableHorizontalScrollbar = 1;

    /**
     * {Boolean} TRUE if column filter should be supported for any columns in the grid.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableVerticalScrollbar = 1;

    /**
     * columnVirtualizationThreshold defaults to 10, which is fine, except that it breaks cell alignment during
     * editing not sure, but this seems to be a ui-grid bug. working around it by setting the threshold high
     */
    goSelf.columnVirtualizationThreshold = 10;

    /**
     * {Boolean} TRUE if column filter should be supported for any columns in the grid.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableFiltering = false;

    /**
     * {Boolean} TRUE if ui-grid's native column sort should be disabled for the gridd. This can then be replaced
     * with our own server sort.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.useExternalSorting = true;

    /**
     * {Number} So we get the right string text wrap.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.rowHeight = 32;
    if( appCtxSvc.ctx.layout === 'compact' ) {
        goSelf.rowHeight = 24;
    }
    // default indent to match thumbnail width
    goSelf.treeIndent = 24;

    /**
     * {Number} How close to end before we request another page.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.infiniteScrollRowsFromEnd = 7;

    /**
     * {Boolean} - support infinite scroll behavior on up scroll
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.infiniteScrollUp = true; // no up scroll support

    /**
     * {Boolean} - support infinite scroll behavior on scroll down
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.infiniteScrollDown = true;

    /**
     * {Boolean} - support infinite scroll behavior
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableInfiniteScroll = true; // always leverage paging

    /**
     * {Boolean} - TRUE if row header selection is enabled.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableRowHeaderSelection = false;

    /**
     * {Boolean} - TRUE if select all is enabled.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableSelectAll = false;

    /**
     * {Boolean} - TRUE if column resizing is enabled.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableColumnResizing = true;

    /**
     * {Boolean} - TRUE if the popup menu in the upper right corner of the grid is enabled.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableGridMenu = false;

    /**
     * {Boolean} - TRUE if the popup menu in the upper right corner of the grid should show/hide columns.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.gridMenuShowHideColumns = false;

    /**
     * {UiGridColumnDefArray} - column definitions in 'ui-grid' format
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.columnDefs = null;

    /**
     * {ViewModelObjectArray} - tc data
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.data = null;

    /**
     * {Boolean} - allow column pinning
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enablePinning = false;

    /**
     * {Boolean} - enable ui-grid column menu
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableColumnMenus = true;

    /**
     * {Boolean} - enable drag and drop column rearrange
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableColumnMoving = true;

    /**
     * {Boolean} -
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableMinHeightCheck = true;

    /**
     * {Boolean} - enable column sorting
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.enableSorting = true;

    /**
     * {Boolean} -
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.flatEntityAccess = false;

    /**
     * {Number} - minimum number of rows to show
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.minRowsToShow = 3;

    /**
     * {Number} - minimum column size
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    goSelf.minimumColumnSize = 10;

    /**
     * {Boolean} - If fastWatch is set we watch only the length and the reference, not every individual object.
     */
    goSelf.fastWatch = true;

    /**
     * {String} ID of the declGrid used to create the tableViewModel this UiGridOption is initialized with.
     */
    goSelf.declGridId;

    // --------------------------------------------------------------
    // Class Functions
    // --------------------------------------------------------------

    /**
     * Register the API interaction and callbacks.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     *
     * @param {UiGridApi} gridApi - The API Object from 'ui-grid' used to add and to (& invoke API on).
     */
    goSelf.onRegisterApi = function( gridApi ) {
        gridWrapper.onRegister( gridApi );
    };

    /**
     * Register the column settings.
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     *
     * @param {AwTableColumnInfoArray} awColumnInfos - The column definitions
     */
    goSelf.setColumnInfos = function( awColumnInfos ) {
        if( goSelf.awColumnInfos && goSelf.awColumnInfos.length === awColumnInfos.length ) {
            var changed = false;

            for( var ndx = 0; ndx < awColumnInfos.length; ndx++ ) {
                if( !_compare( goSelf.awColumnInfos[ ndx ], awColumnInfos[ ndx ] ) ) {
                    changed = true;
                    break;
                }
            }

            if( !changed ) {
                return;
            }
        }

        // w-a uiGrid bug. it's neccessary to apply blank cols in order to force uiGrid to refresh cols if order was
        // updated after drag/drop
        var columnDefs = [];
        // gridWrapper.notifyColumnChanges();

        _.forEach( awColumnInfos, function( awColumnInfo ) {
            var uiGridColDef = new UiGridColumnDef( awColumnInfo );

            /**
             * Check if the main options have an opinion about if sorting should NOT be enabled.
             * <P>
             * If so: Set the column to this same value.
             */
            if( goSelf.enableSorting === false ) {
                uiGridColDef.enableSorting = false;
            }

            /**
             * Check if the main options have an opinion about if filtering should NOT be enabled.
             * <P>
             * If so: Set the column to this same value.
             */
            if( goSelf.enableFiltering === true && uiGridColDef.name !== 'icon' && uiGridColDef.displayName !== '' ) {
                uiGridColDef.enableFiltering = true;
            }

            columnDefs.push( uiGridColDef );
        } );

        /**
         * Add a dummy last column that has no define width or min-width so that it will take up the remaining space
         * This removes the white space screen when there are fewer columns than the allocated space for the grid
         */
        columnDefs.push( {
            name: 'lastColumn',
            displayName: '',
            api: null,
            enableColumnResizing: true,
            enableSorting: false,
            enableColumnMenu: false,
            enableFiltering: false,
            enableColumnMoving: false,
            headerTooltip: false,
            isTableCommand: false,
            isTreeNavigation: false,
            hiddenFlag: false,
            enableColumnMenus: false,
            visible: true,
            field: 'lastColumn'
        } );

        goSelf.columnDefs = columnDefs;
        goSelf.awColumnInfos = awColumnInfos;

        gridWrapper.notifyColumnChanges();
    };

    /**
     * Free up all resources held/managed by this object.
     * <P>
     * Note: After this function, no API call should be considered valid. This function is intended to be called
     * when the $scope of any associated viewModel is also being 'destroyed'. After this call (and a GC event), any
     * objects managed by this class may be considered a 'memory leak'.
     */
    goSelf.destroy = function() {
        goSelf.data = null;
        goSelf.columnDefs = [];
        goSelf.rowTemplate = null;

        goSelf = null;
    };

    // --------------------------------------------------------------
    // Constructor Initialization
    // --------------------------------------------------------------

    goSelf.declGridId = tableViewModel.getGridId();

    /**
     * This shortcut assumes that aw-table and ui-grid use the same convention for option names. Here we overwrite
     * the default values we set above IF the same option is set from the json v-m.
     */
    _.forEach( tableViewModel.gridOptions, function( optionValue, optionName ) {
        goSelf[ optionName ] = optionValue;
    } );

    // convert t/f to 0/1
    if( goSelf.enableHorizontalScrollbar ) {
        goSelf.enableHorizontalScrollbar = 1;
    } else {
        goSelf.enableHorizontalScrollbar = 0;
    }

    if( goSelf.enableVerticalScrollbar ) {
        goSelf.enableVerticalScrollbar = 1;
    } else {
        goSelf.enableVerticalScrollbar = 0;
    }

    if( !tableViewModel.gridOptions ) {
        tableViewModel.gridOptions = {};
    }

    /**
     * Determine ui-grid selection options
     */
    if( !tableViewModel.gridOptions.enableRowSelection ) {
        goSelf.enableRowSelection = tableViewModel.gridOptions.enableRowSelection;
        goSelf.multiSelect = tableViewModel.gridOptions.enableRowSelection;
    } else if( tableViewModel.selectionOption ) {
        goSelf.enableRowSelection = tableViewModel.selectionOption === 'single' ||
            tableViewModel.selectionOption === 'multiple';
        goSelf.multiSelect = tableViewModel.selectionOption === 'multiple';
    } else {
        goSelf.enableRowSelection = false;
        goSelf.multiSelect = false;
    }

    /**
     * Get any view model objects that are already in the associated dataPropvider's viewModelCollection.
     */
    var uwDataProvider = tableViewModel.getDataProvider();

    var vmCollection = uwDataProvider.getViewModelCollection();

    goSelf.data = vmCollection ? vmCollection.getLoadedViewModelObjects() : [];

    /**
     * Transform AwTableColumnInfos into UiGridColumnDefs ('ui-grid' specific format)
     */
    goSelf.columnDefs = [];

    var awColumnInfos = tableViewModel.getColumnProvider().getColumns();

    if( awColumnInfos && awColumnInfos.length > 0 ) {
        goSelf.setColumnInfos( awColumnInfos );
    }

    /**
     * Custom row template
     *
     * @memberOf module:js/uiGridService~UiGridOptions
     */
    if( tableViewModel.gridOptions.rowTemplate ) {
        goSelf.rowTemplate = app.getBaseUrlPath() + tableViewModel.gridOptions.rowTemplate;
    } else {
        goSelf.rowTemplate = app.getBaseUrlPath() + '/html/ui-grid-row.template.html';
    }
}; // UiGridOptions <ctor>

/**
 * @param {Object} $scope - The data context.
 * @param {UiGridOptions} gridOptions - grid options
 * @param {DeclViewModel} tableViewModel - grid view model
 */
function _setupArrangeColumns( $scope, gridOptions, tableViewModel ) {
    /**
     * Check if we want the arrange menu AND the current column provider actually supports column re-arrangement.
     */
    if( tableViewModel.enableArrangeMenu && tableViewModel.getColumnProvider().isArrangeSupported() ) {
        var commandScope = $scope.$new();

        commandScope.columns = gridOptions.columnDefs;
        commandScope.gridOptions = gridOptions;
        commandScope.gridId = tableViewModel.getGridId();
        commandScope.columnConfigId = tableViewModel.getColumnProvider().getId();
        commandScope.showFirstColumnInArrange = true;

        commandSvc.getCommands( 'aw_uiGrid', commandScope ).then( function( commands ) {
            var gridCommandsList = commands
                .filter( function( command ) {
                    return command.commandId === 'Awp0ColumnConfig';
                } ).map( function( command ) {
                    return {
                        title: command.title,
                        // callbackApi.execute is not available immediately when getting commands, so it must be
                        // referenced instead of copied
                        action: function() {
                            command.callbackApi.execute();
                        }
                    };
                } );

            if( !gridOptions.gridMenuCustomItems ) {
                gridOptions.gridMenuCustomItems = gridCommandsList;
            } else {
                for( var index = 0; index < gridCommandsList.length; index++ ) {
                    gridOptions.gridMenuCustomItems.push( gridCommandsList[ index ] );
                }
            }

            // override grid menu setting if hidden
            gridOptions.enableGridMenu = true;
        } );
    }
} // _setupArrangeColumns

/**
 * @param {Object} $scope - The data context.
 * @param {Object} gridOptions - grid options
 * @param {Object} tableViewModel - grid view model
 */
function _setupFilterColumns( $scope, gridOptions, tableViewModel ) {
    /**
     * Check if we want the filter column values AND the current column provider actually supports column filtering.
     */
    if( tableViewModel.enableFilterMenu && tableViewModel.getColumnProvider().isFilteringSupported() ) {
        var columnFilter = {
            isFilteringOn: false
        };
        appCtxSvc.registerCtx( 'columnFilter', columnFilter );

        var commandScope = $scope.$new();
        commandSvc.getCommands( 'aw_uiGrid', commandScope ).then( function( commands ) {
            var gridCommandsList = commands
                .filter( function( command ) {
                    return command.commandId === 'Awp0ShowColumnFilters' || command.commandId === 'Awp0HideColumnFilters';
                } ).map( function( command ) {
                    return {
                        title: command.title,
                        // callbackApi.execute is not available immediately when getting commands, so it must be
                        // referenced instead of copied
                        action: function() {
                            command.callbackApi.execute();
                        },
                        shown: function() {
                            return command.visible;
                        }
                    };
                } );

            if( !gridOptions.gridMenuCustomItems ) {
                gridOptions.gridMenuCustomItems = gridCommandsList;
            } else {
                for( var index = 0; index < gridCommandsList.length; index++ ) {
                    gridOptions.gridMenuCustomItems.push( gridCommandsList[ index ] );
                }
            }

            // override grid menu setting if hidden
            gridOptions.enableGridMenu = true;
        } );
    }
} // _setupFilterColumns
/**
 * Create the 'ui-grid' wrapper object
 *
 * @class UiGridWrapper
 *
 * @param {ScopeObject} $scope - The settings to use when generating the returned 'gridWrapper' object.
 * @param {AwTableViewModel} tableViewModel - the AwTableViewModel to use as the basis of the 'ui-grid' options.
 * @param {Object} cbAdapter - The Object with various callback methods necessary to interact with 'ui-grid'
 *            (usually the directive's controller).
 */
var UiGridWrapper = function( $scope, tableViewModel, cbAdapter ) {
    var gwSelf = this; // eslint-disable-line consistent-this

    // --------------------------------------------------------------
    // Class Properties (Public)
    // --------------------------------------------------------------

    /**
     * {Boolean} TRUE if all incomplete 'head', 'tail', 'expand' and 'placeHolder' nodes should be evaluated to
     * consider loading more rows immediately.
     */
    gwSelf.evaluatePlaceHolders = true;

    /**
     * {String} UID of the last computed row 'between' and incomplete 'head', 'tail' or 'placeHoolder' that should
     * be the focus of a future auto-scroll effort.
     */
    gwSelf.firstNormalRowId;

    // --------------------------------------------------------------
    // Class Properties (Private)
    // --------------------------------------------------------------

    /**
     * Grid APIs
     *
     * @private
     */
    gwSelf._gridApi = null;

    /**
     * {UiGridOptions} Grid options in ui-grid format.
     *
     * @private
     */
    gwSelf._options = null;

    /**
     * Flag to indicate if the grid is in editing mode.
     *
     * @private
     */
    gwSelf._editing = false;

    /**
     * {String}
     */
    gwSelf._dataProviderId;

    /**
     * {String}
     */
    gwSelf._gridId;

    /**
     * {Deferred} Resolved when the gridApi is 1st available
     */
    gwSelf._gridApiDeferred = AwPromiseService.instance.defer();

    // --------------------------------------------------------------
    // Class Functions (Private)
    // --------------------------------------------------------------

    /**
     * See if the screen can be filled without evaluating place holders.
     *
     * @param {UiGridApi} gridApi - The general ui-grid API object.
     * @param {ViewModelObjectArray} renderedRows - The collection of VMOs to consider.
     */
    function _evaluatePlaceHolders( gridApi, renderedRows ) {
        if( renderedRows ) {
            var rowHeight = gridApi.options.rowHeight;
            var gridHeight = gridApi.gridHeight;

            var displayableRows = gridHeight / rowHeight;
            var firstNormalRowId;
            var firstNormalNodePosition;
            var lastNormalNodePosition;

            for( var ndx = 0; ndx < renderedRows.length; ndx++ ) {
                /**
                 * Check if this one is in the process of being loaded.
                 * <P>
                 * If so: We want to let it finish before we try to load any other nodes.
                 */
                var vmNode = renderedRows[ ndx ];

                if( !vmNode.incompleteHead && !vmNode.incompleteTail && !vmNode.isPlaceholder ) {
                    if( _.isEmpty( firstNormalNodePosition ) ) {
                        lastNormalNodePosition = ndx;
                    }
                    if( !firstNormalNodePosition && firstNormalNodePosition !== 0 ) {
                        firstNormalNodePosition = ndx;
                        firstNormalRowId = vmNode.id;
                    }
                }
            }

            var contiguousRange = lastNormalNodePosition - firstNormalNodePosition;

            if( contiguousRange >= displayableRows ) {
                gwSelf.firstNormalRowId = firstNormalRowId;
            }

            gwSelf.evaluatePlaceHolders = false;

            if( _debug_logRenderActivity ) {
                logger.info( '_evaluatePlaceHolders: evaluatePlaceHolders=' + gwSelf.evaluatePlaceHolders +
                    ' firstNormalRowId: ' + gwSelf.firstNormalRowId + '\n' + 'contiguousRange: ' + contiguousRange +
                    '\n' + 'displayableRows: ' + displayableRows );
            }
        }
    }

    // --------------------------------------------------------------
    // Class Functions (Public)
    // --------------------------------------------------------------

    /**
     * Cause the UI of the underlying grid to update/refresh it's columns.
     *
     * @memberOf module:js/uiGridService~UiGridWrapper
     */
    gwSelf.notifyColumnChanges = function() {
        if( gwSelf._gridApi ) {
            gwSelf._gridApi.grid.callDataChangeCallbacks( _uiGridConstants.dataChange.COLUMN, {
                orderByColumnDefs: true
            } );
        }
    };

    /**
     * Cause the UI of the underlying grid to update/refresh it's row (and optionally column) display.
     *
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {UwDataProvider} uwDataProvider - The UwDataProvider where the changes occured.
     *
     * @param {Boolean} columnsChanged - TRUE if the column definitions have changed in some way.
     */
    gwSelf.announceChanges = function( uwDataProvider, columnsChanged ) {
        if( columnsChanged && gwSelf._gridApi ) {
            gwSelf._gridApi.core.notifyDataChange( _uiGridConstants.dataChange.COLUMN );
        }

        /**
         * Notify grid for more down available or not.
         */
        var vmCollection = uwDataProvider.getViewModelCollection();

        // fire native data load event so that native data is available in GWT layer
        eventBus.publish( gwSelf._gridId + '.nativeData.loaded', {
            loadedObjects: vmCollection.getLoadedViewModelObjects()
        } );

        if( gwSelf._gridApi ) {
            var moreDown = uwDataProvider.hasMorePages();
            var moreUp = uwDataProvider.hasMorePagesUp();

            gwSelf._gridApi.infiniteScroll.saveScrollPercentage();
            gwSelf._gridApi.infiniteScroll.dataLoaded( moreUp, moreDown ).then( function() {
                // LCS-166817 - Active Workspace tree table view performance in IE and embedded in
                //              TCVis is bad - Framework Fixes
                // If column is not changed, just change row
                gwSelf._gridApi.core.notifyDataChange( _uiGridConstants.dataChange.ROW );
            } );
        }
    };

    /**
     * @param {ViewModelObjectArray} VMOs - Array of 'viewModelObjects' to set as the current contents of this
     *            'ui-grid'.
     */
    gwSelf.setGridData = function( VMOs ) {
        if( gwSelf && gwSelf._options ) {
            gwSelf._options.data = VMOs;

            gwSelf.getGridApiWhenAvailable().then( function( gridApi ) {
                _evaluatePlaceHolders( gridApi.grid, VMOs );

                // LCS-166817 - Active Workspace tree table view performance in IE and embedded in
                //              TCVis is bad - Framework Fixes
                // We know what we update is VMO, so we can call ROW rather than ALL which
                // will trigger more watcher
                gridApi.core.notifyDataChange( _uiGridConstants.dataChange.ROW );
            } );
        }
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {UiGridOptions} A reference to the UiGridOptions object being managed by this UiGridWrapper.
     */
    gwSelf.getOptions = function() {
        return gwSelf._options;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {UiGridColDefArray} Array of 'ui-grid' 'colDefs'.
     */
    gwSelf._getColumnDefs = function() {
        return gwSelf._options.columnDefs;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {UiGridColDefArray} colDefs - Array of 'ui-grid' 'colDefs'.
     */
    gwSelf.setColumnDefs = function( colDefs ) {
        gwSelf._options.columnDefs = colDefs;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {Boolean} isSelectionEnabled - TRUE if selection should be enabled in the underlying grid's UI.
     */
    gwSelf.setSelectionEnabled = function( isSelectionEnabled ) {
        if( gwSelf._gridApi && gwSelf._options.enableRowSelection !== isSelectionEnabled ) {
            gwSelf._options.enableRowSelection = isSelectionEnabled;
            gwSelf._gridApi.core.notifyDataChange( _uiGridConstants.dataChange.ALL );
        }
    };

    /**
     * Trigger select all rows API from uiGrid
     *
     * @memberOf module:js/uiGridService~UiGridWrapper
     */
    gwSelf.selectAll = function() {
        gwSelf._gridApi.selection.selectAllRows();
        gwSelf._gridApi.core.notifyDataChange( _uiGridConstants.dataChange.ALL );
    };

    /**
     * Trigger clear all rows API from uiGrid
     *
     * @memberOf module:js/uiGridService~UiGridWrapper
     */
    gwSelf.selectNone = function() {
        gwSelf._gridApi.selection.clearSelectedRows();
        gwSelf._gridApi.core.notifyDataChange( _uiGridConstants.dataChange.ALL );
    };

    /**
     * Called when the underlying grid's UI has been partially initialized and is ready to have any necessary
     * callbacks registered with it.
     *
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {UiGridApi} gridApi - The API Object from 'ui-grid' used to add and to (& invoke API on).
     */
    gwSelf.onRegister = function( gridApi ) { // eslint-disable-line complexity
        gwSelf._gridApi = gridApi;

        gwSelf._grid = gwSelf._gridApi.grid;

        gridApi.core.on.rowsRendered( $scope, function() {
            $scope.$broadcast( 'cell.rendered' );
        } );

        /**
         * Override this ui-grid 'redrawInPlace' implementation with the one in the cbAdapter.
         */
        if( gwSelf._grid.redrawInPlace && cbAdapter.redrawInPlace ) {
            gwSelf._original_redrawInPlace = gwSelf._grid.redrawInPlace;

            gwSelf._grid.redrawInPlace = cbAdapter.redrawInPlace;
        }

        /**
         * Override this ui-grid 'queueRefresh' implementation with the one in the cbAdapter.
         */
        if( gwSelf._grid.queueRefresh && cbAdapter.queueRefresh ) {
            gwSelf._original_queueRefresh = gwSelf._grid.queueRefresh;

            gwSelf._grid.queueRefresh = cbAdapter.queueRefresh;
        }

        /**
         */
        if( gridApi.treeBase && $scope.useTree ) {
            gridApi.treeBase.on.rowExpanded( $scope, function( row ) {
                if( row.entity ) {
                    cbAdapter.rowExpanded( row.entity ).then( function() {
                        // Nothing to do, just have this 'then' to help debugging
                    } );
                }
            } );

            gridApi.treeBase.on.rowCollapsed( $scope, function( row ) {
                if( row.entity ) {
                    cbAdapter.rowCollapsed( row.entity ).then( function() {
                        // Nothing to do, just have this 'then' to help debugging
                    } );
                }
            } );
        }

        /**
         */
        if( gridApi.colMovable && cbAdapter.columnPositionChanged ) {
            gridApi.colMovable.on.columnPositionChanged( $scope, function( uiGridColDef, origPosition,
                newPosition ) {
                cbAdapter.columnPositionChanged( uiGridColDef.name, origPosition, newPosition );
            } );
        }

        /**
         */
        if( gridApi.colResizable && cbAdapter.columnSizeChanged ) {
            gridApi.colResizable.on.columnSizeChanged( $scope, function( uiGridColDef, deltaChange ) {
                cbAdapter.columnSizeChanged( uiGridColDef.name, deltaChange );
            } );
        }

        /**
         */
        if( gridApi.selection ) {
            if( cbAdapter.rowSelectionChanged ) {
                gridApi.selection.on.rowSelectionChanged( $scope, function( row, event ) {
                    cbAdapter.rowSelectionChanged( row, event );
                } );
            }

            if( cbAdapter.rowSelectionChangedBatch ) {
                gridApi.selection.on.rowSelectionChangedBatch( $scope, function( rows ) {
                    cbAdapter.rowSelectionChangedBatch( rows );
                } );
            }
        }

        if( gridApi.cellNav && cbAdapter.navigate ) {
            gridApi.cellNav.on.navigate( $scope, function( newRowCol, oldRowCol ) {
                cbAdapter.navigate( newRowCol, oldRowCol, event );
            } );
        }

        /**
         */
        var options = gridApi.grid.options;

        if( cbAdapter.sortChanged && options.enableSorting && options.useExternalSorting ) {
            gridApi.core.on.sortChanged( $scope, cbAdapter.sortChanged );
        }

        if( cbAdapter.filterChanged && options.enableFiltering && options.useExternalFiltering ) {
            gridApi.core.on.filterChanged( $scope, cbAdapter.filterChanged );
        }

        if( cbAdapter.arrangeCols ) {
            gridApi.arrangeCols = cbAdapter.arrangeCols;
        }

        if( cbAdapter.scrollEnd ) {
            gridApi.core.on.scrollEnd( $scope, cbAdapter.scrollEnd );
        }

        if( cbAdapter.gridDimensionChanged ) {
            gridApi.core.on.gridDimensionChanged( $scope, cbAdapter.gridDimensionChanged );
        }

        if( cbAdapter.onRegister ) {
            cbAdapter.onRegister();
        }

        gwSelf._gridApiDeferred.resolve( gwSelf._gridApi );
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {StringArray} uidsToSelect - An array of UIDs that are known to be selected even if they have not yet
     *            been loaded into the grid's rows.
     */
    gwSelf.selectRows = function( uidsToSelect ) {
        if( !gwSelf._gridApi || _.isEmpty( uidsToSelect ) || _.isEmpty( gwSelf._options.data ) ) {
            return;
        }

        /**
         * For each VMO determine if it's unselected
         * <P>
         * If so: Select it in ui-grid now.
         */
        _.forEach( gwSelf._options.data, function( vmo ) {
            if( vmo.uid && uidsToSelect.indexOf( vmo.uid ) !== -1 ) {
                /**
                 * Note: The 'modifyRows' function sets up hashKeys used by row selection. Make sure those keys are
                 * set now. Calling this will set the hashKey it for all the rows that need it.
                 */
                if( !vmo.$$hashKey ) {
                    gwSelf._gridApi.grid.modifyRows( gwSelf._options.data );
                }

                gwSelf._gridApi.selection.selectRow( vmo );
            }
        } );
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {UwSelectionModel} selectionModel - The selection model
     */
    gwSelf.unSelectRows = function( selectionModel ) {
        if( !gwSelf._gridApi || _.isEmpty( selectionModel.getSelection() ) || _.isEmpty( gwSelf._options.data ) ) {
            return;
        }

        /**
         * For each VMO determine if it's selected
         * <P>
         * If so: Unselect it in ui-grid now.
         */
        _.forEach( gwSelf._options.data, function( vmo ) {
            if( selectionModel.isSelected( vmo ) ) {
                /**
                 * Note: The 'modifyRows' function sets up hashKeys used by row selection. Make sure those keys are
                 * set now. Calling this will set the hashKey it for all the rows that need it.
                 */
                if( !vmo.$$hashKey ) {
                    gwSelf._gridApi.grid.modifyRows( gwSelf._options.data );
                }

                gwSelf._gridApi.selection.unSelectRow( vmo );
            }
        } );
    };

    /**
     * Walk up the DOM hierarchy to find the row DOM Element containing the given cell DOM element.
     *
     * @param {jqElement} cellElement - The JQuery Element to start the walk at.
     *
     * @return {jqElement} The JQuery element 'above' the given 'cellElement' that contains the row the cell is
     *         contained in.
     */
    gwSelf.findCellRowElement = function( cellElement ) {
        return cellElement.closest( '.ui-grid-row' );
    };

    /**
     * Tell the ui-grid to expand the row associated with the given 'parent' node.
     *
     * @param {ViewModelTreeNode} parentNode - Node to expand
     */
    gwSelf.expandRow = function( parentNode ) {
        /**
         * Find 'gridRowToExpand' based on 'rowToExpand'
         */
        var gridRowToExpand;

        if( parentNode ) {
            gwSelf._gridApi.grid.rows.forEach( function( row ) {
                if( parentNode.id === row.entity.id ) {
                    gridRowToExpand = row;
                    return false;
                }
            } );
        }

        if( gridRowToExpand ) {
            gwSelf._gridApi.treeBase.expandRow( gridRowToExpand );
        }
    };

    /**
     * Register the column settings.
     *
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {AwTableColumnInfoArray} awColumnInfos - The column definitions
     */
    gwSelf.setColumnInfos = function( awColumnInfos ) {
        gwSelf._options.setColumnInfos( awColumnInfos );
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @param {ViewModelObject} vmo - A ViewModelObject who's 'props' have been set with a 'propertyDisplayName'
     *            property where the localized 'displayName' is set.
     *
     * @return {Boolean} TRUE if any of the previous column display names were changed.
     */
    gwSelf.setColumnDisplayNames = function( vmo ) {
        if( vmo.props ) {
            _.forEach( gwSelf._getColumnDefs(), function( columnDef ) {
                if( vmo.props[ columnDef.field ] && columnDef.field !== 'icon' ) {
                    columnDef.displayName = columnDef.displayName ||
                        vmo.props[ columnDef.field ].propertyDisplayName;
                }
            } );

            return true;
        }

        return false;
    };

    /**
     * @param {String} nodeIdToTest - ID of the node we are testing for.
     *
     * @return {Boolean} TRUE if the ID appears in the set of currently rendered rows.
     */
    gwSelf.isRowRendered = function( nodeIdToTest ) {
        var bodyContainer = gwSelf.getRenderContainers().body;

        if( !_.isEmpty( bodyContainer.renderedRows ) ) {
            for( var ndx = 0; ndx < bodyContainer.renderedRows.length; ndx++ ) {
                var row = bodyContainer.renderedRows[ ndx ];

                if( row.entity.id === nodeIdToTest ) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * @return {ViewModelTreeNodeArray} An array with the 'rendered' (i.e. 'visible') rows that have NO properties
     *         set on them.
     */
    gwSelf.findEmptyRenderedRows = function() {
        var bodyContainer = gwSelf.getRenderContainers().body;

        var emptyPropsRows = [];

        if( !_.isEmpty( bodyContainer.renderedRows ) ) {
            var renderedRows = bodyContainer.renderedRows;

            // form array of rendered nodes (include parentNode)
            for( var inx = 0; inx < renderedRows.length; inx++ ) {
                var vmo = renderedRows[ inx ].entity;

                if( !vmo.props ) {
                    emptyPropsRows.push( vmo );
                } else {
                    var keys = Object.keys( vmo.props );

                    if( keys.length === 0 ) {
                        // console.log( 'hollow row: ' + vmo.childNdx );

                        emptyPropsRows.push( vmo );
                    }
                }
            }
        }

        return emptyPropsRows;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {UiGridRenderContainerMap} Rendered rows.
     */
    gwSelf.getRenderContainers = function() {
        return gwSelf._gridApi.grid.renderContainers;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {UiGridRowArray} Rendered rows.
     */
    gwSelf.getRenderedGridRows = function() {
        if( gwSelf._gridApi ) {
            return gwSelf.getRenderContainers().body.renderedRows;
        }

        return [];
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {UiGridRowArray} Array of rows.
     */
    gwSelf.getVisibleGridRows = function() {
        return gwSelf.getRenderContainers().body.visibleRowCache;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {Array} Rendered rows.
     */
    gwSelf.getRenderedNodes = function() {
        // form array of rendered nodes
        var renderedNodes = [];
        try {
            var renderedRows = gwSelf.getRenderContainers().body.renderedRows;
            for( var inx = 0; inx < renderedRows.length; inx++ ) {
                renderedNodes.push( renderedRows[ inx ].entity );
            }
        } catch ( error ) {
            // do nothing
        }
        return renderedNodes;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {UiGridApi} The general ui-grid API.
     */
    gwSelf.getGridApi = function() {
        return gwSelf._gridApi.grid;
    };

    /**
     * @memberOf module:js/uiGridService~UiGridWrapper
     *
     * @return {Promise} Resolved with the general ui-grid API once it is set.
     */
    gwSelf.getGridApiWhenAvailable = function() {
        return gwSelf._gridApiDeferred.promise;
    };

    /**
     * @param {ViewModelObjectCollection} vmCollection -
     *
     * @param {String} rowId - ID of the row to place at the top of the viewport.
     *
     * @return {Promise} A promise that is resolved when scrolling is complete
     */
    gwSelf.scrollToRow = function( vmCollection, rowId ) {
        var rowIndex = vmCollection.findViewModelObjectById( rowId );

        if( rowIndex !== -1 ) {
            var selectionPadding = 3;

            var bodyContainer = gwSelf.getRenderContainers().body;

            var firstRowIndex = bodyContainer.currentTopRow;

            var renderedRows = bodyContainer.renderedRows;

            var length = renderedRows.length;

            var lastRowIndex = firstRowIndex + length;

            if( firstRowIndex >= rowIndex - selectionPadding ) {
                selectionPadding = 0;
            }

            if( rowIndex < firstRowIndex + 4 || rowIndex > lastRowIndex - 4 ) {
                /**
                 * Check if we are not really close to the top
                 */
                var safeRowIndex = rowIndex;

                if( rowIndex > selectionPadding ) {
                    var selectionDistanceToEndPage = vmCollection.loadedVMObjects.length - 1 - rowIndex;

                    if( selectionDistanceToEndPage < selectionPadding ) {
                        selectionPadding = selectionDistanceToEndPage;
                    }

                    safeRowIndex = _safeScrollPosition( vmCollection, rowIndex, rowIndex + selectionPadding );
                }

                if( _debug_logScrollActivity ) {
                    logger.info( 'scrollToRow: Scroll to: rowIndex: ' + rowIndex + ' safeRowIndex: ' +
                        safeRowIndex + ' firstRowIndex: ' + firstRowIndex + ' lastRowIndex:' + lastRowIndex );
                }

                return gwSelf._gridApi.core.scrollTo( vmCollection.getViewModelObject( safeRowIndex ) );
            }

            if( _debug_logScrollActivity ) {
                logger.info( 'scrollToRow: Leave At: rowIndex: ' + rowIndex + ' safeRowIndex: ' + safeRowIndex +
                    ' firstRowIndex: ' + firstRowIndex + ' lastRowIndex:' + lastRowIndex );
            }

            return gwSelf._gridApi.core.scrollTo( vmCollection.getViewModelObject( rowIndex ) );
        }

        return AwPromiseService.instance.resolve();
    };

    /**
     * Find
     *
     * @param {ViewModelCollection} vmCollection -
     *
     * @param {Number} baseRowIndex - Desired row number to scroll to.
     *
     * @param {Number} currRowIndex - Current scroll position to check if it is an 'incomplete tail'.
     *
     * @return {Number} renderedRows - Safe row number to scroll to.
     */
    var _safeScrollPosition = function( vmCollection, baseRowIndex, currRowIndex ) {
        if( vmCollection.getViewModelObject( currRowIndex ).incompleteTail ) {
            return _safeScrollPosition( vmCollection, baseRowIndex, --currRowIndex );
        }

        return currRowIndex;
    };

    /**
     * @param {ViewModelObject} vmRow - The 'entity' object of the row to scroll to.
     *
     * @return {Promise} A promise that is resolved when scrolling is complete
     */
    gwSelf.scrollTo = function( vmRow ) {
        return gwSelf._gridApi.core.scrollTo( vmRow );
    };

    /**
     * Free up all resources held/managed by this object.
     * <P>
     * Note: After this function, no API call should be considered valid. This function is intended to be called
     * when the $scope of any associated viewModel is also being 'destroyed'. After this call (and a GC event), any
     * objects managed by this class may be considered a 'memory leak'.
     */
    gwSelf.destroy = function() {
        // *****************************
        // Keep this 'deep destroy' code around in case we need it in the future.
        // *****************************
        //
        // if( gwSelf._gridApi ) { gwSelf._gridApi.grid.rows = null;
        //
        //     if( gwSelf._gridApi.treeBase ) {
        //         gwSelf._gridApi.grid.treeBase.tree = [];
        //         gwSelf._gridApi.grid.columns = [];
        //         gwSelf._gridApi.grid.rowHashMap = {};
        //     }
        //
        //     gwSelf._gridApi.grid.options = {};
        //     gwSelf._gridApi.grid.selection = {};
        //
        //     gwSelf._gridApi = null;
        // }
        //
        // if( gwSelf._options ) { gwSelf._options.destroy(); gwSelf._options = null;
        // }

        /**
         * Put back the original definition of the ui-grid function(s).
         */
        if( gwSelf._original_redrawInPlace ) {
            gwSelf._grid.redrawInPlace = gwSelf._original_redrawInPlace;

            gwSelf._original_redrawInPlace = null;
        }

        if( gwSelf._editHandlerSubscription ) {
            // unsubscribe when were done with edit handler
            eventBus.unsubscribe( gwSelf._editHandlerSubscription );

            gwSelf._editHandlerSubscription = null;
        }

        gwSelf._gridApiDeferred = null;

        appCtxSvc.unRegisterCtx( 'columnFilter' );

        gwSelf = null;
    }; // destroy

    // --------------------------------------------------------------
    // Constructor Initialization
    // --------------------------------------------------------------

    gwSelf._dataProviderId = tableViewModel.getDataProvider().name;
    gwSelf._gridId = tableViewModel.getGridId();

    gwSelf._options = new UiGridOptions( $scope, gwSelf, tableViewModel );

    // setup Arrange menu
    _setupArrangeColumns( $scope, gwSelf._options, tableViewModel );

    // setup Filter menu
    _setupFilterColumns( $scope, gwSelf._options, tableViewModel );

    // Add listener to edit handler
    gwSelf._editHandlerSubscription = eventBus.subscribe( 'editHandlerStateChange', exports.getEditStateChangeHandler( gwSelf, tableViewModel ) );
};

/**
 * Get a function to handle edit state changes as they relate to the provided grid and table view model.
 *
 * @param {UiGridWrapper} gwSelf - The grid wrapper
 * @param {AwTableViewModel} tableViewModel - the AwTableViewModel to use as the basis of the 'ui-grid' options.
 *
 * @return {Function} Function to handle 'editHandlerStateChange' events
 */
export let getEditStateChangeHandler = function( gwSelf, tableViewModel ) {
    return function handleEditHandlerStateChange( event ) {
        /**
         * Check if this event relates to the associated uwDataProvider.
         * dataSource can be a dataProvider or a declViewModel with dataProviders
         */
        if( event.dataSource && ( event.dataSource.name || event.dataSource.dataProviders ) ) {
            var names = [];
            if( event.dataSource.name ) {
                names.push( event.dataSource.name );
            } else {
                if( event.dataSource.dataProviders ) {
                    _.forEach( event.dataSource.dataProviders, function( dataProvider ) {
                        if( dataProvider !== null && dataProvider !== undefined ) {
                            names.push( dataProvider.name );
                        }
                    } );
                }
            }

            if( _.indexOf( names, gwSelf._dataProviderId ) >= 0 ) {
                var editingEnabled = event.state === 'starting';

                /**
                 * Disable sorting changes while in edit mode (if necessary)
                 */
                if( tableViewModel.getColumnProvider().isSortingSupported() ) {
                    var cols = gwSelf._getColumnDefs();
                    if( editingEnabled ) {
                        gwSelf._options.enableSorting = false;
                        // Column "enableSorting" flag overrides the global grid enableSorting flag so it must also be
                        // set to false
                        cols.forEach( function( col ) {
                            col._enableSorting = col.enableSorting;
                            col.enableSorting = false;
                        } );
                    } else {
                        gwSelf._options.enableSorting = true;
                        // Reset "enableSorting" flag to original value
                        cols.forEach( function( col ) {
                            if( col.hasOwnProperty( '_enableSorting' ) ) {
                                col.enableSorting = col._enableSorting;
                                delete col._enableSorting;
                            } else {
                                // Do nothing - somehow edit has been cancelled or saved without being started
                            }
                        } );
                    }
                    gwSelf._gridApi.core.notifyDataChange( _uiGridConstants.dataChange.COLUMN );
                }

                /**
                 * Set flag used to disable infinite scrolling during edit mode.
                 */
                gwSelf._editing = editingEnabled;

                /**
                 * D-49674: Update enableGridMenu
                 */
                gwSelf._options.enableGridMenu = ( tableViewModel.enableArrangeMenu &&
                    tableViewModel.getColumnProvider().isArrangeSupported() || tableViewModel.enableFilterMenu &&
                    tableViewModel.getColumnProvider().isFilteringSupported() ) && !editingEnabled;
            }
        }
    };
};

/**
 * Create the 'ui-grid' wrapper object
 *
 * @param {ScopeObject} $scope - The settings to use when generating the returned 'gridWrapper' object.
 * @param {AwTableViewModel} tableViewModel - the AwTableViewModel to use as the basis of the 'ui-grid' options.
 * @param {Object} cbAdapter - The Object with various callback methods necessary to interact with 'ui-grid'.
 *
 * @return {UiGridWrapper} New UiGridWrapper object based on given input.
 */
export let createGridWrapper = function( $scope, tableViewModel, cbAdapter ) {
    return new UiGridWrapper( $scope, tableViewModel, cbAdapter );
};

/**
 * Create a 'ui-grid' column definition instance based on the 'aw-table' field information provided. Normally "_"
 * denotes an internal function, but it is exported in this case because we need to call it to create dynamic
 * columns from SH&F. We need to revisit and improve this pattern.
 *
 * @param {AwTableColumnInfo} tableColumnInfo - UW column info
 *
 * @return {UiGridColumnDef} New UiGridColumnDef object based on given input.
 */
export let createColumnDef = function( tableColumnInfo ) {
    return new UiGridColumnDef( tableColumnInfo );
};

/**
 * Setup the context necessary for the arrange panel
 *
 * @param {UiGridColumnDefArray} columns - Current collection of columns.
 * @param {UIGridOptions} gridOptions - Current set of display options.
 * @param {String} gridId - ID of the gird being arranged.
 * @param {String} columnConfigId - column config Id of the gird being arranged.
 * @param {Boolean} showFirstColumnInArrange - TRUE if the 1st column of the grid should be displayed.
 */
export let openArrangePanel = function( columns, gridOptions, gridId, columnConfigId, showFirstColumnInArrange ) {
    var cols = _.clone( columns );

    // internal gwt arrange panel blindly strips the first column assuming it is icon but when we are using a static
    // first column (tree / quickTable), we want to also strip the first prop column since that can't be rearranged.
    // so pre-emptively slice off the icon column... This fragile dependency should be re-worked when the native
    // arrange panel is written.
    if( gridOptions.useStaticFirstCol && cols[ 0 ].name === 'icon' ) {
        cols.splice( 0, 1 );
    }

    var grididSetting = {
        name: gridId,
        columnConfigId: columnConfigId,
        columns: cols,
        useStaticFirstCol: Boolean( gridOptions.useStaticFirstCol ),
        showFirstColumn: showFirstColumnInArrange
    };

    appCtxSvc.registerCtx( 'ArrangeClientScopeUI', grididSetting );
    commandPanelSvc.activateCommandPanel( 'arrange', 'aw_toolsAndInfo', null );
};

export let showColumnFilters = function( gridOptions ) {
    var columnFilter = {
        isFilteringOn: true
    };
    appCtxSvc.updateCtx( 'columnFilter', columnFilter );

    var gridTable = $( 'aw-table[gridid=\'' + gridOptions.declGridId + '\']' );
    gridTable.find( '.ui-grid-header-canvas' ).attr( 'style', 'height: 48px !important;' );
    gridTable.find( '.ui-grid-filter-container' ).attr( 'style', 'padding-top: 0px;' );
};

export let hideColumnFilters = function( gridOptions ) {
    var columnFilter = {
        isFilteringOn: false
    };
    appCtxSvc.updateCtx( 'columnFilter', columnFilter );

    var gridTable = $( 'aw-table[gridid=\'' + gridOptions.declGridId + '\']' );
    gridTable.find( '.ui-grid-header-canvas' ).attr( 'style', 'height: 24px !important;' );
    gridTable.find( '.ui-grid-filter-container' ).attr( 'style', 'padding-top: 4px;' );
};

var urlAttrs = browserUtils.getUrlAttributes();

_debug_logRenderActivity = urlAttrs.logRenderActivity !== undefined;
_debug_logScrollActivity = urlAttrs.logScrollActivity !== undefined;

export default exports = {
    getEditStateChangeHandler,
    createGridWrapper,
    createColumnDef,
    openArrangePanel,
    showColumnFilters,
    hideColumnFilters
};
app.factory( 'uiGridService', () => exports );
