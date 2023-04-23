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
 * This implements the workflow template notifications related methods.
 *
 * @module js/Awp0WorkflowTemplateNotificationPanelService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _ from 'lodash';

var exports = {};

var parentData = null;

/**
 * Check if input object is not null and if type of Group Member then get the user
 * from group member and add into data provider else directly add to data provider.
 *
 * @param {Object} data Data view model object
 * @param {Object} dataProvider data provider where object need to be added
 * @param {Object} handlerContextObject Selected handler context object that will contian all recipient options
 */
var _populateExistingDataProvider = function( data, dataProvider, handlerContextObject ) {
    var handlerRecipients = [];
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
            handlerRecipients.push( placeHolderObjects[ 0 ] );
        }
    }
    // Check if handlerContextObject i snot null that means user has selected some handler from table
    // and user is trying to bring up the information panel then populate those recipients on panel
    if( handlerContextObject ) {
        var keyRoleObjects = Awp0WorkflowDesignerUtils.createKeyRoleObjects( handlerContextObject.keyRoleRecipients, false, data.i18n.any );
        Array.prototype.push.apply( handlerRecipients, keyRoleObjects );
        var otherObjects = Awp0WorkflowDesignerUtils.createKeyRoleObjects( handlerContextObject.otherRecipients, false, data.i18n.any );
        Array.prototype.push.apply( handlerRecipients, otherObjects );
    }
    // Iterate for all recipients and then if it's not place holder and panel
    // is in edit mode then set the canRemove to true so user can modify the recipients
    _.forEach( handlerRecipients, function( recipient ) {
        if( !recipient.isPlaceHolder ) {
            recipient.canRemove = data.isPanelEditable;
        }
    } );
    // Update the data provider with recipients
    dataProvider.update( handlerRecipients, handlerRecipients.length );
    data.isPanelPopulated = true;
};

/**
 * Check if selected template is review, route, acknowledge , PS task or not and based on that return true or false
 * @param {Object} selectedObject Selected template object from graph
 *
 * @returns {boolean} True/false
 */
var _isReviewAckRouteOrPSTaskTemplateSelected = function( selectedObject ) {
    var isReviewAckRouteTaskSelected = false;
    // Check if input is not null and is one of these types then only return true
    if( selectedObject && selectedObject.modelType && ( selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMReviewTaskTemplate' ) > -1 || selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMAcknowledgeTaskTemplate' ) > -1 ||
            selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMRouteTaskTemplate' ) > -1 || selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMPerformSignoffTaskTemplate' ) > -1 ) ) {
        isReviewAckRouteTaskSelected = true;
    }
    return isReviewAckRouteTaskSelected;
};

/**
 * Populate the panel otpions based on handler selection. If handler is selected then only process further
 * to show the values based on selected handler
 * @param {Object} data Data view model object
 * @param {Object} handlerContextObject Selected handler context object that will contian all recipient options
 * @param {boolean} isEditable True or false based on panel is editable or not.
 */
