//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/createWorksetService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import soaSvc from 'soa/kernel/soaService';
import cdmService from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import dateTimeSvc from 'js/dateTimeService';
import localeService from 'js/localeService';
import occmgmtGetSvc from 'js/occmgmtGetService';
import ctxStateMgmtService from 'js/contextStateMgmtService';
import awDataNavigatorService from 'js/awDataNavigatorService';
import AwPromiseService from 'js/awPromiseService';
import _uwPropSrv from 'js/uwPropertyService';
import _occmgmtBackingObjectProviderService from 'js/occmgmtBackingObjectProviderService';
import occmgmtUtils from 'js/occmgmtUtils';

var exports = {};

export let validateWorkingContext =  function( data ) {
    if( data.output.length > 0 ) {
        var created = data.output[0].objects;
        for( var i = 0; i < created.length; i++ ) {
            var createdObjectUId = cdmService.getObject( created[i].uid );
            if( createdObjectUId !== null ) {
                if( createdObjectUId.modelType.typeHierarchyArray.indexOf( 'Fnd0WorksetRevision' ) > -1 ) {
                    return created[i];
                }
            }
        }
    }
};

/**
 * Adding a ctx variable worksetTopNode and worksetTopItemNode when the workset is opened.
 * This variable will give the modelTypeHierarchy on th top node when it is workset
 */
export let updateCtxWithTopNodeHierarchy = function() {
    var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if ( activeContext && activeContext.worksetTopNode === undefined && activeContext.openedElement && activeContext.openedElement.props.awb0UnderlyingObject ) {
        var createdObject = cdmService.getObject( activeContext.openedElement.props.awb0UnderlyingObject.dbValues[0] );
        if ( createdObject !== null && createdObject.modelType.typeHierarchyArray.indexOf( 'Fnd0WorksetRevision' ) > -1 ) {
            appCtxSvc.registerPartialCtx( 'aceActiveContext.context.worksetTopNode', createdObject );
            if ( createdObject.props && createdObject.props.items_tag ) {
                var worksetItemtag = createdObject.props.items_tag.dbValues[0];
                var worksetItem = cdmService.getObject( worksetItemtag );
                if ( worksetItem ) {
                    appCtxSvc.registerPartialCtx( 'aceActiveContext.context.worksetItemTopNode', worksetItem );
                }
            }
        }
    }
};


/**
 * Update the element to PCI map for the newly added subsets
 * This will invoke getOccurrences() to reload Workset
 * To get the updated elementToPCI map containing the newly added subsets.
 * @param {Object} updatedParentElement The input parent element on which addd is initiated.
 * @param {Object} newElements List of new elements to add
 */
 export let updateElementToPCIMapOnAddSubset = function( updatedParentElement, newElements ) {
    var treeLoadInput = {
        parentElement: updatedParentElement.uid,
        startChildNdx: 0,
        displayMode: 'Tree',
        addAfter: true
    };
    var context = _.get( appCtxSvc.ctx, appCtxSvc.ctx.aceActiveContext.key );
    var soaInput = occmgmtGetSvc.getDefaultSoaInput();
    return occmgmtGetSvc.getOccurrences( treeLoadInput, soaInput, context ).then(
    function( response ) {
        if( response.elementToPCIMap ) {
            // Get the map  of elementToPCIMap
            var elementToPCIMap = {};
            for( var indx = 0; indx < response.elementToPCIMap[ 0 ].length; indx++ ) {
                var key = response.elementToPCIMap[ 0 ][ indx ].uid;
                var value = response.elementToPCIMap[ 1 ][ indx ].uid;
                elementToPCIMap[ key ] = value;
            }
            // Update context with element to PCI map
            var elementToPCIMapCount = Object.keys( elementToPCIMap ).length;
            appCtxSvc.updatePartialCtx( appCtxSvc.ctx.aceActiveContext.key + '.elementToPCIMap', elementToPCIMap );
            appCtxSvc.updatePartialCtx( appCtxSvc.ctx.aceActiveContext.key + '.elementToPCIMapCount', elementToPCIMapCount );

            // Update PCI on the context for the new selection
            updatePCIOnAddSubsetOperation( newElements );
        }
    } );
};

