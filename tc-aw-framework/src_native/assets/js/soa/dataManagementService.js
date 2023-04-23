// Copyright (c) 2022 Siemens

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/dataManagementService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import soaSvc from 'soa/kernel/soaService';
import prefSvc from 'soa/preferenceService';
import dateTimeSvc from 'js/dateTimeService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import assert from 'assert';
import eventBus from 'js/eventBus';

// Object to track which uids are currently being loaded such that loadObjects is not duplicated for the same uid
let _uidLoadInProgress = {};

var exports = {};

/**
 * Create objects
 *
 * @param {ObjectArray} input - array of 'createObjects' input
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let createObjects = function( input ) {
    return soaSvc.post( 'Core-2008-06-DataManagement', 'createObjects', {
        input: input
    } );
};

/**
 * Create Relation and Submit objects.
 *
 * @param {ObjectArray} inputs - array of create & submit object input
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let createRelateAndSubmitObjects = function( inputs ) {
    return soaSvc.post( 'Internal-Core-2012-10-DataManagement', 'createRelateAndSubmitObjects', {
        inputs: inputs
    } );
};

/**
 * Create relations.
 *
 * @param {ObjectArray} inputs - array of create relation input
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let createRelations = function( inputs ) {
    return soaSvc.post( 'Core-2006-03-DataManagement', 'createRelations', {
        input: inputs
    } );
};

/**
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getCurrentUserGateway = function() {
    return soaSvc.post( 'Internal-AWS2-2012-10-DataManagement', 'getCurrentUserGateway', {} );
};

/**
 * @param {String} typeName - type name
 * @param {String} propName - property name
 * @param {String} pattern - pattern
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getNextId = function( typeName, propName, pattern ) {
    return exports.getNextIds( [ {
        typeName: typeName,
        propName: propName,
        pattern: pattern ? pattern : ''
    } ] );
};

/**
 * @param {Array} vInfoForNextId - array of type name, property name & pattern objects
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getNextIds = function( vInfoForNextId ) {
    return soaSvc.post( 'Core-2008-06-DataManagement', 'getNextIds', {
        vInfoForNextId: vInfoForNextId
    } );
};

/**
 * @param {Boolean} ignoreHost - ignore SOA tunnel by host?
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getTCSessionInfo = function( ignoreHost ) {
    return soaSvc.getTCSessionInfo( ignoreHost ).then( function( response ) {
        if( response && response.extraInfoOut ) {
            // Capture the data time format from the server
            var userSession = cdm.getUserSession();
            var locale = _.get( userSession, 'props.fnd0locale.dbValues.0' );
            if( locale ) {
                locale = localeSvc.setLocale( locale );
            }

            if( response.extraInfoOut.DefaultDateFormat ) {
                dateTimeSvc.setSessionDateTimeFormat( response.extraInfoOut.DefaultDateFormat );
            }

            if( eventBus ) {
                eventBus.publish( 'sessionInfo.updated', response.extraInfoOut );
            }

            // Preferences
            var prefNames = [];
            if( response.extraInfoOut.AWC_StartupPreferences ) {
                // The server should tell us what preferences we need to bulk cache upon login. This avoids unnecessary
                // client-server chats.
                prefNames = prefNames.concat( response.extraInfoOut.AWC_StartupPreferences.split( ',' ) );
            }

            return prefSvc.getMultiStringValues( prefNames, true ).then( function() {
                return response;
            } );
        }
        // This should happen but should do it anyway to ensure serial processing.
        return response;
    } );
};

/**
 * @param {Array} uids - Array of {ModelObject} UIDs to load {PropertyObject}s for.
 * @param {Array} propNames - Array of {PropertyObject} names to load.
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
 export let loadDataForEditing = function( uids, propNames ) {
    var inputs = [];

    _.forEach( uids, function( uid ) {
        var currModelObj = cdm.getObject( uid );
        if( currModelObj ) {
            var mt = currModelObj.modelType;
            var myPropNames = [];
            _.forEach( propNames, function( currPropName ) {
                if( mt.propertyDescriptorsMap[ currPropName ] ) {
                    myPropNames.push( currPropName );
                }
            } );

            if( myPropNames.length > 0 ) {
                inputs.push( {
                    obj: currModelObj,
                    propertyNames: myPropNames
                } );
            }
        }
    } );

    if( inputs.length === 0 ) {
        return AwPromiseService.instance.resolve();
    }

    return soaSvc.postUnchecked( 'Internal-AWS2-2012-10-DataManagement', 'loadDataForEditing', {
        inputs: inputs
    } ).then( function( response ) {
        if( response.outputs ) {
            _.forEach( uids, function( uid ) {
                _.forEach( response.outputs, function( output ) {
                    if( uid === output.obj.uid ) {
                        var modelObj = cdm.getObject( uid );
                        modelObj.objLsds = output.objLsds;
                    }
                } );
            } );
        }
        return response;
    } );
};

/**
 * @param {Object} input - Array e.g. { inputData: [ { clientId: '', parentObj: { uid: 'QteVoUbsqd$DyB', type:
 *            'Awp0TileCollection' }, childrenObj: [ { uid: 'QzaVoUbsqd$DyB', type: 'Awp0Tile' } ], propertyName:
 *            'Awp0GatewayTileRel' } ]}
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let removeChildren = function( input ) {
    return soaSvc.post( 'Core-2014-10-DataManagement', 'removeChildren', {
        inputData: input
    } );
};

/**
 * @param {Object} inputs -
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let saveEdit = function( inputs ) {
    return soaSvc.post( 'Internal-AWS2-2012-10-DataManagement', 'saveEdit', {
        inputs: inputs
    } );
};

/**
 * @param {Array} info - array of set property info objects
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let setProperties = function( info ) {
    return soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', {
        info: info,
        options: []
    } );
};

/**
 * @param {StringArray} uids - array of model object UIDs to load
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let loadObjects = async function( uids ) {
    var missingUids = [];
    _.forEach( uids, function( uid ) {
        var modelObject = cdm.getObject( uid );
        if( !modelObject || _.isEmpty( modelObject.props ) ) {
            missingUids.push( uid );
        }
    } );

    if( missingUids.length > 0 ) {
        const uidsToLoad = missingUids.filter( uid => {
            if( !_uidLoadInProgress[ uid ] ) {
                return uid;
            }
        } );

        const currentUidsBeingLoadedPromises = missingUids.filter( uid => !uidsToLoad.includes( uid ) ).map( uid => {
            if( _uidLoadInProgress[ uid ] ) {
                return _uidLoadInProgress[ uid ];
            }
        } );

        const newLoadPromises = [];

        if( uidsToLoad.length > 0 ) {
            const loadObjectsPromise = soaSvc.post( 'Core-2007-09-DataManagement', 'loadObjects', {
                uids: uidsToLoad
            } );

            for( const uid of uidsToLoad ) {
                _uidLoadInProgress[ uid ] = loadObjectsPromise;
            }

            newLoadPromises.push( loadObjectsPromise );
        }

        await Promise.all( [ ...currentUidsBeingLoadedPromises, ...newLoadPromises ] );

        for( const uid of uidsToLoad ) {
            delete _uidLoadInProgress[ uid ];
        }
    }

    // no op
    return AwPromiseService.instance.resolve();
};

/**
 * @param {ModelObject} target -
 *
 * @param {String} pasteProp - Relation type
 *
 * @param {String} typeName -
 *
 * @param {String} itemName -
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let createItem = function( target, pasteProp, typeName, itemName ) {
    var propName = 'item_id';
    var revisionTypeName = typeName + 'Revision';
    var revisionPropName = 'item_revision_id';
    var itemRevision = {};

    return exports.getNextIds( [ {
        typeName: typeName,
        propName: propName
    }, {
        typeName: revisionTypeName,
        propName: revisionPropName
    } ] ).then( function( response ) {
        return exports.createRelateAndSubmitObjects( [ {
            createData: {
                boName: typeName,
                propertyNameValues: {
                    item_id: [ response.nextIds[ 0 ] ],
                    object_name: [ itemName ]
                },
                compoundCreateInput: {
                    revision: [ {
                        boName: revisionTypeName,
                        propertyNameValues: {
                            item_revision_id: [ response.nextIds[ 1 ] ]
                        },
                        compoundCreateInput: {}
                    } ]
                }
            }
        } ] );
    } ).then( function( response ) {
        itemRevision = cdm.getObject( response.output[ 0 ].objects[ 2 ].uid );
        return exports.createRelations( [ {
            relationType: pasteProp,
            primaryObject: target,
            secondaryObject: itemRevision
        } ] );
    } ).then( function() {
        return itemRevision;
    } );
};

/**
 * Cache of promises for getProperties to "reuse" if the same request comes in before the first response has
 * completed.
 *
 * @private
 */
