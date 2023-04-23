// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* *
 * @module js/aceInlineAuthoringUtils
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertyService from 'js/uwPropertyService';
import addElementService from 'js/addElementService';
import clientDataModel from 'soa/kernel/clientDataModel';
import lovService from 'js/lovService';
import occmgmtVMTNodeCreateService from 'js/occmgmtViewModelTreeNodeCreateService';
import addObjectUtils from 'js/addObjectUtils';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import eventBus from 'js/eventBus';
import dataSourceService from 'js/dataSourceService';

var exports = {};

/**
 * Initialize the input VMO for all LOV properties
 *
 * @param {Object} inlineVmo View Model Object of editable row
 * @param {Object} columnPropToCreateInPropMap Mapping of Column Names to CreateInput Property
 */
export let initPropsLovApi = function( inlineVmo, columnPropToCreateInPropMap ) {
    var creInObj = clientDataModel.getObject( inlineVmo.uid );

    _.forEach( Object.keys( columnPropToCreateInPropMap ), function( key ) {
        var viewProp = inlineVmo.props[ key ];
        if( viewProp && viewProp.hasLov ) {
            viewProp.lovApi = {};
            viewProp.lovApi.operationName = 'Edit';
            var createInPropertyName = columnPropToCreateInPropMap[ key ];
            var creInProp = creInObj.props[ createInPropertyName ];
            creInProp.propertyName = createInPropertyName;
            creInProp.searchResults = viewProp.searchResults;
            creInProp.lovApi = viewProp.lovApi;
            viewProp.lovApi.creInProp = creInProp;

            viewProp.lovApi.getInitialValues = function( filterStr, deferred, name, maxResults, lovPageSize,
                sortPropertyName, sortOrder ) {
                var creInProp = viewProp.lovApi.creInProp;
                lovService.getInitialValues( filterStr, deferred, creInProp, viewProp.lovApi.operationName, inlineVmo,
                    maxResults, lovPageSize, sortPropertyName, sortOrder, inlineVmo.uid );
            };

            viewProp.lovApi.getNextValues = function( deferred ) {
                var creInProp = viewProp.lovApi.creInProp;
                lovService.getNextValues( deferred, creInProp );
            };

            viewProp.lovApi.validateLOVValueSelections = function( lovEntries ) {
                var creInProp = viewProp.lovApi.creInProp;
                return lovService.validateLOVValueSelections( lovEntries, creInProp, viewProp.lovApi.operationName,
                    inlineVmo, inlineVmo.uid );
            };
        }
    } );
};

/**
 * This will call solr search
 * @param {Object} property - LOV property
 * @returns {Object} ref objects
 */
export let loadRefObjects = function( property ) {
    var deferred = AwPromiseService.instance.defer();
    var userEnteredText = property.uiValue;

    //If property value is empty then skip SOA call
    if( userEnteredText === '' || userEnteredText === undefined ) {
        deferred.resolve( '' );
        return deferred.promise;
    }

    var decl = property.getViewModel();
    var startIndex = decl.dataProviders.getRefObjectsDataProvider.startIndex;
    var searchableObjectTypes = appCtxService.ctx.aceActiveContext.inlineAuthoringContext.searchableObjectTypes;

    var filterMap = {
        'WorkspaceObject.object_type': []
    };
    _.forEach( searchableObjectTypes, function( objectType ) {
        var entry = {
            searchFilterType: 'StringFilter',
            stringValue: objectType
        };

        filterMap[ 'WorkspaceObject.object_type' ].push( entry );
    } );
    var soaInput = {
        searchInput: {
            internalPropertyName: '',
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Awp0FullTextSearchProvider',
            searchCriteria: {
                searchString: userEnteredText
            },
            searchFilterFieldSortType: 'Priority',
            cursor: {
                startIndex: startIndex,
                endIndex: 0,
                startReached: false,
                endReached: false
            },
            searchFilterMap6: filterMap
        },
        inflateProperties: false
    };

    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        function( response ) {
            deferred.resolve( response );
            return deferred.promise;
        },
        function( error ) {
            deferred.reject( error );
            return deferred.promise;
        } );
};

/**
 * The function will add the keyword vmo to input data.
 *
 * @param {Object} searchResultsResponse - search response
 * @returns {Object} modified data
 */
export let convertSolrSearchResponseToLovEntries = function( searchResultsResponse ) {
    var lovEntries = [];
    if( searchResultsResponse.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( searchResultsResponse.searchResultsJSON );
        if( searchResults ) {
            for( var x = 0; x < searchResults.objects.length; ++x ) {
                var uid = searchResults.objects[ x ].uid;
                var obj = searchResultsResponse.ServiceData.modelObjects[ uid ];
                var lovEntry = {
                    propInternalValue: obj.uid,
                    propDisplayValue: obj.props.object_name.uiValues[ 0 ],
                    propDisplayDescription: obj.props.object_string.uiValues[ 0 ]
                };
                lovEntries.push( lovEntry );
            }
        }
    }
    return lovEntries;
};

