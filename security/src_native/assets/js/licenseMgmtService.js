// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/licenseMgmtService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import listBoxSvc from 'js/listBoxService';
import dmSvc from 'soa/dataManagementService';
import licenseMgmtUtils from 'js/licenseMgmtUtils';
import _ from 'lodash';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

import 'soa/kernel/clientDataModel';
import 'js/viewModelObjectService';

var _licenseTypes = [];
var _licenses = [];
var _legacy = false;
var exports = {};
var ITAR_LICENSE = 'ITAR_License';

/**
 * sets apply to option from context
 *
 */
function setTypeOption( data ) {
    //load data from context
    var licenses = appCtxSvc.getCtx( 'licenses' );
    var revision = licenses.applyToRawList.filter( function( v ) {
        return v.isDefaultValue === true;
    } );
    data.applyTo.dbValue = _.isEmpty( revision ) ? false : Boolean( _.isEqual( revision[ 0 ].internalValue, '1' ) );
}

/**
 * Refresh License types
 *
 *
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
function refreshLicenses( data ) {
    //Group available licenses by type
    var availableLicenses = data.dataProviders.availableLicenses.viewModelCollection.loadedVMObjects;
    if( _.isEmpty( availableLicenses ) ) {
        availableLicenses = data.searchResults;
    }
    _.forEach( _licenseTypes, function( filter ) {
        var licType = filter.propInternalValue.internalValue;
        var licenses = null;
        if( _.isEqual( licType, 'All' ) ) {
            licenses = availableLicenses;
        } else {
             if(availableLicenses)
             {
                licenses = availableLicenses.filter( function( license ) {
                    return license.type === licType;
                } );
             }
        }
        _licenses[ licType ] = licenses;
    } );
}



/**
 * Initializes value change event for list box and gets available licenses
 *
 * @param {object} data - data
 *
 */
export let initialize = function( data, legacy ) {
    _legacy = legacy;
    data.itarEditMode = false;
    data.enableEdit = false;
    setTypeOption( data );
};

/**
 * Populate license types in detach license view
 *
 *
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let populateDetachList = function( data ) {
    var licenses = appCtxSvc.getCtx( 'licenses' );
    if( !licenses.searchResults ) {
        licenses.searchResults = [];
    }
    data.dataProviders.getDetachableLicense.update( licenses.searchResults, licenses.searchResults.length );
    setTypeOption( data );
    return data;
};

/**
 * Prepares the input for the attachLicense SOA. Create the array of licenses and auth-para separately maintaining
 * the order
 *
 * @param {object} - the JSON object
 *
 *
 */
export let getSelectedLicenseNameAndAuthPara = function( data, selectedLicenses ) {
    var licenseName = [];
    var auth_para = [];
    data.containsItarLicense = false;
    _.forEach( selectedLicenses, function( object ) {
        if( object.props.object_string.dbValue !== '' ) {
            licenseName.push( object.props.object_string.dbValue );
            if( object.props.ead_paragraph ) {
                data.containsItarLicense = true;
                var tmpValue = '';
                if( !_.isEmpty( object.props.ead_paragraph.dbValue ) ) {
                    tmpValue = object.props.ead_paragraph.dbValue;
                }
                auth_para.push( tmpValue );
            } else {
                auth_para.push( '' );
            }
        }
    } );
    data.authPara = auth_para;
    data.licenseName = licenseName;
    return data;
};

/**
 * Prepares the input for the attachLicenses SOA. Create the array of licenses and auth-para separately maintaining
 * the order
 *
 * @param {object} - the JSON object
 *
 *
 */
export let getSelectedLicensesforAttach = function( data ) {
    var selectedLicenses;
    if( _legacy ) {
        selectedLicenses = data.dataProviders.availableLicenses.selectedObjects;
    } else {
        selectedLicenses = data.dataProviders.selectedLicenses.viewModelCollection.loadedVMObjects;
    }
    data = exports.getSelectedLicenseNameAndAuthPara( data, selectedLicenses );
    data.confirmAttach = data.containsItarLicense && licenseMgmtUtils.objectsToAssign().length > 1;

    return data;
};

/**
 * Prepares the input for the detachLicenses SOA. Create the array of licenses and auth-para separately maintaining
 * the order
 *
 * @param {object} - the JSON object
 *
 *
 */

export let getSelectedLicensesforDetach = function( data, legacy ) {
    var selectedLicenses;
    if( legacy ) {
        selectedLicenses = data.eventData.selectedLicenses;
    } else {
        selectedLicenses = data.dataProviders.getDetachableLicense.selectedObjects;
    }
    return exports.getSelectedLicenseNameAndAuthPara( data, selectedLicenses );
};

/**
 * Prepares the input for the attachLicenses SOA. Create the array of licenses and auth-para separately maintaining
 * the order
 *
 * @param {object} - the JSON object
 *
 *
 */
export let getSelectedLicensesforEdit = function( data ) {
    data.itarEditMode = true;
    data.selectedLicenses = data.dataProviders.availableLicenses.selectedObjects;
};

/**
 * Prepares the input for the attachLicenses SOA. Create the array of licenses and auth-para separately maintaining
 * the order
 *
 * @param {object} - the JSON object
 *
 *
 */
export let checkSelected = function( data ) {
    var eventData = data.eventData;
    data.enableEdit = false;
    _.forEach( eventData.selectedObjects, function( o ) {
        if( o.modelType.typeHierarchyArray.indexOf( ITAR_LICENSE ) !== -1 ) {
            data.enableEdit = true;
        }
    } );
};