var _getPropertiesPromises = [];

/**
 * Ensures that the specified properties are loaded into the cache. If they are not already loaded a server call is
 * made to load them.
 *
 * @param {StringArray} uids - array of model object UIDs
 * @param {StringArray} propNames - array of property names
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getProperties = function( uids, propNames ) {
    var objects = [];
    uids.sort();
    _.forEach( _.uniq( uids, true ), function( uid ) {
        var modelObject = cdm.getObject( uid );
        if( modelObject ) {
            var modelObjAdded = false;
            // Cached model object
            _.forEach( propNames, function( propName ) {
                if( modelObject.modelType.propertyDescriptorsMap.hasOwnProperty( propName ) &&
                    ( !modelObject.props || !modelObject.props.hasOwnProperty( propName ) ) ) {
                    if( !modelObjAdded ) {
                        // Valid property for this model type AND property not cached
                        objects.push( modelObject );
                        modelObjAdded = true;
                    }
                }
            } );
        }
    } );

    if( objects.length > 0 ) {
        propPolicySvc.validatePropertyRegistration( objects, propNames );
        return exports.getPropertiesUnchecked( objects, propNames );
    }

    return AwPromiseService.instance.resolve();
};

/**
 * Ensures that the specified properties are loaded into the cache. If they are not already loaded a server call is
 * made to load them.
 *
 * @param {ObjectArray} objects - array of model objects
 * @param {StringArray} propNames - array of property names
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getPropertiesUnchecked = function( objects, propNames ) {
    var input = {
        objects: objects,
        attributes: propNames
    };

    var promise = null;
    _.forEach( _getPropertiesPromises, function( promiseLp ) {
        if( !promise && _.isEqual( input.attributes, promiseLp.input.attributes ) ) {
            if( objects.length === promiseLp.input.objects.length ) {
                promise = promiseLp; // assume a match
                for( var ii = 0; ii < objects.length; ii++ ) {
                    if( objects[ ii ].uid !== promiseLp.input.objects[ ii ].uid ) {
                        promise = null; // invalid assumption
                        break;
                    }
                }
            }
        }
    } );

    if( !promise ) {
        promise = soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', input ).then( function( response ) {
            _getPropertiesPromises.splice( _getPropertiesPromises.indexOf( promise ), 1 );
            return response;
        } );
        _getPropertiesPromises.push( promise );
        promise.input = input;
    }
    return promise;
};

/**
 * Convenience method for 'core' {@linkcode module:soa/dataManagementService.getStyleSheet|getStyleSheet} to handle
 * default values used in that service's request.
 *
 * @param {ModelObject} modelObject - The soa object to get the stylesheet for.
 * @param {String} styleSheetType - (Optional) The type of style sheet to return (Default: 'SUMMARY').
 * @param {Object} clientContext - (Optional) (Default: {'ActiveWorkspace:Location':
 *            'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation'})
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getStyleSheet = function( modelObject, styleSheetType, clientContext ) {
    assert( modelObject, 'getStyleSheet: No ModelObject specified' );

    var styleSheetTypeFinal = styleSheetType;
    var clientContextFinal = clientContext;

    if( !styleSheetTypeFinal ) {
        styleSheetTypeFinal = 'SUMMARY';
    }

    if( !clientContextFinal ) {
        clientContextFinal = {
            'ActiveWorkspace:Location': 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation'
        };
    }
    return soaSvc.post( 'Internal-AWS2-2016-04-DataManagement', 'getStyleSheet', {
        processEntireXRT: false,
        input: [ {
            businessObject: modelObject,
            styleSheetType: styleSheetTypeFinal,
            clientContext: clientContextFinal
        } ]
    } );
};

/**
 * Post the input directly to getStyleSheet
 *
 * @param {Integer} input - The json request object. All necessary fields should already be filled
 *
 * @returns {Promise} Resolved when the style sheet information is returned from the SOA service.
 */
