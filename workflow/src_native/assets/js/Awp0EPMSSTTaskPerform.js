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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0EPMSSTTaskPerform
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjSvc from 'js/viewModelObjectService';
import Awp0PerformTask from 'js/Awp0PerformTask';
import iconSvc from 'js/iconService';
import cdm from 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';
import Awp0TasksUtils from 'js/Awp0TasksUtils';
import awp0InboxUtils from 'js/Awp0InboxUtils';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var presentGroupMemberSignoffList = [];
var parentData = {};

var exports = {};

/**
 * Set the active view id on current data object and set the add button visible flag to true
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let populateSubPanel = function( data ) {
    data.activeView = 'Awp0EPMSSTTaskPerformSub';
    data.isAddButtonVisible = true;

    if( data.percentQuorumValue && data.percentQuorumValue.dbValue ) {
        data.percentQuorumValue.dbValue = '';
    }

    if( data.numericQuorumValue && data.numericQuorumValue.dbValue ) {
        data.numericQuorumValue.dbValue = '';
    }
    // Reset to default comment value
    if( data.comments && data.comments.dbValue ) {
        data.comments.dbValue = '';
        data.comments.uiValue = '';
    }
    data.isQuorumInitialized = false;
};

/**
 * Get the comments that needs to be passed to server while completing the task.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let getComments = function( data ) {
    return Awp0PerformTask.getComments( data );
};

/**
 * Populate the required signoff obejct that needs to be shown when profile doesn't exist on the SST task object
 * and no adhoc signoff added in the list then it should show the dummy required cell as signoff needs to be
 * added to complete the task.
 *
 * @param {object} data - the data Object
 * @param {object} signoffProfiles - the signoff profile array that will contain signoff profile and profile
 *            signoffs
 * @param {object} signoffs - the signoff array that will contain adhoc signoffs
 */
var populateRequiredSignoffObject = function( data, signoffProfiles, signoffs ) {
    var adhocSignoffs = signoffs;
    if( data && signoffProfiles && signoffs ) {
        if( signoffProfiles.length <= 0 && signoffs <= 0 ) {
            var modelObject = viewModelObjSvc.constructViewModelObjectFromModelObject( null, '' );
            var iconURL = iconSvc.getTypeIconFileUrl( 'typePersonGray48.svg' );
            modelObject.typeIconURL = iconURL;
            modelObject.requiredDispValue = data.i18n.requiredLabel;
            adhocSignoffs.push( modelObject );
        }
    }
    return adhocSignoffs;
};

/**
 * Populate the decision required property on signoff object
 *
 * @param {object} data - the data Object
 * @param {Object} signoffVMOObject - Signoff VMO obejct where decision required property needs to be populated
 */
var pupulateSignoffDecisionRequiredProp = function( data, signoffVMOObject ) {
    if( signoffVMOObject.props.fnd0DecisionRequired && signoffVMOObject.props.fnd0DecisionRequired.dbValues &&
        signoffVMOObject.props.fnd0DecisionRequired.uiValues ) {
        var requiredSignoff = signoffVMOObject.props.fnd0DecisionRequired.dbValues[ 0 ];

        if( requiredSignoff && requiredSignoff === 'RequiredUnmodifiable' ) {
            signoffVMOObject.isRequiredDecisionModifiable = false;
        } else {
            signoffVMOObject.isRequiredDecisionModifiable = true;
        }
        signoffVMOObject.decisionRequired = data.i18n.decisionRequired;
        signoffVMOObject.props.fnd0DecisionRequired.propertyDisplayName = signoffVMOObject.props.fnd0DecisionRequired.uiValues[ 0 ];
    }
};

/**
 * Get the created view model object.
 *
 * @param {object} data - the data Object
 * @param {object} serverVMOObject - the VMO object created on server
 *
 */
