// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
*/

/**
 * @module js/Psi0ProgramBoardService
 */
import app from 'app';
import psmConstants from 'js/ProgramScheduleManagerConstants';
import cdm from 'soa/kernel/clientDataModel';
import viewModelSvc from 'js/viewModelService';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import _ from 'lodash';
import ngModule from 'angular';

var exports = {};

/**
 * Add object to data provider.
 *
 * @param {Object} dataProvider - The data provider
 * @param {Object} newObj - The new object to be added
 * @returns {Boolean} is object added in data provider list
 */
var addToDataProvider = function( dataProvider, data, newObj, ctx ) {
    if( newObj && dataProvider && dataProvider.viewModelCollection.loadedVMObjects.length === 0 ) {
        validateObjectTypeForBoard( newObj, data );
        dataProvider.viewModelCollection.loadedVMObjects.push( newObj );
        return;
    }
    validateObjectTypeForBoard( newObj, data );
    validateSameObjectTypeInBoard( ctx.timelineProgramBoard.objects, data, newObj );
    let vmc = dataProvider.viewModelCollection;
    var index = vmc.findViewModelObjectById( newObj.uid );
    if( index <= -1 ) {
        dataProvider.viewModelCollection.loadedVMObjects.push( newObj );
    }
    syncSelectionInPrgBoardPanel( dataProvider, newObj );
};

/**
 *  Validates program object type for program board .
 *
 * @param {Object} selectedObject The selected object.
 * @param {Object} data The viewModel object
 *
 */
var validateObjectTypeForBoard = function( selectedObject, data ) {
    var setContext = data.listContext.dbValue;
    if( ( selectedObject && selectedObject.modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 && ( setContext && ( setContext === 'Criteria' || setContext === 'Checklists' ) ) ) ||
        ( selectedObject && selectedObject.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) > -1 ) ||
        ( selectedObject && selectedObject.modelType.typeHierarchyArray.indexOf( 'Prg0EventDependencyRel' ) > -1 ) ) {
        data.validObjectType = psmConstants.VALID_OBJECT_TYPE_FOR_PROGRAM_BOARD.VALID_OBJECTS;
        throw 'invalidSelectionForBoard';
    }
};

/**
 *  Validates program objects type in program board.
 *
 * @param {Object} loadedObjects The loaded Objects.
 * @param {Object} data The viewModel object
 *
 */
var validateObjectTypeInBoard = function( loadedObjects, data ) {
    var setContext = data.listContext.dbValue;
    loadedObjects.forEach( function( loadedObject ) {
        if( ( loadedObject && loadedObject.modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 && ( setContext && ( setContext === 'Criteria' || setContext === 'Checklists' ) ) ) ||
            ( loadedObject && loadedObject.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) > -1 ) ||
            ( loadedObject && loadedObject.modelType.typeHierarchyArray.indexOf( 'Prg0EventDependencyRel' ) > -1 ) ) {
            data.validObjectType = psmConstants.VALID_OBJECT_TYPE_FOR_PROGRAM_BOARD.VALID_OBJECTS;
            throw 'invalidSelectionInBoard';
        }
    } );
};

/**
 *  Validates if Program board contains the same types of object.
 *
 * @param {Object} loadedObjects The loaded Objects.
 * @param {Object} data The viewModel object
 * @param {Object} selectedObject The selected object.
 *
 */
var validateSameObjectTypeInBoard = function( loadedObjects, data, selectedObject ) {
    if( data.listContext.dbValue === 'Changes' ) {
        if( selectedObject ) {
            let existingObjType = loadedObjects[ 0 ] && loadedObjects[ 0 ].modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 ? 'Prg0AbsPlan' : 'Prg0AbsEvent';
            if( selectedObject.modelType.typeHierarchyArray.indexOf( existingObjType ) < 0 ) {
                data.validObjectType = loadedObjects[ 0 ].modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 ? 'Plan' : 'Event';
                throw 'invalidSelectionForBoard';
            }
        }
        let isPlan = false;
        let isEvent = false;
        loadedObjects.forEach( function( loadedObject ) {
            if( loadedObject ) {
                if( loadedObject.modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 ) {
                    isPlan = true;
                } else if( loadedObject.modelType.typeHierarchyArray.indexOf( 'Prg0AbsEvent' ) > -1 ) {
                    isEvent = true;
                }
                if( isPlan && isEvent ) {
                    data.validObjectType = loadedObjects[ 0 ].modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 ? 'Plan' : 'Event';
                    throw 'invalidSelectionInBoard';
                }
            }
        } );
    }
};

