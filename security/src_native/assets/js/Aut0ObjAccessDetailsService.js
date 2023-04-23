// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * This module has service logic to support the Object information Access Page for AM Privileges.
 *
 * @module js/Aut0ObjAccessDetailsService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import declUtils from 'js/declUtils';
import _soaSvc from 'soa/kernel/soaService';
import _tcVmoSvc from 'js/tcViewModelObjectService';
import _uwPropSvc from 'js/uwPropertyService';
import _cdm from 'soa/kernel/clientDataModel';
import _authSvc from 'js/Aut0AuthServices';

'use strict';

var exports = {};
/**
 * function to request the Create dialog stylesheet. This uses the BMIDE defined create class which defines the
 * fields and LOVs to gather input values. This is just a dialog to gather input and state that is used for the data
 * provider/query calls.
 *
 * @return {Object} promise
 */
var getStyleSheet = function() {
    //ensure the required props are loaded via policy
    var policyDef = {
        types: [ {
            name: 'Fnd0OARAccessDlgCreI',
            modifiers: [ {
                name: 'includeIsModifiable',
                Value: 'true'
            } ],
            properties: [ {
                name: 'fnd0OARCanSeeAccessDetails'
            }, {
                name: 'fnd0OARCanSeeOthersAccess'
            }, {
                name: 'fnd0OAREvalCtxtUsr'
            }, {
                name: 'fnd0OAREvalCtxtGrp'
            }, {
                name: 'fnd0OAREvalCtxtRole'
            }, {
                name: 'fnd0OAREvalCtxtProj'
            } ]
        } ]
    };
    var entry = _authSvc.generateGetStyleSheetInputEntry( 'Fnd0OARAccessDlg', 'oarRules' );
    var serviceInput = {
        input: []
    };
    serviceInput.input.push( entry );

    return _authSvc.getSoaStyleSheet( policyDef, serviceInput );
};

/**
 * Selection change handler for the Master table grid. Based on the newly selected (or de-selected) master object,
 * clear the lower details table and async request that data.
 *
 * @param {*} data view model data
 * @param {*} evtData event data
 */
export let gridSelection = function( data, evtData ) {
    if( data ) {
        // only process the grid selection to update the details table if the priviledge indicator is set
        //if(data.fnd0OARCanSeeAccessDetails && data.fnd0OARCanSeeAccessDetails.dbValue) {
        if( data.dataProviders && data.dataProviders.detailsDataProvider &&
            data.dataProviders.detailsDataProvider.viewModelCollection ) {
            data.dataProviders.detailsDataProvider.update( [], 0 ); // clear any existing detail rows.
        }
        // select or deselect - get called for both, but only fire the event on new selection
        if( evtData && evtData.selectedObjects && evtData.selectedObjects.length > 0 ) {
            // single selection support
            var selectedObj = evtData.selectedObjects[ 0 ];
            if( selectedObj && selectedObj.props && selectedObj.props.privilegeName && selectedObj.props.privilegeName.uiValue ) {
                data.selectedPriv = selectedObj.props.privilegeName.value;
            }

            eventBus.publish( 'Aut0.refreshDetailsData', {} );
        }
    }
};

/**
 * little function to lookup the string i18n value from the view model data based on the key.
 *
 * @param {Object} vmData view model data
 * @param {String} key text key
 *
 * @return {String} column display name
 */
var getDataLabel = function( vmData, key ) {
    var result = '';
    if( vmData && vmData.i18n ) {
        if( vmData.i18n.hasOwnProperty( key ) ) {
            result = vmData.i18n[ key ];
        } else {
            result = key;
        }
    }
    return result;
};

/**
 * provide the list of columns/column configuration data for the Master info table
 *
 * @param {*} vmData view model data
 *
 * @return {Object} column list info
 */
export let loadMasterGridColumns = function( vmData ) {
    var reply = {
        columnInfos: [ {
            name: 'privilegeName',
            displayName: getDataLabel( vmData, 'privilegeName' ),
            width: 175
        }, {
            name: 'verdict',
            displayName: getDataLabel( vmData, 'verdict' ),
            width: 250
        } ]
    };
    return reply;
};

/**
 * provide the list of columns/column configuration data for the details info table
 *
 * @param {*} vmData view model data
 *
 * @return {Object} column list info
 */
