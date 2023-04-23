//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define,
 window
 */

/**
 * ObjectSet service is used to calculate the height of objectSet based on max row count. This service is only
 * applicable for XRT objectSet.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/xrtObjectSetService
 */
import * as app from 'app';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import awConfiguredSvc from 'js/awConfiguredRevService';

let exports = {};
const OBJSET_MIN_HEIGHT = 200;

/**
 * Get row data count
 *
 * @private
 *
 * @param {Object} objSetData - objectSet data
 * @param {DeclViewModel} viewModel - declarative view model
 * @param {String} activeDisplay - the current display mode
 * @return {Number} - row data count
 */
const _getRowDataCount = function( objSetData, viewModel, activeDisplay ) {
    let count = 0;
    let displayMode = objSetData.displayModes[ objSetData.defaultDisplay ];
    let dataProvider = viewModel.dataProviders[ displayMode.dataProvider ];

    if( objSetData.defaultDisplay === 'tableDisplay' ) {
        let grid = viewModel.grids[ displayMode.gridProvider ];
        dataProvider = viewModel.dataProviders[ grid.dataProvider ];
    }

    if( dataProvider && dataProvider.viewModelCollection ) {
        if( activeDisplay === 'compareDisplay' ) {
            if( dataProvider.columnConfig && dataProvider.columnConfig.columns ) {
                count = dataProvider.columnConfig.columns.length;
            }
        } else {
            count = dataProvider.viewModelCollection.getTotalObjectsLoaded();
        }
    }

    return count;
};

/**
 * Set max rows as 7 and half by default when 'maxRowCount' is not provided as part of XRT
 *
 * @private
 *
 * @return {Number} - max number of rows
 */
const _getMaxRows = function() {
    return 7;
};

/**
 * @private
 *
 * @param {Element} $element - DOM element the controller is attached to.
 * @param {Number} dataCount - the data count
 * @param {Number} maxRowCount - maximum row count visible.
 *
 * @return {Number} - returns calculated array height based of max row count.
 */
const _getCollectionHeight = function( $element, dataCount, maxRowCount ) {
    let arrayHeight = 0;
    let rowsShown = 0;

    // if the actual # of rows exceeds the max, size based on the max
    if( dataCount >= maxRowCount ) {
        rowsShown = maxRowCount;
    } else {
        // size based on the actual data + 1
        rowsShown = dataCount + 1;
    }

    /**
     * Replicating same logic as GWT. Estimating 37px per row. Depends on other styling though. mainly depends on
     * icon being 22 by 22. 22 for header + 8 for padding = 30 + part of next line (12) = 42 <br>
     *
     * Need to figure out a way to do this dynamically.
     */
    arrayHeight = rowsShown * 37 + 42;

    // this is needed for default objectSet height
    if( rowsShown === 1 && arrayHeight === 0 ) {
        arrayHeight = 50;
    }

    return arrayHeight;
};

/**
 * Calculate object set height
 *
 * @param {String} display - display mode
 * @param {Object} objSetData - Object Set Data
 * @param {Object} viewModel - the View Model
 * @param {Element} element - container element to calculate height based off its data
 *
 * @return {Number} - returns calculated objectSet height based of max row count.
 */
export const calculateObjectsetHeight = function( display, objSetData, viewModel, element ) {
    let objectSetHeight = 0;

    if( objSetData && viewModel ) {
        // Below is a temporary fix for D-03820
        // if XRT's maxRowCount attribute is NOT given, then calculate number of objectSets present inside a column
        // and then set the height of the table and list accordingly
        if( objSetData.smartObjSet ) {
            if( element && element[ 0 ] ) {
                const elementTop = Math.floor( element[ 0 ].getBoundingClientRect().top );
                const extraOff = appCtxService.ctx.showUserSettingsBar === 'true' ? 32 : 0;
                const bottom = window.innerHeight - extraOff - 95; // Set size of objSet to bottom of screen minus buffer area (~50px) & command bar size (~45px) and minus footer size if shown
                objectSetHeight = Math.max( bottom - elementTop, OBJSET_MIN_HEIGHT );
            }
        } else if( !objSetData.maxRowCount ) {
            let maxRows = _getMaxRows(); // getMaxRows defaults to returning 7
            // Setting height of objectSet table widget
            objectSetHeight = _getCollectionHeight( element, _getRowDataCount( objSetData, viewModel, display ), maxRows );
        } else {
            // if XRT's maxRowCount attribute is given, then set the height of objectSet (common for both table and list).
            // Setting height of objectSet
            objectSetHeight = _getCollectionHeight( element, _getRowDataCount( objSetData, viewModel, display ), objSetData.maxRowCount );
        }
    }

    return objectSetHeight;
};

