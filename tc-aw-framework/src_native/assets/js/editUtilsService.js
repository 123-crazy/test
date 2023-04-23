// Copyright (c) 2020 Siemens

/**
 * Edit Handler factory
 *
 * @module js/editUtilsService
 */

import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import actionService from 'js/actionService';
import app from 'app';
import declUtils from 'js/declUtils';
import uwPropertyService from 'js/uwPropertyService';
import viewModelObjectService from 'js/viewModelObjectService';

var exports = {};

let saveListeners = {};

export const _removeListeners = function( sourceModel ) {
    removeSaveListener( sourceModel );
};

const addListeners = function( dataCtxNode, declViewModel, viewModelCollection, editConfig, saveEditStateChangeCallback ) {
    _removeListeners( editConfig.sourceModel );
    const saveEditsListener = function( event ) {
        if( event.ctrlKey && ( event.key === 's' || event.key === 'S' ) ) {
            exports._saveEdits( dataCtxNode, declViewModel, viewModelCollection, editConfig );
            saveEditStateChangeCallback();
            event.preventDefault();
            removeSaveListener( editConfig.sourceModel );
        }
    };
    document.addEventListener( 'keydown', saveEditsListener );
    saveListeners[ editConfig.sourceModel ] = saveEditsListener;
};

const removeSaveListener = function( sourceModel ) {
    document.removeEventListener( 'keydown', saveListeners[ sourceModel ] );
};

/**
 * isDirty implementation of edit-handler interface.
 * @param {*} viewModelCollection collection of view model objects
 * @returns {*} AwPromiseService.instance promise with true/false
 */
export let _isDirty = function( viewModelCollection ) {
    var hasModifiedProperties = false;
    _.forEach( viewModelCollection, function( vmo ) {
        _.forEach( vmo.props, function( vmoProp ) {
            hasModifiedProperties = uwPropertyService.isModified( vmoProp );
            return !hasModifiedProperties;
        } );
        return !hasModifiedProperties;
    } );
    return AwPromiseService.instance.when( hasModifiedProperties );
};
/**
 * saveEdits implementation of edit - handler interface.
 * @param {*} dataCtxNode $scope or the data context node.
 * @param {*} declViewModel Declarative View Model, where edit actions are defined.
 * @param {*} viewModelCollection collection of view-model objects.
 * @param {*} editConfig standard edit configuration defined on dataprovider/declviewmodel
 * @returns {*} AwPromiseService.instance promise
 */
export let _saveEdits = function( dataCtxNode, declViewModel, viewModelCollection, editConfig ) {
    viewModelCollection = viewModelObjectService.getLoadedAndCachedViewModelObjects( viewModelCollection );
    var getAllModifiedProperties = function() {
        var modifiedProperties = [];
        _.forEach( viewModelCollection, function( vmo ) {
            _.forOwn( vmo.props, function( vmoProp ) {
                if( uwPropertyService.isModified( vmoProp ) ) {
                    modifiedProperties.push( vmoProp );
                }
            } );
        } );
        return modifiedProperties;
    };

    var getModifiedPropertiesMap = function() {
        var identifier = editConfig.identifier;
        var inputs = [];
        var inputRegistry = {};
        _.forEach( viewModelCollection, function( vmo ) {
            var uid = vmo[ identifier ];
            _.forOwn( vmo.props, function( prop ) {
                if( uwPropertyService.isModified( prop ) ) {
                    var propObj = {
                        propertyName: prop.propertyName,
                        dbValues: uwPropertyService.getValueStrings( prop ),
                        uiValues: prop.uiValues,
                        srcObjLsd: prop.srcObjLsd
                    };
                    inputRegistry[ uid ] = inputRegistry[ uid ] || { identifier: uid, props: [] };
                    var inputObj = inputRegistry[ uid ];
                    inputObj.props.push( propObj );
                }
            } );
            if( inputRegistry[ uid ] ) {
                inputs.push( inputRegistry[ uid ] );
            }
        } );
        return inputs;
    };
    return exports._isDirty( viewModelCollection ).then( function( hasModifiedProps ) {
        var saveSuccess = function( viewModelCollection ) {
            var modifiedPropsArr = getAllModifiedProperties();
            viewModelCollection.map( function( vmo ) {
                viewModelObjectService.setEditableStates( vmo, false, true, true );
            } );

            modifiedPropsArr.map( function( modProp ) {
                uwPropertyService.replaceValuesWithNewValues( modProp );
                uwPropertyService.resetProperty( modProp );
            } );
            uwPropertyService.triggerDigestCycle();
            _removeListeners( editConfig.sourceModel );
            return AwPromiseService.instance.resolve();
        };

        if( hasModifiedProps ) {
            var inputs = getModifiedPropertiesMap();
            var saveEditAction = editConfig.saveEditAction;
            var action = declViewModel._internal.actions[ saveEditAction ];
            if( action ) {
                if( action.actionType === 'RESTService' ) {
                    var requestData = action.inputData.request;
                    requestData.data = requestData.data || {};
                    requestData.data.saveInputs = inputs;
                } else {
                    action.inputData = action.inputData || {};
                    action.inputData.saveInputs = inputs;
                }
                return exports.executeAction( declViewModel, action, dataCtxNode )
                    .then( function() {
                        return saveSuccess( viewModelCollection );
                    }, function( error ) {
                        return AwPromiseService.instance.reject( error );
                    } );
            }
        }
        return saveSuccess( viewModelCollection );
    } );
};

