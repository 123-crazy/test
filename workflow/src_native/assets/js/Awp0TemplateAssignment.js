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
 * @module js/Awp0TemplateAssignment
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import clientDataModel from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import iconSvc from 'js/iconService';
import policySvc from 'soa/kernel/propertyPolicyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import uwPropertySvc from 'js/uwPropertyService';
import commandPanelService from 'js/commandPanel.service';
import appCtxSvc from 'js/appCtxService';
import palMgmtSvc from 'js/Awp0PalMgmtService';
import assignmentEditSvc from 'js/Awp0WorkflowAssignmentEditService';
import editHandlerService from 'js/editHandlerService';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Cached static default AwTableColumnInfo.
 */
var _treeTableColumnInfos = null;

var _propPolicy = null;

var parentData = null;

/**
 * @param {data} data data
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos( data ) {
    var columnInfos = [];
    var colNdx = 0;
    var _attributes = [ {
            propName: 'object_string',
            propDisplayName: data.i18n.taskName,
            width: 225,
            enableCellEdit: true,
            isTreeNavigation: true,
            minWidth: 150,
            type: 'String'
        },
        {
            propName: 'fnd0Assigner',
            propDisplayName: data.i18n.Assigner,
            width: 180,
            isTreeNavigation: false,
            minWidth: 100,
            type: 'OBJECT'
        },
        {
            propName: 'fnd0Assignee',
            propDisplayName: data.i18n.assignee,
            width: 180,
            isTreeNavigation: false,
            minWidth: 100,
            type: 'OBJECT'
        },
        {
            propName: 'awp0Reviewers',
            propDisplayName: data.i18n.reviewers,
            width: 280,
            isTreeNavigation: false,
            minWidth: 100,
            type: 'OBJECTARRAY'
        },
        {
            propName: 'awp0Acknowledgers',
            propDisplayName: data.i18n.Acknowledgers,
            width: 280,
            isTreeNavigation: false,
            minWidth: 100,
            type: 'OBJECTARRAY'
        },
        {
            propName: 'awp0Notifyees',
            propDisplayName: data.i18n.Notifyees,
            width: 280,
            isTreeNavigation: false,
            minWidth: 100,
            type: 'OBJECTARRAY'
        }
    ];

    _.forEach( _attributes, function( attrObj ) {
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
        if( attrObj.cellTemplate ) {
            columnInfo.cellTemplate = attrObj.cellTemplate;
        }

        /**
         * Set values for un-common properties
         */
        columnInfo.typeName = attrObj.type;
        columnInfo.enablePinning = true;
        columnInfo.enableSorting = true;
        columnInfo.enableCellEdit = false;
        columnInfo.modifiable = false;
        columnInfos.push( columnInfo );
        colNdx++;
    } );
    return columnInfos;
}

/**
 * @param {data} data data view model object
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos( data ) {
    if( !_treeTableColumnInfos ) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos( data );
    }

    return _treeTableColumnInfos;
}

/**
 * Get the information of all profile, reviewers and signOffs.
 *
 * @param {object} uwDataProvider - the data provider
 * @param {object} data - data Object
 * @return {deferred} - deferred object
 */
export let loadTreeTableColumns = function( uwDataProvider, data ) {
    var deferred = AwPromiseService.instance.defer();
    uwDataProvider.showDecorators = true;
    uwDataProvider.columnConfig = {
        columns: _getTreeTableColumnInfos( data )
    };
    deferred.resolve( {
        columnInfos: _getTreeTableColumnInfos( data )
    } );
    if( data ) {
        data.columnsloaded = true;
    }
    return deferred.promise;
};

/**
 * Check if input object is of type input type. If yes then
 * return true else return false.
 *
 * @param {Obejct} obj Object to be match
 * @param {String} type Object type to match
 *
 * @return {boolean} True/False
 */
