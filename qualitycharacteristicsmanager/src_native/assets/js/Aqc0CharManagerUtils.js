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
 * This file is used as utility file for characteristics manager from quality center foundation module
 *
 * @module js/Aqc0CharManagerUtils
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import messagingSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';
import AwStateService from 'js/awStateService';
import viewModelObjectService from 'js/viewModelObjectService';
import commandService from 'js/command.service';
import localeService from 'js/localeService';
import editHandlerSvc from 'js/editHandlerService';
import tcVmoService from 'js/tcViewModelObjectService';
import xrtParserService from 'js/xrtParser.service';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import uwPropertySvc from 'js/uwPropertyService';
import tcSessionData from 'js/TcSessionData';
import aqc0CharLibTree from 'js/Aqc0CharLibraryTreeTableService';
import aqc0CharSpecOPSvc from 'js/Aqc0CharSpecOperationsService';
import aqc0UtilService from 'js/Aqc0UtilService';
import Aqc0CharManagerUtils2 from 'js/Aqc0CharManagerUtils2';
var exports = {};

var saveEditHandler = {};

//character manager context key, Currently used to track the created objects
var _charManagerContext = 'charManagerContext';

// Define the tc 13.2 onwards supported flag
appCtxService.registerCtx( 'isTC13_2OnwardsSupported', false );
appCtxService.registerCtx( 'pinnedToForm', false );
appCtxService.registerCtx( 'unpinnedToForm', true );

var VAR_CHAR_TYPE = 'Qc0VariableCharSpec';
var VIS_CHAR_TYPE = 'Qc0VisualCharSpec';
var ATT_CHAR_TYPE = 'Qc0AttributiveCharSpec';
var CHAR_GROUP_TYPE = 'Qc0CharacteristicsGroup';
var ACTION_TYPE = 'Qam0QualityAction';
var FAILURE_TYPE = 'Qc0Failure';
var _data = null;
/**
 * Static XRT commands that should be active when the view model is visible.
 *
 */
var _staticXrtCommandIds = [ 'Awp0StartEdit', 'Awp0StartEditGroup', 'Awp0SaveEdits',
    'Awp0CancelEdits'
];

/**
 *This method ensures that the characteristic specification objects types are loaded before
 * the create panel is revealed.
 *
 * @param {String} commandId - Command Id for the Add Specification command
 * @param {String} location - Location of the Add Specification command
 */
export let getAddCharSpecificationPanel = function( commandId, location ) {
    var typeNamesToLoad = [ VAR_CHAR_TYPE, VIS_CHAR_TYPE, ATT_CHAR_TYPE ];
    soaSvc.ensureModelTypesLoaded( typeNamesToLoad ).then( function() {
        commandPanelService.activateCommandPanel( commandId, location );
    } );
};

/**
 * This Method does the following:
 * 1) Gets the list of newly created specification objects by reading the 'charManagerContext.createdSpecifications' from ctx
 * 2) Prepares a list with the newly created objects at the top ( in case of multiple creation , the order is preserved )
 *
 * @param {ArrayList} loadedSpecifications list of specification objects as returned by server
 * @returns {ArrayList} list of specification objects with created objects at the top
 */
export let sortResults = function( loadedSpecifications ) {
    var charManagerCreateContext = appCtxService.getCtx( _charManagerContext + '.createdSpecifications' );
    if ( charManagerCreateContext ) {
        var createOrderedObjects = loadedSpecifications.filter( function( mo ) {
            return charManagerCreateContext.indexOf( mo.uid ) !== -1;
        } ).sort( function( a, b ) {
            //context has oldest objects first
            return charManagerCreateContext.indexOf( b.uid ) - charManagerCreateContext.indexOf( a.uid );
        } );
        //Remove any created objects from the loaded specification objects and
        //keep the original ordering for anything that was not created
        var originalOrderingResults = loadedSpecifications.filter( function( mo ) {
            return charManagerCreateContext.indexOf( mo.uid ) === -1;
        } );
        // Create a Map with the model object uid as key and model object as value.
        var serverUidsMap = loadedSpecifications.reduce( function( acc, nxt ) {
            //filter duplicate objects if present
            if ( !acc[nxt.uid] ) {
                acc[nxt.uid] = [];
            }
            acc[nxt.uid].push( nxt );
            return acc;
        }, {} );
        createOrderedObjects.forEach( function( mo, idx ) {
            //If the server response also contains this object
            if ( serverUidsMap[mo.uid] ) {
                createOrderedObjects[idx] = serverUidsMap[mo.uid];
            }
        } );
        //Flatten - can't do within forEach as it messes up indices
        createOrderedObjects = createOrderedObjects.reduce( function( acc, nxt ) {
            if ( Array.isArray( nxt ) ) {
                return acc.concat( nxt );
            }
            acc.push( nxt );
            return acc;
        }, [] );
        return createOrderedObjects.concat( originalOrderingResults );
    }
    return loadedSpecifications;
};

/**
 * This method first gets the qc0SpecificationList for characteristics group and loads the object
 *@returns {Object} promise
 */
export let loadObjects = function() {
    getSupportedTCVersion();
    var deferred = AwPromiseService.instance.defer();
    var loadChxObjectInput = {
        objects: [ appCtxService.ctx.locationContext.modelObject ],
        attributes: [ 'qc0SpecificationList' ]
    };
    soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', loadChxObjectInput ).then( function( getPropertiesResponse ) {
        var specificationObjects = {
            uids: appCtxService.ctx.locationContext.modelObject.props.qc0SpecificationList.dbValues
        };
        if ( specificationObjects.uids.length > 0 ) {
            soaSvc.post( 'Core-2007-09-DataManagement', 'loadObjects', specificationObjects ).then( function( response ) {
                var values = response.plain.map( function( Objuid ) {
                    return response.modelObjects[Objuid];
                } );
                // Convert the loaded model objects into viewmodel objects
                var viewModelObjects = [];
                for ( var i = 0; i < values.length; i++ ) {
                    viewModelObjects[i] = viewModelObjectService.constructViewModelObjectFromModelObject( values[i] );
                }
                values = viewModelObjects;

                var responseData = {
                    totalLoaded: exports.sortResults( values )
                };
                deferred.resolve( responseData );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        } else {
            //If the group doesn't have any specifications then return an empty list
            var responseData = {
                totalLoaded: []
            };
            deferred.resolve( responseData );
        }
    }, function( reason ) {
        deferred.reject( reason );
    } );
    return deferred.promise;
};

