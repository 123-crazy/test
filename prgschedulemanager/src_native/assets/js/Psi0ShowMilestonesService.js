//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/**
 * @module js/Psi0ShowMilestonesService
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import cdm from 'soa/kernel/clientDataModel';
import timelineManager from 'js/uiGanttManager';
import appCtxSvc from 'js/appCtxService';
import planNavTreeUtils from 'js/PlanNavigationTreeUtils';
import timelineDataSource from 'js/TimelineDataSourceService';
import _ from 'lodash';
import uiTimelineUtils from 'js/Timeline/uiTimelineUtils';
import stackedEventsSvc from 'js/StackedEventsService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import soaSvc from 'soa/kernel/soaService';
import logger from 'js/logger';
import psmConstants from 'js/ProgramScheduleManagerConstants';
import localeSvc from 'js/localeService';
import messagingService from 'js/messagingService';

let exports = {};
var _milestoneEvent = null;

var policyId = {
    types: [ {
        name: 'ScheduleTask',
        properties: [ {
                name: 'start_date'
            },
            {
                name: 'fnd0status'
            },
            {
                name: 'object_name'
            }
        ]
    } ]
};

/**
 * DFS to get array of plans recursively from Root Plan
 * @param {object} rootPlanNode TopMost Plan in Program
 * @param {*} planObjects Array of Plans to be used by ShowAll / HideAll functionality
 */
var getAllPlanObjects = function( rootPlanNode, planObjects ) {
    planObjects.push( rootPlanNode );
    let childNodes = rootPlanNode.children;

    if( !childNodes && rootPlanNode.__expandState && rootPlanNode.__expandState.children ) {
        childNodes = rootPlanNode.__expandState.children;
    }
    if( childNodes ) {
        childNodes.forEach( ( node ) => {
            getAllPlanObjects( node, planObjects );
        } );
    }
};

/**
 * Subscribes to reloadMilestonesOnTimeline event to call method reloadMilestones
 */
export let subscribeMilestoneEvents = function() {
    if( !_milestoneEvent ) {
        _milestoneEvent = eventBus.subscribe( 'reloadMilestonesOnTimeline', showMilestones );
    }
};

/**
 * Unsubscribes reloadMilestonesOnTimeline event
 */
export let unsubscribeMilestoneEvents = function() {
    if( _milestoneEvent ) {
        eventBus.unsubscribe( _milestoneEvent );
    }
    _milestoneEvent = null;
};


/**
 * Performs performSearchViewModel4 call to show Milestones on Timeline
 * @param {String} operation - 'SHOW_ALL'      - Show all the milestones
 *                           - 'SHOW_SELECTED' - Show the milestones for selected levels
 *                           -  If not specified then it is a reload Milestone call
 * @param {int} startIndex start index input to SOA
 * @param {String} clientScopeURI  clientScopeURI input to SOA
 */
export let showMilestones = function( operation, startIndex, clientScopeURI ) {
    let parentplanUIDs = '';

    if ( operation === psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.SHOW_ALL ) {
        parentplanUIDs = ShowAllMilestonesInput();
    } else if ( operation === psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.SHOW_SELECTED ) {
        parentplanUIDs = planUidInput();
    } else{
        parentplanUIDs = filterLastSelectedPlanUIDs();
        startIndex = 0;
        clientScopeURI = '';
    }

    if( parentplanUIDs !== '' ) {
        var searchSOAInput = getPerformSearchSOAInput( parentplanUIDs, startIndex, clientScopeURI );

        return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: searchSOAInput.columnConfigInput,
            searchInput: searchSOAInput.searchInput,
            inflateProperties: false,
            noServiceData: false
        }, policyId ).then( function( response ) {
            processMilestones( response );
            return response.totalFound;
        },
        function( error ) {
        logger.error( 'Error occurred ' + error );
        } );
    }
};


/**
 * Returns input for performSearchViewModel SOA call
 * @param {String} parentplanUIDs Comma separated planUids input to SOA
 * @param {int} startIndex start index input to SOA
 * @param {String} clientScopeURI  clientScopeURI input to SOA
 * @returns {*} input for SOA performSearchViewModel
 */
