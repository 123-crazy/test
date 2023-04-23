/* eslint-disable no-nested-ternary */
// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to support markup welding symbols implementation.
 *
 * @module js/aw-markup-weld.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/viewModelService';

'use strict';

/**
 * Directive for markup Welding symbols implementation.
 *
 * @example <aw-markup-weld prop="data.weldValue" list="data.weldSymbolValues.dbValue" action="weldValueChanged" ></aw-markup-weld>
 *
 * @member aw-markup-weld
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupWeld', [ 'viewModelService',
    function( viewModelSvc ) {
        return {
            restrict: 'E',
            scope: { prop: '=', list: '=', action: '@' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-weld.directive.html',
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.init = function() {
                    $scope.array = valueToArray( $scope.prop.dbValue );
                };

                $scope.setFocus = function( event ) {
                    $scope.focused = event.target;
                };

                $scope.selected = function( v ) {
                    const sym = v.propInternalValue;
                    if( sym.length === 1 ) {
                        const el = $scope.focused;
                        if( el ) {
                            const start = el.selectionStart;
                            const end = el.selectionEnd;
                            const text = el.value;
                            el.value = text.substring( 0, start ) + sym + text.substring( end, text.length );
                            el.selectionStart = start + sym.length;
                            el.selectionEnd = el.selectionStart;
                            $scope.focused.focus();

                            const td = el.parentElement;
                            const tr = td.parentElement;
                            const table = tr.parentElement;
                            const col = Array.from( tr.children ).indexOf( td );
                            const row = Array.from( table.children ).indexOf( tr );
                            $scope.array[ row ][ col ] = el.value;
                            $scope.updateDbValue();
                        }
                    } else {
                        changeSymbol( sym );
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

                $scope.x1 = sym => { return sym === 'around' || sym === 'field' ? 0 : -16; };
                $scope.x2 = sym => { return sym === 'tail' ? 0 : 16; };
                $scope.fill = sym => { return sym === 'field' || sym === '_meltthru' ? 'black' : 'none'; };
                $scope.trans = sym => {
                    return sym === 'around' || sym === 'field' ? 'translate(-80,0)' :
                           sym === 'tail' ? 'translate(80,0)' : '';
                };

                $scope.pathd = {
                    fillet: 'M-6,0 v12 l12,-12',
                    _fillet: 'M-6,0 v-12 l12,12',
                    plug: 'M-8,0 v8 h16 v-8',
                    _plug: 'M-8,0 v-8 h16 v8',
                    spot: 'M-6,6 a6,6 0 0 0 12,0 a6,6 0 0 0 -12,0',
                    _spot: 'M-6,-6 a6,6 0 0 0 12,0 a6,6 0 0 0 -12,0',
                    __spot: 'M-6,0 a6,6 0 0 0 12,0 a6,6 0 0 0 -12,0',
                    stud: 'M-6,6 a6,6 0 0 0 12,0 a6,6 0 0 0 -12,0 m2,-4 l8,8 m0,-8 l-8,8',
                    backing: 'M-6,0 a6,6 0 0 0 12,0',
                    _backing: 'M-6,0 a6,6 0 0 1 12,0',
                    seam: 'M-6,6 a6,6 0 0 0 12,0 a6,6 0 0 0 -12,0 m-2,-3 h16 m0,6 h-16',
                    _seam: 'M-6,-6 a6,6 0 0 0 12,0 a6,6 0 0 0 -12,0 m-2,-3 h16 m0,6 h-16',
                    __seam: 'M-6,0 a6,6 0 0 0 12,0 a6,6 0 0 0 -12,0 m-2,-3 h16 m0,6 h-16',
                    surfacing: 'M-10,0 a5,5 0 0 0 10,0 a5,5 0 0 0 10,0',
                    edge: 'M-8,0 v10 h16 v-10 M0,0 v10',
                    _edge: 'M-8,0 v-10 h16 v10 M0,0 v-10',
                    square: 'M-3,0 v12 M3,0 v12',
                    _square: 'M-3,0 v-12 M3,0 v-12',
                    vgroove: 'M-8,8 l8,-8 l8,8',
                    _vgroove: 'M-8,-8 l8,8 l8,-8',
                    bevel: 'M-4,9 v-9 l8,8',
                    _bevel: 'M-4,-9 v9 l8,-8',
                    ugroove: 'M0,0 v6 m-6,6 a6,6 0 0 1 12,0',
                    _ugroove: 'M0,0 v-6 m-6,-6 a6,6 0 0 0 12,0',
                    jgroove: 'M-3,0 v12 m0,-6 a6,6 0 0 1 6,6',
                    _jgroove: 'M-3,0 v-12 m0,6 a6,6 0 0 0 6,-6',
                    flarev: 'M-3,0 a8,8 0 0 1 -8,8 M3,0 a8,8 0 0 0 8,8',
                    _flarev: 'M-3,0 a8,8 0 0 0 -8,-8 M3,0 a8,8 0 0 1 8,-8',
                    flarebeval: 'M-3,0 v9 M3,0 a8,8 0 0 0 8,8',
                    _flarebeval: 'M-3,0 v-9 M3,0 a8,8 0 0 1 8,-8',
                    scarf: 'M-3,0 l-6,12 M3,0 l-6,12',
                    _scarf: 'M-3,0 l6,-12 M3,0 l6,-12',
                    around: 'M-5,0 a5,5 0 0 0 10,0 a5,5 0 0 0 -10,0',
                    field: 'M0,-15 v15 v-7 l10,-4Z',
                    tail: 'M12,-12 l-12,12 l12,12',
                    _meltthru: 'M-6,0 a6,6 0 0 1 12,0',
                    _insert: 'M-6,0 v-12 h12 v12',
                    _flush: 'M-8,-8 h16',
                    _convex: 'M-8,-8 a12,12 0 0 1 16,0',
                    _concave: 'M-8,-10 a12,12 0 0 0 16,0'
                };

                $scope.init();

                /**
                 * convert string value to array of 3 rows, each has 4 or 2 columns
                 *
                 * @param {String} value - the value in HTML
                 * @returns {Array} the array
                 */
                function valueToArray( value ) {
                    if( value === '' ) {
                        return [ [ '', '', '', '' ], [ '', '' ], [ '', '', '', '' ] ];
                    }

                    const trs = value.split( '</tr><tr>' );
                    return trs.map( ( tr ) => {
                        const tds = tr.split( '</td><td>' );
                        return tds.map( ( td ) => {
                            const iSvg = td.indexOf( '<svg' );
                            const iTd = td.indexOf( '<td>' );
                            const iTdEnd = td.indexOf( '</td>' );
                            return iSvg >= 0 ? svgToSymbols( td ) : iTd >= 0 ? td.substring( iTd + 4 ) :
                                iTdEnd >= 0 ? td.substring( 0, iTdEnd ) : td;
                        } );
                    } );
                }

                /**
                 * Convert array to string value
                 * @param {String[]} array - the array
                 * @returns {String} the value in HTML
                 */
                function arrayToValue( array ) {
                    let empty = true;
                    for( let i = 0; i < array.length && empty; i++ ) {
                        for( let j = 0; j < array[i].length && empty; j++ ) {
                            if( array[i][j] ) {
                                empty = false;
                            }
                        }
                    }

                    if( empty ) {
                        return '';
                    }

                    let value = '';
                    for( let i = 0; i < array.length; i++ ) {
                        value += '<tr>';
                        for( let j = 0; j < array[i].length; j++ ) {
                            const attr = i === 1 && j === 0 ? ' colspan="3"' : '';
                            const v = attr ? symbolsToSvg( array[i][j], 160 ) : array[i][j];
                            value += '<td' + attr + '>' + v + '</td>';
                        }
                        value += '</tr>';
                    }

                    let colgroup = '<colgroup>';
                    for( let i = 0; i < 4; i++ ) {
                        colgroup += '<col style="width:' + ( i % 2 ? '2em' : '5em' ) + ';">';
                    }
                    colgroup += '</colgroup>';

                    return '<table>' + colgroup + value + '</table>';
                }

                /**
                 * Convert one symbol to SVG string
                 * @param {String} symbols - list of symbols
                 * @param {Number} width - the width of SVG
                 * @returns {String} SVG string
                 */
                function symbolsToSvg( symbols, width ) {
                    const w = width || 192;
                    const x = w / 2 - 16;
                    const syms = symbols.split( ' ' );
                    let svg = '<svg width="' + w + '" height="32">' +
                        '<g transform="translate(' + ( x + 16 ) + ',16)" stroke="black" strokeWidth="1">' +
                        '<line x1="-' + x + '" y1="0" x2="' + x + '" y2="0"/>';

                    svg += syms ? syms.map( s => symbolToSvg( s, x ) ) : '';
                    svg += '</g></svg>';
                    return svg;
                }

                /**
                 * Convert one Symbol to SVG
                 * @param {String} sym - symbol
                 * @param {Number} x - the x coordinate
                 * @returns {String} the SVG string
                 */
                function symbolToSvg( sym, x ) {
                    let trans = 'translate(0,0)';
                    if( sym === '' ) {
                        return '';
                    } else if( sym === 'around' || sym === 'field' ) {
                        trans = 'translate(-' + x + ',0)';
                    } else if( sym === 'tail' ) {
                        trans = 'translate(' + x + ',0)';
                    }

                    const fill = sym === 'field' || sym === '_meltthru' ? 'black' : 'none';
                    return '<path id="' + sym + '" transform="' + trans + '" d="' + $scope.pathd[sym] + '" fill="' + fill + '"/>';
                }

                /**
                 * Convert SVG to symbols
                 * @param {String} svg - the SVG string
                 * @returns {String} list of symbols
                 */
                function svgToSymbols( svg ) {
                    const ids = svg.match( /id="\w+"/g );
                    if( ids ) {
                        const syms = ids.map( ( s ) => s.substring( 4, s.length - 1 ) );
                        return syms.join( ' ' );
                    }

                    return '';
                }

                /**
                 * Check if it is an end symbol
                 * @param {String} sym - the symbol
                 * @returns {Boolean} true if it is end symbol
                 */
                function isEndSymbol( sym ) {
                    return sym === 'around' || sym === 'field' || sym === 'tail';
                }

                /**
                 * Change the symbol in array
                 * @param {String} sym - the symbol
                 */
                function changeSymbol( sym ) {
                    let syms = $scope.array[1][0].split( /\s+/ );
                    const index = syms.indexOf( sym );
                    if( index >= 0 ) {
                        syms.splice( index, 1 );
                    } else if( isEndSymbol( sym ) ) {
                        syms.push( sym );
                    } else if( sym.startsWith( '__' ) ) {
                        syms = syms.filter( isEndSymbol );
                        syms.push( sym );
                    } else if( sym.startsWith( '_' ) ) {
                        syms = syms.filter( s => isEndSymbol( s ) || !s.startsWith( '_' ) );
                        syms.push( sym );
                    } else {
                        syms = syms.filter( s => isEndSymbol( s ) || s.startsWith( '_' ) && !s.startsWith( '__' ) );
                        syms.push( sym );
                    }

                    $scope.array[1][0] = syms.join( ' ' );
                }
            } ]
        };
    }
] );
