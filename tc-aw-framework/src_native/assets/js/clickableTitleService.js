// Copyright (c) 2020 Siemens

/**
 * Service for clickable cell titles
 *
 * @module js/clickableTitleService
 */
import app from 'app';
import AwTimeoutService from 'js/awTimeoutService';
import commandService from 'js/command.service';
import configurationSvc from 'js/configurationService';
import 'js/appCtxService';

/**
 * clickableTitleService factory
 */

var exports = {};
var timeoutPromise;
var isDoubleClick;

/**
 * Returns whether clickable cell title actions have been configured or not
 *
 * @return {Boolean} true if clickable cell title actions have been configured in the solution def
 */

export let hasClickableCellTitleActions = function() {
    return Boolean( exports.getClickableCellTitleActions() );
};

/**
 * Get the commands configured against different types of clicks from the solution defintion
 * @return {Object} clickableCellTitleActions json object holding command id for different types of clicks
-*/
export let getClickableCellTitleActions = function() {
    var solDef = configurationSvc.getCfgCached( 'solutionDef' );
    return solDef ? solDef.clickableCellTitleActions : null;
};

/**
 * Executes appropriate action on click as configured in clickable cell title actions
 *
 * @param {Object} $event - click event
 * @param {Object} context - additional context to execute the command with
 */
export let doIt = function( $event, context ) {
    $event.stopPropagation();
    var event = $event;
    if( timeoutPromise ) {
        AwTimeoutService.instance.cancel( timeoutPromise );
        isDoubleClick = true;
    }

    var clickableCellTitleActions = exports.getClickableCellTitleActions();
    timeoutPromise = AwTimeoutService.instance( function() {
        // var clickType = isDoubleClick ? 'doubleClick' : event.ctrlKey ? 'ctrlClick' : event.shiftKey ? 'shiftClick' : 'click';
        var clickType = 'click';
        if( isDoubleClick ) {
            clickType = 'doubleClick';
        } else if( event.ctrlKey ) {
            clickType = 'ctrlClick';
        } else if( event.shiftKey ) {
            clickType = 'shiftClick';
        }
        isDoubleClick = false;
        timeoutPromise = null;

        // execute command for click or ctrl click or shift click or double click accordingly
        if( clickableCellTitleActions ) {
            commandService.executeCommand( clickableCellTitleActions[ clickType ], null, null, context );
        }
    }, 300 );
};

exports = {
    hasClickableCellTitleActions,
    getClickableCellTitleActions,
    doIt
};
export default exports;
app.factory( 'clickableTitleService', () => exports );
