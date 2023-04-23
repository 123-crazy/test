// Copyright (c) 2020 Siemens

/**
 * @module js/navigationTokenService
 */
import * as app from 'app';
import cfgSvc from 'js/configurationService';
import cdm from 'soa/kernel/clientDataModel';
import adapterParserService from 'js/adapterParserService';
import declarativeDataCtxSvc from 'js/declarativeDataCtxService';
import navigationService from 'js/navigationService';
import viewModelSvc from 'js/viewModelService';
import viewModelObjectService from 'js/viewModelObjectService';
import _ from 'lodash';

var _navigationToken;
var exports = {};

// A property is which type of BO will be driven by solution config , based on the same naivigationToken will be associated in the href attribute of
// anchor tag for the particular property

// Example :
/* [{"conditions": {"$and": [{ "modelType.typeHierarchyArray": { "$in": "ImanFile" }}]},
     "navigations": {"navigateTo": "downloadFile","navigationParams": {"uid": "{{navContext.vmo.uid}}"}  }
    },
    {"conditions": {"modelType.typeHierarchyArray": {"$notin": "ImanFile"}},
     "navigations": {"navigateTo": "com_siemens_splm_clientfx_tcui_xrt_showObject","navigationParams": {"uid": "{{navContext.vmo.uid}}" }  }
    }
    ]
*/
export let getNavigationContent = function( scope, dbValue, vmo ) {
    var conditionVerdict = {};

    if( vmo && vmo.navigation ) {
        return navigationService.navigate( vmo.navigation[ 0 ].navigateTo, vmo.navigation[ 0 ].navigationParams ).then( function( urlDetails ) {
            return urlDetails;
        } );
    }

    return cfgSvc.getCfg( 'navigationURLToken' ).then( function( token ) {
        _navigationToken = token;
        if( _navigationToken && _navigationToken.length > 0 ) {
            // the below cdm check has been added to avoid any console errors when an OBJECT prop is not a VMO which ultimately shows up console errors
            // emanating out of a logger.error statement in constructViewModelObjectFromModelObject ()
            // it will be removed once cdm dependency is taken out from SWF
            if( cdm.getObject( dbValue ) !== null ) {
                var propVmo = viewModelObjectService.constructViewModelObjectFromModelObject( cdm.getObject( dbValue ), null, null, null, true );

                scope.navContext = {
                    vmo: propVmo
                };
                conditionVerdict = adapterParserService.applyConditions( propVmo, _navigationToken );
                if( conditionVerdict && conditionVerdict.verdict ) {
                    var inputData = _.cloneDeep( _navigationToken[ conditionVerdict.index ].navigations.navigationParams );
                    try {
                        var declViewModel = viewModelSvc.getViewModel( scope, true );
                        if( declViewModel !== null ) {
                            declarativeDataCtxSvc.applyScope( declViewModel, inputData, null, scope, null );
                        } else {
                            inputData = {
                                uid: propVmo.uid
                            };
                        }
                    } catch ( error ) {
                        throw new Error( error );
                    }
                    return declarativeDataCtxSvc.applyExpression( inputData ).then( function() {
                        return navigationService.navigate( _navigationToken[ conditionVerdict.index ].navigations, inputData ).then( function( urlDetails ) {
                            return urlDetails;
                        } );
                    } );
                }
            }
        }
    } );
};

exports = {
    getNavigationContent
};
export default exports;
/**
 * This service .
 *
 * @memberof NgServices
 * @member navigationTokenService
 *
 * @param {configurationService} cfgSvc - Service to use.
 *
 * @returns {navigationTokenService} Reference to service API Object.
 */
app.factory( 'navigationTokenService', () => exports );
