// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/occmgmtRequestPrefPopulatorService
 */
import app from 'app';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import _ from 'lodash';
import localStorage from 'js/localStorage';
import declUtils from 'js/declUtils';

var _LS_TOPIC_INDEX_OFF_LIST = 'awAwbIndexOffList';
var _TRUE = [ 'true' ];
var _FALSE = [ 'false' ];
const PRODUCTS_OPENED_IN_SPLITVIEW_UIDS = 'productsOpenedInSplitView';

var IModelObject = function( uid, type ) {
    this.uid = uid;
    this.type = type;
};

var _getObject = function( uid ) {
    if( clientDataModelSvc.isValidObjectUid( uid ) ) {
        var obj = clientDataModelSvc.getObject( uid );

        if( !obj ) {
            return new IModelObject( uid, 'unknownType' );
        }

        return obj;
    }

    return new IModelObject( clientDataModelSvc.NULL_UID, 'unknownType' );
};
var exports = {};

export let populateExpansionCriteriaParameters = function( expansionCriteria, currentContext ) {
    if( currentContext.expansionCriteria ) {
        if( currentContext.expansionCriteria.expandBelow ) {
            expansionCriteria.expandBelow = currentContext.expansionCriteria.expandBelow.toString() === 'true';
            delete currentContext.expansionCriteria.expandBelow;
        }
        if( currentContext.expansionCriteria.loadTreeHierarchyThreshold ) {
            expansionCriteria.loadTreeHierarchyThreshold = parseInt( currentContext.expansionCriteria.loadTreeHierarchyThreshold, 10 );
            delete currentContext.expansionCriteria.loadTreeHierarchyThreshold;
        }
        if( currentContext.expansionCriteria.scopeForExpandBelow ) {
            expansionCriteria.scopeForExpandBelow = currentContext.expansionCriteria.scopeForExpandBelow;
            delete currentContext.expansionCriteria.scopeForExpandBelow;
        }
        if( currentContext.expansionCriteria.levelsToExpand ) {
            expansionCriteria.levelNExpand = parseInt( currentContext.expansionCriteria.levelsToExpand, 10 );
            delete currentContext.expansionCriteria.levelsToExpand;
        }
    }
};
export let populateRequestPrefParameters = function( requestPref, loadInput, currentContext, config ) {
    requestPref.displayMode = [ loadInput.displayMode ];

    if( !_.isEmpty( loadInput.sortCriteria ) ) {
        requestPref.propertyName = [ loadInput.sortCriteria[ 0 ].fieldName ];
        requestPref.sortDirection = [ loadInput.sortCriteria[ 0 ].sortDirection ];
    }

    if ( !_.isEmpty( loadInput.openOrUrlRefreshCase ) && loadInput.openOrUrlRefreshCase === 'urlRefresh' ) {
        requestPref.refresh = [ 'true' ];
    }

    if( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) {
        requestPref.splitMode = _TRUE;
        if( !_.isUndefined( currentContext.transientRequestPref.userGesture ) ) {
            requestPref.createWindow = _TRUE;
        }
        if( clientDataModelSvc.isValidObjectUid( config.productContext.uid ) &&
        !_.isUndefined( config.productContext.props ) &&
        !_.isUndefined( config.productContext.props.awb0FilterCount ) &&
        config.productContext.props.awb0FilterCount.dbValues[ 0 ] > 0 ) {
            currentContext.transientRequestPref.startFreshNavigation = true;
        }
    }

    // If the current structure has ACE filters applied then we need to create new window upon configuration change
    if( currentContext.previousFilterValue && currentContext.previousFilterValue.length > 0 ) {
        requestPref.createWindow = _TRUE;
    }
    currentContext.previousFilterValue = AwStateService.instance.params.filter;

    //TODO find a better way to handle the Unassigned server call

     if( appCtxService.ctx.splitView && appCtxService.ctx.requestPref.unassignedMode === true && currentContext.urlParams.rootQueryParamKey === 'uid2' ) {
            requestPref.unassignedMode = _TRUE;
            currentContext.transientRequestPref.startFreshNavigation = true;
     }


    var viewMode = appCtxService.ctx.ViewModeContext;
    var inNonTreeDisplayMode = viewMode && viewMode.ViewModeContext !== 'TreeView' &&
        viewMode.ViewModeContext !== 'TreeSummaryView';
    _.forEach( currentContext.persistentRequestPref, function( value, name ) {
        if( !_.isUndefined( value ) ) {
            requestPref[ name ] = [ value.toString() ];
        }
    } );

    if( currentContext.expansionCriteria ) {
        if( currentContext.expansionCriteria.expandBelow ) {
            requestPref.expandBelow = [ currentContext.expansionCriteria.expandBelow ];
        }

        if( currentContext.expansionCriteria.levelsToExpand ) {
            requestPref.levelsToExpand = [ currentContext.expansionCriteria.levelsToExpand ];
        }
        if( currentContext.expansionCriteria.loadTreeHierarchyThreshold ) {
            requestPref.loadTreeHierarchyThreshold = [ currentContext.expansionCriteria.loadTreeHierarchyThreshold ];
        }

        if( currentContext.expansionCriteria.scopeForExpandBelow ) {
            requestPref.scopeForExpandBelow = [ currentContext.expansionCriteria.scopeForExpandBelow ];
        }
    }
    if( currentContext.requestPref ) {
        if( currentContext.requestPref.expandedNodes ) {
            requestPref.expandedNodes = currentContext.requestPref.expandedNodes;
        }

        if( currentContext.requestPref.savedSessionMode ) {
            requestPref.savedSessionMode = [ currentContext.requestPref.savedSessionMode ];
        }

        if( currentContext.requestPref.dataFilterMode ) {
            requestPref.dataFilterMode = [ currentContext.requestPref.dataFilterMode ];
        }
        if( currentContext.requestPref.openWPMode ) {
            requestPref.openWPMode = [ currentContext.requestPref.openWPMode ];
        }

        if( currentContext.requestPref.showChange ) {
            requestPref.showChange = currentContext.requestPref.showChange;
        }

        requestPref.calculateFilters = currentContext.requestPref.calculateFilters === true ? _TRUE : _FALSE;

        //TODO : This may not be required once ACE has generic logic to pass all request preference parameters from appContext to SOA input
        if( currentContext.requestPref.configBasedOnSel ) {
            requestPref.configBasedOnSel = [ currentContext.requestPref.configBasedOnSel ];
            requestPref.currentSelections = currentContext.pwaSelectionModel.getSelection();
            requestPref.userGesture = [ 'VARIANT_RULE_CHANGE' ];
        }

        if( ( !appCtxService.ctx.variantRule || !appCtxService.ctx.variantRule.changeRule ) &&
            currentContext.configContext !== undefined && currentContext.configContext.r_uid !== undefined &&
            currentContext.supportedFeatures && currentContext.supportedFeatures.Awb0ConfiguredByProximity ) {
            requestPref.configByProximityTarget = _TRUE;
        }

        if( currentContext.requestPref.configByProximityTarget ) {
            requestPref.configByProximityTarget = [ currentContext.requestPref.configByProximityTarget ];
            requestPref.startFreshNavigation = _TRUE;
        }

        if( currentContext.requestPref.useProductIndex !== undefined ) {
            requestPref.useProductIndex = currentContext.requestPref.useProductIndex === true ? _TRUE : _FALSE;
        }

        if( currentContext.requestPref.replayRecipe ) {
            requestPref.replayRecipe = [ currentContext.requestPref.replayRecipe ];
            requestPref.currentSelections = currentContext.pwaSelectionModel.getSelection();
        }

        if( currentContext.requestPref.customVariantRule ) {
            requestPref.customVariantRule = _TRUE;
        }

        if( currentContext.requestPref.unsetSourceContext ) {
            requestPref.unsetSourceContext = _TRUE;
        }

        // If quick search strings are present, then populate same in requestPref
        if( currentContext.requestPref.categorysearchcriteria ) {
            requestPref.categorySearchCriteria = [ currentContext.requestPref.categorysearchcriteria ];
        }

        if( currentContext.requestPref.unsetPartitionScheme ) {
            requestPref.unsetPartitionScheme = _TRUE;
        }

        if( currentContext.requestPref.showUntracedParts ) {
            requestPref.showUntracedParts = [ currentContext.requestPref.showUntracedParts ];
        }

        if( currentContext.requestPref.addUpdatedFocusOccurrence ) {
            requestPref.addUpdatedFocusOccurrence = _TRUE;
        }

        if( currentContext.requestPref.filterOrRecipeChange ) {
            requestPref.filterOrRecipeChange = _TRUE;
        }

        if( currentContext.requestPref.updateRecipeOnly ) {
            requestPref.updateRecipeOnly = [ 'true', currentContext.requestPref.updateRecipeOnly ];
        }

        if( currentContext.requestPref.updateConfigurationOnly ) {
            requestPref.updateConfigurationOnly = [ 'true', currentContext.requestPref.updateConfigurationOnly ];
        }
    }

    //View information identified in three different ways
    //1. User changes view from configuration panel - pass the new view information in request preference.
    //2. User once changed View and doing drill down, filter use case - pass the view information available in PCI property
    //3. User changes role - pass view with empty string so that view information extracted from TC preference
    //Client propcessing will be simplified via tech dept story B-47954
    if( currentContext.requestPref && currentContext.requestPref.viewType ) { //pass new view information
        requestPref.viewType = [ currentContext.requestPref.viewType ];
    } else if( clientDataModelSvc.isValidObjectUid( currentContext.currentState.pci_uid ) ) { //Pass exisitng view information in all follow-up request
        var pci = _getObject( currentContext.currentState.pci_uid );
        if( pci.props && pci.props.fgf0ViewList ) {
            if( pci.props.fgf0ViewList.dbValues.length > 0 ) {
                requestPref.viewType = [ pci.props.fgf0ViewList.dbValues[ 0 ] ];
            }
        } else {
            requestPref.viewType = [ '' ]; //pass view as empty string so that view is picked from the preference.
        }
    } else {
        requestPref.viewType = [ '' ]; //pass view as empty string so that view is picked from the preference.
    }

    var contextDataParams = appCtxService.getCtx( 'contextData' );
    if( contextDataParams ) {
        requestPref.componentID = [ contextDataParams.componentID ];
    }

    if( currentContext.configContext ) {
        requestPref.useGlobalRevRule = currentContext.configContext.useGlobalRevRule === true ? _TRUE : _FALSE;

        if( currentContext.configContext.useProductIndex !== undefined ) {
            requestPref.useProductIndex = currentContext.configContext.useProductIndex === true ? _TRUE : _FALSE;
        }

        if( currentContext.configContext.packSimilarElements !== undefined ) {
            requestPref.packSimilarElements = currentContext.configContext.packSimilarElements === true ? _TRUE :
                _FALSE;
            // For pack/unpack use case we want updated PCI (index off) back from server
            // If it is already non-indexed product this does not matter,
            // but if it is indexed product used in non-index mode then we want to update our local storage with changed pci
            requestPref.useProductIndex = _FALSE;
        }
        if( currentContext.configContext.isAppliedFromVCV ) {
            requestPref.userGesture = [ 'VARIANT_RULE_CHANGE' ];
        }
    }

    if( currentContext.requestPref && !_.isEmpty( currentContext.requestPref.showMarkup ) ) {
        requestPref.showMarkup = currentContext.requestPref.showMarkup;
        requestPref.useProductIndex = _FALSE;
    } else if( currentContext.isMarkupEnabled !== undefined ) {
        requestPref.showMarkup = currentContext.isMarkupEnabled === true ? _TRUE : _FALSE;
    }

    if( !_.isUndefined( currentContext.isChangeEnabled ) ) {
        requestPref.showChange = currentContext.isChangeEnabled === true ? _TRUE : _FALSE;
    } else if( !_.isUndefined( appCtxService.getCtx( 'showChange' ) ) ) {
        requestPref.showChange = appCtxService.getCtx( 'showChange' ) === true ? _TRUE : _FALSE;
    }

    var indexOffStr = localStorage.get( _LS_TOPIC_INDEX_OFF_LIST );

    if( indexOffStr ) {
        if( config && config.productContext && clientDataModelSvc.isValidObjectUid( config.productContext.uid ) ) {
            var indexOffProductList;
            indexOffProductList = JSON.parse( indexOffStr );
            requestPref.ignoreIndexForPCIs = indexOffProductList;
        } else {
            //Index off list is present in local storage but we are opening new object
            //Cleanup stale index off list from local storage and do not send it in request
            localStorage.removeItem( _LS_TOPIC_INDEX_OFF_LIST );
        }
    }

    var productOpenedInSplitViewUids = JSON.parse( sessionStorage.getItem( PRODUCTS_OPENED_IN_SPLITVIEW_UIDS ) );

    if( currentContext.startFreshNavigation ) {
        requestPref.startFreshNavigation = currentContext.startFreshNavigation === true ? _TRUE :
            _FALSE;
    } else if( currentContext.configContext ) {
        requestPref.startFreshNavigation = currentContext.configContext.startFreshNavigation === true ? _TRUE :
            _FALSE;
    } else if( loadInput.openOrUrlRefreshCase === 'backButton' && !appCtxService.ctx.splitView &&
            productOpenedInSplitViewUids !== null && productOpenedInSplitViewUids.includes( currentContext.currentState.uid ) ) {
        requestPref.startFreshNavigation = _TRUE;
        sessionStorage.removeItem( PRODUCTS_OPENED_IN_SPLITVIEW_UIDS );
    } else if( ( loadInput.openOrUrlRefreshCase === 'open' || loadInput.openOrUrlRefreshCase === 'backButton' )
                 && loadInput.isProductInteracted &&  appCtxService.ctx.swcCreatedObjectUid !== currentContext.currentState.uid  ) {
        requestPref.startFreshNavigation = _FALSE;
        appCtxService.ctx.swcCreatedObjectUid = undefined;
    } else {
        requestPref.startFreshNavigation = currentContext.startFreshNavigation === false ? _FALSE : _TRUE;
    }

    if( !_.isUndefined( currentContext.showInEffectiveOcc ) && _.isEqual( requestPref.startFreshNavigation[ 0 ], 'true' ) ) {
        requestPref.PSEShowUnconfigdEffPref = currentContext.showInEffectiveOcc === true ? _TRUE : _FALSE;
    }

    if( !_.isUndefined( currentContext.showVariantsInOcc ) && _.isEqual( requestPref.startFreshNavigation[ 0 ], 'true' ) ) {
        requestPref.PSEShowUnconfigdVarPref = currentContext.showVariantsInOcc === true ? _TRUE : _FALSE;
    }

    if( !_.isUndefined( currentContext.showSuppressedOcc ) && _.isEqual( requestPref.startFreshNavigation[ 0 ], 'true' ) ) {
        requestPref.PSEShowSuppressedOccsPref = currentContext.showSuppressedOcc === true ? _TRUE : _FALSE;
    }

    if( currentContext.recipe && currentContext.recipeOperator && currentContext.recipe.length > 0 ) {
        requestPref.filterCriteriaOperatorType = [ currentContext.recipeOperator ];
    }

    //set this req pref to true only if the subset panel is currently active, false otherwise.
    if( currentContext.subsetPanelEnabled === true ) {
        requestPref.populateFilters = _TRUE;
        requestPref.attributeCategoryPageSize = [ '100' ];
    }

    // Set this request pref to true as the recipe from the client has been updated
    // and server has no economical way to tell.
    if( currentContext.updatedRecipe ) {
        requestPref.recipeUpdated = _TRUE;
    }

    /**
     * Determine loading direction.
     */
    if( !declUtils.isNil( loadInput.addAfter ) && !loadInput.addAfter ) {
        requestPref.goForward = _FALSE;
    }

    // Override the default requestPref value with transientRequestPref value.
    _.forEach( currentContext.transientRequestPref, function( value, name ) {
        if( !_.isUndefined( value ) ) {
            requestPref[ name ] = [ value.toString() ];
        }
    } );

    // Populate default client scope uri request preference.
    if( currentContext.sublocation && currentContext.sublocation.defaultClientScopeURI ) {
        requestPref.defaultClientScopeUri = [ currentContext.sublocation.defaultClientScopeURI ];
    }

    //Populate savedSessionMode as reset when opening snapshot
    if( !_.isNull( currentContext.currentState.snap_uid ) && !_.isUndefined( currentContext.currentState.snap_uid ) ) {
           requestPref.snapshot = [ currentContext.currentState.snap_uid ];
           requestPref.savedSessionMode = [ 'reset' ];
           requestPref.startFreshNavigation = _TRUE;
    }
};

export let populateRequestPrefParametersForLocator = function( requestPref, loadInput, currentContext ) {
    requestPref.displayMode = [ loadInput.displayMode ];
    var sytemLocatorParams = appCtxService.getCtx( 'systemLocator' );
        requestPref.ProductId = [ currentContext.currentState.uid ];

    _.forEach( sytemLocatorParams, function( value, name ) {
        if( !_.isUndefined( value ) ) {
            requestPref[ name ] = [ value.toString() ];
        }
    } );

    appCtxService.unRegisterCtx( 'systemLocator' );
};

export default exports = {
    populateExpansionCriteriaParameters,
    populateRequestPrefParameters,
    populateRequestPrefParametersForLocator
};
/**
 * @memberof NgServices
 * @member occmgmtRequestPrefPopulatorService
 */
app.factory( 'occmgmtRequestPrefPopulatorService', () => exports );
