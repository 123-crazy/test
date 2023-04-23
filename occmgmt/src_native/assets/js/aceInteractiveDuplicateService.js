//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceInteractiveDuplicateService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import editHandlerService from 'js/editHandlerService';
import dataManagementSvc from 'soa/dataManagementService';
import LocationNavigationService from 'js/locationNavigation.service';
import cdm from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import occmgmtUtils from 'js/occmgmtUtils';
import eventBus from 'js/eventBus';
import policySvc from 'soa/kernel/propertyPolicyService';
import 'js/contextStateMgmtService';
import 'js/occmgmtCellRenderingService';
import 'js/occmgmtTreeTableDataService';
import _ from 'lodash';

var exports = {};

/** Duplicate Info */
var _duplicateInfo = {};

var _occmgmtTreeUnloadedEventListener = null;

var _viewModeChangeEventListener = null;

var _resetEventListener = null;

var _productContextChangedListener = null;

var _cloneContentEventListener = null;

/** Valid Duplicate Operation container*/
var _validDuplicateOperations = null;

/** Localized value for Pending string*/
var _localizedPendingString = null;

/** Policy ID of required loaded objects */
var _policyId = null;

var OCCIDENTIFIERPROPERTY = 'awb0UnderlyingObject';

const operationTypes = {
    CLONE: 0, // 0 indicates clone operation
    REFERENCE: 1, // 1 indicates Reference operation
    REVISE: 2, // 2 indicates Revise operation
    REPLACE: 3, // 3 indicates Replace operation
    IGNORE: 5, // 5 indicates Ignore operation
    CLONE_BELOW: 6 // 6 indicates Clone Below operation
};
const _cloneContentData = {};
const AWB0ARCHETYPEID = 'awb0ArchetypeId';
const AWB0ARCHETYPEREVID = 'awb0ArchetypeRevId';
const AWB0ARCHETYPEREVNAME = 'awb0ArchetypeRevName';
const AWB0ARCHETYPEREVDESC = 'awb0ArchetypeRevDescription';

/**
 * Initializes Duplicate service.
 */
export let initialize = function() {
    // Subscribe to productContextChangedEvent event to check move product in duplicate mode if Awb0HasCloneDataFeature is returned
    if( !_productContextChangedListener ) {
        _productContextChangedListener = eventBus.subscribe( 'productContextChangedEvent', function() {
            if( appCtxSvc.ctx.aceActiveContext.context && appCtxSvc.ctx.aceActiveContext.context.supportedFeatures &&
                appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0HasCloneDataFeature &&
                appCtxSvc.ctx.aceActiveContext.context.isDuplicateEnabled !== true && appCtxSvc.ctx.aceActiveContext.context.isExternalCloneEnabled !== true ) {
                exports.enableDuplicateMode();
                eventBus.unsubscribe( _productContextChangedListener );
                _productContextChangedListener = null;
            }
        } );
    }
};

export let destroy = function() {
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.isDuplicateEnabled', false );

    var columnsToExclude = appCtxSvc.getCtx( 'aceActiveContext.context.columnsToExclude' );
    if( columnsToExclude ) {
        columnsToExclude.push( 'Awb0ConditionalElement.awb0PendingAction' );
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.columnsToExclude', columnsToExclude );
    }
};

// Register the policy before SOA call
var registerPolicy = function() {
    return policySvc.register( {
        types: [ {
                name: 'Awb0ConditionalElement',
                properties: [ {
                    name: 'awb0ArchetypeRevId'
                } ]
            }
        ]
    } );
};

/**
 * Updating occmgmt context isDuplicateEnabled
 */
export let enableDuplicateMode = function() {
    editHandlerService.leaveConfirmation().then( function() {
        clearDuplicateInfo();

        //ensure the required objects are loaded
        _policyId = registerPolicy();

        if( appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0IsOccurrenceCloneDataEnabled ) {
            OCCIDENTIFIERPROPERTY = 'awb0CopyStableId';
        }

        var columnsToExclude = appCtxSvc.getCtx( 'aceActiveContext.context.columnsToExclude' );

        _.remove( columnsToExclude, function( column ) {
            return column === 'Awb0ConditionalElement.awb0PendingAction';
        } );
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.columnsToExclude', columnsToExclude );

        var resource = 'OccurrenceManagementConstants';
        var localeTextBundle = localeService.getLoadedText( resource );

        // Initialize duplicate actions container for localization
        _validDuplicateOperations = {
            0: localeTextBundle.saveAsButtonText, // 0 indicates clone operation
            1: '', // 1 indicates Reference operation, Default doesn't need any visual indication
            2: localeTextBundle.aceContextRevise, // 2 indicates Revise operation
            3: localeTextBundle.replaceElementBtn, // 3 indicates Replace operation
            5: localeTextBundle.aceRemove, // 5 indicates Ignore operation
            6: localeTextBundle.saveAsButtonText // 6 indicates CloneBelow operation
        };
        _localizedPendingString = localeTextBundle.pending;

        occmgmtUtils.setDecoratorToggle( true, true );

        updateHiddenCommandContextForDuplicate( true );
        updateContextForCloneContentSaveSpecification();
        // Subscribe to unload event
        if( !_occmgmtTreeUnloadedEventListener ) {
            _occmgmtTreeUnloadedEventListener = eventBus.subscribe( 'occmgmtContext.destroy',
                function() {
                    handleOccMgmtTreeViewUnloaded();
                }, 'aceInteractiveDuplicateService' );
        }
        // Subscribe to appCtx.register event and check for ViewModeContext event.
        if( !_viewModeChangeEventListener ) {
            _viewModeChangeEventListener = eventBus.subscribe( 'appCtx.register',
                function( eventData ) {
                    handleViewModeChange( eventData );
                }, 'aceInteractiveDuplicateService' );
        }
        // Subscribe to ace.resetStructure event to clear dirty information.
        if( !_resetEventListener ) {
            _resetEventListener = eventBus.subscribe( 'ace.resetStructure', function() {
                _resetEventListener = null;
                clearDuplicateInfo();
            } );
        }

        // Subscribe to saveAsOrRevise.cloneContent event to clear clone information from context only.
        if( !_cloneContentEventListener ) {
            _cloneContentEventListener = eventBus.subscribe( 'saveAsOrRevise.cloneContent', function() {
                clearDuplicateInfoOnContext();
            }, 'aceInteractiveDuplicateService' );
        }

        if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeView' || appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' ) {
            var _isDuplicateEnabled = appCtxSvc.getCtx( 'aceActiveContext.context.isDuplicateEnabled' );
            if( !_isDuplicateEnabled ) {
                appCtxSvc.updatePartialCtx( 'aceActiveContext.context.isDuplicateEnabled', true );
                var vmosWithPropLoaded = [];
                if( appCtxSvc.ctx.aceActiveContext.context.vmc ) {
                    var loadedVMOs = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects;
                    vmosWithPropLoaded = loadedVMOs.filter( function( vmo ) {
                        delete vmo.__expandState;
                        if( vmo.props ) {
                            return true;
                        }
                    } );
                }
                var eventData = { vmos: vmosWithPropLoaded };
                eventBus.publish( 'occmgmtInteractiveDuplicateColumnConfig.load', eventData );
            }
        }

        //Switch to TreeView if not in tree view
        if( appCtxSvc.ctx.ViewModeContext.ViewModeContext !== 'TreeView' ) {
            var _isDuplicateEnabled = appCtxSvc.getCtx( 'aceActiveContext.context.isDuplicateEnabled' );
            if( !_isDuplicateEnabled ) {
                appCtxSvc.updatePartialCtx( 'aceActiveContext.context.isDuplicateEnabled', true );
            }
            var currentCtx = appCtxSvc.getCtx( 'ViewModeContext' );
            currentCtx.ViewModeContext = 'TreeView';
            appCtxSvc.registerCtx( 'ViewModeContext', currentCtx );
        }
    } );
};

