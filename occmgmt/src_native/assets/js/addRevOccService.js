// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@


/* *
 * @module js/addRevOccService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import dmSvc from 'soa/dataManagementService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import soaSvc from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';
import addObjectUtils from 'js/addObjectUtils';
import panelContentSvc from 'js/panelContentService';
import viewModelSvc from 'js/viewModelService';
import AwRootScopeService from 'js/awRootScopeService';
import cdmSvc from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/* *
 * Update the selected type on create panel based on selection change
 *
 * @param {Object} data - The create occurrence panel's view model object
 *
 */
export let handleTypeSelectionJs = function( data ) {
    var selectedType = data.dataProviders.getAllowableTypesProvider.selectedObjects;
    //  If user selected Type set it as selected
    if( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[ 0 ].props.type_name.dbValue;
        data.selectedTypeDisplayName.dbValue = selectedType[ 0 ].props.object_string.dbValue;
        var vmProperty = uwPropertyService.createViewModelProperty( selectedType[ 0 ].props.object_string.dbValue,
            selectedType[ 0 ].props.object_string.dbValue, 'STRING', '', '' );
        data.displayedType = vmProperty;
    } else {
        data.selectedType.dbValue = '';
        data.selectedTypeDisplayName.dbValue = '';
    }
};

/* *
 * Clear selected type when user click on type link on create form
 *
 * @param {Object} data - The create occurrence panel's view model object
 *
 */
export let clearSelectedType = function( data ) {
    data.selectedType.dbValue = '';
    data.selectedTypeDisplayName.dbValue = '';
};
/* *
 * loads the name/desc values on create occurrence panel's view model object
 *
 * @param {Object} data - The create occurrence panel's view model object
 *
 */
export let autoLoadUsagePropertyValues = function( data ) {
    var object_prevname = [];
    var object_prevdesc = [];
    if( data.object_name.dbValue === null || data.object_name.dbValue === '' || data.object_name.dbValue === undefined || data.object_name.dbValue === appCtxService.ctx.aceActiveContext.context.object_prevname ) {
        data.object_name.dbValue = appCtxService.ctx.aceActiveContext.context.object_name[ 0 ];
        object_prevname = appCtxService.ctx.aceActiveContext.context.object_name[ 0 ];
        data.object_name.valueUpdated = true;
    }
    if( data.object_desc.dbValue === null || data.object_desc.dbValue === '' || data.object_desc.dbValue === undefined || data.object_desc.dbValue === appCtxService.ctx.aceActiveContext.context.object_prevdesc ) {
        data.object_desc.dbValue = appCtxService.ctx.aceActiveContext.context.object_desc[ 0 ];
        object_prevdesc = appCtxService.ctx.aceActiveContext.context.object_desc[ 0 ];
        data.object_desc.valueUpdated = true;
    }
    appCtxService.registerPartialCtx( 'aceActiveContext.context.object_prevname', object_prevname );
    appCtxService.registerPartialCtx( 'aceActiveContext.context.object_prevdesc', object_prevdesc );
};
/* *
 * Populate the Parent revision value in case of RO creation
 */
export let populateParentRevision = function() {
    /*The fnd0Parent value needs to be of Item Revision type. In case of Partition its not Item Revision hence we set the parent
     as the Top Element since that's the first BVR Parent to which the RO will be added.*/
    let parentRevObj = cdmSvc.getObject( appCtxService.ctx.aceActiveContext.context.addElementInput.parentElement.props.awb0Archetype.dbValues[ 0 ] );
    if( parentRevObj && parentRevObj.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) <= -1 ) {
        appCtxService.registerPartialCtx( 'aceActiveContext.context.revOccParentItem', appCtxService.ctx.aceActiveContext.context.topElement.props.awb0Archetype.dbValues[ 0 ] );
    } else {
        appCtxService.registerPartialCtx( 'aceActiveContext.context.revOccParentItem', appCtxService.ctx.aceActiveContext.context.addElementInput.parentElement.props.awb0Archetype.dbValues[ 0 ] );
    }
};

/* *
 * Load created object/copied child Revision on Data to populate objectToBeAdded
 */
export let loadCreatedObjects = function( data ){
    //Populate objectToBeAdded on data from ctx
    data.createdObject = cdmSvc.getObject( appCtxService.ctx.aceActiveContext.context.revOccChildItem);
};
/* *
 * Return Revision data to dataprovider
 *
 * @param {viewModelJson} data - The view model data
 * @returns {viewModelJson} revisionData - The child Revision data
 */
