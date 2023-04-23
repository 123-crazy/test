// Copyright (c) 2020 Siemens

/**
 * Directive to display a filter text-box and a list of items obtained from a dataprovider. Changing the filter text
 * updates the list of items.
 *
 * @module js/aw-list-filter.directive
 */

import app from 'app';
import _ from 'lodash';
import 'js/aw-textbox.directive';
import 'js/aw-list.directive';
import 'js/aw-transclude.directive';
import 'js/localeService';
import 'js/aw-i18n.directive';

/**
 * Directive to display a filter text-box and a list of items obtained from a dataprovider. Changing the filter text
 * updates the list of items.
 *
 * @example <aw-list-filter prop="filterBox" dataprovider="dataProvider"></aw-list-filter>
 *
 * @member aw-list-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awListFilter', [
    'localeService',
    function( localeSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                prop: '=',
                dataprovider: '=',
                useVirtual: '@',
                fixedCellHeight: '@?',
                isGroupList: '@?',
                hasFloatingCellCommands: '<?'
            },
            controller: [
                '$scope',
                '$timeout',
                function( $scope, $timeout ) {
                    if( _.isUndefined( $scope.useVirtual ) ) {
                        $scope.useVirtual = 'false';
                    }
                    // Per Ux standard, the filter box must not have a display label
                    if( _.isString( $scope.prop.propertyDisplayName ) ) {
                        $scope.prop.propertyDisplayName = undefined;
                    }

                    // Per Ux standard, ensure place holder text if not already
                    if( _.isUndefined( $scope.prop.propertyRequiredText ) ||
                        $scope.prop.propertyRequiredText.length === 0 ) {
                        localeSvc.getTextPromise().then( function( localTextBundle ) {
                            $scope.prop.propertyRequiredText = localTextBundle.FILTER_TEXT;
                        } );
                    }

                    // Set timer delay of 1.5 seconds before initiating dataprovider.
                    var filterTimeout = null;
                    $scope.$watch( 'prop.dbValue', function _watchPropDbValue( newValue, oldValue ) {
                        if( !_.isNull( filterTimeout ) ) {
                            $timeout.cancel( filterTimeout );
                        }

                        if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) && newValue !== oldValue ) {
                            filterTimeout = $timeout( function() {
                                $scope.dataprovider.initialize( $scope );
                            }, 1500 );
                        }
                    } );
                }
            ],

            link: function( $scope, $element ) {
                $element.addClass( 'aw-layout-flexColumn' );
            },

            templateUrl: app.getBaseUrlPath() + '/html/aw-list-filter.directive.html'
        };
    }
] );
