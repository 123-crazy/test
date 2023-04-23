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
 * This service is used for handling inbox related functionality
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/aw.inbox.service
 */
import app from 'app';
import clientDataModel from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import tcSvrVer from 'js/TcServerVersion';
import tcSesnD from 'js/TcSessionData';
import appCtxSvc from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import _ from 'lodash';
import policySvc from 'soa/kernel/propertyPolicyService';
import eventBus from 'js/eventBus';
import cdmService from 'soa/kernel/clientDataModel';
import dataManagementService from 'soa/dataManagementService';
import editHandlerSvc from 'js/editHandlerService';
import viewModelObjectSvc from 'js/viewModelObjectService';

/**
 * Define the base object used to provide all of this module's external API.
 *
 * @private
 */
var exports = {};
var onObjectsModifiedListener = null;

/**
 * This method returns the EPMtask object based on input model object. If input model object is signoff object then
 * it will get the fnd0ParentTask from sign-off object and return else if input object is of type EPMTask then
 * return as it is else return null.
 *
 * @param {String} uid of modelObject to be checked
 * @return The valid EPMTask object. Null otherwise.
 */
export let getValidEPMTaskObject = function( uid ) {
    var validEPMTaskObject = null;

    var mo = clientDataModel.getObject( uid );

    if( mo && mo.modelType && mo.modelType.typeHierarchyArray ) {
        if( _.indexOf( mo.modelType.typeHierarchyArray, 'Signoff' ) > -1 ) {
            if( mo.props.fnd0ParentTask && mo.props.fnd0ParentTask.dbValues &&
                mo.props.fnd0ParentTask.dbValues.length > 0 ) {
                validEPMTaskObject = clientDataModel.getObject( mo.props.fnd0ParentTask.dbValues[ 0 ] );
            }
        } else if( _.indexOf( mo.modelType.typeHierarchyArray, 'EPMTask' ) > -1 ) {
            validEPMTaskObject = mo;
        }
    }

    return validEPMTaskObject;
};

/**
 * Get the input obejct property and return the internal value.
 *
 * @param {Object} modelObject Model object whose propeties need to be loaded
 * @param {String} propName Property name that need to be checked
 *
 * @returns {String} Property internal value string
 */
var _getPropValue = function( modelObject, propName ) {
    if( !modelObject || !modelObject.uid ) {
        return null;
    }
    if( modelObject.props && modelObject.props[ propName ] && modelObject.props[ propName ].dbValues
        && modelObject.props[ propName ].dbValues[ 0 ] ) {
        return modelObject.props[ propName ].dbValues[ 0 ];
    }
    return null;
};

/**
 * This return true if the task passed in has been viewed by me
 *
 * @param {ModelObject} validEPMTaskObject -- Valid EPM task object
 * @return {Boolean} -- return true if the task passed in has been viewed by me
 */
export let checkTaskViewedByMe = function( validEPMTaskObject ) {
    return validEPMTaskObject && validEPMTaskObject.props.viewed_by_me &&
        validEPMTaskObject.props.viewed_by_me.dbValues[ 0 ] === '1';
};

/**
 * getPerformAction3Input
 *
 * @function getPerformAction3Input
 *
 * @param {ModelObject} actionableObject - The new selection
 * @param {ModelObject} supportingObject - The new selection
 * @param {String} action - The new selection
 *
 */
var getPerformAction3Input = function( actionableObject, supportingObject, action, value ) {
    var input = {
        input: []
    };

    var element = {
        actionableObject: actionableObject,
        supportingObject: supportingObject,
        action: action,
        propertyNameValues: {}
    };

    element.propertyNameValues.viewed_by_me = [ value ];
    input.input.push( element );

    return input;
};

/**
 * Set properties input to set the property
 *
 * @function setPropertiesInput
 *
 * @param {ModelObject} actionableObject - The new selection
 *
 */
var setPropertiesInput = function( actionableObject ) {
    var input = {
        info: [],
        options: []
    };
    var inputInfo = {
        object: actionableObject
    };
    inputInfo.vecNameVal = [];
    inputInfo.vecNameVal.push( {
        name: 'viewed_by_me',
        values: [ 'true' ]
    } );
    input.info.push( inputInfo );

    return input;
};

var isVersionTc1123OrLater = function( majorVersion, minorVersion, qrmNumber ) {
    return majorVersion === 11 && minorVersion >= 2 && qrmNumber > 3;
};

var isVersionTc1130OrLater = function( majorVersion, minorVersion ) {
    return majorVersion === 11 && minorVersion > 2;
};