var _populateHandlerOptions = function( data, handlerContextObject, isEditable ) {
    // If not valid then no need to process further
    if( !data || !handlerContextObject || !handlerContextObject.handlerObject ) {
        return;
    }

    // Check if selected template is isReviewACKRoutePSTaskSelected then use the review notify when
    // UI value else use task notify when value
    var notifyWhenUIProp = data.taskNotifyWhenList;
    if( data.isReviewACKRoutePSTaskSelected ) {
        notifyWhenUIProp = data.reviewNotifyWhenList;
    }

    // Set the notify when option value based on select handler object and set the edit state
    if( handlerContextObject.props.notifyWhen && handlerContextObject.props.notifyWhen.dbValue &&
        handlerContextObject.props.notifyWhen.uiValue ) {
        notifyWhenUIProp.dbValue = handlerContextObject.props.notifyWhen.dbValue;
        notifyWhenUIProp.uiValue = handlerContextObject.props.notifyWhen.uiValue;
        data.selectedNotifyWhenOption = handlerContextObject.props.notifyWhen.dbValue;
    }

    notifyWhenUIProp.isEditable = isEditable;
    data.notifySubject.isEditable = isEditable;
    data.notifyMessage.isEditable = isEditable;
    data.handlerName = handlerContextObject.handlerName;

    // Get all handler arguemnts from handler object and based on values update the UI.
    var argumentValues = Awp0WorkflowDesignerUtils.parseHandlerArguments( handlerContextObject.handlerObject.props.arguments.dbValues );

    if( argumentValues ) {
        // Check if comment arguemnt present then set the message value
        if( argumentValues[ '-comment' ] ) {
            data.notifyMessage.dbValue = argumentValues[ '-comment' ];
            data.notifyMessage.uiValue = argumentValues[ '-comment' ];
        }
        // Check if subject arguemnt present then set the subject value
        if( argumentValues[ '-subject' ] ) {
            data.notifySubject.dbValue = argumentValues[ '-subject' ];
            data.notifySubject.uiValue = argumentValues[ '-subject' ];
        }
        // If attachmetn option present then based on present values on UI set the values
        if( argumentValues[ '-attachment' ] ) {
            var attachmentValue = argumentValues[ '-attachment' ];
            if( attachmentValue.indexOf( 'process' ) > -1 ) {
                data.processInfo.dbValue = true;
            }
            if( attachmentValue.indexOf( 'target' ) > -1 ) {
                data.targetInfo.dbValue = true;
            }
            if( attachmentValue.indexOf( 'reference' ) > -1 ) {
                data.referenceInfo.dbValue = true;
            }
        }
    }
};

/**
 * Populate the panel with all relevant information that need to be shown.
 * @param {Object} data Data view model object
 * @param {Object} ctx Context object
 */
export let populatePanelData = function( data, ctx ) {
    parentData = data;
    // Get the tempalte is in edit mode or not and based on that populate the panel.
    var isPanelEditable = Awp0WorkflowDesignerUtils.isTemplateEditMode( ctx.xrtSummaryContextObject, ctx );
    data.isPanelEditable = isPanelEditable;
    // Check the selected task is Review, Acknowledge, Route or PS task then only set this variable on data
    if( _isReviewAckRouteOrPSTaskTemplateSelected( ctx.selected ) ) {
        data.isReviewACKRoutePSTaskSelected = true;
    }

    // Check if workflowTabContext is not null then populate the handler options and recipients
    if( ctx.workflowTabContext ) {
        _populateHandlerOptions( data, ctx.workflowTabContext.handlerContextObject, data.isPanelEditable );
        _populateExistingDataProvider( data, data.dataProviders.recipientsDataProvider, ctx.workflowTabContext.handlerContextObject );
    }
};

/**
 * Remove the input object from recipient list
 * @param {Object} selectedObject Selected object that need to be removed from recipient list
 */
export let removeKeyRoleArguments = function( selectedObject ) {
    parentData.isValidToModify = false;
    var modelObjects = parentData.dataProviders.recipientsDataProvider.viewModelCollection.loadedVMObjects;
    var validObjects = _.difference( modelObjects, [ selectedObject ] );
    // Check if valid objects are more than 1 then only we need to enable isValidToModify to true
    // so that add button will be enabled. One recipient is must
    if( validObjects && validObjects.length > 1 ) {
        parentData.isValidToModify = true;
    }
    parentData.dataProviders.recipientsDataProvider.update( validObjects, validObjects.length );
};

/**
 * Open the user panel based on selected handler from UI
 */
export let openUserPanel = function() {
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

    var context = {
        selectionModelMode: selectionMode,
        loadProjectData: false,
        keyRoleHandlerArguments: handlerArguments
    };

    // Check if handler name is late notification then we don't need to show resource pool tab
    // so set the value on context and this will be used while enabling the resource pool tab
    if( parentData.handlerName === 'EPM-late-notification' ) {
        context.hideResourcePoolTab = true;
    }
    // This should be empty always when user is going to user tab, group and role
    // LOV should be enabled always
    parentData.additionalSearchCriteria = {};
    appCtxService.registerCtx( 'workflow', context );
};

/**
 * Update the handler name based on selected notify when option value.
 *
 * @param {Object} data Data view model object
 * @param {boolean} isReviewTaskTemplate Slected template is review, route, ack or PS task or not
 */
