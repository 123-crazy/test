// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global*/

/**
 *
 * @module js/awSearchLocationFilterPanelService
 */

import app from 'app';
import AwRootScopeService from 'js/awRootScopeService';
import appCtxService from 'js/appCtxService';
import commandService from 'js/command.service';
import narrowModeService from 'js/aw.narrowMode.service';

import 'lodash';

var _thisScope = null;

/**
 * filterPanelForceClose
 * This forces the filter panel to close if it's in open state.
 */
export let filterPanelForceClose = function() {
    var commandToOpen;
    if( appCtxService.ctx.searchPanelState && ( appCtxService.ctx.searchPanelState.searchFilterPanelState === 'userOpen' ||
            appCtxService.ctx.searchPanelState.searchFilterPanelState === 'autoOpen' ) ) {
        commandToOpen = appCtxService.ctx.searchPanelState.searchFilterPanelActiveCommand;
        commandService.executeCommand( commandToOpen, null, _thisScope );
    }
};

/**
 * registerFilterPanelOpenCloseEvent
 * This registers the filter panel to watch for the open/state states.
 */
export let registerFilterPanelOpenCloseEvent = function() {
    if( _thisScope === null ) {
        _thisScope = AwRootScopeService.instance.$new();
        _thisScope.ctx = appCtxService.ctx;

        // ****************************************************************
        // Create listener for open/close state of navigation/information
        // panels to maintain correct open state of filter panel
        // ****************************************************************
        _thisScope.$watch( function( _thisScope ) { return _thisScope.ctx.activeNavigationCommand; }, function( ancNewState, ancOldState ) {
            if( _thisScope.ctx &&
                _thisScope.ctx.sublocation &&
                _thisScope.ctx.sublocation.clientScopeURI &&
                appCtxService.ctx.sublocation.clientScopeURI === 'Awp0SearchResults' &&
                !( ancNewState && ancNewState.commandId === 'Awp0SearchSettings' || ancOldState && ancOldState.commandId === 'Awp0SearchSettings' ) ) {
                exports.activeNavigationPanelChangeWatch( ancNewState, ancOldState );
            }
        } );

        _thisScope.$watch( function( _thisScope ) { return _thisScope.ctx.activeToolsAndInfoCommand; }, function( aticNewState, aticOldState ) {
            if( _thisScope.ctx &&
                _thisScope.ctx.sublocation &&
                _thisScope.ctx.sublocation.clientScopeURI &&
                appCtxService.ctx.sublocation.clientScopeURI === 'Awp0SearchResults' &&
                !( aticNewState && aticNewState.commandId === 'Awp0SearchSettings' || aticOldState && aticOldState.commandId === 'Awp0SearchSettings' ) ) {
                exports.activeToolsAndInfoPanelChangeWatch( aticNewState, aticOldState, _thisScope );
            }
        } );

        _thisScope.$watch( function( _thisScope ) {
            if( _thisScope.ctx && _thisScope.ctx.sublocation && _thisScope.ctx.sublocation.clientScopeURI ) {
                return _thisScope.ctx.sublocation.clientScopeURI;
            }
        }, function( csURINewState, csURIOldState ) {
            if( csURIOldState === 'Awp0SearchResults' && csURINewState !== 'Awp0SearchResults' ) {
                appCtxService.ctx.searchPanelState.searchInfoPanelOpen = false;
            }
        } );
        // ****************************************************************
        // End listener for open/close state of navigation/information panels
        // ****************************************************************
    }
};

/**
 * Open / close filter panel
 * This takes action to open or close the filter panel.
 */
