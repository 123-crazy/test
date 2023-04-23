// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global define */

/**
 * @module js/Awp0WorkflowAssignmentPanelService
 */
 import * as app from 'app';
 import appCtxSvc from 'js/appCtxService';
 import awp0TasksUtils from 'js/Awp0TasksUtils';
 import viewModelService from 'js/viewModelObjectService';
 import iconSvc from 'js/iconService';
 import msgSvc from 'js/messagingService';
 import dataProviderFactory from 'js/dataProviderFactory';
 import declDataProviderService from 'js/declDataProviderService';
 import assignmentSvc from 'js/Awp0WorkflowAssignmentService';
 import eventBus from 'js/eventBus';
 import workflowAssinmentUtilSvc from 'js/Awp0WorkflowAssignmentUtils';
 import _ from 'lodash';

 /**
  * Define public API
  */
 var exports = {};

 var _addContextObject = null;
 var _panelContext = null;
 var _assigeeAssignmentOrigin = null;

 var parentData = null;
 var _GROUP_PROP_NAME = 'REF(group,Group).object_full_name';
 var _ROLE_PROP_NAME = 'REF(role,Role).role_name';
 var _UNSTAFFED_UID = 'unstaffedUID';

 /**
  * Check if input object is of type input type. If yes then
  * return true else return false.
  *
  * @param {Object} obj Object to be match
  * @param {String} type Object type to match
  *
  * @return {boolean} True/False
  */
 var isOfType = function( obj, type ) {
     if( obj && obj.modelType && obj.modelType.typeHierarchyArray.indexOf( type ) > -1 ) {
         return true;
     }
     return false;
 };


 /**
  * Check if input object is not null and if type of Group Member then get the user
  * from group member and add into data provider else directly add to data provider.
  *
  * @param {Object} dataProvider data provider where object need to be added
  * @param {Object} selection Object that need to be added
  */
 var _populateAssigneeDataProvider = function( dataProvider, selection ) {
     var assignerUsers = [];
     if( _.isArray( selection ) && selection[0 ] ) {
         selection = selection[0 ];
     }
     if( selection && selection.taskAssignment && selection.internalName ) {
         dataProvider.update( assignerUsers, assignerUsers.length );
         return;
     }
     var assignmentObject = null;
     if( selection.taskAssignment && selection.taskAssignment.uid !== _UNSTAFFED_UID ) {
         assignmentObject =  _.cloneDeep( selection );
         selection = selection.taskAssignment;
     }
     // Check if assignment object is not null and it's persisted origin then we need to store
     // this origin for new assignee assignment as well so we store it here and will be used when
     // we add new assignee then set this there as assignmetn origin
     if( assignmentObject && assignmentObject.isPersistedOrigin ) {
         _assigeeAssignmentOrigin = assignmentObject;
     }


     if( isOfType( selection, 'GroupMember' ) && selection.uid ) {
         if( selection.props.user && selection.props.user.dbValues && selection.props.user.dbValues[ 0 ] ) {
             // Get the user object from group member
             var userObject = viewModelService.createViewModelObject( selection.props.user.dbValues[ 0 ] );
             if( userObject ) {
                 userObject.selected = false;
                 userObject.assigneeGroupMember = selection;
                 if( selection.projectObject ) {
                     userObject.projectObject = selection.projectObject;
                 }
                 userObject.assignmentObject = assignmentObject;
                 assignerUsers.push( userObject );
             }
         }
     } else {
         // If selection is not null then only set selected to false and add to data provider
         if( selection && selection.uid  ) {
             selection.selected = false;
             selection.assignmentObject = assignmentObject;
             assignerUsers.push( selection );
         }
     }

     // This is mainly needed when we replace the assignee for one task and that assignee has origin
     // saved already we need to have save origin for new assignee as well.
     if( _assigeeAssignmentOrigin && _assigeeAssignmentOrigin.isPersistedOrigin && assignerUsers[ 0 ]
         && !assignerUsers[ 0 ].assignmentObject ) {
         assignerUsers[ 0 ].assignmentObject = _assigeeAssignmentOrigin;
     }
     dataProvider.update( assignerUsers, assignerUsers.length );
 };

 /**
  * Filter out the fully staff prfoiles from the list and return the filter list. If required reviwers
  * coint is <= 0 then filter that profile object from list.
  *
  * @param {Array} modelObjects Model objects array that are currently present in reviewers data provider
  * @returns {Array} filterObjects Filter object list
  */
 var _filterFullyStaffProfiles = function( modelObjects ) {
     var filterObjects = [];
     if( !modelObjects || modelObjects.length <= 0 ) {
         return filterObjects;
     }

     _.forEach( modelObjects, function( modelObject ) {
         // Check if obejct is of type profile then check out otherwise add directly to filter list
         if( isOfType( modelObject, 'EPMSignoffProfile' ) ) {
             if( modelObject && modelObject.requiredReviewers ) {
                 var reviewersNeeded = parseInt( modelObject.requiredReviewers.split( ' ' ) );
                 if( reviewersNeeded > 0 ) {
                     filterObjects.push( modelObject );
                 }
             }
         } else {
             filterObjects.push( modelObject );
         }
     } );

     return filterObjects;
 };


 /**
  * This method check if both input objects are resource pool object then only it will return
  * true else it will return false.
  * @param {Object} objectA First input object
  * @param {Object} objectB Second input object
  *
  * @returns {boolean} True/False
  */
 var _isDuplicateResourcePoolObjects = function( objectA, objectB ) {
     if( isOfType( objectA, 'ResourcePool' ) && isOfType( objectB, 'ResourcePool' ) ) {
         return true;
     }
     return false;
 };

 var _getDummyModelObject = function( data ) {
     var modelObject = viewModelService.constructViewModelObjectFromModelObject( null, '' );
     var iconURL = iconSvc.getTypeIconFileUrl( 'typePersonGray48.svg' );
     modelObject.typeIconURL = iconURL;
     modelObject.requiredDispValue = data.i18n.required;
     return modelObject;
 };

 /**
  * Check if reviewers is empty then we need to add dummy reviewer object in data provider.
  *
  * @param {Object} dataProvider Data provider object where dummy reviewer need to be added
  * @param {Array} reviewers all reviewers present in reviewers data provider
  */
 var _addDummyReviewerObject = function( dataProvider, reviewers ) {
     // Check if data provider name is reviewersDataProvider and no reviewers present then we need
     // to add required dummy object to indicate that any reviewers need to be present here
     if( dataProvider.name === 'reviewersDataProvider' && ( !reviewers || reviewers.length <= 0 ) && parentData
     && ( !parentData.reviewProfiles || parentData.reviewProfiles.length <= 0 ) ) {
         reviewers.push( _getDummyModelObject( parentData ) );
     }
 };

 /**
  * Check if input objects is not null then add it to respective data provider directly.
  * If input mergeData value is true then it will add input model objects to existing
  * data present in data provider.
  *
  * @param {Object} dataProvider data provider where object need to be added
  * @param {Array} modelObjects Objects that need to be added
  * @param {boolean} mergeData True/False.
  */
 var _populateOtherDataProvider = function( dataProvider, modelObjects, mergeData ) {
     var reviewers = [];
     if( modelObjects && modelObjects.length > 0 ) {
         _.forEach( modelObjects, function( modelObject ) {
             var assignmentObject = null;
             if( modelObject && modelObject.taskAssignment && !modelObject.internalName ) {
                 assignmentObject = _.cloneDeep( modelObject );
                 modelObject = modelObject.taskAssignment;
             }
             // If modelObject is not null then only set selected to false and add to data provider
             if( modelObject && modelObject.uid && modelObject.uid !== _UNSTAFFED_UID  ) {
                 modelObject.selected = false;
                 // This change is needed for popup panel when suer select the profile and do drag and drop then
                 // after correct obejct being added, profile object should be keep selected
                 if( _addContextObject && _addContextObject.vmo && _addContextObject.vmo.uid === modelObject.uid ) {
                     modelObject.selected = true;
                 }

                 if( _.isUndefined( modelObject.assignmentObject ) || !modelObject.assignmentObject ) {
                     modelObject.assignmentObject = assignmentObject;
                 }
                 reviewers.push( modelObject );
             }
         } );
     }

     // Check if merge daya is true then get already present element in data provider
     // and add it to new model objects and update data provider
     if( mergeData ) {
         var presetObjects = dataProvider.viewModelCollection.loadedVMObjects;
         // Check if data provider name is reviewersDataProvider then only do filtering
         // to remove the profiles
         if( dataProvider.name === 'reviewersDataProvider' ) {
             presetObjects = _filterFullyStaffProfiles( presetObjects );
         }
         Array.prototype.push.apply( presetObjects, reviewers );

         var allowDuplicateResourcePools = true;
         // Check if assignment being made is DP participant then we need to check resource pool
         // duplicate check as well as duplicate resource pool as well so don't allow duplicate resource pools
         if( _panelContext && _panelContext.selectionBasedParticipants ) {
             var particiapntDataProvider = _.find( _panelContext.selectionBasedParticipants, {
                 internalName: dataProvider.name
             } );
             if( particiapntDataProvider ) {
                 allowDuplicateResourcePools = false;
             }
         }

         if( allowDuplicateResourcePools ) {
             // Remove the duplicates if present in presetObjects list. If duplicate resource pool
             // present then it should not filter it out.
             reviewers = _.uniqWith( presetObjects, function( objA, objB ) {
                 return objA.uid === objB.uid && !_isDuplicateResourcePoolObjects( objA, objB );
             } );
         } else {
             // Remove the duplicates if present in presetObjects list. If duplicate resource pool
             // present then it should not filter it out.
             reviewers = _.uniqWith( presetObjects, function( objA, objB ) {
                 return objA.uid === objB.uid;
             } );
         }

         if( dataProvider.name === 'reviewersDataProvider' && reviewers && reviewers[ 0 ]
             && reviewers[ 0 ].requiredDispValue && _.isUndefined( reviewers[ 0 ].uid ) && reviewers.length > 1 ) {
             reviewers = reviewers.splice( 1 );
         }
     }

     // Check if data provider name is reviewersDataProvider and no reviewers present then we need
     // to add required dummy object to indicate that any reviewers need to be present here
     _addDummyReviewerObject( dataProvider, reviewers );

     dataProvider.update( reviewers, reviewers.length );
 };

 /**
  * Update the profile required reviewers count based on viewer is being added. If profile
  * required reviewers count becomes 0 then return null profile from here so that reviewer can be
  * added to adhoc list.
  *
  * @param {String} profileUid Profile obejct Uid that need to be search in input profile
  * list.
  * @param {Array} profileObjects Profile Objects that need to be added/removed
  * @returns {object} Profile object
  */
 var _updateProfileRequiredReviewers = function( profileUid, profileObjects ) {
     // Check if profile obejct array is null or empty then return from here
     if( !profileObjects || profileObjects.length <= 0 ) {
         return null;
     }

     var profileVMO = _.find( profileObjects, function( profile ) {
         return profile.uid === profileUid;
     } );


     // Check if VMO is not null then only get the required number of reviewers
     // and then reduce the count.
     if( profileVMO ) {
         var noRequiredReviewers = 0;
         if( profileVMO.requiredReviewers ) {
             noRequiredReviewers = parseInt( profileVMO.requiredReviewers.split( ' ' ) );
         }

         noRequiredReviewers--;
         if( noRequiredReviewers < 0 ) {
             return null;
         }
         profileVMO.requiredReviewers = noRequiredReviewers + ' ' + parentData.i18n.required;
         return profileVMO;
     }
     return null;
 };

 /**
  * Populate profile users and adhoc users and populate to respective data provider
  *
  * @param {Object} data Data view model object
  * @param {Array} profileObjects Profile Objects that need to be added or profile reviewers
  *  need to be added
  * @param {Array} reviewersObjects Objects that need to be added
  * @param {boolean} isAddUsersProfileCase True/False. Only be true when addign profile users from panel
  * @param {boolean} mergeData True/False.
  */
 var _populateProfileAndAdhocReviewers = function( data, profileObjects, reviewersObjects, isAddUsersProfileCase, mergeData ) {
     var reviewers = [];
     var additionalReviewers = [];
     var finalReviewers = [];
     var isProfilePresent = false;
     var addProfileObject = null;

     // Check if profile object is not null and not empty then set the flag
     // to true and get the 0th index profile object and set to one variable.
     if( profileObjects && profileObjects.length > 0 ) {
         isProfilePresent = true;
         addProfileObject = profileObjects[ 0 ];
     }

     _.forEach( reviewersObjects, function( reviewer ) {
         var profileObject = reviewer.signoffProfile;

         // This flag will only be true when user is trying to add profile users from panel
         if( isAddUsersProfileCase ) {
             profileObject = addProfileObject;
         }

         if( reviewer && reviewer.taskAssignment && ( !reviewer.internalName && reviewer.taskAssignment.uid !== _UNSTAFFED_UID ) ) {
             var assignmentObject = _.cloneDeep( reviewer );
             reviewer = reviewer.taskAssignment;
             reviewer.assignmentObject = assignmentObject;
         }

         // Check if profile object is not null then only update the profile required reviewers count
         if( profileObject || isAddUsersProfileCase ) {
             profileObject = _updateProfileRequiredReviewers( profileObject.uid, profileObjects );
             reviewer.signoffProfile = profileObject;
         }

         // Add the data to respective list based on profile existence
         reviewer.selected = false;
         if( profileObject || !isProfilePresent ) {
             reviewers.push( reviewer );
         } else {
             if( !isOfType( reviewer, 'EPMSignoffProfile' ) ) {
                 additionalReviewers.push( reviewer );
             }
         }
     } );

     // Check if profile is present and then check for required reviewers count
     // on profile obejct if > 0 then only add to list that will be added on data provider
     if( isProfilePresent ) {
         _.forEach( profileObjects, function( profile ) {
             var noRequiredReviewers = parseInt( profile.requiredReviewers.split( ' ' ) );
             if( noRequiredReviewers > 0 ) {
                 finalReviewers.push( profile );
             }
         } );
         Array.prototype.push.apply( finalReviewers, reviewers );
         reviewers = finalReviewers;
     }

     // Populate reviewers and additional reviewers on panel
     _populateOtherDataProvider( data.dataProviders.reviewersDataProvider, reviewers, mergeData );
     _populateOtherDataProvider( data.dataProviders.adhocReviewersDataProvider, additionalReviewers, mergeData );
 };

 /**
  * Get all group member elements present in current data provider and update the
  * input list only.
  *
  * @param {Object} dataProvider Data provider object whose objects need to be checked
  * @param {Array} addedObjects Objects that need to be added
  * @returns {Array} addedObjects array that contains all group memebrs objects present.
  */
 var _presentGroupMembersInDataProvider = function( dataProvider, addedObjects ) {
     if( !dataProvider ) {
         return addedObjects;
     }
     var modelObejcts = dataProvider.viewModelCollection.loadedVMObjects;
     if( !modelObejcts || modelObejcts.length <= 0 ) {
         return addedObjects;
     }

     _.forEach( modelObejcts, function( modelObject ) {
         if( isOfType( modelObject, 'GroupMember' ) ) {
             addedObjects.push( modelObject );
         }
     } );
     return addedObjects;
 };

 /**
  * Populate all present group member objects in all differnet data providers and populate one list
  * @param {Object} dpParticipantProvider DP participant data provider object when user is adding DP.
  *
  * @returns {Array} addedObjects array that contains all group memebrs objects present.
  */
 var _populateAlreadyAddedGroupMemberObjects = function( dpParticipantProvider ) {
     var addedObjects = [];
     // If DP based particiapnt exist then get all objects from DP data provider
     if( dpParticipantProvider ) {
         return dpParticipantProvider.viewModelCollection.loadedVMObjects;
     }
     if( !parentData || !parentData.dataProviders ) {
         return addedObjects;
     }
     _presentGroupMembersInDataProvider( parentData.dataProviders.reviewersDataProvider, addedObjects );
     _presentGroupMembersInDataProvider( parentData.dataProviders.adhocReviewersDataProvider, addedObjects );
     _presentGroupMembersInDataProvider( parentData.dataProviders.acknowledgersDataProvider, addedObjects );
     _presentGroupMembersInDataProvider( parentData.dataProviders.notifyeesDataProvider, addedObjects );

     return addedObjects;
 };

 /**
  * Validate if users is trying to add group member then that group member should not already
  * present in same or differnet data provider.
  * @param {Array} selectedObjects Objects that need to be added and need validation
  * @param {Object} dpParticipantProvider DP participant data provider object when user is adding DP.
  *
  * @returns {Array} validObjects array that need to be added
  */
 var _validObjectsToAdd = function( selectedObjects, dpParticipantProvider ) {
     var alreadyAddedObjects = _populateAlreadyAddedGroupMemberObjects( dpParticipantProvider );

     var validObjects = [];
     var objectsAlreadyAdded = [];
     _.forEach( selectedObjects, function( selectedObject ) {
         var isObjAlreadyAddedIndex = null;
         isObjAlreadyAddedIndex = _.findKey( alreadyAddedObjects, {
             uid: selectedObject.uid
         } );
         if( typeof isObjAlreadyAddedIndex === typeof undefined ) {
             selectedObject.selected = false;
             validObjects.push( selectedObject );
         } else {
             objectsAlreadyAdded.push( selectedObject );
         }
     } );

     if( objectsAlreadyAdded.length > 0 ) {
         // Set the selected objects on data object and it will be used for duplicate validation
         var dataObject = _.cloneDeep( parentData );
         dataObject.selectedObjects = selectedObjects;
         var message = awp0TasksUtils.getDuplicateErrorMessage( objectsAlreadyAdded, dataObject );
         msgSvc.showError( message );
     }
     return validObjects;
 };

 /**
  * Based on input data provider and model objects add it to data provider list and update the
  * data provider.
  * @param {Object} dataProvider Data provider object
  * @param {Object} assignParticipants Assign particiapnts that need to be shown on panel
  */
 var _updateParticipantDataProvider = function( dataProvider, assignParticipants ) {
     if( !dataProvider || !assignParticipants ) {
         return;
     }

     var participantObjects = [];
     if( assignParticipants && assignParticipants.length > 0 ) {
         _.forEach( assignParticipants, function( assignParticipant ) {
             if( assignParticipant && assignParticipant.taskAssignment  ) {
                 assignParticipant = assignParticipant.taskAssignment;
             }
             // If modelObject is not null then only set selected to false and add to data provider and DP is not unassiged
             // then only show it on the panel
             if( assignParticipant && assignParticipant.uid && assignParticipant.uid !== _UNSTAFFED_UID ) {
                 assignParticipant.selected = false;
                 participantObjects.push( assignParticipant );
             }
         } );
     }
     dataProvider.update( participantObjects,  participantObjects.length );
 };

 /**
  * This will create the dataProvider for Participant list
  * @param {Object} data - data
  * @param {Object} ctx - ctx
  * @param {Object} panelContext - panelContext
  */
 var _createParticipantsDataProviders = function( data, ctx, panelContext ) {
     data.processAssignmentParticipantProviderList = [];
     if( panelContext.selectionBasedParticipants && panelContext.selectionBasedParticipants.length > 0 ) {
         panelContext.participantDataProviders = [];
         _.forEach( panelContext.selectionBasedParticipants, function( participantObject ) {
             var dataProvider = dataProviderFactory.createDataProvider( null, null, participantObject.internalName, declDataProviderService );
             dataProvider.json = {
                 selectionModelMode: participantObject.selectionMode
             };
             dataProvider.selectionModel.setMode( participantObject.selectionMode );
             data.processAssignmentParticipantProviderList.push( dataProvider );
             data.dataProviders[ participantObject.internalName ] = dataProvider;
             participantObject.dataProvider = dataProvider;
             dataProvider.name = participantObject.internalName;
             panelContext.participantDataProviders.push( dataProvider );
             _updateParticipantDataProvider( dataProvider, panelContext.deferredAssignments[ participantObject.internalName].assignees );
         } );
     }
 };

 /**
  * Populate the DP key roles in input data provider to indicate that this property is using this specifc
  * DP as an assignment.
  *
  * @param {Object} dataProvider Data provider object whe DP key role need to be added
  * @param {Array} supportedDPTypes Supported DP types string array for that specific assignment type
  */
 var _populateDPKeyRoles = function( dataProvider, supportedDPTypes ) {
     if( !dataProvider || !supportedDPTypes || supportedDPTypes.length <= 0 ) {
         return;
     }
     var keyRoleDPObjects = [];
     _.forEach( supportedDPTypes, function( dpType ) {
         var taskDPParticipant = _.find( _panelContext.selectionBasedParticipants, {
             internalName: dpType
         } );
         if( taskDPParticipant && taskDPParticipant.displayName ) {
             var keyRole = workflowAssinmentUtilSvc.createKeyRoleObject( dpType, taskDPParticipant.displayName );
             if( keyRole ) {
                 keyRoleDPObjects.push( keyRole );
             }
         }
     } );
     if( keyRoleDPObjects && keyRoleDPObjects.length > 0 ) {
         var modelObejcts = dataProvider.viewModelCollection.loadedVMObjects;
         Array.prototype.push.apply( modelObejcts, keyRoleDPObjects );
         dataProvider.update( modelObejcts,  modelObejcts.length );
     }
 };

 /**
  * Clear the data present on the panel when user switch between tasks.
  *
  * @param {Object} data Data view model object
  */
 var _clearDataOnPanel = function( data ) {
     if( !data ) {
         return;
     }
     _assigeeAssignmentOrigin = null;
     _addContextObject = null;
     data.reviewProfiles = null;
     data.dataProviders.assignerDataProvider.viewModelCollection.loadedVMObjects = [];
     data.dataProviders.assignerDataProvider.viewModelCollection.totalFound = 0;
     data.dataProviders.reviewersDataProvider.viewModelCollection.loadedVMObjects = [];
     data.dataProviders.reviewersDataProvider.viewModelCollection.totalFound = 0;
     data.dataProviders.adhocReviewersDataProvider.viewModelCollection.loadedVMObjects = [];
     data.dataProviders.adhocReviewersDataProvider.viewModelCollection.totalFound = 0;
     data.dataProviders.acknowledgersDataProvider.viewModelCollection.loadedVMObjects = [];
     data.dataProviders.acknowledgersDataProvider.viewModelCollection.totalFound = 0;
     data.dataProviders.notifyeesDataProvider.viewModelCollection.loadedVMObjects = [];
     data.dataProviders.notifyeesDataProvider.viewModelCollection.totalFound = 0;
 };

 var _populateParticipantDataProviders = function( data, panelContext ) {
    if( data && panelContext && panelContext.selectionBasedParticipants && panelContext.selectionBasedParticipants.length > 0 ) {
        _.forEach( panelContext.selectionBasedParticipants, function( participantObject ) {
            var dpName = participantObject.internalName;
            var dataProvider = data.dataProviders[ dpName];
            _updateParticipantDataProvider( dataProvider, panelContext.deferredAssignments[ participantObject.internalName].assignees );
        } );
    }
 };

 export let populateTaskAssignmentPanelData = function( data, selection, ctx ) {
    var panelContext = ctx.taskAssignmentCtx.panelContext;
    var taskInfoObject = _.cloneDeep( panelContext.taskInfoObject );
    _panelContext = panelContext;

    parentData = data;
    if( !data || !selection || !selection.uid ) {
        return;
    }
    data.name.uiValue = selection.props.object_string.dbValues[ 0 ];
    if( isOfType( selection, 'EPMTask' ) ) {
        data.status.uiValue = selection.props.task_state.dbValues[ 0 ];
    }

    _clearDataOnPanel( data );
    _populateAssigneeDataProvider( data.dataProviders.assignerDataProvider, taskInfoObject.props.assignee.modelObjects );
    _populateDPKeyRoles( data.dataProviders.assignerDataProvider,  taskInfoObject.props.assignee.supportedDPTypes );
    var reviewersList = taskInfoObject.props.reviewers.modelObjects;
    var acknowledgersList = taskInfoObject.props.acknowledgers.modelObjects;

    data.reviewProfiles = taskInfoObject.taskProfiles;

    // Get the supported DP types if reviewer is using to show it on reviewers data provider
    // and if task or task template is acknowledge then we need to use DP for acknowledeg task
    // and those will be shown in reviewers section on panel
    var reviewerSupportedDPTypes = taskInfoObject.props.reviewers.supportedDPTypes;
    // If selected task template is EPMAcknowledgeTaskTemplate then we show
    // acknoledgers in reviewers and additional reviewers sections and while saving
    // it will save in acknowledgers section
    if( isOfType( selection, 'EPMAcknowledgeTask' ) || isOfType( selection, 'EPMAcknowledgeTaskTemplate' ) ) {
        reviewersList = acknowledgersList;
        reviewerSupportedDPTypes = taskInfoObject.props.acknowledgers.supportedDPTypes;
        taskInfoObject.props.acknowledgers.modelObjects = [];
    }

    // Populate reviewers and additional reviewers on assignment panel
    var profileObjects = data.reviewProfiles;

    if( data.reviewProfiles && data.reviewProfiles.length > 0 ) {
        ctx.taskAssignmentCtx.selectedTaskObject.isProfileExist = true;
    }

    if( data.reviewProfiles && data.reviewProfiles.length > 0 ) {
        _populateDPKeyRoles( data.dataProviders.adhocReviewersDataProvider, reviewerSupportedDPTypes );
    } else {
        _populateDPKeyRoles( data.dataProviders.reviewersDataProvider, reviewerSupportedDPTypes );
    }

    // Populate the reviwers and additional reviewers data provider
    _populateProfileAndAdhocReviewers( data, profileObjects, reviewersList, false, true );

    _populateDPKeyRoles( data.dataProviders.acknowledgersDataProvider,  taskInfoObject.props.acknowledgers.supportedDPTypes );
    _populateOtherDataProvider( data.dataProviders.acknowledgersDataProvider, taskInfoObject.props.acknowledgers.modelObjects, true );

    _populateDPKeyRoles( data.dataProviders.notifyeesDataProvider,  taskInfoObject.props.notifyees.supportedDPTypes );
    _populateOtherDataProvider( data.dataProviders.notifyeesDataProvider, taskInfoObject.props.notifyees.modelObjects, true );
    _populateParticipantDataProviders( data, panelContext );
};

