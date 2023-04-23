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
 * This implements the workflow template assignment related methods.
 *
 * @module js/Awp0WorkflowTemplateAssignmentPanelService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';
import viewModelObjectSvc from 'js/viewModelObjectService';
import clientDataModel from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import iconSvc from 'js/iconService';
import _ from 'lodash';

var exports = {};

var parentData = null;
var assignmentPropPolicy = null;
var _addContextObject = null;

/**
 * Return the proeprty value for input property name if value is not null and it will have some
 * valid value then only return the property value else return null.
 * @param {Object} handlerContextObject Handler context object that will contain handler information
 * @param {String} propName Property name whose value need to be check.
 *
 * @returns {Object} Property value object
 */
var _getPropValue = function( handlerContextObject, propName ) {
    var propValue = null;
    if( handlerContextObject && handlerContextObject.props[ propName ] && handlerContextObject.props[ propName ].dbValue &&
        handlerContextObject.props[ propName ].dbValue.length > 0 ) {
        propValue = handlerContextObject.props[ propName ].dbValue;
    }
    return propValue;
};

/**
 * Check if input object is not null and if type of Group Member then get the user
 * from group member and add into data provider else directly add to data provider.
 *
 * @param {Object} data Data view model object
 * @param {Object} dataProvider data provider where object need to be added
 * @param {Object} handlerContextObject Selected handler context object that will contian all recipient options
 */
var _populateExistingDataProvider = function( data, dataProvider, handlerContextObject ) {
    var handlerReviewers = [];
    var handlerName = null;
    // Check if panel is editable then only create the place holder object
    if( data.isPanelEditable ) {
        var placeHolderObject = {
            internalName: 'placeHolderObject',
            displayName: '',
            typeIconURL: 'PersonGray48'
        };
        // Create a place holder object that will be shown on top of list if template is in edit mode
        var placeHolderObjects = Awp0WorkflowDesignerUtils.createKeyRoleObjects( [ placeHolderObject ], false, data.i18n.any );
        if( placeHolderObjects && placeHolderObjects[ 0 ] ) {
            placeHolderObjects[ 0 ].isPlaceHolder = true;
            placeHolderObjects[ 0 ].dataProviderContext = dataProvider.name;
            handlerReviewers.push( placeHolderObjects[ 0 ] );
        }
    }
    // Check if handlerContextObject is not null that means user has selected some handler from table
    // and user is trying to bring up the information panel then populate those recipients on panel
    if( handlerContextObject ) {
        if( dataProvider.name === 'assignerDataProvider' ) {
            handlerReviewers = [];
        }
        handlerName = handlerContextObject.handlerName;
        var keyRoleObjects = Awp0WorkflowDesignerUtils.createKeyRoleObjects( handlerContextObject.assigneeObjects, false, data.i18n.any );
        Array.prototype.push.apply( handlerReviewers, keyRoleObjects );
    }
    // Iterate for all recipients and then if it's not place holder and panel
    // is in edit mode then set the canRemove to true so user can modify the recipients
    _.forEach( handlerReviewers, function( reviewer ) {
        if( !reviewer.isPlaceHolder ) {
            reviewer.canRemove = data.isPanelEditable;
            reviewer.handlerName = handlerName;
            reviewer.dataProviderContext = dataProvider.name;
        }
    } );
    // Update the data provider with recipients
    dataProvider.update( handlerReviewers, handlerReviewers.length );
    data.isPanelPopulated = true;
};

/**
 * Populate the panel otpions based on handler selection. If handler is selected then only process further
 * to show the values based on selected handler
 * @param {Object} data Data view model object
 * @param {Object} handlerContextObject Selected handler context object that will contian all recipient options
 * @param {boolean} isEditable True or false based on panel is editable or not.
 */
var _populateHandlerOptions = function( data, handlerContextObject ) {
    // If not valid then no need to process further
    if( !data || !handlerContextObject || !handlerContextObject.handlerObject ) {
        return;
    }

    var defaultAllowReassignValue = true;
    var allowReassignValue = handlerContextObject.props.allowReassignOutsideGroupRole.dbValue;
    if( allowReassignValue === 'no' ) {
        defaultAllowReassignValue = false;
    }
    data.reassignOutsideGroupRoleOptionValue.dbValue = defaultAllowReassignValue;
    data.reassignOutsideGroupRoleOptionValue.isEditable = false;
    data.reassignOutsideGroupRoleOptionValue.isEnabled = false;

    // Populate the team assignemnt option value on show info panel when handler is selected
    if( data.teamAssignmentOptionValue && handlerContextObject.isResourcePoolAssignee ) {
        data.teamAssignmentOptionValue.dbValue = false;
        data.teamAssignmentOptionValue.isEditable = false;
        data.teamAssignmentOptionValue.isEnabled = false;
    }

    var reviewersSignoffMust = handlerContextObject.props.isReviewersSignoffMust.dbValue;

    if( reviewersSignoffMust === 'no' ) {
        data.reviewersSignoffMust.dbValue = false;
    } else if ( reviewersSignoffMust === 'yes' ) {
        data.reviewersSignoffMust.dbValue = true;
    }
};

/**
 * Check if input object is of type input type. If yes then
 * return true else return false.
 *
 * @param {Obejct} obj Object to be match
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
 * Populate the panel with all relevant information that need to be shown.
 * @param {Object} data Data view model object
 * @param {Object} ctx Context object
 */
