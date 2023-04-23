// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global define
    angular
*/

/**
 * @module js/PlanNavigationTreeUtils
 */

import _ from 'lodash';
import _t from 'js/splmTableNative';
import appCtx from 'js/appCtxService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import selectionSvc from 'js/selection.service';
import viewModelService from 'js/viewModelService';
import _cdm from 'soa/kernel/clientDataModel';

let exports;
let policyId;

/**
 * Returns the first element matching the given attribute.
 *
 * @param {Array} elements elements to find a match from
 * @param {String} attrName attribute name to match
 * @param {String} attrValue attribute value to match
 * @returns {object} matching element
 */
let getFirstMatchingElement = ( elements, attrName, attrValue ) => {
    let matchingElement = null;
    for( var i = 0; i < elements.length; ++i ) {
        let attr = elements[ i ].getAttribute( attrName );
        if( attr && attr === attrValue ) {
            matchingElement = elements[ i ];
            break;
        }
    }

    return matchingElement;
};

/**
 * @returns {object} Plan Navigation tree table
 */
export let getPlanNavigationTreeTableElement = () => {
    let tables = document.getElementsByTagName( _t.Const.CLASS_TABLE );
    return getFirstMatchingElement( tables, 'gridid', 'planNavigationTree' );
};

/**
 * @returns {object} Plan Navigation tree table
 */
export let getProgramBoardElement = () => {
    let includeElements = document.getElementsByTagName( 'aw-include' );
    return getFirstMatchingElement( includeElements, 'view-id', 'programBoardView' );
};

/**
 * @returns {object} Plan Navigation Timeline
 */
export let getPlanNavigationTimelineElement = () => {
    let includeElements = document.getElementsByTagName( 'aw-include' );
    return getFirstMatchingElement( includeElements, 'view-id', 'planNavigationTimeline' );
};

/**
 * Returns the root node (Program) in the tree.
 * This returns the ViewModelTreeeNode object and NOT ViewModelObject.
 * @returns {Object} The root view model tree node.
 */
export let getRootTreeNode = () => {
    let rootTreeNode;
    let viewModel = viewModelService.getViewModelUsingElement( exports.getPlanNavigationTreeTableElement() );
    if( viewModel ) {
        rootTreeNode = viewModel.dataProviders.planNavigationTreeDataProvider.viewModelCollection.loadedVMObjects[ 0 ];
    }
    return rootTreeNode;
};

/**
 * Returns the height of the schedule navigation tree table container.
 *
 * @returns {number} Height of the tree table
 */
export let getTreeTableHeight = () => {
    let tableHeight = 0;
    let planNavigationTreeTable = exports.getPlanNavigationTreeTableElement();

    if( planNavigationTreeTable ) {
        let splmTableTraversal = _t.Trv( planNavigationTreeTable );
        let tableContainer = splmTableTraversal.getTableContainerElementFromTable();
        tableHeight = tableContainer.clientHeight;
        if( tableContainer.children.length >= 3 ) {
            let tableScrollContainer = tableContainer.children[ 2 ];
            let tableViewPort;
            if( tableScrollContainer && tableScrollContainer.children.length >= 2 ) {
                tableViewPort = tableScrollContainer.children[ 1 ];
            }

            let scrollbarWidth = getScrollbarWidth();
            let ganttScrollElement = document.getElementsByClassName( 'gantt_hor_scroll' );
            if( ganttScrollElement.length > 0 && tableViewPort && tableViewPort.scrollWidth <= tableViewPort.clientWidth && ( tableViewPort
                    .offsetWidth - tableViewPort.clientWidth >= scrollbarWidth - 1 || tableViewPort.offsetWidth === tableViewPort.clientWidth ) ) {
                tableHeight += scrollbarWidth;
            } else if( ganttScrollElement.length === 0 && tableViewPort && ( tableViewPort.scrollWidth > tableViewPort.clientWidth || ( tableViewPort.scrollWidth === tableViewPort.clientWidth &&
                    tableViewPort
                    .offsetWidth - tableViewPort.clientWidth < scrollbarWidth - 1 && tableViewPort.offsetWidth !== tableViewPort.clientWidth ) ) ) {
                tableHeight -= scrollbarWidth;
            }
        }
    }
    return tableHeight + 2;
};

