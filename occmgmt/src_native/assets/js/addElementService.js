//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/addElementService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import ClipboardService from 'js/clipboardService';
import cdm from 'soa/kernel/clientDataModel';
import occurrenceManagementStateHandler from 'js/occurrenceManagementStateHandler';
import occmgmtUtils from 'js/occmgmtUtils';
import evaluateExpressionInGivenContext from 'js/evaluateExpressionInGivenContext';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import navigationUtils from 'js/navigationUtils';

var exports = {};

export let getDisplayMode = function() {
    var viewModeInfo = appCtxService.ctx.ViewModeContext;
    if( viewModeInfo.ViewModeContext === 'ListView' || viewModeInfo.ViewModeContext === 'ListSummaryView' ) {
        return 'List';
    }
    return 'Tree'; //Server expects 'Tree' in case of Table mode as well.
};

export let getExpandedValue = function() {
    var parent = appCtxService.ctx.aceActiveContext.context.addElementInput.parentElement;
    var vmc = appCtxService.ctx.aceActiveContext.context.vmc;
    if( parent && vmc ) {
            var parentIdx = _.findLastIndex( vmc.loadedVMObjects, function( vmo ) {
                return vmo.uid === parent.uid;
            } );
            if( parentIdx > -1 ) {
                var parentVMO = vmc.getViewModelObject( parentIdx );
                if ( parentVMO.isExpanded ) {
                    return 'true';
                }
            }
        }
    return 'false';
};

export let getSeperateQuantityAndPrepareAddInput = function() {
    exports.updateCtxForAceAddSiblingPanel();
    appCtxService.ctx.aceActiveContext.context.addElement = appCtxService.ctx.aceActiveContext.context.addElementInput;
    if( occmgmtUtils.isTreeView() ) {
        appCtxService.ctx.aceActiveContext.context.addElement.fetchPagedOccurrences = true;
    }
    appCtxService.ctx.aceActiveContext.context.addElement.seperateQuantity = appCtxService.ctx.selected.props.awb0Quantity.dbValues[ 0 ] - 1;
    appCtxService.ctx.aceActiveContext.context.addElement.parent = appCtxService.ctx.aceActiveContext.context.addElementInput.parentElement;
};

/**
 * set the variablity for Add child Panel
 */
export let setCtxAddElementInputParentElementToSelectedElement = function( parent, parentForAllowedTypes ) {
    var addElementInput = {};

    addElementInput.parentElement = viewModelObjectService
        .createViewModelObject( parent ? parent.uid : appCtxService.ctx.selected.uid );

    addElementInput.parentToLoadAllowedTypes = viewModelObjectService
        .createViewModelObject( parentForAllowedTypes ? parentForAllowedTypes.uid : appCtxService.ctx.selected.uid );

    appCtxService.ctx.aceActiveContext = appCtxService.ctx.aceActiveContext || {
        context: {}
    };
    appCtxService.ctx.aceActiveContext.context.addElementInput = addElementInput;
};

/**
 * set the variablity for Add sibling Panel
 */
export let updateCtxForAceAddSiblingPanel = function() {
    var addElementInput = {};
    addElementInput.parentElement = viewModelObjectService
        .createViewModelObject( appCtxService.ctx.selected.props.awb0Parent.dbValues[ 0 ] );
    addElementInput.siblingElement = appCtxService.ctx.selected;
    // For adding a sibling, make sure that the parent for allowed types is populated properly.
    // In case of adding a sibling the parent is being calculated properly above and we need to set that here as well.
    addElementInput.parentToLoadAllowedTypes = addElementInput.parentElement;
    appCtxService.ctx.aceActiveContext = appCtxService.ctx.aceActiveContext || {
        context: {}
    };
    appCtxService.ctx.aceActiveContext.context.addElementInput = addElementInput;
};

var saveCurrentSelectionUidToCheckSelectionChange = function( addElement ) {
    addElement.previousSelectionUid = appCtxService.ctx.selected.uid;
};

/**
 * Process input passed by consumer to the add element
 */
