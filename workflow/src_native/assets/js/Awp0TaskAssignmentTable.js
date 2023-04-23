// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/Awp0TaskAssignmentTable
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import clientDataModel from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import vmcs from 'js/viewModelObjectService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import awTableStateService from 'js/awTableStateService';
import iconSvc from 'js/iconService';
import commandPanelService from 'js/commandPanel.service';
import adapterSvc from 'js/adapterService';
import appCtxSvc from 'js/appCtxService';
import listBoxService from 'js/listBoxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import dataManagementService from 'soa/dataManagementService';
import uwPropertySvc from 'js/uwPropertyService';
import wrkflwAssignmentSvc from 'js/Awp0WorkflowAssignmentService';
import editHandlerSvc from 'js/editHandlerService';
import workflowAssinmentUtilSvc from 'js/Awp0WorkflowAssignmentUtils';
import workflowPopupSvc from 'js/Awp0WorkflowPopupService';

/**
 * A list of what should be exported.
 */
var exports = {};

/**
 * Cached static default AwTableColumnInfo.
 */
var _treeTableColumnInfos = null;

var _taskAssignPropPolicy = null;
var _multiUserTasks = [ 'EPMReviewTask', 'EPMRouteTask', 'EPMAcknowledgeTask', 'EPMReviewTaskTemplate', 'EPMRouteTaskTemplate', 'EPMAcknowledgeTaskTemplate' ];

/**
 * @param {data} data data
 * @param {boolean} isNarrowViewMode narrow mode active or not
 *
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos( data, isNarrowViewMode ) {
    _treeTableColumnInfos = _buildTreeTableColumnInfos( data, isNarrowViewMode );
    return _treeTableColumnInfos;
}

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

var hasNextLevelTask = function( obj ) {
    if( isOfType( obj, 'EPMDoTask' ) || isOfType( obj, 'EPMReviewTask' ) || isOfType( obj, 'EPMAcknowledgeTask' )
    || isOfType( obj, 'EPMRouteTask' ) || isOfType( obj, 'EPMConditionTask' )
    || isOfType( obj, 'EPMDoTaskTemplate' ) || isOfType( obj, 'EPMReviewTaskTemplate' )
    || isOfType( obj, 'EPMAcknowledgeTaskTemplate' ) || isOfType( obj, 'EPMRouteTaskTemplate' )
    || isOfType( obj, 'EPMConditionTaskTemplate' ) ) {
        return false;
    }
    return true;
};


var isRouteReviewAcknowledge = function( selected ) {
    if( isOfType( selected, 'EPMReviewTask' ) || isOfType( selected, 'EPMAcknowledgeTask' ) || isOfType( selected, 'EPMRouteTask' )
    || isOfType( selected, 'EPMReviewTaskTemplate' ) || isOfType( selected, 'EPMAcknowledgeTaskTemplate' ) || isOfType( selected, 'EPMRouteTaskTemplate' )  ) {
        return true;
    }
    return false;
};

/**
 * @param {Object} obj - object sent by server
 * @param {childNdx} childNdx Index
 * @param {levelNdx} levelNdx index
 * @param {Object} assignmentObject Assignment object that coantins all information for each row
 * @return {ViewModelTreeNode} View Model Tree Node
 */
function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx, assignmentObject ) {
    var displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    var assignmentBO = null;
    if( obj.props && obj.props.object_string ) {
        displayName = obj.props.object_string.uiValues[ 0 ];
        assignmentBO = obj;
    }

    // get Icon for node
    var assignmentType = 'assignee';
    var iconURL = iconSvc.getTypeIconURL( objType );
    var taskUid = objUid;
    if( childNdx > 0 ||  isRouteReviewAcknowledge( obj )
    && assignmentObject && assignmentObject.taskAssignment && assignmentObject.taskAssignment.uid  ) {
        objUid = assignmentObject.taskAssignment.uid;
        objType = assignmentObject.taskAssignment.type;
        displayName = '';
        iconURL = null;
        assignmentType = assignmentObject.assignmentType;
        var viewModelObject = assignmentObject.taskAssignment;
        if( viewModelObject ) {
            assignmentBO = viewModelObject;
        }
    }

    var vmNode = awTableSvc.createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

    var hasChildren = hasNextLevelTask( obj );
    vmNode.isLeaf = !hasChildren;
    vmNode.assignmentType = assignmentType;


    if( assignmentBO ) {
        vmNode = _.extend( vmNode, assignmentBO );
        // Set the type icon and thumbnail URL to empty so that for rows first coumn is empty then
        // we don't need to show any icon in first column
        vmNode.typeIconURL = '';
        vmNode.thumbnailURL = '';
        vmNode.assignmentObject = assignmentObject;
    }
    vmNode.taskUid = taskUid;
    vmNode.isExpanded = false;
    vmNode._childObj = obj;
    var assignmentOrigin = assignmentObject.assignmentOrigin;
    var taskAssignment = assignmentObject.taskAssignment;

    // This is specific processing for profile node if unstaff then show it on table
    // Need to reevaluate
    if( assignmentObject.profileDisplayString ) {
        taskAssignment = assignmentObject.profileDisplayString;
        assignmentOrigin = '';
    }
    _populateColumns( _treeTableColumnInfos, true, vmNode, taskAssignment,  assignmentOrigin );

    return vmNode;
}