export let getRevisionData = function( data ) {
    var results = [];
    var object_name = [];
    var object_desc = [];

    //  check if new object is created
    if( data.createdObject ) {
        results.push(data.createdObject);
        object_name = data.createdObject.props.object_name.dbValues;
        object_desc = data.createdObject.props.object_desc.dbValues;
    } else if( data.sourceObjects ) {
        //  return all selected element from palette and search tabs
        results = data.sourceObjects;
        if(data.sourceObjects[ 0 ].modelType.typeHierarchyArray.indexOf('Awb0Element') > -1)
        {
            //If clipboard has Awb0Element copied
            object_name = data.sourceObjects[ 0 ].props.awb0ArchetypeRevName.dbValues;
            object_desc = data.sourceObjects[ 0 ].props.awb0ArchetypeRevDescription.dbValues;
        }
        else
        {
            object_name = data.sourceObjects[ 0 ].props.object_name.dbValues;
            object_desc = data.sourceObjects[ 0 ].props.object_desc.dbValues;
        }
    } else {
        results = [];
        object_name = '';
        object_desc = '';
    }
    appCtxService.registerPartialCtx( 'aceActiveContext.context.object_name', object_name );
    appCtxService.registerPartialCtx( 'aceActiveContext.context.object_desc', object_desc );

    var revisionData = {
        searchResults: results,
        totalFound: results.length
    };

    if( revisionData.searchResults.length > 0 ) {
        var revisionObject = revisionData.searchResults[ 0 ];
        if( revisionObject.props.awb0Archetype !== undefined ) {
            // We got an Awb0Element as input
            revisionObject = cdmSvc.getObject( revisionObject.props.awb0Archetype.dbValues[ 0 ] );
        }
        appCtxService.registerPartialCtx( 'aceActiveContext.context.revOccChildItem', revisionObject.uid );
    }
    return revisionData;
};

/* *
 * ensure allowable types are present in cache
 *
 * @param {Object} data - The create Occurrence panel's view model object
 * @returns {List} List of allowable types for create occurrence panel
 */
export let ensureAllowableTypesLoadedJs = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var returnedTypes = [];
    var result = data.allowedTypeInfo.objectTypeName.split( ',' );
    var displayableTypes = result;

    var promise = soaSvc.ensureModelTypesLoaded( displayableTypes );
    if( promise ) {
        promise.then( function() {
            var typeUids = [];
            for( var i = 0; i < displayableTypes.length; i++ ) {
                var modelType = cmm.getType( displayableTypes[ i ] );
                returnedTypes.push( modelType );
                typeUids.push( modelType.uid );
            }

            // ensure the ImanType objects are loaded
            propertyPolicySvc.register( {
                types: [ {
                    name: 'ImanType',
                    properties: [ {
                        name: 'parent_types'
                    }, {
                        name: 'type_name'
                    } ]
                } ]
            } );

            dmSvc.loadObjects( typeUids ).then( function() {
                var returnedData = {
                    searchResults: returnedTypes,
                    totalFound: returnedTypes.length
                };
                deferred.resolve( returnedData );
            } );
        } );
    }
    return deferred.promise;
};

/* *
 * Ensures event bus subscription for create panel, based on allowable types provider
 *
 * @param {Object} data - The create Occurrence panel's view model object
 */
export let subscribeTypeSelectionEvents = function( data ) {
    if( data.activeView ) {
        var subDef = eventBus
            .subscribe(
                data.dataProviders.getAllowableTypesProvider.name + '.modelObjectsUpdated',
                function() {
                    for( var index = 0; index < data.dataProviders.getAllowableTypesProvider.viewModelCollection.totalFound; index++ ) {
                        if( data.allowedTypeInfo.preferredType ===
                            data.dataProviders.getAllowableTypesProvider.viewModelCollection.loadedVMObjects[ index ].props.type_name.dbValue ) {
                            data.dataProviders.getAllowableTypesProvider.changeObjectsSelection( index, 0, true );
                            break;
                        }
                    }
                    eventBus.unsubscribe( subDef );
                } );
    }
    eventBus.publish( 'addRevOccService.processAddElementInput' );
};

/* *
 * Initialize variables and methods when create occurrence panel is loaded.
 *
 * @param {Object} data - data
 */
