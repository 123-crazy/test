// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/userPanelService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import commandsMapSvc from 'js/commandsMapService';
import viewModelObjectService from 'js/viewModelObjectService';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import wrkflwUtils from 'js/Awp0WorkflowUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import dataManagementService from 'soa/dataManagementService';
import adapterSvc from 'js/adapterService';

var exports = {};

var prefValue = null;

/**
 * @param {data} data - The qualified data of the viewModel
 *
 * @returns {Object} Project proeprty object based on selected tab like users or resource pools
 */
var _getProjectProp = function( data ) {
    var projectProp = null;
    if( data.selectedTab && data.selectedTab.panelId === 'UserTab' ) {
        projectProp = data.userProjectObject;
    } else if( data.selectedTab && data.selectedTab.panelId === 'ResourcePoolTab' ) {
        projectProp = data.projectObject;
    }
    return projectProp;
};

/**
 * @param {data} data - The qualified data of the viewModel
 *
 * @returns {Object} Project proeprty object based on selected tab like users or resource pools
 */
var _getAssignableParticipantProp = function( data ) {
    var participantProp = null;
    if( data.selectedTab && data.selectedTab.panelId === 'UserTab' ) {
        participantProp = data.userAssignableParticipants;
    } else if( data.selectedTab && data.selectedTab.panelId === 'ResourcePoolTab' ) {
        participantProp = data.resourcepoolAssignableParticipants;
    }
    return participantProp;
};

var _getFilterBoxProp = function( data ) {
    var filterProp = null;
    if( data.selectedTab && data.selectedTab.panelId === 'UserTab' ) {
        filterProp = data.filterBox;
    } else if( data.selectedTab && data.selectedTab.panelId === 'ResourcePoolTab' ) {
        filterProp = data.resourceFilterBox;
    }
    return filterProp;
};

/**
 * Get the project obejct based on selcted tab and selection from project field
 * from UI and return that object.
 *
 * @param {data} data - The qualified data of the viewModel
 *
 * @returns {Object} Project obejct if associated for specific selection
 */
var _getProjectObject = function( data ) {
    var projectObject = null;
    var projectProp = _getProjectProp( data );
    if( projectProp && projectProp.selectedLovEntries && projectProp.selectedLovEntries[ 0 ]
        && projectProp.selectedLovEntries[ 0 ].projectModelObject ) {
        projectObject =  projectProp.selectedLovEntries[ 0 ].projectModelObject;
    }
    return projectObject;
};

/**
 * Get the select object from provider from UI and add to the data
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} multiSelectEnabled - The multiple select enabled or not
 * @param {selection} Array - The selection object array
 */
export let addSelectedObject = function( data, multiSelectEnabled, selection ) {
    var deferred = AwPromiseService.instance.defer();
    if( data && selection ) {
        if( selection[ 0 ] && selection[ 0 ].type && selection[ 0 ].type === 'User' ) {
            multiSelectEnabled = false;
        }
        wrkflwUtils.getValidObjectsToAdd( data, selection ).then( function( validObjects ) {
            // Check for if multiple selection is enabled then only add the selection
            // to list otherwise directly set the list. This is mainly needed when user
            // do one search and select some object using multiple select and then do another
            // search and select another object using CTRL key then both objects should be added
            if( multiSelectEnabled ) {
                _.forEach( validObjects, function( object ) {
                    // Check if same object is not exist in the list then only add it.
                    if( data.selectedObjects && data.selectedObjects.indexOf( object ) === -1 && !exports.objectIsInList( data.selectedObjects, object ) ) {
                        // Check if project info is not present on that selected object then only set it based on
                        // project LOV selection else use existing project selection
                        if( _.isUndefined( object.projectObject ) ) {
                            object.projectObject = _getProjectObject( data );
                        }
                        data.selectedObjects.push( object );
                    }
                } );
                var finalList = [];
                _.forEach( data.selectedObjects, function( object ) {
                    // Check if same object is not exist in the list then only add it.
                    if( object.selected ) {
                        finalList.push( object );
                    }
                } );

                data.selectedObjects = finalList;
            } else {
                data.selectedObjects = [];
                if( validObjects && validObjects[ 0 ] ) {
                    // Check if project info is not present on that selected object then only set it based on
                    // project LOV selection else use existing project selection
                    if( _.isUndefined( validObjects[ 0 ].projectObject ) ) {
                        validObjects[ 0 ].projectObject = _getProjectObject( data );
                    }
                    data.selectedObjects.push( validObjects[ 0 ] );
                }
            }
            eventBus.publish( 'workflow.userPickerPanelSelection', { selectedObjects: data.selectedObjects } );
            deferred.resolve();
        } );
    } else {
        eventBus.publish( 'workflow.userPickerPanelSelection', { selectedObjects: data.selectedObjects } );
        deferred.resolve();
    }
    return deferred.promise;
};

export let objectIsInList = function( objectList, newObject ) {
    var objectFound = false;

    for( var i = 0; i < objectList.length; i++ ) {
        var uid = objectList[ i ].uid;
        var newUid = newObject.uid;
        if( uid === newUid ) {
            objectFound = true;
            break;
        }
    }
    return objectFound;
};

/**
 * Get the select object from provider from UI and add to the data
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} multiSelectEnabled - The multiple select enabled or not
 * @param {selection} Array - The selection object array
 */
