// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property) directive.
 *
 * @module js/aw-property.directive
 */
import app from 'app';
import 'js/aw.html.panel.property.controller';
import 'js/aw-property-label.directive';
import 'js/aw-property-val.directive';

/**
 * Definition for the (aw-property) directive.
 *
 * @example TODO
 *
 * @member aw-property
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0.
 * @alternative <AwWidget>
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awProperty', function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=',
            hint: '@'
        },
        controller: 'awHtmlPanelPropertyController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-property.directive.html'
    };
} );
