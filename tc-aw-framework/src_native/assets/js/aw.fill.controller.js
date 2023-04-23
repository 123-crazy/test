// Copyright (c) 2020 Siemens

/**
 * Overall fill-down flow. This is basically convenience logic that allows a copy & paste, paste, paste to a range using
 * the aw-fill directive.
 * <P>
 * General Steps
 * <P>
 * 1) During hover on an editable cell show the drag handle to allow the user to start a drag.
 * <P>
 * 2) Leverage the Hammer Pan event handler to capture drag events on the drag handle.
 * <P>
 * limit the drag selection area to within the column (same property). So vertical only. 3) At the end of the drag
 * action, cleanup/remove the Hammer event handler
 * <P>
 * 4) The drag "range" includes a source cell (start point), and a set of one or more target cells.
 * <P>
 * 5) Need to get the UW (Universal Widget) instances created for the drag range need the UW so we can get the cell data
 * context (property info) via the scope.
 * <P>
 * 6) Get the property info value from the cell Ng scope.
 * <P>
 * The source cell has the "original values" (db & ui) that we want to push to the rest of the range.The target cells
 * scope property can then be set with the db and ui values from the source cell.
 * <P>
 * Read-only cells must be skipped.
 *
 * Note: Created from aw.table.container.controller.js (aw-drag controller for gwt table)
 *
 * @module js/aw.fill.controller
 */
import app from 'app';
import ngModule from 'angular';
import hammer from 'hammer';
import $ from 'jquery';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';

/**
 * Defines the table container controller
 *
 * @memberof NgControllers
 * @member awFillcOntroller
 */
