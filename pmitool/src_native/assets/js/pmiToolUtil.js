// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/pmiToolUtil
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import localeSvc from 'js/localeService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

/**
 * Returns ModelView Entities.
 *
 * @param {Object} data from raw data
 */
export let parseModelViewData = function( data ) {
    var modelViewEntities = [];

    if( _.isArray( data ) ) {
        var index = 0;

        _.forEach( data, function( entityValue ) {
            if( _.isArray( entityValue ) && _.size( entityValue ) >= 3 ) {
                var modelViewEntity = {
                    index: index++,
                    modelViewId: entityValue[ 0 ],
                    value: entityValue[ 1 ],
                    type: entityValue[ 1 ],
                    resourceId: entityValue[ 3 ],
                    isGroup: true,
                    isVisibleInMVTab: true,
                    propertyDisplayName: entityValue[ 1 ],
                    selected: false, //handles aw-tree selection
                    isVisibilityOn: entityValue[ 2 ] === 'true' //handles if the visibility is on once the panel is open
                };

                modelViewEntities.push( modelViewEntity );
            }
        } );
    }

    return modelViewEntities;
};

/**
 * Returns Entities.
 *
 * @param {Object} data from raw data
 */
export let parsePmiEntityData = function( data ) {
    var pmiEntities = [];

    if( _.isArray( data ) ) {
        var index = 0;

        _.forEach( data, function( entityValue ) {
            if( _.isArray( entityValue ) && _.size( entityValue ) > 3 ) {
                var pmiEntity = {
                    index: index++,
                    id: entityValue[ 0 ],
                    value: entityValue[ 1 ],
                    type: entityValue[ 2 ],
                    resourceId: entityValue[ 4 ],
                    isGroup: false,
                    parentModelView: [],
                    isVisibleInMVTab: false,
                    isVisibleInTypesTab: false,
                    propertyDisplayName: entityValue[ 1 ],
                    isVisibilityOn: entityValue[ 3 ] === 'true',
                    selected:entityValue[5]  //handles if the selection is on once the panel is open
                };

                pmiEntities.push( pmiEntity );
            }
        } );
    }

    var typeGroupedPmiEntities = _.groupBy( pmiEntities, 'type' );
    var groupKeys = _.keys( typeGroupedPmiEntities );
    var typesViewModelArray = [];

    _.forEach( groupKeys, function( key ) {
        var displayEntity = {
            id: key,
            value: key,
            type: key,
            isGroup: true,
            isVisibleInTypesTab: true,
            propertyDisplayName: key,
            selected: false,
            children: typeGroupedPmiEntities[ key ]
        };
        let children = _.filter( typeGroupedPmiEntities[ key ], entity => entity.isVisibilityOn );
        displayEntity.isVisibilityOn = children.length === typeGroupedPmiEntities[ key ].length;
        typesViewModelArray.push( displayEntity );
    } );

    return typesViewModelArray;
};

/**
 * Handler step through previous action
 */
export let stepThroughPrevCommand = function() {
    eventBus.publish( 'pmiTool.stepPrev' );
};

/**
 * Handler step through next action
 */
export let stepThroughNextCommand = function() {
    eventBus.publish( 'pmiTool.stepNext' );
};

/**
 * Returns true if is in Ace sublocation.
 */
export let isInAce = function() {
    return appCtxService.ctx.sublocation.nameToken === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' &&
        ( !appCtxService.ctx.sublocation.label || appCtxService.ctx.sublocation.label !== 'Disclosure' );
};

/**
 * gets selection display name
 * @return {String} selection display name
 */
export let getSelectionDisplayName = function() {
    var pmiToolCtx = exports.getPmiCtx();
    var selection = pmiToolCtx.targetList[ 0 ];
    var object = viewModelObjectService.constructViewModelObjectFromModelObject( selection );

    return object.cellHeader1;
};

/**
 * gets local text bundle
 * @returns {Object} text bundle
 */
var _getLocalTextBundle = function() {
    var resource = 'PmiToolMessages.json';
    return localeSvc.getLoadedText( resource );
};

/**
 * Gets Active Viewer Command Context path
 */
export let getActiveViewerCmdCtxPartPath = function() {
    var viewerCtx = appCtxService.getCtx( 'viewer' );
    return viewerCtx.activeViewerCommandCtx;
};

/**
 * Gets Active Viewer Command Context
 */
export let getActiveViewerCmdCtx = function() {
    return appCtxService.getCtx( exports.getActiveViewerCmdCtxPartPath() );
};

/**
 * Gets Pmi Context
 */