export let processAddElementInput = function() {
    var activeContext = appCtxService.ctx.aceActiveContext.context || {};
    var addElementInput = activeContext.addElementInput || {};
    var addElement = {};

    // set default values
    saveCurrentSelectionUidToCheckSelectionChange( addElement );
    addElement.parent = appCtxService.ctx.selected;
    addElement.parentToLoadAllowedTypes = appCtxService.ctx.selected;
    addElement.reqPref = exports.populateRequestPref();
    addElement.siblingElement = {};
    addElement.isCopyButtonEnabled = !occurrenceManagementStateHandler
        .isFeatureSupported( 'HideAddCopyButtonFeature_32' );
    addElement.operationType = 'Union';
    if( occmgmtUtils.isTreeView() ) {
        addElement.fetchPagedOccurrences = true;
    }

    // process custom input or extension values
    _.forEach( addElementInput, function( value, key ) {
        switch ( key ) {
            case 'parentElement':
                addElement.parent = value;
                break;
            case 'siblingElement':
                addElement.siblingElement = value;
                break;
            case 'parentToLoadAllowedTypes':
                addElement.parentToLoadAllowedTypes = value;
                break;
            case 'isCopyButtonEnabled':
                addElement.isCopyButtonEnabled = addElement.isCopyButtonEnabled && value;
                break;
            case 'addObjectIntent':
                addElement.addObjectIntent = value;
                break;
            case 'fetchPagedOccurrences':
                addElement.fetchPagedOccurrences = value;
                break;
            default:
                break;
        }
    } );

    // set the addElement
    appCtxService.ctx.aceActiveContext.context.addElement = addElement;

    eventBus.publish( 'addElement.getInfoForAddElementAction' );
};

/**
 * Returns reqPref
 */
export let populateRequestPref = function() {
    var stateSvc = navigationUtils.getState();
    var toParams = {};

    if( stateSvc.params.fd ) {
        toParams.fd = [ stateSvc.params.fd ];
    }

    toParams.restoreAutoSavedSession = [ 'true' ];

    toParams.useGlobalRevRule = [ 'false' ];
    if( stateSvc.params.useGlobalRevRule ) {
        toParams.useGlobalRevRule[ 0 ] = stateSvc.params.useGlobalRevRule;
    }

    if( stateSvc.params.usepinx ) {
        toParams.useProductIndex = [ stateSvc.params.usepinx ];
    }

    toParams.calculateFilters = [ 'false' ];
    if( stateSvc.params.isfilterModified ) {
        toParams.calculateFilters[ 0 ] = 'true';
    }

    if( stateSvc.params.customVariantRule ) {
        toParams.customVariantRule = [ stateSvc.params.customVariantRule ];
    }
    _.forEach( appCtxService.ctx.aceActiveContext.context.persistentRequestPref, function( value, name ) {
        if( !_.isUndefined( value ) ) {
            toParams[ name ] = [ value.toString() ];
        }
    } );
    return toParams;
};

/**
 * Returns elements to be added either newly created or elements selected from Palette and Search tabs
 */
export let getElementsToAdd = function( data ) {
    if( Array.isArray( data.createdObject ) ) {
        return data.createdObject;
    }

    // check if created a new object ? if yes, create an array, insert this newly created element in it and return
    if( data.createdObject ) {
        var objects = [];
        objects.push( data.createdObject );
        return objects;
    }
    // return all selected element from palette and search tabs
    return data.sourceObjects;
};

/**
 * Returns elements to be replaced either newly created or element selected from Palette and Search tabs
 */
 export let getElementToReplace = function( newElement ) {
    return newElement && newElement.uid && newElement.uid !== 'AAAAAAAAAAAAAA' ? newElement : appCtxService.ctx.selected;
};
/**
 * Returns elements to be replaced either newly created or element selected from Palette and Search tabs
 */
export let getReplacement = function( data ) {
    var result = exports.getElementsToAdd( data );
    if( result && result.length === 1 ) {
        return result[ 0 ];
    }
};
// Resets number of elements value to 1
export let resetNumberOfElements = function( data ) {
    if( data ) {
        data.dbValue = 1;
    }
    return;
};