var getSearchableObjectTypes = function( occTypeName ) {
    var deferred = AwPromiseService.instance.defer();
    // Get types info
    var inlineAuthoringContext = appCtxService.getCtx( 'aceActiveContext.inlineAuthoringContext' );
    if( inlineAuthoringContext.searchableObjectTypes ) {
        deferred.resolve( inlineAuthoringContext.searchableObjectTypes );
        return deferred.promise;
    }
    var soaInput = {
        getInfoForElementIn: {
            parentElement: appCtxService.ctx.aceActiveContext.context.addElement.parent,
            fetchAllowedOccRevTypes: false
        }
    };
    return soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2019-12-OccurrenceManagement', 'getInfoForAddElement3', soaInput ).then(
        function( response ) {
            var _allowedTypesInfo = addElementService.extractAllowedTypesInfoFromResponse( response );
            var typesString = _allowedTypesInfo.searchTypeName;
            var types = typesString.split( ',' );
            appCtxService.ctx.aceActiveContext.inlineAuthoringContext.searchableObjectTypes = types;
            deferred.resolve( types );
            return deferred.promise;
        },
        function( error ) {
            deferred.reject( error );
            return deferred.promise;
        } );
};

/**
 * sets search widget for given properties on vmo
 * @param {Object} _dataProvider - dat provider
 * @param {Object} vmo - inline row vmo.
 * @param {Object} declViewModel - declarative view model.
 */
export let setSearchWidget = function( _dataProvider, vmo, declViewModel ) {
    //LCS-186763: Identify configurable way for specifying search enabled column
    var property = vmo.props.awb0Archetype;
    if( property ) {
        getSearchableObjectTypes( declViewModel.allowedTypeInfo.objectTypeName ).then(
            function() {
                eventBus.subscribe( 'referenceProperty.update', function( eventData ) {
                    if( eventData.property && vmo.uid === eventData.property.parentUid ) {
                        var dbValue = eventData.selectedObjects[ 0 ].uid;
                        eventData.property.uiValue = eventData.selectedObjects[ 0 ].props.object_name.uiValues[ 0 ];
                        uwPropertyService.setValue( eventData.property, dbValue );
                        var viewModelCollection = _dataProvider.getViewModelCollection();
                        var inlineRowobjectIdx = viewModelCollection.findViewModelObjectById( eventData.property.parentUid );
                        var inlineRowobject = viewModelCollection.getViewModelObject( inlineRowobjectIdx );

                        // auto populated ref object properties through + button
                        exports.populateObjectProps( _dataProvider, inlineRowobject, eventData.selectedObjects[ 0 ] );
                    }
                    eventBus.unsubscribe( 'referenceProperty.update' );
                } );

                property.hint = 'editLov';
                property.type = 'STRING';
                property.hasLov = true;
                property.anchor = 'aw_editActionCell';
                property.dataProvider = 'getRefObjectsDataProvider';
                property.getViewModel = function() {
                    return declViewModel;
                };
            } );
    }
};

/**
 * The function will set given object properties on row.
 * @param {Object} dataProvider - data provider
 * @param {Object} row - input row
 * @param {Object} object - object of which properties to be populated
 */
export let populateObjectProps = function( dataProvider, row, object ) {
    row.displayName = row.props.awb0Archetype.uiValue;
    row.props.object_string.uiValue = row.props.awb0Archetype.uiValue;
    row.props.object_string.uiValues[ 0 ] = row.props.awb0Archetype.uiValue;
    if( !object ) {
        eventBus.publish( 'occTreeTable.plTable.clientRefresh' );
        return;
    }
    var vmc = dataProvider.getViewModelCollection();

    //LCS-297740: Make the property map customizable for auto-population of Usage props on empty row
    var propertyMap = { usg0UsageOccRevName: 'object_name', usg0UsageOccRevDesc: 'object_desc' };
    for( var name in propertyMap ) {
        var rowProp = row.props[ name ];
        var objProp = object.props[ propertyMap[ name ] ];

        if( objProp.dbValues[ 0 ] !== null && rowProp !== undefined &&
            ( rowProp.prevValue && ( rowProp.dbValue === undefined || rowProp.dbValue === '' ) || rowProp.prevValue === rowProp.dbValue ||
                rowProp.prevValue === undefined && ( rowProp.dbValue === undefined || rowProp.dbValue === '' ) ) ) {
            // never set null as previous value
            if( objProp.dbValues[ 0 ] !== null ) {
                row.props[ name ].prevValue = objProp.dbValues[ 0 ];
            } else {
                row.props[ name ].prevValue = '';
            }

            uwPropertyService.setValue( row.props[ name ], object.props[ propertyMap[ name ] ].dbValues[ 0 ] );
        }
    }
    //Replace a row after populating values
    var srcIndex = dataProvider.getViewModelCollection().findViewModelObjectById( row.uid );
    var replaceingInlinerow = occmgmtVMTNodeCreateService.createVMNodeUsingModelObjectInfo( row, row.childNdx, row.levelNdx );
    _.merge( replaceingInlinerow, row );
    vmc.loadedVMObjects.splice( srcIndex, 1 );
    vmc.loadedVMObjects.splice( srcIndex, 0, replaceingInlinerow );
};