app.controller( 'awFillController', [
    '$scope',
    function( $scope ) {
        var self = this;

        if( !browserUtils.isMobileOS ) {
            $( document.body ).addClass( 'nonTouch' );
        }

        // reference to the entire table visual tree element
        self.tableContentElt = undefined;

        // element ref to the source cellTop
        self.currentSrcCell = undefined;

        // currently registered event handler
        self.currentPanHandler = undefined;
        self.currentPanHandlerElement = undefined;

        // currently doing a drag?
        self.isActivelyDragging = false;

        // the cells within the current drag area; modified as the drag action is done
        self.dragSelectedCells = [];

        /**
         * FUTURE: consider moving these functions to awTableService.js which would be more efficient since it is a
         * singleton.
         */

        // unhook the drag event hanlder, reset the drag state
        self.removePanEvtHandler = function() {
            if( self.currentPanHandler ) {
                self.currentPanHandler.off( 'panup pandown panend panstart pancancel', self.handleHammerCellDrag );
            }
            self.currentPanHandler = undefined;
            self.isActivelyDragging = false;
            self.currentPanHandlerElement = undefined;
            $( self.currentSrcCell ).removeClass( 'dragSrc' );
            $( self.currentSrcCell ).closest( 'aw-table' ).removeClass( 'aw-jswidgets-dragfilling' );
        };

        // pan in some direction. compute the drag coords, find the cells within it
        // (includes the source and target cells), and style the cells appropriately
        // to mark the drag area
        self.handlePan = function( hEvt ) {
            // get all cells in this column - the attribute name must match the rendering code
            var getAllColCells = function() {
                // get targetColName and escape special characters
                var targetColName = self.targetColName.replace( /(:|\.|,|\(|\))/g, '\\$1' );
                var filterExpr = '[_colname=' + targetColName + ']';
                return self.tableContentElt.find( '.aw-jswidgets-cellTop' ).filter( filterExpr ).closest(
                    'aw-table-cell' ).parent();
            };

            var scrollAsNeeded = function( panEvent ) {
                // look at table height and offset to determine if we are near the top or bottom?
                // get scrolling element
                var gridElement = $( self.currentSrcCell ).closest( '.ui-grid-viewport' );
                // if we need to scroll, calculate the new scroll position
                var scroll;
                if( panEvent.srcEvent.pageY < gridElement.offset().top + 50 ) {
                    scroll = gridElement.scrollTop() - 20;

                    gridElement.scrollTop( scroll );

                    logger.debug( scroll, ' scroll up' );
                } else if( panEvent.srcEvent.pageY > gridElement.offset().top + gridElement.height() - 50 ) {
                    scroll = gridElement.scrollTop() + 20;

                    gridElement.scrollTop( scroll );

                    logger.debug( scroll, ' scroll down' );
                }
            };

            // get the bounding rectangle of the source cell
            var srcCellRectangle = $( self.currentSrcCell ).closest( '.aw-jswidgets-tablecell' ).parent()[ 0 ]
                .getBoundingClientRect();

            var yDragTop;
            var yDragBottom;

            // reset the array of cells in the drag area
            self.dragSelectedCells = [];

            // which direction is the drag in?
            if( hEvt.srcEvent.clientY > srcCellRectangle.top + 1 ) {
                // down
                self.dragUp = false;
                yDragTop = srcCellRectangle.top - 1;
                yDragBottom = hEvt.srcEvent.clientY;
            } else {
                // up - swap for contains calculations
                self.dragUp = true;
                yDragTop = hEvt.srcEvent.clientY;
                yDragBottom = srcCellRectangle.bottom + 1;
            }

            // check if the data is being virtualized, if so, adjust target area
            if( self.srcUiVal !== self.getCellScope( $( self.currentSrcCell ) ).prop.uiValue ) {
                if( self.dragUp ) {
                    yDragBottom = 9999;
                } else {
                    yDragTop = 0;
                }
            }

            // loop through each cell to see if it is in the drag area
            getAllColCells().each( function() {
                var $cell = $( this );

                // clear any previous styling
                $cell.removeClass( 'dragCellTop dragCell dragCellBottom' );

                var cellRect = $cell[ 0 ].getBoundingClientRect();
                var yCell = cellRect.top; // y coord for this cell
                if( self.dragUp === true ) {
                    yCell = cellRect.bottom;
                }

                // compute whether or not this cell is in the drag area
                if( yCell < yDragBottom && yCell >= yDragTop ) {
                    // this element fits inside the selection rectangle
                    $cell.addClass( 'dragCell' );
                    self.dragSelectedCells.push( $cell );
                }
            } );

            // decorate top and bottom cells specially
            if( self.dragSelectedCells.length ) {
                self.dragSelectedCells[ 0 ].addClass( 'dragCellTop' );
                self.dragSelectedCells[ self.dragSelectedCells.length - 1 ].addClass( 'dragCellBottom' );
            }

            // attempt to scroll the grid if we are dragging off
            scrollAsNeeded( hEvt );
        };

        // the end pan/drag has been encountered - trigger the data processing
        // based on the drag area boundary
        self.handlePanEnd = function( hEvt ) { // eslint-disable-line no-unused-vars
            // check that we have more than just the source cell
            if( self.dragSelectedCells.length > 1 ) {
                if( $scope.$emit ) {
                    var endTargetProp;
                    var direction;
                    if( self.dragUp ) {
                        endTargetProp = self.getCellScope( self.dragSelectedCells[ 0 ] ).prop;
                        direction = 'up';
                    } else {
                        endTargetProp = self
                            .getCellScope( self.dragSelectedCells[ self.dragSelectedCells.length - 1 ] ).prop;
                        direction = 'down';
                    }
                    // emit this fill-complete event to be handled by the tabled
                    $scope.$emit( 'awFill.completeEvent', {
                        propName: self.targetColName,
                        source: self.srcUid,
                        endTarget: endTargetProp.parentUid,
                        direction: direction
                    } );
                }

                // iterate the target cells
                for( var inx = 0; inx < self.dragSelectedCells.length; inx++ ) {
                    self.dragSelectedCells[ inx ].removeClass( 'dragCellTop dragCell dragCellBottom' );
                } // for
            } // children > 1
        };

        self.getCellScope = function( $cell ) {
            var cellTop = $cell.find( '.aw-jswidgets-cellTop' )[ 0 ];
            if( cellTop ) {
                return ngModule.element( cellTop ).scope();
            }

            logger.error( 'ERROR - no property or scope on source cell' );
        };

        // function for handling the Pan/drag related events from hammer.
        // account for all the Hammer event states
        self.handleHammerCellDrag = function( hEvt ) {
            if( hEvt.type === 'panstart' ) {
                // starting pan...
                self.dragUp = false;
                self.isActivelyDragging = true;

                // the source cell for the fill
                var $srcCell = $( hEvt.target ).closest( '.aw-jswidgets-tablecell' );
                self.currentSrcCell = $srcCell.get( 0 );
                var srcScope = self.getCellScope( $srcCell );
                self.srcUid = srcScope.prop.parentUid;
                self.srcUiVal = srcScope.prop.uiValue;

                self.tableContentElt = $( hEvt.target ).closest( 'aw-table' ); // table content area

                $srcCell.addClass( 'dragSrc' );

                self.tableContentElt.addClass( 'aw-jswidgets-dragfilling' );

                self.targetColName = $( self.currentSrcCell ).find( '.aw-jswidgets-cellTop' ).attr( '_colname' );
            } else if( hEvt.type === 'panend' ) {
                // ending pan
                self.handlePanEnd( hEvt );
                self.removePanEvtHandler();
                return;
            } else if( hEvt.type === 'pancancel' ) {
                // cancelling pan
                self.removePanEvtHandler();
                return;
            } else if( self.isActivelyDragging ) {
                // other event...
                // actively dragging, so handle pan
                self.handlePan( hEvt );
            }
        };

        // this is triggered from the drag handle drag action on the directive.
        // Determine if we need to setup the hammer pan/drag listener.
        // Establish the drag start
        $scope.checkStartRangeSelect = function( event ) {
            // checking range...
            if( !self.isActivelyDragging ) {
                event.preventDefault();

                if( self.currentPanHandlerElement ) {
                    if( self.currentPanHandlerElement !== event.target ) {
                        // remove the old one
                        self.removePanEvtHandler();
                    }
                }

                if( !self.currentPanHandler ) {
                    var hmrMgr = hammer( event.target, {
                        touchAction: 'pan-y'
                    } );

                    // track the element that the hammer is using
                    self.currentPanHandlerElement = event.target;

                    var panRecognizer = hmrMgr.get( 'pan' );

                    panRecognizer.set( {
                        direction: hammer.DIRECTION_VERTICAL
                    } ); // set options

                    hmrMgr.on( 'panup pandown panend panstart pancancel', self.handleHammerCellDrag ); // panleft panright

                    self.currentPanHandler = hmrMgr;
                } else if( self.currentPanHandlerElement ) {
                    // existing handler, same element?
                    if( self.currentPanHandlerElement !== event.target ) {
                        logger.warn( 'different event handler element - shouldnt be here ------------------' );
                    }
                }
            }
        };
    }
] ); // awFillController
