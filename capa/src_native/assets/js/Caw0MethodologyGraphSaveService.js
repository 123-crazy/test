// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This implements the graph Diagram Edit handler along with the save features
 * functionalities for Architecture tab
 *
 * @module js/Caw0MethodologyGraphSaveService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import appCtxSvc from 'js/appCtxService';
import notyService from 'js/NotyModule';
import localeService from 'js/localeService';
import editHandlerService from 'js/editHandlerService';
import soaService from 'soa/kernel/soaService';
import dataSourceService from 'js/dataSourceService';
import CAW0EditTreeStructure from 'js/CAW0EditTreeStructure';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

import 'soa/kernel/clientMetaModel';

import 'js/leavePlace.service';

var exports = {};

var methodologyContext = 'METHODOLOGY_EDIT_CONTEXT';
var _originalValueOfHasPendingChanges = 0;
var _leavePageListener = null;
var _singleLeaveConfirmation = null;
var _saveTxt = null;
var _discardTxt = null;

/**
 * an array for all the leaveActivators
 */
var LEAVE_ACTIVATORS = [ 'leaveConfirmByHomeOrBack', 'leaveConfirmByAdvanceSearch', 'leaveConfirmByExpandParentFromAce', 'leaveConfirmBySelectionChange' ];

/**
 *this function register the diagram editHandler called after draw graph and whenever we make change in diagram
 * @param {Object} data  data
 */
export let registerGraphEditHandler = function( data ) {
    setEditAndLeaveHandler( data );
};

/**
 * subscribe for appCtx.update in from RCA Navigation
 */
var subscribeLocationChangeListener = function() {
    if( !_leavePageListener ) {
        _leavePageListener = eventBus.subscribe( 'appCtx.update', function( eventData ) {
            if( diagramEditInProgress() ) {
                setToDiagramCtx( 'leaveConfirmByHomeOrBack', true );
            }
        } );
    }
};

/**
 *load the message from message bundle
 */
var loadConfirmationMessage = function() {
    if( localeService ) {
        localeService.getTextPromise( 'editHandlerMessages' ).then(
            function( messageBundle ) {
                _singleLeaveConfirmation = messageBundle.leaveGraphConfirmation;
            } );
    }
};

/**
 * remove the leaveActivator from diagramming context
 * @argument {String} leaveConformers value for checkout visibility
 */
var removeAllLeaveActivator = function( leaveConformers ) {
    _.forEach( leaveConformers, function( leaveCausingItem ) {
        checkAndDeactivateLeaveActivator( leaveCausingItem );
    } );
};
/**
 * disable the leaveCausingItem from diagramming context
 * @argument {String} leaveCausingItem value for checkout visibility
 */
var checkAndDeactivateLeaveActivator = function( leaveCausingItem ) {
    var path = 'ctx.architectureCtx.diagram.' + leaveCausingItem;
    if( _.get( appCtxSvc, path, false ) ) {
        _.set( appCtxSvc, path, false );
    }
};
/**
 * set values to diagramming context
 * @argument {ctxPath} ctxPath contextPath
 * @argument {String} value value
 */
var setToDiagramCtx = function( ctxPath, value ) {
    var path = 'ctx.architectureCtx.diagram.' + ctxPath;
    _.set( appCtxSvc, path, value );
};

var unsubscribeAndLeaveActivatorsEvents = function() {
    if( _leavePageListener ) {
        eventBus.unsubscribe( 'appCtx.update' );
        _leavePageListener = null;
    }
};

//clean and reset vars after save or cancel.
var cleanup = function() {
    _originalValueOfHasPendingChanges = 0;
    setHasPendingChangeToArchCtx( false );
    exports.removeEditAndLeaveHandler();

    removeAllLeaveActivator( LEAVE_ACTIVATORS );
    unsubscribeAndLeaveActivatorsEvents();
};

var setEditAndLeaveHandler = function( data ) {
    var dataSource = dataSourceService.createNewDataSource( {
        declViewModel: data
    } );

    var startEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();

        deferred.resolve( {} );
        return deferred.promise;
    };

    //create Edit Handler
    var editHandler = createEditHandler( dataSource, startEditFunc );
    //registerEditHandler
    if( editHandler ) {
        editHandlerService.setEditHandler( editHandler, methodologyContext );
        editHandlerService.setActiveEditHandlerContext( methodologyContext );
        //editHandler.startEdit();
    }
};

/**
 * Remove Edit Handler and unregister LEave Handler
 */
export let removeEditAndLeaveHandler = function() {
    editHandlerService.removeEditHandler( methodologyContext );
};
/**
 *
 * @param {Object} dataSource    dataSource
 * @param {Object} startEditFunction startEdit function
 * @returns {Object} editHandler editHandler
 */