/**
 * This will process the tasks Template based on response of SOA
 * @param {object} ctx App context object
 * @param {object} treeLoadInput - tree load inuput of tree
 * @param {Object} taskAssignmentDataObject - tasks template objects send by SOA
 * @param {boolean} startReached - flag indicates if start has reached for tree
 * @param {boolean} endReached - flag indicates if end has reached for tree
 *
 * @returns {object} treeLoadResult - tree Load result
 */
function processTasksTemplate( ctx, treeLoadInput, taskAssignmentDataObject, startReached, endReached ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var tasksTemplateObjects = taskAssignmentDataObject.childTaskObjects;
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];
    // Populate the assignment data for all task template object and then iterate over to show the rows in table
    taskAssignmentDataObject = wrkflwAssignmentSvc.populateAssignmentTableRowData( taskAssignmentDataObject, tasksTemplateObjects );
    for( var childNdx = 0; childNdx < tasksTemplateObjects.length; childNdx++ ) {
        var object = tasksTemplateObjects[ childNdx ];
        var vmObject = vmcs.constructViewModelObjectFromModelObject( object, 'EDIT' );
        // Check if task is multi user task then we need to create first row as empty row with only
        // task name and for other task types assignment info will come into single
        if( _multiUserTasks.indexOf( vmObject.type ) > -1 ) {
            var assignmentObject = {
                taskAssignment : '',
                assignmentOrigin : ''
            };
            var vmNode = createVMNodeUsingObjectInfo( vmObject, 0, levelNdx, assignmentObject );
            if( vmNode ) {
                vmNodes.push( vmNode );
            }
        }

        var nodeNdx = 0;

        var taskInfoObject = taskAssignmentDataObject.taskInfoMap[object.uid];
        if( taskInfoObject && taskInfoObject.props ) {
            for ( var key in taskInfoObject.props ) {
                if ( taskInfoObject.props.hasOwnProperty( key ) ) {
                  var value = taskInfoObject.props[key];
                  var taskAssignments = value.modelObjects;
                  for( nodeNdx = 0; nodeNdx < taskAssignments.length; nodeNdx++ ) {
                    var assignmentObject1 = taskAssignments[ nodeNdx];
                      var vmNode1 = createVMNodeUsingObjectInfo( vmObject, nodeNdx, levelNdx, assignmentObject1 );
                       if( vmNode1 ) {
                           vmNodes.push( vmNode1 );
                       }
                   }
                }
            }
        }
    }
    // Third Paramter is for a simple page for tree
    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached,
        endReached, null );
}

/**
 * Get the table comuns based on current tc version and narrow vie wmode value.
 *
 * @param {Object} data - Data view model object
 * @param {boolean} isNarrowViewMode True/False based on view is narrow view mode or not
 *
 * @returns {Array} Columns array that need to be shown on table
 */
var _getTableColumns = function( data, isNarrowViewMode ) {
    var tableColumns = data.assignmentTableColumns;
    var isTCVersion131OrLater = workflowAssinmentUtilSvc.isTCReleaseAtLeast131();

    // Check if TC version is older than tc13.1 and old columns present then we need to show
    // differnet column
    if( !isTCVersion131OrLater && data.assignmentTableOldColumns && !isNarrowViewMode ) {
        tableColumns = data.assignmentTableOldColumns;
    } else if( !isTCVersion131OrLater && data.assignmentTableNarrowModeOldColumns && isNarrowViewMode ) {
        tableColumns = data.assignmentTableNarrowModeOldColumns;
    } else if( isTCVersion131OrLater && data.assignmentTableColumns && !isNarrowViewMode ) {
        tableColumns = data.assignmentTableColumns;
    } else if( isTCVersion131OrLater && data.assignmentTableNarrowModeColumns && isNarrowViewMode ) {
        tableColumns = data.assignmentTableNarrowModeColumns;
    } else {
        tableColumns = data.assignmentTableColumns;
    }
    return tableColumns;
};