export let addObjects = function( data, multiSelectEnabled, selection ) {
    if( data && selection ) {
        if( !data.users ) {
            data.users = [];
        }
        if( !data.usersUids ) {
            data.userUids = [];
        }
        if( selection ) {
            data.users[ 0 ] = selection[ 0 ];
            data.userUids[ 0 ] = selection[ 0 ].props.user.dbValue;
        }
        if( data.dataProviders && data.dataProviders.getUsers ) {
            //update data provider
            data.dataProviders.getUsers.update( data.users, data.users.length );
            //clear selection
            data.dataProviders.getUsers.selectNone();
        }
    }
};

export let addUserObject = function( data, multiSelectEnabled, selection ) {
    exports.addSelectionToMainPanel( data, multiSelectEnabled, selection );
};

/**
 * Check if selected object is not of type Signoff then fire the event directly
 * else load the parent task first and then fire the event. This is needed as
 * in replace case Project proeprties on item revision are not loaded correctly.
 *
 * @param {Object} ctx  Context object
 * @param {data} data The qualified data of the viewModel
 */
var _loadProjectData = function( ctx, data ) {
    if( !ctx.workflow.selectedObject ||  ctx.workflow.selectedObject && ctx.workflow.selectedObject.modelType && ctx.workflow.selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) <= -1  ) {
        eventBus.publish( 'loadProjectData', {
            scope: {
                ctx: appCtxSvc.ctx,
                data: data
            }
        } );
        return;
    }

    dataManagementService.getPropertiesUnchecked( [ ctx.workflow.selectedObject ], [ 'fnd0ParentTask' ] ).then( function() {
        eventBus.publish( 'loadProjectData', {
            scope: {
                ctx: appCtxSvc.ctx,
                data: data
            }
        } );
    } );
};

/**
 * Get the user assignment preference value and if not present then it will return null
 *
 * @param {data} data - The qualified data of the viewModel
 *
 * @returns {String} User assignemnt preference value
 */
var _getUserAssignmentPrefValue = function( data ) {
    var prefValue = null;
    if( data && data.preferences.WRKFLW_show_user_assignment_options && data.preferences.WRKFLW_show_user_assignment_options[ 0 ] ) {
        prefValue = data.preferences.WRKFLW_show_user_assignment_options[ 0 ];
    }
    return prefValue;
};

/**
 * Populate participant types data that can be assined.
 *
 * @param {Object} data The qualified data of the viewModel
 * @param {Object} ctx App context object
 */
export let populateParticipantTypesData = function( data, ctx ) {
    if( ctx && ctx.participantCtx && ctx.participantCtx.assignableParticipantTypes ) {
        var participantTypeObjects = ctx.participantCtx.assignableParticipantTypes;
        // Iterate for each object object
        var participantTypeList = [];
        _.forEach( participantTypeObjects, function( participantObj ) {
            var listModelObject = _getEmptyListModel();
            listModelObject.propInternalValue = participantObj.propInternalValue;
            listModelObject.propDisplayValue = participantObj.propDisplayValue;
            participantTypeList.push( listModelObject );
        } );
        // Set the assignable participant types that need to be shown on UI.
        if( data && participantTypeList && !_.isEmpty( participantTypeList ) ) {
            data.assignableParticipantTypes = participantTypeList;
        }
    }
    // Check if widget is present then set the 0th value as default value
    var participantProp = _getAssignableParticipantProp( data );
    if( data && participantProp ) {
        participantProp.dbValue = '';
        participantProp.uiValue = '';
        var defaultParticipantValue = null;

        // Select the default participant name
        if( participantTypeList && participantTypeList.length > 0 && participantTypeList[ 0 ] ) {
            defaultParticipantValue = participantTypeList[ 0 ];
            var participantTypeToSelect = null;
            // Check if user has selected participant type from participant table then we need
            // to set that type by default in the participant list or if user selected some particiapnt type
            // value from list and then swtich tabs like resource pool to user or user to resource pool or panel is pinned
            // then we need to retain that selection.
            if( data.selParticipantType ) {
                participantTypeToSelect = data.selParticipantType;
            } else if( ctx.selected && ctx.selected.participantType ) {
                participantTypeToSelect = ctx.selected.participantType;
            }

            // Check if user has selected participant type from participant table then we need
            // to set that type by default in the participant list.
            if( participantTypeToSelect ) {
                // Get the participant type LOV object from list and then if found set it default selection
                var matchParticipant = _.find( participantTypeList, function( participantValue ) {
                    return participantValue && participantValue.propInternalValue === participantTypeToSelect;
                } );
                if( matchParticipant ) {
                    defaultParticipantValue = matchParticipant;
                }
            }
            // Set the default value in listbox
            if( defaultParticipantValue ) {
                participantProp.dbValue = defaultParticipantValue.propInternalValue;
                participantProp.uiValue = defaultParticipantValue.propDisplayValue;
            }
        }
        // Reset the valueUpdated to false so that it will make mutiple SOA calls while opening the panel
        // or in case of pinned panel
        participantProp.valueUpdated = false;
        // This check is needed when there is participant type need to be populated then we need to set all
        // values to context service so that if there is any participant eligblity constant set then we need
        // to set correct values in context service so that correct user search will be shown on panel.
        if( defaultParticipantValue && defaultParticipantValue.propInternalValue ) {
            if( !ctx.workflow ) {
                ctx.workflow = {};
            }
            exports.updateParticipantUserPanelData( data, defaultParticipantValue.propInternalValue, ctx, ctx.workflow, participantProp );
        }
    }
};

