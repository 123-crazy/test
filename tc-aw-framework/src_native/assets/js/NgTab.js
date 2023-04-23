// Copyright (c) 2020 Siemens

/**
 * @module js/NgTab
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import ngUtils from 'js/ngUtils';
import 'js/aw-tab-container.directive';
import 'js/aw-tab.directive';

var exports = {};

/**
 * Array of parameters used in calls to 'addTabObject' made BEFORE the call to 'initTabWidget' is used to
 * initialized the internal structures of the 'TabWidget'.
 * <P>
 * Note: This can happen when multiple GWT-side functions are used to async load the NgTab module.
 *
 * @private
 */
export let _pendingAddTabs = [];

/**
 * Initialize (i.e. 'bootstrap') the angular system and create an angular controller on a new 'child' of the
 * given 'parent' element.
 *
 * @param {Element} parentElement - The DOM element the controller and 'inner' HTML content will be added to.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 *
 * @param {Callback} apiFn - API for call backs from this controller.
 */
export let initTabWidget = function( parentElement, apiFn ) {
    /**
     * Create an 'outer' <DIV> (to hold the given 'inner' HTML) and create the angular controller on it.
     * <P>
     * Remove any existing 'children' of the given 'parent'
     * <P>
     * Add this new element as a 'child' of the given 'parent'
     * <P>
     * Include the DOM elements into the AngularJS system for AW and set the callback API function.
     */
    var ctrlElement = $( '<div ng-controller="awTabController"></div>' );

    ctrlElement
        .html( '<aw-tab-container><aw-tab tab-model=\'tabModel\' ng-repeat=\'tabModel in tabsModel | filter:{displayTab:true}\'></aw-tab></aw-tab-container>' );

    $( parentElement ).empty();
    $( parentElement ).append( ctrlElement );

    ngUtils.include( parentElement, ctrlElement );

    var contrScope = ngModule.element( ctrlElement ).scope();

    if( contrScope ) {
        contrScope.setCallbackApi( apiFn );

        /**
         * Check if there were any calls to 'addTabObject' made before 'initTabWidget'<BR>
         * If so: Add those pending tabs additions now.
         */
        if( exports._pendingAddTabs.length > 0 ) {
            for( var i = 0; i < exports._pendingAddTabs.length; i++ ) {
                var params = exports._pendingAddTabs[ i ];

                exports.addTabObject( params.parentElement, params.pageId, params.pageTitle, params.selected );
            }

            exports._pendingAddTabs = [];
        }
    }
};

/**
 * Data object used to hold id/state for a single Tab.
 *
 * @constructor NgTabItem
 *
 * @param {String} pageId - The corresponding page Id.
 *
 * @param {String} pageTitle - The tab name for display.
 *
 * @param {boolean} isSelected - Set tab as selected. Only ever set one tab as selected.
 */
export let NgTabItem = function( pageId, pageTitle, isSelected ) {
    this.pageId = pageId;
    this.name = pageTitle;
    this.selectedTab = isSelected;
    this.displayTab = true;
    this.classValue = 'aw-base-tabTitle';
};

/**
 * Add a tab to the Tab Bar
 *
 * @param {Element} parentElement - The DOM element to retrieve scope.
 */
export let addTabObject = function( parentElement, pageId, pageTitle, selected ) {
    var contrScope = ngModule.element( parentElement.firstChild ).scope();

    if( contrScope ) {
        var tabItem = new exports.NgTabItem( pageId, pageTitle, selected );

        contrScope.addTab( tabItem );
    } else {
        /**
         * The 'initTabWidget' must not have been called yet. Buffer the parameters of the new tab until things
         * get initialized.
         */
        exports._pendingAddTabs.push( {
            parentElement: parentElement,
            pageId: pageId,
            pageTitle: pageTitle,
            selected: selected
        } );
    }
};

/**
 * Set selection on a tab.
 *
 * @param {Element} parentElement - The DOM element to retrieve scope.
 *
 * @param {Number} pageId - PageId of tab to be selected.
 */
export let updateSelectedTab = function( parentElement, pageId ) {
    var contrScope = ngModule.element( parentElement.firstChild ).scope();

    if( contrScope ) {
        contrScope.updateSelectedTabById( pageId );
    }
};

/**
 * Clear Tabs.
 *
 * @param {Element} parentElement - The DOM element to retrieve scope.
 */
export let clearTabs = function( parentElement ) {
    var contrScope = ngModule.element( parentElement.firstChild ).scope();

    if( contrScope ) {
        contrScope.clearTabs();
    }
};

/**
 * Remove Tab.
 *
 */
export let removeTabs = function( parentElement, pageId ) {
    var contrScope = ngModule.element( parentElement.firstChild ).scope();
    if( contrScope ) {
        contrScope.removeTabs( pageId );
    }
};

/**
 * Called when the hosting GWT TabWidget is 'unLoaded'. This method will call $destroy on the AngularJS 'scope'
 * associated with the tab container's ng-controller.
 * <P>
 * Note: *** No further use of this controller is allowed (or wise) ***
 *
 * @param {Element} parentElement - The DOM element to retrieve scope.
 */
export let unLoadTabContainer = function( parentElement ) {
    var contrScope = ngModule.element( parentElement.firstChild ).scope();
    if( contrScope ) {
        contrScope.$destroy();
    }
};

/**
 * Return the object that defines the public API of this module.
 */
exports = {
    _pendingAddTabs,
    initTabWidget,
    NgTabItem,
    addTabObject,
    updateSelectedTab,
    clearTabs,
    removeTabs,
    unLoadTabContainer
};
export default exports;
