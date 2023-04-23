//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/SearchByObjectOnTimeline
 */

import app from 'app';
import awTableStateService from 'js/awTableStateService';
import eventBus from 'js/eventBus';
import timelineManager from 'js/uiGanttManager';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';

'use strict';

let exports;

/**
 *
 * @param {data} data - SOA results
 *
 * It checks which parent plan object of the selected object is present in loadedVMOOjects or not.
 * Plan object found is then used to trigger the expansion until immediate plan object is loaded.
 *
 */
export let checkForParentAndExpand = function( data ) {
    if( data && data.searchResults ) {
        let loadedObjs = data.dataProviders.planNavigationTreeDataProvider.viewModelCollection.loadedVMObjects;
        let expandedIndex;
        let eventPlanObjectIndex = data.searchResults.length - 2;
        //Iterate through loadedVMO to check which parent is loaded
        for( let i = data.searchResults.length - 1; i >= 0; i-- ) {
            let index = _.findIndex( loadedObjs, function( obj ) {
                return obj.uid === data.searchResults[ i ].uid;
            } );
            if( index > -1 ) {
                //Store the index of parent node that is founded in loaded objects
                expandedIndex = i;
                break;
            }
        }
        //Expand until events's immediate Plan object is expanded so that the event can be highlighted
        for( let j = expandedIndex; j <= eventPlanObjectIndex; j++ ) {
            let nodeToExpand = data.searchResults[ j ];
            if( nodeToExpand.isExpanded === undefined || nodeToExpand.isExpanded === false ) {
                eventBus.publish( data.dataProviders.planNavigationTreeDataProvider.name + '.expandTreeNode', {
                    parentNode: {
                        id: nodeToExpand.uid
                    }
                } );
            }
            let gridId = Object.keys( data.grids )[ 0 ];
            awTableStateService.saveRowExpanded( data, gridId, nodeToExpand );
        }
    }
};

/**
 *
 * @param {data} data
 *
 * It checks if the selected object is loaded or not.
 * Once its loaded , it then selects and highlights the selected object.
 *
 */
export let checkForEventAndHighlight = function( data ) {
    if( data.eventData ) {
        let selectedObjUid;
        if( data.timelineSearchBy.dbValue === 'Event' ) {
            selectedObjUid = data.dataProviders.pgp0PlanObjsSearchProvider.selectedObjects[ 0 ].uid;
        } else {
            selectedObjUid = data.dataProviders.Psi0PrgDelSearchProvider.selectedObjects[ 0 ].uid;
        }
        let index = _.findIndex( data.eventData, function( eventObj ) {
            return eventObj.uid === selectedObjUid;
        } );
        if ( index > -1 ) {
            timelineManager.getGanttInstance().selectTask( selectedObjUid );
            timelineManager.getGanttInstance().showTask( selectedObjUid );
        }
    }
};

/**
 * It gives string of filtered plan uids separated by commas(,)
 * @param {data} data
 */
export let getFilteredPlanLevelsInput = function( data ) {
    let planUidString = '';
    if( appCtxSvc.getCtx( 'isColumnFilteringApplied' ) ) {
        let loadedObjs = data.dataProviders.planNavigationTreeDataProvider.viewModelCollection.loadedVMObjects;
        for( let  idx = 0; idx < loadedObjs.length; idx++ ) {
            planUidString += loadedObjs[idx].uid + ',';
        }
        planUidString = planUidString.substring( 0, planUidString.length - 1 );
    }
    if( appCtxSvc.getCtx( 'timelineSearchBy' ) === 'Event' ) {
        eventBus.publish( 'getEventsInformation',  planUidString );
    } else {
        eventBus.publish( 'getDelInstancesInformation', planUidString );
    }
};

exports = {
    checkForParentAndExpand,
    checkForEventAndHighlight,
    getFilteredPlanLevelsInput
};

export default exports;