var updateContextForCloneContentSaveSpecification = function() {
    var addInWorkingCtxData = appCtxSvc.getCtx( 'addInWorkingCtxData' );
    if( addInWorkingCtxData ) {
        var cloneContentSaveSpecifications = {
            removeOnRead: true,
            data: _cloneContentData
        };
        appCtxSvc.updatePartialCtx( 'addInWorkingCtxData.cloneContentSaveSpecifications', cloneContentSaveSpecifications );
        appCtxSvc.updatePartialCtx( 'addInWorkingCtxData.requestPref.deleteCloneData', [ 'false' ] );
    } else {
        addInWorkingCtxData = {
            cloneContentSaveSpecifications: {
                removeOnRead: true,
                data: _cloneContentData
            },
            requestPref: { deleteCloneData: [ 'false' ] }
        };
        appCtxSvc.updatePartialCtx( 'addInWorkingCtxData', addInWorkingCtxData );
    }
};

/**
 *  Update Context for Supported/Un-supported commands in Duplicate Mode.
 * @param {Boolean} value -false to support,true if Not supported.
 */
var updateHiddenCommandContextForDuplicate = function( value ) {
    var hiddenCommandCtx = appCtxSvc.getCtx( 'hiddenCommands' );
    if( !hiddenCommandCtx ) {
        hiddenCommandCtx = {};
    }
    if( value ) {
        hiddenCommandCtx.Awb0AddChildElement = value;
        hiddenCommandCtx.Awb0AddSiblingElement = value;
        hiddenCommandCtx.awb0SplitRootCmd = value;
        hiddenCommandCtx.Awb0ContentCompareMsm = value;
    } else {
        delete hiddenCommandCtx.Awb0AddChildElement;
        delete hiddenCommandCtx.Awb0AddSiblingElement;
        delete hiddenCommandCtx.awb0SplitRootCmd;
        delete hiddenCommandCtx.Awb0ContentCompareMsm;
    }
    appCtxSvc.updatePartialCtx( 'hiddenCommands', hiddenCommandCtx );
};

/**
 * Cleans up necessary information for duplicate when Client goes out of tree mode
 * or to any other sub-location.
 */
function handleOccMgmtTreeViewUnloaded() {
    eventBus.unsubscribe( _occmgmtTreeUnloadedEventListener );
    _occmgmtTreeUnloadedEventListener = null;
    _duplicateInfo = {};
    updateHiddenCommandContextForDuplicate( false );
    if( _viewModeChangeEventListener ) {
        eventBus.unsubscribe( _viewModeChangeEventListener );
        _viewModeChangeEventListener = null;
    }
}

/**
 * Cleans up necessary information for duplicate when Client goes out of tree mode
 * or to any other sub-location.
 * @param {Object} eventData - event information.
 */
function handleViewModeChange( eventData ) {
    if( eventData.name === 'ViewModeContext' && eventData.value.ViewModeContext !== 'TreeView' &&
        eventData.value.ViewModeContext !== 'None' ) {
        exports.enableDuplicateMode();
    }
}

export let deleteCloneOptionsFromBWC = function() {
    var addInWorkingCtxData = appCtxSvc.getCtx( 'addInWorkingCtxData' );
    if( addInWorkingCtxData ) {
        appCtxSvc.updatePartialCtx( 'addInWorkingCtxData.requestPref.deleteCloneData', [ 'true' ] );
        appCtxSvc.updatePartialCtx( 'addInWorkingCtxData.cloneContentSaveSpecifications', null );
    } else {
        addInWorkingCtxData = {
            requestPref: {
                deleteCloneData: [ 'true' ]
            }
        };
        appCtxSvc.updatePartialCtx( 'addInWorkingCtxData', addInWorkingCtxData );
    }
    eventBus.publish( 'StartSaveAutoBookmarkEvent' );
};
/**
 * Set isDuplicateEnabled on context as false and clear Out local variable.
 */
export let disableDuplicateMode = function() {
    if( appCtxSvc.ctx.aceActiveContext ) {
        // Close Apply markups panel
        var eventData = { source: 'toolAndInfoPanel' };
        eventBus.publish( 'complete', eventData );
        _duplicateInfo = {};

        let editService = editHandlerService.getEditHandler( appCtxSvc.ctx.aceActiveContext.context.vmc.name );
        if( editService && editService._editing ) {
            editService.cancelEdits();
        }

        updateHiddenCommandContextForDuplicate( false );

        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.isDuplicateEnabled', false );

        var columnsToExclude = appCtxSvc.getCtx( 'aceActiveContext.context.columnsToExclude' );
        if( columnsToExclude ) {
            columnsToExclude.push( 'Awb0ConditionalElement.awb0PendingAction' );
            appCtxSvc.updatePartialCtx( 'aceActiveContext.context.columnsToExclude', columnsToExclude );
        }
        occmgmtUtils.setDecoratorToggle( false, true );

        var vmosWithPropLoaded = [];
        if( appCtxSvc.ctx.aceActiveContext.context.vmc ) {
            var loadedVMOs = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects;
            vmosWithPropLoaded = loadedVMOs.filter( function( vmo ) {
                vmo.isDeleted = false;
                vmo.isGreyedOutElement = false;
                resetPropOfVMO( vmo, AWB0ARCHETYPEID );
                resetPropOfVMO( vmo, AWB0ARCHETYPEREVID );
                resetPropOfVMO( vmo, AWB0ARCHETYPEREVNAME );
                resetPropOfVMO( vmo, AWB0ARCHETYPEREVDESC );
                delete vmo.__expandState;
                if( vmo.props ) {
                    return true;
                }
            } );
        }

        // Unregister the required objects policy
        if ( _policyId ) {
            policySvc.unregister( _policyId );
        }

        if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeView' ) {
            eventData = { vmos: vmosWithPropLoaded };
            eventBus.publish( 'occmgmtInteractiveDuplicateColumnConfig.load', eventData );
        }
        eventBus.unsubscribe( _viewModeChangeEventListener );
        _viewModeChangeEventListener = null;
        _cloneContentEventListener = null;
    }
};
/**
 * Locate the uid of created/selectd model object.
 *
 * @param {DeclViewModel} [data] - The data for the Replace panel.
 *
 * @returns {String} uid of created/selected model object.
 */
