// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/userMgmtService
 */
import * as app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import sessionMgrSvc from 'js/sessionManager.service';
import showGDPRSvc from 'js/gdprConsentData.service';
import AwStateService from 'js/awStateService';
import localeService from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';

let exports = {};
//Navigate context key
var _navigateContext = 'navigate';
var _isFilterSet = false;
var _loadingMsg;
var _organizationCrumbMsg;

/**
 * Update context with search string
 *
 * @param {Object} searchCriteria - criteria
 */
export let updateCriteria = function( searchCriteria ) {
    _isFilterSet = true;
    var searchContext = appCtxService.getCtx( 'search' );
    searchContext.criteria.searchString = searchCriteria;
    appCtxService.updateCtx( 'search', searchContext );
    eventBus.publish( 'peopleList.loadData' );
};

/**
 * Update data provider with search results
 *
 * @param {Object} data - data
 * @param {Object} dataProvider - data provider
 */
export let updateDataProviders = function( data, dataProvider ) {
    if( _isFilterSet ) {
        _isFilterSet = false;
        dataProvider.update( data.searchResults, data.totalFound );
    }
};

export let sortResults = function( parentUid, searchResults ) {
    //Sort by creation date if the context is set
    var navigationCreateContext = appCtxService.getCtx( _navigateContext + '.' + parentUid );
    if( navigationCreateContext ) {
        //Uids are not references to the actual object
        var getRealUid = function( uid ) {
            var realMo = cdm.getObject( uid );
            if( realMo && realMo.props.awp0Target ) {
                return realMo.props.awp0Target.dbValues[ 0 ];
            }
            return uid;
        };

        //Keep the original ordering for anything that was not created
        var originalOrderingResults = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) === -1;
        } );

        //For anything that was created order by the creation date (newest first)
        var newOrderingResults = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) !== -1;
        } ).sort(
            function( a, b ) {
                var uidA = getRealUid( a.uid );
                var uidB = getRealUid( b.uid );
                return navigationCreateContext.indexOf( uidB ) -
                    navigationCreateContext.indexOf( uidA );
            } );

        return newOrderingResults.concat( originalOrderingResults );
    }

    return searchResults;
};

export let loadData = function( searchInput, columnConfigInput, saveColumnConfigData, inflateProp ) {
    return soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput,
            inflateProperties: inflateProp,
            noServiceData: false
        } )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                    delete response.searchResultsJSON;
                }

                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                    .map( function( vmo ) {
                        return viewModelObjectService
                            .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];

                // Collect all the prop Descriptors
                var propDescriptors = [];
                _.forEach( response.searchResults, function( vmo ) {
                    _.forOwn( vmo.propertyDescriptors, function( value ) {
                        propDescriptors.push( value );
                    } );
                } );

                // Weed out the duplicate ones from prop descriptors
                response.propDescriptors = _.uniq( propDescriptors, false,
                    function( propDesc ) {
                        return propDesc.name;
                    } );

                //Fix weird SOA naming
                response.searchFilterMap = response.searchFilterMap6;
                delete response.searchFilterMap6;

                //Sort by creation date if the context is set
                response.searchResults = exports.sortResults(
                    searchInput.searchCriteria.parentUid, response.searchResults );
                return response;
            } );
};

/**
 * Return display name
 *
 * @function getDisplayName
 * @memberOf NgControllers.OrgSubLocationCtrl
 *
 * @param {Object} crumbName - crumb
 *
 * @returns {Object} display name
 */
export let getDisplayName = function( crumbName ) {
    var i = crumbName.indexOf( '.' );
    return i === -1 ? crumbName : crumbName.substring( 0, i );
};

/**
 * Return object type
 *
 * @function getDisplayName
 * @memberOf NgControllers.OrgSubLocationCtrl
 *
 * @param {Object} uid - uid
 *
 * @returns {Object} display name
 */
export let getCrumbName = function( uid ) {
    var obj = cdm.getObject( uid );
    if( obj && obj.props.object_string ) {
        return obj.type + ': ' + exports.getDisplayName( obj.props.object_string.uiValues[ 0 ] );
    }
};