export let initializeCreateOccurrencePanel = function( data ) {
    //  handler to listen on click on type on create form. On click it will again show type selection panel.
    data.clearSelectedTypeHandler = function() {
        data.selectedType.dbValue = '';
        data.selectedTypeDisplayName.dbValue = '';
    };
};

/* *
 * Populate createInput for bulk object creation.
 * @param {Object} sourceObjects - Part objects to be added
 * @param {Object} panelCtx - Provide panel context if undefined this function will retrieve it from application context.
 * @return {Object} bulk create input
 */
var populateBulkCreateInput = function( sourceObjects, panelCtx) {
    //  Get panelContext data for RO CreateInput.
    if(panelCtx === undefined)
    {
        panelCtx = appCtxService.getCtx( 'panelContext' );
    }
    // Get the dummy CreateInput for RO
    var returnedInput = addObjectUtils.getCreateInput( panelCtx.data );
    var bulkCreateIn = [];
    for( var i = 0; i < sourceObjects.length; i++ ) {
        // Clone the createInput
        var tempCreateIn = _.cloneDeep( returnedInput[ 0 ] );

        //  Clear the ID field if exists.Let it be driven via auto-generated ID
        if( tempCreateIn.createData.compoundCreateInput.wso_thread !== undefined ) {
            tempCreateIn.createData.compoundCreateInput.wso_thread[ 0 ].propertyNameValues.fnd0ThreadId[ 0 ] = '';
        }
        //  Copy child revision uid
        tempCreateIn.createData.propertyNameValues.fnd0Child[ 0 ] = sourceObjects[ i ].uid;

        //  Copy revision name
        //  Case 1 : User input for RO Name !='' and Part revision name !='' => Replace RO name by Part Revision name
        //  Case 2 : User input for RO Name =='' and Part revision name !='' => Add RO name same as Part Revision name
        if( tempCreateIn.createData.propertyNameValues.object_name !== undefined ) {
            tempCreateIn.createData.propertyNameValues.object_name[ 0 ] = sourceObjects[ i ].props.object_name.dbValues[ 0 ];
        } else {
            var object_name = [ sourceObjects[ i ].props.object_name.dbValues[ 0 ] ];
            _.set( tempCreateIn.createData.propertyNameValues, 'object_name', object_name );
        }

        //  Copy revision description if non null
        //  Case 1 : User input for RO Description !='' and Part revision description !='' => Replace RO desc by Part Revision desc
        //  Case 2 : User input for RO Description !='' and Part revision description =='' => Replace RO desc by Part Revision desc
        //  Case 3 : User input for RO Description =='' and Part revision description !='' => Add RO desc same as Part Revision desc
        if( tempCreateIn.createData.propertyNameValues.object_desc !== undefined && sourceObjects[ i ].props.object_desc.dbValues[ 0 ] !== null ) {
            tempCreateIn.createData.propertyNameValues.object_desc[ 0 ] = sourceObjects[ i ].props.object_desc.dbValues[ 0 ];
        } else if( tempCreateIn.createData.propertyNameValues.object_desc !== undefined && sourceObjects[ i ].props.object_desc.dbValues[ 0 ] === null ) {
            tempCreateIn.createData.propertyNameValues.object_desc[ 0 ] = '';
        } else if( tempCreateIn.createData.propertyNameValues.object_desc === undefined && sourceObjects[ i ].props.object_desc.dbValues[ 0 ] !== null ) {
            var object_desc = [ sourceObjects[ i ].props.object_desc.dbValues[ 0 ] ];
            _.set( tempCreateIn.createData.propertyNameValues, 'object_desc', object_desc );
        }

        bulkCreateIn.push( tempCreateIn.createData );
    }
    return bulkCreateIn;
};

/* *
 * Get input data for object creation.
 * @param {Object} data - the view model data object
 * @param {Object} panelContextInput - Provide panel context if provided undefined it will retrieve it from application context.
 * @return {Object} create input
 */