var getElementToReplace = function( data ) {
    var result = [];
    if( data.createdObject ) {
        if( Array.isArray( data.createdObject ) ) {
            result = data.createdObject;
        } else {
            // check if created a new object ? if yes, create an array, insert this newly created element in it and return
            var objects = [];
            objects.push( data.createdObject );
            result = objects;
        }
    } else if( data.sourceObjects ) {
        // return all selected element from palette and search tabs
        result = data.sourceObjects;
    }

    if( result && result.length === 1 ) {
        var replacedObject = result[ 0 ];
        if( replacedObject.modelType ) {
            if( replacedObject.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
                return replacedObject.uid;
            } else if( replacedObject.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                if( replacedObject.props && replacedObject.props.awb0UnderlyingObject && replacedObject.props.awb0UnderlyingObject.dbValue ) {
                    return replacedObject.props.awb0UnderlyingObject.dbValue;
                }
            }
        }
    }
};

/**
 * Set isDuplicateEnabled on context as false, clear Out local variable and delete clone options from DB.
 */
export let disableDuplicateModeAndClearData = function() {
    if( appCtxSvc.ctx.aceActiveContext && appCtxSvc.ctx.aceActiveContext.context.isDuplicateEnabled ) {
        exports.disableDuplicateMode();
        exports.deleteCloneOptionsFromBWC();
    }
};
/**
 * Add Action to the Pending Action Column. It also stores clone information and their operation type for the respective occurrence.
 * It propagates operation type up and down to the hierarchy available in tree.
 *
 * @param {Int} operationType - duplicate operation type.
 * @param {DeclViewModel} [data] - The data for the Replace panel.
 */
export let setDuplicateActionOnLine = function( operationType, data = {} ) {
    let loadedVMOs = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects;
    let selectedVMO = getSelectedAndConfiguredVMOsWithOutRoot();
    let topUID = appCtxSvc.ctx.aceActiveContext.context.topElement.uid;
    for( let j = 0, len = selectedVMO.length; j < len; ++j ) {
        let clonedObjectInfo = {};
        if( operationType === operationTypes.REPLACE ) {
            let replacedObjectUID = getElementToReplace( data );
            clonedObjectInfo = { itemRev_uid: replacedObjectUID };
        }
        // Store this to local variable
        mergeOrStoreData( selectedVMO[ j ], operationType, clonedObjectInfo );
        var operationTypeVMO = getEffectiveDuplicateOperation( selectedVMO[ j ] );
        if( operationTypeVMO !== operationType ) {
            var vmos = getAllOccurrencesBasedOnIdentifier( loadedVMOs, selectedVMO[ j ], operationType, clonedObjectInfo );
            if( vmos.length > 0 ) {
                for( var i = 0, length = vmos.length; i < length; ++i ) {
                    var isSelected = selectedVMO.find( function( selectedObject ) {
                        return selectedObject.uid === vmos[ i ].uid;
                    } );

                    if( isSelected || isParentBeingCloned( loadedVMOs, vmos[ i ] ) ) {
                        // Update the Column Value to the selected Action
                        updateVMOBasedOnAction( vmos[ i ], operationType, clonedObjectInfo );

                        var cloneOperationTypeForParent = findCloneOperationTypeToPropagateToParent( loadedVMOs, vmos[ i ] );
                        propagatePendingActionToParents( loadedVMOs, selectedVMO, vmos[ i ], topUID, cloneOperationTypeForParent, clonedObjectInfo, true );
                        //Clear Processing information
                        loadedVMOs.forEach( function( vmo ) { delete vmo.isProcessed; } );

                        if( operationTypes.REFERENCE === operationType || operationTypes.IGNORE === operationType ) {
                            propagatePendingActionToChildren( loadedVMOs, vmos[ i ], topUID, operationType, clonedObjectInfo );
                        } else if( operationType === operationTypes.CLONE ) {
                            displayActualPendingActionOnChildren( vmos[ i ], operationType );
                        } else if( operationType === operationTypes.CLONE_BELOW ) {
                            propagatePendingActionToChildrenForCloneBelow( loadedVMOs, vmos[ i ], topUID );
                        } else if( operationType === operationTypes.REPLACE ) {
                            propagateReplaceActionToChildren( vmos[ i ], topUID, operationType );
                        }
                        //Clear Processing information
                        loadedVMOs.forEach( function( vmo ) { delete vmo.isProcessed; } );
                    }
                }
            }
        }
    }
    // Close toolAndInfoPanel panel after operation completed
    var eventData = { source: 'toolAndInfoPanel' };
    eventBus.publish( 'complete', eventData );
    // Event to update Tree Table UI
    eventBus.publish( 'reRenderTableOnClient' );
};

var findCloneOperationTypeToPropagateToParent = function( loadedVMOs, vmo ) {
    var parentVMO = getParentVMO( loadedVMOs, vmo );
    var cloneOperationType = operationTypes.CLONE;
    if( parentVMO ) {
        var cloneInfo = getActualOperationTypeForVMO( parentVMO, false );
        cloneOperationType = cloneInfo.cloneOperationType;
        if( cloneOperationType === operationTypes.CLONE || cloneOperationType === operationTypes.CLONE_BELOW ) {
            return cloneOperationType;
        }
        cloneOperationType = findCloneOperationTypeToPropagateToParent( loadedVMOs, parentVMO );
    }
    return cloneOperationType;
};

var displayActualPendingActionOnChildren = function( vmo, cloneOperationTypeParent ) {
    var children = occmgmtUtils.getImmediateChildrenOfGivenParentNode( vmo );
    // Update children if top
    if( children ) {
        for( var i = 0, len = children.length; i < len; i++ ) {
            if( children[ i ].props && !children[ i ].isProcessed ) {
                var cloneOperationType = 1;
                var clonedObjectInfo = {};
                if( cloneOperationTypeParent === operationTypes.CLONE && children[ i ].props ) {
                    var cloneInfo = getActualOperationTypeForVMO( children[ i ], true );
                    cloneOperationType = cloneInfo.cloneOperationType;
                    clonedObjectInfo = cloneInfo.clonedObjectInfo;
                } else if( cloneOperationTypeParent === operationTypes.CLONE_BELOW ) {
                    cloneInfo = getActualOperationTypeForVMO( children[ i ], false );
                    clonedObjectInfo = cloneInfo.clonedObjectInfo;
                    cloneOperationType = cloneInfo.cloneOperationType;
                    if( cloneInfo.cloneOperationType === null ) {
                        cloneOperationType = cloneOperationTypeParent;
                    }
                } else {
                    cloneOperationType = cloneOperationTypeParent;
                }
                children[ i ].isProcessed = true;
                // Update the Column Value to the selected Action
                updateVMOBasedOnAction( children[ i ], cloneOperationType, clonedObjectInfo );
                // Recursively updates other children till leaf nodes
                displayActualPendingActionOnChildren( children[ i ], cloneOperationType );
            }
        }
    }
};

