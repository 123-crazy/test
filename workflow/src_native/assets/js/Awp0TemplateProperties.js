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
 * @module js/Awp0TemplateProperties
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';
import Awp0TemplatePropertiesEditService from 'js/Awp0TemplatePropertiesEditService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import uwPropertyService from 'js/uwPropertyService';
import listBoxService from 'js/listBoxService';
import parsingUtils from 'js/parsingUtils';

import _ from 'lodash';
import eventBus from 'js/eventBus';

var parentData = null;

/**
 * Define public API
 */
var exports = {};

/**
 * Populate the value and update the widget value with respective value.
 *
 * @param {Object} modelObject Selected Model object
 * @param {String} propName Property name whose value needs to be fetched
 * @param {Object} propDispObject Property widget where value needs to be populated
 * @param {boolean} isBoolean True/False, True will only be for boolean property
 * @param {boolean} isEditable True/False, True when value needs to be in edit or not
 */
var _populatePropValue = function( modelObject, propName, propDispObject, isBoolean, isEditable ) {
    var dbValue = '';
    var uiValue = '';
    if( modelObject && propName && modelObject.props[ propName ] ) {
        var propObject = modelObject.props[ propName ];
        if( propObject && propObject.dbValues && propObject.dbValues[ 0 ] ) {
            dbValue = propObject.dbValues[ 0 ];

            if( isBoolean ) {
                dbValue = dbValue === '1';
            }
        }

        if( propObject && propObject.uiValues && propObject.uiValues[ 0 ] ) {
            uiValue = propObject.uiValues[ 0 ];
        }
        // For fnd0AsyncPriority default value needs to be set as '1'
        if( propName === 'fnd0AsyncPriority' && propObject.dbValues && propObject.dbValues[0] === null ) {
            dbValue = '1';
            uiValue = '1';
        }
    }
    propDispObject.dbValue = dbValue;
    propDispObject.uiValue = uiValue;
    propDispObject.isEditable = isEditable;
    propDispObject.isEnabled = isEditable;
    propDispObject.valueUpdated = false;
    propDispObject.displayValueUpdated = false;
    modelObject.props[ propName ] = propDispObject;
    propDispObject.parentUid = modelObject.uid;
    propDispObject.propInternalName = propName;
};

/**
 * Check if input task type EPMConditionTaskTemplate then populate the condition task properties
 * to show different criteria.
 *
 * @param {Object} data - the data Object
 * @param {Object} selection - the current selection object
 * @param {Boolean} isEditable True/False based on proeprty is editable or not
 */