var isOfType = function( obj, type ) {
    if( obj && obj.modelType.typeHierarchyArray.indexOf( type ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * Create the property obejct with db value based on column name whose
 * value needs to be populated.
 *
 * @param {Object} data Data view model object
 * @param {Object} obj Object where values are stored and values will
 *  be populated based on these values
 * @param {String} columnName Column name string
 * @return {Object} Property obejct with valid dbValue and dispaly values
 */
var _getPropertyObject = function( data, obj, columnName ) {
    var propObject = {
        dbValue: '',
        dbValues: [],
        dispValues: []
    };
    var object = data.palDataMap[ obj.uid ];
    if( !object ) {
        return propObject;
    }
    var valueObjects = null;
    if( columnName === 'fnd0Assignee' ) {
        valueObjects = object.fnd0Assignee;
    } else if( columnName === 'fnd0Assigner' ) {
        valueObjects = object.fnd0Assigner;
    } else if( columnName === 'awp0Reviewers' ) {
        valueObjects = object.awp0Reviewers;
    } else if( columnName === 'awp0Acknowledgers' ) {
        valueObjects = object.awp0Acknowledgers;
    } else if( columnName === 'awp0Notifyees' ) {
        valueObjects = object.awp0Notifyees;
    }

    if( valueObjects ) {
        var count = 0;
        _.forEach( valueObjects, function( value ) {
            if( value && value.uid ) {
                if( count === 0 ) {
                    propObject.dbValue = value.uid;
                } else {
                    propObject.dbValue = propObject.dbValue + ',' + value.uid;
                }
                propObject.dbValues.push( value.uid );
                propObject.dispValues.push( value.props.object_string.uiValues[ 0 ] );
                count++;
            }
        } );
    }
    return propObject;
};

/**
 * Create view model object property to show the correct values on assignment tree
 * @param {Object} data Data view model object
 * @param {Object} obj Object where values are stored and values will
 *  be populated based on these values
 * @param {Object} columnInfo Column info obejct that will contain column name and display name
 */
var _createProperty = function( data, obj, columnInfo ) {
    var propObject = _getPropertyObject( data, obj, columnInfo.name );
    var uwPropObject = uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName,
        columnInfo.typeName, propObject.dbValue, propObject.dispValues );
    uwPropObject.dbValues = propObject.dbValues;
    uwPropObject.parentUid = obj.uid;
    uwPropObject.isArray = true;
    uwPropertySvc.setIsPropertyModifiable( uwPropObject, false );
    obj.props[ columnInfo.name ] = uwPropObject;
};

/**
 * Check if input task templete is any of EPMDoTaskTemplate, EPMReviewTaskTemplate,
 * EPMAcknowledgeTaskTemplate, EPMRouteTaskTemplate, EPMConditionTaskTemplate then
 * return false else return true.
 *
 * @param {Object} obj EPMTask template object.
 * @return {boolean} True/False
 */
var hasNextLevelTask = function( obj ) {
    if( isOfType( obj, 'EPMDoTaskTemplate' ) || isOfType( obj, 'EPMReviewTaskTemplate' ) || isOfType( obj, 'EPMAcknowledgeTaskTemplate' ) || isOfType( obj, 'EPMRouteTaskTemplate' ) || isOfType( obj, 'EPMConditionTaskTemplate' ) ) {
        return false;
    }
    return true;
};

/**
 * @param {Object} data Data view model object
 * @param {Object} obj object to be created
 * @param {childNdx} childNdx Index
 * @param {levelNdx} levelNdx index
 * @return {ViewModelTreeNode} View Model Tree Node
 */
function createVMNodeUsingObjectInfo( data, obj, childNdx, levelNdx ) {
    var displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    if( obj.props ) {
        if( obj.props.object_string ) {
            displayName = obj.props.object_string.uiValues[ 0 ];
        }
    }

    var viewModelObj = viewModelObjectSvc.constructViewModelObjectFromModelObject( obj, 'EDIT' );

    // get Icon for node
    var iconURL = iconSvc.getTypeIconURL( objType );

    var vmNode = awTableSvc.createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

    var hasChildren = hasNextLevelTask( obj );
    vmNode.isLeaf = !hasChildren;
    vmNode.isExpanded = false;

    _.forEach( _treeTableColumnInfos, function( columnInfo ) {
        if( !columnInfo.isTreeNavigation ) {
            _createProperty( data, viewModelObj, columnInfo );
        }
    } );

    vmNode = _.extend( vmNode, viewModelObj );

    return vmNode;
}

/**
 * This will process the tasks Template based on response of SOA
 * @param {object} data - Data object
 * @param {object} treeLoadInput - tree load inuput of tree
 * @param {Object[]} tasksTemplateObjects - tasks template objects send by SOA
 * @param {boolean} startReached - flag indicates if start has reached for tree
 * @param {boolean} endReached - flag indicates if end has reached for tree
 * @returns {object} treeLoadResult - tree Load result
 */
function processTasksTemplate( data, treeLoadInput, tasksTemplateObjects, startReached, endReached ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];
    // Iterate for all task template objects and create view model node to be shown in tree
    for( var childNdx = 0; childNdx < tasksTemplateObjects.length; childNdx++ ) {
        var object = tasksTemplateObjects[ childNdx ];
        var vmNode = createVMNodeUsingObjectInfo( data, object, childNdx, levelNdx );

        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }

    // Third Paramter is for a simple page for tree
    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached,
        endReached, null );
}

