// Copyright (c) 2020 Siemens

/**
 * @module js/arrange.service
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Set the visibility of the columns
 *
 * @param {Array} columns - columnDefs
 */
let setVisibilityOfColumns = function( columns ) {
    for( let i = 0; i < columns.length; i++ ) {
        columns[ i ].visible = columns[ i ].dbValue;
        columns[ i ].hiddenFlag = !columns[ i ].dbValue;
    }
};

/**
 * Set CSS visible of new column config element.
 *
 * @param {boolean} isVisible - value to remove or add visibility class
 */
let setVisibilityOfNewColumnConfigName = function( isVisible ) {
    let newConfigNameElement = document.getElementById( 'arrange_newColumnConfigName' );
    if ( newConfigNameElement ) {
        if ( isVisible ) {
            newConfigNameElement.classList.remove( 'invisible' );
        } else {
            newConfigNameElement.classList.add( 'invisible' );
        }
    }
};
/**
 * Return the column config that has set 'isCurrent'.
 *
 * @param {Array} columnConfigs - saved/loaded/existing named column configs
 * @returns {Object} the current named column config, or empty object
 */
let getCurrentColumnConfig = function( columnConfigs ) {
    let returnColumnConfig = {};
    if ( _.isArray( columnConfigs ) ) {
        _.forEach( columnConfigs, function( columnConfig ) {
            if ( columnConfig.isCurrent ) {
                returnColumnConfig = columnConfig;
                return false;
            }
        } );
    }
    return returnColumnConfig;
};

/**
 * Unload the loaded column config from the panel.
 *
 * @param {ViewModel} data - arrange panel viewModel
 * @param {Object} removedColumnConfig - removed/deleted column config
 */
let unloadColumnConfig = function( data, removedColumnConfig ) {
    data.arrangeData.loadedColumnConfigUid = data.arrangeData.originalColumnConfig.columnConfigUid;
    data.arrangeData.newColumnConfigName.dbValue = removedColumnConfig.columnConfigName;
    data.arrangeData.newColumnConfig.dbValue = true;
    data.arrangeData.columnConfigName.uiValue = '';
    setVisibilityOfNewColumnConfigName( true );
};

/**
 * Set the arrange status for button visibility.
 *
 * @param {Object} arrangeData - arrange panel data
 */
let setArrangeStatus = function( arrangeData ) {
    if ( arrangeData.newColumnConfig.dbValue ) {
        arrangeData.isArrange = false;
        arrangeData.isArrangeAndSave = false;
        arrangeData.isArrangeAndCreate = true;
    } else if ( arrangeData.isExistingColumnConfigLoaded || arrangeData.originalColumnConfig && arrangeData.originalColumnConfig.columnConfigName ) {
        arrangeData.isArrange = false;
        arrangeData.isArrangeAndSave = true;
        arrangeData.isArrangeAndCreate = false;
    } else {
        arrangeData.isArrange = true;
        arrangeData.isArrangeAndSave = false;
        arrangeData.isArrangeAndCreate = false;
    }
};

let createNamedSoaColumn = function( column ) {
    return {
        displayName: column.displayName,
        typeName: column.typeName,
        propertyName: column.propertyName,
        pixelWidth: column.pixelWidth,
        columnOrder: column.columnOrder,
        hiddenFlag: column.hiddenFlag,
        sortPriority: column.sortPriority,
        sortDirection: column.sortDirection,
        filterValue: column.filterValue,
        filterDefinitionKey: column.filterDefinitionKey,
        isFilteringEnabled: column.isFilteringEnabled,
        dataType: column.dataType,
        isFrozen: column.isFrozen
    };
};

let setFilteredColumns = function( filter, columnDefs, filteredColumnDefs ) {
    for( let i = 0; i < columnDefs.length; ++i ) {
        if( filter !== '' ) {
            var displayName = columnDefs[ i ].displayName.toLocaleLowerCase().replace( /\\|\s/g,
                '' );
            if( displayName.indexOf( filter.toLocaleLowerCase().replace( /\\|\s/g, '' ) ) !== -1 ) {
                // Filter matches a column name
                filteredColumnDefs.push( columnDefs[ i ] );
            }
        } else {
            // No filter
            filteredColumnDefs.push( columnDefs[ i ] );
        }
    }
};

