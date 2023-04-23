// Copyright (c) 2020 Siemens

/**
 * @module js/editHandlerService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

// Map the context to the edit handler info
var m_context2EditHandlerInfo = {};

/** The last edit handler context activated */
var m_activeEditHandlerContext = {};

/**
 * Set the current edit handler
 *
 * @param {Object} handler - current edit handler
 * @param {Object} editHandlerContext - context
 */
export let setEditHandler = function( handler, editHandlerContext ) {
    if( !handler || !editHandlerContext ) {
        return;
    }
    var info = m_context2EditHandlerInfo[ editHandlerContext ];
    appCtxSvc.ctx[ editHandlerContext ] = handler;
    if( !info || handler !== info.editHandler ) {
        if( !info ) {
            info = {};
        }
        info.editHandler = handler;
        info.enable = true;
        m_context2EditHandlerInfo[ editHandlerContext ] = info;
        if( handler.hasOwnProperty( 'hasWrapper' ) ) {
            handler.addListener( this );
        }
        eventBus.publish( 'aw.setEditHandler', {} );
    }
};

/**
 * Get the default edit handler
 *
 * @param {String} editHandlerContext - edit handler context
 * @return the default edit handler
 */
export let getEditHandler = function( editHandlerContext ) {
    var info = m_context2EditHandlerInfo[ editHandlerContext ];
    if( !info ) {
        return null;
    }

    return info.editHandler;
};

/**
 * Set the edit handler enabled/disabled
 *
 * @param enabled is enabled?
 * @param editHandlerContext is enabled?
 * @returns true if enabled changed, false otherwise
 */
export let setEditHandlerEnabled = function( enabled, editHandlerContext ) {
    var info = m_context2EditHandlerInfo[ editHandlerContext ];
    if( info && info.enable !== enabled ) {
        info.enable = enabled;
        m_context2EditHandlerInfo[ editHandlerContext ] = info;
        return true;
    }

    return false;
};

/**
 * Get the current state of the edit handler, enabled/disabled
 *
 * @return True if edit is enabled, False otherwise
 */
export let isEditEnabled = function( editHandlerContext ) {
    var info = m_context2EditHandlerInfo[ editHandlerContext ];
    if( !info ) {
        return false;
    }
    return info.enable;
};

/**
 * Remove an edit handler
 *
 * @param editHandlerContext context associated with the edit handler
 */
export let removeEditHandler = function( editHandlerContext ) {
    appCtxSvc.unRegisterCtx( editHandlerContext );
    var info = m_context2EditHandlerInfo[ editHandlerContext ];
    if( info && info.editHandler && info.editHandler.destroy ) {
        info.editHandler.destroy();
    }
    delete m_context2EditHandlerInfo[ editHandlerContext ];
};

/**
 * Get all of the current edit handlers
 *
 * @return All of the current edit handlers
 */
export let getAllEditHandlers = function() {
    var editHandlers = [];
    for( var i in m_context2EditHandlerInfo ) {
        var info = m_context2EditHandlerInfo[ i ];
        if( info && info.editHandler !== null ) {
            editHandlers.push( info.editHandler );
        }
    }
    return editHandlers;
};

export let setActiveEditHandlerContext = function( context ) {
    m_activeEditHandlerContext = context;
};

export let getActiveEditHandler = function() {
    if( m_context2EditHandlerInfo[ m_activeEditHandlerContext ] &&
        m_context2EditHandlerInfo[ m_activeEditHandlerContext ].editHandler ) {
        return m_context2EditHandlerInfo[ m_activeEditHandlerContext ].editHandler;
    }
    return null;
};

/**
 * Check for dirty edits
 *
 * @return {Object} with a boolean flag isDirty, TRUE if there is an activeEditHandler and dirty edits for it
 */
export let isDirty = function() {
    var activeEditHandler = exports.getActiveEditHandler();
    if( activeEditHandler && activeEditHandler.isNative ) {
        return activeEditHandler.isDirty().then( function( isDirty ) {
            return {
                isDirty: isDirty
            };
        } );
    } else if( activeEditHandler ) {
        return AwPromiseService.instance.when( {
            isDirty: activeEditHandler.isDirty()
        } );
    }
    return AwPromiseService.instance.when( {
        isDirty: false
    } );
};

/**
 * Check for edit in progress
 *
 * @return {Object} with a boolean flag editInProgress, TRUE if there is an activeEditHandler and edit in progress
 */
export let editInProgress = function() {
    var activeEditHandler = exports.getActiveEditHandler();
    if( activeEditHandler ) {
        return {
            editInProgress: activeEditHandler.editInProgress()
        };
    }
    return {
        editInProgress: false
    };
};

/**
 * Start edits
 *
 * @param {Object} editOptions - additional options object to specify specfic prop to edit and autosave mode { vmo, propertyNames, autoSave } (Optional)
 * @return {Promise} A promise object
 */
export let startEdit = function( editOptions ) {
    var activeEditHandler = exports.getActiveEditHandler();
    if( activeEditHandler ) {
        return activeEditHandler.startEdit( editOptions );
    }
    return AwPromiseService.instance.reject( 'No active EditHandler' );
};

/**
 * Save edits
 *
 * @param {String} context - parameter for getting commandHandler (Optional)
 * @param {Boolean} isPartialSaveDisabled - flag to determine if partial save is disabled (Optional)
 * @param {Boolean} isAutoSave - flag to determine if this is an auto save (Optional)
 * @return {Promise} A promise object
 */
export let saveEdits = function( context, isPartialSaveDisabled, isAutoSave ) {
    var activeEditHandler;
    if( context ) {
        activeEditHandler = exports.getEditHandler( context );
    } else {
        activeEditHandler = exports.getActiveEditHandler();
    }
    if( activeEditHandler ) {
        return activeEditHandler.saveEdits( isPartialSaveDisabled, isAutoSave );
    }

    return AwPromiseService.instance.reject( 'No active EditHandler' );
};

/**
 * Perform the actions post Save Edit
 *
 * @param {Boolean} saveSuccess - Whether the save edit was successful or not
 */
export let saveEditsPostActions = function( saveSuccess ) {
    var activeEditHandler = exports.getActiveEditHandler();
    if( activeEditHandler ) {
        activeEditHandler.saveEditsPostActions( saveSuccess );
    }
};

/**
 * Cancel edits
 */
export let cancelEdits = function() {
    var activeEditHandler = exports.getActiveEditHandler();
    if( activeEditHandler ) {
        activeEditHandler.cancelEdits();
    }
};

/**
 * Leave confirmation. Returns a promise that is resolved when it is ok to leave.
 */
export let leaveConfirmation = function() {
    var activeEditHandler = exports.getActiveEditHandler();
    if( activeEditHandler ) {
        return AwPromiseService.instance( function( resolve ) {
            activeEditHandler.leaveConfirmation( resolve );
        } );
    }

    return AwPromiseService.instance.resolve();
};

exports = {
    setEditHandler,
    getEditHandler,
    setEditHandlerEnabled,
    isEditEnabled,
    removeEditHandler,
    getAllEditHandlers,
    setActiveEditHandlerContext,
    getActiveEditHandler,
    isDirty,
    editInProgress,
    startEdit,
    saveEdits,
    saveEditsPostActions,
    cancelEdits,
    leaveConfirmation
};
export default exports;
app.factory( 'editHandlerService', () => exports );
