// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/occmgmtSublocationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import _ from 'lodash';
import ctxStateMgmtService from 'js/contextStateMgmtService';
import occMgmtServiceManager from 'js/occurrenceManagementServiceManager';
import eventBus from 'js/eventBus';

var exports = {};

var urlParamsMap = {
    rootQueryParamKey: 'uid',
    selectionQueryParamKey: 'c_uid',
    openStructureQueryParamKey: 'o_uid',
    productContextQueryParamKey: 'pci_uid',
    csidQueryParamKey: 'c_csid',
    secondaryPageIdQueryParamKey: 'spageId',
    topElementQueryParamKey: 't_uid',
    pageIdQueryParamKey: 'pageId',
    recipeParamKey: 'recipe',
    subsetFilterParamKey: 'filter',
    contextOverride: 'incontext_uid'
};

var shortURLParams = [ 'rootQueryParamKey', 'productContextQueryParamKey', 'selectionQueryParamKey', 'openStructureQueryParamKey', 'topElementQueryParamKey', 'secondaryPageIdQueryParamKey',
    'contextOverride'
];

var setExpansionState = function( contextKey ) {
    if( appCtxSvc.ctx.splitView ) {
        if( appCtxSvc.ctx.splitView.resetTreeExpansionState && appCtxSvc.ctx.splitView.resetTreeExpansionState[ contextKey ] ) {
            appCtxSvc.ctx[ contextKey ].resetTreeExpansionState = true;
            delete appCtxSvc.ctx.splitView.resetTreeExpansionState[ contextKey ];
        }
    } else if( appCtxSvc.ctx.resetTreeExpansionState ) {
        appCtxSvc.ctx[ contextKey ].resetTreeExpansionState = true;
        delete appCtxSvc.ctx.resetTreeExpansionState;
    }
};

export let updateState = function( contextKey ) {
    var newState = {};
    var isStateChanged = false;
    var previousState = appCtxSvc.ctx[ contextKey ].previousState;

    if( appCtxSvc.ctx.splitView ) {
        var urlParamMapForCurrentContext = appCtxSvc.ctx[ contextKey ].urlParams;
        _.forEach( AwStateService.instance.params, function( value, parameter ) {
            if( _.values( urlParamMapForCurrentContext ).indexOf( parameter ) > -1 ) {
                var queryParam = _.invert( urlParamMapForCurrentContext )[ parameter ];
                var currentStateParam = urlParamsMap[ queryParam ];

                if( shortURLParams.includes( queryParam ) ) {
                    newState[ currentStateParam ] = value;
                } else if( appCtxSvc.ctx[ contextKey ].currentState[ currentStateParam ] ) {
                    newState[ currentStateParam ] = appCtxSvc.ctx[ contextKey ].currentState[ currentStateParam ];
                }

                isStateChanged = isStateChanged ? true : ( AwStateService.instance.params[ parameter ] || previousState[ currentStateParam ] ) &&
                    AwStateService.instance.params[ parameter ] !== previousState[ currentStateParam ];
            }
        } );
    } else {
        _.forEach( AwStateService.instance.params, function( value, name ) {
            if( AwStateService.instance.params[ name ] ) {
                newState[ name ] = value;
            }
        } );
        isStateChanged = _.keys( AwStateService.instance.params ).filter( function( key ) {
            return ( AwStateService.instance.params[ key ] || previousState[ key ] ) &&
                AwStateService.instance.params[ key ] !== previousState[ key ];
        } ).length !== 0;
    }
    setExpansionState( contextKey );

    if( isStateChanged ) {
        if( newState.uid !== appCtxSvc.ctx[ contextKey ].currentState.uid ) {
            //Silently update State as this use case will be handled by show object controller.
            appCtxSvc.ctx[ contextKey ].currentState = newState;
        } else {
            ctxStateMgmtService.updateContextState( contextKey, newState, false );
        }
    }
};

var updateRequestPref = function( contextKey ) {
    // When page is refreshed we will lose information of applied filters from the cache
    // Hence lets fetch it again from the server
    var filterValue = null;
    if( appCtxSvc.ctx.splitView ) {
        filterValue = AwStateService.instance.params[ appCtxSvc.ctx[ contextKey ].urlParams.subsetFilterParamKey ];
    } else {
        filterValue = AwStateService.instance.params.filter;
    }
    if( filterValue && filterValue.length > 0 ) {
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.requestPref.calculateFilters', true );
    }
};

