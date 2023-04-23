// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/qfm0FmeaGraphDataService
 */
import app from 'app';
import eventBus from 'js/eventBus';

var exports = {};

var EXPANDDIRECTION_ALL = 'all';
var EXPANTIONTYPE_TREE = 'tree';
var cacheSeedIdsAndDirection = function( ctx, data, eventData ) {
    //The object UIDs will be used as query network input if it's an valid array, otherwise take the selected object in context as root object.
    var seedIDs = [ ctx.selected.uid ];
    var expandDirection = EXPANDDIRECTION_ALL;
    data.expansionType = EXPANTIONTYPE_TREE;
    if ( eventData ) {
        if ( eventData.rootIDs ) {
            seedIDs = eventData.rootIDs;
        }
        if ( eventData.expandDirection ) {
            expandDirection = eventData.expandDirection;
        }
        if ( eventData.expansionType ) {
            data.expansionType = eventData.expansionType;
        }
        if(eventData.fmeaElementToAdd){
            data.fmeaElementToAdd = eventData.fmeaElementToAdd;
        }
    }
    // cache the seedIDs and expandDirection
    data.seedIDs = seedIDs;
    data.expandDirection = expandDirection;
};

export let getQueryNetworkInput = function( ctx, data, eventData ) {
    if ( !ctx || !data ) {
        return;
    }
    if ( !data.seedIds || !data.expandDirection ) {
        cacheSeedIdsAndDirection( ctx, data, eventData );
    }

    var viewName;
    switch ( ctx.selected.type ) {
        case 'Qfm0SystemElement':
            viewName = 'SystemNetView';
            break;
        case 'Qfm0FunctionElement':
            viewName = 'FunctionNetView';
            break;
        case 'Qfm0FailureElement':
            viewName = 'FailureNetView';
            break;
        case 'Qam0QualityAction':
            viewName = 'FailureNetView';
            break;
    }

    return {
        netViewParamMap: {
            direction: [ data.expandDirection ],
            level: [ '1' ],
            expansionType: [ data.expansionType ]
        },
        inquiries: [],
        queryMode: 'ExpandAndDegree',
        rootUIDs: data.seedIDs,
        viewName: viewName
    };
};

export let requestGraphData = function( ctx, data, eventData ) {
    cacheSeedIdsAndDirection( ctx, data, eventData );

    if ( data && data !== undefined && data.graphModel !== undefined && data.graphModel.graphControl !== undefined && data.graphModel.graphControl._session !== undefined ) {
        data.graphModel.graphControl._session.getViewConfig().keepZoomRatio = false;
    }
    eventBus.publish( 'Gc1TestHarness.queryNetwork', {
        rootIDs: data.seedIDs,
        expandDirection: data.expandDirection,
        expansionType: data.expansionType,
        fmeaElementToAdd:data.fmeaElementToAdd
    } );
};
export default exports = {
    getQueryNetworkInput,
    requestGraphData
};
