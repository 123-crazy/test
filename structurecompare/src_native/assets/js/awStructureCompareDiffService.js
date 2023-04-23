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
 * @module js/awStructureCompareDiffService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import compareContextService from 'js/awStructureCompareContextService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import awStructureCompareUtils from 'js/awStructureCompareUtils';
import compareGetService from 'js/awStructureCompareGetService';
import awStructureCompareService from 'js/awStructureCompareService';
import _ from 'lodash';

var exports = {};

var _updateCommonPagedResultContexts = function( dataInput ) {
    compareContextService.updatePartialCtx( 'compareContext.isInCompareMode', dataInput.isInCompareMode );
    compareContextService
        .updatePartialCtx( 'compareContext.depth', dataInput.depth );
};

var _updateSrcPagedResultContexts = function( dataInput ) {
    compareContextService.updatePartialCtx( 'compareContext.sourceDifferences', dataInput.pagedDifferences );
    compareContextService.updatePartialCtx( 'compareContext.sourceCursor', dataInput.cursor );
};

var _updateTrgPagedResultContexts = function( dataInput ) {
    compareContextService.updatePartialCtx( 'compareContext.targetDifferences', dataInput.pagedDifferences );
    compareContextService.updatePartialCtx( 'compareContext.targetCursor', dataInput.cursor );
};

var processDifferences = function( uidsToLoad, location, diffOutput, differenceResponse, deferred ) {
    var differenceResults = [];
    for( var index = 0; index < uidsToLoad.length; ++index ) {
        var uid;
        var uidKey = uidsToLoad[ index ];
        var indx = uidKey.indexOf( awStructureCompareUtils.getDelimiterKey() );
        if( indx > -1 ) {
            var uids = uidKey.split( awStructureCompareUtils.getDelimiterKey(), 2 );
            uid = uids[ 0 ]; //Get the first uid
        } else {
            uid = uidKey;
        }
        var mo = cdm.getObject( uid );
        differenceResults.push( mo );
    }
    if( location === 1 ) {
        diffOutput.sourceDifferences = differenceResults;
        diffOutput.cursorObject = differenceResponse.sourceCursor;
        diffOutput.srcTotalFound = differenceResults.length;
    } else if( location === 2 ) {
        diffOutput.targetDifferences = differenceResults;
        diffOutput.cursorObject = differenceResponse.targetCursor;
        diffOutput.trgTotalFound = differenceResults.length;
    }
    deferred.resolve( diffOutput );
};

var _invokeCustomLoadObjectsForDiffpanel = function( uidsToLoad, deferred, location, differenceResponse,
    diffOutput ) {
    // Added limited properties for load objects
    // Also added awb0Parent which will be needed to be removed later
    var policyIOverride = {
        "types": [ {
            "name": "Awb0Element",
            "properties": [ {
                "name": "awp0ThumbnailImageTicket"
            }, {
                "name": "object_string"
            }, {
                "name": "awb0UnderlyingObject"
            }, {
                "name": "awb0Parent"
            }, {
                "name": "awp0CellProperties"
            } ]
        }, {
            "name": "Fgd0DesignElement",
            "properties": [ {
                "name": "awb0UnderlyingObject",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            } ]
        }, {
            "name": "Cpd0DesignElement",
            "properties": [ {
                "name": "cpd0category"
            } ]
        } ]
    };
    // Filter out already loaded vmos from the loading
    var missingUids = [];
    _.forEach( uidsToLoad, function( uid ) {
        var indx = uid.indexOf( awStructureCompareUtils.getDelimiterKey() );
        if( indx > -1 ) {
            var uids = uid.split( awStructureCompareUtils.getDelimiterKey(), 2 );
            uid = uids[ 0 ]; //Get the first uid
        }
        var modelObject = cdm.getObject( uid );
        if( !modelObject || _.isEmpty( modelObject.props ) ) {
            missingUids.push( uid );
        }
    } );
    if( missingUids.length > 0 ) {
        soaSvc.postUnchecked( 'Core-2007-09-DataManagement', 'loadObjects', {
            uids: missingUids
        }, policyIOverride ).then( function() {
            processDifferences( uidsToLoad, location, diffOutput, differenceResponse, deferred );
        } );
    } else {
        processDifferences( uidsToLoad, location, diffOutput, differenceResponse, deferred );
    }
    return deferred.promise;
};