var isVersionTc1123OrTc11231 = function( majorVersion, minorVersion, qrmNumber ) {
    if( majorVersion === 11 && minorVersion === 2 && qrmNumber === 3 ) {
        var phase = tcSvrVer.phase;
        if( phase ) {
            var stringArray = phase.split( '_' );
            var phaseVersion = 0;

            if( stringArray !== null && stringArray.length >= 2 && stringArray[ 0 ] !== null ) {
                var str = stringArray[ 0 ].charAt( 1 );
                phaseVersion = parseInt( str, 10 );
                if( phaseVersion >= 1 ) {
                    return true;
                }
            }
        }
    }
};

/**
 * To check the platform server version is equals or more than TC 11.2.3.1 then only it will return true else it
 * will return false.
 *
 * @function isPlatformVersionSupported
 *
 *
 */
var isPlatformVersionSupported = function() {
    var majorVersion = tcSesnD.getTCMajorVersion();
    var minorVersion = tcSesnD.getTCMinorVersion();
    var qrmNumber = tcSesnD.getTCQRMNumber();

    // Check if major version is < 11 then return false
    if( majorVersion < 11 ) {
        return false;
    }

    // Check if TC version is > 11 like TC 12.0 or TC 11.3 or TC 11.2.4 then return true from here
    if( majorVersion > 11 //
        ||
        isVersionTc1123OrLater( majorVersion, minorVersion, qrmNumber ) //
        ||
        isVersionTc1130OrLater( majorVersion, minorVersion ) ) {
        return true;
    }

    // We need the special handling to check for server version for TC 11.2.3 or TC 11.2.3.1.
    // In case of TC 11.2.3.1 server version string like Server Version: V.11.2.3.31_20170114.00
    // while in case of TC 11.2.3 server version string like Server Version: V.11.2.3.30_20170114.00
    // So we have below code to split based on "_" and then get the first value and then use the
    // character present at 1st index to identify the patch version.
    if( isVersionTc1123OrTc11231( majorVersion, minorVersion, qrmNumber ) ) {
        return true;
    }

    return false;
};


/**
 * Check if there is any property that is in edit mode using the edit handler
 * and check if their any edit proeprty then updated the LSD for those proeprties
 * only so that it will have latest LSD. This is fix for defect # LCS-458437
 * @param {Object} modelObject Model obejct whose LSD need to check
 */
var _updateEditPropLSD = function( modelObject ) {
    if( !modelObject|| !modelObject.uid || !appCtxSvc.ctx.editInProgress ||
        ( appCtxSvc.ctx.ViewModeContext && appCtxSvc.ctx.ViewModeContext.ViewModeContext !== 'TableView' )) {
        return;
    }

    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var lsd = _getPropValue( modelObject, 'lsd' );

    // Get the LSD for object
    if( modelObject && modelObject.props && modelObject.props.lsd && modelObject.props.lsd.dbValues
        && modelObject.props.lsd.dbValues[0]) {
        lsd = modelObject.props.lsd.dbValues[0];
    }
    if( activeEditHandler ) {
        // Get the active edit handler and if not null then only get the lsd proerpty for obejct if not loaded
        // already and then get all modified or editable properties and those are not null then modify the LSD.
        dataManagementService.getProperties( [ modelObject.uid ], [ 'lsd' ] ).then( function() {
            var latestObject = cdmService.getObject( modelObject.uid );
            lsd = _getPropValue( latestObject, 'lsd' );
            if( activeEditHandler && lsd ) {
                var dataSource = activeEditHandler ? activeEditHandler.getDataSource() : null;
                 if( dataSource ) {
                    var modifyPropVMo = dataSource.getAllModifiedPropertiesWithVMO();
                    var isMatchFound = false;
                    if( modifyPropVMo && modifyPropVMo.length > 0 ) {
                        for( var idx = 0; idx < modifyPropVMo.length; idx++ ) {
                            var vmoObject = modifyPropVMo[idx ];
                            if( vmoObject && latestObject && vmoObject.uid === latestObject.uid ) {
                                if( vmoObject.viewModelProps ) {
                                    isMatchFound = true;
                                    _.forEach( vmoObject.viewModelProps, function( prop ) {
                                        prop.sourceObjectLastSavedDate = lsd;
                                    } );
                                }
                            }
                        }
                    }
                    // Editing the table properties through start edit and then change the view mode to list
                    // that it shows save/discard message and clicking on that it will save the properties
                    if( !isMatchFound ) {
                        var _modProps = dataSource ? dataSource.getAllEditableProperties() : null;
                        if( _modProps && _modProps.length > 0 ) {
                            _.forEach( _modProps, function( prop ) {
                                prop.sourceObjectLastSavedDate = lsd;
                            } );
                        }
                    }
                }
            }
        } );
    }
};

