// @<COPYRIGHT>@
// ===========================================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ===========================================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * A service that manages the preferences and its category.<br>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/createPreferencesService
 */

import * as app from 'app';
import prefService from 'js/adminPreferencesService';
import adminPreferenceUserUtil from 'js/adminPreferenceUserUtil';
import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import localeService from 'js/localeService';
import cmdPanelService from 'js/commandPanel.service';
import editPrefService from 'js/editAdminPreferenceService';
import appCtxSvc from 'js/appCtxService';
import modelPropertySvc from 'js/modelPropertyService';
import _ from 'lodash';
import declUtils from 'js/declUtils';

var exports = {};

var _localTextBundle = null;

// Allowed Override Instance Scopes for Group/Role/User
var _groupScope = [ 'Group' ];
var _roleScope = [ 'Group', 'Role' ];
var _userScope = [ 'Group', 'Role', 'User' ];

/**
 * Array of interdependent preferences
 * Only preferences that are not interdependent can be overriden by a user
 */
var _interdependentPreferences = [ 'ColumnsShownPref', 'ColumnWidthsPref', 'ColumnsHiddenPref', '_columns_shown', '_columns_hidden', '_widths_shown', //
    '_widths_hidden', 'ColumnPreferences', 'ColumnWidthPreferences', 'ShownPrefWidth', 'ShownWidthPref', 'ShownWidthsPref', 'HiddenPrefWidth', 'HiddenWidthPref', //
    'HiddenWidthsPref', 'Live Update', 'BMIDE_ALLOW_LIVE_UPDATES', '__LicenseUsage_allotted_usage_days', '__LicenseUsage_allotted_usage_hours', //
    '__LicenseUsage_allotted_grace_days', '__LicenseUsage_allotted_grace_hours', '__LicenseUsage_module_grace_usage', 'PSM_default_configurator_context'
];

/**
 * Creates the new preference definition by calling the setPreferencesDefinition SOA API
 * @param {Object} data - the full data containing input from the user
 * @param {String} errorMessage the string containing the error message for duplicating a preference name
 *
 * @return {Promise} resets the data variables in adminPreferencesService so that the getPreferences SOA can be called
 * to get the new preference and repopulate the _preferenceInstances and _preferenceFilters global variables
 */
export let createPreference = function( data, errorMessage ) {
    var prefs = prefService.getAllPreferences();
    for( var i = 0; i < prefs.length; i++ ) {
        if( prefs[ i ].definition.name === data.fnd0PreferenceName.dbValue ) {
            var deferred = AwPromiseService.instance.defer();
            deferred.reject( errorMessage.substr( 0, errorMessage.indexOf( ' ' ) ) + ' \'' + data.fnd0PreferenceName.dbValue + '\' ' + errorMessage.substr( errorMessage.indexOf( ' ' ) + 1 ) );
            return deferred.promise;
        }
    }

    var values = data.fnd0PreferenceValues.displayValues;
    if( values && values.length === 1 && values[ 0 ] === '' ) {
        // Older versions 11.5/12.0 treat this as site location. Need to reset to empty array since it is None case.
        values = [];
    }

    var setPreferencesInput = {
        preferenceInput: [ {
            definition: {
                name: data.fnd0PreferenceName.dbValue,
                category: data.fnd0ProductArea.dbValue,
                description: data.fnd0Description.dbValue,
                protectionScope: data.fnd0ProtectionScope.dbValue,
                isEnvEnabled: data.fnd0Environment.dbValue,
                type: prefService.convertValueTypeToInt( data.fnd0ValueType.dbValue ),
                isArray: data.fnd0IsMultiValue.dbValue
            },
            values: values
        } ]
    };

    return soaService
        .postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesDefinition', setPreferencesInput )
        .then( function( response ) {
            var err = adminPreferenceUserUtil.handleSOAResponseError( response );
            if( !_.isUndefined( err ) ) {
                return adminPreferenceUserUtil.getRejectionPromise( err );
            }
            prefService.resetService();
            return {
                name: data.fnd0PreferenceName.dbValue,
                location: exports.getLocationAfterSOACall( values )
            };
        } );
};

/**
 * Get the location after creation of preference.
 *
 * @param  {Object} values - values of preference
 *
 * @returns {Object} - Location after creation of preference.
 */