// Common code to post process differences panel results, invoked during first load of src/trg differences
// as well as next page difference
var _invokeAndProcessPagedDifferences = function( compareInput, location, deferred ) {
    awStructureCompareService.invokeSoa( compareInput ).then(
        function( response ) {
            if( response ) {
                var diffOutput = {};
                var partialCtxUpdate = {};
                partialCtxUpdate.isInCompareMode = true;
                partialCtxUpdate.depth = response.sourceDepth;

                _updateCommonPagedResultContexts( partialCtxUpdate );
                if( location === 1 ) {
                    partialCtxUpdate.pagedDifferences = response.pagedSourceDifferences;
                    partialCtxUpdate.cursor = response.sourceCursor;
                    _updateSrcPagedResultContexts( partialCtxUpdate );
                    diffOutput = {
                        sourceDifferences: [],
                        cursorObject: null,
                        totalFound: 0
                    };
                } else if( location === 2 ) {
                    partialCtxUpdate.pagedDifferences = response.pagedTargetDifferences;
                    partialCtxUpdate.cursor = response.targetCursor;
                    _updateTrgPagedResultContexts( partialCtxUpdate );
                    diffOutput = {
                        targetDifferences: [],
                        cursorObject: null,
                        totalFound: 0
                    };
                }
                var processedSrcIds = awStructureCompareUtils.processVMODifferences( null, response.pagedSourceDifferences, 1 );
                var processedTrgIds = awStructureCompareUtils.processVMODifferences( null, response.pagedTargetDifferences, 2 );
                var finalEquivalenceList = processedSrcIds.equivalIds;
                finalEquivalenceList = finalEquivalenceList.concat( processedTrgIds.equivalIds );
                compareContextService.updatePartialCtx( 'compareContext.equivalenceObj', finalEquivalenceList );

                var tobeLoadedUIDs = [];
                for( var index = 0; index < partialCtxUpdate.pagedDifferences.length; ++index ) {
                    tobeLoadedUIDs.push( partialCtxUpdate.pagedDifferences[ index ].uids );
                }
                awStructureCompareService.updateColorMapData();
                return _invokeCustomLoadObjectsForDiffpanel( tobeLoadedUIDs, deferred, location, response,
                    diffOutput );

            }
        } );
    return deferred.promise;
};

/* Exports section */

export let getFirstSourceDifferences = function( cursorObject ) {
    var deferred = AwPromiseService.instance.defer();
    var diffOutput = {};
    var srcDiffs = compareContextService.getCtx( 'compareContext.sourceDifferences' );
    var srcCursor = cursorObject;
    if( srcCursor === undefined || srcCursor === null ) {
        srcCursor = compareContextService.getCtx( 'compareContext.sourceCursor' );
    }
    var prevCursor = compareContextService.getCtx( 'compareContext.prevSrcCursor' );
    var prevData = compareContextService.getCtx( 'compareContext.prevSrcData' );
    if( prevData !== undefined && prevData.length > 0 ) {
        srcDiffs = prevData;
        srcCursor = prevCursor;
        compareContextService.updatePartialCtx( 'compareContext.sourceDifferences', srcDiffs );
        awStructureCompareService.updateColorMapData();
    } else {
        // Update the cursor and data to app context for next page to work properly
        compareContextService.updatePartialCtx( 'compareContext.prevSrcCursor', srcCursor );
        compareContextService.updatePartialCtx( 'compareContext.prevSrcData', srcDiffs );
    }
    diffOutput = {
        sourceDifferences: [],
        cursorObject: null,
        srcTotalFound: 0
    };
    var tobeLoadedUIDs = [];
    if( srcDiffs ) {
        for( var index = 0; index < srcDiffs.length; ++index ) {
            tobeLoadedUIDs.push( srcDiffs[ index ].uids );
        }
    }
    var customResponse = {
        sourceDifferences: srcDiffs,
        sourceCursor: srcCursor
    };
    return _invokeCustomLoadObjectsForDiffpanel( tobeLoadedUIDs, deferred, 1, customResponse, diffOutput );
};