var getPerformSearchSOAInput = function( parentplanUIDs, startIndex, clientScopeURI ) {
    let startIndexLocal = 0;
    if( startIndex ) {
        startIndexLocal = startIndex;
    }

    let clientScopeURILocal = '';
    if( clientScopeURI ) {
        clientScopeURILocal = clientScopeURI;
    }

    return {
        searchInput: {
            attributesToInflate: [],
            maxToLoad: 20000000,
            maxToReturn: 20000000,
            providerName: 'Psi0ScheduleSearchProvider',
            searchCriteria: {
                planUids: parentplanUIDs,
                searchContentType: 'ScheduleMilestones',
                returnParentHierarchy: false,
                searchEventRecursive: false
            },
            searchFilterFieldSortType: 'Priority',
            cursor: {
                startIndex: startIndexLocal
            }
        },
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: clientScopeURILocal
        }
    };
};


/**
 * Filters last selected planUIDs as per the current Timeline Program - Plan view
 * @returns {String} planUIDString Comma separated planUids input for SOA
 */
var filterLastSelectedPlanUIDs = function() {
    let lastMilestoneCommand = appCtxSvc.getCtx( 'lastMilestoneCommand' );
    let showExpandedNodeMilestones = false;

    if( lastMilestoneCommand === psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.SHOW_ALL ) {
        showExpandedNodeMilestones = true;
    }

    var planUIDString = '';

    // Get last selected Plan uids
    let parentplanUIDString = appCtxSvc.getCtx( 'lastSelectedPlanUIDs' );
    if ( !parentplanUIDString ) {
        return planUIDString;
    }

    var planUIDObjects = [];
    // Split existing parentplanUIDString into array of plan UIDs
    if ( parentplanUIDString ) {
        planUIDObjects = parentplanUIDString.split( ',' );
    }

    // Get current plan objects on Timeline
    var planObjectsInTimeline = [];
    let rootPlanNode = planNavTreeUtils.getRootTreeNode();
    getAllPlanObjects( rootPlanNode, planObjectsInTimeline );

    /* Construct final planUID string for Plans that are present in
        both current Timeline view and in lastSelectedPlanUIDs*/
    var validPlanUIDObjects = [];
    planObjectsInTimeline.forEach( function( planObject ) {
        let planObjectString =  planObject.uid;
        const index = planUIDObjects.indexOf( planObjectString );

        if( showExpandedNodeMilestones ) {
            let parentPlanObjectString = planObject.parentNodeUid;
            const indexParent = planUIDObjects.indexOf( parentPlanObjectString );
            if ( index > -1 || indexParent > -1 ) {
                validPlanUIDObjects.push( planObjectString );
                }
        } else {
        if ( index > -1 ) {
            validPlanUIDObjects.push( planObjectString );
            }
        }
    } );

    // Format the array of planUIDObjects into comma separated UID string
    for ( var index = 0; index < validPlanUIDObjects.length; index++ ) {
        planUIDString += validPlanUIDObjects[index] + ',';
    }
    planUIDString = planUIDString.substring( 0, planUIDString.length - 1 );

    return planUIDString;
};


/**
 *
 * @param {Array} planObjs Array of Plan Objects
 * @returns Array of Milestones to Hide
 */
var getMilestonesArrayToHide = function( planObjs ) {
    var milestonesToHide = [];
    if ( planObjs && planObjs.length > 0 ) {
        for ( var index = 0; index < planObjs.length; index++ ) {
            var childrenOfPlanObj = timelineManager.getGanttInstance().getChildren( planObjs[index].uid );

            for( var ms = 0; ms < childrenOfPlanObj.length; ms++ ) {
                let objectUid = childrenOfPlanObj[ms];
                if ( objectUid.indexOf( '__' ) > -1 ) {
                    objectUid = objectUid.substring( 0, objectUid.indexOf( '__' ) );
                }
                let timelineObject = cdm.getObject( objectUid );
                if ( timelineObject.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) > -1 ) {
                    let milestoneObj = {};
                    milestoneObj.id = childrenOfPlanObj[ms];
                    milestonesToHide.push( milestoneObj );
                }
            }
        }
    }
    return milestonesToHide;
};

/**
 * update milestone view based on timeline plan uid selection.
 * @param {object} soaResponse response for performSearch Soa.
 */