export let getBulkCreateInput = function( data, panelContextInput = undefined) {
    //  Return createInput for RO, if it's a bulk create scenario
    var deferred = AwPromiseService.instance.defer();
    var returnedinput = null;
    var sourceObjects = data.sourceObjects;
    if( sourceObjects !== undefined && sourceObjects.length > 0 ) {
        var uids = [];
        for( var i = 0; i < sourceObjects.length; i++ ) {
            if( sourceObjects[ i ].props.awb0Archetype !== undefined ) {
                // We got an Awb0Element as input
                sourceObjects[ i ] = cdmSvc.getObject( sourceObjects[ i ].props.awb0Archetype.dbValues[ 0 ] );
                uids.push( sourceObjects[ i ].uid );
            } else {
                uids.push( sourceObjects[ i ].uid );
            }
        }
        // Loading required properties for future use
        dmSvc.getProperties( uids, [ 'object_name', 'object_desc' ] ).then( function() {
            returnedinput = populateBulkCreateInput( sourceObjects , panelContextInput);
            deferred.resolve( returnedinput );
        } );
    }
    return deferred.promise;
};

/* *
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} the response of createRelateAndSubmitObjects SOA call
 * @return the created object
 */
export let getCreatedObject = function( response ) {
    return addObjectUtils.getCreatedObjects( response );
};

/* *
 * This API loads Awb0AddOccurrenceSub View model and makes call to addObject SOA in case of bulk RO creation
 *
 * @param {Object} ViewModel data from Awb0AddRevisionViewModel i.e. Add Part panel
 */
export let bulkAddObject = function( data ) {
    var createdObjects = data.sourceObjects;
    var deferred = AwPromiseService.instance.defer();
    var currentScope = null;
    panelContentSvc.getViewModelById( 'Awb0AddOccurrenceSub' ).then(
        function( response ) {
            viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
                function( declViewModel ) {
                    currentScope = AwRootScopeService.instance.$new();
                    declViewModel.sourceObjects = createdObjects;
                    declViewModel.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
                    viewModelSvc.setupLifeCycle( currentScope, declViewModel );
                    viewModelSvc.executeCommand( declViewModel, 'revOccAddElementsWithCreateInput', currentScope ).then( function() {
                        // Destroy VM as subsequent user actions are not impacted after bulk add
                        currentScope.$destroy();
                        deferred.resolve();
                    }, function() {
                        deferred.reject();
                    } );
                } );
        } );
};

/* This API is used to unRegister revOccChildItem and revOccParentItem value from Context
 */
export let clearContext = function() {
    appCtxService.updatePartialCtx( 'aceActiveContext.context.revOccChildItem', null );
};

/* This API is used to unRegister AutoLoad-Usage properties from Context
 */
export let clearAutoLoadUsagePropertyValues = function() {
    appCtxService.updatePartialCtx( 'aceActiveContext.context.object_prevname', null );
    appCtxService.updatePartialCtx( 'aceActiveContext.context.object_prevdesc', null );
    appCtxService.updatePartialCtx( 'aceActiveContext.context.object_name', null );
    appCtxService.updatePartialCtx( 'aceActiveContext.context.object_desc', null );
};

/* This API is used to unRegister revOccParentItem value from Context
*/
export let clearParentContext = function() {
    appCtxService.updatePartialCtx( 'aceActiveContext.context.revOccParentItem', null );
};

/* *
 * Add Revisiable Occurrence service
 * @member addRevOccService
 *
 * @param {$q} $q - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @param {uwPropertyService} uwPropertyService - Service to use.
 * @param {soa_dataManagementService} dmSvc - Service to use.
 * @param {soa_kernel_propertyPolicyService} propertyPolicySvc - Service to use.
 * @param {soa_kernel_soaService} soaSvc - Service to use.
 * @param {soa_kernel_clientMetaModel} cmm - Service to use.
 * @param {addObjectUtils} addObjectUtils - Service to use.
 * @param {panelContentService} panelContentSvc - Service to use.
 * @param {viewModelService} viewModelSvc - Service to use.
 * @param {$rootScope} rootScope - root scope
 * @param {soa_kernel_clientDataModel} cdmSvc - Service to use.
 *
 * @returns {addRevOccService} Reference to service's API object.
 */

export default exports = {
    handleTypeSelectionJs,
    clearSelectedType,
    autoLoadUsagePropertyValues,
    getRevisionData,
    ensureAllowableTypesLoadedJs,
    subscribeTypeSelectionEvents,
    initializeCreateOccurrencePanel,
    getBulkCreateInput,
    getCreatedObject,
    bulkAddObject,
    clearContext,
    loadCreatedObjects,
    populateParentRevision,
    clearAutoLoadUsagePropertyValues,
    clearParentContext
};
app.factory( 'addRevOccService', () => exports );
