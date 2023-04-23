// Copyright (c) 2020 Siemens

/**
 * @module js/aw-popup-draggable.directive
 *
 * @deprecated afx@4.2.0.
 * @alternative none, not used anymore, draggable is a popup configurable option
 * @obsoleteIn afx@5.1.0
 */
import app from 'app';
import ngModule from 'angular';
import wcagSvc from 'js/wcagService';

/**
 * Attribute Directive to change the draggability of aw-popup
 *
 * @example <aw-command-panel caption="i18n.createReport" aw-popup-draggable> </aw-command-panel>
 *
 * @member awPopupDraggable
 * @memberof NgAttributeDirectives
 */
app.directive( 'awPopupDraggable', [ function() {
    return {
        restrict: 'A',
        require: '^awPopup',
        link: function( scope, element, attr, ctrl ) {
            var $element = ngModule.element( element );
            scope.$applyAsync( function() {
                var titleElement = $element.find( '.aw-layout-panelTitle' );
                if( titleElement ) {
                    ngModule.element( titleElement ).css( 'cursor', 'move' );
                }
                ctrl.setDraggable( true );
            } );

            wcagSvc.focusFirstDescendantWithDelay( element[ 0 ] );
        }
    };
} ] );
