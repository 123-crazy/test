// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/PmiToolService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import AwPromiseService from 'js/awPromiseService';
import pmiToolUtil from 'js/pmiToolUtil';
import viewerContextService from 'js/viewerContext.service';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import ModelViewData from 'js/pmiModelViewData';
import PmiEntityData from 'js/pmiEntityData';
import AwTimeoutService from 'js/awTimeoutService';

var exports = {};
let _timeOutPromiseSelected = [];
let ignoreTypesValueChangeProcessingAsMVChanged = false;

/**
 * Register for selection and visibility change
 *
 * @param  {Object} eventData data returned from the event : awViewerContext.update
 * @param  {Object} viewModelObj view model
 */
export let registerForSelectionAndVisibility = function( eventData, viewModelObj ) {
    /**
     * Listening to gwt.SubLocationContentSelectionChangeEvent event
     */
    if( eventData && eventData.property ) {
        if( eventData.property === 'viewerSelectionCSIDS' || eventData.property === 'viewerSelectionModels' ) {
            pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.dataFetchComplete', false );
            _updateCtxWithCurrentSelection().then( function( pmiDataModelInstances ) {
                _updatePMIDataModels( pmiDataModelInstances, viewModelObj );
            } );
        }

        if( eventData.property === 'AllInvisibleCSIDs' || eventData.property === 'AllInvisibleExceptionCSIDs' ) {
            var pmiCtx = pmiToolUtil.getPmiCtx();
            if( pmiCtx ) { // NonExistent pmiCtx in case of session reconnect.
                var isInVisible = _isTargetInVisible();
                pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.isTargetInVisible', isInVisible ); //let the viewmodel update
                if( !pmiCtx.dataFetchComplete ) {
                    _fetchPmiData().then( function( pmiDataModelInstances ) {
                        _updatePMIDataModels( pmiDataModelInstances, viewModelObj );
                    } );
                }
            }
        }
    }
};

/**
 * Update PMI data in both the tabs
 *
 * @param  {Object} pmiDataModelInstances contains both classes instances
 * @param  {Object} viewModelObj view model
 */
var _updatePMIDataModels = function( pmiDataModelInstances, viewModelObj ) {
    if( viewModelObj.pmiInstance ) {
        viewModelObj.pmiInstance = pmiDataModelInstances.pmiInstance;
        updateTypesTabViewModel( pmiDataModelInstances.pmiInstance, viewModelObj );
    }
    if( viewModelObj.mvInstance ) {
        viewModelObj.mvInstance = pmiDataModelInstances.mvInstance;
        updateMVTabViewModel( pmiDataModelInstances.mvInstance, viewModelObj );
    }
};

/**
 * Handle step previous
 */
export let handleStepPrevAction = function() {
    eventBus.publish( 'moveToPrevious' );
};

/**
 * Handle step next
 */
export let handleStepNextAction = function() {
    eventBus.publish( 'moveToNext' );
};

/**
 * Register Pmi Ctx
 */
var _registerPmiCtx = function() {
    var pmiToolCtx = pmiToolUtil.getPmiCtx();

    if( pmiToolCtx === undefined ) {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx', {} );
    }
};

/**
 * Handle tab selection change
 *
 * @param {Object} viewModel view model
 */
export let handleTabSelectionChange = function( viewModel ) {
    if( viewModel && viewModel.tabModels && viewModel.tabModels[ 0 ].selectedTab ) {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.activeTabIndex', 0 );
    } else if( viewModel && viewModel.tabModels && viewModel.tabModels[ 1 ].selectedTab ) {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.activeTabIndex', 1 );
    }
};

/**
 * Step through previous
 *
 * @param {object} mvInstance fetch mvInstance class
 * @param {object} pmiInstance fetch pmiInstance class
 * @param {object} data view model
 *
 */
export let stepThroughPrev = function( mvInstance, pmiInstance, data ) {
    var pmiCtx = pmiToolUtil.getPmiCtx();
    //To return if it is clicked multiple times without completing the previous process
    if( pmiCtx.visibilityProcessing ) {
        return;
    }
    //When process starts
    pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', true );

    if( pmiCtx.activeTabIndex === 0 ) {
        mvInstance.moveToPrevModelView();
    } else {
        pmiInstance.moveToPrevType( data );
    }
};

/**
 * Step through next
 *
 * @param {object} mvInstance fetch mvInstance class
 * @param {object} pmiInstance fetch pmiInstance class
 * @param {object} data view model
 */
