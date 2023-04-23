// Copyright (c) 2020 Siemens

/**
 * Check list widget directive
 *
 * @module js/aw-check-list.directive
 */
import app from 'app';
import 'js/aw-check-list.controller';

/**
 * Directive to display a check list widget
 *
 * @example <aw-check-list prop="data.xxx"></aw-check-list>
 *
 * @member aw-check-list
 * @memberof NgElementDirectives
 */
app.directive( 'awCheckList', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        controller: 'awCheckListController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-check-list.directive.html'
    };
} ] );
