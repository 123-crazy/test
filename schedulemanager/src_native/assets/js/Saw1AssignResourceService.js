//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Saw1AssignResourceService
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Method for invoking and registering/unregistering data for the assignResource command panel
 *
 * @param {String} commandId - Command Id for the Assign resource command
 * @param {String} location - Location of the Assign resource command
 * @param {Object} ctx - The Context object
 */

export let assignResourcePanel = function( commandId, location, ctx ) {
    var jso = {};

    var schedule = 'schedule';

    var selection = ctx.selected;

    if ( selection ) {
        var propObj = ctx.selected.props.schedule_tag.dbValues[0];

        var scheduleObj = cdm.getObject( propObj );

        jso = {
            selectedObject: selection,
            scheduleObj: scheduleObj
        };

        appCtxService.registerCtx( schedule, jso );
    } else {
        appCtxService.unRegisterCtx( schedule );
    }

    commandPanelService.activateCommandPanel( commandId, location );
};

export let changeOwnerAddUpdateScheduleMember = function( data, ctx ) {
    var deferred = AwPromiseService.instance.defer();
    var uidsToLoad = [];
    var selectedOwner = data.dataProviders.userPerformSearch.selectedObjects['0'].props.user.dbValue;
    var selectedObjs = ctx.mselected;
    if ( selectedObjs.length > 0 ) {
        selectedObjs.forEach( function( selectedObj ) {
            if ( selectedObj.modelType.typeHierarchyArray.indexOf( 'Schedule' ) > -1 ) {
                uidsToLoad.push( selectedObj.uid );
            }
        } );
        dmSvc.getProperties( uidsToLoad, [ 'saw1ScheduleMembers' ] ).then( function() {
            var scheduleMembersList = {};
            for ( var i = 0; i < uidsToLoad.length; i++ ) {
                var scheduleObj = cdm.getObject( uidsToLoad[i] );
                var scheduleMembers = scheduleObj.props.saw1ScheduleMembers.dbValues;
                scheduleMembersList[scheduleObj.uid] = scheduleMembers;
            }
            var memList = Object.values( scheduleMembersList );
            dmSvc.getProperties( memList, [ 'resource_tag' ] ).then( function() {
                let membershipToUpdate = [];
                let membershipToAdd = [];
                for ( var scheduleUid in scheduleMembersList ) {
                    let schMemberList = scheduleMembersList[scheduleUid];
                    let resourceList = [];
                    let resourceSchMemberMap = {};
                    for ( var i = 0; i < schMemberList.length; i++ ) {
                        var schMember = cdm.getObject( schMemberList[i] );
                        var scheduleMemberUser = schMember.props.resource_tag.dbValues[0];
                        resourceList.push( scheduleMemberUser );
                        resourceSchMemberMap[scheduleMemberUser] = schMember;
                    }
                    var scheduleMemberIndex = resourceList.indexOf( selectedOwner );
                    if ( scheduleMemberIndex > -1 ) {
                        let resourceUid = resourceList[scheduleMemberIndex];
                        if ( resourceSchMemberMap[resourceUid] ) {
                            var memberObj = {
                                object: resourceSchMemberMap[resourceUid],
                                vecNameVal: [ {
                                    name: 'saw1RoleInSchedule',
                                    values: [ 'Coordinator' ]
                                } ]
                            };
                        }
                        membershipToUpdate.push( memberObj );
                    } else {
                        var resourceObj = cdm.getObject( selectedOwner );
                        if ( resourceObj ) {
                            var schResourceObj = {
                                schedule: cdm.getObject( scheduleUid ),
                                resource: resourceObj,
                                membershipLevel: 2,
                                cost: '',
                                currency: 0
                            };
                        }
                        membershipToAdd.push( schResourceObj );
                    }
                }
                if ( membershipToUpdate.length > 0 ) {
                    eventBus.publish( 'callSetProperties', membershipToUpdate );
                }
                if ( membershipToAdd.length > 0 ) {
                    eventBus.publish( 'callAddMembership', membershipToAdd );
                }
                deferred.resolve();
            } );
            deferred.resolve();
        } );
    }
    return deferred.promise;
};

exports = {
    assignResourcePanel,
    changeOwnerAddUpdateScheduleMember
};

export default exports;
/**
 * Service to display Shift Schedule panel.
 *
 * @member Saw1AssignResourceService
 * @memberof NgServices
 */
app.factory( 'Saw1AssignResourceService', () => exports );
