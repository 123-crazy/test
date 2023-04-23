// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/occurrenceManagementStateHandler
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import AwFilterService from 'js/awFilterService';
import dateTimeService from 'js/dateTimeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var nullDate = '0001-01-01T00:00:00+00:00';

var _onProductContextChangeEventListener = null;
var _onAutoSavedSessionTimeChange = null;
var supportedFeatures = {};
var readOnlyFeatures = {};
var isOpenedUnderAContext = false;
var swcContainerNames = [];

var exports = {};

/**
 * Get the opened Saved Working Context
 */
var getSavedWorkingContext = function( productContextInfo ) {
    if( productContextInfo.props.awb0ContextObject && productContextInfo.props.awb0ContextObject.dbValues ) {
        return cdm.getObject( productContextInfo.props.awb0ContextObject.dbValues[ 0 ] );
    }
    return null;
};

/**
 * Update 'contextObject' in the appCtxService (if necessary).
 *
 * @param {IModelObject} contextKeyObject - ContextKeyObject.
 */
var registerOrUpdateInformationOnContext = function( contextKeyObject, contextKey, activeContext, eventData ) {
    var pciObj = contextKeyObject.productContextInfo;
    if( pciObj && activeContext ) {
        var changed = false;
        var isCtxUpdateOnSelectionChange = _.isEqual( _.get( eventData, 'dataProviderActionType' ), 'productChangedOnSelectionChange' );

        if( !activeContext.productContextInfo || activeContext.productContextInfo.uid !== pciObj.uid ) {
            activeContext.productContextInfo = pciObj;
            changed = true;
        }

        if( !_.isEqual( activeContext.supportedFeatures, supportedFeatures ) ) {
            activeContext.supportedFeatures = supportedFeatures;
            changed = true;

            if( activeContext.previousState && appCtxSvc.ctx.mselected.length > 0 &&
                activeContext.previousState.c_uid === appCtxSvc.ctx.mselected[ 0 ].uid && isCtxUpdateOnSelectionChange === false ) {
                eventBus.publish( 'aceSecondaryWorkArea.refreshTabs', {
                    contextKey: contextKey
                } );
            }
        }

        if( !_.isEqual( activeContext.readOnlyFeatures, readOnlyFeatures ) ) {
            activeContext.readOnlyFeatures = readOnlyFeatures;
            changed = true;
        }

        if( !_.isEmpty( contextKeyObject.transientRequestPref ) ) {
            activeContext.transientRequestPref = {};
            changed = true;
        }

        if( activeContext.isOpenedUnderAContext !== isOpenedUnderAContext ) {
            activeContext.isOpenedUnderAContext = isOpenedUnderAContext;
            changed = true;
        }

        if( activeContext.workingContextObj !== getSavedWorkingContext( pciObj ) ) {
            activeContext.workingContextObj = getSavedWorkingContext( pciObj );
            changed = true;
        }

        if( changed ) {
            appCtxSvc.updatePartialCtx( contextKey, activeContext );
        }
    }
};

/**
 */
export let getSupportedFeaturesFromPCI = function( productContextInfo ) {
    var supportedFeaturesFromPCI = {};
    var supportedFeaturesObjects = null;
    if( productContextInfo && productContextInfo.props ) {
        supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;
    }

    if( supportedFeaturesObjects ) {
        for( var objIndex = 0; objIndex < supportedFeaturesObjects.dbValues.length; objIndex++ ) {
            var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ objIndex ] );

            if( featureObject.type === 'Awb0FeatureList' ) {
                var availableFeatures = featureObject.props.awb0AvailableFeatures;
                for( var feature = 0; feature < availableFeatures.dbValues.length; feature++ ) {
                    supportedFeaturesFromPCI[ availableFeatures.dbValues[ feature ] ] = true;
                }
            } else {
                if( featureObject.type ) {
                    supportedFeaturesFromPCI[ featureObject.modelType.name ] = true;
                }
            }
        }
    }
    return supportedFeaturesFromPCI;
};

/**
 */
var populateSupportedFeaturesFromPCI = function( contextKeyObject ) {
    supportedFeatures = exports.getSupportedFeaturesFromPCI( contextKeyObject.productContextInfo );
};

/**
 */
var populateSWCContainerNames = function( productContextInfo ) {
    swcContainerNames = [];

    if( productContextInfo && productContextInfo.props ) {
        var supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;
        if( supportedFeaturesObjects ) {
            for( var supportedFeatureObject = 0; supportedFeatureObject < supportedFeaturesObjects.dbValues.length; supportedFeatureObject++ ) {
                var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ supportedFeatureObject ] );
                if( featureObject.type === 'Awb0SaveWorkingContextFeature' ) {
                    var containerNames = featureObject.props.awb0ContainerNames;
                    for( var cnIndex = 0; cnIndex < containerNames.dbValues.length; cnIndex++ ) {
                        swcContainerNames.push( containerNames.dbValues[ cnIndex ] );
                    }
                }
            }
        }
    }
};

