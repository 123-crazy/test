//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/awMessageService
 */
import app from 'app';
import AwRootScopeService from 'js/awRootScopeService';
import appCtxService from 'js/appCtxService';
import commandService from 'js/command.service';
import soaService from 'soa/kernel/soaService';
import showObjectCommandHandler from 'js/showObjectCommandHandler';
import preferenceSvc from 'soa/preferenceService';
import searchFilterService from 'js/aw.searchFilter.service';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';


var _thisScope = null;

var CONST_AWC_NewsFeed_SavedFilters = 'AWC_NewsFeed_SavedFilters'; //$NON-NLS-1$

/**
 * This return true if the message has been viewed by me
 *
 * @param {ModelObject} messageObject -- Message object
 * @return {Boolean} -- return true if the task passed in has been viewed by me
 */
export let checkTaskViewedByMe = function( messageObject ) {
    return messageObject && messageObject.props.fnd0MessageReadFlag &&
        messageObject.props.fnd0MessageReadFlag.dbValues[ 0 ] === '1';
};

/**
 *
 * setViewedByMeIfNeeded
 *
 * @function setViewedByMeIfNeeded
 */
export let setViewedByMeIfNeeded = function( mo ) {
    if( mo && !checkTaskViewedByMe( mo ) ) {
        var inputData2 = setPropertiesInput( mo );
        soaService.postUnchecked( 'Core-2010-09-DataManagement', 'setProperties', inputData2 );
    }
};

/**
 * Open delegate for retail object
 *
 * @param {data} data from declViewModel *
 * @param {uidPath} path to UID which needs to be opened *
 * @param {uidPath} If object needs to be opened in edit model
 */
export let messageOpenDelegateJS = function( selectedCell, uidPath, isInEditMode ) {
    var vmo = selectedCell;
    if( vmo ) {
        setViewedByMeIfNeeded( vmo );
        showObjectCommandHandler.execute( vmo, null, isInEditMode );
    }
};

/**
 * Set properties input to set the property
 *
 * @function setPropertiesInput
 *
 * @param {ModelObject} actionableObject - The new selection
 *
 */
var setPropertiesInput = function( actionableObject ) {
    var input = {
        info: [],
        options: []
    };
    var inputInfo = {
        object: actionableObject
    };
    inputInfo.vecNameVal = [];
    inputInfo.vecNameVal.push( {
        name: 'fnd0MessageReadFlag',
        values: [ 'true' ]
    } );
    input.info.push( inputInfo );

    return input;
};

//function to update the newsfeed filter preference
export let updateNewsFeedFilterPreference = function( ctx ) {
    var selectedFilter = ctx.search.activeFilters;
    var prefValues = [];
    for( var i = 0; i < selectedFilter.length; i++ ) {
        var filterCategory = selectedFilter[ i ].name;
        var prefElement = '';
        for( var j = 0; j < selectedFilter[ i ].values.length; j++ ) {
            prefElement = filterCategory + ':' + selectedFilter[ i ].values[ j ];
            prefValues.push( prefElement );
        }
    }
    // update configuration
    preferenceSvc.setStringValue( CONST_AWC_NewsFeed_SavedFilters, prefValues ).then( function() {
        //update ctx to make save selection filter button invisible
        appCtxService.ctx.saveFilterSelectionVisibility = false;
    } );
};

//function to add watch to ctx.search.activeFilters and update ctx.saveFilterSelectionVisibility whenever activeFilters changes
export let addWatchToActiveFilters = function() {
    if( _thisScope !== null ) {
        if( _thisScope.activeFiltersWatch === undefined ) {
            _thisScope.activeFiltersWatch = _thisScope.$watch( function( _thisScope ) {
                    if( _thisScope.ctx.search ) {
                        return _thisScope.ctx.search.activeFilters;
                    }
                },

                function( newState, oldState, _thisScope ) {
                    if( newState !== undefined && oldState !== undefined && newState !== oldState && appCtxService.ctx !== undefined &&
                        appCtxService.ctx.sublocation !== undefined ) {
                        if( appCtxService.ctx.sublocation.clientScopeURI === 'fnd0MySubscriptionMessages' && appCtxService.ctx.previousClientScopeURI !== 'fnd0MySubscriptions' ) {
                            appCtxService.ctx.saveFilterSelectionVisibility = true;
                        } else {
                            appCtxService.ctx.previousClientScopeURI = appCtxService.ctx.sublocation.clientScopeURI;
                        }
                    } else if( newState === undefined ) {
                        _thisScope.activeFiltersWatch(); /*watch unbinding*/
                        _thisScope.activeFiltersWatch = undefined;
                        appCtxService.ctx.saveFilterSelectionVisibility = false;
                    }
                }, true );
        }
    }
};

