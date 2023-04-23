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
 * @module js/Awp0TemplateHandlersTab
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import viewModelObjectService from 'js/viewModelObjectService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import policySvc from 'soa/kernel/propertyPolicyService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import clientDataModel from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

var _propPolicy = null;

/**
 * Create the VM node that need to be shown in tree as node.
 *
 * @param {Object} data Data view model object
 * @param {Object} obj object to be created
 * @param {childNdx} childNdx Index
 * @param {levelNdx} levelNdx index
 * @return {ViewModelTreeNode} View Model Tree Node
 */
function createVMNodeUsingObjectInfo( data, parentNode, object, childNdx, levelNdx ) {
    // Check if input object is null then no need to create node from here and return.
    if( !object && !object.type ) {
        return null;
    }
    var displayName;
    var objUid = object.uid;
    var objType = object.type;
    // Check if object props is not null and object string proeprty populated then
    // get the dispaly name from property
    if( object.props && object.props.object_string && object.props.object_string.uiValues ) {
        displayName = object.props.object_string.uiValues[ 0 ];
    }
    var viewModelObj = null;
    var iconURL = null;
    // Check if uid present
    if( object.uid ) {
        viewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject( object, 'EDIT' );
        iconURL = iconSvc.getTypeIconURL( objType );
    } else {
        // Create the action nodes as these are dummy objects and set some required
        // properties and dispaly name to be shown.
        objType = 'Action';
        viewModelObj = tcViewModelObjectService.createViewModelObjectById( object.actionName );
        viewModelObj.uid = object.actionName;
        viewModelObj.actionType = object.actionType;
        displayName = data.i18n[ object.actionName ];
        viewModelObj.type = objType;
        iconURL = iconSvc.getTypeIconFileUrl( 'typeFolder48.svg' );
    }

    // Check if view model object is null then no need to process futher and return from here
    if( !viewModelObj ) {
        return null;
    }

    var hasChildren = true;

    //Check if action object has no children then set hasChildren to false so no expand icon will be shown
    if( object.actionEmpty ) {
        hasChildren = false;
    } else if( viewModelObj.modelType && viewModelObj.modelType.typeHierarchyArray.indexOf( 'EPMHandler' ) > -1 ) {
        // Check if viewModelObj is of type EPMHandler then set hasChildren to false so no expand icon will be shown
        hasChildren = false;
    } else if( viewModelObj.modelType && viewModelObj.modelType.typeHierarchyArray.indexOf( 'EPMBusinessRule' ) > -1 ) {
        // Check if viewModelObj is of type EPMBusinessRule then set dispaly name correctly based on rule quorum
        var quorumProp = null;
        if( viewModelObj.props.rule_quorum && viewModelObj.props.rule_quorum.dbValues ) {
            quorumProp = viewModelObj.props.rule_quorum.dbValues[ 0 ];
        }
        var ruleHandlerLength = 0;
        if( viewModelObj.props.rule_handlers && viewModelObj.props.rule_handlers.dbValues ) {
            ruleHandlerLength = viewModelObj.props.rule_handlers.dbValues.length;
        }

        // Parse the quorum string value to int value to populate the correct label
        var quorumIntValue = 0;
        if( quorumProp ) {
            quorumIntValue = parseInt( quorumProp );
        }

        // Check if rule handler length > 1 and quorumIntValue equal to ruleHandlerLength then set the and rule label
        // Check if rule handler length > 1 and quorumIntValue equal to 1 then set the or rule label
        // Else set the default rule label
        if( ruleHandlerLength > 1 && quorumIntValue === ruleHandlerLength ) {
            displayName = data.i18n.andRuleLabel;
        } else if( ruleHandlerLength > 1 && quorumIntValue === 1 ) {
            displayName = data.i18n.orRuleLabel;
        } else {
            displayName = data.i18n.quorumRuleLabel;
        }
    }

    // Create the tree node and set that ti has child nodes or not based on certail validation
    var vmNode = awTableSvc.createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );
    vmNode.id = viewModelObj.uid;
    vmNode.uid = viewModelObj.uid;
    vmNode.isLeaf = !hasChildren;
    vmNode.isExpanded = false;
    vmNode = _.extend( vmNode, viewModelObj );
    return vmNode;
}

/**
 * Create all actions for specific selected task template object and return those nodes.
 *
 * @param {Object} data Data view model object
 * @param {Object} parentNode Parent node for children need to be populated
 * @param {Array} modelObjects Model objects for nodes need to be created
 * @param {Array} vmNodes VM nodes created for input model objects
 * @param {Array} nodesToExpanded Nodes that have children needs to be exapnded by default
 *
 */