var getSelectedAndConfiguredVMOsWithOutRoot = function() {
    var selectedVMO = [];
    var loadedVMOs = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects;
    var topUID = appCtxSvc.ctx.aceActiveContext.context.topElement.uid;
    if( loadedVMOs ) {
        var selectedObj = appCtxSvc.ctx.mselected;
        for( var i = 0; i < selectedObj.length; ++i ) {
            if( selectedObj[ i ].uid !== topUID && !selectedObj[ i ].props.hideDuplicateCommand &&
                selectedObj[ i ].props.awb0ArchetypeRevId && selectedObj[ i ].props.awb0ArchetypeRevId.dbValues[ 0 ].length > 0 ) {
                for( var iDx = 0; iDx < loadedVMOs.length; ++iDx ) {
                    if( loadedVMOs[ iDx ].uid === selectedObj[ i ].uid ) {
                        selectedVMO.push( loadedVMOs[ iDx ] );
                        break;
                    }
                }
            }
        }
    }
    return selectedVMO;
};
/**
 * Return parent vmo based on UID.
 *
 * @param {Object} loadedVMOs -Loaded vmos.
 * @param {Object} vmo - vmo whose parent needs to return.
 * @return {Object} vmo - return vmo based on uid.
 */
var getParentVMO = function( loadedVMOs, vmo ) {
    var parentUID = null;
    if( vmo.props && vmo.props.awb0Parent ) {
        parentUID = vmo.props.awb0Parent.dbValue;
    }
    if( loadedVMOs && parentUID !== null ) {
        for( var iDx = 0; iDx < loadedVMOs.length; ++iDx ) {
            if( loadedVMOs[ iDx ].uid === parentUID ) {
                return loadedVMOs[ iDx ];
            }
        }
    }
};

/**
 * Return All vmos based on UID.
 *
 * @param {Object} loadedVMOs -Loaded vmos.
 * @param {Object} vmo - vmo of underlying Object.
 * @return {Object} vmo - return vmo based on uid.
 */
var getAllOccurrencesBasedOnIdentifier = function( loadedVMOs, vmo, operationType, clonedObjectInfo ) {
    var isCloneOrCloneBelow = Boolean( operationType === operationTypes.CLONE || operationType === operationTypes.CLONE_BELOW );
    var identifier = OCCIDENTIFIERPROPERTY;
    if( isCloneOrCloneBelow && appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0IsOccurrenceCloneDataEnabled ) {
        identifier = 'awb0UnderlyingObject';
    }
    var allVMOsWithSameID = [];
    allVMOsWithSameID.push( vmo );
    var underlyingObj = null;
    if( vmo.props && vmo.props[ identifier ] && vmo.props[ identifier ].dbValue ) {
        underlyingObj = vmo.props[ identifier ].dbValue;
    }
    if( loadedVMOs && underlyingObj !== null ) {
        for( var iDx = 0; iDx < loadedVMOs.length; ++iDx ) {
            if( loadedVMOs[ iDx ].props && loadedVMOs[ iDx ].props[ identifier ] && loadedVMOs[ iDx ].props[ identifier ].dbValue === underlyingObj ) {
                if( appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0IsOccurrenceCloneDataEnabled ) {
                    var operationTypeVMO = getEffectiveDuplicateOperation( loadedVMOs[ iDx ] );
                    if( operationTypeVMO === operationTypes.CLONE || operationTypeVMO === operationTypes.CLONE_BELOW ) {
                        if( operationType !== undefined ) {
                            mergeOrStoreData( loadedVMOs[ iDx ], operationType, clonedObjectInfo );
                            updateVMOBasedOnAction( loadedVMOs[ iDx ], operationType, clonedObjectInfo );
                        }
                        allVMOsWithSameID.push( loadedVMOs[ iDx ] );
                    }
                } else {
                    allVMOsWithSameID.push( loadedVMOs[ iDx ] );
                }
            }
        }
    }
    return allVMOsWithSameID;
};

/**
 * Update children of vmo based on duplicate operation downward.
 * @param {Object} loadedVMOs -Loaded vmos.
 * @param {Object} vmo -selected vmo.
 * @param {String} topUID -top node UID.
 * @param {Int} cloneOperationType - duplicate operation type.
 * @param {Object} clonedObjectInfo - info object related to revise and replace.
 */
var propagatePendingActionToChildren = function( loadedVMOs, vmo, topUID, cloneOperationType, clonedObjectInfo ) {
    var children = occmgmtUtils.getImmediateChildrenOfGivenParentNode( vmo );
    // Update children if top
    if( children && topUID !== vmo.uid ) {
        for( var i = 0, len = children.length; i < len; i++ ) {
            //Update Children as well in case of occurrence Level validation
            // if( appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0IsOccurrenceCloneDataEnabled ) {
            //     mergeOrStoreData( children[ i ], cloneOperationType, clonedObjectInfo );
            // }
            // Update the Column Value to the selected Action
            updateVMOBasedOnAction( children[ i ], cloneOperationType, clonedObjectInfo );
            // Recursively updates other children till leaf nodes
            propagatePendingActionToChildren( loadedVMOs, children[ i ], topUID, cloneOperationType, clonedObjectInfo );
        }
    }
};
/**
 * Update children of vmo based on duplicate operation downward.
 *
 * @param {Object} vmo - view model object.
 * @param {String} [topUID] - Uid of top node
 * @param {Int} cloneOperationType - operation type that needs to applied.
 */
var propagateReplaceActionToChildren = function( vmo, topUID, cloneOperationType ) {
    var children = occmgmtUtils.getImmediateChildrenOfGivenParentNode( vmo );
    // Update children if top
    if( children && topUID !== vmo.uid ) {
        for( var i = 0, len = children.length; i < len; i++ ) {
            updateVMOBasedOnAction( children[ i ], cloneOperationType, {} );
            propagateReplaceActionToChildren( children[ i ], topUID, cloneOperationType );
        }
    }
};

var isElementUnconfigured = function( vmo ) {
    if( vmo.props.awb0ArchetypeRevId && vmo.props.awb0ArchetypeRevId.dbValues[ 0 ].length === 0 ) {
        return true;
    }
    return false;
};
/**
 * Update children of vmo based on CloneBelow operation downward.
 * @param {Object} loadedVMOs -Loaded vmos.
 * @param {Object} vmo -selected vmo.
 * @param {Object} topUID -top node UID.
 * @param {Object} clonedObjectInfo - info object related to revise and replace.
 * @param {Object} userAction - If true, populate dirt data map.
 */
