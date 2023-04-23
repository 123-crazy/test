// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgServices.narrowModeService}
 *
 * @module js/aw.narrowMode.service
 * @requires app
 */
import app from 'app';
import eventBus from 'js/eventBus';

let exports;

/**
 * The narrow mode breakpoint in px
 *
 * @private
 * @member narrowModeBreakPoint
 */
let narrowModeBreakPoint = 460;

/**
 * Whether currently in narrow mode
 *
 * @private
 * @member isCurrentlyNarrowMode
 */
let isCurrentlyNarrowMode = false;

/**
 * Returns if the user is in narrow mode or not.
 *
 * @function isNarrowMode
 * @return {Boolean} Whether currently in narrow mode
 */
export let isNarrowMode = function() {
    return isCurrentlyNarrowMode;
};

/**
 * Checks to see if the current width matches the criteria for being in narrow mode
 *
 * @function checkNarrowMode
 * @param {number} windowWidth - Current Browser Window width
 * @returns {String} The style to be applied in case of narrowMode. If not in narrowMode, then passes blank.
 */
export let checkNarrowMode = function() {
    return setNarrowMode( window.innerWidth <= narrowModeBreakPoint );
};

/**
 * Updates the internal cached narrow mode state if different and fires narrowModeChangeEvent.
 *
 * @function setNarrowMode
 * @param {boolean} narrowModeState - true if the criteria has been satisfied for narrow mode; false otherwise
 * @returns {String} The style to be applied in case of narrowMode. If not in narrowMode, then passes blank.
 */
var setNarrowMode = function( narrowModeState ) {
    // Only fire events if mode is different than it was prior
    if( isCurrentlyNarrowMode !== narrowModeState ) {
        isCurrentlyNarrowMode = narrowModeState;
        eventBus.publish( 'narrowModeChangeEvent', {
            isEnterNarrowMode: isCurrentlyNarrowMode
        } );
    }

    var narrowModeStyle = '';
    if( isCurrentlyNarrowMode ) {
        narrowModeStyle = 'awRootNarrowMode';
    }

    return narrowModeStyle;
};

/**
 * Removes/ Applies the narrowMode's "layoutSummaryOnlyStyle" and changes header title on event "narrowModeChangeEvent
 *
 * @function narrowModeChange
 * @param {object} eventData - event data for "narrowModeChangeEvent" event
 * @param {object} layoutSummaryOnlyStyle - narrowMode's "layoutSummaryOnlyStyle" which can be blank or 'aw-layout-summaryOnly'
 * @param {object} headerTitle - title of header
 * @param {object} preNarrowTitle - header title before narrow mode, to be used later
 * @returns {object} The "layoutSummaryOnlyStyle", headerTitle and preNarrowTitle
 */
export let narrowModeChange = function( eventData, layoutSummaryOnlyStyle, headerTitle, preNarrowTitle ) {
    var output = {
        layoutSummaryOnlyStyle: layoutSummaryOnlyStyle,
        headerTitle: headerTitle,
        preNarrowTitle: preNarrowTitle
    };
    if( !eventData.isEnterNarrowMode ) {
        output.layoutSummaryOnlyStyle = '';
        if( preNarrowTitle ) {
            output.headerTitle = preNarrowTitle;
            output.preNarrowTitle = null;
        }
    }
    return output;
};

/**
 * Removes/ Applies the narrowMode's "layoutSummaryOnlyStyle" and changes header title on event "gwt.subLocationContentSelectionChangeEvent"
 *
 * @function subLocationContentSelectionChange
 * @param {object} eventData - event data for "narrowModeChangeEvent" event
 * @param {object} layoutSummaryOnlyStyle - narrowMode's "layoutSummaryOnlyStyle" which can be blank or 'aw-layout-summaryOnly'
 * @param {object} headerTitle - title of header
 * @param {object} preNarrowTitle - header title before narrow mode, to be used later
 * @param {object} subLocationTabs - subLocation tabs information
 * @returns {object} The "layoutSummaryOnlyStyle", headerTitle and preNarrowTitle
 */
export let subLocationContentSelectionChange = function( eventData, layoutSummaryOnlyStyle, headerTitle, preNarrowTitle, subLocationTabs ) {
    var output = {
        layoutSummaryOnlyStyle: layoutSummaryOnlyStyle,
        headerTitle: headerTitle,
        preNarrowTitle: preNarrowTitle
    };
    if( eventData.isPrimaryWorkArea && eventData.haveObjectsSelected && window.innerWidth < 460 ) {
        output.layoutSummaryOnlyStyle = 'aw-layout-summaryOnly';

        var activeTab = subLocationTabs.filter( function( tab ) {
            return tab.selectedTab;
        } )[ 0 ];

        if( !activeTab ) {
            activeTab = {
                name: 'null'
            };
        }

        if( preNarrowTitle ) {
            output.headerTitle = preNarrowTitle + ' (' + activeTab.name + ')';
        } else {
            output.preNarrowTitle = headerTitle;
            output.headerTitle = headerTitle + ' (' + activeTab.name + ')';
        }
    }
    return output;
};

/**
 * Removes/ Applies the narrowMode's "layoutSummaryOnlyStyle" and changes header title on event "narrowSummaryLocationTitleClickEvent"
 *
 * @function narrowSummaryLocationTitleClick
 * @param {object} layoutSummaryOnlyStyle - narrowMode's "layoutSummaryOnlyStyle" which can be blank or 'aw-layout-summaryOnly'
 * @param {object} headerTitle - title of header
 * @param {object} preNarrowTitle - header title before narrow mode, to be used later
 * @returns {object} The "layoutSummaryOnlyStyle", headerTitle and preNarrowTitle
 */
export let narrowSummaryLocationTitleClick = function( layoutSummaryOnlyStyle, headerTitle, preNarrowTitle ) {
    var output = {
        layoutSummaryOnlyStyle: layoutSummaryOnlyStyle,
        headerTitle: headerTitle,
        preNarrowTitle: preNarrowTitle
    };
    output.layoutSummaryOnly = '';
    if( preNarrowTitle ) {
        output.headerTitle = preNarrowTitle;
        output.preNarrowTitle = null;
    }
    return output;
};

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which
 * service should be injected to provide the API for this module.
 */

exports = {
    isNarrowMode,
    checkNarrowMode,
    narrowModeChange,
    subLocationContentSelectionChange,
    narrowSummaryLocationTitleClick
};
export default exports;

/**
 * Narrow mode utility service
 *
 * @class narrowModeService
 * @memberOf NgServices
 */
app.factory( 'narrowModeService', () => exports );