export let setUnderlyingObjectsOfSourceObjectsAndReturn = function( data ) {
    var underlyingObjects = [];
    for( var i in data.sourceObjects ) {
        if( data.sourceObjects[ i ].modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
            var obj = cdm.getObject( data.sourceObjects[ i ].props.awb0UnderlyingObject.dbValues[ 0 ] );
            if( obj ) {
                underlyingObjects.push( obj );
            }
        } else {
            underlyingObjects.push( data.sourceObjects[ i ] );
        }
    }
    data.underlyingObjects = underlyingObjects;
    return underlyingObjects;
};

/**
 * This will create input for Save As Soa while creating copy of existing object
 *
 * @data data
 */
export let createSaveAsInput = function( data ) {
    var saveAsInput = [];
    var relateInfo = [];

    if( data.underlyingObjects ) {
        for( var index in data.underlyingObjects ) {
            var targetObject = data.underlyingObjects[ index ];

            var a;
            for( var b in data.deepCopyInfoMap[ 0 ] ) {
                if( data.deepCopyInfoMap[ 0 ][ b ].uid === targetObject.uid ) {
                    a = b;
                    break;
                }
            }
            var deepCopyInfoMap = data.deepCopyInfoMap[ 1 ][ a ];
            processDeepCopyDataArray( deepCopyInfoMap );

            var input = {
                targetObject: targetObject,
                saveAsInput: {},
                deepCopyDatas: deepCopyInfoMap
            };
            fillPropertiesInSaveAsInput( input.saveAsInput, targetObject );
            saveAsInput.push( input );
            relateInfo.push( {
                relate: true
            } );
        }
    }

    data.saveAs = {
        relateInfo: relateInfo,
        saveAsInput: saveAsInput
    };

    eventBus.publish( 'addElement.saveAsInputCreated' );
};

/**
 * Process deep copy data array
 */
function processDeepCopyDataArray( deepCopyDataArray ) {
    for( var index = 0; index < deepCopyDataArray.length; index++ ) {
        var deepCopyData = deepCopyDataArray[ index ];
        deepCopyData.saveAsInput = {};

        var attachedObjectdVmo = viewModelObjectService
            .createViewModelObject( deepCopyData.attachedObject.uid );
        fillPropertiesInSaveAsInput( deepCopyData.saveAsInput, attachedObjectdVmo );

        delete deepCopyData.attachedObject.className;
        delete deepCopyData.attachedObject.objectID;

        var childDeepCopyDataArray = deepCopyData.childDeepCopyData;
        if( childDeepCopyDataArray ) {
            processDeepCopyDataArray( childDeepCopyDataArray );
        }
    }
}

/**
 * Fill properties in SaveAsInput object
 */
function fillPropertiesInSaveAsInput( saveAsInput, targetObject ) {
    saveAsInput.boName = targetObject.type;
    var propertiesToInclude = [ 'item_revision_id', 'object_desc' ];
    saveAsInput.stringProps = saveAsInput.stringProps || {};
    for( var property in propertiesToInclude ) {
        var propName = propertiesToInclude[ property ];
        if( targetObject.props[ propName ] && targetObject.props[ propName ].dbValues[ 0 ] ) {
            saveAsInput.stringProps[ propName ] = targetObject.props[ propName ].dbValues[ 0 ];
        }
    }
}

