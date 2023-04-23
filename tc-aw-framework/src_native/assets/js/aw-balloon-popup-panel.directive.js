// Copyright (c) 2020 Siemens

/**
 * Directive to display a balloon popup widget by clicking on the element, and showing up the transcluded stuff in the popup
 * Widget.
 *
 * @module js/aw-balloon-popup-panel.directive
 */
import app from 'app';
import popupService from 'js/popupService';
import utils from 'js/popupUtils';
import 'js/aw-popup-panel2.directive';
import 'js/exist-when.directive';
import 'js/visible-when.directive';
import 'js/aw-class.directive';
import 'js/aw-click.directive';

/**
 * @deprecated afx@4.2.0.
 * @alternative AwPopup
 * @obsoleteIn afx@5.1.0
 */
app.directive( 'awBalloonPopupPanel', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-balloon-popup-panel.directive.html',
        link: function( scope, element ) {
            let target = element.find( 'aw-popup-panel2' )[ 0 ];
            utils.runLoadingCheck( scope, target );
            scope.hide = () => {
                popupService.hide( target );
            };
        }
    };
} ] );