/**
 */
export let getReadOnlyFeaturesFromPCI = function( productContextInfo ) {
    var readOnlyFeaturesList = {};

    if( productContextInfo && productContextInfo.props ) {
        var supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;

        if( supportedFeaturesObjects ) {
            for( var supportedFeatureObject = 0; supportedFeatureObject < supportedFeaturesObjects.dbValues.length; supportedFeatureObject++ ) {
                var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ supportedFeatureObject ] );

                if( featureObject.type === 'Awb0FeatureList' ) {
                    var nonModifiableFeatures = featureObject.props.awb0NonModifiableFeatures;

                    for( var feature = 0; feature < nonModifiableFeatures.dbValues.length; feature++ ) {
                        readOnlyFeaturesList[ nonModifiableFeatures.dbValues[ feature ] ] = true;
                    }
                }
            }
        }
    }

    return readOnlyFeaturesList;
};

/**
 */
var populateReadOnlyFeaturesFromPCI = function( productContextInfo ) {
    readOnlyFeatures = exports.getReadOnlyFeaturesFromPCI( productContextInfo );
};

/**
 */
var populateContextInformationFromPCI = function( productContextInfo ) {
    isOpenedUnderAContext = false;

    if( productContextInfo && productContextInfo.props && productContextInfo.props.awb0ContextObject ) {
        isOpenedUnderAContext = !productContextInfo.props.awb0ContextObject.isNulls;
    }
};

var populateSupportedFeaturesInWorkingContext = function( contextKeyObject, contextKey ) {
    var supportedFeaturesInWC = null;
    if( contextKeyObject.isOpenedUnderAContext &&
        contextKeyObject.elementToPCIMap ) {
        supportedFeaturesInWC = {};
        for( var key in contextKeyObject.elementToPCIMap ) {
            if( contextKeyObject.elementToPCIMap.hasOwnProperty( key ) ) {
                var pciModelObject = cdm
                    .getObject( contextKeyObject.elementToPCIMap[ key ] );
                var supportedFeaturesFromPCI = exports.getSupportedFeaturesFromPCI( pciModelObject );
                _.assign( supportedFeaturesInWC, supportedFeaturesFromPCI );
            }
        }
    }

    if( supportedFeaturesInWC &&
        !_.isEqual( contextKeyObject.supportedFeaturesInWC, supportedFeaturesInWC ) ) {
        appCtxSvc.updatePartialCtx( contextKey + '.supportedFeaturesInWC', supportedFeaturesInWC );
    }
};

var populateContextKey = function( data ) {
    if( data && data.contextKey ) {
        return data.contextKey;
    }
    return appCtxSvc.ctx.aceActiveContext.key;
};

/**
 */
var startListeningToProductContextChangeEvent = function() {
    _onProductContextChangeEventListener = eventBus.subscribe( 'occDataLoadedEvent', function( eventData ) {
        var contextKey = populateContextKey( eventData );
        var contextKeyObject = appCtxSvc.getCtx( contextKey );
        var isInitializeAction = _.isEqual( _.get( eventData, 'dataProviderActionType' ), 'initializeAction' );
        let transientRequestPref = contextKeyObject.transientRequestPref;
        populateSupportedFeaturesFromPCI( contextKeyObject );
        populateSWCContainerNames( contextKeyObject.productContextInfo );
        populateReadOnlyFeaturesFromPCI( contextKeyObject.productContextInfo );
        populateContextInformationFromPCI( contextKeyObject.productContextInfo );
        registerOrUpdateInformationOnContext( contextKeyObject, contextKey, contextKeyObject, eventData );
        populateSupportedFeaturesInWorkingContext( contextKeyObject, contextKey );

        if ( isInitializeAction && contextKeyObject.postProcessingFuncOnInitializeAction ) {
            contextKeyObject.postProcessingFuncOnInitializeAction();
            delete contextKeyObject.postProcessingFuncOnInitializeAction;
        }
        var occLoadedEventData = eventData;
        setTimeout( function() {
            var eventData = {};
            if( occLoadedEventData && occLoadedEventData.dataProviderActionType ) {
                eventData = {
                    updatedView: contextKey,
                    dataProviderActionType: occLoadedEventData.dataProviderActionType,
                    transientRequestPref:transientRequestPref
                };
            } else {
                eventData = {
                    updatedView: contextKey,
                    dataProviderActionType: null,
                    transientRequestPref:transientRequestPref
                };
            }

            eventBus.publish( 'productContextChangedEvent', eventData );
        }, 0 );
    }, 'OccurrenceManagementStateHandler' );
};

