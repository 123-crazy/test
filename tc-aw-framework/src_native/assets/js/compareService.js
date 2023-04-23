// Copyright (c) 2020 Siemens

/**
 * This module provides access to service APIs that helps to render compare Grid.
 *
 * @module js/compareService
 * @requires app
 */
import app from 'app';
import adapterSvc from 'js/adapterService';
import selectionHelper from 'js/selectionHelper';
import appCtxSvc from 'js/appCtxService';
import commandSvc from 'js/command.service';
import _ from 'lodash';
import ngModule from 'angular';
import logger from 'js/logger';
import commandPanelSvc from 'js/commandPanel.service';

let exports = {};

/**
 * utility function to get the scope reference (if set) on the controller under the parent element.
 */
var getScopeForParent = function( parentElement ) {
    var scope = null;

    // assumes that the first child of parent is the controller element
    if( parentElement && parentElement.firstChild ) {
        scope = ngModule.element( parentElement.firstChild ).scope();
    }

    return scope;
};

/**
 * Update the selected object list
 *
 * @param {Element} parentElement - The DOM element for finding scope.
 * @param {Object} selectedIdList - The list of ids to be selected
 */
var syncSelectionList = function( parentElement, selectedIdList ) {
    var ngScope = getScopeForParent( parentElement );
    if( ngScope && !ngScope.$$destroyed ) {
        ngScope.syncSelectionList( selectedIdList );
    }
};

/**
 * Updates the field display names only if the field display names are empty.
 *
 * @param {Object} response - SOA response
 * @param {Array} fieldNames - array of field names
 *
 * @return {Array} field objects array which contains name and displayName properties.
 */
export let retrieveFieldDisplayNames = function( response, fieldNames ) {
    if( !response ) {
        return undefined;
    }

    var fields = [];
    var propertyDescriptors = _.get( response, 'output.propDescriptors' );
    // Using property descriptors, Update the fields with correct display name .
    if( propertyDescriptors ) {
        var propDescMap = {};
        _.forEach( propertyDescriptors, function( propDesc ) {
            if( propDesc ) {
                var propName = propDesc.propertyName;
                propDescMap[ propName ] = propDesc;
            }
        } );

        _.forEach( fieldNames, function( fieldName ) {
            if( fieldName && propDescMap[ fieldName ] ) {
                var field = {
                    name: fieldName,
                    displayName: propDescMap[ fieldName ].displayName
                };

                fields.push( field );
            }
        } );
    }

    return fields;
};

/**
 * Presents the column config panel to arrange the columns
 *
 * @param {ObjectArray} columnDefs - Column definitions
 */
export let arrangeColumns = function( columnDefs ) {
    var grididSetting = {
        name: 'compareGridView',
        columns: columnDefs
    };

    appCtxSvc.registerCtx( 'ArrangeClientScopeUI', grididSetting );

    // Note: When "Awp0ColumnConfig" command is converted to zero compile this service must be modified to pass a $scope
    commandSvc.executeCommand( 'Awp0ColumnConfig' );
};

/**
 * Clear the arrange scope ui
 *
 */
export let clearArrangeScopeUI = function() {
    appCtxSvc.unRegisterCtx( 'ArrangeClientScopeUI' );
};

/**
 * Handles single selection in compare grid
 *
 * @param {String} uid - uid of selected object
 * @param {Boolean} selectionState - selection state True/False
 * @param {Object} dataProvider - data provider for compare
 */
export let onSingleSelection = function( uid, selectionState, dataProvider ) {
    var selectedObject = null;
    var selIndex = null;

    if( dataProvider ) {
        var loadedVMObjects = dataProvider.viewModelCollection.getLoadedViewModelObjects();

        if( loadedVMObjects && loadedVMObjects.length > 0 ) {
            var adapedObjsPromise = adapterSvc.getAdaptedObjects( loadedVMObjects );
            adapedObjsPromise.then( function( adaptedObjects ) {
                _.forEach( adaptedObjects, function( adaptedObject, index ) {
                    if( adaptedObject && adaptedObject.uid === uid ) {
                        selIndex = index;
                        return false;
                    }
                } );

                selectedObject = loadedVMObjects[ selIndex ];
                if( !selectedObject ) {
                    logger.error( 'Could not find matching IViewModelObj' );
                }

                if( dataProvider && dataProvider.selectionModel && selectedObject ) {
                    selectionHelper.handleSingleSelect( selectedObject, dataProvider.selectionModel );
                }
            } );
        }
    }
};

/**
 * Push selection to compare
 *
 * @param {Object} dataProvider - data provider for compare
 * @param {Element} parentElem - parent container element for compare
 */
export let pushSelectionToCompare = function( dataProvider, parentElem ) {
    if( dataProvider ) {
        var selObjects = dataProvider.getSelectedObjects();
        if( selObjects && selObjects.length > 0 ) {
            var adapedObjsPromise = adapterSvc.getAdaptedObjects( selObjects );
            adapedObjsPromise.then( function( adaptedObjects ) {
                // project the selected ids to a list for the Compare UI.  May be empty
                var selectedIdList = [];
                _.forEach( adaptedObjects, function( selected ) {
                    if( selected ) {
                        // this class is comparing UIDs for selection, this is the least risky fix
                        // as this stage in aw3.2.  The right solution is for this class to be refactored
                        // to only ever look at viewmodels and NEVER at modelobjects.  Note that even the javascript
                        // is looking to the uid and not the ID for the viewmodel.
                        selectedIdList.push( selected.uid );
                    }
                } );

                syncSelectionList( parentElem, selectedIdList );
            } );
        }
    }
};

/**
 * Handle column position changed event
 *
 * @param {String} id - uid of object
 * @param {Number} originalPosition - original position
 * @param {Number} newPosition - new position
 */
export let columnPositionChanged = function( id, originalPosition, newPosition ) {
    logger.info( 'Compare: Column Position Changed from ' + originalPosition + ' to ' + newPosition );
};

/**
 * Bindable UI Collection
 *
 * @param {Object} data - data for bindable ui collection
 */
var BindableUICollection = function( data ) {
    var bUIColSelf = this;

    bUIColSelf.api = {};
    bUIColSelf.data = data;
    bUIColSelf.events = {};
};

/**
 * Create bindable UI collection
 *
 * @param {Object} list - data for bindable ui collection
 */
export let createBindableUICollection = function( list ) {
    return new BindableUICollection( list );
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

exports = {
    retrieveFieldDisplayNames,
    arrangeColumns,
    clearArrangeScopeUI,
    onSingleSelection,
    pushSelectionToCompare,
    columnPositionChanged,
    createBindableUICollection,
    openArrangePanel
};
export default exports;
/**
 * Provides access to the compareService
 *
 * @class compareService
 * @memberOf NgServices
 */
app.factory( 'compareService', () => exports );