export let processMilestones = function( soaResponse ) {
    var searchResults = JSON.parse( soaResponse.searchResultsJSON );
    var planMilestoneMap = {};
    var ganttMilestoneArray = [];

    var mapPlanMilestoneInfo = new Map();
    var mapOfAdjEventAndOffset = new Map();
    var planUid;
    // flag to check if Milestones are returned. This handles the case where user do not have read access to milestones
    let isMilestonePresentInResponse = false;
    for ( let index = 0; index < searchResults.objects.length; index++ ) {
        let searchedUid = searchResults.objects[ index ].uid;
        let searchedObj = cdm.getObject( searchedUid );

        if( searchedObj && searchedObj.modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 ) {
            planUid = searchedObj.uid;
            planMilestoneMap[planUid] = [];
        } else if ( searchedObj && searchedObj.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) > -1 ) {
            planMilestoneMap[planUid].push( searchedObj );
            isMilestonePresentInResponse = true;
        }
    }

    if( !isMilestonePresentInResponse ) {
        let sourceModule = 'PrgScheduleManagerMessages';
        let localTextBundle = localeSvc.getLoadedText( sourceModule );
        let showMilestonesInfoMsg = localTextBundle.showMilestonesInfoMsg;
        messagingService.showInfo( showMilestonesInfoMsg );
        return;
    }

    if( appCtxSvc.ctx.showTimeline && appCtxSvc.ctx.planNavigationCtx.isTimelineInitialized ) {
        for( let planUid in planMilestoneMap ) {
            let milestones = planMilestoneMap[ planUid ];
            if( milestones ) {
                milestones.sort( ( a, b ) => a.props.start_date.dbValues[ 0 ]  > b.props.start_date.dbValues[ 0 ] ? 1 : -1 );
                mapOfAdjEventAndOffset = stackedEventsSvc.findAdjEventAndOffsetMilestone( milestones );
                mapPlanMilestoneInfo.set( planUid, mapOfAdjEventAndOffset );

                for( let index = 0; index < milestones.length; index++ ) {
                    let mObject = timelineDataSource.addMilestone( milestones[index], planUid );
                    ganttMilestoneArray.push( mObject );
                }
            }
        }
        if( appCtxSvc.ctx.popupContext.mapParentPlanMilestone && appCtxSvc.ctx.popupContext.mapParentPlanMilestone.size > 0 ) {
            for( const [ planUid, mapOfEventOffsets ] of mapPlanMilestoneInfo.entries() ) {
                let finalMap = appCtxSvc.ctx.popupContext.mapParentPlanMilestone;
                if( !finalMap.get( planUid ) ) {
                    finalMap.set( planUid, mapOfEventOffsets );
                    appCtxSvc.ctx.popupContext.mapParentPlanMilestone = finalMap;
                }
            }
        } else if( appCtxSvc.ctx.popupContext.mapParentPlanMilestone && appCtxSvc.ctx.popupContext.mapParentPlanMilestone.size <= 0 ) {
            appCtxSvc.ctx.popupContext.mapParentPlanMilestone = mapPlanMilestoneInfo;
        }
        uiTimelineUtils.findCountWithZoomeLevel( 'Milestone' );
        uiTimelineUtils.parseGanttData( ganttMilestoneArray );

        //Publish this event so as to render timeline information related data
        eventBus.publish( 'eventsAddedOnTimeline', ganttMilestoneArray );
    }
};


/**
 * Input to show selected milestones
 * @returns {string} selected planUid objects
 */
export let planUidInput = function() {
    var objects = '';

    var selection = appCtxSvc.getCtx( 'mselected' );
    if( selection && selection.length > 0 ) {
        for( var index = 0; index < selection.length; index++ ) {
            objects += selection[ index ].uid + ',';
        }
        objects = objects.substring( 0, objects.length - 1 );

        var parentplanUIDs = appCtxSvc.getCtx( 'lastSelectedPlanUIDs' );

        /*if the lastSelectedPlanUIDs is not 'undefined' then need to append
        the new selected planUID string.
        else if the lastSelectedPlanUIDs is 'undefined' then directly update it with
        the new selected planUID string*/
        if ( parentplanUIDs ) {
            updateLastSelectedPlanObjects( selection, psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.SHOW_MILESTONES );
        } else {
            appCtxSvc.updateCtx( 'lastSelectedPlanUIDs', objects );
        }
    }

    return objects;
};


/**
 * Input to show all milestones
 * @returns {string} PlanUID input objects
 */
export let ShowAllMilestonesInput = function() {
    var objects = '';
    var planObjectsinTimeline = [];

    let rootPlanNode = planNavTreeUtils.getRootTreeNode();
    getAllPlanObjects( rootPlanNode, planObjectsinTimeline );

    if( planObjectsinTimeline && planObjectsinTimeline.length > 0 ) {
        for( var index = 0; index < planObjectsinTimeline.length; index++ ) {
            objects += planObjectsinTimeline[ index ].uid + ',';
        }
        objects = objects.substring( 0, objects.length - 1 );
    }

    //Update lastSelectedPlanUIDs with all the selected planUIDs string
    appCtxSvc.updateCtx( 'lastSelectedPlanUIDs', objects );
    updateLastMilestoneCommand( psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.SHOW_ALL );

    return objects;
};