export let stepThroughNext = function( mvInstance, pmiInstance, data ) {
    var pmiCtx = pmiToolUtil.getPmiCtx();
    //To return if it is clicked multiple times without completing the previous process
    if( pmiCtx.visibilityProcessing ) {
        return;
    }
    //When process starts
    pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', true );

    if( pmiCtx.activeTabIndex === 0 ) {
        mvInstance.moveToNextModelView();
    } else {
        pmiInstance.moveToNextType( data );
    }
};

/**
 * Update context with selection changes
 */
var _updateCtxWithCurrentSelection = async() => {
    var viewerCtx = appCtxSvc.getCtx( pmiToolUtil.getActiveViewerCmdCtxPartPath() );
    var targetCSIDs = [];
    var viewerSelectionCSIDS = viewerCtx.viewerSelectionCSIDS;

    if( _.isEmpty( viewerSelectionCSIDS ) ) {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.targetCSIDs', [ '' ] );
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.targetList', [ viewerCtx.viewerCurrentProductContext ] );
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.targetListLength', 1 );
    } else {
        targetCSIDs.push( viewerSelectionCSIDS.slice( -1 )[ 0 ] );
        var targetMOList = [];
        targetMOList.push( viewerCtx.viewerSelectionModels.slice( -1 )[ 0 ] );
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.targetCSIDs', targetCSIDs );
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.targetList', targetMOList );
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.targetListLength', targetMOList.length );
    }
    eventBus.publish( 'pmiSelectionUpdated', {} );
    if( _isTargetInVisible() ) {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.isTargetInVisible', true ); //let the viewmodel update
    } else {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.isTargetInVisible', false ); //let the viewmodel update
    }
    return await _fetchPmiData();
};

/**
 * Initialize
 */
export let initialize = async() => {
    _registerPmiCtx();
    return await _updateCtxWithCurrentSelection();
};

/**
 * Clear Pmi context
 */
export let clearPmiCtx = function() {
    var viewerCtx = appCtxSvc.getCtx( pmiToolUtil.getActiveViewerCmdCtxPartPath() );
    delete viewerCtx.pmiToolCtx; // TODO: find better approach
};

/**
 * Returns target's visiblity
 * @returns {Boolean} boolean indicating if current target is invisible or not
 */
var _isTargetInVisible = function() {
    var viewerCtxData = viewerContextService.getRegisteredViewerContext( pmiToolUtil.getActiveViewerCmdCtxPartPath() );
    var pmiTargetCsid = pmiToolUtil.getPmiCtx().targetCSIDs[ 0 ];
    pmiTargetCsid = pmiTargetCsid === '/' ? '' : pmiTargetCsid;
    var visibility = viewerCtxData.getVisibilityManager().getProductViewerVisibility( pmiTargetCsid );
    if( visibility === viewerCtxData.getVisibilityManager().VISIBILITY.PARTIAL ||
        visibility === viewerCtxData.getVisibilityManager().VISIBILITY.INVISIBLE ) {
        return true;
    }
    return false;
};

export let turnOnVisibility = function() {
    var viewerCtxNameSpace = pmiToolUtil.getActiveViewerCmdCtxPartPath();
    var pmiCtx = pmiToolUtil.getPmiCtx();
    viewerContextService.executeSelectedOnCommand( viewerCtxNameSpace, pmiCtx.targetCSIDs );
};

/**
 * Fetch Pmi data
 */
var _fetchPmiData = async() => {
    var viewerCtxNameSpace = pmiToolUtil.getActiveViewerCmdCtxPartPath();
    var pmiCtx = pmiToolUtil.getPmiCtx();
    var mvPromise;
    var pmiElemPromise;

    pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.dataFetchComplete', false );
    pmiElemPromise = viewerSecondaryModelService.requestPmiElementsDataByParts( viewerCtxNameSpace,
        pmiCtx.targetCSIDs );
    mvPromise = viewerSecondaryModelService.requestModelViewsDataByParts( viewerCtxNameSpace,
        pmiCtx.targetCSIDs );

    return AwPromiseService.instance.all( [ mvPromise, pmiElemPromise ] ).then( function( pmiDataResult ) {
        let pmiEntityDataInstance = new PmiEntityData( pmiToolUtil.parsePmiEntityData( pmiDataResult[ 1 ] ) );
        pmiEntityDataInstance.initializePmiEntity();
        return _fetchChildrenMV( pmiDataResult[ 0 ], pmiEntityDataInstance ).then( function( modelViewDataInstance ) {
            pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.dataFetchComplete', true );
            return {
                pmiInstance: pmiEntityDataInstance,
                mvInstance: modelViewDataInstance
            };
        } );
    } ).catch( error => {
        logger.error( 'Failed to load PMI data : ' + error );
        return AwPromiseService.instance.reject( error );
    } );
};