export let populateAssignmentPanelData = function( data, ctx ) {
    parentData = data;
    exports.registerProps( data.assignmentPolicy );
    // Get the tempalte is in edit mode or not and based on that populate the panel.
    var isPanelEditable = Awp0WorkflowDesignerUtils.isTemplateEditMode( ctx.xrtSummaryContextObject, ctx );
    data.isPanelEditable = isPanelEditable;

    // Check if workflowTabContext is not null then populate the handler options and recipients
    if( ctx.workflowTabContext ) {
        // If handlerContextObject is null that means we are in add handler case then show all data providers based on selection
        if( !ctx.workflowTabContext.handlerContextObject ) {
            _populateExistingDataProvider( data, data.dataProviders.assignerDataProvider, ctx.workflowTabContext.handlerContextObject );
            _populateExistingDataProvider( data, data.dataProviders.reviewersDataProvider, ctx.workflowTabContext.handlerContextObject );
            _populateExistingDataProvider( data, data.dataProviders.acknowledgersDataProvider, ctx.workflowTabContext.handlerContextObject );
            _populateExistingDataProvider( data, data.dataProviders.notifyeesDataProvider, ctx.workflowTabContext.handlerContextObject );
        } else {
            // Check if handlerContextObject is not null that means we have selected one handler whose information need to be shown
            // Check if fnd0Assignee or fnd0Assigner is not null then populate assignerDataProvider data provider
            if( _getPropValue( ctx.workflowTabContext.handlerContextObject, 'fnd0Assignee' ) ||
                _getPropValue( ctx.workflowTabContext.handlerContextObject, 'fnd0Assigner' ) ) {
                _addContextObject = data.dataProviders.assignerDataProvider;
                _populateExistingDataProvider( data, data.dataProviders.assignerDataProvider, ctx.workflowTabContext.handlerContextObject );
            }

            // Check if awp0Reviewers is not null then populate reviewersDataProvider data provider
            if( _getPropValue( ctx.workflowTabContext.handlerContextObject, 'awp0Reviewers' ) ) {
                _addContextObject = data.dataProviders.reviewersDataProvider;
                _populateExistingDataProvider( data, data.dataProviders.reviewersDataProvider, ctx.workflowTabContext.handlerContextObject );
                _populateHandlerOptions( data, ctx.workflowTabContext.handlerContextObject );
            }

            // Check if awp0Acknowledgers is not null then populate acknowledgersDataProvider data provider
            if( _getPropValue( ctx.workflowTabContext.handlerContextObject, 'awp0Acknowledgers' ) ) {
                _addContextObject = data.dataProviders.acknowledgersDataProvider;
                _populateExistingDataProvider( data, data.dataProviders.acknowledgersDataProvider, ctx.workflowTabContext.handlerContextObject );
                _populateHandlerOptions( data, ctx.workflowTabContext.handlerContextObject );
            }

            // Check if awp0Notifyees is not null then populate notifyeesDataProvider data provider
            if( _getPropValue( ctx.workflowTabContext.handlerContextObject, 'awp0Notifyees' ) ) {
                _addContextObject = data.dataProviders.notifyeesDataProvider;
                _populateExistingDataProvider( data, data.dataProviders.notifyeesDataProvider, ctx.workflowTabContext.handlerContextObject );
            }
        }
    }
};

/**
 * Open the user panel based on selected handler from UI.
 *
 * @param {Object} context object where user is clicking
 * @param {Object} handlerContextObject Handler context object. It will have value in show handler information case.
 * @param {Object} selTemplate Selected template object from UI
 */
export let openAssignmentUserPanel = function( context, handlerContextObject, selTemplate ) {
    if( !context || !context.dataProviderContext || !parentData ) {
        return;
    }
    // Get the valid data provider whene user wants to add the object and if that is null or invalid then
    // return from here
    _addContextObject = parentData.dataProviders[ context.dataProviderContext ];
    if( !_addContextObject || !_addContextObject.name ) {
        return;
    }
    parentData.handlerName = 'EPM-adhoc-signoffs';
    var allowMultipleParticipantAssignee = '';
    if( _addContextObject.name === 'assignerDataProvider' ) {
        parentData.handlerName = 'EPM-auto-assign';
        allowMultipleParticipantAssignee = 'false';
    }
    var handlerArguments = {};
    var selectionMode = 'multiple';

    var handlerConfObject = null;
    parentData.handlerConfObject = null;

    // Get the handler name based on selected option from UI
    if( parentData && parentData.handlerConfiguration ) {
        var selectedHandlerName = parentData.handlerName;
        handlerConfObject = _.find( parentData.handlerConfiguration, function( handlerConf ) {
            return handlerConf.handlerName === selectedHandlerName;
        } );
    }
    // Check if handler configuration object is null then no need to process further and return from here
    if( !handlerConfObject ) {
        return;
    }
    parentData.handlerConfObject = handlerConfObject;
    selectionMode = handlerConfObject.selectionMode;
    // Get the Key role arguments for specific handler
    handlerArguments = {
        projectMembers: handlerConfObject.projectMembers,
        workflowMembers: handlerConfObject.workflowMembers
    };
    var isAssignmentQuestionNeeded = false;
    // Check if user is trying to add reviewers then we need to ask question to user or acknowledgers on
    // acknowledge task then also we need to ask the question
    if( ( _addContextObject.name === 'reviewersDataProvider' || isOfType( selTemplate, 'EPMAcknowledgeTaskTemplate' ) ) && !handlerContextObject ) {
        isAssignmentQuestionNeeded = true;
    }

    var workflowContext = {
        selectionModelMode: selectionMode,
        loadProjectData: false,
        isAssignmentQuestionNeeded: isAssignmentQuestionNeeded,
        keyRoleHandlerArguments: handlerArguments,
        ParticipantAllowMultipleAssignee: allowMultipleParticipantAssignee
    };

    // In case of open show only the relevant tab.
    if( handlerContextObject && handlerContextObject.handlerName !== 'EPM-auto-assign' ) {
        if( handlerContextObject.isResourcePoolAssignee ) {
            workflowContext.showOnlyResourcePoolTab = true;
        } else {
            workflowContext.hideResourcePoolTab = true;
        }
    }

    // This should be empty always when user is going to user tab, group and role
    // LOV should be enabled always
    parentData.additionalSearchCriteria = {};
    appCtxService.registerCtx( 'workflow', workflowContext );
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
    if( isOfType( selection, 'GroupMember' ) ) {
        // Get the user object from group member
        var userObject = viewModelObjectSvc.createViewModelObject( selection.props.user.dbValues[ 0 ] );
        if( userObject ) {
            userObject.selected = false;
            userObject.assigneeGroupMember = selection;
            userObject.canRemove = true;
            userObject.handlerName = 'EPM-auto-assign';
            // Set the context on data provider that will be used when user trying to remove it from data provider
            if( userObject.dataProviderContext === undefined ) {
                userObject.dataProviderContext = dataProvider.name;
            }
            assignerUsers.push( userObject );
        }
    } else {
        // If selection is not null then only set selected to false and add to data provider
        if( selection ) {
            selection.selected = false;
            selection.canRemove = true;
            selection.handlerName = 'EPM-auto-assign';
            // Set the context on data provider that will be used when user trying to remove it from data provider
            if( selection.dataProviderContext === undefined ) {
                selection.dataProviderContext = dataProvider.name;
            }
            assignerUsers.push( selection );
        }
    }
    dataProvider.update( assignerUsers, assignerUsers.length );
};

