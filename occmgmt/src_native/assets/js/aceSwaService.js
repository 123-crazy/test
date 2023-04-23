//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceSwaService
 */
import app from 'app';
import _ from 'lodash';
import contributionService from 'js/contribution.service';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';
import conditionService from 'js/conditionService';
import awPromiseService from 'js/awPromiseService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import awInjectorService from 'js/awInjectorService';
import eventBus from 'js/eventBus';
import xrtParserService from 'js/xrtParser.service';
import editHandlerService from 'js/editHandlerService';

/**
 * {EventSubscriptionArray} Collection of eventBuss subscriptions to be removed when the controller is
 * destroyed.
 */
var exports = {};
var _eventSubDefs = [];
var _xrtTabsSupportedForSplitView = [ 'tc_xrt_Overview', 'tc_xrt_Finishes', 'tc_xrt_MadeFrom',
    'web_whereused', 'tc_xrt_Changes', 'tc_xrt_History', 'attachments', 'tc_xrt_Simulation'
];
var _pciDependentSWATabs = [ 'Awb0SupportsFullScreenVariantConfiguration', 'tc_xrt_AttributesForDCP' ];

/**
 * Filter tabs if they have a condition attached.
 */
var conditionFilter = function( tab, selected, contextKey ) {
    if( tab.condition ) {
        //Ideally it is just a string condition that condition service can handle
        if( typeof tab.condition === 'string' ) {
            return conditionService.evaluateCondition( {
                ctx: appCtxService.ctx,
                selected: selected
            }, tab.condition );
        }
        //Can also use a function condition if necessary
        return tab.condition( selected, awInjectorService.instance, contextKey );
    }
    return true;
};

export let initializeAceSwaView = function( stickyPagesKey, data, subPanelContext ) {
    _eventSubDefs.push( eventBus.subscribe( 'cdm.relatedModified', function( eventData ) {
        if( eventData && eventData.relatedModified && eventData.refreshLocationFlag ) {
            updateAceSwaViewIfUnderlyingObjectIsModified( data, eventData.relatedModified, subPanelContext );
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'aceSecondaryWorkArea.refreshTabs', function( eventData ) {
        forceRefreshAceSwaView( data, eventData );
    } ) );


    data.contextKey = subPanelContext.contextKey;
    data.isXrtApplicable = subPanelContext.isXrtApplicable;

    _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( event ) {
        if( event.name === data.contextKey && event.target === 'selectedModelObjects' ) {
            updateAceSwaViewOnSelectionChange( data );
    }
} ) );

    _eventSubDefs.push( eventBus.subscribe( 'productContextChangedEvent', function( eventData ) {
        if(  !_.isUndefined( eventData.transientRequestPref ) && !_.isUndefined( eventData.transientRequestPref.deltaTreeResponse ) &&
        eventData.transientRequestPref.deltaTreeResponse  ) {
            // in case of delta tree response, we get same uids after configuration change.
            // So, it does not trigger secondary work area refresh.
            if(eventData.transientRequestPref.refreshAceSwaView)
            {
                forceRefreshAceSwaView( data, {
                    contextKey: data.contextKey
                } );
            }
            // For some views, e.g. 'Variant Configuration' we need explicit refresh
            else if( !_.isUndefined( data.activeTab ) && !_.isUndefined( data.activeTab.id ) ) {
                var activeTabId = data.activeTab.id;
                if( _.includes( _pciDependentSWATabs, activeTabId ) ) {
                    forceRefreshAceSwaView( data, {
                        contextKey: data.contextKey
                    } );
                }
            }
       }
    } ) );

    return getSwaStickyPages( stickyPagesKey ).then( function( allStickyPages ) {
        data.allStickyPages = allStickyPages;
        forceRefreshAceSwaView( data, {
            contextKey: data.contextKey
        } );
    } );
};

var getVisibleStickyPages = function( allStickyPages, selected, contextKey ) {
    var visibleStickyPages = _.filter( allStickyPages, function( tab ) {
        return conditionFilter( tab, selected, contextKey );
    } );

    return visibleStickyPages.sort( function( a, b ) {
        return a.priority - b.priority;
    } );
};