var createEditHandler = function( dataSource, startEditFunction ) {
    var editHandler = {
        // Mark this handler as native -
        isNative: true,
        _editing: false
    };
    editHandler.getEditHandlerContext = function() {
        return methodologyContext;
    };
    var _startEditFunction = startEditFunction; // provided function refs for start/save.

    /**
     * @param {String} stateName - edit state name ('starting', 'saved', 'cancelling')
     */
    function _notifySaveStateChanged( stateName ) {
        var context;
        if( dataSource ) {
            switch ( stateName ) {
                case 'starting':
                    break;
                case 'saved':
                    dataSource.saveEditiableStates();
                    break;
                case 'canceling':
                    dataSource.resetEditiableStates();
                    break;
                default:
                    logger.error( 'Unexpected stateName value: ' + stateName );
            }

            editHandler._editing = stateName === 'starting';
            // Add to the appCtx about the editing state

            appCtxSvc.updateCtx( 'editInProgress', editHandler._editing );

            context = {
                state: stateName
            };
            context.dataSource = dataSource.getSourceObject();
        } else {
            context = {
                state: stateName
            };
        }
        eventBus.publish( 'editHandlerStateChange', context );
    }
    /*Start editing*/
    editHandler.startEdit = function() {
        var defer = AwPromiseService.instance.defer();
        _startEditFunction().then( function( response ) {
            _notifySaveStateChanged( 'starting', true );
            defer.resolve( response );
        }, function( err ) {
            defer.reject( err );
        } );
        return defer.promise;
    };
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
        return false;
    };
    /**
     *
     * @param {boolean} noPendingModifications  pending Notifications
     */
    editHandler.cancelEdits = function( noPendingModifications ) {
        cleanup();
        _notifySaveStateChanged( 'canceling', !noPendingModifications );
    };

    /*Save Edits*/
    editHandler.saveEdits = function() {
        var deffer = AwPromiseService.instance.defer();
        var promise = saveGraphAsync();
        promise.then( function( response ) {
                var data = {};
                data.serviceData = response;
                CAW0EditTreeStructure.updateTreeTable( appCtxSvc.ctx, data );
                deffer.resolve();
            } )
            .catch( function( error ) {
                cleanup();
                _notifySaveStateChanged( 'saved', false );
                deffer.reject( error );
            } );
        cleanup();
        return deffer.promise;
    };

    /**
     * Perform the actions post Save Edit
     *
     * @param {Boolean} Whether the save edit was successful
     */
    editHandler.saveEditsPostActions = function( saveSuccess ) {
        cleanup();
        _notifySaveStateChanged( 'saved', saveSuccess );
    };

    /*Check if diagram IS Dirty */
    editHandler.isDirty = function() {
        var deferred = AwPromiseService.instance.defer();
        var isDirty = diagramEditInProgress();
        deferred.resolve( isDirty );
        return deferred.promise;
    };

    /**
     *
     * @param {String} label button label
     * @param {AsyncFUnction} callback callBack
     * @returns {Object} button Object
     */
    function createButton( label, callback ) {
        return {
            addClass: 'btn btn-notify',
            text: label,
            onClick: callback
        };
    }
    editHandler.getDataSource = function() {
        return dataSource;
    };

    editHandler.destroy = function() {
        dataSource = null;
    };
    //message Showing as Popup
    var displayNotificationMessage = function() {
        //If a popup is already active just return existing promise
        if( !editHandler._deferredPopup ) {
            editHandler._deferredPopup = AwPromiseService.instance.defer();
        }
        if( localeService ) {
            localeService.getTextPromise( 'editHandlerMessages' ).then(
                function( messageBundle ) {
                    _singleLeaveConfirmation = messageBundle.navigationConfirmationMultiple;
                    _saveTxt = messageBundle.save;
                    _discardTxt = messageBundle.discard;
                    var buttonArray = [];
                    buttonArray.push( createButton( _saveTxt, function( $noty ) {
                        $noty.close();
                        editHandler.saveEdits().then( function() {
                            editHandler._deferredPopup.resolve();
                            editHandler._deferredPopup = null;
                            //incase of error
                        }, function() {
                            editHandler._deferredPopup.resolve();
                            editHandler._deferredPopup = null;
                        } );
                    } ) );
                    buttonArray.push( createButton( _discardTxt, function( $noty ) {
                        $noty.close();
                        editHandler.cancelEdits();
                        editHandler._deferredPopup.resolve();
                        editHandler._deferredPopup = null;
                    } ) );

                    notyService.showWarning( _singleLeaveConfirmation, buttonArray );
                } );
        }

        return editHandler._deferredPopup.promise;
    };

    /**
     *   this is editHandler leaveConfirmation in which call comes for editHandlerService
     *   if viewMode Has been Changed to any of the summary view to Non summary view then directly show the PopUp
     *
     *   @param {Object} callback callBack Function
     *   @returns {leaveConfirmation}  promise Object
     */
    editHandler.leaveConfirmation = function( callback ) {
        //update if call made By ViewMode Change
        return leaveConfirmation( callback );
    };

    /**
     * This is the common code of leaveConfirmation
     * if diagram is dirty
     * return promise
     * @param {Object} callback callBack Function
     * @returns {deferred.promise}  promise Object
     */
    var leaveConfirmation = function( callback ) {
        var deferred = AwPromiseService.instance.defer();
        if( diagramEditInProgress() ) {
            displayNotificationMessage().then( function() {
                processCallBack( callback );
                deferred.resolve();
            } );
        } else {
            editHandler.cancelEdits();
        }
        return deferred.promise;
    };
    return editHandler;
};

