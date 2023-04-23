// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Service responsible for creating, updating and copying Saved Working Context
 *
 * @module js/saveWorkingContextService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import uwPropertyService from 'js/uwPropertyService';
import viewModelObjectService from 'js/viewModelObjectService';
import listBoxService from 'js/listBoxService';
import cdm from 'soa/kernel/clientDataModel';
import omStateHandler from 'js/occurrenceManagementStateHandler';
import eventBus from 'js/eventBus';

var exports = {};

var AWB0AUTOBOOKMARK = 'awb0AutoBookmark';
var AWB0SOURCEAUTOBOOKMARK = 'awb0SourceAutoBookmark';
var AWB0_READ_SHARE = 'awb0AllowReadShare';
var AWB0_WRITE_SHARE = 'awb0AllowWriteShare';
var LAST_MOD_DATE = 'last_mod_date';

/**
 * Get the message for given key from given resource file, replace the parameter and return the localized string
 *
 * @param {Object} resourceFile - File that defines the message
 * @param {String} resourceKey - The message key which should be looked-up
 * @param {String} messageParam - The message parameter
 * @returns {String} localizedValue - The localized message string
 */
function getLocalizedMessage( resourceFile, resourceKey, messageParam ) {
    var localizedValue = null;
    var resource = resourceFile;
    var localTextBundle = localeService.getLoadedText( resource );
    if( localTextBundle ) {
        localizedValue = localTextBundle[ resourceKey ].replace( '{0}', messageParam );
    } else {
        var asyncFun = function( localTextBundle ) {
            localizedValue = localTextBundle[ resourceKey ].replace( '{0}', messageParam );
        };
        localeService.getTextPromise( resource ).then( asyncFun );
    }
    return localizedValue;
}

/**
 * Set Auto-assigned Name for SWC ( based upon operation type )
 *
 * @param {Object} data - Saved Working Context panel's data object
 */
var setObjectName = function( data ) {
    if( data && data.operationType && data.openedObject ) {
        var openedObjectName = data.openedObject.props.object_name.dbValues[ 0 ];

        switch ( data.operationType ) {
            case 'CREATE':
                //Auto-assigned Name = "Context for " + openedObjectName;
                data.object_name.dbValue = getLocalizedMessage( 'OccurrenceManagementMessages',
                    'workingContextName', openedObjectName );
                break;
            case 'SAVEAS':
                //Auto-assigned Name = "Copy of " + openedObjectName;
                data.object_name.dbValue = getLocalizedMessage( 'OccurrenceManagementMessages',
                    'saveAsWorkingContextName', openedObjectName );
                break;
        }
        if( data.operationType !== 'UPDATE' ) {
            data.object_name.valueUpdated = true;
        }
    }
};

export let processSwcTypes = function( data ) {
    var swcContainerNames = [];
    var swcTypes = data.searchResults;
    for( var typeIndex = 0; typeIndex < swcTypes.length; typeIndex++ ) {
        var uid = swcTypes[ typeIndex ].uid;
        swcContainerNames.push( uid.split( '::' )[ 1 ] );
    }
    return swcContainerNames;
};

export let processSessionTypes = function( data ) {
    var sessionTypeNames = [];
    for( var typeIndex = 0; typeIndex < data.output[0].creatableBONames.length; typeIndex++ ) {
        sessionTypeNames.push( data.output[0].creatableBONames[typeIndex].boName );
    }
    return sessionTypeNames;
};

/**
 * Initialize the Save Working Context Type Selector Section
 *
 * @param {Object} data - Saved Working Context panel's data object
 */
export let  populateSWCTypes = function( data ) {
    if( data ) {
        var swcContainerNames = data.swcTypeList;

        if( swcContainerNames.arrayLength < 0 || swcContainerNames.length <= 0 ) {
            swcContainerNames = omStateHandler.getSWCContainerNames();
        }
        data.swcContainerNames = swcContainerNames;
        return soaSvc.ensureModelTypesLoaded( swcContainerNames ).then( function() {
            data.swcTypeList = listBoxService.createListModelObjectsFromStrings( swcContainerNames );
            if( data.swcTypeList.length === 1 ) {
                data.swcType.isEditable = false;
            } else {
                data.swcType.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
            }
        } );
    }
};

/**
 * Set the ViewModelProperty for AWB0SOURCEAUTOBOOKMARK Get AWB0AUTOBOOKMARK property from Product Context Info
 * and assign it to AWB0SOURCEAUTOBOOKMARK
 *
 * @param {Object} data - Saved Working Context panel's data object
 */
var setSourceAutoBookmarkProperty = function( data ) {
    if( data ) {
        var pci = omStateHandler.getProductContextInfo();
        if( pci ) {
            var sourceABMProp = uwPropertyService.createViewModelProperty( AWB0SOURCEAUTOBOOKMARK,
                'Source AutoBookmark', 'STRING', pci.props[ AWB0AUTOBOOKMARK ].dbValues[ 0 ], '' );
            sourceABMProp.uiValue = pci.props[ AWB0AUTOBOOKMARK ].uiValues[ 0 ];
            sourceABMProp.valueUpdated = true;
            data[ AWB0SOURCEAUTOBOOKMARK ] = sourceABMProp;
        }
    }
};

