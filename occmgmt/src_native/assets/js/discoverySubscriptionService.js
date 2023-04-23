//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/discoverySubscriptionService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import discoveryFilterService from 'js/discoveryFilterService';
import createWorksetService from 'js/createWorksetService';
import includeExcludeFilterService from 'js/includeExcludeFilterService';
import messageSvc from 'js/messagingService';
import localeSvc from 'js/localeService';
import occmgmtSubsetUtils from './occmgmtSubsetUtils';
import clientDataModel from 'soa/kernel/clientDataModel';

var exports = {};
var _eventSubDefs = [];
var continueWithUnsaved = false;
var saveAsWorksetCloseListener;
var saveAsWorksetListener;

/**
 * Initialize
 */

export let setContinueWithUnsaved = function( continueWithoutSave ) {
    continueWithUnsaved = continueWithoutSave;
};

export let initializeSaveAsReviseWorksetListeners = function() {
    saveAsWorksetListener = eventBus.subscribe( 'Awp0ShowSaveAs.saveAsComplete', function( data ) {
        // below publish event will add the newly created workset in interacted product list
        // so that getOcc SOA will get called with restore mode. This is needed so that the server
        // can create the autobookmark on getOcc call
        var createdObject = {
            uid: data.newObjectUid
        };
        var eventData = {
            createdObject: createdObject
        };
        eventBus.publish( 'swc.objectCreated', eventData );

        if( continueWithUnsaved && appCtxSvc.ctx.aceActiveContext.context.worksetTopNode ) {
            // continueWithUnSaved true reflects workset is dirty
            var localizedMessages = localeSvc.getLoadedText( 'OccurrenceManagementSubsetConstants' );
            if( appCtxSvc.ctx.aceActiveContext.context.worksetTopNode.props.is_modifiable.dbValues[0] === '1' ) {
                messageSvc.showInfo( localizedMessages.saveAsWorksetWithPersistedChanges );
            }else {
                messageSvc.showInfo( localizedMessages.saveAsWorksetWithNoWriteAccess );
            }
        }
        continueWithUnsaved = false;
        if( appCtxSvc.ctx.aceActiveContext.context.saveAsOnConcurrentSave ) {
            delete appCtxSvc.ctx.aceActiveContext.context.saveAsOnConcurrentSave;
        }
        unsubscribeListenerWorkset();
    } );

    saveAsWorksetCloseListener = eventBus.subscribe( 'Awp0ShowSaveAs.contentUnloaded', function() {
        continueWithUnsaved = false;
        if( appCtxSvc.ctx.aceActiveContext.context.saveAsOnConcurrentSave ) {
            delete appCtxSvc.ctx.aceActiveContext.context.saveAsOnConcurrentSave;
        }
        unsubscribeListenerWorkset();
    } );
};

let unsubscribeListenerWorkset = function() {
    if( saveAsWorksetListener ) {
        eventBus.unsubscribe( saveAsWorksetListener );
    }
    if( saveAsWorksetCloseListener ) {
        eventBus.unsubscribe( saveAsWorksetCloseListener );
    }
};