/**
 * This function will return model object which are realy created in database from createAttachAndSubmitObjects response.
 * @param {Object} response - createAttachAndSubmitObjects response
 * @returns {Object} model objects
 */
export let getCreatedObjectsForInline = function( response ) {
    var objects = addObjectUtils.getCreatedObjects( response );
    var newObjects = [];

    _.forEach( objects, function( object ) {
        if( _.includes( response.ServiceData.created, object.uid ) ) {
            newObjects.push( object );
        }
    } );

    return newObjects;
};

/**
 *
 * To update context values as needed for Add Part Panel
 * @param {Object} parentElement - Parent Element
 */
export let updateParentElementOnCtx = function( parentElement ) {
    appCtxService.ctx.aceActiveContext.context.addElement = {};
    appCtxService.ctx.aceActiveContext.context.addElement.parent = {};
    appCtxService.ctx.aceActiveContext.context.addElement.parent.type = parentElement.type;
    appCtxService.ctx.aceActiveContext.context.addElement.parent.uid = parentElement.uid;
};

/**
 * Creates a data source
 * @param {Object} dataProviders - data providers
 * @return {Object} dataSource instance
 */
export let createDatasource = function( dataProviders ) {
    var declViewModel = {};
    declViewModel.dataProviders = dataProviders;
    return dataSourceService.createNewDataSource( {
        declViewModel: declViewModel
    } );
};

/**
 * Adds LOV to show the list of allowed Usage Types in dropDown
 * @param {Object} updatedVMO - View Model Object for Add Row
 * @param {Event} eventData - EventData to process Add Row
 * @return {Object} updatedVMO - View Model Object with added LOV
 */

export let addLOVValuesForAllowedUsageTypeDropDown = function( updatedVMO, eventData ) {
    //awb0UnderlyingObject is used to allow change in Usage type
    //Hence codefully adding an LOV to show the list of allowed usage types
    let typePropertyOnInlineRow = getTypePropertyNameForInlineRow();
    let currentDeclViewModel;
    if( updatedVMO.props[typePropertyOnInlineRow] ) {
        updatedVMO.props[typePropertyOnInlineRow].hasLov = true;
        updatedVMO.props[typePropertyOnInlineRow].dataProvider = 'getAllowedTypesLOV';
        currentDeclViewModel = eventData.data;

        if( currentDeclViewModel ) {
            updatedVMO.props[typePropertyOnInlineRow].getViewModel = function() {
                return currentDeclViewModel;
            };
        }

        if( updatedVMO.props[typePropertyOnInlineRow].dbValues && updatedVMO.props[typePropertyOnInlineRow].dbValues.length !== 0 ) {
            updatedVMO.underlyingObjectType = updatedVMO.props[typePropertyOnInlineRow].dbValues[ 0 ];
        }
    }
    return updatedVMO;
};

/**
 * Get property name for inline row authoring in ACE
 * @returns {string} Property name for inline row authoring
 */
export let getTypePropertyNameForInlineRow = function() {
    return appCtxService.ctx.occmgmtContext.supportedFeatures.Awb0RevisibleOccurrenceFeature ? 'usg0ArchetypeType' : 'awb0UnderlyingObjectType';
};

export default exports = {
    setSearchWidget,
    initPropsLovApi,
    loadRefObjects,
    convertSolrSearchResponseToLovEntries,
    populateObjectProps,
    getCreatedObjectsForInline,
    updateParentElementOnCtx,
    createDatasource,
    addLOVValuesForAllowedUsageTypeDropDown,
    getTypePropertyNameForInlineRow
};
/**
 * Ace inline authoring utils
 * @memberof NgServices
 * @member aceInlineAuthoringUtils
 *
 * @param {Object} $q - $q
 * @param {appCtxService} appCtxService - Service to use.
 * @param {soaSvc} soaSvc - Service to use.
 * @param {uwPropertyService} uwPropertyService - Service to use.
 * @param {addElementService} addElementService - Service to use.
 * @param {clientDataModel} clientDataModel - Service to use.
 * @param {Object} occmgmtVMTNodeCreateService - occmgmt VM tree node creation service
 * @param {lovService} lovService - Service to use.
 * @param {addObjectUtils} addObjectUtils - addObjectUtils Service to use.
 * @param {Object} dataSourceService - dataSourceService
 *
 * @returns {aceInlineAuthoringUtils} Reference to service's API object.
 */
app.factory( 'aceInlineAuthoringUtils', () => exports );