/**
 * Call SOA to get the results that needs to be shown in tree
 *
 * @param {Object} data Data view model object
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 * @param {Object} selected Selected PAL object from UI
 * @param {Promise} deferred Deffered object to return the results
 */
var _loadTreeData = function( data, treeLoadInput, selected, deferred ) {
    var rootTempalte = data.processTemplateObject.uid;
    var nodeUIDToQuery;
    if( treeLoadInput.parentNode.uid === 'top' ) {
        nodeUIDToQuery = rootTempalte;
    } else {
        nodeUIDToQuery = treeLoadInput.parentNode.uid;
    }

    var soaInput = {
        searchInput: {
            maxToLoad: 20,
            maxToReturn: 20,
            providerName: 'Awp0TaskSearchProvider',
            searchCriteria: {
                parentTaskTemplateUID: nodeUIDToQuery
            },
            startIndex: treeLoadInput.startChildNdx
        },
        inflateProperties: false
    };

    soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        function( response ) {
            var tasksTemplateObjects = [];

            if( response.searchResultsJSON ) {
                var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                if( searchResults ) {
                    // Iterate for all search result objects and populate the template objects
                    // that will be shown in tree
                    _.forEach( searchResults.objects, function( searchObject ) {
                        var object = clientDataModel.getObject( searchObject.uid );
                        if( object ) {
                            tasksTemplateObjects.push( object );
                        }
                    } );
                }
            }

            var endReachedVar = response.totalLoaded + treeLoadInput.startChildNdx === response.totalFound;

            var startReachedVar = true;

            var tempCursorObject = {
                endReached: endReachedVar,
                startReached: true
            };

            // Process task templated to show the results
            var treeLoadResult = processTasksTemplate( data, treeLoadInput, tasksTemplateObjects, startReachedVar,
                endReachedVar );

            treeLoadResult.parentNode.cursorObject = tempCursorObject;
            // Check if PAL info is loading after create and app context contains newly created PAL uid then
            // by default do start edit for created PAL and then unregister the context
            if( treeLoadInput.parentNode.uid === 'top' && appCtxSvc.ctx && appCtxSvc.ctx.newlyCreatedAssignmentListObjUid ) {
                exports.startEditTemplateAssignment();
                appCtxSvc.unRegisterCtx( 'newlyCreatedAssignmentListObjUid' );
            }
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        },
        function( error ) {
            deferred.reject( error );
        } );
};

/**
 * Check if user has priviledge to modify then only based on validation return true/false.
 * 1. Check if logger in user and pal owing user both are same then return true.
 * 2. Check if selected PAL is shared and PAL owning group and logged in group both are same
 * then return true.
 * 3. Check if logged in group is dba then return true.
 *
 * @param {Object} selected Selected PAL obejct from UI
 * @param {Object} ctx App context object
 * @return {boolean} True/False
 */
var _isPriviledgedToModify = function( selected, ctx ) {
    var isPriviledge = false;
    var palObject = clientDataModel.getObject( selected.uid );
    var owningUserUid = palObject.props.owning_user.dbValues[ 0 ];
    var owningGroupUid = palObject.props.owning_group.dbValues[ 0 ];
    var sharedPal = palObject.props.shared.dbValues[ 0 ];

    if( ctx.userSession.props.user.dbValue === owningUserUid ) {
        isPriviledge = true;
    } else if( sharedPal === '1' && owningGroupUid === ctx.userSession.props.group.dbValue ) {
        isPriviledge = true;
    } else if( ctx.userSession.props.group_name.dbValue === 'dba' ) {
        isPriviledge = true;
    }
    return isPriviledge;
};

