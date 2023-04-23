// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module define graph command service
 *
 * @module js/graphCommandService
 */
import _ from 'lodash';
import iconService from 'js/iconService';


'use strict';

var exports = {};

export let startEdit = function( graphModel ) {
    if( graphModel ) {
        var editInputMode = 'editInputMode';

        // set edit input mode
        graphModel.config.inputMode = editInputMode;
    }
};

export let exitEdit = function( graphModel ) {
    if( graphModel ) {
        var graphViewerInputMode = 'viewInputMode';

        // set view input mode
        graphModel.config.inputMode = graphViewerInputMode;
    }
};

var getSVGImageString = function( iconString ) {
    var start = iconString.indexOf( '<svg' );
    var end = iconString.indexOf( '</div>' );
    var svgIconString = iconString.substring( start, end );
    return svgIconString
        .replace( /<svg/g,
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="aw-base-icon"' );
};

var _getCommandImageString = ( cmdId ) => {
    return '<div class="aw-commands-svg">' + iconService.getIcon( cmdId ) + '</div>';
};

export let getCommandsBindData = function( commands ) {
    var bindData = {};
    _.forEach( commands, function( command ) {
        if( command && command.iconId ) {
            var commandId = command.commandId;
            bindData[ commandId + '_id' ] = commandId;
            bindData[ commandId + '_icon' ] = getSVGImageString( _getCommandImageString( command.iconId ) );
            bindData[ commandId + '_tooltip' ] = command.title;
            bindData[ commandId + '_selected' ] = false;
        }
    } );
    return bindData;
};

export default exports = {
    startEdit,
    exitEdit,
    getCommandsBindData
};