export let filterPanelOpenCloseEvent = function() {
    var activeNavigationCommandCommandID = 'Awp0SearchFilter';
    var searchPanelStateCtx = appCtxService.getCtx( 'searchPanelState' );
    if( searchPanelStateCtx &&
        searchPanelStateCtx.searchFilterPanelActiveCommand ) {
        activeNavigationCommandCommandID = searchPanelStateCtx.searchFilterPanelActiveCommand;
    }

    // Check if we are in narrow mode
    if( narrowModeService.isNarrowMode() ) {
        return;
    }

    var activeNavigationCmdCtx = appCtxService.getCtx( 'activeNavigationCommand' );
    var searchCtx = appCtxService.getCtx( 'search' );

    if( !searchPanelStateCtx ) {
        searchPanelStateCtx = {};
    }

    var isActiveNavigationCmdIdEqualFilterPanelActiveCmd = activeNavigationCmdCtx && activeNavigationCmdCtx.commandId === activeNavigationCommandCommandID;
    var userClosePanelState = searchPanelStateCtx.searchFilterPanelState === 'userClose';
    var autoOpenPanelState = searchPanelStateCtx.searchFilterPanelState === 'autoOpen';
    var autoClosePanelState = searchPanelStateCtx.searchFilterPanelState === 'autoClose';
    var totalFoundCtxExists = searchCtx && searchCtx.totalFound !== undefined && searchCtx.totalFound !== null;
    var zeroTotalFound = searchCtx && searchCtx.filterCategories && searchCtx.filterCategories.length === 0;
    var notZeroTotalFound = searchCtx && searchCtx.filterCategories && searchCtx.filterCategories.length > 0;
    // Next check if the navigation command is NOT set to the filter panel
    // Next check if the panel has been closed by the user or auto closed
    // Additionally check if the panel is open and search results count is Zero

    if( !isActiveNavigationCmdIdEqualFilterPanelActiveCmd && !userClosePanelState &&
        ( !totalFoundCtxExists || zeroTotalFound && !autoClosePanelState ) ||
        totalFoundCtxExists && notZeroTotalFound && autoClosePanelState ) {
        var searchPanelState = { searchFilterPanelState: 'autoOpen' };
        searchPanelStateCtx = searchPanelState;
        appCtxService.updatePartialCtx( 'searchPanelState', searchPanelStateCtx );
        commandService.executeCommand( 'Awp0SearchFilter', null, _thisScope );
    }
    if( isActiveNavigationCmdIdEqualFilterPanelActiveCmd && zeroTotalFound && autoOpenPanelState ) {
        commandService.executeCommand( appCtxService.ctx.activeNavigationCommand.commandId, null, _thisScope );
    }
};
/**
 * Open / close filter panel
 * This takes action to open or close the filter panel.
 */
export let openfilterPanel = function() {
    var sublocationCtx = appCtxService.getCtx( 'sublocation' );
    if( sublocationCtx && sublocationCtx.clientScopeURI === 'Awp0SearchResults' ) {
        commandService.executeCommand( 'Awp0SearchFilter', null, _thisScope );
    }
};

/**
 * Method to help determine the open close state of the Navigation Panel in the search location
 * @param {*} ancNewState
 * @param {*} ancOldState
 */

export let activeNavigationPanelChangeWatch = function( ancNewState, ancOldState ) {
    var searchPanelStateCtx = appCtxService.getCtx( 'searchPanelState' );
    var searchCtx = appCtxService.getCtx( 'search' );
    var activeToolsAndInfoCmdCtx = appCtxService.getCtx( 'activeToolsAndInfoCommand' );

    if( !searchPanelStateCtx ) {
        searchPanelStateCtx = {};
    }
    var userClosePanelState = searchPanelStateCtx.searchFilterPanelState === 'userClose';
    var autoOpenPanelState = searchPanelStateCtx.searchFilterPanelState === 'autoOpen';
    var autoClosePanelState = searchPanelStateCtx.searchFilterPanelState === 'autoClose';
    var userOpenPanelState = searchPanelStateCtx.searchFilterPanelState === 'userOpen';

    var totalFoundCtxExists = searchCtx && searchCtx.totalFound !== undefined && searchCtx.totalFound !== null;
    var zeroTotalFound = searchCtx && searchCtx.totalFound === 0;
    var oneTotalFound = searchCtx && searchCtx.totalFound === 1;

    if( !ancNewState && !ancOldState ) {
        // Ignore this state
    } else if( ancNewState && !ancOldState ) {
        // Navigation panel opened
        searchPanelStateCtx = exports.navigationPanelOpen( searchPanelStateCtx, autoOpenPanelState, autoClosePanelState );
        // keep track of the opened panel
        searchPanelStateCtx.searchFilterPanelActiveCommand = ancNewState.commandId;
    } else if( !ancNewState ) {
        // Navigation panel closed
        searchPanelStateCtx = exports.navigationPanelClosed( searchCtx, searchPanelStateCtx, activeToolsAndInfoCmdCtx,
            totalFoundCtxExists, userClosePanelState, userOpenPanelState, zeroTotalFound, oneTotalFound );
    } else {
        // Navigation panel content changed
        // Keep track of opened panel
        searchPanelStateCtx.searchFilterPanelActiveCommand = ancNewState.commandId;
    }
    appCtxService.updatePartialCtx( 'searchPanelState', searchPanelStateCtx );
};

