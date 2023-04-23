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
 * @module js/Awp0EPMRouteTaskPerform
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjSvc from 'js/viewModelObjectService';
import Awp0PerformTask from 'js/Awp0PerformTask';
import iconSvc from 'js/iconService';
import commandPanelService from 'js/commandPanel.service';
import Awp0TasksUtils from 'js/Awp0TasksUtils';
import awp0InboxUtils from 'js/Awp0InboxUtils';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var presentGroupMemberSignoffList = [];
var isSignoffPresent = false;
var parentData = {};

var exports = {};

/**
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer
 * will be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let populateSubPanel = function( data ) {
    data.activeView = 'Awp0EPMRouteTaskPerformSub';
    data.isAddButtonVisible = true;

    // Reset to default comment value
    if( data.comments && data.comments.dbValue ) {
        data.comments.dbValue = '';
        data.comments.uiValue = '';
    }
};

/**
 * Get the input structure to remove the selected signoffs from respective data provider
 *
 * @param {object} taskObject - the selection Object
 * @param {object} selectedObjectsToRemove - the current selection signoff objects that needs to be removed
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
 * Get the input structure to add the additional reviewers to selected object
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let getAddSignoffsInputData = function( data, selection ) {
    var signoffs = [];

    // Check if selection is not null and 0th index object is also not null
    // then create the input structure
    if( data && data.selectedObjects && data.selectedObjects.length > 0 && selection ) {
        var origin = '';
        var originType = 'SOA_EPM_ORIGIN_UNDEFINED';
        if( data.isProfileSelected ) {
            origin = data.eventData.selectedProfile;
            originType = 'SOA_EPM_SIGNOFF_ORIGIN_PROFILE';
        }
        signoffs = [ {
            task: selection,
            signoffInfo: [ {
                signoffMember: data.selectedObjects[ 0 ],
                origin: origin,
                signoffAction: 'SOA_EPM_Review',
                originType: originType
            } ]

        } ];
    }

    return signoffs;
};

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
            modelObject.cellHeader1 = data.i18n.requiredLabel;
            adhocSignoffs.push( modelObject );
        }
    }
    return adhocSignoffs;
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
        isSignoffPresent = true;
        signoffVMOObject.isResoucePoolSignoff = false;

        // Check if resource pool property is not null then only set the obejct as resource pool
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
        if( signoffVMOObject.props.fnd0DecisionRequired &&
            signoffVMOObject.props.fnd0DecisionRequired.dbValues &&
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
    }
    return signoffVMOObject;
};

/**
 * Populate the review signoff profile, profile signoff and adhco signoff data and add it to respective data
 * provider
 *
 * @param {object} data - the data Object
 *
 */
var populateReviewProfilesAndSignoffData = function( data ) {
    var signoffObjects = [];

    var profileJSONString = data.reviewProfiles;
    var profileSignoffString = data.reviewProfileSignoffs;
    signoffObjects = Awp0TasksUtils.getProfiles( profileJSONString, data );

    if( profileSignoffString && profileSignoffString.length > 0 ) {
        var profileSignoffs = JSON.parse( profileSignoffString );

        _.forEach( profileSignoffs.objects, function( result ) {
            if( result ) {
                var updatedVMO = getSignoffVMOObject( data, result );

                if( updatedVMO ) {
                    signoffObjects.push( updatedVMO );
                }
            }
        } );
    }

    data.reviewSignoffProfileObjects = signoffObjects;
    data.dataProviders.reviewProfileSignoffProvider.update( signoffObjects, signoffObjects.length );
};

/**
 * Populate the review adhoc signoff data and add it to respective data provider
 *
 * @param {object} data - the data Object
 *
 */
var populateReviewAdhocSignoffData = function( data ) {
    var signoffObjects = [];

    var adhocSignoffString = data.reviewAdhocSignoffs;

    if( adhocSignoffString && adhocSignoffString.length > 0 ) {
        var adhocSignoffs = JSON.parse( adhocSignoffString );

        _.forEach( adhocSignoffs.objects, function( result ) {
            if( result ) {
                var updatedVMO = getSignoffVMOObject( data, result );

                if( updatedVMO ) {
                    signoffObjects.push( updatedVMO );
                }
            }
        } );
    }

    data.reviewAdhocSignoffObjects = signoffObjects;
    data.dataProviders.reviewAdhocSignoffProvider.update( signoffObjects, signoffObjects.length );
};

/**
 * Populate the acknowledge adhoc signoff data and add it to respective data provider
 *
 * @param {object} data - the data Object
 *
 */
