/* eslint-disable max-len */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global define */

/**
 * @module js/Awp0CreateOrUpdateTaskHandlers
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import tcViewModelObjectSvc from 'js/tcViewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import workflowUtils from 'js/Awp0WorkflowDesignerUtils';
import listBoxSvc from 'js/listBoxService';
import soaSvc from 'soa/kernel/soaService';
import msgsvc from 'js/messagingService';
import commandPanelService from 'js/commandPanel.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Build table columns
 * @param {data} data data
 * @param {boolean} isPanelEditable True/False based on this icon element will be rendered
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildHandlerTableColumnInfos( data, isPanelEditable ) {
    var columnInfos = [];
    var columns = null;
    if( data.handlerTableColumns ) {
        columns = data.handlerTableColumns;
    } else {
        columns = data.argumentTableColumns;
    }

    _.forEach( columns, function( attrObj ) {
        var propName = attrObj.propName;
        var propDisplayName = attrObj.propDisplayName;
        var width = attrObj.width;
        var minWidth = attrObj.minWidth;

        var columnInfo = awColumnSvc.createColumnInfo();
        /**
         * Set values for common properties
         */
        columnInfo.name = propName;
        columnInfo.displayName = propDisplayName;
        columnInfo.enableFiltering = true;
        columnInfo.isTreeNavigation = attrObj.isTreeNavigation;
        columnInfo.width = width;
        columnInfo.minWidth = minWidth;
        columnInfo.maxWidth = 800;
        columnInfo.modifiable = isPanelEditable;
        columnInfo.isActionColumn = false;
        // Below two variable need to set to hide the Hide columns menu from table
        // As we use hard coded column so we don't have arrange panel right now. So to overcome
        // the issue setting these variables.
        columnInfo.enableHiding = false;
        columnInfo.enableColumnHiding = false;

        if( attrObj.cellTemplate ) {
            columnInfo.cellTemplate = attrObj.cellTemplate;
        }

        /**
         * Set values for un-common properties
         */
        columnInfo.typeName = attrObj.type;
        columnInfo.enablePinning = true;
        columnInfo.enableSorting = true;
        columnInfo.enableCellEdit = isPanelEditable;

        columnInfos.push( columnInfo );
    } );
    return columnInfos;
}

/**
 * @param {data} data data view model object
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getHandlerTableColumnInfos( data, isPanelEditable ) {
    return _buildHandlerTableColumnInfos( data, isPanelEditable );
}

/**
 * Populate handler arguments column data
 *
 * @param {object} uwDataProvider - the data provider
 * @param {object} data - data Object
 *  @param {object} ctx - ctx Object
 * @return {deferred} - deferred object
 */
export let loadHandlerTableColumns = function( uwDataProvider, data, ctx ) {
    var deferred = AwPromiseService.instance.defer();
    uwDataProvider.showDecorators = true;
    var isPanelEditable = workflowUtils.isTemplateEditMode( ctx.xrtSummaryContextObject, ctx );
    //var isPanelEditable = true;
    // Get the column configuration info
    var columnInfos = _getHandlerTableColumnInfos( data, isPanelEditable );
    uwDataProvider.columnConfig = {
        columns: columnInfos
    };
    deferred.resolve( {
        columnInfos: columnInfos
    } );
    if( data ) {
        data.columnsloaded = true;
        data.isPanelEditable = isPanelEditable;
    }
    return deferred.promise;
};

/**
 * Add handler argument row in handler argument table
 * @param {Object} rowId Row id that will be specific for each handler argument row
 * @param {String} argumentName Argument name value that need to be populated
 * @param {String} argumentValue Argument value that need to be popilated
 * @param {Object} data Data view model object
 * @param {boolean} isEditable True/False based on property need to be editable or not.
 *  @return {Object} - VM object
 */
var _addHandlerArgumentRowVMOObject = function( rowId, argumentName, argumentValue, data, isEditable ) {
    var vmObject = tcViewModelObjectSvc.createViewModelObjectById( argumentName );
    vmObject.type = 'HandlerArgument';
    vmObject.id = rowId;

    var columnInfos = [ 'argument_name', 'argument_value' ];
    var hasLov = false;
    // Iterate for all column info variables and populate the properties on VMO object
    _.forEach( columnInfos, function( columnInfo ) {
        var value = argumentName;
        var dbValues = value;
        var displayValues = value;
        if( columnInfo === 'argument_value' ) {
            value = argumentValue;
            hasLov = true;
            isEditable = true;
            dbValues = [ value[ 0 ] ];
            displayValues = [ value[ 0 ] ];
        }

        var vmProp = uwPropertySvc.createViewModelProperty( columnInfo, data.i18n[ columnInfo ],
            'STRING', dbValues, displayValues );
        if( hasLov ) {
            vmProp.hasLov = true;
            //data.argumentValueslist = listBoxSvc.createListModelObjectsFromStrings( argumentValue );
            vmProp.dataProvider = 'argumentValuelistProvider';
            vmProp.getViewModel = function() {
                return data;
            };
        }

        vmProp.propertyDescriptor = {
            displayName: data.i18n[ columnInfo ]
        };

        vmProp.isEditable = isEditable;

        vmObject.props[ columnInfo ] = vmProp;
        //vmObject.props.is_modifiable = isEditable;
    } );
    return vmObject;
};

export let populateHandlersLOV = function( data, ctx ) {
    ctx.argumentsPanelData = data;
    // Populate the actions handlers that need to be shown on rule handler LOV
    // var actionHandlers = [ '' ];
    // actionHandlers = actionHandlers.concat( data.actionHandlers );
    data.actionHandlerValues = listBoxSvc.createListModelObjectsFromStrings( data.actionHandlers );

    // Populate the rule handlers that need to be shown on rule handler LOV
    // var ruleHandlers = [ '' ];
    // ruleHandlers = ruleHandlers.concat( data.ruleHandlers );
    data.ruleHandlerValues = listBoxSvc.createListModelObjectsFromStrings( data.ruleHandlers );
};

