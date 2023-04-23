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
 * @module js/Awp0WorkflowTemplateFormPanelService
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';
import _ from 'lodash';

var exports = {};

/**
 * This method is used to get the LOV values for the release status list.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getFormTypeList = function( response ) {
    var formTypeList = [];
    _.forEach( response.searchResults, function( searchResults ) {
        if( searchResults ) {
            var statusObject = cdm.getObject( searchResults.uid );
            var object = {
                propDisplayValue: statusObject.props.object_string.uiValues[ 0 ],
                propDisplayDescription: '',
                propInternalValue: statusObject.props.object_string.dbValues[ 0 ]
            };

            formTypeList.push( object );
        }
    } );
    // Sort the release status list by default with dispaly name
    formTypeList = _.sortBy( formTypeList, 'propDisplayValue' );
    return formTypeList;
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

    // Set the notify when option value based on select handler object and set the edit state
    if( handlerContextObject.props.formType && handlerContextObject.props.formType.dbValue &&
        handlerContextObject.props.formType.uiValue ) {
        data.formTypesList.dbValue = handlerContextObject.props.formType.dbValue;
        data.formTypesList.uiValue = handlerContextObject.props.formType.uiValue;
    }

    data.formTypesList.isEditable = isEditable;
    data.formDescription.isEditable = isEditable;
    data.formTargetList.isEditable = isEditable;
    data.formName.isEditable = isEditable;

    // Get all handler arguments from handler object and based on values update the UI.
    var argumentValues = Awp0WorkflowDesignerUtils.parseHandlerArguments( handlerContextObject.handlerObject.props.arguments.dbValues );

    if( argumentValues ) {
        // Check if comment arguemnt present then set the message value
        if( argumentValues[ '-description' ] ) {
            data.formDescription.dbValue = argumentValues[ '-description' ];
            data.formDescription.uiValue = argumentValues[ '-description' ];
        }
        // Check if subject arguemnt present then set the subject value
        if( argumentValues[ '-target_task' ] ) {
            data.formTargetList.dbValue = argumentValues[ '-target_task' ];
        }
        if( argumentValues[ '-name' ] ) {
            data.formName.dbValue = argumentValues[ '-name' ];
            data.formName.uiValue = argumentValues[ '-name' ];
        }
    }
};

/**
 * Populate the panel with all relevant information that need to be shown.
 * @param {Object} data Data view model object
 * @param {Object} ctx Context object
 */
export let populatePanelData = function( data, ctx ) {
    // Get the tempalte is in edit mode or not and based on that populate the panel.
    var isPanelEditable = Awp0WorkflowDesignerUtils.isTemplateEditMode( ctx.xrtSummaryContextObject, ctx );
    data.isPanelEditable = isPanelEditable;

    // Check if workflowTabContext is not null then populate the handler options and recipients
    if( ctx.workflowTabContext ) {
        _populateHandlerOptions( data, ctx.workflowTabContext.handlerContextObject, data.isPanelEditable );
    }
};

/**
 * Create or update case set the values in input additional data
 * @param {Object} data Data view model object
 * @param {Object} additinalData Additianl data that will contain all handler arguments to set
 * @param {boolean} isDisplayForm Display form case or not. Contains true or false value
 */
var _createOrUpdateFormHandlerInputData = function( data, additinalData, isDisplayForm ) {
    additinalData[ '-type' ] = [ data.formTypesList.dbValue ];

    // In case of dispaly form we need to add source_task and in create form case it should be target_task.
    if( isDisplayForm ) {
        additinalData[ '-source_task' ] = [ data.formTargetList.dbValue ];
    } else {
        if( data.formDescription.dbValue || data.formDescription.dbValue === '' ) {
            additinalData[ '-description' ] = [ data.formDescription.dbValue ];
        }

        if( data.formName.dbValue || data.formName.dbValue === '' ) {
            additinalData[ '-name' ] = [ data.formName.dbValue ];
        }

        additinalData[ '-target_task' ] = [ data.formTargetList.dbValue ];
    }
};

/**
 * Create the input structure for late notification handler
 * @param {Object} data Data view model object
 *
 * @param {Object} selected Selected template object from UI
 * @param {Object} handlerContextObject If user selected any handler form notification table then contian that
 *                 handler object else null
 *
 * @returns {Array} Create or update handler SOA input structure array
 */
var _getUpdateOrCreateHandlerInput = function( data, selected, handlerContextObject ) {
    var input = [];
    // Check if handler context is not null that means it's update handler case
    // otherwise it will be create handler case
    if( handlerContextObject && handlerContextObject.handlerObjects ) {
        _.forEach( handlerContextObject.handlerObjects, function( handlerObject ) {
            var updateAdditionalData = {};
            if( handlerObject.props && handlerObject.props.handler_name && handlerObject.props.handler_name.dbValues &&
                handlerObject.props.handler_name.dbValues[ 0 ] ) {
                var isDisplayForm = false;
                var handlerName = handlerObject.props.handler_name.dbValues[ 0 ];
                if( handlerName === 'EPM-display-form' ) {
                    isDisplayForm = true;
                }
                _createOrUpdateFormHandlerInputData( data, updateAdditionalData, isDisplayForm );

                // Update the addiitonal data if handler has some other arguemtns defiend. This is needed
                // as server replace the all arguemnts from handler based on passed arguments.
                Awp0WorkflowDesignerUtils.updateAdditionalDataWithOtherArguments( handlerObject, updateAdditionalData );

                var updateObject = {
                    clientID: 'updateHandler -' + handlerObject.uid,
                    handlerToUpdate: handlerObject.uid,
                    additionalData: updateAdditionalData
                };
                input.push( updateObject );
            }
        } );
    } else {
        var createFormAdditionalData = {};
        _createOrUpdateFormHandlerInputData( data, createFormAdditionalData, false );
        var createFormObject = {
            clientID: 'createHandler -CreateForm' + selected.uid,
            handlerName: 'EPM-create-form',
            taskTemplate: selected.uid,
            handlerType: 'Action',
            action: 2,
            additionalData: createFormAdditionalData
        };
        input.push( createFormObject );

        var displayFormAdditionalData = {};
        _createOrUpdateFormHandlerInputData( data, displayFormAdditionalData, true );

        var dispalyFormObject = {
            clientID: 'createHandler -DisplayForm' + selected.uid,
            handlerName: 'EPM-display-form',
            taskTemplate: selected.uid,
            handlerType: 'Action',
            action: 100,
            additionalData: displayFormAdditionalData
        };
        input.push( dispalyFormObject );

        var epmHoldRuleHandlerObject = {
            clientID: 'createHandler -epmHold' + selected.uid,
            handlerName: 'EPM-hold',
            taskTemplate: selected.uid,
            handlerType: 'Rule',
            action: 4
        };
        input.push( epmHoldRuleHandlerObject );
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
    input = _getUpdateOrCreateHandlerInput( data, selected, selectedHandlerContext, isCreateCase );
    return input;
};

export default exports = {
    getFormTypeList,
    populatePanelData,
    getCreateOrUpdateHandlerInput
};
/**
 * Define form panel service
 *
 * @memberof NgServices
 * @member Awp0WorkflowTemplateFormPanelService
 */
app.factory( 'Awp0WorkflowTemplateFormPanelService', () => exports );