var populateAcknowledgeSignoffData = function( data ) {
    var acknowledgeSignoffs = [];
    var acknowledgeSignoffString = data.acknowledgeAdhocSignoffs;

    if( acknowledgeSignoffString && acknowledgeSignoffString.length > 0 ) {
        var acknowledgeSignoffObjects = JSON.parse( acknowledgeSignoffString );

        _.forEach( acknowledgeSignoffObjects.objects, function( result ) {
            if( result ) {
                var updatedVMO = getSignoffVMOObject( data, result );

                if( updatedVMO ) {
                    acknowledgeSignoffs.push( updatedVMO );
                }
            }
        } );
    }

    data.acknowledgeSignoffObjects = acknowledgeSignoffs;
    data.dataProviders.acknowledgeSignoffProvider.update( acknowledgeSignoffs, acknowledgeSignoffs.length );
};

/**
 * Populate the notify adhoc signoff data and add it to respective data provider
 *
 * @param {object} data - the data Object
 *
 */
var populateNotifySignoffData = function( data ) {
    var notifySignoffs = [];
    var notifySignoffString = data.notifyAdhocSignoffs;

    if( notifySignoffString && notifySignoffString.length > 0 ) {
        var notifySignoffsObjects = JSON.parse( notifySignoffString );

        _.forEach( notifySignoffsObjects.objects, function( result ) {
            if( result ) {
                var updatedVMO = getSignoffVMOObject( data, result );

                if( updatedVMO ) {
                    notifySignoffs.push( updatedVMO );
                }
            }
        } );
    }

    data.notifySignoffObjects = notifySignoffs;
    data.dataProviders.notifySignoffProvider.update( notifySignoffs, notifySignoffs.length );
};

/**
 * Populate the signoff profile, profile signoff and adhco signoff data and add it to respective data provider
 *
 * @param {object} data - the data Object
 *
 */
var populateProfilesAndSignoffData = function( data ) {
    // Set the list to empty that will contain all group member signoffs that will be used when user is trying
    // to add same group member signoff again then before calling the SOA it will check in the list and then return the
    // duplicate reviewer found error
    presentGroupMemberSignoffList = [];

    isSignoffPresent = false;

    populateReviewProfilesAndSignoffData( data );
    populateReviewAdhocSignoffData( data );
    populateAcknowledgeSignoffData( data );
    populateNotifySignoffData( data );

    if( !isSignoffPresent ) {
        // Populate the required dummy cell that needs to be shown when there is no profile and no adhoc signoff present
        var adhocSignoffObjects = populateRequiredSignoffObject( data, data.reviewSignoffProfileObjects,
            data.reviewAdhocSignoffObjects );

        data.reviewAdhocSignoffObjects = adhocSignoffObjects;
        data.dataProviders.reviewAdhocSignoffProvider.update( adhocSignoffObjects, adhocSignoffObjects.length );
    }
};

/**
 * Check if input obejct is not null and have value panelId then only return true else return false
 *
 * @param {object} cmdContext - the current data object
 */
function isSecondaryViewExist( cmdContext ) {
    if( cmdContext._internal && cmdContext._internal.panelId &&
        cmdContext._internal.panelId === 'Awp0EPMRouteTaskPerformSecondary' ) {
        return true;
    }
    return false;
}

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

    // Populate the signoff profile and respective signoff data and add it to respective providers
    populateProfilesAndSignoffData( data );

    data.isDSConfigured = false;

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
 * @param {object} isFromSectionSelected - the current selection object
 */
export let openUserPanel = function( data, selectedObject ) {
    var additionalSearchCriteria = null;
    data.isProfileSelected = false;
    var searchSubGroup = 'false';
    var profileObject = null;
    // Check if selected object cotnains additionalSearchCriteria then use that else it will
    // be null search criteria.
    if( selectedObject && selectedObject.props && selectedObject.additionalSearchCriteria ) {
        profileObject = selectedObject;
        additionalSearchCriteria =  _.clone( profileObject.additionalSearchCriteria );
        data.isProfileSelected = true;
    }

    // Set the context for loading project on SST panel
    var wrkContext = {
        loadProjectData: true,
        selectionModelMode: 'multiple',
        profileObject: profileObject
    };

    appCtxSvc.registerCtx( 'workflow', wrkContext );

    // Add the additional search criteria on the scope so that it can be consume while generating the SOA input
    data.additionalSearchCriteria = additionalSearchCriteria;

    // If we are in panel case then we need to fire awPanel.navigate event
    // to support go to next panel and come back to parent panel case otherwise
    // it will trigger new command to add new signoff
    if( data.activeView && data.activeView === 'Awp0EPMRouteTaskPerformSub' ) {
        var context = {
            destPanelId: 'Users',
            title: data.i18n.addCommandTitle,
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
    getRemoveSignoffsInputData,
    getAddSignoffsInputData,
    getComments,
    populatePanelData,
    openUserPanel,
    populateErrorMessageOnPerformAction,
    evaluateSelections
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Awp0EPMTaskPerform
 */
app.factory( 'Awp0EPMRouteTaskPerform', () => exports );