var _getPropValues = function( propObject, actionHandlerName ) {
    var propValues = [];
    if( propObject && propObject.dbValues && propObject.dbValues.length > 0 ) {
        _.forEach( propObject.dbValues, function( dbValue ) {
            var vmObject = viewModelObjectSvc.createViewModelObject( dbValue );
            if( vmObject ) {
                if( !actionHandlerName ) {
                    propValues.push( vmObject );
                } else if( actionHandlerName && vmObject.props.object_string.dbValues &&
                    vmObject.props.object_string.dbValues[ 0 ] === actionHandlerName ) {
                    propValues.push( vmObject );
                }
            }
        } );
    }
    return propValues;
};
/**
 * Based on input proeprty object check for values and return the business rule object
 * along with its rule handlers.
 *
 * @param {Object} propObject Property object whose value needs to be fetched
 * @return {Array} Array that will info for all rules along with rule handlers.
 */
var _getRuleHandlers = function( propObject ) {
    var propValues = [];
    // Check if input proeprty object is not null and dbvalues are not empty then
    // only get the BusinessRule object and then gets its rule handlers
    if( propObject && propObject.dbValues && propObject.dbValues.length > 0 ) {
        _.forEach( propObject.dbValues, function( dbValue ) {
            var bRuleObject = viewModelObjectSvc.createViewModelObject( dbValue );
            // Check if BRule object is not null and rule handlers present then gets those rule handlers
            if( bRuleObject && bRuleObject.props.rule_handlers && bRuleObject.props.rule_handlers.dbValues ) {
                _.forEach( bRuleObject.props.rule_handlers.dbValues, function( childDbValue ) {
                    var childObject = viewModelObjectSvc.createViewModelObject( childDbValue );
                    if( childObject ) {
                        childObject.buisnessRuleObject = bRuleObject;
                        propValues.push( childObject );
                    }
                } );
            }
        } );
    }
    return propValues;
};
export let getIndexOfSelectedActionHandler = function( ctx, changedIndex ) {
    ctx.enableActionHandlerMoveUp = false;
    ctx.enableActionHandlerMoveDown = false;
    if( ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectedObjects.length > 0 ) {
        var triggerType = ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectedObjects[ 0 ].props.parent_action_type.dbValues[ 0 ];
        var handler = '';
        switch ( triggerType ) {
            case '1':
                handler = 'assign_action_handlers';
                break;
            case '2':
                handler = 'start_action_handlers';
                break;
            case '100':
                handler = 'perform_action_handlers';
                break;
            case '4':
                handler = 'complete_action_handlers';
                break;
            case '5':
                handler = 'skip_action_handlers';
                break;
            case '6':
                handler = 'suspend_action_handlers';
                break;
            case '7':
                handler = 'resume_action_handlers';
                break;
            case '8':
                handler = 'abort_action_handlers';
                break;
            case '9':
                handler = 'undo_action_handlers';
                break;
            default:
                handler = 'start_action_handlers';
                break;
        }
        var selActionTypesHandlersProp = ctx.selected.props[ handler ];
        if( selActionTypesHandlersProp.dbValues.length > 1 ) {
            var index = selActionTypesHandlersProp.dbValues.indexOf( ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectedObjects[ 0 ].uid );
            if( index < selActionTypesHandlersProp.dbValues.length - 1 && index > 0 ) {
                ctx.enableActionHandlerMoveUp = true;
                ctx.enableActionHandlerMoveDown = true;
            } else if( index === 0 ) {
                ctx.enableActionHandlerMoveDown = true;
            } else if( index === selActionTypesHandlersProp.dbValues.length - 1 ) {
                ctx.enableActionHandlerMoveUp = true;
            }
            if( changedIndex ) {
                var indexToSelect = _.findKey( ctx.handlerTableData.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects, {
                    uid: ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectedObjects[ 0 ].uid
                } );
                if( indexToSelect ) {
                    var object = ctx.handlerTableData.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects[ indexToSelect ];
                    ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectionModel.setSelection( object );
                }
            }
        }
    }
};

export let getIndexOfSelectedRuleHandler = function( ctx, changedIndex ) {
    ctx.enableRuleHandlerMoveUp = false;
    ctx.enableRuleHandlerMoveDown = false;
    if( ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectedObjects.length > 0 ) {
        var triggerType = ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectedObjects[ 0 ].props.action_type.dbValue[ 0 ];
        var handler = '';
        switch ( triggerType ) {
            case 'Assigned':
                handler = 'assign_action_rules';
                break;
            case 'Started':
                handler = 'start_action_rules';
                break;
            case 'Performed':
                handler = 'perform_action_rules';
                break;
            case 'Completed':
                handler = 'complete_action_rules';
                break;
            case 'Promoted':
                handler = 'skip_action_rules';
                break;
            case 'Suspended':
                handler = 'suspend_action_rules';
                break;
            case 'Resumed':
                handler = 'resume_action_rules';
                break;
            case 'Aborted':
                handler = 'abort_action_rules';
                break;
            case 'Undo':
                handler = 'undo_action_rules';
                break;
            default:
                handler = 'start_action_rules';
                break;
        }
        var selActionTypesHandlersProp = ctx.selected.props[ handler ];
        if( selActionTypesHandlersProp.dbValues.length > 1 ) {
            var index = selActionTypesHandlersProp.dbValues.indexOf( ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectedObjects[ 0 ].buisnessRuleObject.uid );
            if( index < selActionTypesHandlersProp.dbValues.length - 1 && index > 0 ) {
                ctx.enableRuleHandlerMoveUp = true;
                ctx.enableRuleHandlerMoveDown = true;
            } else if( index === 0 ) {
                ctx.enableRuleHandlerMoveDown = true;
            } else if( index === selActionTypesHandlersProp.dbValues.length - 1 ) {
                ctx.enableRuleHandlerMoveUp = true;
            }
            if( changedIndex ) {
                var indexToSelect = _.findKey( ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects, {
                    uid: ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectedObjects[ 0 ].uid
                } );
                if( indexToSelect ) {
                    var object = ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects[ indexToSelect ];
                    ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectionModel.setSelection( object );
                }
            }
        }
    }
};

var _addToActionHandlerRow = function( data, actionHandlerObjects, action ) {
    for( var i = 0; i < actionHandlerObjects.length; i++ ) {
        var vmProp = uwPropertySvc.createViewModelProperty( 'action_type', data.i18n[ action ],
            'STRING', [ data.i18n[ action ] ], [ data.i18n[ action ] ] );
        actionHandlerObjects[ i ].props.action_type = vmProp;
        data.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects.push( actionHandlerObjects[ i ] );
    }
};