/**
 *Handle the callback function which has been came in leaveConfirmation
    if call back is a valid callback
    then call callback.
    if leaveConfirmCounter is more than 2 then reset the leaveConfirmBySelectionChange to zero.
    since in case of selection change call comes to leaveConfirmation twice
    we fire events so that edit handler remain register in diagramming context since leave handler is unregistered after some time
 * @param {function} callback callback function to be processed
 */
var processCallBack = function( callback ) {
    if( callback && _.isFunction( callback ) ) {
        callback();
    }
    if( _originalValueOfHasPendingChanges >= 2 ) {
        _originalValueOfHasPendingChanges = 0;
        checkAndDeactivateLeaveActivator( 'leaveConfirmBySelectionChange' );
    }
};
/**
 * @return {Boolean} true if diagram is Dirty or we are editing the diagram
 */
var diagramEditInProgress = function() {
    return _.get( appCtxSvc, 'ctx.architectureCtx.diagram.hasPendingChanges', false );
};
/**
 *set the hasPendingChange in ctx.
 * @param {boolean}  hasPendingChanges  to context
 */
export let setHasPendingChange = function( hasPendingChanges ) {
    setHasPendingChangeToArchCtx( hasPendingChanges );
    //Since save diagram completed by now,process save working Context if case of explicit save
    if( !hasPendingChanges && _.get( appCtxSvc, 'ctx.architectureCtx.diagram.isExplicitSaveDiagram', false ) &&
        diagramEditInProgress() ) {
        //also update save working context. only for the case of Save Diagram One-step Command.
        eventBus.publish( 'AMGraphEvent.updateSavedWorkingContext', {} );
        //cleanup after explicit save.
        cleanup();
    }
};
/**
 *on specific event from graph viewModel diagram is marked dirty.
    if Graph has update
        then hasPendingChange to true in ctx
 * @param {boolean} hasPendingChanges flag is set To ctx
 */
export let markGraphAsDirty = function( hasPendingChanges ) {
    //going to start save Diagram
    if( hasPendingChanges ) {
        setHasPendingChangeToArchCtx( hasPendingChanges );
        loadConfirmationMessage();
        subscribeLocationChangeListener();
        setEditAndLeaveHandler();
    }
};

/**
 *on specific event from graph viewModel diagram is marked prestine.
 * @param {boolean} hasPendingChanges flag is set To ctx
 */
export let resetEditHandler = function( hasPendingChanges, data ) {
    //going to start save Diagram
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if( !hasPendingChanges ) {
        CAW0EditTreeStructure.updateTreeTable( appCtxSvc.ctx, data );
        activeEditHandler.cancelEdits();
    }
};

/**
 * @param {boolean} hasPendingChanges  set hasPending Change to ctx
 */
var setHasPendingChangeToArchCtx = function( hasPendingChanges ) {
    setToDiagramCtx( 'hasPendingChanges', hasPendingChanges );
};

/**
 *save diagram from confirmation dialogue on selection of Save
 @returns {Object}  promise
 */
var saveGraphAsync = function() {
    var deferred = AwPromiseService.instance.defer();
    var ctx = appCtxSvc.ctx;
    var edittedObjects = [];
    ctx.graphEdittedData.map( function( obj ) {
        var type;
        switch ( obj.category ) {
            case 'Cause':
                type = 'CAW0Defect';
                break;
            case 'Why':
                type = 'CAW0Defect';
                break;
            case 'Ishikawa':
                type = 'CAW0Ishikawa';
                break;
            case '5Why':
                type = 'CAW05Why';
                break;
        }
        var vecNameVal = [];
        obj.updatedProperties.forEach( property => {
            var updatedProp = {
                name: property.propertyName,
                values: [
                    property.newValue
                ]
            };
            vecNameVal.push( updatedProp );
        } );
        edittedObjects.push( {
            object: {
                uid: obj.id,
                type: type
            },
            timestamp: '',
            vecNameVal: vecNameVal
        } );
    } );
    var updatedPropertiesInput = {
        info: edittedObjects
    };
    var promise = soaService.post( 'Core-2010-09-DataManagement',
        'setProperties', updatedPropertiesInput );

    promise.then( function( response ) {
            //Reset HasPendingChange
            setHasPendingChangeToArchCtx( false );
            deferred.resolve( response );
        } )
        .catch( function( error ) {
            deferred.reject( error );
        } );
    return deferred.promise;
};

export default exports = {
    registerGraphEditHandler,
    removeEditAndLeaveHandler,
    setHasPendingChange,
    markGraphAsDirty,
    resetEditHandler
};
app.factory( 'Caw0MethodologyGraphSaveService', () => exports );
