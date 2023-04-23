// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * @module js/expressionEffectivityEndItemPanelService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/navigationUtils';
import effectivityUtils from 'js/effectivityUtils';

let exports = {};
let UPDATE_END_ITEM_EVENT = 'ps0Effectivity.updateEndItemValue';
let END_ITEM_PROP_LOADED_EVENT = 'ps0Effectivity.endItemPropLoaded';

/**
 *Update the end item and navigate to main panel.
 *@param {String} destPanelId  Destination panel id
 */
export let updateEndItemAndNavigateToMainPanel = function( destPanelId ) {
    let endItemRev = effectivityUtils.getElementFromPallete();
    let endItemLoaded = eventBus.subscribe( END_ITEM_PROP_LOADED_EVENT, function() {
        eventBus.publish( UPDATE_END_ITEM_EVENT );
        eventBus.publish( 'awPanel.navigate', {
            destPanelId: destPanelId
        } );

        eventBus.unsubscribe( endItemLoaded );
    } );

    effectivityUtils.setEndItemAndPublishProvidedEvent( endItemRev, 'expressionEffectivity', END_ITEM_PROP_LOADED_EVENT );
};

/**
 * Update end item value from search panel
 * @param {String} data  declarative view model
 */
export let setEndItemAndNavigateToMainPanel = function( data ) {
    let endItem = data.dataProviders.searchEndItems.selectedObjects[ 0 ];
    if( endItem ) {
        let endItemLoaded = eventBus.subscribe( END_ITEM_PROP_LOADED_EVENT, function() {
            eventBus.publish( UPDATE_END_ITEM_EVENT );
            eventBus.publish( 'awPanel.navigate', {
                destPanelId: data.previousView
            } );
            eventBus.unsubscribe( endItemLoaded );
        } );

        effectivityUtils.setEndItemAndPublishProvidedEvent( endItem, 'expressionEffectivity', END_ITEM_PROP_LOADED_EVENT );
    }
};

export default exports = {
    setEndItemAndNavigateToMainPanel,
    updateEndItemAndNavigateToMainPanel
};
app.factory( 'expressionEffectivityEndItemPanelService', () => exports );