/**
 * Update the PCI  on the  context for the newly added subset
 * @param {Object} newElements - new elements to be added from the addElement response
 */
function updatePCIOnAddSubsetOperation( newElements ) {
     // Get PCI for the new selection
    var contextKey = appCtxSvc.ctx.aceActiveContext.key;
    var lastSelectedObject = newElements[ newElements.length - 1 ];
    var productInfo = awDataNavigatorService.getProductInfoForCurrentSelection( lastSelectedObject, contextKey );
    awDataNavigatorService.syncRootElementInfoForProvidedSelection( productInfo, contextKey );

    // We are not triggering either tree reload or pwa.reset for change in pci_uid
    // If changed fire updatePartialCtx and update context
    var currentPci_Uid = appCtxSvc.ctx[ contextKey ].currentState.pci_uid;
    if( productInfo && productInfo.newPci_uid && productInfo.newPci_uid !== currentPci_Uid ) {
        // Update already added node PCI
        var context = _.get( appCtxSvc.ctx, contextKey );
        var vmCollection = context.vmc;
        var ndx = _.findLastIndex( vmCollection.loadedVMObjects, function( vmo ) {
            return vmo.uid === newElements[0].uid;
        } );
        if( ndx > -1 ) {
            vmCollection.loadedVMObjects[ ndx ].pciUid = productInfo.newPci_uid;
        }

        var newState = {
            c_uid: newElements[0].uid,
            pci_uid: productInfo.newPci_uid
        };
        appCtxSvc.updatePartialCtx( contextKey + '.productContextInfo', cdmService
            .getObject( productInfo.newPci_uid ) );
        var occDataLoadedEventData = {
            dataProviderActionType: 'productChangedOnSelectionChange'
        };
        eventBus.publish( 'occDataLoadedEvent', occDataLoadedEventData );

        ctxStateMgmtService.updateContextState( contextKey, newState, true );
    }
}

/** Sets the implict selection for Workset replay in case of no pwa selection
 */
 export let setDefaultSelectionForWorksetReplay = function() {
    var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    var pwaSelections = activeContext.pwaSelectionModel.getSelection();
    if ( pwaSelections.length === 0  && appCtxSvc.ctx.mselected.length === 1 &&
        appCtxSvc.ctx.mselected[0].uid === activeContext.topElement.uid ) {
        activeContext.pwaSelectionModel.setSelection( appCtxSvc.ctx.mselected[0].uid );
    }
};

export let postRemoveSubsetFromWorkset = function( removedElementUIDs ) {
    var removedObjects = [];

    _.forEach( removedElementUIDs, function( removedElementUID ) {
        var removedObject = appCtxSvc.ctx.mselected.filter( function( selected ) {
            return selected.uid === removedElementUID;
        } );
        removedObjects.push.apply( removedObjects, removedObject );
    } );

    const activeCtxKey = appCtxSvc.ctx.aceActiveContext.key;
    var parentObjectUid = occmgmtUtils.getParentUid(removedObjects[0]);
    var parentModelObject = [ cdmService.getObject(parentObjectUid) ];

    if( parentModelObject[0].props.awb0UnderlyingObjectType && parentModelObject[0].props.awb0UnderlyingObjectType.dbValues[0] === 'Fnd0WorksetRevision' ) {
        if( appCtxSvc.ctx[ activeCtxKey ].elementToPCIMap ) {
            var parentPCI = appCtxSvc.ctx[ activeCtxKey ].elementToPCIMap[ parentObjectUid ];
            var parentPCIModelObject = [ cdmService.getObject(parentPCI) ];
            appCtxSvc.updatePartialCtx( activeCtxKey + '.productContextInfo', parentPCIModelObject[0] );
        }
    }
};