/**
 * Get the resource pool content that need to be rendered on UI while adding new handler.
 * This will check if profile needs to be rendered on UI or multiple resource pools needs
 * to be rendered and based on that return the render objects.
 * @param {Object} data Data view model object
 * @param {Object} dataProvider data provider where object need to be added
 * @param {Array} selectedObjects Object that need to be added
 *
 * @returns {Array} Valid selected objects
 */
var _getResourcePoolsContentToAdd = function( data, dataProvider, selectedObjects ) {
    var teamAssignmentOption = data.teamAssignmentOption.dbValue;
    var reassignOutsideValue = data.reassignOutsideGroupRoleOption.dbValue;
    if( teamAssignmentOption ) {
        reassignOutsideValue = false;
    }
    var profileObjects = [];
    // Get the number of reviewers value and based on that add multiple resourcepool that much time on UI
    var numberOfReviewers = data.numberOfReviewers.dbValue;
    if( numberOfReviewers >= 1 && !reassignOutsideValue ) {
        var presetObjects = dataProvider.viewModelCollection.loadedVMObjects;

        // Check if profile is already exist then based on that update the count to required number of reviewers else create
        // new profile obejct to render on UI and add to the dislay array.
        _.forEach( selectedObjects, function( selectedObject ) {
            var existingProfileObject = _.find( presetObjects, function( presentObject ) {
                return presentObject.uid === selectedObject.uid && presentObject.type === 'EPMSignoffProfile';
            } );
            if( existingProfileObject && existingProfileObject.requiredReviewersCount ) {
                existingProfileObject.requiredReviewersCount += numberOfReviewers;
                existingProfileObject.requiredReviewers = existingProfileObject.requiredReviewersCount.toString() + ' ' + data.i18n.required;
            } else {
                existingProfileObject = viewModelObjectSvc.createViewModelObject( selectedObject.uid );
                existingProfileObject.type = 'EPMSignoffProfile';
                existingProfileObject.typeIconURL = iconSvc.getTypeIconURL( 'PersonGray48' );
                existingProfileObject.requiredReviewersCount = numberOfReviewers;
                existingProfileObject.requiredReviewers = numberOfReviewers.toString() + ' ' + data.i18n.required;
                existingProfileObject.groupRoleName = selectedObject.groupName + '/' + selectedObject.roleName;
                existingProfileObject.isProfileCreation = true;
                existingProfileObject.handlerName = null;
                profileObjects.push( existingProfileObject );
            }
        } );
    }

    _.forEach( selectedObjects, function( selectedObject ) {
        var handlerName = 'EPM-adhoc-signoffs';
        if( !reassignOutsideValue ) {
            handlerName = 'EPM-fill-in-reviewers';
        }
        selectedObject.handlerName = handlerName;
    } );

    // Check if profile case is false and user has added number of reviewers as multiple then we need to
    // show that resource pool that many times.
    if( numberOfReviewers >= 1 && reassignOutsideValue ) {
        var resourcepoolObjects = [];
        _.forEach( selectedObjects, function( selectedObject ) {
            for( var idx = 0; idx < numberOfReviewers; idx++ ) {
                var resourcepoolObj = viewModelObjectSvc.createViewModelObject( selectedObject.uid );
                resourcepoolObj.handlerName = 'EPM-adhoc-signoffs';
                resourcepoolObj.isProfileCreation = false;
                resourcepoolObjects.push( resourcepoolObj );
            }
        } );
        selectedObjects = resourcepoolObjects;
    } else {
        if( teamAssignmentOption ) {
            selectedObjects = profileObjects;
        } else {
            var tempSelectedObjects = selectedObjects;
            Array.prototype.push.apply( profileObjects, tempSelectedObjects );
            selectedObjects = profileObjects;
        }
    }
    return selectedObjects;
};

/**
 * This method check if both input objects are resource pool object then only it will return
 * true else it will return false.
 * @param {Object} objectA First input object
 * @param {Object} objectB Second input object
 * @returns {boolean} True/False
 */
var _isDuplicateResourcePoolObjects = function( objectA, objectB ) {
    if( isOfType( objectA, 'ResourcePool' ) && isOfType( objectB, 'ResourcePool' ) ) {
        return true;
    }
    return false;
};

/**
 * Check if input object is not null and if type of Group Member then get the user
 * from group member and add into data provider else directly add to data provider.
 * @param {Object} data Data view model object
 * @param {Object} dataProvider data provider where object need to be added
 * @param {Array} selectedObjects Object that need to be added
 * @param {boolean} mergeData To provide support that we want to add to existing
 *                  elements on data or replace
 * @param {boolean} isAssignmentQuestionNeeded Is user is trying to add reviewers or not.
 * @param {Object} handlerContextObject Handler context object that will be used to show handler info case
 */