export let getPmiCtx = function() {
    var viewerCtx = appCtxService.getCtx( exports.getActiveViewerCmdCtxPartPath() );
    return viewerCtx.pmiToolCtx;
};

/**
 * Update Active Viewer Command Context with given partial path and its value
 */
export let updateActiveViewerCmdCtx = function( partialPath, value ) {
    var updatedPartialPath = exports.getActiveViewerCmdCtxPartPath() + '.' + partialPath;
    appCtxService.updatePartialCtx( updatedPartialPath, value );
};

/**
 * Updates the display strings in text bundle
 * @param  {Object} data view model
 */
export let updateDisplayStrings = function( data ) {
    var rb = _getLocalTextBundle();
    var hasNoPmiText = rb.hasNoPmi;
    hasNoPmiText = hasNoPmiText.replace( '{0}', exports.getSelectionDisplayName() );

    var notCurrentlyVisibleText = _getLocalTextBundle().notCurrentlyVisible;
    notCurrentlyVisibleText = notCurrentlyVisibleText.replace( '{0}', exports.getSelectionDisplayName() );
    return {notCurrentlyVisibleText: notCurrentlyVisibleText, 
        hasNoPmiText: hasNoPmiText};
};

/**
 * Returns node if exists in tree otherwise null.
 * Search the node in a tree in order to expand the specific node
 * @param  {String} key node name in the given key that is 'value'
 * @param  {String} regex search this regex in tree node
 * @param  {String} node a part of tree node
 */
function searchTreeOnEnteredValue( key, regex, node ) {
    var keyStr = _.get( node, key );
    if( regex.test( keyStr ) ) {
        node.expanded = true;
        return node;
    } else if( node.children ) {
        for( var i = 0; i < node.children.length; i++ ) {
            var outNode = searchTreeOnEnteredValue( key, regex, node.children[ i ] );
            if( outNode ) {
                node.expanded = true;
                return outNode;
            }
        }
    }
    return null;
}

/**
 * Returns updated data with expanded key value in tree node
 * Expand the specific node in aw-tree without selection
 * @param  {Object} data view model
 *  @param  {String} node name which needs to be expanded
 */
export let treeNodeExpansion = function( data, node ) {
    var val = '.*' + node + '.*';
    var regex = new RegExp( val, 'i' );
    let searchedNode;
    let sampleData = data.entities;

    for( var i = 0; i < sampleData.length; i++ ) {
        searchedNode = searchTreeOnEnteredValue( 'value', regex, sampleData[ i ] );
        if( searchedNode ) {
            break;
        }
    }
    return sampleData;
};

/**
 * Returns selected object
 * Get selected node from data
 *
 * @param {object} viewModelData PMI/Model View entities from their respective classes
 * @param {object} node the node that is selected
 */
function getNodeFromArrayOfObjects( viewModelData, node ) {
    let selectedObject;
    if( !node.isGroup ) {
        let mvParentObject = _.find( viewModelData, p => p.id === node.type );
        selectedObject = _.find( mvParentObject.children, pmiChild => pmiChild.value === node.value );
    } else {
        selectedObject = _.find( viewModelData, mv => mv.value === node.value );
    }
    return selectedObject;
}

/**
 * sets new state for item objects array.
 *
 * @param {Object[]} itemObjectsToProcess
 */
export let setPmiElementProperty = function( itemObjectsToProcess ) {
    if( !_.isEmpty( itemObjectsToProcess ) ) {
        let viewerCtxNameSpace = exports.getActiveViewerCmdCtxPartPath();
        let pmiCtx = exports.getPmiCtx();
        let perOccurrence = exports.isInAce() && _.findIndex( pmiCtx.targetCSIDs, '' ) < 0;
        return viewerSecondaryModelService.setPmiElementProperty( viewerCtxNameSpace, perOccurrence,
            _.map( itemObjectsToProcess, 'id' ), _.map( itemObjectsToProcess, 'value' ),
            _.map( itemObjectsToProcess, 'state' ) );
    }
};

export default exports = {
    parseModelViewData,
    parsePmiEntityData,
    stepThroughPrevCommand,
    stepThroughNextCommand,
    isInAce,
    getActiveViewerCmdCtxPartPath,
    getActiveViewerCmdCtx,
    getPmiCtx,
    updateActiveViewerCmdCtx,
    updateDisplayStrings,
    treeNodeExpansion,
    getNodeFromArrayOfObjects,
    setPmiElementProperty,
    getSelectionDisplayName
};
/**
 * This service contributes to pmitool in ActiveWorkspace Visualization
 *
 * @member pmiToolUtil
 * @memberof NgServices
 */
app.factory( 'pmiToolUtil', () => exports );
