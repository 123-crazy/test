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
 * @module js/filterSettingsService
 */
import app from 'app';
import uwPropertySvc from 'js/uwPropertyService';

var exports = {};


export let processPreferenceResponse = function( result, data ) {
    if ( result && result.response.length > 0 ) {
        var vmProp = uwPropertySvc.createViewModelProperty( '', data.i18n.delayFiltering , 'BOOLEAN', '',
        '' );
        uwPropertySvc.setPropertyLabelDisplay(  vmProp, 'PROPERTY_LABEL_AT_SIDE' );

        var prefValue = result.response[0].values.values[0];
        if(  prefValue.toUpperCase() === 'TRUE' ) {
            uwPropertySvc.setValue( vmProp,  false );
            data.initialToggleValue = false;
        } else {
            uwPropertySvc.setValue( vmProp, true );
            data.initialToggleValue = true;
        }

        if(data.enableApply){
            uwPropertySvc.setIsEditable( vmProp, false );
            uwPropertySvc.setIsEnabled( vmProp, false );

        }else{
            uwPropertySvc.setIsEditable( vmProp, true );
            uwPropertySvc.setIsEnabled( vmProp, true );
        }

        return vmProp;
    }

};

export let updateDelayFilteringToggle = function( data ) {
    //User preference is for delayed apply whereas the Settings panel for filter panel has option Auto-update
    // so we need to negate the value
    if( data.delayFiltering.dbValue ) {
        data.delayedApplyUpdatedValue = 'false';
    }else{
        data.delayedApplyUpdatedValue = 'true';
    }
};

export default exports = {
    processPreferenceResponse,
    updateDelayFilteringToggle
};
app.factory( 'filterSettingsService', () => exports );