var _populateConditionTaskTemplateOptions = function( data, selection, isEditable ) {
    data.setConditionHandler = null;
    if( selection && selection.modelType.typeHierarchyArray.indexOf( 'EPMConditionTaskTemplate' ) <= -1 ) {
        return;
    }

    data.queryScope.isEditable = isEditable;
    data.queryScope.isEnabled = isEditable;
    data.vmo.props.queryScope = data.queryScope;
    data.queryAganist.isEditable = isEditable;
    data.queryAganist.isEnabled = isEditable;
    data.vmo.props.queryAganist = data.queryAganist;
    data.savedQueries.isEditable = isEditable;
    data.savedQueries.isEnabled = isEditable;
    data.savedConditions.isEditable = isEditable;
    data.savedConditions.isEnabled = isEditable;
    data.vmo.props.savedConditions = data.savedConditions;
    data.queryCondition.isEditable = isEditable;
    data.queryCondition.isEnabled = isEditable;
    data.vmo.props.savedQueries = data.savedQueries;
    data.savedQueries.valueUpdated = false;
    data.includeRepliaceTarget.isEditable = isEditable;
    data.includeRepliaceTarget.isEnabled = isEditable;
    data.vmo.props.includeRepliaceTarget = data.includeRepliaceTarget;

    selection = cdm.getObject( selection.uid );

    data.currentQuery.dbValue = '(' + data.i18n.emptyQuery + ')' + '  [ ' + data.i18n.all + ' ]';
    data.currentQuery.uiValue = '(' + data.i18n.emptyQuery + ')' + '  [ ' + data.i18n.all + ' ]';
    data.currentCondition.dbValue = '(' + data.i18n.emptyQuery + ')' + '  [ ' + data.i18n.all + ' ]';
    data.currentCondition.uiValue = '(' + data.i18n.emptyQuery + ')' + '  [ ' + data.i18n.all + ' ]';
    data.queryScope.dbValue = 'all';
    data.queryAganist.dbValue = 'target';
    data.includeRepliaceTarget.dbValue = false;
    data.savedQueries.dbValue = null;
    data.savedQueries.uiValue = null;
    data.savedConditions.dbValue = null;
    data.savedConditions.uiValue = null;

    // Get the set condition handler and based on argument values update the panel.
    var actionHandlers = Awp0WorkflowDesignerUtils.getActionHandler( selection, 'EPM-set-condition' );
    if( actionHandlers && actionHandlers.length > 0 && actionHandlers[ 0 ] ) {
        var setConditionHandler = actionHandlers[ 0 ];
        data.setConditionHandler = setConditionHandler;
        if( setConditionHandler.props.arguments && setConditionHandler.props.arguments.dbValues &&
            setConditionHandler.props.arguments.dbValues[ 0 ] ) {
            var queryScope = 'all';
            var queryName = null;
            var conditionName = null;
            var argumentValues = Awp0WorkflowDesignerUtils.parseHandlerArguments( setConditionHandler.props.arguments.dbValues );
            if( argumentValues[ '-check_targets' ] ) {
                data.queryScope.dbValue = argumentValues[ '-check_targets' ];
                data.queryScope.value = argumentValues[ '-check_targets' ];
                queryScope = data.queryScope.dbValue;
            }

            if( argumentValues[ '-query_type' ] ) {
                data.queryAganist.dbValue = argumentValues[ '-query_type' ];
                data.queryAganist.value = argumentValues[ '-query_type' ];
            }
            data.queryAganist.isEditable = isEditable;
            data.queryAganist.isEnabled = isEditable;

            if( argumentValues[ '-query' ] ) {
                data.savedQueries.dbValue = argumentValues[ '-query' ];
                data.savedQueries.uiValue = argumentValues[ '-query' ];
                data.savedQueries.value = argumentValues[ '-query' ];
                queryName = data.savedQueries.dbValue;
                data.queryCondition.dbValue = 'query';
            }
            if( argumentValues[ '-condition_name' ] ) {
                data.savedConditions.dbValue = argumentValues[ '-condition_name' ];
                data.savedConditions.uiValue = argumentValues[ '-condition_name' ];
                data.savedConditions.value = argumentValues[ '-condition_name' ];
                conditionName = data.savedConditions.dbValue;
                data.queryCondition.dbValue = 'condition';
            }

            data.savedQueries.isEditable = isEditable;
            data.savedQueries.isEnabled = isEditable;

            if( argumentValues.hasOwnProperty( '-include_replica' ) ) {
                data.includeRepliaceTarget.dbValue = true;
                data.includeRepliaceTarget.value = true;
            }

            data.includeRepliaceTarget.isEditable = isEditable;
            data.includeRepliaceTarget.isEnabled = isEditable;

            if( queryScope && queryName && data.i18n[ queryScope ] ) {
                data.currentQuery.dbValue = queryName + '  [ ' + data.i18n[ queryScope ] + ' ]';
                data.currentQuery.uiValue = queryName + '  [ ' + data.i18n[ queryScope ] + ' ]';
            }
            if( queryScope && conditionName && data.i18n[ queryScope ] ) {
                data.condition = conditionName;
                data.currentCondition.dbValue = conditionName + '  [ ' + data.i18n[ queryScope ] + ' ]';
                data.currentCondition.uiValue = conditionName + '  [ ' + data.i18n[ queryScope ] + ' ]';
            }
        }
    }
};

/**
 * Check if input task type EPMAddStatusTaskTemplate then populate the release status.
 *
 * @param {Object} data - the data Object
 * @param {Object} selection - the current selection object
 * @param {Boolean} isEditable True/False based on proeprty is editable or not
 */
