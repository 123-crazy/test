// Copyright (c) 2020 Siemens

/**
 * Edit Handler factory
 *
 * @module js/editHandlerFactory
 */

import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import editEventsService from 'js/editEventsService';
import eventBus from 'js/eventBus';
import leavePlaceService from 'js/leavePlace.service';
import localeSvc from 'js/localeService';
import logger from 'js/logger';
import messagingSvc from 'js/messagingService';
import notySvc from 'js/NotyModule';
import parsingUtils from 'js/parsingUtils';
import policySvc from 'soa/kernel/propertyPolicyService';
import saveHandlerService from 'js/saveHandlerService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertyService from 'js/uwPropertyService';
import vmsvc from 'js/viewModelObjectService';

// Various services

var exports = {};

/**
 * Create edit handler
 *
 * @param {Object} dataSource - the dataSource we're associating the edit handler with
 * @param {Array} editSupportParamKeys - the url parameters which are allowed to change during edit mode
 *
 * @return {Object} edit handler object
 */
export let createEditHandler = function( dataSource, editSupportParamKeys ) {
    var editHandler = {
        // Mark this handler as native - checked from GWT jsni code
        isNative: true,
        _editing: false
    };

    var _singleLeaveConfirmation = null;
    var _multiLeaveConfirmation = null;
    var _saveTxt = null;
    var _discardTxt = null;
    var _validationError = null;
    var _xrtViewModelSvc = null;
    let _isDestroyed = false;
    let _leaveHandler = null;

    if( localeSvc ) {
        localeSvc.getLocalizedTextFromKey( 'XRTMessages.navigationConfirmationSingle' ).then( result => _singleLeaveConfirmation = result );
        localeSvc.getLocalizedTextFromKey( 'XRTMessages.navigationConfirmationMultiple' ).then( result => _multiLeaveConfirmation = result );
        localeSvc.getLocalizedTextFromKey( 'XRTMessages.save' ).then( result => _saveTxt = result );
        localeSvc.getLocalizedTextFromKey( 'XRTMessages.discard' ).then( result => _discardTxt = result );
        localeSvc.getLocalizedTextFromKey( 'editHandlerMessages.validationError' ).then( result => _validationError = result );
    }

    let saveEditsListener = null;

    const removeSaveListener = function() {
        document.removeEventListener( 'keydown', saveEditsListener );
    };

    const addSaveListener = function( editOptions ) {
        removeSaveListener();
        if( editOptions && editOptions.autoSave ) {
            saveEditsListener = editEventsService.saveEditsListener( editHandler, removeSaveListener );
        } else {
            saveEditsListener = editEventsService.saveEditsListener( null, removeSaveListener );
        }
        document.addEventListener( 'keydown', saveEditsListener );
    };

    /**
     * Notify the save state changes
     *
     * @param {String} stateName - edit state name ('starting', 'saved', 'cancelling')
     * @param {Boolean} fireEvents - fire modelObjectsUpdated events
     * @param {Array} failureUids - the object uids that failed to save
     * @param {Object} modifiedPropsMap - modified properties map
     */
    function _notifySaveStateChanged( stateName, fireEvents, failureUids, modifiedPropsMap ) {
        switch ( stateName ) {
            case 'starting':
                dataSource.checkEditableOnProperties();
                addSaveListener();
                break;
            case 'saved':
                dataSource.saveEditiableStates();
                removeSaveListener();
                break;
            case 'canceling':
                dataSource.resetEditiableStates();
                removeSaveListener();
                break;
            case 'partialSave':
                dataSource.updatePartialEditState( failureUids, modifiedPropsMap );
                break;
            default:
                logger.error( 'Unexpected stateName value: ' + stateName );
        }

        if( fireEvents ) {
            var dataProvider = dataSource.getDataProvider();
            if( dataProvider && dataProvider.viewModelCollection ) {
                eventBus.publish( dataProvider.name + '.modelObjectsUpdated', {
                    viewModelObjects: dataProvider.viewModelCollection.getLoadedViewModelObjects(),
                    totalObjectsFound: dataProvider.viewModelCollection.getTotalObjectsLoaded()
                } );
            }
        }

        editHandler._editing = stateName === 'starting' || stateName === 'partialSave';

        // Add to the appCtx about the editing state
        appCtxSvc.updateCtx( 'editInProgress', editHandler._editing );

        var context = {
            state: stateName
        };

        context.dataSource = dataSource.getSourceObject();
        context.failureUids = failureUids;
        eventBus.publish( 'editHandlerStateChange', context );
    }

    const onlyEditSupportParamsChanging = function( newLocation, oldLocation, editSupportParamKeys ) {
        const newParams = newLocation.params;
        const oldParams = oldLocation.params;

        // Return false if state name is changing
        if( newLocation.state.name !== oldLocation.state.name ) {
            return false;
        }

        let selectionParamsSame = true;
        for( let i = 0; i < editSupportParamKeys.length; i++ ) {
            let param = editSupportParamKeys[ i ];
            if( newParams[ param ] !== oldParams[ param ] ) {
                selectionParamsSame = false;
            }
        }
        if( selectionParamsSame ) {
            return false;
        }

        // Return false if the keys are not equal ( excluding the editSupportParamKeys )
        let newParamsClone = JSON.parse( JSON.stringify( newParams ) );
        let oldParamsClone = JSON.parse( JSON.stringify( oldParams ) );
        for( let i = 0; i < editSupportParamKeys.length; i++ ) {
            let param = editSupportParamKeys[ i ];
            delete newParamsClone[ param ];
            delete oldParamsClone[ param ];
        }
        if( !_.isEqual( Object.keys( newParamsClone ), Object.keys( oldParamsClone ) ) ) {
            return false;
        }

        // Return false if one of the param values has changed ( excluding the v )
        for( let key in newParamsClone ) {
            if( newParamsClone[ key ] !== oldParamsClone[ key ] ) {
                return false;
            }
        }

        return true;
    };

    /**
     * Reregisters the existing leaveHandler with the leavePlaceService
     */
    editHandler.reregisterLeaveHandler = function() {
        leavePlaceService.registerLeaveHandler( _leaveHandler );
    };

    /**
     * Start editing
     *
     * @param {Object} editOptions - additional options object to specify specfic prop to edit and autosave mode { vmo, propertyNames, autoSave } (Optional)
     * @return {Promise} response
     */
    editHandler.startEdit = function( editOptions ) {
        // Register with leave place service
        _leaveHandler = {
            okToLeave: function( targetNavDetails, newLocation, oldLocation ) {
                // Skip leaveConfirmation if editSupportParamKeys are the only part of the url that is changing.
                if( editSupportParamKeys && newLocation && oldLocation && onlyEditSupportParamsChanging( newLocation, oldLocation, editSupportParamKeys ) ) {
                    return Promise.resolve( { clearLeaveHandler: false } );
                }
                return editHandler.leaveConfirmation();
            }
        };
        leavePlaceService.registerLeaveHandler( _leaveHandler );

        const isPropEditing = Boolean( editOptions );

        if( !editOptions ) {
            editHandler._editing = true;
        }
        var viewModelObjectList = dataSource.getLoadedViewModelObjects();

        // Get list of UIDs
        var uidToVMMap = {};
        if( isPropEditing ) {
            _.forEach( editOptions.vmos, function( viewModelObject ) {
                if( !uidToVMMap[ viewModelObject.uid ] ) {
                    uidToVMMap[ viewModelObject.uid ] = [ viewModelObject ];
                }
            } );
        } else if( viewModelObjectList !== null ) {
            _.forEach( viewModelObjectList, function( viewModelObject ) {
                if( uidToVMMap[ viewModelObject.uid ] ) {
                    var existingVMOs = uidToVMMap[ viewModelObject.uid ];
                    existingVMOs.push( viewModelObject );
                } else {
                    uidToVMMap[ viewModelObject.uid ] = [ viewModelObject ];
                }
            } );
        }

        let propMap = {};
        if( isPropEditing ) {
            _.forEach( editOptions.vmos, function( vmo ) {
                propMap[ vmo.uid ] = editOptions.propertyNames;
            } );
        } else {
            propMap = dataSource.getPropertyMap();
        }

        var propPolicy = {
            types: [ {
                name: 'BusinessObject',
                properties: [ {
                    name: 'is_modifiable'
                } ]
            } ]
        };

        var policyId = policySvc.register( propPolicy, 'startEditHandler_Policy', 'selected' );

        var input = {
            inputs: []
        };
        if( propMap ) {
            _.forEach( propMap, function( value, key ) {
                dms.getLoadViewModelForEditingInput( input, key, value );
            } );
        }

        return dms.loadViewModelForEditing2( input.inputs ).then( function( response ) {
            if( _isDestroyed ) {
                return;
            }
            let propNamesToUpdate = editOptions ? editOptions.propertyNames : [];
            processJsonStringResponse( response.viewModelObjectsJsonStrings, uidToVMMap, propNamesToUpdate );
            if( isPropEditing ) {
                for( let j = 0; j < editOptions.vmos.length; j++ ) {
                    for( let i = 0; i < editOptions.propertyNames.length; i++ ) {
                        const prop = editOptions.vmos[ j ].props[ editOptions.propertyNames[ i ] ];
                        uwPropertyService.setEditable( prop, true );
                        uwPropertyService.setEditState( prop, true, true, true );
                    }
                }
                addSaveListener( editOptions );
            } else {
                _notifySaveStateChanged( 'starting', true );
            }
            policySvc.unregister( policyId );
            return response;
        }, function( error ) {
            editHandler._editing = false;
            policySvc.unregister( policyId );
        } );
    };

    /**
     * This function processes the response and replace the existing viewModelObject with the newly created VMO
     * @param {String[]} viewModelObjectsInJsonString - The viewModel objects json strings array
     * @param {Object[]} uidToVMMap - the Ui to VM object map
     * @param {String[]} [propsToUpdate] - (Optional) If provided, only these properties on the vmos with be updated
     */
    function processJsonStringResponse( viewModelObjectsInJsonString, uidToVMMap, propsToUpdate ) {
        var loadedObjects = dataSource.getLoadedViewModelObjects();
        _.forEach( viewModelObjectsInJsonString, function( viewModelObjectJsonString ) {
            var responseObject = parsingUtils.parseJsonString( viewModelObjectJsonString );
            if( responseObject && responseObject.objects && responseObject.objects.length > 0 ) {
                _.forEach( responseObject.objects, function( serverVMO ) {
                    var uid = serverVMO.uid;
                    var exisitingVMOs = uidToVMMap[ uid ] ? uidToVMMap[ uid ] : loadedObjects;
                    var updatedVMO = vmsvc.createViewModelObject( uid, 'EDIT', null, serverVMO );
                    vmsvc.updateSourceObjectPropertiesByViewModelObject( updatedVMO, exisitingVMOs, propsToUpdate );
                } );
            }
        } );
    }

    /**
     * Can we start editing?
     *
     * @return {Boolean} true if we can start editing
     */
    editHandler.canStartEdit = function() {
        return dataSource.canStartEdit();
    };

    /**
     * Is an edit in progress?
     *
     * @return {Boolean} true if we're editing
     */
    editHandler.editInProgress = function() {
        return this._editing;
    };

    /**
     * Cancel the current edit
     *
     * @param {Boolean} noPendingModifications - are there pending modifications? (optional)
     * @param {Boolean} ignoreLeaveHandler - don't remove leave handler
     */
    editHandler.cancelEdits = function( noPendingModifications, ignoreLeaveHandler ) {
        if( !ignoreLeaveHandler ) {
            leavePlaceService.registerLeaveHandler( null );
        }
        _notifySaveStateChanged( 'canceling', !noPendingModifications );
    };

    /**
     * Perform the actions post Save Edit
     *
     * @param {Boolean} saveSuccess Whether the save edit was successful
     */
    editHandler.saveEditsPostActions = function( saveSuccess ) {
        if( saveSuccess ) {
            leavePlaceService.registerLeaveHandler( null );
        }
        _notifySaveStateChanged( 'saved', saveSuccess );
    };

    /**
     * Save the current edits
     * @param {Boolean} isPartialSaveDisabled - flag to determine if partial save is disabled (Optional)
     * @param {Boolean} isAutoSave - flag to determine if this is an auto save (Optional)
     * @return {Promise} Promise that is resolved when save edit is complete
     */
    editHandler.saveEdits = function( isPartialSaveDisabled, isAutoSave ) {
        // Do not save edit if there are validation errors

        let hasValidationErrors = false;
        let editableViewModelProperties = dataSource.getAllEditableProperties();
        for( let prop of editableViewModelProperties ) {
            if( prop.error && prop.error.length > 0 ) {
                hasValidationErrors = true;
                break;
            }
        }

        if( hasValidationErrors ) {
            messagingSvc.showError( _validationError );
            if( isPartialSaveDisabled ) {
                _notifySaveStateChanged( 'canceling', false );
            }
            return AwPromiseService.instance.reject( _validationError );
        }

        // Get all properties that are modified
        let modifiedViewModelProperties = dataSource.getAllModifiedProperties();
        let modifiedPropsMap = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );

        // Prepare the SOA input
        let inputs = [];
        _.forEach( modifiedPropsMap, modifiedObj => {
            let viewModelObject = modifiedObj.viewModelObject;
            if( !viewModelObject || !viewModelObject.uid ) {
                viewModelObject = {
                    uid: cdm.NULL_UID,
                    type: 'unknownType'
                };
            }

            let viewModelProps = modifiedObj.viewModelProps;

            // 'sourceObjectLastSavedDate' and 'srcObjectTypeName' should be defined in viewModelProperty, if not then
            // we need to extract that info from viewModelObject and assign it.
            _.forEach( viewModelProps, prop => {
                if( !prop.sourceObjectLastSavedDate && viewModelObject.props && viewModelObject.props.last_mod_date ) {
                    prop.sourceObjectLastSavedDate = viewModelObject.props.last_mod_date.dbValues;
                }
                if( !prop.srcObjectTypeName && dataSource.getDataProvider() && dataSource.getDataProvider().columnConfig ) {
                    let columns = dataSource.getDataProvider().columnConfig.columns;
                    let propInfo = columns.find( element => element.propertyName === prop.propertyName );
                    if( propInfo ) {
                        prop.srcObjectTypeName = propInfo.typeName;
                    }
                }
            } );

            let input = dms.getSaveViewModelEditAndSubmitToWorkflowInput( viewModelObject );
            _.forEach( viewModelProps, props => dms.pushViewModelProperty( input, props ) );
            inputs.push( input );
        } );

        // Ensure editing flag is set temporarily to ensure correct saveHandler is retrieved
        if( isAutoSave ) {
            editHandler._editing = true;
            appCtxSvc.updateCtx( 'editInProgress', editHandler._editing );
        }

        let saveHandlerPromise = saveHandlerService.getSaveServiceHandlers( [ dataSource.getContextVMO() ] );
        let saveHandler = null;

        return saveHandlerPromise.then( saveHandlers => {
            // Unset editing flag now that saveHandlers are retrieved and to prevent save/cancel edit command appearing
            if( isAutoSave ) {
                editHandler._editing = false;
                appCtxSvc.updateCtx( 'editInProgress', editHandler._editing );
            }
            let appSaveHandler = saveHandlers ? saveHandlers[ 0 ] : [];
            if( appSaveHandler && appSaveHandler.saveEdits && appSaveHandler.isDirty ) {
                saveHandler = appSaveHandler;
            }
        } ).then( () => {
            if( saveHandler ) {
                return saveHandler.isDirty( dataSource );
            }
            return AwPromiseService.instance.resolve();
        } ).then( isDirty => {
            if( saveHandler && isDirty ) {
                return saveHandler.saveEdits( dataSource, inputs );
            }
            return AwPromiseService.instance.resolve();
        } ).then( () => {
            if( saveHandler ) {
                editHandler.saveEditsPostActions( true );
                return false;
            }
            return true;
        } ).then( saveHandlerActive => {
            if( saveHandlerActive && inputs.length > 0 ) {
                dataSource.registerPropPolicy();
                return dms.saveViewModelEditAndSubmitWorkflow( inputs );
            }
            return AwPromiseService.instance.resolve();
        } ).then( response => {
            if( response ) {
                let error = null;
                if( response.partialErrors || response.PartialErrors ) {
                    error = soaSvc.createError( response );
                } else if( response.ServiceData && response.ServiceData.partialErrors ) {
                    error = soaSvc.createError( response.ServiceData );
                }

                if( error ) {
                    let failureUids = [];
                    _.forEach( error.cause.partialErrors, partialError => failureUids.push( partialError.clientId ) );

                    updateLsdForPartialSavedVmos( response.viewModelObjectsJsonString, modifiedPropsMap );
                    if( isPartialSaveDisabled ) {
                        _notifySaveStateChanged( 'canceling', false );
                    } else {
                        _notifySaveStateChanged( 'partialSave', false, failureUids, modifiedPropsMap );
                    }

                    let errMessage = messagingSvc.getSOAErrorMessage( error );
                    messagingSvc.showError( errMessage );
                    dataSource.unregisterPropPolicy();
                    return AwPromiseService.instance.resolve();
                }
            }
            editHandler.saveEditsPostActions( true );
            dataSource.unregisterPropPolicy();
            return AwPromiseService.instance.resolve();
        }, error => {
            dataSource.unregisterPropPolicy();
            if( error ) {
                if( isPartialSaveDisabled ) {
                    _notifySaveStateChanged( 'canceling', false );
                }
                return AwPromiseService.instance.reject( error );
            }
        } );
    };

    /**
     * In case of partial save, update the LSD for partiaqlly saved view model objects
     *
     * @param {String} viewModelObjectsJsonString - VMO JSON string
     * @param {Object} modifiedPropsMap - Map of modified properties
     */
    function updateLsdForPartialSavedVmos( viewModelObjectsJsonString, modifiedPropsMap ) {
        _.forEach( viewModelObjectsJsonString, function( viewModelObjectJsonString ) {
            var responseObject = parsingUtils.parseJsonString( viewModelObjectJsonString );
            if( responseObject && responseObject.objects && responseObject.objects.length > 0 ) {
                _.forEach( responseObject.objects, function( serverVMO ) {
                    var uid = serverVMO.uid;
                    if( modifiedPropsMap[ uid ] ) {
                        var modifiedProps = modifiedPropsMap[ uid ].viewModelProps;
                        _.forEach( modifiedProps, function _iterateModifiedVmoProps( modifiedProp ) {
                            var serverVmoProp = serverVMO.props[ modifiedProp.propertyName ];
                            if( serverVmoProp ) {
                                modifiedProp.sourceObjectLastSavedDate = serverVmoProp.srcObjLsd;
                            }
                        } );
                    }
                } );
            }
        } );
    }

    /**
     * Create noty button
     *
     * @param {String} label
     * @param {Function} callback
     *
     * @return {Object} button object
     */
    function createButton( label, callback ) {
        return {
            addClass: 'btn btn-notify',
            text: label,
            onClick: callback
        };
    }

    /**
     * Check for dirty edits.
     *
     * @return {boolean} value based on viewmodel has some unsaved edits
     */
    editHandler.isDirty = function() {
        var self = this;
        var isDirty = false;

        if( self.editInProgress() ) {
            var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
            var gwtViewModels = dataSource.getGwtVMs();
            if( modifiedViewModelProperties && modifiedViewModelProperties.length > 0 ) {
                return AwPromiseService.instance.when( true );
            }

            if( dataSource.hasxrtBasedViewModel() && !isDirty && gwtViewModels.length > 0 && _xrtViewModelSvc ) {
                _.forEach( gwtViewModels, function( gwtVM ) {
                    isDirty = _xrtViewModelSvc.isViewModelDirty( gwtVM );
                    if( isDirty ) {
                        return false; // to break the loop
                    }
                } );
                return AwPromiseService.instance.when( isDirty );
            }

            var saveHandlerPromise = saveHandlerService
                .getSaveServiceHandlers( [ dataSource.getContextVMO() ] );
            return saveHandlerPromise.then( function( saveHandlers ) {
                var appSaveHandler = saveHandlers ? saveHandlers[ 0 ] : null;
                if( appSaveHandler && appSaveHandler.saveEdits && appSaveHandler.isDirty ) {
                    return appSaveHandler;
                }
            } ).then( function( saveHandler ) {
                if( saveHandler ) {
                    return saveHandler.isDirty( dataSource );
                }
                return AwPromiseService.instance.when( false );
            } );
        }
        return AwPromiseService.instance.when( false );
    };

    /**
     * get the datasource from the xrt
     *
     * @return {Object} dataSource - dataSource of the modified page
     */
    editHandler.getDataSource = function() {
        return dataSource;
    };

    /**
     * Display a notification message. Prevents duplicate popups from being active at the same time.
     *
     * @return {Promise} A promise resolved when option in popup is selected
     */
    var displayNotyMessage = function() {
        // If a popup is already active just return existing promise
        if( !editHandler._deferredPopup ) {
            editHandler._deferredPopup = AwPromiseService.instance.defer();

            var message = _multiLeaveConfirmation;
            var modifiedObject = null;
            var multipleObjects = false;

            var modifiedViewModelProperties = dataSource.getAllModifiedPropertiesWithVMO();
            if( modifiedViewModelProperties !== null ) {
                _.forEach( modifiedViewModelProperties, function( modifiedProperty ) {
                    var currentModifiedObject = modifiedProperty.viewModelObject;
                    if( modifiedObject === null ) {
                        modifiedObject = currentModifiedObject;
                    } else if( modifiedObject !== null && modifiedObject !== currentModifiedObject ) {
                        multipleObjects = true;
                    }
                } );
            }

            if( !multipleObjects ) {
                if( !modifiedObject ) {
                    modifiedObject = dataSource.getSourceObject().vmo;
                }
                /*
                   In case of the objects where object_string is empty , make use of the object_name if it is present on the VMO.
                   else it will show the defualt message.
                */
                if( modifiedObject ) {
                    var objectDataToReplace = modifiedObject.props.object_string && modifiedObject.props.object_string.uiValue ||
                        modifiedObject.props.object_name && modifiedObject.props.object_name.uiValue;
                    if( objectDataToReplace ) {
                        message = _singleLeaveConfirmation.replace( '{0}', objectDataToReplace );
                    }
                }
            }

            var buttonArray = [];
            buttonArray.push( createButton( _discardTxt, function( $noty ) {
                $noty.close();
                editHandler.cancelEdits();
                editHandler._deferredPopup.resolve();
                editHandler._deferredPopup = null;
            } ) );
            buttonArray.push( createButton( _saveTxt, function( $noty ) {
                $noty.close();
                editHandler.saveEdits().then( function() {
                    editHandler._deferredPopup.resolve();
                    editHandler._deferredPopup = null;
                }, function() {
                    editHandler._deferredPopup.resolve();
                    editHandler._deferredPopup = null;
                } );
            } ) );
            notySvc.showWarning( message, buttonArray );

            return editHandler._deferredPopup.promise;
        }

        return editHandler._deferredPopup.promise;
    };

    /**
     * Leave confirmation. If passed a callback will call the callback once it is ok to leave. Returns a promise
     * that is resolved when it is ok to leave.
     *
     * @param {Object} callback - async callback
     * @return {Promise} - promise that is resolved when leaveConfirmation is complete
     */
    editHandler.leaveConfirmation = function( callback ) {
        var self = this;
        return self.isDirty().then( function( isDirty ) {
            return isDirty;
        } ).then(
            function( isDirty ) {
                if( isDirty ) {
                    return displayNotyMessage().then( function() {
                        if( _.isFunction( callback ) ) {
                            callback();
                        }
                    } );
                } else if( dataSource && dataSource.hasxrtBasedViewModel() && self.editInProgress() ) {
                    if( _xrtViewModelSvc && dataSource.getSourceObject().xrtData.xrtViewModel ) {
                        _xrtViewModelSvc.checkEditHandler( dataSource.getSourceObject().xrtData.xrtViewModel )
                            .then( function() {
                                _notifySaveStateChanged( 'saved', false );
                                if( _.isFunction( callback ) ) {
                                    callback();
                                }
                            } );
                    }
                } else {
                    editHandler.cancelEdits( true );
                    if( _.isFunction( callback ) ) {
                        callback();
                    }
                }
                return AwPromiseService.instance.resolve();
            } );
    };

    editHandler.canEditSubLocationObjects = function() {
        return true;
    };

    editHandler.getSelection = function() {
        var contextVMO = dataSource.getContextVMO();
        if( contextVMO ) {
            return cdm.getObject( contextVMO.uid );
        }
        return null;
    };

    editHandler.destroy = function() {
        // Only deregister the leave handler if we are sure this edit handler's leave handler is the one registered
        leavePlaceService.deregisterLeaveHandler( _leaveHandler );
        removeSaveListener();
        dataSource = null;
        _isDestroyed = true;
    };

    return editHandler;
};

exports = {
    createEditHandler
};
export default exports;
/**
 * This factory creates an edit handler
 *
 * @memberof NgServices
 * @member editHandlerFactory
 */
app.factory( 'editHandlerFactory', () => exports );