var _getCrumbs = function( totalFound ) {
    var crumbs = [];

    var crumb = {
        clicked: false,
        displayName: totalFound + ' Objects: ',
        selectedCrumb: false,
        showArrow: false
    };
    crumbs.push( crumb );

    if( !AwStateService.instance.params.d_uids && !AwStateService.instance.params.s_uid ) {
        //Organization
        var crumb1 = ngModule.copy( crumb );
        crumb1.displayName = _organizationCrumbMsg;
        crumbs.push( crumb1 );
    } else {
        //Groups Roles. Breadcrumb is Organization > Group > Role
        //Organization
        var crumb2 = ngModule.copy( crumb );
        crumb2.displayName = _organizationCrumbMsg;
        crumb2.showArrow = true;
        crumbs.push( crumb2 );

        if( AwStateService.instance.params.d_uids ) {
            var d_uidsArray = AwStateService.instance.params.d_uids.split( '^' );

            d_uidsArray.map( function( uid, idx ) {
                var crumb3 = ngModule.copy( crumb );
                crumb3.displayName = exports.getCrumbName( uid );

                if( idx + 1 < d_uidsArray.length || AwStateService.instance.params.s_uid ) {
                    crumb3.showArrow = true;
                }
                crumb3.scopedUid = uid;

                crumbs.push( crumb3 );
            } );
        }
    }
    return crumbs;
};

/**
 * Sublocation specific override to build breadcrumb
 *
 * @function buildNavigateBreadcrumb
 * @memberOf NgControllers.NativeSubLocationCtrl
 *
 * @param {String} totalFound - Total number of results in PWA
 * @param {Object[]} selectedObjects - Selected objects
 * @returns {Object} provider
 */
export let buildNavigateBreadcrumb = function( totalFound, selectedObjects ) {
    //If total found is not set show loading message
    if( totalFound === undefined ) {
        var baseCrumb = {
            displayName: _loadingMsg,
            clicked: false,
            selectedCrumb: true,
            showArrow: false
        };

        return {
            crumbs: [ baseCrumb ]
        };
    }

    var provider = {
        crumbs: _getCrumbs( totalFound )
    };

    //Add selected object crumb
    if( provider.crumbs.length > 0 && selectedObjects && selectedObjects.length === 1 ) {
        var vmo = selectedObjects[ 0 ];
        var crumb = {
            clicked: false,
            displayName: exports.getCrumbName( vmo.uid ),
            scopedUid: vmo.uid,
            selectedCrumb: false,
            showArrow: true
        };

        provider.crumbs.push( crumb );
    }

    if( provider.crumbs.length > 0 ) {
        var lastCrumb = provider.crumbs[ provider.crumbs.length - 1 ];

        //Don't show last crumb as link
        lastCrumb.selectedCrumb = true;
        lastCrumb.showArrow = false;
    }
    return provider;
};

/**
 * Functionality to trigger logout session, once users revoke their consent
 **/
export let revokeGDPRConsentClick = function() {
    showGDPRSvc.recordUserConsent( false ).then( function()
        {
            sessionMgrSvc.terminateSession();
        }

    );

};

/**
 * Functionality to trigger logout session, once users revoke their consent
 **/
export let cancelRevoke = function( data ) {
    data.revokeGDPRConsent.dbValue = false;
};

/**
 * Functionality to trigger after selecting bread crumb
 *
 * @param {Object} crumb - selected bread crumb object
 */
export let onSelectCrumb = function( crumb ) {
    if( AwStateService.instance.params.d_uids ) {
        var d_uids = AwStateService.instance.params.d_uids.split( '^' );
        var uidIdx = d_uids.indexOf( crumb.scopedUid );

        var d_uidsParam = uidIdx !== -1 ? d_uids.slice( 0, uidIdx + 1 ).join( '^' ) : null;
        var s_uidParam = d_uids ? d_uids : AwStateService.instance.params.uid;

        AwStateService.instance.go( '.', {
            d_uids: d_uidsParam,
            s_uid: s_uidParam
        } );
    }
};

var loadConfiguration = function() {
    localeService.getLocalizedText( app.getBaseUrlPath() + '/i18n/UIMessages', 'loadingMsg', true ).then(
        function( msg ) {
            _loadingMsg = msg;
        } );
    localeService.getLocalizedText( app.getBaseUrlPath() + '/i18n/UsermanagementMessages', 'organizationTitle', true )
        .then( function( msg ) {
            _organizationCrumbMsg = msg;
        } );
};

loadConfiguration();

export default exports = {
    updateCriteria,
    updateDataProviders,
    sortResults,
    loadData,
    getDisplayName,
    getCrumbName,
    buildNavigateBreadcrumb,
    revokeGDPRConsentClick,
    cancelRevoke,
    onSelectCrumb
};
app.factory( 'userMgmtService', () => exports );
