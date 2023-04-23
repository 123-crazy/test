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
 * Workflow assignment edit service
 *
 * @module js/Awp0WorkflowAssignmentEditService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeSvc from 'js/localeService';
import notySvc from 'js/NotyModule';
import leavePlaceService from 'js/leavePlace.service';
import dataSourceService from 'js/dataSourceService';
import editHandlerService from 'js/editHandlerService';
import _ from 'lodash';

// Various services

var exports = {};

/**
 * Create edit handler
 *
 * @param {Object} data data view moedl object
 * @param {Function} startEditFunc the function reference for start edit logic
 * @param {Function} saveEditFunc the function reference for save edit logic
 * @param {Function} cancelEditFunc the function reference for cancel edit logic
 * @param {String} editContext Edit context string
 * @param {Object} editInProgressContext Edit context that will provide information that we are in edit mode or not
 * @param {Boolean} isAutoSaveSupported Specifies if auto save is supported
 *
 *
 */
export let createEditHandlerContext = function( data, startEditFunc, saveEditFunc, cancelEditFunc, editContext, editInProgressContext, isAutoSaveSupported ) {
    var dataSource = dataSourceService.createNewDataSource( {
        declViewModel: data
    } );

    // Create edit handler object and start edit
    var editHandler = _createEditHandler( dataSource, startEditFunc, saveEditFunc, cancelEditFunc, editContext, editInProgressContext );
    if( editHandler ) {
        editHandlerService.setEditHandler( editHandler, editContext );
        editHandlerService.setActiveEditHandlerContext( editContext );
        editHandler.startEdit();
        editHandler.isAutoSaveEnabled = isAutoSaveSupported;
    }
};

/**
 * Get the current active edit handler and call cancel edits on that handler
 */
export let cancelEdits = function() {
    var editHandler = editHandlerService.getActiveEditHandler();
    if( editHandler ) {
        editHandler.cancelEdits();
    }
};

/**
 * Get the current active edit handler and call save edits on that handler
 */
export let saveEdits = function() {
    var editHandler = editHandlerService.getActiveEditHandler();
    if( editHandler ) {
        editHandler.saveEdits();
    }
};

export let getActiveEditHandler = function() {
    return editHandlerService.getActiveEditHandler();
};

/**
 * Create edit handler
 *
 * @param {Object} dataSource let's use the DeclViewModel.vmo object as the dataSource? What would that mean/allow?
 * @param {Function} startEditFunc the function reference for start edit logic
 * @param {Function} saveEditFunc the function reference for save edit logic
 * @param {Function} cancelEditFunc the function reference for cancel edit logic
 * @param {String} editContext Edit context string
 * @param {Object} editInProgressContext Edit context that will provide information that we ar ein edit mode or not
 *
 * @return {Object} edit handler object
 */
