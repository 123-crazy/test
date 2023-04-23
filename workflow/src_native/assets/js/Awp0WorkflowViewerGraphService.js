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
 * This implements the method related to drawing the edges on the graph
 *
 * @module js/Awp0WorkflowViewerGraphService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdmService from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import graphConstants from 'js/graphConstants';
import templateService from 'js/Awp0WorkflowTemplateService';
import popupService from 'js/popupService';
import viewModelObjectService from 'js/viewModelObjectService';


var exports = {};
var parentData = null;

/**
 * Return the true or false based on template has child task or not
 *
 * @param {Object} templateObject task object whose children need to be loaded
 *
 * @returns {boolean} True or False
 */
var _hasChildren = function( templateObject ) {
    if( templateObject.props && templateObject.props.child_tasks && templateObject.props.child_tasks.dbValues &&
        templateObject.props.child_tasks.dbValues.length > 0 ) {
            return true;
    }
    return false;
};

/**
 * Populate the breadcrumb data in order with parent task template and return the final breadcrumb data.
 * @param {String} selectedCrumbUid Selected crumb uid that need to be shown on graph
 *
 * @returns {Array} Breadcrumb data array
 */
var _populateBreadCrumbData = function( selectedCrumbUid ) {
    if( !selectedCrumbUid ) {
        return;
    }
    var taskObject = cdmService.getObject( selectedCrumbUid );
    var breadCrumb = [];
    var hierarchy = [];

    var loop = true;
    while( loop ) {
        var inputParent = taskObject;
        if( inputParent && inputParent.props.parent_task && inputParent.props.parent_task.dbValues
            && inputParent.props.parent_task.dbValues[ 0 ] ) {
            hierarchy.push( inputParent );
            var parentObject = cdmService.getObject( inputParent.props.parent_task.dbValues[0] );
            if( parentObject ) {
                hierarchy.push( parentObject );
            } else {
                loop = false;
            }
            taskObject = parentObject;
        } else {
            loop = false;
            hierarchy.push( inputParent );
        }
    }
    hierarchy = _.uniq( hierarchy );
    var hierarchyArray = _.reverse( hierarchy );
    // Create the breadcrumb data that need to be shown.
    if( hierarchyArray && hierarchyArray.length > 0 ) {
        _.forEach( hierarchyArray, function( hierarchy ) {
            if( hierarchy && hierarchy.props.object_string.uiValues && hierarchy.props.object_string.uiValues[ 0 ] ) {
                // Check if tempalte has no children then set the boolean to false so that breadcrumb arrow will nto be shown.
                var hasChildren = _hasChildren( hierarchy );
                breadCrumb.push( {
                    clicked: false,
                    displayName: hierarchy.props.object_string.uiValues[0],
                    selectedCrumb: false,
                    showArrow: hasChildren,
                    scopedUid: hierarchy.uid,
                    task: hierarchy
                } );
            }
        } );
    }
    // Set the last crumb as selected by default
    if( breadCrumb && breadCrumb.length > 0 ) {
        breadCrumb[ breadCrumb.length - 1 ].selectedCrumb = true;
    }
    return breadCrumb;
};

/**
 * Popualte all breadcrumb based on input crumb uid and show on the graph and it only need
 * to be shown in fixed layout.
 *
 * @param {Object} ctx App context obejct
 * @param {Object} data Declarative view model object
 * @param {String} selectedCrumbUid Selected crumb uid that need to be shown on graph
 */
export let populateFixedLayoutBreadCrumbs = function( ctx, data, selectedCrumbUid ) {
    parentData =  data;
    var provider = {
        crumbs: data.provider.crumbs,
        onSelect: function( data ) {
            if( data.scopedUid ) {
                appCtxSvc.registerCtx( 'workflowViewerSubTaskSelectionUid', data.scopedUid );
                var scopeTaskObject = cdmService.getObject( data.scopedUid );
                if( scopeTaskObject ) {
                    eventBus.publish( 'workflowViewer.loadChildren', {
                        object: scopeTaskObject,
                        node: null
                    } );
                }
            }
        }
    };

    data.provider = provider;
    // Have the updated final breadcrumb here
    data.provider.crumbs = _populateBreadCrumbData( selectedCrumbUid );
};

