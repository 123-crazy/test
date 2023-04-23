// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * Directive to display a Active Widget with tooltip.
 *
 * @module js/aw-widget-with-tooltip.directive
 */
import app from 'app';
import 'js/aw-pattern.directive';
import 'js/aw-property-label.directive';
import 'js/aw-property-val.directive';
import 'js/viewModelService';
import 'js/uwPropertyService';
import 'js/uwSupportService';

'use strict';

/**
 * Directive to display a Active Widget with tooltip.
 *
 * @example <aw-widget-with-tooltip prop="prop"></aw-widget>
 *
 * @member aw-widget-with-tooltip class
 * @memberof NgElementDirectives
 */
app.directive( 'awWidgetWithTooltip', //
    [ 'viewModelService', 'uwPropertyService', 'uwSupportService', //
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
                templateUrl: app.getBaseUrlPath() + '/html/aw-widget-with-tooltip.directive.html'
            };
        }
    ] );