var _populateAddStatusTaskTemplateOptions = function( data, selection, isEditable ) {
    data.createStatusHandler = null;
    if( !selection ) {
        return;
    }
    // Reset to default values
    data.releaseStatus.dbValue = null;
    data.releaseStatus.uiValue = '';
    data.releaseStatus.isEditable = isEditable;
    data.releaseStatus.isEnabled = isEditable;

    // Get the set create status handler and based on argument values update the panel.
    var actionHandlers = Awp0WorkflowDesignerUtils.getActionHandler( selection, 'EPM-create-status' );
    if( actionHandlers && actionHandlers.length > 0 && actionHandlers[ 0 ] ) {
        var createStatusHandler = actionHandlers[ 0 ];
        data.createStatusHandler = createStatusHandler;
        if( createStatusHandler.props.arguments && createStatusHandler.props.arguments.dbValues &&
            createStatusHandler.props.arguments.dbValues[ 0 ] ) {
            var argumentValues = Awp0WorkflowDesignerUtils.parseHandlerArguments( createStatusHandler.props.arguments.dbValues );
            if( argumentValues[ '-status' ] ) {
                // This code is needed as when user clear the status LOV value from RAC
                // it add -status as null so to handler that case adding this code here.
                if( argumentValues[ '-status' ] === 'null' ) {
                    argumentValues[ '-status' ] = '';
                }
                data.releaseStatus.dbValue = argumentValues[ '-status' ];
                data.releaseStatus.uiValue = argumentValues[ '-status' ];
                data.releaseStatus.handlerUid = data.createStatusHandler.uid;
            }
        }
    }
    data.vmo.props.releaseStatus = data.releaseStatus;
    data.releaseStatus.parentUid = data.vmo.uid;
};

/**
 * Get the epm-create-status handler for selected template is present
 * and return if not present then return null.
 *
 * @return {Object} Handler object or null
 */
export let getEPMCreateStatusHandler = function() {
    if( !appCtxService.ctx || !appCtxService.ctx.selected ) {
        return null;
    }
    var selectedObject = cdm.getObject( appCtxService.ctx.selected.uid );
    // Get the set create status handler and based on argument values update the panel.
    var actionHandlers = Awp0WorkflowDesignerUtils.getActionHandler( selectedObject, 'EPM-create-status' );
    if( actionHandlers && actionHandlers.length > 0 && actionHandlers[ 0 ] ) {
        return actionHandlers[ 0 ];
    }
};

/**
 * Populate the task duration on the panel that needs to be displayed.
 *
 * @param {Object} data - the data Object
 * @param {Object} selection - the current selection object
 * @param {Boolean} isEditable True/False based on proeprty is editable or not
 */
var _populateTaskTemplateDurationData = function( data, selection, isEditable ) {
    if( !selection || !data.taskDuration ) {
        return;
    }
    // Reset to default values
    data.taskDuration.dbValue = '';
    data.taskDuration.uiValue = '';
    data.taskDuration.dispValue = '';
    data.taskDuration.isEditable = isEditable;
    data.taskDuration.isEnabled = isEditable;
    // Set the proeprty on selection so that it can be used in edit handler to check if property is modifeid or not
    selection.props.taskDuration = data.taskDuration;
    data.setDurationHandler = null;

    // Get the set duration handler and based on argument values update the panel.
    var actionHandlers = Awp0WorkflowDesignerUtils.getActionHandler( selection, 'EPM-set-duration' );
    if( actionHandlers && actionHandlers.length > 0 && actionHandlers[ 0 ] ) {
        var setDurationHandler = actionHandlers[ 0 ];
        data.setDurationHandler = setDurationHandler;
        // Get the valid handler arguemtn value and then it handler contians value then parse the
        // value to get only hour value and use that to show on UI.
        if( setDurationHandler.props.arguments && setDurationHandler.props.arguments.dbValues &&
            setDurationHandler.props.arguments.dbValues[ 0 ] ) {
            var argumentValues = Awp0WorkflowDesignerUtils.parseHandlerArguments( setDurationHandler.props.arguments.dbValues );
            var hourValue = Awp0WorkflowDesignerUtils.getSetDurationHours( data, argumentValues );
            if( hourValue > 0 ) {
                // Update the property value
                uwPropertyService.updateModelData( data.taskDuration, hourValue, [ hourValue.toString() ], false, isEditable, isEditable, {} );
            }
        }
    }
};

/**
 * Populate the properties on the panel and custom condition paths that needs to be displayed.
 *
 * @param {Object} data - the data Object
 * @param {Object} selection - the current selection object
 * @param {Object} ctx Context object
 */
