// Copyright (c) 2020 Siemens
/* eslint-disable complexity */

/**
 * This module defines the primary classes used to manage the 'aw-table' directive (used by decl grid).
 *
 * @module js/awColumnService
 */
import app from 'app';
import actionSvc from 'js/actionService';
import cmm from 'soa/kernel/clientMetaModel';
import soaService from 'soa/kernel/soaService';
import declarativeDataCtxSvc from 'js/declarativeDataCtxService';
import AwPromiseService from 'js/awPromiseService';
import awColumnFilterService from 'js/awColumnFilterService';
import assert from 'assert';
import _ from 'lodash';
import logger from 'js/logger';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';

/**
 * {Number} The debug ID of the 'next' AwTableColumnProvider.
 */
var _debug_nextColumnProviderId = 0;

/**
 * This class defines the name and behavior of a single column in the 'aw-table'. Column defaults are defined here
 * and can be overriden by the view-model.
 *
 * @class AwTableColumnInfo
 * @memberOf module:js/awColumnService
 */
var AwTableColumnInfo = function() {
    var colSelf = this;

    /**
     * @property {String} name - Internal (non-localized) name of the column.
     *
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.name = '';

    /**
     * @property {String} displayName - User facing (localized) name of the column.
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.displayName = '';

    /**
     * @property {Function} api - callback functions
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.api = null;

    /**
     * @property {Boolean} enableColumnResizing - allow column resize?
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.enableColumnResizing = true;

    /**
     * @property { Boolean } enableRendererContribution- allow to override default cellRender template?
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.enableRendererContribution = true;

    /**
     * @property {Number|String} width - Default number of pixels or '*' for auto.
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.width = 150;

    /**
     * @property {Number|String} minWidth - min Number of pixels
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.minWidth = 20;

    /**
     * @property {Boolean} enableHiding - enable column hiding
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.enableHiding = true;

    /**
     * @property {Boolean} enableSorting - expose sorting
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.enableSorting = true; // sorting will come later

    /**
     * @property {Boolean} enableColumnMenu - expose column menu
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.enableColumnMenu = true;

    /**
     * @property {Boolean} ? - enable column filtering
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.isFilteringEnabled = true;

    /**
     * @property {Boolean} ? - enable column rearrange
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.enableColumnMoving = true;

    /**
     * @property {Boolean} ? - enable tooltip on header
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.headerTooltip = true;

    /**
     * @property {Boolean} isCommand - TRUE if this column is being used to handle display and management of
     *           commands table navigation (e.g. Often the 1st column displaying the primary ID/Name of the object
     *           in that row).
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.isTableCommand = false;

    /**
     * @property {Boolean} isTreeNavigation - TRUE if this column is being used to handle tree-table navigation
     *           (e.g. node expand/collapse and any other specific display options).
     * @memberOf module:js/awColumnService~AwTableColumnInfo
     */
    colSelf.isTreeNavigation = false;
};

/**
 * @param {Number} columnOrder -
 * @param {Boolean} hiddenFlag -
 * @param {Number} pixelWidth -
 * @param {String} propertyName -
 * @param {String} sortDirection -
 * @param {Number} sortPriority -
 * @param {String} typeName -
 * @param {Boolean} isFilteringEnabled - Flag for filter enabled/disabled on this column
 */
var AwSoaColumnInfo = function( columnOrder, hiddenFlag, pixelWidth, propertyName, sortDirection, sortPriority,
    typeName, isFilteringEnabled ) {
    var scSelf = this;

    /**
     * {Number}
     */
    scSelf.columnOrder = columnOrder;

    /**
     * {Boolean}
     */
    scSelf.hiddenFlag = hiddenFlag;

    /**
     * {Number}
     */
    scSelf.pixelWidth = pixelWidth;

    /**
     * {String}
     */
    scSelf.propertyName = propertyName;

    /**
     * {String} ASC or DESC
     */
    scSelf.sortDirection = sortDirection;

    /**
     * {Number}
     */
    scSelf.sortPriority = sortPriority;

    /**
     * {String}
     */
    scSelf.typeName = typeName;

    /**
     * {Boolean}
     */
    scSelf.isFilteringEnabled = isFilteringEnabled;
};

/**
 * Create the column provider
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' with the properties to use.
 * @param {Object} $scope - The AngularJS data context node.
 * @param {OjectArray} commands - Array of command objects to associate with the 'isTableCommand' or
 *            'isTreeNavigation' column.
 * @param {String} gridId - The ID of the associated 'declGrid'.
 */