export let loadDetailsGridColumns = function( vmData ) {
    var reply = {
         columnInfos: [ {
            name: 'namedACL',
            displayName: getDataLabel( vmData, 'namedACL' ),
            width: 235
        }, {
            name: 'accessor',
            displayName: getDataLabel( vmData, 'accessor' ),
            width: 130
        }, {
            name: 'rulePath',
            displayName: getDataLabel( vmData, 'rulePath' ),
            width: 638
        } ]
    };
    return reply;
};

export let loadPrivilegeInfoDetailsGridAsync = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var responseData = {};
    if( data && data.selectedPriv && data.formattedExtraProtectionInfosMap ) {
        responseData.totalFound = 1;
        responseData.searchResults = [ data.formattedExtraProtectionInfosMap[data.selectedPriv] ];
    }
    deferred.resolve( responseData );
    return deferred.promise;
};
/**
 * This is the action method for the data provider. It gets invoked on the initial page display and also will get
 * triggered by the view model when the UI input values are changed and adequate to request a new query/search.
 *
 * Prior to invoking the performSearch SOA to the data provider, need to make sure the data context to identify the
 * evaluation target is available. This is needed input for the eval data provider. No sense in calling server if
 * there is no Selected Master.
 *
 *  This will get called during the initial xrt page load as well as when the LOV value changes -
 *
 * @param {*} selected selected object in PWA
 * @param {*} vmData view model data
 *
 * @return {Promise} load async promise
 */
export let initObjPrivilegeDetailsPage = function( selected, vmData ) {
    var deferred = AwPromiseService.instance.defer();

    if( vmData ) {
        // TODO - ensure on selection change that this is the right value - if already saved???
            
            if( selected && selected.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                selected = _cdm.getObject( selected.props.awb0UnderlyingObject.dbValues[ 0 ] );
            }
            if( selected ) {
                vmData.selectedObjArray = [ selected ];
            }

        // if have not yet loaded the dialog style sheet, go get it.  For LOV changes it should already be loaded.
        if( !vmData.hasStyleSheet ) {
            getStyleSheet().then(
                function( response ) {
                    vmData.hasStyleSheet = true;
                    if( response && response.ServiceData && response.ServiceData.plain.length > 0 ) {
                        
                        // have to turn this into a VMO for the LOV interaction to work.
                        var dlgVMO = _tcVmoSvc.createViewModelObjectById( response.ServiceData.plain[0], 'CREATE' );

                        // since there is no uid in the view model, need to merge the VMO prop with the
                        // view model json data so the UI has all the context it needs.
                        _.forEach( dlgVMO.props, function( prop ) {
                            if( vmData.hasOwnProperty( prop.propertyName ) ) {
                                // save the prop ref back into the context object, for LOV reference.
                                dlgVMO.props[ prop.propertyName ] = declUtils.consolidateObjects(
                                    vmData[ prop.propertyName ], prop );
                            }
                        } );

                        vmData.fnd0OAREvalCtxtUsr.displayName = getDataLabel( vmData, 'user' );
                        vmData.fnd0OAREvalCtxtGrp.displayName = getDataLabel( vmData, 'group' );
                        vmData.fnd0OAREvalCtxtRole.displayName = getDataLabel( vmData, 'role' );

                        //set initial context since this is the first time the call to the data provider is going to be made
                        setInitialContext( selected, vmData );
                        formatUserName( vmData );
                        _soaSvc.post( 'Administration-2010-04-IRM', 'getPrivilegeNames', {} ).then( function( response ) {
                            vmData.amPrivList = response.privNameInfos.map( function( currentValue ) {
                                return currentValue.internalName;
                            } );
                          vmData.amPrivDisplayList = response.privNameInfos.map( function( currentValue ) {
                                return currentValue.displayName;
                            } );
                            eventBus.publish( 'Aut0.privilegeVerdictCheckReady' );
                            deferred.resolve( vmData );
                        } );
                        // stylesheet dialog is now loaded and the view model initialized, see if
                    }
                } );
        } else {
            // already loaded the style sheet, LOV changed, so see if we need to call query.
            //doQueryOrReturnNoData( vmData, deferred );
            eventBus.publish( 'Aut0.privilegeVerdictCheckReady' );
        }
    } else {
        deferred.reject( 'no data' );
    }

    return deferred.promise;
};

export let loadPrivilegeListGridAsync = function( vmData ) {
    var deferred = AwPromiseService.instance.defer();

    if( vmData && vmData.totalPrivFound && vmData.privSearchResults && vmData.privSearchResults.length > 0 ) {
        var responseData = {
            totalFound: vmData.totalPrivFound,
            totalLoaded: vmData.totalPrivLoaded,
            searchResults: vmData.privSearchResults
        };
        deferred.resolve( responseData );
    } else {
        deferred.resolve( {} );
    }

    return deferred.promise;
};

