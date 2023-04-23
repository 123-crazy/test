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
 * This file is used as service file for Formsheet View
 *
 * @module js/qfm0FormsheetService
 */
import eventBus from 'js/eventBus';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import qfm0FormsheetGridService from 'js/qfm0FormsheetGridService';
import appCtxService from 'js/appCtxService';
import policySvc from 'soa/kernel/propertyPolicyService';
import qfm0FormsheetDataService from 'js/qfm0FormsheetDataService';
import _ from 'lodash';

import $ from 'jquery';

var exports = {};
var formsheetContext = 'formsheetContext';

export let assureCSSInitialization = function() {
    // This is check for CSS link which is used for igniteUI
    // styling .
    var cssCheck = $( 'head:first > link' ).filter(
        '[href=\'' + app.getBaseUrlPath() + '/lib/igniteUI/css/structure/infragistics.css\']' ).length;
    if( cssCheck === 0 ) {
        /**
         * Include the CSS for 'igniteUI' module.
         */
        var link = document.createElement( 'link' );
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = app.getBaseUrlPath() + '/lib/igniteUI/css/structure/infragistics.css';
        var linkNode = $( 'head:first > link' );
        document.getElementsByTagName( 'head' )[ 0 ].insertBefore( link, linkNode[ 0 ] );
    }

    var cssCheck = $( 'head:first > link' ).filter(
        '[href=\'' + app.getBaseUrlPath() + '/lib/igniteUI/css/themes/infragistics/infragistics.theme.css\']' ).length;
    if( cssCheck === 0 ) {
        /**
         * Include the CSS for 'igniteUI' module.
         */
        var link = document.createElement( 'link' );
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = app.getBaseUrlPath() + '/lib/igniteUI/css/themes/infragistics/infragistics.theme.css';
        var linkNode = $( 'head:first > link' );
        document.getElementsByTagName( 'head' )[ 0 ].insertBefore( link, linkNode[ 0 ] );
    }
};

export let getFormsheetData = function( prop, addElementInput, formsheetColIdx ) {
    var promise = qfm0FormsheetDataService.getFormsheetData( 0, 25, addElementInput, formsheetColIdx );
    if( promise ) {
        promise.then( function( response ) {
            if( response.formSheetHeader !== undefined && response.formSheetHeader !== null && response.formSheetHeader !== '' ) {
                document.getElementById( 'formSheetHeader' ).innerHTML = response.formSheetHeader;
            }
            if( response.formSheetViewModel !== undefined && response.formSheetViewModel !== null && response.formSheetViewModel !== '' ) {
                var formsheetDataJSON = JSON.parse( response.formSheetViewModel );

                var existingStyleTagText = document.getElementsByTagName( 'style' )[0].innerText;
                var customCssStylingStartText = "/* Custom CSS Styling Start */";
                var customCssStartIndex = existingStyleTagText ? existingStyleTagText.indexOf(customCssStylingStartText) : -1;
                var tcMajorVersion = appCtxService && appCtxService.ctx && appCtxService.ctx.tcSessionData ? appCtxService.ctx.tcSessionData.tcMajorVersion : -1;
                var customCssFor12x = ".aw-qualityFmea-formsheetColumnHeaderText {text-align: center !important; white-space: initial;}  .aw-qualityFmea-formsheetColumnHeaderVerticleText .ui-iggrid-headertext {transform: rotate(270deg); text-align: center; white-space: initial; display: block; margin-top: 40px; height: 60px; padding-top: 30px;} .aw-qualityFmea-formsheetGreyCell {background: #bebebe;}";
                if ( customCssStartIndex < 0) {
                    // If custom CSS styling text is not present already
                    if ( tcMajorVersion >= 13 ) {
                        // If tc version in 13x or greater then take custom CSS styling from JSON coming from styling file
                        document.getElementsByTagName( 'style' )[0].innerText += " " + customCssStylingStartText + " " + formsheetDataJSON.cssStyle;
                    }
                    else {
                        // If tc version is less than 13x then take custom CSS styling defined at client side code
                        document.getElementsByTagName( 'style' )[0].innerText += " " + customCssStylingStartText + " " + customCssFor12x;
                    }
                }
                else {
                    // If custom CSS styling text is present already then first remove existing custom styling text and then append the latest custom styling text
                    var frameworkStyleText = "";
                    if(existingStyleTagText) {
                        frameworkStyleText = existingStyleTagText.substring(0, existingStyleTagText.indexOf(customCssStylingStartText));
                    }

                    if ( tcMajorVersion >= 13 ) {
                        // If tc version in 13x or greater then take custom CSS styling from JSON coming from styling file
                        document.getElementsByTagName( 'style' )[0].innerText = frameworkStyleText + " " + customCssStylingStartText + " " + formsheetDataJSON.cssStyle;
                    }
                    else {
                        // If tc version is less than 13x then take custom CSS styling defined at client side code
                        document.getElementsByTagName( 'style' )[0].innerText = frameworkStyleText + " " + customCssStylingStartText + " " + customCssFor12x;
                    }
                    
                }

                var dataSource = qfm0FormsheetGridService.createFormsheetRows( formsheetDataJSON, response.ServiceData.modelObjects, formsheetDataJSON.cursor.totalFound );
                var startIndex = formsheetDataJSON.cursor.startIndex;
                var pageSize = formsheetDataJSON.cursor.pageSize;
                var currentPageIndex =  startIndex / pageSize;
                if( addElementInput ) {
                    qfm0FormsheetGridService.changeFormsheetPage( dataSource, currentPageIndex  );
                } else {
                    qfm0FormsheetGridService.createFormsheetGrid( dataSource, formsheetDataJSON, formsheetDataJSON.cursor.totalFound );
                }
            }
        } );
    }
};
export let formSheetHeightCalculation = function( eventData ) {
    let isFullscreen = appCtxService.getCtx( 'fullscreen' );
    let height = 53;
    let viewPortHeight = $( window ).height();
    if( viewPortHeight > 880 ) {
        if( eventData ) {
            if( eventData.isCollapsed === true ) {
                height = isFullscreen ? 80 : 70;
            }else {
                height = isFullscreen ? 63 : 53;
            }
        }else {
            let formsheetHeight = $( '.aw-qualityFmea-formsheetContainerHeight' ).height();
            height = isFullscreen ? Math.floor( formsheetHeight * 100 / viewPortHeight + 11 ) : Math.floor( formsheetHeight * 100 / viewPortHeight - 9 );
        }
    }else {
        if( eventData ) {
            if( eventData.isCollapsed === true ) {
                height = isFullscreen ? 75 : 65;
            }else {
                height = isFullscreen ? 53 : 40;
            }
        }else {
            let formsheetHeight = $( '.aw-qualityFmea-formsheetContainerHeight' ).height();
            height = isFullscreen ? Math.floor( formsheetHeight * 100 / viewPortHeight + 13 ) : Math.floor( formsheetHeight * 100 / viewPortHeight - 13 );
        }
}

     $( '.aw-qualityFmea-formsheetContainerHeight' ).css( 'height', height + 'vh' );
    };

export let registerVariables = function() {
    appCtxService.registerCtx( formsheetContext, {} );
};

export let unRegisterVariables = function() {
    appCtxService.unRegisterCtx( formsheetContext );
};

export default exports = {
    formSheetHeightCalculation,
    assureCSSInitialization,
    getFormsheetData,
    registerVariables,
    unRegisterVariables
};
app.factory( 'qfm0FormsheetService', () => exports );
