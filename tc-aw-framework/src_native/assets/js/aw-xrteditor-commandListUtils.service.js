// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global


 */

/**
 * @module js/aw-xrteditor-commandListUtils.service
 */
import * as app from 'app';

export default {
    commands: {
        'com.siemens.splm.clientfx.tcui.commands.cancelEdits': {
            iconUrl: app.getBaseUrlPath() + '/image/cmdCancelEdit24.svg',
            title: 'Cancel Edits',
            areas: [ 'com.siemens.splm.clientfx.ui.oneStepCommands' ],
            priorities: [ 11000 ],
            initialize: function( command, scope, injector ) {
                import( 'js/aw-xrteditor-cancelEditUtils.service' ).then( function( handler ) {
                    command.handler = handler;
                    handler.initialize( command, scope, injector );
                } );
            },
            id: 'cmdCancelEdit'
        },
        'com.siemens.splm.clientfx.tcui.commands.startEdit': {
            iconUrl: app.getBaseUrlPath() + '/image/cmdEdit24.svg',
            title: 'Start Edit',
            areas: [ 'com.siemens.splm.clientfx.ui.oneStepCommands' ],
            priorities: [ 11000 ],
            initialize: function( command, scope, injector ) {
                import( 'js/aw-xrteditor-startEditUtils.service' ).then( function( handler ) {
                    command.handler = handler;
                    handler.initialize( command, scope, injector );
                } );
            },
            id: 'cmdEdit'
        },
        'com.siemens.splm.clientfx.tcui.commands.saveEdits': {
            iconUrl: app.getBaseUrlPath() + '/image/cmdSave16.svg',
            title: 'Save Edits',
            areas: [ 'com.siemens.splm.clientfx.ui.oneStepCommands' ],
            priorities: [ 10900 ],
            initialize: function( command, scope, injector ) {
                import( 'js/aw-xrteditor-saveEditUtils.service' ).then( function( handler ) {
                    command.handler = handler;
                    handler.initialize( command, scope, injector );
                } );
            },
            id: 'cmdSave'
        }
    }
};