/**
 * Populate the priviledge that user is group admin or system admin and based
 * on that it will update the values on context.
 */
var _populatePriviledgeToSharePAL = function() {
    palMgmtSvc.isGroupAdminOrSysAdmin( appCtxSvc.ctx ).then( function( isGroupAdminOrSysAdmin ) {
        var workflowPalCtx = appCtxSvc.getCtx( 'workflowPalData' );
        workflowPalCtx.isGroupAdminOrSysAdmin = isGroupAdminOrSysAdmin;
        appCtxSvc.updateCtx( 'workflowPalData', workflowPalCtx );
    } );
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {Object} data Data view model object
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 * @param {Object} selected Selected PAL object from UI
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableData = function( data, treeLoadInput, selected ) {
    var deferred = AwPromiseService.instance.defer();

    if( data._internal && data._internal.panelId && data._internal.panelId === 'Awp0TemplateAssignment' ) {
        parentData = data;
    } else {
        data = parentData;
    }

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );
        return deferred.promise;
    }

    // Check if processTemplateObject is already present then use that
    // to load tree data else get the process template and load tree data
    if( data.processTemplateObject && data.processTemplateObject.uid ) {
        _loadTreeData( data, treeLoadInput, selected, deferred );
    } else {
        // Get the process template from selected PAL and then call load tree data
        // to load the tree rows
        palMgmtSvc.getProcessTemplateFromPal( selected ).then( function( processTemplate ) {
            data.processTemplateObject = processTemplate;
            data.palDataMap = palMgmtSvc.populatePalStructure( selected );
            var isPriviledge = _isPriviledgedToModify( selected, appCtxSvc.ctx );
            var modelObject = clientDataModel.getObject( selected.uid );
            var selPalVMO = viewModelObjectSvc.constructViewModelObjectFromModelObject( modelObject, 'EDIT' );
            _loadTreeData( data, treeLoadInput, selected, deferred );
            var context = {
                palDataMap: data.palDataMap,
                processTemplateObject: data.processTemplateObject,
                isPriviledgeToModify: isPriviledge,
                selPalVMO: selPalVMO
            };
            _populatePriviledgeToSharePAL();

            // Set the value on app context serivce and activate the command panel
            appCtxSvc.registerCtx( 'workflowPalData', context );
        } );
    }

    return deferred.promise;
};

/**
 * Register the property polciy that need to be registered when user go to
 * assignment tab for assign all task.
 *
 * @param {object} dataProvider Data provider object
 */
export let registerPropPolicy = function( dataProvider ) {
    var policy = dataProvider.policy;
    if( policy ) {
        _propPolicy = policySvc.register( policy );
    }
};

/**
 *
 * UnRegister the property polciy that need to be removed from policy when user go out from
 * assignment tab for assign all task.
 */
export let unRegisterPropPolicy = function() {
    if( _propPolicy ) {
        policySvc.unregister( _propPolicy );
        _propPolicy = null;
    }
};

/**
 * Check for open tool and info panel is Awp0TemplateAssignmentPanel or not.
 * @param {object} ctx - ctx
 * @returns {boolean} True/False
 */
var _isAssignmentPanelOpened = function( ctx ) {
    if( ctx.activeToolsAndInfoCommand && ctx.activeToolsAndInfoCommand.commandId === 'Awp0TemplateAssignmentPanel' ) {
        return true;
    }
    return false;
};

/**
 * When user select/unselect any row from assignment tree this method either
 * open task assignment panel or close the panel.
 * @param {Array} selectedObjects Selected users from user picker panel
 * @param {Object} ctx App context object
 */
