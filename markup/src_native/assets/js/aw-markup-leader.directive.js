/* eslint-disable no-nested-ternary */
// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to support markup leader lines implementation.
 *
 * @module js/aw-markup-leader.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/viewModelService';

'use strict';

/**
 * Directive for markup leader lines implementation.
 *
 * @example <aw-markup-leader prop="data.leaderValue" list="data.leaderSymbolValues.dbValue" action="leaderValueChanged" ></aw-markup-leader>
 *
 * @member aw-markup-leader
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupLeader', [ 'viewModelService',
    function( viewModelSvc ) {
        return {
            restrict: 'E',
            scope: { prop: '=', list: '=', action: '@' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-leader.directive.html',
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.init = function() {
                    $scope.text = $scope.prop.dbValue.replace( /^<div>/, '' ).replace( /<\/div>$/, '' ).replace( /<\/div><div>/g, '\n' );
                };

                $scope.setFocus = function( event ) {
                    $scope.focused = event.target;
                };

                $scope.selected = function( v ) {
                    const sym = v.propInternalValue;
                    const el = $scope.focused;
                    if( el ) {
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        const text = el.value;
                        el.value = text.substring( 0, start ) + sym + text.substring( end, text.length );
                        el.selectionStart = start + sym.length;
                        el.selectionEnd = el.selectionStart;
                        $scope.focused.focus();
                        $scope.text = el.value;
                        $scope.updateDbValue();
                    }
                };

                $scope.updateDbValue = function() {
                    $scope.prop.dbValue = '<div>' + $scope.text.replace( /\n/g, '</div><div>' ) + '</div>';
                    if( $scope.action ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    }
                };

                $scope.init();
            } ]
        };
    }
] );