var _addToRuleHandlerRow = function( data, ruleHandlerObjects, action ) {
    for( var i = 0; i < ruleHandlerObjects.length; i++ ) {
        var vmProp = uwPropertySvc.createViewModelProperty( 'action_type', data.i18n[ action ],
            'STRING', [ data.i18n[ action ] ], [ data.i18n[ action ] ] );
        ruleHandlerObjects[ i ].props.action_type = vmProp;
        data.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects.push( ruleHandlerObjects[ i ] );
    }
};

/**
 * Populate the handler panel properties that need to be shown on UI.
 * @param {Object} data Data view model object
 * @param {Object} selection selection
 * @param {Object} ctx ctx
 */
export let populateActionHandlerData = function( data, ctx ) {
    ctx.handlerTableData = data;
    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'EPMTaskTemplate' ) > -1 ) {
        var templateObject = cdm.getObject( ctx.selected.uid );
        var actionArray = [ 'assign_action', 'start_action', 'perform_action', 'complete_action', 'skip_action', 'suspend_action',
            'resume_action', 'abort_action', 'undo_action'
        ];
        ctx.handlerTableData.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects = [];
        // Iterate for all action array and then populate the info for each action along with its action and rule handlers
        _.forEach( actionArray, function( action ) {
            var actionPropName = action + '_handlers';
            var actionProp = templateObject.props[ actionPropName ];
            var actionHandlerObjects = _getPropValues( actionProp );
            _addToActionHandlerRow( data, actionHandlerObjects, action );
        } );
        ctx.handlerTableData.searchActionHandlerResults = data.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects;
        ctx.handlerTableData.totalActionHandlersFound = data.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects.length;
        ctx.handlerTableData.searchIndex = 0;
        if( ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectedObjects.length > 0 && ctx.handlerTableData.handlerUpdated ) {
            var indexToSelect = _.findKey( ctx.handlerTableData.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects, {
                uid: ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectedObjects[ 0 ].uid
            } );
            if( indexToSelect ) {
                var object = ctx.handlerTableData.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects[ indexToSelect ];
                ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectionModel.setSelection( object );
            }
        }
    }
};

/**
 * Populate the handler panel properties that need to be shown on UI.
 * @param {Object} data Data view model object
 * @param {Object} selection selection
 * @param {Object} ctx ctx
 */
export let populateRuleHandlerData = function( data, ctx ) {
    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'EPMTaskTemplate' ) > -1 ) {
        ctx.handlerTableData = data;
        ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects = [];
        var templateObject = cdm.getObject( ctx.selected.uid );
        var actionArray = [ 'assign_action', 'start_action', 'perform_action', 'complete_action', 'skip_action', 'suspend_action',
            'resume_action', 'abort_action', 'undo_action'
        ];
        // Iterate for all action array and then populate the info for each action along with its action and rule handlers
        _.forEach( actionArray, function( action ) {
            var rulePropName = action + '_rules';
            var ruleProp = templateObject.props[ rulePropName ];
            var ruleHandlerObjects = _getRuleHandlers( ruleProp );
            _addToRuleHandlerRow( data, ruleHandlerObjects, action );
        } );
        ctx.handlerTableData.searchRuleHandlerResults = data.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects;
        ctx.handlerTableData.totalRuleHandlersFound = data.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects.length;
        ctx.handlerTableData.searchIndex = 0;
        if( ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectedObjects.length > 0 && ctx.handlerTableData.handlerUpdated ) {
            var indexToSelect = _.findKey( ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects, {
                uid: ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectedObjects[ 0 ].uid
            } );
            if( indexToSelect ) {
                var object = ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects[ indexToSelect ];
                ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectionModel.setSelection( object );
            }
        }
    }
};

var _getHandlerArgumentsadditionalDataMap = function( data ) {
    var additionalDataMap = {};
    data.invalidValueError = false;
    var loadedObjects = data.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects;
    _.forEach( loadedObjects, function( loadedObject ) {
        var argumentName = loadedObject.props.argument_name.uiValue;
        var argumentValue = loadedObject.props.argument_value.uiValue;
        if( argumentValue && argumentValue === '<Add a value>' ) {
            var message = msgsvc.applyMessageParams( data.i18n.invalidValue, [ '{{argumentValue}}', '{{argumentName}}' ], {
                argumentValue: argumentValue,
                argumentName: argumentName
            } );
            msgsvc.showError( message );
            data.invalidValueError = true;
        }
        if( argumentValue && argumentValue !== '' ) {
            additionalDataMap[ argumentName ] = [ argumentValue ];
        } else {
            additionalDataMap[ argumentName ] = [];
        }
    } );
    return additionalDataMap;
};

