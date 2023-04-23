// Copyright (c) 2020 Siemens

/**
 * @module js/aw-popup-close-button.directive
 */
import app from 'app';

/**
 * @deprecated afx@4.2.0.
 * @alternative none, not used anymore
 * @obsoleteIn afx@5.1.0
 *
 *
 * Directive to display a button on popup panel to close the popup.
 *
 * @example <aw-popup-close-button><aw-i18n>i18n.cancel</aw-i18n></aw-popup-close-button>
 *
 * @member aw-popup-close-button
 * @memberof NgElementDirectives
 */
app.directive( 'awPopupCloseButton', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: '<button class="aw-popup-secondaryButton"  ng-click="$emit(\'awPopup.close\')" ng-transclude ></button>',
        replace: true
    };
} );