export let getStyleSheetPure = function( input ) {
    return soaSvc.post( 'Internal-AWS2-2016-04-DataManagement', 'getStyleSheet', input );
};

/**
 * This function is used to create input structure for the loadViewModelForEditing SOA call. Consumer need to call
 * this function in loop for each ViewModelObject keeping the same input object.
 *
 * @param {Object} input - Structure containing the viewModelObj and its property names
 * @param {String} uid - ID of the model object that owns the properties
 * @param {StringArray} propertyNames - Props which we need to check the modifiable status
 *
 * @returns {Object} Input structure details.
 */
export let getLoadViewModelForEditingInput = function( input, uid, propertyNames ) {
    var modelObj = cdm.getObject( uid );
    if( !input ) {
        input = {
            inputs: []
        };
    }
    var objs = [];
    objs.push( modelObj );
    input.inputs.push( {
        objs: objs,
        propertyNames: propertyNames,
        isPessimisticLock: false
    } );
    return input;
};

/**
 * @param {Object} inputs - payload to the soa call.
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let loadViewModelForEditing2 = function( inputs ) {
    var selectedPropertyPolicy = propPolicySvc.getEffectivePolicy( null, true );
    return soaSvc.postUnchecked( 'Internal-AWS2-2017-12-DataManagement', 'loadViewModelForEditing2', {
        inputs: inputs
    }, selectedPropertyPolicy );
};

/**
 * @param {Object} inputs -
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let saveViewModelEditAndSubmitWorkflow = function( inputs ) {
    var selectedPropertyPolicy = propPolicySvc.getEffectivePolicy( null, true );
    return soaSvc.postUnchecked( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', {
        inputs: inputs
    }, selectedPropertyPolicy );
};

/**
 * This function is used to create the input data for saveViewModelEditAndSubmitWorkflow SOA. This SOA requires the
 * view Model properties which are modified and need to update in DB
 *
 * @param {Object} input - Structure containing the viewModelObj
 * @param {Object} viewModelProperty - viewModel prop object whose value has changed and need to commit.
 *
 */