/**
 * Parse object set source string into map of object type string to an array of relation type strings
 *
 * @param {String} objectSetSource - Comma separated string of relationType.ObjectType combinations
 * @return {Object} Map of Object to relation type list
 */
export const getModelTypeRelationListMap = function( objectSetSource ) {
    let modelTypeRelationListMap = {};
    let objectSetSourceArray = objectSetSource.split( ',' );
    if( objectSetSourceArray.length > 0 ) {
        _.forEach( objectSetSourceArray, function( typeRelCombo ) {
            let typeRelSplit = typeRelCombo.split( '.' );
            if( typeRelSplit.length === 2 ) {
                let relationType = typeRelSplit[ 0 ].trim();
                let objectType = typeRelSplit[ 1 ].trim();
                if( !_.isArray( modelTypeRelationListMap[ objectType ] ) ) {
                    modelTypeRelationListMap[ objectType ] = [];
                }
                modelTypeRelationListMap[ objectType ].push( relationType );
            }
        } );
    }
    return modelTypeRelationListMap;
};

/**
 * Finds the relationType and any associated source objects valid to that type.
 *
 * @param {Object[]} sourceObjects - source objects used to compare relations
 * @param {Object} modelTypeRelations - valid model type relations
 * @param {String} showConfiguredRevision - flag indicating whether configured revision capability is toggled on
 * @return {Object} object containing relationType and valid source objects
 */
export const getModelTypeRelationsWithValidSourceObjects = function( sourceObjects, modelTypeRelations, showConfiguredRevision ) {
    let modelTypeRelationObject = {};
    modelTypeRelationObject.relationTypeToSources = {};
    modelTypeRelationObject.validSourceObjects = [];
    if( showConfiguredRevision && showConfiguredRevision === 'true' ) {
        var evalObjs = awConfiguredSvc.evaluateObjsConfRevRuleObjectsetPaste( sourceObjects, modelTypeRelations, showConfiguredRevision );
        sourceObjects = [];
        sourceObjects = Array.from( evalObjs );
    }
    if( sourceObjects && modelTypeRelations ) {
        _.forEach( sourceObjects, function( sourceObject ) {
            let typeHierarchy = sourceObject.modelType.typeHierarchyArray;

            for( let i = 0; i < typeHierarchy.length; i++ ) {
                let type = typeHierarchy[ i ];
                if( modelTypeRelations[ type ] ) {
                    let relationType = modelTypeRelations[ type ][ 0 ];

                    modelTypeRelationObject.relationTypeToSources[ relationType ] = modelTypeRelationObject.relationTypeToSources[ relationType ] || [];
                    modelTypeRelationObject.relationTypeToSources[ relationType ].push( sourceObject );
                    modelTypeRelationObject.validSourceObjects.push( sourceObject );
                    break;
                }
            }
        } );
    }

    return modelTypeRelationObject;
};

export default exports = {
    calculateObjectsetHeight,
    getModelTypeRelationListMap,
    getModelTypeRelationsWithValidSourceObjects
};
/**
 * Definition for the xrtObjectSetService service used by declarative XRT
 *
 * @member xrtObjectSetService
 * @memberof NgServices
 */
app.factory( 'xrtObjectSetService', () => exports );