let getOutputColumns = function( arrangeData ) {
    let arrangeColumns = _.concat( arrangeData.columnDefs, arrangeData.availableColumnDefs );
    setVisibilityOfColumns( arrangeColumns );
    arrangeColumns = _.orderBy( arrangeColumns, [ 'columnOrder' ], [ 'asc' ] );

    let outputColumns = [];
    if( arrangeData.useStaticFirstCol && arrangeData.staticColumn ) {
        outputColumns.push( arrangeData.staticColumn );
    }
    outputColumns.push( ...arrangeColumns );

    return outputColumns;
};

/**
 * Set the disability of the buttons for arrange.
 *
 * @param {boolean} isDisabled - whether to disable/enable arrange buttons
 */
export let setDisabilityOfArrange = function( isDisabled ) {
    let buttonElements = document.getElementsByClassName( 'arrange_submitButton' );
    _.forEach( buttonElements, function( currentButtonElement ) {
        if ( isDisabled ) {
            currentButtonElement.classList.add( 'disabled' );
        } else {
            currentButtonElement.classList.remove( 'disabled' );
        }
    } );
};

/**
 * Create the SOA columns for named column config input.
 *
 * @param {Object} arrangeData - contains arrange panel information
 * @param {Array} columns - column defs of the column config from arrange panel
 * @returns {Array} array of columns in simplified format
 */
export let createNamedSoaColumns = function( arrangeData ) {
    // Skip first column if useStaticFirstCol is true
    let soaColumns = [];
    if( arrangeData.useStaticFirstCol && arrangeData.staticColumn ) {
        soaColumns.push( createNamedSoaColumn( arrangeData.staticColumn ) );
    }
    let arrangeColumns = getOutputColumns( arrangeData );
    let soaArrangeColumns = arrangeColumns.map( function( currentColumn ) {
        return createNamedSoaColumn( currentColumn );
    } );

    soaColumns.push( ...soaArrangeColumns );

    return _.uniqBy( soaColumns, function( column ) {
        return column.propertyName;
    } );
};

/**
 * Get the clientScopeUri of the current table/sublocation.
 *
 * @returns {String} clientScopeUri
 */
export let getClientScopeUri = function() {
    return appCtxSvc.ctx.ArrangeClientScopeUI.objectSetUri || appCtxSvc.ctx.sublocation.clientScopeURI;
};

/**
 * Mark arrange data as dirty when column visibility changed.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export let columnVisibilityChanged = function( arrangeData ) {
    var allColumnsVisible = true;
    var i = 0;
    arrangeData.isColumnsSelected = false;
    for( i = 0; i < arrangeData.columnDefs.length; ++i ) {
        // Name column is always visible
        if( arrangeData.columnDefs[ i ].propertyName === 'object_name' && !arrangeData.columnDefs[ i ].dbValue ) {
            arrangeData.columnDefs[ i ].dbValue = true;
        }

        if( arrangeData.columnDefs[ i ].dbValue === true ) {
            arrangeData.isColumnsSelected = true;
        }
    }

    for( i = 0; i < arrangeData.columnDefs.length; ++i ) {
        if( !arrangeData.columnDefs[ i ].dbValue ) {
            allColumnsVisible = false;
            break;
        }
    }

    arrangeData.allColumnsVisible = allColumnsVisible;
    markDirty( arrangeData );
};

/**
 * Call the columnConfigLoadRedirect for arrange panel.
 *
 * @param {Object} loadedColumnConfig - named column config
 */
export let preLoadColumnConfig = function( loadedColumnConfig ) {
    eventBus.publish( 'arrangePanel.columnConfigLoadRedirect', loadedColumnConfig );
};

/**
 * Load an existing column configuration into the arrange panel.
 *
 * @param {ViewModel} data - View Model of the arrange panel
 * @param {Object} loadedColumnConfig - Column config to load in the arrange panel
 */