export let getNewlyAddedChildElements = function( data ) {
    // Collect the children for selected input parent.
    var newChildElements = [];

    if( data.addElementResponse.selectedNewElementInfo.newElements ) {
        for( var i = 0; i < data.addElementResponse.selectedNewElementInfo.newElements.length; ++i ) {
            newChildElements.push( data.addElementResponse.selectedNewElementInfo.newElements[ i ] );
        }
    }

    // if the element is already present in newChildElements don't add it.
    var selectednewInfosize = newChildElements.length;
    var vmc = appCtxService.ctx.aceActiveContext.context.vmc;
    if( vmc ) {
        // Collect the children for other reused parent instances
        for( var j = 0; j < data.addElementResponse.newElementInfos.length; j++ ) {
            var newElementInfo = data.addElementResponse.newElementInfos[j];
            var parentIdx = _.findLastIndex( vmc.loadedVMObjects, function( vmo ) {
                return vmo.uid === newElementInfo.parentElement.uid;
            } );

            var parentVMO = vmc.getViewModelObject( parentIdx );

            // If parent is expanded then only add the children
            if( parentVMO && parentVMO.isExpanded ) {
               _.forEach( newElementInfo.newElements, function( newElement ) {
                var found = 0;
                    for( var k = 0; k < selectednewInfosize; k++ ) {
                        found = 0;
                        if( newChildElements[k].uid === newElement.occurrenceId ) {
                            found = 1;
                            break;
                        }
                    }
                    if ( found === 0 ) {
                        newChildElements.push( newElement );
                    }
                } );
            }
        }
    }
    return newChildElements;
};

export let getTotalNumberOfChildrenAdded = function( data ) {
    var totalNewElementsAdded = 0;

    // First get the count of all the new children for input parent.
    if( data.selectedNewElementInfo.newElements ) {
        totalNewElementsAdded = data.selectedNewElementInfo.newElements.length;
    } else {
        // Get children count from other parent instances
        _.forEach( data.newElementInfos, function( newElementInfo ) {
            if( newElementInfo.newElements ) {
                totalNewElementsAdded += newElementInfo.newElements.length;
            }
        } );
    }
    return totalNewElementsAdded;
};

export let getAddToBookMarkInput = function( data ) {
    // New object add case
    if( data.createdObject ) {
        return {
            bookmark: {
                type: data.targetObjectToAdd.type,
                uid: data.targetObjectToAdd.uid
            },
            columnConfigInput: {
                clientName: '',
                fetchColumnConfig: true,
                hostingClientName: '',
                operationType: 'Union'
            },
            productsToBeAdded: [ {
                type: data.createdObject.type,
                uid: data.createdObject.uid
            } ]
        };
    } // Add one or more from palette/search
    return {
        bookmark: {
            type: data.targetObjectToAdd.type,
            uid: data.targetObjectToAdd.uid
        },
        productsToBeAdded: data.sourceObjects
    };
};

export let getNewlyAddedSwcProductInfo = function( data ) {
    return data.addToBookMarkResponse.addedProductsInfo[ data.addToBookMarkResponse.addedProductsInfo.length - 1 ];
};

export let getNewlyAddedSwcChildElements = function( data ) {
    return data.addToBookMarkResponse.addedProductsInfo.map( function( productInfo ) {
        return productInfo.rootElement;
    } );
};

/**
 * Extract allowed types from the response and return
 */
export let extractAllowedTypesInfoFromResponse = function( response ) {
    var populateAllowedTypes = {};
    var searchableTypesCount = 0;

    //Evaluate Object types for New Tab
    populateAllowedTypes.objectTypeName = response.allowedTypeInfos.filter( function( x ) {
        if( x.objectTypeName ) {
            return true;
        }
        return false;
    } ).map( function( x ) {
        return x.objectTypeName;
    } ).join();

    // Evaluate Object types for Pallet/Search Tab
    populateAllowedTypes.searchTypeName = response.allowedTypeInfos.filter( function( x ) {
        if( x.isSearchable ) {
            searchableTypesCount++;
        }
        if( x.searchTypeName ) {
            return true;
        }
        return false;
    } ).map( function( x ) {
        return x.searchTypeName;
    } ).join();

    if( response.preferredExists && response.preferredTypeInfo ) {
        populateAllowedTypes.preferredType = response.preferredTypeInfo.objectTypeName;
    }

    var allowedClipboardObjectTypes = getAllowedClipboardObjectTypes( populateAllowedTypes.searchTypeName );

    // update visible tabs depending on types
    populateAllowedTypes.allowedTabs = tabsToShowInAddPanel( populateAllowedTypes, searchableTypesCount,
        allowedClipboardObjectTypes );

    // we need allowedClipboardObjectTypes for palette.
    // searchTypeNames are used for both palette and search tabs
    // hence append allowedClipboardObjectTypes to the received searchTypeNames,
    if( allowedClipboardObjectTypes.length > 0 ) {
        populateAllowedTypes.searchTypeName = populateAllowedTypes.searchTypeName + ',' +
            allowedClipboardObjectTypes.join( ',' );
    }

    return populateAllowedTypes;
};