/**
 * Create the columns that need to be shown in the table.
 *
 * @param {Object} data - Data view model object
 *
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos( data, isNarrowViewMode ) {
    var columnInfos = [];

    // Get the table columns that need to be shown
    var tableColumns = _getTableColumns( data, isNarrowViewMode );
    _.forEach( tableColumns, function( attrObj ) {
        var propName = attrObj.propName;
        var propDisplayName = attrObj.propDisplayName;
        var width = attrObj.width;
        var minWidth = attrObj.minWidth;

        var columnInfo = awColumnSvc.createColumnInfo();
        /**
         * Set values for common properties
         */
        columnInfo.name = propName;
        columnInfo.internalPropName = propName;
        columnInfo.displayName = propDisplayName;
        columnInfo.enableFiltering = true;
        columnInfo.isTreeNavigation = attrObj.isTreeNavigation;
        columnInfo.width = width;
        columnInfo.minWidth = minWidth;
        columnInfo.maxWidth = 800;
        columnInfo.modifiable = false;
        if( attrObj.cellTemplate ) {
            columnInfo.cellTemplate = attrObj.cellTemplate;
        }

        /**
         * Set values for un-common properties
         */
        columnInfo.typeName = attrObj.type;
        columnInfo.enablePinning = true;

        // Disable the sorting on columns as we show the assignments in multi rows as part of PR # PR10108587
        columnInfo.enableSorting = false;
        columnInfo.enableCellEdit = false;

        columnInfos.push( columnInfo );
    } );
    return columnInfos;
}

/**
 * Check if assignment type is assignee and assignement object is group member then
 * get the underlying user from that and use to show on the table.
 * @param {Object} vmNode - View model tree node object
 * @param {Object} taskAssignment - Task assignemnt object need to show in assignee column
 *
 * @returns {Object} Object that need to be shown in assignee column
 */
var _getAssigneeValue = function( vmNode, taskAssignment ) {
    if( vmNode && vmNode.assignmentType === 'assignee' && isOfType( taskAssignment, 'GroupMember' )
        && taskAssignment.props.user &&  taskAssignment.props.user.dbValues && taskAssignment.props.user.dbValues[ 0 ] ) {
        // Get the user object from group member
        return vmcs.createViewModelObject( taskAssignment.props.user.dbValues[ 0 ] );
    }
    return taskAssignment;
};

/**
 *
 * @param {Object} columnInfo - The column info including name and other attributes
 * @param {Object} vmNode - View model tree node object
 * @param {Object} taskAssignment - Task assignemnt object need to show in assignee column
 * @param {Object} taskOrigin - Task origin need to show in origin column
 *
 * @return {vmProp} view model properties for the object
 */
function _createViewModelProperty( columnInfo, vmNode, taskAssignment, taskOrigin ) {
    var vmProp = null;

    var propDBValue = '';
    var propUIValue = '';
    var valueUpdated = false;

    if( columnInfo.name === 'taskAssignment' && _.isObject( taskAssignment ) && taskAssignment.uid ) {
        // Based on assignment type get the value that need to be shown in assignee column.
        var assigneeObject = _getAssigneeValue( vmNode, taskAssignment );
        if( assigneeObject && assigneeObject.uid ) {
            propDBValue = assigneeObject.uid;
            propUIValue = assigneeObject.props.object_string.uiValues[ 0 ];
        }
        if( taskAssignment.valueUpdated ) {
            valueUpdated = taskAssignment.valueUpdated;
        }
    } else if( columnInfo.name === 'assignmentOrigin' ) {
        if( _.isObject( taskOrigin ) && taskOrigin.uid  && taskOrigin.props && taskOrigin.props.object_string ) {
            propDBValue = taskOrigin.uid;
            propUIValue = taskOrigin.props.object_string.uiValues[ 0 ];
        } else {
            propDBValue = taskOrigin;
            propUIValue = taskOrigin;
        }
    } else if( columnInfo.name === 'task_state' && vmNode && vmNode.props && vmNode.props.task_state ) {
            propDBValue = vmNode.props.task_state.dbValue;
            propUIValue = vmNode.props.task_state.uiValue;
    }


    vmProp = uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName, columnInfo.typeName, propDBValue, [ propUIValue ] );
    vmProp.valueUpdated = valueUpdated;
    uwPropertySvc.setIsPropertyModifiable( vmProp, false );
    vmProp.propertyDescriptor = {
        displayName: columnInfo.displayName
    };

    if( ( columnInfo.isTableCommand || columnInfo.isTreeNavigation ) && vmNode.type && ( isOfType( vmNode, 'EPMTask' ) || isOfType( vmNode, 'EPMTaskTemplate' ) ) ) {
        vmProp.typeIconURL = iconSvc.getTypeIconURL( vmNode.type );
    }
    return vmProp;
}

/**
 *
 * @param {Array} columnInfos - A List of columnInfo objects that contain information for all the columns
 * @param {boolean} isLoadAllEnabled - A boolean to check whether we should load all the column information
 * @param {Object} vmNode - the current node that is getting loaded
 * @param {Object} taskAssignment - Task assignemnt object need to show in assignee column
 * @param {Object} taskOrigin - Task origin need to show in origin column
 */
