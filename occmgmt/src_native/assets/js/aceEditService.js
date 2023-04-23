// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 *
/**
 * @module js/aceEditService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import _appCtxSvc from 'js/appCtxService';
import _leavePlaceService from 'js/leavePlace.service';
import _localeSvc from 'js/localeService';
import _notyService from 'js/NotyModule';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';

let exports = {}; // eslint-disable-line no-invalid-this
var _singleLeaveConfirmation = null;
var _saveTxt = null;
var _discardTxt = null;
var dataSource = null;

export let _notifySaveStateChanged = function( stateName ) {
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
            case 'reset':
                break;
            default:
                logger.error( 'Unexpected stateName value: ' + stateName );
        }

        self._editing = stateName === 'starting';
        // Add to the appCtx about the editing state

        _appCtxSvc.updateCtx( 'editInProgress', self._editing );

        var context = {
            state: stateName
        };
        context.dataSource = dataSource.getSourceObject();
    }
    eventBus.publish( 'editHandlerStateChange', context );
};

/*Start editing*/
export let startEdit = function( dataSrc ) {
    dataSource = dataSrc;
    exports.loadConfirmationMessage();
    exports._notifySaveStateChanged( 'starting', true );
    //Register with leave place service
    _leavePlaceService.registerLeaveHandler( {
        okToLeave: function() {
            return exports.leaveConfirmation();
        }
    } );
};

/**
 * Can we start editing?
 *
 * @return {Boolean} true if we can start editing
 */
export let canStartEdit = function() {
    return true;
};

/**
 * Is an edit in progress?
 *
 * @return {Boolean} true if we're editing
 */
export let editInProgress = function() {
    return self._editing;
};

/**
 *
 * @return {Object} data source
 */
export let getDataSource = function() {
    return dataSource;
};

/**
 *
 * @param {boolean} noPendingModifications  pending Notifications
 */
export let cancelEdits = function( noPendingModifications ) {
    exports._notifySaveStateChanged( 'canceling', dataSource, !noPendingModifications );
    exports.cleanup();
};

/*Save Edits*/
export let saveEdits = function() {
    var promise = null;
    if( _appCtxSvc.ctx.aceActiveContext.context.aceEditService.saveEdits ) {
        promise = _appCtxSvc.ctx.aceActiveContext.context.aceEditService.saveEdits();
    }
    exports.cleanup();
    return promise;
};

/* Check if row is Dirty */
export let isDirty = function() {
    var isDirty = false;
    // Based on GRID editable state set the isDirty flag.
    isDirty = exports.editInProgress();
    return isDirty;
};

export let createButton = function( label, callback ) {
    return {
        addClass: 'btn btn-notify',
        text: label,
        onClick: callback
    };
};

// message Showing as Popup
export let displayNotificationMessage = function() {
    // If a popup is already active just return existing promise
    if( !self._deferredPopup ) {
        self._deferredPopup = AwPromiseService.instance.defer();

        var message = _singleLeaveConfirmation;
        var buttonArray = [];
        buttonArray.push( exports.createButton( _saveTxt, function( $noty ) {
            $noty.close();
            exports.saveEdits().then( function() {
                self._deferredPopup.resolve();
                self._deferredPopup = null;
            }, function() {
                self._deferredPopup.resolve();
                self._deferredPopup = null;
            } );
        } ) );
        buttonArray.push( exports.createButton( _discardTxt, function( $noty ) {
            $noty.close();
            exports.cancelEdits();
            if( _appCtxSvc.ctx.aceActiveContext.context.aceEditService.cancelEdits ) {
                _appCtxSvc.ctx.aceActiveContext.context.aceEditService.cancelEdits();
            }
            self._deferredPopup.resolve();
            self._deferredPopup = null;
        } ) );
        _notyService.showWarning( message, buttonArray );
        return self._deferredPopup.promise;
    }
    return self._deferredPopup.promise;
};

/**
 *   this is edit service leaveConfirmation in which call comes for ace edit service
 *   if viewMode Has been Changed to any of the summary view to Non summary view then directly show the PopUp
 *
 *   @param {Object} callback callBack Function
 *   @returns {leaveConfirmation}  promise Object
 */
export let leaveConfirmation = function( callback ) {
    if( exports.isDirty() ) {
        return exports.displayNotificationMessage().then( function() {
            if( callback && _.isFunction( callback ) ) {
                callback();
            }
        } );
    }
    return AwPromiseService.instance.resolve();
};

/**
 *load the message from message bundle
 */
export let loadConfirmationMessage = function() {
    if( _localeSvc ) {
        _localeSvc.getTextPromise( 'OccurrenceManagementMessages' ).then(
            function( textBundle ) {
                _singleLeaveConfirmation = textBundle.resetConfirmation;
            } );

        _localeSvc.getTextPromise( 'OccurrenceManagementConstants' ).then(
            function( textBundle ) {
                _saveTxt = textBundle.saveButtonText;
                _discardTxt = textBundle.discard;
            } );
    }
};

// clean up handlers.
export let cleanup = function() {
    _leavePlaceService.registerLeaveHandler( null );
};

export default exports = {
    _notifySaveStateChanged,
    startEdit,
    canStartEdit,
    editInProgress,
    getDataSource,
    cancelEdits,
    saveEdits,
    isDirty,
    createButton,
    displayNotificationMessage,
    leaveConfirmation,
    loadConfirmationMessage,
    cleanup
};
/**
 * @memberof NgServices
 * @member aceEditService
 * @param {Object} AwPromiseService.instance - $q
 * @param {Object} _appCtxSvc - _appCtxSvc
 * @param {Object} _leavePlaceService - _leavePlaceService
 * @param {Object} _localeSvc - _localeSvc
 * @param {Object} _notyService - _notyService
 */
app.factory( 'aceEditService', () => exports );