var _getCreateHandlerSOAInput = function( data, ctx, inputData, handlerType, handlerName ) {
    var action = parseInt( data.actionTypeLOV.dbValue );
    var taskTemplateUid = ctx.selected.uid;
    var additionalDataMap = _getHandlerArgumentsadditionalDataMap( data );
    if( data.invalidValueError ) {
        return;
    }

    var object = {
        clientID: 'createHandler',
        handlerName: handlerName,
        taskTemplate: taskTemplateUid,
        handlerType: handlerType,
        action: action,
        additionalData: additionalDataMap
    };
    if( handlerName && handlerName !== '' ) {
        inputData.push( object );
    }
};
var createOrUpdateHandler = function( soaInput, ctx ) {
    // Check if SOA input is not null and not empty then only make SOA call
    if( soaInput && soaInput.input && soaInput.input.length > 0 ) {
        soaSvc.postUnchecked( 'Workflow-2019-06-Workflow', 'createOrUpdateHandler', soaInput ).then( function( response ) {
            var err = soaSvc.createError( response );
            var message = '';
            if( err && err.cause && err.cause.ServiceData && err.cause.ServiceData.partialErrors ) {
                _.forEach( err.cause.ServiceData.partialErrors, function( partErr ) {
                    if( partErr.errorValues ) {
                        _.forEach( partErr.errorValues, function( errVal ) {
                            if( errVal.code ) {
                                if( message && message.length > 0 ) {
                                    message += '\n' + errVal.message;
                                } else {
                                    message += errVal.message + '\n';
                                }
                            }
                            msgsvc.showError( message );
                        } );
                    }
                } );
                ctx.partialErrors = err.cause.ServiceData.partialErrors;
            } else {
                ctx.partialErrors = null;
                eventBus.publish( 'revealWithTableRefresh' );
                var eventData = {
                    source: 'toolAndInfoPanel'
                };

                eventBus.publish( 'complete', eventData );
                if( response.createdorUpdatedObjects[ '0' ].clientID === 'updateHandler' || response.createdorUpdatedObjects[ '0' ].clientID === 'updateBusinessRuleHandler' ) {
                    ctx.handlerTableData.handlerUpdated = true;
                    if( ctx.workflowDgmCtx.selectedNodes.length > 0 ) {
                        var associatedEdge = ctx.workflowDgmCtx.selectedNodes[ 0 ].getEdges( 'IN' );
                        for( var i = 0; i < associatedEdge.length; ++i ) {
                            if( associatedEdge[ i ].getLabel() && ctx.workflowDgmCtx.selectedNodes[ 0 ].nodeId === associatedEdge[ i ].targetNode.nodeId && soaInput.input[ 0 ].additionalData[ '-decision' ] ) {
                                ctx.graph.graphModel.graphControl.graph.setLabel( associatedEdge[ i ], soaInput.input[ 0 ].additionalData[ '-decision' ][ 0 ] );
                                break;
                            }
                        }
                    }
                }
            }
        } );
    }
};
export let createOrUpdateActionHandler = function( data, ctx ) {
    ctx.selectedHandler = null;
    var inputData = [];
    var handlerType = 'Action';
    var handlerName = data.actionHandlersLOV.dbValue;
    _getCreateHandlerSOAInput( data, ctx, inputData, handlerType, handlerName );
    var soaInput = {
        input: inputData
    };
    createOrUpdateHandler( soaInput, ctx );
};
export let refreshActionHandlerTable = function( data ) {
    if( data.dataProviders.actionHandlerDataProvider.selectedObjects ) {
        var index = _.findKey( data.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects, {
            uid: data.dataProviders.actionHandlerDataProvider.selectedObjects[ 0 ].uid
        } );
        if( index ) {
            data.dataProviders.actionHandlerDataProvider.viewModelCollection.loadedVMObjects.splice( index, 1 );
        }
    }
    data.dataProviders.actionHandlerDataProvider.selectedObjects = [];
};
export let refreshRuleHandlerTable = function( data ) {
    if( data.dataProviders.ruleHandlerDataProvider.selectedObjects ) {
        var index = _.findKey( data.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects, {
            uid: data.dataProviders.ruleHandlerDataProvider.selectedObjects[ 0 ].uid
        } );
        if( index ) {
            data.dataProviders.ruleHandlerDataProvider.viewModelCollection.loadedVMObjects.splice( index, 1 );
        }
    }
    data.dataProviders.ruleHandlerDataProvider.selectedObjects = [];
};

export let createOrUpdateRuleHandler = function( data, ctx ) {
    ctx.selectedHandler = null;
    var inputData = [];
    var handlerType = 'Rule';
    var handlerName = data.ruleHandlersLOV.dbValue;
    _getCreateHandlerSOAInput( data, ctx, inputData, handlerType, handlerName );
    var soaInput = {
        input: inputData
    };
    createOrUpdateHandler( soaInput, ctx );
};
var _getUpdateHandlerSOAInput = function( data, ctx, inputData ) {
    var handlerName = data.handlerName.dbValue;
    var taskTemplateUid = ctx.selected.uid;
    var actionType = 0;
    if( data.actionTypeLOV.uiValue !== ctx.selectedHandler.props.action_type.dbValue[ 0 ] ) {
        actionType = parseInt( data.actionTypeLOV.dbValue );
    }
    var additionalDataMap = _getHandlerArgumentsadditionalDataMap( data );
    var object = {
        clientID: 'updateHandler',
        handlerToUpdate: ctx.selectedHandler.uid,
        additionalData: additionalDataMap,
        taskTemplate: taskTemplateUid,
        action: actionType
    };
    if( handlerName ) {
        object.handlerName = handlerName;
    }
    inputData.push( object );
};

var _getUpdateRuleHandlerSOAInput = function( data, ctx, inputData ) {
    var handlerName = data.handlerName.dbValue;
    var taskTemplateUid = ctx.selected.uid;
    var actionType = 0;
    if( data.actionTypeLOV.uiValue !== ctx.selectedHandler.props.action_type.dbValue[ 0 ] ) {
        actionType = parseInt( data.actionTypeLOV.dbValue );
    }
    var additionalDataMap = _getHandlerArgumentsadditionalDataMap( data );
    var object = {
        clientID: 'updateBusinessRuleHandler',
        handlerToUpdate: ctx.selectedHandler.uid,
        ruleQuorum: -1,
        additionalData: additionalDataMap,
        taskTemplate: taskTemplateUid,
        action: actionType
    };
    if( handlerName ) {
        object.handlerName = handlerName;
    }
    inputData.push( object );
};
export let updateHandler = function( data, ctx ) {
    var inputData = [];
    if( ctx.selectedHandler && ctx.selectedHandler.type === 'EPMHandler' ) {
        _getUpdateHandlerSOAInput( data, ctx, inputData );
    } else if( ctx.selectedHandler && ctx.selectedHandler.type === 'EPMBRHandler' ) {
        _getUpdateRuleHandlerSOAInput( data, ctx, inputData );
    }
    var soaInput = {
        input: inputData
    };
    createOrUpdateHandler( soaInput, ctx );
};