export let loadExistingColumnConfig = function( data, loadedColumnConfig ) {
    if ( loadedColumnConfig && loadedColumnConfig.columnConfig && loadedColumnConfig.columnConfig.columns ) {
        data.arrangeData.columnDefs.length = 0;
        data.arrangeData.orgColumnDefs.length = 0;
        data.arrangeData.availableColumnDefs.length = 0;
        data.arrangeData.staticColumn = null;

        data.arrangeData.loadedColumnConfig = loadedColumnConfig;
        data.arrangeData.loadedColumnConfigUid = loadedColumnConfig.columnConfigUid;
        data.arrangeData.columnConfigName.uiValue = loadedColumnConfig.columnConfigName || '';
        data.arrangeData.newColumnConfigName.dbValue = loadedColumnConfig.columnConfigName + '_copy';
        data.arrangeData.isExistingColumnConfigLoaded = true;

        let columnOrder = 100;
        for( var i = 0; i < loadedColumnConfig.columnConfig.columns.length; ++i ) {
            var column = loadedColumnConfig.columnConfig.columns[ i ];

            if( column.displayName && column.displayName !== '' ) {
                var columnDef = {
                    name: column.name,
                    displayName: column.displayName,
                    visible: !column.hiddenFlag,
                    columnOrder: columnOrder,
                    hiddenFlag: column.hiddenFlag,
                    isFilteringEnabled: column.isFilteringEnabled,
                    pixelWidth: column.pixelWidth,
                    propertyName: column.propertyName,
                    uid: column.propertyName,
                    sortDirection: column.sortDirection,
                    sortPriority: column.sortPriority,
                    typeName: column.typeName,
                    propertyDisplayName: column.displayName,
                    propertyLabelDisplay: 'PROPERTY_LABEL_AT_RIGHT',
                    propApi: {},
                    type: 'BOOLEAN',
                    dbValue: !column.hiddenFlag,
                    isEditable: true,
                    isEnabled: true
                };
                columnOrder += 100;
                // Skip first column if useStaticFirstCol is true
                if( data.arrangeData.useStaticFirstCol && i === 0 ) {
                    data.arrangeData.staticColumn = columnDef;
                    continue;
                }
                if( columnDef.visible ) {
                    data.arrangeData.columnDefs.push( columnDef );
                    var orgColumnDef = _.clone( columnDef );
                    data.arrangeData.orgColumnDefs.push( orgColumnDef );
                } else {
                    data.arrangeData.availableColumnDefs.push( columnDef );
                }
            }
        }
        data.arrangeData.operationType = 'union';

        // Reset panel inputs
        data.arrangeData.newColumnConfig.dbValue = false;
        setVisibilityOfNewColumnConfigName( false );
        data.filterBox.dbValue = '';
        data.arrangeData.filter = '';

        data.arrangeData.filteredColumnDefs = [];
        setFilteredColumns( data.arrangeData.filter, data.arrangeData.columnDefs, data.arrangeData.filteredColumnDefs );

        data.arrangeData.filteredAvailableColumnDefs = [];
        setFilteredColumns( data.arrangeData.filterAvailable, data.arrangeData.availableColumnDefs, data.arrangeData.filteredAvailableColumnDefs );

        data.dataProviders.dataProviderColumnConfigs.update( data.arrangeData.filteredColumnDefs, data.arrangeData.filteredColumnDefs.length );
        data.dataProviders.dataProviderAvailableColumnConfigs.update( data.arrangeData.filteredAvailableColumnDefs, data.arrangeData.filteredAvailableColumnDefs.length );
        eventBus.publish( 'arrangePanel.columnVisibilityChanged' );
        setDisabilityOfArrange( false );
    }
};

/**
 * Call the columnConfigRemoveRedirect for arrange panel.
 *
 * @param {Object} namedColumnConfig - named column config to remove
 */
export let preRemoveColumnConfig = function( namedColumnConfig ) {
    eventBus.publish( 'arrangePanel.columnConfigRemoveRedirect', namedColumnConfig );
};

/**
 * Remove the column config from the list of existing/saved.
 *
 * @param {ViewModel} data - View Model of the arrange panel
 * @param {Object} columnConfig - column config to remove
 */
