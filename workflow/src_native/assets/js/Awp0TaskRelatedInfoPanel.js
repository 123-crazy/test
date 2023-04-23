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
 * This implements the task related info panel functionalities.
 *
 * @module js/Awp0TaskRelatedInfoPanel
 */
import * as app from 'app';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Update the selected tab if on URL.
 * @param {Object} data Data view model object
 */
export let updateTabOnURL = function( data ) {
    var tabId = 'Awp0TaskPropertiesTab';
    // Check if selected tab id is not null then get that tabId and update the URL
    if( data && data.selectedTab && data.selectedTab.id ) {
        tabId = data.selectedTab.id;
    }
    //exports.setSelectedTab( data, tabId );
    Awp0WorkflowDesignerUtils.updateURL( { ttab_name: tabId } );
};

/**
 * Put the seleted to true on tab based on input tab id that is selected
 * by default. This is mainly needed in refresh case.
 *
 * @param {Object} data Data view model object
 * @param {String} tabToSelected Selected tab id
 */
export let setSelectedTab = function( data, tabToSelected ) {
    if( tabToSelected ) {
        _.forEach( data.tabsModel.dbValue, function( tabObject ) {
            if( tabToSelected === tabObject.id ) {
                tabObject.selectedTab = true;
                // This is needed in refresh case so that it will not put first tab as selected by default
                // and put the correct selected tab.
                data.selectedTab = tabObject;
                eventBus.publish( 'awTab.setSelected', data.selectedTab );
            } else {
                tabObject.selectedTab = false;
            }
        } );
    }
};

export default exports = {
    updateTabOnURL,
    setSelectedTab
};
/**
 * Define Awp0TaskRelatedInfoPanel methods
 *
 * @memberof NgServices
 * @member Awp0TaskRelatedInfoPanel
 *
 * @param {Object} Awp0WorkflowDesignerUtils Util object
 *
 * @returns {Object} Export object
 */
app.factory( 'Awp0TaskRelatedInfoPanel', () => exports );