var propagatePendingActionToChildrenForCloneBelow = function( loadedVMOs, vmo, topUID ) {
    var children = occmgmtUtils.getImmediateChildrenOfGivenParentNode( vmo );
    // Update children if top
    if( children && topUID !== vmo.uid ) {
        for( var i = 0, len = children.length; i < len; i++ ) {
            var cloneInfo = getActualOperationTypeForVMO( children[ i ], false );
            var cloneOperationTypeForItemRev = cloneInfo.cloneOperationType;
            var clonedObjectInfo = cloneInfo.clonedObjectInfo;
            if( cloneOperationTypeForItemRev === null || cloneOperationTypeForItemRev === operationTypes.CLONE_BELOW ) {
                // Update the Column Value to the selected Action
                updateVMOBasedOnAction( children[ i ], operationTypes.CLONE_BELOW, clonedObjectInfo );
                // Recursively updates other children till leaf nodes
                propagatePendingActionToChildrenForCloneBelow( loadedVMOs, children[ i ], topUID );
            } else {
                // Update the Column Value to the selected Action
                updateVMOBasedOnAction( children[ i ], cloneOperationTypeForItemRev, clonedObjectInfo );
                // If operation is already set for item show that operation
                displayActualPendingActionOnChildren( children[ i ], cloneOperationTypeForItemRev );
            }
        }
    }
};

/**
 * Update parent of vmo based on duplicate operation upward.
 *
 * @param {Object} loadedVMOs -all loaded vmos.
 * @param {Object} vmo -selected vmo.
 * @return {Boolean} verdict - return true if upward hierarchy has remove/reference..
 */
var isParentBeingCloned = function( loadedVMOs, vmo ) {
    var parentVMO = getParentVMO( loadedVMOs, vmo );
    if( parentVMO ) {
        var parentCloneOperationType = getEffectiveDuplicateOperation( parentVMO );
        if( operationTypes.CLONE === parentCloneOperationType || operationTypes.CLONE_BELOW === parentCloneOperationType ) {
            return true;
        }
    }
};

/**
 * Update parent of vmo based on duplicate operation upward.
 *
 * @param {Object} loadedVMOs -all loaded vmos.
 * @param {Object} selectedVMO -selected vmo.
 * @param {Object} vmo - vmo.
 * @param {Object} topUID -top node UID.
 * @param {Object} cloneOperationType - duplicate operation type.
 * @param {Object} clonedObjectInfo - info object related to revise and replace.
 * @param {boolean} isDataStoredInXml - boolean variable to store entry in xml or not.
 */
var propagatePendingActionToParents = function( loadedVMOs, selectedVMO, vmo, topUID, cloneOperationType, clonedObjectInfo, isDataStoredInXml ) {
    var parentVMO = getParentVMO( loadedVMOs, vmo );
    if( parentVMO && parentVMO.uid !== topUID ) {
        var parentVMOs = getAllOccurrencesBasedOnIdentifier( loadedVMOs, parentVMO, cloneOperationType );
        for( var i = 0, length = parentVMOs.length; i < length; ++i ) {
            if( parentVMO && parentVMO.uid !== topUID ) {
                var isSelected = selectedVMO.find( function( selectedObject ) {
                    return selectedObject.uid === parentVMOs[ i ].uid;
                } );

                if( !isSelected && ( parentVMO === parentVMOs[ i ] || isParentBeingCloned( loadedVMOs, parentVMOs[ i ] ) ) ) {
                    var cloneOperationTypeToPropagate = cloneOperationType;
                    var cloneInfo = getActualOperationTypeForVMO( parentVMOs[ i ], false );
                    var actualCloneOperationType = cloneInfo.cloneOperationType;
                    clonedObjectInfo = cloneInfo.clonedObjectInfo;
                    if( actualCloneOperationType === operationTypes.CLONE || actualCloneOperationType === operationTypes.CLONE_BELOW ) {
                        cloneOperationTypeToPropagate = actualCloneOperationType;
                    }
                    // Update the Column Value to the selected Action
                    updateVMOBasedOnAction( parentVMOs[ i ], cloneOperationTypeToPropagate, clonedObjectInfo );
                    // Store this to local variable
                    if ( isDataStoredInXml ){
                        mergeOrStoreData( parentVMOs[ i ], cloneOperationTypeToPropagate, clonedObjectInfo );
                    }
                    // Reset it's children to default value
                    displayActualPendingActionOnChildren( parentVMOs[ i ], cloneOperationTypeToPropagate );
                    // Recursively updates other parent till the Root
                    propagatePendingActionToParents( loadedVMOs, selectedVMO, parentVMOs[ i ], topUID, cloneOperationTypeToPropagate, clonedObjectInfo, isDataStoredInXml );
                }
            }
        }
    }
};

export let getEffectiveDuplicateOperation = function( vmo ) {
    var cloneOperationType = 1;
    if( vmo.props && vmo.props.awb0PendingAction && !isNaN( vmo.props.awb0PendingAction.effectiveValue ) ) {
        cloneOperationType = vmo.props.awb0PendingAction.effectiveValue;
    }
    return cloneOperationType;
};

var getActualOperationTypeForVMO = function( vmo, getDefaultOperation ) {
    if( vmo.props && vmo.props[ OCCIDENTIFIERPROPERTY ] ) {
        var itemRevisionUID = vmo.props[ OCCIDENTIFIERPROPERTY ].dbValue;
        if( itemRevisionUID in _duplicateInfo ) {
            return _duplicateInfo[ itemRevisionUID ];
        }
    }

    var cloneOperationType = null;
    var clonedObjectInfo = {};
    if( getDefaultOperation ) {
        cloneOperationType = 1;
    }
    if( vmo.props && vmo.props.awb0PendingAction && vmo.props.awb0PendingAction.dbValue ) {
        cloneOperationType = parseInt( vmo.props.awb0PendingAction.dbValue, 10 );
    }

    if( vmo.props ) {
        var markupPropNamesObj = vmo.props.awb0MarkupPropertyNames;
        var markupPropValuesObj = vmo.props.awb0MarkupPropertyValues;
        if( markupPropNamesObj && markupPropNamesObj.dbValues && markupPropNamesObj.dbValues.length > 0 &&
            markupPropValuesObj && markupPropValuesObj.dbValues && markupPropValuesObj.dbValues.length > 0 ) {
            var markupPropNames = markupPropNamesObj.dbValues;
            var markupDbValues = markupPropValuesObj.dbValues;
            for( var index = 0; index < markupPropNames.length; ++index ) {
                var markupPropName = markupPropNames[ index ];
                if( markupPropName === 'awb0ArchetypeId' ) {
                    clonedObjectInfo.uid = markupDbValues[ index ];
                } else if( markupPropName === 'awb0ArchetypeRevId' ) {
                    if( cloneOperationType === operationTypes.REPLACE ) {
                        clonedObjectInfo.rev = markupDbValues[ index ];
                    }
                    if( cloneOperationType === operationTypes.CLONE || cloneOperationType === operationTypes.CLONE_BELOW ) {
                        clonedObjectInfo.awb0ArchetypeRevId = markupDbValues[ index ];
                    }
                } else if( markupPropName === 'awb0ArchetypeRevName' ) {
                    clonedObjectInfo.awb0ArchetypeRevName = markupDbValues[ index ];
                } else if( markupPropName === 'awb0ArchetypeRevDescription' ) {
                    clonedObjectInfo.awb0ArchetypeRevDescription = markupDbValues[ index ];
                }
            }
        }
    }
    return {
        cloneOperationType: cloneOperationType,
        clonedObjectInfo: clonedObjectInfo
    };
};