/**
 * Hide selected milestones from Timeline
 */
export let hideMilestones = function() {
    var planObjs = appCtxSvc.getCtx( 'mselected' );
    var milestonesToHide = getMilestonesArrayToHide( planObjs );
    uiTimelineUtils.removeDeletedObjectsOnTimeline( milestonesToHide );

    if( planObjs && planObjs.length > 0 ) {
        //update 'lastSelectedPlanUIDs' based on hidden milestones
        updateLastSelectedPlanObjects( planObjs, psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.HIDE_MILESTONES );
    }
    updateLastMilestoneCommand( psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.HIDE_SELECTED );
};


/**
 * Hide all milestones from timeline
 */
export let hideAllMilestones = function() {
    var planObjs = [];
    let rootPlanNode = planNavTreeUtils.getRootTreeNode();
    getAllPlanObjects( rootPlanNode, planObjs );
    var milestonesToHide = getMilestonesArrayToHide( planObjs );
    uiTimelineUtils.removeDeletedObjectsOnTimeline( milestonesToHide );

    //Reset lastSelectedPlanUIDs to 'undefined'
    var objects;
    appCtxSvc.updateCtx( 'lastSelectedPlanUIDs', objects );
    updateLastMilestoneCommand( psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.HIDE_ALL );
};


/**
 * Update 'lastSelectedPlanUIDs' based on timeline plan uid selection and operation (hide/show) performed.
 * @param {object} selectedPlanObjs selected plan uids on timeline.
 * @param {String} operation 'SHOW_MILESTONES' for show operation
                             'HIDE_MILESTONES' for hide operation
 */
let updateLastSelectedPlanObjects = function( selectedPlanObjs, operation ) {
    var parentplanUIDString = appCtxSvc.getCtx( 'lastSelectedPlanUIDs' );
    var planUIDObjects = [];

    // Split existing parentplanUIDString into array of plan UIDs
    if ( parentplanUIDString ) {
        planUIDObjects = parentplanUIDString.split( ',' );
    }

    // Process each selected plan uid object
    selectedPlanObjs.forEach( function( planObject ) {
        var planObjString = '';
        planObjString += planObject.uid;

        //check if it already part of last selected parentplanUIDString
        const index = planUIDObjects.indexOf( planObjString );

        /*If found and operation is 'HIDE_MILESTONES', then remove selected plan UID from
        last selected plan objects array*/
        if ( index > -1 && operation === psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.HIDE_MILESTONES ) {
            planUIDObjects.splice( index, 1 );
        }
        /*If not found and operation is 'SHOW_MILESTONES', then add selected plan UID to
        last selected plan objects array*/
        else if ( index === -1 && operation === psmConstants.OPERATION_TYPE_FOR_SHOW_AND_HIDE_MILESTONES.SHOW_MILESTONES ) {
            planUIDObjects.splice( selectedPlanObjs.length, 0, planObject.uid );
        }
    } );

    // Format the array of planUIDObjects into comma separated UID string and update ctx.
    var lastSelectedPlanUIDString = '';
    for ( var index = 0; index < planUIDObjects.length; index++ ) {
        lastSelectedPlanUIDString += planUIDObjects[index] + ',';
    }
    lastSelectedPlanUIDString = lastSelectedPlanUIDString.substring( 0, lastSelectedPlanUIDString.length - 1 );
    appCtxSvc.updateCtx( 'lastSelectedPlanUIDs', lastSelectedPlanUIDString );
};

/**
 * Update 'lastMilestoneCommand' based on last operation performed
 * @param {String} operation 'SHOW_ALL' for SHOW_ALL operation
                             'HIDE_ALL' for HIDE_ALL operation
                             'HIDE_SELECTED' for HIDE_SELECTED operation
    Clicking 'Show selected' after clicking 'Show All' does not make sense,
    hence we are not remebering the show_selected state for pagination
    and expansion related use cases.
 */
let updateLastMilestoneCommand = function( operation ) {
    appCtxSvc.updateCtx( 'lastMilestoneCommand', operation );
};


export default exports = {
    processMilestones,
    planUidInput,
    hideMilestones,
    ShowAllMilestonesInput,
    hideAllMilestones,
    subscribeMilestoneEvents,
    unsubscribeMilestoneEvents,
    showMilestones
};