/**
 *
 * getPerformAction3Input
 *
 * @function getPerformAction3Input
 */
export let setViewedByMeIfNeeded = function( mo ) {
    var validEPMTask = exports.getValidEPMTaskObject( mo.uid );
    var supportingObject = mo.type === 'Signoff' ? mo : null;

    if( validEPMTask && !exports.checkTaskViewedByMe( validEPMTask ) ) {
        if( isPlatformVersionSupported() ) {
            var inputData = getPerformAction3Input( validEPMTask, supportingObject, 'SOA_EPM_set_task_prop_action',
                'true' );
            var lsdPolicy = {
                types: [ {
                        name: 'EPMTask',
                        properties: [
                            {
                                name: 'lsd'
                            }
                        ]
                    },
                    {
                        name: 'Signoff',
                        properties: [ {
                            name: 'lsd'
                        } ]
                    }
                ]
            };
            var lsdPolicyObject = policySvc.register( lsdPolicy );
            soaSvc.postUnchecked( "Workflow-2014-06-Workflow", "performAction3", inputData ).then(
                function() {
                    policySvc.unregister( lsdPolicyObject );
                    var object = cdmService.getObject( mo.uid );
                    _updateEditPropLSD( object);
                    eventBus.publish( "workflow.updateTaskCount" );
                },
                function( error ) {
                    policySvc.unregister( lsdPolicyObject );
                    var object = cdmService.getObject( mo.uid );
                    _updateEditPropLSD( object);
                }
            );
        } else {
            var inputData2 = setPropertiesInput( validEPMTask );

            soaSvc.postUnchecked( 'Core-2010-09-DataManagement', 'setProperties', inputData2 );
        }
    }
};

/**
 *
 * navigate
 *
 * @function navigate
 */
export let navigate = function() {
    var showObject = 'myTasks';
    var toParams = {};
    var options = {};

    toParams.userId = appCtxSvc.ctx.selected.uid;
    options.inherit = false;
    AwStateService.instance.go( showObject, toParams, options );
};
/**
 *
 * Modify search results returned from SOA to add unRead flag on the vmo. 
 * Subscribe to "cdm.modified" to update unRead flag.
 *
 * @function getSearchResults
 * 
 * @param uid uid of the cell that is read
 * 
 * @returns vmos 
 */

export let getSearchResults = function(data) {
    var vmos = [];
    if(data.searchResultsJSON){
        var jsonObjs = (JSON.parse(data.searchResultsJSON)).objects;
        //transverse through all the objects returned by SOA to add unRead flag.
        _.forEach( jsonObjs, function( obj ) {
            var uid = obj.uid;
            var currentObj = cdmService.getObject(uid);
            var vmo = viewModelObjectSvc
            .constructViewModelObjectFromModelObject( currentObj, 'Edit' );
            var validEPMTaskObject = getValidEPMTaskObject( uid );
            if( validEPMTaskObject ) {
                vmo.isUnread = !checkTaskViewedByMe( validEPMTaskObject );
            }
            vmos.push(vmo);
        });
    }
    return vmos;
};

/**
 *
 * Unsubscribes cdm.modified event on unMount.
 *
 * @function unsubscribeCdmModified
 * 
 */
export let unsubscribeCdmModified = function(){
    if(onObjectsModifiedListener !== null){
        eventBus.unsubscribe( onObjectsModifiedListener );
        onObjectsModifiedListener = null;
    }
};

/**
 *
 * Update is unRead flag if object is modified.
 *
 * @function updateUnreadFlag
 * 
 * @param data
 * 
 */
export let updateUnreadFlag = function(data){
    var modifiedObjects = data.eventData.modifiedObjects;
    var changedObj = appCtxSvc.getCtx('selected');
    if( changedObj && modifiedObjects && modifiedObjects.length > 0 ) {
        //If the something about the task attached to our VMO changes
        var validEPMTask = getValidEPMTaskObject( changedObj.uid );
        modifiedObjects.forEach( function( mo ) {
            if( validEPMTask && mo && mo.uid === validEPMTask.uid ) {
                //Update unread on the scope.
                changedObj.isUnread = !checkTaskViewedByMe( mo );
            }
        } );
    }
};

export default exports = {
    getValidEPMTaskObject,
    checkTaskViewedByMe,
    setViewedByMeIfNeeded,
    navigate,
    getSearchResults,
    unsubscribeCdmModified,
    updateUnreadFlag
};
/**
 * This is the primary service used to manage model objects as they relate to inbox.
 *
 * @memberof NgServices
 * @member awInboxServiceService
 */
app.factory( 'awInboxService', () => exports );
