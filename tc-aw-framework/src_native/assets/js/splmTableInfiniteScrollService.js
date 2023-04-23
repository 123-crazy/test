/* eslint-disable no-async-promise-executor */
// Copyright (c) 2020 Siemens

/**
 * This service is for exposing the native js data provider behavior. The module supports loading the module from GWT
 * and getting the native JS code invoked.
 *
 * @module js/splmTableInfiniteScrollService
 */
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import _t from 'js/splmTableNative';
import SPLMTableMomentumScrolling from 'js/splmTableMomentumScrolling';
import _ from 'lodash';

/**
 * Native infinite scroll.
 *
 * @constructor
 * @param {Number} containerHeight the container height
 */
let SPLMTableInfiniteScroll = function( containerHeight ) {
    let self = this;
    let settings = {};

    let currentScrollTop = 0; // Holds the last scroll position to detect scroll down or up
    let previousScrollTop = 0;
    let rowElements = []; // contains cache of rendered list
    let rowHeightCache = [];
    let initialized = false;
    let containerHeightInitialized = false;
    let _containerHeight = containerHeight;
    let _visibleAreaHeight = _containerHeight - settings.headerHeight;
    let initialRowIndex = 0;
    let extraVisibleRowCount = 10; // Even number to make calculations/rendering more fluid
    let visibleRowsCount = 0;
    let currentScrollLeft = 0;
    let scrollToRowInProgress = false;
    let scrollToRowScrollTop = null;
    let maintainScrollPosition = false;
    let disablePinScrollEvent = false;
    let userPinScrollsDetected = 0;
    let scrollContainerWidth = 0;
    let verticalScrollDebounceTime = browserUtils.isIE || browserUtils.isFirefox ? 200 : 0;
    let horizontalScrollDebounceTime = browserUtils.isIE ? 500 : 0;
    let verticalScrollDebounceMaxWait = browserUtils.isIE || browserUtils.isFirefox ? Infinity : 0;
    let momentumScrolling = new SPLMTableMomentumScrolling();
    let lastScrollTimeStamp = new Date();
    let elapsedMSSinceLastScroll = 0;
    let renderingPromiseQueue = [];

    // LCS-133249 Scrolling performance issue
    // Do scroll syncing at very beginning
    let extraTop = 0;

    let horizontalScrollDebounceEvent = _.debounce( function() {
        settings.updateScrollColumnsInView( currentScrollLeft, scrollContainerWidth );
        settings.updateVisibleCells( settings.scrollParentElem );
    }, horizontalScrollDebounceTime );

    let verticalScrollDebounceEvent = _.debounce( function() {
        handleScrollEventInternal();
    }, verticalScrollDebounceTime, {
        maxWait: verticalScrollDebounceMaxWait
    } );

    self.initializeGrid = function( obj ) {
        settings = obj;
        settings.pinParentElem = settings.pinViewportElem.children[ 0 ];
        settings.scrollParentElem = settings.scrollViewportElem.children[ 0 ];
        settings.totalFound = settings.loadedVMObjects.length;
        settings.dynamicRowHeightStatus = settings.dynamicRowHeightStatus || false;
        initializeEvents();
        momentumScrolling.enable( settings.pinViewportElem, settings.scrollViewportElem );
        initialized = true;
    };

    /**
     * Calculates the Top height of the container.
     * Used before the debounce event to align the rows.
     */
    let calculateTopHeightOfContainer = function() {
        let pinViewportElem = settings.pinViewportElem;
        let tempExtraTop = pinViewportElem.offsetHeight + currentScrollTop - pinViewportElem.scrollHeight;
            if( tempExtraTop > 0 ) {
                pinViewportElem.style.top = String( tempExtraTop * -1 ) + 'px';
                extraTop = tempExtraTop;
            } else if( extraTop > 0 ) {
                // For non IE/Edge, need to set top back when scroll up
                pinViewportElem.style.top = '0px';
                extraTop = 0;
            }
    };

    /**
     * Calculates the visible area of the table
     * @returns {Number} the visible height
     */
    let calculateVisibleAreaHeight = function() {
        return _containerHeight - settings.headerHeight;
    };

    self.checkForResize = _.debounce( async function() {
        elapsedMSSinceLastScroll = new Date() - lastScrollTimeStamp;
        if( elapsedMSSinceLastScroll < 200 ) {
            return;
        }
        let newClientWidth = settings.scrollViewportElem.offsetWidth;
        if( newClientWidth !== scrollContainerWidth ) {
            if( newClientWidth > scrollContainerWidth ) {
                scrollContainerWidth = newClientWidth;
                settings.updateScrollColumnsInView( currentScrollLeft );
            } else {
                scrollContainerWidth = newClientWidth;
                settings.updateScrollColumnsInView( currentScrollLeft, scrollContainerWidth );
            }
            settings.updateVisibleCells( settings.scrollParentElem );
        }

        if( settings.directiveElem.clientHeight !== _containerHeight ) {
            _containerHeight = settings.directiveElem.clientHeight;
            let rowContainerHeight = settings.scrollViewportElem.clientHeight || settings.pinViewportElem.clientHeight || _containerHeight;
            let rowCount = Math.floor( rowContainerHeight / settings.rowHeight );
            _visibleAreaHeight = calculateVisibleAreaHeight();
            setVisibleRowsCount( rowCount );
            await self.handleScroll();
        }
    }, 200 );

    self.isInitialized = function() {
        return initialized;
    };

    /**
     * Renders the initial rows on initialization once table div has been rendered so that
     * the height can be computed properly
     */
    self.renderInitialRows = function() {
        self.initializeProperties();
        settings.initialRowIndex = initialRowIndex;
        self.handleScroll();
    };

    /**
     * set the object set height
     * @param {Number} heightVal The container height
     */
    self.setContainerHeight = function( heightVal ) {
        _containerHeight = heightVal;
        _visibleAreaHeight = calculateVisibleAreaHeight();
        // LCS-140092 - AW UxRefresh does not allow scrolling in Qt WebEngine Browser
        // 100% is not working in Qt WebEngine, use heightVal here
        settings.scrollViewportElem.style.maxHeight = String( _visibleAreaHeight ) + 'px';
        settings.pinViewportElem.style.maxHeight = String( _visibleAreaHeight ) + 'px';
    };

    /**
     * Set if dynamic row height is enabled or not
     *
     * @param {Boolean} isEnabled if DRH is enabled or not
     */
    self.setDynamicRowHeight = function( isEnabled ) {
        settings.dynamicRowHeightStatus = isEnabled;
    };

    /**
     * Sets the extra visible row count 10 < x < 30
     * @param {Number} rowCount the number of rows to set
     */
    function setExtraVisibleRowCount( rowCount ) {
        extraVisibleRowCount = Math.max( 10, Math.min( 30, rowCount ) );
    }

    /**
     * Sets the visible row count
     *
     * @param {Number} rowCount the number of visible rows
     */
    function setVisibleRowsCount( rowCount ) {
        visibleRowsCount = rowCount;
        setExtraVisibleRowCount( rowCount );
    }

    /**
     * Convenience method to get certain row height from cache
     *
     * @param {Number} index The row's index
     * @returns {Number} the row's height
     */
    function getHeightFromCache( index ) {
        if( rowHeightCache[ index ] ) {
            if( index === rowHeightCache.length - 1 ) {
                return rowHeightCache[ index ];
            }
            return rowHeightCache[ index ] - 1; // The -1 is because of the -1 margin added to the rows. May change in future
        }
        return settings.rowHeight;
    }

    /**
     * Calculates the element's top position (scrollTop or just top)
     * using the row height cache and its index
     *
     * @param {Number} elementIdx The element's index
     * @returns {Number} the top position for the element
     */
    function calculateElementTopPosition( elementIdx ) {
        let runningTop = 0;
        for( let idx = 0; idx < elementIdx; idx++ ) {
            runningTop += getHeightFromCache( idx );
        }
        return runningTop;
    }

    /**
     * Calculates the row index based off of the scrollTop. Uses the row height cache
     * and will return the index that the scrollTop reaches to.
     *
     * @param {Number} scrollTop The scroll top to calculate the element idx start from
     * @returns {Number} the element's idx
     */
    function calculateElementIndexFromScrollTop( scrollTop ) {
        let runningTotal = 0;
        let index = 0;
        while( runningTotal < scrollTop ) {
            runningTotal += getHeightFromCache( index );
            index++;
        }
        return index;
    }

    /**
     * Calculates the last visible row's index
     *
     * @returns {Number} the last visible row's index
     */
    function calculateLastVisibleRowIndex() {
        return calculateElementIndexFromScrollTop( currentScrollTop + _visibleAreaHeight ) - 1;
    }

    /**
     * Initialize scroll properties
     */
    self.initializeProperties = function() {
        renderingPromiseQueue = [];
        // Clear the row height cache
        rowHeightCache = [];
        // LCS-138303 - Performance tuning for 14 Objectset Table case - implementation
        // Use given clientHeight to save one computed CSS reading
        if( _containerHeight === undefined ) {
            _containerHeight = containerHeight > 0 ? containerHeight : settings.directiveElem.clientHeight;
            _visibleAreaHeight = calculateVisibleAreaHeight();
        } else if( containerHeightInitialized === false ) {
            self.setContainerHeight( _containerHeight );
        }
        containerHeightInitialized = true;

        // Table should have height of at least one row.
        settings.scrollViewportElem.style.minHeight = String( settings.rowHeight ) + 'px';
        settings.pinViewportElem.style.minHeight = String( settings.rowHeight ) + 'px';

        let scrollCanvasHeight = _visibleAreaHeight;
        if( scrollCanvasHeight < 0 ) {
            scrollCanvasHeight = 0;
        }

        let rowCount = Math.floor( scrollCanvasHeight / settings.rowHeight );
        setVisibleRowsCount( rowCount );

        logger.trace( 'Table scroll service: Visible row count - ' + visibleRowsCount );
    };

    /**
     * Updates the container and top space heights so the rows are positioned correctly
     */
    self.updateRowAlignment = function() {
        let topHeight = 0;

        if( rowElements ) {
            let firstElement = rowElements[ 0 ];
            if( firstElement && firstElement.getAttribute( 'data-indexNumber' ) ) {
                let firstElementIdx = parseInt( firstElement.getAttribute( 'data-indexNumber' ) );
                if( settings.treeTableEditSettings ) {
                    topHeight = ( firstElementIdx - settings.treeTableEditSettings.firstIndex ) * settings.rowHeight;
                } else {
                    topHeight = calculateElementTopPosition( firstElementIdx );
                }
            }
        }

        settings.pinParentElem.style.top = topHeight + 'px';
        settings.scrollParentElem.style.top = topHeight + 'px';

        let scrollContentHeight;
        // If tree table and editing, use treeEditSettings.lastIndex - the first index to get number of rows in total
        if( settings.treeTableEditSettings ) {
            scrollContentHeight = ( settings.treeTableEditSettings.lastIndex - settings.treeTableEditSettings.firstIndex + 1 ) * settings.rowHeight - topHeight;
        } else {
            scrollContentHeight = calculateElementTopPosition( settings.totalFound ) - topHeight;
        }

        settings.pinParentElem.style.height = scrollContentHeight + 'px';
        settings.scrollParentElem.style.height = scrollContentHeight + 'px';
    };

    /**
     * Returns the row height as an int
     * @returns {Number} The row Height
     */
    self.getRowHeight = function() {
        return settings.rowHeight;
    };

    /**
     * Scrolls the table up/down one row.
     *
     * @param {Boolean} isScrollDown - scroll down indicator, false for scroll up
     * @returns {Number} returns the new scrollTop of the scrollViewportElement
     */
    self.manualScroll = function( isScrollDown ) {
        let scrollDistance = isScrollDown ? self.getRowHeight() : -self.getRowHeight();
        settings.scrollViewportElem.scrollTop += scrollDistance;
        return settings.scrollViewportElem.scrollTop;
    };

    /**
     * Get scrollTop of the scroll viewport.
     *
     * @returns {Number} returns the scrollTop of the scrollViewportElement
     */
    self.getScrollTop = function() {
        return settings.scrollViewportElem.scrollTop;
    };

    /**
     * Sets the row height
     *
     *  @param {int} rowHeight - the height of the row in pixels
     */
    self.setRowHeight = function( rowHeight ) {
        settings.rowHeight = rowHeight;
    };

    /**
     * Gets the total objects found
     * @returns {Number} The total number of objects found
     */
    self.getTotalFound = function() {
        return settings.totalFound;
    };

    /**
     * Sets the loaded view model objects
     *
     *  @param {[ViewModelObject]} loadedViewModelObjects - the collection of view model objects
     */
    self.setLoadedVMObjects = function( loadedViewModelObjects ) {
        // Maintain the scroll position
        if( maintainScrollPosition === true ) {
            // This will set the variables for maintaining scroll position.
            // The values are used when handleScroll is called again.
            setValuesForMaintainingScroll( loadedViewModelObjects.length - settings.totalFound );
        }
        settings.loadedVMObjects = loadedViewModelObjects;
        settings.totalFound = loadedViewModelObjects.length;
    };

    self.setScrollPositionToBeMaintained = function() {
        maintainScrollPosition = true;
    };

    /**
     * Sets the proper variables to maintain the scroll position
     * @param {integer} rowDifferenceCount - the difference in rows used to calculate maintained scroll position
     */
    function setValuesForMaintainingScroll( rowDifferenceCount ) {
        maintainScrollPosition = false;
        scrollToRowInProgress = true;
        let currentRow = calculateElementIndexFromScrollTop( settings.scrollViewportElem.scrollTop );
        let scrollToRow = currentRow + rowDifferenceCount;
        scrollToRowScrollTop = calculateElementTopPosition( scrollToRow );
    }

    self.isScrollToRowInProgress = function() {
        return scrollToRowInProgress;
    };

    let scrollEndTimer;

    /**
     * Handles Scroll End logic
     * Deletes excess rows when user has stopped scrolling for 500ms
     * This prevents excessive deleting while trying to also create new rows and scroll table
     */
    function handleScrollEndEvent() {
        if( scrollEndTimer ) {
            clearTimeout( scrollEndTimer );
        }
        scrollEndTimer = setTimeout( async function() {
            removeExtraRows();
        }, 500 );
    }

    /**
     * Initialize Scroll Event to table
     */
    function initializeEvents() {
        settings.scrollViewportElem.removeEventListener( 'scroll', handleScrollEvent );
        settings.scrollViewportElem.removeEventListener( 'scroll', handleScrollEndEvent );
        settings.pinViewportElem.removeEventListener( 'scroll', handlePinScrollEvent );
        settings.scrollViewportElem.addEventListener( 'scroll', handleScrollEvent );
        settings.scrollViewportElem.addEventListener( 'scroll', handleScrollEndEvent );
        settings.pinViewportElem.addEventListener( 'scroll', handlePinScrollEvent );
    }

    /**
     * Scroll Event Handler
     */
    function handleScrollEvent( e ) {
        lastScrollTimeStamp = new Date();
        let oldScrollTop = currentScrollTop;
        currentScrollTop = settings.scrollViewportElem.scrollTop;
        let oldScrollLeft = currentScrollLeft;
        currentScrollLeft = settings.scrollViewportElem.scrollLeft;

        if( oldScrollTop === currentScrollTop && currentScrollTop < 0 && oldScrollLeft === currentScrollLeft && currentScrollLeft < 0 ) {
            e.preventDefault();
            e.stopPropagation();
        }

        // LCS-133249 Scrolling performance issue
        // Do scroll syncing at very beginning
        let pinViewportElem = settings.pinViewportElem;
        if( userPinScrollsDetected === 0 ) {
            disablePinScrollEvent = true;
            pinViewportElem.scrollTop = currentScrollTop;
        }

        settings.onStartScroll();

        if( oldScrollLeft !== currentScrollLeft && currentScrollLeft >= 0 ) {
            settings.syncHeader( false, currentScrollLeft );
            calculateTopHeightOfContainer();
            horizontalScrollDebounceEvent();
        }

        if( oldScrollTop !== currentScrollTop && currentScrollTop >= 0 ) {
            calculateTopHeightOfContainer();
            verticalScrollDebounceEvent();
        }

        userPinScrollsDetected -= 1;
        if( userPinScrollsDetected < 0 ) {
            userPinScrollsDetected = 0;
        }
    }

    /**
     * Real processing method for scroll event after debounce/requestAnimationFrame
     */
    function handleScrollEventInternal() {
        let func;
        let isScrollDown = currentScrollTop > previousScrollTop;
        if( isScrollDown ) {
            func = self.handleScrollDown;
        } else {
            func = handleScrollUp;
        }
        previousScrollTop = currentScrollTop;

        // Do scroll shadow
        if( currentScrollTop > 0 ) {
            if( !settings.tableElem.classList.contains( _t.Const.CLASS_TABLE_SCROLLED ) ) {
                settings.tableElem.classList.add( _t.Const.CLASS_TABLE_SCROLLED );
            }
        } else {
            if( settings.tableElem.classList.contains( _t.Const.CLASS_TABLE_SCROLLED ) ) {
                settings.tableElem.classList.remove( _t.Const.CLASS_TABLE_SCROLLED );
            }
        }

        func.call();
    }

    /**
     * Method to handle scroll down
     */
    self.handleScrollDown = async function() {
        if( rowElements && rowElements.length ) {
            let lastChildElem = rowElements[ rowElements.length - 1 ];
            let lastIndexNumber = parseInt( lastChildElem.getAttribute( 'data-indexNumber' ) );
            let lastItemBottomPosition;
            if( settings.treeTableEditSettings ) {
                lastItemBottomPosition = ( lastIndexNumber - settings.treeTableEditSettings.firstIndex ) * settings.rowHeight + settings.rowHeight;
            } else {
                lastItemBottomPosition = calculateElementTopPosition( lastIndexNumber + 1 );
            }
            let lastVisibleRowIndex = calculateLastVisibleRowIndex();
            let lastItemAboveTop = lastItemBottomPosition < currentScrollTop;
            if( lastItemAboveTop === true ) {
                // Check if all the elements are rendered.
                if( lastIndexNumber + 1 < settings.totalFound ) {
                    // Last element went up and page is empty. Need to calculate the page number now
                    await self.handleScroll();
                }
            } else if( lastItemBottomPosition < calculateElementTopPosition( lastVisibleRowIndex + extraVisibleRowCount ) ) {
                let extraBlankRowsInView = lastVisibleRowIndex - lastIndexNumber;
                extraBlankRowsInView = extraBlankRowsInView < 0 ? 0 : extraBlankRowsInView;
                // Last element went up and element is still in the page. Can do continuous rendering
                let startCount = lastIndexNumber + 1;
                let endCount = startCount + extraVisibleRowCount + extraBlankRowsInView;
                await renderPageData( startCount, endCount );
            }
        } else {
            self.handleScroll();
        }
    };

    /**
     * Method to handle wheel scroll event
     *
     * @param {Object} e - the event
     */
    function handlePinScrollEvent( e ) {
        if( disablePinScrollEvent === true ) {
            disablePinScrollEvent = false;
            return;
        }

        var currentPinScrollLeft = settings.pinViewportElem.scrollLeft;
        settings.syncHeader( true, currentPinScrollLeft );

        // If scrollTop is same as currentScrollTop then nothing else needs to be done.
        if( settings.pinViewportElem.scrollTop === currentScrollTop ) {
            return;
        }

        userPinScrollsDetected += 1;

        if( settings.pinViewportElem.scrollTop !== settings.pinViewportElem.scrollHeight - settings.pinViewportElem.offsetHeight ) {
            settings.scrollViewportElem.scrollTop = settings.pinViewportElem.scrollTop;
        } else {
            settings.scrollViewportElem.scrollTop = settings.pinViewportElem.scrollTop + 40;
        }

        // Prevent scrolling the parent div
        e.preventDefault();
    }

    /**
     * Method call by handleScrollUp and handleScrollDown which processing page rendering
     */
    self.handleScroll = async function() {
        var currentStartIndex;

        if( settings.initialRowIndex ) {
            self.updateRowAlignment();
            var newScrollIdx = calculateElementIndexFromScrollTop( calculateElementTopPosition( settings.initialRowIndex ) - _visibleAreaHeight * 0.75 );
            var newScrollTop = calculateElementTopPosition( newScrollIdx );
            delete settings.initialRowIndex;
            currentScrollTop = newScrollTop < 0 ? 0 : newScrollTop;
            currentStartIndex = newScrollIdx;
            settings.scrollViewportElem.scrollTop = currentScrollTop;
        }
        if( scrollToRowInProgress === true ) {
            self.updateRowAlignment();
            settings.scrollViewportElem.scrollTop = scrollToRowScrollTop;
            scrollToRowInProgress = false;
            scrollToRowScrollTop = null;
        }

        if( !currentStartIndex ) {
            currentStartIndex = calculateElementIndexFromScrollTop( currentScrollTop );
        }

        var start = currentStartIndex - extraVisibleRowCount;
        var end = currentStartIndex + visibleRowsCount + extraVisibleRowCount;
        if( end > settings.totalFound - 1 ) {
            var offset = end - settings.totalFound - 1;
            end -= offset;
            start -= offset;
        }
        await renderPageData( start, end, true );
        previousScrollTop = currentScrollTop;
    };

    /**
     * Method to handle scroll up
     */
    async function handleScrollUp() {
        if( rowElements && rowElements.length ) {
            var firstChildElem = rowElements[ 0 ];
            var firstItemIndex = parseInt( firstChildElem.getAttribute( 'data-indexNumber' ) );
            var firstItemTopPosition;
            if( settings.treeTableEditSettings ) {
                firstItemTopPosition = ( firstItemIndex - settings.treeTableEditSettings.firstIndex ) * settings.rowHeight;
            } else {
                firstItemTopPosition = calculateElementTopPosition( firstItemIndex );
            }
            var firstVisibleElem = calculateElementIndexFromScrollTop( currentScrollTop );
            var firstItemBelowBottom = firstItemTopPosition > currentScrollTop + _visibleAreaHeight;
            if( firstItemBelowBottom === true ) {
                await self.handleScroll();
            } else if( firstItemTopPosition > calculateElementTopPosition( firstVisibleElem - extraVisibleRowCount ) ) {
                var extraBlankRowsInView = firstItemIndex - firstVisibleElem;
                extraBlankRowsInView = extraBlankRowsInView < 0 ? 0 : extraBlankRowsInView;
                var endCount = firstItemIndex - 1;

                var startCount = endCount - extraVisibleRowCount - extraBlankRowsInView;
                await renderPageData( startCount, endCount );
            }
        } else {
            await self.handleScroll();
        }
    }

    /**
     * Sets up scrolling for trees while in edit mode
     * @param {Boolean} isEditing if the table is in edit mode or not
     */
    self.setupTreeEditScroll = function( isEditing ) {
        if( !isEditing ) {
            if( settings.treeTableEditSettings ) {
                // Find our current scroll position
                var relativeIdx = settings.scrollViewportElem.scrollTop / self.getRowHeight();
                var scrollTop = ( relativeIdx + settings.treeTableEditSettings.firstIndex - 1 ) * self.getRowHeight();
                // Remove tree Edit settings
                delete settings.treeTableEditSettings;
                // Reset alignment/rows
                self.updateRowAlignment();
                self.handleScroll();
                // Reset our scroll position to what we were at
                settings.pinViewportElem.scrollTop = scrollTop;
                settings.scrollViewportElem.scrollTop = scrollTop;
            }
            return;
        }

        // If no element in table, return
        if( !rowElements || !rowElements[ 0 ] ) {
            return;
        }

        // Find first row that contains data
        var firstChildElem = rowElements[ 0 ];
        var firstIndex = parseInt( firstChildElem.getAttribute( 'data-indexNumber' ) );
        var hasProps = settings.loadedVMObjects[ firstIndex ].props;

        while( hasProps && firstIndex > 0 ) {
            hasProps = settings.loadedVMObjects[ firstIndex - 1 ].props;
            if( hasProps ) {
                firstIndex--;
            }
        }

        // Find last row that contains data
        var lastChildElem = rowElements[ rowElements.length - 1 ];
        var lastIndex = parseInt( lastChildElem.getAttribute( 'data-indexNumber' ) );
        hasProps = settings.loadedVMObjects[ lastIndex ].props;

        while( hasProps && lastIndex < settings.totalFound - 1 ) {
            hasProps = settings.loadedVMObjects[ lastIndex + 1 ].props;
            if( hasProps ) {
                lastIndex++;
            }
        }

        settings.treeTableEditSettings = {
            firstIndex: firstIndex,
            lastIndex: lastIndex,
            totalDataLength: lastIndex + 1
        };

        // update the container height
        self.updateRowAlignment();
    };

    /**
     *  Remove rows from lower-bound to upper-bound
     *
     * @param {Object} upperCountIdx - event
     * @param {Object} lowerCounterIdx - event
     */
    function removeRows( upperCountIdx, lowerCounterIdx ) {
        settings.removeRows( upperCountIdx, lowerCounterIdx );
        rowElements = settings.scrollParentElem.querySelectorAll( settings.rowSelector );
    }

    /**
     *  Resets infinite scroll back to a starting state
     */
    self.resetInfiniteScroll = function() {
        self.setLoadedVMObjects( [] );
        self.resetInitialRowIndex();
        rowHeightCache = [];
        renderingPromiseQueue = [];
        settings.scrollViewportElem.scrollTop = 0;
        settings.pinViewportElem.style.top = '0px';
        settings.scrollViewportElem.style.top = '0px';
        currentScrollTop = 0;
        self.handleScroll();
    };

    /**
     * Resets the row height cache
     */
    self.resetRowHeightCache = function() {
        rowHeightCache = [];
    };

    /**
     * Method to render rows
     *
     * @param {Number} startIndex Start render index
     * @param {Number} endIndex End render Index
     */
    async function renderRows( startIndex, endIndex ) {
        // assign a rendering promise so if multiple renders happen, they can wait
        let renderPromise = new Promise( async function( resolve ) {
            await settings.renderRows( startIndex, endIndex );
            rowElements = settings.scrollParentElem.querySelectorAll( settings.rowSelector );
            if( settings.dynamicRowHeightStatus ) {
                // check if last value of rowHeightCache is in new set of rendered data, otherwise can cause off by 1.
                let lastCacheIdx = rowHeightCache.length - 1;
                let firstElemIdx = rowElements[ 0 ].getAttribute( 'data-indexnumber' );
                let lastElemIdx = rowElements[ rowElements.length - 1 ].getAttribute( 'data-indexnumber' );

                if( lastCacheIdx < firstElemIdx || lastCacheIdx > lastElemIdx ) {
                    // Delete last cache value to prevent off by 1 caused by margin
                    rowHeightCache[ rowHeightCache.length - 1 ] = null;
                }
                // Loop through rowElements to update row cache
                for( let rowElement of rowElements ) {
                    let index = parseInt( rowElement.getAttribute( 'data-indexnumber' ) );
                    rowHeightCache[ index ] = rowElement.offsetHeight;
                }
            }
            resolve();
        } );
        renderingPromiseQueue.push( renderPromise );
        return renderPromise;
    }

    /**
     * Method to render rows
     *
     * @param {int} startCount - event
     * @param {int} endCount - event
     * @param {int} removeAllChild - event
     */
    async function renderPageData( startCount, endCount, removeAllChild ) {
        var totalDataLength;
        // Check if table is tree table and is editing
        if( settings.treeTableEditSettings ) {
            if( startCount < settings.treeTableEditSettings.firstIndex ) {
                startCount = settings.treeTableEditSettings.firstIndex;
            }

            if( endCount > settings.treeTableEditSettings.lastIndex ) {
                endCount = settings.treeTableEditSettings.lastIndex;
            }
            totalDataLength = settings.treeTableEditSettings.totalDataLength;
        } else {
            // Check to avoid negative indexing
            if( startCount < 0 ) {
                startCount = 0;
            }
            totalDataLength = settings.totalFound;
        }

        if( startCount >= totalDataLength ) {
            if( totalDataLength === 0 ) {
                // if collection becomes empty, then remove all the existing list rows
                // Wait for any rendering to be done so stuff is removed right
                if( renderingPromiseQueue.length > 0 ) {
                    await Promise.allSettled( renderingPromiseQueue ).then( function() {
                        renderingPromiseQueue = [];
                    } );
                }
                removeRows( rowElements.length - 1, 0 );
                self.updateRowAlignment();
            } else {
                settings.updateScrollColumnsInView( currentScrollLeft, scrollContainerWidth );
                await renderRows( startCount, endCount );
            }

            if( startCount === totalDataLength ) {
                logger.trace( 'Table scroll service: Rendering of page data complete. No more data to render.' );
                return;
            }
        }

        // check to avoid wrong indexing for startCount
        if( startCount > totalDataLength ) {
            endCount -= startCount;
            startCount = 0;
        }

        // check to avoid wrong indexing for endCount
        if( endCount >= totalDataLength ) {
            endCount = totalDataLength - 1;
        }

        if( removeAllChild ) {
            // Wait for any rendering to be done so stuff is removed right
            if( renderingPromiseQueue.length > 0 ) {
                await Promise.allSettled( renderingPromiseQueue ).then( function() {
                    renderingPromiseQueue = [];
                } );
            }
            // remove the elements from the dom tree.
            removeRows( rowElements.length - 1, 0 );
        }

        await renderRows( startCount, endCount );

        self.updateRowAlignment();

        afterGridRender();
    }

    /**
     * Remove extra rows
     */
    function removeExtraRows() {
        const rowParentElem = settings.scrollParentElem;
        rowElements = rowParentElem.querySelectorAll( settings.rowSelector );

        if( rowElements.length === 0 ) {
            logger.error( 'Rendering error' );
        } else {
            let extraChildCount;
            let invisibleRowsCount;
            let invisibleRowsHeight;

            const firstElem = rowElements[ 0 ];
            const firstRenderedItemIndex = parseInt( firstElem.getAttribute( 'data-indexNumber' ) );
            if( settings.treeTableEditSettings ) {
                invisibleRowsHeight = ( firstRenderedItemIndex - settings.treeTableEditSettings.firstIndex ) * settings.rowHeight - currentScrollTop;
            } else {
                // Simply checking if there are invisible rows, actual height doesn't matter as is not used
                invisibleRowsHeight = calculateElementTopPosition( firstRenderedItemIndex ) - currentScrollTop;
            }
            if( invisibleRowsHeight < 0 ) {
                invisibleRowsCount = Math.abs( calculateElementIndexFromScrollTop( currentScrollTop ) - firstRenderedItemIndex );
                extraChildCount = invisibleRowsCount - extraVisibleRowCount;
                if( extraChildCount > 0 ) {
                    // remove the elements from the dom tree.
                    removeRows( extraChildCount, 0 );
                }
            }

            const lastElem = rowElements[ rowElements.length - 1 ];
            const lastRenderedItemIndex = parseInt( lastElem.getAttribute( 'data-indexNumber' ) );
            const visRowsHeight = visibleRowsCount * settings.rowHeight + currentScrollTop;
            const lastVisibleRowIndex = calculateLastVisibleRowIndex();
            if( settings.treeTableEditSettings ) {
                invisibleRowsHeight = ( lastRenderedItemIndex - settings.treeTableEditSettings.firstIndex ) * settings.rowHeight + settings.rowHeight - visRowsHeight;
            } else {
                // Simply checking if there are invisible rows, so actual height doesn't matter here as it will not be used.
                invisibleRowsHeight = lastRenderedItemIndex - lastVisibleRowIndex;
            }
            if( invisibleRowsHeight > 0 ) {
                invisibleRowsCount = lastRenderedItemIndex - lastVisibleRowIndex;
                extraChildCount = invisibleRowsCount - extraVisibleRowCount;
                if( extraChildCount > 0 ) {
                    removeRows( rowElements.length - 1, rowElements.length - extraChildCount - 1 );
                }
            }
        }
        self.updateRowAlignment();
    }

    /**
     * After grid rendered
     */
    function afterGridRender() {
        var firstRenderedItemIndex = 0;
        var lastRenderedItemIndex = 0;

        var firstElem = rowElements[ 0 ];
        firstRenderedItemIndex = parseInt( firstElem.getAttribute( 'data-indexNumber' ) );

        var lastElem = rowElements[ rowElements.length - 1 ];
        lastRenderedItemIndex = parseInt( lastElem.getAttribute( 'data-indexNumber' ) );

        var firstRenderedItem = {
            index: firstRenderedItemIndex,
            uid: firstElem.vmo.uid,
            levelNdx: firstElem.vmo.levelNdx
        };

        var lastRenderedItem = {
            index: lastRenderedItemIndex,
            uid: lastElem.vmo.uid,
            levelNdx: lastElem.vmo.levelNdx
        };

        settings.afterGridRenderCallback( firstRenderedItem, lastRenderedItem );
    }

    self.destroyGrid = function() {
        settings.scrollViewportElem && settings.scrollViewportElem.removeEventListener( 'scroll', handleScrollEvent );
        settings.scrollViewportElem && settings.scrollViewportElem.removeEventListener( 'scroll', handleScrollEndEvent );
        settings.pinViewportElem && settings.pinViewportElem.removeEventListener( 'scroll', handlePinScrollEvent );
        momentumScrolling.disable();
        self.checkForResize.cancel();
        horizontalScrollDebounceEvent.cancel();
        verticalScrollDebounceEvent.cancel();
    };

    /**
     * Scrolls to the given row
     *
     * @param {integer[]} rowIndexes Index to scroll to
     * @returns {boolean} returns false if a row is in view
     */
    self.scrollToRowIndex = function( rowIndexes ) {
        // Only scroll to row if it is out of view
        if( self.isInitialized() === true ) {
            var scrollToRowElementPosition = null;
            var firstRowElementIndex = 0;
            var lastIndexNumber = 0;
            if( rowElements.length > 0 ) {
                firstRowElementIndex = Number( rowElements[ 0 ].getAttribute( 'data-indexnumber' ) );
                lastIndexNumber = Number( rowElements[ rowElements.length - 1 ].getAttribute( 'data-indexnumber' ) );
            }

            var scrollCanvasRect = settings.scrollViewportElem.getBoundingClientRect();
            for( var i = 0; i < rowIndexes.length; i++ ) {
                var rowIndex = rowIndexes[ i ];

                if( rowElements.length > 0 ) {
                    if( rowIndex > lastIndexNumber || rowIndex < firstRowElementIndex ) {
                        initialRowIndex = rowIndex;
                        continue;
                    }

                    scrollToRowElementPosition = rowElements[ rowIndex - firstRowElementIndex ].getBoundingClientRect();
                    if( scrollToRowElementPosition.top < scrollCanvasRect.top || scrollToRowElementPosition.bottom > scrollCanvasRect.bottom ) {
                        initialRowIndex = rowIndex;
                        continue;
                    }

                    initialRowIndex = rowIndex;
                }
                return false;
            }

            // Check if attempting to scroll past maximum scrollTop, if so set flag
            var maxScrollTop = settings.scrollViewportElem.scrollHeight - settings.scrollViewportElem.clientHeight;
            var newScrollTop = Math.floor( calculateElementTopPosition( initialRowIndex ) - _visibleAreaHeight * 0.75 );
            var initialRowIndexOnDom = initialRowIndex - firstRowElementIndex;

            if( rowElements[ initialRowIndexOnDom ] ) {
                scrollToRowElementPosition = rowElements[ initialRowIndexOnDom ].getBoundingClientRect();
                if( scrollToRowElementPosition.top < scrollCanvasRect.top && scrollToRowElementPosition.bottom > scrollCanvasRect.top ) {
                    newScrollTop = calculateElementTopPosition( initialRowIndex );
                } else if( scrollToRowElementPosition.top < scrollCanvasRect.bottom && scrollToRowElementPosition.bottom > scrollCanvasRect.bottom ) {
                    newScrollTop = settings.scrollViewportElem.scrollTop + ( scrollToRowElementPosition.bottom - scrollCanvasRect.bottom );
                }
            }

            if( newScrollTop > maxScrollTop ) {
                scrollToRowInProgress = true;
                scrollToRowScrollTop = newScrollTop;
            }
            settings.scrollViewportElem.scrollTop = newScrollTop;
        } else {
            initialRowIndex = rowIndexes[ 0 ];
        }

        return true;
    };

    /**
     * Scrolls to scroll container column
     * @param {Object} column - The column to scroll to
     */
    self.scrollToColumn = function( column ) {
        if( column.startPosition <= currentScrollLeft || column.startPosition > currentScrollLeft + scrollContainerWidth ) {
            settings.scrollViewportElem.scrollLeft = column.startPosition - 10;
        }
    };

    self.isInitialRowIndexInView = function() {
        let firstRowElementIndex = Number( rowElements[ 0 ].getAttribute( 'data-indexnumber' ) );
        let initialRowElement = rowElements[ initialRowIndex - firstRowElementIndex ];
        if( initialRowElement === undefined ) {
            return false;
        }

        let initialRowElementIndex = initialRowElement.getAttribute( 'data-indexnumber' );
        let firstVisibleIndex = calculateElementIndexFromScrollTop( currentScrollTop );
        let lastVisibleIndex = calculateLastVisibleRowIndex();

        if( initialRowElementIndex < firstVisibleIndex || initialRowIndex > lastVisibleIndex ) {
            return false;
        }

        return true;
    };

    /**
     * Resets the initial row index to 0 so that infinite scroll service will
     * start the rendering of rows at the top.
     */
    self.resetInitialRowIndex = function() {
        initialRowIndex = 0;
    };
};

export default SPLMTableInfiniteScroll;