/**
 * Fetch Model View Children
 *
 *  @param {Object} mvData model view data
 *  @param {Object} pmiInstance fetch pmiInstance class
 */
var _fetchChildrenMV = async( mvData, pmiInstance ) => {
    let viewerCtxNameSpace = pmiToolUtil.getActiveViewerCmdCtxPartPath();
    let promises = [];
    mvData = pmiToolUtil.parseModelViewData( mvData );
    _.forEach( mvData, function( value ) {
        promises.push( viewerSecondaryModelService.requestModelViewElementsData( viewerCtxNameSpace, value.modelViewId ) );
    } );
    return AwPromiseService.instance.all( promises )
        .then( function( mvRawChildrenData ) {
            let modelViewDataInstance = new ModelViewData( _populateModelViewGroup( mvData, mvRawChildrenData, pmiInstance ) );
            modelViewDataInstance.initializeModelView();
            return modelViewDataInstance;
        }, function( error ) {
            logger.error( 'Fetch MV Children failed' + error );
        } );
};

/**
 * Update viewmodel with selection and selection display name.
 * @param  {Object} declViewModel viewmodel
 * @returns {Object} returns target list and total target found
 */
export let updateSelectionWithDisplayStrings = function( declViewModel, modelName ) {
    var pmiToolCtx = pmiToolUtil.getPmiCtx();
    if( pmiToolCtx !== undefined ) {
        let textMessage = pmiToolUtil.updateDisplayStrings( declViewModel );
        modelName.propertyDisplayName = pmiToolUtil.getSelectionDisplayName();
        //declViewModel.selectedModelName = selectedModelNameText;
        return {
            allTargets: pmiToolCtx.targetList,
            totalFound: pmiToolCtx.targetListLength,
            notCurrentlyVisibleText: textMessage.notCurrentlyVisibleText,
            hasNoPmiText: textMessage.hasNoPmiText,
            modelName: modelName
        };
    }
};

export let getCurrentSelection = function() {
    return pmiToolUtil.getSelectionDisplayName();
};

/**
 * Updates view model with ModelViews
 * @param {Object} mvInstance fetch mvInstance class
 * @param {Object} viewModelObj view model
 */
export let updateMVTabViewModel = function( mvInstance, viewModelObj ) {
    viewModelObj.modelViewData = mvInstance.updateMVData();
};
/**
 * Updates view model with entities
 * @param {Object} pmiInstance fetch pmiInstance class
 * @param {Object} viewModelObj view model
 */
export let updateTypesTabViewModel = function( pmiInstance, viewModelObj ) {
    viewModelObj.entities = pmiInstance.updatePmiEntities();
};

/**
 * Populates entities for Model View
 *
 * @param {Object} mvViewModel view model object
 * @param {Object} rawEntitiesData raw pmi entities
 * @param {Object} pmiInstance fetch pmiInstance class object
 *
 * @returns {Object} returns model view object with their children
 */
var _populateModelViewGroup = function( mvViewModel, rawEntitiesData, pmiInstance ) {
    for( let index = 0; index < mvViewModel.length; index++ ) {
        mvViewModel[ index ].children = [];
        if( _.isArray( rawEntitiesData[ index ] ) && !_.isEmpty( rawEntitiesData[ index ] ) ) {
            _.forEach( rawEntitiesData[ index ], function( rawEntity ) {
                //Call by reference
                let typeEntityViewModelChildren = _.find( pmiInstance.pmiEntityData, {
                    id: rawEntity[ 2 ]
                } );
                //Call by reference
                let typeEntityViewModel = _.find( typeEntityViewModelChildren.children, {
                    resourceId: rawEntity[ 4 ]
                } );

                if( typeEntityViewModel !== undefined ) {
                    typeEntityViewModel.isVisibilityOn = rawEntity[ 3 ] === 'true';
                    //By default if we push object it is call by refernece and also two way binding
                    if( typeEntityViewModel.isVisibilityOn ) {
                        pmiInstance.lastCheckedTypeViewModel.push( typeEntityViewModel );
                    }
                    if( typeEntityViewModel.selected ) {
                        pmiInstance.previousSelectedPmiEntity = typeEntityViewModel;
                    }
                    typeEntityViewModel.parentModelView.push( mvViewModel[ index ].type );
                    // while populating children should be visible.
                    mvViewModel[ index ].children.push( typeEntityViewModel );
                }
            } );
        }
    }
    return mvViewModel;
};