var updateColumnToExcludeParameter = function( contextKey ) {
    // we are setting columnsToExclude parameters on context
    // specific feature/application can set this for visibility of specific columns until
    // support from framework is available.
    var columnsToExclude = [ 'Awb0ConditionalElement.awb0PendingAction', 'Awb0PositionedElement.pma1UpdateAction', 'Awb0DesignElement.pma1LastAlignedPart',
        'Awb0DesignElement.REF(pma1LastAlignedPart,ItemRevision).release_status_list',
        'Awb0PartElement.pma1LastAlignedDesign', 'Awb0PartElement.REF(pma1LastAlignedDesign,ItemRevision).release_status_list', 'Awb0ConditionalElement.awb0MarkupType'
    ];
    appCtxSvc.ctx[ contextKey ].columnsToExclude = columnsToExclude;
};

var isURLUpdateToAddNewURLParameterInContentTabUrl = function() {
    var isUrlParamUpdate = false;
    _.forEach( AwStateService.instance.params, function( value, name ) {
        if( !_.isEqual( name, 'uid' ) && !_.isEqual( name, 'page' ) && !_.isEqual( name, 'pageId' ) && !_.isUndefined( value ) && !_.isNull( value ) && !isUrlParamUpdate ) {
            isUrlParamUpdate = true;
        }
    } );
    return isUrlParamUpdate;
};

export let updateUrlFromCurrentState = function( eventData, contextKey ) {
    var paramsToBeStoredOnUrl = eventData.value[ contextKey ].currentState;
    if( appCtxSvc.ctx.splitView ) {
        _.forEach( paramsToBeStoredOnUrl, function( value, parameter ) {
            if( _.values( urlParamsMap ).indexOf( parameter ) > -1 ) {
                var queryParam = _.invert( urlParamsMap )[ parameter ];
                if( shortURLParams.includes( queryParam ) ) {
                    AwStateService.instance.params[ appCtxSvc.ctx[ contextKey ].urlParams[ queryParam ] ] = value;
                } else if( AwStateService.instance.params[ appCtxSvc.ctx[ contextKey ].urlParams[ queryParam ] ] ) {
                    AwStateService.instance.params[ appCtxSvc.ctx[ contextKey ].urlParams[ queryParam ] ] = null;
                }
            }
        } );
    } else {
        _.forEach( paramsToBeStoredOnUrl, function( value, name ) {
            AwStateService.instance.params[ name ] = value;
        } );
    }

    if( isURLUpdateToAddNewURLParameterInContentTabUrl() ) {
        AwStateService.instance.go( AwStateService.instance.current.name, AwStateService.instance.params, { location: 'replace' } );
    } else {
        AwStateService.instance.go( AwStateService.instance.current.name, AwStateService.instance.params );
    }
};

export let initializeOccmgmtSublocation = function( data, subPanelContext ) {
    data.contextKey = subPanelContext.provider.viewKey ? subPanelContext.provider.viewKey : 'occmgmtContext';

    var requestPref = appCtxSvc.ctx.requestPref ? appCtxSvc.ctx.requestPref : { savedSessionMode: 'restore' };

    appCtxSvc.registerCtx( data.contextKey, {
        currentState: {},
        previousState: {},
        pwaSelectionModel: {},
        requestPref: requestPref,
        transientRequestPref: {},
        persistentRequestPref: {
            showExplodedLines:false
        },
        expansionCriteria: {},
        urlParams: subPanelContext.provider.urlParams,
        breadcrumbConfig: subPanelContext.provider.breadcrumbConfig,
        modelObject: subPanelContext.baseSelection
    } );

    appCtxSvc.registerCtx( 'aceActiveContext', {
        key: data.contextKey,
        context: appCtxSvc.ctx[ data.contextKey ]
    } );

    updateState( data.contextKey );
    updateRequestPref( data.contextKey );
    updateColumnToExcludeParameter( data.contextKey );
    if( !appCtxSvc.ctx.splitView ) {
        occMgmtServiceManager.initializeOccMgmtServices();
    }
    data.updateUrlFromCurrentStateEventSubscription = eventBus.subscribe( 'appCtx.update', function( event ) {
        if( event.name === data.contextKey && event.target === 'currentState' ) {
            updateUrlFromCurrentState( event, data.contextKey );
        }
    } );
};

export let destroyOccmgmtSublocation = function( data ) {
    appCtxSvc.unRegisterCtx( data.contextKey );
    appCtxSvc.unRegisterCtx( 'searchResponseInfo' );
    if( !appCtxSvc.ctx.splitView ) {
        occMgmtServiceManager.destroyOccMgmtServices();
        appCtxSvc.unRegisterCtx( 'aceActiveContext' );
    }
    eventBus.unsubscribe( data.updateUrlFromCurrentStateEventSubscription );
};

export default exports = {
    initializeOccmgmtSublocation,
    destroyOccmgmtSublocation,
    updateUrlFromCurrentState,
    updateState
};
app.factory( 'occmgmtSublocationService', () => exports );