/**
 * Get the opened product
 */
var getProduct = function() {
    var pci = omStateHandler.getProductContextInfo();
    if( pci ) {
        return cdm.getObject( pci.props.awb0Product.dbValues[ 0 ] );
    }
};

/**
 * Check if we are creating an instance of Awb0SavedBookmark
 */
var checkIfTargetTypeIsSavedBookmark = function( data ) {
    var swcTypes = data.swcTypeList;
    if( swcTypes.arrayLength < 0 || swcTypes.length <= 0 ) {
        swcTypes = omStateHandler.getSWCContainerNames();
    }
    data.targetTypeIsSavedBookmark =  swcTypes.indexOf( 'Awb0SavedBookmark' ) > -1;
};

/**
 * Initialize the Save Working Context Panel for CREATE / SAVEAS operations
 *
 * @param {Object} data - Saved Working Context panel's data object
 */
export let initializeCreateSWCPanel = function( data ) {
    if( data === null ) {
        return;
    }

    checkIfTargetTypeIsSavedBookmark( data );

    if( data.targetTypeIsSavedBookmark ) {
        var eventData = {
            forceSave: true
        };
        eventBus.publish( 'swcPanel.startSaveAutoBookmark', eventData );
    }

    var swcObj = appCtxService.ctx.aceActiveContext.context.workingContextObj;
    if( swcObj === null ) {
        data.operationType = 'CREATE';
        appCtxService.ctx.aceActiveContext.context.workingCtxOpType = 'CREATE';
        data.openedObject = getProduct();
        data.contextTitle.uiValue = getLocalizedMessage( 'OccurrenceManagementConstants',
            'saveWorkingContextTitle', null );
        data.buttonText.uiValue = getLocalizedMessage( 'OccurrenceManagementConstants', 'saveButtonText', null );
    } else {
        data.operationType = 'SAVEAS';
        appCtxService.ctx.aceActiveContext.context.workingCtxOpType = 'SAVEAS';
        data.openedObject = swcObj;
        data.contextTitle.uiValue = getLocalizedMessage( 'OccurrenceManagementConstants',
            'saveAsWorkingContextTitle', null );
        data.buttonText.uiValue = getLocalizedMessage( 'OccurrenceManagementConstants', 'saveAsButtonText',
            null );
    }

    return exports.populateSWCTypes( data );
};

/**
 * Find the properties of the opened object that should be loaded for CREATE / SAVEAS / UPDATE operation to
 * succeed
 *
 * @param {Object} data - Saved Working Context panel's data object
 */
export let findPropsToLoad = function( data ) {
    if( data.operationType === 'CREATE' ) {
        data.propsToLoad = [ 'object_name' ];
    } else {
        data.propsToLoad = data.objCreateInfo.propNamesForCreate;
        data.propsToLoad.push( AWB0_READ_SHARE );
        data.propsToLoad.push( AWB0_WRITE_SHARE );

        if( data.operationType === 'UPDATE' ) {
            data.propsToLoad.push( LAST_MOD_DATE );
            data.propsToLoad.push( 'owning_user' );
        }
    }
    eventBus.publish( 'findPropsToLoad.success' );
};

/**
 * Initialize the Save Working Context Panel for UPDATE operation
 *
 * @param {Object} data - Saved Working Context panel's data object
 */
export let initializeUpdateSWCPanel = function( data ) {
    var eventData = {
        forceSave: true
    };
    eventBus.publish( 'swcPanel.startSaveAutoBookmark', eventData );

    if( data ) {
        data.openedObject = appCtxService.ctx.aceActiveContext.context.workingContextObj;
        data.operationType = 'UPDATE';
        appCtxService.ctx.aceActiveContext.context.workingCtxOpType = 'UPDATE';

        data.targetTypeIsSavedBookmark = true;
        var swcContainerNames = [];
        swcContainerNames.push( data.openedObject.type );
        data.swcTypeList = listBoxService.createListModelObjectsFromStrings( swcContainerNames );
        data.swcType.isEditable = false;
    }
};

/**
 * Auto populate XRT panel fields: 'object_name' for CREATE operation, all view model properties for SAVEAS,
 * UPDATE operations. Add AWB0SOURCEAUTOBOOKMARK to the properties to create and set the value.
 *
 * @param {Object} data - Saved Working Context panel's data object
 */
