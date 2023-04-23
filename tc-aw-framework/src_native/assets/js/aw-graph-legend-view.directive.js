// Copyright (c) 2019 Siemens

/* global
 define
 */

/**
 * @module js/aw-graph-legend-view.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import graphLegendService from 'js/graphLegendService';
import _ from 'lodash';
import 'js/aw-graph-legend-category.directive';
import 'js/aw-panel-section.directive';

'use strict';

/**
 * Directive to display relations legend view
 *
 * @example <aw-graph-legend-view legend-view="view" editable="true"></aw-graph-legend-view>
 *
 * @member aw-graph-legend-view
 * @memberof NgElementDirectives
 */
app.directive( 'awGraphLegendView', [ function() {
    return {
        transclude: true,
        restrict: 'E',
        scope: {
            legendView: '=',
            editable: '='
        },
        link: function( $scope ) {
            $scope.$on( 'awGraphLegend.categorySelectionChanged', function( event, data ) {
                var category = data.category;
                if( !category ) {
                    return;
                }

                // handle single selection, reset all the other categories unselected
                var isMultiSelect = data.isCtrlDown;
                if( !isMultiSelect ) {
                    _.forEach( $scope.legendView.categoryTypes, function( categoryType ) {
                        _.forEach( categoryType.categories, function( category2 ) {
                            if( category2 === category ) {
                                return;
                            }

                            category2.isSelected = false;
                        } );
                    } );
                }

                eventBus.publish( 'awGraphLegend.categorySelectionChanged', {
                    legendView: $scope.legendView,
                    category: category,
                    isMultiSelect: isMultiSelect
                } );
            } );

            $scope.$on( 'awGraphLegend.filterStatusChanged', function( event, data ) {
                var category = data.category;
                if( !category ) {
                    return;
                }

                $scope.legendView.filteredCategories = null;
                $scope.legendView.filteredCategories = _( $scope.legendView.categoryTypes ).reduce(
                    function( allCategories, categoryType ) {
                        return allCategories.concat( categoryType.categories );
                    }, [] ).filter( function( category ) {
                    return category.isFiltered;
                } );
            } );

            $scope.$on( 'awGraphLegend.creationCategoryChanged', function( event, data ) {
                // collapse the expanded category in last time
                var category = data.category;
                if( category ) {
                    var allCategories = _.flatMap( $scope.legendView.categoryTypes, function( categoryType ) {
                        return categoryType.categories;
                    } );

                    var lastExpandedCategory = _.find( allCategories, function( c ) {
                        return c !== category && c.isExpanded;
                    } );

                    if( lastExpandedCategory ) {
                        lastExpandedCategory.isExpanded = false;
                    }
                }
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-graph-legend-view.directive.html'
    };
} ] );
