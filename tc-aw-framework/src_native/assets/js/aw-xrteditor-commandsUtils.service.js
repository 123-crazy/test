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
 * commandsService Service Object
 *
 * @module js/aw-xrteditor-commandsUtils.service
 */
import app from 'app';
import AwInjectorService from 'js/awInjectorService';
import ngModule from 'angular';
import cmdConfig from 'js/aw-xrteditor-commandListUtils.service';

let exports;
export let commands = cmdConfig.commands;
export let getCommands = function( scope, area ) {
    var commandsArray = [];
    var retCommands = {};

    function compare( a, b ) {
        if( a.priorities[ 0 ] > b.priorities[ 0 ] ) {
            return -1;
        }
        if( a.priorities[ 0 ] < b.priorities[ 0 ] ) {
            return 1;
        }
        return 0;
    }

    function compare2( a, b ) {
        if( a.priorities[ 0 ] < b.priorities[ 0 ] ) {
            return -1;
        }
        if( a.priorities[ 0 ] > b.priorities[ 0 ] ) {
            return 1;
        }
        return 0;
    }

    ngModule.forEach( this.commands, function( command, commandId ) {
        if( command.areas ) {
            for( var j = 0; j < command.areas.length; j++ ) {
                if( command.areas[ j ] === area ) {
                    command.visible = false;
                    commandsArray.push( command );
                    break;
                }
            }
        }
    } );

    ngModule.forEach( commandsArray, function( command, index ) {
        if( command.initialize ) {
            command.initialize( command, scope, AwInjectorService.instance );
        }
    } );

    if( area === 'com.siemens.splm.clientfx.ui.toolsAndInfoCommands' ) {
        commandsArray.sort( compare2 );
    } else {
        commandsArray.sort( compare );
    }

    ngModule.forEach( commandsArray, function( command, index ) {
        retCommands[ command.title ] = command;
    } );

    return retCommands;
};

export default exports = {
    commands,
    getCommands
};
/**
 * TODO
 *
 * @memberof NgServices
 * @member commandsService
 */
app.factory( 'commandsService', () => exports );