export let populatePanelData = function( data, selection, ctx ) {
    var selectedObject;

    parentData = data;
    if( data && selection && selection.uid && ctx.xrtSummaryContextObject ) {
        var isPanelEditable = Awp0WorkflowDesignerUtils.isTemplateEditMode( ctx.xrtSummaryContextObject, ctx );
        selectedObject = cdm.getObject( selection.uid );
        var vmoObject = viewModelObjectSvc.createViewModelObject( selectedObject.uid );
        data.vmo = vmoObject;
        // Check if property is true then only add the edit handler
        if( isPanelEditable ) {
            Awp0TemplatePropertiesEditService.addEditHandler( data );
        }

        data.isPanelEditable = isPanelEditable;
        _populatePropValue( vmoObject, 'object_name', data.templateName, false, isPanelEditable );

        var instructionPropName = 'object_desc';
        if( selectedObject.props.fnd0Instructions ) {
            instructionPropName = 'fnd0Instructions';
        }
        // Populate the proeprty value for differnt widget
        _populatePropValue( vmoObject, instructionPropName, data.templateDesc, false, isPanelEditable );

        // Populate the task template type and if in editable then populate the value as task_type
        // property value
        exports.loadValidTaskTemplateTypes( data, vmoObject );

        _populatePropValue( vmoObject, 'show_in_process_stage_list', data.showInProcessStage, true, isPanelEditable );
        _populatePropValue( vmoObject, 'fnd0ExecuteAsync', data.processBackground, true, isPanelEditable );
        _populatePropValue( vmoObject, 'fnd0RequireCompleteConfirm', data.requireTaskConfirmation, true, isPanelEditable );
        _populatePropValue( vmoObject, 'fnd0StoreParticipantsOnJob', data.selectWorkflowParticipant, true, isPanelEditable );
        _populatePropValue( vmoObject, 'fnd0FilterCondition', data.filterCondition, false, isPanelEditable );
        _populatePropValue( vmoObject, 'fnd0DecisionSetLOV', data.decisionLabels, false, isPanelEditable );
        _populatePropValue( vmoObject, 'fnd0AsyncPriority', data.asyncPriority, false, isPanelEditable );
        _populateTaskTemplateDurationData( data, vmoObject, isPanelEditable );

        data.allowedDefaultObjectTypes.isEditable = isPanelEditable;
        data.allowedDefaultObjectTypes.isEnabled = isPanelEditable;
        // Set the proeprty on selection so that it can be used in edit handler to check if property is modifeid or not
        vmoObject.props.allowedDefaultObjectTypes = data.allowedDefaultObjectTypes;
    }
};

/**
 * Load all valid task template types based on current task template selection.
 *
 * @param {Object} data Data view model object
 * @param {Object} selection Selected obejct from UI.
 */
export let loadValidTaskTemplateTypes = function( data, selection ) {
    // Check if data and selection is not null then only get the types that will be shown in LOV
    if( data && selection && selection.uid && data.taskTemplateObjectTypes ) {
        var selectedObject = cdm.getObject( selection.uid );
        var taskTemplateTypeList = Awp0WorkflowDesignerUtils.getValidTaskTemplateTypeList( selectedObject, data.taskTemplateObjectTypes );
        data.taskTemplateTypeList = taskTemplateTypeList;
        if( data.taskTemplateType && data.vmo && selectedObject.props.task_type && selectedObject.props.task_type.uiValues ) {
            _populatePropValue( data.vmo, 'task_type', data.taskTemplateType, false, data.isPanelEditable );
            var taskTypeValue = selectedObject.props.task_type.uiValues[ 0 ];
            // task_type proeprty dbValue and uiValue both are same and because of that we need to complate for
            // display name to find the correct type that need to be selected by default
            var defaultTaskTemplate = _.find( data.taskTemplateTypeList, function( templateType ) {
                return templateType.propDisplayValue === taskTypeValue;
            } );
            if( defaultTaskTemplate ) {
                data.taskTemplateType.uiValue = defaultTaskTemplate.propDisplayValue;
                data.taskTemplateType.dbValue = defaultTaskTemplate.propInternalValue;
            }
        }
    }
};

/**
 * Update the proeprties panel based on selection. If selected obejct is of type
 * EPMAddStatusTaskTemplate then populate the release status and if condition task template
 * then update condition task panel.
 *
 * @param {Object} data Data view model object
 * @param {Object} selection Selected obejct from UI.
 */
export let updateTaskTemplatePanel = function( data, selection ) {
    if( selection && selection.uid ) {
        var selectedObject = cdm.getObject( selection.uid );
        _populateConditionTaskTemplateOptions( data, selectedObject, data.isPanelEditable );
        _populateAddStatusTaskTemplateOptions( data, selectedObject, data.isPanelEditable );
    }
};

/**
 * Refresh the proeprties panel based on selection. If selected obejct is of type
 * EPMAddStatusTaskTemplate then populate the release status and if condition task template
 * then update condition task panel.
 *
 * @param {Object} data Data view model object
 * @param {Object} selection Selected obejct from UI.
 * @param {Object} ctx Context object
 */