export let templateRowChangeSelection = function( selectedObjects, ctx ) {
    if( selectedObjects && selectedObjects.length > 0 ) {
        if( !_isAssignmentPanelOpened( ctx ) ) {
            ctx.workflowPalData.selTemplate = selectedObjects[ 0 ];
            commandPanelService.activateCommandPanel( 'Awp0TemplateAssignmentPanel', 'aw_toolsAndInfo' );
        } else {
            ctx.workflowPalData.selTemplate = selectedObjects[ 0 ];
            eventBus.publish( 'palMgmt.refreshAssignmentPanel' );
        }
    } else {
        if( _isAssignmentPanelOpened( ctx ) ) {
            commandPanelService.activateCommandPanel( 'Awp0TemplateAssignmentPanel', 'aw_toolsAndInfo' );
        }
    }
};

/**
 * Check if input proeprty old value and new value is not same
 * then only put the proeprty in edit mode else ignore and return from here.
 *
 * @param {Object} prop Property that need to be modified
 * @param {Array} newValues New values that will be set
 */
var _updateProperty = function( prop, newValues ) {
    var dbValues = [];
    var uiValues = [ '' ];
    var uiValue = '';
    var dbValue = '';
    if( newValues && newValues.length > 0 ) {
        uiValues = [];
        for( var idx = 0; idx < newValues.length; idx++ ) {
            var object = newValues[ idx ];
            if( object ) {
                if( idx === 0 ) {
                    dbValue = object.uid;
                } else {
                    dbValue = dbValue + ',' + object.uid;
                }

                dbValues.push( object.uid );
                uiValues.push( object.props.object_string.uiValue );
                if( idx === 0 ) {
                    uiValue = object.props.object_string.uiValue;
                } else {
                    uiValue = uiValue + ',' + object.props.object_string.uiValue;
                }
            }
        }
    }

    // Check if prop old value and new value both are same or not.
    var isEqual = _.isEqual( JSON.stringify( prop.dbValue ), JSON.stringify( dbValue ) );

    // If both are equal then return from here otherwise update property value
    if( isEqual ) {
        return;
    }

    prop.dbValues = dbValues;
    prop.dbValue = dbValues;
    prop.uiValues = uiValues;
    prop.uiValue = uiValue;
    prop.displayValues = uiValues;
    prop.value = dbValues;
    prop.values = dbValues;
    prop.valueUpdated = true;
    prop.isEditable = true;
};

/**
 * Save template assignments. Get the required values
 * from app context and then call SOA to update the pal information.
 * @return {deferred} - deferred object
 */
export let saveTemplateAssignments = function() {
    var processTemplateObject = appCtxSvc.ctx.workflowPalData.processTemplateObject;
    var palDataMap = appCtxSvc.ctx.workflowPalData.palDataMap;
    var selectedPALObject = appCtxSvc.ctx.xrtSummaryContextObject;
    var palDataStructure = {
        palName: parentData.palName.dbValue,
        palDesc: parentData.palDesc.dbValues,
        isShared: parentData.isSharedOption.uiValue
    };

    // Check if pal data map, process template object and selected PAL is not null
    // then only call pal mgmt service.
    if( palDataMap && processTemplateObject && selectedPALObject ) {
        var deferred = AwPromiseService.instance.defer();
        palMgmtSvc.saveTemplateAssignments( palDataMap, processTemplateObject, selectedPALObject, palDataStructure ).then( function() {
            eventBus.publish( 'Awp0TemplateAssignment.reset' );
        } );
        return deferred.promise;
    }
};

/**
 * Set the edit context
 *
 * @param {Object} data Data view model object
 */