export let newsFeedFilterPanelOpenCloseEvent = function() {
    if( _thisScope === null ) {
        _thisScope = AwRootScopeService.instance.$new();
        _thisScope.ctx = appCtxService.ctx;
    }
    if( _thisScope.activeNavigationCommandWatch === undefined ) {
        _thisScope.activeNavigationCommandWatch = _thisScope.$watch( function( _thisScope ) { return _thisScope.ctx.activeNavigationCommand; }, function( newState, oldState ) {
            if( newState !== oldState && appCtxService.ctx !== undefined && appCtxService.ctx.sublocation !== undefined &&
                appCtxService.ctx.sublocation.clientScopeURI === 'fnd0MySubscriptionMessages' && appCtxService.ctx.search.totalFound > 0 ) {
                if( newState ) {
                    appCtxService.ctx.newsFeedFilterPanelShouldBeOpen = true;
                } else {
                    appCtxService.ctx.newsFeedFilterPanelShouldBeOpen = false;
                }
            }
        } );
    }

    if( !appCtxService.ctx.activeNavigationCommand && appCtxService.ctx.newsFeedFilterPanelShouldBeOpen === undefined || appCtxService.ctx.newsFeedFilterPanelShouldBeOpen === true ) {
        commandService.executeCommand( 'Sub0NewsFeedFilters', null, _thisScope );
    }
};

export let noMessagesFoundAction = function() {
    appCtxService.ctx.saveFilterSelectionVisibility = true;
};

//function to decide whether Save Selection Filter button should be visible or not on load
export let initializeSaveFilterSelectionVisibility = function( data ) {
    var selectedFilter = appCtxService.ctx.search.activeFilters;
    var selectedFilterValues = [];

    if( selectedFilter.length === 0 ) {
        return false;
    }
    if( selectedFilter.length !== data.userSavedFilterConfig.length ) {
        return true;
    }
    for( var i = 0; i < selectedFilter.length; i++ ) {
        var filterCategory = selectedFilter[ i ].name;
        var prefElement = '';
        for( var j = 0; j < selectedFilter[ i ].values.length; j++ ) {
            prefElement = filterCategory + ':' + selectedFilter[ i ].values[ j ];
            selectedFilterValues.push( prefElement );
        }
    }

    selectedFilterValues.sort();
    data.userSavedFilterConfig.sort();

    var len = selectedFilterValues.length;
    for( var k = 0; k < len; k++ ) {
        if( selectedFilterValues[ k ] !== data.userSavedFilterConfig[ k ] ) {
            return true;
        }
    }
    return false;
};

