// Copyright (c) 2020 Siemens

/**
 * @module js/aw-table-auto-resize.directive
 */
import app from 'app';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';

var _urlAttrs = browserUtils.getUrlAttributes();

/**
 * {Boolean} TRUE if details of only the activity of this directive that result in a change should be logged to the
 * console.
 */
var _logResizeChangeActivity = _urlAttrs.logResizeChangeActivity !== undefined;

/**
 * {Boolean} TRUE if details of all activity of this directive should be logged to the console.
 */
var _logResizeActivity = _urlAttrs.logResizeActivity !== undefined;

/**
 * {Number} The amount of time (ms) to wait after the last $digest cycle before checking for any changes.
 * <P>
 * Note: We want to wait a little longer for IE since testing has shown it is more sensitive to the computations in
 * the directive and thus cause delay in other parts of the UI.
 */
var _resizeCheckTime = browserUtils.isIE ? 100 : 50;

/**
 * {Number} The minimum number of pixels of height/width change before we will immediately apply the current size to
 * the table.
 */
var _minDelta = 2;

/**
 * {Number} The number of times the resize debounce will delay before applying a 'small' dimension change.
 */
var _maxSmallChangeDelay = 5;

/**
 * This module provides auto-resizing functionality to UI-Grid.
 * <P>
 * Note: This method was based on the functionality in the 'ui-grid-auto-resize' directive in ui-grid. However, to
 * avoid an IE specific problem, AW needed its own version of the directive.
 * <P>
 * 2018-04-19 peng: rewrite the implementation based on the implementation in OOTB ui-grid 4.4.6 with my
 * optimization. It makes test case with 14 tables improves from 13s to around 10s.
 *
 * @example <xxxx aw-table-auto-resize>
 *
 * @member aw-table-auto-resize
 * @memberof NgAttributeDirectives
 *
 * @param {gridUtil} gridUtil - Service to use.
 *
 * @return {awTableAutoResize} Reference to directive definition.
 */
app.directive( 'awTableAutoResize', [
    'gridUtil',
    function( gridUtil ) {
        return {
            require: 'uiGrid',
            scope: false,
            link: function( $scope, $elm, $attrs, uiGridCtrl ) {
                /**
                 * {Number} Last known width of the overall grid DOM element.
                 */
                var prevGridWidth = 0;

                /**
                 * {Number} Last known height of the overall grid DOM element.
                 */
                var prevGridHeight = 0;

                /**
                 * {Number} The current number of times this directive has waited to apply a small size change.
                 * <P>
                 * Note: This counter is used to make sure even a small change is eventually applied to the table an
                 * that is eventually 'looks correct' WRT the rest of the UI.
                 */
                var smallChangeDelayCount = 0;

                var _pingUpdateRectangle = gridUtil.debounce( function() {
                    /**
                     * Get current size of the overall table DOM element.
                     * <P>
                     * Note: We want to round to the nearest integer to minimize 'jitter' in the size computation
                     * that could cause extra (unnecessary) redraw effort.
                     */
                    var currGridHeight = Math.round( gridUtil.elementHeight( $elm ) );
                    var currGridWidth = Math.round( gridUtil.elementWidth( $elm ) );

                    if( _logResizeActivity ) {
                        logger.info( 'awTableAutoResize' + ' ' + 'debounce' + '\n' + //
                            'declGridId    =' + uiGridCtrl.grid.options.declGridId + '\n' + //
                            'prevGridHeight=' + prevGridHeight + ' ' + 'prevGridWidth=' + prevGridWidth + '\n' + //
                            'currGridHeight=' + currGridHeight + ' ' + 'currGridWidth=' + currGridWidth );
                    }

                    /**
                     * Check if the sizes have changed enough to force the table to be updated OR there is some
                     * 'small' change pending and we have waited long enough and want to have that change applied
                     * now.
                     */
                    var deltaHeight = Math.abs( prevGridHeight - currGridHeight );
                    var deltaWidth = Math.abs( prevGridWidth - currGridWidth );

                    var applyChange = false;

                    if( deltaHeight > _minDelta || deltaWidth > _minDelta ) {
                        applyChange = true;
                        smallChangeDelayCount = 0;
                    } else if( deltaHeight > 0 || deltaWidth > 0 ) {
                        smallChangeDelayCount++;

                        if( smallChangeDelayCount > _maxSmallChangeDelay ) {
                            smallChangeDelayCount = 0;
                            applyChange = true;
                        }
                    }

                    if( applyChange ) {
                        if( _logResizeChangeActivity ) {
                            logger.info( 'awTableAutoResize' + ' ' + 'change' + '\n' + //
                                'declGridId    =' + uiGridCtrl.grid.options.declGridId + '\n' + //
                                'prevGridHeight=' + prevGridHeight + ' ' + 'prevGridWidth=' + prevGridWidth + '\n' + //
                                'currGridHeight=' + currGridHeight + ' ' + 'currGridWidth=' + currGridWidth );
                        }

                        uiGridCtrl.grid.gridWidth = currGridWidth;
                        uiGridCtrl.grid.gridHeight = currGridHeight;

                        prevGridWidth = currGridWidth;
                        prevGridHeight = currGridHeight;

                        return uiGridCtrl.grid.refresh( false ).then( function() {
                            return null;
                        } );
                    }

                    return null;
                }, _resizeCheckTime );

                $scope.$watch( function() {
                    _pingUpdateRectangle();
                } );

                $scope.$on( '$destroy', function() {
                    _pingUpdateRectangle.cancel();
                } );
            }
        };
    }
] );
