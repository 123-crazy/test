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
 * @module js/showRevRuleClausePropertiesService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import revisionRuleAdminCtx from 'js/revisionRuleAdminContextService';
import dataManagementSvc from 'soa/dataManagementService';
import cdmSvc from 'soa/kernel/clientDataModel';
import viewModelObjectSvc from 'js/viewModelObjectService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Show the unit clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showUnitProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        data.unit_no.dbValue = selection[ 0 ].revRuleEntryKeyToValue.unit_no;
    }
}

/**
 * Show the date clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showDateProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        data.date.uiValue = selection[ 0 ].revRuleEntryKeyToValue.date;
        data.date.dbValue = selection[ 0 ].revRuleEntryKeyToValue.date;
        if( selection[ 0 ].revRuleEntryKeyToValue.date ) {
            data.date.dateApi.dateValue = selection[ 0 ].revRuleEntryKeyToValue.date.slice( 0, 11 );
            data.date.dateApi.timeValue = selection[ 0 ].revRuleEntryKeyToValue.date.slice( 12 );
        } else{
            data.date.dateApi.dateValue = '';
            data.date.dateApi.timeValue = '';
        }
        data.today.dbValue = selection[ 0 ].revRuleEntryKeyToValue.today === 'true';
    }
}

/**
 * Show the override clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showOverrideProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        var folderUid = selection[ 0 ].revRuleEntryKeyToValue.folder;
        if( folderUid ) {
            var uidsToLoad = [ folderUid ];
            exports.loadObjects( uidsToLoad ).then( function( loadedObjects ) {
                var folder = loadedObjects[ 0 ];
                var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( folder, 'EDIT' );
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'folder', vmo );
            } );
        }
    } else {
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'folder', undefined );
    }
}

/**
 * Show the EndItem clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showEndItemProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        var endItemUid = selection[ 0 ].revRuleEntryKeyToValue.end_item;
        if( endItemUid ) {
            var uidsToLoad = [ endItemUid ];
            exports.loadObjects( uidsToLoad ).then( function( loadedObjects ) {
                var endItem = loadedObjects[ 0 ];
                var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( endItem, 'EDIT' );
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'end_item', vmo );
            } );
        }
    } else {
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'end_item', undefined );
    }
}

function showReleaseEventProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        var ctx = revisionRuleAdminCtx.getCtx();
        var uidsToLoad = [];
        var eventUid = selection[ 0 ].revRuleEntryKeyToValue.release_event;
        if( eventUid ) {
            uidsToLoad.push( eventUid );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'Fnd0ReleaseEvent', undefined );
        }

        if( uidsToLoad.length > 0 ) {
            exports.loadObjects( uidsToLoad ).then( function( loadedObjects ) {
                loadedObjects.forEach( function( obj ) {
                    var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( obj, 'EDIT' );
                    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( obj.type, vmo );
                    eventBus.publish( 'RevisionRuleAdminEventClause.eventClausePropertyValueInitialized' );
                } );
            } );
        } else {
            eventBus.publish( 'RevisionRuleAdminEventClause.eventClausePropertyValueInitialized' );
        }
    } else {
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'Fnd0ReleaseEvent', undefined );
        eventBus.publish( 'RevisionRuleAdminEventClause.eventClausePropertyValueInitialized' );
    }
}

/**
 * Show the Branch clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showBranchProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        var branchUid = selection[ 0 ].revRuleEntryKeyToValue.branch;
        if( branchUid ) {
            var uidsToLoad = [ branchUid ];
            exports.loadObjects( uidsToLoad ).then( function( loadedObjects ) {
                var branch = loadedObjects[ 0 ];
                var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( branch, 'EDIT' );
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'branch', vmo );
            } );
        }
    } else {
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'branch', undefined );
    }
}

/**
 * Show the Working clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showWorkingProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        var ctx = revisionRuleAdminCtx.getCtx();
        var current_user = selection[ 0 ].revRuleEntryKeyToValue.current_user === 'true';
        var current_group = selection[ 0 ].revRuleEntryKeyToValue.current_group === 'true';
        var uidsToLoad = [];
        var userUid = selection[ 0 ].revRuleEntryKeyToValue.user;
        if( current_user && ctx.user ) {
            userUid = ctx.user.uid;
        }
        if( userUid ) {
            uidsToLoad.push( userUid );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'User', undefined );
        }
        var groupUid = selection[ 0 ].revRuleEntryKeyToValue.group;

        if( current_group && ctx.userSession.props.group ) {
            groupUid = ctx.userSession.props.group.dbValue;
        }
        if( groupUid ) {
            uidsToLoad.push( groupUid );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'Group', undefined );
        }
        if( uidsToLoad.length > 0 ) {
            exports.loadObjects( uidsToLoad ).then( function( loadedObjects ) {
                loadedObjects.forEach( function( obj ) {
                    var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( obj, 'EDIT' );
                    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( obj.type, vmo );
                    eventBus.publish( 'RevisionRuleAdminClauseProperties.clausePropertyValueInitialized' );
                } );
            } );
        } else {
            eventBus.publish( 'RevisionRuleAdminClauseProperties.clausePropertyValueInitialized' );
        }
    } else {
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'User', undefined );
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'Group', undefined );
        eventBus.publish( 'RevisionRuleAdminClauseProperties.clausePropertyValueInitialized' );
    }
}

/**
 * Show the Latest clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showLatestProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        var configTypeInternalVal = selection[ 0 ].revRuleEntryKeyToValue.latest;
        var displayVal = getDispValFromIntValForLatestClause( configTypeInternalVal );
        data.latestConfigType.dbValue = configTypeInternalVal;
        data.latestConfigType.uiValue = displayVal;
        var ctx = revisionRuleAdminCtx.getCtx();
        if( ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature === true ) {
            data.latestConfigTypeForRevOcc.dbValue = configTypeInternalVal;
            data.latestConfigTypeForRevOcc.uiValue = displayVal;
        }
        var latestConfigType = {
            configType: configTypeInternalVal,
            configDisplay: displayVal
        };
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'latestConfigType', latestConfigType );
    }
}

/**
 * Get display value from internal value for latest clause
 *
 * @param {String} propInternalVal - Internal value of property
 *
 * @return {String} propDisplayVal - Display value of property
 */
