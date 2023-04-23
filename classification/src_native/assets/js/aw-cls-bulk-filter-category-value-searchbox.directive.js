// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aw-cls-bulk-filter-category-value-searchbox.directive
 * @deprecated
 */
import app from 'app';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/localeService';
import 'js/filterPanelService';
import 'js/aw-icon.directive';


/**
 * Directive to display search categories
 *
 * @example <aw-cls-bulk-filter-category-value-searchbox index="category.index" visible-when="category.showFilterText"
 *          filter-action="filterAction"
 *          is-bulk-filter="isBulkFilter"
 *          add-action="addAction" > </aw-cls-bulk-filter-category-searchbox>
 *
 * @member aw-cls-bulk-filter-category-value-searchbox
 * @memberof NgElementDirectives
 */
app.directive( 'awClsBulkFilterCategoryValueSearchbox', [
    'viewModelService',
    'localeService',
    function( viewModelSvc, localeSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filterAction: '=',
                index: '=',
                prop1: '=',
                category: '=',
                isBulkFilter: '=?',
                addAction: '=?',
                optionalPlaceHolder: '@'
            },
            controller: [
                '$scope', '$timeout',
                function( $scope, $timeout ) {
                    var filterTimeout = null;
                    viewModelSvc.getViewModel( $scope, true );
                    var resource = 'SearchMessages';

                    localeSvc.getTextPromise( resource ).then( function( localTextBundle ) {
                        $scope.filterValueText = localTextBundle.filterPanelCategoryFilterPlaceholderText;
                    } );

                    $scope.evalKeyup = function( $event ) {
                        if( $scope.filterAction ) {
                            //call custom action
                            $scope.keyCode = $event.keyCode;
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, $scope.filterAction, declUtils
                                .cloneData( $scope ) );
                        } else {
                            $scope.ctx.search.valueCategory = $scope.category;
                            if( !_.isNull( filterTimeout ) ) {
                                $timeout.cancel( filterTimeout );
                            }
                            filterTimeout = $timeout( function() {
                                $scope.category.showMoreFilter = $scope.category.filterBy === '';
                                if ( !$scope.category.isServerSearch ) {
                                    eventBus.publish( 'classifyFilter.updateRefineCategoriesAfterUpdate' );
                                } else {
                                eventBus.publish( 'classifyFilter.init', $scope.ctx.search.valueCategory );
                                }
                            }, 1500 );
                        }
                    };

                    $scope.add = function( category ) {
                        if( category.filterBy !== '' ) {
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, $scope.addAction, declUtils
                                .cloneData( $scope ) );
                        }
                    };
                }
            ],

            link: function( $scope ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-bulk-filter-category-value-searchbox.directive.html'
        };
    }
] );
