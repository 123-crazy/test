// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-non-edit-array-val) directive.
 *
 * @module js/aw-property-non-edit-array-val.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/uwMaxRowService';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-command-bar.directive';
import 'js/exist-when.directive';
import 'js/aw-highlight-property-html.directive';
/**
 * Definition for the (aw-property-non-edit-array-val) directive.
 *
 * @example TODO
 *
 * @member aw-property-non-edit-array-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyNonEditArrayVal', [
    '$timeout', 'uwMaxRowService', '$sce',
    function( $timeout, maxRowSvc, $sce ) {
        // add directive controller for prop update or pass in using &?
        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '<',
                inTableCell: '@'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-non-edit-array-val.directive.html',
            link: function( $scope, $element ) {
                if( !$scope.prop ) {
                    return;
                }

                var trustedHtml = '<ul>';
                _.forEach( $scope.prop.displayValues, function( value ) {
                    trustedHtml += '<li>' + value + '</li>';
                } );
                trustedHtml += '</ul>';
                $scope.trustedRichtext = $sce.trustAsHtml( trustedHtml );

                $scope.showTooltip = false;
                $scope.toggleTooltip = function( toggle ) {
                    if( toggle ) {
                        $timeout.cancel( $scope.timeoutPromise );
                        $scope.timeoutPromise = $timeout( function() {
                            $scope.showTooltip = true;
                        }, 750 );
                    } else {
                        $timeout.cancel( $scope.timeoutPromise );
                        $scope.timeoutPromise = $timeout( function() {
                            $scope.showTooltip = false;
                        }, 750 );
                    }
                };

                // LCS-166817 - Active Workspace tree table view performance in IE and embedded in TCVis
                //              is bad - Framework Fixes
                // Why we need an extra digest here? Disable it for now.
                $scope.nonEditArrayTimer = $timeout( function() {
                    var arrayHeight = maxRowSvc._calculateArrayHeight( $element, $scope.prop.maxRowCount );
                    if( arrayHeight ) {
                        $scope.arrayHeight = arrayHeight;
                    }
                }, 0, false );

                $scope.$on( '$destroy', function() {
                    if( $scope.timeoutPromise ) {
                        $timeout.cancel( $scope.timeoutPromise );
                    }
                    $element.remove();
                    $element.empty();
                } );
            }
        };
    }
] );
