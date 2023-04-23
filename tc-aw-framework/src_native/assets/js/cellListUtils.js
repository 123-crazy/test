// Copyright (c) 2020 Siemens

/**
 * Cell List Utils
 *
 * @module js/cellListUtils
 */
import ngModule from 'angular';

var exports = {};

/**
 * Create a cell list configuration object
 *
 * @param {String} commands - List of Commands
 * @param {String} selectionMode - "single" or "multiple"
 * @param {Boolean} dragNDrop - True if drag n drop supported
 *
 * @return {Object} configuration object
 */
export let createCellListConfig = function( commands, selectionMode, dragNDrop ) {
    var config = {};
    config.selectMode = selectionMode;
    config.commands = commands;
    config.dragNDrop = dragNDrop;

    return config;
};

/**
 * check whether this $element is visible in DOM
 */
export let elemIsVisible = function( $element ) {
    var elem = ngModule.element( $element[ 0 ] );

    return Boolean( elem[ 0 ].offsetWidth || elem[ 0 ].offsetHeight || elem[ 0 ].getClientRects().length );
};
exports = {
    createCellListConfig,
    elemIsVisible
};
export default exports;
