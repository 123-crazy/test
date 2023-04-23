// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Um0CreateUserService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import eventBus from 'js/eventBus';

var exports = {};

eventBus.subscribe( 'updateUserProperties', function( eventData ) {

    // update user_name properties
    eventData.updatedUserNamePropery.hasLov = false;

    // update user_id properties
    eventData.updatedUserIdPropery.hasLov = false;

    eventData.scope.data.licenseBundleProp = "";

    // update the  license bundle as a single valued property
    if (eventData.scope.data.modelPropUser.props.fnd0license_bundles)
    { 
        eventData.scope.data.modelPropUser.props.fnd0license_bundles.isArray = false;
        eventData.scope.data.modelPropUser.props.fnd0license_bundles.type = "STRING";
        eventData.scope.data.licenseBundleProp = eventData.scope.data.modelPropUser.props.fnd0license_bundles.uiValue;
    }

    if (eventData.scope.data.modelPropUser.props.fnd0LicenseServer)
    { 
        eventData.scope.data.fnd0LicenseServerProp = eventData.scope.data.modelPropUser.props.fnd0LicenseServer.dbValue;
    }
} );

/**
 * validateAndCreateObject Method
 *
 * @param {bool} GroupRoleSelectionValue - GroupRoleSelectionValue
 */
export let validateAndCreateObject = function( modeldata ) {
    if( modeldata.modelPropUser.props.volume.dbValue !== null &&
        modeldata.modelPropUser.props.local_volume.dbValue !== null ) {
        if( modeldata.modelPropUser.props.volume.dbValue === modeldata.modelPropUser.props.local_volume.dbValue ) {
            var resource = 'UsermanagementCommandPanelMessages';
            var localTextBundle = localeService.getLoadedText( resource );
            if( localTextBundle ) {
                var _localeMsg = localTextBundle.WarnMsgForVolumeProp.replace( '{0}', modeldata.name.uiValue );
                messagingService.showWarning( _localeMsg );
            }
        }
    } else {
        eventBus.publish( "ics.createPersonObject" );
    }
};

eventBus.subscribe( 'registerCreatedObject', function( data ) {
    if( data !== null ) {
        appCtxSvc.registerCtx( "newlyCreatedObj", cdm.getObject( data.scope.data.createdObjectUid ) );
    }
} );

export default exports = {
    validateAndCreateObject
};
/**
 * Um0CreateUserService utility
 *
 * @memberof NgServices
 * @member reportsPanelService
 */
app.factory( 'Um0CreateUserService', () => exports );