/**
 * Updates vmo based on duplicate operation.
 *
 * @param {Object} vmo -selected vmo.
 * @param {Int} cloneOperationType - duplicate operation type.
 * @param {Object} clonedObjectInfo - duplicate operation Info.
 */
var updateVMOBasedOnAction = function( vmo, cloneOperationType, clonedObjectInfo ) {
    if( !vmo.props ) {
        return;
    }
    // set default values on VMO.
    vmo.isDeleted = false;
    vmo.isGreyedOutElement = false;
    resetPropOfVMO( vmo, AWB0ARCHETYPEID );
    resetPropOfVMO( vmo, AWB0ARCHETYPEREVID );
    resetPropOfVMO( vmo, AWB0ARCHETYPEREVNAME );
    resetPropOfVMO( vmo, AWB0ARCHETYPEREVDESC );

    var cloneOperationTypeInternal = cloneOperationType;
    if( cloneOperationType !== operationTypes.IGNORE && isElementUnconfigured( vmo ) ) {
        // Do not show clone operation on unconfigured line unless it is operationTypes.IGNORE
        cloneOperationTypeInternal = operationTypes.REFERENCE;
    }

    updateUiAndEffectiveValueOfVMO( vmo, _validDuplicateOperations[ cloneOperationTypeInternal ], cloneOperationTypeInternal );

    if( cloneOperationTypeInternal === operationTypes.IGNORE ) { // For Ignore operation
        vmo.isDeleted = true;
    } else if( cloneOperationTypeInternal === operationTypes.CLONE || cloneOperationTypeInternal === operationTypes.REVISE || cloneOperationTypeInternal === operationTypes.CLONE_BELOW ) {
        updatePropWithNewValue( vmo, AWB0ARCHETYPEID, _localizedPendingString );
        updatePropertiesAsPerCloneObjectInfo( clonedObjectInfo, vmo );
    } else if( cloneOperationTypeInternal === operationTypes.REPLACE ) {
        var replacedObjectUID = _localizedPendingString;
        var replacedObjectRevision = _localizedPendingString;
        if( clonedObjectInfo.uid ) {
            replacedObjectUID = clonedObjectInfo.uid;
            replacedObjectRevision = clonedObjectInfo.rev;
        } else if( clonedObjectInfo.itemRev_uid ) {
            loadAndUpdateUIValue( vmo, clonedObjectInfo.itemRev_uid );
        } else {
            vmo.isGreyedOutElement = true;
            updateUiAndEffectiveValueOfVMO( vmo, _validDuplicateOperations[ operationTypes.REFERENCE ], operationTypes.REPLACE );
            updateModelObject( vmo.uid, cloneOperationTypeInternal, true );
            return;
        }
        updatePropWithNewValue( vmo, AWB0ARCHETYPEID, replacedObjectUID );
        updatePropWithNewValue( vmo, AWB0ARCHETYPEREVID, replacedObjectRevision );
    }
    updateModelObject( vmo.uid, cloneOperationTypeInternal );
};

var resetPropOfVMO = function( vmo, propId ) {
    if( vmo.props && vmo.props[ propId ] ) {
        var oldValue = vmo.props[ propId ].oldValue;
        if( oldValue || _.isEqual( oldValue, '' ) ) {
            vmo.props[ propId ].oldValue = undefined;
            vmo.props[ propId ].uiValue = oldValue;
        }
    }
};
var updatePropWithNewValue = function( vmo, propId, newValue ) {
    if( vmo.props && vmo.props[ propId ] ) {
        var oldValue = vmo.props[ propId ].dbValue;
        vmo.props[ propId ].oldValue = oldValue;
        vmo.props[ propId ].uiValue = newValue;
    }
};
var updateUiAndEffectiveValueOfVMO = function( vmo, uiValue, effectiveCloneOperation ) {
    if( vmo.props && vmo.props.awb0PendingAction ) {
        vmo.props.awb0PendingAction.uiValue = uiValue;
        vmo.props.awb0PendingAction.uiValues = [ uiValue ];
        vmo.props.awb0PendingAction.effectiveValue = effectiveCloneOperation;
    }
};
/**
 * Updates item id and item revision id in case of Replace operation.
 *
 * @param {Object} vmo -selected vmo.
 * @param {String} uid -uid of an Object.
 */
var loadAndUpdateUIValue = function( vmo, uid ) {
    dataManagementSvc.getProperties( [ uid ], [ 'item_id', 'item_revision_id' ] ).then(
        function() {
            var replacedObject = cdm.getObject( uid );
            vmo.props.awb0ArchetypeId.uiValue = replacedObject.props.item_id.dbValues[ 0 ];
            vmo.props.awb0ArchetypeRevId.uiValue = replacedObject.props.item_revision_id.dbValues[ 0 ];
            eventBus.publish( 'reRenderTableOnClient' );
        } );
};
/**
 * Update Model object to support/Un-support of Duplicate Actions based on passed input.
 *
 * @param {String} uid -uid of an Object.
 * @param {Int} cloneOperationType -operation type applied on vmo.
 * @param {Boolean} hideDuplicateCommand -true to hide duplicate action on occurrence.
 */
var updateModelObject = function( uid, cloneOperationType, hideDuplicateCommand ) {
    var viewModelObject = cdm.getObject( uid );
    if( viewModelObject ) {
        if( viewModelObject.props && viewModelObject.props.awb0PendingAction ) {
            viewModelObject.props.awb0PendingAction.dbValue = cloneOperationType;
            if( hideDuplicateCommand ) {
                viewModelObject.props.hideDuplicateCommand = true;
            } else {
                viewModelObject.props.hideDuplicateCommand = false;
            }
        }
    }
};
var mergeOrStoreData = function( vmo, cloneOperationType, clonedObjectInfo ) {
    if( vmo.props && vmo.props[ OCCIDENTIFIERPROPERTY ] ) {
        var itemRevisionUID = vmo.props[ OCCIDENTIFIERPROPERTY ].dbValue;
        var objToStore = {
            element: { uid: vmo.uid, type: vmo.type },
            cloneOperationType: cloneOperationType,
            clonedObjectInfo: clonedObjectInfo
        };
        _duplicateInfo[ itemRevisionUID ] = objToStore;
        _cloneContentData[ itemRevisionUID ] = objToStore;
    }
};