/**
 * Handler for model view checking action
 *
 * @param {object} input the ModelView that is checked
 * @param {object} mvInstance fetch mvInstance class
 * @param {object} pmiInstance fetch pmiInstance class
 */
export let modelViewEntryChecked = function( input, mvInstance, pmiInstance ) {
    if( input.isPropagatedFromModelViewSibling ) {
        input.isPropagatedFromModelViewSibling = false;
        return;
    }
    if( _timeOutPromiseSelected ) {
        _.forEach( _timeOutPromiseSelected, cancelEachTimeOut => AwTimeoutService.instance.cancel( cancelEachTimeOut ) );
        _timeOutPromiseSelected = [];
    }
    ignoreTypesValueChangeProcessingAsMVChanged = true;
    //Clean up the entities visibility as Model View selection change clears the visibility of all entities
    _.forEach( pmiInstance.pmiEntityData, pmiEntity => {
        pmiEntity.checkbox.dbValue = false;
        if( Array.isArray( pmiEntity.children ) && pmiEntity.children.length > 0 ) {
            _.forEach( pmiEntity.children, childEntity => {
                childEntity.checkbox.dbValue = false;
                if( Array.isArray( childEntity.checkbox.dbValues ) ) {
                    childEntity.checkbox.dbValues[ 0 ] = false;
                }
            } );
        }
    } );
    AwTimeoutService.instance( () => {
        ignoreTypesValueChangeProcessingAsMVChanged = false;
        _unselectNodeAfterChecked( input, mvInstance, pmiInstance );
        mvInstance.pmiModelViewEntityChecked( input );
    }, 200 );
};

/**
 * Handler to unselect node when the node is checked. There is an issue with aw-tree when user check the checkbox it
 *   automatically select the node
 *
 * @param {object} node the checked node
 * @param {object} mvInstance fetch mvInstance class
 * @param {object} pmiInstance fetch pmiInstance class
 */
var _unselectNodeAfterChecked = function( node, mvInstance, pmiInstance ) {
    if( node.selected ) {
        let currentNode;
        if( 'modelViewId' in node ) {
            currentNode = pmiToolUtil.getNodeFromArrayOfObjects( mvInstance.pmiModelViewData, node );
        } else {
            currentNode = pmiToolUtil.getNodeFromArrayOfObjects( pmiInstance.pmiEntityData, node );
        }
        currentNode.selected = false;
        if( pmiInstance.previousSelectedPmiEntity !== null ) {
            let previousSelectedObject;
            if( 'modelViewId' in pmiInstance.previousSelectedPmiEntity ) {
                previousSelectedObject = pmiToolUtil.getNodeFromArrayOfObjects( mvInstance.pmiModelViewData, pmiInstance.previousSelectedPmiEntity );
            } else {
                previousSelectedObject = pmiToolUtil.getNodeFromArrayOfObjects( pmiInstance.pmiEntityData, pmiInstance.previousSelectedPmiEntity );
            }
            previousSelectedObject.selected = true;
        }
    }
};

/**
 * Handler for model view and types Label click action
 *
 * @param {object} eventData the selected node
 * @param {object} mvInstance fetch mvInstance class
 * @param {object} pmiInstance fetch pmiInstance class
 */
