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
 * @module js/globalCreateReqSpecification
 */
import app from 'app';
import _uwPropSrv from 'js/uwPropertyService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import dmSvc from 'soa/dataManagementService';
import reqACEUtils from 'js/requirementsACEUtils';
import reqUtils from 'js/requirementsUtils';
import soaSvc from 'soa/kernel/soaService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import propPolicySvc from 'soa/kernel/propertyPolicyService';

var exports = {};
var domainInternalNames = new Map();

var _getCreateInputObject = function( boName, propertyNameValues, compoundReqCreateInput ) {
    var createInputObject = {
        boName: boName,
        propertyNameValues: propertyNameValues,
        compoundReqCreateInput: compoundReqCreateInput
    };
    return createInputObject;
};

var _processPropertyForCreateInput = function( propName, vmProp, createInputMap ) {
    if( vmProp ) {
        var valueStrings = _uwPropSrv.getValueStrings( vmProp );
        if( valueStrings && valueStrings.length > 0 ) {
            var propertyNameTokens = propName.split( '__' );
            var fullPropertyName = '';
            for( var i = 0; i < propertyNameTokens.length; i++ ) {
                if( i < propertyNameTokens.length - 1 ) {
                    // Handle child create inputs
                    fullPropertyName = _addChildInputToParentMap2( fullPropertyName, i, propertyNameTokens,
                        createInputMap, vmProp );
                } else {
                    // Handle property
                    var createInput = createInputMap[ fullPropertyName ];
                    if( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, propertyNameTokens[ i ], valueStrings );
                    }
                }
            }
        }
    }
};

/**
 * Private method to create input for create item
 *
 * @param fullPropertyName property name
 * @param count current count
 * @param propertyNameTokens property name tokens
 * @param createInputMap create input map
 * @param operationInputViewModelObject view model object
 * @return {String} full property name
 */