function getScrollbarWidth() {

    // Creating invisible container
    const outer = document.createElement( 'div' );
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll'; // forcing scrollbar to appear
    outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
    document.body.appendChild( outer );

    // Creating inner element and placing it in the container
    const inner = document.createElement( 'div' );
    outer.appendChild( inner );

    // Calculating difference between container's full width and the child width
    const scrollbarWidth = ( outer.offsetWidth - inner.offsetWidth );

    // Removing temporary elements from the DOM
    outer.parentNode.removeChild( outer );

    return scrollbarWidth;

}

/**
 * Determines if the current sublocation is Schedule navigation sublocation
 *
 * @returns {boolean} true, if the current sublocation is Schedule navigation sublocation; false otherwise.
 */
export let isPlanNavigationSublocation = () => {
    return appCtx.ctx.locationContext &&
        appCtx.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.prgplanning:PlanNavigationSubLocation';
};

/**
 * Returns the UIDs of the given tree nodes.
 *
 * @param {Array} treeNodes view model tree nodes
 * @returns {Array} Uids uids of the tree nodes
 */
export let getUidsOfTreeNodes = ( treeNodes ) => {
    let uids = [];
    if( Array.isArray( treeNodes ) ) {
        treeNodes.forEach( ( node ) => {
            uids.push( node.uid );
        } );
    }

    return uids;
};

export let updateSelectionForSecondary = ( data ) => {
    if( !_.isEmpty( data.eventData ) ) {
        // this check added - in case of deletion of Milestone from timeline, data.eventData just contains Uid of context
        if( data.eventData.uid === undefined ) {
            data.eventData = _cdm.getObject( data.eventData );
        }
        data.dataProviders.planNavigationTreeDataProvider.selectionModel.selectNone();
    }
};

export let loadEventProperties = () => {
    let preferences = appCtx.ctx.preferences.PP_Event_Information;
    let properties = [];

    if( preferences && preferences.length > 0 ) {
        preferences.forEach( pref => {
            let prefName = {};
            prefName.name = pref;
            properties.push( prefName );
        } );
    }
    preferences = appCtx.ctx.preferences.PP_Event_Tooltip_Information;
    if( preferences && preferences.length > 0 ) {
        preferences.forEach( pref => {
            let prefName = {};
            prefName.name = pref;
            properties.push( prefName );
        } );
    }

    if( properties.length > 0 ) {
        policyId = propertyPolicySvc.register( {
            types: [ {
                name: 'Prg0AbsEvent',
                properties: properties
            } ]
        } );
    }
    let timelineContext = {};
    timelineContext.propertyNames = {};
    appCtx.registerCtx( 'timelineContext', timelineContext );
};

export let unloadEventProperties = () => {
    propertyPolicySvc.unregister( policyId );
};

export let listenPrimarySelection = ( data ) => {
    let eventData = data.eventMap.selectEventForSecondaryEvent;
    let vmo;
    if( !_.isEmpty( eventData ) && !_.isEmpty( eventData.vmo ) && eventData.vmo.modelType ) {
        vmo = eventData.vmo;
    }
    if( !vmo && eventData.vmo.vmo && eventData.vmo.vmo.modelType ) {
        vmo = eventData.vmo.vmo;
    }
    if( vmo ) {
        let nativeSub = document.getElementsByTagName( 'aw-native-sublocation' );
        if( nativeSub && nativeSub[ 0 ] ) {
            let nativeScope = angular.element( nativeSub ).scope();
            nativeScope.$$childHead.modelObjects = [ vmo ];
        }
        var timelineContext = appCtx.getCtx( 'timelineContext' );
        timelineContext.selected = vmo;
        appCtx.updateCtx( 'timelineContext', timelineContext );
    }
};

export let selectEventOnSelectionService = ( eventData ) => {
    if( eventData && eventData.vmo && eventData.vmo.modelType ) {
        selectionSvc.updateSelection( eventData.vmo, appCtx.getCtx( 'locationContext.modelObject' ) );
    }
};

exports = {
    getPlanNavigationTreeTableElement,
    getProgramBoardElement,
    getPlanNavigationTimelineElement,
    getRootTreeNode,
    getTreeTableHeight,
    isPlanNavigationSublocation,
    updateSelectionForSecondary,
    loadEventProperties,
    unloadEventProperties,
    listenPrimarySelection,
    selectEventOnSelectionService
};

export default exports;