var _createEditHandler = function( dataSource, startEditFunc, saveEditFunc, cancelEditFunc, editContext, editInProgressContext ) {
    var editHandler = {
        // Mark this handler as native - checked from GWT jsni code
        isNative: true,
        _editing: false
    };

    // per handler instance members
    var _startEditFunction = startEditFunc; // provided function refs for start/save.
    var _saveEditsFunction = saveEditFunc;
    var _cancelEditFunc = cancelEditFunc;

    var _leaveConfirmationMessage = null;
    var _saveTxt = null;
    var _discardTxt = null;

    if( localeSvc ) {
        localeSvc.getTextPromise( 'InboxMessages' ).then(
            function( textBundle ) {
                _leaveConfirmationMessage = textBundle.navigationConfirmation;
                _saveTxt = textBundle.save;
                _discardTxt = textBundle.discard;
            } );
    }

    /**
     * Check if input method name is function then only call that function and return response
     * else return empty response as success.
     *
     * @param {Object} defer Defer obejct
     * @param {String} methodName Method name to check if exist then call else return empty response
     */
    var _executeMethod = function( defer, methodName ) {
        if( !_.isFunction( methodName ) ) {
            defer.resolve( null );
        } else {
            // instead of soa - call provided start edit function.
            methodName().then( function( response ) {
                defer.resolve( response );
            }, function( err ) {
                defer.reject( err );
            } );
        }
    };

    /**
     * Start editing
     *
     * @return {Object} promise
     */
    editHandler.startEdit = function() {
        var defer = AwPromiseService.instance.defer();

        // Execute the startEdit function if not null and return the
        // response
        _executeMethod( defer, _startEditFunction );

        //Register with leave place service
        leavePlaceService.registerLeaveHandler( {
            okToLeave: function() {
                return editHandler.leaveConfirmation();
            }
        } );

        return defer.promise;
    };

    /**
     * Is an edit in progress?
     *
     * @return {Boolean} true if we're editing
     */
    editHandler.editInProgress = function() {
        if( editInProgressContext ) {
            return editInProgressContext;
        }
        return this._editing;
    };

    /**
     * Is an edit in progress? This is specific for PAL manage
     * @param {Object} data view model object
     * @return {Boolean} true if we're editing
     */
    editHandler.editInProgressInternal = function( data ) {
        var modifiedPropCount = dataSource.getAllModifiedProperties().length;
        if( data && data._internal && data._internal.panelId === 'Awp0TemplateAssignment' ) {
            if( data.palName.valueUpdated || data.palDesc.valueUpdated || data.isSharedOption.valueUpdated ) {
                return true;
            }
        }
        if( modifiedPropCount === 0 ) {
            return false;
        }
        return true;
    };

    /**
     * Cancel the current edit
     *
     * @param {Boolean} ignoreLeaveHandler Remove place handler registration
     * @return {Promise} Promise that is resolved when save edit is complete
     */
    editHandler.cancelEdits = function( ignoreLeaveHandler ) {
        var defer = AwPromiseService.instance.defer();

        // Execute the cancelEdits function if not null and return the
        // response
        _executeMethod( defer, _cancelEditFunc );

        editHandlerService.removeEditHandler( editContext );
        if( !ignoreLeaveHandler ) {
            leavePlaceService.registerLeaveHandler( null );
        }

        return defer.promise;
    };

    /**
     * Save the current edits
     *
     * @param {Boolean} ignoreLeaveHandler Remove place handler registration
     * @return {Promise} Promise that is resolved when save edit is complete
     */
    editHandler.saveEdits = function( ignoreLeaveHandler ) {
        var defer = AwPromiseService.instance.defer();
        // Execute the save edit function if not null and return the
        // response
        _executeMethod( defer, _saveEditsFunction );

        editHandlerService.removeEditHandler( editContext );
        if( !ignoreLeaveHandler ) {
            leavePlaceService.registerLeaveHandler( null );
        }
        return defer.promise;
    };

    /**
     * Create noty button
     *
     * @param {String} label string
     * @param {Function} callback function
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
        var data = null;
        // Check if dataSource is not null and valid then only get the data from it
        if( dataSource && dataSource.getDeclViewModel() ) {
            data = dataSource.getDeclViewModel();
        }
        if( data && data._internal && ( data._internal.panelId === 'Awp0TemplateAssignment' ||
                data._internal.panelId === 'Awp0TaskPropertiesTab' || data.vmo ) ) {
            return self.editInProgressInternal( data );
        }

        if( self.editInProgress() ) {
            return AwPromiseService.instance.when( true );
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
        //If a popup is already active just return existing promise
        if( !editHandler._deferredPopup ) {
            editHandler._deferredPopup = AwPromiseService.instance.defer();
            var message = _leaveConfirmationMessage;

            var buttonArray = [];
            buttonArray.push( createButton( _saveTxt, function( $noty ) {
                $noty.close();
                editHandler.saveEdits().then( function() {
                    editHandler._deferredPopup.resolve();
                    editHandler._deferredPopup = null;
                }, function() {
                    // there is a lot of missing logic for reject path, which can leave the UI
                    // in a wonky state.  So adding this bit of logic such that during the reject
                    // flow, at least the navigation will continue similar to the happy path.  No way
                    // to "stop/pause" aside from showing the error message, but at least the ui doesn't end up
                    // with mixed navigation state.
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
     *
     * @return {Object} promise
     */
    editHandler.leaveConfirmation = function( callback ) {
        var self = this;
        if( self.isDirty() ) {
            /* If auto save is not enabled then display save/discard notification
            * If auto save is enabled then dont display the message and directly perform the save*/
            if( !self.isAutoSaveEnabled ) {
                return displayNotyMessage().then( function() {
                if( _.isFunction( callback ) ) {
                    callback();
                }
            } );
        }

        return editHandler.saveEdits().then( function() {
                if( _.isFunction( callback ) ) {
                    callback();
                }
            } );
        }
        editHandler.cancelEdits( true );
        if( _.isFunction( callback ) ) {
            callback();
        }
        return AwPromiseService.instance.resolve();
    };

    editHandler.destroy = function() {
        dataSource = null;
    };

    return editHandler;
};

export default exports = {
    createEditHandlerContext,
    cancelEdits,
    saveEdits,
    getActiveEditHandler
};
app.factory( 'Awp0WorkflowAssignmentEditService', () => exports );
