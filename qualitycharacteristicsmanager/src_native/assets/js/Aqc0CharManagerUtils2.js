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
 * This file is used as utility file for characteristics manager from quality center foundation module
 *
 * @module js/Aqc0CharManagerUtils2
 */
import app from 'app';
import cmm from 'soa/kernel/clientMetaModel';
import appCtxService from 'js/appCtxService';
import tcSessionData from 'js/TcSessionData';
import awSvrVer from 'js/TcAWServerVersion';
import Aqc0CharManagerUtils from 'js/Aqc0CharManagerUtils';
import navigationSvc from 'js/navigationService';
import soaSvc from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';

var exports = {};

var VAR_CHAR_TYPE = 'Qc0VariableCharSpec';
var VIS_CHAR_TYPE = 'Qc0VisualCharSpec';
var ATT_CHAR_TYPE = 'Qc0AttributiveCharSpec';
var CHAR_GROUP_TYPE = 'Qc0CharacteristicsGroup';


var queryNameInput = {
    inputCriteria: [ {
        queryNames: [
            '_find_latest_charSpec_from_selected'
        ]
    } ]
};

//get Tc major and minor version
var tcMajor = tcSessionData.getTCMajorVersion();
var tcMinor = tcSessionData.getTCMinorVersion();

//get Aw Server version
var awServerVersion = awSvrVer.baseLine;
awServerVersion = awServerVersion.split( 'x' )[0];

//
/**
 * Gets the characteristic group from location context or from the selection.
 *
 * @return {object} characteristic group object.A null object is returned if no
 * characteristic group is found.
 */
export let getCharacteristicGroupObject = function() {
    if ( appCtxService.ctx.locationContext && appCtxService.ctx.locationContext.modelObject && appCtxService.ctx.locationContext.modelObject.type === 'Qc0CharacteristicsGroup' ) {
        return appCtxService.ctx.locationContext.modelObject;
    } else if ( appCtxService.ctx.selected && appCtxService.ctx.selected.type === CHAR_GROUP_TYPE ) {
        return appCtxService.ctx.selected;
    }
    return null;
};
/**
 * This method is called when the create specification panel is revealed.This method finds the type of the object to be created from the parent group type.
 * @param {object} data  data
 */
export let initialiseCreatePanel = function( data ) {
    // Read the characteristics group object and save it in data.Group information will be
    // later read from the data while we call the create object soa .
    data.qc0GroupReference = exports.getCharacteristicGroupObject();
    var parentObjType = data.qc0GroupReference.props.qc0CharacteristicsType.dbValues[0];
    if ( parentObjType === 'Variable' ) {
        data.createObject.type = VAR_CHAR_TYPE;
        data.createObject.typeName = cmm.getType( VAR_CHAR_TYPE ).displayName;
    } else if ( parentObjType === 'Attributive' ) {
        data.createObject.type = ATT_CHAR_TYPE;
        data.createObject.typeName = cmm.getType( ATT_CHAR_TYPE ).displayName;
    } else if ( parentObjType === 'Visual' ) {
        data.createObject.type = VIS_CHAR_TYPE;
        data.createObject.typeName = cmm.getType( VIS_CHAR_TYPE ).displayName;
    }

    //get supported properties

    getSupportedProperties( data );
};

/**
 * This method is used to get the Classification LOV values for the Create/Save As/Edit char spec panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getClassificationLOVList = function( response ) {
    if ( !appCtxService.ctx.isTC13_2OnwardsSupported ) {
        return Aqc0CharManagerUtils.getLOVList( response );
    }
        return response.lovValues.map( function( obj ) {
            return {
                propDisplayValue: obj.propDisplayValues.lov_values[0],
                propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[0] : obj.propDisplayValues.lov_values[0],
                propInternalValue: obj.propInternalValues.lov_values[0],
                iconName: obj.propInternalValues.lov_values[0]
            };
        } );
};

/*
* function to check if server supported for tc132 or above tc13 supported
*/

self.isTc132OrAboveTC13VersionSupported = function() {
    if ( tcMajor > 13 || tcMajor === 13 && tcMinor >= 2 ) {
        return true;
    }
    return false;
};