/**
 * This method ensures that the s_uid in url is selected in the primary workarea.
 * This is required for selection sync of url and primary workarea
 * @param {ArrayList} results list of specification objects
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let processPWASelection = function( results, selectionModel ) {
    var pwaSelectionUid = [];

    //For characteristic specification inside list with summary
    _.forEach( results, function( result ) {
        if ( AwStateService.instance.params.hasOwnProperty( 's_uid' ) && result.uid === AwStateService.instance.params.s_uid ) {
            pwaSelectionUid.push( result.uid );
        }
    } );
    if ( pwaSelectionUid.length > 0 ) {
        selectionModel.setSelection( pwaSelectionUid );
    }

    //get s_uid from browser url to set/maintain the selection ,only when object is not newly created, used specially at browser refresh
    if ( !pwaSelectionUid.length ) {
        if ( !appCtxService.ctx.createdObjUid ) {
            Aqc0CharManagerUtils2.setQueryParams( selectionModel );
        }
    }
};
/**
 * This method is used to get the LOV values for the versioning panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response ) {
    return response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[0],
            propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[0] : obj.propDisplayValues.lov_values[0],
            propInternalValue: obj.propInternalValues.lov_values[0]
        };
    } );
};
/**
 * This method is used to get the input for the versioning soa
 * @param {Object} data the data object from the view model
 * @param {Object} xrtContext for the current selected object
 * @returns {ArrayList} the arrayList of the object with input for versioning soa
 */
export let getVersionInputFEdit = function( data, dataFromEditHandler, selectedObject ) {
    //var ctxObj = appCtxService.ctx.selected;
    var modifiedViewModelProperties = dataFromEditHandler.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataFromEditHandler.getModifiedPropertiesMap( modifiedViewModelProperties );
    var modifiedProperties = [];
    // Prepare versionInput
    var versionInput = {
        clientId: 'AWClient',
        sourceSpecification: {
            type: selectedObject.type,
            uid: selectedObject.uid
        },
        data: {
            stringProps: {},
            intProps: {},
            doubleProps: {},
            tagArrayProps: {},
            tagProps: {
                qc0GroupReference: {
                    type: CHAR_GROUP_TYPE,
                    uid: selectedObject.props.qc0GroupReference.dbValues[0]
                }
            }
        }
    };

    //Below code is added because when panel opens, saveAs xrt changes the object name to the next id.This creates problem in messages after versioning.
    //To fix this object name is again assigned as selected object's object_name.
    if ( !data.object_name ) {
        data.object_name = {};
        data.object_name.dbValues = [];
    }
    data.object_name.dbValue = selectedObject.props.object_name.dbValues[0];
    data.object_name.dbValues[0] = data.object_name.dbValue;

    versionInput.data.stringProps.object_name = selectedObject.props.object_name.dbValues[0];
    versionInput.data.intProps.qc0BasedOnId = Number( selectedObject.props.qc0BasedOnId.dbValues[0] ) + 1;
    versionInput.data.tagProps.qc0GroupReference = {
        type: CHAR_GROUP_TYPE,
        uid: selectedObject.props.qc0GroupReference.dbValues[0]
    };
    //For Common properties
    for ( var i in modifiedPropsWithoutSubProp ) {
        modifiedPropsWithoutSubProp[i].viewModelProps.forEach( function( modifiedVMProperty ) {
            modifiedProperties.push( modifiedVMProperty.propertyName );
            if ( modifiedVMProperty.propertyName === 'qc0Context' ) {
                versionInput.data.stringProps.qc0Context = modifiedVMProperty.dbValue;
            }

            if ( modifiedVMProperty.propertyName === 'qc0Criticality' ) {
                versionInput.data.stringProps.qc0Criticality = modifiedVMProperty.dbValue;
            }

            if ( modifiedVMProperty.propertyName === 'object_desc' ) {
                versionInput.data.stringProps.object_desc = modifiedVMProperty.dbValue;
            }

            //For Variable Type
            if ( selectedObject.type === 'Qc0VariableCharSpec' ) {
                if ( modifiedVMProperty.propertyName === 'qc0NominalValue' ) {
                    versionInput.data.doubleProps.qc0NominalValue = Number( modifiedVMProperty.dbValue );
                }
                if ( modifiedVMProperty.propertyName === 'qc0LowerTolerance' ) {
                    versionInput.data.doubleProps.qc0LowerTolerance = Number( modifiedVMProperty.dbValue );
                }
                if ( modifiedVMProperty.propertyName === 'qc0UpperTolerance' ) {
                    versionInput.data.doubleProps.qc0UpperTolerance = Number( modifiedVMProperty.dbValue );
                }
                if ( modifiedVMProperty.propertyName === 'qc0UnitOfMeasure' ) {
                    versionInput.data.tagProps.qc0UnitOfMeasure = {
                        type: 'qc0UnitOfMeasure',
                        uid: modifiedVMProperty.dbValue
                    };
                }
            }
            //For Attributive Type
            if ( selectedObject.type === 'Qc0AttributiveCharSpec' ) {
                if ( modifiedVMProperty.propertyName === 'qc0NokDescription' ) {
                    versionInput.data.stringProps.qc0NokDescription = modifiedVMProperty.dbValue;
                }
                if ( modifiedVMProperty.propertyName === 'qc0OkDescription' ) {
                    versionInput.data.stringProps.qc0OkDescription = modifiedVMProperty.dbValue;
                }
            }
            //For Visual Type
            if ( selectedObject.type === 'Qc0VisualCharSpec' ) {
                var imageDataset = [];
                if ( modifiedVMProperty.propertyName === 'qc0GridRows' ) {
                    versionInput.data.intProps.qc0GridRows = Number( modifiedVMProperty.dbValue );
                }
                if ( modifiedVMProperty.propertyName === 'qc0GridColumns' ) {
                    versionInput.data.intProps.qc0GridColumns = Number( modifiedVMProperty.dbValue );
                }
                if ( selectedObject.props.IMAN_specification ) {
                    for ( var id = 0; id < selectedObject.props.IMAN_specification.dbValues.length; id++ ) {
                        var hasImageDataset = {};
                        hasImageDataset.type = 'Image';
                        hasImageDataset.uid = selectedObject.props.IMAN_specification.dbValues[id];
                        imageDataset.push( hasImageDataset );
                    }
                }
                versionInput.data.tagArrayProps.qc0IMAN_specification = imageDataset;
            }
        } );
    }
    //For Common properties which are not modified
    if ( modifiedProperties.indexOf( 'qc0Context' ) === -1 ) {
        versionInput.data.stringProps.qc0Context = selectedObject.props.qc0Context.dbValues[0];
    }
    if ( modifiedProperties.indexOf( 'qc0Criticality' ) === -1 ) {
        versionInput.data.stringProps.qc0Criticality = selectedObject.props.qc0Criticality.dbValues[0];
    }
    if ( modifiedProperties.indexOf( 'object_desc' ) === -1 ) {
        versionInput.data.stringProps.object_desc = selectedObject.props.object_desc.dbValues[0];
    }
    //For Variable Type props not modified
    if ( selectedObject.type === 'Qc0VariableCharSpec' && _data ) {
        var nominalValue = _data.qc0NominalValue.dbValue;
        var lowerToleranceValue;
        var upperToleranceValue;
        if ( appCtxService.ctx.isLimitationSupported ) {
            versionInput.data.stringProps.qc0limitation = _data.qc0limitation.dbValue;
            if ( versionInput.data.stringProps.qc0limitation === 'Both Sides' ) {
                lowerToleranceValue = _data.qc0LowerTolerance.dbValue;
                upperToleranceValue = _data.qc0UpperTolerance.dbValue;
            } else if ( versionInput.data.stringProps.qc0limitation === 'Zero' || versionInput.data.stringProps.qc0limitation === 'Down' ) {
                lowerToleranceValue = getToleranceValue( _data );
                upperToleranceValue = _data.qc0UpperTolerance.dbValue;
            } else if ( versionInput.data.stringProps.qc0limitation === 'Up' ) {
                lowerToleranceValue = _data.qc0LowerTolerance.dbValue;
                upperToleranceValue = getToleranceValue( _data );
            }
        } else {
            lowerToleranceValue = _data.qc0LowerTolerance.dbValue;
            upperToleranceValue = _data.qc0UpperTolerance.dbValue;
        }
        if ( appCtxService.ctx.isToleranceTypeSupported ) {
            versionInput.data.stringProps.qc0ToleranceType = _data.qc0ToleranceType.dbValue;
        }

        versionInput.data.doubleProps.qc0NominalValue = Number( nominalValue );
        versionInput.data.doubleProps.qc0LowerTolerance = Number( lowerToleranceValue );
        versionInput.data.doubleProps.qc0UpperTolerance = Number( upperToleranceValue );
        versionInput.data.tagProps.qc0UnitOfMeasure = {
            type: 'qc0UnitOfMeasure',
            uid: _data.qc0UnitOfMeasure.dbValue
        };
    }
    //For Attributive Type  props not modified
    if ( selectedObject.type === 'Qc0AttributiveCharSpec' ) {
        if ( modifiedProperties.indexOf( 'qc0NokDescription' ) === -1 ) {
            versionInput.data.stringProps.qc0NokDescription = selectedObject.props.qc0NokDescription.dbValues[0];
        }
        if ( modifiedProperties.indexOf( 'qc0OkDescription' ) === -1 ) {
            versionInput.data.stringProps.qc0OkDescription = selectedObject.props.qc0OkDescription.dbValues[0];
        }
    }
    //For Visual Type  props not modified
    if ( selectedObject.type === 'Qc0VisualCharSpec' ) {
        var imageDataset = [];
        if ( modifiedProperties.indexOf( 'qc0GridRows' ) === -1 ) {
            versionInput.data.intProps.qc0GridRows = Number( selectedObject.props.qc0GridRows.dbValues[0] );
        }
        if ( modifiedProperties.indexOf( 'qc0GridColumns' ) === -1 ) {
            versionInput.data.intProps.qc0GridColumns = Number( selectedObject.props.qc0GridColumns.dbValues[0] );
        }
        if ( selectedObject.props.IMAN_specification ) {
            for ( var id = 0; id < selectedObject.props.IMAN_specification.dbValues.length; id++ ) {
                var hasImageDataset = {};
                hasImageDataset.type = 'Image';
                hasImageDataset.uid = selectedObject.props.IMAN_specification.dbValues[id];
                imageDataset.push( hasImageDataset );
            }
        }
        versionInput.data.tagArrayProps.qc0IMAN_specification = imageDataset;
    }
    //For carry forward the existing Actions on new Version
    var actions = [];
    if ( selectedObject.props.Qc0HasActions ) {
        for ( var qa = 0; qa < selectedObject.props.Qc0HasActions.dbValues.length; qa++ ) {
            var hasAction = {};
            hasAction.type = ACTION_TYPE;
            hasAction.uid = selectedObject.props.Qc0HasActions.dbValues[qa];

            actions.push( hasAction );
        }
    }
    versionInput.data.tagArrayProps.qc0Qc0HasActions = actions;
    var failures = [];
    if ( selectedObject.props.Qc0HasFailures ) {
        for ( var qf = 0; qf < selectedObject.props.Qc0HasFailures.dbValues.length; qf++ ) {
            var hasFailure = {};
            hasFailure.type = FAILURE_TYPE;
            hasFailure.uid = selectedObject.props.Qc0HasFailures.dbValues[qf];
            failures.push( hasFailure );
        }
    }
    versionInput.data.tagArrayProps.qc0Qc0HasFailures = failures;
    data.versionInputDataFVM = [ versionInput ];
    return [ versionInput ];
};
/**
 * This method is used to get the input for the versioning soa
 * @param {Object} data the data object from the view model
 * @param {Object} xrtContext for the current selected object
 * @returns {ArrayList} the arrayList of the object with input for versioning soa
 */
