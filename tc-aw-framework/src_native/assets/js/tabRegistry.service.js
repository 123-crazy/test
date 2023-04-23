// Copyright (c) 2020 Siemens

/**
 * Defines {@link tabRegistryService} which manages tabs.
 *
 * @module js/tabRegistry.service
 */
import tna from 'app';
import Debug from 'Debug';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';

const registry = {};
const trace = new Debug( 'tabRegistryService' );


/**
 * Register a tab set
 *
 * @param {String} tabSetId ID that the tab set has registered with
 * @param {List<Object>} tabs List of tabs in tab set (all tabs, not just visible)
 * @param {Object} registryData Callback to change tabs and the tabs that are currently visible
 * @throws Error if tabSetId is already registered
 */
export function registerTabSet( tabSetId, {
    changeTab,
    highlightTab,
    tabs
} ) {
    trace( `Tab set ${tabSetId} registered: ${tabs.map( t => t.tabKey )}` );
    if( registry[ tabSetId ] ) {
        throw new Error( `Tab set with ID ${tabSetId} is already registered` );
    }
    registry[ tabSetId ] = {
        changeTab,
        highlightTab,
        tabs
    };
    // Announce tabset registration
    eventBus.publish( tabSetId + '.tabSetRegistered' );
}

/**
 * Remove registration of a tab set
 *
 * @param {String} tabSetId ID that the tab set has registered with
 */
export function unregisterTabSet( tabSetId ) {
    trace( `Tab set ${tabSetId} unregistered` );
    delete registry[ tabSetId ];
    // Announce tabset un-registration
    eventBus.publish( tabSetId + '.tabSetUnregistered' );
}

/**
 * Get the list of tabs currently visible in the tab set
 *
 * @param {String} tabSetId ID that the tab set has registered with
 * @returns {List<Object>} List of tabs visible in the tab set. Null if tab set is not registered.
 */
export function getVisibleTabs( tabSetId ) {
    const registration = registry[ tabSetId ];
    return registration ? registration.tabs : null;
}

/**
 * Change the selected tab in the targeted tab set
 *
 * @param {String} tabSetId ID that the tab set has registered with
 * @param {String} targetTabId ID of the tab to change to
 * @returns {Promise<Void>} Promise resolved when tab transition is complete. Rejected if transition fails or tab is not visible.
 */
export function changeTab( tabSetId, targetTabId ) {
    const targetTab = ( getVisibleTabs( tabSetId ) || [] ).filter( tab => tab.tabKey === targetTabId )[0];
    const ps = AwPromiseService.instance; //inline instead of global because of unit tests
    return targetTab ? ps.resolve( registry[ tabSetId ].changeTab( targetTab ) ) : ps.reject( `${targetTabId} is not available in tab set` );
}

/**
 * Highlight tab in the targeted tab set
 *
 * @param {String} tabSetId ID that the tab set has registered with
 * @param {String} targetTabId ID of the tab to be highlighted
 * @returns {Promise<Void>} Promise resolved when tab highlight is complete. Rejected if tab is not visible.
 */
export function highlightTab( tabSetId, targetTabId ) {
    const targetTab = ( getVisibleTabs( tabSetId ) || [] ).filter( tab => tab.tabKey === targetTabId )[0];
    const ps = AwPromiseService.instance; //inline instead of global because of unit tests
    return targetTab ? ps.resolve( registry[ tabSetId ].highlightTab( targetTab ) ) : ps.reject( `${targetTabId} is not available in tab set` );
}

const exports = {
    changeTab,
    highlightTab,
    getVisibleTabs,
    registerTabSet,
    unregisterTabSet
};
export default exports;

/**
 * @memberof NgServices
 * @member tabRegistryService
 *
 * @returns {tabRegistryService} Reference to the service API object.
 */
tna.factory( 'tabRegistryService', () => exports );