var createValueList = function( data, values ) {
    if( values.length > 0 ) {
        if( values[ 0 ].multiselect && values[ 0 ].undefined_and_lov ) {
            data.multiselect = true;
            data.argHasFreeFormText = true;
            let tempValues = _.cloneDeep( values );
            tempValues.splice( 0, 1 );
            data.argumentValueslist = listBoxSvc.createListModelObjectsFromStrings( tempValues );
        } else if( values[ 0 ].multiselect ) {
            data.multiselect = true;
            let tempValues = _.cloneDeep( values );
            tempValues.splice( 0, 1 );
            data.argumentValueslist = listBoxSvc.createListModelObjectsFromStrings( tempValues );
        } else if( values[ 0 ].undefined_and_lov ) {
            data.argHasFreeFormText = true;
            let tempValues = _.cloneDeep( values );
            tempValues.splice( 0, 1 );
            var emptyValue = listBoxSvc.createListModelObjectsFromStrings( [ '' ] );
            data.argumentValueslist = emptyValue;
            var argumentValueslist = listBoxSvc.createListModelObjectsFromStrings( tempValues );
            data.argumentValueslist.push.apply( data.argumentValueslist, argumentValueslist );
        } else if( values[ 0 ].clientsort ) {
            let tempValues = _.cloneDeep( values );
            // If client sort is needed then splice the list first and then sort based
            // on ignore case compare and then populate in the list
            tempValues.splice( 0, 1 );
            var sortedTempValues = tempValues.sort( function( a, b ) {
                return a && b && a.toLowerCase().localeCompare( b.toLowerCase() );
              } );
            data.argumentValueslist = listBoxSvc.createListModelObjectsFromStrings( sortedTempValues );
        } else {
            data.argumentValueslist = listBoxSvc.createListModelObjectsFromStrings( values );
        }
    }
};

var _getCurrentArgumentValue = function( data ) {
    if( data.argumentValueslist.length > 0 ) {
        if( data.multiselect && data.argHasFreeFormText && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== data.i18n.addValue && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== '' ) {
            var allAssigee = [];
            var uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue;
            if( data.preferences.EPM_ARG_target_user_group_list_separator && data.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && data.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '' ) {
              var value = uiValue.split( data.preferences.EPM_ARG_target_user_group_list_separator[0] );
              allAssigee = value;
            }else{
            uiValue = uiValue.replace( '\\,', '\\|' );
            var dbValue = uiValue.split( ',' );
            _.forEach( dbValue, function( assignee ) {
                // Replace it back to original value
                var finalValue = assignee.replace( '\\|', '\\,' );
                allAssigee.push( finalValue );
            } );
           }
            data.argumentValuesMultiselect.dbValue = allAssigee;
            data.argumentValuesMultiselect.uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue;
        } else if( data.multiselect && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== data.i18n.addValue && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== '' ) {
            var multiselectdbValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue.split( ',' );
            data.argumentValuesMultiselect.dbValue = multiselectdbValue;
            data.argumentValuesMultiselect.uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue;
        } else {
            var index = _.findKey( data.argumentValueslist, {
                propDisplayValue: data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue
            } );
            if( index ) {
                data.argumentValues.dbOriginalValue = data.argumentValueslist[ index ].propInternalValue;
                data.argumentValues.dbValue = data.argumentValueslist[ index ].propInternalValue;
                data.argumentValues.uiValue = data.argumentValueslist[ index ].propDisplayValue;
                data.argumentValues.displayValues = [ data.argumentValueslist[ index ].propDisplayValue ];
            } else if( !index && data.argHasFreeFormText && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== data.i18n.addValue && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== '' ) {
                data.argumentValueTextBox.dbValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue;
                data.argumentValueTextBox.uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue;
                data.argumentValueTextBox.dbValues = [ data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue ];
            }
        }
    } else if( data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== data.i18n.addValue && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue !== '' ) {
        data.argumentValueTextBox.dbValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue;
        data.argumentValueTextBox.uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue;
        data.argumentValueTextBox.dbValues = [ data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_value.uiValue ];
    }
};
export let populateArgumentValueslist = function( data ) {
    data.argumentValueslist = [];
    data.multiselect = false;
    data.argHasFreeFormText = false;
    data.argHasNullValue = false;
    data.argumentValues.dbValue = [];
    data.argumentValues.uiValue = '';
    data.undefinedArgValueRadioButton.dbValue = 'false';
    data.undefinedArgValueRadioButton.dbValues = [ 'false' ];
    data.undefinedArgValueRadioButton.uiValue = 'false';
    data.argumentValueTextBox.dbValues = [];
    data.argumentValueTextBox.uiValue = '';
    data.argumentValueTextBox.dbValue = '';
    var values = [];
    if( data.handlerData.nullvalue && data.dataProviders.argumentsDataProvider.selectedObjects.length === 0 ) {
        var index = data.handlerData.nullvalue.indexOf( data.argumentNames.dbValue );
        if( index > -1 ) {
            data.argHasNullValue = true;
            return;
        }
    }
    if( data.handlerData.nullvalue && data.dataProviders.argumentsDataProvider.selectedObjects.length > 0 ) {
        var selectedIndex = data.handlerData.nullvalue.indexOf( data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.uiValue );
        if( selectedIndex > -1 ) {
            data.argHasNullValue = true;
            data.readOnlyArgumentName.dbValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.dbValue;
            data.readOnlyArgumentName.uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.uiValue;
            return;
        }
    }
    if( data.dataProviders.argumentsDataProvider.selectedObjects.length > 0 && data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].isMandatoryArgument ) {
        data.readOnlyArgumentName.dbValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.dbValue;
        data.readOnlyArgumentName.uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.uiValue;
        if( data.allMandatoryArgumentsMap && data.allMandatoryArgumentsMap[ data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.dbValue[ 0 ] ] ) {
            values = data.allMandatoryArgumentsMap[ data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.dbValue[ 0 ] ];
            createValueList( data, values );
        }
        _getCurrentArgumentValue( data );
    } else if( data.dataProviders.argumentsDataProvider.selectedObjects.length > 0 && !data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].isMandatoryArgument ) {
        data.readOnlyArgumentName.dbValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.dbValue;
        data.readOnlyArgumentName.uiValue = data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.uiValue;
        if( data.allOptionalArgumentsMap && data.allOptionalArgumentsMap[ data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.dbValue[ 0 ] ] ) {
            values = data.allOptionalArgumentsMap[ data.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].props.argument_name.dbValue[ 0 ] ];
            createValueList( data, values );
        }
        _getCurrentArgumentValue( data );
    } else if( data.allOptionalArgumentsMap && data.allOptionalArgumentsMap[ data.argumentNames.dbValue ] ) {
        values = data.allOptionalArgumentsMap[ data.argumentNames.dbValue ];
        createValueList( data, values );
    }
};
export let populateArgumentNameslist = function( data ) {
    if( data.dataProviders.argumentsDataProvider.selectedObjects.length === 0 ) {
        var argumentNameList = listBoxSvc.createListModelObjectsFromStrings( data.optionalArgumentNames );
        for( var i = 0; i < data.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.length; ++i ) {
            var argumentNameMatchedIndex = _.findKey( argumentNameList, {
                propDisplayValue: data.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects[ i ].props.argument_name.uiValue
            } );
            if( argumentNameMatchedIndex ) {
                argumentNameList.splice( argumentNameMatchedIndex, 1 );
                for( var j = 0; j < data.handlerData.mutex.length; j++ ) {
                    var mutexArgumentNames = Object.keys( data.handlerData.mutex[ j ] );
                    for( var k = 0; k < mutexArgumentNames.length; k++ ) {
                        if( mutexArgumentNames[ k ] === data.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects[ i ].props.argument_name.uiValue ) {
                            _.forEach( mutexArgumentNames, function( mutex ) {
                                var mutexNameMatchedIndex = _.findKey( argumentNameList, {
                                    propDisplayValue: mutex
                                } );
                                if( mutexNameMatchedIndex ) {
                                    argumentNameList.splice( mutexNameMatchedIndex, 1 );
                                }
                            } );
                        }
                    }
                }
            }
        }
        data.argumentNames.dbValue = [];
        data.argumentNames.uiValue = '';
        data.argumentNameTextBox.dbValues = [];
        data.argumentNameTextBox.uiValue = '';
        data.argumentNameTextBox.dbValue = '';
        data.argumentNameslist = argumentNameList;
        data.argumentValueTextBox.dbValues = [];
        data.argumentValueTextBox.uiValue = '';
        data.argumentValueTextBox.dbValue = '';
        data.argumentValuesMultiselect.dbValue = [];
        data.argumentValuesMultiselect.uiValue = '';
        data.undefinedArgValueRadioButton.dbValue = 'false';
        data.undefinedArgValueRadioButton.dbValues = [ 'false' ];
        data.undefinedArgValueRadioButton.uiValue = 'false';
        if( argumentNameList.length === 0 ) {
            data.argumentValues.dbValue = [];
            data.argumentValues.uiValue = '';
        }
    }
};