export let getVersionInput = function( data ) {
    var ctxObj = appCtxService.ctx.selected;
    // Prepare versionInput
    var versionInput = {
        clientId: 'AWClient',
        sourceSpecification: {
            type: ctxObj.type,
            uid: ctxObj.uid
        },
        data: {
            stringProps: {},
            intProps: {},
            doubleProps: {},
            tagArrayProps: {},
            tagProps: {
                qc0GroupReference: {
                    type: CHAR_GROUP_TYPE,
                    uid: ctxObj.props.qc0GroupReference.dbValues[0]
                }
            }
        }
    };
    //Below code is added because when panel opens, saveAs xrt changes the object name to the next id.This creates problem in messages after versioning.
    //To fix this object name is again assigned as selected object's object_name.
    if ( !data.object_name ) {
        data.object_name = {};
        data.object_name.dbValues = [];
    }
    data.object_name.dbValue = appCtxService.ctx.selected.props.object_name.dbValues[0];
    data.object_name.dbValues[0] = data.object_name.dbValue;
    versionInput.data.stringProps.object_name = appCtxService.ctx.selected.props.object_name.dbValues[0];
    versionInput.data.stringProps.qc0Context = data.qc0Context.dbValue;
    versionInput.data.stringProps.qc0Criticality = data.qc0Criticality.dbValue;
    versionInput.data.intProps.qc0BasedOnId = Number( appCtxService.ctx.selected.props.qc0BasedOnId.dbValues[0] ) + 1;
    versionInput.data.tagProps.qc0GroupReference = {
        type: CHAR_GROUP_TYPE,
        uid: ctxObj.props.qc0GroupReference.dbValues[0]
    };
    //previous check of locationContext has been removed from condition as it would not work in Favorites
    if ( appCtxService.ctx.selected.type === 'Qc0VariableCharSpec' ) {
        versionInput.data.doubleProps = {};
        versionInput.data.doubleProps.qc0NominalValue = Number( data.qc0NominalValue.dbValue );
        versionInput.data.doubleProps.qc0LowerTolerance = Number( data.qc0LowerTolerance.dbValue );
        versionInput.data.doubleProps.qc0UpperTolerance = Number( data.qc0UpperTolerance.dbValue );
        if ( appCtxService.ctx.isToleranceTypeSupported ) {
            versionInput.data.stringProps.qc0ToleranceType = data.qc0ToleranceType.dbValue;
        }
        versionInput.data.tagProps.qc0UnitOfMeasure = {
            type: 'qc0UnitOfMeasure',
            uid: data.qc0UnitOfMeasure.dbValue
        };
    }
    //previous check of locationContext has been removed from condition as it would not work in Favorites
    if ( appCtxService.ctx.selected.type === 'Qc0AttributiveCharSpec' ) {
        versionInput.data.stringProps.qc0NokDescription = data.qc0NokDescription.dbValue;
        versionInput.data.stringProps.qc0OkDescription = data.qc0OkDescription.dbValue;
    }
    //For carry forward the existing Actions on new Version
    var actions = [];
    if ( appCtxService.ctx.selected.props.Qc0HasActions ) {
        for ( var qa = 0; qa < appCtxService.ctx.selected.props.Qc0HasActions.dbValues.length; qa++ ) {
            var hasAction = {};
            hasAction.type = ACTION_TYPE;
            hasAction.uid = appCtxService.ctx.selected.props.Qc0HasActions.dbValues[qa];

            actions.push( hasAction );
        }
    }
    versionInput.data.tagArrayProps.qc0Qc0HasActions = actions;

    var failures = [];
    if ( appCtxService.ctx.selected.props.Qc0HasFailures ) {
        for ( var qf = 0; qf < appCtxService.ctx.selected.props.Qc0HasFailures.dbValues.length; qf++ ) {
            var hasFailure = {};
            hasFailure.type = FAILURE_TYPE;
            hasFailure.uid = appCtxService.ctx.selected.props.Qc0HasFailures.dbValues[qf];
            failures.push( hasFailure );
        }
    }
    versionInput.data.tagArrayProps.qc0Qc0HasFailures = failures;

    if ( appCtxService.ctx.selected.type === 'Qc0VisualCharSpec' ) {
        var imageDataset = [];
        versionInput.data.intProps.qc0GridRows = Number( data.qc0GridRows.dbValue );
        versionInput.data.intProps.qc0GridColumns = Number( data.qc0GridColumns.dbValue );
        if ( appCtxService.ctx.selected.props.IMAN_specification ) {
            for ( var id = 0; id < appCtxService.ctx.selected.props.IMAN_specification.dbValues.length; id++ ) {
                var hasImageDataset = {};
                hasImageDataset.type = 'Image';
                hasImageDataset.uid = appCtxService.ctx.selected.props.IMAN_specification.dbValues[id];
                imageDataset.push( hasImageDataset );
            }
        }
        versionInput.data.tagArrayProps.qc0IMAN_specification = imageDataset;
    }
    return [ versionInput ];
};

