// Copyright (c) 2020 Siemens

/**
 * Directive to display a textbox styling.
 *
 * @module js/aw-bpmn-cell.directive
 */
import app from 'app';
import 'js/aw-icon.directive';

/**
 * Directive to display a textbox styling.
 *
 * @example <aw-textbox prop="data.xxx"></aw-textbox>
 *
 * @member aw-textbox
 * @memberof NgElementDirectives
 */
app.directive( 'awBpmnCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-bpmn-cell.directive.html'
    };
} ] );
