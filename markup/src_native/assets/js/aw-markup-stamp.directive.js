// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/**
 * Directive to support markup stamp implementation.
 *
 * @module js/aw-markup-stamp.directive
 */
import app from 'app';
import $ from 'jquery';
import markupService from 'js/Awp0MarkupService';
import markupViewModel from 'js/MarkupViewModel';
import 'js/aw-property-image.directive';

'use strict';

/**
 * Directive for markup stamp implementation.
 *
 * @example <aw-markup-stamp vmo="item"></aw-markup-stamp>
 *
 * @member aw-markup-stamp
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupStamp', [
    function() {
        return {
            restrict: 'E',
            scope: { vmo: '=' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-stamp.directive.html',
            controller: [ '$scope', '$sce', '$element', function( $scope, $sce, $element ) {
                $scope.toggleGroup = markupService.toggleStampGroup;
                $scope.composeHtml = function( stamp ) {
                    stamp.isDeletable = markupViewModel.isDeletable( stamp );
                    return $sce.trustAsHtml( markupViewModel.getStampHtml( stamp ) );
                };
                $scope.tooltip = function( stamp ) {
                    return stamp.displayname + '\n' + stamp.date.toLocaleString();
                };

                var parent = $element.parent()[0];
                parent.draggable = Boolean( $scope.vmo.stampName );
                parent.parentElement.parentElement.draggable = false;
                parent.addEventListener( 'dragstart', function( ev ) {
                    var svg = $element.find( 'svg' )[0];
                    if( svg ) {
                        ev.dataTransfer.setDragImage( svg, svg.clientWidth / 2, svg.clientHeight / 2 );
                    } else {
                        var table = $element.find( 'table' )[0];
                        ev.dataTransfer.setDragImage( table, 0, 0 );
                    }
                    ev.dataTransfer.setData( 'text/aw-markup-stamp', $scope.vmo.stampName );
                    ev.dataTransfer.effectAllowed = 'move';
                } );
            } ]
        };
    }
] );