export let getNextSourceDifferences = function( cursorObject ) {
    var deferred = AwPromiseService.instance.defer();
    var sourceCursor = cursorObject;
    var targetCursor = awStructureCompareUtils.getDefaultCursor();
    targetCursor.startIndex = -1;

    var compareInput = compareGetService.createSOAInputForPaginationAndVisibleUids(
        compareContextService.getCtx( 'compareContext.depth' ), false, false,
        sourceCursor, targetCursor, awStructureCompareService.getSelectedVMOs().source,
        awStructureCompareService.getSelectedVMOs().target, null );

    return _invokeAndProcessPagedDifferences( compareInput, 1, deferred );
};

export let getFirstTargetDifferences = function( cursorObject ) {
    var deferred = AwPromiseService.instance.defer();
    var diffOutput = {};
    var trgDiffs = compareContextService.getCtx( 'compareContext.targetDifferences' );
    var trgCursor = cursorObject;
    if( trgCursor === undefined || trgCursor === null ) {
        trgCursor = compareContextService.getCtx( 'compareContext.targetCursor' );
    }
    var prevCursor = compareContextService.getCtx( 'compareContext.prevTrgCursor' );
    var prevData = compareContextService.getCtx( 'compareContext.prevTrgData' );
    if( prevData !== undefined && prevData.length > 0 ) {
        trgDiffs = prevData;
        trgCursor = prevCursor;
        compareContextService.updatePartialCtx( 'compareContext.targetDifferences', trgDiffs );
        awStructureCompareService.updateColorMapData();
    } else {
        // Update the cursor and data to app context for next page to work properly
        compareContextService.updatePartialCtx( 'compareContext.prevTrgCursor', trgCursor );
        compareContextService.updatePartialCtx( 'compareContext.prevTrgData', trgDiffs );
    }
    diffOutput = {
        targetDifferences: [],
        cursorObject: null,
        trgTotalFound: 0
    };
    var tobeLoadedUIDs = [];
    if( trgDiffs ) {
        for( var index = 0; index < trgDiffs.length; ++index ) {
            tobeLoadedUIDs.push( trgDiffs[ index ].uids );
        }
    }
    var customResponse = {
        targetDifferences: trgDiffs,
        targetCursor: trgCursor
    };
    return _invokeCustomLoadObjectsForDiffpanel( tobeLoadedUIDs, deferred, 2, customResponse, diffOutput );
};

export let getNextTargetDifferences = function( cursorObject ) {
    var deferred = AwPromiseService.instance.defer();
    var sourceCursor = awStructureCompareUtils.getDefaultCursor();
    sourceCursor.startIndex = -1;
    var targetCursor = cursorObject;

    var compareInput = compareGetService.createSOAInputForPaginationAndVisibleUids(
        compareContextService.getCtx( 'compareContext.depth' ), false, false,
        sourceCursor, targetCursor, awStructureCompareService.getSelectedVMOs().source,
        awStructureCompareService.getSelectedVMOs().target, null );

    return _invokeAndProcessPagedDifferences( compareInput, 2, deferred );
};

/**
 * @member awStructureCompareDiffService
 */

export default exports = {
    getFirstSourceDifferences,
    getNextSourceDifferences,
    getFirstTargetDifferences,
    getNextTargetDifferences
};
app.factory( 'awStructureCompareDiffService', () => exports );