/**
 * Sets cell properties on license objects from selected objects properties
 *
 * @param {data} - data
 *
 *
 */
export let updateLicenses = function( data, detachFlag ) {
    var eventData = data.eventData;
    var selectedObjects = appCtxSvc.ctx.license.adaptedObjects;
    _.forEach( selectedObjects, function( selected ) {
        var eadPara = selected.props.ead_paragraph;
        var updFlag = false;
        if( eadPara ) {
            var vmos = [];
            var prop = {};
            var idx = 0;
            prop.key = eadPara.propertyDescriptor.displayName;
            _.forEach( eventData.viewModelObjects, function( lic, index ) {
                var vmo = ngModule.copy( lic );
                if( vmo.modelType.typeHierarchyArray.indexOf( ITAR_LICENSE ) !== -1 &&
                    !vmo.cellProperties[ prop.key ] ) {
                    updFlag = true;
                    var licenselist = selected.props.license_list;               
                    if(licenselist && licenselist.uiValues && licenselist.uiValues.length > 0)
                    {                              
                        idx = licenselist.uiValues.indexOf(vmo.props.object_name.dbValue);
                        if(idx === -1)
                        {
                            idx = index ;
                        }
                    }
                    else {
                        idx = index ;
                    }
                    if( !_.isEmpty( eadPara.dbValues ) ) {
                        prop.value = eadPara.dbValues[ idx ];
                    } else {
                        prop.value = '';
                    }
                    vmo.cellProperties[ prop.key ] = prop;
                }
                vmos.push( ngModule.copy( vmo ) );
            } );
            if( updFlag ) {
                if( detachFlag ) {
                    data.dataProviders.getDetachableLicense.update( vmos, vmos.length );
                } else {
                    data.dataProviders.getAttachedLicense.update( vmos, vmos.length );
                }
            }
        }
    } );
};

/**
 * Removes the project from the member of project list
 *
 * @param {viewModelObject} data - json object
 *
 * @param {ViewModelObject} vmo- selected project
 *
 *
 */
function removeFromSelectedLicenses( data, vmo ) {
    data.selectedLicensesUid.splice( vmo.uid, 1 );
    var viewModelObjects = data.dataProviders.selectedLicenses.viewModelCollection.loadedVMObjects;
    var selectedObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( selectedObjects, function( object ) {
        return object.uid !== vmo.uid;
    } );

    data.dataProviders.selectedLicenses.update( modelObjects );
    return modelObjects;
}

/**
 * Prepares the SOA input for the projects to assign
 *
 * @param {viewModelObject} data - json object
 * @param {ViewModelObject} vmo- selected project
 */
function removeFromAvailableLicenses( data, vmo ) {
    if( !data.selectedLicensesUid ) {
        data.selectedLicensesUid = [];
    }
    data.selectedLicensesUid.push( vmo.uid );
    var viewModelObjects = data.dataProviders.availableLicenses.viewModelCollection.loadedVMObjects;
    var availModelObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( availModelObjects, function( object ) {
        return object.uid !== vmo.uid;
    } );

    data.dataProviders.availableLicenses.update( modelObjects );
}

/**
 * Update the data providers Remove License cell command initiate the call for this function. Function removes the
 * selected license from the selected project list and assign the license back to the available list. It also apply
 * the filter if required
 *
 * @param {viewModelObject} data - json object
 * @param {ViewModelObject} vmo- selected project
 *
 */
export let addToAvailableLicenses = function( data, vmo ) {
    removeFromSelectedLicenses( data, vmo );
    var viewModelObjectsAvailList = data.dataProviders.availableLicenses.viewModelCollection.loadedVMObjects;
    var updateAvailableList = _.clone( viewModelObjectsAvailList );
    updateAvailableList.push( vmo );
    data.dataProviders.availableLicenses.update( updateAvailableList, updateAvailableList.length );
};

/**
 * Update the data providers Assign Project cell command initiate the call for this function. Function removes the
 * selected project from the available project list and assign the project back to the member project list.
 *
 * @param {viewModelObject} data - json object
 * @param {ViewModelObject} vmo - selected project
 */
export let addToSelectedLicenses = function( data, vmo ) {
    removeFromAvailableLicenses( data, vmo );
    var viewModelObjectsMemberList = data.dataProviders.selectedLicenses.viewModelCollection.loadedVMObjects;
    var updateMemberList = _.clone( viewModelObjectsMemberList );
    vmo.selected = false;
    updateMemberList.push( vmo );
    data.dataProviders.selectedLicenses.update( updateMemberList, updateMemberList.length );
    if( vmo.modelType.typeHierarchyArray.indexOf( ITAR_LICENSE ) !== -1 ) {
        vmo.activeView = 'Awp0AttachLicense';
        data.itarEditMode = true;
        data.selectedLicenses = data.dataProviders.selectedLicenses.loadedVMObjects;
    }
};

/**
 * Load auth para on selected objects
 *
 * @param {object} attributes to load
 * @param {object} objects to update
 *
 */
export let loadAuthPara = function( attributes, objects ) {
    var uids = [];
    _.forEach( objects, function( o ) {
        uids.push( o.uid );
    } );
    return dmSvc.getProperties( uids, attributes );
};

export default exports = {
    initialize,
    populateDetachList,
    getSelectedLicenseNameAndAuthPara,
    getSelectedLicensesforAttach,
    getSelectedLicensesforDetach,
    getSelectedLicensesforEdit,
    checkSelected,
    updateLicenses,
    addToAvailableLicenses,
    addToSelectedLicenses,
    loadAuthPara
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0AssignProjects
 */
app.factory( 'licenseMgmtService', () => exports );
