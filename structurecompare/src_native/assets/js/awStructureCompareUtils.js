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
 * @module js/awStructureCompareUtils
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';

var exports = {};

export let getChildCount = function( topElement ) {
    return parseInt( topElement.props.awb0NumberOfChildren.dbValues[ 0 ], 10 );
};

export let getDefaultCursor = function() {
    return {
        startReached: true,
        endReached: false,
        startIndex: 0,
        endIndex: 0,
        pageSize: 40,
        isForward: true
    };
};

export let processVMODifferences = function( originalDifferences, pagedDifferences, gridLocation ) {
    var diffIds = {};
    var equivalenceIds = [];
    var mappingUids = {};
    var equivalentList = {};
    if( gridLocation === 1 ) {
        equivalentList = appCtxSvc.getCtx( 'compareContext.srcEquivalentList' );
        if( !equivalentList ) {
            equivalentList = {};
        }
    } else if( gridLocation === 2 ) {
        equivalentList = appCtxSvc.getCtx( 'compareContext.trgEquivalentList' );
        if( !equivalentList ) {
            equivalentList = {};
        }
    }
    if( originalDifferences ) {
        for( var key in originalDifferences ) {
            if( originalDifferences[ key ] === 2 || originalDifferences[ key ] === 4 ) {
                var ids = key.split( exports.getDelimiterKey() );
                diffIds[ ids[ 0 ] ] = originalDifferences[ key ];
                if( ids.length > 1 ) {
                    var tempEquivalenceIds = [];
                    for( var index2 = 1; index2 < ids.length; index2++ ) {
                        var vmo = {
                            uid: ids[ index2 ]
                        };
                        tempEquivalenceIds.push( ids[ index2 ] );
                        equivalenceIds.push( vmo );
                    }
                    mappingUids[ ids[ 0 ] ] = tempEquivalenceIds;
                    equivalentList[ ids[ 0 ] ] = tempEquivalenceIds;
                }
            } else {
                diffIds[ key ] = originalDifferences[ key ];
            }
        }
    }
    if( pagedDifferences ) {
        for( var index = 0; index < pagedDifferences.length; index++ ) {
            if( pagedDifferences[ index ].diff === 2 || pagedDifferences[ index ].diff === 4 ) {
                var uids = pagedDifferences[ index ].uids;
                if( uids ) {
                    var ids = uids.split( exports.getDelimiterKey() );
                    diffIds[ ids[ 0 ] ] = pagedDifferences[ index ].diff;
                    if( ids.length > 1 ) {
                        var tempEquivalenceIds = [];
                        for( var index2 = 1; index2 < ids.length; index2++ ) {
                            var vmo = {
                                uid: ids[ index2 ]
                            };
                            tempEquivalenceIds.push( ids[ index2 ] );
                            equivalenceIds.push( vmo );
                        }
                        mappingUids[ ids[ 0 ] ] = tempEquivalenceIds;
                        equivalentList[ ids[ 0 ] ] = tempEquivalenceIds;
                    }
                }
            } else {
                diffIds[ pagedDifferences[ index ].uids ] = pagedDifferences[ index ].diff;
            }
        }
    }
    if( gridLocation === 1 ) {
        appCtxSvc.updatePartialCtx( 'compareContext.srcEquivalentList', equivalentList );
    } else if( gridLocation === 2 ) {
        appCtxSvc.updatePartialCtx( 'compareContext.trgEquivalentList', equivalentList );
    }
    return {
        colorSwabIds: diffIds,
        equivalIds: equivalenceIds,
        mappingData: mappingUids
    };
};

export let getUidsFromModelObjects = function( modelObjects ) {
    var uids = [];
    if( modelObjects && modelObjects.length > 0 ) {
        for( var index = 0; index < modelObjects.length; index++ ) {
            uids.push( modelObjects[ index ].uid );
        }
    }
    return uids;
};

export let getDelimiterKey = function() {
    return "##";
};

export let getContextKeys = function() {
    var _contextKeys = {
        leftCtxKey: null,
        rightCtxKey: null
    };
    var _multipleContext = appCtxSvc.getCtx( 'ace.multiStructure' );
    if( _multipleContext ) {
        _contextKeys.leftCtxKey = _multipleContext.leftCtxKey;
        _contextKeys.rightCtxKey = _multipleContext.rightCtxKey;
    } else {
        _multipleContext = appCtxSvc.getCtx( 'splitView' );
        if( _multipleContext ) {
            _contextKeys.leftCtxKey = _multipleContext.viewKeys[ 0 ];
            _contextKeys.rightCtxKey = _multipleContext.viewKeys[ 1 ];
        }
    }
    return _contextKeys;
};

/**
 * @member awStructureCompareUtils
 */

export default exports = {
    getChildCount,
    getDefaultCursor,
    processVMODifferences,
    getUidsFromModelObjects,
    getDelimiterKey,
    getContextKeys
};
app.factory( 'awStructureCompareUtils', () => exports );