var _createNodesforObjects = function( data, parentNode, modelObjects, vmNodes, nodesToExpanded ) {
    if( parentNode && modelObjects && modelObjects.length > 0 ) {
        var levelNdx = parentNode.levelNdx + 1;
        for( var ndx = 0; ndx < modelObjects.length; ndx++ ) {
            // Create the node for model object
            var vmNode = createVMNodeUsingObjectInfo( data, parentNode, modelObjects[ ndx ], ndx, levelNdx );
            if( vmNode ) {
                vmNodes.push( vmNode );
                // Check if VM node is not leaf level node means it has some children and nodesToExpanded
                // is defiend then add to nodesToExpanded so that it can be expanded by default
                if( !vmNode.isLeaf && nodesToExpanded ) {
                    nodesToExpanded.push( vmNode );
                }
            }
        }
    }
};

/**
 * Create all actions for specific selected task template object and return those nodes.
 *
 * @param {Object} data Data view model object
 * @param {Object} parentNode Parent node for children need to be populated
 * @param {Object} handlerInfo Map that contains info based on nodes need to be created
 * @param {Array} nodesToExpanded Nodes that have children needs to be exapnded by default
 * @return {ObjectArray} Child nodes array that will be shown on UI
 */
var _populateTaskHandlerActionNodes = function( data, parentNode, handlerInfo, nodesToExpanded ) {
    var vmNodes = [];
    // Check if input handlerInfo or parent node is not valid then return emptry array from here
    if( !handlerInfo || !parentNode ) {
        return vmNodes;
    }

    var levelNdx = parentNode.levelNdx + 1;
    // Get all action array that need to be shown for parent tempalte node
    var actionInfoArray = handlerInfo[ parentNode.id ];

    // Check if action array is not null and empty then only iterate to create all action nodes
    if( actionInfoArray && actionInfoArray.length > 0 ) {
        for( var childNdx = 0; childNdx < actionInfoArray.length; childNdx++ ) {
            var object = actionInfoArray[ childNdx ];
            var actionObject = handlerInfo[ object ];
            // Create the node for specific action
            var vmNode = createVMNodeUsingObjectInfo( data, parentNode, actionObject, childNdx, levelNdx );
            if( vmNode ) {
                vmNodes.push( vmNode );
                // Check if VM node is not leaf level node means it has some children and nodesToExpanded
                // is defiend then add to nodesToExpanded so that it can be expanded by default
                if( !vmNode.isLeaf && nodesToExpanded ) {
                    nodesToExpanded.push( vmNode );
                }
            }
        }
    }
    return vmNodes;
};

/**
 * Create all business rule handlers and action handlers for specific action object and return those nodes.
 *
 * @param {Object} data Data view model object
 * @param {Object} parentNode Parent node for children need to be populated
 * @param {Object} handlerInfo Map that contains info based on nodes need to be created
 * @param {Array} nodesToExpanded Nodes that have children needs to be exapnded by default
 * @return {ObjectArray} Child nodes array that will be shown on UI
 */
var _populateBRuleAndActionHandlers = function( data, parentNode, handlerInfo, nodesToExpanded ) {
    var vmNodes = [];
    // Check if input handlerInfo or parent node is not valid then return emptry array from here
    if( !handlerInfo || !parentNode ) {
        return vmNodes;
    }

    // Get the object infor for specific action from map and based on that info create the node
    // for business rule and action handlers
    var object = handlerInfo[ parentNode.id ];

    // Get the business rule objects and if not null then only create those rule nodes
    var ruleBusinessObjects = object.ruleHandlers;
    if( ruleBusinessObjects && ruleBusinessObjects.length > 0 ) {
        _createNodesforObjects( data, parentNode, ruleBusinessObjects, vmNodes, nodesToExpanded );
    }
    // Get the action handler objects and if not null then only create those rule nodes
    var actionHandlers = object.actionHandlers;
    if( actionHandlers && actionHandlers.length > 0 ) {
        _createNodesforObjects( data, parentNode, actionHandlers, vmNodes );
    }
    return vmNodes;
};

/**
 * Create all rule handlers for specific business rule object and return those nodes.
 *
 * @param {Object} data Data view model object
 * @param {Object} parentNode Parent node for children need to be populated
 * @param {Object} handlerInfo Map that contains info based on nodes need to be created
 * @return {ObjectArray} Child nodes array that will be shown on UI
 */