/**
 * Return the true or false based on auto layout is on or off.
 *
 * @returns {boolean} True or False
 */
var _isFixedLayoutMode = function( ) {
    var workflowViewerCtx = appCtxSvc.getCtx( 'workflowViewerCtx' );
    if( workflowViewerCtx && workflowViewerCtx.diagram && !workflowViewerCtx.diagram.isAutoLayoutOn ) {
        return true;
    }
    return false;
};

/**
 * Return all sub process present for input node object.
 *
 * @param {Object} node Nod eobejct for sub process need to be shown in popup window
 *
 * @returns {Object} results to be shown
 */
export let populateSubProcessData = function( node ) {
    var subProcessesObjects = [];
    if( node && node.appData.nodeObject && node.appData.nodeObject.props.sub_processes_states
        && node.appData.nodeObject.props.sub_processes_states.dbValues ) {
        var subProcesses = node.appData.nodeObject.props.sub_processes_states.dbValues;
        _.forEach( subProcesses, function( subProcessUid ) {
            var splitedSubProcessUids = subProcessUid.split( ',' );
            if( splitedSubProcessUids && splitedSubProcessUids[ 0 ] ) {
                var subProcessObject = viewModelObjectService.createViewModelObject( splitedSubProcessUids[ 0 ] );
                if( subProcessObject ) {
                    subProcessesObjects.push( subProcessObject );
                }
            }
        } );
    }

    return {
        searchResults: subProcessesObjects,
        totalFound: subProcessesObjects.length
    };
};

/**
 * This expand or collapse the parent node where sub process exist. It will only
 * show the sub process in fixed layout.
 * @param {Object} node Node which need to be expand or collapse
 * @param {Object} popupData Popup data that will contain all configuration to open popup panel
 */
export let expandSubProcess = function( node, popupData ) {
    var isFixedLayout = _isFixedLayoutMode();
    if( node && isFixedLayout ) {
        if( popupData ) {
            var domElemnt = node.getSVGDom();
            var nodeDOMElement = domElemnt;
            //Get the node first child element to show the popup next to it
            // This is needed when two nodes are far apart and we want to show the popup
            // next to node and not next to end point of edge. SO better to get the first
            // child of node DOM and get it's id and use that to show the popup
            if( domElemnt && domElemnt.firstElementChild ) {
                domElemnt = domElemnt.firstElementChild;
            }
            // Get the node DOM id attribute to show the popup next to it
            if( domElemnt ) {
                nodeDOMElement = domElemnt.getAttribute( 'id' );
            }
            popupData.options.reference = nodeDOMElement;
            popupService.show( popupData );
            return;
        }
    }
};

var incUpdateActive = function( layout ) {
    return layout && layout.type === 'IncUpdateLayout' && layout.isActive();
};

/**
 * Toggle child node expand for the given node
 * @param {Object} graphModel Graph model object
 * @param {Object} node Node which need to be expand or collapse
 * @param {Object} data Data vie wmodel object
 */
export let expandChildren = function( graphModel, node, data ) {
    if( graphModel && node ) {
        var isFixedLayout = _isFixedLayoutMode( data );
        if( isFixedLayout ) {
            appCtxSvc.registerCtx( 'workflowViewerSubTaskSelectionUid', node.appData.nodeObject.uid );
            eventBus.publish( 'workflowViewer.loadChildren', {
                object: node.appData.nodeObject,
                node: null
            } );
            return;
        }
        var graphControl = graphModel.graphControl;
        var groupGraph = graphControl.groupGraph;
        var isExpanded = groupGraph.isExpanded( node );
        groupGraph.setExpanded( node, !isExpanded );

        //update command selection state
        var updateBindData = {};
        updateBindData.Awp0ToggleChildren_selected = !node.getProperty( 'Awp0ToggleChildren_selected' );
        updateBindData.Awp0ToggleChildren_tooltip = isExpanded ? data.i18n.showChildren :
            data.i18n.hideChildren;

        if( node.appData.nodeObject.props.sub_processes_states.dbValues.length > 0 ) {
            updateBindData.child_count = isExpanded ? node.appData.nodeObject.props.sub_processes_states.dbValues.length :
                '';
        } else if( node.appData.nodeObject.props.child_tasks.dbValues.length > 0 &&
            node.appData.nodeObject.uid !== node.appData.nodeObject.props.root_task.dbValues[ 0 ] ) {
            updateBindData.child_count = isExpanded ? node.appData.nodeObject.props.child_tasks.dbValues.length :
                '';
        }
        graphControl.graph.updateNodeBinding( node, updateBindData );

        //apply incremental update layout
        var layout = graphControl.layout;
        if( incUpdateActive( layout ) ) {
            layout.applyLayout();
        }
        // Pan to view in auto layout in expand or collapse cases. Pan in all cases as in case
        // of fixed layout also we are showing the children there as well. If we don't show the children there
        // then we don't need to pan it in fixed layout.
        graphControl.panToView( [ node ], graphConstants.PanToViewOption.AUTO );
    }
};