export let removeNamedColumnConfigFromProvider = function( data, columnConfig ) {
    let removedConfigs = _.remove( data.arrangeData.savedColumnConfigs, function( currentConfig ) {
        return currentConfig.columnConfigUid === columnConfig.columnConfigUid;
    } );

    if ( removedConfigs[0] ) {
        if ( removedConfigs[0].isCurrent ) {
            reset( data.arrangeData );
        } else if ( removedConfigs[0].columnConfigUid === data.arrangeData.loadedColumnConfigUid ) {
            unloadColumnConfig( data, removedConfigs[0] );
        }
    }
};

/**
 * Filter and return list of column configs.
 *
 * @param {viewModelJson} data - The view model data
 */
export let actionFilterList = function( data ) {
    if( data.arrangeData.columnDefs === null ) {
        data.arrangeData.columnConfigId = appCtxSvc.ctx.ArrangeClientScopeUI.columnConfigId;
        data.arrangeData.objectSetUri = appCtxSvc.ctx.ArrangeClientScopeUI.objectSetUri;
        data.arrangeData.clientScopeUri = appCtxSvc.ctx.ArrangeClientScopeUI.objectSetUri || appCtxSvc.ctx.sublocation.clientScopeURI;
        data.arrangeData.operationType = appCtxSvc.ctx.ArrangeClientScopeUI.operationType;
        data.arrangeData.name = appCtxSvc.ctx.ArrangeClientScopeUI.name;
        data.arrangeData.useStaticFirstCol = appCtxSvc.ctx.ArrangeClientScopeUI.useStaticFirstCol;

        data.arrangeData.originalColumnConfig = getCurrentColumnConfig( data.arrangeData.savedColumnConfigs );
        data.arrangeData.loadedColumnConfigUid = data.arrangeData.originalColumnConfig.columnConfigUid;
        data.arrangeData.columnConfigName.uiValue = data.arrangeData.originalColumnConfig.columnConfigName || '';
        let newColumnConfigDefaultName = data.arrangeData.originalColumnConfig.columnConfigName ? data.arrangeData.originalColumnConfig.columnConfigName + '_copy' : data.i18n.defaultNewColumnConfigName;
        data.arrangeData.newColumnConfigName.dbValue = newColumnConfigDefaultName;

        data.arrangeData.columnDefs = [];
        data.arrangeData.availableColumnDefs = [];
        data.arrangeData.orgColumnDefs = [];
        let columnOrder = 100;
        for( var i = 0; i < appCtxSvc.ctx.ArrangeClientScopeUI.columns.length; ++i ) {
            var column = appCtxSvc.ctx.ArrangeClientScopeUI.columns[ i ];

            if( column.enableColumnHiding === false && ( data.arrangeData.useStaticFirstCol && i !== 0 || !data.arrangeData.useStaticFirstCol ) ) {
                continue;
            }

            if( column.displayName && column.displayName !== '' ) {
                let columnDefPropName = column.field ? column.field : column.name;
                var columnDef = {
                    name: column.name,
                    displayName: column.displayName,
                    visible: column.visible,
                    columnOrder: columnOrder,
                    hiddenFlag: !column.visible,
                    isFilteringEnabled: column.isFilteringEnabled,
                    pixelWidth: column.pixelWidth,
                    propertyName: columnDefPropName,
                    uid: columnDefPropName,
                    sortDirection: column.sortDirection ? column.sortDirection : '',
                    sortPriority: column.sortPriority,
                    typeName: column.typeName,
                    propertyDisplayName: column.displayName,
                    propertyLabelDisplay: 'PROPERTY_LABEL_AT_RIGHT',
                    propApi: {},
                    type: 'BOOLEAN',
                    dbValue: column.visible,
                    isEditable: true,
                    isEnabled: true
                };
                columnOrder += 100;
                // Skip first column if useStaticFirstCol is true
                if( data.arrangeData.useStaticFirstCol && i === 0 ) {
                    data.arrangeData.staticColumn = columnDef;
                    continue;
                }

                if ( columnDef.visible ) {
                    data.arrangeData.columnDefs.push( columnDef );
                    var orgColumnDef = _.clone( columnDef );
                    data.arrangeData.orgColumnDefs.push( orgColumnDef );
                } else {
                    data.arrangeData.availableColumnDefs.push( columnDef );
                }
            }
        }

        data.arrangeData.availableColumnDefs = _.sortBy( data.arrangeData.availableColumnDefs, function( column ) {
            return column.displayName;
        } );

        appCtxSvc.unRegisterCtx( 'ArrangeClientScopeUI' );

        if( !data.arrangeData.operationType && appCtxSvc.ctx.searchResponseInfo && appCtxSvc.ctx.searchResponseInfo.columnConfig &&
            appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType ) {
            data.arrangeData.operationType = appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType
                .toLowerCase();
        }

        let columnConfigNameChangeEvent = function() {
            data.arrangeData.columnConfigName.dirty = true;
            if ( !data.arrangeData.loadedColumnConfig || data.arrangeData.loadedColumnConfig !== data.arrangeData.columnConfigName.uiValue ) {
                data.arrangeData.isExistingColumnConfigLoaded = false;
            }
            markDirty( data.arrangeData );
        };

        if ( data.arrangeData.columnConfigName  ) {
            data.arrangeData.columnConfigName.propApi = data.arrangeData.columnConfigName.propApi || {};
            data.arrangeData.columnConfigName.propApi.fireValueChangeEvent = columnConfigNameChangeEvent;
        }
    }

    if( data.filterBox.dbValue ) {
        data.arrangeData.filter = data.filterBox.dbValue;
    } else {
        data.arrangeData.filter = '';
    }

    if( data.filterAvailableBox.dbValue ) {
        data.arrangeData.filterAvailable = data.filterAvailableBox.dbValue;
    } else {
        data.arrangeData.filterAvailable = '';
    }

    data.arrangeData.filteredColumnDefs = [];
    setFilteredColumns( data.arrangeData.filter, data.arrangeData.columnDefs, data.arrangeData.filteredColumnDefs );

    data.arrangeData.filteredAvailableColumnDefs = [];
    setFilteredColumns( data.arrangeData.filterAvailable, data.arrangeData.availableColumnDefs, data.arrangeData.filteredAvailableColumnDefs );

    data.dataProviders.dataProviderAvailableColumnConfigs.update( data.arrangeData.filteredAvailableColumnDefs, data.arrangeData.filteredAvailableColumnDefs.length );

    eventBus.publish( 'arrangePanel.columnVisibilityChanged' );
};