/**
 * This function will add data to program board.
 *
 * @param {Object} ctx - The current selected ctx.
 * @param {Object} data - The current data.
 */
export let addToProgramBoard = function( ctx, data, newObjUID ) {
    var dataProvider = data.dataProviders.psi0ProgramObjectsProvider;
    var newObj = cdm.getObject( newObjUID );
    if( dataProvider && newObj ) {
        addToDataProvider( dataProvider, data, newObj, ctx );
        var programViewModelObjects = dataProvider.viewModelCollection.loadedVMObjects;
        dataProvider.update( programViewModelObjects );
        syncSelectionInPrgBoardPanel( dataProvider, newObj );
        prepareContext( ctx, data );
    }
};

/**
 * selectionChange Of ListContext.
 *
 * @param {ctx} ctx The context object.
 * @param {Object} data The viewModel object
 */
export let selectionChangeOfListContext = function( ctx, data ) {
    ctx.timelineProgramBoard.context = data.listContext.dbValue;
    if( ctx.timelineProgramBoard.objects && ctx.timelineProgramBoard.objects.length > 0 ) {
        validateObjectTypeInBoard( ctx.timelineProgramBoard.objects, data );
        validateSameObjectTypeInBoard( ctx.timelineProgramBoard.objects, data );
    }
};

/**
 * Initialize ProgramBoard
 *
 * @param {ctx} ctx The context object.
 * @param {Object} data The viewModel object
 *
 */
export let initializeProgramBoard = function( ctx, data ) {
    if( ctx.timelineProgramBoard.context ) {
        if( !_.isEmpty( ctx.timelineProgramBoard.objects ) ) {
            let updatedObjs = [];
            ctx.timelineProgramBoard.objects.forEach( function( obj ) {
                updatedObjs.push( cdm.getObject( obj.uid ) );
            } );
            ctx.timelineProgramBoard.objects = updatedObjs;
            data.dataProviders.psi0ProgramObjectsProvider.viewModelCollection.loadedVMObjects = ctx.timelineProgramBoard.objects;
        }
        if( ctx.selected.uid !== ctx.locationContext.modelObject.uid ||  ctx.selected.levelNdx >= 0 ) {
            addToProgramBoard( ctx, data, ctx.selected.uid );
        }
    }
};

/**
 * Prepare context for Kanban Board
 *
 * @param {ctx} ctx The context object.
 * @param {Object} data The viewModel object
 */
var prepareContext = function( ctx, data ) {
    var dataProvider = data.dataProviders.psi0ProgramObjectsProvider;
    ctx.timelineProgramBoard.objects = dataProvider.viewModelCollection.loadedVMObjects;
    ctx.timelineProgramBoard.context = data.listContext.dbValue;
};

var prepareColumnsInfo = function( ctx, data ) {
    var loadedObjects = [];
    var columnsInfo = [];

    if( ctx.timelineProgramBoard.objects.length > 0 ) {
        loadedObjects = ctx.timelineProgramBoard.objects;
        var setContext = ctx.timelineProgramBoard.context;
        if( !_.isEmpty( loadedObjects ) ) {
            data.validObjectType = loadedObjects[ 0 ].modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 ? 'Plan' : 'Event';
        }
        loadedObjects.forEach( function( obj ) {
            if( setContext === 'Criteria' || setContext === 'Checklists' || setContext === 'Changes' ) {
                let supportedObjType = data.validObjectType === 'Event' ? 'Prg0AbsEvent' : 'Prg0AbsPlan';
                if( obj.modelType.typeHierarchyArray.indexOf( supportedObjType ) < 0 ) {
                    return;
                }
            }
            var status = obj.uid;
            var columnInfo = {
                name: status,
                displayName: obj.props.object_string.dbValues[0],
                isGroup: false,
                multiselect: true
            };
            columnsInfo.push( columnInfo );
        } );
    }
    return columnsInfo;
};

/**
 * clearAllAction
 *
 * @param {ctx} ctx The context object.
 * @param {Object} data The viewModel object
 */
