// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-array-edit-val) directive.
 *
 * @module js/aw-property-array-edit-val.directive
 */
import app from 'app';
import 'js/uwSupportService';

/**
 * Definition for the (aw-property-array-edit-val) directive.
 *
 * @example TODO
 *
 * @member aw-property-array-edit-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyArrayEditVal', [
    'uwSupportService',
    function( uwSupportSvc ) {
        // add directive controller for prop update or pass in using &?
        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-array-edit-val.directive.html',
            link: function( $scope, $element ) {
                if( !$scope.prop ) {
                    return;
                }

                var jqParentElement = $element.find( '.aw-jswidgets-arrayEditWidgetContainer' );

                uwSupportSvc.includeArrayPropertyValue( jqParentElement, $element, $scope.prop );

                $scope.$on( '$destroy', function() {
                    $element.remove();
                    $element.empty();
                } );
            }
        };
    }
] );