/**
 * Execute a command with the given arguments
 *
 * @param {String} commandId - Command id
 * @param {String|String[]} commandArgs
 */
export let openNewObject = function( commandId, commandArgs, commandContext ) {
    commandService.executeCommand( commandId, commandArgs, null, commandContext );
};

/**
 *This method ensures that the characteristic specification properties are loaded before
 * the create panel is revealed.
 *
 * @param {String} commandId - Command Id for the Add Specification command
 * @param {String} location - Location of the Add Specification command
 */
export let getSaveAsCharSpecificationPanel = function( commandId, location ) {
    getSupportedTCVersion();
    var isVariableChar = appCtxService.ctx.selected.type === 'Qc0VariableCharSpec';
    var isAttributiveChar = appCtxService.ctx.selected.type === 'Qc0AttributiveCharSpec';
    var isVisualChar = appCtxService.ctx.selected.type === 'Qc0VisualCharSpec';
    var props = [ 'qc0GroupReference', 'qc0Criticality', 'qc0Context', 'qc0BasedOnId', 'object_name' ];
    if ( isVariableChar ) {
        props.push( 'qc0NominalValue' );
        if ( appCtxService.ctx.isToleranceTypeSupported ) {
            props.push( 'qc0ToleranceType' );
        }
        props.push( 'qc0UpperTolerance' );
        props.push( 'qc0LowerTolerance' );
        props.push( 'qc0UnitOfMeasure' );
    } else if ( isAttributiveChar ) {
        props.push( 'qc0NokDescription' );
        props.push( 'qc0OkDescription' );
    } else if ( isVisualChar ) {
        props.push( 'qc0GridRows' );
        props.push( 'qc0GridColumns' );
    }
    tcVmoService.getViewModelProperties( [ appCtxService.ctx.selected ], props ).then( function() {
        var typeNamesToLoad = [ CHAR_GROUP_TYPE ];
        soaSvc.ensureModelTypesLoaded( typeNamesToLoad ).then( function() {
            commandPanelService.activateCommandPanel( commandId, location );
        } );
    } );
};

/**
 *This method ensures that the LOV value entered for the property Unit of Measure is valid
 *
 * @param {Object} data - data for the panel
 * @returns {Object} objectToReturn - whether the LOV is valid or not
 */
export let validateUnitofMeasure = function( data ) {
    var existingUom = [];
    appCtxService.ctx.unitOfMeasure = null;
    var objectToReturn = {};
    _.forEach( data.unitOfMeasureList, function( uom ) {
        existingUom.push( uom.propDisplayValue );
    } );
    objectToReturn.isValid = _.indexOf( existingUom, data.qc0UnitOfMeasure.uiValue ) !== -1;
    if ( objectToReturn.isValid ) {
        appCtxService.ctx.unitOfMeasure = {
            uid: data.qc0UnitOfMeasure.dbValue,
            type: 'qc0UnitOfMeasure'
        };
    }
    return objectToReturn;
};

/**
 * For calling specific function
 * @param {data} data - For retrive the required data
 * @param {object} selectedObjFProp - selected Object
 */