function getDispValFromIntValForLatestClause( propInternalVal ) {
    var resource = 'RevisionRuleAdminConstants';
    var localeTextBundle = localeSvc.getLoadedText( resource );
    var propDisplayVal = '';

    switch ( propInternalVal ) {
        case '0':
            propDisplayVal = localeTextBundle.creationDate;
            break;
        case '1':
            propDisplayVal = localeTextBundle.alphanumericRevId;
            break;
        case '2':
            propDisplayVal = localeTextBundle.numericRevId;
            break;
        case '3':
            propDisplayVal = localeTextBundle.alphaplusNumberRevId;
            break;
        default:
            break;
    }
    return propDisplayVal;
}

/**
 * Get display value from internal value for status clause
 *
 * @param {String} propInternalVal - Internal value of property
 *
 * @return {String} propDisplayVal - Display value of property
 */
function getDispValFromIntValForStatusClause( propInternalVal ) {
    var resource = 'RevisionRuleAdminConstants';
    var localeTextBundle = localeSvc.getLoadedText( resource );
    var propDisplayVal = '';

    switch ( propInternalVal ) {
        case '0':
            propDisplayVal = localeTextBundle.releasedDate;
            break;
        case '1':
            propDisplayVal = localeTextBundle.effectiveDate;
            break;
        case '2':
            propDisplayVal = localeTextBundle.unit;
            break;
        default:
            break;
    }
    return propDisplayVal;
}

/**
 * Show the Status clause properties
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 * @param {Object} selection - User selection
 *
 */
function showStatusProperties( data, selection ) {
    if( selection[ 0 ].revRuleEntryKeyToValue ) {
        var configTypeInternalVal = selection[ 0 ].revRuleEntryKeyToValue.config_type;
        var displayConfigType = getDispValFromIntValForStatusClause( configTypeInternalVal );

        var statusConfigType = {
            configType: configTypeInternalVal,
            configDisplay: displayConfigType
        };

        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'statusConfigType', statusConfigType );
        var isAny = selection[ 0 ].revRuleEntryKeyToValue.status_type === 'Any';
        if( !isAny ) {
            var statusUid = selection[ 0 ].revRuleEntryKeyToValue.status_type;
            if( statusUid ) {
                var uidsToLoad = [ statusUid ];
                exports.loadObjects( uidsToLoad ).then( function( loadedObjects ) {
                    var status = loadedObjects[ 0 ];
                    var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( status, 'EDIT' );
                    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'status', vmo );
                    eventBus.publish( 'RevisionRuleAdminClauseProperties.clausePropertyValueInitialized' );
                } );
            }
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'status', 'Any' );
            eventBus.publish( 'RevisionRuleAdminClauseProperties.clausePropertyValueInitialized' );
        }
    } else {
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'status', undefined );
        eventBus.publish( 'RevisionRuleAdminClauseProperties.clausePropertyValueInitialized' );
    }
}

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * Load objects for the input UIDs
 *
 * @param {StringArray} uidsToLoad - Array of UIDs to be loaded
 *
 * @return {Object} promise - Promise containing the loaded Objects
 */
export let loadObjects = function( uidsToLoad ) {
    var deferred = AwPromiseService.instance.defer();
    var loadedObjects = [];
    return dataManagementSvc.loadObjects( uidsToLoad ).then( function() {
        _.forEach( uidsToLoad, function( uid ) {
            var oUidObject = cdmSvc.getObject( uid );
            loadedObjects.push( oUidObject );
        } );
        deferred.resolve( loadedObjects );
        return deferred.promise;
    } );
};

/**
 * Show the selected clause properties
 *
 * @param {Object} selection - currently selected clause
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 *
 */
export let showSelectedClauseDetails = function( data, selection ) {
    if( selection && selection.length > 0 ) {
        data.currentlySelectedClause.dbValue = selection[ 0 ].entryType;
        if( selection[ 0 ].revRuleEntryKeyToValue ) {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'currentlySelectedClauseProperty', selection[ 0 ].revRuleEntryKeyToValue );
        } else {
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'currentlySelectedClauseProperty', undefined );
        }
        switch ( data.currentlySelectedClause.dbValue ) {
            case 0: // Working
                showWorkingProperties( data, selection );
                break;
            case 1: // Status
                showStatusProperties( data, selection );
                break;
            case 2: // Override
                showOverrideProperties( data, selection );
                break;
            case 3: //date
                showDateProperties( data, selection );
                break;
            case 4: //Unit No
                showUnitProperties( data, selection );
                break;
            case 7: //Latest
                showLatestProperties( data, selection );
                break;
            case 8: //End Item
                showEndItemProperties( data, selection );
                break;
            case 10: //Branch
                showBranchProperties( data, selection );
                break;
            case 13: //Release Event
                showReleaseEventProperties( data, selection );
                break;
            default:
                break;
        }
    } else {
        //Clear the details screen
        data.currentlySelectedClause.dbValue = '999';
    }
};

export default exports = {
    loadObjects,
    showSelectedClauseDetails
};
/**
 * @memberof NgServices
 * @member acerevisionRuleAdminPanelService
 */
app.factory( 'showRevRuleClausePropertiesService', () => exports );