/**
 * Updates VMO decorator based on value of Pending Action column. It first extracts pending action value for a vmo then updates it.
 * It also consider any local changes if made by user and not persisted in DB.
 *
 * @param {Object} vmo - Object to be updated.
 */
export let populateDuplicateActions = function( vmo ) {
    if( vmo && vmo.props && appCtxSvc.ctx.aceActiveContext.context.isDuplicateEnabled && vmo.modelType && vmo.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
        var cloneOperationType = 1; // Default Type
        var cloneOperationTypeParent = 1; // Default Type
        var topUID = appCtxSvc.ctx.aceActiveContext.context.topElement.uid;
        if( vmo.uid === topUID ) {
            cloneOperationType = operationTypes.CLONE; // Top should always clone
            let cloneInfo = getActualOperationTypeForVMO( vmo, true );
            // Store this to local variable
            mergeOrStoreData( vmo, cloneOperationType, cloneInfo.clonedObjectInfo );
            updateVMOBasedOnAction( vmo, cloneOperationType, cloneInfo.clonedObjectInfo );
        } else {
            if( appCtxSvc.ctx.aceActiveContext.context.vmc ) {
                var loadedVMOs = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects;
            }
            var vmos = getAllOccurrencesBasedOnIdentifier( loadedVMOs, vmo );
            vmos.push( vmo );
            for( var i = 0, length = vmos.length; i < length; ++i ) {
                if( !vmos[ i ].props ) {
                    return;
                }
                var clonedObjectInfo = {};
                if( vmos[ i ].props.awb0Parent ) {
                    var parentVMO = getParentVMO( loadedVMOs, vmos[ i ] );
                    if( parentVMO ) {
                        var  effectiveDuplicateOperationOnParent = getEffectiveDuplicateOperation( parentVMO );
                        // This check added explicitly to differente BO operation type "Reference" and blank value
                        if( effectiveDuplicateOperationOnParent === operationTypes.REFERENCE && parentVMO.props && parentVMO.props.awb0PendingAction ) {
                            var actualCloneOperationTypeParent = parseInt( parentVMO.props.awb0PendingAction.dbValue, 10 );
                            if ( isNaN( actualCloneOperationTypeParent )  ){
                                cloneOperationTypeParent = null;
                            }
                        }
                        else{
                            cloneOperationTypeParent = effectiveDuplicateOperationOnParent;
                        }
                    }
                }

                var cloneInfo = getActualOperationTypeForVMO( vmos[i], false );
                var actualCloneOperationType = cloneInfo.cloneOperationType;
                clonedObjectInfo = cloneInfo.clonedObjectInfo;

                if ( cloneOperationTypeParent === null || cloneOperationTypeParent === operationTypes.REFERENCE )
                {
                       // when cloneOperationTypeParentis referenced then we need to mark all its children as reference irrespective of BO cosntant on children.
                       if ( cloneOperationTypeParent === null && actualCloneOperationType !== null && actualCloneOperationType !== operationTypes.REFERENCE )
                       {
                           var pendingActionForParent= findCloneOperationTypeToPropagateToParent( loadedVMOs, vmos[ i ] );
                           //In case of BOM assembly expansion we are not going to store any element value in xml hence sending isDataStoredInXml value as false
                           propagatePendingActionToParents( loadedVMOs, vmos, vmos[ i ], topUID, pendingActionForParent, clonedObjectInfo, false );
                       }
                       else
                       {
                           cloneOperationType = operationTypes.REFERENCE;
                       }
                }
                else
                {
                   if( cloneOperationTypeParent === operationTypes.CLONE_BELOW && actualCloneOperationType === null )
                   {
                       cloneOperationType = operationTypes.CLONE_BELOW;
                   }
                   else if( actualCloneOperationType !== null && ( cloneOperationTypeParent === operationTypes.CLONE_BELOW || cloneOperationTypeParent === operationTypes.CLONE ) )
                   {
                       cloneOperationType = actualCloneOperationType;
                   }
                   else if( actualCloneOperationType === null && cloneOperationTypeParent === operationTypes.CLONE )
                   {
                        cloneOperationType = operationTypes.REFERENCE;
                   }
                   else
                   {
                       cloneOperationType = cloneOperationTypeParent;
                   }
                }
               updateVMOBasedOnAction( vmos[ i ], cloneOperationType, clonedObjectInfo );
           }
       }
   }
};

/**
 * Set inputs for the duplicate SOA on data.
 *
 * @param {Object} data toggle state value for decorator flag.
 */