export let pushViewModelProperty = function( input, viewModelProperty ) {
    if( !input.viewModelProperties ) {
        input.viewModelProperties = [];
    }

    var dbValues = [];
    var uiValues = [];
    if( viewModelProperty.isArray ) {
        dbValues = viewModelProperty.dbValue;
        uiValues = viewModelProperty.newValue;
    } else {
        dbValues.push( viewModelProperty.dbValue );
        uiValues.push( viewModelProperty.newValue );
    }

    // Replace all the null values with empty string
    for( var i = 0; i < dbValues.length; i++ ) {
        if( viewModelProperty.type === 'DATE' || viewModelProperty.type === 'DATEARRAY' ) {
            dbValues[ i ] = dateTimeSvc.formatUTC( dbValues[ i ] );
        } else {
            dbValues[ i ] = dbValues[ i ] === null ? '' : String( dbValues[ i ] );
        }
    }

    // Replace all the null values with empty string
    for( i = 0; i < uiValues.length; i++ ) {
        if( viewModelProperty.type === 'DATE' || viewModelProperty.type === 'DATEARRAY' ) {
            uiValues[ i ] = dateTimeSvc.formatUTC( uiValues[ i ] );
        } else {
            uiValues[ i ] = uiValues[ i ] === null ? '' : String( uiValues[ i ] );
        }
    }

    var vmProp = {
        propertyName: viewModelProperty.propertyName,
        dbValues: dbValues,
        uiValues: uiValues,
        intermediateObjectUids: viewModelProperty.intermediateObjectUids,
        srcObjLsd: viewModelProperty.sourceObjectLastSavedDate,
        isModifiable: viewModelProperty.isPropertyModifiable
    };

    input.viewModelProperties.push( vmProp );
};

/**
 * This utility function is used create the input pay load for SaveViewModelEditAndSubmitToWorkflowInput SAO.
 *
 * @param {Object} viewModelObject - viewModelObj whose properties has been modified.
 * @returns {Object} structure containing the modified viewModelobject.
 */

export let getSaveViewModelEditAndSubmitToWorkflowInput = function( viewModelObject ) {
    return {
        obj: viewModelObject
    };
};

exports = {
    createObjects,
    createRelateAndSubmitObjects,
    createRelations,
    getCurrentUserGateway,
    getNextId,
    getNextIds,
    getTCSessionInfo,
    loadDataForEditing,
    removeChildren,
    saveEdit,
    setProperties,
    loadObjects,
    createItem,
    getProperties,
    getPropertiesUnchecked,
    getStyleSheet,
    getStyleSheetPure,
    getLoadViewModelForEditingInput,
    loadViewModelForEditing2,
    saveViewModelEditAndSubmitWorkflow,
    pushViewModelProperty,
    getSaveViewModelEditAndSubmitToWorkflowInput
};
export default exports;
/**
 * @memberof NgServices
 * @member soa_dataManagementService
 *
 * @param {$q} $q - Service to use.
 * @param {soa_kernel_clientDataModel} cdm - Service to use.
 * @param {soa_kernel_propertyPolicyService} propPolicySvc - Service to use.
 * @param {soa_kernel_soaService} soaSvc - Service to use.
 * @param {soa_preferenceService} prefSvc - Service to use.
 * @param {dateTimeService} dateTimeSvc - Service to use.
 * @param {localeService} localeSvc - Service to use.
 *
 * @returns {soa_dataManagementService} Instance of this service API object.
 */
app.factory( 'soa_dataManagementService', () => exports );