function _populateColumns( columnInfos, isLoadAllEnabled, vmNode, taskAssignment, taskOrigin ) {
    var child = vmNode._childObj;
    if( isLoadAllEnabled && child ) {
        if( !vmNode.props ) {
            vmNode.props = [];
        }
        //Load all the information into a new view model to the corresponding node property
        _.forEach( columnInfos, function( columnInfo ) {
            vmNode.props[ columnInfo.name ] = _createViewModelProperty( columnInfo, vmNode, taskAssignment, taskOrigin );
        } );
    }
}


/**
 * Get the information of all profile, reviewersDataProvider and signOffs.
 *
 * @param {object} uwDataProvider - the data provider
 * @param {object} data - data Object
 * @param {object} ctx - ctx
 * @return {deferred} - deferred object
 */
export let loadTreeTableColumns = function( uwDataProvider, data, ctx ) {
    // Clear the expanded state before loading table
    awTableStateService.clearAllStates( data, 'taskTreeTable' );

    var context = {};
    var taskAssignmentCtx = appCtxSvc.getCtx( 'taskAssignmentCtx' );
    if( !taskAssignmentCtx ) {
        appCtxSvc.registerCtx( 'taskAssignmentCtx', context );
    }
    var isNarrowViewMode = workflowAssinmentUtilSvc.isNarrowMode();
    ctx.taskAssignmentCtx.isNarrowViewMode = isNarrowViewMode;
    ctx.taskAssignmentCtx.treeDataProvider = uwDataProvider;
    ctx.taskAssignmentCtx.updatedTaskObjects = [];
    ctx.taskAssignmentCtx.parentChildMap = {};
    ctx.taskAssignmentCtx.treeTableData = data;
    ctx.taskAssignmentCtx.isModified = false;

    var deferred = AwPromiseService.instance.defer();
    uwDataProvider.showDecorators = true;
    uwDataProvider.columnConfig = {
        columns: _getTreeTableColumnInfos( data, isNarrowViewMode )
    };
    // This code is needed to load the required properties that are needed for assignment table
    // If there is any selection from primary work area then we need to use that selection and if
    // there is no selection that means it's 0 selection submit to workflow case and we need to use
    // selected template to load PAL data.
    if ( ctx.mselected && ctx.mselected.length && ctx.mselected.length > 0 ) {
        exports.getValidObjectToPropLoad( ctx, data );
    } else {
        if ( ctx.parentData && ctx.parentData.allTemplates ) {
            data.validTaskObject = taskAssignmentCtx.validTaskAssignmentObject;
            data.propsToLoad = [ 'assignment_lists' ];
        }
    }
    if( data.validTaskObject && data.propsToLoad ) {
        dataManagementService.getPropertiesUnchecked( [ data.validTaskObject ], data.propsToLoad ).then( function() {
            data.validTaskObject = vmcs.constructViewModelObjectFromModelObject(  clientDataModel.getObject( data.validTaskObject.uid ), 'EDIT' );
            data.requiredPropertiesLoaded = true;
            deferred.resolve( {
                columnInfos: _getTreeTableColumnInfos( data, isNarrowViewMode )
            } );
        } );
    }


    if( data ) {
        data.columnsloaded = true;
    }
    return deferred.promise;
};


/**
 * Register the property polciy that need to be registered when user go to
 * assignment tab for assign all task.
 *
 * @param {object} data - data Object
 *
 */
export let registerPropPolicy = function( data ) {
    if( data.dataProviders.treeTasksTemplateDataProvider && data.dataProviders.treeTasksTemplateDataProvider.policy ) {
        _taskAssignPropPolicy = policySvc.register( data.dataProviders.treeTasksTemplateDataProvider.policy );
    }
};

/**
 *
 * UnRegister the property polciy that need to be removed from policy when user go out from
 * assignment tab for assign all task.
 */
export let unRegisterPropPolicy = function() {
    if( _taskAssignPropPolicy !== null ) {
        policySvc.unregister( _taskAssignPropPolicy );
        _taskAssignPropPolicy = null;
    }
};

/**
 * Get the valid object for assignment section need to be shown.
 *
 * @param {Object} ctx App context object
 * @param {Object} data Data view model object
 *
 * @returns {Object} Valid object for assignment section need to be shown
 */
export let getValidObjectToPropLoad = function( ctx, data ) {
    var selected = ctx.selected;

    if( selected && !isOfType( selected, 'EPMTask' ) && !isOfType( selected, 'Signoff' ) && ctx.pselected ) {
        selected = ctx.pselected;
    }

    var selectedObject = clientDataModel.getObject( selected.uid );
    var validTaskObject = selectedObject;

    // Get the correct adapter object. When user open item revision in content tab and goes to workflow tab
    // then also we need to show this table in workflow page. So to address this we need to get adapted object.
    var adaptedObjects = [];
    adaptedObjects = adapterSvc.getAdaptedObjectsSync( [ selectedObject ] );

    if( adaptedObjects && adaptedObjects.length > 0  && adaptedObjects[0] ) {
        validTaskObject = workflowAssinmentUtilSvc.getValidObjectForTaskAssignment( adaptedObjects[0] );
        data.validTaskObject = validTaskObject;
    }
    var propsToLoad = [ 'root_task', 'parent_process', 'task_template' ];
    if( isOfType( validTaskObject, 'EPMTaskTemplate' ) ) {
        propsToLoad = [ 'assignment_lists' ];
    }
    data.propsToLoad = propsToLoad;
    return validTaskObject;
};

