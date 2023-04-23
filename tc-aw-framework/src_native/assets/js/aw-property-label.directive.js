// Copyright (c) 2020 Siemens

/**
 * Directive to display a property's label and any associated pattern.
 *
 * The label is the 'propertyDisplayName' attribute on the property.
 *
 * If the property is editable and contains an attribute named 'patterns' which is an array of
 * pattern strings, then the pattern(s) will be displayed alongside the property label.
 *
 * @module js/aw-property-label.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-pattern.directive';
import 'js/localeService';

/**
 * Definition for the (aw-property-label) directive.
 *
 * @example TODO
 *
 * @member aw-property-label
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyLabel', [ 'localeService', function( localeSvc ) {
    return {
        restrict: 'E',
        scope: {
            prop: '='
        },
        controller: [
            '$scope',
            '$element',
            function( $scope, $element ) {
                $scope.autoAssignIDs = function() {
                    var pattern = $scope.prop.preferredPattern;
                    if( $scope.patternProp && $scope.patternProp.dbValue ) {
                        pattern = $scope.patternProp.dbValue;
                    }
                    eventBus.publish( 'awPattern.newPatternSelected', {
                        prop: $scope.prop,
                        newPattern: pattern
                    } );
                };

                localeSvc.getLocalizedText( 'awAddDirectiveMessages', 'assignButtonTitle' ).then( function( result ) {
                    $scope.assignBtnTitle = result;
                } );
            }
        ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-label.directive.html'
    };
} ] );
