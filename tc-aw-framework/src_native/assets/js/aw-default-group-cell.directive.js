// Copyright (c) 2020 Siemens

/**
 * Directive to support default group cell implementation
 *
 * @module js/aw-default-group-cell.directive
 */
import app from 'app';
import _ from 'lodash';
import ngModule from 'angular';
import $ from 'jquery';
import 'js/aw-list.directive';
import 'js/aw-default-cell.directive';
import 'js/aw-header-cell.directive';
import 'js/aw-list.controller';

/**
 * Directive to display logical grouping of cells with a header
 * group-by attribute accepts properties based on which cells will be logically grouped
 * <group-header-cell> : This is a transclusion element to specify customized header cell
 * <cell> : This is a transclusion element to specify customized content cell
 * @example <aw-list dataprovider="dataProvider" group-list="true">
 *              <aw-default-group-cell item="item" group-by="Type,Rating">
                    <group-header-cell>
                        <aw-header-cell title="{{item.Type}}/{{item.Rating}}"></aw-header-cell>
                    </group-header-cell>
                    <cell>
                        <aw-omdb-cell vmo="item"></aw-omdb-cell>
                    </cell>
                </aw-default-group-cell>
            </aw-list>
 *
 * @member aw-default-group-cell
 * @memberof NgElementDirectives
*/

app.directive( 'awDefaultGroupCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            item: '=',
            groupBy: '@'
        },
        transclude: {
            header: 'groupHeaderCell',
            cell: 'cell'
        },
        link: function( scope, $element ) {
            function isEqual( previousValue, currentValue, props ) {
                var isObjectEqual = true;
                if( !previousValue ) {
                    return false;
                }
                _.forEach( props, function( key ) {
                    if( _.get( previousValue, key ) !== _.get( currentValue, key ) ) {
                        isObjectEqual = false;
                        return false;
                    }
                } );
                return isObjectEqual;
            }
            var props = scope.groupBy.split( ',' );

            var cellElement = ngModule.element( $element );
            var headerCell = cellElement.find( 'ng-transclude.aw-widgets-groupCell' );

            var awList = $element.closest( 'aw-list' );
            var awListScope = awList.scope();

            if( scope.$parent.$index === 0 ) {
                awListScope.previousValues = {};
            }

            if( isEqual( awListScope.previousValues, scope.item, props ) ) {
                headerCell.remove();
            } else {
                _.forEach( props, function( key ) {
                    _.set( awListScope.previousValues, key, _.get( scope.item, key ) );
                } );

                // The DOM manipulation is done since the current aw-list implementation does not support grouping
                var closestLi = $element.closest( 'div.aw-widgets-cellListItem' );
                $( closestLi ).before( headerCell );
            }
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-default-group-cell.directive.html'
    };
} ] );
