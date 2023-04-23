// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/structureCompareService
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import AwTimeoutService from 'js/awTimeoutService';
import awCompareContext from 'js/awStructureCompareContextService';
import awStructureCompareSvc from 'js/awStructureCompareService';
import compareGetSvc from 'js/awStructureCompareGetService';
import awStructureCompareUtils from 'js/awStructureCompareUtils';
import awStructureCompareColorService from 'js/awStructureCompareColorService';
import LocationNavigationService from 'js/locationNavigation.service';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import commadPanelSvc from 'js/commandPanel.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _sourceVMOs = [];
var _targetVMOs = [];
var _eventSubDefs = [];

var _isSelectionEventTriggeredFromGrid = false;
var _isNavigatePanelOpen = false;

function getActiveViewLocation() {
    var srcLocation = 1;
    if( awCompareContext.getCtx( 'aceActiveContext.key' ) === 'occmgmtContext2' ) {
        srcLocation = 2;
    }
    return srcLocation;
}

/**
 * Register Sync Events
 */
function registerSyncEvents() {
    if( _eventSubDefs && _eventSubDefs.length === 0 ) {
        _eventSubDefs.push( eventBus.subscribe( 'appCtx.register', function( eventData ) {
            if( eventData.name === 'splitView' ) {
                if( !awCompareContext.getCtx( 'splitView' ) ) {
                    awStructureCompareSvc.resetData();
                    _sourceVMOs = [];
                    _targetVMOs = [];
                    if( awCompareContext.getCtx( 'refreshViewOnNotificationClick' ) ) {
                        /* If splitview is getting destroyed due to multi structure view refresh via compare notification click,
                        we don't want to unregister event subscriptions, just reset refreshViewOnNotificationClick flag.
                        In all other cases unregisterSyncEvents() is called. */
                        awCompareContext.updatePartialCtx( 'refreshViewOnNotificationClick', null );
                        var _autoOpenComparePanel = awCompareContext.getCtx( 'autoOpenComparePanel' );
                        awCompareContext.updatePartialCtx( 'compareContext.autoOpenComparePanel', _autoOpenComparePanel );
                        var _dataSetUid = awCompareContext.getCtx( 'datasetUid' );
                        awCompareContext.updatePartialCtx( 'compareContext.datasetUid', _dataSetUid );
                        var _isMultiStructureFirstLaunch = awCompareContext.getCtx( 'isMultiStructureFirstLaunch' );
                        awCompareContext.updatePartialCtx( 'compareContext.isMultiStructureFirstLaunch', _isMultiStructureFirstLaunch );
                        awCompareContext.updatePartialCtx( 'autoOpenComparePanel', null );
                        awCompareContext.updatePartialCtx( 'datasetUid', null );
                        awCompareContext.updatePartialCtx( 'isMultiStructureFirstLaunch', null );
                        awCompareContext.updatePartialCtx( 'skipCompareOnSystemExpansion', null );
                        awCompareContext.updatePartialCtx( 'compareContext.navigatePanelSelection', null );
                    } else {
                        unregisterSyncEvents();
                    }
                }
            }
        } ) );

        // For Grid there are separate events for "User" selection( eventName gridSelection) and "System" selection
        // But for Navigate panel same event is triggered for "User" and "System" selection.
        // We need to know the source of selection event triggered ( Navigate Panel or Grid) hence
        // defined a boolean variable _isSelectionEventTriggeredFromGrid that will track the event source
        // This variable helps us in breaking the circular event loop between navigate panel and grid
        _eventSubDefs.push( eventBus.subscribe( 'icsPerformSearch.selectionChangeEvent', function( eventData ) {
            AwTimeoutService.instance( function() {
                if( awCompareContext.getCtx( 'compareContext.isInCompareMode' ) && !_isSelectionEventTriggeredFromGrid && eventData.selectedObjects ) {
                    awCompareContext.updatePartialCtx( 'compareContext.navigatePanelSelection', eventData.selectedObjects );
                    var numOfSelectedObjects = eventData.selectedObjects.length;
                    if( numOfSelectedObjects === 1 ) {
                        awStructureCompareSvc.navigateDifferences( getActiveViewLocation(), eventData.selectedObjects, true );
                    } else if( numOfSelectedObjects === 0 ) {
                        //Clear the selection
                        var navigationContext = _.get( eventData, 'scope.data.navigateContext.value' );
                        var aceActiveContext = _.get( eventData, 'scope.ctx.aceActiveContext.key' );
                        if( navigationContext === aceActiveContext ) {
                            awStructureCompareSvc.clearSelectionInGrid( 1 );
                            awStructureCompareSvc.clearSelectionInGrid( 2 );
                        }
                    }
                }
                _isSelectionEventTriggeredFromGrid = false;
            }, 0, false );
        } ) );

        // Incontextsearch by default selects first object in navigate panel hence setting the _isSelectionEventTriggeredFromGrid to false here
        _eventSubDefs.push( eventBus.subscribe( 'navigate.icsPerformSearchDp', function( eventData ) {
            if( awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                _isSelectionEventTriggeredFromGrid = false;
                _isNavigatePanelOpen = true;
            }
        } ) );

        // This event is triggered when navigate panel is closed.
        // As per current behavior of Navigation panel, the searched contents are cleared when the panel is closed
        // Hence the selection is reset.
        _eventSubDefs.push( eventBus.subscribe( 'complete', function( eventData ) {
            if( eventData.source === 'navigationPanel' && awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                _isNavigatePanelOpen = false;
                awCompareContext.updatePartialCtx( 'compareContext.navigatePanelSelection', [] );
            }
        } ) );

        // This is to handle the scenario where multi-level compare is performed and then using Navigation panel an
        // object is selected that is few levels deep. Here the expectation is the equivalent object on the other view
        // should also be traversed and shown selected.
        // This event is triggered when performCompare action is complete with selection triggered from navigate panel
        _eventSubDefs.push( eventBus.subscribe( 'CompareComplete', function( eventData ) {
            if( _isNavigatePanelOpen && awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                AwTimeoutService.instance( function() {
                    //Perform sync navigation
                    var selectedObjectsInNavigationPanel = awCompareContext.getCtx( 'compareContext.navigatePanelSelection' );
                    awStructureCompareSvc.navigateDifferences( getActiveViewLocation(), selectedObjectsInNavigationPanel, true );
                }, 0, false );
            }
        } ) );

        // Sync Selection
        _eventSubDefs.push( eventBus.subscribe( 'occTreeTable.gridSelection', function( eventData ) {
            if( awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                _isSelectionEventTriggeredFromGrid = true;
                awStructureCompareSvc.navigateDifferences( 1, eventData.selectedObjects, false );
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'occTreeTable2.gridSelection', function( eventData ) {
            if( awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                _isSelectionEventTriggeredFromGrid = true;
                awStructureCompareSvc.navigateDifferences( 2, eventData.selectedObjects, false );
            }
        } ) );

        // Sync Expansion
        _eventSubDefs.push( eventBus.subscribe( 'occTreeTable.plTable.toggleTreeNode', function( node ) {
            if( awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                if( node.isSystemExpanded ) {
                    awCompareContext.updatePartialCtx( 'skipCompareOnSystemExpansion', true );
                    node.isSystemExpanded = false;
                } else if( node.isExpanded ) {
                    awStructureCompareSvc.toggleEquivalentRow( 1, node );
                }
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'occTreeTable2.plTable.toggleTreeNode', function( node ) {
            if( awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                if( node.isSystemExpanded ) {
                    awCompareContext.updatePartialCtx( 'skipCompareOnSystemExpansion', true );
                    node.isSystemExpanded = false;
                } else if( node.isExpanded ) {
                    awStructureCompareSvc.toggleEquivalentRow( 2, node );
                }
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'awPanelSection.collapse', function( data ) {
            if( awCompareContext.getCtx( 'compareContext.isInCompareMode' ) ) {
                awCompareContext.updatePartialCtx( 'compareContext.' + data.name + '.isCollapsed', data.isCollapsed );
            }
        } ) );

        // Perform compare on expansion of sub-assembly node or when next page is scrolled
        _eventSubDefs.push( eventBus.subscribe( 'occMgmt.visibilityStateChanged', function( data ) {
            if( _.has( data, [ 'scope', 'dataprovider' ] ) && data.scope.dataprovider.getViewModelCollection() ) {
                if( data.scope.dataprovider.name === 'occDataProvider2' ) {
                    _targetVMOs = data.scope.dataprovider.getViewModelCollection().loadedVMObjects;
                    awStructureCompareSvc.setDecoratorStyles( _targetVMOs );
                } else {
                    _sourceVMOs = data.scope.dataprovider.getViewModelCollection().loadedVMObjects;
                    awStructureCompareSvc.setDecoratorStyles( _sourceVMOs );
                }
                if( awCompareContext.getCtx( 'compareContext.isMultiStructureFirstLaunch' ) ) {
                    //Make sure that both the source and target VMOs are loaded before making server call.
                    if( _sourceVMOs.length > 0 && _targetVMOs.length > 0 ) {
                        awCompareContext.updatePartialCtx( 'compareContext.isMultiStructureFirstLaunch', false );
                        exports.executeCompare();
                    }
                } else if( awCompareContext.getCtx( 'compareContext.isInMultiLevelCompare' ) === true ) {
                    var skipCompare = awCompareContext.getCtx( 'skipCompareOnSystemExpansion' );
                    if( !skipCompare ) {
                        var compareInput = compareGetSvc.createSOAInputForVisibleUids( awCompareContext.getCtx( 'compareContext.depth' ), false, false, _sourceVMOs,
                            _targetVMOs );
                        awStructureCompareSvc.performCompare( compareInput, false, false );
                    }
                    //Reset the flag
                    awCompareContext.updatePartialCtx( 'skipCompareOnSystemExpansion', false );
                }
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'configurationChangeStarted', function() {
            awStructureCompareSvc.resetMultiLevelCompare();
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'productContextChangedEvent', function() {
            exports.resetCompareContext();
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'productChangedEvent', function() {
            awStructureCompareSvc.resetMultiLevelCompare();
            exports.resetCompareContext();
        } ) );
    }
}

/**
 * Unregister Sync Events
 */
function unregisterSyncEvents() {
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
    _eventSubDefs.length = 0;
}

/**
 * This helper function will return the number of registered events.This will help us identify if the
 * events are registered and unregistered successfully.
 * This is presently invoked from junit and is not intended to be invoked from elsewhere
 */
export let getNumOfRegisteredEvents = function() {
    return _eventSubDefs.length;
};

/**
 * This helper function will do pre-requisite initialization and registrations for Compare.
 */
export let initializeCompareData = function() {
    awStructureCompareSvc.initializeCompareList();
    registerSyncEvents();
    awCompareContext.updatePartialCtx( 'cellClass', {
        gridCellClass: awStructureCompareColorService.gridCellClass,
        pltablePropRender: awStructureCompareColorService.prophighlightRenderer
    } );
};

/**
 * Initializes compare context while launching Compare panel.
 *
 */
export let setUpCompareContext = function() {
    exports.initializeCompareData();
    var _leftStructurKey = awCompareContext.getCtx( 'splitView.viewKeys' )[ 0 ];
    var _rightStructurKey = awCompareContext.getCtx( 'splitView.viewKeys' )[ 1 ];
    var _leftStructureContext = awCompareContext.getCtx( _leftStructurKey );
    awCompareContext.updatePartialCtx( 'compareList.sourceSelection', _leftStructureContext.topElement );
    var _rightStructureContext = awCompareContext.getCtx( _rightStructurKey );
    awCompareContext.updatePartialCtx( 'compareList.targetSelection', _rightStructureContext.topElement );
    var selectedObj = cdm.getObject( _leftStructureContext.pwaSelectionModel.getSelection() );
    if( !selectedObj ) {
        selectedObj = _leftStructureContext.topElement;
    }
    awCompareContext.updatePartialCtx( 'compareList.cmpSelection1', selectedObj );
    selectedObj = cdm.getObject( _rightStructureContext.pwaSelectionModel.getSelection() );
    if( !selectedObj ) {
        selectedObj = _rightStructureContext.topElement;
    }
    awCompareContext.updatePartialCtx( 'compareList.cmpSelection2', selectedObj );
    awCompareContext.updatePartialCtx( 'compareContext.source.isCollapsed', false );
    awCompareContext.updatePartialCtx( 'compareContext.target.isCollapsed', true );
    if( !awCompareContext.getCtx( 'compareContext.displayOptions' ) ) {
        exports.setDefaultDisplayOptions();
    }
    eventBus.publish( 'revealComparePanel' );
    eventBus.publish( 'refreshCellRenderersForCompare' );
};

export let resetCompareOption = function() {
    commadPanelSvc.activateCommandPanel( 'Awb0Compare', 'aw_toolsAndInfo' );
    return {
        oldOptionValue: awCompareContext.getCtx( 'compareContext.depth' )
    };
};

export let initAndLaunchCommandPanel = function() {
    var _currentDepth = awCompareContext.getCtx( 'compareContext.depth' );
    if( !_currentDepth ) {
        awCompareContext.updatePartialCtx( 'compareContext.depth', 1 );
    }
    commadPanelSvc.activateCommandPanel( 'Awb0Compare', 'aw_toolsAndInfo', '', true );
};

export let executeFromComparePanel = function( usrSelectedDepth, backgroundOption ) {
    if( usrSelectedDepth !== 1 && backgroundOption ) {
        awStructureCompareSvc.showBackgrouondMessage();
    }
    if( usrSelectedDepth === 1 && backgroundOption ) {
        // reset background option to false
        backgroundOption = false;
    }

    var contextKeys = awStructureCompareUtils.getContextKeys();

    _sourceVMOs = awCompareContext.getCtx( contextKeys.leftCtxKey ).vmc.loadedVMObjects;
    _targetVMOs = awCompareContext.getCtx( contextKeys.rightCtxKey ).vmc.loadedVMObjects;
    var compareInput = compareGetSvc.createSOAInputForPaginationAndVisibleUids( usrSelectedDepth, true,
        backgroundOption, awStructureCompareUtils.getDefaultCursor(), awStructureCompareUtils.getDefaultCursor(), _sourceVMOs, _targetVMOs, null );

    awStructureCompareSvc.resetCompareContext();
    awStructureCompareSvc.resetCompareColorData();
    return awStructureCompareSvc.performCompare( compareInput, true, false );
};

export let resetCompareContext = function() {
    var _isConfigChanged = awCompareContext.getCtx( 'compareList.isConfigChanged' );
    if( _isConfigChanged === true ) {
        awStructureCompareSvc.resetCompareColorData();
        awCompareContext.updatePartialCtx( 'compareList.isConfigChanged', false );
    }
};

export let setDefaultDisplayOptions = function() {
    var matchTypes = {};
    matchTypes.MISSING_SOURCE = true;
    matchTypes.MISSING_TARGET = true;
    matchTypes.PARTIAL_MATCH = true;
    var equivalenceTypes = {};
    equivalenceTypes.AC_DYNAMIC_IDIC = true;
    var displayOptions = {};
    displayOptions.MatchType = matchTypes;
    displayOptions.Equivalence = equivalenceTypes;
    awCompareContext.updatePartialCtx( 'compareContext.displayOptions', displayOptions );
};

export let launchContentCompare = function() {
    exports.initializeCompareData();
    awCompareContext.updatePartialCtx( 'compareContext.autoOpenComparePanel', true );
    awCompareContext.updatePartialCtx( 'compareContext.isMultiStructureFirstLaunch', true );
    //resetTreeExpansionState is set to True on appCtx, occmgmt will ignore the expansion state of structures while opening in multi-structure.
    awCompareContext.updatePartialCtx( 'resetTreeExpansionState', true );
    var requestPrefValue = {
        dataFilterMode: 'compare'
    };
    awCompareContext.updatePartialCtx( 'requestPref', requestPrefValue );
    var toParams = {};
    var _mselected = awCompareContext.getCtx( 'mselected' );
    var selectedObj = _mselected[ 0 ];
    if( selectedObj.props.awb0UnderlyingObject !== undefined ) { // We got an Awb0Element as input
        selectedObj = cdm.getObject( selectedObj.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }
    awCompareContext.updatePartialCtx( 'compareList.sourceSelection', selectedObj );

    selectedObj = _mselected[ 1 ];
    if( selectedObj.props.awb0UnderlyingObject !== undefined ) { // We got an Awb0Element as input
        selectedObj = cdm.getObject( selectedObj.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }
    awCompareContext.updatePartialCtx( 'compareList.targetSelection', selectedObj );

    var compareList = awCompareContext.getCtx( 'compareList' );
    toParams.uid = compareList.sourceSelection.uid;
    toParams.uid2 = compareList.targetSelection.uid;
    toParams.pci_uid = '';
    toParams.pci_uid2 = '';
    if( awCompareContext.getCtx( 'aceActiveContext.context' ) ) {
        if( awCompareContext.getCtx( 'aceActiveContext.context.elementToPCIMap' ) ) {
            /**
             * While launching Compare from within saved working context, we want to use saved
             * configuration.
             */
            toParams.pci_uid = awStructureCompareSvc.getPCIForSelection( _mselected[ 0 ] );
            toParams.pci_uid2 = awStructureCompareSvc.getPCIForSelection( _mselected[ 1 ] );
        } else {
            /**
             * While launching Compare from within ACE, we would have same configuration for both source and
             * target structure.
             */
            var _contentPCIUid = awCompareContext.getCtx( 'aceActiveContext.context.productContextInfo.uid' );
            toParams.pci_uid = _contentPCIUid;
            toParams.pci_uid2 = _contentPCIUid;
        }
    }
    var transitionTo = 'com_siemens_splm_clientfx_tcui_xrt_showMultiObject';
    LocationNavigationService.instance.go( transitionTo, toParams );
};

export let executeCompare = function() {
    var contextKeys = awStructureCompareUtils.getContextKeys();
    var topSrcElement = awCompareContext.getCtx( contextKeys.leftCtxKey + '.topElement' );
    var topTrgElement = awCompareContext.getCtx( contextKeys.rightCtxKey + '.topElement' );
    if( topSrcElement.uid !== topTrgElement.uid && awStructureCompareUtils.getChildCount( topSrcElement ) > 0 && awStructureCompareUtils.getChildCount( topTrgElement ) > 0 ) {
        // Perform compare only on the first open of both the
        // structures. Subsequently, there should be an explicit call
        // to refresh the results
        var datasetUID = awCompareContext.getCtx( 'compareContext.datasetUid' );
        var compareInput = compareGetSvc.createSOAInputForPaginationAndVisibleUids( -2, false, false,
            awStructureCompareUtils.getDefaultCursor(), awStructureCompareUtils.getDefaultCursor(), _sourceVMOs, _targetVMOs, datasetUID );
        awStructureCompareSvc.performCompare( compareInput, false, false );
        if( datasetUID ) {
            awCompareContext.updatePartialCtx( 'compareContext.datasetUid', null );
        }
    }
    awCompareContext.updatePartialCtx( 'compareList.isFirstLaunch', false );
};

export let openCompareNotification = function( notificationObject ) {
    dataManagementSvc.getProperties( [ notificationObject.object.uid ], [ 'fnd0MessageBody' ] ).then(
        function() {
            var str = notificationObject.object.props.fnd0MessageBody.dbValues[ '0' ];
            var dataSetUid = notificationObject.object.uid;
            var srcUidToken = '?uid=';
            var srcPcidToken = '&pci_uid=';
            var tgtUidToken = '&uid2=';
            var tgtPcidToken = '&pci_uid2=';
            var srcUid = str.indexOf( srcUidToken ) !== -1 ? str.substring( str.indexOf( srcUidToken ) + srcUidToken.length, str
                .indexOf( srcPcidToken ) ) : notificationObject.object.uid;
            var srcPcuid = str.indexOf( srcPcidToken ) !== -1 ? str.substring( str.indexOf( srcPcidToken ) + srcPcidToken.length, str
                .indexOf( tgtUidToken ) ) : null;
            var trgUid = str.indexOf( tgtUidToken ) !== -1 ? str.substring( str.indexOf( tgtUidToken ) + tgtUidToken.length, str
                .indexOf( tgtPcidToken ) ) : null;
            var trgPcuid = str.indexOf( tgtPcidToken ) !== -1 ? str.substring( str.indexOf( tgtPcidToken ) + tgtPcidToken.length ) : null;

            dataManagementSvc.loadObjects( [ srcUid, srcPcuid, trgUid, trgPcuid ] ).then( function() {
                var _urlParams = AwStateService.instance.params;
                _.forEach( _urlParams, function( value, name ) {
                    AwStateService.instance.params[ name ] = null;
                } );
                var transitionTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
                var toParams = AwStateService.instance.params;
                toParams.uid = srcUid;

                if( trgUid ) {
                    transitionTo = 'com_siemens_splm_clientfx_tcui_xrt_showMultiObject';
                    toParams.pci_uid = srcPcuid;
                    toParams.uid2 = trgUid;
                    toParams.pci_uid2 = trgPcuid;

                    exports.initializeCompareData();

                    if( awCompareContext.getCtx( 'splitView' ) ) {
                        awCompareContext.updatePartialCtx( 'refreshViewOnNotificationClick', true );
                        awCompareContext.updatePartialCtx( 'autoOpenComparePanel', true );
                        awCompareContext.updatePartialCtx( 'datasetUid', dataSetUid );
                        awCompareContext.updatePartialCtx( 'isMultiStructureFirstLaunch', true );
                    } else {
                        awCompareContext.updatePartialCtx( 'compareContext.datasetUid', dataSetUid );
                        awCompareContext.updatePartialCtx( 'compareContext.autoOpenComparePanel', true );
                        awCompareContext.updatePartialCtx( 'compareContext.isMultiStructureFirstLaunch', true );
                    }
                }
                var options = {};
                options.reload = true;
                LocationNavigationService.instance.go( transitionTo, toParams, options );
            } );
        } );
};

export default exports = {
    getNumOfRegisteredEvents,
    initializeCompareData,
    setUpCompareContext,
    resetCompareOption,
    initAndLaunchCommandPanel,
    executeFromComparePanel,
    resetCompareContext,
    setDefaultDisplayOptions,
    launchContentCompare,
    executeCompare,
    openCompareNotification
};
/**
 ** @memberof NgServices
 * @member structureCompareService
 */
app.factory( 'structureCompareService', () => exports );