/**
 * @searchTypeName comma separated all allowed and searchable types
 * @returns array of Awb0Element types out of clipboard objects whose underlying object types are specified in
 *          searchable types
 */
function getAllowedClipboardObjectTypes( searchTypeName ) {
    var allowedClipboardObjectTypes = [];
    var clipboardObjects = ClipboardService.instance.getCachableObjects();
    if( clipboardObjects.length > 0 ) {
        for( var i in clipboardObjects ) {
            if( clipboardObjects[ i ].modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                var elementObject = clipboardObjects[ i ];
                if( elementObject.props.awb0UnderlyingObject &&
                    elementObject.props.awb0UnderlyingObject.dbValues[ 0 ] ) {
                    var underlyingObject = cdm
                        .getObject( elementObject.props.awb0UnderlyingObject.dbValues[ 0 ] );
                    if( searchTypeName.split( ',' ).includes( underlyingObject.type ) ) {
                        allowedClipboardObjectTypes.push( elementObject.type );
                    }
                }
            }
        }
    }
    return allowedClipboardObjectTypes;
}

/**
 * process which tabs to be shown on add element panel
 */
function tabsToShowInAddPanel( populateAllowedTypes, searchableTypesCount, allowedClipboardObjectTypes ) {
    var tabs = [];
    if( populateAllowedTypes.objectTypeName.length > 0 ) {
        tabs.push( 'new' );
    }
    if( populateAllowedTypes.searchTypeName.length > 0 || allowedClipboardObjectTypes.length > 0 ) {
        tabs.push( 'palette' );
    }
    if( searchableTypesCount > 0 ) {
        tabs.push( 'search' );
    }
    return tabs.join();
}

export let clearCreatedElementField = function( data ) {
    if( data.createdObject ) {
        delete data.createdObject;
    }
};


/**
 * initializePanelProperties
 * @function initializePanelProperties
 * @param {Object}data - the view model data
 */
export let initializePanelProperties = function( data ) {
    if( data.vmo ) {
        _.forEach( data.vmo.props, function( prop ) {
            var propName = prop.propertyName;
            var propDisplayName = prop.propertyDisplayName;
            if( propName && propDisplayName && prop.dbValue !== 'undefined' && prop.dbValue !== null ) {
                if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                    prop.dbValue = [];
                } else {
                    prop.dbValue = null;
                }
                prop.dbValues = [];
                prop.displayValues = [ '' ];
                prop.uiValue = '';
                prop.uiValues = [ '' ];
                prop.value = null;
            }
        } );
    }
    if( data.numberOfOccurrences ) {
        data.numberOfOccurrences.dbValue = 1;
    }
};

export let getPciForParentSelection = function( object ) {
    if( object ) {
        return cdm.getObject( occmgmtUtils.getProductContextForProvidedObject( object ) );
    }
    return appCtxService.ctx.aceActiveContext.context.productContextInfo;
};

/**
 * Add Element service
 */

export default exports = {
    getDisplayMode,
    getSeperateQuantityAndPrepareAddInput,
    setCtxAddElementInputParentElementToSelectedElement,
    updateCtxForAceAddSiblingPanel,
    processAddElementInput,
    populateRequestPref,
    getElementsToAdd,
    getReplacement,
    getElementToReplace,
    resetNumberOfElements,
    setUnderlyingObjectsOfSourceObjectsAndReturn,
    createSaveAsInput,
    getNewlyAddedChildElements,
    getTotalNumberOfChildrenAdded,
    getAddToBookMarkInput,
    getNewlyAddedSwcProductInfo,
    getNewlyAddedSwcChildElements,
    extractAllowedTypesInfoFromResponse,
    clearCreatedElementField,
    initializePanelProperties,
    getPciForParentSelection,
    getExpandedValue
};
app.factory( 'addElementService', () => exports );