var getSignoffVMOObject = function( data, serverVMOObject ) {
    var signoffVMOObject = null;
    if( serverVMOObject ) {
        signoffVMOObject = viewModelObjSvc.createViewModelObject( serverVMOObject.uid, 'EDIT', null, serverVMOObject  );

        if( !signoffVMOObject ) {
            return;
        }

        signoffVMOObject.isResoucePoolSignoff = false;
        // Check if resource pool property is not null then only set the object as resource pool
        if( signoffVMOObject.props.resource_pool && signoffVMOObject.props.resource_pool.dbValues &&
            signoffVMOObject.props.resource_pool.dbValues[ 0 ] ) {
            signoffVMOObject.isResoucePoolSignoff = true;

            if( signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).group' ] &&
                !signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).group' ].dbValue ) {
                signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).group' ].dbValue = data.i18n.any;
                signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).group' ].dbValues = [ data.i18n.any ];
                signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).group' ].uiValues = [ data.i18n.any ];
            }

            if( signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).role' ] &&
                !signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).role' ].dbValue ) {
                signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).role' ].dbValue = data.i18n.any;
                signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).role' ].dbValues = [ data.i18n.any ];
                signoffVMOObject.props[ 'REF(resource_pool,ResourcePool).role' ].uiValues = [ data.i18n.any ];
            }
        }

        if( signoffVMOObject.props.group_member && signoffVMOObject.props.group_member.dbValues &&
            signoffVMOObject.props.group_member.dbValues[ 0 ] ) {
            presentGroupMemberSignoffList.push( signoffVMOObject.props.group_member.dbValues[ 0 ] );
        }
        // Populate the decision required proeprty on signoff object
        pupulateSignoffDecisionRequiredProp( data, signoffVMOObject );
    }
    return signoffVMOObject;
};

/**
 * Populate the signoff profile, profile signoff and adhco signoff data and add it to respective data provider
 *
 * @param {object} data - the data Object
 *
 */
var populateProfilesAndSignoffData = function( data ) {
    data.reviewProfileSignoffs = [];
    data.reviewAdhocSignoffs = [];
    var signoffProfiles = [];

    // Get the respective JSON string returned from server to populate the correct data
    var profileJSONString = data.reviewProfiles;
    var profileSignoffString = data.profileSignoffs;
    var adhocSignoffString = data.adhocSignoffs;
    signoffProfiles = Awp0TasksUtils.getProfiles( profileJSONString, data );

    // Set the list to empty that will contain all group member signoffs that will be used when user is trying
    // to add same group member signoff again then before calling the SOA it will check in the list and then return the
    // duplicate reviewer found error
    presentGroupMemberSignoffList = [];

    if( profileSignoffString && profileSignoffString.length > 0 ) {
        var profileSignoffs = JSON.parse( profileSignoffString );

        _.forEach( profileSignoffs.objects, function( result ) {
            if( result ) {
                var updatedVMO = getSignoffVMOObject( data, result );

                if( updatedVMO ) {
                    signoffProfiles.push( updatedVMO );
                }
            }
        } );
    }

    data.reviewProfileSignoffs = signoffProfiles;
    data.dataProviders.reviewProfileSignoffProvider.update( signoffProfiles, signoffProfiles.length );

    var signoffs = [];
    if( adhocSignoffString && adhocSignoffString.length > 0 ) {
        var adhocSignoffs = JSON.parse( adhocSignoffString );

        _.forEach( adhocSignoffs.objects, function( result ) {
            if( result ) {
                var updatedVMO = getSignoffVMOObject( data, result );

                if( updatedVMO ) {
                    signoffs.push( updatedVMO );
                }
            }
        } );
    }

    // Populate the required dummy cell that needs to be shown when there is no profile and no adhoc signoff present
    var adhocSignoffObjects = populateRequiredSignoffObject( data, signoffProfiles, signoffs );

    data.reviewAdhocSignoffs = adhocSignoffObjects;
    data.dataProviders.reviewAdhocSignoffProvider.update( adhocSignoffObjects, adhocSignoffObjects.length );
};

/**
 * Check for signoff belongs to acknowledge task or not
 *
 * @param {object} selectedObject - the current selection object
 * @return {Boolean} isAcknowledgeTask - True/False value
 *
 */