var _populateRuleHandlers = function( data, parentNode, handlerInfo ) {
    var vmNodes = [];
    // Check if input handlerInfo or parent node is not valid then return emptry array from here
    if( !handlerInfo || !parentNode ) {
        return vmNodes;
    }

    // Get all rule handlers for business rule object based on input parent node and if valid
    // then only create rule nodes
    var ruleHandlersArray = handlerInfo[ parentNode.id ];
    if( !ruleHandlersArray || ruleHandlersArray.length <= 0 ) {
        return vmNodes;
    }
    // Create all rule handler nodes
    _createNodesforObjects( data, parentNode, ruleHandlersArray, vmNodes );
    return vmNodes;
};

/**
 * Get the children based on parent and populate the child nodes and return
 * from here so those child nodes will be shown on tree.
 *
 * @param {Object} data Data view model object
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from.
 * @param {Array} nodesToExpanded Nodes that have children needs to be exapnded by default
 *
 * @return {ObjectArray} Child nodes array that will be shown on UI
 */
var _getChildren = function( data, treeLoadInput, nodesToExpanded ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;
    var childNodes = [];
    if( !parentNode ) {
        return childNodes;
    }

    if( parentNode.levelNdx === 0 ) {
        // If parent node index is 0 that means all actions need to be populated
        childNodes = _populateTaskHandlerActionNodes( data, parentNode, data.handlerInfoMap, nodesToExpanded );
    } else if( parentNode.levelNdx === 1 && parentNode.type === 'Action' ) {
        // If parent node index is 1 and parent node type is action then populate all BRobjects and action handlers
        childNodes = _populateBRuleAndActionHandlers( data, parentNode, data.handlerInfoMap, nodesToExpanded );
    } else if( parentNode.modelType && parentNode.modelType.typeHierarchyArray.indexOf( 'EPMBusinessRule' ) > -1 ) {
        // If parent node type is BR rule object then all rule handler needs to be populated
        childNodes = _populateRuleHandlers( data, parentNode, data.handlerInfoMap, nodesToExpanded );
    }
    return childNodes;
};

/**
 * Get the action value based on action type
 * @param {String} actionType Action type string value
 * @return {int} Action type int value based on action type
 */
var _getActionTypeValue = function( actionType ) {
    var action = -1;
    switch ( actionType ) {
        case 'assign_action':
            action = 1;
            break;
        case 'start_action':
            action = 2;
            break;
        case 'perform_action':
            action = 100;
            break;
        case 'complete_action':
            action = 4;
            break;
        case 'skip_action':
            action = 5;
            break;
        case 'suspend_action':
            action = 6;
            break;
        case 'resume_action':
            action = 7;
            break;
        case 'abort_action':
            action = 9;
            break;
        case 'undo_action':
            action = 8;
            break;
        default:
            action = -1;
            break;
    }
    return action;
};

/**
 * Get the action handlers from input property object. If input handler name
 * is not null then add those specific handlers only.
 * @param {Object} propObject handler proeprty object
 * @param {String} actionHandlerName Action ahndler name
 *
 * @return {ObjectArray} -  Action handlers array
 */