export let loadTreeTableData = function( treeLoadInput, ctx, data, sortCriteria, columnFilters ) {
    // Check if it doesn't have data provider then set the correct data. This is mainly needed
    // when we do cancel edit that time data comes as commands view model data so set it to correct data
    if( !data.dataProviders || !data.dataProviders.treeTasksTemplateDataProvider ) {
        data = ctx.taskAssignmentCtx.treeTableData;
    }

    var deferred = AwPromiseService.instance.defer();
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );
        return deferred.promise;
    }

    // Check if required properties are already not loaded then load the properties else render the table directly
    if( _.isUndefined( data.requiredPropertiesLoaded ) ) {
        var validTaskObject = exports.getValidObjectToPropLoad( ctx, data );
        data.validTaskObject = validTaskObject;
        dataManagementService.getPropertiesUnchecked( [ validTaskObject ], [ 'parent_process', 'root_task', 'task_template' ] ).then( function( ) {
            data.requiredPropertiesLoaded = true;
            data.validTaskObject = vmcs.constructViewModelObjectFromModelObject(  clientDataModel.getObject( validTaskObject.uid ), 'EDIT' );
            loadtreeData( treeLoadInput, ctx, data.validTaskObject, data, sortCriteria, columnFilters ).then( function( treeLoadResult ) {
                deferred.resolve( {
                    treeLoadResult: treeLoadResult.treeLoadResult
                } );
            } );
        } );
        return;
    }
    loadtreeData( treeLoadInput, ctx, data.validTaskObject, data, sortCriteria, columnFilters ).then( function( treeLoadResult ) {
        deferred.resolve( {
            treeLoadResult: treeLoadResult.treeLoadResult
        } );
    } );

    return deferred.promise;
};

/**
 * @param {object} ctx App context object
 * @param {object} treeLoadInput - tree load inuput of tree
 * @param {Object} taskAssignmentDataObject Task assignment data object that hold all assignmetn info for each task
 * @param {boolean} startReached - flag indicates if start has reached for tree
 * @param {boolean} endReached - flag indicates if end has reached for tree
 * @returns {object} treeLoadResult - tree Load result
 */
var _getAssignmentTableData = function( ctx, treeLoadInput, taskAssignmentDataObject, startReached, endReached ) {
    if( !treeLoadInput || !taskAssignmentDataObject ) {
        return;
    }

    var tempCursorObject = {
        endReached: startReached,
        startReached: endReached
    };
    var treeLoadResult = processTasksTemplate( ctx, treeLoadInput, taskAssignmentDataObject, startReached,
        endReached );
    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    return treeLoadResult;
};


/**
 * Get the PAL information associated with selected object task template.
 * @param {Object} ctx Context object
 * @param {Object} data Data view modle object
 * @param {Object} rootTaskObject Root ask object for PAL information need to be fetched
 */
var _populatePALListData = function( ctx, data, rootTaskObject ) {
    if( ctx.xrtPageContext && ( ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Workflow' || ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Workflow' )  && isOfType( rootTaskObject, 'EPMTask' ) ) {
        return;
    }
    var validObject = rootTaskObject;
    if( isOfType( validObject, 'EPMTask' ) && validObject.props.task_template && validObject.props.task_template.dbValues ) {
        validObject = clientDataModel.getObject( rootTaskObject.props.task_template.dbValues[ 0 ] );
    }
    if ( validObject ) {
        data.taskTemplateObject = validObject;
        if ( validObject.props && validObject.props.assignment_lists ) {
            exports.getAssignmentLists( validObject, data );
        } else {
            dataManagementService.getPropertiesUnchecked( [ validObject ], [ 'assignment_lists' ] ).then( function() {
                var modelObject = clientDataModel.getObject( validObject.uid );
                exports.getAssignmentLists( modelObject, data );
            } );
        }
    }
};

/**
 * @returns {Object} Empty result table object
 */
var _emptyResultTable = function() {
    return {
        treeLoadResult: {
            parentNode : {
                levelNdx : 0
            }
        }
    };
};