export let loadFromSaveSelection = function( data ) {
    if( _thisScope === null ) {
        _thisScope = AwRootScopeService.instance.$new();
        _thisScope.ctx = appCtxService.ctx;
    }
    if( _thisScope.clientScopeURIWatch === undefined ) {
        _thisScope.clientScopeURIWatch = _thisScope.$watch( function( _thisScope ) {
            if( _thisScope.ctx.sublocation ) {
                return _thisScope.ctx.sublocation.clientScopeURI;
            }
        }, function( newState, oldState ) {
            if( newState !== oldState ) {
                if( newState !== 'fnd0MySubscriptions' && newState !== 'fnd0MySubscriptionMessages' ) {
                    _thisScope.clientScopeURIWatch(); /*watch unbinding when moving out of Subscriptions location*/
                    _thisScope.clientScopeURIWatch = undefined;
                    appCtxService.ctx.loadingFromSaveSelection = undefined;
                }
            }
        } );
    }

    var searchFilterMap = {};
    if( data.userSavedFilterConfig === undefined ) {
        data.userSavedFilterConfig = [];
    }
    if( data.userSavedFilterConfig.length === 1 && data.userSavedFilterConfig[ 0 ] === '' ) {
        data.userSavedFilterConfig.length = 0;
    }
    for( var i = 0; i < data.userSavedFilterConfig.length; i++ ) {
        var keyValePair = data.userSavedFilterConfig[ i ].split( ':' );
        var key = keyValePair[ 0 ];
        var value = keyValePair[ 1 ];
        var filters = [];
        if( searchFilterMap[ key ] === undefined ) {
            filters.push( value );
            searchFilterMap[ key ] = filters;
        } else {
            filters = searchFilterMap[ key ];
            filters.push( value );
            searchFilterMap[ key ] = filters;
        }
    }

    appCtxService.ctx.saveFilterSelectionVisibility = initializeSaveFilterSelectionVisibility( data );

    appCtxService.ctx.loadingFromSaveSelection = false;
    if( appCtxService.ctx.search.activeFilters.length < 1 && data.userSavedFilterConfig.length > 0 ) {
        var context = {
            source: 'globalSearch',
            criteria: '',
            filterMap: searchFilterMap
        };

        appCtxService.ctx.loadingFromSaveSelection = true;

        eventBus.publish( 'search.doSearch', context );
        searchFilterService.doSearch( 'com_siemens_splm_client_subscription_follow_NewsFeedSubscriptions', '', searchFilterMap );
    } else {
        appCtxService.ctx.loadingFromSaveSelection = false;
    }
};

export let resetLoadingFromSaveSelection = function() {
    appCtxService.ctx.loadingFromSaveSelection = false;
};

/**
 * Perform the SOA call & return the value
 * @param {Object} data The viewmodel's data object.
 * @param {Object} columnConfigInput parameter for performSearchViewModel4
 * @param {Object} saveColumnConfigData parameter for performSearchViewModel4
 * @param {Object} searchInput parameter for performSearchViewModel4
 * @returns {Object} Returns the response of performSearchViewModel4
 */
export let loadData = function( data, columnConfigInput, searchInput, inflateProperties ) {
    if( appCtxService.ctx.loadingFromSaveSelection === undefined ) {
        var defer = AwPromiseService.instance.defer();
        var promise = soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
            preferenceNames: [ 'AWC_NewsFeed_SavedFilters' ],
            includePreferenceDescriptions: false
        } );
        promise.then( function( response ) {
            if( response ) {
                data.userSavedFilterConfig = response.response[ 0 ].values.values;
                loadFromSaveSelection( data );

                if( appCtxService.ctx.loadingFromSaveSelection === false ) {
                    //if there are no saved filters doSearch will not be called so call the soa if appCtxService.ctx.loadingFromSaveSelection is false
                    // to load all the results
                    soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
                        columnConfigInput: columnConfigInput,
                        searchInput: searchInput,
                        inflateProperties: inflateProperties
                    } ).then( function( response ) {
                        defer.resolve( response );
                    } );
                } else {
                    defer.resolve();
                }
            }
        } );

        return defer.promise;
    }
    return soaService
        .postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: columnConfigInput,
            searchInput: searchInput,
            inflateProperties: inflateProperties
        } );
};


const exports = {
    messageOpenDelegateJS,
    setViewedByMeIfNeeded,
    checkTaskViewedByMe,
    updateNewsFeedFilterPreference,
    addWatchToActiveFilters,
    newsFeedFilterPanelOpenCloseEvent,
    noMessagesFoundAction,
    initializeSaveFilterSelectionVisibility,
    loadFromSaveSelection,
    resetLoadingFromSaveSelection,
    loadData
};
export default exports;

/**
 * retailNativeService service utility
 *
 * @memberof NgServices
 * @member retailNativeService
 */
app.factory( 'awMessageService', () => exports );
