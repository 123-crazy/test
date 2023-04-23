// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This implements the tooltip handler interface APIs defined by aw-graph widget to provide tooltip functionalities.
 *
 * @module js/qfm0FmeaGraphTooltipHandler
 */
import app from 'app';

var exports = {};

/**
 * Function to be called to get tooltip
 *
 */
export let getTooltip = function( graphItem, graphModel ) {
    var tooltip = null;
    if( graphItem.getItemType() === 'Label' ) {
        tooltip = graphItem.getText();
    } else if( graphItem.getItemType() === 'Edge' ) {
        var label = graphItem.getLabel();
        if( label ) {
            tooltip = label.getText();
        }
    }  else if( graphItem.getItemType() === 'Node' ) {
        tooltip = graphItem.getProperty( 'Name' );
    }
    return tooltip;
};

export default exports = {
    getTooltip
};
/**
 * Define tooltip handler
 *
 * @memberof NgServices
 * @member qfm0FmeaGraphTooltipHandler
 */
app.factory( 'qfm0FmeaGraphTooltipHandler', () => exports );
