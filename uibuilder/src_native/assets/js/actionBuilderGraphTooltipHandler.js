// Copyright (c) 2020 Siemens

/**
 * This implements the tooltip handler interface APIs defined by aw-graph widget to provide tooltip functionalities.
 *
 * @module js/actionBuilderGraphTooltipHandler
 */
import app from 'app';

// eslint-disable-next-line valid-jsdoc

var exports = {};

/**
 * Function to be called to get tooltip
 *
 * @param {Object} graphItem - graph item
 * @param {Object} graphModel - graph model
 * @returns {String} tooltip for the graph item
 */
// eslint-disable-next-line no-unused-vars
export let getTooltip = function( graphItem, graphModel ) {
    var tooltip = null;
    if( graphItem.getItemType() === 'Label' ) {
        tooltip = graphItem.getText();
    } else if( graphItem.getItemType() === 'Edge' ) {
        var label = graphItem.getLabel();
        if( label ) {
            tooltip = label.getText();
        }
    } else if( graphItem.getItemType() === 'Node' ) {
        tooltip = graphItem.getProperty( 'Name' );
    }
    return tooltip;
};

exports = {
    getTooltip
};
export default exports;
/**
 * Define tooltip handler
 *
 * @memberof NgServices
 * @member actionBuilderGraphTooltipHandler
 */
app.factory( 'actionBuilderGraphTooltipHandler', () => exports );