var _setEditContext = function( data ) {
    var _resetEditContext = function() {
        var workflowPalCtx = appCtxSvc.getCtx( 'workflowPalData' );
        if( workflowPalCtx ) {
            workflowPalCtx.isTemplateAssignmentInProgress = false;
            workflowPalCtx.isInEditMode = false;
        }

        appCtxSvc.updateCtx( 'workflowPalData', workflowPalCtx );
        // Reset the processTemplateObject on workflow template to null so that it will get
        // fresh information from server and populate the PAL data map again.
        parentData.processTemplateObject = null;
        parentData.palName.isEditable = false;
        parentData.palName.isEnabled = false;
        parentData.palDesc.isEditable = false;
        parentData.palDesc.isEnabled = false;
        parentData.isSharedOption.isEditable = false;
        parentData.isSharedOption.isEnabled = false;

        // Check if assignment panel is up then close it.
        if( _isAssignmentPanelOpened( appCtxSvc.ctx ) ) {
            commandPanelService.activateCommandPanel( 'Awp0TemplateAssignmentPanel', 'aw_toolsAndInfo' );
        }
    };

    var startEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();

        deferred.resolve( {} );
        return deferred.promise;
    };

    var saveEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();
        exports.saveTemplateAssignments();
        _resetEditContext();
        deferred.resolve( {} );
        return deferred.promise;
    };

    var cancelEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();
        _resetEditContext();
        deferred.resolve( {} );
        return deferred.promise;
    };

    // Check if workflow PAL data present then only set the edit mode
    if( appCtxSvc.ctx.workflowPalData ) {
        var editInProgressContext = appCtxSvc.ctx.workflowPalData.isTemplateAssignmentInProgress;
        //create Edit Handler
        assignmentEditSvc.createEditHandlerContext( data, startEditFunc, saveEditFunc, cancelEditFunc, 'TEMPLATE_ROW_EDIT', editInProgressContext );
    }
};

/**
 * Cancel the assignment being made from user and refresh the page.
 */
export let cancelTemplateAssignments = function() {
    var editHandler = editHandlerService.getEditHandler( 'TEMPLATE_ROW_EDIT' );
    // Get the edit handler and if not null then cancel all edits
    if( editHandler ) {
        editHandler.cancelEdits();
    }
    eventBus.publish( 'Awp0TemplateAssignment.reset' );
};

/**
 * Update task template node in assignment tree based on changes done from UI.
 *
 * @param {Array} selectedObjects Selected tree node array that need to be updated
 * @param {*} ctx App context object to get PAL related information
 * @param {*} data Data view model object
 */
export let updateTemplateAssignmentNode = function( selectedObjects, ctx, data ) {
    if( !selectedObjects || selectedObjects.length <= 0 ) {
        return;
    }
    var selTreeNode = selectedObjects[ 0 ];
    var palDataMap = ctx.workflowPalData.palDataMap;

    var templateContext = palDataMap[ selTreeNode.uid ];

    // Get the template context info from PAL map and check if proeprty is modified or not
    // and based on the values put the specific cells in edit mode.
    if( templateContext ) {
        _updateProperty( selTreeNode.props.fnd0Assignee, templateContext.fnd0Assignee );
        _updateProperty( selTreeNode.props.fnd0Assigner, templateContext.fnd0Assigner );

        _updateProperty( selTreeNode.props.awp0Reviewers, templateContext.awp0Reviewers );

        _updateProperty( selTreeNode.props.awp0Acknowledgers, templateContext.awp0Acknowledgers );
        _updateProperty( selTreeNode.props.awp0Notifyees, templateContext.awp0Notifyees );

        // Refresh the table
        eventBus.publish( 'taskTemplateTreeTable.plTable.clientRefresh' );

        // Put the tree node in edit mode
        _setEditContext( data );
    }
};

/**
 * Put the properties section and table in edit mode.
 * Manually put the properties in edit
 */
export let startEditTemplateAssignment = function() {
    var workflowPalCtx = appCtxSvc.getCtx( 'workflowPalData' );
    if( workflowPalCtx ) {
        workflowPalCtx.isTemplateAssignmentInProgress = true;
        workflowPalCtx.isInEditMode = true;
    }
    // Put the tree node in edit mode
    _setEditContext( parentData );
    parentData.palName.isEditable = true;
    parentData.palName.isEnabled = true;
    parentData.palDesc.isEditable = true;
    parentData.palDesc.isEnabled = true;

    if( workflowPalCtx.isGroupAdminOrSysAdmin ) {
        parentData.isSharedOption.isEditable = true;
        parentData.isSharedOption.isEnabled = true;
    }
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
    loadTreeTableColumns,
    loadTreeTableData,
    registerPropPolicy,
    unRegisterPropPolicy,
    templateRowChangeSelection,
    saveTemplateAssignments,
    cancelTemplateAssignments,
    updateTemplateAssignmentNode,
    startEditTemplateAssignment,
    initializeParentData
};
app.factory( 'Awp0TemplateAssignment', () => exports );