var getSwaStickyPages = function( stickyPagesKey ) {
    //Load the "sticky" pages from the contribution service
    //Track the promise as other behavior may depend on it later
    var deferred = awPromiseService.instance.defer();
    stickyPagesKey = !_.isUndefined( stickyPagesKey ) ? stickyPagesKey : 'occMgmtPageKey';

    contributionService.require( stickyPagesKey ).then(
        function( summaryPageKeys ) {
            var aceSwaStickyPages = summaryPageKeys.map( function( page, index ) {
                var newTab = {
                    classValue: 'aw-base-tabTitle',
                    selectedTab: false,
                    visible: true,
                    displayTab: true,
                    pageId: index,
                    priority: page.priority,
                    condition: page.condition,
                    stickyView: page.pageNameToken,
                    id: page.id,
                    destroy: page.destroy
                };

                //Setting the label is async - may be object containing localization info
                var label = page.label;
                if( typeof label === 'string' ) {
                    newTab.name = label;
                } else {
                    localeService.getLocalizedText( app.getBaseUrlPath() + label.source,
                        label.key ).then( function( result ) {
                        newTab.name = result;
                    } );
                }

                return newTab;
            } );

            deferred.resolve( aceSwaStickyPages );
        } );

    return deferred.promise;
};

var getActivePageId = function( contextKey ) {
    var currentContext = appCtxService.getCtx( contextKey );
    if( !_.isUndefined( currentContext ) ) {
        var spageId = currentContext && currentContext.currentState.spageId;
        if( _.isUndefined( spageId ) || _.isNull( spageId ) ) {
            var sublocationAttributes = currentContext.sublocationAttributes;
            if( sublocationAttributes && sublocationAttributes.awb0ActiveSublocation ) {
                spageId = sublocationAttributes.awb0ActiveSublocation[ 0 ];
            }
        }
        return spageId;
    }
    return null;
};

/**
 * Set XRTContextForPrimarySelection
 */
function _setXRTContextForPrimarySelection( data, selectedObj ) {
    if( !( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) ) {
        var _xrtContextObj = appCtxService.getCtx( 'ActiveWorkspace:xrtContext' );
        var currentContext = appCtxService.getCtx( data.contextKey );
        if( !_xrtContextObj ) {
            _xrtContextObj = {};
        }
        var _xrtContextCopy = JSON.parse( JSON.stringify( _xrtContextObj ) );
        if( currentContext.productContextInfo ) {
            _xrtContextCopy.productContextUid = currentContext.productContextInfo.uid;
        }
        _xrtContextCopy.selectedUid = selectedObj.uid;
        appCtxService.ctx[ 'ActiveWorkspace:xrtContext' ] = _xrtContextCopy;
    }
}

/**
 * Update secondary page on URL
 */
export let updateAceSwaActivePageIdOnContext = function( data ) {
    //When coming to ACE from Split, spageId on Context might be present. Honor that over server information.
    if( data.contextKey ) {
        var spageId = getActivePageId( data.contextKey );
        if( spageId ) {
            contextStateMgmtService.updateContextState( data.contextKey, {
                spageId: spageId
            }, true );
        }
    }
};

var syncActivePageIdOnContextWithActiveTab = function( data ) {
    var currentContext = appCtxService.getCtx( data.contextKey );
    var spageName = currentContext.activeTab.name;
    contextStateMgmtService.updateContextState( data.contextKey, {
        spageId: spageName
    }, true );

    updatePageIdOnXrtContext( data );
};

//We need to set the secondary XRT page id in appCtx. Needed in afx as well as ACE downstreams (legacy).
//Going forward, ACE downstreams should take this info from occmgmtContext.
var updatePageIdOnXrtContext = function( data ) {
    if( data.activeTab.id ) {
        appCtxService.updatePartialCtx( 'xrtPageContext.secondaryXrtPageID', data.activeTab.id );
    }
};

/**
 * Utility to destroy previous xrt view model and update
 */
