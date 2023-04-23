//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 *
 *
 * @module js/Saw1SplitPanelService
 */
import * as app from 'app';
import _appCtxSvc from 'js/appCtxService';
import $ from 'jquery';

'use strict';

var exports = {};

export let resourceChartCtx = function() {
    var resourceChartCtx = {
        splitPanelLocation: 'bottom'

    };
    _appCtxSvc.registerCtx( 'resourceChartCtx', resourceChartCtx );
};

export let changeSplitPanelLocation = function( panelLocation ) {
    var resourceChartContext = _appCtxSvc.getCtx( 'resourceChartCtx' );

    if( resourceChartContext ) {
        var resourceChartCtx = {
            splitPanelLocation: panelLocation

        };
        if( panelLocation === 'off' || panelLocation === 'right' ) {
            adjustHeight();
        } else {
            adjustHeightBottomCase();
        }
        _appCtxSvc.registerCtx( 'resourceChartCtx', resourceChartCtx );
    } else {
        _appCtxSvc.updatePartialCtx( 'resourceChartCtx.splitPanelLocation', panelLocation );
    }
};
/**
 * This function will call at the reveal action of deliverables.
 * This is for the 'off' and 'right' case of interface details
 * @param {Object} ctx - The current context.
 */
export let adjustHeight = function() {
    var height = exports.getComputedHeight();
    var resourceEle = document.getElementsByClassName( 'aw-matrix-container' );
    if( resourceEle.length > 0 ) {
        resourceEle[ 0 ].style.height = height + 'px';
    }
    var gridEle = document.getElementsByClassName( 'ui-grid-viewport' );
    if( gridEle.length > 0 ) {
        gridEle[ 0 ].style.height = height * 0.9 + 'px'; //calculation for height of grid below toolbox
    }
};
/**
 * This function will call at the reveal action of deliverables.
 * This is for the 'bottom' case of interface details
 * @param {Object} ctx - The current context.
 */
export let adjustHeightBottomCase = function() {
    var height = exports.getComputedHeight();
    var widGridEle = document.getElementsByClassName( 'aw-matrix-container' );
    if( widGridEle.length > 0 ) {
        widGridEle[ 0 ].style.height = height * 0.7 + 'px'; //calculation for height of the marix container
    }
    var resourceEle = document.getElementsByClassName( 'ui-grid-viewport' );
    if( resourceEle.length > 0 ) {
        resourceEle[ 0 ].style.height = height * 0.7 * 0.86 + 'px'; //calculation for height of the grids below the header(that is the entries in the chart) below the grid header
    }
    var splitEle = document.getElementsByClassName( 'aw-schedulemanager-resourceChart-splitTable' );
    if( splitEle.length > 0 ) {
        splitEle[ 0 ].style.height = height * 0.3 + 'px'; //calculation of height of assigned table
    }
};
/**
 * This will compute the available height.
 * @returns The available height
 */
export let getComputedHeight = function() {
    var elementCheck = document.getElementsByClassName( 'aw-layout-sublocationContent' );
    if( elementCheck.length > '0' ) {
        var subLocHeight = document.getElementsByClassName( 'aw-layout-sublocationContent' )[ 0 ].clientHeight;
        var prgBreadCrumb = $( '#prgBreadCrumbs' );
        var resourceChartTitle = document.getElementsByClassName( 'aw-layout-panelSectionTitle' )[ 1 ].offsetHeight;
        var resourceChartToolbar = document.getElementById( 'aw_resourceChartToolbar' ).offsetHeight;

        var breadCrumbHeight = prgBreadCrumb ? prgBreadCrumb[ 0 ] ? prgBreadCrumb[ 0 ].clientHeight : 0 : 0;
        if( isNaN( breadCrumbHeight ) ) {
            breadCrumbHeight = 0;
        }
        breadCrumbHeight += 100; //100 to offset  for margins at top and bottom

        var height = subLocHeight - breadCrumbHeight - resourceChartTitle - resourceChartToolbar; //calculation for height for container
        if( height < 200 ) {
            height = 200;
        }
        return height;
    }
};

export default exports = {
    resourceChartCtx,
    changeSplitPanelLocation,
    adjustHeight,
    getComputedHeight,
    adjustHeightBottomCase
};

/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'Saw1SplitPanelService', () => exports );
