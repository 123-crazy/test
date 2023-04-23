// Copyright (c) 2020 Siemens

/**
 * This is the command handler for copy link.
 *
 * @module js/shareURLCommandHandler
 */
import app from 'app';

// Service
import ClipboardService from 'js/clipboardService';

var exports = {};

/**
 * Cached ClipBoardService
 */

/**
 * Copies the content to OS clipboard
 */
export let execute = function( context ) {
    ClipboardService.instance.copyUrlToClipboard( context );
};

/**
 * @member shareURLCommandHandler
 */

exports = {
    execute
};
export default exports;

app.factory( 'shareURLCommandHandler', () => exports );
