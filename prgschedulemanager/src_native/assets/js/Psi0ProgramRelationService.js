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
 * @module js/Psi0ProgramRelationService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import addObjectUtils from 'js/addObjectUtils';
import psmConstants from 'js/ProgramScheduleManagerConstants';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

var linkedObjectRelationMap = {};

export let populateValidIncludeTypes = function( data, ctx ) {
    data.includeTypes = ''; // reset includeTypes as empty

    if( ctx.pselected.modelType.typeHierarchyArray.indexOf( psmConstants.OBJECT_TYPE.PROGRAM ) > -1 ) {
        if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.PRGDEL ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_PROGRAM.PRGDEL;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_PROGRAM.PRGDEL;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.RIO ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_PROGRAM.RIO;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_PROGRAM.RIO;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.SCH ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_PROGRAM.SCH;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_PROGRAM.SCH;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.CHANGEREQUEST ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_PROGRAM.CHANGEREQUEST;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_PROGRAM.CHANGEREQUEST;
        }
    } else if( ctx.pselected.modelType.typeHierarchyArray.indexOf( psmConstants.OBJECT_TYPE.EVENT ) > -1 ) {
        if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.PRGDEL ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_EVENT.PRGDEL;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_EVENT.PRGDEL;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.RIO ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_EVENT.RIO;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_EVENT.RIO;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.CRITERIA ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_EVENT.CRITERIA;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_EVENT.CRITERIA;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.CHECKLIST ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_EVENT.CHECKLIST;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_EVENT.CHECKLIST;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.SCH ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_EVENT.SCH;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_EVENT.SCH;
        } else if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.CHANGENOTICE ) > -1 ) {
            data.includeTypes = psmConstants.VALID_INPUT_TYPES_FOR_EVENT.CHANGENOTICE;
            data.typeFilter = psmConstants.VALID_FILTER_TYPES_FOR_EVENT.CHANGENOTICE;
        }
    }
};

export let populateValidRelationTypes = function( createdObject, pselected ) {
    if( pselected.modelType.typeHierarchyArray.indexOf( psmConstants.OBJECT_TYPE.PROGRAM ) > -1 ) {
        if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.PRGDEL ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_PROGRAM.PRGDEL;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.OPPORTUNITY ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_PROGRAM.OPPORTUNITY;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.ISSUE ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_PROGRAM.ISSUE;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.RISK ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_PROGRAM.RISK;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.SCH ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_PROGRAM.SCH;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.CHANGEREQUEST ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_PROGRAM.CHANGEREQUEST;
        }
    } else if( pselected.modelType.typeHierarchyArray.indexOf( psmConstants.OBJECT_TYPE.EVENT ) > -1 ) {
        if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.PRGDEL ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_EVENT.PRGDEL;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.OPPORTUNITY ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_EVENT.OPPORTUNITY;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.ISSUE ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_EVENT.ISSUE;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.RISK ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_EVENT.RISK;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.SCH ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_EVENT.SCH;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.CHANGENOTICE ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_EVENT.CHANGENOTICE;
        } else if( createdObject.modelType.typeHierarchyArray.indexOf( psmConstants.INPUT_TYPES.CHECKLIST ) > -1 ) {
            return  psmConstants.VALID_RELATION_TYPE_FOR_EVENT.CHECKLIST;
        }
    }
};

/**
 * createRelateAndSubmitObjects SOA input data.
 *
 * @param {object} data the view model data object
 *
 * @return {inputs} create input.
 */
export let getProgramObjectCreateInput = function( data ) {
    var inputs = addObjectUtils.getCreateInput( data );
    if( data.selectedObject && data.selectedObject.props && data.selectedObject.props.parent_types.dbValues.indexOf( 'TYPE::Prg0AbsCriteria::Prg0AbsCriteria::Fnd0AbsActionItem' ) > -1 ) {
        inputs[ 0 ].createData.propertyNameValues.prg0EventObject = [ appCtxService.ctx.pselected.uid ];
    }
    return inputs;
};

/**
    * Add the selected object to data
    *
    * @param {object} data - The qualified data of the viewModel

    */
