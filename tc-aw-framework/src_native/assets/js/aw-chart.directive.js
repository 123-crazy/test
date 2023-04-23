// Copyright (c) 2020 Siemens

/**
 * Directive to display a column chart using Highcharts.
 *
 * @module js/aw-chart.directive
 * @requires app
 * @requires jquery
 * @requires lodash
 * @requires js/eventBus
 * @requires highcharts
 * @requires js/localeService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import awHighcharts from 'js/awHighcharts';
import awChartService from 'js/awChartService';
import localeService from 'js/localeService';
import 'js/cssUtils.service';
import 'js/viewModelService';
import 'js/declDataProviderService';
import 'js/sanitizer';

/**
 * Directive to display a column or a curve chart using Highcharts.
 *
 * @example <aw-chart chart-provider="data.chartProviders.myChartProvider"></aw-chart>
 *
 * @member aw-chart
 * @memberof NgElementDirectives
 */
app.directive( 'awChart', [ function() {
    return {
        restrict: 'E',
        scope: {
            /**
             * The chart provider. This is a configurable object with a "title" (String) , "chartType" (String) ,
             * "loadDataAction" (Object[]) and "chartConfig" (Object).
             *
             * "loadDataAction" holds chartPoints that has an array of "label" (String) and "value" (Number) property.
             */
            chartProvider: '='
        },
        controller: [ '$scope',
            'viewModelService',
            'declDataProviderService',
            'sanitizer',
            function( $scope, viewModelService, declDataProviderService, { escapeMarkup } ) {
                const highcharts = awHighcharts.getHighchartsInstance();
                highcharts.setOptions( {
                    lang: {
                        thousandsSep: ','
                    }
                } );
                /**
                 * The id of the chart
                 * @member chartID
                 * @memberOf NgControllers.awChartCtrl
                 */
                $scope.chartID = 'aw-chart-' + $scope.$id;
                localeService.getLocalizedTextFromKey( 'chartMessages.noDataToDisplayForChart', true ).then( result => $scope.chartProvider.noDataMessage = result );

                /**
                 * Controller reference
                 */
                var self = this;

                self.refreshChart = function() {
                    $scope.chart = awChartService.refreshChart( highcharts, $scope.chartProvider, $scope.chartID, escapeMarkup );
                };
                self.refreshColors = function() {
                    awChartService.refreshColors( $scope.chartProvider, $scope.chart );
                };
                self.reflow = function() {
                    // Resize the chart
                    if( $scope.chart ) {
                        $scope.chart.reflow();
                    }
                };
                self.doLoadChartDataAction = function( loadActionName ) {
                    var declViewModel = viewModelService.getViewModel( $scope, true );
                    var loadAction = declViewModel.getAction( loadActionName );
                    return declDataProviderService.executeLoadAction( loadAction, {}, $scope ).then( function() {
                        awChartService.refreshChart( $scope.chartProvider, $scope.chartID );
                    } );
                };
            }
        ],
        link: function( $scope, $element, $attr, $controller ) {
            /**
             * The current element will be used as the target for the chart
             */
            $element.attr( 'id', $scope.chartID );

            /**
             * When the chartProvider or any properties on it change, refresh the chart
             */
            $scope.$watchGroup( [ 'chartProvider', 'chartProvider.title', 'chartProvider.type', 'chartProvider.chartConfig' ], $controller.refreshChart );

            /**
             * When the container div resizes also resize the chart
             */
            $scope.$watch( function _watchChartColumnSize() {
                return {
                    h: $element.height(),
                    w: $element.width()
                };
            }, _.debounce( function( a, b ) {
                // Filter the initial update
                if( a !== b ) {
                    $controller.reflow();
                }
            }, 250, {
                leading: true,
                trailing: true
            } ), true );

            /**
             * Does a shallow watch of the chart points - if one is added or removed the chart will update, but changing
             * a value for a chartPoint will not update it.
             */
            $scope.$watchCollection( 'chartProvider.chartPoints', function( a, b ) {
                // Filter the initial update
                if( a !== b ) {
                    $controller.refreshChart();
                }
            } );

            // Action for loading chart data ; a mandatory field
            var loadData = function() {
                if( $scope.chartProvider.loadDataAction ) {
                    $controller.doLoadChartDataAction( $scope.chartProvider.loadDataAction );
                }
            };

            loadData();

            /**
             * When the theme changes update the colors
             */
            var handleThemeChangeEvent = function() {
                // Add listener
                var themeChangeListener = eventBus.subscribe( 'ThemeChangeEvent', function() {
                    $scope.$evalAsync( $controller.refreshColors );
                } );

                // And remove it when the scope is destroyed
                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( themeChangeListener );
                } );
            };
            handleThemeChangeEvent();

            /**
             * Unbind the chart on destroy
             */
            $scope.$on( '$destroy', function() {
                if( $scope.chart ) {
                    if( $scope.chart.destroy ) {
                        $scope.chart.destroy();
                    }
                    $scope.chart = null;
                }
            } );
        }
    };
} ] );
