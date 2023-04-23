// Copyright (c) 2019 Siemens

/* global
 define
 */

/**
 * @module js/aw-graph-legend-category.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import graphLegendService from 'js/graphLegendService';
import _ from 'lodash';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';

'use strict';

/**
 * Directive to display relations category
 *
 * @example <aw-graph-legend-category></aw-graph-legend-category>
 *
 * @member aw-graph-legend-category
 * @memberof NgElementDirectives
 */
app.directive( 'awGraphLegendCategory', [ function() {
    return {
        transclude: true,
        restrict: 'E',
        scope: {
            category: '=',
            editable: '='
        },
        controller: [ '$scope', function( $scope ) {
            $scope.toggleFilter = function( category ) {
                category.isFiltered = !category.isFiltered;

                eventBus.publish( 'awGraphLegend.filterStatusChanged', {
                    category: category
                } );

                $scope.$emit( 'awGraphLegend.filterStatusChanged', {
                    category: category
                } );
            };

            /**
             * publish event to select category header
             *
             */
            $scope.select = function( event, category ) {
                if( $scope.editable ) {
                    // update creation mode on selected legend category
                    // toggle category expansion if sub categories more than one
                    if( category.authorableSubCategories && category.authorableSubCategories.length > 1 ) {
                        category.isExpanded = !category.isExpanded;

                        // set the first type category for creation by default
                        if( category.isExpanded && category.creationMode === 0 ) {
                            category.authorableSubCategories[ 0 ].creationMode = 1;
                            category.creationMode = 1;
                        }
                    } else {
                        category.creationMode = ( category.creationMode + 1 ) % 3;
                        if( category.authorableSubCategories && category.authorableSubCategories.length === 1 ) {
                            category.authorableSubCategories[ 0 ].creationMode = category.creationMode;
                        } else if( category.isSub && category.parent ) {
                            category.parent.creationMode = category.creationMode;
                        }
                    }

                    // get creation category and type category
                    var creationCategory = null;
                    var creationTypeCategory = null;
                    if( category.isSub ) {
                        creationCategory = category.parent;
                        creationTypeCategory = category;
                    } else {
                        creationCategory = category;
                        creationTypeCategory = _.find( category.authorableSubCategories, function( typeCategory ) {
                            return typeCategory.creationMode !== 0;
                        } );

                        $scope.$emit( 'awGraphLegend.creationCategoryChanged', {
                            category: creationCategory
                        } );
                    }

                    eventBus.publish( 'awGraphLegend.creationCategoryChanged', {
                        category: creationCategory,
                        typeCategory: creationTypeCategory
                    } );
                } else if( category.count > 0 ) {
                    category.isSelected = !category.isSelected;
                    $scope.$emit( 'awGraphLegend.categorySelectionChanged', {
                        category: category,
                        isCtrlDown: event.ctrlKey
                    } );
                }
            };
        } ],
        link: function( $scope ) {
            var categoryUpdateEventRegistration = eventBus.subscribe( 'category.update', function( events ) {
                if( events.category === $scope.category ) {
                    _.defer( function() {
                        $scope.$apply();
                    } );
                }
            } );

            $scope.$on( '$destroy', function() {
                if( categoryUpdateEventRegistration ) {
                    eventBus.unsubscribe( categoryUpdateEventRegistration );
                    categoryUpdateEventRegistration = null;
                }
            } );

            $scope.$watch( 'editable', function( value ) {
                if( !$scope.category ) {
                    return;
                }

                if( !value ) {
                    $scope.category.isExpanded = value;
                }
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-graph-legend-category.directive.html'
    };
} ] );