var AwTableColumnProvider = function( declViewModel, $scope, commands, gridId, commandsAnchor ) {
    var cpSelf = this;

    var _declViewModel = declViewModel;
    var _$scope = $scope;
    var _commands = commands;
    var _gridId = gridId;

    /**
     * Set the ID of this instance.
     */
    cpSelf.id = _debug_nextColumnProviderId++;

    /**
     * {Object} _uwDataProvider - A UwDataProvider based on the dataProvider in the DeclViewModel JSON specified by
     * the DeclGrid.
     */
    var _uwDataProvider = null;

    /**
     * {Object} _declColumnProviderJSON - A UwDataProvider based on the columnProvider in the DeclViewModel JSON
     * specified by the DeclGrid.
     */
    var _declColumnProviderJSON = null;

    /**
     * {Boolean} _includeIconColumn - TRUE if the 1st column should be used to display the 'type icon' of the object
     * in each of the rows.
     */
    var _includeIconColumn = true;

    /**
     * {Boolean} _pinIconColumn - TRUE if the 1st column should be pinned to the left so that it is not scroll with
     * the rest of the columns in the table.
     */
    var _pinIconColumn = true;

    /**
     * {Boolean} _soaEnabled - TRUE if this service is allowed to access soaService APIs.
     * <P>
     * Note: This service can be used in non
     */
    var _soaEnabled = true;

    /**
     * Make the little tweaks that are necessary.
     *
     * @param {AwTableColumnInfo} columnInfo - The column to be tweaked.
     *
     * @param {Boolean} isArrangeSupported - TRUE if columns should be allowed to move (but only if they wanted to in the first place).
     *            FALSE if ALL columns should be fixed and not movable.
     *
     * @param {Boolean} isSortingSupported - TRUE if columns should be allowed to be corted.
     */
    function _tweakColumnInfo( columnInfo, isArrangeSupported, isSortingSupported ) {
        // make sure propDescriptor isn't null
        columnInfo.propDescriptor = columnInfo.propDescriptor || {};

        /**
         * Override 'enableColumnMoving' if 'arrange' not supported.
         */
        if( !isArrangeSupported ) {
            columnInfo.enableColumnMoving = false;
        }

        /**
         * Override 'enableSorting' if 'sorting' not supported.
         */
        if( !isSortingSupported ) {
            columnInfo.enableSorting = false;
        }

        /**
         * For now, we do not have any support for column menus.
         */
        columnInfo.enableColumnMenus = false;

        /**
         * Check if we DO NOT have a 'displayName' property but we do have a 'typeName' property<BR>
         * If so: Make the 'displayName' the localized name of the type.
         */
        if( !columnInfo.displayName ) {
            if( columnInfo.typeName ) {
                var type = cmm.getType( columnInfo.typeName );

                if( type && type.propertyDescriptorsMap[ columnInfo.propertyName ] ) {
                    columnInfo.displayName = type.propertyDescriptorsMap[ columnInfo.propertyName ].displayName;
                } else {
                    columnInfo.displayName = columnInfo.propertyName;
                }
            } else {
                columnInfo.typeName = columnInfo.columnSrcType;
                columnInfo.displayName = columnInfo.propDescriptor.displayName || columnInfo.displayName;
            }
        }

        /**
         * Make sure was have a 'name' property (If not: Set it to the same as the 'propertyName' property).
         */
        columnInfo.name = columnInfo.name || columnInfo.propDescriptor.propertyName || columnInfo.propertyName;

        /**
         * If we have a 'pixelWidth' property, set the 'width' property to that value as well.
         */
        columnInfo.width = columnInfo.pixelWidth || columnInfo.width;

        /**
         * Make sure was have a 'visible' property (If not: Set it to the same as the 'hiddenFlag' property or just
         * default to 'true').
         */
        if( !columnInfo.visible ) {
            if( !declUtils.isNil( columnInfo.hiddenFlag ) ) {
                columnInfo.visible = !columnInfo.hiddenFlag;
            } else {
                columnInfo.visible = true;
            }
        }

        /**
         * Make sure we have a 'field' (use 'name' is default)
         */
        columnInfo.field = columnInfo.field || columnInfo.name;

        columnInfo.name = columnInfo.typeName ? columnInfo.typeName + '.' + columnInfo.name : columnInfo.name;

        /**
         * Setup to handle column sorting (if necessary)
         */
        if( columnInfo.enableSorting ) {
            /**
             * Fix for LCS-99462 - (Grid) Column sorting arrow not maintained, when switch to another view mode.
             */
            if( _.isEmpty( columnInfo.sort ) ) {
                columnInfo.sort = {};
            }

            if( _declColumnProviderJSON.sortCriteria ) {
                // loop over column provider's sort criteria here and reapply as-needed
                if( _declColumnProviderJSON.sortCriteria ) {
                    try {
                        declarativeDataCtxSvc.applyScope( _declViewModel, _declColumnProviderJSON.sortCriteria, _declViewModel._internal.functions, _$scope, null );
                    } catch ( error ) {
                        throw new Error( error );
                    }
                }
                _.forEach( _declColumnProviderJSON.sortCriteria, function( sortCriteria ) {
                    if( columnInfo.name === sortCriteria.fieldName || columnInfo.propertyName === sortCriteria.fieldName ) {
                        columnInfo.sort.direction = sortCriteria.sortDirection.toLowerCase();
                        columnInfo.sort.priority = 0;
                    }
                } );
            }

            columnInfo.sortingAlgorithm = function( a, b, rowA, rowB, sortDir ) { // eslint-disable-line no-unused-vars
                var vmPropA = rowA.entity.props[ columnInfo.field ];
                var vmPropB = rowB.entity.props[ columnInfo.field ];

                var valA = '';
                var valB = '';

                if( vmPropA.uiValue ) {
                    valA = vmPropA.uiValue;
                }

                if( vmPropB.uiValue ) {
                    valB = vmPropB.uiValue;
                }

                var strA = valA.toLowerCase();
                var strB = valB.toLowerCase();

                return strA === strB ? 0 : strA.localeCompare( strB );
            };
        }
    } // _tweakColumnInfo

    /**
     * Build the final set of columnInfos from the given array of columnInfos.
     *
     * @param {ObjectArray} columnInfoIn - Array of column settings from declarative model.
     *
     * @return {AwTableColumnInfoArray} Array of AwTableColumnInfo initialized with the given column settings (plus
     *         an 'icon' column as the 1st column, if requested by this columnProvider).
     */
    function _buildFinalColumnInfos( columnInfoIn ) {
        let finalColumnInfos = [];

        let newColumnInfo;

        if( _includeIconColumn ) {
            let iconColumnFound = false;
            let iconCellRenderer = null;

            _.forEach( columnInfoIn, function( colInfo ) {
                if( colInfo.name === 'icon' ) {
                    iconColumnFound = true;
                    return false;
                }
                // This block is added for PL table. Since icon column is hardcoded in this service,
                // there is no way to provide a cell template at application layer. So added this hack.
                // Once we correct the hardcoded way of creating icon column, this will no more be needed.
                if( colInfo.isTableCommand && colInfo.iconCellRenderer ) {
                    iconCellRenderer = colInfo.iconCellRenderer;
                    return false;
                }
            } );

            if( !iconColumnFound ) {
                // Setup the special icon column
                newColumnInfo = new AwTableColumnInfo();

                newColumnInfo.name = 'icon';
                newColumnInfo.displayName = '';
                newColumnInfo.width = 34;
                newColumnInfo.enableColumnMoving = false;
                newColumnInfo.enableColumnMenu = false;
                newColumnInfo.enableColumnResizing = false;
                newColumnInfo.isFilteringEnabled = columnInfoIn.isFilteringEnabled !== false;
                newColumnInfo.enableSorting = false;
                newColumnInfo.visible = true;

                if( _pinIconColumn ) {
                    newColumnInfo.pinnedLeft = true;
                }

                if( iconCellRenderer ) {
                    newColumnInfo.iconCellRenderer = iconCellRenderer;
                }

                finalColumnInfos.push( newColumnInfo );
            }
        }

        let isArrangeSupported = cpSelf.isArrangeSupported();
        let isSortingSupported = cpSelf.isSortingSupported();

        let needsNavigationColumn = true;
        _.forEach( columnInfoIn, function( colInfo ) {
            if( colInfo.isTableCommand || colInfo.isTreeNavigation ) {
                needsNavigationColumn = false;
                return false;
            }
            return true;
        } );

        /**
         * Create a new ('tweaked') AwTableColumnInfo for each of the given awColumnInfos.
         */
        _.forEach( columnInfoIn, function( info ) {
            newColumnInfo = new AwTableColumnInfo();

            /**
             * Move over all existing property values
             */
            _.forEach( info, function( value, name ) {
                newColumnInfo[ name ] = value;
            } );

            if( needsNavigationColumn ) {
                if( _uwDataProvider && _uwDataProvider.accessMode === 'tree' ) {
                    newColumnInfo.isTreeNavigation = true;
                } else {
                    newColumnInfo.isTableCommand = true;
                }

                needsNavigationColumn = false;
            }

            if( ( newColumnInfo.isTreeNavigation || newColumnInfo.isTableCommand ) && _commands ) {
                newColumnInfo.commands = _commands;
            }

            newColumnInfo.commandsAnchor = commandsAnchor;

            // Even if sorting is supported at data provider level, if could be disabled at column level.
            // check both values to decide sort enablement.

            let sortPossibleForProp = isSortingSupported && newColumnInfo.enableSorting;

            let typeDesc = cmm.getType( newColumnInfo.typeName );
            if( typeDesc ) {
                let propDesc = typeDesc.propertyDescriptorsMap[ newColumnInfo.propertyName ];
                if( propDesc ) {
                    // if no dataType specified, use property descriptor
                    if( !newColumnInfo.dataType ) {
                        newColumnInfo.dataType = propDesc.valueType;
                    }
                }
            }

            /**
             * Adjust the properties (as necessary)
             */
            _tweakColumnInfo( newColumnInfo, isArrangeSupported, sortPossibleForProp );

            // Add column filter
            if( declGrid.gridOptions.isFilteringEnabled && newColumnInfo.isFilteringEnabled !== false ) {
                let existingFilters = [];

                _.forEach( _declColumnProviderJSON.columnFilters, function( currentFilter ) {
                    if( newColumnInfo.field === currentFilter.columnName ) {
                        existingFilters.push( currentFilter );
                    }
                } );

                // Make sure filterDefinition of column is not lost when rebuilding
                _.forEach( _uwDataProvider.cols, function( oldCol ) {
                    if( newColumnInfo.name === oldCol.name && oldCol.filterDefinition ) {
                        newColumnInfo.filterDefinition = oldCol.filterDefinition;
                    }
                } );

                awColumnFilterService.updateColumnFilter( newColumnInfo, existingFilters );
            }

            /**
             * check for duplicate column before adding
             */
            if( finalColumnInfos.find( function( finalColumnInfo ) {
                    return finalColumnInfo.name === newColumnInfo.name &&
                        finalColumnInfo.typeName === newColumnInfo.typeName;
                } ) ) {
                logger.warn( 'Skipping duplicate column: ' + newColumnInfo.name );
            } else {
                finalColumnInfos.push( newColumnInfo );
            }
        } );
        // Set sort from columns if sortCriteria is empty
        if ( _declColumnProviderJSON && _.isEmpty( _declColumnProviderJSON.sortCriteria ) ) {
            let sortPriority = NaN;
            let sortDirection = '';
            let sortColumn = null;
            _.forEach( finalColumnInfos, function( currentColumn ) {
                if ( currentColumn.sortDirection && ( isNaN( sortPriority ) || currentColumn.sortPriority < sortPriority ) ) {
                    sortPriority = currentColumn.sortPriority;
                    sortDirection = currentColumn.sortDirection.toLowerCase().includes( 'desc' ) ? 'DESC' : 'ASC';
                    sortColumn = currentColumn;
                }
            } );
            if ( sortColumn && sortColumn.enableSorting && sortDirection ) {
                sortColumn.sort.direction = sortDirection;
                sortColumn.sort.priority = 0;
                cpSelf.setSortCriteria( [ {
                    fieldName: sortColumn.field,
                    sortDirection: sortDirection
                } ] );
            }
        }
        // checking if columns are set as frozen via xrt or vmo json otherwise rendered the default frozen columns
        finalColumnInfos = _checkForFrozenColumnsConfiguration( finalColumnInfos );

        return finalColumnInfos;
    } // _buildFinalColumnInfos

    /**
     * checks and froze columns specified via xrt, vmo json or defualt.
     * 1st prefrence is given to xrt, then vmo json and at last if nothing is specified, default columns will be forzen.
     * (i.e. 1st col for tree & 1st,2nd col for table)
     * @param {Object} allColumns - all columns of ui grid.
     *
     * @return {Object} finalColumnInfos final columns config with frozen properties.
     */
    function _checkForFrozenColumnsConfiguration( allColumns ) {
        var xrtConfigured = _checkFrozenColumnParameterConfig( allColumns );

        if( !xrtConfigured ) {
            var vmJsonConfigured = _checkFrozenColumnJsonConfig( allColumns );

            if( !vmJsonConfigured ) {
                _defaultFrozenColumns( allColumns );
            }
        }

        return allColumns;
    }

    /**
     * check and froze columns as specified in xrt
     *
     * @param {Object} allColumns - all columns of ui grid.
     *
     * @return {Boolean} True if frozen column configuration is done via xrt.
     */
    function _checkFrozenColumnParameterConfig( allColumns ) {
        var frozenIndex = -1;
        // find the frozen col index
        allColumns.forEach( function( col, index ) {
            if( col.parameters && col.parameters.frozen === 'true' ) {
                frozenIndex = index;
            }
        } );

        // froze all columns upto xrt configured frozen col.
        if( frozenIndex !== -1 && frozenIndex <= allColumns.length ) {
            for( var i = 0; i <= frozenIndex; i++ ) {
                allColumns[ i ].pinnedLeft = true;
            }
            return true;
        }
        return false;
    }

    /**
     * check and froze columns as specified in view model json
     *
     * @param {Object} allColumns - all columns of ui grid.
     *
     * @return {Boolean} True if frozen column configuration is done via vmo json.
     */
    function _checkFrozenColumnJsonConfig( allColumns ) {
        if( _declViewModel && _declViewModel.columnProviders ) {
            var columnProviders = [];
            for( var provider in _declViewModel.columnProviders ) {
                columnProviders.push( provider );
            }

            var frozenIndex = _declViewModel.columnProviders[ columnProviders[ 0 ] ].frozenColumnIndex;

            if( frozenIndex === undefined ) {
                return false;
            }

            if( frozenIndex >= 0 && frozenIndex <= allColumns.length ) {
                // froze all columns upto frozenIndex specified in vmo json.
                for( var index = 0; index <= frozenIndex; index++ ) {
                    allColumns[ index ].pinnedLeft = true;
                }
            }
            return true;
        }
        return false;
    }

    /**
     * freezing default columns i.e. 1st col for tree & 1st,2nd col for table
     *
     * @param {Object} allColumns - all columns of ui grid.             *
     */
    function _defaultFrozenColumns( allColumns ) {
        if( allColumns && allColumns.length > 0 ) {
            if( allColumns[ 0 ].name === 'icon' ) {
                // this for table
                // 0th column (contains icon) + 1st column must be frozen in table as an AC of AW-4227 & AW-67931
                allColumns[ 0 ].pinnedLeft = true;
                if( allColumns[ 1 ] ) {
                    allColumns[ 1 ].pinnedLeft = true;
                }
            } else {
                // In tree, 0th column (contains icon + name) must be frozen
                allColumns[ 0 ].pinnedLeft = true;
            }
        }
    }

    /**
     * @param {Object} columnProviderJSON - JSON object where the columnProvider is defined.
     *
     * @return {Promise} Promise resolved with the loaded AwColumnInfos.
     */
    function _initializedFromJSON( columnProviderJSON ) {
        /**
         * Set whether this column provider should interact with SOA APIs.
         */
        if( !declUtils.isNil( columnProviderJSON.soaEnabled ) ) {
            _soaEnabled = columnProviderJSON.soaEnabled;
        }
        if( _declColumnProviderJSON ) {
            try {
                declarativeDataCtxSvc.applyScope( _declViewModel, _declColumnProviderJSON, null, _$scope, null );
            } catch ( error ) {
                throw new Error( error );
            }
        }

        /**
         * Check for column load and row property actions
         */
        var loadColumnAction = columnProviderJSON.loadColumnAction ? _declViewModel
            .getAction( columnProviderJSON.loadColumnAction ) : null;

        if( loadColumnAction ) {
            if( loadColumnAction.deps ) {
                return declUtils.loadDependentModule( loadColumnAction.deps ).then(
                    function( moduleObj ) {
                        return _executeLoadColumnAction( loadColumnAction, moduleObj );
                    } );
            }

            return _executeLoadColumnAction( loadColumnAction, null );
        }

        /**
         * Load from the dataProvider (if possible)
         */
        if( !_.isEmpty( _uwDataProvider.columnConfig ) && !_.isEmpty( _uwDataProvider.columnConfig.columns ) ) {
            _uwDataProvider.cols = _buildFinalColumnInfos( _uwDataProvider.columnConfig.columns );

            return AwPromiseService.instance.resolve( _uwDataProvider.cols );
        } else if( columnProviderJSON ) {
            if( !_.isEmpty( columnProviderJSON.columnConfig ) && !_.isEmpty( columnProviderJSON.columnConfig.columns ) ) {
                _uwDataProvider.cols = _buildFinalColumnInfos( columnProviderJSON.columnConfig.columns );

                return AwPromiseService.instance.resolve( _uwDataProvider.cols );
            } else if( !_.isEmpty( columnProviderJSON.columns ) ) {
                /**

                /**
                 * For static column provider, setting width to auto and minWidth to 150.
                 */
                _.forEach( columnProviderJSON.columns, function autoResizeStaticColumns( column ) {
                    if( !column.width ) {
                        column.width = '*';
                        column.minWidth = 150;
                    }
                } );

                _updateColumnInfosFromColumnInfos( _uwDataProvider, columnProviderJSON.columns );

                return AwPromiseService.instance.resolve( _uwDataProvider.cols );
            }
        }

        return AwPromiseService.instance.resolve( [] );
    }

    /**
     * @param {DeclAction} loadColumnAction - Action used to load columns.
     * @param {Object} loadColumnModuleObj - (Optional) Module API object to use when executing the action.
     *
     * @return {Promise} Promise resolved with the loaded AwColumnInfos.
     */
    function _executeLoadColumnAction( loadColumnAction, loadColumnModuleObj ) {
        /**
         * Check if the $scope we need has been destroyed (due to DOM manipulation) since the action event
         * processing was started.
         */
        var localDataCtx = declUtils.resolveLocalDataCtx( _declViewModel, _$scope );

        if( loadColumnAction ) {
            return actionSvc.executeAction( _declViewModel, loadColumnAction, localDataCtx, loadColumnModuleObj )
                .then( function( columnResult ) {
                    if( columnResult && columnResult.columnInfos ) {
                        _uwDataProvider.cols = _buildFinalColumnInfos( columnResult.columnInfos );
                    } else if( _uwDataProvider.columnConfig && _uwDataProvider.columnConfig.columns ) {
                        _uwDataProvider.cols = _buildFinalColumnInfos( _uwDataProvider.columnConfig.columns );
                    }

                    return _uwDataProvider.cols;
                } );
        }

        return AwPromiseService.instance.resolve( _uwDataProvider.cols );
    }

    /**
     *
     * @param {AwColumnInfoArray} columnInfos - Collection of Object containing the 'cok
     */
    function _updateColumnInfosFromColumnInfos( uwDataProvider, columnInfos ) {
        uwDataProvider.cols = _buildFinalColumnInfos( columnInfos );
    } // _updateColumnInfosFromColumnInfos

    /**
     * ---------------------------------------------------------------------<br>
     * Define the exposed API <BR>
     * ---------------------------------------------------------------------<br>
     */

    /**
     * Build the new dynamic columns, and update the grid control
     *
     * @param {AwTableColumnInfoArray} columnInfosIn - the new set of columns
     * @param {Boolean} updateDataProvider - update the grid ui?
     * @returns {Promise} to ensure _uwDataProvider.cols is updated before used.
     */
    cpSelf.buildDynamicColumns = function( columnInfosIn, updateDataProvider ) {
        if( _soaEnabled ) {
            var typeNames = [];

            _.forEach( columnInfosIn, function( columnInfo ) {
                if( columnInfo.typeName ) {
                    typeNames.push( columnInfo.typeName );
                } else if( columnInfo.associatedTypeName ) {
                    typeNames.push( columnInfo.associatedTypeName );
                }
            } );
            typeNames = _.uniq( typeNames );

            return soaService.ensureModelTypesLoaded( typeNames ).then( function() {
                var columnInfos = _buildFinalColumnInfos( columnInfosIn );

                if( updateDataProvider ) {
                    var oldCols = _uwDataProvider.cols;
                    _uwDataProvider.cols = columnInfos;

                    // preserve properties that were not included in new columns
                    _.forEach( oldCols, function( oldCol ) {
                        _.forEach( _uwDataProvider.cols, function( currentColumn ) {
                            if( currentColumn.name === oldCol.name ) {
                                if( oldCol.enableColumnMoving === false ) {
                                    currentColumn.enableColumnMoving = false;
                                }
                                // Handle column filter logic
                                awColumnFilterService.updateNewColumnFilter( currentColumn, oldCol, _gridId );
                                // XRT properties
                                var xrtProperties = [ 'renderingHint', 'parameters', 'modifiable', 'isTableCommand', 'enableSorting', 'isFilteringEnabled' ];

                                _.forEach( xrtProperties, function( propertyName ) {
                                    if( currentColumn[ propertyName ] === undefined ) {
                                        currentColumn[ propertyName ] = oldCol[ propertyName ];
                                    }
                                } );

                                return false;
                            }
                        } );
                    } );
                }
            } );
        } else if( updateDataProvider ) {
            _uwDataProvider.cols = _buildFinalColumnInfos( columnInfosIn );
        }
    }; // buildDynamicColumns

    /**
     * Get the current columns
     *
     * @return {ArrayUwGridColumnInfo} an array of UwGridColumnInfo that represent the columns specified by EITHER
     *         the given 'declViewModel' (columnPropNames, columnDisplayNames & nColsToFreeze) OR
     *         'declGrid.columnDefs'
     */
    cpSelf.getColumns = function() {
        return _uwDataProvider.cols;
    };

    /**
     * Change the size of one of the columns
     *
     * @param {String} name - The name of the column that has had it's size change
     * @param {Integer} delta - The change in size of the column
     *
     */
    cpSelf.columnSizeChanged = function( name, delta ) {
        var columnInfos = cpSelf.getColumns();

        _.forEach( columnInfos, function( columnInfo ) {
            if( columnInfo.name === name ) {
                columnInfo.width += delta;

                /**
                 * Previously ui-grid was enforcing min and max, but it seems we need to do it here for now Also
                 * round since IE11 is returning a float instead of an int
                 */
                columnInfo.width = Math.round( Math.max( columnInfo.width, columnInfo.minWidth ) );

                if( columnInfo.pixelWidth ) {
                    columnInfo.pixelWidth = columnInfo.width;
                }

                return false;
            }
        } );

        eventBus.publish( 'columnArrange', {
            name: _gridId,
            arrangeType: 'saveColumnAction',
            columns: columnInfos
        } );
    };

    /**
     * Re-order one of the columns
     *
     * @param {String} name - The name of the column that has been moved
     * @param {Integer} origPosition - column's original position
     * @param {Integer} newPosition - column's new position
     */
    cpSelf.columnOrderChanged = function( name, origPosition, newPosition ) {
        var columnInfos = cpSelf.getColumns();

        // assume icon is using col 0 and we don't have to adjust indexes for splicing below
        // if not, adjust indexes
        if( columnInfos[ 0 ].name !== 'icon' ) {
            origPosition = origPosition > 0 ? origPosition - 1 : 0;
            newPosition = newPosition > 0 ? newPosition - 1 : 0;
        }

        // dis-allow positioning to the left of any initial un-moveable columns
        while( columnInfos[ newPosition ] && columnInfos[ newPosition ].enableColumnMoving === false ) {
            newPosition++;
        }

        var movedColumnInfo = columnInfos.splice( origPosition, 1 );
        columnInfos.splice( newPosition, 0, movedColumnInfo[ 0 ] );

        eventBus.publish( 'columnArrange', {
            name: _gridId,
            arrangeType: 'saveColumnAction',
            columns: columnInfos
        } );
    };

    /**
     * Hide one of the columns
     *
     * @param {Integer} columnIndex - The index of the column that has been hidden
     */
    cpSelf.hideColumn = function( columnIndex ) {
        var columnInfos = cpSelf.getColumns();
        let operation = _uwDataProvider.columnConfig ? _uwDataProvider.columnConfig.operationType : '';

        columnInfos[ columnIndex ].hiddenFlag = true;

        eventBus.publish( 'columnArrange', {
            name: _gridId,
            arrangeType: 'saveColumnAndLoadAction',
            columns: columnInfos,
            operationType: operation
        } );
    };

    /**
     * Get the current sort criteria
     */
    cpSelf.getSortCriteria = function() {
        if( _declColumnProviderJSON ) {
            return _declColumnProviderJSON.sortCriteria;
        }
    };

    /**
     * Set the current sort criteria
     *
     * @param {Object[]} sortCriteria - The new sort criteria
     */
    cpSelf.setSortCriteria = function( sortCriteria ) {
        if( _declColumnProviderJSON ) {
            _declColumnProviderJSON.sortCriteria = sortCriteria;
        }
    };

    /**
     * Get the current column filters
     * @return {Object[]} columnFilters - the column filters
     */
    cpSelf.getColumnFilters = function() {
        if( _declColumnProviderJSON ) {
            return _declColumnProviderJSON.columnFilters;
        }
    };

    /**
     * Set the column filters
     * @param {Object[]} columnFilters - the column filters
     */
    cpSelf.setColumnFilters = function( columnFilters ) {
        if( _declColumnProviderJSON ) {
            _declColumnProviderJSON.columnFilters = columnFilters;
        }
    };

    /**
     * Free up all resources held/managed by this object.
     * <P>
     * Note: After this function, no API call should be considered valid. This function is intended to be called
     * when the $scope of any associated viewModel is also being 'destroyed'. After this call (and a GC event), any
     * objects managed by this class may be considered a 'memory leak'.
     */
    cpSelf.destroy = function() {
        _declViewModel = null;
        _uwDataProvider = null; // Note: We did not create this object, so it's not ours to destroy
        _$scope = null;
        _commands = null;

        cpSelf = null;
    };

    /**
     * @return {Boolean} TRUE if the declColumnProvider associated with this tableColumnProvider specifies the
     *         additional declActions necessary to support column arranging.
     */
    cpSelf.isArrangeSupported = function() {
        declUtils.assertValidModel( _declViewModel );

        var declGrid = _declViewModel.grids[ _gridId ];

        assert( declGrid, 'Invalid declGrid' );

        if( _declViewModel.columnProviders ) {
            var colProvider = _declViewModel.columnProviders[ declGrid.columnProvider ];

            assert( colProvider, 'Invalid columnProvider' );

            return colProvider.resetColumnAction && colProvider.saveColumnAndLoadAction;
        }

        return false;
    };

    /**
     * @return {Boolean} TRUE support column filtering.
     */
    cpSelf.isFilteringSupported = function() {
        declUtils.assertValidModel( _declViewModel );

        var declGrid = _declViewModel.grids[ _gridId ];

        assert( declGrid, 'Invalid declGrid' );

        return declGrid.gridOptions.isFilteringEnabled === true;
    };

    /**
     * @return {Boolean} TRUE if the declColumnProvider associated with this tableColumnProvider specifies the
     *         additional option or declActions necessary to support column sorting.
     */
    cpSelf.isSortingSupported = function() {
        declUtils.assertValidModel( _declViewModel );

        var declGrid = _declViewModel.grids[ _gridId ];

        assert( declGrid, 'Invalid declGrid' );

        /**
         * Check if the declGrid options indicates if 'external' sorting is supported or not.
         */
        if( !declUtils.isNil( declGrid.gridOptions.useExternalSorting ) ) {
            return declGrid.gridOptions.useExternalSorting;
        }

        /**
         * Since the options did not indicate support, check if the declColumnProvider indicates sorting by the
         * existence of a declAction for sorting.
         */
        if( !_declViewModel.columnProviders ) {
            return false;
        }
        var colProvider = _declViewModel.columnProviders[ declGrid.columnProvider ];

        assert( colProvider, 'Invalid columnProvider' );

        if( !declUtils.isNil( colProvider.sortColumnAction ) ) {
            return true;
        }

        /**
         * Note: Since aw3.3 'useExternalSorting' is true by default. This default should be changed to FALSE, but
         * until then we need to honor it here. The declGrid in the declViewModel should override that property if
         * they do NOT want 'useExternalSorting' to be true.
         */
        return true;
    };

    /**
     * @return {String} Column provider Id, it is equal to clientScopeURI for aw tables if specified.
     */
    cpSelf.getId = function() {
        declUtils.assertValidModel( _declViewModel );

        var declGrid = _declViewModel.grids[ _gridId ];

        assert( declGrid, 'Invalid declGrid' );

        if( _declViewModel.columnProviders ) {
            var colProvider = _declViewModel.columnProviders[ declGrid.columnProvider ];

            assert( colProvider, 'Invalid columnProvider' );

            return colProvider.id;
        }

        return null;
    };

    /**
     * @return {Promise} A Promise resolved with the initial array of AwTableColumnInfo.
     */
    cpSelf.initialize = function() {
        /**
         * Check for columnProvider on viewModel
         */
        if( _declColumnProviderJSON ) {
            return _initializedFromJSON( _declColumnProviderJSON );
        }

        /**
         * Use properties placed on the 'declViewModel' as the basis of the column information.
         * <P>
         * Note: This is what the shf measurement table does, but should update to use col provider
         */
        var columnPropNames = _declViewModel.columnPropNames ? _declViewModel.columnPropNames : [];
        var columnDisplayNames = _declViewModel.columnDisplayNames ? _declViewModel.columnDisplayNames : [];
        var nColsToFreeze = _declViewModel.nColsToFreeze ? _declViewModel.nColsToFreeze : 0;

        var newColumnInfos = [];

        for( var index = 0; index < columnPropNames.length; index++ ) {
            var columnInfo = new AwTableColumnInfo();

            columnInfo.name = columnPropNames[ index ];

            if( columnDisplayNames !== null && columnDisplayNames.length > index ) {
                columnInfo.displayName = columnDisplayNames[ index ];
            }

            if( index < nColsToFreeze ) {
                columnInfo.pinnedLeft = true;
            }

            newColumnInfos.push( columnInfo );
        }

        _uwDataProvider.cols = newColumnInfos;

        return AwPromiseService.instance.resolve( _uwDataProvider.cols );
    }; // initialize

    /**
     * ---------------------------------------------------------------------------<BR>
     * Property & Function definition complete....Finish initialization. <BR>
     * ---------------------------------------------------------------------------<BR>
     */

    /**
     * Validate parameters and initialize fields
     */
    assert( _declViewModel, 'No in DeclViewModel specified ' );
    assert( _gridId, 'No DeclGrid specified ' );

    var declGrid = _declViewModel.grids[ _gridId ];

    assert( declGrid, 'No DeclGrid specified ' );

    if( _declViewModel.dataProviders && declGrid.dataProvider ) {
        _uwDataProvider = _declViewModel.dataProviders[ declGrid.dataProvider ];
    }

    if( _declViewModel.columnProviders && declGrid.columnProvider ) {
        _declColumnProviderJSON = _declViewModel.columnProviders[ declGrid.columnProvider ];
        if( !_.isEmpty( _declColumnProviderJSON.columnConfig ) && !_.isEmpty( _declColumnProviderJSON.columnConfig.columns ) ) {
            _uwDataProvider.columnConfig = _declColumnProviderJSON.columnConfig;
            if( _declColumnProviderJSON.objectSetUri ) {
                _uwDataProvider.objectSetUri = _declColumnProviderJSON.objectSetUri;
            }
        }
    }

    assert( _uwDataProvider, 'No DataProvider specified in DeclViewModel' );

    if( declGrid.hasOwnProperty( 'addIconColumn' ) ) {
        _includeIconColumn = declGrid.addIconColumn;
    }

    if( declGrid.hasOwnProperty( 'pinIconColumn' ) ) {
        _pinIconColumn = declGrid.pinIconColumn;
    }
}; // AwTableColumnProvider