export let performSaveEdit = function( data, deferred, selectedObjFProp, saveEditflag ) {
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataFromEditHandler = activeEditHandler.getDataSource();
    var modifiedViewModelPropertiesFC = dataFromEditHandler.getAllModifiedProperties();
    if ( modifiedViewModelPropertiesFC.length > 0 || selectedObjFProp.modelType.typeHierarchyArray.indexOf( 'Qc0MasterCharSpec' ) > -1 ) {
        if ( appCtxService.ctx.isTC13_2OnwardsSupported ) {
            var input = {};
            input.inputs = aqc0CharSpecOPSvc.createSaveEditSoaInput( dataFromEditHandler );
            aqc0CharSpecOPSvc.callSaveEditSoa( input ).then( function() {
                deferred.resolve();
                activeEditHandler.cancelEdits();
            }, function( error ) {
                deferred.reject();
                activeEditHandler.cancelEdits();
                throw error;
            } );
        }
        if ( appCtxService.ctx.isTC13_2OnwardsSupported === false ) {
            exports.getVersionInputFEdit( data, dataFromEditHandler, selectedObjFProp );
            exports.createVersionSOACall( data, activeEditHandler, selectedObjFProp, saveEditflag, deferred );
        }
    } else {
        activeEditHandler.cancelEdits();
    }
    return deferred.promise;
};

/**
 * This method is used to get the input for the versioning soa
 * @param {data} data  The view model data
 * @param activeEditHandler Active Edit Handler
 * @param selectedObject Selected Object
 * @param flagValue Save Edit Flag
 * @param deferred deferred
 */
export let createVersionSOACall = function( data, activeEditHandler, selectedObject, flagValue, deferred ) {
    var inputData = {
        specificationInputs: data.versionInputDataFVM
    };
    soaSvc.post( 'Internal-CharManagerAW-2018-12-QualityManagement', 'createSpecificationVersion', inputData ).then( function( response ) {
        data.createdObject = response.specificationsOutput[0].newSpecification;
        data.createdObjects = data.createdObject;
        deferred.resolve( data.createdObjects );
        //below line if block added for char library tree view selection of node.
        if ( appCtxService.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' ) {
            aqc0CharLibTree.clearMapOfCharGroupAndSpecification();
            eventBus.publish( 'primaryWorkarea.reset' );
        }
        if ( appCtxService.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' && flagValue === false ) {
            appCtxService.ctx.createdObjectForTreeFromAddAction = data.createdObject;
            appCtxService.ctx.versionCreatedFlag = true;
        }
        if ( appCtxService.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' && flagValue ) {
            appCtxService.ctx.createdObjectForTreeFromAddAction = undefined;
            appCtxService.ctx.versionCreatedFlag = true;
        }
        if ( appCtxService.ctx.locationContext.modelObject === undefined && appCtxService.ctx.ViewModeContext.ViewModeContext !== 'TreeSummaryView' ) {
            eventBus.publish( 'cdm.relatedModified', {
                relatedModified: [
                    selectedObject
                ]
            } );
        }
        if ( appCtxService.ctx.locationContext.modelObject !== undefined && flagValue === false && appCtxService.ctx.ViewModeContext.ViewModeContext !== 'TreeSummaryView' ) {
            eventBus.publish( 'cdm.relatedModified', {
                refreshLocationFlag: false,
                relatedModified: [
                    appCtxService.ctx.locationContext.modelObject
                ],
                createdObjects: [ data.createdObject ]
            } );
        }
        if ( appCtxService.ctx.locationContext.modelObject !== undefined && flagValue && appCtxService.ctx.ViewModeContext.ViewModeContext !== 'TreeSummaryView' ) {
            eventBus.publish( 'cdm.relatedModified', {
                refreshLocationFlag: true,
                relatedModified: [
                    appCtxService.ctx.locationContext.modelObject
                ]

            } );
        }
        if ( appCtxService.ctx.locationContext.modelObject !== undefined && appCtxService.ctx.locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Qc0MasterCharSpec' ) > -1 &&
            flagValue === false ) {
            var commandId = 'Awp0ShowObject';
            var commandArgs = {
                edit: false
            };
            var commandContext = {
                vmo: data.createdObject
            };
            exports.openNewObject( commandId, commandArgs, commandContext );
        }
        if ( response.specificationsOutput[0] ) {
            activeEditHandler.cancelEdits();
        }
    }, function( error ) {
        var errMessage = messagingSvc.getSOAErrorMessage( error );
        messagingSvc.showError( errMessage );
        activeEditHandler.cancelEdits();
        deferred.resolve();
    } )
        .catch( function( exception ) {
            logger.error( exception );
        } );
};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandlerFCS = function() {
    return saveEditHandler;
};

/**
 * custom save handler save edits called by framework
 *
 * @return promise
 */
saveEditHandler.saveEdits = function( dataSource ) {
    var deferred = AwPromiseService.instance.defer();
    var vmo = dataSource.getDeclViewModel().vmo;
    var input = {};
    aqc0UtilService.getPropertiesforSelectedObject( dataSource.getDeclViewModel(), vmo, true, undefined, true, deferred, false, true );
    return deferred.promise;
};

/**
 * Returns dirty bit.
 * @returns {Boolean} isDirty bit
 */
saveEditHandler.isDirty = function( dataSource ) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;
    if ( modifiedPropCount === 0 ) {
        return false;
    }
    return true;
};

/**
 *This method ensures that the error message is thrown when the LOV value for the Unit of Measure is not Valid.
 */
export let throwValidationError = function() {
    var localTextBundle = localeService.getLoadedText( 'qualitycharacteristicsmanagerMessages' );
    messagingSvc.showError( localTextBundle.UnitOfMeasureError );
};

/**
 *This method ensures that the it return proper characteristics object to remove the relation from characteristics group
 */
export let getUnderlyingObject = function() {
    var selectedParent = {};
    if( appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Aqc0QcElement' ) > -1 ) {
        selectedParent.type = appCtxService.ctx.pselected.type;
        selectedParent.uid = appCtxService.ctx.pselected.props.awb0UnderlyingObject.dbValues[ 0 ];
    } else {
        selectedParent = appCtxService.ctx.pselected;
    }
    return selectedParent;
};

/**
 *This method ensures that it returns latest charestics version from called object.
 */
self.findLatestCharVersion = function( data, name ) {
    getSupportedTCVersion();

    Aqc0CharManagerUtils2.findLatestCharVersion( data, name );
};

/**
 *This method ensures that it used to create xrt view model for characteristics.
 */