var setXrtViewModel = function( data, newViewModel ) {
    if( data.xrtViewModel ) {
        data.xrtViewModel.destroy();
    }
    if( newViewModel && appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode && _xrtTabsSupportedForSplitView &&
        !_xrtTabsSupportedForSplitView.includes( newViewModel.renderedPage.titleKey ) ) {
        data.xrtViewModel = null;
    } else {
        data.xrtViewModel = newViewModel;
    }

    /*Case where when XRT response came, tab was switched to sticky tab.
    Don't set that XRT on view ( as view and active tab would mis-match in that case).
    */

    if( isStickyPageActive( data ) && data.xrtViewModel ) {
        data.xrtViewModel.destroy();
        data.xrtViewModel = null;
    }
};

/**
 * True if XRT is applicable and selection count is 1.
 *
 * @param {*} data viewModel data
 * @return {boolean} true/false
 */
var shouldXrtInformationBeLoaded = function( data ) {
    var currentContext = appCtxService.getCtx( data.contextKey );
    var shouldBeLoaded = false;
    if( data && currentContext ) {
        var selectedModelObjects = currentContext.selectedModelObjects;
        if( selectedModelObjects ) {
            shouldBeLoaded =  selectedModelObjects.length === 1  &&  data.isXrtApplicable;
        }
    }

    return shouldBeLoaded;
};

/**
 *
 * @param {*} data viewModel data
 * @param {*} selectedModelObjects Selected ModelObject
 * @param {*} spageId pageId pageId for for XRT
 * @return {Promise} getDeclStyleSheet() SOA promise
 */

var getXrtViewModelForSelectedObject = function( data, selectedModelObjects, spageId ) {
    var _staticXrtCommandIds = [ 'Awp0StartEdit', 'Awp0StartEditGroup', 'Awp0SaveEdits',
        'Awp0CancelEdits'
    ];

    _setXRTContextForPrimarySelection( data, selectedModelObjects[ 0 ] );

    let isStickyTab = Boolean( isStickyPageActive( data ) );
    if( isStickyTab ) {
        // compare the spageId to activeTab to ensure sticky tab behavior is applicable
        isStickyTab = data.activeTab.name === spageId;
    }
    return xrtParserService.getXrtViewModel( 'SUMMARY', spageId,
        selectedModelObjects[ 0 ], _staticXrtCommandIds, isStickyTab );
};

var isStickyPageActive = function( data ) {
    return data.activeTab && data.activeTab.stickyView;
};

/*
 * Clear sticky pages view
 */
var clearStickyPageViewIfApplicable = function( data ) {
    //If activeTab is no longer visible, set it to null.
    if( isStickyPageActive( data ) && !_.find( data.summaryTabs, { stickyView: data.activeTab.stickyView } ) ) {
        data.activeTab = null;

        //activeTab is not longer valid. So, clear tabs. Default active tab will be from XRT.
        eventBus.publish( data.contextKey + '.refreshTabs', {
            summaryTabs: data.summaryTabs
        } );
    }
};

/**
 * Update Ace SWA View after edit leave confirmation.
 *
 * @param {*} data data
 */
export let updateAceSwaViewOnSelectionChange = function( data ) {
    const currentContext = appCtxService.getCtx( data.contextKey );
    const pwaEditHandler = editHandlerService.getEditHandler( currentContext.vmc.name );
    if( !pwaEditHandler || !pwaEditHandler.editInProgress() ) {
        editHandlerService.leaveConfirmation().then( function() {
            updateAceSwaViewForSelectedObjects( data );
        } );
    } else {
        updateAceSwaViewForSelectedObjects( data );
    }
};

export let forceRefreshAceSwaView = function( data, eventData ) {
    var contextKey = eventData && eventData.contextKey ? eventData.contextKey : appCtxService.ctx.aceActiveContext.key;
    if( data.contextKey === contextKey ) {
        editHandlerService.leaveConfirmation().then( function() {
            updateAceSwaViewForSelectedObjects( data );
        } );
    }
};

