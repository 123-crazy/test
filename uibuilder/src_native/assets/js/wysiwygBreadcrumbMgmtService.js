// Copyright (c) 2020 Siemens

/**
 * Breadcrumb management service for wysiwyg.
 * This service is responsible for adding/removing crumbs from breadcrumb.
 * Also on selection of crumb it will fire the event for load panel in wysiwyg.
 * @module js/wysiwygBreadcrumbMgmtService
 */
import app from 'app';
import wysiwygUtilService from 'js/wysiwygUtilService';

var exports = {};

/**
 * Add or remove the crumbs for current panel from available crumbs.
 * @param {String} selectedPanel  current selected panel
 * @param {Array} availableCrumbs previous available crumbs
 * @returns {Array} crumbs
 */
var _getCrumbs = function( selectedPanel, availableCrumbs ) {
    var crumbAlreadyExist = false;
    var existedCrumbIndex = 0;

    if( selectedPanel === undefined ) {
        return availableCrumbs;
    }
    if( selectedPanel.id === undefined ) {
        return availableCrumbs;
    }
    var updatedCrumbs = availableCrumbs ? availableCrumbs.slice() : [];

    if( availableCrumbs && selectedPanel.status === 'Save' && availableCrumbs.length > 0 ) {
        availableCrumbs[ availableCrumbs.length - 1 ].displayName = selectedPanel.id;
    }
    if( selectedPanel.status === 'New' ) {
        updatedCrumbs = [];
    }

    //filter and set the proper configuration for available crumbs
    updatedCrumbs.forEach( function( crumb, index ) {
        crumb.showArrow = true;
        crumb.selectedCrumb = false;
        if( crumb.displayName === selectedPanel.id ) {
            crumbAlreadyExist = true;
            existedCrumbIndex = index;
        }
        if( crumb.willOverflow ) {
            crumb.willOverflow = false;
        }
        if( crumb.overflowIconPosition ) {
            crumb.overflowIconPosition = false;
        }
    } );

    //If not already exist add the crumb
    if( !crumbAlreadyExist ) {
        updatedCrumbs.push( {
            displayName: selectedPanel.id,
            clicked: false,
            selectedCrumb: false,
            showArrow: true,
            width: 200
        } );
    } else {
        //If already exist remove the right side crumbs of selected crumb
        return updatedCrumbs.slice( 0, existedCrumbIndex + 1 );
    }
    return updatedCrumbs;
};

/**
 * Build navigate breadcrumb for selected panel.
 *
 *
 * @param {Object} selectedPanel - current loaded/selected panel.
 * @param {Object} breadCrumbProvider - breadCrumb provider
 * @returns {Object} updated breadcrumb provider
 */
export let buildNavigateBreadcrumb = function( selectedPanel, breadCrumbProvider ) {
    var availableCrumbs = breadCrumbProvider ? breadCrumbProvider.crumbs : undefined;

    var provider = {
        crumbs: _getCrumbs( selectedPanel, availableCrumbs )
    };

    //Don't show arrow for last crumb
    if( provider.crumbs && provider.crumbs.length > 0 ) {
        var lastCrumb = provider.crumbs[ provider.crumbs.length - 1 ];
        lastCrumb.selectedCrumb = true;
        lastCrumb.showArrow = false;
    }

    //Add the onselect functionality for crumbs
    if( provider ) {
        provider.onSelect = function( selectedCrumb ) {
            onSelectCrumb( selectedCrumb );
        };
    }
    return provider;
};

/**
 * Functionality to trigger after selecting bread crumb
 * This function will fire the 'wysiwyg.loadPanelInWysiwyg' event for selected crumb.
 *
 * @param {Object} selectedCrumb - selected bread crumb object
 */
function onSelectCrumb( selectedCrumb ) {
    var crumbName = selectedCrumb && selectedCrumb.displayName;
    wysiwygUtilService.updateUrlSubpanelId( crumbName );
}

exports = {
    buildNavigateBreadcrumb
};
export default exports;
app.factory( 'wysiwygBreadcrumbMgmtService', () => exports );