export let clearAllAction = function( ctx, data ) {
    var dataProvider = data.dataProviders.psi0ProgramObjectsProvider;
    if( dataProvider ) {
        dataProvider.viewModelCollection.loadedVMObjects = [];
        dataProvider.viewModelCollection.totalFound = 0;
        dataProvider.viewModelCollection.totalObjectsLoaded = 0;
        ctx.timelineProgramBoard.objects = [];
    }
};

/**
 * Method to publish event for updating program Board View
 * @param {vmo} The selected view model project
 */
export let updateProgramBoardView = function( vmo ) {
    if( vmo ) {
        eventBus.publish( 'updateProgramBoardView', vmo );
    }
};

export let updateProgramBoard = function( ctx, data ) {
    var vmo = data.eventMap.updateProgramBoardView;

    var dataProvider = data.dataProviders.psi0ProgramObjectsProvider;

    if( vmo && vmo.uid && dataProvider ) {
        var deletedUid = vmo.uid;
        var programObjects = dataProvider.viewModelCollection.loadedVMObjects;
        var modelObjects = $.grep( programObjects, function( programObject ) {
            return programObject.uid !== deletedUid;
        } );
        dataProvider.update( modelObjects );
        prepareContext( ctx, data );
    }
};

var getValidRelationType = function( contextValue, pselected ) {
    if( pselected.modelType.typeHierarchyArray.indexOf( psmConstants.OBJECT_TYPE.PROGRAM ) > -1 ) {
        return psmConstants.VALID_RELATION_TYPE_FOR_PROGRAM_IN_PROGRAM_BOARD[ contextValue ];
    } else if( pselected.modelType.typeHierarchyArray.indexOf( psmConstants.OBJECT_TYPE.EVENT ) > -1 ) {
        return psmConstants.VALID_RELATION_TYPE_FOR_EVENT_IN_PROGRAM_BOARD[ contextValue ];
    }
};

export let getRelatedObjectsInput = function( ctx, data ) {
    ctx.timelineProgramBoard.column = prepareColumnsInfo( ctx, data );
    var dataProvider = data.dataProviders.psi0ProgramObjectsProvider;
    var loadedProgramObjects = dataProvider.viewModelCollection.loadedVMObjects;
    var getRelatedObjectsInput = [];
    var smGanttSplitElement = document.getElementsByClassName( 'aw-programPlanning-programBoard' );
    var scope = ngModule.element( smGanttSplitElement[ 0 ] ).scope();
    if( scope ) {
        var declViewModel = viewModelSvc.getViewModel( scope, true );
        ctx.activeProgramBoard = false;
        scope.$applyAsync();
    }
    if( loadedProgramObjects.length > 0 ) {
        _.forEach( loadedProgramObjects, function( programObject ) {
            var relationType = getValidRelationType( data.listContext.dbValue, programObject );
            if( relationType ) {
                var getRelatedObjects = {
                    contextObjectUID: programObject.uid,
                    relationType: relationType,
                    startIndex: 0,
                    maxToLoad: 50,
                    loadOptions: {
                        populateRelatedObjectUIDs: 'false'
                    }
                };
                getRelatedObjectsInput.push( getRelatedObjects );
            }
        } );
    }
    return getRelatedObjectsInput;
};

export let processResultUpdateCtx = function( response, ctx ) {
    if( !ctx.timelineProgramBoard ) {
        ctx.timelineProgramBoard = {};
    }
    ctx.timelineProgramBoard.relatedObjects = response.relatedObjects;
    ctx.activeProgramBoard = true;
};

export let syncSelectionInPrgBoardPanel = function( dataProvider, objectToSelect ) {
    if( dataProvider ) {
        let vmc = dataProvider.viewModelCollection;
        var index = vmc.findViewModelObjectById( objectToSelect.uid );
        if( index > -1 ) {
            var vmo = vmc.getViewModelObject( index );
            dataProvider.selectionModel.setSelection( vmo );
        }
    }
};

export default exports = {
    addToProgramBoard,
    selectionChangeOfListContext,
    initializeProgramBoard,
    clearAllAction,
    updateProgramBoardView,
    updateProgramBoard,
    getRelatedObjectsInput,
    processResultUpdateCtx,
    syncSelectionInPrgBoardPanel
};
/**
 * Service to Kanban panel.
 *
 * @member Psi0ProgramBoardService
 * @memberof NgServices
 */
app.factory( 'Psi0ProgramBoardService', () => exports );
