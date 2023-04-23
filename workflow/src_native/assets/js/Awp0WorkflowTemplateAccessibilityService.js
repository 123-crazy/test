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
 * This implements the workflow template acessibility related methods.
 *
 * @module js/Awp0WorkflowTemplateAccessibilityService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import clientDataModel from 'soa/kernel/clientDataModel';
import workflowUtils from 'js/Awp0WorkflowDesignerUtils';
import editService from 'js/Awp0WorkflowAssignmentEditService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _ from 'lodash';
import eventBus from 'js/eventBus';


var exports = {};
var parentData = null;

/**
 * This method is used to fetch the acl corresponding to selected Task template object
 * @param {Object} data Data view model object
 * @param {Object} templateObject EPM task object
 * @returns {Object} selectedAcl is the acl present on selected template
 */
var _getSelectedACLValue = function( data, templateObject ) {
    data.setRuleBasedProtectionHandler = null;
    if( !templateObject ) {
        return '';
    }

    var selectedTemplate = clientDataModel.getObject( templateObject.uid );
    var selectedAcl = '';
    // Fetch handler EPM-set-rule-based-protection present on the template
    var actionHandlerArray = workflowUtils.getActionHandlerOnProp( selectedTemplate, 'start_action_handlers', 'EPM-set-rule-based-protection' );
    _.forEach( actionHandlerArray, function( actionHandler ) {
        if ( actionHandler && actionHandler.props && actionHandler.props.arguments && actionHandler.props.arguments.dbValues ) {
            data.setRuleBasedProtectionHandler = actionHandler;
            var argumentValues = workflowUtils.parseHandlerArguments( actionHandler.props.arguments.dbValues[0] );

            // Fetch value for argument '-acl'
            if ( argumentValues && argumentValues['-acl'] ) {
                selectedAcl = argumentValues['-acl'];
            }
        }
    } );
    return selectedAcl;
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
 * This method is used to extract ACL names from aclNameInfos objects
 * @param {Array} aclNameInfos aclNameInfos objects array that contains the ACL name
 * @returns {Array} aclList that will contain acl internal and display value
 */
var _getACLNames = function( aclNameInfos ) {
    var aclList = [];
    aclList.push( _getEmptyListModel() );
    _.forEach( aclNameInfos, function( aclNameInfos ) {
        if( aclNameInfos ) {
            var object = {
                propDisplayValue: aclNameInfos.aclName,
                propDisplayDescription: '',
                propInternalValue: aclNameInfos.aclName
            };

            aclList.push( object );
        }
    } );
    // Sort the acl list by default with display name
    aclList = _.sortBy( aclList, 'propDisplayValue' );
    return aclList;
};

/**
 * This method is used to populate the named system and named workflow acls
 * @param {Object} data Data view model object
 * @param {Object} ctx Context object
 */
export let populateNamedACLList = function( data, ctx ) {
    parentData = data;
    var isPanelEditable = workflowUtils.isTemplateEditMode( ctx.xrtSummaryContextObject, ctx );
    var selectedObject = clientDataModel.getObject( ctx.selected.uid );
    var vmoObject = viewModelObjectSvc.createViewModelObject( selectedObject.uid );
    data.vmo = vmoObject;
    // Check if property is true then only add the edit handler
    if( isPanelEditable ) {
        exports.addEditHandler( data );
    }

    //set editibility as per fetched editibility
    data.isPanelEditable = isPanelEditable;
    data.aclList.isEditable = isPanelEditable;
    data.aclList.isEnabled = isPanelEditable;
    // Set teh default value to system acl if acl not present
    data.aclType.dbValue = 'system';

    //Fetch the named system acls
    if( data.systemACLs && !ctx.systemAclList ) {
        ctx.systemAclList = _getACLNames( data.systemACLs );
    }

    //Fetch the named workflow acls
    if( data.workflowACLs && !ctx.workflowAclList ) {
        ctx.workflowAclList = _getACLNames( data.workflowACLs );
    }

    // Fetch acl present on the selected Task template
    var selectedAcl = _getSelectedACLValue( data, ctx.selected );

    // Find the acl type for the selected acl
    if( selectedAcl ) {
        var aclObject =  _.find( ctx.workflowAclList, function( aclName ) {
            return aclName.propDisplayValue === selectedAcl;
        } );

        if( aclObject ) {
            data.aclType.dbValue = 'workflow';
            data.aclNameInfoObjects = ctx.workflowAclList;
        } else {
            aclObject =  _.find( ctx.systemAclList, function( aclName ) {
                return aclName.propDisplayValue === selectedAcl;
            } );
            data.aclType.dbValue = 'system';
            data.aclNameInfoObjects = ctx.systemAclList;
        }
    } else {
        data.aclNameInfoObjects = ctx.systemAclList;
    }

    // Populate the acl name and acl type radio button as per existing acl
    data.aclList.dbValue = selectedAcl;
    data.aclList.uiValue = selectedAcl;
    // Fix for defect # LCS-324449. Set the dbOriginalValue and uiOriginalValue on list widget correctly
    // as these are being used to check if widget is modifed or not and it will be useful for save discard message cases.
    data.aclList.dbOriginalValue = selectedAcl;
    data.aclList.uiOriginalValue = selectedAcl;
    data.selectedACLValue.dbValue = selectedAcl;
    data.selectedACLValue.uiValue = selectedAcl;
    data.vmo.props.aclList = data.aclList;
    data.vmo.props.aclList.valueUpdated = false;
    data.vmo.props.aclList.displayValueUpdated = false;
};

/**
 * This method is used to set the LOV values as per the ACL type radio box selection.
 * @param {Object} data Data view model object
 * @param {Object} ctx Context object
 */
export let changeAclType = function( data, ctx ) {
    // If system acl type is selected, fetch named system acls
    if ( data.aclType.dbValue === 'system' && ctx.systemAclList ) {
        data.aclNameInfoObjects = ctx.systemAclList;
        var aclValue = data.selectedACLValue.dbValue;
        var aclObject =  _.find( ctx.systemAclList, function( aclName ) {
            return aclName.propDisplayValue === aclValue;
        } );
        if( !aclObject ) {
            data.aclList.dbValue = '';
            data.aclList.uiValue = '';
        }
    }
    //Fetch  named workflow acl list
    else if( data.aclType.dbValue === 'workflow' && ctx.workflowAclList ) {
        data.aclNameInfoObjects = ctx.workflowAclList;
        var aclValue = data.selectedACLValue.dbValue;
        var aclObject =  _.find( ctx.workflowAclList, function( aclName ) {
            return aclName.propDisplayValue === aclValue;
        } );
        if( !aclObject ) {
            data.aclList.dbValue = '';
            data.aclList.uiValue = '';
        }
    }
};

/**
 * This method is used to save the ACL on selected EPM task by deleting the acl, or by creating or updating the
 * EPM-set-rule-based-protection action handler.
 * @param {Object} selected Data view model object
 * @param {Boolean} isUpdate specifies if the panel update is required
 */
export let saveTemplateAccessibility = function( selected, isUpdate ) {
    if ( selected && parentData && parentData.vmo && parentData.vmo.uid )   {
        var isDeleteCase = false;

        var createUpdateACLObject = null;

        var handlerAdditionalData =  {};
        handlerAdditionalData['-acl'] = [ parentData.aclList.dbValue ];

        if ( parentData.setRuleBasedProtectionHandler )  {
            if( !parentData.aclList.dbValue || parentData.aclList.dbValue === '' ) {
                // If the handler exists then delete the handler
                soaSvc.post( 'Core-2006-03-DataManagement', 'deleteObjects', { objects: [ parentData.setRuleBasedProtectionHandler ] } );
                eventBus.publish( 'epmTaskTemplate.updatePanel' );
                isDeleteCase = true;
            } else {
                // If the handler exists then update the handler
                createUpdateACLObject = {
                    clientID: 'updateHandler -updateACL' + parentData.setRuleBasedProtectionHandler.uid,
                    handlerToUpdate: parentData.setRuleBasedProtectionHandler.uid,
                    additionalData: handlerAdditionalData
                };
            }
        } else {
            // Create new handler
            createUpdateACLObject = {
                clientID: 'createHandler -CreateACL' + parentData.vmo.uid,
                handlerName: 'EPM-set-rule-based-protection',
                taskTemplate : parentData.vmo.uid,
                handlerType : 'Action',
                action : 2,
                additionalData : handlerAdditionalData
            };
        }
        // Call createOrUpdateHandler SOA
        if( !isDeleteCase ) {
            var soaInput = [];
            soaInput = {
                input: [ createUpdateACLObject ]
            };

            soaSvc.post( 'Workflow-2019-06-Workflow', 'createOrUpdateHandler', soaInput ).then( function( response ) {
                if ( isUpdate ) {
                    eventBus.publish( 'epmTaskTemplate.updatePanel' );
                }
            } );
        }
    }
};


/**
 * Creates an edit handler for the view model object.
 * @param {Object} data Data view model object
 *
 */
export let addEditHandler = function( data ) {
    //Save edit
    var saveEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();
        if( data && data.vmo ) {
            exports.saveTemplateAccessibility( data.vmo, false );
        }
        deferred.resolve( {} );
        return deferred.promise;
    };

    //Cancel edit
    var cancelEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();
        if( data && data.vmo ) {
            data.vmo.clearEditiableStates( true );
        }
        deferred.resolve( {} );
        return deferred.promise;
    };

    // Pass true as last argument to enable auto save
    editService.createEditHandlerContext( data, null, saveEditFunc, cancelEditFunc, 'TEMPLATE_ACL_EDIT', null, true );
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
    populateNamedACLList,
    changeAclType,
    saveTemplateAccessibility,
    addEditHandler,
    initializeParentData
};

/**
 * Define template accessibility panel service
 *
 * @memberof NgServices
 * @member Awp0WorkflowTemplateAccessibilityService
 */
app.factory( 'Awp0WorkflowTemplateAccessibilityService', () => exports );
