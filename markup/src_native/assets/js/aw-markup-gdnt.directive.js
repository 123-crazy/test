// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to support markup GD&T implementation.
 *
 * @module js/aw-markup-gdnt.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-property-label.directive';
import 'js/aw-command-bar.directive';
import 'js/viewModelService';

'use strict';

/**
 * Directive for markup GD&T implementation.
 *
 * @example <aw-markup-gdnt prop="data.gdntValue" list="data.gdntSymbolValues.dbValue" action="gdntValueChanged" ></aw-markup-gdnt>
 *
 * @member aw-markup-gdnt
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupGdnt', [ 'viewModelService',
    function( viewModelSvc ) {
        return {
            restrict: 'E',
            scope: { prop: '=', list: '=', action: '@' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-gdnt.directive.html',
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.init = function() {
                    $scope.array = valueToArray( $scope.prop.dbValue );
                };

                $scope.setFocus = function( event ) {
                    $scope.focused = event.target;
                };

                $scope.selected = function( v ) {
                    const sym = v.propInternalValue;
                    let el = $scope.focused;
                    if( !el ) {
                        el = $element.find( 'input[type="text"]' )[0];
                    }

                    if( el ) {
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        const text = el.value;
                        el.value = text.substring( 0, start ) + sym + text.substring( end, text.length );
                        el.selectionStart = start + sym.length;
                        el.selectionEnd = el.selectionStart;
                        el.focus();

                        const td = el.parentElement;
                        const tr = td.parentElement;
                        const table = tr.parentElement;
                        const col = Array.from( tr.children ).indexOf( td );
                        const row = Array.from( table.children ).indexOf( tr );
                        $scope.array[ row ][ col + 1 ] = el.value;
                        $scope.updateDbValue();
                    }
                };

                $scope.updateDbValue = function() {
                    $scope.prop.dbValue = arrayToValue( $scope.array );
                    if( $scope.action ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    }
                };

                $scope.init();

                const gdntChangeRow = eventBus.subscribe( 'awp0Markup.gdntChangeRow', function( eventData ) {
                    const op = eventData.op;
                    const array = $scope.array;

                    if( op === 'addRow' ) {
                        array.push( [ 1, '', '', '', '', '' ] );
                    } else if( op === 'addGroupedRow' ) {
                        adjustRowSpan( array, 1 );
                        array.push( [ 0, '', '', '', '' ] );
                    } else if( op === 'removeRow' && array.length > 1 ) {
                        if( array[ array.length - 1 ][0] === 0 ) {
                            adjustRowSpan( array, -1 );
                        }
                        array.pop();
                    }

                    $scope.updateDbValue();
                } );

                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( gdntChangeRow );
                } );

                /**
                 * Convert string value to array of rows
                 * where each row is [rowspan, symbol, tolerance, refA, refB, refC]
                 * when rowspan > 1, the following covered rows are [0, tolerance, refA, refB, refC]
                 *
                 * @param {String} value - the value in HTML
                 * @returns {Array} the array
                 */
                function valueToArray( value ) {
                    if( value === '' ) {
                        return [ [ 1, '', '', '', '', '' ] ];
                    }

                    const trs = value.split( '</tr><tr>' );
                    let array = trs.map( ( tr ) => {
                        const tds = tr.match( />[^<]*<\/td>/gu );
                        const vals = tds.map( ( v ) => v.substring( 1, v.length - 5 ) );
                        const attrs = tr.match( /rowspan="\d+"/ );
                        const rowspan = attrs && attrs.length > 0 ? Number( attrs[0].match( /\d+/ )[0] ) : 1;

                        return [ rowspan, ...vals ];
                    } );

                    for( let i = 0; i < array.length; i++ ) {
                        const rowspan = array[i][0];
                        for( let j = 1; j < rowspan; j++ ) {
                            array[i + j][0] = 0;
                        }

                        const len = rowspan > 0 ? 6 : 5;
                        for( let l = array[i].length; l < len; l++ ) {
                            array[i].push( '' );
                        }
                    }
                    return array;
                }

                /**
                 * Convert array to string value
                 * @param {String[]} array - the array
                 * @returns {String} the value in HTML
                 */
                function arrayToValue( array ) {
                    let toTrim = 4;
                    for( var i = 0; i < array.length; i++ ) {
                        var last = array[i].length - 1;
                        for( var j = 0; j <= last; j++ ) {
                            if( array[i][ last - j ] ) {
                                toTrim = Math.min( toTrim, j );
                                break;
                            }
                        }
                    }

                    let value = '';
                    for( i = 0; i < array.length; i++ ) {
                        value += '<tr>';
                        last = array[i].length - 1 - toTrim;
                        for( j = 1; j <= last; j++ ) {
                            let rowspan = array[i][0];
                            let attr = j === 1 && rowspan > 1 ? ' rowspan="' + rowspan + '"' : '';
                            attr += ' style="border:1px solid black; padding: 2px 4px 2px 4px;"';
                            value += '<td' + attr + '>' + array[i][j] + '</td>';
                        }
                        value += '</tr>';
                    }

                    return '<table style="border:1px solid black; border-collapse:collapse; width:20px;">' + value + '</table>';
                }

                /**
                 * Adjust the rowspan of the last element in array that has rowspan >= 1
                 * @param {String[]} array - the array to be updated
                 * @param {Number} number - the amount to be adjusted
                 */
                function adjustRowSpan( array, number ) {
                    for( let i = array.length - 1; i >= 0; i-- ) {
                        if( array[i][0] >= 1 ) {
                            array[i][0] += number;
                            break;
                        }
                    }
                }
            } ]
        };
    }
] );