export let populateArgumentValues = function( data ) {
    data.argumentValueTextBox.dbValues = [];
    data.argumentValueTextBox.uiValue = '';
    data.argumentValueTextBox.dbValue = '';
    data.argumentValuesMultiselect.dbValue = [];
    data.argumentValuesMultiselect.uiValue = '';
    data.argumentValues.dbValue = [];
    data.argumentValues.uiValue = '';
    data.undefinedArgValueRadioButton.dbValue = 'false';
    data.undefinedArgValueRadioButton.dbValues = [ 'false' ];
    data.undefinedArgValueRadioButton.uiValue = 'false';
    exports.populateArgumentValueslist( data );
};

export let populateHandlerInfo = function( data, ctx ) {
    var array = [];
    data.dataProviders.argumentsDataProvider.update( array, array.length );
    data.allOptionalArgumentsMap = {};
    data.allMandatoryArgumentsMap = {};
    data.optionalArgumentNames = [];
    data.no_arguments = false;
    ctx.argumentsPanelData.isAddHandlerArgumentPanelVisible = false;
    data.mandatoryArgumentNames = [];
    // Check if handler data is not present and undefined then set it as empty handler data
    // so that it will not go for further processing as will be set as default.
    if( !data.handlerData ) {
        data.handlerData = '';
    }
    if( data.handlerData === '' ) {
        data.hint.dbValues = [];
        data.hint.uiValue = '';
        return;
    }
    data.handlerData = JSON.parse( data.handlerData );
    if( data.handlerData && data.handlerData.no_arguments ) {
        data.no_arguments = true;
    }

    if( data.handlerData && data.handlerData.mandatory && data.handlerData.mandatory.length > 0 ) {
        var rowNumber = 1;
        _.forEach( data.handlerData.mandatory, function( argument ) {
            var values = Object.values( argument );
            var argumentValues = [ data.i18n.addValue ];
            var argumentName = Object.keys( argument );
            var isEditable = false;
            data.mandatoryArgumentNames.push( argumentName );
            data.allMandatoryArgumentsMap[ argumentName ] = values[ 0 ];
            var vmObject = _addHandlerArgumentRowVMOObject( rowNumber, argumentName, argumentValues, data, isEditable );
            vmObject.isMandatoryArgument = true;
            rowNumber++;
            data.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.push( vmObject );
        } );
    }
    if( data.handlerData.optional && data.handlerData.optional.length > 0 ) {
        ctx.argumentsPanelData.isAddHandlerArgumentPanelVisible = true;
        _.forEach( data.handlerData.optional, function( argument ) {
            var values = Object.values( argument );
            var argumentValues = values[ 0 ];
            var argumentName = Object.keys( argument );
            data.optionalArgumentNames.push( argumentName[ 0 ] );
            data.allOptionalArgumentsMap[ argumentName ] = argumentValues;
        } );
    }
    if( data.hint ) {
        if( data.handlerData.required_one_of && data.handlerData.required_one_of.length > 0 ) {
            var hints = [];
            var hintMessage = '';
            for( var j = 0; j < data.handlerData.required_one_of.length; j++ ) {
                var hint = '';
                var requiredOneOf = Object.keys( data.handlerData.required_one_of[ j ] );
                for( var k = 0; k < requiredOneOf.length; k++ ) {
                    if( k === requiredOneOf.length - 1 ) {
                        hint += ' ' + requiredOneOf[ k ];
                    } else {
                        hint += ' ' + requiredOneOf[ k ] + ',';
                    }
                }
                var message = msgsvc.applyMessageParams( data.i18n.hintMessage, [ '{{hint}}' ], {
                    hint: hint
                } );
                hints.push( message );
            }
            for( var i = 0; i < hints.length; i++ ) {
                hintMessage += hints[ i ] + '\n' + '\n';
                data.hint.dbValues.push( hintMessage );
            }
            data.hint.uiValue = hintMessage;
        } else {
            data.hint.dbValues = [];
            data.hint.uiValue = '';
        }
    }
};
export let populateArgumentsTableForSelectedHandler = function( data, ctx ) {
    var argumentValues = workflowUtils.parseHandlerArguments( ctx.selectedHandler.props.arguments.dbValues );
    var vmObjects = [];
    _.forOwn( argumentValues, function( argumentValue, argumentName ) {
        var rowNumber = ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.length + 1;
        vmObjects.push( _addHandlerArgumentRowVMOObject( rowNumber, [ argumentName ], [ argumentValue ], ctx.argumentsPanelData, false ) );
    } );
    if( ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.length > 0 ) {
        for( var i = 0; i < ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.length; i++ ) {
            var index = _.findKey( vmObjects, {
                uid: ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects[ i ].uid
            } );
            if( index ) {
                vmObjects[ index ].isMandatoryArgument = true;
            }
        }
    }
    // Set the arguemtn values correctly on data
    data.searchResults = vmObjects;
    data.totalFound = vmObjects.length;

    ctx.argumentsPanelData.dataProviders.argumentsDataProvider.update( vmObjects, vmObjects.length );
};