function isAcknowledgeTaskObject( selectedObject ) {
    var isAcknowledgeTask = false;

    if( selectedObject && selectedObject.props.parent_task && selectedObject.props.parent_task.dbValues ) {
        var modelObj = cdm.getObject( selectedObject.props.parent_task.dbValues[ 0 ] );

        if( modelObj && modelObj.modelType.typeHierarchyArray.indexOf( 'EPMAcknowledgeTask' ) > -1 ) {
            isAcknowledgeTask = true;
        }
    }
    return isAcknowledgeTask;
}

/**
 * Check if input obejct is not null and have value panelId then only return true else return false
 *
 * @param {object} cmdContext - the current data object
 */
function isSecondaryViewExist( cmdContext ) {
    if( cmdContext._internal && cmdContext._internal.panelId &&
        cmdContext._internal.panelId === 'Awp0EPMSSTTaskPerformSecondary' ) {
        return true;
    }
    return false;
}

/**
 * Update the quorum text element size
 *
 */
var _updateQuorumElementSize = function() {
    var percentQuorumElement = document.getElementById( 'sstPercentQuorumValue' );
    var numericQuorumElement = document.getElementById( 'sstNumericQuorumValue' );

    if( percentQuorumElement ) {
        percentQuorumElement.style.width = 'fit-content';
    }

    if( numericQuorumElement ) {
        numericQuorumElement.style.width = 'fit-content';
    }
};

/**
 * Set the quorum value on UI element
 *
 * @param {Obejct} data - the data Object
 * @param {object} selectedObject - the current selection object
 */
var _setQuorumValue = function( data, selectedObject ) {
    var quorumValue = parseInt( selectedObject.props.signoff_quorum.dbValues[ 0 ] );

    var percentQuorumValue = 100;
    var numericQuorumValue = null;

    if( quorumValue > 0 ) {
        numericQuorumValue = quorumValue;
    } else {
        percentQuorumValue = Math.abs( parseInt( selectedObject.props.signoff_quorum.dbValues[ 0 ] ) );
    }

    // Check if comments db value is not null that means there is a value present already
    // either entered by user or present on object then use that value
    if( data.percentQuorumValue.dbValue ) {
        percentQuorumValue = data.percentQuorumValue.dbValue;
    }

    data.percentQuorumValue.dbValue = percentQuorumValue;
    data.percentQuorumValue.uiValue = percentQuorumValue;

    // Check if comments db value is not null that means there is a value present already
    // either entered by user or present on object then use that value
    if( data.numericQuorumValue.dbValue ) {
        numericQuorumValue = data.numericQuorumValue.dbValue;
    }

    data.numericQuorumValue.dbValue = numericQuorumValue;
    data.numericQuorumValue.uiValue = numericQuorumValue;

    // Check if quorum is not initialized then only set the size and show the correct
    // quorum radio control based on signoff_quorum property value
    if( !data.isQuorumInitialized ) {
        _updateQuorumElementSize();
        data.isQuorumInitialized = true;

        if( quorumValue > 0 ) {
            data.quorumOptions.dbValue = false;
        } else {
            data.quorumOptions.dbValue = true;
        }
    }
};