export let getXrtViewModelForCharSpec = function( data, charSpecObj, isLatest ) {
    xrtParserService.getXrtViewModel( 'SUMMARY', 'tc_xrt_Overview', charSpecObj, _staticXrtCommandIds ).then(
        function( xrtViewModelforCharSpec ) {
            if ( charSpecObj.type === 'Qc0VariableCharSpec' && !appCtxService.ctx.isLimitationSupported ) {
                xrtViewModelforCharSpec.viewModel.qc0limitation.propertyDisplayName = null;
                xrtViewModelforCharSpec.viewModel.qc0limitation.displayValues = null;
                xrtViewModelforCharSpec.viewModel.qc0limitation.dbValue = null;
                xrtViewModelforCharSpec.viewModel.qc0limitation.uiValue = null;
                xrtViewModelforCharSpec.viewModel.qc0limitation.type = null;
            }
            if ( charSpecObj.type === 'Qc0VariableCharSpec' && !appCtxService.ctx.isToleranceTypeSupported ) {
                if ( xrtViewModelforCharSpec.viewModel.qc0ToleranceType !== undefined ) {
                    xrtViewModelforCharSpec.viewModel.qc0ToleranceType.propertyDisplayName = null;
                    xrtViewModelforCharSpec.viewModel.qc0ToleranceType.displayValues = null;
                    xrtViewModelforCharSpec.viewModel.qc0ToleranceType.dbValue = null;
                    xrtViewModelforCharSpec.viewModel.qc0ToleranceType.uiValue = null;
                    xrtViewModelforCharSpec.viewModel.qc0ToleranceType.type = null;
                }
            }
            if ( isLatest ) {
                data.latestCharSpecxrtViewModel = xrtViewModelforCharSpec;
            } else {
                data.currentCharSpecxrtViewModel = xrtViewModelforCharSpec;
            }
        } );
};

/**
 *This method ensures that it used to load charestics and all the associate properties required to render xrt view model for charestics.
 */
export let loadCharesticsData = function( data ) {
    getSupportedTCVersion();
    var deferred = AwPromiseService.instance.defer();
    var loadChxObjectInput = {
        objects: [ {
            type: 'Aqc0CharElementRevision',
            uid: appCtxService.ctx.selected.type === 'Aqc0QcElement' ? appCtxService.ctx.selected.props.awb0UnderlyingObject.dbValues[0] : appCtxService.ctx.selected.uid
        } ],
        attributes: [ 'Aqc0LinkToSpec' ]
    };
    data.charRepRev = loadChxObjectInput.objects[0];
    soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', loadChxObjectInput ).then( function( getPropertiesResponse ) {
        var result = null;
        Object.keys( getPropertiesResponse.modelObjects ).map( function( key ) {
            if ( getPropertiesResponse.modelObjects[key].type === VIS_CHAR_TYPE || getPropertiesResponse.modelObjects[key].type === ATT_CHAR_TYPE ||
                getPropertiesResponse.modelObjects[key].type === VAR_CHAR_TYPE ) {
                result = getPropertiesResponse.modelObjects[key];
            }
        } );
        data.currentCharSpec = result;
        var currentCharSpec = viewModelObjectService.constructViewModelObjectFromModelObject( result );
        exports.getXrtViewModelForCharSpec( data, currentCharSpec, false );
        if ( currentCharSpec.props.qc0IsLatest.dbValues[0] === '0' ) {
            data.latestCharSpecxrtViewModel = null;
            self.findLatestCharVersion( data, currentCharSpec.props.object_name.dbValues[0], currentCharSpec.objectID );
        }
        deferred.resolve();
    }, function( reason ) {
        deferred.reject( reason );
    } );
    return deferred.promise;
};


/**
 *This method to used to remove latest view from xrt view model of charestics.
 */
 export let closeCompareView = function( data ) {
    data.latestCharSpecxrtViewModel = null;
};

/**
 *This method to used to change selection.
 */
export let currentSelectionChanged = function( data ) {
    if ( appCtxService.ctx.currentTypeSelection.dbValue !== data.aqc0CharacteristicAndRuleEngine.dbValue ) {
        appCtxService.ctx.search.criteria.searchString = '';
        appCtxService.ctx.search.criteria.Type = data.aqc0CharacteristicAndRuleEngine.dbValue;
        appCtxService.ctx.currentTypeSelection.dbValue = data.aqc0CharacteristicAndRuleEngine.dbValue;
        appCtxService.ctx.currentTypeSelection.uiValue = data.aqc0CharacteristicAndRuleEngine.uiValue;
        Aqc0CharManagerUtils2.addQueryParamsToBrowserURL();
        aqc0CharLibTree.clearMapOfCharGroupAndSpecification();
        if ( appCtxService.ctx.charLibmanagercontext ) {
            appCtxService.ctx.charLibmanagercontext.selectedNodes = [];
        }
        eventBus.publish( 'Aqc0CharLibraryTree.contentLoaded' );
        eventBus.publish( 'primaryWorkarea.reset' );
    }
};

/**
 * Function to get selected char library type.
 * @returns {object} ctx object with selected char library type
 */
export let getCurrentType = function() {
    getSupportedTCVersion();
    var currentTypeSelection;
    var charLibSelectedType = Aqc0CharManagerUtils2.getQueryParamValue( 'selectedType' );
    if ( !charLibSelectedType ) {
        charLibSelectedType = appCtxService.ctx.currentTypeSelection && appCtxService.ctx.currentTypeSelection.dbValue;
    }
    if ( charLibSelectedType ) {
        currentTypeSelection = {
            uiValue: charLibSelectedType,
            dbValue: charLibSelectedType
        };
    } else {
        currentTypeSelection = {
            uiValue: 'Characteristics',
            dbValue: 'Qc0CharacteristicsGroup'
        };
    }
    appCtxService.ctx.currentTypeSelection = currentTypeSelection;
    return appCtxService.ctx.currentTypeSelection.dbValue;
};

/**
 * Listen to edit events , if edit is about to happen then convert the custom rule properties into edit mode else disable edit mode and revert to initial values
 * @return {ObjectArray} data the data object in scope
 */