var loadtreeData = function( treeLoadInput, ctx, selectedObject, data, sortCriteria, columnFilters ) {
    var rootTaskObject = null;
    var deferred = AwPromiseService.instance.defer();
    var nodeUIDToQuery;
    if( treeLoadInput.parentNode.uid === 'top' ) {
        if( selectedObject && selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
            var signOffModelObject = clientDataModel.getObject( selectedObject.props.fnd0ParentTask.dbValues[ 0 ] );
            rootTaskObject = clientDataModel.getObject( signOffModelObject.props.root_task.dbValues[ 0 ] );
            nodeUIDToQuery = rootTaskObject.uid;
        } else if( selectedObject && ( selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1 ||
            selectedObject.modelType.typeHierarchyArray.indexOf( 'Job' ) > -1 ) ) {
            rootTaskObject = clientDataModel.getObject( selectedObject.props.root_task.dbValues[ 0 ] );
            nodeUIDToQuery = rootTaskObject.uid;
        } else {
            rootTaskObject = selectedObject;
            nodeUIDToQuery = selectedObject.uid;
        }
    } else {
        nodeUIDToQuery = treeLoadInput.parentNode.uid;
    }

    // Check if task assignment context is null then we need to set empty context here
    if( !ctx.taskAssignmentCtx ) {
        ctx.taskAssignmentCtx = {};
    }

    // Show 15 rows in Assignment tab
    var maxRowsToShow = 20;
    var operationMode = 1;

    if( rootTaskObject ) {
        ctx.taskAssignmentCtx.validTaskAssignmentObject = rootTaskObject;
        // Populate the PAL list that need to be shownin list box
        _populatePALListData( ctx, data, rootTaskObject );
    }

    // Show only 10 nodes in workflow page
    if( ctx.xrtPageContext && ( ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Workflow' || ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Workflow' ) && isOfType( rootTaskObject, 'EPMTask' ) ) {
        // Using the operation mode as 2 to get only pending tasks
        maxRowsToShow = 10;
        operationMode = 2;
    }

    // Check if max rows to be shown on table value set on context then use that value directly
    if( ctx.taskAssignmentCtx.maxTableRowsToShow ) {
        maxRowsToShow = ctx.taskAssignmentCtx.maxTableRowsToShow;
    }

    if( data.grids && data.grids.taskTreeTable ) {
        data.grids.taskTreeTable.gridOptions.maxRowsToShow = maxRowsToShow;
    }

    // Check if parent child map exist and requested node id for children need to be loaded that info is already present
    // then no need to make SOA call populate the table from cache information
    if( ctx.taskAssignmentCtx && ctx.taskAssignmentCtx.parentChildMap && ctx.taskAssignmentCtx.parentChildMap[ treeLoadInput.parentNode.uid ] ) {
        var taskAssignmentDataObject = ctx.taskAssignmentCtx.taskAssignmentDataObject;

        data.taskAssignmentDataObject = taskAssignmentDataObject;
        // Get the child tasks that need to be shown in table and delete that parent node entry
        // from the map
        var childTasks = ctx.taskAssignmentCtx.parentChildMap[ treeLoadInput.parentNode.uid ];
        taskAssignmentDataObject.childTaskObjects = childTasks;

        // Check if table is on edit mode then while refreshing the table we need to set the active handler
        // as task row edit that is being used while making the modification in table
        if( ctx.taskAssignmentCtx.isModified ) {
            var _interactionEditCtx = 'TASK_ROW_EDIT';
            editHandlerSvc.setActiveEditHandlerContext( _interactionEditCtx );
        }
        var endReachedVar = true;
        var startReachedVar = true;
        // Get the assignment data that need to be shown in table
        var treeLoadResult = _getAssignmentTableData( ctx, treeLoadInput, taskAssignmentDataObject, startReachedVar, endReachedVar );
        deferred.resolve( {
            treeLoadResult: treeLoadResult
        } );
    } else {
        var queryObject = clientDataModel.getObject( nodeUIDToQuery );
        // Check if query object is invalid then no need to process further
        if( !queryObject || !queryObject.uid ) {
            return deferred.resolve( _emptyResultTable );
        }
        var additionalData = {};
        // Check if target object is not null then we need to pass it as additionalData that contains target
        // object to server so that it will get DP data
        if( ctx.taskAssignmentCtx && ctx.taskAssignmentCtx.additionalTargetData  ) {
            additionalData = ctx.taskAssignmentCtx.additionalTargetData;
        }
        var soaInput = {
            inData : [
                {
                    taskOrTemplate : queryObject,
                    operationMode : operationMode,
                    clientId : 'getAssignmentData',
                    startIndex: treeLoadInput.startChildNdx,
                    maxToLoad: -1,
                    additionalData : additionalData
                }
            ]
        };
        soaSvc.postUnchecked( 'Internal-Workflowaw-2020-12-Workflow', 'getWorkflowTaskAssignments', soaInput ).then(
            function( response ) {
                // Check if response is invalid then return from here
                if( !response || !response.output || !response.output[ 0 ] ) {
                    return deferred.resolve( _emptyResultTable );
                }
                var soaOutData = response.output[0];

                var taskAssignmentObject = data.taskAssignmentDataObject;
                // Check if user is loading the children of top node then set taskAssignmentData to null as we are loading
                // tree fresh from server data
                if(  treeLoadInput.parentNode.uid === 'top' ) {
                    taskAssignmentObject = null;
                }
                // Populate the task assignment data and based on that update parent child map as well so that it will be used
                // while relaoding the table
                data.taskAssignmentDataObject = wrkflwAssignmentSvc.populateTaskAssignmentData( soaOutData, taskAssignmentObject );
                ctx.taskAssignmentCtx.taskAssignmentDataObject = data.taskAssignmentDataObject;
                if( soaOutData.additionalData && soaOutData.additionalData.assignalltask_isUserPrivileged
                    &&  soaOutData.additionalData.assignalltask_isUserPrivileged[ 0 ] ) {
                    ctx.taskAssignmentCtx.isPrivilegedToAssign = soaOutData.additionalData.assignalltask_isUserPrivileged[ 0 ];
                }
                //Check if parent child map is undefined then set it to empty
                if( !ctx.taskAssignmentCtx.parentChildMap ) {
                    ctx.taskAssignmentCtx.parentChildMap = {};
                }
                ctx.taskAssignmentCtx.parentChildMap[ treeLoadInput.parentNode.uid ] = data.taskAssignmentDataObject.childTaskObjects;
                var endReachedVar = true;
                var startReachedVar = true;
                // Get the assignment data that need to be shown in table
                var treeLoadResult = _getAssignmentTableData( ctx, treeLoadInput, data.taskAssignmentDataObject, startReachedVar, endReachedVar );

                deferred.resolve( {
                    treeLoadResult: treeLoadResult
                } );
            },
            function( error ) {
                deferred.reject( error );
            } );
    }

    return deferred.promise;
};