/**
 * Populate the properties on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let populatePanelData = function( data, cmdContext, selection ) {
    var selectedObject = selection;
    if( !selectedObject ) {
        selectedObject = viewModelObjSvc.createViewModelObject( appCtxSvc.ctx.task_to_perform.task[ 0 ] );
    }

    if( cmdContext && ( cmdContext.activeView || isSecondaryViewExist( cmdContext ) ) ) {
        data = cmdContext;
    }

    if( data._internal && data._internal.panelId && data._internal.panelId === 'Awp0AddSignoff' ) {
        data = parentData;
    }

    parentData = data;

    // This method is needed to set the correct style for panel when it will be visible in secondary area
    Awp0PerformTask.updateStyleForSecondaryPanel();

    var nameValue = selectedObject.props.object_string.dbValues[ 0 ];
    data.taskName.dbValue = nameValue;
    data.taskName.uiValue = nameValue;

    var commentsValue = selectedObject.props.comments.dbValues[ 0 ];

    // Check if comments db value is not null that means there is a value present already
    // either entered by user or present on object then use that value
    if( data.comments.dbValue ) {
        commentsValue = data.comments.dbValue;
    }

    data.comments.dbValue = commentsValue;
    data.comments.uiValue = commentsValue;

    Awp0PerformTask.populateDescription( data, selectedObject );

    awp0InboxUtils.populateJobDescription( data, selectedObject );

    var secureTaskValue = selectedObject.props.secure_task.dbValues[ 0 ];
    data.isSecureTask.dbValue = secureTaskValue === '1';

    var hasFailurePathsValue = selectedObject.props.has_failure_paths.dbValues[ 0 ];
    data.hasFailurePaths.dbValue = hasFailurePathsValue === '1';

    if( selectedObject.props.wait_for_all_reviewers ) {
        data.waitForReviewers.propertyDisplayName = selectedObject.props.wait_for_all_reviewers.propertyDescriptor.displayName;
        data.waitForReviewershide.propertyDisplayName = selectedObject.props.wait_for_all_reviewers.propertyDescriptor.displayName;
    }

    var isAckSSSTObejct = isAcknowledgeTaskObject( selectedObject );

    if( isAckSSSTObejct ) {
        data.reviewProfiles = data.ackReviewProfiles;
        data.profileSignoffs = data.ackProfileSignoffs;
        data.adhocSignoffs = data.ackAdhocSignoffs;
    }

    _setQuorumValue( data, selectedObject );
    var waitForReviewersValue = selectedObject.props.wait_for_all_reviewers.dbValues[ 0 ];

    if( data.waitForReviewers.dbValue === null && data.waitForReviewershide.dbValue === null ) {
        data.waitForReviewers.dbValue = waitForReviewersValue === '1';
        data.waitForReviewershide.dbValue = waitForReviewersValue === '1';
    }
    // Populate the signoff profile and respective signoff data and add it to respective providers
    populateProfilesAndSignoffData( data );

    data.isDSConfigured = false;

    // Configuration for digital signature service
    var deferred = AwPromiseService.instance.defer();
    Awp0PerformTask.getDigitalSignatureService().then(
        function( awDigitalSignatureService ) {
            deferred.resolve( null );

            if( awDigitalSignatureService ) {
                data.isDSConfigured = true;
                var isApplyDS = awDigitalSignatureService.isApplyDS( selectedObject );
                var isAuthenticationRequired = awDigitalSignatureService
                    .isAuthenticationRequired( selectedObject );

                if( isApplyDS || isAuthenticationRequired ) {
                    awDigitalSignatureService.addActiveXObjectElement();
                }
            }
        } );
    return deferred.promise;
};

/**
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer
 * will be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {object} selectedObject - the current selection object
 */
export let openUserPanel = function( data, selectedObject ) {
    var additionalSearchCriteria = null;
    var profileObject = null;

    // Check if selected object cotnains additionalSearchCriteria then use that else it will
    // be null search criteria.
    if( selectedObject && selectedObject.props && selectedObject.additionalSearchCriteria ) {
        // FIx for defect # LCS-618160. Cloning the additionals search criteria and then set it
        // on context.
        profileObject = selectedObject;
        additionalSearchCriteria =  _.clone( profileObject.additionalSearchCriteria );
    }

    // Add the additional search criteria on the scope so that it can be consume while generating the SOA input
    data.additionalSearchCriteria = additionalSearchCriteria;

    // Set the context for loading project on SST panel
    var wrkContext = {
        loadProjectData: true,
        selectionModelMode: 'multiple',
        profileObject: profileObject
    };

    appCtxSvc.registerCtx( 'workflow', wrkContext );

    // If we are in panel case then we need to fire awPanel.navigate event
    // to support go to next panel and come back to parent panel case otherwise
    // it will trigger new command to add new signoff
    if( data.activeView && data.activeView === 'Awp0EPMSSTTaskPerformSub' ) {
        var context = {
            destPanelId: 'Users',
            title: data.i18n.addReviewer,
            recreatePanel: true,
            supportGoBack: true
        };

        eventBus.publish( 'awPanel.navigate', context );
        return;
    }

    if( data.eventData ) {
        var panelContext = {
            originType: data.eventData.originType,
            selectedProfile: data.eventData.selectedProfile,
            signoffAction: data.eventData.signoffAction,
            presentGroupMemberSignoffList: presentGroupMemberSignoffList,
            additionalSearchCriteria : additionalSearchCriteria
        };
        commandPanelService.activateCommandPanel( 'Awp0AddSignoff', 'aw_toolsAndInfo', panelContext );
    }
};

