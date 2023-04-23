//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/contextConfigurationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import ngModule from 'angular';
import $ from 'jquery';
import 'lodash';

var exports = {};

/**
 * Launch popup if there are more than one products under SWC
 */
export let launchPopup = function( data ) {
    if( data && data.allProducts && data.allProducts.length > 1 ) {
        var popupUpLevelElement = $( "div.aw-layout-panelSection:contains('Context')" );
        var popupElemScope = ngModule.element( popupUpLevelElement ).scope();
        popupElemScope.$broadcast( 'awPopupWidget.open', popupUpLevelElement );
    }
};

export let getCurrentContexts = function() {
    var context = [];
    context.push( appCtxSvc.getCtx( "aceActiveContext.context.productContextInfo.props.awb0Product" ) );
    return context;
};

/**
 * Context Configuration service utility
 */

export default exports = {
    launchPopup,
    getCurrentContexts
};
app.factory( 'contextConfigurationService', () => exports );