/**
 * ----------------------------------------------------------------------------<BR>
 * Define published service APIs<BR>
 * ----------------------------------------------------------------------------<BR>
 */
var exports = {};

/**
 * @param {Object} columnProperties - (Optional) An object who's properties will overwrite the default values of the
 *            new AwTableColumnInfo object.
 *
 * @return {AwTableColumnInfo} Newly created AwTableColumnInfo object.
 */
export let createColumnInfo = function( columnProperties ) {
    var columnInfo = new AwTableColumnInfo();

    if( columnProperties ) {
        _.forEach( columnProperties, function( value, name ) {
            columnInfo[ name ] = value;
        } );
    }

    return columnInfo;
};

/**
 * @param {AwTableColumnInfo} awColumnInfo -
 * @param {Number} columnOrder -
 */
export let createSoaColumnInfo = function( awColumnInfo, columnOrder ) {
    return new AwSoaColumnInfo( columnOrder, awColumnInfo.hiddenFlag, awColumnInfo.pixelWidth,
        awColumnInfo.propertyName, awColumnInfo.sortDirection, awColumnInfo.sortPriority, awColumnInfo.typeName, awColumnInfo.isFilteringEnabled );
};

/**
 * Create the column provider
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' with the properties to use.
 * @param {Scope} $scope - The AngularJS data context node.
 * @param {Array} commands - The list of associated commands
 * @param {String} gridId - The ID of the associated 'declGrid'.
 *
 * @return {AwTableColumnProvider} Newly created AwTableColumnProvider object.
 */
export let createColumnProvider = function( declViewModel, $scope, commands, gridId, commandsAnchor ) {
    return new AwTableColumnProvider( declViewModel, $scope, commands, gridId, commandsAnchor );
};

exports = {
    createColumnInfo,
    createSoaColumnInfo,
    createColumnProvider
};
export default exports;
app.factory( 'awColumnService', () => exports );
