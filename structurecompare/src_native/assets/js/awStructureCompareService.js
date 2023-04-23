/* eslint-disable max-lines */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/awStructureCompareService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import AwTimeoutService from 'js/awTimeoutService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import messagingSvc from 'js/messagingService';
import dataManagementSvc from 'soa/dataManagementService';
import localeSvc from 'js/localeService';
import soaSvc from 'soa/kernel/soaService';
import dateTimeSvc from 'js/dateTimeService';
import commandPanelService from 'js/commandPanel.service';
import colorDecoratorService from 'js/colorDecoratorService';
import compareGetService from 'js/awStructureCompareGetService';
import compareContextService from 'js/awStructureCompareContextService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import awStructureCompareNotificationService from 'js/awStructureCompareNotificationService';
import awStructureCompareUtils from 'js/awStructureCompareUtils';
import awStructureCompareOptionsService from 'js/awStructureCompareOptionsService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _counter = 0;
var _sourceVMOs = [];
var _targetVMOs = [];

var _oldDecoratorToggle = null;

var _isRootTileSelected = false;
var _resetCompareResults = false;
var _diffPanelOpened = false;

var _comparePanelOpened = false;

var processErrorsAndWarnings = function( response ) {
    var message = '';
    var level = 0;
    var error = response.ServiceData;
    if( error && error.partialErrors ) {
        _.forEach( error.partialErrors, function( partErr ) {
            if( partErr.errorValues ) {
                _.forEach( partErr.errorValues, function( errVal ) {
                    if( errVal.code === 126252 ) {
                        var resource = app.getBaseUrlPath() + '/i18n/StructureCompareMessages';
                        var localeTextBundle = localeSvc.getLoadedText( resource );
                        message = localeTextBundle.messageForBackgroundCompareResult;
                        var date = new Date( response.timestampOfStoredResults );
                        message = message.replace( '{0}', dateTimeSvc.formatSessionDateTime( date ) );
                    } else if( errVal.code ) {
                        if( message && message.length > 0 ) {
                            message += '\n' + errVal.message;
                        } else {
                            message += errVal.message + '\n';
                        }
                    }
                    level = errVal.level;
                } );
            }
        } );
        if( level <= 1 ) {
            messagingSvc.showInfo( message );
            return response;
        }
        messagingSvc.showError( message );
        compareContextService.updatePartialCtx( 'compareContext.isCompareRequestInProgress', false );
        return null;
    }
};

var resetContextData = function() {
    compareContextService.updatePartialCtx( 'compareContext.sourceDiffs', [] );
    compareContextService.updatePartialCtx( 'compareContext.targetDiffs', [] );
    compareContextService.updatePartialCtx( 'compareContext.sourceDifferences', [] );
    compareContextService.updatePartialCtx( 'compareContext.targetDifferences', [] );
    compareContextService.updatePartialCtx( 'compareContext.sourceColorDiffs', {} );
    compareContextService.updatePartialCtx( 'compareContext.targetColorDiffs', {} );
    compareContextService.updatePartialCtx( 'compareContext.propertyDiffs', {} );
    compareContextService.updatePartialCtx( 'compareContext.isInCompareMode', false );
};

var resetHighlights = function( gridLocation ) {
    if( compareContextService.getCtx( 'compareContext.propertyDiffs' ) !== null ) {
        var isCompareLocation = awStructureCompareUtils.getContextKeys().leftCtxKey === 'CompareSrc';
        var currentMode = compareContextService.getCtx( 'ViewModeContext.ViewModeContext' );
        var srcEventData = {
            viewModelObjects: _sourceVMOs
        };
        var trgEventData = {
            viewModelObjects: _targetVMOs
        };

        if( gridLocation === 1 ) {
            if( currentMode === 'TableView' ) {
                eventBus.publish( 'trgGridDataProvider.modelObjectsUpdated', trgEventData );
            } else if( currentMode === 'TreeView' || currentMode === 'TreeSummaryView' ) {
                if( isCompareLocation ) {
                    eventBus.publish( 'compareTargetTreeView.columnsChanged' );
                    eventBus.publish( 'compareTargetTreeView.plTable.clientRefresh' );
                } else {
                    eventBus.publish( 'occTreeTable2.plTable.clientRefresh' );
                }
            }
        } else if( gridLocation === 2 ) {
            if( currentMode === 'TableView' ) {
                eventBus.publish( 'srcGridDataProvider.modelObjectsUpdated', srcEventData );
            } else if( currentMode === 'TreeView' || currentMode === 'TreeSummaryView' ) {
                if( isCompareLocation ) {
                    eventBus.publish( 'compareSourceTreeView.columnsChanged' );
                    eventBus.publish( 'compareSourceTreeView.plTable.clientRefresh' );
                } else {
                    eventBus.publish( 'occTreeTable.plTable.clientRefresh' );
                }
            }
        } else {
            if( currentMode === 'TableView' ) {
                eventBus.publish( 'srcGridDataProvider.modelObjectsUpdated', srcEventData );
                eventBus.publish( 'trgGridDataProvider.modelObjectsUpdated', trgEventData );
            } else if( currentMode === 'TreeView' || currentMode === 'TreeSummaryView' ) {
                if( isCompareLocation ) {
                    eventBus.publish( 'compareSourceTreeView.columnsChanged' );
                    eventBus.publish( 'compareTargetTreeView.columnsChanged' );
                    eventBus.publish( 'compareSourceTreeView.plTable.clientRefresh' );
                    eventBus.publish( 'compareTargetTreeView.plTable.clientRefresh' );
                } else {
                    eventBus.publish( 'occTreeTable.plTable.clientRefresh' );
                    eventBus.publish( 'occTreeTable2.plTable.clientRefresh' );
                }
            }
        }
    }
};

