// Copyright (c) 2020 Siemens

/**
 * Directive to display a column chart using Highcharts.
 *
 * @module js/aw-column-chart.directive
 * @requires app
 * @requires jquery
 * @requires lodash
 * @requires js/eventBus
 * @requires highcharts
 * @requires js/localeService
 *
 * @deprecated afx@4.3.0.
 * @alternative <aw-chart> - Use aw-chart with chartType 'column'
 * @obsoleteIn afx@6.0.0
 *
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-column-chart.controller';

/**
 * Directive to display a column chart using Highcharts.
 *
 * @example <aw-column-chart chart-provider="chartProvider"></aw-column-chart>
 *
 * @member aw-column-chart
 *  @memberof NgElementDirectives
 *
 * @returns {awColumnChart} Reference to this controller.
 */
app.directive( 'awColumnChart', [ function() {
    return {
        restrict: 'E',
        scope: {
            /**
             * The chart provider. This is an object with a "title" (String) and "columns" (Object[]). Each column
             * has a "label" (String) and "value" (Number) property.
             */
            chartProvider: '<'
        },
        controller: 'awColumnChartCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            var _prevHeight;
            var _prevWidth;
            var _themeChangeSubDef;

            /**
             * Delay checking changes in the chart size.
             */
            var _pingResizeCheck = _.debounce( function() {
                if( !$scope.chart ) {
                    return;
                }
                var height = $element.height();
                var width = $element.width();

                // Filter the initial update
                if( height !== _prevHeight || width !== _prevWidth ) {
                    _prevHeight = height;
                    _prevWidth = width;

                    $controller.reflow();
                }
            }, 500, {
                maxWait: 10000,
                trailing: true,
                leading: false
            } );

            /**
             * When the theme changes update the colors
             */
            _themeChangeSubDef = eventBus.subscribe( 'ThemeChangeEvent', function() {
                $scope.$evalAsync( $controller.refreshColors );
            } );

            /**
             * The current element will be used as the target for the chart
             */
            $element.attr( 'id', $scope.chartID );

            /**
             * When the chart provider or any properties on it change refresh the chart
             */
            $scope.$watchGroup( [ 'chartProvider', 'chartProvider.title' ], $controller.refreshChart );

            /**
             * When the container div resizes also resize the chart
             */
            $scope.$watch( function _watchChartColumnSize() {
                _pingResizeCheck();
            } );

            /**
             * Does a shallow watch of the columns - if one is added or removed the chart will update, but changing
             * a value in a column will not update it.
             */
            $scope.$watchCollection( 'chartProvider.columns', function _watchChartCollection( a, b ) {
                // Filter the initial update
                if( a !== b ) {
                    $controller.refreshChart();
                }
            } );

            /**
             * Unbind the chart on destroy
             */
            $scope.$on( '$destroy', function() {
                if( _pingResizeCheck ) {
                    _pingResizeCheck.cancel();
                    _pingResizeCheck = null;
                }

                if( _themeChangeSubDef ) {
                    eventBus.unsubscribe( _themeChangeSubDef );
                    _themeChangeSubDef = null;
                }

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
