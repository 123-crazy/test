// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Awp0TargetCompleteTask
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import awp0PerformTaskSvc from 'js/Awp0PerformTask';
import appCtxSvc from 'js/appCtxService';
import cdmService from 'soa/kernel/clientDataModel';
import adapterSvc from 'js/adapterService';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';
import listBoxService from 'js/listBoxService';

/**
 * Define public API
 */
var exports = {};

/**
 * Update task_to_perform in context
 * @param {object} modelObject - the Object
 */
var updateContext = function( modelObject ) {
    var context = appCtxSvc.getCtx( 'task_to_perform' );
    if( context ) {
        var value = context.task;
        if( value ) {
            context.task = [ modelObject ];
        }
        appCtxSvc.updateCtx( 'task_to_perform', context );
    } else {
        context = {};
        context.task = [ modelObject ];
        appCtxSvc.registerCtx( 'task_to_perform', context );
    }
};

/**
 * Populate the peform panel in secondary work area based on validation like task can be perfomred by me or not
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 */
export let populateSecondaryPanel = function( data, selection, ctx ) {
    if( selection !== null ) {
        // Get the correct adapter object. When user open item revision in content tab and goes to workflow tab
        // then also we need to show this table in workflow page. So to address this we need to get adapted object.
        adapterSvc.getAdaptedObjects( [ selection ] ).then( function( adaptedObjs ) {
            var modelObject = null;
            if( adaptedObjs && adaptedObjs.length > 0  && adaptedObjs[0] ) {
                selection = adaptedObjs[0];
                if( selection.props.fnd0MyWorkflowTasks && selection.props.fnd0MyWorkflowTasks.dbValues &&
                    selection.props.fnd0MyWorkflowTasks.dbValues.length > 0 ) {
                    modelObject = cdmService.getObject( selection.props.fnd0MyWorkflowTasks.dbValues[ 0 ] );
                }
                data.isTaskPerformable = false;
                ctx.isTaskPerformable = false;
                if( modelObject ) {
                    updateContext( modelObject );
                    awp0PerformTaskSvc.loadObjectProperties( data, modelObject );
                }
            }
        } );
    }
};

export let updateTaskPanel = function( selectedJob, ctx, data ) {
    if( selectedJob ) {
        var isLoadPropertiesNeed = false;
        var modelObjects = [];
        var selectedItem = cdmService.getObject( ctx.xrtSummaryContextObject.uid );
        if ( selectedItem.props.fnd0MyWorkflowTasks ) {
            for( var i = 0; i < selectedItem.props.fnd0MyWorkflowTasks.dbValues.length; ++i ) {
                var modelObject = cdmService.getObject( selectedItem.props.fnd0MyWorkflowTasks.dbValues[ i ] );
                if( modelObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
                    modelObject = cdmService.getObject( modelObject.props.fnd0ParentTask.dbValues[ 0 ] );
                }

                if( modelObject && modelObject.props.parent_process && modelObject.props.parent_process.dbValues &&
                    modelObject.props.parent_process.dbValues[ 0 ] && ( modelObject.props.parent_process.dbValues[ 0 ] === selectedJob ||
                    modelObject.props.parent_process.dbValues[ 0 ] === selectedJob.uid ) ) {
                    updateContext( modelObject );
                    isLoadPropertiesNeed = false;
                    awp0PerformTaskSvc.loadObjectProperties( data, modelObject );
                    break;
                } else if( modelObject && !modelObject.props.parent_process ) {
                    isLoadPropertiesNeed = true;
                    // Above check is needed if properties needs to be loaded so that we can find out which job need
                    // to be shown here
                    modelObjects.push( modelObject );
                }
            }
        }
        // Check if model objects are not empty and property load need to be done
        // then we need to make getProperties call first and then match the
        // task parent process to selected process from breadcrumb then load the panel
        // for that task
        if( modelObjects && modelObjects.length > 0 && isLoadPropertiesNeed ) {
            dmSvc.getPropertiesUnchecked( modelObjects, [ 'parent_process' ] ).then( function() {
                isLoadPropertiesNeed = false;
                var validTaskObject = _.find( modelObjects, function( taskObject ) {
                    return taskObject.props.parent_process && taskObject.props.parent_process.dbValues
                    && ( taskObject.props.parent_process.dbValues[ 0 ] === selectedJob ||
                        taskObject.props.parent_process.dbValues[ 0 ] === selectedJob.uid );
                } );
                if( validTaskObject ) {
                    updateContext( validTaskObject );
                    isLoadPropertiesNeed = false;
                    awp0PerformTaskSvc.loadObjectProperties( data, validTaskObject );
                }
            } );
        }
    }
};

var _populateTaskWorkflowList = function( data, modelObjects ) {
    var jobObjects = [];
    _.forEach( modelObjects, function( modelObject ) {
        var updatedModelObject = cdmService.getObject( modelObject.uid );
        if( updatedModelObject && updatedModelObject.props && updatedModelObject.props.parent_process
            && updatedModelObject.props.parent_process.dbValues  ) {
                var jobObject = cdmService.getObject( updatedModelObject.props.parent_process.dbValues[ 0 ] );
            if( jobObject ) {
                jobObjects.push( jobObject );
            }
        }
    } );
    jobObjects = listBoxService.createListModelObjects( jobObjects, 'props.object_string' );
    // Select the default selected process name
    if( jobObjects && jobObjects.length > 0 && jobObjects[ 0 ] ) {
        data.workflowTemplates.dbValue = jobObjects[ 0 ];
        data.workflowTemplates.uiValue = jobObjects[ 0 ].propDisplayValue;
    }
    data.workflowProcessList = jobObjects;
};


/**
 * Populate the peform panel in secondary work area based on validation like task can be perfomred by me or not
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 */
export let populateTargetPanelData = function( data, selection, ctx ) {
    var modelObjects = [];
    // This is mainly needed when user populate the list that time set it to false so that
    // if panel is already visible then it will be hidden first and then correct panel will be loaded
    ctx.isTaskPerformable = false;
    if( selection && selection.props.fnd0MyWorkflowTasks && selection.props.fnd0MyWorkflowTasks.dbValues &&
        selection.props.fnd0MyWorkflowTasks.dbValues.length > 0 ) {
            _.forEach( selection.props.fnd0MyWorkflowTasks.dbValues, function( dbValue ) {
                var modelObject = cdmService.getObject( dbValue );
                if( modelObject ) {
                    modelObjects.push( modelObject );
                }
            } );
    }

    if( modelObjects && modelObjects.length > 0 ) {
        dmSvc.getPropertiesUnchecked( modelObjects, [ 'parent_process' ] ).then( function() {
            _populateTaskWorkflowList( data, modelObjects );
        } );
    }
};

/**
 * Update the action section.
 * @param {Object} selectedJob Selected job object
 * @param {Object} ctx Context object
 * @param {Object} data Data view mode object
 */
export let updateActionSelection = function( selectedJob, ctx, data ) {
    ctx.isTaskPerformable = false;
    if( data.workflowProcessList && data.workflowProcessList[0] ) {
        data.workflowTemplateLabel.uiValue = data.workflowProcessList[0].propDisplayValue;
    }
    exports.updateTaskPanel( selectedJob, ctx, data );
};


/**
 * This factory creates a service and returns exports
 *
 * @member Awp0TargetCompleteTask
 */

export default exports = {
    populateSecondaryPanel,
    updateTaskPanel,
    populateTargetPanelData,
    updateActionSelection
};
app.factory( 'Awp0TargetCompleteTask', () => exports );