/*
* function to check if server supported for aw5.213x or above aw version supported
*/
export let isAw5213xOrAboveVersionSupported = function() {
    if ( awServerVersion >= 'aw5.2.0.13' ) {
        return true;
    }
    return false;
};

/*
* function to check if server supported for tc131 or above tc13 supported
*/
self.isTc131OrAboveTc13VersionSupported = function() {
    if ( tcMajor > 13 || tcMajor === 13 && tcMinor >= 1 ) {
        return true;
    }
    return false;
};

/**
 * This method is used to check whether visual indicator  is supported or not if yes show below properties from custom panel else fetch it from XRT.
 * @param {Object} data input data object
 **/
export let getClassificationPropSupportedVersion = function( data ) {
    //show Classification display name only if tc version is 13.2 and above else show Criticality
    if ( appCtxService.ctx.isTC13_2OnwardsSupported ) {
        if ( appCtxService.ctx.sidenavCommandId === 'Aqc0AddCharSpecification' ) {
            data.qc0Criticality.propertyDisplayName = data.i18n.ClassificationType;
        }
    } else if ( appCtxService.ctx.sidenavCommandId === 'Aqc0AddCharSpecification' ) {
        data.qc0Criticality.propertyDisplayName = data.i18n.Criticality;
    }
};

/**
 * This method is used to check whether ok condition/not k condition is supported or not if yes show below properties from custom panel else fetch it from XRT.
 * @param {Object} data input data object
 **/
self.getOkConditionPropSupportedVersion = function( data ) {
    //show ok condition/not ok condition display name only if tc version is 13.1 and above else show Criticality
    if ( self.isTc131OrAboveTc13VersionSupported() ) {
        if ( appCtxService.ctx.sidenavCommandId === 'Aqc0AddCharSpecification' ) {
            data.qc0OkDescription.propertyDisplayName = data.i18n.OkCondition;
            data.qc0NokDescription.propertyDisplayName = data.i18n.NotOkCondition;
        }
    } else if ( appCtxService.ctx.sidenavCommandId === 'Aqc0AddCharSpecification' ) {
        data.qc0OkDescription.propertyDisplayName = data.i18n.OkDescription;
        data.qc0NokDescription.propertyDisplayName = data.i18n.NotOkDescription;
    }
};

/**
 * This method is used to check whether ok condition and visual indicatore supported by aw/tc version.
 * @param {Object} data input data object
 **/
export let getSupportedProperties = function( data ) {
    getClassificationPropSupportedVersion( data );
    var xrtSummaryContextObject = appCtxService.ctx.xrtSummaryContextObject;
    if ( xrtSummaryContextObject && xrtSummaryContextObject.type === ATT_CHAR_TYPE || xrtSummaryContextObject.props.qc0CharacteristicsType && xrtSummaryContextObject.props.qc0CharacteristicsType.dbValue === 'Attributive' ) {
        self.getOkConditionPropSupportedVersion( data );
    }
};

/**
* @param {string} - name - name of queryparameter like - uid
* @returns {string} - returns query parameter value
**/
export let getQueryParamValue = function( name ) {
    var browserUrl = window.location.href;
    name = name.replace( /[\[]/, '\\\[' ).replace( /[\]]/, '\\\]' );
    var regexS = '[\\?&]' + name + '=([^&#]*)';
    var regex = new RegExp( regexS );
    var results = regex.exec( browserUrl );
    return results === null ? null : results[1];
};

/*
**To mantain selection after browser refresh for char group /char spec under characteristic Library in tree mode
*/
export let addQueryParamsToBrowserURL = function() {
    var navigationParam = {};
    var url = window.location.href;
    if ( url.indexOf( 'searchCriteria' ) > -1 ) {
        navigationParam.searchCriteria = getQueryParamValue( 'searchCriteria' );
    }
    if ( appCtxService.ctx.currentTypeSelection ) {
        navigationParam.selectedType = appCtxService.ctx.currentTypeSelection.dbValue;
    }
    var selectedObj = appCtxService.getCtx( 'selected' );
    if ( selectedObj && selectedObj.hasOwnProperty( 'uid' ) ) {
        navigationParam.s_uid = selectedObj.uid;
    }

    if ( navigationParam.hasOwnProperty( 's_uid' ) || navigationParam.hasOwnProperty( 'selectedType' ) || navigationParam.hasOwnProperty( 'searchCriteria' ) ) {
        var action = {
            actionType: 'Navigate',
            navigateTo: '#/showCharacteristicslibrary'
        };
        navigationSvc.navigate( action, navigationParam );
    }
};