var _populateOtherDataProvider = function( data, dataProvider, selectedObjects, mergeData, isAssignmentQuestionNeeded, handlerContextObject ) {
    var handlerName = 'EPM-adhoc-signoffs';
    var isProfileCreation = false;
    // Based on if assignemnt question need to ask and selected tab is Awp0WorkflowResourcePoolTab then get the
    // selected options value from UI and based on that decided which handler need to be created
    if( isAssignmentQuestionNeeded ) {
        if( data.selectedTab && data.selectedTab.panelId === 'Awp0WorkflowResourcePoolTab' ) {
            selectedObjects = _getResourcePoolsContentToAdd( data, dataProvider, selectedObjects );
        } else {
            var reassignValue = data.reassignOutsideGroupRoleOption.dbValue;
            if( !reassignValue ) {
                handlerName = 'EPM-fill-in-reviewers';
                isProfileCreation = true;
            }
        }
    } else if( handlerContextObject ) {
        // If user is trying to show handler information and handlerName is EPM-fill-in-reviewers then we need to
        // add new users as profile users.
        handlerName = handlerContextObject.handlerName;
        if( handlerName === 'EPM-fill-in-reviewers' ) {
            isProfileCreation = true;
        }
    }

    var assignerUsers = [];
    _.forEach( selectedObjects, function( selectedObject ) {
        if( isOfType( selectedObject, 'GroupMember' ) ) {
            var userObject = viewModelObjectSvc.createViewModelObject( selectedObject.props.user.dbValues[ 0 ] );
            if( userObject ) {
                userObject.selected = false;
                assignerUsers.push( userObject );
                userObject.canRemove = true;
                if( userObject.handlerName === undefined ) {
                    userObject.handlerName = handlerName;
                }

                if( userObject.isProfileCreation === undefined ) {
                    userObject.isProfileCreation = isProfileCreation;
                }
                userObject.groupMemberObject = selectedObject;
                // Set the context on data provider that will be used when user trying to remove it from data provider
                if( userObject.dataProviderContext === undefined ) {
                    userObject.dataProviderContext = dataProvider.name;
                }
            }
        } else {
            if( selectedObject ) {
                selectedObject.selected = false;
                selectedObject.canRemove = true;
                if( selectedObject.handlerName === undefined ) {
                    selectedObject.handlerName = handlerName;
                }

                if( selectedObject.isProfileCreation === undefined ) {
                    selectedObject.isProfileCreation = isProfileCreation;
                }
                // Set the context on data provider that will be used when user trying to remove it from data provider
                if( selectedObject.dataProviderContext === undefined ) {
                    selectedObject.dataProviderContext = dataProvider.name;
                }
                assignerUsers.push( selectedObject );
            }
        }
    } );

    // Check if merge daya is true then get already present element in data provider
    // and add it to new model objects and update data provider
    if( mergeData ) {
        var presetObjects = dataProvider.viewModelCollection.loadedVMObjects;
        Array.prototype.push.apply( presetObjects, assignerUsers );

        // Remove the duplicates if present in presetObjects list. If duplicate resource pool
        // present then it should not filter it out.
        assignerUsers = _.uniqWith( presetObjects, function( objA, objB ) {
            return objA.uid === objB.uid && !_isDuplicateResourcePoolObjects( objA, objB );
        } );
    }
    dataProvider.update( assignerUsers, assignerUsers.length );
};

/**
 * Check if any reviewers present in data provider or not for which
 * EPM-adhoc-signoffs/EPM-fill-in-reviewers handler will be created.
 */
var _isSignoffHandlerCreation = function() {
    var presetObjects = parentData.dataProviders.reviewersDataProvider.viewModelCollection.loadedVMObjects;
    var handlerObject = _.find( presetObjects, function( selectedAssigneeObj ) {
        return selectedAssigneeObj.handlerName === 'EPM-adhoc-signoffs' || selectedAssigneeObj.handlerName === 'EPM-fill-in-reviewers';
    } );

    if( handlerObject ) {
        return true;
    }
    presetObjects = parentData.dataProviders.acknowledgersDataProvider.viewModelCollection.loadedVMObjects;
    handlerObject = _.find( presetObjects, function( selectedAssigneeObj ) {
        return selectedAssigneeObj.handlerName === 'EPM-adhoc-signoffs' || selectedAssigneeObj.handlerName === 'EPM-fill-in-reviewers';
    } );
    if( handlerObject ) {
        return true;
    }

    return false;
};

/**
 * Add the selected objects on main panel from user picker panel.
 * @param {Object} data Data view model object
 * @param {boolean} isAssignmentQuestionNeeded Is user is trying to add reviewers or not.
 * @param {Object} handlerContextObject Handler context object that will be used to show handler info case
 */
export let addSelectedAssignmentUsers = function( data, isAssignmentQuestionNeeded, handlerContextObject ) {
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
    } else {
        _populateOtherDataProvider( parentData, _addContextObject, selectedObjects, true, isAssignmentQuestionNeeded, handlerContextObject );
        data.showReviewersSignoffMust = _isSignoffHandlerCreation();
    }

    _addContextObject.isModified = true;
    parentData.isValidToModify = true;
};

/**
 * Remove the assignee and add the place holder for assignee to be added.
 * @param {Object} _addContextObject Add context object from where user need to be removed.
 * @param {Object} selectedObject Object that need to be removed
 */
var _removeAssigneeObject = function( _addContextObject, selectedObject ) {
    var modelObjects = _addContextObject.viewModelCollection.loadedVMObjects;
    var validObjects = _.difference( modelObjects, [ selectedObject ] );
    // Check if valid objects are more than 1 then only we need to enable isValidToModify to true
    // so that add button will be enabled. One recipient is must
    if( validObjects && validObjects.length > 1 ) {
        parentData.isValidToModify = true;
    }
    _addContextObject.isModified = true;
    _populateExistingDataProvider( parentData, _addContextObject, null );
};

/**
 * Remove the object that need to be removed.
 * @param {Object} selectedObject Object that need to be removed
 */
export let removeAssignemntKeyRoleArguments = function( selectedObject ) {
    parentData.isValidToModify = false;
    if( !selectedObject || !selectedObject.dataProviderContext || !parentData ) {
        return;
    }
    // Get the valid data provider whene user wants to add the object and if that is null or invalid then
    // return from here
    _addContextObject = parentData.dataProviders[ selectedObject.dataProviderContext ];
    if( !_addContextObject || !_addContextObject.name ) {
        return;
    }

    if( _addContextObject.name === 'assignerDataProvider' ) {
        _removeAssigneeObject( _addContextObject, selectedObject );
    } else {
        var modelObjects = _addContextObject.viewModelCollection.loadedVMObjects;
        var validObjects = _.difference( modelObjects, [ selectedObject ] );
        // Check if valid objects are more than 1 then only we need to enable isValidToModify to true
        // so that add button will be enabled. One recipient is must
        if( validObjects && validObjects.length > 1 ) {
            parentData.isValidToModify = true;
        }
        _addContextObject.isModified = true;
        _addContextObject.update( validObjects, validObjects.length );
        parentData.showReviewersSignoffMust = _isSignoffHandlerCreation();
    }
};

/**
 * Register properties that needed for assignment panel
 * @param {Object} policy Policy that need to be register
 */
export let registerProps = function( policy ) {
    if( assignmentPropPolicy !== null ) {
        return;
    }
    assignmentPropPolicy = policySvc.register( policy );
};

/**
 * Unregister properties taht were being used for opening the assignment panel
 */
export let unregisterPanelProp = function() {
    if( assignmentPropPolicy !== null ) {
        policySvc.unregister( assignmentPropPolicy );
        assignmentPropPolicy = null;
    }
};



/**
 * Check if profile need to be created or updated so match all based on input group and role value
 * and add it to respecitve either in update profile case or create profile case.
 * @param {Array} currentProfiles All present profiles on task template
 * @param {Object} groupObject Group object which need to be checked.
 * @param {Object} roleObject Role object which need to be checked.
 * @param {int} requiredReviewersCount Profile reviewers count
 * @param {Array} createdProfiles Created profiles array where obejct will be added based on cheking if not present
 * @param {Array} updatedProfiles Updated profiles array where obejct will be added based on cheking if present that needs
 *                Updation.
 */