export let populateCreateInputPanel = function( data ) {
    if( data.targetTypeIsSavedBookmark ) {
        if( data.operationType === 'SAVEAS' || data.operationType === 'UPDATE' ) {
            data.sourcevmo = viewModelObjectService.createViewModelObject( data.openedObject.uid );

            for( var index = 0; index < data.objCreateInfo.propNamesForCreate.length; index++ ) {
                var propName = data.objCreateInfo.propNamesForCreate[ index ];
                if( 'undefined' === typeof data[ propName ] ) {
                    continue;
                }

                data[ propName ].dbValue = data.sourcevmo.props[ propName ].dbValue;
                data[ propName ].dbValues = data.sourcevmo.props[ propName ].dbValues;
                data[ propName ].displayValsModel = data.sourcevmo.props[ propName ].displayValsModel;
                data[ propName ].displayValues = data.sourcevmo.props[ propName ].displayValues;
                data[ propName ].prevDisplayValues = data.sourcevmo.props[ propName ].prevDisplayValues;
                data[ propName ].uiValue = data.sourcevmo.props[ propName ].uiValue;
                data[ propName ].uiValues = data.sourcevmo.props[ propName ].uiValues;
                data[ propName ].value = data.sourcevmo.props[ propName ].value;

                if( data.operationType === 'SAVEAS' ) {
                    data[ propName ].valueUpdated = true;
                } else if( data.operationType === 'UPDATE' ) {
                    data[ propName ].isEditable = true;
                }
            }
        }

        data.objCreateInfo.propNamesForCreate.push( AWB0SOURCEAUTOBOOKMARK );
        setSourceAutoBookmarkProperty( data );
    }
    setObjectName( data );
};

/**
 * Handle SaveAutoBookmarkStatusChangeEvent result. FIX ME: Delete this function when we switch to native
 * sublocation
 *
 * @param {Object} data - Saved Working Context panel's data object
 * @param {Object} eventData - SaveAutoBookmarkStatusChangeEvent event data object containing completedDomains,
 *            pendingDomains, failedDomains
 */
export let onSaveAutoBookmarkStatusChange = function( data, eventData ) {
    if( eventData ) {
        if( data.contributedAppsHaveSavedBookmarkData.dbValue ) {
            return;
        }

        if( eventData.pendingDomains === null ) {
            data.contributedAppsHaveSavedBookmarkData.dbValue = true;

            if( eventData.failedDomains !== null ) {
                var failedDomainsString = '';
                for( var index = 0; index < eventData.failedDomains.length; index++ ) {
                    if( index !== 0 ) {
                        failedDomainsString = failedDomainsString.concat( ', ' );
                    }
                    failedDomainsString = failedDomainsString.concat( eventData.failedDomains[ index ] );
                }

                console.warn( getLocalizedMessage( 'OccurrenceManagementMessages', // eslint-disable-line no-console
                    'applicationBookmarkDataWillBePartiallySaved', failedDomainsString ) );
            }
        }
    }
};

/**
 * Keep the Read Share and Write Share properties in logical sync.
 *
 * @param {Object} data - SWC custom panel's data object
 * @param {Object} parent - SWC custom panel's parent object used to traverse to main panel's view model
 */
export let keepShareAttrsInSync = function( data, parent ) {
    if( data.awb0AllowReadShare.dbValue === false ) {
        data.awb0AllowWriteShare.dbValue = false;
    }
    if( data.awb0AllowWriteShare.dbValue === true ) {
        data.awb0AllowReadShare.dbValue = true;
    }

    //FIX ME: Temporary workaround to update the custom panel info on the main panel's View Model.
    var currentParent = parent;
    while( currentParent ) {
        if( 'undefined' === typeof currentParent.data ||
            'undefined' === typeof currentParent.data.customPanelInfo ||
            'undefined' === typeof currentParent.data.customPanelInfo.Awb0SWCCustomPanel ) {
            currentParent = currentParent.$parent;
            continue;
        }

        if( currentParent.data.operationType === 'UPDATE' ) {
            var activeContext = appCtxService.getCtx( 'aceActiveContext.context' );
            var oldReadShareVal = activeContext.workingContextObj.props.awb0AllowReadShare.dbValues[ 0 ] === '1';
            var oldWriteShareVal = activeContext.workingContextObj.props.awb0AllowWriteShare.dbValues[ 0 ] === '1';
            data.awb0AllowReadShare.valueUpdated = oldReadShareVal !== data.awb0AllowReadShare.dbValue;
            data.awb0AllowWriteShare.valueUpdated = oldWriteShareVal !== data.awb0AllowWriteShare.dbValue;
            currentParent.data.vmo.props.awb0AllowReadShare = data.awb0AllowReadShare;
            currentParent.data.vmo.props.awb0AllowWriteShare = data.awb0AllowWriteShare;
        } else {
            data.awb0AllowReadShare.valueUpdated = true;
            data.awb0AllowWriteShare.valueUpdated = true;
            currentParent.data.customPanelInfo.Awb0SWCCustomPanel.awb0AllowReadShare = data.awb0AllowReadShare;
            currentParent.data.customPanelInfo.Awb0SWCCustomPanel.awb0AllowWriteShare = data.awb0AllowWriteShare;
        }
        break;
    }
};

/**
 * Save Working Context service utility
 */

export default exports = {
    populateSWCTypes,
    processSwcTypes,
    processSessionTypes,
    initializeCreateSWCPanel,
    findPropsToLoad,
    initializeUpdateSWCPanel,
    populateCreateInputPanel,
    onSaveAutoBookmarkStatusChange,
    keepShareAttrsInSync
};
app.factory( 'saveWorkingContextService', () => exports );