export let refreshTaskTemplatePanel = function( data, selection, ctx ) {
    if( selection && selection.uid ) {
        var selectedObject = cdm.getObject( selection.uid );
        // Check if data is not valid data then use cache parent data to render the panel
        if( !data._internal || !data._internal.panelId || data._internal.panelId !== 'Awp0TaskRelatedInfo' ) {
            data = parentData;
        }
        exports.populatePanelData( data, selectedObject, ctx );
        _populateConditionTaskTemplateOptions( data, selectedObject, data.isPanelEditable );
        _populateAddStatusTaskTemplateOptions( data, selectedObject, data.isPanelEditable );
    }
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
 * This method is used to get the LOV values for the decision label panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response, avoidEmptyLOV ) {
    var lovList = [];
    if( !avoidEmptyLOV ) {
        lovList.push( _getEmptyListModel() );
    }
    if( !response || !response.lovValues ) {
        return lovList;
    }
    _.forEach( response.lovValues, function( result ) {
        if( result && result.propDisplayValues.lov_values ) {
            var object = {
                propDisplayValue: result.propDisplayValues.lov_values[ 0 ],
                propDisplayDescription: result.propDisplayValues.lov_value_descriptions ? result.propDisplayValues.lov_value_descriptions[ 0 ] : result.propDisplayValues.lov_values[ 0 ],
                propInternalValue: result.propInternalValues.lov_values[ 0 ]
            };
            lovList.push( object );
        }
    } );
    return lovList;
};

/**
 * This method is used to get the LOV values for the async priority label panel.
 * @param {Object} response the response of the getLov soa
 *
 * @returns {Object} value the LOV value
 */
export let getAsyncPriorityLOVList = function( response ) {
    return exports.getLOVList( response, true );
};

/**
 * Fire the event to fit the graph.
 */
export let updateWorkflowGraph = function() {
    eventBus.publish( 'workflowDesigner.fitGraph' );
};

/**
 * This method is used to get the LOV values for the filter condition.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getFilterConditionLOVList = function( response ) {
    var lovList = [];
    lovList.push( _getEmptyListModel() );
    if( !response || !response.lovValues ) {
        return lovList;
    }
    _.forEach( response.lovValues, function( result ) {
        if( result && result.propDisplayValues.condition_name && result.propDisplayValues.expression ) {
            var object = {
                propDisplayValue: result.propDisplayValues.condition_name[ 0 ],
                propDisplayDescription: result.propDisplayValues.expression ? result.propDisplayValues.expression[ 0 ] : result.propDisplayValues.expression[ 0 ],
                propInternalValue: result.uid
            };
            lovList.push( object );
        }
    } );
    return lovList;
};

/**
 * This method is used to get the LOV values for the release status list.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getReleaseStatusList = function( response ) {
    var releaseStatusList = [];
    releaseStatusList.push( _getEmptyListModel() );
    if( !response || !response.result ) {
        return releaseStatusList;
    }
    _.forEach( response.result, function( result ) {
        if( result ) {
            var statusObject = cdm.getObject( result.uid );
            var object = {
                propDisplayValue: statusObject.props.object_string.uiValues[ 0 ],
                propDisplayDescription: '',
                propInternalValue: statusObject.props.object_string.dbValues[ 0 ]
            };

            releaseStatusList.push( object );
        }
    } );
    // Sort the release status list by default with dispaly name
    releaseStatusList = _.sortBy( releaseStatusList, 'propDisplayValue' );
    return releaseStatusList;
};

/**
 * This method is used to get the LOV values for the saved query list.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getSavedQueryLOVList = function( response ) {
    var savedQueryList = [];
    savedQueryList.push( _getEmptyListModel() );
    if( !response || !response.lovValues ) {
        return savedQueryList;
    }
    _.forEach( response.lovValues, function( queryLOVValue ) {
        if( queryLOVValue && queryLOVValue.propDisplayValues && queryLOVValue.propDisplayValues.query_name &&
            queryLOVValue.propDisplayValues.query_name[ 0 ] ) {
            var queryObject = {
                propDisplayValue: queryLOVValue.propDisplayValues.query_name[ 0 ],
                propDisplayDescription: '',
                propInternalValue: queryLOVValue.propDisplayValues.query_name[ 0 ]
            };

            savedQueryList.push( queryObject );
        }
    } );
    return savedQueryList;
};

/**
 * Based on selected query anaisnt option set the include target value to false.
 * @param {Object} data Data view model object
 */
export let queryOptionSelected = function( data ) {
    if( data.queryAganist && data.queryAganist.dbValue !== 'target' ) {
        data.includeRepliaceTarget.dbValue = false;
    }
};