var _checkUpdateProfileObjects = function( currentProfiles, groupObject, roleObject, requiredReviewersCount, createdProfiles, updatedProfiles ) {
    // Check if based on input group and role profile already exist or not. If exist then
    // then update the number_of_signoffs count
    var matchingProfile = _.find( currentProfiles, function( profile ) {
        return profile.groupObject === groupObject && profile.roleObject === roleObject;
    } );
    if( matchingProfile ) {
        if( requiredReviewersCount ) {
            matchingProfile.number_of_signoffs += requiredReviewersCount;
        } else {
            matchingProfile.number_of_signoffs += 1;
        }
        updatedProfiles.push( matchingProfile );
    } else {
        // Check if based on input group and role profile already exist in create profle list. If exist then
        // then update the number_of_signoffs count
        var matchingProfileCreate = _.find( createdProfiles, function( profile ) {
            return profile.groupObject === groupObject && profile.roleObject === roleObject;
        } );

        // Check if match found then update the count by 1.
        if( matchingProfileCreate ) {
            if( requiredReviewersCount ) {
                matchingProfileCreate.number_of_signoffs += requiredReviewersCount;
            } else {
                matchingProfileCreate.number_of_signoffs += 1;
            }
            // matchingProfileCreate.number_of_signoffs += 1;
        } else {
            var number_of_signoffs = 1;
            if( requiredReviewersCount ) {
                number_of_signoffs = requiredReviewersCount;
            }
            var object = {
                groupObject: groupObject,
                roleObject: roleObject,
                number_of_signoffs: number_of_signoffs
            };
            createdProfiles.push( object );
        }
    }
};

/**
 * Check if profile needs to be created or updated then it will return true else it will return false.
 *
 * @param {Object} dataProvider Data provider object
 *
 * @returns {boolean} True/False value
 */
var _isCreateOrUpdateProfileCase = function( dataProvider ) {
    var isCreateOrUpdateCase = false;
    var modelObjects = dataProvider.viewModelCollection.loadedVMObjects;
    if( !modelObjects || modelObjects.length <= 0 ) {
        return isCreateOrUpdateCase;
    }
    for( var idx = 0; idx < modelObjects.length; idx++ ) {
        if( modelObjects[ idx ] && modelObjects[ idx ].isProfileCreation ) {
            isCreateOrUpdateCase = true;
            break;
        }
    }
    return isCreateOrUpdateCase;
};

/**
 * Create the update profile input structure and set it on data object.
 * @param {Object} data Data view model object
 * @param {Array} updatedProfiles Profiles that need to be updated
 */
var _updateProfileInputData = function( data, updatedProfiles ) {
    var porfileInput = [];
    _.forEach( updatedProfiles, function( profile ) {
        var propVector = [];
        var reviewer = {
            name: 'number_of_signoffs',
            values: [ profile.number_of_signoffs.toString() ]
        };
        propVector.push( reviewer );
        var profileObject = {
            object: profile.profileObject,
            timestamp: '',
            vecNameVal: propVector
        };
        porfileInput.push( profileObject );
    } );
    data.updateProfileInputData = porfileInput;
};

/**
 * Create the create profile input structure and set it on data object.
 * @param {Object} data Data view model object
 * @param {Object} selected Selected tempalte where profile will be attached
 * @param {Array} createdProfiles Profiles that need to be created
 */
var _createProfileInputData = function( data, selected, createdProfiles ) {
    var input = [];
    // Get the EPMSelectSignoffTaskTemplate from selected template where profile will be added.
    var templateUid = Awp0WorkflowDesignerUtils.getValidTemplateObjectUid( selected, 'EPMSelectSignoffTaskTemplate' );
    var updateAdditionalData = {};
    var groupUidArray = [];
    var roleUidsArray = [];
    var numberOfSignoffs = [];
    var allowSubGroupMembers = [];
    var template_profile_quorum = [];

    // Iterate for all input profile and create the valid input structure
    // and add to input data.
    _.forEach( createdProfiles, function( profile ) {
        var groupUid = '*';
        var roleUid = '*';

        // Check if group object is not null then use the group uid else use empty string
        if( profile.groupObject ) {
            groupUid = profile.groupObject.uid;
        }
        // Check if role object is not null then use the role uid else use empty string
        if( profile.roleObject ) {
            roleUid = profile.roleObject.uid;
        }
        groupUidArray.push( groupUid );
        roleUidsArray.push( roleUid );
        numberOfSignoffs.push( profile.number_of_signoffs.toString() );
        allowSubGroupMembers.push( 'true' );
        template_profile_quorum.push( '-1' );
    } );
    updateAdditionalData.template_profile_quorum = template_profile_quorum;
    updateAdditionalData.template_profile_groups = groupUidArray;
    updateAdditionalData.template_profile_roles = roleUidsArray;
    updateAdditionalData.template_profiles_num_reviewers = numberOfSignoffs;
    updateAdditionalData.template_profiles_allow_sub_groups = allowSubGroupMembers;
    var createObject = {
        clientID: 'createProfile -' + templateUid,
        templateToUpdate: templateUid,
        additionalData: updateAdditionalData
    };
    input.push( createObject );
    if( input && input.length > 0 ) {
        data.createProfileInputData = input;
    }
};

/**
 * Check if based on UI option profile needs to be create or updated. If yes then match based on
 * exisitng profiles and accourdingly create profile input strucutre or save input structure.
 * @param {Object} data Data view model object
 * @param {Object} dataProvider Data provider objects that will contain all recipients values
 * @param {Object} selected Selected template object from UI
 * @param {Object} existingProfiles Existing profile objects array
 */