var publishEventToUpdateSwaTabsInfo = function( data ) {
    var eventData = {
        summaryTabs: data.summaryTabs,
        activeTab: data.activeTab
    };

    eventBus.publish( data.contextKey + '.refreshTabs', eventData );
    data.activeTab.selectedTab = true;
};

/**
 * Update summaryTabs, activeTab, xrtViewModel ( for non-sticky tabs ) on data for new selections
 * @param {*} data data
 */

var updateAceSwaViewForSelectedObjects = function( data ) {
    var currentContext = appCtxService.getCtx( data.contextKey );
    var selectedModelObjects = currentContext.selectedModelObjects;

    if( selectedModelObjects && selectedModelObjects.length > 0 ) {
        var spageId = getActivePageId( data.contextKey );

        //Selection changed. Calculate sticky pages first.
        data.visibleStickyPages = getVisibleStickyPages( data.allStickyPages, selectedModelObjects, data.contextKey );
        /*
        1) On Selection change, this method will get called.
        2) You got selections, visible sticky pages.
        3) call XRT using for selected object if isXrtApplicable true ( false if MFE case or event multi-select case ).
        4) get XRT model and set it on view.
        */
        data.summaryTabs = data.visibleStickyPages;

        //Clear current view
        clearStickyPageViewIfApplicable( data );
        var shouldXrtBeLoaded = shouldXrtInformationBeLoaded( data );

        if( shouldXrtBeLoaded ) {
            getXrtViewModelForSelectedObject( data, selectedModelObjects, spageId ).then( function( xrtViewModel ) {
                //Get the XRT pages
                setTimeout( function() {
                    var xrtPages = xrtParserService.getDeclVisiblePages( xrtViewModel.viewModel );
                    var currentActiveTab = undefined;
                    var isXrtStillApplicable = shouldXrtInformationBeLoaded( data );

                    //Selection count increased while XRT was loading.
                    if( isXrtStillApplicable ) {
                        var visibleXRTPages = xrtPages.map( function( page, index ) {
                            return {
                                classValue: 'aw-base-tabTitle',
                                displayTab: true,
                                id: page.titleKey,
                                name: page.displayTitle,
                                pageId: index,
                                selectedTab: false,
                                visible: true,
                                view: page.pageNameToken,
                                tabKey: page.titleKey,
                                canBeDefault: true,
                                xrtTab: true
                            };
                        } );

                        if( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) {
                            visibleXRTPages = visibleXRTPages.filter( function( page ) {
                                return _xrtTabsSupportedForSplitView.includes( page.id );
                            } );
                        }

                        //clear stale XRT tabs if there are any ( select multiple and deselect with ctrl click one by one  )
                        var staleXRTPages = _.filter( data.summaryTabs, function( tab ) {
                            return tab.xrtTab && tab.xrtTab === true;
                        } );

                        if( !_.isEmpty( staleXRTPages ) ) {
                            _.remove( data.summaryTabs, { xrtTab: true } );
                        }

                        //add xrt tabs for currently selected object
                        data.summaryTabs = data.summaryTabs.concat( visibleXRTPages );
                        currentActiveTab = _.find( data.summaryTabs, { name: spageId } ) || _.find( data.summaryTabs, { id: spageId } );

                        data.activeTab = currentActiveTab ? currentActiveTab : visibleXRTPages[ 0 ];
                    } else {
                        data.activeTab =  data.summaryTabs[ 0 ];
                    }
                    if( !currentActiveTab ) {
                        var spageName = data.activeTab.name;
                        updateXRTViewForProvidedObjectAndPage( data, selectedModelObjects, spageName );
                    }
                    currentContext.activeTab = data.activeTab;
                    syncActivePageIdOnContextWithActiveTab( data );

                    publishEventToUpdateSwaTabsInfo( data );

                    //XRT ViewModel should be set only if activeTab is XRT tab
                    xrtViewModel = data.activeTab.stickyView ? null : xrtViewModel;
                    setXrtViewModel( data, xrtViewModel );
                }, 50 );
            } );
        } else {
            //User has selected multiple objects or XRT is not So we are showing only sticky tabs to user.
            setXrtViewModel( data, null );

            //If current active tab is sticky page, keep that active. Else switch to first available tab.
            data.activeTab = isStickyPageActive( data ) ? data.activeTab : data.summaryTabs[ 0 ];

            currentContext.activeTab = data.activeTab;

            publishEventToUpdateSwaTabsInfo( data );
            updatePageIdOnXrtContext( data );
        }
    }
};

