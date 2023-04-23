// Copyright (c) 2020 Siemens

/**
 * Responsible for the name value grid
 *
 * @module js/aw-namevalue-property.directive
 */
import app from 'app';
import 'js/aw.namevalue.property.controller';
import 'js/aw-property-image.directive';

/**
 * Definition for the (aw-namevalue-property) directive.
 * Directive to display name value grid
 *
 * @member aw-namevalue-property
 * @memberof NgElementDirectives
 */
app.directive( 'awNamevalueProperty', function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        controller: 'awNamevaluePropertyController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-namevalue-property.directive.html'
    };
} );