export let formatPrivDataForTable = function( privilegeReports, vmData ) {
    var responseData = {};

    var tempList = vmData.amPrivDisplayList;


    var formattedPrivReport = privilegeReports.map( function( currVal, index ) {
        var verdictString = currVal.verdict ? getDataLabel( vmData, 'grant' ) : getDataLabel( vmData, 'deny' );
        return {
                type: 'Privilege',
                uid: index,
                props: {
                    privilegeName: {
                        type: 'STRING',
                        hasLov: false,
                        isArray: false,
                        displayValue: currVal.privilegeName,
                        uiValue: tempList[index] ,
                        value: currVal.privilegeName,
                        propertyName: 'privilegeName',
                        propertyDisplayName: getDataLabel( vmData, 'privilege' ),
                        isEnabled: true
                    },
                    verdict: {
                        type: 'STRING',
                        hasLov: false,
                        isArray: false,
                        displayValue: verdictString,
                        uiValue: verdictString,
                        value: verdictString,
                        propertyName: 'verdict',
                        propertyDisplayName: getDataLabel( vmData, 'verdict' ),
                        isEnabled: true
                    }
                }
        };
    } );


    responseData.privSearchResults = formattedPrivReport;
    responseData.totalPrivLoaded = formattedPrivReport.length;
    responseData.totalPrivFound = formattedPrivReport.length;

    return responseData;
};

export let formatExtraProtectionInfoForTable = function( extraProtectionInfos, vmData ) {
    var formattedExtraProtectionInfosMap = extraProtectionInfos.reduce( function( obj, currentVal, index ) {
        if( currentVal.privilegeNameInfo ) {
            var namedACLString = currentVal.aclNameInfo ? currentVal.aclNameInfo.displayName : '';
            var accessorString = currentVal.accessorTypeNameInfo ? currentVal.accessorTypeNameInfo.internalName : '';
            var rulePathString = '';

            if( currentVal.rules && currentVal.ruleEvaluation && currentVal.rules.length === currentVal.ruleEvaluation.length ) {
                for( var i = currentVal.rules.length - 1; i >= 0; i-- ) {
                    rulePathString = rulePathString + currentVal.rules[i] + '(' + currentVal.ruleEvaluation[i] + ')' + '/';
                }
                rulePathString = rulePathString.substring( 0, rulePathString.length - 1 );
            }


        var formattedPrivInfoObj = {
            type: 'PrivilegeInfo',
            uid: index,
            props: {
                namedACL: {
                    type: 'STRING',
                    hasLov: false,
                    isArray: false,
                    displayValue: namedACLString,
                    uiValue: namedACLString,
                    value: namedACLString,
                    propertyName: 'namedACL',
                    propertyDisplayName: getDataLabel( vmData, 'namedACL' ),
                    isEnabled: true
                },
                accessor: {
                    type: 'STRING',
                    hasLov: false,
                    isArray: false,
                    displayValue: accessorString,
                    uiValue: accessorString,
                    value: accessorString,
                    propertyName: 'accessor',
                    propertyDisplayName: getDataLabel( vmData, 'accessor' ),
                    isEnabled: true
                },
                rulePath: {
                    type: 'STRING',
                    hasLov: false,
                    isArray: false,
                    displayValue: rulePathString,
                    uiValue: rulePathString,
                    value: rulePathString,
                    propertyName: 'rulePath',
                    propertyDisplayName: getDataLabel( vmData, 'rulePath' ),
                    isEnabled: true
                }
            },
            privilegeName: currentVal.privilegeNameInfo
        };
        obj[currentVal.privilegeNameInfo.internalName] = formattedPrivInfoObj;
    }
        return obj;
    }, {} );
    vmData.formattedExtraProtectionInfosMap = formattedExtraProtectionInfosMap;
};

/**
 * This is the function that responds to a change in the User Context LOVs. Grid rows and context LOVs are cleared based on args supplied
 *
 * @param {*} dataProviders dataProviders that populate the grid
 * @param {*} group fnd0OAREvalCtxGrp
 * @param {*} role fnd0OAREvalCtxRole
 * @param {*} proj fnd0OAREvalCtxProj
 * @param {*} vmData fnd0OAREvalCtxProj
 */
