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
 * @module js/Awp0WorkflowBreadcrumbPanel
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import dmSvc from 'soa/dataManagementService';
import editHandlerService from 'js/editHandlerService';
import messagingService from 'js/messagingService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var parentData = null;
var listenForDestroyBreadcrumb;
var listenForPrimaryWorkAreaSelectionChange;
var listenForDataModifiedEvent;

/**
 * setting loading message
 *
 * @param {Object} data object
 */
export let popUpLoading = function( data ) {
    data.loading = false;
};

/**
 * This method will clear the App Context Data
 */
var clearAppContextData = function() {
    var context = appCtxService.getCtx( 'ActiveWorkspace:xrtContext' );
    if( context ) {
        var value = context.selectedProcess;
        if( value ) {
            context.selectedProcess = '';
        }
    }
    appCtxService.unRegisterCtx( 'workflowViewer.refresh' );
};

/**
 * This method will unsubscribe the lister for event workflowNativeBreadCrumb.destroy
 */
var clearingTheContext = function() {
    clearAppContextData();
    eventBus.unsubscribe( listenForDestroyBreadcrumb );
};

/**
 * This method will unsubscribe the lister for event primaryWorkArea.selectionChangeEvent
 */
var clearingTheContextOnSelectionChange = function() {
    clearAppContextData();
    eventBus.unsubscribe( listenForPrimaryWorkAreaSelectionChange );
};

/**
 * This method will unsubscribe the lister for event gwt.ModelObjectRelatedDataModifiedEvent
 */
var clearingTheContextOnDataModifiedEvent = function() {
    clearAppContextData();
    eventBus.unsubscribe( listenForDataModifiedEvent );
};

/**
 * This method will get the active task from selected workspace object.
 *
 * @param {Object} the selection object
 */
var getActiveTaskFromWSOObject = function( selection ) {
    var activeTask = null;
    if( selection.props.fnd0MyWorkflowTasks && selection.props.fnd0MyWorkflowTasks.dbValues &&
        selection.props.fnd0MyWorkflowTasks.dbValues.length > 0 ) {
        activeTask = soa_kernel_clientDataModel.getObject( selection.props.fnd0MyWorkflowTasks.dbValues[ 0 ] );
    } else if( selection.props.fnd0AllWorkflows && selection.props.fnd0AllWorkflows.dbValues &&
        selection.props.fnd0AllWorkflows.dbValues.length > 0 ) {
        activeTask = soa_kernel_clientDataModel.getObject( selection.props.fnd0AllWorkflows.dbValues[ 0 ] );
    }

    return activeTask;
};

/**
 * This method will check the object type is of type Signoff or EPMTask then it will return false else it will
 * return true.
 *
 * @param {Object} the selection object
 */
var isValidType = function( selection ) {
    if( selection &&
        ( _.indexOf( selection.modelType.typeHierarchyArray, 'Signoff' ) > -1 || _.indexOf(
            selection.modelType.typeHierarchyArray, 'EPMTask' ) > -1 ) ) {
        return false;
    }
    return true;
};

/**
 * Get the parent process info from input task object and then update the process breadcrum.
 *
 * @param {Object} the data object
 * @param {Object} the selection object
 */
var _updateProcessBreadcrumbInfo = function( data, activeTask ) {
    if( !activeTask ||!activeTask.props || !activeTask.props.parent_process || !activeTask.props.parent_process.dbValues) {
        return;
    }
    var processUId = activeTask.props.parent_process.dbValues[ 0 ];
    var parentProcess = soa_kernel_clientDataModel.getObject( processUId );

    if( parentProcess ) {
        data.latestProcess = parentProcess;
    }

    var breadcrumbList = [];

    var primaryCrumb = data.provider.crumbs[ 0 ];
    breadcrumbList.push( primaryCrumb );

    var processBreadCrumb = {
        clicked: false,
        displayName: data.latestProcess.props.object_string.uiValues[ 0 ],
        selectedCrumb: true,
        showArrow: false
    };

    breadcrumbList.push( processBreadCrumb );
    data.provider.crumbs = breadcrumbList;

    var provider = {
        crumbs: breadcrumbList,
        onSelect: function() {
            exports.updateWorkflowPage( parentData, data.latestProcess );
        }
    };

    data.provider = provider;
    data.provider.crumbs = breadcrumbList;

};