/**
 * Updated the panel when task template is deleted.
 */
export let updateOnTaskTemplateDelete = function() {
    // This method will be called when user remove something from process template or delete the process itself
    // and properties section is visible and user modified some properties. So in that case, we don't
    // want to update the properties for deleted template. So to have the deleted objects UID's on data
    // added thsi empty method.
};

/**
 * Update the template name property when user updated the value outside properties tab.
 *
 * @param { Array} modifiedObjects  Modified objects from UI
 * @param { Object} selTemplate Selected template object whose info need to be updated
 * @param { Object} data Data view model object
 */
export let updatePropertiesOnObjectChanged = function( modifiedObjects, selTemplate, data ) {
    // Find the matching template first and if found then only go and update the template
    var modifiedTemplate = _.find( modifiedObjects, function( object ) {
        return object.uid === selTemplate.uid;
    } );
    if( modifiedTemplate && data && data.templateName ) {
        data.templateName.dbValue = modifiedTemplate.props.template_name.dbValues[ 0 ];
        data.templateName.uiValue = modifiedTemplate.props.template_name.uiValues[ 0 ];
    }
};

/**
 * Get the obejct types that need to be shown on UI.
 * @param {Object} response Response object
 *
 * @returns {Object} Object types list model array
 */
export let getObjectTypeLOVListValues = function( response ) {
    var modelObjects = [];
    if( response && response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults ) {
            _.forEach( searchResults.objects, function( object ) {
                var uid = object.uid;
                var obj = response.ServiceData.modelObjects[ uid ];
                modelObjects.push( obj );
            } );
        }
        var endReached = response.cursor.endReached;
        parentData.moreValuesExist = !endReached;
    }
    var listObjects = listBoxService.createListModelObjects( modelObjects, 'props.object_string' );
   if( listObjects && listObjects.length > 0 ) {
    _.forEach( listObjects, function( listObject ) {
        // adding internal names in brackets as well,in propDisplayValue.
        listObject.propDisplayValue = listObject.propDisplayValue + ' (' + listObject.propInternalValue.props.fnd0InternalName.dbValues[0] + ')';
    } );
    return listObjects;
   }
    return [];
};

/**
 * Get the obejct types that need to be shown on UI.
 * @param {Object} response Response object
 *
 * @returns {Object} Object types list model array
 */
export let getConditionLOVListValues = function( response ) {
    var objectList = [];
    if( response && response.ServiceData && response.ServiceData.modelObjects ) {
        objectList = listBoxService.createListModelObjects( response.ServiceData.modelObjects, 'props.object_string' );
    }
    return objectList;
};

/**
 * Get the obejct types that need to be shown on UI.
 * @param {Object} response Response object
 *
 * @returns {Object} Object types list model array
 */
export let preSelectObjectTypeForSelectedTemplate = function( data ) {
    if( data && data.preferencesForTemplate && data.preferencesForTemplate.length > 0 ) {
        data.allowedDefaultObjectTypes.uiValue = '';
        data.allowedDefaultObjectTypes.value = [];
        data.allowedDefaultObjectTypes.dbValue = [];
        data.allowedDefaultObjectTypes.displayValues = [];
        for( var i = 0; i < data.preferencesForTemplate.length; ++i ) {
            data.allowedDefaultObjectTypes.dbValue.push( data.preferencesForTemplate[i].propInternalValue );
            data.allowedDefaultObjectTypes.value.push( data.preferencesForTemplate[i].propInternalValue );
            data.allowedDefaultObjectTypes.displayValues.push( data.preferencesForTemplate[i].propDisplayValue );
            data.allowedDefaultObjectTypes.uiValue = data.allowedDefaultObjectTypes.displayValues.toString();
        }
    }

};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0TemplateProperties
 */

export default exports = {
    getEPMCreateStatusHandler,
    populatePanelData,
    updateTaskTemplatePanel,
    refreshTaskTemplatePanel,
    getLOVList,
    updateWorkflowGraph,
    getFilterConditionLOVList,
    getReleaseStatusList,
    getSavedQueryLOVList,
    queryOptionSelected,
    updateOnTaskTemplateDelete,
    updatePropertiesOnObjectChanged,
    getObjectTypeLOVListValues,
    loadValidTaskTemplateTypes,
    getAsyncPriorityLOVList,
    preSelectObjectTypeForSelectedTemplate,
    getConditionLOVListValues
};
app.factory( 'Awp0TemplateProperties', () => exports );
