// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0NewWorkflowProcessCommandHandler
 */
import * as app from 'app';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import messagingService from 'js/messagingService';
import commandPanelService from 'js/commandPanel.service';
import appCtx from 'js/appCtxService';
import adapterSvc from 'js/adapterService';
import cdm from 'soa/kernel/clientDataModel';
import notyService from 'js/NotyModule';
import _ from 'lodash';
import workflowPopupSvc from 'js/Awp0WorkflowPopupService';
import workflowAssinmentUtilSvc from 'js/Awp0WorkflowAssignmentUtils';

var exports = {};

/**
 * Checks if the object is checked out and returns true if it is a checked out and false otherwise.
 * @param {object} object - the object to check
 * @return true if checked out false otherwise
 */
var isCheckedOut = function( object ) {
    var propCheckedOut = object.props.checked_out_user;
    return typeof propCheckedOut !== typeof undefined && propCheckedOut.dbValues && propCheckedOut.dbValues.length > 0 && propCheckedOut.dbValues[ 0 ] && propCheckedOut.dbValues[ 0 ] !== '';
};

/**
 * Checks if the object is applicable to show the submit to workflow command.
 * @param {object} object - Selected object
 * @param {object} data - The data of the context.
 */
var isSupported = function( object, data ) {
    var isSupported = true;
    var isSupportedStringValue = null;
    for( var idx in data.applicableTypes ) {
        if( data.applicableTypes[ idx ].key.typeName === object.type ) {
            isSupportedStringValue = data.applicableTypes[ idx ].value;
            break;
        }
    }
    if( isSupportedStringValue && String( isSupportedStringValue ).toLowerCase() === 'false' ) {
        isSupported = false;
    }
    return isSupported;
};

/**
 * This will set the register context depends on the selections.
 * @param {objectArray} selections - the selection
 */
var setModelObject = function( selections ) {
    if( typeof selections !== typeof undefined ) {
        var catArrayJso = [];
        adapterSvc.getAdaptedObjects( selections ).then( function( adaptedObjs ) {
            // Remove the duplicates if present in adaptedObjs list. Fix for defect # LCS-218095
            var finalAdaptedList = _.uniqWith( adaptedObjs, function( objA, objB ) {
                return objA.uid === objB.uid;
            } );
            catArrayJso.push( finalAdaptedList );
            var jso = {
                workFlowObjects: catArrayJso[ 0 ]
            };

            appCtx.registerCtx( 'workflow_process_candidates', jso );
        } );
    } else {
        appCtx.unRegisterCtx( 'workflow_process_candidates' );
    }
};
/**
 * This will check for the case for warning message and open the panel based on the action.
 * @param {objectsArray} selections - selected object list.
 * @param {object} data - data of the context object.
 * @param {object} ctx - context object.
 */
export let populateErrorMessage = function( selections, data, ctx ) {
    var popUpMessage = '';
    var nonSubmittables = [];
    var finalMessage;

    let local = {anchor: 'workflow_popup_panel_anchor'};
    if ( ctx.mselected.length > 0) {
        local.caption = data.i18n.Workflow_Title;
    }
    else {
        local.caption = data.i18n.createWorkflow;
    }
    var input = {
         locals: local,
        options : {
            height: 800,
            width: 600,
            draggable: true,
            isModal: false,
            placement: 'left-end',
            reference: '.aw-layout-infoCommandbar',
            detachMode: true,
            disableClose: true
        },
        declView: 'Awp0SubmitToWorkflowPopUp'
    };
    if( !( ctx.activeToolsAndInfoCommand && ctx.activeToolsAndInfoCommand.commandId === 'Awp0NewWorkflowProcess' ) && !ctx.submitWorkflowPopupCtx ) {
        selections.forEach( function( modelObject ) {
            var iModelObject = cdm.getObject( modelObject.uid );

            if( !isSupported( iModelObject, data ) ) {
                // Here in non submittable list i am adding modelObject instead iModelObject as modelObject
                // will be ViewModelObejct and iModelObject will be ModelObejct and when we set the valid selection
                // on context it will find out the difference correctly. So doing this difference
                nonSubmittables.push( modelObject );
                var nonApplicableObj = TypeDisplayNameService.instance.getDisplayName( iModelObject );
                popUpMessage = popUpMessage.concat( messagingService.applyMessageParams( data.i18n.objNotItemRevision, [ '{{nonApplicableObj}}' ], { nonApplicableObj: nonApplicableObj } ) ).concat( '</br>' );
            } else {
                if( isCheckedOut( iModelObject ) ) {
                    nonSubmittables.push( modelObject );
                    var checkedOutObject = TypeDisplayNameService.instance.getDisplayName( iModelObject );
                    popUpMessage = popUpMessage.concat( messagingService.applyMessageParams( data.i18n.checkedOutError, [ '{{checkedOutObject}}' ], { checkedOutObject: checkedOutObject } ) ).concat( '</br>' );
                }
            }
        } );
        if( popUpMessage.length > 0 ) {
            var cannotBeSubmiitedCount = selections.length - nonSubmittables.length;
            var totalSelectedObj = selections.length;

            var message = messagingService.applyMessageParams( data.i18n.someSubmittableObjects, [ '{{cannotBeSubmiitedCount}}', '{{totalSelectedObj}}' ], {
                cannotBeSubmiitedCount: cannotBeSubmiitedCount,
                totalSelectedObj: totalSelectedObj
            } );
            finalMessage = message.concat( '</br>' ).concat( popUpMessage );
        }

        if( nonSubmittables.length === 0 ) {
            setModelObject( selections );
            _openSubmitWorkflowPanel( ctx, input, true, 'Awp0NewWorkflowProcess' );
        } else {
            var buttons = [ {
                    addClass: 'btn btn-notify',
                    text: data.i18n.CancelText,
                    onClick: function( $noty ) {
                        $noty.close();
                    }
                },
                {
                    addClass: 'btn btn-notify',
                    text: data.i18n.Proceed,
                    onClick: function( $noty ) {
                        $noty.close();
                        setModelObject( _.difference( selections, nonSubmittables ) );
                        _openSubmitWorkflowPanel( ctx, input, true, 'Awp0NewWorkflowProcess' );
                    }
                }
            ];
            notyService.showWarning( finalMessage, buttons );
        }
    } else {
        _openSubmitWorkflowPanel( ctx, input, false, 'Awp0NewWorkflowProcess' );
    }
};