var startListeningToAutoSavedSessionTimeChangeEvent = function() {
    _onAutoSavedSessionTimeChange = eventBus.subscribe( 'appCtx.update', function( eventData ) {
        if( eventData && appCtxSvc.ctx.aceActiveContext && eventData.name === appCtxSvc.ctx.aceActiveContext.key &&
            eventData.target === 'autoSavedSessiontime' ) {
            var autoSavedSessiontime = appCtxSvc.ctx.aceActiveContext.context.autoSavedSessiontime;
            if( autoSavedSessiontime && autoSavedSessiontime !== nullDate ) {
                var resource = 'OccurrenceManagementMessages';
                var localTextBundle = localeService.getLoadedText( resource );
                if( localTextBundle ) {
                    showProductRestoredMessage( localTextBundle );
                } else {
                    localeService.getTextPromise( resource ).then( showProductRestoredMessage( resource ) );
                }
            }
            eventBus.unsubscribe( _onAutoSavedSessionTimeChange );
        }
    }, 'OccurrenceManagementStateHandler' );
};

var showProductRestoredMessage = function( resource ) {
    var isRestoreMessageApplicableToShow = false;
    if( appCtxSvc.ctx.aceActiveContext.context.isOpenedUnderAContext ) {
        if( appCtxSvc.ctx.aceActiveContext.context.workingContextObj &&
            appCtxSvc.ctx.aceActiveContext.context.workingContextObj.props.awb0PendingChanges.dbValues[ 0 ] === '1' ) {
            isRestoreMessageApplicableToShow = true;
        }
    } else {
        isRestoreMessageApplicableToShow = true;
    }

    if( isRestoreMessageApplicableToShow ) {
        var restoreMessage = resource.restoreMessage;

        if( appCtxSvc.getCtx( 'locationContext' ).modelObject.props &&
            appCtxSvc.getCtx( 'locationContext' ).modelObject.props.object_string &&
            appCtxSvc.getCtx( 'locationContext' ).modelObject.props.object_string.uiValues ) {
            restoreMessage = restoreMessage.replace( '{0}',
                appCtxSvc.getCtx( 'locationContext' ).modelObject.props.object_string.uiValues );
        }
        if( appCtxSvc.getCtx( 'aceActiveContext.context' ).autoSavedSessiontime ) {
            const date = AwFilterService.instance( 'date' )( appCtxSvc.getCtx( 'aceActiveContext.context' ).autoSavedSessiontime, dateTimeService.getSessionDateFormat() );
            restoreMessage = restoreMessage.replace( '{1}', date );
        }
        messagingService.showInfo( restoreMessage );
    }
};

/**
 */
var stopListeningToEventListners = function() {
    eventBus.unsubscribe( _onProductContextChangeEventListener );
    eventBus.unsubscribe( _onAutoSavedSessionTimeChange );
};

/**
 * Initialize OccMgmtStateHandler
 */
export let initializeOccMgmtStateHandler = function() {
    startListeningToProductContextChangeEvent();
    startListeningToAutoSavedSessionTimeChangeEvent();
};

/**
 * Get Supported Features
 */
export let getSupportedFeatures = function() {
    return supportedFeatures;
};

/**
 * Get Read-Only Features
 */
export let getReadOnlyFeatures = function() {
    return readOnlyFeatures;
};

/**
 * Get Saved Working Context Container Names
 */
export let getSWCContainerNames = function() {
    return swcContainerNames;
};

/**
 * Get the Product Context Info instance
 */
export let getProductContextInfo = function() {
    var context = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if( context ) {
        return context.productContextInfo;
    }
};

/**
 * Return true if feature is supported, otherwise false
 */
export let isFeatureSupported = function( featureToCheck ) {
    if( supportedFeatures[ featureToCheck ] ) {
        return true;
    }
    return false;
};

/**
 * Return true if feature is read-only, otherwise false
 */
export let isFeatureReadOnly = function( featureToCheck ) {
    var pci = exports.getProductContextInfo();
    if( pci ) {
        populateReadOnlyFeaturesFromPCI( pci );
        if( readOnlyFeatures[ featureToCheck ] === true ) {
            return true;
        }
    }
    return false;
};

/**
 * Destroy OccMgmtStateHandler
 */
export let destroyOccMgmtStateHandler = function() {
    stopListeningToEventListners();
    supportedFeatures = {};
    readOnlyFeatures = [];
};

/**
 * Occurrence Management State Handler
 */

export default exports = {
    getSupportedFeaturesFromPCI,
    getReadOnlyFeaturesFromPCI,
    initializeOccMgmtStateHandler,
    getSupportedFeatures,
    getReadOnlyFeatures,
    getSWCContainerNames,
    getProductContextInfo,
    isFeatureSupported,
    isFeatureReadOnly,
    destroyOccMgmtStateHandler
};
app.factory( 'occurrenceManagementStateHandler', () => exports );