export let getLocationAfterSOACall = function( values ) {
    if( values && values.length > 0 && values[ 0 ].length > 0 ) {
        return _localTextBundle.Site;
    }
    return _localTextBundle.None;
};

/**
 * Creates the new user preference instance by calling the setPreferences2 SOA API, which sets the value for the
 * given preference name
 * @param {Object} data the full data containing input from the user
 *
 * @return {Promise} resets the data variables in adminPreferencesService so that the getPreferences SOA can be called
 * to get the new preference and repopulate the _preferenceInstances and _preferenceFilters global variables
 */
export let createUserOverride = function( data ) {
    var values = data.fnd0PreferenceValues.displayValues;
    var locationObj = data.overrideLocationList.dbValues.length > 1 ? data.fnd0LocationLOV.dbValue : data.fnd0Location.dbValue;

    var preferencesInput = {
        setPreferenceIn: [ {
            location: {
                object: locationObj.object
            },
            preferenceInputs: {
                preferenceName: data.fnd0PreferenceName.dbValue,
                values: values
            }
        } ]
    };

    return soaService
        .postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesAtLocations',
            preferencesInput )
        .then( function( response ) {
            var err = adminPreferenceUserUtil.handleSOAResponseError( response );
            if( !_.isUndefined( err ) ) {
                return adminPreferenceUserUtil.getRejectionPromise( err );
            }
            prefService.resetService();
            return {
                name: data.fnd0PreferenceName.dbValue,
                location: locationObj.displayName
            };
        } );
};

/**
 * canAddInstanceAllowed returns true or false If add instance allowed or not
 *
 * @param {String} type parent node type(Group/Role/User)
 * @param {String} protectionScope Protection Scope
 *
 * @returns {boolean} canAddInstance
 */
function canAddInstanceAllowed( type, protectionScope ) {
    var canAddInstance = false;

    switch ( protectionScope ) {
        case 'Group':
            canAddInstance = _groupScope.includes( type );
            break;
        case 'Role':
            canAddInstance = _roleScope.includes( type );
            break;
        case 'User':
            canAddInstance = _userScope.includes( 'User' );
            break;
    }
    return canAddInstance;
}

/**
 * generateParentsObject generates Parent object
 *
 * @param {String} type User/Group/Role
 * @param {String} instanceName name of instance
 * @param {Object} obj selected object
 *
 * @returns {Object} Parent Object
 */
function generateParentsObject( type, instanceName, obj ) {
    var displayName = prefService.generateLocationDisplayName( type, instanceName );
    return { displayName: displayName, object: obj };
}

/**
 * createOverrideLOVList method creates possible override options list on the basis of conditions
 *
 * @param {Array} preferenceInstances Existing instances of selected preference in table
 * @param {Array} parents All parents of selected organization tree node
 * @param {Object} selectedPreference Selected Preference from table
 *
 * @returns {boolean} canAddInstance
 */
export let createOverrideLOVList = function( preferenceInstances, parents, selectedPreference ) {
    var overrideLOVList = [];
    var isInstanceAvailable = false;
    for( var i = 0; i < parents.length; i++ ) {
        isInstanceAvailable = false;
        if( preferenceInstances.length > 1 ) {
            for( var j = 0; j < preferenceInstances.length; j++ ) {
                if( preferenceInstances[ j ].locationInfo.location.uiVal !== _localTextBundle.Site && preferenceInstances[ j ].locationInfo.location.uiVal !== _localTextBundle.None &&
                    preferenceInstances[ j ].locationInfo.location.uiVal !== _localTextBundle.Env &&
                    preferenceInstances[ j ].locationInfo.location.orgObject.orgDisplayName === parents[ i ].displayName ) {
                    isInstanceAvailable = true;
                    break;
                }
            }
        }
        if( !isInstanceAvailable ) {
            var canAddInstance = false;
            if( parents[ i ].type !== 'Site' ) {
                canAddInstance = canAddInstanceAllowed( parents[ i ].object.type, selectedPreference.props.fnd0ProtectionScope.dbValue );
            }
            if( canAddInstance ) {
                overrideLOVList.push( generateParentsObject( parents[ i ].object.type, parents[ i ].displayName, parents[ i ].object ) );
            }
        }
    }
    return overrideLOVList.reverse();
};