/**
 * Initialize the named column configs from list in input.
 *
 * @param {ViewModel} data - arrange panel view model
 * @param {Array} savedColumnConfigs -
 */
export let initializeNamedColumnConfigs = function( data, savedColumnConfigs ) {
    let namedColumnConfigs = [];

    if ( _.isArray( savedColumnConfigs ) ) {
        _.forEach( savedColumnConfigs, function( columnConfig ) {
            let tooltipDisplayName = columnConfig.columnConfigName;
            if ( columnConfig.isAdmin ) {
                tooltipDisplayName += ' (' + data.i18n.arrangeAdminTitle + ')';
            }
            let newColumnConfig = {
                propertyName: 'named_column_config',
                propertyDisplayName: columnConfig.columnConfigName,
                tooltipDisplayName: tooltipDisplayName,
                isModifiable: columnConfig.isModifiable,
                columnConfigUid: columnConfig.columnConfigUid,
                getId: function() {
                    return this.columnConfigUid;
                }
            };

            namedColumnConfigs.push( newColumnConfig );
        } );
    }

    data.namedColumnConfigs = namedColumnConfigs;
};

/**
 * Select one or more columns.
 *
 * @param {viewModelJson} data - The view model data
 * @param {viewModelJson} eventData - Event data
 */
export let selectColumn = function( data, eventData ) {
    let selectedColumns = eventData.selectedObjects.length ? eventData.selectedObjects : data.dataProviders.dataProviderColumnConfigs.selectedObjects;
    if( selectedColumns.length > 0 ) {
        // Set selectedColumns array to the order they appear on the arrange panel, not the order in which they were added to the selection
        let updatedSelectedColumns = _.intersection( data.arrangeData.columnDefs, selectedColumns );
        data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( updatedSelectedColumns );
        data.dataProviders.dataProviderAvailableColumnConfigs.selectionModel.setSelection( [] );
    } else {
        if( data.dataProviders.dataProviderColumnConfigs.selectedObjects.length > 0 || eventData.selectedObjects.length > 0 ) {
            data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( [] );
        }
    }
};