export let processEditData = function( data ) {
    if( data.pinnedToForm !== undefined ) {
    appCtxService.updateCtx( 'pinnedToForm',  data.pinnedToForm.dbValue );
    appCtxService.updateCtx( 'unpinnedToForm',  data.unpinnedToForm.dbValue );
    }
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    if ( data.eventData.state === 'starting' ) {
        //Adding check its temporary fix this code needs to be refactor
        if ( appCtxService.ctx.isTC13_2OnwardsSupported ) {
            uwPropertySvc.setIsEditable( data.objectName, true );
            uwPropertySvc.setIsEnabled( data.objectName, activeEditHandler.editInProgress() );
        } else {
            uwPropertySvc.setIsEditable( data.objectName, false );
            uwPropertySvc.setIsEnabled( data.objectName, false );
        }
        // Object Type Check required to handle console errors when selected object not the Variablre Char Spec
        if ( appCtxService.ctx.xrtSummaryContextObject.type === 'Qc0VariableCharSpec' ) {
            uwPropertySvc.setIsEditable( data.qc0NominalValue, true );
            uwPropertySvc.setIsEnabled( data.qc0NominalValue, activeEditHandler.editInProgress() );
            uwPropertySvc.setIsEditable( data.qc0UpperTolerance, true );
            uwPropertySvc.setIsEnabled( data.qc0UpperTolerance, activeEditHandler.editInProgress() );
            uwPropertySvc.setIsEditable( data.qc0LowerTolerance, true );
            uwPropertySvc.setIsEnabled( data.qc0LowerTolerance, activeEditHandler.editInProgress() );
            uwPropertySvc.setIsEditable( data.qc0limitation, true );
            uwPropertySvc.setIsEnabled( data.qc0limitation, activeEditHandler.editInProgress() );
            if ( appCtxService.ctx.isToleranceTypeSupported ) {
                uwPropertySvc.setIsEditable( data.qc0ToleranceType, true );
                uwPropertySvc.setIsEnabled( data.qc0ToleranceType, activeEditHandler.editInProgress() );
            }
            uwPropertySvc.setIsEditable( data.qc0UnitOfMeasure, true );
            uwPropertySvc.setIsEnabled( data.qc0UnitOfMeasure, activeEditHandler.editInProgress() );
        }
        uwPropertySvc.setIsEditable( data.qc0Criticality, true );
        uwPropertySvc.setIsEnabled( data.qc0Criticality, activeEditHandler.editInProgress() );
    } else if ( data.eventData.state === 'canceling' && activeEditHandler ) {
        if ( appCtxService.ctx.isTC13_2OnwardsSupported ) {
            uwPropertySvc.setValue( data.objectName, data.objectName.value );
            uwPropertySvc.setIsEditable( data.objectName, false );
            uwPropertySvc.setIsEnabled( data.objectName, activeEditHandler.editInProgress() );
        }
        // Object Type Check required to handle console errors when selected object not the Variablre Char Spec
        if ( appCtxService.ctx.xrtSummaryContextObject.type === 'Qc0VariableCharSpec' ) {
            uwPropertySvc.setValue( data.qc0NominalValue, data.qc0NominalValue.value );
            uwPropertySvc.setIsEditable( data.qc0NominalValue, false );
            uwPropertySvc.setIsEnabled( data.qc0NominalValue, activeEditHandler.editInProgress() );
            uwPropertySvc.setValue( data.qc0UpperTolerance, data.qc0UpperTolerance.value );
            uwPropertySvc.setIsEditable( data.qc0UpperTolerance, false );
            uwPropertySvc.setIsEnabled( data.qc0UpperTolerance, activeEditHandler.editInProgress() );
            uwPropertySvc.setValue( data.qc0LowerTolerance, data.qc0LowerTolerance.value );
            uwPropertySvc.setIsEditable( data.qc0LowerTolerance, false );
            uwPropertySvc.setIsEnabled( data.qc0LowerTolerance, activeEditHandler.editInProgress() );
            uwPropertySvc.setValue( data.qc0limitation, data.qc0limitation.value );
            uwPropertySvc.setIsEditable( data.qc0limitation, false );
            uwPropertySvc.setIsEnabled( data.qc0limitation, activeEditHandler.editInProgress() );
            if ( appCtxService.ctx.isToleranceTypeSupported ) {
                uwPropertySvc.setValue( data.qc0ToleranceType, data.qc0ToleranceType.value );
                uwPropertySvc.setIsEditable( data.qc0ToleranceType, false );
                uwPropertySvc.setIsEnabled( data.qc0ToleranceType, activeEditHandler.editInProgress() );
            }
            uwPropertySvc.setValue( data.qc0UnitOfMeasure, data.qc0UnitOfMeasure.value );
            uwPropertySvc.setIsEditable( data.qc0UnitOfMeasure, false );
            uwPropertySvc.setIsEnabled( data.qc0UnitOfMeasure, activeEditHandler.editInProgress() );
        }
        uwPropertySvc.setValue( data.qc0Criticality, data.qc0Criticality.value );
        uwPropertySvc.setIsEditable( data.qc0Criticality, false );
        uwPropertySvc.setIsEnabled( data.qc0Criticality, activeEditHandler.editInProgress() );
    }
    _data = data;
};

/**
 * Get Input for SaveAs variable Characteristics SOA
 * @param {Object} ctx - ctx
 * @param {Object} data - data
 * @return {input} inputData for removeChildren SOA
 */
export let getCreateInputForSaveAsvarChar = function( data, type ) {
    var input = [];
    var lowerToleranceValue;
    var upperToleranceValue;
    var limitationValue;
    var toleranceTypeValue;
    var nominalValue;
    var groupReference;
    nominalValue = Number( data.qc0NominalValue.dbValue );
    lowerToleranceValue = Number( data.qc0LowerTolerance.dbValue );
    upperToleranceValue = Number( data.qc0UpperTolerance.dbValue );
    input = [ {
        clientId: '',
        data: {
            boName: 'Qc0VariableCharSpec',
            stringProps: {
                qc0Criticality: data.qc0Criticality.dbValue,
                qc0Context: data.qc0Context.dbValue,
                object_desc: data.object_desc.dbValue
            },
            doubleProps: {
                qc0NominalValue: nominalValue,
                qc0UpperTolerance: upperToleranceValue,
                qc0LowerTolerance: lowerToleranceValue
            },
            tagProps: {
                qc0UnitOfMeasure: {
                    uid: data.qc0UnitOfMeasure.dbValue,
                    type: 'qc0UnitOfMeasure'
                }
            }
        }
    } ];
    if ( type === 'create' ) {
        groupReference = {
            type: data.qc0GroupReference.type,
            uid: data.qc0GroupReference.uid
        };
    } else if ( type === 'saveas' ) {
        groupReference = {
            type: data.GroupList.dbValue.type,
            uid: data.GroupList.dbValue.uid,
            name: data.GroupList.dbValue.props.object_string.dbValue
        };
    }
    input[0].data.tagProps.qc0GroupReference = groupReference;
    if ( appCtxService.ctx.isLimitationSupported ) {
        limitationValue = data.qc0limitation.dbValue;

        if ( limitationValue === 'Zero' || limitationValue === 'Down' ) {
            input[0].data.doubleProps.qc0LowerTolerance = Number( getToleranceValue( data ) );
        } else if ( limitationValue === 'Up' ) {
            input[0].data.doubleProps.qc0UpperTolerance = Number( getToleranceValue( data ) );
        }
        input[0].data.stringProps.qc0limitation = limitationValue;
    }
    if ( appCtxService.ctx.isToleranceTypeSupported ) {
        toleranceTypeValue = data.qc0ToleranceType.dbValue;
        input[0].data.stringProps.qc0ToleranceType = toleranceTypeValue;
    }
    input[0].data.stringProps.object_name = data.objectName.dbValue;

    return input;
};

/**
 * Get Input for SaveAs variable Characteristics SOA
 * @param {Object} data - data
 * @return {saveAsInput} inputData for SaveAs SOA
 */