/**
 * Returns a boolean indicating whether a user can override the current selected preference
 * @param {Object} selectedPreference the currently selected preference
 * @param {Object} ctx context
 *
 * @return {Boolean} true if user can override the preference value, false otherwise
 */
export let updateUserOverrideCtx = function( selectedPreference, ctx ) {
    var isUserOverrideValid = false;

    var isSystemAdmin = adminPreferenceUserUtil.isSystemAdmin();
    var isGroupAdmin = adminPreferenceUserUtil.isGroupAdmin();

    if( !_.isUndefined( selectedPreference ) && selectedPreference !== null && selectedPreference !== '' ) {
        var preferenceMap = prefService.getPrefFilters();
        var preferenceInstances = preferenceMap.get( selectedPreference.props.fnd0ProductArea.dbValue ).get( selectedPreference.props.fnd0PreferenceName.dbValue );

        // Normal User Override
        if( !isSystemAdmin && !isGroupAdmin && preferenceInstances[ 0 ].definition.protectionScope === 'User' && !hasPreferenceUserInstance( preferenceInstances ) //
            &&
            !isPreferenceInterdependentPreference( preferenceInstances[ 0 ].definition.name ) ) {
            isUserOverrideValid = true;
            var userObject = adminPreferenceUserUtil.getUserSession().props.user;
            var obj = { type: 'User', uid: userObject.dbValues[ 0 ] };
            ctx.overrideLOVList = [];
            ctx.overrideLOVList.push( generateParentsObject( prefService.getUserType(), userObject.uiValues[ 0 ], obj ) );
        } else if( ( isSystemAdmin || isGroupAdmin ) && ctx.selectedTreeNode && preferenceInstances[ 0 ].definition.protectionScope !== 'Site' && !isPreferenceInterdependentPreference( preferenceInstances[ 0 ].definition.name ) ) {
            // System Admin/ Group Admin Override
            var overrideLOVList = exports.createOverrideLOVList( preferenceInstances, ctx.parents, selectedPreference );
            if( overrideLOVList.length > 0 ) {
                isUserOverrideValid = true;
                ctx.overrideLOVList = overrideLOVList;
            }
        }
    }
    return isUserOverrideValid;
};

/**
 * Activate a panel to create preference definition.
 * It will first check any unsaved modifications on summary page.
 * If there is any  unsaved modifications, it will prompt confirmation dialog to save or discard the modifications.
 * If there is NO unsaved modifications, it will open the panel to create preference definition.
 *
 * @param {String} commandId - ID of the command to open. Should map to the view model to activate.
 * @param {String} location - Which panel to open the command in. "aw_navigation" (left edge of screen) or "aw_toolsAndInfo" (right edge of screen)
 * @param {Object} prefCtx - context for the preferences page
 *
 */
export let activateCommandPanel = function( commandId, location, prefCtx ) {
    var hasUnsavedEdits = adminPreferenceUserUtil.checkUnsavedEdits();
    prefCtx.isUserOverrideValid = true;
    if( hasUnsavedEdits ) {
        adminPreferenceUserUtil.handleUnsavedEdits( prefCtx );
    } else {
        cmdPanelService.activateCommandPanel( commandId, location );
    }
};

/**
 * Activates the user override command panel
 * @param {String} cmdId - id command that we are activating
 * @param {String} location - location of the command
 * @param {Object} selectedRow - selected row( preference ) in table
 * @param {Array} overrideLocationList - List of override options
 * @param {Object} prefCtx - context for the preferences page
 *
 */
