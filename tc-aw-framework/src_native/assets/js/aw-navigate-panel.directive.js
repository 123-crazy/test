// Copyright (c) 2020 Siemens

/**
 * Directive to display a Navigate Panel.
 *
 * @module js/aw-navigate-panel.directive
 */
import app from 'app';
import 'js/aw-back-button.directive';
import 'js/aw-command-sub-panel.directive';
import 'js/aw-panel-header.directive';

/**
 * Directive to display a Navigate Panel.
 *
 * @example "<aw-navigate-panel dest-panel-id='{destPanelId}' pre-panel-id='{prePanelId}' title='{title}'></aw-navigate-panel>"
 *
 * It have below supported properties:
 *  prePanelId: required. The previous panel ID.
 *  destPanelId: required. The destination panel ID.
 *  backButtonTitle: optional. The panel title to show beside the back button on destination panel.
 *  isolateMode: optional. Boolean flag to indicate loading the destination panel in isolated mode or not.
 *                   If true, the destination panel view model will not be consolidated with main panel.
 *
 * @member aw-navigate-panel class
 * @memberof NgElementDirectives
 */
app.directive( 'awNavigatePanel', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            prePanelId: '@',
            destPanelId: '@',
            backButtonTitle: '@?',
            isolateMode: '@?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-navigate-panel.directive.html',
        replace: true
    };
} );