/**
 * This is the cancel edits implementation of edit-handler interface.
 * @param {*} dataCtxNode data ctx node ($scope)
 * @param {*} declViewModel declarative view model
 * @param {*} viewModelCollection collection of view model objects
 * @param {*} editConfig edit configuration
 * @returns {* } AwPromiseService.instance when operation is completed.
 */
export let _cancelEdits = function( dataCtxNode, declViewModel, viewModelCollection, editConfig ) {
    viewModelCollection = viewModelObjectService.getLoadedAndCachedViewModelObjects( viewModelCollection );
    _.forEach( viewModelCollection, function( vmo ) {
        viewModelObjectService.clearEditableStates( vmo );
    } );
    uwPropertyService.triggerDigestCycle();
    _removeListeners( editConfig.sourceModel );
    return AwPromiseService.instance.resolve();
};

/**
 * This function merges the start edit action response back into the view model collect.
 * The response from start edit action should be an array of view model objects.
 *
 * @param {* } serverData response from the response
 * @param {* } vmCollection collection of view model objects
 * @param {* } editConfig edit configuration
 * @param {* } [propsToUpdate] - (Optional) If provided, only update these properties from server response
 * @returns {* } Promise when operation is completed.
 */
export let _mergeStartEditResponse = function( serverData, vmCollection, editConfig, propsToUpdate ) {
    try {
        var identifier = editConfig.identifier;
        var identiferToVMOMap = vmCollection.reduce( function( acc, eachObject ) {
            var uid = eachObject[ identifier ];
            acc[ uid ] = eachObject;
            return acc;
        }, {} );

        if( !editConfig.hasOwnProperty( 'mergeResponseFunction' ) ) {
            _.forEach( serverData, function( updatedVMO ) {
                var uid = updatedVMO[ identifier ];
                var targetVMO = identiferToVMOMap[ uid ] || null;
                if( targetVMO ) {
                    _.forOwn( updatedVMO.props, function( updatedProperty ) {
                        // If this is not one of the props we want to update, continue
                        if( propsToUpdate && propsToUpdate.length > 0 && propsToUpdate.indexOf( updatedProperty.propertyName ) === -1 ) {
                            return true;
                        }
                        var targetProperty = targetVMO.props[ updatedProperty.propertyName ] || null;
                        if( targetProperty ) {
                            updatedProperty.value = updatedProperty.hasOwnProperty( 'value' ) ? updatedProperty.value : targetProperty.value;
                            updatedProperty.displayValues = updatedProperty.hasOwnProperty( 'displayValues' ) ? updatedProperty.displayValues : targetProperty.displayValues;
                            updatedProperty.isNull = updatedProperty.hasOwnProperty( 'isNull' ) ? updatedProperty.isNull : targetProperty.displayValues;
                            updatedProperty.editable = updatedProperty.hasOwnProperty( 'editable' ) ? updatedProperty.editable : targetProperty.editable;
                            updatedProperty.isPropertyModifiable = updatedProperty.hasOwnProperty( 'isPropertyModifiable' ) ? updatedProperty.isPropertyModifiable : targetProperty
                                .isPropertyModifiable;
                            updatedProperty.sourceObjectLastSavedDate = updatedProperty.hasOwnProperty( 'sourceObjectLastSavedDate' ) ? updatedProperty.sourceObjectLastSavedDate :
                                targetProperty.sourceObjectLastSavedDate;
                            uwPropertyService.copyModelData( targetProperty, updatedProperty );
                        }
                    } );
                }
            } );
            return AwPromiseService.instance.resolve();
        }
        var deps = 'js/editMergeService';
        return exports.loadDependentModule( deps ).then( function( depModuleObj ) {
            var args = [ serverData, vmCollection, editConfig ];
            return depModuleObj[ editConfig.mergeResponseFunction ].apply( null, args );
        } );
    } catch ( err ) {
        return AwPromiseService.instance.reject( err );
    }
};

/**
 * This function loads the dependent module.
 * @param {*} deps name of the dependency files.
 * @returns {*} AwPromiseService.instance when module is loaded.
 */
export let loadDependentModule = function( deps ) {
    var depModuleObj = declUtils.getDependentModule( deps );
    if( depModuleObj ) {
        return AwPromiseService.instance.resolve( depModuleObj );
    }
    return declUtils.loadDependentModule( deps ).then(
        function( depModuleObj ) {
            return AwPromiseService.instance.resolve( depModuleObj );
        },
        function( error ) {
            return AwPromiseService.instance.reject( error );
        }
    );
};