/**
 * get s_uid from browser url to set the selection
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let setQueryParams = function( selectionModel ) {
    var pwaSelectionUid = [];
    var url = window.location.href;
    if ( url.indexOf( 's_uid' ) > -1 ) {
        var s_uid = getQueryParamValue( 's_uid' );
        pwaSelectionUid.push( s_uid );
    }
    if ( url.indexOf( 'selectedType' ) > -1 ) {
        var selectedType = getQueryParamValue( 'selectedType' );
        pwaSelectionUid.push( selectedType );
    }
    if ( pwaSelectionUid.length > 0 ) {
        selectionModel.setSelection( pwaSelectionUid );
    }
};

export let findLatestCharVersion = function( data, name ) {
    var latestCharSpec = null;
    var deferred = AwPromiseService.instance.defer();

    //if supported version is > TC13.2, push both the arrays with entry-value pair for release_status_list property on master char spec
    if( appCtxService.ctx.isTC13_2OnwardsSupported ) {
        var inputData = {
            searchInput: {
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Aqc0QualityBaseProvider',
                searchFilterMap6: {
                    'WorkspaceObject.object_type': [ {
                        searchFilterType: 'StringFilter',
                        stringValue: 'Qc0MasterCharSpec'
                    } ]
                },
                searchCriteria: {
                    objectType: 'Qc0MasterCharSpec',
                    isReleased: 'true',
                    sourceObjectGUID: data.currentCharSpec.uid
                },
                searchSortCriteria: []
            }
        };
        soaSvc.post( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then( function( response ) {
            var values = response.ServiceData.plain.map( function( Objuid ) {
                return response.ServiceData.modelObjects[ Objuid ];
            } );
            if( data.currentCharSpec.props.qc0BasedOnId.dbValues[ 0 ] !== values[ 0 ].props.qc0BasedOnId.dbValues[ 0 ] ) {
                latestCharSpec = values[ 0 ];
                data.latestCharSpec = latestCharSpec;
                Aqc0CharManagerUtils.getXrtViewModelForCharSpec( data, latestCharSpec, true );
            }
        }, function( reason ) {
            deferred.reject( reason );
        } );
    } else {
        var queryName = queryNameInput;
        var entriesArr = [ data.currentCharSpec.modelType.propertyDescriptorsMap.object_name.displayName,
            data.currentCharSpec.modelType.propertyDescriptorsMap.qc0IsLatest.displayName
        ];
        var valuesArr = [ name, 'true' ];
        soaSvc.post( 'Query-2010-04-SavedQuery', 'findSavedQueries', queryName ).then( function( response ) {
            var inputData = {
                query: { uid: response.savedQueries[ 0 ].uid, type: 'ImanQuery' },
                entries: entriesArr,
                values: valuesArr
            };

            soaSvc.post( 'Query-2006-03-SavedQuery', 'executeSavedQuery', inputData ).then( function( response ) {
                Object.keys( response.ServiceData.modelObjects ).map( function( key ) {
                    if( response.ServiceData.modelObjects[ key ].type === VIS_CHAR_TYPE || response.ServiceData.modelObjects[ key ].type === ATT_CHAR_TYPE ||
                        response.ServiceData.modelObjects[ key ].type === VAR_CHAR_TYPE ) {
                        latestCharSpec = response.ServiceData.modelObjects[ key ];
                        data.latestCharSpec = latestCharSpec;
                        Aqc0CharManagerUtils.getXrtViewModelForCharSpec( data, latestCharSpec, true );
                    }
                } );
            } );
        } );
    }
};

export default exports = {
    getCharacteristicGroupObject,
    initialiseCreatePanel,
    getClassificationLOVList,
    getClassificationPropSupportedVersion,
    getSupportedProperties,
    getQueryParamValue,
    isAw5213xOrAboveVersionSupported,
    addQueryParamsToBrowserURL,
    setQueryParams,
    findLatestCharVersion
};
app.factory( 'Aqc0CharManagerUtils2', () => exports );