/**
 * Check for task assignment panel is up or not either tool and info or as popup panel.
 *
 * @param {object} ctx - ctx
 * @returns {boolean} True/False
 */
var _isAssignmentPanelOpened = function( ctx ) {
    if( ctx.activeToolsAndInfoCommand && ctx.activeToolsAndInfoCommand.commandId === 'Awp0TaskAssignmentCommandPanel' ) {
        return true;
    }
    var popupPanelRef = workflowPopupSvc.getPopupPanelRef();
    if( popupPanelRef ) {
        return true;
    }
    return false;
};

/**
 * Show or hide the task assignment panel based on the mode.
 *
 * @param {boolean} isNarrowMode Is narrow mode active or not
 * @param {boolean} isShow True or false based on popup panel need to be shown or clsoe it
 * @param {Object} taskAssignmentCtx Task assignmetn context object
 */
var _showOrHideTaskAssignmentPanel = function( isNarrowMode, isShow, taskAssignmentCtx ) {
    if( isNarrowMode && taskAssignmentCtx ) {
        // If we don't need to show panel for this selection the close the opened panel.
        if( !isShow ) {
            commandPanelService.activateCommandPanel( 'Awp0TaskAssignmentCommandPanel', 'aw_toolsAndInfo', taskAssignmentCtx.panelContext );
        }
        return;
    }
    if( !isShow ) {
        workflowPopupSvc.hidePopupPanel();
    } else {
        var popupPanelContext = {
            declView: 'Awp0TaskAssignmentPopup',
            locals: {
                caption: taskAssignmentCtx.treeTableData.i18n.taskAssignments,
                anchor: 'workflow_popup_panel_anchor'
            },
            options: {
                reference: '.aw-layout-infoCommandbar',
                isModal: false,
                placement: 'left-end',
                width: 650,
                height: 800,
                draggable: false,
                detachMode: true,
                disableClose: true
            }
        };
        workflowPopupSvc.openPopupPanel( popupPanelContext, true );
    }
};

/**
 * This will auto open the panel on selection of tree node
 * @param {object} selectedObject - Selected object from tree
 * @param {object} ctx - ctx
 */