export let getSaveAsInputForCharSpec = function( data ) {
    var lowerToleranceValue;
    var upperToleranceValue;
    var limitationValue;
    var toleranceTypeValue;
    var nominalValue;
    var saveAsInput = {};
    nominalValue = Number( data.qc0NominalValue.dbValue );
    lowerToleranceValue = Number( data.qc0LowerTolerance.dbValue );
    upperToleranceValue = Number( data.qc0UpperTolerance.dbValue );
    saveAsInput = {
        boName: 'Qc0VariableCharSpec',
        stringProps: {
            qc0Criticality: data.qc0Criticality.dbValue,
            qc0Context: data.qc0Context.dbValue,
            object_desc: data.object_desc.dbValue
        },
        doubleProps: {
            qc0NominalValue: nominalValue,
            qc0UpperTolerance: upperToleranceValue,
            qc0LowerTolerance: lowerToleranceValue
        },
        tagProps: {
            qc0UnitOfMeasure: {
                uid: data.qc0UnitOfMeasure.dbValue,
                type: 'qc0UnitOfMeasure'
            }
        },
        boolProps: {
            qc0IsLatest: true
        },
        intProps: {
            qc0BasedOnId: 1
        }
    };
    if ( appCtxService.ctx.isLimitationSupported ) {
        limitationValue = data.qc0limitation.dbValue;

        if ( limitationValue === 'Zero' || limitationValue === 'Down' ) {
            saveAsInput.doubleProps.qc0LowerTolerance = Number( getToleranceValue( data ) );
        } else if ( limitationValue === 'Up' ) {
            saveAsInput.doubleProps.qc0UpperTolerance = Number( getToleranceValue( data ) );
        }
        saveAsInput.stringProps.qc0limitation = limitationValue;
    }
    if ( appCtxService.ctx.isToleranceTypeSupported ) {
        toleranceTypeValue = data.qc0ToleranceType.dbValue;
        saveAsInput.stringProps.qc0ToleranceType = toleranceTypeValue;
    }
    saveAsInput.stringProps.object_name = data.objectName.dbValue;
    return saveAsInput;
};

/*
 *  This method to updates Upper Tolerance and Lower Tolerance after changing Tolerance Type
 */
export let updateUpperLowerTol = function( data ) {
    getSupportedTCVersion();
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var upperTolValue = null;
    var lowerTolValue = null;

    if ( activeEditHandler.editInProgress() === true ) {
        //When Tolerance Type == Absolute
        if ( data.qc0ToleranceType.dbValue === 'Absolute' ) {
            upperTolValue = Number( data.qc0NominalValue.dbValue ) + Number( data.qc0UpperTolerance.dbValue );
            lowerTolValue = Number( data.qc0NominalValue.dbValue ) + Number( data.qc0LowerTolerance.dbValue );
        }
        //When Tolerance Type == Relative
        if ( data.qc0ToleranceType.dbValue === 'Relative' ) {
            upperTolValue = Number( data.qc0UpperTolerance.dbValue ) - Number( data.qc0NominalValue.dbValue );
            lowerTolValue = Number( data.qc0LowerTolerance.dbValue ) - Number( data.qc0NominalValue.dbValue );
        }
        //If values are not null, then only assign
        if ( upperTolValue !== null ) {
            var uppTolActual = 0.0;
            uppTolActual = upperTolValue.toFixed( 12 );
            data.qc0UpperTolerance.dbValue = parseFloat( uppTolActual );
            data.qc0UpperTolerance.valueUpdated = true;
        }
        if ( lowerTolValue !== null ) {
            var lowTolActual = 0.0;
            lowTolActual = lowerTolValue.toFixed( 12 );
            data.qc0LowerTolerance.dbValue = parseFloat( lowTolActual );
            data.qc0LowerTolerance.valueUpdated = true;
        }
    }
};
/**
 * Sets the supported versions for commands
 */
export let getSupportedTCVersion = function() {
    var tcMajor = tcSessionData.getTCMajorVersion();
    var tcMinor = tcSessionData.getTCMinorVersion();
    var isLimitationSupported = false;
    var isToleranceTypeSupported = false;
    // If major version is greater than 12 .e.g TC13x onwards, then set true
    if ( tcMajor > 12 ) {
        isLimitationSupported = true;
    } else if ( tcMajor === 12 && tcMinor >= 4 ) { //For Tc12.4 and newer releases
        isLimitationSupported = true;
    }
    // If not 13.0 and if Major is 13 or above and minor is 0 and above
    if ( tcMajor === 13 && tcMinor > 0 || tcMajor > 13 ) {
        isToleranceTypeSupported = true;
    }
    // tc 13.2 onwards supported
    if ( tcMajor === 13 && tcMinor >= 2 || tcMajor > 13 ) {
        appCtxService.ctx.isTC13_2OnwardsSupported = true;
    }
    appCtxService.ctx.isLimitationSupported = isLimitationSupported;
    appCtxService.ctx.isToleranceTypeSupported = isToleranceTypeSupported;
    appCtxService.ctx.isClassificationPropSupported = Aqc0CharManagerUtils2.isAw5213xOrAboveVersionSupported();
    appCtxService.ctx.isOkConditionPropSupported = Aqc0CharManagerUtils2.isAw5213xOrAboveVersionSupported();
};

/**
 * Get Error from server and show on UI
 */
export let getFailureMessage = function( data ) {
    if ( data.ServiceData.hasOwnProperty( 'partialErrors' ) ) {
        var errorCodeData = data.ServiceData.partialErrors[0].errorValues;
        for ( var data in errorCodeData ) {
            if ( errorCodeData[data].code === 394002 ) {
                messagingSvc.showError( errorCodeData[data].message );
                break;
            }
        }
    }
};

/*
 * This function will return Upper / Lower Tolerance value based on Tolerance Type
 */
export let getToleranceValue = function( data ) {
    if ( appCtxService.ctx.isToleranceTypeSupported && data.qc0ToleranceType.dbValue === 'Absolute' ) {
        return data.qc0NominalValue.dbValue;
    }
    return 0;
};

export default exports = {
    getAddCharSpecificationPanel,
    loadObjects,
    sortResults,
    processPWASelection,
    getLOVList,
    getVersionInputFEdit,
    getVersionInput,
    openNewObject,
    getSaveAsCharSpecificationPanel,
    validateUnitofMeasure,
    createVersionSOACall,
    getSaveHandlerFCS,
    throwValidationError,
    getUnderlyingObject,
    loadCharesticsData,
    closeCompareView,
    currentSelectionChanged,
    getCurrentType,
    processEditData,
    getCreateInputForSaveAsvarChar,
    getSupportedTCVersion,
    updateUpperLowerTol,
    getFailureMessage,
    getToleranceValue,
    performSaveEdit,
    getSaveAsInputForCharSpec,
    getXrtViewModelForCharSpec
};
app.factory( 'Aqc0CharManagerUtils', () => exports );