export let initialize = function() {
    discoveryFilterService.setContext();
    _eventSubDefs.push( eventBus.subscribe( 'awConfigPanel.variantInfoChanged', function( eventData ) {
        // Subscribe to variant rule change event. We need this handling due to VOO changes.
        // The AW server expected filterOrRecipeChange to be true when removing VOO via
        // "No Variant Rule" action in client. This is because although VOO is shown as a
        // variant rule in UI, it is actually a Recipe option and is bookmarked via Recipe.

        // Get the current PCI and check if the VOO feature is present in there. If it is then
        // we can conclude that user is trying to unset the VOO via SVR application.
        var aceActiveContext = appCtxSvc.ctx.aceActiveContext;
        if( aceActiveContext && aceActiveContext.context && aceActiveContext.context.supportedFeatures
            && aceActiveContext.context.supportedFeatures.Awb0ConfiguredByProximity ) {
                // Set filterOrRecipeChange preference as true now.
                appCtxSvc.updatePartialCtx( 'aceActiveContext.context.requestPref.filterOrRecipeChange', 'true' );
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'awFilter.addSelectedElementToFilter', function() {
        includeExcludeFilterService.applySelectedElementFilterInRecipe();
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'appCtx.register', function( eventData ) {
        var aceActiveContext = appCtxSvc.ctx.aceActiveContext;
        if ( aceActiveContext ) {
            var activeContext = aceActiveContext.context;
            if( eventData.name === 'mselected' && activeContext ) {
                var validSelectedObjects = occmgmtSubsetUtils.validateSelectionsToBeInSingleProduct();
                if ( activeContext.supportedFeatures
                    && activeContext.supportedFeatures.Awb0StructureFilterFeature &&
                    !( appCtxSvc.ctx.hiddenCommands && appCtxSvc.ctx.hiddenCommands.Awb0StructureFilter ) ) {
                    discoveryFilterService.validateTermsToIncludeOrExclude( validSelectedObjects );
                }
                var isInWorksetContext = activeContext.worksetTopNode;
                if ( isInWorksetContext ) {
                    if( validSelectedObjects && validSelectedObjects.length >= 1 && validSelectedObjects.length === appCtxSvc.ctx.mselected.length ) {
                        _.set( appCtxSvc, 'ctx.filter.validSelectionsInSingleSubsetInWorkset', true );
                    } else {
                        _.set( appCtxSvc, 'ctx.filter.validSelectionsInSingleSubsetInWorkset', false );
                    }
                }
            }
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( data ) {
        if( data.target === 'isRestoreOptionApplicableForProduct' && appCtxSvc.ctx.aceActiveContext ) {
            var activeContext = appCtxSvc.ctx.aceActiveContext;
                if( activeContext && activeContext.context && activeContext.context.productContextInfo &&
                    activeContext.context.productContextInfo.props.awb0Snapshot !== undefined && activeContext.context.productContextInfo.props.awb0Snapshot.dbValues[0] !== '' && !_.isNull( activeContext.context.productContextInfo.props.awb0Snapshot.dbValues[0] ) ) {
                        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.isRestoreOptionApplicableForProduct', false );
                    }
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( data ) {
        var activeContext = appCtxSvc.ctx.aceActiveContext;
        if ( activeContext && activeContext.context.worksetTopNode && appCtxSvc.ctx.mselected ) {
            if( data.name === 'SaveAsReviseWorkSpace' && appCtxSvc.ctx.sublocation.clientScopeURI === 'Awb0OccurrenceManagement' ) {
                if( activeContext.context.worksetTopNode.modelType.typeHierarchyArray.indexOf( 'Fnd0WorksetRevision' ) > -1 ) {
                    var worksetItem = activeContext.context.worksetItemTopNode;
                    if ( worksetItem && worksetItem.props && worksetItem.props.is_modifiable.dbValues[0] !== '1' ||
                         activeContext.context.saveAsOnConcurrentSave ) {
                        appCtxSvc.updatePartialCtx( 'SaveAsReviseWorkSpace.ReviseHidden', 'true' );
                    } else {
                        appCtxSvc.updatePartialCtx( 'SaveAsReviseWorkSpace.ReviseHidden', 'false' );
                    }
                }
            }
        }
    } ) );

    //LCS: 534110 :When workset is created, we want ctx to be populated with the modelTypeHierarchy of the opened
    // element. This code is written to have better control on the commandVisibility condition for all kind of worksets.
    //It is added at this place to maintain the lifecycle of the ctx variable throughout the user session.
    _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( data ) {
        if( data.target === 'openedElement' ) {
        createWorksetService.updateCtxWithTopNodeHierarchy();
        }
    } ) );
    // Subscribe to elementsAdded for addition of subset handling
    _eventSubDefs.push( eventBus.subscribe( 'addElement.elementsAdded', function( eventData ) {
        var updatedParentElement = eventData.updatedParentElement;
        var newElements = eventData.addElementResponse.selectedNewElementInfo.newElements;
        if( !updatedParentElement ) {
            updatedParentElement = eventData.addElementInput && eventData.addElementInput.parent ? eventData.addElementInput.parent : appCtxSvc.ctx.aceActiveContext.context.addElement.parent;
        }
        if( newElements && createWorksetService.isWorkset( updatedParentElement ) ) {
            createWorksetService.updateElementToPCIMapOnAddSubset( updatedParentElement, newElements );
        }
    } ) );
    _eventSubDefs.push( eventBus.subscribe( 'ace.resetStructureStarted', function() {
        if( discoveryFilterService.isDiscoveryIndexed() ||
        appCtxSvc.ctx.aceActiveContext && appCtxSvc.ctx.aceActiveContext.context && appCtxSvc.ctx.aceActiveContext.context.topElement.modelType.typeHierarchyArray.indexOf( 'Fnd0AppSession' ) > -1 ||
         createWorksetService.isWorkset( appCtxSvc.ctx.mselected[0] ) ) {
            discoveryFilterService.clearAllCacheOnReset();
            // In case of reset, the view toggles on the client should not be sent anymore. The view toggles are read
            // from preference(product) or from structure context(session, workset) in aw server. Sending these viewtoggles
            // will override the view toggles read from preference or SC.
            // We are clearing these view toggles here since it is populated into the SOA input in
            // occmgmtRequestPrefPopulatorService if it is set on context.
            // TODO: Need discussion if the code
            // in request populator service needs to be changed to not populate this on reset since that change
            // will affect ACE index products too.
            appCtxSvc.updatePartialCtx( 'aceActiveContext.context.showVariantsInOcc', undefined );
            appCtxSvc.updatePartialCtx( 'aceActiveContext.context.showInEffectiveOcc', undefined );
            appCtxSvc.updatePartialCtx( 'aceActiveContext.context.showSuppressedOcc', undefined );
        }
    } ) );
    // Subcribe to productContextChangedEvent. This is fired after getOcc SOA is executed
    _eventSubDefs.push( eventBus.subscribe( 'productContextChangedEvent', function( eventData ) {
        if( eventData && eventData.dataProviderActionType &&
            ( eventData.dataProviderActionType === 'initializeAction' || eventData.dataProviderActionType === 'productChangedOnSelectionChange' ) ) {
                //Register custom function if in Workset OR if discoveryIndexed product
                var inWorksetContext = appCtxSvc.ctx.aceActiveContext.context.worksetTopNode !== undefined && appCtxSvc.ctx.aceActiveContext.context.worksetTopNode.modelType.typeHierarchyArray.indexOf( 'Fnd0WorksetRevision' ) > -1;
                if ( inWorksetContext ) {
                    appCtxSvc.updatePartialCtx( appCtxSvc.ctx.aceActiveContext.key + '.populateFilterParamsFunc', populateFilterParamsFunc );
                } else {
                    if ( discoveryFilterService.isDiscoveryIndexed() ) {
                        appCtxSvc.updatePartialCtx( appCtxSvc.ctx.aceActiveContext.key + '.populateFilterParamsFunc', populateFilterParamsFunc );
                    } else {
                        appCtxSvc.updatePartialCtx( appCtxSvc.ctx.aceActiveContext.key + '.populateFilterParamsFunc', undefined );
                    }
                }
        }
    } ) );
};

var populateFilterParamsFunc = function( filter, currentContext ) {
    filter.searchFilterCategories = [];
    filter.searchFilterMap = {};
    var recipe;

    //Populate recipe when recipe is modified via applying proximity or delete or operator change
    if( currentContext.updatedRecipe ) {
        recipe = currentContext.updatedRecipe;
    }

    filter.fetchUpdatedFilters = false;
    filter.recipe = [];

    var criteriaTypeStr = currentContext.requestPref.criteriaType;

    if( criteriaTypeStr ) {
        var recipeInfo = {
            criteriaType: criteriaTypeStr
        };

        filter.recipe.push( recipeInfo );
    }

    if( recipe ) {
        filter.recipe.push.apply( filter.recipe, recipe );
    }

    filter.searchFilterFieldSortType = 'Priority';
    filter.searchSortCriteria = [];
};

/**
 * Destroy
 */
export let destroy = function() {
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
};

export default exports = {
        initialize,
        populateFilterParamsFunc,
        destroy,
        setContinueWithUnsaved,
        initializeSaveAsReviseWorksetListeners
};
app.factory( 'discoverySubscriptionService', () => exports );