export let notifyWhenOptionChange = function( data, isReviewTaskTemplate ) {
    // Check if value is true then get the notify when value from review list and if option is review, progrees, level, rejection then we need
    // to use EPM-notify-report handler.
    // If value is EPM-late-notification then we need to create EPM-late-notification and in all other case we need to create EPM-notify handler
    if( isReviewTaskTemplate ) {
        var reviewTaskOptionValue = data.reviewNotifyWhenList.dbValue;
        data.selectedNotifyWhenOption = reviewTaskOptionValue;
        if( reviewTaskOptionValue === 'review' || reviewTaskOptionValue === 'rejection' || reviewTaskOptionValue === 'progress' || reviewTaskOptionValue === 'level' ) {
            data.handlerName = 'EPM-notify-report';
        } else if( reviewTaskOptionValue === 'EPM-late-notification' ) {
            data.handlerName = 'EPM-late-notification';
            // Clear the subject and message for late notification handler
            data.notifySubject.dbValue = '';
            data.notifySubject.uiValue = '';
            data.notifyMessage.dbValue = '';
            data.notifyMessage.uiValue = '';
        } else {
            data.handlerName = 'EPM-notify';
        }
    } else if( !isReviewTaskTemplate ) {
        // Check if value is false then get the notify when value from task list and if option is EPM-late-notification
        // then we need to create EPM-late-notification and in all other case we need to create EPM-notify handler
        var taskOptionValue = data.taskNotifyWhenList.dbValue;
        data.selectedNotifyWhenOption = taskOptionValue;
        if( taskOptionValue === 'EPM-late-notification' ) {
            // Clear the subject and message for late notification handler
            data.handlerName = 'EPM-late-notification';
            data.notifySubject.dbValue = '';
            data.notifySubject.uiValue = '';
            data.notifyMessage.dbValue = '';
            data.notifyMessage.uiValue = '';
        } else {
            data.handlerName = 'EPM-notify';
        }
    }
};

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
 *
 * @param {Object} dataProvider data provider where object need to be added
 * @param {Array} selectedObjects Object that need to be added
 * @param {boolean} mergeData To provide support that we want to add to existing
 *                  elements on data or replace
 */