/**
 * load the data to be shown on chevron popup
 *
 * @param {Object} the data object
 * @param {Object} the selection object
 */
export let populateWorkflowBreadCrumb = function( data, selection ) {
    if( !data || !selection ) {
        return;
    }

    // Check if selection is not valid type then no need to process further and return from here
    if( !isValidType( selection ) ) {
        return;
    }

    listenForDestroyBreadcrumb = eventBus.subscribe( 'workflowNativeBreadCrumb.destroy', function() {
        clearingTheContext();
    } );

    listenForPrimaryWorkAreaSelectionChange = eventBus.subscribe( 'primaryWorkArea.selectionChangeEvent',
        function() {
            clearingTheContextOnSelectionChange();
        } );

    // This fix is needed when we need to clear the selected process information on app context service when this
    // event is fired like submit it to new workflow or task is completed from workflow viewer.
    // Fix for issue # AW-52465
    listenForDataModifiedEvent = eventBus.subscribe( 'cdm.relatedModified', function() {
        clearingTheContextOnDataModifiedEvent();
    } );

    clearAppContextData();

    parentData = data;
    var validModelObject = soa_kernel_clientDataModel.getObject( selection.uid );
    var activeTask = getActiveTaskFromWSOObject( validModelObject );

    var allWorkflowTasksAW = null;

    // Check for property is not null and have some value
    if( validModelObject.props.fnd0AllWorkflows && validModelObject.props.fnd0AllWorkflows.dbValues ) {
        allWorkflowTasksAW = validModelObject.props.fnd0AllWorkflows.dbValues;
    }

    if( allWorkflowTasksAW && allWorkflowTasksAW.length > 0 ) {
        var allWorkflowProcessesAW = [];

        _.forEach( allWorkflowTasksAW, function( workflowTask ) {
            var mo = soa_kernel_clientDataModel.getObject( workflowTask );
            if( mo && mo.props && mo.props.parent_process && mo.props.parent_process.dbValues ) {
                var processUId = mo.props.parent_process.dbValues[ 0 ];
                var parentProcess = soa_kernel_clientDataModel.getObject( processUId );
                if( parentProcess ) {
                    allWorkflowProcessesAW.push( parentProcess );
                }
            }
        } );
        data.allWorkflowProcesses = allWorkflowProcessesAW;
    }
    // Check if proeprty is loaded then update the breadcrum directly else load the parent process info and then update the
    // breadcrum from active task object.
    if( activeTask && activeTask.props && activeTask.props.parent_process && activeTask.props.parent_process.dbValues
        && activeTask.props.parent_process.dbValues[ 0 ] ) {
        _updateProcessBreadcrumbInfo( data, activeTask );
        return;
    } else if( activeTask ) {
        dmSvc.getProperties( [ activeTask.uid ], [ 'parent_process' ] ).then( function() {
            _updateProcessBreadcrumbInfo( data, activeTask );
        } );
    }

};

/**
 * This function will update the workflow page when any chevron item is selected.
 *
 * @return {Object} the resultObject
 */
export let onParentBreadCrumbSelect = function( crumb, data ) {
    exports.updateWorkflowPage( parentData, data.latestProcess );
};

/**
 * load the data to be shown on chevron popup
 *
 * @return {Object} the resultObject
 */
export let loadChevronPopup = function() {
    var childWorkflowObjs = [];
    if( parentData && parentData.allWorkflowProcesses && parentData.allWorkflowProcesses.length > 0 ) {
        for( var ndx = 0; ndx < parentData.allWorkflowProcesses.length; ndx++ ) {
            var object = parentData.allWorkflowProcesses[ ndx ];
            var result = {
                className: object.type,
                type: object.type,
                uid: object.uid
            };
            childWorkflowObjs.push( result );
        }
        var chevrondata = {
            searchResults: childWorkflowObjs,
            totalFound: childWorkflowObjs.length
        };

        return chevrondata;
    }
};