export let preDuplicateProcessing = function( data ) {
    appCtxSvc.ctx.aceActiveContext.context.isDuplicateEnabled = false;
    //Object.values is an experimental feature and it is not being supported in IE yet.
    //data.dataMap = Object.values( _cloneContentData );
    data.dataMap = Object.keys( _cloneContentData ).map( function( dupInfo ) { return _cloneContentData[ dupInfo ]; } );
    data.defaultFolder = { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' };
    var uid = appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid;
    var type = appCtxSvc.ctx.aceActiveContext.context.productContextInfo.type;
    data.productContextInfo = { uid: uid, type: type };
    var cloneFlags = 0;
    cloneFlags = data.runInBackgroundCheckBox.dbValue ? cloneFlags + 8 : cloneFlags; // 8 is to run duplicate in background mode
    data.cloneFlags = cloneFlags;
};

/**
 * Open cloned structure.
 * @param {Object} notificationObject Notification object.
 */
export let openInteractiveDuplicateNotification = function( notificationObject ) {
    dataManagementSvc.getProperties( [ notificationObject.object.uid ], [ 'fnd0MessageBody' ] ).then(
        function() {
            var srcUidToken = notificationObject.object.props.fnd0MessageBody.dbValues[ 0 ];
            dataManagementSvc.loadObjects( [ srcUidToken ] ).then( function() {
                var transitionTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
                var toParams = {
                    uid: srcUidToken,
                    page: 'Content',
                    pageId: 'tc_xrt_Content'
                };
                var options = {
                    inherit: false
                };
                LocationNavigationService.instance.go( transitionTo, toParams, options );
            } );
        } );
};

export let setClonedObject = function( data ) {
    if( data.created ) {
        var clonedObjectUID = data.created[ 0 ];
        var sourceObjectUID = null;
        if( appCtxSvc.ctx.aceActiveContext.context.topElement.props.awb0UnderlyingObject ) {
            sourceObjectUID = appCtxSvc.ctx.aceActiveContext.context.topElement.props.awb0UnderlyingObject.dbValues[ 0 ];
        }
        dataManagementSvc.loadObjects( [ clonedObjectUID, sourceObjectUID ] ).then( function() {
            var clonedObject = cdm.getObject( clonedObjectUID );
            var sourceObject = cdm.getObject( sourceObjectUID );
            appCtxSvc.updatePartialCtx( 'aceActiveContext.context.clonedElement', clonedObject );
            appCtxSvc.updatePartialCtx( 'aceActiveContext.context.sourceElement', sourceObject );
        } );
    }
};

export let enableDisableUIContent = function( data ) {
    if( data && data.selectChildrenToDuplicate && data.object_name && data.object_desc ) {
        if( data.selectChildrenToDuplicate.dbValue ) {
            data.object_name.isEnabled = false;
            data.object_desc.isEnabled = false;
            data.object_name.dbValue = '';
            data.object_desc.dbValue = '';
        } else {
            data.object_name.isEnabled = true;
            data.object_desc.isEnabled = true;
        }
    }
};

export let updateCloneObjectInfo = function( vmo ) {
    let cloneInfo = getActualOperationTypeForVMO( vmo, false );
    let awb0ArcheTypeRevId = vmo.props[ AWB0ARCHETYPEREVID ];
    let awb0ArcheTypeRevName = vmo.props[ AWB0ARCHETYPEREVNAME ];
    let awb0ArcheTypeRevDesc = vmo.props[ AWB0ARCHETYPEREVDESC ];
    if( !cloneInfo.elememt ) {
        cloneInfo.element = { uid: vmo.uid, type: vmo.type };
    }
    cloneInfo.cloneOperationType = getEffectiveDuplicateOperation( vmo );

    if( awb0ArcheTypeRevId && awb0ArcheTypeRevId.oldValue && awb0ArcheTypeRevId.uiValue ) {
        cloneInfo.clonedObjectInfo[ awb0ArcheTypeRevId.propertyName ] = awb0ArcheTypeRevId.uiValue;
    }
    if( awb0ArcheTypeRevName && awb0ArcheTypeRevName.oldValue && awb0ArcheTypeRevName.uiValue ) {
        cloneInfo.clonedObjectInfo[ awb0ArcheTypeRevName.propertyName ] = awb0ArcheTypeRevName.uiValue;
    }
    if( awb0ArcheTypeRevDesc && !_.isUndefined( awb0ArcheTypeRevDesc.oldValue ) && !_.isUndefined( awb0ArcheTypeRevDesc.uiValue ) ) {
        cloneInfo.clonedObjectInfo[ awb0ArcheTypeRevDesc.propertyName ] = awb0ArcheTypeRevDesc.uiValue;
    }
    let itemRevisionUID = vmo.props[ OCCIDENTIFIERPROPERTY ].dbValue;
    _cloneContentData[ itemRevisionUID ] = cloneInfo;
    _duplicateInfo[ itemRevisionUID ] = cloneInfo;
    updateAllOccurrencesBasedOnIdentifier( vmo );
};

var updateAllOccurrencesBasedOnIdentifier = function( vmo ) {
    let loadedVMOs = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects;
    let cloneInfoObject = getActualOperationTypeForVMO( vmo, false );
    let reUsedOccurrences = getAllOccurrencesBasedOnIdentifier( loadedVMOs, vmo, cloneInfoObject.cloneOperationType, cloneInfoObject.clonedObjectInfo );
    for( let index in reUsedOccurrences ) {
        let reUsedOccurrence = reUsedOccurrences[ index ];
        if( isParentBeingCloned( loadedVMOs, reUsedOccurrence ) ) {
            updatePropertiesAsPerCloneObjectInfo( cloneInfoObject.clonedObjectInfo, reUsedOccurrence );
        }
    }
};

var updatePropertiesAsPerCloneObjectInfo = function( clonedObjectInfo, vmo ) {
    if( !_.isUndefined( clonedObjectInfo ) ) {
        if( !_.isUndefined( vmo.props[ AWB0ARCHETYPEREVID ] ) && clonedObjectInfo.awb0ArchetypeRevId ) {
            let revisionId = clonedObjectInfo.awb0ArchetypeRevId;
            updatePropWithNewValue( vmo, AWB0ARCHETYPEREVID, revisionId );
            vmo.props[ AWB0ARCHETYPEREVID ].newValue = revisionId;
        }
        if( !_.isUndefined( vmo.props[ AWB0ARCHETYPEREVNAME ] ) && clonedObjectInfo.awb0ArchetypeRevName ) {
            let revisionName = clonedObjectInfo.awb0ArchetypeRevName;
            updatePropWithNewValue( vmo, AWB0ARCHETYPEREVNAME, revisionName );
            vmo.props[ AWB0ARCHETYPEREVNAME ].newValue = revisionName;
        }
        if( !_.isUndefined( vmo.props[ AWB0ARCHETYPEREVDESC ] ) && !_.isUndefined( clonedObjectInfo.awb0ArchetypeRevDescription ) ) {
            let revisionDesc = clonedObjectInfo.awb0ArchetypeRevDescription;
            updatePropWithNewValue( vmo, AWB0ARCHETYPEREVDESC, revisionDesc );
            vmo.props[ AWB0ARCHETYPEREVDESC ].newValue = revisionDesc;
        }
    }
};

export let resetDuplicateModeFlag = function() {
    appCtxSvc.ctx.aceActiveContext.context.isDuplicateEnabled = true;
};

export let clearDuplicateInfo = function() {
    _duplicateInfo = {};
    clearDuplicateInfoOnContext();
};

var clearDuplicateInfoOnContext = function() {
    Object.keys( _cloneContentData ).forEach( function( key ) {
        delete _cloneContentData[ key ];
    } );
};

/**
 * Interactive Duplicate service utility
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {editHandlerService} editHandlerService - Service to use.
 * @param {soa_dataManagementService} dataManagementSvc - Service to use.
 * @param {locationNavigationService} locNavSvc - Service to use.
 * @param {soa_kernel_clientDataModel} cdm - Service to use.
 * @param {localeService} localeService - Service to use.
 * @param {localeService} occmgmtUtils - Service to use.
 * @returns {object} - object
 */

export default exports = {
    initialize,
    destroy,
    enableDuplicateMode,
    deleteCloneOptionsFromBWC,
    disableDuplicateMode,
    disableDuplicateModeAndClearData,
    setDuplicateActionOnLine,
    populateDuplicateActions,
    preDuplicateProcessing,
    openInteractiveDuplicateNotification,
    setClonedObject,
    enableDisableUIContent,
    updateCloneObjectInfo,
    getEffectiveDuplicateOperation,
    resetDuplicateModeFlag,
    clearDuplicateInfo
};
app.factory( 'aceInteractiveDuplicateService', () => exports );
