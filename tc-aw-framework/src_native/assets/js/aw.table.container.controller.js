// Copyright (c) 2020 Siemens

/**
 * This is the controller for aw-drag (used by gwt table).
 * <P>
 * Note: It is replaced by aw-fill for the declarative aw-table and can be removed once usage of gwt table is removed.
 *
 * @module js/aw.table.container.controller
 */
import app from 'app';
import ngModule from 'angular';
import hammer from 'hammer';
import $ from 'jquery';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import 'js/uwPropertyService';
import 'js/aw-drag.directive';

/**
 * Defines the table container controller
 *
 * @memberof NgControllers
 * @member awTableContainerController
 */
app.controller( 'awTableContainerController', [
    '$scope',
    '$timeout',
    '$q',
    'uwPropertyService',
    function( $scope, $timeout, $q, uwPropertySvc ) {
        var self = this;

        if( !browserUtils.isMobileOS ) {
            $( document.body ).addClass( 'nonTouch' );
        }

        /**
         * adds a scope level event handler for the AWUnvWCreated event that gets triggered on UW
         * creation.
         *
         * @memberof NgControllers.awTableContainerController
         *
         * @param {Function} cb - the function to invoke when the event gets fired
         *
         * returns the unhook function to remove the event handler
         */
        self.turnOnUWEventWatcher = function( cb ) {
            return $scope.$on( 'AWUnvWCreated', function( event, arg1 ) {
                var content = arg1[ 0 ];
                if( cb ) {
                    cb( event, content );
                }
            } );
        };

        /**
         * remove the event handler
         *
         * @memberof NgControllers.awTableContainerController
         *
         * @param {Function} unhook - the function from above used to un register the event handler
         */
        self.turnOffUWEventWatcher = function( unhook ) {
            if( unhook ) {
                unhook();
            }
        };

        /**
         * provides the container ViewModel reference
         *
         * @memberof NgControllers.awTableContainerController
         *
         * @param {Object} containerVM - the containerVM
         */
        self.setContainerVM = function( containerVM ) {
            // keep a reference to the containerVM
            self.containerVM = containerVM;
            $scope.containerVM = containerVM;
        };

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
         * unhook the drag event hanlder, reset the drag state
         */
        self.removePanEvtHandler = function() {
            if( self.currentPanHandler ) {
                self.currentPanHandler.off( 'panup pandown panend panstart pancancel',
                    self.handleHammerCellDrag );
                self.currentPanHandler = undefined;
            }
            self.currentPanHandler = undefined;
            self.isActivelyDragging = false;
            self.currentPanHandlerElement = undefined;
            $( self.currentSrcCell ).removeClass( 'dragSrc' );
            $( self.currentSrcCell ).closest( '.aw-widgets-dataGridContentWidget' ).removeClass(
                'aw-widgets-dragfilling' );
        };

        /**
         * function to trigger the creation of any Universal widgets for the drag range cells. Iterate
         * thru the range and see if they are already UW's or not. If not, trigger the state machine by
         * sending a click event to the cell (state 2->3). Register an observer function that gets
         * notified when all the UW's have been created.
         *
         * Invoke a promise when all the UW's get created, or if all the drag cell range is already UWs
         */
        self.ensureUnvWidgetForDragCells = function() {
            var defer = $q.defer(); // promise
            var unHookHandler = null;
            var neededUWCount = 0;
            var needUWChildren = []; // childElts that we've requested UW creation for

            for( var inx = 0; inx < self.dragSelectedCells.length; inx++ ) {
                // remove drag boundary
                self.dragSelectedCells[ inx ].removeClass( 'dragCellTop dragCell dragCellBottom' );

                var childElt = self.dragSelectedCells[ inx ].find( '.aw-widgets-tablecell' ).get( 0 );
                if( childElt ) {
                    // see if a UW already exists
                    var propChild = $( childElt ).find( '.aw-jswidgets-propertyVal' ).get( 0 );
                    if( propChild ) {
                        var srcScope = ngModule.element( propChild ).scope();
                        if( !srcScope ) {
                            logger.error( 'ERROR ??? - have the DOM but no Ng SCOPE' );
                        }
                    } else {
                        // skip if cell is not editable
                        if( $( childElt ).find( '.aw-jswidgets-editableGridCell' ).length ) {
                            // need UW scope created for this cell
                            neededUWCount++;
                            needUWChildren.push( childElt );
                            // hook up the event observer to watch for UW creations - once
                            if( !unHookHandler ) {
                                unHookHandler = self.turnOnUWEventWatcher( function( evt, uwElt ) {
                                    // got a UW event, see if it fits one we are looking for.
                                    for( var eltIdx = 0; eltIdx < needUWChildren.length; eltIdx++ ) {
                                        // check the cell to see if this is the inner UW
                                        var cellTop = needUWChildren[ eltIdx ];
                                        if( cellTop ) {
                                            var lookforit = $( cellTop ).find( uwElt.localName ).is(
                                                uwElt );
                                            if( lookforit ) {
                                                // found the match
                                                neededUWCount--;
                                                needUWChildren[ eltIdx ] = undefined;
                                                if( neededUWCount === 0 ) {
                                                    // they've all been accounted for - remove the event handler
                                                    self.turnOffUWEventWatcher( unHookHandler );
                                                    unHookHandler = undefined;
                                                    // invoke the promise
                                                    defer.resolve();
                                                    break; // for
                                                }
                                            }
                                        }
                                    } // for
                                } );
                            } // wire in the event handler and callback first time

                            var evtTarget = $( childElt ).children().first();
                            // simulate the click to enter edit behavior which should trigger creation of the UW.
                            $( evtTarget ).click(); // click on the cellTop
                        }
                    }
                }
            } // for numCells

            if( neededUWCount === 0 ) {
                // no delayed actions?  invoke the promise right away.
                defer.resolve();
            } else {
                $scope.$evalAsync();
            }

            return defer.promise;
        };

        /**
         * logic to run when we are done interacting with the cell value. simulate the move away gesture
         * behavior.
         */
        self.exitEditState = function( propTargetChild ) {
            var setDirty = false;
            var targetScope = ngModule.element( propTargetChild ).scope();
            if( targetScope && targetScope.prop ) {
                setDirty = targetScope.prop.valueUpdated;
            }

            // child directives may not yet be instantiated, so need to wait a moment
            // possibly an evalAsync would be more appropriate here.
            $timeout( function() {
                var $inputElement = $( propTargetChild ).find( '[aw-autofocus]' );
                var autofocus = true;
                if( !$inputElement[ 0 ] ) {
                    // try again for things like date that don't use autofocus...
                    $inputElement = $( propTargetChild ).find( '.aw-widgets-propertyEditValue' );
                    autofocus = false;
                }
                if( $inputElement[ 0 ] ) {
                    if( setDirty ) {
                        $inputElement.addClass( 'ng-dirty' );
                    }

                    // The input element may have been detached from the dom during the timeout.
                    // If it hasn't this will trigger a blur which should force the transition.

                    // if the aw-autofocu directive is used, focus the element
                    // otherwise click it - this is neccessary to get calendar to fully focus
                    if( autofocus ) {
                        // once the autofocus directive is fixed, this shouldn't be necc
                        $inputElement.focus();
                    } else {
                        $inputElement.click();
                    }
                    // blur to transition from widget state 3 to 4
                    $inputElement.blur();
                } else {
                    // element not in edit mode... this happens in 3.1 (not in 3.0): revisit
                    // it would be preferable to set the dirty flag on the prop and use
                    // ng-class to react instead of doing dom manipulation here.
                    var cellTop = $( propTargetChild ).closest( '.aw-widgets-cellTop' );
                    if( cellTop && setDirty ) {
                        cellTop.addClass( 'changed' );
                    }
                }
            }, 200 );
        };

        /**
         * pan in some direction. compute the drag coords, find the cells within it (includes the source
         * and target cells), and style the cells appropriately to mark the drag area
         */
        self.handlePan = function( hEvt ) {
            // get all cells in this column - the attribute name must match the rendering code
            var getAllColCells = function() {
                var targetColumnNm = $( self.currentSrcCell ).attr( '__colid' );
                var filterExpr = '[__colid=' + targetColumnNm + ']';
                return self.tableContentElt.find( '.aw-widgets-tablecell' ).filter( filterExpr )
                    .closest( '.dataGridCell' );
            };

            var scrollAsNeeded = function( panEvent ) {
                // look at table height and offset to determine if we are near the top or bottom?
                // get scrolling element
                var table = $( self.tableContentElt ).parent();
                var gridElement = table.closest( '.dataGridWidget' );
                while( gridElement.children().last().children().length > 0 ) {
                    // this code is dependent on the internal gwt structure
                    // would be nice to have a better way to find this private
                    // tableDataScroller from the gwt DataGrid
                    gridElement = gridElement.children().last();
                }

                // if we need to scroll, calculate the new scroll position
                var scroll;
                if( panEvent.srcEvent.pageY < gridElement.offset().top + 30 ) {
                    scroll = gridElement.scrollTop() - 10;
                    gridElement.scrollTop( scroll );
                } else if( panEvent.srcEvent.pageY > gridElement.offset().top + gridElement.height() -
                    30 ) {
                    scroll = gridElement.scrollTop() + 10;
                    gridElement.scrollTop( scroll );
                }
            };

            // get the bounding rectangle of the source cell
            var srcCellRectangle = $( self.currentSrcCell ).closest( '.dataGridCell' )[ 0 ]
                .getBoundingClientRect();
            var yDragTop;
            var yDragBottom;
            var dragUp = false;

            // reset the array of cells in the drag area
            self.dragSelectedCells = [];

            // which direction is the drag in?
            if( hEvt.srcEvent.clientY > srcCellRectangle.top + 1 ) {
                // down
                yDragTop = srcCellRectangle.top - 1;
                yDragBottom = hEvt.srcEvent.clientY;
            } else {
                // up - swap for contains calculations
                dragUp = true;
                yDragTop = hEvt.srcEvent.clientY;
                yDragBottom = srcCellRectangle.bottom + 1;
            }

            // loop through each cell to see if it is in the drag area
            getAllColCells().each( function() {
                var $cell = $( this );
                // clear any previous styling
                $cell.removeClass( 'dragCellTop dragCell dragCellBottom' );

                var cellRect = $cell[ 0 ].getBoundingClientRect();
                var yCell = cellRect.top; // y coord for this cell
                if( dragUp === true ) {
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

        /**
         * the end pan/drag has been encountered - trigger the data processing based on the drag area
         * boundary.
         */
        self.handlePanEnd = function() {
            // check that we have more than just the source cell
            if( self.dragSelectedCells.length > 1 ) {
                self.ensureUnvWidgetForDragCells().then(
                    function() {
                        // don't change the source cell, but we must get the data value from it
                        var dbValToUse = '?';
                        var uiValToUse = '';
                        var propChild = $( self.currentSrcCell ).find( '.aw-jswidgets-propertyVal' )
                            .get( 0 );
                        if( propChild ) {
                            var srcScope = ngModule.element( propChild ).scope();
                            if( srcScope && srcScope.prop ) {
                                // capture the prop values from the src cell scope
                                dbValToUse = srcScope.prop.dbValue;
                                uiValToUse = srcScope.prop.uiValue;
                            }
                        } else {
                            logger.error( 'ERROR - no property or scope on source cell' );
                        }

                        // iterate the target cells
                        for( var inx = 0; inx < self.dragSelectedCells.length; inx++ ) {
                            var childElt = self.dragSelectedCells[ inx ].find( '.aw-widgets-tablecell' )
                                .get( 0 );
                            var propTargetChild = $( childElt ).find( '.aw-jswidgets-propertyVal' )
                                .get( 0 );
                            if( childElt === self.currentSrcCell ) {
                                // we don't want to set the value of the srcCell - skip it.
                                self.exitEditState( propTargetChild );
                            } else {
                                if( propTargetChild ) {
                                    var targetScope = ngModule.element( propTargetChild ).scope();
                                    if( targetScope && targetScope.prop ) {
                                        var uiProperty = targetScope.prop;
                                        uiProperty.dbValue = dbValToUse;
                                        // necc for Dates to also set the uiValue
                                        uiProperty.uiValue = uiValToUse;

                                        // this is neeed to avoid an IE11 bug where focus triggers ng-change on a
                                        // scope where prop.dbVal = undefined (weird race condition)
                                        // autofocus is returned to true in exitEditState.
                                        uiProperty.autofocus = false;

                                        uwPropertySvc.updateViewModelProperty( uiProperty );

                                        self.exitEditState( propTargetChild );
                                    }
                                }
                            }
                        } // for
                    } ); // then
            } // children > 1
        };

        /**
         * function for handling the Pan/drag related events from hammer. account for all the Hammer
         * event states
         */
        self.handleHammerCellDrag = function( hEvt ) {
            if( hEvt.type === 'panstart' ) {
                self.isActivelyDragging = true;

                // the source cell for the fill
                var $srcCell = $( hEvt.target ).closest( '.aw-widgets-tablecell' );
                self.currentSrcCell = $srcCell.get( 0 );
                self.tableContentElt = $( hEvt.target ).closest( 'tbody' ); // table content area
                $srcCell.addClass( 'dragSrc' );
                $( hEvt.target ).closest( '.aw-widgets-dataGridContentWidget' ).addClass(
                    'aw-widgets-dragfilling' );
            } else if( hEvt.type === 'panend' ) {
                self.handlePanEnd( hEvt );
                self.removePanEvtHandler();
                return;
            } else if( hEvt.type === 'pancancel' ) {
                self.removePanEvtHandler();
                return;
            } else {
                if( self.isActivelyDragging ) {
                    self.handlePan( hEvt );
                }
            }
        };

        /**
         * this is triggered from the drag handle drag action - on the directive.
         *
         * Determine if we need to setup the hammer pan/drag listener. Establish the drag start
         *
         */
        $scope.checkStartRangeSelect = function( event ) {
            if( !self.isActivelyDragging ) {
                event.preventDefault();

                if( self.currentPanHandlerElement ) {
                    if( self.currentPanHandlerElement !== event.target ) {
                        // remove the old one
                        self.removePanEvtHandler();
                    }
                }

                if( self.currentPanHandler ) {
                    // existing handler, same element?
                    if( self.currentPanHandlerElement ) {
                        if( self.currentPanHandlerElement !== event.target ) {
                            logger
                                .warn( 'different event handler element - shouldnt be here ------------------' );
                        }
                    }
                } else {
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
                }
            }
        };
    }
] ); // awTableContainerController