/**
 * This function will check if the user is in start edit mode.
 */
export let isEditInProgress = function() {
    var deferred = AwPromiseService.instance.defer();
    var resource = 'InboxMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );

    editHandlerService.isDirty().then( function( editContext ) {
        if( editContext && editContext.isDirty ) {
            var buttons = [ {
                addClass: 'btn btn-notify',
                text: localTextBundle.save,
                onClick: function( $noty ) {
                    $noty.close();
                    editHandlerService.saveEdits().then( function() {
                        deferred.resolve();
                        //In the event of an error saving edits
                    }, function() {
                        deferred.resolve();
                    } );
                }
            },
            {
                addClass: 'btn btn-notify',
                text: localTextBundle.discard,
                onClick: function( $noty ) {
                    $noty.close();
                    editHandlerService.cancelEdits();
                    deferred.resolve();
                }
            }
        ];
        messagingService.showWarning( localTextBundle.navigationConfirmation, buttons );
        } else {
            deferred.resolve();
        }
    } );
    return deferred.promise;
};


/**
 * Update the workflwo graph page
 * @param {Object} selectedObject Selected object for breadcrumb need to be updated
 */
var _onWorkflowChevronDataSelectionInternal = function( selectedObject ) {
    appCtxService.ctx.isTaskPerformable = false;

    // Loading property for future use in breadcrumb
    dmSvc.getPropertiesUnchecked( [ appCtxService.ctx.xrtSummaryContextObject ], [ 'fnd0MyWorkflowTasks' ] ).then( function() {
        eventBus.publish( 'workflowTaskPanel.update' );
    } );

    eventBus.publish( 'workflowNativeBreadCrumb.update' );
    exports.updateWorkflowPage( parentData, selectedObject );
};

/**
 * This method will invoke when we select anything in chevron popup
 *
 * @return {Object} the data object
 */
export let onWorkflowChevronDataSelection = function( data, id, selectedObject, currentCrumb ) {
    if( currentCrumb && selectedObject ) {
        currentCrumb.clicked = false;
        // Check if any table when breadcrumb is shown in edit mode if yes then
        // show the save and discard message first and based on that update the graph.
        exports.isEditInProgress().then( function() {
            _onWorkflowChevronDataSelectionInternal( selectedObject );
        } );
    }
};

/**
 * This method will update the workflow page.
 *
 * @return {Object} the data object
 */
export let updateWorkflowPage = function( data, selectedObject ) {
    var breadcrumbList = [];

    if( data && selectedObject && selectedObject.uid ) {
        var ctx = appCtxService.getCtx( 'ActiveWorkspace:xrtContext' );

        if( ctx ) {
            ctx.selectedProcess = selectedObject.uid;
            appCtxService.updateCtx( 'ActiveWorkspace:xrtContext', ctx );
        } else {
            ctx = {};
            ctx.selectedProcess = selectedObject.uid;
            appCtxService.registerCtx( 'ActiveWorkspace:xrtContext', ctx );
        }

        appCtxService.unRegisterCtx( 'workflowViewer.refresh' );
        var workflowViewerCtx = {};
        workflowViewerCtx.selectedProcess = selectedObject;
        appCtxService.registerCtx( 'workflowViewer.refresh', workflowViewerCtx );
        eventBus.publish( 'disableTheLinkAW' );
        eventBus.publish( 'awWorkflowRefreshInitiated', selectedObject );

        var primaryCrumb = data.provider.crumbs[ 0 ];
        breadcrumbList.push( primaryCrumb );

        var processBreadCrumb = {
            clicked: false,
            displayName: selectedObject.props.object_string.uiValues[ 0 ],
            selectedCrumb: true,
            showArrow: false
        };
        data.provider.crumbs.splice( 1, 1, processBreadCrumb );
    }
};

export default exports = {
    popUpLoading,
    populateWorkflowBreadCrumb,
    onParentBreadCrumbSelect,
    loadChevronPopup,
    onWorkflowChevronDataSelection,
    updateWorkflowPage,
    isEditInProgress
};
app.factory( 'Awp0WorkflowBreadcrumbPanel', () => exports );