/**
 * Based on preference value check that we need to load project data or not. If preference exist and not equals to
 * org_only then project data will be loaded on UI.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let populatePanelData = function( data, ctx ) {
    prefValue = _getUserAssignmentPrefValue( data );
    data.isProjectInfoLoaded = false;
    if( data && prefValue &&  prefValue !== 'org_only' && appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.loadProjectData ) {
        // Call load data method to load project data
        _loadProjectData( appCtxSvc.ctx, data );
    }

    //If displaying user objects for panel, disable multiselect and check the user panel group/role checkbox
    if( data.preferences.WRKFLW_user_panel_content_display ) {
        var userPrefValue = data.preferences.WRKFLW_user_panel_content_display[ 0 ];
        if( userPrefValue === '0' || prefValue === '1' ) {
            appCtxSvc.ctx.workflow.multiSelectMode = 'single';
        }
    }
};

/**
 * Return if load filtered.
 *
 * @param {Object} isAll - To define that multi select mode is enabled or not
 *
 * @return {boolean} The boolean value to tell that multi select mode is enabled or not
 */

export let getMultiSelectMode = function( multiSelectMode, data ) {
    if( multiSelectMode && multiSelectMode === 'multiple' ) {
        return true;
    }
    return false;
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

/**
 * Get the select object from provider from UI and add to the data
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} multiSelectEnabled - The multiple select enabled or not
 * @param {selection} Array - The selection object array
 */
export let addSelectionToMainPanel = function( data, multiSelectEnabled, selection ) {
    if( data && selection ) {
        wrkflwUtils.getValidObjectsToAdd( data, selection ).then( function( validObjects ) {
            data.selectedObjects = [];
            exports.addSelectedObject( data, multiSelectEnabled, validObjects ).then( function() {
                eventBus.publish( 'addSelectionToMainPanel', {
                    scope: {
                        data: data,
                        ctx: appCtxSvc.ctx
                    }
                } );
            } );
        } );
    }
};

/**
 * Get the task root target attachment and retrun all values
 * @param {Object} taskObject Task obejct for attachment need to be find
 * @return {Object} attachmentList Root target attachment objects from input task object
 */
var _getTaskTargetAttachment = function( taskObject ) {
    var attachmentList = [];

    if( taskObject && taskObject.props.root_target_attachments && taskObject.props.root_target_attachments.dbValues ) {
        var rootTargetAttachmentDBValues = taskObject.props.root_target_attachments.dbValues;

        if( rootTargetAttachmentDBValues ) {
            _.forEach( rootTargetAttachmentDBValues, function( dbValue ) {
                var modelObj = cdm.getObject( dbValue );

                if( modelObj ) {
                    attachmentList.push( modelObj );
                }
            } );
        }
    }

    return attachmentList;
};

/**
 * From the input selection array if object is of type EPM task or signoff then get the root target attachment
 * object else use the object directly and return those objects.
 *
 * @param {selectionArray} Object - The selected object from UI
 */
var _getValidObjectsForProjectsPopulation = function( selectionArray ) {
    var finalObjectList = [];
    var taskObject = null;
    _.forEach( selectionArray, function( selection ) {
        taskObject = null;
        if( commandsMapSvc.isInstanceOf( 'Signoff', selection.modelType ) ) {
            var signoffObject = cdm.getObject( selection.uid );
            var modelObj = cdm.getObject( signoffObject.props.fnd0ParentTask.dbValues[ 0 ] );
            taskObject = viewModelObjectService.createViewModelObject( modelObj );
        } else if( commandsMapSvc.isInstanceOf( 'EPMTask', selection.modelType ) ) {
            taskObject = cdm.getObject( selection.uid );
        }

        // Check if task object is not null and properties are loaded then get the root taregt attachment
        // and add it to the list
        if( taskObject && taskObject.props ) {
            var attachmentList = _getTaskTargetAttachment( taskObject );

            if( attachmentList && attachmentList.length > 0 ) {
                Array.prototype.push.apply( finalObjectList, attachmentList );
            }
        } else {
            // Directly add the object to list
            finalObjectList.push( selection );
        }
    } );

    return finalObjectList;
};

/**
 * Get all project data list
 * @param {Array} objectArray for project data need to be populated
 * @return {Object} Obejct that will contain all project list and owning project list
 */
var _getProjectDataList = function( objectArray ) {
    var finalProjectList = [];
    var owningProjectList = [];

    // Iterate for each object to populate the project data
    if( objectArray && objectArray.length > 0 ) {
        _.forEach( objectArray, function( object ) {
            if( object && object.props ) {
                if( object.props.project_list && object.props.project_list.dbValues && object.props.project_list.dbValues.length > 0 ) {
                    var projectDBValues = object.props.project_list.dbValues;
                    for( var index = 0; index < projectDBValues.length; index++ ) {
                        var projectObject = cdm.getObject( projectDBValues[ index ] );
                        if( projectObject ) {
                            finalProjectList.push( projectObject );
                        }
                    }
                }

                // Check if owning_project property is loaded then get the property values
                if( object.props.owning_project && object.props.owning_project.dbValues && object.props.owning_project.dbValues[ 0 ] ) {
                    var owningProjectUID = object.props.owning_project.dbValues[ 0 ];
                    owningProjectList.push( owningProjectUID );
                }
            }
        } );
    }

    finalProjectList = _.uniq( finalProjectList );

    return {
        finalProjectList: finalProjectList,
        owningProjectList: owningProjectList
    };
};

/**
 * To check if input objects are of type participant then
 * return the selectedObject to populate the project data. Else use the
 * input selected array
 * @param {Object} ctx Context object
 * @param {Object} selectionArray Selected object array
 * @returns {Object} Obejct array
 */
export let getObjectsToLoad = function( ctx, selectionArray ) {
    var selectedObjectsArray =  _.cloneDeep( selectionArray );
    if( selectedObjectsArray && selectedObjectsArray.length > 0 ) {
        var selectedObject = selectedObjectsArray[ 0 ];

        // Check if parent selection is not null then get the parent selection
        // adapter service and check if this selection is not in current selection array
        // then add it to that so we can add the selection to array so that project can be loaded
        if( ctx.pselected ) {
            var parentSelections = adapterSvc.getAdaptedObjectsSync( ctx.pselected );
            if( parentSelections && parentSelections[ 0 ] && parentSelections[ 0 ].uid ) {
                var index = _.findIndex( selectionArray, function( selObject ) {
                    return parentSelections[ 0 ].uid === selObject.uid;
                } );
                if( index <= -1 ) {
                    selectedObjectsArray.push( parentSelections[ 0 ] );
                }
            }
        }

        // Check if object is not null and is of type participant
        if( selectedObject && selectedObject.modelType && selectedObject.modelType.typeHierarchyArray.indexOf( 'Participant' ) > -1 ) {
            return [ ctx.workflow.selectedObject ];
        }
    }
    return selectedObjectsArray;
};

/**
 * Populate the project list based on the selection
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Array} selectionArray - The selected objects from UI
 */
export let populateProjectData = function( data, selectionArray ) {
    var finalProjectList = [];
    var owningProjectList = [];

    // Get the current user
    var currentUser = cdm.getUser();

    // Initialize the project object list to empty array for now
    data.projectObjectList = [];

    // Iterate for each selection object and if selection object is of type EPMTask or Signoff then
    // get the root target attachments for all selection else use the selection directly to get the
    // project data
    if( selectionArray && selectionArray.length > 0 ) {
        // Populate the valid object to populate the project data
        var objectArray = _getValidObjectsForProjectsPopulation( selectionArray );
        var projectDataList = _getProjectDataList( objectArray );
        if( projectDataList ) {
            finalProjectList = projectDataList.finalProjectList;
            owningProjectList = projectDataList.owningProjectList;
        }
    }

    // Add the user to the finalProjectList so that the user_projects property will be loaded into the user
    // Initialize the projectListModelArray
    var projectListModelArray = null;
    projectListModelArray = [];
    var isUserProjectShown = false;

    // If the item is not assigned to any projects then the user projects will be loaded
    var propArray = [];
    if( finalProjectList.length > 0 ) {
        propArray = [ 'object_string', 'project_id' ];
    } else if ( appCtxSvc.ctx.locationContext && appCtxSvc.ctx.locationContext['ActiveWorkspace:Location'] === 'assignmentListLocation' ) {
            finalProjectList.push( currentUser );
            isUserProjectShown = true;
            propArray = [ 'user_projects' ];
    }

    // Make sure the project properties are loaded
    if ( finalProjectList.length > 0 ) {
        dataManagementService.getPropertiesUnchecked( finalProjectList, propArray ).then( function() {
            if( isUserProjectShown && currentUser ) {
                // If it is the currentUser object and the item is not assigned to any projects, then display the user's projects
                currentUser = cdm.getObject( currentUser.uid );
                _.forEach( currentUser.props.user_projects.dbValues, function( userProjectUid ) {
                    var projectObject = cdm.getObject( userProjectUid );
                    if( projectObject && projectObject.props.object_string && projectObject.props.project_id ) {
                        var listModelObject = _getEmptyListModel();
                        listModelObject.propDisplayValue = projectObject.props.object_string.uiValues[ 0 ];
                        listModelObject.propInternalValue = projectObject.props.project_id.dbValues[ 0 ];
                        listModelObject.projectModelObject = projectObject;
                        projectListModelArray.push( listModelObject );
                    }
                } );
            } else {
                // Iterate for each object object
                _.forEach( finalProjectList, function( project ) {
                    var listModelObject = _getEmptyListModel();
                    // Check if project is equals to owning project then append the owning label to display value otherwise directly use display value
                    if( owningProjectList.indexOf( project.uid ) >= 0 ) {
                        listModelObject.propDisplayValue = project.props.object_string.uiValues[ 0 ] + ' ' +
                            data.i18n.owning;
                    } else {
                        listModelObject.propDisplayValue = project.props.object_string.uiValues[ 0 ];
                    }

                    listModelObject.propInternalValue = project.props.project_id.dbValues[ 0 ];
                    listModelObject.projectModelObject = project;
                    projectListModelArray.push( listModelObject );
                } );
            }


            // Check if preference value is not null and if equals to "org_default" then add the empty list model with "None" value to 0th index
            // and if value is project_default then add the empty list model with "None" value to the end of project list
            if( prefValue ) {
                var emptyProjectListModel = _getEmptyListModel();
                emptyProjectListModel.propDisplayValue = data.i18n.none;
                emptyProjectListModel.propInternalValue = '';

                if( prefValue === 'org_default' ) {
                    projectListModelArray.splice( 0, 0, emptyProjectListModel );
                } else if( prefValue === 'project_default' ) {
                    projectListModelArray.push( emptyProjectListModel );
                }
            }

            // Assign the project object list that will be shown on UI
            data.projectObjectList = projectListModelArray;

            //For project_default or project_only preference values, update the displayed users
            if ( prefValue === 'project_default' || prefValue === 'project_only' ) {
                var projectProp = _getProjectProp( data );
                if( projectProp && data.projectObjectList && data.projectObjectList[ 0 ] ) {
                    projectProp.selectedLovEntries = [];
                    projectProp.selectedLovEntries[ 0 ] = data.projectObjectList[ 0 ];
                }
                data.isProjectInfoLoaded = true;
                eventBus.publish( 'reloadDataProvider' );
            }
        } );
    } else {
        //For project_default or project_only preference values, update the displayed users
        if ( prefValue === 'project_default' || prefValue === 'project_only' ) {
            data.isProjectInfoLoaded = true;
            eventBus.publish( 'reloadDataProvider' );
        }
    }
};

/**
 * Parse the perform search response and return the correct output data object
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} response - The response of performSearch SOA call
 *
 * @return {Object} - outputData object that holds the correct values .
 */
var processSoaResponse = function( data, response ) {
    var outputData = null;

    // Construct the output data that will contain the results
    outputData = {
        searchResults: response.searchResults,
        totalFound: response.totalFound,
        totalLoaded: response.totalLoaded
    };

    return outputData;
};


export let revealGroupRoleLOV = function( data ) {
    if( !data.additionalSearchCriteria ) {
        data.additionalSearchCriteria = {};
    }

    data.isFnd0ParticipantEligibility = false;
    // This code is specific to Dynamic participant Template selection. We need to remove this code if we decide that add button in User picker should be enable in every case of STW pop up panel.
    if(  appCtxSvc.ctx.workflow && !_.isUndefined( appCtxSvc.ctx.workflow.isHideAddButtonOnUserPanel ) && !appCtxSvc.ctx.workflow.isHideAddButtonOnUserPanel ) {
        data.isAddButtonVisible = true;
    }
    //Check for the fnd0ParticipantEligibility constant to set group and role
    //If found, treat it the same way we handle group/role set for profile
    if( appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.participantGroupRole && !_.isEmpty( appCtxSvc.ctx.workflow.participantGroupRole )
        && appCtxSvc.ctx.workflow.participantType ) {
        // Get the participant group role object is exist from map object and if found then check
        // for if it has some value then we need to set isFnd0ParticipantEligibility on data so that we can
        // show clear button on UI.
        var participantGroupRoleObject = _.find( appCtxSvc.ctx.workflow.participantGroupRole, function( groupRole ) {
            return groupRole.typeName === appCtxSvc.ctx.workflow.participantType;
        } );

        // Check if value is not empty then only go further and then set the group and role string on additional search criteria
        if( participantGroupRoleObject && participantGroupRoleObject.value && !_.isEmpty( participantGroupRoleObject.value ) ) {
            data.isFnd0ParticipantEligibility = true;
            var participantGroupRoleString = appCtxSvc.ctx.workflow.defaultGroupRole;
            if( participantGroupRoleString ) {
                data.isFnd0ParticipantEligibility = false;
                var groupRoleArray = participantGroupRoleString.split( '::' );
                if( groupRoleArray.length === 2 ) {
                    data.additionalSearchCriteria.group = groupRoleArray[ 0 ];
                    data.additionalSearchCriteria.role = groupRoleArray[ 1 ];
                }
            }
        }
    }


    wrkflwUtils.populateGroupLOV( data, data.allGroups );
    // By default group and role LOV are editable and if group or role are present in
    // additional search criteria then diable it. Fix for defect # LCS-223365
    data.disabledGroup = false;
    data.roleName = '';
    data.groupName = '';
    var defaultGroupValue = data.i18n.allGroups;
    var defaultRoleValue = data.i18n.allRoles;
    var displayedGroupName = defaultGroupValue;
    var displayedRoleName = defaultRoleValue;
    data.searchSubGroup = true;
    // this check was only for profile case, added fnd0Eligibilty condition
    if( data.additionalSearchCriteria && data.additionalSearchCriteria.group && !data.isFnd0ParticipantEligibility ) {
        defaultGroupValue = data.additionalSearchCriteria.group;
        data.disabledGroup = true;
        // Set the group value on data to support filtering in LOV. Fix for defect # LCS-223295
        data.groupName = defaultGroupValue;
        if ( data.additionalSearchCriteria.displayedGroup ) {
            displayedGroupName = data.additionalSearchCriteria.displayedGroup;
            // Check if displayedGroupName is not null and ends with '++' then we need
            // to sub string and show the actual group name in group LOV.
            if( displayedGroupName &&  _.endsWith( displayedGroupName, '++' ) ) {
                var idx = displayedGroupName.indexOf( '++' );
                displayedGroupName = displayedGroupName.substring( 0, idx ).trim();
            }
        }
        // Check if searchSubGroup is true then set this variable on data
        if( data.additionalSearchCriteria.searchSubGroup && data.additionalSearchCriteria.searchSubGroup === 'false' ) {
            data.searchSubGroup = false;
        }
    }

    data.allGroups.dbValue = defaultGroupValue;
    // Set the dbOriginalValue as default value only so that dbValue and dbOriginalValue will be always in sync.
    data.allGroups.dbOriginalValue = defaultGroupValue;
    data.allGroups.uiValue = displayedGroupName;

    wrkflwUtils.populateRoleLOV( data, data.allRoles );
    data.disabledRole = false;
     // this check was only for profile case, added fnd0Eligibilty condition
     if( data.additionalSearchCriteria && data.additionalSearchCriteria.role && !data.isFnd0ParticipantEligibility ) {
        defaultRoleValue = data.additionalSearchCriteria.role;
        data.disabledRole = true;
        // Set the role value on data to support filtering in LOV. Fix for defect # LCS-223295
        data.roleName = defaultRoleValue;

        if ( data.additionalSearchCriteria.displayedRole ) {
            displayedRoleName = data.additionalSearchCriteria.displayedRole;
        }
    }
    data.allRoles.dbValue = defaultRoleValue;
    // Set the dbOriginalValue as default value only so that dbValue and dbOriginalValue will be always in sync.
    data.allRoles.dbOriginalValue = defaultRoleValue;
    data.allRoles.uiValue = displayedRoleName;
};

/**
 * Populate the user data provider with valid content type.
 *
 * @param {Object} data Data view model object
 * @param {Object} dataProvider data provider object
 *
 * @returns {String} Resource provider content type
 */
var _getUsersDataProviderContentType = function( data, dataProvider ) {
    var resourceProviderContentType;
    if( dataProvider && dataProvider.name !== 'userPerformSearch' ) {
        return;
    }

    if( data.preferences && data.preferences.WRKFLW_user_panel_content_display && ( data.preferences.WRKFLW_user_panel_content_display[ 0 ] === '1' ||
            data.preferences.WRKFLW_user_panel_content_display[ 0 ] === '0' ) ) {
        if( data.showUserGroupFlag.dbValue === false ) {
            data.showUsersWithoutGroupRole.dbValue = true;
            data.showUserGroupFlag.dbValue = true;
        }
    } else {
        if( data.showUserGroupFlag.dbValue === false ) {
            data.showUsersWithoutGroupRole.dbValue = false;
            data.showUserGroupFlag = true;
        }
    }

    if( data.showUsersWithoutGroupRole.dbValue ) {
        resourceProviderContentType = 'UniqueUsers';
        if( data.dataProviders ) {
            data.dataProviders.userPerformSearch.selectionModel.setMultiSelectionEnabled( false );
            data.dataProviders.userPerformSearch.selectionModel.setMode( 'single' );
        }
        //change the resourceProviderContentType to get only the eligible users from the data provider if eligibilty constatnt is true
        if( data.isFnd0ParticipantEligibility && appCtxSvc.ctx.workflow.isVersionSupported ) {
            resourceProviderContentType = 'ParticipantEligibilityUniqueUsers';
        }
    } else {
        resourceProviderContentType = 'Users';
        if( data.dataProviders ) {
            var selModel;
            var isMultiSelectMode;
            if( appCtxSvc.ctx.workflow ) {
                selModel = appCtxSvc.ctx.workflow.selectionModelMode;
                isMultiSelectMode = exports.getMultiSelectMode( selModel, data );
            } else { // Added else part for Plant Problem Report. As From CM panel, 'appCtxSvc.ctx.workflow' is null.
                selModel = 'single';
                isMultiSelectMode = false;
                data.isAddButtonVisible = true;
            }
            data.dataProviders.userPerformSearch.selectionModel.setMultiSelectionEnabled( isMultiSelectMode );
            data.dataProviders.userPerformSearch.selectionModel.setMode( selModel );
        }
        if( data.isFnd0ParticipantEligibility && appCtxSvc.ctx.workflow.isVersionSupported ) {
            resourceProviderContentType = 'ParticipantEligibilityUsers';
       }
    }
    return resourceProviderContentType;
};

/**
 * Do the perform search call to populate the user or resource pool based on object values
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {Object} participantType - The participant type user is trying to add
 * @param {Object} deferred - The deferred object
 */
export let performSearchInternal = function( data, dataProvider, participantType, deferred ) {
    // Check is data provider is null or undefined then no need to process further
    // and return from here
    if( !dataProvider ) {
        return;
    }

    // If the org preference is set to project_default or project_only, and the projects have not yet been loaded, don't perform search.
    // User search will happen after the projects are loaded. This avoids a double call to performSearch.
    var orgPrefValue = _getUserAssignmentPrefValue( data );
    if( ( orgPrefValue === 'project_default' || orgPrefValue === 'project_only' ) && !data.isProjectInfoLoaded )  {
        return;
    }
    // If the org preference is set to project_default or project_only, and project info is already loaded then we need
    // to get respective project property and see if project info is loaded but project selected LOV is not set yet
    // that will be case like when user is changing the tab then we need to set the selected LOV entry so that it will
    // show correct project info
    if(  ( orgPrefValue === 'project_default' || orgPrefValue === 'project_only' ) && data.isProjectInfoLoaded ) {
        var projectProp = _getProjectProp( data );
        if( projectProp && ( !projectProp.selectedLovEntries || !projectProp.selectedLovEntries[ 0 ]
            || projectProp.selectedLovEntries.length <= 0 ) && data.projectObjectList && data.projectObjectList[ 0 ] ) {
            projectProp.selectedLovEntries = [];
            projectProp.selectedLovEntries[ 0 ] = data.projectObjectList[ 0 ];
        }
    }
    // Get the policy from data provider and register it
    var policy = dataProvider.action.policy;
    policySvc.register( policy );

    //Check the user panel content preference to determine whether to get all group members or just single users
    var resourceProviderContentType;
    var searchString = '';
    var projectId = '';
    var group;
    var role;

    // Check if user wants to load theusers content then set the correct provider content type
    if( dataProvider && dataProvider.name === 'userPerformSearch' ) {
        resourceProviderContentType = _getUsersDataProviderContentType( data, dataProvider );
        searchString = data.filterBox.dbValue;
        projectId = data.userProjectObject.dbValue;
    }

    // Check if user wants to load the resource pool content then set the correct provider content type
    if( dataProvider && dataProvider.name === 'resourcePoolPerformSearch' ) {
        resourceProviderContentType = 'NewResourcepool';
        searchString = data.resourceFilterBox.dbValue;
        projectId = data.projectObject.dbValue;
        if( data.isFnd0ParticipantEligibility && appCtxSvc.ctx.workflow.isVersionSupported ) {
            data.additionalSearchCriteria = {};
            resourceProviderContentType = 'ParticipantEligibilityResPools';
        }
    }
    if( resourceProviderContentType === 'NewResourcepool' && typeof participantType === typeof undefined && appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.profileGroupName && appCtxSvc.ctx.workflow.profileRoleName ) {
        group = appCtxSvc.ctx.workflow.profileGroupName;
        role = appCtxSvc.ctx.workflow.profileRoleName;
    }

    // Create the search criteria to be used
    var searchCriteria = {
        parentUid: '',
        searchString: searchString,
        resourceProviderContentType: resourceProviderContentType,
        group: group,
        role: role,
        searchSubGroup: 'true',
        projectId: projectId,
        participantType: participantType
    };

    // Check if additional search criteria exist on the scope then use that as well
    // so merge it with existing search criteria and then pass it to server
    var additionalSearchCriteria = data.additionalSearchCriteria;
    if( additionalSearchCriteria ) {
        // Iterate for all entries in additional search criteria and add to main search criteria
        for( var searchCriteriaKey in additionalSearchCriteria ) {
            if( additionalSearchCriteria.hasOwnProperty( searchCriteriaKey ) ) {
                searchCriteria[ searchCriteriaKey ] = additionalSearchCriteria[ searchCriteriaKey ];
            }
        }
    }

    // In case of provider content type is user then we don't need to
    // pass group and role if any filtering present. Fix for defect # LCS-213616 and defect # LCS-541525
    // We don't need to clear the group and role from search criteria if profile is being used.
    if( resourceProviderContentType === 'UniqueUsers' && ( !appCtxSvc.ctx.workflow || !appCtxSvc.ctx.workflow.profileObject ) ) {
        searchCriteria.group = '';
        searchCriteria.role = '';
    }

    // By default resource provider will be Awp0ResourceProvider if other resource provider exist in
    // ctx tthen it will use that
    var resourceProvider = 'Awp0ResourceProvider';
    if( appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.resourceProvider ) {
        resourceProvider = appCtxSvc.ctx.workflow.resourceProvider;
    }

    var inputData = {
        searchInput: {
            maxToLoad: 100,
            maxToReturn: 25,
            providerName: resourceProvider,
            searchCriteria: searchCriteria,
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap: {},
            searchSortCriteria: [],
            startIndex: dataProvider.startIndex
        }
    };

    // SOA call made to get the content
    soaService.post( 'Query-2014-11-Finder', 'performSearch', inputData ).then( function( response ) {
        if( policy ) {
            policySvc.unregister( policy );
        }

        // Parse the SOA data to content the correct user or resource pool data
        var outputData = processSoaResponse( data, response );
        return deferred.resolve( outputData );
    } );
};

/**
 * Do the perform search call to populate the user or resource pool based on object values
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {Object} participantType - The participant type user is trying to add
 *
 */
export let performSearch = function( data, dataProvider, participantType ) {
    var deferred = AwPromiseService.instance.defer();
    exports.performSearchInternal( data, dataProvider, participantType, deferred );
    return deferred.promise;
};

var _clearAllProperties = function( data ) {
    if( !data ) {
        return;
    }

    if( data.allGroups ) {
        data.allGroups.dbValue = '';
        data.allGroups.uiValue = '';
        data.allGroups.dbOriginalValue = null;
        data.allGroups.selectedLovEntries = [];
    }

    if( data.allRoles ) {
        data.allRoles.dbValue = '';
        data.allRoles.uiValue = '';
        data.allRoles.selectedLovEntries = [];
        data.allRoles.dbOriginalValue = null;
    }

    data.roleName = '';
    data.groupName = '';
    if( data.additionalSearchCriteria ) {
        data.additionalSearchCriteria.group = '';
        data.additionalSearchCriteria.role = '';
    }
    if( !data.additionalSearchCriteria ) {
        data.additionalSearchCriteria = {};
    }
};

/**
 * On Tab Selection change, initialize User or resource pool tab
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let handleTabSelectionChange = function( data ) {
    // Check if data is not null and selected tab is true then only set
    // the selected object to null always if user selected some object earlier before tab selection
    if( data && data.selectedTab ) {
        data.selectedObjects = [];
    }
    if( data && data.allGroups && data.allRoles ) {
        _clearAllProperties( data );
        // Check if profile object is not null and user is changing the tab then set the additional search criteria
        // again so that previous tab filters will not be applied on new tab. FIx for defect # LCS-618160
        if( data && appCtxSvc.ctx && appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.profileObject
            && appCtxSvc.ctx.workflow.profileObject.additionalSearchCriteria ) {
            data.additionalSearchCriteria = _.clone( appCtxSvc.ctx.workflow.profileObject.additionalSearchCriteria );
        }
    }
};

/**
 * Based on additional criteria info on app context workflow object set the group and role
 * UI widget value and perform the search again.
 *
 * @param {Object} ctx App context object
 * @param {Object} data Data view model object
 * @param {Object} isReloadDataProvider True/False based on data provider will be relaoded
 */
export let updatePanelAction = function( ctx, data, isReloadDataProvider ) {
    // Check ig valid input and additinal criteria present then set it on data
    // and reload the data provider.
    if( ctx && data && ctx.workflow && ctx.workflow.additionalSearchCriteria ) {
        data.additionalSearchCriteria = _.clone( ctx.workflow.additionalSearchCriteria );
    }
    // Clear the filter box when user is switching the between profile or clearing the
    // profile selection in task assignment panel
    if( data && data.filterBox && data.filterBox.dbValue ) {
        data.filterBox.dbValue = '';
    }
    // Make the selection empty here as we reloading the user panel
    data.selectedObjects = [];
    exports.revealGroupRoleLOV( data );
    if( isReloadDataProvider ) {
        eventBus.publish( 'reloadDataProvider' );
    }
};

/**
 * Clear the selection for input data provider.
 *
 * @param {Object} data Data view model object
 * @param {Object} dataProvider Data provider object
 */
export let clearSelection = function( data, dataProvider ) {
    if( dataProvider && data ) {
        dataProvider.selectNone();
        dataProvider.selectedObjects = [];
        data.selectedObjects = [];
    }
};
/**
 * Clear the widgets and reload the provider.
 *
 * @param {Object} data Data view model object
 */
export let clearAllProperties = function( data ) {
    _clearAllProperties( data );
    eventBus.publish( 'reloadDataProvider' );
};

/**
 * Check if selected participant type is present in multi participant list on context then get
 * all values from that and set it to workflow context and update the user picker panel accordingly.
 *
 * @param {Object} data Data view model object
 * @param {String} participantType Assignable participant type string selected from UI
 * @param {Object} ctx App context object
 * @param {Object} workflowCtx Workflow context object where info need to be stored
 * @param {Object} participantProp Participant type property object
 */
export let updateParticipantUserPanelData = function( data, participantType, ctx, workflowCtx, participantProp ) {
    if( workflowCtx && ctx && ctx.multiParticipantDataMap && ctx.multiParticipantDataMap[ participantType ] ) {
        workflowCtx.participantType = participantType;
        var participantValueObject = ctx.multiParticipantDataMap[ participantType ];
        workflowCtx.defaultGroupRole = null;
        data.additionalSearchCriteria = {};
        // Set the selected particiapnt type on data so that it can be used to retain the selection when
        // user swtich the tabs or have pinned the panel.
        data.selParticipantType = participantType;

        if( participantValueObject ) {
            workflowCtx.selectionModelMode = participantValueObject.selectModelMode;
            workflowCtx.participantGroupRole = participantValueObject.participantGroupRole;
            workflowCtx.participantGroupRoleMap = participantValueObject.participantGroupRoleMap;

            // Check if participantGroupRole is not null and it contains specific group and role then we need to
            // split that string and set the specific group and role to default group and role as this case will
            // be valid for string like Engineering::Designer.
            if( participantValueObject.participantGroupRole ) {
                var splitValues = participantValueObject.participantGroupRole.split( '::' );
                if( splitValues && splitValues.length === 2 && splitValues[ 0 ] && (  splitValues[ 0 ] !== '' && splitValues[ 0 ] !== '*'
                && ( splitValues[ 1 ] !== '' && splitValues[ 1 ] !== '*' )  && !splitValues[ 0 ].endsWith( '++' ) ) ) {
                    workflowCtx.defaultGroupRole = participantValueObject.participantGroupRole;
                }
            }
        }

        // Check if value is updated then only call this method to update group /role and users otherwise
        // for first time panel open it will work correctly.
        if( participantProp && participantProp.valueUpdated ) {
            exports.updatePanelAction( ctx, data, true );
            return;
        }
        exports.revealGroupRoleLOV( data );
    }
};

/**
 * Update the pinned panel data if this panel is pinned then we need to clear other criteria
 * like group, role, filter text and selection as well so that it will show the default values
 * again after first operation is done.
 *
 * @param {Object} data Data view model object
 * @param {Object} ctx App context object
 */
export let updatePinnedPanelData = function( data, ctx ) {
    if( !data || !ctx ) {
        return;
    }
    data.selectedObjects = [];
    _clearAllProperties( data );
    exports.populateParticipantTypesData( data, ctx );
    var projectProp = _getProjectProp( data );
    // Check if project is present then we need to reset it to 0th index value and set valueUpdated to false so that it
    // won't make multiple SOA calls
    if( projectProp && data.projectObjectList && !_.isEmpty( data.projectObjectList ) && data.projectObjectList[ 0 ] ) {
        projectProp.selectedLovEntries = [];
        projectProp.selectedLovEntries[ 0 ] = data.projectObjectList[ 0 ];
        projectProp.dbValue = data.projectObjectList[ 0 ].propInternalValue;
        projectProp.uiValue = data.projectObjectList[ 0 ].propDisplayValue;
        // Reset the dbOriginal value as well when we reset the particiapnt value as panel is pinned.
        projectProp.dbOriginalValue = data.projectObjectList[ 0 ].propInternalValue;
        projectProp.valueUpdated = false;
    }
    var isReloadData = true;
    // Get the filter property and reset to default value that is empty and this needs
    // to be done when panel is pinned. Check if there is any value present in filter box
    // then in that case we don't need to relaod the data provider specifically and it will
    // be done automatically when we reset the value to empty and it will call data provider
    // initialize again.
    var filterProp = _getFilterBoxProp( data );
    if( filterProp ) {
        if( filterProp.dbValue && !_.isEmpty( filterProp.dbValue ) ) {
            isReloadData = false;
        }
        filterProp.dbValue = '';
    }
    exports.updatePanelAction( ctx, data, isReloadData );
};


/**
 * This factory creates a service and returns exports
 *
 * @member userPanelService
 */

export default exports = {
    addSelectedObject,
    objectIsInList,
    addObjects,
    addUserObject,
    populatePanelData,
    getMultiSelectMode,
    addSelectionToMainPanel,
    getObjectsToLoad,
    populateProjectData,
    revealGroupRoleLOV,
    performSearchInternal,
    performSearch,
    handleTabSelectionChange,
    updatePanelAction,
    clearSelection,
    clearAllProperties,
    updateParticipantUserPanelData,
    updatePinnedPanelData,
    populateParticipantTypesData
};
app.factory( 'userPanelService', () => exports );
