// Copyright (c) 2020 Siemens

/**
 * @module js/aw-link-with-popup-and-icon.directive
 */
import app from 'app';
import 'js/aw-link-with-popup-and-icon.controller';
import 'js/aw-icon-button.directive';

/**
 * Directive to display a link with a popup
 *
 * @example <aw-link-with-popup-and-icon prop="data.xxx" ></aw-link-with-popup-and-icon>
 *
 * @member aw-link-with-popup-and-icon
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.2.0.
 * @alternative AwLink
 * @obsoleteIn afx@5.1.0
 *
 */
app.directive( 'awLinkWithPopupAndIcon', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        controller: 'awLinkWithPopupAndIconController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-link-with-popup-and-icon.directive.html',
        replace: true
    };
} ] );