/** Sets the ui value for workset replay tooltipp
 * @param {Object} replayWorksetText - The tooltip for workset replay
 */
 export let setWorksetReplayToolTip = function( replayWorksetText ) {
    var replayDateText = '';
    var selections = appCtxSvc.getCtx( 'mselected' );
    var resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants' );
    replayWorksetText.uiValue = resource.replaySubsetTooltip;
    if( selections && selections.length === 1 && isWorkset( selections[0] ) ) {
        replayWorksetText.uiValue = resource.replayWorksetTooltip;
    }
};

/*
* Check if the element is Workset
* @param {Object} parentObj The parent element.
*/
export let isWorkset = function( parentObj ) {
    var isObjectWorkset = false;
    if( parentObj && parentObj.props && parentObj.props.awb0UnderlyingObject ) {
        var parentUnderlyingObj = cdmService.getObject( parentObj.props.awb0UnderlyingObject.dbValues[ 0 ] );
        if( parentUnderlyingObj && parentUnderlyingObj.modelType.typeHierarchyArray.indexOf( 'Fnd0WorksetRevision' ) > -1 ) {
            isObjectWorkset = true;
        }
    }
    return isObjectWorkset;
};

/**
 * Function to get the backing object  and
 * assign to the data  membEr topLine.
 * @param {Object} data
 */
 export let getBackingObject = function( data ) {
    var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    var modelObject = activeContext.modelObject;
    _getBomlineOfTopLine( modelObject ).then( function( response ) {
        data.topLine.dbValue = response;
    } );
};

/**
 * Async function to get the backing object's for input viewModelObject's.
 * viewModelObject's should be of type Awb0Element.
 * @param {Object} viewModelObjects - of type Awb0Element
 * @return {Promise} A Promise that will be resolved with the requested backing object's when the data is available.
 *
 */
let _getBomlineOfTopLine = function( modelObject ) {
    let deferred = AwPromiseService.instance.defer();
    _occmgmtBackingObjectProviderService.getBackingObjects( [ modelObject ] ).then( function( response ) {
        return deferred.resolve( response[0].uid );
    } );
    return deferred.promise;
};
/**
 * Function to find if we have opened an ace-indexed structure, discovery indexed or non-indexed.
 * NOTE:
 * Ace Indexed:
 * 1. When the pci has awb0AlternateConfiguration populated which has
 *  pci recipe ending with AWBIB [IB is for INDEXED BOM]
 *
 *Discovery indexed or Non-indexed:
 * case 1: [Partition scheme applied] When the pci has awb0AlternateConfiguration populated which has
 *  pci recipe ending with AWBCB [CB is for CLASSIC BOM]
 *case 2: Pci doesnt populate  awb0AlternateConfiguration

 * Based on that, we want to decide if to use unificationSoa(createOrUpdateSavedSession) or
 * go with CreateOrRelateSubmit soa.
 */
 export let isAceIndexedProduct = function() {
     var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
     if ( activeContext ) {
         var pci = activeContext.productContextInfo;
         if ( pci ) {
             if  ( pci.props.awb0AlternateConfiguration &&  pci.props.awb0AlternateConfiguration.dbValues[0] !== null && pci.props.awb0AlternateConfiguration.dbValues[0].endsWith( 'AWBIB' ) ) {
                 return true;
             }

             return false;
         }
     }
 };


/**
 * Function to get the mapValue based on the  viewModelProperty objects type.
 * @param {Object} viewModelProperty
 * @return {String}  The type of the property
 */
let getPropType = function( vmProp ) {
    var mapValue;
    if ( vmProp ) {
        switch ( vmProp.type ) {
            case 'BOOLEAN':
                mapValue = 'boolValues';
                break;
            case 'STRING':
                mapValue = 'stringValues';
                break;
            case 'INTEGER':
                mapValue = 'intValues';
                break;
        }
    }
    return mapValue;
};