/**
 * Select one or more columns.
 *
 * @param {viewModelJson} data - The view model data
 * @param {viewModelJson} eventData - Event data
 */
export let selectAvailableColumn = function( data, eventData ) {
    let selectedAvailableColumns = eventData.selectedObjects.length ? eventData.selectedObjects : data.dataProviders.dataProviderAvailableColumnConfigs.getSelectedObjects();
    if( selectedAvailableColumns.length > 0 ) {
        // Set selectedColumns array to the order they appear on the arrange panel, not the order in which they were added to the selection
        let updatedSelectedAvailableColumns = _.intersection( data.arrangeData.availableColumnDefs, eventData.selectedObjects );
        data.dataProviders.dataProviderAvailableColumnConfigs.selectionModel.setSelection( updatedSelectedAvailableColumns );
        data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( [] );
    } else {
        data.dataProviders.dataProviderAvailableColumnConfigs.selectionModel.setSelection( [] );
    }
    eventBus.publish( 'columnChanged' );
};

/**
 * Move selected column up.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {viewModelJson} dataProvider - The dataProvider
 */
export let moveUp = function( arrangeData, dataProvider ) {
    let columnOrder = 100;
    for( let i = 0; i < arrangeData.columnDefs.length; i++ ) {
        arrangeData.columnDefs[i].columnOrder = columnOrder;
        columnOrder += 100;
    }

    let selectedColumns = dataProvider.getSelectedObjects();
    _.forEach( selectedColumns, function( column ) {
        for( var i = 0; i < arrangeData.columnDefs.length; ++i ) {
            if( arrangeData.columnDefs[ i ] === column ) {
                arrangeData.columnDefs[ i ].columnOrder -= 100;
                arrangeData.columnDefs[ i - 1 ].columnOrder += 100;

                arrangeData.columnDefs[ i ] = arrangeData.columnDefs[ i - 1 ];
                arrangeData.filteredColumnDefs[ i ] = arrangeData.columnDefs[ i - 1 ];
                arrangeData.columnDefs[ i - 1 ] = column;
                arrangeData.filteredColumnDefs[ i - 1 ] = column;
                break;
            }
        }
    } );
    eventBus.publish( 'columnChanged' );
};


/**
 * Move selected column down.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {dataProvider} dataProvider - The dataProvider
 */
export let moveDown = function( arrangeData, dataProvider ) {
    let columnOrder = 100;
    for( let i = 0; i < arrangeData.columnDefs.length; i++ ) {
        arrangeData.columnDefs[i].columnOrder = columnOrder;
        columnOrder += 100;
    }

    let selectedColumns = dataProvider.getSelectedObjects();
    // Iterates through the array of selected columns, starting with the last object (the bottom-most selected column)
    _.forEachRight( selectedColumns, function( column ) {
        for( var i = arrangeData.columnDefs.length - 1; i >= 0; --i ) {
            if( arrangeData.columnDefs[ i ] === column ) {
                arrangeData.columnDefs[ i ].columnOrder += 100;
                arrangeData.columnDefs[ i + 1 ].columnOrder -= 100;

                arrangeData.columnDefs[ i ] = arrangeData.columnDefs[ i + 1 ];
                arrangeData.filteredColumnDefs[ i ] = arrangeData.columnDefs[ i + 1 ];
                arrangeData.columnDefs[ i + 1 ] = column;
                arrangeData.filteredColumnDefs[ i + 1 ] = column;
                break;
            }
        }
    } );
    eventBus.publish( 'columnChanged' );
};

/**
 * Move adds selected columns to Table Columns list.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {viewModelJson} dataProviders - The dataProviders
 * @param {viewModelJson} eventData - Event data
 */
