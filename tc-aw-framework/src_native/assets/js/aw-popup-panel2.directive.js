// Copyright (c) 2020 Siemens

/**
 * @deprecated afx@4.2.0.
 * @alternative AwPopup
 * @obsoleteIn afx@5.1.0
 *
 * @module js/aw-popup-panel2.directive
 * as replacement of aw-popup-panel.
 *
 * add this directive is temporary to support incremental promotion new designed universal popup panel
 */
import app from 'app';
import ngModule from 'angular';
import { popupService } from 'js/popupService';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import wcagSvc from 'js/wcagService';


app.directive( 'awPopupPanel2', [ '$$rAF', function( $$rAF ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-popup-panel2.directive.html',
        link: function( scope, element ) {
            $$rAF( function() {
                var images;
                var content = element[ 0 ].querySelector( '.aw-layout-popup' );

                if( content ) {
                    images = content.getElementsByTagName( 'img' );
                    addOverflowClass();
                    // delayed image loading may impact scroll height, check after images are loaded
                    ngModule.element( images ).on( 'load', addOverflowClass );
                }


                // eslint-disable-next-line require-jsdoc
                function addOverflowClass() {
                    element.toggleClass( 'aw-layout-popup-contentOverflow', content.scrollHeight > content.clientHeight );
                }
            } );

            // there are applications still use 'awPopupWidget.close' to close popup, hence provide the adaptor to post compatible.
            // 'awPopupWidget.close' was deprecated in afx@3.2.0, use `popupService.hide` instead.
            // 'awPopupWidget.close' has serious design issue which doesn't require target popupId, will result to close all other unrelated popups in page, this is bad.
            //  will obsoleteIn afx@4.3.0
            let adaptor = ()=>{
                let close = ( event, eventData ) => {
                    logger.warn( '\'awPopupWidget.close\' was deprecated in afx@3.2.0, use `popupService.hide` instead' );
                    let target =  element[ 0 ];
                    let popupId = eventData ? eventData.popupId || null : null;
                    if( !popupId || target.getAttribute( 'data-popup-id' ) === popupId ) {
                        if( !popupId ) {
                            logger.warn( '\'awPopupWidget.close\' must specify eventData with expected popupId, or it will close all other unrelated popups!!' );
                        }
                        popupService.hide( target );
                    }
                };
                let subscriber = eventBus.subscribe( 'awPopupWidget.close', close );
                scope.$on( '$destroy', ()=>eventBus.unsubscribe( subscriber ) );
            };
            adaptor();
        }
    };
} ] );
