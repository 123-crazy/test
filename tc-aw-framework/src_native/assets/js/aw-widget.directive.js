// Copyright (c) 2020 Siemens

/**
 * Directive to display a Active Widget.
 *
 * @module js/aw-widget.directive
 */
import app from 'app';
import 'js/aw-pattern.directive';
import 'js/aw-property-label.directive';
import 'js/aw-property-val.directive';
import 'js/viewModelService';
import 'js/uwPropertyService';
import 'js/uwSupportService';

/**
 * Directive to display a Active Widget.
 *
 * @example <aw-widget prop="prop"></aw-widget>
 *
 * @member aw-widget class
 * @memberof NgElementDirectives
 */
app.directive( 'awWidget', [
    'viewModelService', 'uwPropertyService', 'uwSupportService',
    function( viewModelSvc, uwPropertyService, uwSupportSvc ) {
        return {
            restrict: 'E',
            scope: {
                prop: '=',
                modifiable: '=',
                hint: '@',
                parameterMap: '<?',
                labeldisplay: '@?',
                maxRowCount: '=?'
            },
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );

                if( $scope.prop ) {
                    if( $scope.modifiable !== undefined ) {
                        uwPropertyService.setIsPropertyModifiable( $scope.prop, $scope.modifiable );
                    }

                    if( $scope.labeldisplay ) {
                        var propertyLabelDisplay = uwSupportSvc.retrievePropertyLabelDisplay( $scope.labeldisplay );
                        uwPropertyService.setPropertyLabelDisplay( $scope.prop, propertyLabelDisplay );
                    }
                }
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-widget.directive.html'
        };
    }
] );