var _populateCreateOrUpdateProfile = function( data, dataProvider, selected, existingProfiles ) {
    if( !_isCreateOrUpdateProfileCase( dataProvider ) ) {
        return;
    }
    data.updateProfiles = [];
    data.createdProfiles = [];
    data.currentProfiles = [];
    var currentProfiles = [];
    var createdProfiles = [];
    var updatedProfiles = [];

    // Iterate for all existing profiles and build the structure that will be used to match
    // when profile already exist and user is trying to update the profile.
    _.forEach( existingProfiles, function( profile ) {
        var groupObject = clientDataModel.getObject( profile.props.group.dbValue );
        var roleObject = clientDataModel.getObject( profile.props.role.dbValue );
        var number_of_signoffs = profile.props.number_of_signoffs.dbValue;
        var object = {
            groupObject: groupObject,
            roleObject: roleObject,
            number_of_signoffs: number_of_signoffs,
            profileObject: profile
        };
        currentProfiles.push( object );
    } );

    var loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
    _.forEach( loadedObjects, function( loadedObject ) {
        if( ( isOfType( loadedObject, 'GroupMember' ) || isOfType( loadedObject, 'ResourcePool' ) || isOfType( loadedObject, 'User' ) || loadedObject.type === 'EPMSignoffProfile' ) &&
            loadedObject.isProfileCreation ) {
            var validObject = loadedObject;
            if( validObject.groupMemberObject ) {
                validObject = validObject.groupMemberObject;
            }
            var groupObject = null;
            var roleObject = null;
            // Get the valid group and role based on object and check if profile needs to be update
            // or create and based on that add to respective array
            if( validObject && validObject.props.group && validObject.props.group.dbValue ) {
                groupObject = clientDataModel.getObject( validObject.props.group.dbValue );
            }
            if( validObject && validObject.props.role && validObject.props.role.dbValue ) {
                roleObject = clientDataModel.getObject( validObject.props.role.dbValue );
            }
            _checkUpdateProfileObjects( currentProfiles, groupObject, roleObject, loadedObject.requiredReviewersCount, createdProfiles, updatedProfiles );
        }
    } );
    // Check if update profile array is not null then set the update profile input structure on app context
    if( updatedProfiles && updatedProfiles.length > 0 ) {
        data.updateProfileObjects = updatedProfiles;
        _updateProfileInputData( data, updatedProfiles );
        data.isUpdateProfileCase = true;
        appCtxService.registerCtx( 'updateProfileInputData', data.updateProfileInputData );
    }
    // Check if create profile array is not null then set the create profile input structure on app context
    if( createdProfiles && createdProfiles.length > 0 ) {
        data.createProfileObjects = createdProfiles;
        _createProfileInputData( data, selected, createdProfiles );
        data.isCreateProfileCase = true;
        appCtxService.registerCtx( 'createProfileInputData', data.createProfileInputData );
    }
};

/**
 * Merge the assignee with final assignee values and check in case of user is trying to modify user arguments then add
 * all resource pool arguments and in other case all all user arguments and return the final arguemtn array.
 *
 * @param {Object} handlerContextObject If user selected any handler form notification table then contian that
 *                 handler object else null
 * @param {Object} assigneeValue Assignee value that is updated from UI.
 *
 * @returns {Object} Final assignee argument value.
 */
var _mergeAssigneeArgument = function( data, handlerContextObject, assigneeValue ) {
    if( !handlerContextObject || !handlerContextObject.props.arguments || !handlerContextObject.props.arguments.dbValues ) {
        return assigneeValue;
    }
    var finalAssigneeValue = assigneeValue;
    var argumentValues = Awp0WorkflowDesignerUtils.parseHandlerArguments( handlerContextObject.props.arguments.dbValues );
    var assigeeArray = null;
    var allAssigee = [];
    if( argumentValues && argumentValues[ '-assignee' ] ) {
        var handlerAssigneeValue = argumentValues[ '-assignee' ];
        // This replace is needed if there is any specific argument like person with ',' in between
        // arguemnt value so to handle that replace it with '\|'.
        handlerAssigneeValue = handlerAssigneeValue.replace( '\\,', '\\|' );
        if( data.preferences.EPM_ARG_target_user_group_list_separator && data.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && data.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '') {
            assigneeValue = assigneeValue.replace( /,/g, data.preferences.EPM_ARG_target_user_group_list_separator[0] );
            assigeeArray = handlerAssigneeValue.split( data.preferences.EPM_ARG_target_user_group_list_separator[0] );
        }else{
            assigeeArray = handlerAssigneeValue.split( ',' );
        }
        _.forEach( assigeeArray, function( assignee ) {
            // Replace it back to original value
            var finalValue = assignee.replace( '\\|', '\\,' );
            allAssigee.push( finalValue );
        } );
    }

    if( allAssigee && allAssigee.length > 0 ) {
        _.forEach( allAssigee, function( assignee ) {
            if( handlerContextObject.isResourcePoolAssignee && ( assignee.indexOf( 'resourcepool:' ) === -1 && assignee.indexOf( 'allmembers:' ) === -1 ) ) {
                finalAssigneeValue = finalAssigneeValue + ',' + assignee;
            } else if( !handlerContextObject.isResourcePoolAssignee && ( assignee.indexOf( 'resourcepool:' ) > -1 || assignee.indexOf( 'allmembers:' ) > -1 ) ) {
                finalAssigneeValue = finalAssigneeValue + ',' + assignee;
            }
        } );
    }
    return finalAssigneeValue;
};

/**
 * Iterate for all objects present in input data provider then create the all valid assignee for
 * each specific handler.
 * @param {Object} dataProvider Data provider object where objects are present
 *
 * @returns {Object} handlerData Handler data for each ahndler corresponds to assignee values
 */
var _getHandlerDataToCreate = function( dataProvider ) {
    var loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
    var handlerData = new Object();
    _.forEach( loadedObjects, function( loadedObject ) {
        var validAssigneevalue = null;
        if( isOfType( loadedObject, 'User' ) ) {
            validAssigneevalue = 'user:' + loadedObject.props.user_id.dbValue;
        } else if( isOfType( loadedObject, 'GroupMember' ) ) {
            var userObject = viewModelObjectSvc.createViewModelObject( loadedObject.props.user.dbValues[ 0 ] );
            if( userObject && userObject.props.user_id && userObject.props.user_id.dbValue ) {
                validAssigneevalue = 'user:' + userObject.props.user_id.dbValue;
            }
        } else if( isOfType( loadedObject, 'ResourcePool' ) ) {
            // For resource pool object we need to add group and role name with prefix 'resourcepool:'
            var groupObject = Awp0WorkflowDesignerUtils.getGroupObject( loadedObject, '*' );
            var roleObject = Awp0WorkflowDesignerUtils.getRoleObject( loadedObject, '*' );
            if( groupObject && roleObject && groupObject.groupInternalName && roleObject.roleInternalName ) {
                validAssigneevalue = 'resourcepool:' + groupObject.groupInternalName + '::' + roleObject.roleInternalName;
            }

        } else if( loadedObject.type === 'KeyRole' && !loadedObject.isPlaceHolder ) {
            // For key role directly use the key role dbvalue
            var keyRoleValue = loadedObject.props.keyRole.dbValue;
            if( loadedObject !== '' ) {
                validAssigneevalue = keyRoleValue;
            }
        }
        var handlerName = loadedObject.handlerName;
        if( handlerName && validAssigneevalue ) {
            if( handlerData[ handlerName ] ) {
                var presentAssignees = handlerData[ handlerName ];
                Array.prototype.push.apply( presentAssignees, [ validAssigneevalue ] );
                handlerData[ handlerName ] = presentAssignees;
            } else {
                handlerData[ handlerName ] = [ validAssigneevalue ];
            }
        }
    } );
    return handlerData;
};

