// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to support custom relation cell implementation.
 *
 * @module js/aw-matrix-cell.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import $ from 'jquery';
import parsingUtils from 'js/parsingUtils';

/**
 * Directive for custom relation cell implementation.
 *
 * @example <aw-matrix-cell vmo="model"></aw-matrix-cell>
 *
 * @member aw-matrix-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awMatrixCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=',
            row: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-matrix-cell.directive.html',
        link: function( $scope, $element ) {
            var grid = parsingUtils.parentGet( $scope, 'grid' );
            var gridId = grid.appScope.gridid;
            var parentDiv = $element.parent();
            var childDiv = $element.children().get( 0 );
            var innerDiv = $( childDiv ).children().get( 0 );
            $element.find( 'div' ).on( 'click', function( e ) {
                var colRenderIndex = parsingUtils.parentGet( $scope, 'colRenderIndex' );
                if( grid.cellNav.lastRowCol ) {
                    if( parentDiv.hasClass( 'aw-matrix-selectedcell' ) ) {
                        eventBus.publish( gridId + '.gridCellDeSelection', {
                            deSelectedObject: $element,
                            lastRowCol: grid.cellNav.lastRowCol,
                            grid: grid,
                            colRenderIndex: colRenderIndex
                        } );
                    } else {
                        grid.cellNav.lastRowCol = null;
                    }
                }
            } );
            grid.api.core.on.scrollEnd( $scope, function( row ) {
                $( childDiv ).removeClass( 'ui-grid-cell-focus' );
                $( innerDiv ).removeClass( 'ui-grid-cell-focus' );
            } );
            $scope.$watch( 'prop', function() {
                var parsedCell = '';
                var top = grid.element[ 0 ];
                var lastRowCol = grid.cellNav.lastRowCol;
                if( lastRowCol ) {
                    var cellTemplate = lastRowCol.col.cellTemplate;
                    if( cellTemplate.indexOf( "_colindex" ) > 0 ) {
                        var colIndexStr = cellTemplate.substring( cellTemplate.indexOf( "_colindex" ) );
                        var colIndexVal = colIndexStr.substring( 11, 12 );
                    }
                }
                if( $scope.prop ) {
                    if( !$scope.row.entity.isRowSelected ) {
                        if( parentDiv.hasClass( 'aw-matrix-selectedcell' ) ) {
                            parentDiv.removeClass( 'aw-matrix-selectedcell' );
                        }
                        $( childDiv ).removeClass( 'ui-grid-cell-focus' );
                        $( innerDiv ).removeClass( 'ui-grid-cell-focus' );
                    }
                    if( lastRowCol ) {
                        if( lastRowCol.row.entity.isRowSelected && $scope.row.entity.uid === lastRowCol.row.entity.uid ) {
                            var colSelected = false;
                            var innerHtml = parentDiv[ 0 ].innerHTML;
                            if( innerHtml.indexOf( "_colindex" ) > 0 ) {
                                var colIdxStr = innerHtml.substring( innerHtml.indexOf( "_colindex" ) );
                                var colIdxVal = colIdxStr.substring( 11, 12 );
                                var oldColRenderIndex = parseInt( colIdxVal );
                                var ocolFilter = '[_colindex="' + oldColRenderIndex + '"]';
                                var oldCol = $( top ).find( "aw-matrix-column-header" ).filter( ocolFilter )
                                    .get( 0 );
                                var oldColHead = $( oldCol ).parent().get( 0 );
                                if( $( oldColHead ).hasClass( "ui-grid-column-header-selected" ) ) {
                                    colSelected = true;
                                }
                                if( colIndexVal === colIdxVal && colSelected ) {
                                    parentDiv.addClass( 'aw-matrix-selectedcell' );
                                }
                            }
                        }
                    }
                    if( $scope.prop.displayValues[ 0 ] !== undefined ) {
                        if( _.isString( $scope.prop.displayValues[ 0 ] ) ) {
                            parsedCell = $scope.prop.displayValues[ 0 ];
                        }
                    }
                }
                //Adding the parsedCell containing the HTML to the innermost div of the directive
                var innerCellDiv = $( $element ).find( "span.aw-matrix-cellContent" );
                $( innerCellDiv ).html( parsedCell );
                $( $element ).attr( "_rowindex", $scope.prop.propertyDescriptor.rowIdx );
            } );
        }
    };
} ] );