export let activateUserOverridePanel = function( cmdId, location, selectedRow, overrideLocationList, prefCtx ) {
    var hasUnsavedEdits = adminPreferenceUserUtil.checkUnsavedEdits();
    if( hasUnsavedEdits ) {
        adminPreferenceUserUtil.handleUnsavedEdits( prefCtx );
    } else {
        if( selectedRow !== null ) {
            var overrideLocationLOVList = exports.getOverrideLocationList( overrideLocationList );
            var isLocationLOVVal = overrideLocationLOVList.length > 1;
            var productArea = selectedRow.props.fnd0ProductArea.dbValue;
            var prefName = selectedRow.props.fnd0PreferenceName.dbValue;
            var locationForSelectedPref = selectedRow.props.fnd0Location.uiValue;

            var selPref = prefService.getSelectedPreferenceInstance( productArea, prefName, locationForSelectedPref );

            // if the type is Date, we need to create the timestamp so that the dbValue is
            // created correctly when creating the ViewModelProperty, since the dbValue for
            // date type is not a string like the other preference types
            // var vals = _.cloneDeep( selPref.locationInfo.values );
            // if( selPref.definition.type === 'Date' ){
            //     if( _.isString( vals ) ){
            //         vals = ( new Date( vals ) ).getTime();
            //     } else {
            //         for( var i = 0; i < vals.length; i++ ){
            //             vals[ i ] = ( new Date( vals[ i ] ) ).getTime();
            //         }
            //     }
            // }

            var prefAttrs = {
                name: selPref.definition.name,
                productArea: selPref.definition.category,
                description: selPref.definition.description,
                protectionScope: selPref.definition.protectionScope,
                environment: selPref.definition.isEnvEnabled,
                valueType: selPref.definition.type,
                isArray: selPref.definition.isArray,
                isArrayDisplay: editPrefService.getDisplayValueForBoolean( selPref.definition.isArray ),
                locationText: 'User (' + appCtxSvc.getCtx( 'userSession.props.user_id.dbValues.0' ) + ')',
                values: _.cloneDeep( selPref.locationInfo.values ),
                valuesDisplay: _.cloneDeep( selPref.locationInfo.values ),
                valuesVMType: editPrefService.getVMPropertyType( selPref.definition.isArray, selPref.definition.type ),
                overrideLocationList: overrideLocationLOVList,
                isLocationLOV: isLocationLOVVal
            };

            var context = {
                sourcePref: prefAttrs
            };
            cmdPanelService.activateCommandPanel( cmdId, location, context );
        }
    }
};

/**
 * Close the currently open panel and re-create the vmProperty for values field.
 * @param {String} cmdId the id command that we are activating
 * @param {String} location the location of the command
 * @param {Object} vmData the data from the view model
 * @param {Object} ctx context
 *
 */
export let createOverrideSelectionChange = function( cmdId, location, vmData, ctx ) {
    // This is WA to fix the issue when creating a user override and user switch the row selection between multi-valued preferences
    // the panel was showing the values from previous selection. Framework is not updating the values.
    var evtData = vmData.eventData;
    var selectedObj = null;
    if( evtData && evtData.selectionModel ) {
        var selObjArray = evtData.selectionModel.getSelection();
        if( selObjArray && selObjArray.length > 0 ) {
            selectedObj = selObjArray[ 0 ];
            if( selectedObj ) {
                var productArea = selectedObj.props.fnd0ProductArea.dbValue;
                var prefName = selectedObj.props.fnd0PreferenceName.dbValue;
                var locationForSelectedPref = selectedObj.props.fnd0Location.uiValue;

                var selPref = prefService.getSelectedPreferenceInstance( productArea, prefName, locationForSelectedPref );
                var prefAttrs = {
                    isArray: selPref.definition.isArray,
                    values: _.cloneDeep( selPref.locationInfo.values ),
                    valuesUi: _.cloneDeep( selPref.locationInfo.values ),
                    valuesDisplay: _.cloneDeep( selPref.locationInfo.values ),
                    valuesVMType: editPrefService.getVMPropertyType( selPref.definition.isArray )
                };

                var valuesVMPropAttrs = {};
                valuesVMPropAttrs.displayName = vmData.fnd0PreferenceValues.propertyDisplayName;
                valuesVMPropAttrs.type = prefAttrs.valuesVMType;
                valuesVMPropAttrs.dbValue = prefAttrs.values;
                valuesVMPropAttrs.uiValue = prefAttrs.valuesUi;
                valuesVMPropAttrs.dispValue = prefAttrs.valuesDisplay;
                valuesVMPropAttrs.isArray = prefAttrs.isArray;

                var valuesVMProp = modelPropertySvc.createViewModelProperty( valuesVMPropAttrs );
                declUtils.consolidateObjects( vmData.fnd0PreferenceValues, valuesVMProp );
            }
        }
    }
    if( selectedObj !== null ) {
        var isUserOverrideValid = exports.updateUserOverrideCtx( selectedObj, ctx );
        if( isUserOverrideValid ) {
            cmdPanelService.activateCommandPanel( cmdId, location );
        }
    }
};