export let awp0RemoveHandlerArgumentPanelSection = function( ctx ) {
    var index = _.findKey( ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects, {
        uid: ctx.argumentsPanelData.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].uid
    } );
    ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.splice( index, 1 );
    ctx.argumentsPanelData.dataProviders.argumentsDataProvider.selectedObjects = [];
    ctx.argumentsPanelData.isAddHandlerArgumentPanelVisible = true;
};
export let addHandlerArgumentValuesToArgumentsTable = function( ctx ) {
    var rowNumber = ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.length + 1;
    var vmObject = null;
    var separator = ',';
    if( ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator && ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '' ) {
        separator = ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator[0];
    }
    if( ctx.argumentsPanelData.handlerData !== '' && ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 && ctx.argumentsPanelData.argHasFreeFormText ) {
        var combinedValue = ctx.argumentsPanelData.argumentValuesMultiselect.dbValue.toString();
        if( combinedValue !== '' && ctx.argumentsPanelData.argumentValueTextBox.uiValue !== '' ) {
            combinedValue = combinedValue + ',' + ctx.argumentsPanelData.argumentValueTextBox.uiValue;
        } else if( combinedValue === '' && ctx.argumentsPanelData.argumentValueTextBox.uiValue !== '' ) {
            combinedValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue;
        }
            combinedValue = combinedValue.replace( '\\,', '\\|' );
            combinedValue = combinedValue.replace( /,/g, separator );
            combinedValue = combinedValue.replace( '\\|', '\\,' );
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.argumentNames.uiValue ], [ combinedValue ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.handlerData === '' || ctx.argumentsPanelData.undefinedArgValueRadioButton.dbValue === 'true' ) {
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.argumentNameTextBox.uiValue ], [ ctx.argumentsPanelData.argumentValueTextBox.uiValue ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.handlerData !== '' && !ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 && !ctx.argumentsPanelData.argHasFreeFormText ) {
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.argumentNames.uiValue ], [ ctx.argumentsPanelData.argumentValues.uiValue ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.handlerData !== '' && !ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 && ctx.argumentsPanelData.argHasFreeFormText ) {
        if( ctx.argumentsPanelData.argumentValueTextBox.uiValue !== '' ) {
            ctx.argumentsPanelData.argumentValueTextBox.uiValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue.replace( '\\,', '\\|' );
            ctx.argumentsPanelData.argumentValueTextBox.uiValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue.replace( /,/g, separator );
            ctx.argumentsPanelData.argumentValueTextBox.uiValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue.replace( '\\|', '\\,' );
            vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.argumentNames.uiValue ], [ ctx.argumentsPanelData.argumentValueTextBox.uiValue ], ctx.argumentsPanelData, false );
        } else {
            vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.argumentNames.uiValue ], [ ctx.argumentsPanelData.argumentValues.uiValue ], ctx.argumentsPanelData, false );
        }
    } else if( ctx.argumentsPanelData.handlerData !== '' && ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 ) {
        var value = ctx.argumentsPanelData.argumentValuesMultiselect.dbValue.toString();
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.argumentNames.uiValue ], [ value ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.argumentValueslist.length === 0 ) {
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.argumentNames.uiValue ], [ ctx.argumentsPanelData.argumentValueTextBox.uiValue ], ctx.argumentsPanelData, false );
    }
    ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.push( vmObject );
    if( ctx.argumentsPanelData.argumentNameslist.length === 1 ) {
        ctx.argumentsPanelData.isAddHandlerArgumentPanelVisible = false;
    }
};
export let updateHandlerArgumentValuesToArgumentsTable = function( ctx ) {
    var rowNumber = ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.length + 1;
    var separator = ',';
    if( ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator && ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '' ) {
        separator = ctx.handlerTableData.preferences.EPM_ARG_target_user_group_list_separator[0];
    }
    var vmObject = null;
    if( ctx.argumentsPanelData.handlerData !== '' && ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 && ctx.argumentsPanelData.argHasFreeFormText ) {
        var combinedValue = ctx.argumentsPanelData.argumentValuesMultiselect.dbValue.toString();
        if( combinedValue !== '' && ctx.argumentsPanelData.argumentValueTextBox.uiValue !== '' ) {
            combinedValue = combinedValue + ',' + ctx.argumentsPanelData.argumentValueTextBox.uiValue;
        } else if( combinedValue === '' && ctx.argumentsPanelData.argumentValueTextBox.uiValue !== '' ) {
            combinedValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue;
        }
            combinedValue = combinedValue.replace( '\\,', '\\|' );
            combinedValue = combinedValue.replace( /,/g, separator );
            combinedValue = combinedValue.replace( '\\|', '\\,' );
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.readOnlyArgumentName.uiValue ], [ combinedValue ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.handlerData === '' ) {
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.readOnlyArgumentName.uiValue ], [ ctx.argumentsPanelData.argumentValueTextBox.uiValue ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.handlerData !== '' && !ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 && ctx.argumentsPanelData.argHasFreeFormText ) {
        if( ctx.argumentsPanelData.argumentValueTextBox.dbValue !== '' ) {
            ctx.argumentsPanelData.argumentValueTextBox.uiValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue.replace( '\\,', '\\|' );
            ctx.argumentsPanelData.argumentValueTextBox.uiValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue.replace( /,/g, separator );
            ctx.argumentsPanelData.argumentValueTextBox.uiValue = ctx.argumentsPanelData.argumentValueTextBox.uiValue.replace( '\\|', '\\,' );
            vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.readOnlyArgumentName.uiValue ], [ ctx.argumentsPanelData.argumentValueTextBox.uiValue ], ctx.argumentsPanelData, false );
        } else {
            vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.readOnlyArgumentName.uiValue ], [ ctx.argumentsPanelData.argumentValues.uiValue ], ctx.argumentsPanelData, false );
        }
    } else if( ctx.argumentsPanelData.handlerData !== '' && !ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 && !ctx.argumentsPanelData.argHasFreeFormText ) {
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.readOnlyArgumentName.uiValue ], [ ctx.argumentsPanelData.argumentValues.uiValue ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.handlerData !== '' && ctx.argumentsPanelData.multiselect && ctx.argumentsPanelData.argumentValueslist.length > 0 ) {
        var value = ctx.argumentsPanelData.argumentValuesMultiselect.dbValue.toString();
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.readOnlyArgumentName.uiValue ], [ value ], ctx.argumentsPanelData, false );
    } else if( ctx.argumentsPanelData.argumentValueslist.length === 0 ) {
        vmObject = _addHandlerArgumentRowVMOObject( rowNumber, [ ctx.argumentsPanelData.readOnlyArgumentName.uiValue ], [ ctx.argumentsPanelData.argumentValueTextBox.uiValue ], ctx.argumentsPanelData, false );
    }
    if( ctx.argumentsPanelData.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].isMandatoryArgument ) {
        vmObject.isMandatoryArgument = true;
    }
    var index = _.findKey( ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects, {
        uid: ctx.argumentsPanelData.dataProviders.argumentsDataProvider.selectedObjects[ 0 ].uid
    } );
    exports.awp0RemoveHandlerArgumentPanelSection( ctx );
    if( index ) {
        ctx.argumentsPanelData.dataProviders.argumentsDataProvider.viewModelCollection.loadedVMObjects.splice( index, 0, vmObject );
    }
};