export let pmiEntityModelViewNodeClicked = function( eventData, mvInstance, pmiInstance ) {
    //Issue : When the user check the checkbox both "labelClicked" and "Checked" action both are called. Moreover, node gets selected.
    // In order to stop execution of this function used setTimeout to handle it
    _timeOutPromiseSelected.push( AwTimeoutService.instance( () => {
        _timeOutPromiseSelected = [];
        let childrenSelected = [];
        if( pmiInstance.previousSelectedPmiEntity !== null && pmiInstance.previousSelectedPmiEntity !== eventData.node ) {
            //This is required when user opens the panel with one of the entity is selected and when user
            // selects another entity then the previous selection is also retained..The reason is in
            //aw-tree the selectedNode is not present in scope hence we need to make sure that previous
            //selected node should be false.
            pmiInstance.previousSelectedPmiEntity.selected = false;

            let previousSelectedObject = _getDataForSelectedObject( pmiInstance.previousSelectedPmiEntity, mvInstance, pmiInstance );
            childrenSelected = previousSelectedObject.childrenSelected;
        } else {
            //this for unselect the same node. Since aw tree doesnt handle toggle selction
            if( pmiInstance.previousSelectedPmiEntity === eventData.node ) {
                eventData.node.selected = false;
            }
            pmiInstance.previousSelectedPmiEntity = null;
        }
        let currentSelectedNode = _getDataForSelectedObject( eventData.node, mvInstance, pmiInstance );
        childrenSelected = childrenSelected.concat( currentSelectedNode.childrenSelected );
        if( currentSelectedNode.node.selected ) {
            pmiInstance.previousSelectedPmiEntity = eventData.node;
        }
        if( childrenSelected.length > 0 ) {
            pmiToolUtil.setPmiElementProperty( childrenSelected ).then( function() {

            }, function( error ) {
                logger.error( 'Selection failed' + error );
            } );
        }
    }, 300 ) );
};

/**Handler to extract selected data from the object and also creates a list of selected children
 *
 *
 * @param {object} selectedObject the selected node
 * @param {object} mvInstance fetch mvInstance class
 * @param {object} pmiInstance fetch pmiInstance class
 *
 *  @returns {Object} selected children and node
 */
var _getDataForSelectedObject = function( selectedObject, mvInstance, pmiInstance ) {
    let nodeObject;
    let childrenSelected = [];
    if( 'modelViewId' in selectedObject ) {
        nodeObject = pmiToolUtil.getNodeFromArrayOfObjects( mvInstance.pmiModelViewData, selectedObject );
    } else {
        nodeObject = pmiToolUtil.getNodeFromArrayOfObjects( pmiInstance.pmiEntityData, selectedObject );
    }
    if( !nodeObject.isGroup ) {
        childrenSelected.push( {
            id: nodeObject.index,
            state: 'SELECTED',
            value: nodeObject.selected
        } );
    }
    return {
        childrenSelected: childrenSelected,
        node: nodeObject
    };
};
/**
 * Handler for types entity checking action
 *
 * @param {object} input the entity that is checked
 * @param {object} pmiInstance the view model
 * @param {object} mvInstance fetch mvInstance class
 */
export let typesEntryChecked = function( input, pmiInstance, mvInstance ) {
    if( ignoreTypesValueChangeProcessingAsMVChanged ) {
        return;
    }
    if( input.isPropagatedFromParent ) {
        input.isPropagatedFromParent = false;
        return;
    }
    if( input.isBubbblingFromChildren ) {
        input.isBubbblingFromChildren = false;
        return;
    }
    if( input.isPropagatedFromModelViewParent ) {
        pmiInstance.parentVisibilityHandledFromChildren( input );
        input.isPropagatedFromModelViewParent = false;
        return;
    }

    if( _timeOutPromiseSelected ) {
        _.forEach( _timeOutPromiseSelected, cancelEachTimeOut => AwTimeoutService.instance.cancel( cancelEachTimeOut ) );
        _timeOutPromiseSelected = [];
    }
    _unselectNodeAfterChecked( input, mvInstance, pmiInstance );
    pmiInstance.pmiTypesEntityChecked( input );
};

/**
 * Handler for reorient text action
 */
export let reorientText = function() {
    var viewerCtxNameSpace = pmiToolUtil.getActiveViewerCmdCtxPartPath();
    viewerSecondaryModelService.reorientText( viewerCtxNameSpace );
};
export default exports = {
    handleStepPrevAction,
    handleStepNextAction,
    handleTabSelectionChange,
    stepThroughPrev,
    stepThroughNext,
    initialize,
    updateSelectionWithDisplayStrings,
    updateMVTabViewModel,
    updateTypesTabViewModel,
    modelViewEntryChecked,
    pmiEntityModelViewNodeClicked,
    typesEntryChecked,
    reorientText,
    registerForSelectionAndVisibility,
    clearPmiCtx,
    getCurrentSelection,
    turnOnVisibility
};
/**
 * This service contributes to Pmi in ActiveWorkspace Visualization
 *
 * @member PmiToolService
 * @memberof NgServices
 */
app.factory( 'PmiToolService', () => exports );