export let addColumns = function( arrangeData, dataProviders, eventData ) {
    let selectedAvailableColumns = eventData && eventData.eventTargetObjs ? eventData.eventTargetObjs : dataProviders.dataProviderAvailableColumnConfigs.getSelectedObjects();
    if ( selectedAvailableColumns ) {
        let selectedColumns = [];

        _.forEach( selectedAvailableColumns, function( selectedColumn ) {
            _.remove( arrangeData.availableColumnDefs, function( availableColumn ) {
                return availableColumn === selectedColumn;
            } );
            _.remove( arrangeData.filteredAvailableColumnDefs, function( availableColumn ) {
                return availableColumn === selectedColumn;
            } );

            selectedColumn.visible = true;
            selectedColumn.hiddenFlag = false;
            selectedColumn.selected = false;
            selectedColumn.dbValue = true;

            let insertIndex = _.findIndex( arrangeData.columnDefs, function( column ) {
                return column.columnOrder > selectedColumn.columnOrder;
            } );
            if( insertIndex < 0 ) {
                arrangeData.columnDefs.push( selectedColumn );
            } else {
                arrangeData.columnDefs.splice( insertIndex, 0, selectedColumn );
            }

            insertIndex = _.findIndex( arrangeData.filteredColumnDefs, function( column ) {
                return column.columnOrder > selectedColumn.columnOrder;
            } );
            if( insertIndex < 0 ) {
                arrangeData.filteredColumnDefs.push( selectedColumn );
            } else {
                arrangeData.filteredColumnDefs.splice( insertIndex, 0, selectedColumn );
            }

            selectedColumns.push( selectedColumn );
        } );

        eventBus.publish( 'columnChanged', {
            selectedColumns: selectedColumns
        } );
    }
};

/**
 * Move adds selected columns to Table Columns list.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {viewModelJson} eventData - Event data
 * @param {viewModelJson} dataProviders - The dataProviders
 */
export let removeColumns = function( arrangeData, eventData, dataProviders ) {
    let selectedColumns = eventData && eventData.eventTargetObjs ? eventData.eventTargetObjs : dataProviders.dataProviderColumnConfigs.getSelectedObjects();

    if( selectedColumns ) {
        _.forEach( selectedColumns, function( selectedColumn ) {
            if( selectedColumn.propertyName === 'object_name' ) {
                selectedColumn.selected = false;
                return;
            }
            _.remove( arrangeData.columnDefs, function( column ) {
                return column === selectedColumn;
            } );
            _.remove( arrangeData.filteredColumnDefs, function( column ) {
                return column === selectedColumn;
            } );
            selectedColumn.visible = false;
            selectedColumn.hiddenFlag = true;
            selectedColumn.selected = false;
            selectedColumn.dbValue = false;

            arrangeData.availableColumnDefs.push( selectedColumn );
            arrangeData.filteredAvailableColumnDefs.push( selectedColumn );
        } );

        arrangeData.availableColumnDefs = _.sortBy( arrangeData.availableColumnDefs, function( column ) {
            return column.displayName;
        } );

        arrangeData.filteredAvailableColumnDefs = _.sortBy( arrangeData.filteredAvailableColumnDefs, function( column ) {
            return column.displayName;
        } );

        dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( [] );
        eventBus.publish( 'columnChanged' );
    }
};

/**
 * Clear filter when operation type changes.
 *
 * @param {viewModelJson} data - View model data
 */
export let operationTypeChanged = function( data ) {
    data.filterBox.dbValue = '';
    markDirty( data.arrangeData );
};

/**
 * Arrange columns.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {String} arrangeType - The arrange type
 */
export let arrange = function( arrangeData, arrangeType ) {
    let eventColumns = getOutputColumns( arrangeData );

    eventBus.publish( 'columnArrange', {
        name: arrangeData.name,
        arrangeType: arrangeType,
        columns: eventColumns,
        operationType: arrangeData.operationType,
        objectSetUri: arrangeData.objectSetUri
    } );

    if( arrangeType !== 'saveAsNewColumnAndLoadAction' ) {
        var toolsAndInfoCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
        if( toolsAndInfoCommand ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: toolsAndInfoCommand.commandId
            } );
        }
        appCtxSvc.unRegisterCtx( 'activeToolsAndInfoCommand' );
    }
};