/**
 * Open or close the popup panel.
 *
 * @param {Object} ctx Context service
 * @param {Object} input Input object to bring up the panel
 */
var _openSubmitWorkflowPanel = function( ctx, input, isOpenCase, panelId ) {
    var isNarrowMode = workflowAssinmentUtilSvc.isNarrowMode();
    // isNarrowMode = true;
    if( isOpenCase ) {
        if( isNarrowMode ) {
            commandPanelService.activateCommandPanel( panelId, 'aw_toolsAndInfo' );
            return;
        }
        ctx.submitWorkflowPopupCtx = true;
        if( input ) {
            workflowPopupSvc.openPopupPanel( input, true );
        }
        return;
    }
    if( !isNarrowMode ) {
        appCtx.unRegisterCtx( 'submitWorkflowPopupCtx' );
        workflowPopupSvc.hidePopupPanel();
        return;
    }
    commandPanelService.activateCommandPanel( panelId, 'aw_toolsAndInfo' );
};

/**
 * This function will get the input for the getTypeConstants SOA.
 * @param {objectArray} selections - the list of selections objects.
 * @param {object} data - The data object.
 */
export let getTheBOType = function( selections, data ) {
    var input = [];
    var constantName = 'Awp0WorkflowSubmittable';
    selections.forEach( function( selected ) {
        var keys = {
            constantName: constantName,
            typeName: selected.type

        };
        input.push( keys );
    } );
    data.inputForGetTypeConstantValues = input;
};

/**
 * Based on selected obejct get all root target attachments and set it on context and bring
 * up the create sub process panel.
 *
 * @param {Object} selectedObject Selected object from UI for sub process need to be created
 * @param {Object} data data
 * @param {Object} ctx Context service
 */
export let openCreateSubProcessCommandPanel = function( selectedObject, data, ctx ) {
    if( !selectedObject ) {
        return;
    }
    var rootTargetObjects = [];
    if( ( selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1 || selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) && selectedObject.props.root_target_attachments ) {
        _.forEach( selectedObject.props.root_target_attachments.dbValues, function( rootDBValue ) {
            var modelObject = cdm.getObject( rootDBValue );
            if( modelObject ) {
                rootTargetObjects.push( modelObject );
            }
        } );
    }
    setModelObject( rootTargetObjects );
    var input = {
        locals: {
           caption: data.i18n.createWorkflowSubProcess,
           anchor: 'workflow_popup_panel_anchor'
       },
       options : {
           height: 800,
           width: 600,
           draggable: true,
           isModal: false,
           placement: 'left-end',
           reference: '.aw-layout-infoCommandbar',
           detachMode: true,
           disableClose: true
       },
       declView: 'Awp0CreateWorkflowSubProcessPopUp'
   };
    _openSubmitWorkflowPanel( ctx, input, true, 'Awp0CreateWorkflowSubProcess' );
};

export default exports = {
    populateErrorMessage,
    getTheBOType,
    openCreateSubProcessCommandPanel
};
/**
 * Service for New Workflow Process.
 *
 * @member Awp0NewWorkflowProcessCommandHandler
 * @memberof NgServices
 */
app.factory( 'Awp0NewWorkflowProcessCommandHandler', () => exports );
