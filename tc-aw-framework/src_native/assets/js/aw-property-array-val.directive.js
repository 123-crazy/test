// Copyright (c) 2020 Siemens

/**
 * Definition for the <aw-property-array-val> directive.
 *
 * @module js/aw-property-array-val.directive
 */
import app from 'app';
import $ from 'jquery';
import 'js/uwMaxRowService';
import 'js/aw.property.array.val.controller';
import 'js/aw-property-array-edit-val.directive';
import 'js/aw-property-image.directive';
import 'js/aw-command-bar.directive';
import 'js/exist-when.directive';

/**
 * Definition for the <aw-property-array-val> directive.
 *
 * @example TODO
 *
 * @member aw-property-array-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyArrayVal', [
    '$timeout', 'uwMaxRowService',
    function( $timeout, maxRowSvc ) {
        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '=',
                inTableCell: '@'
            },
            controller: 'awPropertyArrayValController',
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-array-val.directive.html',
            link: function( $scope, $element ) {
                if( !$scope.prop ) {
                    return;
                }

                $scope.editArrayTimer = $timeout( function() {
                    var arrayHeight = maxRowSvc._calculateArrayHeight( $element, $scope.prop.maxRowCount );
                    if( arrayHeight ) {
                        $scope.arrayHeight = arrayHeight;
                    }
                } );

                // This will get removed once IE/Edge start supporting focus-within CSS pseudo selector
                var elementToFind = '.aw-jswidgets-arrayWidgetContainer';
                var classToToggle = 'aw-jswidgets-arrayWidgetContainerFocused';

                $( $element ).focusin( function() {
                    $( this ).find( elementToFind ).addClass( classToToggle );
                } );

                $( $element ).focusout( function() {
                    $( this ).find( elementToFind ).removeClass( classToToggle );
                } );

                $scope.$on( '$destroy', function() {
                    $element.remove();
                    $element.empty();
                } );
            }
        };
    }
] );