/**
 * Get the root task object for current dispalyed diagram
 * @param {Object} workflowData Workflow data object
 *
 * @returns {Object} Root task object
 */
export let getRootTaskObject = function( workflowData ) {
    var rootTaskObject = null;
    var rootTaskUid = null;
    if( workflowData && workflowData.workflow_root_task && workflowData.workflow_root_task[ 0 ] ) {
        rootTaskUid = workflowData.workflow_root_task[ 0 ];
    } else if( workflowData && workflowData.elementData[ 0 ] && workflowData.elementData[ 0 ].element ) {
        var nodeObject = cdmService.getObject( workflowData.elementData[ 0 ].element.uid );
        if( nodeObject && nodeObject.props && nodeObject.props.root_task && nodeObject.props.root_task.dbValues &&
            nodeObject.props.root_task.dbValues.length > 0 ) {
            rootTaskUid = nodeObject.props.root_task.dbValues[ 0 ];
        }
    }
    if( rootTaskUid ) {
        rootTaskObject = cdmService.getObject( rootTaskUid );
    }
    return rootTaskObject;
};

/**
 * Set the task that is started in focus by defualt.
 * @param {Object} graphModel Graph model object
 * @param {Object} workflowData Workflow data object
 */
export let setFocusTaskObject = function( graphModel, workflowData ) {
    var foucsTaskUid = null;
    var foucsTaskNode = null;
    if( workflowData && workflowData.task_to_focus && workflowData.task_to_focus[ 0 ] && graphModel ) {
        foucsTaskUid = workflowData.task_to_focus[ 0 ];
    }
    if( foucsTaskUid ) {
        foucsTaskNode = graphModel.nodeMap[ foucsTaskUid ];
    }
    var graphControl = graphModel.graphControl;
    if( foucsTaskNode ) {
        // Pan to view in center fit to show started task in foxus
        graphControl.panToView( [ foucsTaskNode ], graphConstants.PanToViewOption.CENTER_FIT );
    }
};

/**
 * Set the graph configuration based on layout.
 *
 * @param {String} layout Layout option that will be applied on graph
 * @param {Object} graphModel Graph model object where layout configuration will be set
 */
export let setDiagramConfigForLayout = function( layout, graphModel ) {
    if( layout === 'FixedLayout' ) {
        graphModel.graphControl.setAutoRoutingType( graphConstants.AutoRoutingtype.STRAIGHT_LINE );
        graphModel.graphControl.setGroupNodeBoundaryUpdateMode( false );
    } else {
        graphModel.graphControl.setAutoRoutingType( graphConstants.AutoRoutingtype.HV_SEGMENT3 );
        graphModel.graphControl.setGroupNodeBoundaryUpdateMode( true );
    }
};

/**
 * This method will update the workflow page based on selected crumb in fixed layout
 * or user change the layout between auto and fixed.
 *
 * @param {Object} ctx ctx object
 * @param {Object} data Data view model object
 * @param {Object} graphModel Graph model object where layout configuration will be set
 * @param {String} layoutOption Layout option that will be applied on graph
 */
