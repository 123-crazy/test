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
 * This implements the tooltip handler interface APIs defined by aw-graph widget to provide tooltip functionalities.
 *
 * @module js/Awp0WorkflowDesignerTooltipHandler
 */
import * as app from 'app';

var exports = {};

/**
 * Function to be called to get tooltip
 *
 */
export let getTooltip = function( graphItem ) {
    var tooltip = null;
    if( graphItem.appData !== undefined && graphItem.appData.tooltipOfNode !== undefined ) {
        tooltip = graphItem.appData.tooltipOfNode;
    } else if( graphItem.getItemType() === 'Node' ) {
        var bindData = graphItem.getAppObj();
        tooltip = bindData.Name;
    } else if( graphItem.getItemType() === 'Edge' ) {
        var label = graphItem.getLabel();
        if( label ) {
            tooltip = label.getText();
        }
    } else if( graphItem.getItemType() === 'Label' ) {
        tooltip = graphItem.getText();
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
 * @member Awp0WorkflowDesignerTooltipHandler
 */
app.factory( 'Awp0WorkflowDesignerTooltipHandler', () => exports );