function _updatePropertyDiffMap( startFreshCompare ) {
    var sourceVMDiffs = compareContextService.getCtx( 'compareContext.sourceDiffs' );
    var sourcePageDiffs = compareContextService.getCtx( 'compareContext.sourceDifferences' );
    var propDiffData = {};

    var equivalenceList = compareContextService.getCtx( 'compareContext.equivalenceObj' );
    if( equivalenceList && equivalenceList.length > 0 ) {
        equivalenceList = _.uniqBy( equivalenceList, 'uid' );
        var propertyLoadContext = {
            clientScopeURI: compareContextService.getCtx( 'sublocation.clientScopeURI' ),
            columnsToExclude: appCtxSvc.ctx.aceActiveContext.context.columnsToExclude
        };
        tcViewModelObjectService.getTableViewModelProperties( equivalenceList, propertyLoadContext ).then(
            function() {
                var mappingData = compareContextService.getCtx( 'compareContext.mappingIds' );
                for( var srcKey in sourceVMDiffs ) {
                    if( sourceVMDiffs[ srcKey ] === 2 ) {
                        if( mappingData[ srcKey ] ) {
                            var equivalentSrcObject = cdm.getObject( srcKey );
                            var trgKeys = mappingData[ srcKey ];
                            for( var index = 0; index < trgKeys.length; index++ ) {
                                var equivalentTrgObject = cdm.getObject( trgKeys[ index ] );
                                if( equivalentSrcObject && equivalentTrgObject ) {
                                    for( var propertyData in equivalentSrcObject.props ) {
                                        var targetProperty = equivalentTrgObject.props[ propertyData ];
                                        if( targetProperty &&
                                            targetProperty.dbValues[ 0 ] !== equivalentSrcObject.props[ propertyData ].dbValues[ 0 ] ) {
                                            propDiffData[ srcKey + '$' + propertyData ] = 2;
                                            propDiffData[ trgKeys[ index ] + '$' + propertyData ] = 2;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                compareContextService.updatePartialCtx( 'compareContext.propertyDiffs', propDiffData );
                resetHighlights( null );
            } );
    } else {
        if( equivalenceList.length === 0 && startFreshCompare ) {
            // We got a scenario where there are no equivalent objects, hence no property highlight
            compareContextService.updatePartialCtx( 'compareContext.propertyDiffs', null );
            var currentMode = compareContextService.getCtx( 'ViewModeContext.ViewModeContext' );
            if( currentMode === 'TreeView' || currentMode === 'TreeSummaryView' ) {
                eventBus.publish( 'occTreeTable.plTable.clientRefresh' );
                eventBus.publish( 'occTreeTable2.plTable.clientRefresh' );
            }
        }
    }
}

var getEquivalentObject = function( inputUID, inputMap ) {
    var equivalentObjects = [];
    if( inputUID && inputMap ) {
        var equivalentIDs = inputMap[ inputUID ];
        if( equivalentIDs && equivalentIDs.length > 0 ) {
            for( var index = 0; index < equivalentIDs.length; index++ ) {
                equivalentObjects.push( cdm.getObject( equivalentIDs[ index ] ) );
            }
        }
    }
    return equivalentObjects;
};

// This method will load the equivalent object by making server call
var loadAndFetchEquivalentObject = function( inputUID, inputMap ) {
    var deferred = AwPromiseService.instance.defer();
    var equivalentObjects = [];
    if( inputUID && inputMap ) {
        var equivalentIDs = inputMap[ inputUID ];
        if( equivalentIDs && equivalentIDs.length > 0 ) {
            var missingUids = [];
            _.forEach( equivalentIDs, function( uid ) {
                var modelObject = cdm.getObject( uid );
                if( !modelObject || _.isEmpty( modelObject.props ) ) {
                    missingUids.push( uid );
                } else {
                    equivalentObjects.push( modelObject );
                }
            } );

            if( missingUids.length > 0 ) {
                return dataManagementSvc.loadObjects( missingUids ).then( function() {
                    _.forEach( missingUids, function( uid ) {
                        var oUidObject = cdm.getObject( uid );
                        equivalentObjects.push( oUidObject );
                    } );
                    deferred.resolve( equivalentObjects );
                    return deferred.promise;
                } );
            }
        }
    }
    deferred.resolve( equivalentObjects );
    return deferred.promise;
};

/**
 * @param {IModelObject} modelObject - The modelObject to access.
 *
 * @returns {String} UID of the immediate parent of the given modelObject based on 'awb0BreadcrumbAncestor' or
 *          'awb0Parent' (or NULL if no parent found).
 */
function _getParentUid( modelObject ) {
    if( modelObject && modelObject.props ) {
        var props = modelObject.props;
        var uid;

        if( props.awb0BreadcrumbAncestor && !_.isEmpty( props.awb0BreadcrumbAncestor.dbValues ) ) {
            uid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
        } else if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }

        if( cdm.isValidObjectUid( uid ) ) {
            return uid;
        }
    }
    return null;
}

/** Export APIs */

export let initializeCompareList = function() {
    var compareContext = compareContextService.getCtx( 'compareList' );
    if( compareContext === undefined || compareContext === null ) {
        var compareList = {
            sourceSelection: '',
            targetSelection: '',
            isDataAvailable: false,
            isInCompareMode: false,
            isInMultiLevelCompare: false,
            isCompareRequestInProgress: false,
            isConfigChanged: false,
            isFirstLaunch: true
        };
        compareContextService.setCompareContext( 'compareList', compareList );
    }
};

export let resetCompareContext = function() {
    compareContextService.updatePartialCtx( 'compareContext.isCompareRequestInProgress', true );
    compareContextService.updatePartialCtx( 'compareContext.isInCompareMode', false );
    compareContextService.updatePartialCtx( 'compareContext.isInMultiLevelCompare', false );
    compareContextService.updatePartialCtx( 'compareContext.prevSrcCursor', {} );
    compareContextService.updatePartialCtx( 'compareContext.prevSrcData', [] );
    compareContextService.updatePartialCtx( 'compareContext.prevTrgCursor', {} );
    compareContextService.updatePartialCtx( 'compareContext.prevTrgData', [] );
    compareContextService.updatePartialCtx( 'compareContext.srcEquivalentList', {} );
    compareContextService.updatePartialCtx( 'compareContext.trgEquivalentList', {} );
};

export let showComparePanel = function() {
    if( !_comparePanelOpened ) {
        awStructureCompareOptionsService.setInitialCompareOption();
        // The parameters to this method are the ones passed as inputData to launchComparePanel action.
        // The context information is needed to be set to get the Push behavior for panel
        commandPanelService.activateCommandPanel( 'Awb0Compare', 'aw_toolsAndInfo', '', true );
        _comparePanelOpened = true;
    }
};

export let setDecoratorStyles = function( vmos ) {
    //Set the decorator toggle to show the color swabs
    if( compareContextService.getCtx( 'decoratorToggle' ) !== true ) {
        compareContextService.updatePartialCtx( 'decoratorToggle', true );
    }

    for( var key in vmos ) {
        vmos[ key ].cellDecoratorStyle = '';
        vmos[ key ].gridDecoratorStyle = '';
    }
    colorDecoratorService.setDecoratorStyles( vmos );
};

/**
 * @param {Object} selectedObject Object representing selection made by the user
 * @return Uid of the productContext corresponding to the selected object if it is available in the
 *         elementToPCIMap; null otherwise.
 */
export let getPCIForSelection = function( selectedObject ) {
    var _elementToPCIMap = compareContextService.getCtx( 'aceActiveContext.context.elementToPCIMap' );
    if( _elementToPCIMap ) {
        var parentObject = selectedObject;
        do {
            if( _elementToPCIMap[ parentObject.uid ] ) {
                return _elementToPCIMap[ parentObject.uid ];
            }
            var parentUid = _getParentUid( parentObject );
            parentObject = cdm.getObject( parentUid );
        } while( parentObject );
    }
    return null;
};

export let performCompare = function( compareInput, refresh, autoOpenDiffPanel ) {
    return exports.invokeSoa( compareInput ).then(
        function( response ) {
            // If compare was invoked with background option, then do't process the results

            if( response ) {
                if( response.totalNoOfSourceDifferences !== undefined && response.totalNoOfSourceDifferences === 0 ) {
                    compareContextService.updatePartialCtx( 'compareContext.sourceDifferences', [] );
                }
                if( response.totalNoOfTargetDifferences !== undefined && response.totalNoOfTargetDifferences === 0 ) {
                    compareContextService.updatePartialCtx( 'compareContext.targetDifferences', [] );
                }
                compareContextService.updatePartialCtx( 'compareContext.isCompareRequestInProgress', false );
                if( compareInput.inputData.compareInBackground && autoOpenDiffPanel ) {
                    eventBus.publish( 'differencesPanel.compareOptionsReset' );
                    return;
                }
                var isCompareLocation = awStructureCompareUtils.getContextKeys().leftCtxKey === 'CompareSrc';
                if( compareInput.inputData.compareInBackground && !isCompareLocation ) {
                    eventBus.publish( 'comparePanel.compareOptionsReset' );
                    return;
                }
                compareContextService.updatePartialCtx( 'compareContext.isInCompareMode', true );
                var processedSrcIds = awStructureCompareUtils.processVMODifferences( response.sourceDifferences, response.pagedSourceDifferences, 1 );
                var sourceDiffs = processedSrcIds.colorSwabIds;

                var processedTrgIds = awStructureCompareUtils.processVMODifferences( response.targetDifferences, response.pagedTargetDifferences, 2 );
                var finalEquivalenceList = processedSrcIds.equivalIds;
                finalEquivalenceList = finalEquivalenceList.concat( processedTrgIds.equivalIds );
                compareContextService.updatePartialCtx( 'compareContext.equivalenceObj', finalEquivalenceList );
                compareContextService.updatePartialCtx( 'compareContext.mappingIds', processedSrcIds.mappingData );

                //Total Differences hard coded to 10 (will be fetched from server)
                compareContextService.updatePartialCtx( 'compareContext.totalDifferences',
                    10 );

                //Display Options
                if( response.compareOptions ) {
                    //Match Types
                    var matchTypes = {};
                    var responseMatchTypes = response.compareOptions.MatchType;
                    if( responseMatchTypes ) {
                        responseMatchTypes.forEach( function( entry ) {
                            matchTypes[ entry ] = true;
                        } );
                    }

                    //Equivalence
                    var equivalenceTypes = {};
                    var responseEquivalenceTypes = response.compareOptions.Equivalence;
                    if( responseEquivalenceTypes ) {
                        responseEquivalenceTypes.forEach( function( entry ) {
                            equivalenceTypes[ entry ] = true;
                        } );
                    }
                    let compareOptions = appCtxSvc.getCtx( 'compareContext.compareOptions' );
                    if ( compareOptions && !compareOptions.find( option => option.propInternalValue === -3 ) && !equivalenceTypes.AC_DYNAMIC_IDIC ) {
                        // Adding AC_DYNAMIC_IDIC so that Dynamic Equivalence checkbox is 'checked' after a compare operation is performed
                        // This value can be removed by unchecking the checkbox
                        equivalenceTypes.AC_DYNAMIC_IDIC = true;
                    }

                    var displayOptions = {};
                    displayOptions.MatchType = matchTypes;
                    displayOptions.Equivalence = equivalenceTypes;
                    compareContextService.updatePartialCtx( 'compareContext.displayOptions', displayOptions );
                }

                var tagretDiffs = processedTrgIds.colorSwabIds;
                var depth = response.sourceDepth;
                if( depth === 0 || depth === -1 ) {
                    compareContextService.updatePartialCtx( 'compareContext.isInMultiLevelCompare', true );
                } else {
                    compareContextService.updatePartialCtx( 'compareContext.isInMultiLevelCompare', false );
                }
                if( sourceDiffs !== null || tagretDiffs !== null ) {
                    compareContextService.updatePartialCtx( 'compareContext.sourceDiffs', sourceDiffs );
                    compareContextService.updatePartialCtx( 'compareContext.targetDiffs', tagretDiffs );
                    compareContextService.updatePartialCtx( 'compareContext.depth', depth );
                    var timeStamp = undefined;
                    if( depth !== -2 ) {
                        var date = new Date( response.timestampOfStoredResults );
                        timeStamp = dateTimeSvc.formatSessionDateTime( date );
                        compareContextService.updatePartialCtx( 'compareContext.timestampOfStoredResults',
                            timeStamp );
                    }

                    //Label
                    var compareConstants = app.getBaseUrlPath() + '/i18n/StructureCompareConstants';
                    var localeTextBundle = localeSvc.getLoadedText( compareConstants );
                    var panelCaption = localeTextBundle.resultsTitle;
                    if( timeStamp ) {
                        panelCaption = panelCaption + ' (' + localeTextBundle.Time + ': ' + timeStamp + ')';
                    }
                    compareContextService.updatePartialCtx( 'compareContext.resultsPanelTitle',
                        panelCaption );

                    if( refresh && response.pagedSourceDifferences !== undefined && response.pagedSourceDifferences.length === 0 ) {
                        compareContextService.updatePartialCtx( 'compareContext.sourceDifferences',
                            response.pagedSourceDifferences );
                        compareContextService.updatePartialCtx( 'compareContext.sourceCursor',
                            response.sourceCursor );
                        eventBus.publish( 'getSourceDiffResults.reset' );
                    }
                    // An edge case that failed is, when there are no results when we launch
                    // auto compare which results in empty differences. In such a case,
                    // refresh is false but differences for source are zero. This check will
                    // update the cursor and will allow the target section to be displayed
                    if( !refresh && response.pagedSourceDifferences !== undefined && response.pagedSourceDifferences.length === 0 ) {
                        compareContextService.updatePartialCtx( 'compareContext.sourceCursor',
                            response.sourceCursor );
                    }
                    if( refresh && response.pagedTargetDifferences !== undefined && response.pagedTargetDifferences.length === 0 ) {
                        compareContextService.updatePartialCtx( 'compareContext.targetDifferences',
                            response.pagedTargetDifferences );
                        compareContextService.updatePartialCtx( 'compareContext.targetCursor',
                            response.targetCursor );
                        eventBus.publish( 'getTargetDiffResults.reset' );
                    }
                    // When client wants only visible uids differences and not paginated results,
                    // startIndex on cursor is sent as -1. In such a case, we should not update the
                    // paginated results as sever does not return them and will always be empty
                    var isSourcePaginationResultValid = compareInput.inputData.sourceCursor.startIndex !== -1;
                    var isTargetPaginationResultValid = compareInput.inputData.targetCursor.startIndex !== -1;
                    if( isSourcePaginationResultValid && response.pagedSourceDifferences !== undefined &&
                        response.pagedSourceDifferences.length > 0 ) {
                        compareContextService.updatePartialCtx( 'compareContext.sourceDifferences',
                            response.pagedSourceDifferences );
                        compareContextService.updatePartialCtx( 'compareContext.sourceCursor',
                            response.sourceCursor );
                        if( refresh ) {
                            eventBus.publish( 'getSourceDiffResults.reset' );
                        }
                    }
                    if( isTargetPaginationResultValid && response.pagedTargetDifferences !== undefined &&
                        response.pagedTargetDifferences.length > 0 ) {
                        compareContextService.updatePartialCtx( 'compareContext.targetDifferences',
                            response.pagedTargetDifferences );
                        compareContextService.updatePartialCtx( 'compareContext.targetCursor',
                            response.targetCursor );
                        if( refresh ) {
                            eventBus.publish( 'getTargetDiffResults.reset' );
                        }
                    }
                    exports.updateColorMapData( compareInput.inputData.startFreshCompare );
                    var contextKeys = awStructureCompareUtils.getContextKeys();
                    exports.setDecoratorStyles( compareContextService.getCtx( contextKeys.leftCtxKey ).vmc.loadedVMObjects );
                    exports.setDecoratorStyles( compareContextService.getCtx( contextKeys.rightCtxKey ).vmc.loadedVMObjects );

                    if( autoOpenDiffPanel === true ) {
                        exports.showDifferencesPanel();
                    }

                    /** Following is being used for now in parallel to '_diffPanelOpened'.
                     * It will merged properly when we remove compare location. */
                    if( compareContextService.getCtx( 'compareContext.autoOpenComparePanel' ) === true ) {
                        exports.showComparePanel();
                    }
                }

                eventBus.publish( 'CompareComplete' );
            }
        } );
};

export let invokeSoa = function( compareInput ) {
    return soaSvc
        .postUnchecked( 'Internal-ActiveWorkspaceBom-2018-12-Compare', 'compareContent2', compareInput ).then(
            function( response ) {
                if( response.ServiceData && response.ServiceData.partialErrors ) {
                    return processErrorsAndWarnings( response );
                }
                return response;
            } );
};

export let getSelectedVMOs = function() {
    return {
        source: _sourceVMOs,
        target: _targetVMOs
    };
};

var _parseDelimitedUid = function( delimitedUid ) {
    var indx = delimitedUid.indexOf( awStructureCompareUtils.getDelimiterKey() );
    var uid = delimitedUid;
    if( indx > -1 ) {
        var uids = delimitedUid.split( awStructureCompareUtils.getDelimiterKey(), 2 );
        uid = uids[ 0 ]; //Get the first uid
    }
    return uid;
};

export let updateColorMapData = function( startFreshCompare ) {
    var sourceVMDiffs = compareContextService.getCtx( 'compareContext.sourceDiffs' );
    var targetVMDiffs = compareContextService.getCtx( 'compareContext.targetDiffs' );
    var sourcePageDiffs = compareContextService.getCtx( 'compareContext.sourceDifferences' );
    var targetPageDiffs = compareContextService.getCtx( 'compareContext.targetDifferences' );
    var sourceColorDiffs = {};
    var targetColorDiffs = {};
    for( var key in sourceVMDiffs ) {
        sourceColorDiffs[ _parseDelimitedUid( key ) ] = sourceVMDiffs[ key ];
    }
    for( key in targetVMDiffs ) {
        targetColorDiffs[ _parseDelimitedUid( key ) ] = targetVMDiffs[ key ];
    }
    if( sourcePageDiffs !== undefined ) {
        for( var diffElement in sourcePageDiffs ) {
            sourceColorDiffs[ _parseDelimitedUid( sourcePageDiffs[ diffElement ].uids ) ] = sourcePageDiffs[ diffElement ].diff;
        }
    }
    if( targetPageDiffs !== undefined ) {
        for( diffElement in targetPageDiffs ) {
            targetColorDiffs[ _parseDelimitedUid( targetPageDiffs[ diffElement ].uids ) ] = targetPageDiffs[ diffElement ].diff;
        }
    }
    compareContextService.updatePartialCtx( 'compareContext.sourceColorDiffs', sourceColorDiffs );
    compareContextService.updatePartialCtx( 'compareContext.targetColorDiffs', targetColorDiffs );
    _updatePropertyDiffMap( startFreshCompare );
};

export let resetData = function() {
    _counter = 0;
    awStructureCompareNotificationService.resetNotificationCounter();
    _sourceVMOs.length = 0;
    _targetVMOs.length = 0;
    _diffPanelOpened = false;
    _comparePanelOpened = false;
    _isRootTileSelected = false;
    _resetCompareResults = false;
    appCtxSvc.updatePartialCtx( 'decoratorToggle', _oldDecoratorToggle );
    appCtxSvc.unRegisterCtx( 'compareList' );
    appCtxSvc.unRegisterCtx( 'compareContext' );
    appCtxSvc.unRegisterCtx( 'cellClass' );
};

export let resetCompareColorData = function( gridLocation ) {
    if( compareContextService.getCtx( 'compareContext' ) &&
        !compareContextService.getCtx( 'compareContext.isInMultiLevelCompare' ) ) {
        var contextKeys = awStructureCompareUtils.getContextKeys();
        if( _isRootTileSelected ) {
            if( _resetCompareResults ) {
                resetContextData();
                exports.setDecoratorStyles( compareContextService.getCtx( contextKeys.leftCtxKey ).vmc.loadedVMObjects );
                exports.setDecoratorStyles( compareContextService.getCtx( contextKeys.rightCtxKey ).vmc.loadedVMObjects );
                resetHighlights( gridLocation );
            }
        } else {
            if( !compareContextService.getCtx( 'compareContext.navigatingFromDiffPanel' ) ) {
                resetContextData();
                exports.setDecoratorStyles( compareContextService.getCtx( contextKeys.leftCtxKey ).vmc.loadedVMObjects );
                exports.setDecoratorStyles( compareContextService.getCtx( contextKeys.rightCtxKey ).vmc.loadedVMObjects );
                resetHighlights( gridLocation );
            }
        }
        // Reset the navigatingFromDiffPanel
        if( compareContextService.getCtx( 'compareContext.navigatingFromDiffPanel' ) ) {
            compareContextService.updatePartialCtx( 'compareContext.navigatingFromDiffPanel', false );
        }
    }
    _isRootTileSelected = false;
    _resetCompareResults = false;
};

export let resetMultiLevelCompare = function() {
    compareContextService.updatePartialCtx( 'compareContext.isInMultiLevelCompare', false );
    compareContextService.updatePartialCtx( 'compareList.isConfigChanged', true );
    _resetCompareResults = true;
};

// Added for resetting data for Karma tests
export let resetVMOs = function() {
    _sourceVMOs.length = 0;
    _targetVMOs.length = 0;
};

export let showBackgrouondMessage = function() {
    var resource = 'StructureCompareMessages';
    var localeTextBundle = localeSvc.getLoadedText( resource );
    var infoMessage = localeTextBundle.messageForBackgroundCompare;
    var compareList = compareContextService.getCtx( 'compareList' );

    infoMessage = infoMessage.replace( '{0}', compareList.sourceSelection.props.object_string.uiValues );
    infoMessage = infoMessage.replace( '{1}', compareList.targetSelection.props.object_string.uiValues );

    messagingSvc.showInfo( infoMessage );
};

export let clearSelectionInGrid = function( gridLocation ) {
    var contextKeys = awStructureCompareUtils.getContextKeys();
    if( gridLocation === 1 ) {
        var compareSrc = compareContextService.getCtx( contextKeys.leftCtxKey );
        compareSrc.pwaSelectionModel.setSelection( [] );
    } else {
        var compareTrg = compareContextService.getCtx( contextKeys.rightCtxKey );
        compareTrg.pwaSelectionModel.setSelection( [] );
    }
};

export let navigateDifferences = function( gridLocation, selection, triggeredFromDiffPanel ) {
    var contextKeys = awStructureCompareUtils.getContextKeys();
    var compareSrc = compareContextService.getCtx( contextKeys.leftCtxKey );
    var compareTrg = compareContextService.getCtx( contextKeys.rightCtxKey );
    var compareSrcSelections = compareContextService.getCtx( compareSrc + '.selections' );
    var compareTrgSelections = compareContextService.getCtx( compareTrg + '.selections' );
    if( selection !== undefined && selection.length > 0 ) {
        var focus_uid = selection[ 0 ].uid;
        var equivalentObjects = [];
        if( gridLocation === 1 ) {
            if( compareSrcSelections !== undefined && compareSrcSelections.includes( focus_uid ) && compareSrcSelections.length - selection.length === 1 ) {
                //This is unselection case from multiple partial matches.
                AwStateService.instance.params.sf_uid = null;
                AwStateService.instance.params.tf_uid = null;
                AwStateService.instance.go( '.', AwStateService.instance.params );
                compareSrc.pwaSelectionModel.setSelection( [] );
                compareContextService.updatePartialCtx( compareSrc + '.selections', [] );
                compareTrg.pwaSelectionModel.setSelection( [] );
                compareContextService.updatePartialCtx( compareTrg + '.selections', [] );
            } else {
                AwStateService.instance.params.so_uid = _getParentUid( selection[ 0 ] );
                AwStateService.instance.params.sf_uid = focus_uid;
                compareContextService.updatePartialCtx( compareSrc + '.currentState.o_uid', AwStateService.instance.params.so_uid );
                compareContextService.updatePartialCtx( compareSrc + '.currentState.c_uid', AwStateService.instance.params.sf_uid );

                var sourceDiff = compareContextService.getCtx( 'compareContext.srcEquivalentList' );
                loadAndFetchEquivalentObject( focus_uid, sourceDiff ).then( function( equivalentObjects ) {
                    if( equivalentObjects.length > 0 ) {
                        for( var index = 0; index < equivalentObjects.length; index++ ) {
                            AwStateService.instance.params.to_uid = _getParentUid( equivalentObjects[ index ] );
                            AwStateService.instance.params.tf_uid = equivalentObjects[ index ].uid;
                            compareContextService.updatePartialCtx( compareTrg + '.currentState.o_uid', AwStateService.instance.params.to_uid );
                            compareContextService.updatePartialCtx( compareTrg + '.currentState.c_uid', AwStateService.instance.params.tf_uid );
                        }

                        // Reset the original selection
                        if( !triggeredFromDiffPanel ) {
                            compareSrc.pwaSelectionModel.setSelection( [] );
                        }

                        compareTrg.pwaSelectionModel.setSelection( equivalentObjects );
                        var trgIds = awStructureCompareUtils.getUidsFromModelObjects( equivalentObjects );
                        compareContextService.updatePartialCtx( compareTrg + '.selections', trgIds );

                        //get my equivalents,if any,
                        var equivalentSiblings = [];
                        var targetDiff = compareContextService.getCtx( 'compareContext.trgEquivalentList' );
                        for( let i = 0; i < equivalentObjects.length; i++ ) {
                            equivalentSiblings = getEquivalentObject( equivalentObjects[ i ].uid, targetDiff );
                            if( equivalentSiblings && equivalentSiblings.length > 0 ) {
                                break;
                            }
                        }

                        AwTimeoutService.instance( function() {
                            if( equivalentSiblings.length > 0 ) {
                                compareSrc.pwaSelectionModel.setSelection( equivalentSiblings );
                                var srcIds = awStructureCompareUtils.getUidsFromModelObjects( equivalentSiblings );
                                compareContextService.updatePartialCtx( compareSrc + '.selections', srcIds );
                            }
                        }, 0, false );
                    }
                } );
            }
        } else if( gridLocation === 2 ) {
            if( compareTrgSelections !== undefined && compareTrgSelections.includes( focus_uid ) && compareTrgSelections.length - selection.length === 1 ) {
                //This is unselection case from multiple partial matches.
                AwStateService.instance.params.sf_uid = null;
                AwStateService.instance.params.tf_uid = null;
                AwStateService.instance.go( '.', AwStateService.instance.params );
                compareTrg.pwaSelectionModel.setSelection( [] );
                compareContextService.updatePartialCtx( compareTrg + '.selections', [] );
                compareSrc.pwaSelectionModel.setSelection( [] );
                compareContextService.updatePartialCtx( compareSrc + '.selections', [] );
            } else {
                AwStateService.instance.params.to_uid = _getParentUid( selection[ 0 ] );
                AwStateService.instance.params.tf_uid = focus_uid;
                compareContextService.updatePartialCtx( compareTrg + '.currentState.o_uid', AwStateService.instance.params.to_uid );
                compareContextService.updatePartialCtx( compareTrg + '.currentState.c_uid', AwStateService.instance.params.tf_uid );

                var targetDiff = compareContextService.getCtx( 'compareContext.trgEquivalentList' );
                loadAndFetchEquivalentObject( focus_uid, targetDiff ).then( function( equivalentObjects ) {
                    if( equivalentObjects.length > 0 ) {
                        for( var index = 0; index < equivalentObjects.length; index++ ) {
                            AwStateService.instance.params.so_uid = _getParentUid( equivalentObjects[ index ] );
                            AwStateService.instance.params.sf_uid = equivalentObjects[ index ].uid;
                            compareContextService.updatePartialCtx( compareSrc + '.currentState.o_uid', AwStateService.instance.params.so_uid );
                            compareContextService.updatePartialCtx( compareSrc + '.currentState.c_uid', AwStateService.instance.params.sf_uid );
                        }

                        if( !triggeredFromDiffPanel ) {
                            compareTrg.pwaSelectionModel.setSelection( [] );
                        }

                        compareSrc.pwaSelectionModel.setSelection( equivalentObjects );
                        var srcIds = awStructureCompareUtils.getUidsFromModelObjects( equivalentObjects );
                        compareContextService.updatePartialCtx( compareSrc + '.selections', srcIds );

                        //get my equivalents,if any,
                        var equivalentSiblings = [];
                        var sourceDiff = compareContextService.getCtx( 'compareContext.srcEquivalentList' );

                        for( let i = 0; i < equivalentObjects.length; i++ ) {
                            equivalentSiblings = getEquivalentObject( equivalentObjects[ i ].uid, sourceDiff );
                            if( equivalentSiblings && equivalentSiblings.length > 0 ) {
                                break;
                            }
                        }

                        AwTimeoutService.instance( function() {
                            if( equivalentSiblings.length > 0 ) {
                                compareTrg.pwaSelectionModel.setSelection( equivalentSiblings );
                                var trgIds = awStructureCompareUtils.getUidsFromModelObjects( equivalentSiblings );
                                compareContextService.updatePartialCtx( compareTrg + '.selections', trgIds );
                            }
                        }, 0, false );
                    }
                } );
            }
        }
        // If user is navigating from differences panel in table mode for current level results,
        // the selected object could be part of an unloaded page, in such a
        // case we should not be resetting compare mode flag.
        // Adding an appCtx value called navigatingFromDiffPanel as true
        // which will be checked in resetCompareColorData and will not reset the compare data
        if( compareContextService.getCtx( 'compareContext.depth' ) === 1 && !compareGetService.isInTreeView() ) {
            compareContextService.updatePartialCtx( 'compareContext.navigatingFromDiffPanel', true );
        }
        AwStateService.instance.go( '.', AwStateService.instance.params );
    } else {
        AwStateService.instance.params.sf_uid = null;
        AwStateService.instance.params.tf_uid = null;
        AwStateService.instance.go( '.', AwStateService.instance.params );
        var _sourceDiffs = compareContextService.getCtx( 'compareContext.sourceDiffs' );
        var _targetDiffs = compareContextService.getCtx( 'compareContext.targetDiffs' );
        var _srcColorCode = 0;
        var _trgColorCode = 0;
        if( gridLocation === 1 ) {
            var _trgSelection = compareTrg.pwaSelectionModel.getSelection();
            _trgColorCode = _targetDiffs[ _trgSelection[ 0 ] ];
            if( _trgColorCode !== 2 ) {
                compareSrc.pwaSelectionModel.setSelection( [] );
            }
        }
        if( gridLocation === 2 ) {
            var _srcSelection = compareSrc.pwaSelectionModel.getSelection();
            _srcColorCode = _sourceDiffs[ _srcSelection[ 0 ] ];
            if( _srcColorCode !== 2 ) {
                compareTrg.pwaSelectionModel.setSelection( [] );
            }
        }
        if( _srcColorCode === 2 || _trgColorCode === 2 || _srcColorCode === 4 || _trgColorCode === 4 ) {
            compareSrc.pwaSelectionModel.setSelection( [] );
            compareTrg.pwaSelectionModel.setSelection( [] );
        }
        compareContextService.updatePartialCtx( compareSrc + '.selections', [] );
        compareContextService.updatePartialCtx( compareTrg + '.selections', [] );
    }
};

export let focusDiffResults = function( gridLocation, dataProvider ) {
    if( gridLocation === 1 && dataProvider.cursorObject === null ) {
        dataProvider.cursorObject = compareContextService.getCtx( 'compareContext.sourceCursor' );
    } else if( gridLocation === 2 && dataProvider.cursorObject === null ) {
        dataProvider.cursorObject = compareContextService.getCtx( 'compareContext.targetCursor' );
    }
};

export let toggleEquivalentRow = function( gridLocation, node ) {
    var focus_uid = node.uid;
    var equivalentObjects = [];
    var contextKeys = awStructureCompareUtils.getContextKeys();

    // Get the equivalence object
    var otherVMC;
    if( gridLocation === 1 ) {
        var sourceDiff = compareContextService.getCtx( 'compareContext.srcEquivalentList' );
        equivalentObjects = getEquivalentObject( focus_uid, sourceDiff );
        otherVMC = compareContextService.getCtx( contextKeys.rightCtxKey ).vmc;
    } else if( gridLocation === 2 ) {
        var targetDiff = compareContextService.getCtx( 'compareContext.trgEquivalentList' );
        equivalentObjects = getEquivalentObject( focus_uid, targetDiff );
        otherVMC = compareContextService.getCtx( contextKeys.leftCtxKey ).vmc;
    }

    //Expand the equivalence node in other tree (only for partial match)
    if( otherVMC && equivalentObjects && equivalentObjects.length > 0 ) {
        var objNdx = otherVMC.findViewModelObjectById( equivalentObjects[ 0 ].uid );
        if( objNdx > -1 && node.isExpanded ) {
            var vmNode = otherVMC.getViewModelObject( objNdx );
            vmNode.isSystemExpanded = true;
            eventBus.publish( otherVMC.name + '.expandTreeNode', {
                parentNode: vmNode
            } );
        }
    }
};

export let showDifferencesPanel = function() {
    if( !_diffPanelOpened ) {
        awStructureCompareOptionsService.setInitialCompareOption();
        commandPanelService.activateCommandPanel( 'AwStructureCompareDifferences', 'aw_navigation' );
        _diffPanelOpened = true;
    }
};

/**
 * Structure Compare service utility
 */

export default exports = {
    initializeCompareList,
    resetCompareContext,
    showComparePanel,
    setDecoratorStyles,
    getPCIForSelection,
    performCompare,
    invokeSoa,
    getSelectedVMOs,
    updateColorMapData,
    resetData,
    resetCompareColorData,
    resetMultiLevelCompare,
    resetVMOs,
    showBackgrouondMessage,
    clearSelectionInGrid,
    navigateDifferences,
    focusDiffResults,
    toggleEquivalentRow,
    showDifferencesPanel
};
app.factory( 'awStructureCompareService', () => exports );