/**
 * Populates the product area listbox and the protection scope listbox for create
 * @param {Object} vmData the data from the view model
 * @param {Object} sourcePref the source preference
 */
export let populateLists = function( vmData ) {
    // build the product area list
    vmData.productAreaList = prefService.getProductAreaList();
    var emptyProductArea = {
        propDisplayValue: '',
        propInternalValue: '',
        sel: false,
        attn: false,
        isEmptyEntry: true
    };
    vmData.productAreaList.unshift( emptyProductArea );

    // build protection scope list
    vmData.protectionScopeList = prefService.getProtectionScopes( vmData.localizedProtectionScopes );
};

/**
 * Updates the viewModelProperty object for values field based on selection of type and array\non-array
 * @param {Object} vmData the data from the view model
 */
export let updateValuesVMProp = function( vmData ) {
    var isArray = vmData.fnd0IsMultiValue.dbValue;
    var valueType = vmData.fnd0ValueType.dbValue;

    var vmPropType = editPrefService.getVMPropertyType( isArray, valueType );
    var propAttrHolder = {
        displayName: vmData.fnd0PreferenceValues.propertyDisplayName,
        type: vmPropType,
        isArray: String( isArray )
    };
    var valuesVMProp = modelPropertySvc.createViewModelProperty( propAttrHolder );
    declUtils.consolidateObjects( vmData.fnd0PreferenceValues, valuesVMProp );
};

/**
 * Returns a boolean indicating whether the preference is one of the inderdependent preferences
 * @param {String} preferenceName the name of the preference
 *
 * @return {Boolean} true if the preference is an interdependent preference, false otherwise
 */
var isPreferenceInterdependentPreference = function( preferenceName ) {
    var isInterdependentPref = false;
    for( var i = 0; i < _interdependentPreferences.length; i++ ) {
        if( preferenceName.indexOf( _interdependentPreferences[ i ] ) !== -1 ) {
            isInterdependentPref = true;
            break;
        }
    }
    return isInterdependentPref;
};

/**
 * Returns a boolean indicating whether the preference is single or multivalue
 * @param {Array} preferenceInstances an array of preference instances for a preference
 *
 * @return {Boolean} true if the user instance exists, false otherwise
 */
var hasPreferenceUserInstance = function( preferenceInstances ) {
    var hasUserInstance = false;
    for( var i = 0; i < preferenceInstances.length; i++ ) {
        if( preferenceInstances[ i ].locationInfo.location.prefLoc === 'User' ) {
            hasUserInstance = true;
            break;
        }
    }
    return hasUserInstance;
};

/**
 * @param {Array} listValues an array of Override Options
 *
 * @returns {Array} an array of Override Options List with localized names
 */
export let getOverrideLocationList = function( listValues ) {
    var locations = [];

    for( var i = 0; i < listValues.length; i++ ) {
        locations.push( _getListObject( listValues[ i ].displayName, listValues[ i ] ) );
    }
    return locations;
};

/**
 * like the listbox service helper methods --- cloned from there.
 *
 * @param {String} uiVal display value
 * @param {String} dbVal internal value
 *
 * @return {Object} model object
 */
var _getListObject = function( uiVal, dbVal ) {
    var listModel = {
        propDisplayValue: uiVal,
        propInternalValue: dbVal,
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
    return listModel;
};

_localTextBundle = localeService.getLoadedText( 'preferenceMessages' );

export default exports = {
    createPreference,
    getLocationAfterSOACall,
    createUserOverride,
    createOverrideLOVList,
    updateUserOverrideCtx,
    activateCommandPanel,
    activateUserOverridePanel,
    createOverrideSelectionChange,
    populateLists,
    updateValuesVMProp,
    getOverrideLocationList
};
/**
 * Register the service
 *
 * @memberof NgServices
 * @member createPreferencesService
 *
 * @param {Object} prefService admin pref service functions
 * @param {Object} adminPreferenceUserUtil admin pref user util functions
 * @param {Object} soaService soa service functions
 * @param {Object} $q functions
 * @param {Object} localeService locale service functions
 * @param {Object} cmdPanelService command panel service functions
 * @param {Object} editPrefService edit pref functions
 * @param {Object} appCtxSvc app ctx service functions
 * @param {Object} modelPropertySvc model property functions
 *
 * @returns {Object} export functions
 */
app.factory( 'createPreferencesService', () => exports );