/**
 * This function executes any action defined in the view model.
 * @param {*} declViewModel Declarative View Model, where edit action is defined
 * @param {*} action start/save/cancel Edit action
 * @param {*} dataCtxNode $scope/data ctx object
 * @returns {*} AwPromiseService.instance promise
 */
export let executeAction = function( declViewModel, action, dataCtxNode ) {
    if( action.deps ) {
        return exports.loadDependentModule( action.deps ).then( function( depModuleObj ) {
            return actionService.executeAction( declViewModel, action, dataCtxNode, depModuleObj );
        } );
    }
    return actionService.executeAction( declViewModel, action, dataCtxNode, null );
};

/**
 * This function implements the start edit function edit handler interface
 * @param {* } dataCtxNode data ctx Node.
 * @param {* } declViewModel declarative ViewModel.
 * @param {* } vmCollection collection of all view model objects.
 * @param {* } editConfig edit configuration
 * @param {* } saveEditStateChangeCallback callback function on save
 * @param {Object} editOptions - additional options object to specify specfic prop to edit and autosave mode { vmo, propertyNames, autoSave } (Optional)
 * @returns {* } AwPromiseService.instance when module is loaded.
 */
export let _startEdit = function( dataCtxNode, declViewModel, vmCollection, editConfig, saveEditStateChangeCallback, editOptions ) {
    try {
        var identifier = editConfig.identifier;
        var setEditableStates = function() {
            if( editOptions ) {
                for( let j = 0; j < editOptions.vmos.length; j++ ) {
                    for( let i = 0; i < editOptions.propertyNames.length; i++ ) {
                        const prop = editOptions.vmos[ j ].props[ editOptions.propertyNames[ i ] ];
                        uwPropertyService.setEditable( prop, true );
                        uwPropertyService.setEditState( prop, true, true, true );
                    }
                }
            } else if( vmCollection ) {
                _.forEach( vmCollection, function( vmo ) {
                    viewModelObjectService.setEditableStates( vmo, true, true, true );
                } );
                uwPropertyService.triggerDigestCycle();
            }
        };

        // Get viewModelObjects that are not in edit mode
        let vmosNotInEdit = [];
        if( editOptions ) {
            vmosNotInEdit = [ editOptions.vmos ];
        } else {
            vmosNotInEdit = viewModelObjectService.getVmosNotInEdit( vmCollection );
        }

        var inputs = vmosNotInEdit.map( function( eachObject ) {
            var objInput = {};
            objInput[ identifier ] = eachObject[ identifier ];
            objInput.propertyNames = [];
            if( editOptions ) {
                objInput.propertyNames = editOptions.propertyNames;
            } else {
                _.forOwn( eachObject.props, function( prop ) {
                    objInput.propertyNames.push( prop.propertyName );
                } );
            }
            return objInput;
        } );

        var startEditActionName = editConfig.startEditAction;
        var startEditAction = declViewModel.getAction( startEditActionName );

        if( startEditAction ) {
            if( startEditAction.actionType === 'RESTService' ) {
                var requestData = startEditAction.inputData.request;
                requestData.data = requestData.data || {};
                requestData.data.editInputs = inputs;
            } else {
                startEditAction.inputData = startEditAction.inputData || {};
                startEditAction.inputData.editInputs = inputs;
            }

            return exports.executeAction( declViewModel, startEditAction, dataCtxNode ).then( function( responseObj ) {
                responseObj = startEditAction.actionType === 'RESTService' ? responseObj.data : responseObj;
                if( editConfig.hasOwnProperty( 'startEditResponseKey' ) ) {
                    responseObj = responseObj[ editConfig.startEditResponseKey ];
                }
                let propsToUpdate = editOptions ? editOptions.propertyNames : [];
                return exports._mergeStartEditResponse( responseObj, vmCollection, editConfig, propsToUpdate ).then( function() {
                    setEditableStates();
                    addListeners( dataCtxNode, declViewModel, vmCollection, editConfig, saveEditStateChangeCallback );
                    return AwPromiseService.instance.resolve();
                }, function( error ) {
                    return AwPromiseService.instance.reject( error );
                } );
            } );
        }
        return AwPromiseService.instance.reject( 'start edit action not defined' );
    } catch ( error ) {
        return AwPromiseService.instance.reject( error );
    }
};

exports = {
    _isDirty,
    _saveEdits,
    _cancelEdits,
    _mergeStartEditResponse,
    loadDependentModule,
    executeAction,
    _startEdit,
    _removeListeners
};
export default exports;
/**
 * This factory creates an edit handler
 *
 * @memberof NgServices
 * @member editHandlerFactory
 */
app.factory( 'editUtilsService', () => exports );