var _getPropValues = function( propObject, actionHandlerName ) {
    var propValues = [];
    if( propObject && propObject.dbValues && propObject.dbValues.length > 0 ) {
        _.forEach( propObject.dbValues, function( dbValue ) {
            var object = clientDataModel.getObject( dbValue );
            if( object ) {
                if( !actionHandlerName ) {
                    propValues.push( object );
                } else if( actionHandlerName && object.props.object_string.dbValues &&
                    object.props.object_string.dbValues[ 0 ] === actionHandlerName ) {
                    propValues.push( object );
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
            var bRuleObject = clientDataModel.getObject( dbValue );
            var childObjects = [];
            // Check if BRule object is not null and rule handlers present then gets those rule handlers
            if( bRuleObject && bRuleObject.props.rule_handlers && bRuleObject.props.rule_handlers.dbValues ) {
                _.forEach( bRuleObject.props.rule_handlers.dbValues, function( childDbValue ) {
                    var childObject = clientDataModel.getObject( childDbValue );
                    if( childObject ) {
                        childObjects.push( childObject );
                    }
                } );
                var ruleObject = {
                    object: bRuleObject,
                    childObjects: childObjects
                };
                // Push it to array that will be used to dispaly the nodes in tree later
                propValues.push( ruleObject );
            }
        } );
    }
    return propValues;
};

/**
 * Function to populate the handler info for input object
 *
 */
var _populateHandlersInfo = function( selTemplateObject ) {
    var handlerDataMap = new Object();
    var templateObject = clientDataModel.getObject( selTemplateObject.uid );
    var actionArray = [ 'assign_action', 'start_action', 'perform_action', 'complete_action', 'skip_action', 'suspend_action',
        'resume_action', 'abort_action', 'undo_action'
    ];

    handlerDataMap[ selTemplateObject.uid ] = actionArray;

    // Iterate for all action array and then populate the info for each action along with its action and rule handlers
    _.forEach( actionArray, function( action ) {
        var rulePropName = action + '_rules';
        var actionPropName = action + '_handlers';
        var ruleProp = templateObject.props[ rulePropName ];
        var actionProp = templateObject.props[ actionPropName ];
        var ruleHandlerObjects = _getRuleHandlers( ruleProp );
        var ruleBRHandlerObjects = _getPropValues( ruleProp );
        var actionHandlerObjects = _getPropValues( actionProp );
        var isEmpty = true;
        // Check if for specific action rule and action handler present then set isEmpty on action to false
        if( ( ruleHandlerObjects && ruleHandlerObjects.length > 0 ) || ( actionHandlerObjects && actionHandlerObjects.length > 0 ) ) {
            isEmpty = false;
        }
        var object = {
            actionName: action,
            actionType: _getActionTypeValue( action ),
            ruleHandlers: ruleBRHandlerObjects,
            actionHandlers: actionHandlerObjects,
            actionEmpty: isEmpty
        };

        handlerDataMap[ action ] = object;
        // Check if rule handler objects are not null then only add that info to map
        // where key will be business rule Uid and value will be all rule handlers
        if( ruleHandlerObjects && ruleHandlerObjects.length > 0 ) {
            _.forEach( ruleHandlerObjects, function( ruleHandlerObj ) {
                var ruleHandlers = ruleHandlerObj.childObjects;
                handlerDataMap[ ruleHandlerObj.object.uid ] = ruleHandlers;
            } );
        }
    } );
    return handlerDataMap;
};

/**
 * Call SOA to get the results that needs to be shown in tree
 *
 * @param {Object} data Data view model object
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 * @param {Object} selected Selected PAL object from UI
 * @param {Array} attributes Attributes array that needs to be fetched
 * @param {Promise} deferred Deffered object to return the results
 */
var _loadTreeData = function( data, treeLoadInput, selected, attributes, deferred ) {
    var request = {
        objects: [ selected ],
        attributes: [ 'assign_action_rules', 'start_action_rules', 'perform_action_rules', 'complete_action_rules',
            'skip_action_rules', 'suspend_action_rules', 'resume_action_rules', 'abort_action_rules', 'undo_action_rules',
            'assign_action_handlers', 'start_action_handlers', 'perform_action_handlers', 'complete_action_handlers', 'skip_action_handlers',
            'suspend_action_handlers', 'resume_action_handlers', 'abort_action_handlers', 'undo_action_handlers'
        ]
    };
    // Perform SOA call
    soaService.post( 'Core-2006-03-DataManagement', 'getProperties', request ).then( function( soaResponse ) {
            var endReached = false;
            // Populate the handler info map that will store all information on data and based on that
            // it will be used to populate other nodes later
            data.handlerInfoMap = _populateHandlersInfo( selected );
            var tempCursorObject = {
                endReached: true,
                startReached: true
            };

            // Create the root node for selected template
            var rootNode = createVMNodeUsingObjectInfo( data, null, selected, 0, 0 );

            var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, [ rootNode ], false, true, endReached, null );
            treeLoadResult.parentNode.cursorObject = tempCursorObject;
            // Fire the event to expand root node so actions will be shown by default
            exports.fireToExpandTreeNode( [ rootNode ] );
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        },
        function( error ) {
            deferred.reject( error );
        } );
};

/**
 * Defer the event to exapnd the nodes that need expansion by default.
 * @param {Array} nodesToExpanded Nodes that need to be expanded
 */
export let fireToExpandTreeNode = function( nodes ) {
    if( nodes && nodes.length > 0 ) {
        _.defer( function() {
            // send event that will be handled in this file to check
            // if there are nodes to be expanded. This defer is needed
            // to make sure tree nodes are actually loaded before we attempt
            // to expand them. Fixes a timing issue if not deferred.
            eventBus.publish( 'workflowHandler.expandNodes', {
                nodesToExpand: nodes
            } );
        } );
    }
};

/**
 * Fire tree node expand event if node is not expanded already
 * @param {Array} nodesToExpanded Nodes that need to be expanded
 */
export let expandTreeNodes = function( expandNodes ) {
    _.defer( function() {
        // expandNodes contains nodes we want to expand. We
        // had to make these deferred calls to allow the tree to draw before
        // we asked it to expand a node.
        _.forEach( expandNodes, function( expandNode ) {
            // Check if node is not null and not expanded then only set
            // isExpanded to true and fire the event
            if( expandNode && !expandNode.isExpanded ) {
                expandNode.isExpanded = true;
                eventBus.publish( 'handlersTreeView.plTable.toggleTreeNode', expandNode );
            }
        } );
    } );
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {Object} data Data view model object
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 * @param {Object} selected Selected  object from UI
 * @param {Array} attributes Attributes array that needs to be fetched
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableData = function( data, treeLoadInput, selected, attributes ) {
    var deferred = AwPromiseService.instance.defer();
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );
    if( failureReason ) {
        deferred.reject( failureReason );
        return deferred.promise;
    }

    var parentNode = treeLoadInput.parentNode;
    var isTopNode = parentNode.levelNdx === -1;
    // If need to show parent node then make SOA call and get the data else create child
    // nodes and show
    if( isTopNode ) {
        _loadTreeData( data, treeLoadInput, selected, attributes, deferred );
    } else {
        var nodesToExpanded = [];
        var childNodes = _getChildren( data, treeLoadInput, nodesToExpanded );
        // Create tree load result for all child nodes
        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, childNodes, false, true, true, null );
        // Fire the event to expand child node that have children
        exports.fireToExpandTreeNode( nodesToExpanded );
        deferred.resolve( {
            treeLoadResult: treeLoadResult
        } );
    }
    return deferred.promise;
};