var _addChildInputToParentMap2 = function( fullPropertyName, count, propertyNameTokens, createInputMap, vmProp ) {
    var propName = propertyNameTokens[ count ];
    var childFullPropertyName = fullPropertyName;
    if( count > 0 ) {
        childFullPropertyName += '__' + propName; //$NON-NLS-1$
    } else {
        childFullPropertyName += propName;
    }

    // Check if the child create input is already created
    var childCreateInput = _.get( createInputMap, childFullPropertyName );
    if( !childCreateInput && vmProp && vmProp.intermediateCompoundObjects ) {
        var compoundObject = _.get( vmProp.intermediateCompoundObjects, childFullPropertyName );
        if( compoundObject ) {
            // Get the parent create input
            var parentCreateInput = _.get( createInputMap, fullPropertyName );
            if( parentCreateInput ) {
                // Create the child create input
                // Add the child create input to parent create input
                childCreateInput = _getCreateInputObject( compoundObject.modelType.owningType, {}, {} );
                if( !parentCreateInput.compoundReqCreateInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundReqCreateInput[ propName ] = [];
                }
                parentCreateInput.compoundReqCreateInput[ propName ].push( childCreateInput );

                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

/**
 * Get input data for object creation.
 *
 * @param {Object} data - the view model data object
 * @return {Object} create input
 */
export let getCreateReqSpecInput = function( data, ctx ) {
    var createInputMap = {};
    var resultInput = {};

    createInputMap[ '' ] = _getCreateInputObject( data.objCreateInfo.createType, {}, {} );

    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );
        if( vmProp && ( vmProp.isAutoAssignable || _uwPropSrv.isModified( vmProp ) ) ) {
            _processPropertyForCreateInput( propName, vmProp, createInputMap );
        }
    } );

    var htmlSpecTemplateObj = {
        uid: 'AAAAAAAAAAAAAA',
        type: 'unknownType'
    };
    if( data.htmlSpecTemplate.dbValue !== '' ) {
        htmlSpecTemplateObj.uid = domainInternalNames.get( data.htmlSpecTemplate.dbValue );
        htmlSpecTemplateObj.type = 'Arm0HtmlSpecTmplRevision';
    }
    var createMap = _.get( createInputMap, '' );

    resultInput = {

        createInput: createMap,
        targetObject: {
            uid: ctx.selected.uid,
            type: ctx.selected.type
        },
        htmlSpecTemplate: htmlSpecTemplateObj

    };

    return resultInput;
};


/**
 * Select HTML Spec Template will update Top line with Requirement Spec Sub types mentioned in HTML Spec template
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let selectHtmlSpecTemplate = function( data ) {
    var htmlSpecTemplateItemUid = domainInternalNames.get( data.htmlSpecTemplate.dbValue );

    if( !htmlSpecTemplateItemUid ) { return; }

    var revisionElementObject = cdm.getObject( htmlSpecTemplateItemUid );
    var htmlSpecTemplateRevUid = revisionElementObject.props.revision_list.dbValues[ 0 ];

    if( !htmlSpecTemplateRevUid ) { return; }

    var deferred = AwPromiseService.instance.defer();
    var arrModelObjs = [ { uid: htmlSpecTemplateRevUid } ];
    var cellProp = [ 'lsd', 'IMAN_specification' ];

    reqUtils.loadModelObjects( arrModelObjs, cellProp ).then( function( response ) {
        var fullTextObj = reqACEUtils.getObjectOfType( response.ServiceData.modelObjects, 'FullText' );
        if( !htmlSpecTemplateRevUid ) { return deferred.resolve(); }

        arrModelObjs = [ { uid: fullTextObj.uid } ];
        cellProp = [ 'body_text', 'ref_list' ];

        reqUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
            var jsonResult = JSON.parse( fullTextObj.props.body_text.dbValues[ 0 ] );
            for( var i = 0; i < data.searchResults.length; i++ ) {
                if( data.searchResults[ i ].name === jsonResult.internalType ) {
                    data.selectedType.dbValue = jsonResult.internalType;
                    data.displayedType.propertyDisplayName = data.searchResults[ i ].displayName;
                    break;
                }
            }
            deferred.resolve();
        } ).catch( function() {
            deferred.resolve();
        } );
    } ).catch( function() {
        deferred.resolve();
    } );

    return deferred.promise;
};
/**
 * Clear selected type when user click on type link on create form
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let clearSelectedTypeJs = function( data ) {
    data.selectedType.dbValue = '';
    data.displayedType.propertyDisplayName = '';
};

/**
 * Ensure Spec types are present in cache
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let ensureReqSpecTypesLoadedJs = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var returnedTypes = [];
    var displayableSpecTypes = data.reqSpecSubtypeNames;
    var _data = data;

    var promise = soaSvc.ensureModelTypesLoaded( displayableSpecTypes );
    if( promise ) {
        promise.then( function() {
            var typeUids = [];
            for( var i = 0; i < displayableSpecTypes.length; i++ ) {
                var modelType = cmm.getType( displayableSpecTypes[ i ] );
                if( !modelType.abstract ) {
                    if( _data.displayedType.propertyDisplayName === '' || modelType.name === _data.selectedType.dbValue ) {
                        _data.displayedType.propertyDisplayName = modelType.displayName;
                    }
                    returnedTypes.push( modelType );
                    typeUids.push( modelType.uid );
                }
            }

            //ensure the ImanType objects are loaded
            var policyId = propPolicySvc.register( {
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
                var returneddata = {
                    searchResults: returnedTypes,
                    totalFound: returnedTypes.length
                };

                propPolicySvc.unregister( policyId );

                deferred.resolve( returneddata );
            } );
        } );
    }

    return deferred.promise;
};

/**
 * Retrieves the list of Spec subtype names
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let initSpecSubtypeList = function( data ) {
    var subTypeNames = [];
    var index = 0;
    for(var i = 0 ; i < data.getReqSpecSubtypesResponse.length ; i++){
        subTypeNames.push(data.getReqSpecSubtypesResponse[i].realTypeName);
    }
    //Show preference value as default specification type on panel
    var defaultSpecType;
    if(data.preferences && data.preferences.REQ_DefaultReqSpecType){
        data.selectedType.dbValue = data.preferences.REQ_DefaultReqSpecType[0];
        for ( var i in subTypeNames ) {
            if ( subTypeNames[i] ===  data.preferences.REQ_DefaultReqSpecType[0] ) {
                defaultSpecType = subTypeNames[i];
                subTypeNames.splice(i,1);
                break ;
            }
        }
        if( defaultSpecType !== ''){
            subTypeNames.unshift( defaultSpecType );
        }
    }

    data.reqSpecSubtypeNames = subTypeNames;
    eventBus.publish( 'CreateReqSpec.receivedSubtypes2' );
};

/**
 * When user select type from type selection panel we need to navigate to create form. This method will set few
 * variable to hide type selector panel and to show create form.
 *
 * @param {Object} data - The panel's view model object
 */
export let handleTypeSelectionJs = function( data ) {
    var selectedType = data.dataProviders.getReqSpecTypes.selectedObjects;
    if( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[ 0 ].props.type_name.dbValue;
        data.displayedType.propertyDisplayName = selectedType[ 0 ].props.object_string.dbValue;
    } else {
        data.selectedType.dbValue = '';
        data.displayedType.propertyDisplayName = '';
    }
};
/**
 * Get domain list
 *
 * @param {data} response domain response
 *
 * @returns {array} htmlSpecTemplateList
 */
export let getHTMLSpecTemplateList = function( response ) {
    var htmlSpecTemplateList = [ '' ];
    for( var lovValRow in response.lovValues ) {
        if( response.lovValues.hasOwnProperty( lovValRow ) ) {
            htmlSpecTemplateList.push( response.lovValues[ lovValRow ].propDisplayValues.object_name[ 0 ] );
            domainInternalNames.set( response.lovValues[ lovValRow ].propDisplayValues.object_name[ 0 ], response.lovValues[ lovValRow ].uid );
        }
    }
    var cellProp = [ 'revision_list' ];
    reqUtils.loadModelObjects( response.lovValues, cellProp );
    return htmlSpecTemplateList;
};

export default exports = {
    getCreateReqSpecInput,
    selectHtmlSpecTemplate,
    clearSelectedTypeJs,
    ensureReqSpecTypesLoadedJs,
    initSpecSubtypeList,
    handleTypeSelectionJs,
    getHTMLSpecTemplateList
};
app.factory( 'globalCreateReqSpecification', () => exports );