var _populateDataProvider = function( dataProvider, selectedObjects, mergeData ) {
    var assignerUsers = [];
    _.forEach( selectedObjects, function( selectedObject ) {
        if( isOfType( selectedObject, 'GroupMember' ) ) {
            var userObject = viewModelObjectSvc.createViewModelObject( selectedObject.props.user.dbValues[ 0 ] );
            if( userObject ) {
                userObject.selected = false;
                assignerUsers.push( userObject );
                userObject.canRemove = true;
            }
        } else {
            if( selectedObject ) {
                selectedObject.selected = false;
                selectedObject.canRemove = true;
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
 * Add the selected obejct from user picker panel to main panel.
 * @param {Object} data Data view model object
 */
export let addSelectedUsers = function( data ) {
    var selectedObjects = data.selectedObjects;
    _populateDataProvider( data.dataProviders.recipientsDataProvider, selectedObjects, true );
    parentData.isValidToModify = true;
};

/**
 * Get the recipient handler arguemtn values based on obejct present on UI in comamnd seperated string
 * @param {Object} dataProvider data provider where recipients are added
 * @param {String} handlerName Handler name which is being created
 * @returns {String} Recipient arguemtn value
 */
var _getHandlerArgumentValue = function( dataProvider, handlerName ) {
    var argumentValue = '';
    var assigness = [];
    var loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
    _.forEach( loadedObjects, function( loadedObject ) {
        if( isOfType( loadedObject, 'User' ) ) {
            // Check if handler that need to be create is late notification and selected object is user then
            // we will not append anything before that and for other handler we need to append 'user:'
            if( handlerName === 'EPM-late-notification' ) {
                assigness.push( loadedObject.props.user_id.dbValue );
            } else {
                assigness.push( 'user:' + loadedObject.props.user_id.dbValue );
            }
        } else if( isOfType( loadedObject, 'ResourcePool' ) ) {
            // For resource pool object we need to add group and role name with prefix 'resourcepool:'
            var groupObject = Awp0WorkflowDesignerUtils.getGroupObject( loadedObject, '*' );
            var roleObject = Awp0WorkflowDesignerUtils.getRoleObject( loadedObject, '*' );
            if( groupObject && roleObject && groupObject.groupInternalName && roleObject.roleInternalName ) {
                assigness.push( 'resourcepool:' + groupObject.groupInternalName + '::' + roleObject.roleInternalName );
            }
        } else if( loadedObject.type === 'KeyRole' && !loadedObject.isPlaceHolder ) {
            // For key role directly use the key role dbvalue
            var keyRoleValue = loadedObject.props.keyRole.dbValue;
            if( loadedObject !== '' ) {
                assigness.push( keyRoleValue );
            }
        }
    } );
    argumentValue = assigness.join();
    return argumentValue;
};

/**
 * Return the action type value based on user selected option from UI.
 * @param {Object} data Data view model object
 * @param {String} handlerName Handler name which is being created
 *
 * @returns {String} Action type value
 */
var _getNotyHandlerActionType = function( data, handlerName ) {
    var actionType = 2;
    // If handler is EPM notify then get the action type selected value and return that value
    if( handlerName === 'EPM-notify' && !data.isReviewACKRoutePSTaskSelected ) {
        actionType = data.taskNotifyWhenList.dbValue;
    } else {
        // In case of notify report handler based on selected option return the action type
        var reviewOption = data.reviewNotifyWhenList.dbValue;
        if( reviewOption === 'review' ) {
            actionType = 2;
        } else if( reviewOption === 'rejection' ) {
            actionType = 100;
        } else if( reviewOption === 'progress' ) {
            actionType = 4;
        } else if( reviewOption === 'level' ) {
            actionType = 4;
        } else {
            actionType = reviewOption;
        }
    }
    return actionType;
};

/**
 * Return the attachment type option value based on user selected option from UI.
 * @param {Object} data Data view model object
 * @param {String} handlerName Handler name which is being created
 *
 * @returns {String} Attachment option value
 */
var _getNotifyAttachmentType = function( data, handlerName ) {
    var attachmentOption = null;
    var attachmentTypes = [];
    // Check if handler name is late notification then we can't set attachemtn on that handler so return null.
    // For other notify handler get attachment options based on user selection and and return it
    if( handlerName === 'EPM-late-notification' ) {
        return attachmentOption;
    }
    if( data.processInfo.dbValue ) {
        attachmentTypes.push( 'process' );
    }
    if( data.targetInfo.dbValue ) {
        attachmentTypes.push( 'target' );
    }
    if( data.referenceInfo.dbValue ) {
        attachmentTypes.push( 'reference' );
    }
    // Combine all attachment types as one single string seperated by ','
    if( attachmentTypes && attachmentTypes.length > 0 ) {
        attachmentOption = attachmentTypes.join();
    } else {
        attachmentOption = '';
    }
    return attachmentOption;
};

/**
 * Based on handler name and return the template uid where handler need to be created.
 * If selected handler is EPM-notify-report that means we need to add the handler on PS task and not
 * on selected task.
 * @param {Object} selected Selected template object from UI
 * @param {String} handlerName Handler name which is being created
 *
 * @returns {String} Valid template Uid where handler will be created
 */
var _getTemplateObejctTypeUid = function( selected, handlerName ) {
    if( handlerName === 'EPM-notify-report' ) {
        var modelObject = Awp0WorkflowDesignerUtils.getValidTemplateObject( selected, 'EPMPerformSignoffTaskTemplate' );
        if( modelObject ) {
            return modelObject.uid;
        }
    }
    return selected.uid;
};

/**
 * Return the report option value based on user selected option from UI.
 * @param {Object} data Data view model object
 * @param {String} handlerName Handler name which is being created
 *
 * @returns {String} Report option value
 */
var _getNotifyReportOption = function( data, handlerName ) {
    var reportOption = null;
    if( handlerName === 'EPM-notify-report' ) {
        reportOption = data.reviewNotifyWhenList.dbValue;
    }
    return reportOption;
};

/**
 * Check if handler update case where handler need to be deleted and new handler need to be created
 * @param {Object} data Data view model object
 * @param {Object} handlerContextObject If user selected any handler form notification table then contian that
 *                 handler object else null
 * @param {int} newActionType New action type value to be match
 * @returns {boolean} isCreateCase True/ false based on user action for create or update handler
 */
var _isHandlerDeleteAndCreateCase = function( data, handlerContextObject, newActionType ) {
    // Check if selected handler action type is differnt then selected action value from UI
    // then we need this handler to be deleted and new handler will be created
    if( handlerContextObject && ( data.handlerName !== handlerContextObject.handlerName ||
            handlerContextObject.props.parent_action_type &&
            handlerContextObject.props.parent_action_type.dbValue !== newActionType ) ) {
        return true;
    }
    return false;
};

/**
 * Create the input structure for notification handler for EPM-notify and EPM-notify-report.
 * @param {Object} data Data view model object
 * @param {Object} dataProvider Data provider objects that will contain all recipients values
 * @param {Object} selected Selected template object from UI
 * @param {Object} handlerContextObject If user selected any handler form notification table then contian that
 *                 handler object else null
 * @param {boolean} isCreateCase True/ false based on user action for create or update handler
 *
 * @returns {Array} Create or update handler SOA input structure array
 */
var _getUpdateOrCreateNotyHandlerInput = function( data, dataProvider, selected, handlerContextObject, isCreateCase ) {
    var input = [];
    // Get the differnt arguemnts that we need to set on handler based on handler name
    var recipientValue = _getHandlerArgumentValue( dataProvider, data.handlerName );
    if( data.preferences.EPM_ARG_target_user_group_list_separator && data.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && data.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '' ) {
        recipientValue = recipientValue.replace( /,/g, data.preferences.EPM_ARG_target_user_group_list_separator[0] );
    }
    var actionType = _getNotyHandlerActionType( data, data.handlerName );
    var attachmentType = _getNotifyAttachmentType( data, data.handlerName );
    var report = _getNotifyReportOption( data, data.handlerName );
    var additionalDataMap = {};
    // Check if subject is valid then add it to additional data to set on handler
    if( data.notifySubject.dbValue ) {
        additionalDataMap[ '-subject' ] = [ data.notifySubject.dbValue ];
    }

    // Check if message is valid then add it to additional data to set on handler
    if( data.notifyMessage.dbValue ) {
        //As a fix for the defect LCS-380726. replacing newline character with space.
        data.notifyMessage.dbValue = data.notifyMessage.dbValue.replace( /\n/g, ' ' );
        additionalDataMap[ '-comment' ] = [ data.notifyMessage.dbValue ];
    }

    // Check if attachment type is not null then set the value on aaditional data to set on handler
    if( attachmentType || attachmentType === '' ) {
        additionalDataMap[ '-attachment' ] = [ attachmentType ];
    }

    // Check if report is not null then set the value on aaditional data to set on handler
    if( report ) {
        additionalDataMap[ '-report' ] = [ report ];
    }
    additionalDataMap[ '-recipient' ] = [ recipientValue ];

    // Check if selected handler action type is differnt then selected action value from UI
    // then we need this handler to be deleted and new handler will be created
    var isDeleteAndCreateCase = _isHandlerDeleteAndCreateCase( data, handlerContextObject, actionType );
    if( handlerContextObject && isDeleteAndCreateCase ) {
        handlerContextObject.deleteHandler = true;
        isCreateCase = true;
    }
    // Check if handler context is not null that means it's update handler case
    // otherwise it will be create handler case
    if( handlerContextObject && !isCreateCase ) {
        // Update the addiitonal data if handler has some other arguemtns defiend. This is needed
        // as server replace the all arguemnts from handler based on passed arguments.
        Awp0WorkflowDesignerUtils.updateAdditionalDataWithOtherArguments( handlerContextObject, additionalDataMap );

        // Check if subject or comment values are now empty and previously it used to have soem value then remove
        // these values from handler arguments. FIx for defect # LCS-420569
        if( data.notifySubject.valueUpdated && data.notifySubject.dbValue === '' && additionalDataMap.hasOwnProperty( '-subject' ) ) {
            delete additionalDataMap[ '-subject' ];
        }
        if( data.notifyMessage.valueUpdated && data.notifyMessage.dbValue === '' && additionalDataMap.hasOwnProperty( '-comment' ) ) {
            delete additionalDataMap[ '-comment' ];
        }
        var updateObject = {
            clientID: 'updateHandler -' + handlerContextObject.uid,
            handlerToUpdate: handlerContextObject.uid,
            additionalData: additionalDataMap
        };
        input.push( updateObject );
    } else {
        var createObject = {
            clientID: 'createHandler -' + selected.uid,
            handlerName: data.handlerName,
            taskTemplate: _getTemplateObejctTypeUid( selected, data.handlerName ),
            handlerType: 'Action',
            action: actionType,
            additionalData: additionalDataMap
        };
        input.push( createObject );
    }
    return input;
};

/**
 * Create the input structure for late notification handler
 * @param {Object} data Data view model object
 * @param {Object} dataProvider Data provider objects that will contain all recipients values
 * @param {Object} selected Selected template object from UI
 * @param {Object} handlerContextObject If user selected any handler form notification table then contian that
 *                 handler object else null
 * @param {boolean} isCreateCase True/ false based on user action for create or update handler
 *
 * @returns {Array} Create or update handler SOA input structure array
 */
var _getUpdateOrCreateLateNotyHandlerInput = function( data, dataProvider, selected, handlerContextObject, isCreateCase ) {
    var input = [];
    var argumentValue = _getHandlerArgumentValue( dataProvider, 'EPM-late-notification' );
    if( data.preferences.EPM_ARG_target_user_group_list_separator && data.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && data.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '' ) {
        argumentValue = argumentValue.replace( /,/g, data.preferences.EPM_ARG_target_user_group_list_separator[0] );
    }

    // Check if selected handler action type is differnt then selected action value from UI
    // then we need this handler to be deleted and new handler will be created
    var isDeleteAndCreateCase = _isHandlerDeleteAndCreateCase( data, handlerContextObject, 2 );
    if( handlerContextObject && isDeleteAndCreateCase && handlerContextObject.handlerName !== 'EPM-late-notification' ) {
        handlerContextObject.deleteHandler = true;
        isCreateCase = true;
    }

    // Check if handler context is not null that means it's update handler case
    // otherwise it will be create handler case
    if( handlerContextObject && !isCreateCase ) {
        var updateAdditionalData = {};
        updateAdditionalData[ '-recipient' ] = [ argumentValue ];
        var updateObject = {
            clientID: 'updateHandler -' + handlerContextObject.uid,
            handlerToUpdate: handlerContextObject.uid,
            additionalData: updateAdditionalData
        };
        input.push( updateObject );
    } else {
        var createAdditionalData = {};
        createAdditionalData[ '-recipient' ] = [ argumentValue ];
        var createObject = {
            clientID: 'createHandler -' + selected.uid,
            handlerName: 'EPM-late-notification',
            taskTemplate: selected.uid,
            handlerType: 'Action',
            action: 2,
            additionalData: createAdditionalData
        };
        input.push( createObject );
    }
    return input;
};

/**
 * Create the create or update handler input based on user action and return the input structure.
 *
 * @param {Object} data Data view model object
 * @param {Object} selected Selected template object from UI
 * @param {Object} selectedHandlerContext If user selected any handler form notification table then contian that
 *                 handler object else null
 * @param {boolean} isCreateCase True/ false based on user action for create or update handler
 *
 * @returns {Array} Create or update handler SOA input structure array
 */
export let getCreateOrUpdateHandlerInput = function( data, selected, selectedHandlerContext, isCreateCase ) {
    var input = [];
    // Check if handler name is EPM-late-notification then call below method and for other handlers
    // call different method
    if( data.handlerName === 'EPM-late-notification' ) {
        input = _getUpdateOrCreateLateNotyHandlerInput( data, data.dataProviders.recipientsDataProvider, selected, selectedHandlerContext, isCreateCase );
    } else {
        input = _getUpdateOrCreateNotyHandlerInput( data, data.dataProviders.recipientsDataProvider, selected, selectedHandlerContext, isCreateCase );
    }
    return input;
};

export default exports = {
    populatePanelData,
    removeKeyRoleArguments,
    openUserPanel,
    notifyWhenOptionChange,
    addSelectedUsers,
    getCreateOrUpdateHandlerInput
};
/**
 * Define notification panel service
 *
 * @memberof NgServices
 * @member Awp0WorkflowTemplateNotificationPanelService
 */
app.factory( 'Awp0WorkflowTemplateNotificationPanelService', () => exports );