export let createParticipantDataProviderObjects = function( data, panelContext ) {
    data.processAssignmentParticipantProviderList = [];
    if( panelContext.selectionBasedParticipants && panelContext.selectionBasedParticipants.length > 0 ) {
        panelContext.participantDataProviders = [];
        _.forEach( panelContext.selectionBasedParticipants, function( participantObject ) {
            var dataProvider = dataProviderFactory.createDataProvider( null, null, participantObject.internalName, declDataProviderService );
            dataProvider.json = {
                selectionModelMode: participantObject.selectionMode
            };
            dataProvider.selectionModel.setMode( participantObject.selectionMode );
            data.processAssignmentParticipantProviderList.push( dataProvider );
            data.dataProviders[ participantObject.internalName ] = dataProvider;
            participantObject.dataProvider = dataProvider;
            dataProvider.name = participantObject.internalName;
            panelContext.participantDataProviders.push( dataProvider );
        } );
    }
};

 export let populatePanelData = function( data, selection, ctx ) {
     var panelContext = ctx.taskAssignmentCtx.panelContext;
     var taskInfoObject = _.cloneDeep( panelContext.taskInfoObject );
     _panelContext = panelContext;

     parentData = data;
     if( !data || !selection || !selection.uid ) {
         return;
     }
     data.name.uiValue = selection.props.object_string.dbValues[ 0 ];
     if( isOfType( selection, 'EPMTask' ) ) {
         data.status.uiValue = selection.props.task_state.dbValues[ 0 ];
     }

     _clearDataOnPanel( data );
     _populateAssigneeDataProvider( data.dataProviders.assignerDataProvider, taskInfoObject.props.assignee.modelObjects );
     _populateDPKeyRoles( data.dataProviders.assignerDataProvider,  taskInfoObject.props.assignee.supportedDPTypes );
     var reviewersList = taskInfoObject.props.reviewers.modelObjects;
     var acknowledgersList = taskInfoObject.props.acknowledgers.modelObjects;

     data.reviewProfiles = taskInfoObject.taskProfiles;

     // Get the supported DP types if reviewer is using to show it on reviewers data provider
     // and if task or task template is acknowledge then we need to use DP for acknowledeg task
     // and those will be shown in reviewers section on panel
     var reviewerSupportedDPTypes = taskInfoObject.props.reviewers.supportedDPTypes;
     // If selected task template is EPMAcknowledgeTaskTemplate then we show
     // acknoledgers in reviewers and additional reviewers sections and while saving
     // it will save in acknowledgers section
     if( isOfType( selection, 'EPMAcknowledgeTask' ) || isOfType( selection, 'EPMAcknowledgeTaskTemplate' ) ) {
         reviewersList = acknowledgersList;
         reviewerSupportedDPTypes = taskInfoObject.props.acknowledgers.supportedDPTypes;
         taskInfoObject.props.acknowledgers.modelObjects = [];
     }

     // Populate reviewers and additional reviewers on assignment panel
     var profileObjects = data.reviewProfiles;

     if( data.reviewProfiles && data.reviewProfiles.length > 0 ) {
         ctx.taskAssignmentCtx.selectedTaskObject.isProfileExist = true;
     }

     if( data.reviewProfiles && data.reviewProfiles.length > 0 ) {
         _populateDPKeyRoles( data.dataProviders.adhocReviewersDataProvider, reviewerSupportedDPTypes );
     } else {
         _populateDPKeyRoles( data.dataProviders.reviewersDataProvider, reviewerSupportedDPTypes );
     }

     // Populate the reviwers and additional reviewers data provider
     _populateProfileAndAdhocReviewers( data, profileObjects, reviewersList, false, true );

     _populateDPKeyRoles( data.dataProviders.acknowledgersDataProvider,  taskInfoObject.props.acknowledgers.supportedDPTypes );
     _populateOtherDataProvider( data.dataProviders.acknowledgersDataProvider, taskInfoObject.props.acknowledgers.modelObjects, true );

     _populateDPKeyRoles( data.dataProviders.notifyeesDataProvider,  taskInfoObject.props.notifyees.supportedDPTypes );
     _populateOtherDataProvider( data.dataProviders.notifyeesDataProvider, taskInfoObject.props.notifyees.modelObjects, true );

     _createParticipantsDataProviders( data, ctx, panelContext );
 };

 /**
  * Add the selected obejct from user picker panel to assignment panel.
  * @param {Object} data Data view model object
  */
 export let addSelectedUsers = function( data ) {
     var selectedObjects = data.selectedObjects;
     // Check if add context is null or selected objects are null then
     // no need to add anything and return from here
     if( !_addContextObject || !selectedObjects ) {
         return;
     }

     // Check if user is trying to add assignee/assigner then get the user
     // from group member object and update data provider.
     if( _addContextObject.name === 'assignerDataProvider' ) {
         _populateAssigneeDataProvider( _addContextObject, selectedObjects[ 0 ] );
         parentData.isTemplateAssignmentInProgress = true;
         appCtxSvc.ctx.taskAssignmentCtx.enableModifyButton = true;
     } else {
         var dpDataProvider = null;
         // Check if user is trying to add DP assignment then get the DP data provider
         // pass it to valid method to that it can validate for duplication
         if( _panelContext && _panelContext.selectionBasedParticipants ) {
             var participantContext = _.find( _panelContext.selectionBasedParticipants, {
                 internalName: _addContextObject.name
             } );
             if( participantContext && participantContext.dataProvider && participantContext.dataProvider.json
                 && participantContext.dataProvider.json.selectionModelMode === 'multiple' ) {
                 dpDataProvider = participantContext.dataProvider;
             }
         }

         // Get valid object list based on objects already presnets on respective data provider
         // and if valid objects are not null then only add to respective data provider.
         var validObjects = _validObjectsToAdd( selectedObjects, dpDataProvider );

         if( validObjects && validObjects.length > 0 ) {
             // This is profile user add case
             if( _addContextObject.vmo && _addContextObject.vmo.props ) {
                 _populateProfileAndAdhocReviewers( parentData, [ _addContextObject.vmo ], validObjects, true, true );
                 // This change is mainly needed to deselect the profile in narrow mode. FIx for defect LCS-450545
                 _addContextObject.vmo.selected = false;
                 if( parentData.dataProviders && parentData.dataProviders.reviewersDataProvider ) {
                     parentData.dataProviders.reviewersDataProvider.selectNone();
                     parentData.dataProviders.reviewersDataProvider.selectedObjects = [];
                 }
             } else {
                 _populateOtherDataProvider( _addContextObject, validObjects, true );
             }
             parentData.isTemplateAssignmentInProgress = true;
             appCtxSvc.ctx.taskAssignmentCtx.enableModifyButton = true;
         }
     }
 };

 /**
  * Populate the additionals earch criteria based on input context and this will be used for
  * group or role specific assignments.
  * @param {Object} cmdContext Comand context object that hold the information that specifci
  * group or role object need to be assined.
  *
  * @returns {Object} Additioanls search criteria object
  */
 var _populateAdditonalSearchCriteria = function( cmdContext ) {
     if( !cmdContext || !cmdContext.props || !cmdContext.additionalSearchCriteria ) {
         return {};
     }
     return _.clone( cmdContext.additionalSearchCriteria );
 };

 /**
  * Check if input command context object is profile then only
  * profile objects should be shown on user pciker panel else all users will be shown.
  *
  * @param {Object} cmdContext Command context object
  */
 export let openUserPanel = function( cmdContext ) {
    console.log("===========================");
    console.log(cmdContext);
     if( cmdContext.dataProvider ) {
         cmdContext = cmdContext.dataProvider;
     }
     var additionalSearchCriteria = null;
     var selectionMode = 'single';
     var profileObject = null;
     if( cmdContext && cmdContext.vmo && cmdContext.vmo.props ) {
         additionalSearchCriteria = _populateAdditonalSearchCriteria( cmdContext.vmo );
         selectionMode = 'multiple';
         profileObject = cmdContext.vmo;
     } else if( cmdContext.selectionModel && cmdContext.selectionModel.mode ) {
         // In case of all defiend data provider when it comes as context, get selection from that
         selectionMode = cmdContext.selectionModel.mode;
     } else if( cmdContext.selectionMode ) {
         // If selection mode present as commoand context then use that and it will be present in DP data
         // provider cases.
        selectionMode = cmdContext.selectionMode;
     }
     _addContextObject = cmdContext;

     if( !parentData ) {
         return;
     }

     // Add the additional search criteria on the scope so that it can be consume while generating the SOA input
     parentData.additionalSearchCriteria = additionalSearchCriteria;

     var context = {
         selectionModelMode: selectionMode,
         loadProjectData: true,
         profileObject : profileObject
     };
     appCtxSvc.registerCtx( 'workflow', context );
 };

 /**
  * When trying to remove profile users then update the profile information and add it to
  * data provider.
  *
  * @param {Array} objectToDisplay Objects that are already present in data provider
  * @param {Array} selectedObjects Objects that need to be removed
  *  @returns {Array} validObjects array that is being used to update data provider
  */
 var _removeReviewers = function( objectToDisplay, selectedObjects ) {
     var validObjects = [];
     for( var idx = 0; idx < selectedObjects.length; idx++ ) {
         var object = selectedObjects[ idx ];

         var profileObject = object.signoffProfile;
         // Check if profile is null then no need to process further
         if( !profileObject ) {
             continue;
         }

         // Check if profile object is not VMO then create the VMO object first and then
         // increment the count.
         if( !viewModelService.isViewModelObject( profileObject ) ) {
             profileObject = viewModelService.createViewModelObject( profileObject );
             profileObject.requiredReviewers = profileObject.props.number_of_signoffs.dbValues[ 0 ] + ' ' + parentData.i18n.required;
         }
         var reviewersNeeded = parseInt( profileObject.requiredReviewers.split( ' ' ) );
         profileObject.requiredReviewers = reviewersNeeded + 1 + ' ' + parentData.i18n.required;
         var tempIndexOfProfileObject = _.findKey( objectToDisplay, {
             uid: profileObject.uid
         } );

         // If profile index is already prenset data is undefined then
         // only try to get forst group member or resource pool index and
         // add the profile before that.
         if( typeof tempIndexOfProfileObject === typeof undefined ) {
             var indexOfFirstGroupMember = _.findKey( objectToDisplay, {
                 type: 'GroupMember'
             } );

             var validIndex = indexOfFirstGroupMember;
             var indexOfFirstResourcePool = _.findKey( objectToDisplay, {
                 type: 'ResourcePool'
             } );

             if( indexOfFirstResourcePool > -1 && indexOfFirstResourcePool < indexOfFirstGroupMember ) {
                 validIndex = indexOfFirstResourcePool;
             }

             // Add the profile object to already presnet list
             objectToDisplay.splice( validIndex, 0, profileObject );
         }
     }
     // Find the differnece that need to be addded.
     validObjects = _.difference( objectToDisplay, selectedObjects );
     return validObjects;
 };

 /**
  * Remove the selected objects from input data provider and update it. In case of
  * reviewers removal where profile object, profile object will be added to data ptovider.
  *
  * @param {Object} dataProvider Data provider object whose objects need to be removed
  * @param {Array} selectedObjects Objects that need to be removed
  */
 export let removeUsersTaskAssignment = function( dataProvider, selectedObjects ) {
     if( dataProvider.dataProvider ) {
         dataProvider = dataProvider.dataProvider;
         selectedObjects = dataProvider.selectedObjects;
     }
     var validRemoveObjects = [];
     // Check if reviewer is required then that canno tbe removed. So ignore that in case of multiple
     // selections
     _.forEach( selectedObjects, function( selObject ) {
         // This check is needed in case of multiple selection some are required and some are not so we need to ignore those.
         if( selObject.assignmentObject && ( selObject.assignmentObject.isRequired  || selObject.assignmentObject.isRemoveAllowed === 'false' ) ) {
             selObject.selected = false;
         } else {
             validRemoveObjects.push( selObject );
         }
     } );

     // Check for remove object is empty then no need to process further
     if( !validRemoveObjects || _.isEmpty( validRemoveObjects ) ) {
        return;
     }
     var modelObjects = dataProvider.viewModelCollection.loadedVMObjects;
     var validObjects = [];
     if( dataProvider.name === 'reviewersDataProvider' ) {
         validObjects = _removeReviewers( modelObjects, validRemoveObjects );
     } else {
         validObjects = _.difference( modelObjects, validRemoveObjects );
     }

     if( dataProvider.name === 'reviewersDataProvider' && validObjects.length <= 0 && parentData ) {
         validObjects.push( _getDummyModelObject( parentData ) );
     }

     dataProvider.update( validObjects, validObjects.length );
     appCtxSvc.ctx.taskAssignmentCtx.enableModifyButton = true;
     appCtxSvc.registerCtx( 'assignmentsChanged', true );
 };

 /**
  * Initialize add command context. This is needed mainly for karma testing
  *
  * @param {Object} cmdContext context
  */
 export let initializeAddCommandContext = function( cmdContext ) {
     _addContextObject = cmdContext;
 };

 /**
  * Initialize panel context data that contains task specific info. This is needed mainly for karma testing
  *
  * @param {data} context Panel context object
  */
 export let initializePanelContextData = function( context ) {
     _panelContext = context;
 };

 /**
  * Initialize parent data. This is needed mainly for karma testing
  *
  * @param {data} data The view model data
  */
 export let initializeParentData = function( data ) {
     parentData = data;
 };

 export let updateTaskAssignmentData = function( data, panelContext, selectedTask, ctx ) {
     assignmentSvc.updateTaskAssignments( data, panelContext, selectedTask, ctx.taskAssignmentCtx );

     ctx.taskAssignmentCtx.enableModifyButton = false;
     eventBus.publish( 'taskTreeTable.plTable.reload' );
 };

 /**
  * Open replace assignment panel that will be used to replace the existing assignment.
  *
  * @param {Object} data Data view model object
  * @param {Object} selected Selected object from table that need to be replaced
  */
 export let openReplaceTaskAssignmentPanel = function( data, selected ) {
     var profileObject = null;
     if( selected.assignmentObject && selected.assignmentObject.signoffProfile ) {
         profileObject = selected.assignmentObject.signoffProfile;
     }
     var additionalSearchCriteria = _populateAdditonalSearchCriteria( profileObject );
     data.additionalSearchCriteria = additionalSearchCriteria;
     workflowAssinmentUtilSvc.registerUserPanelContext( 'single',  additionalSearchCriteria, profileObject, true );
 };

 /**
  * Discrad the changes user has done on panel if user has not click on modify button and
  * change the task selction.
  * @param {Object} context Context object
  * @param {Object} selectedObject Selected task for panel need to be shown
  */
 export let discardAssignmentChanges = function( context, selectedObject ) {
     context.enableModifyButton = false;
     assignmentSvc.registerAssignmentPanelContext( context, selectedObject );
 };

 /**
  * This method will be called when user modify some assignment from panel but did not click on
  * modify button then one pop up message comes up and based on choice on that message if user wants
  * to save the changes then it will updated the table for previous selection and update panel for new tak.
  * @param {Obejct} data Data view model object
  * @param {Object} panelContext Panel context object
  * @param {Object} selectedTask Selected task object for panel is curretnly visible
  * @param {Obejct} ctx Context obejct
  * @param {Object} newSelectedTaskObject Newly selected task from tree table
  */
 export let updateAssignmentTable = function( data, panelContext, selectedTask, ctx, newSelectedTaskObject ) {
     assignmentSvc.updateTaskAssignments( data, panelContext, selectedTask, ctx.taskAssignmentCtx );
     ctx.taskAssignmentCtx.enableModifyButton = false;
     var selectedObjects = ctx.taskAssignmentCtx.treeDataProvider.selectedObjects;
     if( selectedObjects && selectedObjects[0] && selectedObjects[0].uid ) {
         ctx.taskAssignmentCtx.preSelectTaskUid = selectedObjects[0].uid;
     }

     assignmentSvc.registerAssignmentPanelContext( ctx.taskAssignmentCtx, newSelectedTaskObject );
     eventBus.publish( 'taskTreeTable.plTable.reload' );
 };

 /**
  * This code will be used when user do drag and drop on panel.
  *
  * @param {Array} selectedObjects Selected objects from UI
  * @param {Object} context Data provider object where objects need to be added
  */

 var _addUserOnDropInternal = function( selectedObjects, context ) {
     _addContextObject = context;
     // In case of participant data providers, it will have context as object that contains
     // data provider so this change is needed for this.
     if( context.dataProvider ) {
         _addContextObject = context.dataProvider;
     }
     // Check if add context is null or selected objects are null then
     // no need to add anything and return from here
     if( !_addContextObject || !selectedObjects ) {
         return;
     }

     // Check if user is trying to add assignee/assigner then get the user
     // from group member object and update data provider.
     if( _addContextObject.name === 'assignerDataProvider' ) {
         _populateAssigneeDataProvider( _addContextObject, selectedObjects[ 0 ] );
         parentData.isTemplateAssignmentInProgress = true;
         appCtxSvc.ctx.taskAssignmentCtx.enableModifyButton = true;
     } else {
         var dpDataProvider = null;
         // Check if user is trying to add DP assignment then get the DP data provider
         // pass it to valid method to that it can validate for duplication
         if( _panelContext && _panelContext.selectionBasedParticipants ) {
             var participantContext = _.find( _panelContext.selectionBasedParticipants, {
                 internalName: _addContextObject.name
             } );
             if( participantContext && participantContext.dataProvider && participantContext.dataProvider.json
                 && participantContext.dataProvider.json.selectionModelMode === 'multiple' ) {
                 dpDataProvider = participantContext.dataProvider;
             }
         }

         // Get valid object list based on objects already presnets on respective data provider
         // and if valid objects are not null then only add to respective data provider.
         var validObjects = _validObjectsToAdd( selectedObjects, dpDataProvider );

         if( validObjects && validObjects.length > 0 ) {
             // This is mainly needed if profile is selected then we need to show content based on profile
             // else we need to add to normal reviewer.
             if( appCtxSvc.ctx && appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.hasOwnProperty( 'profileObject' ) ) {
                 _addContextObject.vmo = appCtxSvc.ctx.workflow.profileObject;
             }
             // This is profile user add case
             if( _addContextObject.vmo && _addContextObject.vmo.props && _addContextObject.name === 'reviewersDataProvider' ) {
                 _populateProfileAndAdhocReviewers( parentData, [ _addContextObject.vmo ], validObjects, true, true );
             } else if( _addContextObject.name === 'reviewersDataProvider' ) {
                 _populateProfileAndAdhocReviewers( parentData, parentData.reviewProfiles, validObjects, false, true );
             }else {
                 var isMergeContent = true;
                 if( _addContextObject.json && _addContextObject.json.selectionModelMode === 'single' ) {
                     isMergeContent = false;
                     // If user is drag and drop multiple objects and selection mode is signle then we
                     // will use the first object from where user started dragging.
                     var object = validObjects[ 0 ];
                     validObjects = [ object ];
                 }
                 _populateOtherDataProvider( _addContextObject, validObjects, isMergeContent );
             }
             if( parentData ) {
                 parentData.isTemplateAssignmentInProgress = true;
             }
             appCtxSvc.ctx.taskAssignmentCtx.enableModifyButton = true;
         }
     }
     eventBus.publish( 'workflow.clearUserPanelSelection' );
     // Clear the infomation that present for paste specific cases after one action completed.
     // Set the selected on panel context to empty and boolean to false as well
     if( appCtxSvc.ctx.taskAssignmentCtx && appCtxSvc.ctx.taskAssignmentCtx.panelContext ) {
         appCtxSvc.ctx.taskAssignmentCtx.panelContext.isPasteCommandVisible = false;
         appCtxSvc.ctx.taskAssignmentCtx.panelContext.selectedObjects = [];
     }
 };

 /**
  * This code will be used when user do drag and drop on panel.
  *
  * @param {Array} selectedObjects Selected objects from UI
  * @param {Object} dataProvider Data provider object where objects need to be added
  */
 export let addUsersOnPanel = function( selectedObjects, dataProvider ) {
     _addContextObject = dataProvider;
     // Check if add context is null or selected objects are null then
     // no need to add anything and return from here
     if( !_addContextObject || !selectedObjects ) {
         return;
     }

     // Call this method to get the correct group member based on current context criteria group or role from user if user obejct is
     // being dispalyed on user picker panel then use that to get correct group member and add it to table

     workflowAssinmentUtilSvc.getValidObjectsToAdd(  appCtxSvc.ctx.workflow, selectedObjects ).then( function( validObjects ) {
         let finalValidObjects;
         finalValidObjects = validObjects;
         _addUserOnDropInternal( finalValidObjects, dataProvider );
     } );
     appCtxSvc.registerCtx( 'assignmentsChanged', true );
 };

 /**
  * Reset the panel modifcation and modify button visbility when user
  * close the panel or want to discard the cahnges
  */
 export let resetPanelModification = function() {
     if( appCtxSvc.ctx && appCtxSvc.ctx.taskAssignmentCtx ) {
         appCtxSvc.ctx.taskAssignmentCtx.enableModifyButton = false;
         appCtxSvc.unRegisterCtx( 'assignmentsChanged' );
     }
 };

 /**
  * Check the selection and if selection is of type signoff then only check if signoff can be removed or not and
  * based on that return true or false.
  *
  * @param {Array} selections the current selection objects
  *
  * @returns {boolean} True/False
  */
 export let evaluateSelections = function( selections ) {
     var isValidSelection = false;

     if( selections && selections.length > 0 ) {
         for( var idx = 0; idx < selections.length; idx++ ) {
             // Check if assignment obejct on selection is null or undefiend or if exist then it should not be required and can be removed
             if(  selections[ idx ].assignmentObject  === undefined  || selections[ idx ].assignmentObject  === null
                 ||  selections[ idx ].assignmentObject && !selections[ idx ].assignmentObject.isRequired
                 &&  selections[ idx ].assignmentObject.isRemoveAllowed !== 'false'  ) {
                 isValidSelection = true;
                 break;
             }
         }
     }

     return isValidSelection;
 };

 /**
  * Evaluate if selected obejcts from panel contians profile then add that info on context obejct so that
  * user picker panel can be updated based on that information
  * @param {Object} selections Selected objects from panel
  *
  */
 export let evaluateProfileSelections = function( selections ) {
     var isRefreshUserPanel = false;
     var profileObject = null;
     appCtxSvc.ctx.workflow.participantType = '';
     if( selections && selections.length > 0 ) {
         profileObject = _.find( selections, function( selection ) {
             return selection.type === 'EPMSignoffProfile';
         } );
         if( profileObject ) {
             isRefreshUserPanel = true;
         } else {
             // Check for profiles based on participant types
             _.find( selections, function( selection ) {
                 if( selection.type === 'KeyRole' ) {
                     appCtxSvc.ctx.workflow.participantType = selection.uid;
                     isRefreshUserPanel = true;
                 }
             } );
         }
     }
     if( appCtxSvc.ctx && appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.additionalSearchCriteria && appCtxSvc.ctx.workflow.additionalSearchCriteria.searchSubGroup ) {
         isRefreshUserPanel = true;
     }
     if( isRefreshUserPanel ) {
         var additionalSearchCriteria = _populateAdditonalSearchCriteria( profileObject );
         if( additionalSearchCriteria ) {
             var context = {
                 additionalSearchCriteria : additionalSearchCriteria,
                 profileObject : profileObject
             };
             if( appCtxSvc.ctx && appCtxSvc.ctx.workflow ) {
                 appCtxSvc.ctx.workflow.additionalSearchCriteria = additionalSearchCriteria;
                 appCtxSvc.ctx.workflow.profileObject = profileObject;
             } else {
                 // Set the value on app context serivce and activate the command panel
                 appCtxSvc.registerCtx( 'workflow', context );
             }
         }
         eventBus.publish( 'workflow.revealUserPickerPanel' );
     }
 };

 /**
  * Based on selected objects and see if paste command is visible or not.
  * @param {Object} context Panel context object where we need to update paste command is visible or not
  * @param {Array} selectedObjects Selected objects array
  */
 export let updatePasteCommandContext = function( context, selectedObjects ) {
     if( !selectedObjects || selectedObjects.length <= 0 ) {
         context.isPasteCommandVisible = false;
         context.selectedObjects = [];
         return;
     }
     context.selectedObjects = selectedObjects;
     context.isPasteCommandVisible = true;
 };

 /**
  * This factory creates a service and returns exports
  *
  * @member Awp0WorkflowAssignmentPanelService
  */

 export default exports = {
     openUserPanel,
     removeUsersTaskAssignment,
     addSelectedUsers,
     initializeParentData,
     initializePanelContextData,
     initializeAddCommandContext,
     populatePanelData,
     populateTaskAssignmentPanelData,
     createParticipantDataProviderObjects,
     updateTaskAssignmentData,
     openReplaceTaskAssignmentPanel,
     discardAssignmentChanges,
     updateAssignmentTable,
     addUsersOnPanel,
     resetPanelModification,
     evaluateSelections,
     evaluateProfileSelections,
     updatePasteCommandContext
 };
 app.factory( 'Awp0WorkflowAssignmentPanelService', () => exports );