/**
 * On tab change, update SWA view with activeTab. set xrtViewModel on view if activeTab is non-sticky
 * @param {*} data
 */

export let updateAceSwaActiveTabInformation = function( data, eventData ) {
    //Update view with new active tab. If its sticky view, view will render automatically.
    if( data.contextKey === eventData.name ) {
        var currentContext = appCtxService.getCtx( data.contextKey );
        var newTab = currentContext.activeTab;
        var currentTab = data.activeTab;

        if( !_.isEqual( newTab, currentTab ) ) {
            const updateAceSwaActiveTabInformation = function() {
                data.activeTab = currentContext.activeTab;
                var selectedModelObjects = currentContext.selectedModelObjects;
                //set xrt view model to null.
                setXrtViewModel( data, null );
                //update pageId on context.
                if( data.activeTab && data.activeTab.id ) {
                    syncActivePageIdOnContextWithActiveTab( data );
                }

                //if activeTab is non-sticky view, its XRT and needs to be loaded.
                if( !data.activeTab.stickyView ) {
                    var spageName = currentContext.activeTab.name;
                    updateXRTViewForProvidedObjectAndPage( data, selectedModelObjects, spageName );
                }
            };
            const pwaEditHandler = editHandlerService.getEditHandler( currentContext.vmc.name );
            if( !pwaEditHandler || !pwaEditHandler.editInProgress() ) {
                editHandlerService.leaveConfirmation().then( function() {
                    updateAceSwaActiveTabInformation();
                } );
            } else {
                updateAceSwaActiveTabInformation();
            }
        }
    }
};

var updateXRTViewForProvidedObjectAndPage = function( data, selectedModelObjects, spageName ) {
    var xrtLoadPromise = getXrtViewModelForSelectedObject( data, selectedModelObjects, spageName );
    xrtLoadPromise.then( function( xrtViewModel ) {
        setTimeout( function() {
            setXrtViewModel( data, xrtViewModel );
        }, 50 );
    } );
};

export let updateAceSwaViewIfUnderlyingObjectIsModified = function( data, relatedModified, subPanelContext ) {
    var currentContext = appCtxService.getCtx( subPanelContext.contextKey );
    var selectedModelObjects = currentContext.selectedModelObjects;
    if( selectedModelObjects.length === 1 && selectedModelObjects[ 0 ].hasOwnProperty( 'props' ) ) {
        var underlyingElement = selectedModelObjects[ 0 ].props.awb0UnderlyingObject ? selectedModelObjects[ 0 ].props.awb0UnderlyingObject.dbValues[ 0 ] :
            null;

        var matches = relatedModified.filter( function( mo ) {
            return mo.uid === selectedModelObjects[ 0 ].uid || mo.uid === underlyingElement;
        } );

        //If location should reload for the current model object
        if( matches.length && !isStickyPageActive( data ) ) {
            var spageId = getActivePageId( subPanelContext.contextKey );
            updateXRTViewForProvidedObjectAndPage( data, selectedModelObjects, spageId );
        }
    }
};

export let destroyAceSwaView = function( data ) {
    appCtxService.updatePartialCtx( 'xrtPageContext.secondaryXrtPageID', null );
    if( data.xrtViewModel ) {
        editHandlerService.setEditHandler( null, 'NONE' );
        data.xrtViewModel.destroy();
    }

    _.forEach( data.allStickyPages, function( tab ) {
        if( tab.destroy ) {
            tab.destroy();
        }
    } );

    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
};

export default exports = {
    updateAceSwaActiveTabInformation,
    updateAceSwaActivePageIdOnContext,
    updateAceSwaViewOnSelectionChange,
    forceRefreshAceSwaView,
    initializeAceSwaView,
    destroyAceSwaView
};
app.factory( 'aceSwaService', () => exports );