export let taskNodeSelection = function( selectedObject, ctx ) {
    // Check if we have assignemnt panel in panel then fire the event and return from here.
    // So it will be panel responsiblity to handle the selection changes
    if( ctx.taskAssignmentCtx && ctx.taskAssignmentCtx.isInsidePanel ) {
        eventBus.publish( 'workflow.taskAssignmentRowSelection' );
        return;
    }

    var isNarrowMode = ctx.taskAssignmentCtx.isNarrowViewMode;
    // Check if selection is empty and panel is open then close the panel.
    if(  !selectedObject && _isAssignmentPanelOpened( ctx ) ) {
        ctx.taskAssignmentCtx.panelContext = null;
        _showOrHideTaskAssignmentPanel( isNarrowMode, false, ctx.taskAssignmentCtx );
        return;
    }

    // Check if panel is up and modify button is enabled and user selected other task then we need to show
    // noty message to user and based on interaction update the table with changes or discard it
    if( ctx.taskAssignmentCtx.enableModifyButton && _isAssignmentPanelOpened( ctx ) && ctx.taskAssignmentCtx.selectedTaskObject ) {
        var messageParams = {
            source: ctx.taskAssignmentCtx.selectedTaskObject.props.object_name.dbValues[ 0 ]
        };
        eventBus.publish( 'panelModificationWarningMsg', messageParams );
    } else {
        var panelContext = wrkflwAssignmentSvc.registerAssignmentPanelContext( ctx.taskAssignmentCtx, selectedObject );
        var isValidSelection = isOfType( selectedObject, 'EPMTask' ) || isOfType( selectedObject, 'EPMTaskTemplate' );
        ctx.taskAssignmentCtx.panelContext = panelContext;
        // If panel is open or not and selection is valid then open or update the panel else close the panel
        if( !_isAssignmentPanelOpened( ctx ) && isValidSelection ) {
            _showOrHideTaskAssignmentPanel( isNarrowMode, true, ctx.taskAssignmentCtx );
        } else if( _isAssignmentPanelOpened( ctx ) ) {
            if( !isValidSelection ) {
                _showOrHideTaskAssignmentPanel( isNarrowMode, false, ctx.taskAssignmentCtx );
                return;
            }
            eventBus.publish( 'workflow.refreshPanel' );
        }
    }
};

/**
 * Pre select the node on asssignment tree based on input context info. This is used when user modify
 * some values from panel but did not click on modify and change the selection then we need to update
 * the tree based on user decision and then select the task in tree automatically.
 *
 * @param {Object} context COntext object have info to tree node to be selected
 */
export let preSelectTaskNode = function( context ) {
    // Check if task Uid is present then get the all loaded obejct in view model
    // collection in tree data provider and check if taskUid present. Based on that
    // find the node and if present then select it.
    if( context.preSelectTaskUid ) {
        var viewModelCollection = context.treeDataProvider.getViewModelCollection();
        var loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();

        var preSelectTreeNode = _.find( loadedVMObjs, {
            uid: context.preSelectTaskUid
        } );
        if( preSelectTreeNode ) {
            context.preSelectTaskUid = null;
            context.treeDataProvider.selectionModel.setSelection( preSelectTreeNode );
        }
    }
};

/**
 * Set the pal list on data object so that it can be shown on widget.
 * @param {Object} data Data view model object
 */
export let loadPALData = function( data ) {
    if( data && data.palsList ) {
        data.moreValuesExist = false;
        data.totalPalFound = data.palsList.length;
        data.totalPalList = data.palsList;
    }
};

/**
 * Get all PAL associated with input template object and set it on context correctly.
 * @param {Object} taskTemplateObject Task template object for which PAL needs to be fetched.
 * @param {Object} data Data view model object
 */
export let getAssignmentLists = function( taskTemplateObject, data ) {
    var processAssignmentListObj = [];
    data.palsList = [];
    if( !taskTemplateObject || !data ) {
        return;
    }
    // Get assignemnt list proeprty from template object and populate it in the list to be shown on UI
    if( taskTemplateObject.props && taskTemplateObject.props.assignment_lists && taskTemplateObject.props.assignment_lists.dbValues ) {
        _.forEach( taskTemplateObject.props.assignment_lists.dbValues, function( palUid ) {
            processAssignmentListObj.push( clientDataModel.getObject( palUid ) );
        } );

        if( processAssignmentListObj.length > 0 ) {
            var palsList = listBoxService.createListModelObjects( processAssignmentListObj, 'props.object_string' );
            palsList = _.sortBy( palsList, 'propDisplayValue' );
            data.palsList = palsList;
        }
    }
    data.moreValuesExist = false;
};

/**
 * Update the narrow mode info on the context
 * @param {Object} taskAssignmentCtx Task assignmetn context object
 * @param {boolean} isEnterNarrowMode Is in narrow mode or not
 */
export let narrowModeChange = function( taskAssignmentCtx, isEnterNarrowMode ) {
    //isEnterNarrowMode = true;
    if( taskAssignmentCtx ) {
        taskAssignmentCtx.isNarrowViewMode = isEnterNarrowMode;
    }
};

/**
 * Clear the selection for input data provider.
 *
 *
 * @param {Object} dataProvider Data provider object
 */
export let clearTableSelection = function( dataProvider ) {
    if( dataProvider ) {
        dataProvider.selectNone();
        dataProvider.selectedObjects = [];
    }
};

export default exports = {
    loadTreeTableColumns,
    registerPropPolicy,
    unRegisterPropPolicy,
    loadTreeTableData,
    taskNodeSelection,
    getAssignmentLists,
    loadPALData,
    preSelectTaskNode,
    getValidObjectToPropLoad,
    narrowModeChange,
    clearTableSelection
};

/**
 * @memberof NgServices
 * @member Awp0TaskAssignmentTable
 */
app.factory( 'Awp0TaskAssignmentTable', () => exports );