/**
 * Get the input structure to remove the selected signoffs from respective data provider
 *
 * @param {object} taskObject - the selected SST task object
 * @param {object} selectedObjectsToRemove - the current selected objects in data provider
 *
 */
export let getRemoveSignoffsInputData = function( taskObject, selectedObjectsToRemove ) {
    var signoffs = [];
    var signoffsDeleted = [];
    // Check if selection is not null and 0th index object is also not null
    // then create the input structure
    if( selectedObjectsToRemove && taskObject && selectedObjectsToRemove.length > 0 ) {
        _.forEach( selectedObjectsToRemove, function( selObject ) {
            // Check if selected object is of type signoff then only add it to remove signoff list
            if( selObject && selObject.modelType &&
                selObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
                if( selObject.isRequiredDecisionModifiable ) {
                    signoffsDeleted.push( selObject );
                }
            }
        } );

        signoffs = [ {
            task: taskObject,
            removeSignoffObjs: signoffsDeleted
        } ];
    }

    return signoffs;
};

/**
 * Get the properties that needs to be saved
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let getPropertiesToSave = function( data ) {
    if( !data ) {
        return [];
    }
    var waitForReviewerDBValue = data.waitForReviewers.dbValue;
    var waitForReviewer = '0';

    if( waitForReviewerDBValue ) {
        waitForReviewer = '1';
    }

    var selectedQuorum = data.quorumOptions.dbValue;
    var signoffQuorum = '-100%';

    if( selectedQuorum ) {
        var percentQuorumValue = data.percentQuorumValue.dbValue;
        if( percentQuorumValue ) {
            signoffQuorum = '-' + percentQuorumValue.toString();
        }
    } else {
        var numericQuorumValue = data.numericQuorumValue.dbValue;
        if( numericQuorumValue ) {
            signoffQuorum = numericQuorumValue.toString();
        }
    }

    return [ {
        name: 'wait_for_all_reviewers',
        values: [ waitForReviewer ]
    }, {
        name: 'task_result',
        values: [ 'Completed' ]
    }, {
        name: 'signoff_quorum',
        values: [ signoffQuorum ]
    } ];
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 *
 * @param {Object} messages - messages array
 * @param {Object} msgObj - message object
 */
var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        msgObj.msg += '<BR/>';
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

/**
 * This API is added to process the Partial error being thrown from the SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let processPartialErrors = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( response && response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the
 * correct errors only to the user.
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorMessageOnPerformAction = function( response ) {
    return Awp0PerformTask.populateErrorMessageOnPerformAction( response );
};

/**
 * Check the selection and if selection is of type signoff then only check if signoff can be removed or not and
 * based on that return true or false.
 *
 * @param {selection} the current selection objects
 */
export let evaluateSelections = function( selection ) {
    var isValidSelection = false;
    if( selection && selection.length > 0 ) {
        for( var idx = 0; idx < selection.length; idx++ ) {
            if( selection[ idx ] && selection[ idx ].modelType &&
                selection[ idx ].modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
                if( selection[ idx ].isRequiredDecisionModifiable ) {
                    isValidSelection = true;
                    break;
                }
            }
        }
    }
    return isValidSelection;
};

export default exports = {
    populateSubPanel,
    getComments,
    populatePanelData,
    openUserPanel,
    getRemoveSignoffsInputData,
    getPropertiesToSave,
    processPartialErrors,
    populateErrorMessageOnPerformAction,
    evaluateSelections
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Awp0EPMTaskPerform
 */
app.factory( 'Awp0EPMSSTTaskPerform', () => exports );