/**
 * Add the create or update handler data to SOA input structure.
 * @param {Object} input Input object where handler SOA create or update handler will be added.
 * @param {Object} dataProvider Data provider objects that will contain all assignee values
 * @param {Object} taskTemplate Selected template object from UI
 * @param {Object} handlerContextObject If user selected any handler form assignment table then contian that
 *                 handler object else null
 * @param {boolean} autoCompleteOption True/ false based on user action for auto complete the adhoc signoff handlers
 *  @param {boolean} isCreateCase True/ false based on user action for create or update handler
 */
var _populateCreateOrUpdateHandlerInput = function( data, input, dataProvider, taskTemplate, handlerContextObject, autoCompleteOption, isCreateCase ) {
    // Get the differnt arguemnts that we need to set on handler based on handler name
    var handlerData = _getHandlerDataToCreate( dataProvider );
    if( !handlerData ) {
        return;
    }
    _.forOwn( handlerData, function( assigneeArray, handlerName ) {
        var assigneeValue = '';
        if( assigneeArray && assigneeArray.length > 0 ) {
            assigneeValue = assigneeArray.join();
        }
        if( data.preferences.EPM_ARG_target_user_group_list_separator && data.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && data.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '') {
            assigneeValue = assigneeValue.replace( /,/g, data.preferences.EPM_ARG_target_user_group_list_separator[0] );
        }

        var additionalDataMap = {};
        additionalDataMap[ '-assignee' ] = [ assigneeValue ];

        var isReviewersSignoffMust = data.reviewersSignoffMust.dbValue;

        if( handlerContextObject && !isCreateCase ) {
            // In case of update handler case, get all assignee arguemtn values liek resource pool values
            // and user values and then combine it with final argument and that will be pass to server
            assigneeValue = _mergeAssigneeArgument( data, handlerContextObject, assigneeValue );
            additionalDataMap[ '-assignee' ] = [ assigneeValue ];
            // Update the addiitonal data if handler has some other arguemtns defiend. This is needed
            // as server replace the all arguemnts from handler based on passed arguments.
            Awp0WorkflowDesignerUtils.updateAdditionalDataWithOtherArguments( handlerContextObject, additionalDataMap );

            //In case of update handler, if 'All reviewers must signoff' is set to false
            //remove the '-required' argument from handler if present.
            //ELSE IF, 'All reviewers must signoff' is set to true then add '-required' argument to the handler.
            if( !isReviewersSignoffMust && additionalDataMap.hasOwnProperty( '-required' ) ) {
                delete additionalDataMap['-required' ];
            } else if( isReviewersSignoffMust && !additionalDataMap.hasOwnProperty( '-required' ) ) {
                additionalDataMap[ '-required' ] = [];
            }

            var updateObject = {
                clientID: 'updateHandler -' + handlerContextObject.uid,
                handlerToUpdate: handlerContextObject.uid,
                additionalData: additionalDataMap
            };


            input.push( updateObject );
        } else {
            // Check if handler name is adhoc signoffs and auto complete option is true then only add it
            // to the additionalDataMap to set the auto complete option.
            if( autoCompleteOption !== null && handlerName === 'EPM-adhoc-signoffs' && !autoCompleteOption ) {
                additionalDataMap[ '-auto_complete' ] = [];
            }

            //In case of create handler, if 'All reviewers must signoff' is set to true
            //add '-required' argument for 'EPM-adhoc-signoffs' handler.
            if( isReviewersSignoffMust ) {
                additionalDataMap[ '-required' ] = [];
            }

            var createObject = {
                clientID: 'createHandler -' + taskTemplate.uid + handlerName,
                handlerName: handlerName,
                taskTemplate: taskTemplate.uid,
                handlerType: 'Action',
                action: 2,
                additionalData: additionalDataMap
            };
            input.push( createObject );
        }
    } );
};

/**
 * Check if assignee data provider is modified then only create the EPM-auto-assign handler create or update
 * structure.
 * @param {Object} dataProvider Data provider objects that will contain all assignee values
 * @param {Object} selected Selected template object from UI
 * @param {Object} input Input object where handler SOA create or update handler will be added. *
 * @param {Object} handlerContextObject If user selected any handler form assignment table then contian that
 *                 handler object else null
 *  @param {boolean} isCreateCase True/ false based on user action for create or update handler
 */
var _populateAssignerCreateOrUpdateHandlerInput = function( data, dataProvider, selected, input, handlerContextObject, isCreateCase ) {
    if( !dataProvider.isModified ) {
        return;
    }

    // In case of handler context is null that means we are in auto assign handler create case.
    // So for task template if auto assign handler is already exist then don't create new handler and
    // just update the existing handler itself.
    if( !handlerContextObject ) {
        // Get the attached handler objects for specifc input handler name
        var actionHandlerArray = Awp0WorkflowDesignerUtils.getActionHandler( selected, 'EPM-auto-assign' );
        if( actionHandlerArray && actionHandlerArray.length > 0 && actionHandlerArray[ 0 ] ) {
            handlerContextObject = actionHandlerArray[ 0 ];
        }
    }
    _populateCreateOrUpdateHandlerInput( data, input, dataProvider, selected, handlerContextObject, null, isCreateCase );
};

/**
 * Check if reviewers data provider is modified then only create the valid signoff handler create or update
 * structure. It will check for profile create or update as well and accordingly set the data on context.
 * @param {Object} data Data view model object
 * @param {Object} dataProvider Data provider objects that will contain all assignee values
 * @param {Object} selected Selected template object from UI
 * @param {Object} input Input object where handler SOA create or update handler will be added. *
 * @param {Object} handlerContextObject If user selected any handler form assignment table then contian that
 *                 handler object else null
 * @param {Array} existingProfiles Existing signoff profiles array for selected template if exist
 * @param {boolean} autoCompleteOption True/ false based on user action for auto complete the adhoc signoff handlers
 * @param {boolean} isCreateCase True/ false based on user action for create or update handler
 */