/**
 * Open the input panel to show the respective handler info
 * @param {Object} ctx Context object
 * @param {Object} selectedHandler Selected handler object whose info need to be populated
 * @param {String} panelId Panel id that need to be open
 */
export let openHandlerPanel = function( ctx, selectedHandler, panelId ) {
    ctx.selectedHandler = null;
    ctx.selectedHandler = selectedHandler;
    var config = {
        width: 'WIDE'
    };
    commandPanelService.activateCommandPanel( panelId, 'aw_toolsAndInfo', null, false, false, config );
};

export let populateSelectedHandlerData = function( ctx, data ) {
    ctx.argumentsPanelData = data;
    var index = _.findKey( data.actionTypeValues, {
        propDisplayValue: ctx.selectedHandler.props.action_type.dbValue[ 0 ]
    } );
    if( index ) {
        data.actionTypeLOV.dbOriginalValue = data.actionTypeValues[ index ].propInternalValue;
        data.actionTypeLOV.dbValue = data.actionTypeValues[ index ].propInternalValue;
        data.actionTypeLOV.uiValue = data.actionTypeValues[ index ].propDisplayValue;
        data.actionTypeLOV.displayValues = [ data.actionTypeValues[ index ].propDisplayValue ];
    }
};
export let emptyValueTextBox = function( ctx ) {
    if( ctx.argumentsPanelData.argumentValueTextBox && ctx.argumentsPanelData.multiselect === true && ctx.argumentsPanelData.argHasFreeFormText === true ) {
        ctx.argumentsPanelData.argumentValueTextBox.dbValues = [];
        ctx.argumentsPanelData.argumentValueTextBox.uiValue = '';
        ctx.argumentsPanelData.argumentValueTextBox.dbValue = '';
    }
};
export let resetHandlerSelection = function( ctx ) {
    if( ctx.handlerTableData && ctx.handlerTableData.dataProviders && ctx.handlerTableData.dataProviders.actionHandlerDataProvider && ctx.handlerTableData.dataProviders.ruleHandlerDataProvider ) {
        ctx.handlerTableData.dataProviders.actionHandlerDataProvider.selectedObjects = [];
        ctx.handlerTableData.dataProviders.ruleHandlerDataProvider.selectedObjects = [];
    }
};

/**
 * Generate a value array and related outputs to mock list values
 * @param startIndex - index of first value
 * @param filter - value filter
 * @param data - data
 * @return {Object} - values
 */
 export let generateListValues = function(  startIndex, filter, data ) {
    var outputVals = [];
    var moreValuesExist = true;

    if( filter ) {
        const matches = data.argumentValueslist.filter( element => {
            if ( element.propDisplayValue.toLowerCase().includes( filter.toLowerCase() ) ) {
              return true;
            }
          } );

        moreValuesExist = false;
        outputVals = matches;
    } else {
        // return 20 at a time
        var inx = 0;
        while( outputVals.length < 20 ) {
            var count = startIndex + inx;
            if( count >= data.argumentValueslist.length ) {
                moreValuesExist = false;
                break;
            }
            outputVals.push( data.argumentValueslist[count] );
            // var val = listID + ' ' + count;
            inx++;
        }
    }

    return {
        vals: outputVals,
        moreValuesExist: moreValuesExist
    };
};

export default exports = {
    loadHandlerTableColumns,
    populateHandlersLOV,
    getIndexOfSelectedActionHandler,
    getIndexOfSelectedRuleHandler,
    populateActionHandlerData,
    populateRuleHandlerData,
    createOrUpdateActionHandler,
    refreshActionHandlerTable,
    refreshRuleHandlerTable,
    createOrUpdateRuleHandler,
    updateHandler,
    populateArgumentValueslist,
    populateArgumentNameslist,
    populateArgumentValues,
    populateHandlerInfo,
    populateArgumentsTableForSelectedHandler,
    awp0RemoveHandlerArgumentPanelSection,
    addHandlerArgumentValuesToArgumentsTable,
    updateHandlerArgumentValuesToArgumentsTable,
    openHandlerPanel,
    populateSelectedHandlerData,
    emptyValueTextBox,
    resetHandlerSelection,
    generateListValues
};
/**
 * @memberof NgServices
 * @member awTableDataService
 */
app.factory( 'Awp0CreateOrUpdateTaskHandlers', () => exports );
