// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to support markup geometry picker implementation.
 *
 * @module js/aw-markup-geom.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-property-label.directive';
import 'js/aw-property-image.directive';
import 'js/uwListService';
import 'js/viewModelService';

'use strict';

/**
 * Directive for markup geometry picker implementation.
 *
 * @example <aw-markup-geom prop="data.edgeWidth" list="data.edgeWidthValues.dbValue">
 *             <svg><defs>...</defs></svg>
 *          </aw-markup-geom>
 *
 * @member aw-markup-geom
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupGeom', [ 'uwListService', 'viewModelService',
    function( uwListSvc, viewModelSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: { prop: '=', list: '=', action: '@' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-geom.directive.html',
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.init = function() {
                    $scope.expanded = false;
                    _.forEach( $scope.list, function( e ) {
                        if( $scope.prop.dbValue === e.propInternalValue ) {
                            $scope.prop.uiValue = e.propDisplayValue;
                            $scope.prop.uiId = e.propDisplayId;
                            e.sel = true;
                            e.attn = true;
                        } else {
                            e.sel = false;
                            e.attn = false;
                        }
                    } );
                };

                $scope.toggle = function() {
                    if( $scope.expanded ) {
                        uwListSvc.collapseList( $scope );
                    } else {
                        uwListSvc.expandList( $scope, $element );

                        var choiceRect = $element.find( '.aw-jswidgets-choice' )[0].getBoundingClientRect();
                        $scope.lovDDLeft = choiceRect.left;
                        $scope.lovDDTop = choiceRect.top;
                        $scope.dropDownVerticalAdj = choiceRect.height + 'px';

                        $scope.$watch( function() {
                            return $element.find( '.aw-jswidgets-drop' )[0].clientHeight;
                        }, function( newValue, oldValue ) {
                            if( newValue !== oldValue && newValue + choiceRect.bottom > window.innerHeight ) {
                                $scope.dropDownVerticalAdj = -newValue + 'px';
                            }
                        } );
                    }
                };

                $scope.selected = function( v ) {
                    $scope.expanded = false;
                    $scope.prop.uiValue = v.propDisplayValue;
                    $scope.prop.uiId = v.propDisplayId;
                    $scope.prop.dbValue = v.propInternalValue;

                    _.forEach( $scope.list, function( e ) {
                        e.sel = false;
                        e.attn = false;
                    } );

                    v.sel = true;
                    v.attn = true;

                    if( $scope.action ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    }
                };

                $scope.handleFieldExit = function() {
                    _.forEach( $scope.list, function( e ) {
                        e.sel = false;
                        e.attn = false;
                    } );
                };

                $scope.init();
            } ]
        };
    }
] );

app.filter( 'toHrefId', [ '$sce', function( $sce ) {
    return function( id ) {
        return $sce.trustAsResourceUrl( '#' + id );
    };
} ] );
