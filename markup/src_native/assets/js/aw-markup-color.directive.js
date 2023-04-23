// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to support markup color picker implementation.
 *
 * @module js/aw-markup-color.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-property-label.directive';
import 'js/aw-property-image.directive';
import 'js/uwListService';
import 'js/viewModelService';

'use strict';

/**
 * Directive for markup color implementation.
 *
 * @example <aw-markup-color prop="data.fillColor" list="data.fillColorValues.dbValue"></aw-markup-color>
 *
 * @member aw-markup-color
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupColor', [ 'uwListService', 'viewModelService',
    function( uwListSvc, viewModelSvc ) {
        return {
            restrict: 'E',
            scope: { prop: '=', list: '=', action: '@' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-color.directive.html',
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.init = function() {
                    $scope.expanded = false;
                    var dbV = $scope.prop.dbValue;
                    $scope.prop.color = /^#[0-9A-Fa-f]{3,8}$/.test( dbV ) ? dbV.substring( 0, 7 ) : "#ff0000";

                    $scope.prop.uiValue = $scope.prop.dbValue;
                    _.forEach( $scope.list, function( e ) {
                        if( $scope.prop.dbValue === e.propInternalValue ) {
                            $scope.prop.uiValue = e.propDisplayValue;
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

                $scope.picked = function() {
                    $scope.prop.dbValue = $scope.prop.color;
                    $scope.prop.uiValue = $scope.prop.color;
                    $scope.init();
                    if( $scope.action ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    }
                };

                $scope.selected = function( v ) {
                    if( v.propInternalValue !== "picker" ) {
                        $scope.prop.uiValue = v.propDisplayValue;
                        $scope.prop.dbValue = v.propInternalValue;
                        $scope.init();

                        if( $scope.action ) {
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                        }
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