export let getSelectedObject = function( data ) {
    if( data.eventMap[ 'awTypeSelector.selectionChangeEvent' ] && data.eventMap[ 'awTypeSelector.selectionChangeEvent' ].selectedObjects && data.eventMap[ 'awTypeSelector.selectionChangeEvent' ].selectedObjects.length === 1 ) {
        data.selectedObject = data.eventMap[ 'awTypeSelector.selectionChangeEvent' ].selectedObjects[ 0 ];
    } else if( data.eventMap[ 'getRecentTypesProvider.selectionChangeEvent' ] && data.eventMap[ 'getRecentTypesProvider.selectionChangeEvent' ].selectedObjects && data.eventMap[ 'getRecentTypesProvider.selectionChangeEvent' ].selectedObjects.length === 1 ) {
        data.selectedObject = data.eventMap[ 'getRecentTypesProvider.selectionChangeEvent' ].selectedObjects[ 0 ];
    }
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} the response of createRelateAndSubmitObjects SOA call
 * @return the created object
 */
export let getCreatedObject = function( response ) {
    var createdObjects = addObjectUtils.getCreatedObjects( response );
    if( createdObjects && createdObjects.length > 0 ) {
        return createdObjects[ 0 ];
    }
    return null;
};

/**
 * Parse the perform search response and return the correct output data object
 *
 * @param {Object} response - The response of performSearch SOA call
 * @return {Object} - outputData object that holds the correct values .
 */
export let getRelatedObjects = function( response ) {
    var relatedObjects = [];

    // Check if response is not null and it has some search results then iterate for each result to formulate the
    // correct response
    if( response && response.searchResults ) {
        _.forEach( response.searchResults, function( relation ) {
            // Get the model object for search result object UID present in response
            var relationObject = cdm.getObject( relation.uid );

            if( relationObject && relationObject.props && relationObject.props.primary_object && relationObject.props.secondary_object ) {
                var primaryObject = relationObject.props.primary_object.dbValues[ 0 ];
                var secondaryObject = relationObject.props.secondary_object.dbValues[ 0 ];
                var relatedObjectUID = appCtxService.ctx.mselected[ 0 ].uid === primaryObject ? secondaryObject : primaryObject;
                var relatedObject = cdm.getObject( relatedObjectUID );
                relatedObjects.push( relatedObject );
                linkedObjectRelationMap[ relatedObjectUID ] = relation.uid;
            }
        } );
        registerLinkedObjectRelationMap();

        return relatedObjects;
    }
};

/**
 * Registers the linkedObjectRelationMap.
 *
 */
var registerLinkedObjectRelationMap = function() {
    if( appCtxService.getCtx( 'linkedObjectRelationMap' ) ) {
        appCtxService.updateCtx( 'linkedObjectRelationMap', linkedObjectRelationMap );
    } else {
        appCtxService.registerCtx( 'linkedObjectRelationMap', linkedObjectRelationMap );
    }
};
export let unregisterLinkedObjectRelationMap = function() {
    if( appCtxService.getCtx( 'linkedObjectRelationMap' ) ) {
        appCtxService.unRegisterCtx( 'linkedObjectRelationMap' );
    }
};
/**
 * Get the delete object Info and prepare the input for deleteRelationsSOA.
 *
 * @param {ctx} The context object.
 * @param {vmo} The selected view model project
 */
export let getDeletePrgObjectsInput = function( ctx, vmo ) {
    return [ {
        primaryObject: vmo,
        secondaryObject: ctx.selected,
        relationType: 'Psi0ProgramRelation'
    },
    {
        primaryObject: ctx.selected,
        secondaryObject: vmo,
        relationType: 'Psi0ProgramRelation'
    } ];
};

export let updateLinkedObjectsDataProvider = function( data, vmo ) {
    if( data ) {
        data.vmo = vmo;

        eventBus.publish( 'updateLinkedObjectData', data );
    }
};

export let updateLinkedObjectData = function( data, deletedUid ) {
    var linkObjects = data.dataProviders.getLinkedObjectsSearchProvider.viewModelCollection.loadedVMObjects;
    var modelObjects = $.grep( linkObjects, function( linkObject ) {
        return linkObject.uid !== deletedUid;
    } );
    data.dataProviders.getLinkedObjectsSearchProvider.update( modelObjects );
    data.vmo = data;
};

export default exports = {
    populateValidIncludeTypes,
    populateValidRelationTypes,
    getProgramObjectCreateInput,
    getSelectedObject,
    getCreatedObject,
    getRelatedObjects,
    unregisterLinkedObjectRelationMap,
    getDeletePrgObjectsInput,
    updateLinkedObjectsDataProvider,
    updateLinkedObjectData
};
/**
 * Service for create master schedule panel.
 *
 * @member Psi0ProgramRelationService
 * @memberof NgServices
 *
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {addObjectUtils} addObjectUtils - Service to use.
 *
 */
app.factory( 'Psi0ProgramRelationService', () => exports );
