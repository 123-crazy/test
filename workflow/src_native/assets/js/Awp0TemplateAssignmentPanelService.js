// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0TemplateAssignmentPanelService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import awp0TasksUtils from 'js/Awp0TasksUtils';
import viewModelService from 'js/viewModelObjectService';
import msgSvc from 'js/messagingService';
import palMgmtSvc from 'js/Awp0PalMgmtService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _addContextObject = null;

var parentData = null;

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
    if( obj && obj.modelType.typeHierarchyArray.indexOf( type ) > -1 ) {
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
    if( isOfType( selection, 'GroupMember' ) && selection.uid ) {
        if( selection.props.user && selection.props.user.dbValues && selection.props.user.dbValues[ 0 ] ) {
            // Get the user object from group member
            var userObject = viewModelService.createViewModelObject( selection.props.user.dbValues[ 0 ] );
            if( userObject ) {
                userObject.selected = false;
                userObject.assigneeGroupMember = selection;
                assignerUsers.push( userObject );
            }
        }
    } else {
        // If selection is not null then only set selected to false and add to data provider
        if( selection && selection.uid ) {
            selection.selected = false;
            assignerUsers.push( selection );
        }
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
    if( !modelObjects || modelObjects.length < 0 ) {
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
 */
var _isDuplicateResourcePoolObjects = function( objectA, objectB ) {
    if( isOfType( objectA, 'ResourcePool' ) && isOfType( objectB, 'ResourcePool' ) ) {
        return true;
    }
    return false;
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
            // If modelObject is not null then only set selected to false and add to data provider
            if( modelObject && modelObject.uid ) {
                modelObject.selected = false;
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
        Array.prototype.push.apply( presetObjects, modelObjects );

        // Remove the duplicates if present in presetObjects list. If duplicate resource pool
        // present then it should not filter it out.
        reviewers = _.uniqWith( presetObjects, function( objA, objB ) {
            return objA.uid === objB.uid && !_isDuplicateResourcePoolObjects( objA, objB );
        } );
    }

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
    var profileIdx = _.findKey( profileObjects, {
        uid: profileUid
    } );

    if( profileIdx < 0 ) {
        return;
    }

    var profileVMO = profileObjects[ profileIdx ];
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
        var profileObject = reviewer.profile;

        // This flag will only be true when user is trying to add profile users from panel
        if( isAddUsersProfileCase ) {
            profileObject = addProfileObject;
        }

        // Check if profile object is not null then only update the profile required reviewers count
        if( profileObject ) {
            profileObject = _updateProfileRequiredReviewers( profileObject.uid, profileObjects );
            reviewer.profile = profileObject;
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
 * Populate the assignment panel data based on selected object
 *
 * @param {Object} data Data view model object
 * @param {Object} selected Selected template obejct from assignment tree
 * @param {Object} ctx App context object
 */
export let populateAssignmentPanelData = function( data, selected, ctx ) {
    var palDataMap = ctx.workflowPalData.palDataMap;
    parentData = data;
    data.name.uiValue = ctx.workflowPalData.selTemplate.displayName;
    parentData.isTemplateAssignmentInProgress = false;
    parentData.selTemplate = ctx.workflowPalData.selTemplate;

    if( !palDataMap[ selected.uid ] ) {
        // Get the updated pal structure map with default info as template
        // info not present on pal
        palDataMap = palMgmtSvc.updatePalWithDefaultInfo( palDataMap, selected );
    }

    var palData = palDataMap[ selected.uid ];

    if( isOfType( selected, 'EPMReviewTaskTemplate' ) || isOfType( selected, 'EPMAcknowledgeTaskTemplate' ) || isOfType( selected, 'EPMRouteTaskTemplate' ) ) {
        if( palData.fnd0Assigner ) {
            _populateAssigneeDataProvider( data.dataProviders.assignerDataProvider, palData.fnd0Assigner[ 0 ] );
        }
        // In case of review, acknowledge or route, set the correct quorum value we got from server and update the
        // pal data structure on client and that will be pass to server while saving the PAL.
        if( data.taskTemplateQuorumValue ) {
            var quorumPropName = 'rev_quorum';
            var quorumValue = _.parseInt( data.taskTemplateQuorumValue );
            if( isOfType( selected, 'EPMAcknowledgeTaskTemplate' ) ) {
                quorumPropName = 'ack_quorum';
            }
            palData[ quorumPropName ] = quorumValue;
        }
    } else {
        if( palData.fnd0Assignee ) {
            _populateAssigneeDataProvider( data.dataProviders.assignerDataProvider, palData.fnd0Assignee[ 0 ] );
        }
    }

    // Populate reviewers and additional reviewers on assignment panel
    var profileObjects = [];

    if( data.reviewProfiles && data.reviewProfiles.length > 0 ) {
        profileObjects = awp0TasksUtils.getProfiles( data.reviewProfiles, data );
    }

    var reviewersList = palData.awp0Reviewers;
    var acknowledgersList = palData.awp0Acknowledgers;

    // If selected task template is EPMAcknowledgeTaskTemplate then we show
    // acknoledgers in reviewers and additional reviewers sections and while saving
    // it will save in acknowledgers section
    if( isOfType( selected, 'EPMAcknowledgeTaskTemplate' ) ) {
        reviewersList = palData.awp0Acknowledgers;
        acknowledgersList = [];
    }

    // Populate the reviwers and additional reviewers data provider
    _populateProfileAndAdhocReviewers( data, profileObjects, reviewersList );

    // Populate the acknowledgers to acknowledge data provider
    _populateOtherDataProvider( data.dataProviders.acknowledgersDataProvider, acknowledgersList );

    // Populate the notifyees to notify data provider
    _populateOtherDataProvider( data.dataProviders.notifyeesDataProvider, palData.awp0Notifyees );
};

/**
 * Check if input command context object is profile then only
 * profile objects should be shown on user pciker panel else all users will be shown.
 *
 * @param {Object} cmdContext Command context object
 */
export let openUserPanel = function( cmdContext ) {
    var additionalSearchCriteria = null;
    var selectionMode = 'single';
    var profileObject = null;
    if( cmdContext.vmo && cmdContext.vmo.props && cmdContext.vmo.additionalSearchCriteria ) {
        additionalSearchCriteria = _.clone( cmdContext.vmo.additionalSearchCriteria );
        selectionMode = 'multiple';
        profileObject = cmdContext.vmo;
    } else {
        selectionMode = cmdContext.selectionModel.mode;
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
        profileObject: profileObject
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

        var profileObject = object.profile;
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
export let removeUsersTemplateAssignment = function( dataProvider, selectedObjects ) {
    parentData.isTemplateAssignmentInProgress = true;
    var modelObjects = dataProvider.viewModelCollection.loadedVMObjects;
    var validObjects = [];
    if( dataProvider.name === 'reviewersDataProvider' ) {
        validObjects = _removeReviewers( modelObjects, selectedObjects );
    } else {
        validObjects = _.difference( modelObjects, selectedObjects );
    }
    dataProvider.update( validObjects, validObjects.length );
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
 * @returns {Array} addedObjects array that contains all group memebrs objects present.
 */
var _populateAlreadyAddedGroupMemberObjects = function() {
    var addedObjects = [];
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
 * @returns {Array} validObjects array that need to be added
 */
var _validObjectsToAdd = function( selectedObjects ) {
    var alreadyAddedObjects = _populateAlreadyAddedGroupMemberObjects();
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
        var message = awp0TasksUtils.getDuplicateErrorMessage( objectsAlreadyAdded, parentData );
        msgSvc.showError( message );
    }
    return validObjects;
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
    } else {
        // Get valid object list based on objects already presnets on respective data provider
        // and if valid objects are not null then only add to respective data provider.
        var validObjects = _validObjectsToAdd( selectedObjects );

        if( validObjects && validObjects.length > 0 ) {
            // This is profile user add case
            if( _addContextObject.vmo && _addContextObject.vmo.props ) {
                _populateProfileAndAdhocReviewers( parentData, [ _addContextObject.vmo ], validObjects, true, true );
            } else {
                _populateOtherDataProvider( _addContextObject, validObjects, true );
            }
            parentData.isTemplateAssignmentInProgress = true;
        }
    }
};

/**
 * Update the pal data map with updated information based on changes done from UI and pubslidh the
 * event to update on assignment tree.
 *
 * @param {Object} data Data view model object
 * @param {Object} palDataMap Pal data map object that need to be updated
 * @param {Object} selTemplate Selected template obejct from UI whose info need to be updated
 * @param {Boolean} publsihInternalEvent Boolean to define that internal event need to be publish or not.
 *                  This will have value only when panel is modified and user change the selection in tree.
 */
export let updateTemplatePalData = function( data, palDataMap, selTemplate, publsihInternalEvent ) {
    // Get the updated pal structure map
    palDataMap = palMgmtSvc.updatePalStructure( data, palDataMap, selTemplate );

    var workflowPalDataCtx = appCtxSvc.getCtx( 'workflowPalData' );
    workflowPalDataCtx.palDataMap = palDataMap;
    workflowPalDataCtx.isTemplateAssignmentInProgress = true;
    appCtxSvc.updateCtx( 'workflowPalData', workflowPalDataCtx );
    // Check if input publsihInternalEvent is not undefiend then only call
    // internal event. Thsi will happen when suer has made modification in panel
    // and then chaning the selection in row should publsih the message.
    if( !_.isUndefined( publsihInternalEvent ) ) {
        eventBus.publish( 'Awp0TemplateAssignment.updatePreviousTreeDataRow', {
            selTemplate: [ data.selTemplate ]
        } );
        return;
    }
    eventBus.publish( 'Awp0TemplateAssignment.updateTreeData' );
};

/**
 * Handle panel modification to save the assignment or cancel the assignment
 * for previosu selection.
 * @param {Object} data Data view model object
 * @param {Object} ctx App context object
 * @param {Boolean} isSaveAction Boolean to define that save action to be done or cancel action.
 */
export let handlePanelModification = function( data, ctx, isSaveAction ) {
    // Check if input isSaveAction is not undefiend then that means it's save action
    // so save the assignment for previous selection
    if( !_.isUndefined( isSaveAction ) ) {
        exports.updateTemplatePalData( data, ctx.workflowPalData.palDataMap, data.selTemplate, true );
    }

    // Check if panel context is not null and it's users then navigate to
    // original task assignment panel for new selection
    if( ctx.panelContext && ctx.panelContext.destPanelId === 'Users' ) {
        eventBus.publish( 'navigateToAssignmentSubPanelInternal' );
        return;
    }
    eventBus.publish( 'updatePanelInternal' );
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
 * Initialize parent data. This is needed mainly for karma testing
 *
 * @param {data} data The view model data
 */
export let initializeParentData = function( data ) {
    parentData = data;
};

export default exports = {
    populateAssignmentPanelData,
    openUserPanel,
    removeUsersTemplateAssignment,
    addSelectedUsers,
    updateTemplatePalData,
    handlePanelModification,
    initializeAddCommandContext,
    initializeParentData
};
app.factory( 'Awp0TemplateAssignmentPanelService', () => exports );