export let navigationPanelClosed = function( searchCtx, searchPanelStateCtx, activeToolsAndInfoCmdCtx,
    totalFoundCtxExists, userClosePanelState, userOpenPanelState, zeroTotalFound, oneTotalFound ) {
    if( !searchCtx.filterMap ) {
        // There are no filters to display
        if( !userClosePanelState || !userOpenPanelState ) {
            // The user has not specifically opened/closed the filter panel prior
            // set to autoClose
            searchPanelStateCtx.searchFilterPanelState = 'autoClose';
        }
    } else if( !searchPanelStateCtx.searchInfoPanelOpen &&
        !activeToolsAndInfoCmdCtx ) {
        if( totalFoundCtxExists && zeroTotalFound ) {
            // The total number of results is zero the panel has closed due to this
            searchPanelStateCtx.searchFilterPanelState = 'autoClose';
        } else if( totalFoundCtxExists && oneTotalFound &&
            searchCtx.dataProviderName === 'SS1ShapeSearchDataProvider' ) {
            searchPanelStateCtx.searchFilterPanelState = 'autoClose';
        } else {
            // The tools and info panel is not open the user has closed the panel specifically
            searchPanelStateCtx.searchFilterPanelState = 'userClose';
        }
    } else {
        searchPanelStateCtx.searchFilterPanelState = 'autoClose';
    }
    return searchPanelStateCtx;
};

export let navigationPanelOpen = function( searchPanelStateCtx, autoOpenPanelState, autoClosePanelState ) {
    if( !searchPanelStateCtx.searchInfoPanelOpen ) {
        if( !autoOpenPanelState ) {
            searchPanelStateCtx.searchFilterPanelState = 'userOpen';
        }
    } else {
        if( !autoClosePanelState ) {
            searchPanelStateCtx.searchFilterPanelState = 'userOpen';
        } else {
            searchPanelStateCtx.searchFilterPanelState = 'autoOpen';
        }
    }
    return searchPanelStateCtx;
};

/**
 * Method to help determine the open close state of the Toola and info Panel in the search location
 * @param {*} aticNewState
 * @param {*} aticOldState
 * @param {*} scope
 */

export let activeToolsAndInfoPanelChangeWatch = function( aticNewState, aticOldState, $scope ) {
    var searchPanelStateCtx = appCtxService.getCtx( 'searchPanelState' );
    if( !searchPanelStateCtx ) {
        searchPanelStateCtx = {};
    }

    if( !aticNewState && !aticOldState ) {
        //Ignore this state
    } else if( aticNewState && !aticOldState ) {
        //Tools and Info panel opened
        searchPanelStateCtx.searchInfoPanelOpen = true;
    } else if( !aticNewState ) {
        //Tools and Info panel closed
        if( ( searchPanelStateCtx.searchFilterPanelState === 'autoClose' || searchPanelStateCtx.searchFilterPanelState === 'userOpen' ) &&
            aticOldState.commandId !== 'Awp0ShowSaveAs' ) {
            // re open the Navigation panel
            exports.openfilterPanel();
        }
        searchPanelStateCtx.searchInfoPanelOpen = false;
    } else {
        // Tools and Info panel content changed
        // Ignore
    }
};

const exports = {
    filterPanelForceClose,
    registerFilterPanelOpenCloseEvent,
    filterPanelOpenCloseEvent,
    openfilterPanel,
    activeNavigationPanelChangeWatch,
    activeToolsAndInfoPanelChangeWatch,
    navigationPanelClosed,
    navigationPanelOpen
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member awSearchLocationFilterPanelService
 */
app.factory( 'awSearchLocationFilterPanelService', () => exports );
