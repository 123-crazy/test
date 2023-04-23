// Copyright (c) 2020 Siemens


/**
 * @deprecated afx@4.2.0.
 * @alternative AwPopup
 * @obsoleteIn afx@5.1.0
 *
 *
 * @module js/aw-popup2.directive
 */
import * as app from 'app';
import 'js/aw-popup-panel2.directive';
import 'js/aw-icon-button.directive';
import 'js/exist-when.directive';
import 'js/aw-command-bar.directive';

/**
 * Directive to hold content in a popup. REPLACE aw-popup
 * @example <aw-popup2></aw-popup2>
 * @member aw-popup2 class
 * @memberof NgElementDirectives
 */
app.directive( 'awPopup2', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        replace: false,
        templateUrl: app.getBaseUrlPath() + '/html/aw-popup2.directive.html',
        // support legacy attributes usage.
        // will be obsoleted
        link: function( $scope, $element, $attrs ) {
            if( $attrs.caption ) { $scope.caption = $attrs.caption; }
            if( $attrs.commands ) { $scope.commands = $attrs.commands; }
            if( $attrs.anchor ) { $scope.anchor = $attrs.anchor; }
        }
    };
} ] );