var _populateReviewCreateOrUpdateHandlerInput = function( data, dataProvider, selected, input, handlerContextObject, existingProfiles, autoCompleteOption, isCreateCase ) {
    if( !dataProvider.isModified && !data.reviewersSignoffMust.valueUpdated ) {
        return;
    }
    _populateCreateOrUpdateProfile( data, dataProvider, selected, existingProfiles );
    var validTemplateObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( selected, 'EPMSelectSignoffTaskTemplate' );
    if( isOfType( selected, 'EPMRouteTaskTemplate' ) ) {
        var reviewTaskObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( selected, 'EPMReviewTaskTemplate' );
        if( reviewTaskObject ) {
            validTemplateObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( reviewTaskObject, 'EPMSelectSignoffTaskTemplate' );
        }
    }
    if( validTemplateObject ) {
        _populateCreateOrUpdateHandlerInput( data, input, dataProvider, validTemplateObject, handlerContextObject, autoCompleteOption, isCreateCase );
    }
};

/**
 * Check if acknowledgersDataProvider data provider is modified then only create the both signoffs handler create or update
 * structure.
 * @param {Object} data Data view model object
 * @param {Object} dataProvider Data provider objects that will contain all assignee values
 * @param {Object} selected Selected template object from UI
 * @param {Object} input Input object where handler SOA create or update handler will be added. *
 * @param {Object} handlerContextObject If user selected any handler form assignment table then contian that
 *                 handler object else null
 * @param {Array} existingProfiles Existing signoff profiles array for selected template if exist
 * @param {boolean} autoCompleteOption True/ false based on user action for auto complete the adhoc signoff handlers
 * @param {boolean} isCreateCase True/ false based on user action for create or update handler
 */
var _populateAcknowledgeCreateOrUpdateHandlerInput = function( data, dataProvider, selected, input, handlerContextObject, existingProfiles, autoCompleteOption, isCreateCase ) {
    if( !dataProvider.isModified ) {
        return;
    }
    _populateCreateOrUpdateProfile( data, dataProvider, selected, existingProfiles );
    // Get the SST for acknowledge task and if selected template is EPMRouteTaskTemplate then get the acknowldge SST
    var validTemplateObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( selected, 'EPMSelectSignoffTaskTemplate' );
    if( isOfType( selected, 'EPMRouteTaskTemplate' ) ) {
        var acknowledgeTaskObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( selected, 'EPMAcknowledgeTaskTemplate' );
        if( acknowledgeTaskObject ) {
            validTemplateObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( acknowledgeTaskObject, 'EPMSelectSignoffTaskTemplate' );
        }
        autoCompleteOption = null;
    }
    if( validTemplateObject ) {
        _populateCreateOrUpdateHandlerInput( data, input, dataProvider, validTemplateObject, handlerContextObject, autoCompleteOption, isCreateCase );
    }
};

/**
 * Check if notifyeesDataProvider data provider is modified then only create the EPM-adhoc-signoffs handler create or update
 * structure.
 * @param {Object} dataProvider Data provider objects that will contain all assignee values
 * @param {Object} selected Selected template object from UI
 * @param {Object} input Input object where handler SOA create or update handler will be added. *
 * @param {Object} handlerContextObject If user selected any handler form assignment table then contian that
 *                 handler object else null
 * @param {boolean} autoCompleteOption True/ false based on user action for auto complete the adhoc signoff handlers
 * @param {boolean} isCreateCase True/ false based on user action for create or update handler
 */
var _populateNotifyeesCreateOrUpdateHandlerInput = function( data, dataProvider, selected, input, handlerContextObject, autoCompleteOption, isCreateCase ) {
    if( !dataProvider.isModified ) {
        return;
    }
    // Get the notify task template from route task and do further processing
    var validTemplateObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( selected, 'EPMNotifyTaskTemplate' );
    if( validTemplateObject ) {
        _populateCreateOrUpdateHandlerInput( data, input, dataProvider, validTemplateObject, handlerContextObject, autoCompleteOption, isCreateCase );
    }
};

/**
 * Create the create or update handler input based on user action and return the input structure.
 *
 * @param {Object} data Data view model object
 * @param {Object} selected Selected template object from UI
 * @param {Object} selectedHandlerContext If user selected any handler form notification table then contian that
 *                 handler object else null
 * @param {Array} existingProfiles Existing signoff profiles array for selected template if exist
 * @param {boolean} autoCompleteOption True/ false based on user action for auto complete the adhoc signoff handlers
 * @param {boolean} isCreateCase True/ false based on user action for create or update handler
 *
 * @returns {Array} Create or update handler SOA input structure array
 */
export let getCreateOrUpdateHandlerInput = function( data, selected, selectedHandlerContext, existingProfiles, autoCompleteOption, isCreateCase ) {
    var input = [];
    _populateAssignerCreateOrUpdateHandlerInput( data, data.dataProviders.assignerDataProvider, selected, input, selectedHandlerContext, isCreateCase );
    _populateReviewCreateOrUpdateHandlerInput( data, data.dataProviders.reviewersDataProvider, selected, input, selectedHandlerContext, existingProfiles, autoCompleteOption, isCreateCase );
    _populateAcknowledgeCreateOrUpdateHandlerInput( data, data.dataProviders.acknowledgersDataProvider, selected, input, selectedHandlerContext, existingProfiles, autoCompleteOption, isCreateCase );
    _populateNotifyeesCreateOrUpdateHandlerInput( data, data.dataProviders.notifyeesDataProvider, selected, input, selectedHandlerContext, null, isCreateCase );
    return input;
};

export default exports = {
    populateAssignmentPanelData,
    openAssignmentUserPanel,
    addSelectedAssignmentUsers,
    removeAssignemntKeyRoleArguments,
    registerProps,
    unregisterPanelProp,
    getCreateOrUpdateHandlerInput
};
/**
 * Define assignment panel service
 *
 * @memberof NgServices
 * @member Awp0WorkflowTemplateAssignmentPanelService
 */
app.factory( 'Awp0WorkflowTemplateAssignmentPanelService', () => exports );
