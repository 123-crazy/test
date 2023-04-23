// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * This provides functionality related to traceability matrix to replace the structure after matrix gets generated
 * @module js/Arm0GenerateTraceabilityMatrixPanel
 */

import app from 'app';
import listBoxService from 'js/listBoxService';
import eventBus from 'js/eventBus';
import 'js/localStorage';
import $ from 'jquery';
import _ from 'lodash';
import adapterService from 'js/adapterService';
import commandsMapService from 'js/commandsMapService';
import cdm from 'soa/kernel/clientDataModel';


var exports = {};
var selectedMatrixType = null;
var selectedSourceObjects = null;
var selectedSourcePCI = { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' };
var selectedTargetObjects = null;
var selectedTargetPCI = { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' };

/**
 * Set the selected objects on search panel.
 * @param {Object} data - the viewmodel data for this panel
 * @param {Object} selectedObjects - selected objects on search results
 * @param {Object} ctx - context object
 */
export let handleSearchSelection = function( data, selectedObjects, ctx ) {
    if( selectedObjects.length > 0 ) {
        data.selectedObject = selectedObjects[ 0 ];
    } else {
        data.selectedObject = undefined;
    }
    exports.updateUIOnSelectionChange( ctx, data, selectedMatrixType );
};

/**
 * Method gets called when user changes the type of matrix in drop down
 * @param {Object} data - the viewmodel data for this panel
 * @param {Object} ctx - context object
 */
export let updateSelectedMatrixType = function( data, ctx ) {
    selectedMatrixType = data.matrixTypeListBox.dbValue.propInternalValue;
    exports.updateUIOnSelectionChange( ctx, data, selectedMatrixType );
};

/**
 * Set the selected objects on search panel.
 * @param {Object} ctx - context object
 * @param {Object} data - the viewmodel data for this panel
 * @param {Object} selectedMatrixType - selected matrix type in drop down
 */
export let updateUIOnSelectionChange = function( ctx, data, selectedMatrixType ) {
    if( selectedMatrixType === 'Quick Matrix' || selectedMatrixType === 'Full-Rollup Matrix' ) {
        if( data.selectedObject !== undefined ) {
            self.updateUIFields( true, true, data );
        } else {
            if( ctx.mselected.length === 2 ) {
                self.updateUIFields( true, false, data );
            } else if( data.symmectricMatrix.dbValue ) {
                self.updateUIFields( true, true, data );
            } else {
                self.updateUIFields( false, true, data );
            }
        }
    } else {
        self.updateUIFields( true, false, data );
    }
};

/**
 * this method checks for all combination possible to generate the traceability matrix.
 * @param {Object} ctx - context object
 * @param {Object} data - the viewmodel data for this panel
 */
export let validateSelection = function( ctx, data ) {
    var selectedObjs = ctx.mselected;
    if( selectedObjs.length === 1 ) {
        var isFolder = self.isFolder( selectedObjs[ 0 ] );
        var isItemRevision = self.isItemRevision( selectedObjs[ 0 ] );
        var isOccurrence = self.isOccurrence( selectedObjs[ 0 ] );

        if( isFolder ) {
            if( data.selectedObject !== undefined ) {
                var objs = self.updateApplicableMatrixTypesArray( true, true, false, data );
                data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( objs, 'propDisplayValue' );
            } else {
                objs = self.updateApplicableMatrixTypesArray( true, false, true, data );
                data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( objs, 'propDisplayValue' );
            }
        } else if( isItemRevision || isOccurrence ) {
            objs = self.updateApplicableMatrixTypesArray( true, true, true, data );
            data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( objs, 'propDisplayValue' );
        } else {
            objs = self.updateApplicableMatrixTypesArray( false, false, true, data );
            data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( objs, 'propDisplayValue' );
        }
    } else if( selectedObjs.length === 2 ) {
        var i;
        var isNotSupportedObjects = false;
        for( i = 0; i < 2; i++ ) {
            if( !self.isFolder( selectedObjs[ i ] ) && !self.isItemRevision( selectedObjs[ i ] ) && !self.isOccurrence( selectedObjs[ i ] ) ) {
                isNotSupportedObjects = true;
                break;
            }
        }
        if( self.isFolder( ctx.mselected[ 0 ] ) && self.isFolder( ctx.mselected[ 1 ] ) ) {
            var objs = self.updateApplicableMatrixTypesArray( true, false, true, data );
            data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( objs, 'propDisplayValue' );
        } else if( !isNotSupportedObjects ) {
            objs = self.updateApplicableMatrixTypesArray( true, true, true, data );
            data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( objs, 'propDisplayValue' );
        } else {
            var objs = self.updateApplicableMatrixTypesArray( false, false, true, data );
            data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( objs, 'propDisplayValue' );
            //only dynamic matrix can be generated as there are some invalid objects selected by user which server does not understand
            data.matrixTypeListBox.dbValue = 'Dynamic Matrix';
        }
    } else if( selectedObjs.length > 2 ) {
        data.matrixTypeListBoxValues.dbValue = listBoxService.createListModelObjects( self.updateApplicableMatrixTypesArray( false, false, true, data ), 'propDisplayValue' );
        data.matrixTypeListBox.dbValue = 'Dynamic Matrix';
    }
    exports.updateUIOnSelectionChange( ctx, data, selectedMatrixType );
};

/**
 * Method to update the matrix types array which will be shown to user in drop down list
 * @param {Object} isQuickMatrixApplicable - boolean to decide whether to show quick matrix in options
 * @param {Object} isFullMatrixApplicable - boolean to decide whether to show quick matrix in options
 * @param {Object} isDynamicMatrixApplicable - boolean to decide whether to show quick matrix in options
 * @returns {Object} matrixTypeValues - Array that contains applicable values
 */
self.updateApplicableMatrixTypesArray = function( isQuickMatrixApplicable, isFullMatrixApplicable, isDynamicMatrixApplicable, data ) {
    var matrixTypeValues = [];
    if( isQuickMatrixApplicable ) {
        matrixTypeValues.push( {
            propDisplayValue: data.i18n.QuickMatrix,
            propInternalValue: 'Quick Matrix'
        } );
    }
    if( isFullMatrixApplicable ) {
        matrixTypeValues.push( {
            propDisplayValue: data.i18n.FullRollup,
            propInternalValue: 'Full-Rollup Matrix'
        } );
    }
    if( isDynamicMatrixApplicable ) {
        matrixTypeValues.push( {
            propDisplayValue: data.i18n.Dynamic,
            propInternalValue: 'Dynamic Matrix'
        } );
    }
    return matrixTypeValues;
};

/**
 * This method updates the fields in UI accorsing to the values provided
 * @param {Boolean} matrixButtonVal - boolean to enable/disable button
 * @param {Boolean} showSearchVal - boolean to hide/unhide the search field
 * @param {Object} data - data object of the view model
 */
self.updateUIFields = function( matrixButtonVal, showSearchVal, data ) {
    data.isMatrixButtonEnabled = matrixButtonVal;
    data.isShowSearch = showSearchVal;
};

/**
 * This method checks whether the given object is instance of folder or not
 * @param {Object} selectedObj - object selected by user
 * @returns {Boolean} true/false
 */
self.isFolder = function( selectedObj ) {
    if( selectedObj.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * This method checks whether the given object is instance of ItemRevision or not
 * @param {Object} selectedObj - object selected by user
 * @returns {Boolean} true/false
 */
self.isItemRevision = function( selectedObj ) {
    if( selectedObj.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * This method checks whether the given object is instance of occurrence or not
 * @param {Object} selectedObj - object selected by user
 * @returns {Boolean} true/false
 */
self.isOccurrence = function( selectedObj ) {
    if( selectedObj.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * util checks data if is defined.
 * @param {Object} isvalid some value
 * @returns {string} value if true/"" if false
 */
self.isDataValid = function( isvalid ) {
    if( isvalid ) {
        return isvalid;
    }
    return '';
};

/**
 * Check Is Occurence.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {boolean} true/false
 */
var _isOccurence = function( obj ) {
    if( commandsMapService.isInstanceOf( 'Awb0Element', obj.modelType ) ) {
        return true;
    }
    return false;
};
/**
 * Check Is RunTime Object.
 *
 * @param {Object} obj - Runtime object
 * @return {boolean} true/false
 */
var _isRunTimeObject = function( obj ) {
    if( commandsMapService.isInstanceOf( 'RuntimeBusinessObject', obj.modelType ) ) {
        return true;
    }
    return false;
};
/**
 * Get updated array of underlying objects for Runtime objects(Other then Awb0Element).
 *
 * @param {Object} arryObjs - array of Runtime object
 * @return {boolean} true/false
 */
var _getUnderlyingObjects = function( arryObjs ) {
    var arrObjsResult = [];
    _.forEach( arryObjs, function( obj ) {
        var tmpObj = cdm.getObject( obj.uid );
        if ( !_isOccurence( tmpObj ) && _isRunTimeObject( tmpObj ) ) {
            var srcObjs = adapterService.getAdaptedObjectsSync( [ tmpObj ] );
            if ( srcObjs !== null && srcObjs.length > 0 ) {
                tmpObj = srcObjs[0];
            }
}
        arrObjsResult.push( tmpObj );
    } );
    return arrObjsResult;
};

/**
 * This method will generate the traceability matrix
 * @param {Object} data - data object of view model
 * @param {Object} ctx - context object
 */
export let generateTraceabilityMatrix = function( data, ctx ) {
    if( selectedMatrixType === 'Quick Matrix' ) {
        ctx.matrixType = 'Quick Matrix';
        self.setMatrixSourceTarget( data, ctx );
        selectedSourceObjects = ctx.sourceObjects = [ data.source ];
        selectedSourcePCI = data.sourcePCI;
        selectedTargetObjects = ctx.targetObjects = [ data.target ];
        selectedTargetPCI = data.targetPCI;
        eventBus.publish( 'requirements.handleGenerateTraceabilityMatrixCommand' );
    } else if( selectedMatrixType === 'Full-Rollup Matrix' ) {
        ctx.matrixType = 'Full-Rollup Matrix';
        eventBus.publish( 'requirements.getChildRollup' );
    } else if( selectedMatrixType === 'Dynamic Matrix' ) {
        ctx.matrixType = 'Dynamic Matrix';
        self.setDynamicMatrixSourceTarget( data, ctx );

        ctx.sourceObjects = _getUnderlyingObjects( data.source );
        selectedSourceObjects = ctx.sourceObjects;
        selectedTargetObjects = ctx.targetObjects = [];
        eventBus.publish( 'requirements.handleGenerateTraceabilityMatrixCommand' );
    }
};

/**
 * This method creates the default object for rollup matrix soa input
 * @param {Object} ctx - context object
 * @param {Object} data - data object of view model
 * @returns {Object} inputData - default input for rollup soa
 */
export let rollupMatrixDefaultInput = function( ctx, data ) {
    self.setMatrixSourceTarget( data, ctx );
    return {
        sourceObjects: [ data.source ],
        targetObjects: [ data.target ],
        relationTypes: [ 'ALL' ],
        actionPerformed: 'TRAVERSE_CHILD',
        srcContextInfo: data.sourcePCI,
        targetContextInfo: data.targetPCI,
        itemsPerPage: 25,
        traceMatrixObject: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
        rowPageToNavigate: 1,
        colPageToNavigate: 1,
        showChildTracelinks: true,
        isRunInBackground: true,
        options: [ 'GENERATE_MATRIX' ]
    };
};

/**
 * This method set the source of dynamic matrix
 * @param {Object} data - data object of view model
 * @param {Object} ctx - context object
 */
self.setDynamicMatrixSourceTarget = function( data, ctx ) {
    data.source = null;
    data.target = null;
    var aa = ctx.mselected;
    var bb = [];
    for( var ii = 0; ii < aa.length; ii++ ) {
        bb.push( self.getObject( aa[ii] ) );
    }
    data.source = bb;
};

/**
 * This method set the source and target objects of the traceability matrix
 * @param {Object} data - data object of view model
 * @param {Object} ctx - context object
 */
self.setMatrixSourceTarget = function( data, ctx ) {
    data.source = null;
    data.target = null;
    data.sourcePCI = null;
    data.targetPCI = null;
    if( ctx.occmgmtContext && ctx.occmgmtContext.productContextInfo ) {
        data.sourcePCI = self.getObject( ctx.occmgmtContext.productContextInfo );
        data.targetPCI = data.sourcePCI;
    }
    if( data.isShowSearch && data.symmectricMatrix.dbValue ) {
        data.source = self.getObject( ctx.mselected[ 0 ] );
        data.target = data.source;
    } else {
        data.source = self.getObject( ctx.mselected[ 0 ] );
        if( data.eventData && data.eventData.selectedUids[ 0 ] ) {
            data.target = self.getObject( data.eventData.selectedUids[ 0 ] );
            data.targetPCI = { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' };
        } else {
            data.target = self.getObject( ctx.mselected[ 1 ] );
        }
    }
};

/**
 * This method create te default object required for traceability matrix source and target
 * @param {Object} object - source/target object
 * @returns {Object} data - object created for given input
 */
self.getObject = function( object ) {
    return {
        uid: object.uid,
        type: 'unknownType'
    };
};

export default exports = {
    handleSearchSelection,
    updateSelectedMatrixType,
    updateUIOnSelectionChange,
    validateSelection,
    generateTraceabilityMatrix,
    rollupMatrixDefaultInput
};
app.factory( 'Arm0GenerateTraceabilityMatrixPanel', () => exports );