/**
 * loadTreeProperties
 *
 * @param {object} propertyLoadInput property load inputs
 * @returns {promise} Promise object
 */
function _loadTreeProperties( propertyLoadInput ) {
    var allChildNodes = [];
    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            if( childNode.id !== 'top' ) {
                allChildNodes.push( childNode );
            }
        } );
    } );
    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    return AwPromiseService.instance.resolve( {
        propertyLoadResult: propertyLoadResult
    } );
}

/**
 * Get a page of row data for a 'tree' table.
 * @returns {promise} promise
 */
export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var propertyLoadInput = "";
    for( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ ndx ];

        if( awTableSvc.isPropertyLoadInput( arg ) ) {
            propertyLoadInput = arg;
        }
    }

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    return _loadTreeProperties( propertyLoadInput );
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
 * Update the selected object  from tree to context and based on selection
 * show respecitve UI. If user selected Action object then show create UI
 * else for any other selection show inforatiom UI for selection.
 *
 * @param {Object} selObject Selected object from handler tree from UI
 */
export let evaluateSelection = function( selObject ) {
    var modelObject = selObject;
    if( !selObject ) {
        modelObject = null;
    }
    var handlerCtx = appCtxSvc.getCtx( 'workflowHandlerCtx' );
    // Check if context exist then update it else create it
    if( handlerCtx ) {
        handlerCtx.selectedObject = modelObject;
        appCtxSvc.updateCtx( 'workflowHandlerCtx', handlerCtx );
    } else {
        handlerCtx = {
            selectedObject: modelObject
        };
        appCtxSvc.registerCtx( 'workflowHandlerCtx', handlerCtx );
    }
    // Check if selected object is not null and type of action or business rule then user wants to create
    // action or rule handler.
    if( modelObject && ( ( modelObject.type === 'Action' ) ||
            ( modelObject.modelType && modelObject.modelType.typeHierarchyArray.indexOf( 'EPMBusinessRule' ) > -1 ) ) ) {
        eventBus.publish( 'workflowHandler.dispalyCreatePanel' );
    } else if( modelObject && modelObject.modelType && ( modelObject.modelType.typeHierarchyArray.indexOf( 'EPMHandler' ) > -1 ||
            modelObject.modelType.typeHierarchyArray.indexOf( 'EPMBRHandler' ) > -1 ) ) {
        // Check if selected object is of type EPMHandler and EPMBRHandler that means it will be either rule handler
        // or action handler
        eventBus.publish( 'workflowHandler.displayInfoPanel' );
    }
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0TemplateHandlersTab
 */

export default exports = {
    fireToExpandTreeNode,
    expandTreeNodes,
    loadTreeTableData,
    loadTreeTableProperties,
    registerPropPolicy,
    unRegisterPropPolicy,
    evaluateSelection
};
app.factory( 'Awp0TemplateHandlersTab', () => exports );