export let updateWorkflowViewerPage = function( ctx, data, graphModel, layoutOption ) {
    if( data && data.provider && data.provider.crumbs && ctx.workflowViewerSubTaskSelectionUid ) {
        //clear the graph
        graphModel = data.graphModel;
        graphModel.nodeMap = null;
        graphModel.edgeMap = null;

        var selectedCrumbUid = ctx.workflowViewerSubTaskSelectionUid;

        // Have the updated final breadcrumb here
        data.provider.crumbs = exports.populateFixedLayoutBreadCrumbs( ctx, data, selectedCrumbUid );
        var taskObject = cdmService.getObject( selectedCrumbUid );
        if( taskObject ) {
            eventBus.publish( 'workflowViewer.loadChildren',  {
                object: taskObject,
                node: null
            } );
            return;
        }
    } else if( graphModel && graphModel.initialized ) {
    // Check if graph model is not null and anitialized proeprly then only fire this event to
    // change the layout. This is needed when we apply layout before graph loaded then no need
    // to fire the event.
        graphModel.nodeMap = null;
        graphModel.edgeMap = null;
        // Clear the breadcrumb when user swtiching between the layout.
        if( parentData && parentData.provider ) {
            parentData.provider.crumbs = [];
        }
        exports.setDiagramConfigForLayout( layoutOption, graphModel );
        appCtxSvc.unRegisterCtx( 'workflowViewerSubTaskSelectionUid' );
        var selectedObject = ctx.xrtSummaryContextObject;
        var context = ctx[ 'ActiveWorkspace:xrtContext' ];
        // Check if context is not null and it has entry for selected process then
        // only remove it from context
        if( context && context.selectedProcess && context.selectedProcess !== '' ) {
            var selectedProcess = cdmService.getObject( context.selectedProcess );
            if( selectedProcess ) {
                selectedObject = selectedProcess;
            }
        }

        // Fire the event with object that need to pass on server to get the correct graph
        // when user change the layout.
        eventBus.publish( 'workflowViewer.initializeGraph', {
            selectedObject: selectedObject
        } );
    }
};

/**
 * Update the node based on input updated model objects
 * @param {Array} modelObjects Model obejcts that are updated
 * @param {Object} graphModel Graph model object where layout configuration will be set
 */
export let callForOnNodeUpdatedMethod = function( modelObjects, graphModel ) {
    if( typeof graphModel === typeof undefined || typeof graphModel.nodeMap === typeof undefined ) {
        return;
    }
    var updateNodes = {};
    var graphControl = graphModel.graphControl;
    _.forEach( modelObjects, function( modelObject ) {
        var node = graphModel.nodeMap[ modelObject.uid ];
        if( node ) {
            var props = templateService.getBindPropertyNames( modelObject );
            var objectBindData = templateService.getBindProperties( modelObject, props );
            var properties = {};
            var bindData = node.getAppObj();
            _.forEach( props, function( prop ) {
                var bindValue = bindData[ prop ];
                if( objectBindData[ prop ] !== bindValue ) {
                    if( prop === 'due_date' || prop === 'fnd0EndDate' ) {
                        properties.datePropDispName = objectBindData.datePropDispName;
                        properties.date_prop_value = objectBindData.date_prop_value;
                        properties.date_prop_style_svg = objectBindData.date_prop_style_svg;
                    } else if( prop === 'state_value' ) {
                        properties.image_task_state = objectBindData.image_task_state;
                    }else {
                        if( prop === 'fnd0Assignee' ) {
                            if( modelObject.type !== 'EPMPerformSignoffTask' ) {
                                properties[ prop ] = objectBindData[ prop ];
                            }
                        } else {
                            properties[ prop ] = objectBindData[ prop ];
                        }
                    }
                }
            } );
            if( Object.keys( properties ).length > 0 ) {
                updateNodes[ modelObject.uid ] = properties;
            }
        }
    } );

    if( Object.keys( updateNodes ).length > 0 ) {
        graphControl.graph.update( function() {
            _.forEach( updateNodes, function( value, key ) {
                var node = graphModel.nodeMap[ key ];
                graphControl.graph.updateNodeBinding( node, value );
            } );
        } );
    }
};


export default exports = {
    populateFixedLayoutBreadCrumbs,
    expandSubProcess,
    expandChildren,
    getRootTaskObject,
    setFocusTaskObject,
    setDiagramConfigForLayout,
    updateWorkflowViewerPage,
    callForOnNodeUpdatedMethod,
    populateSubProcessData
};
/**
 * Define viewer graph service
 *
 * @memberof NgServices
 * @member Awp0WorkflowViewerGraphService
 */
app.factory( 'Awp0WorkflowViewerGraphService', () => exports );