/**
 * Function to populate compound input
 * @param {Object} vmProperty
 * @param {object}  createInputmap
 */
 let populateCompoundCreateInput = function( vmProp, compoundProperty, createInputMap, propType ) {
    var compoundObject = _.get( vmProp.intermediateCompoundObjects, compoundProperty[0] );
    var compoundCreateInputMap = {};
    compoundCreateInputMap[''] = {
        boName:compoundObject.modelType.owningType,
        propertyNameValues: {},
        compoundCreateInput: {}
    };
    var propertyName = {};
    _.set( propertyName, propType, _uwPropSrv.getValueStrings( vmProp ) );
        var compoundCreIn = compoundCreateInputMap[''];
        var propertyNameValues = compoundCreIn.propertyNameValues;
        _.set( propertyNameValues, [ compoundProperty[1] ], propertyName );
    var name = compoundProperty[0];
    createInputMap[''].compoundCreateInput[name] = [ compoundCreateInputMap[''] ];
};


/**
 * Function to create input for the createAndUpdateSavedSession soa.
 *
 * @param {Object} data
 * @return {object} created input
 *
 */
export let createInputForCreateAndUpdateSavedSessionSOA = function( data ) {
    var createInputMap = {};
    createInputMap[''] = {
        boName: data.objCreateInfo.createType,
        propertyNameValues: {},
        compoundCreateInput: {}
    };
    //Create property name values
    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );
        if ( vmProp && ( vmProp.isAutoAssignable || _uwPropSrv.isModified( vmProp ) ) ) {
            var propType = getPropType( vmProp );
            //Check if the vmProp is a compound property
            var compoundProperty = propName.split( '__' );
            if( compoundProperty.length > 1 ) {
                populateCompoundCreateInput( vmProp, compoundProperty, createInputMap, propType );
            } else {
               var value = [];
                if ( vmProp.type === 'BOOLEAN' ) {
                    value.push( vmProp.dbValue );
                } else {
                    value = _uwPropSrv.getValueStrings( vmProp );
                }

                if ( value !== undefined ) {
                    var propertyName = {};
                    _.set( propertyName, propType, value );
                    var createInput = createInputMap[''];
                    if ( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, [ propName ], propertyName );
                    }
                }
            }
        }
    } );

    //Create propertyNameValues for the customPanelProperty
    _.forEach( data.customPanelInfo, function( customPanelVMData ) {
        // copy custom panel's properties
        var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
        _.forEach( oriVMData, function( propVal, propName ) {
            if ( _.has( customPanelVMData, propName ) ) {
                var vmProp = customPanelVMData[propName];
                var propType = getPropType( vmProp );
                var value = [];
                if ( vmProp.type === 'BOOLEAN' ) {
                    value.push( vmProp.dbValue );
                } else {
                    value = _uwPropSrv.getValueStrings( vmProp );
                }

                if ( value !== undefined ) {
                    var propertyName = {};
                    _.set( propertyName, propType, value );

                    var createInput = createInputMap[''];
                    if ( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, [ propName ], propertyName );
                    }
                }
            }
        } );
    } );

    //Populate product and configs
    var productAndConfigsToCreate = {
        structureRecipe: {
            structureContextIdentifier: {
                product: {
                    uid: data.topLine.dbValue
                }
            }
        }
    };
    var sessionToCreateOrUpdate = {
        objectToCreate: {
            creInp: _.get( createInputMap, '' )
        }
    };
    return [ {
        clientId: 'CreateObject',
        sessionToCreateOrUpdate: sessionToCreateOrUpdate,
        productAndConfigsToCreate: [ productAndConfigsToCreate ]

    } ];
};


export default exports = {
    validateWorkingContext,
    updateCtxWithTopNodeHierarchy,
    updateElementToPCIMapOnAddSubset,
    setDefaultSelectionForWorksetReplay,
    setWorksetReplayToolTip,
    createInputForCreateAndUpdateSavedSessionSOA,
    getBackingObject,
    isWorkset,
    isAceIndexedProduct,
    postRemoveSubsetFromWorkset
};
app.factory( 'createWorksetService', () => exports );