/**
 * Reset column config.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export let reset = function( arrangeData ) {
    eventBus.publish( 'columnArrange', {
        name: arrangeData.name,
        arrangeType: 'reset',
        columns: [],
        operationType: arrangeData.operationType ? arrangeData.operationType : 'union',
        objectSetUri: arrangeData.objectSetUri
    } );
    var toolsAndInfoCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( toolsAndInfoCommand ) {
        eventBus.publish( 'awsidenav.openClose', {
            id: 'aw_toolsAndInfo',
            commandId: toolsAndInfoCommand.commandId
        } );
    }
    appCtxSvc.unRegisterCtx( 'activeToolsAndInfoCommand' );
};

/**
 * Update data provider and mark arrange data as dirty.
 *
 * @param {viewModelJson} data - The arrange data
 * @param {viewModelJson} eventData - Event data
 */
export let updateColumns = function( data, eventData ) {
    data.dataProviders.dataProviderColumnConfigs.update( data.arrangeData.filteredColumnDefs,
        data.arrangeData.filteredColumnDefs.length );
    data.dataProviders.dataProviderAvailableColumnConfigs.update( data.arrangeData.filteredAvailableColumnDefs,
        data.arrangeData.filteredAvailableColumnDefs.length );

    eventBus.publish( 'arrangePanel.columnVisibilityChanged' );

    if( eventData && eventData.selectedColumns ) {
        data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( eventData.selectedColumns );
    }
};

/**
 * Mark arrange data as dirty.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export let markDirty = function( arrangeData ) {
    arrangeData.dirty = false;
    if( arrangeData.orgColumnDefs.length !== arrangeData.columnDefs.length ) {
        arrangeData.dirty = true;
    } else {
        for( var i = 0; i < arrangeData.orgColumnDefs.length; ++i ) {
            if( arrangeData.orgColumnDefs[ i ].propertyName !== arrangeData.columnDefs[ i ].propertyName ||
                arrangeData.orgColumnDefs[ i ].dbValue !== arrangeData.columnDefs[ i ].dbValue ) {
                arrangeData.dirty = true;
                break;
            }
        }
    }

    // Check if operation type has changed
    if( !arrangeData.dirty && !arrangeData.isExistingColumnConfigLoaded ) {
        if( !arrangeData.originalOperationType && !arrangeData.objectSetUri ) {
            var oldOperationType = 'configured';
            if( appCtxSvc.ctx.searchResponseInfo && appCtxSvc.ctx.searchResponseInfo.columnConfig &&
                appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType ) {
                oldOperationType = appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType.toLowerCase();
            }

            if( oldOperationType !== arrangeData.operationType ) {
                arrangeData.dirty = true;
            }
        } else if( arrangeData.originalOperationType && arrangeData.originalOperationType !== arrangeData.operationType ) {
            arrangeData.dirty = true;
        }
    }

    // Set to new column config if user modifies the admin version
    if ( arrangeData.dirty && !arrangeData.newColumnConfig.dbValue &&
            ( arrangeData.isExistingColumnConfigLoaded && arrangeData.loadedColumnConfig && arrangeData.loadedColumnConfig.isAdmin
            || !arrangeData.isExistingColumnConfigLoaded && arrangeData.originalColumnConfig && arrangeData.originalColumnConfig.isAdmin ) ) {
        arrangeData.newColumnConfig.dbValue = true;
    }

    setArrangeStatus( arrangeData );
    setVisibilityOfNewColumnConfigName( arrangeData.newColumnConfig.dbValue );
    setVisibilityOfColumns( arrangeData.columnDefs );
};

export default exports = {
    setDisabilityOfArrange,
    columnVisibilityChanged,
    createNamedSoaColumns,
    getClientScopeUri,
    preLoadColumnConfig,
    loadExistingColumnConfig,
    preRemoveColumnConfig,
    removeNamedColumnConfigFromProvider,
    actionFilterList,
    initializeNamedColumnConfigs,
    selectColumn,
    selectAvailableColumn,
    moveUp,
    moveDown,
    addColumns,
    removeColumns,
    operationTypeChanged,
    arrange,
    reset,
    updateColumns,
    markDirty
};
app.factory( 'arrange.service', () => exports );