export let evalInputLovChange = function( dataProviders, group, role, proj, vmData ) {
    if( dataProviders && dataProviders.masterListDataProvider ) {
        clearRowsForGrid( dataProviders.masterListDataProvider );
    }
    if( dataProviders && dataProviders.detailsDataProvider ) {
        clearRowsForGrid( dataProviders.detailsDataProvider );
    }

    if( group ) {
        clearInputFields( group );
    }

    if( role ) {
        clearInputFields( role );
    }

    if( proj ) {
        clearInputFields( proj );
    }

    if( vmData ) {
        formatUserName( vmData );
    }
};

/**
 * utility method to clear ui property
 *
 * @param {*} property ui prop
 */
var clearInputFields = function( property ) {
    if( property ) {
        _uwPropSvc.setValue( property, [ '' ] );
        _uwPropSvc.setWidgetDisplayValue( property, [ '' ] );
    }
};

/**
 * utility method to clear grid data provider
 *
 * @param {*} selectedDataProvider vm dataProvider
 */
var clearRowsForGrid = function( selectedDataProvider ) {
    if( selectedDataProvider && selectedDataProvider.viewModelCollection ) {
        selectedDataProvider.update( [], 0 ); //clear any existing rows
    }
};

/**
 * Get the current state from the session context (current session info) and use that to initialize the page data
 * values. Those values identify the evaluation context for the access check request.
 *
 * @param {*} selected - the currently selected SOA view model object.
 * @param {*} data - view model data.
 *
 */
var setInitialContext = function( selected, data ) {
    if( data ) {
        var userDbVal = null;
        var groupDbVal = null;
        var roleDbVal = null;
        var projDbVal = null;

        var userUiVal = null;
        var groupUiVal = null;
        var roleUiVal = null;
        var projUiVal = null;

        if( _cdm ) {
            var userSession = _cdm.getUserSession();
            if( userSession && userSession.props ) {
                if( userSession.props.group ) {
                    groupDbVal = userSession.props.group.dbValues[ 0 ];
                    groupUiVal = userSession.props.group.uiValues[ 0 ];
                }
                if( userSession.props.role ) {
                    roleDbVal = userSession.props.role.dbValues[ 0 ];
                    roleUiVal = userSession.props.role.uiValues[ 0 ];
                }
                if( userSession.props.user ) {
                    userDbVal = userSession.props.user.dbValues[ 0 ];
                    userUiVal = userSession.props.user.uiValues[ 0 ];
                }
                if( userSession.props.project ) {
                    projDbVal = userSession.props.project.dbValues[ 0 ];
                    projUiVal = userSession.props.project.uiValues[ 0 ];
                }
            }

            if( data.fnd0OAREvalCtxtUsr ) {
                data.fnd0OAREvalCtxtUsr.dbValue = userDbVal;
                data.fnd0OAREvalCtxtUsr.uiValue = userUiVal;
            }
            if( data.fnd0OAREvalCtxtGrp ) {
                data.fnd0OAREvalCtxtGrp.dbValue = groupDbVal;
                data.fnd0OAREvalCtxtGrp.uiValue = groupUiVal;
            }
            if( data.fnd0OAREvalCtxtRole ) {
                data.fnd0OAREvalCtxtRole.dbValue = roleDbVal;
                data.fnd0OAREvalCtxtRole.uiValue = roleUiVal;
            }
            if( data.fnd0OAREvalCtxtProj ) {
                data.fnd0OAREvalCtxtProj.dbValue = projDbVal;
                data.fnd0OAREvalCtxtProj.uiValue = projUiVal;
            }
        }
    }
    return;
};

var formatUserName = function( vmData ) {
    vmData.userIdString = vmData.fnd0OAREvalCtxtUsr.uiValue.substring( vmData.fnd0OAREvalCtxtUsr.uiValue.indexOf( '(' ) + 1, vmData.fnd0OAREvalCtxtUsr.uiValue.indexOf( ')' ) );
    vmData.userNameString = vmData.fnd0OAREvalCtxtUsr.uiValue.split( '(' )[0].trim();
};

/* eslint-disable-next-line valid-jsdoc*/

export default exports = {
    gridSelection,
    loadMasterGridColumns,
    loadDetailsGridColumns,
    loadPrivilegeInfoDetailsGridAsync,
    initObjPrivilegeDetailsPage,
    loadPrivilegeListGridAsync,
    formatPrivDataForTable,
    formatExtraProtectionInfoForTable,
    evalInputLovChange
};

/**
 *
 * @memberof NgServices
 * @member Aut0ObjAccessDetailsService
 */
app.factory( 'Aut0ObjAccessDetailsService', () => exports );
