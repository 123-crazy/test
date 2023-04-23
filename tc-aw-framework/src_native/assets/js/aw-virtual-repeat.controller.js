// Copyright (c) 2020 Siemens

/**
 * Defines controller for 'aw-virtual-repeat' directive
 *
 * @module js/aw-virtual-repeat.controller
 */
import app from 'app';
import ngModule from 'angular';
import 'js/awVirtualRepeatService';

/**
 * Local variables
 *
 * @private
 */
var localVars = {};

/**
 * Number of additional elements to render above and below the viewable area
 */
localVars.NUM_EXTRA = 3;

/**
 * Default item size of repeated elements.
 */
localVars.DEFAULT_ITEM_SIZE = 60;

/**
 * Defines virtual repeat controller
 *
 * @member awVirtualRepeatController
 * @memberof NgControllers
 */
app.controller( 'awVirtualRepeatController', [
    '$scope',
    '$element',
    '$attrs',
    '$$rAF',
    'virtualRepeatService',
    function( $scope, $element, $attrs, $$rAF, virtualRepeatSvc ) {
        var self = this;

        /**
         * last processed index
         */
        this.lastProcessedIndex = 0;

        /**
         * Directive element
         */
        this.$element = $element;

        /**
         * Attributes of the directive
         */
        this.$attrs = $attrs;

        /**
         * Reference to document
         */
        this.$document = document;

        /**
         * Reference to request animation frame ($$rAF)
         */
        this.$$rAF = $$rAF;

        /**
         * Reference to scope of directive
         */
        this.$scope = $scope;

        /**
         * Whether we are in on-demand mode
         */
        this.onDemand = this.$attrs.hasOwnProperty( 'awOnDemand' );

        /**
         * Recent starting repeat index (based on scroll offset)
         */
        this.newStartIndex = 0;

        /**
         * Recent ending repeat index (based on scroll offset)
         */
        this.newEndIndex = 0;

        /**
         * Recent end visible index (based on scroll offset)
         */
        this.newVisibleEnd = 0;

        /**
         * Previous starting repeat index (based on scroll offset)
         */
        this.startIndex = 0;

        /**
         * Previous ending repeat index (based on scroll offset)
         */
        this.endIndex = 0;

        /**
         * Array of item heights.
         */
        this.itemSizes = {};

        /**
         * Array of row heights.
         */
        this.rowHeights = {};

        /**
         * Whether this is the first time that items are rendered.
         */
        this.isFirstRender = true;

        /**
         * Adjust scroll flag
         */
        this.adjustScroll = false;

        /**
         * Whether the items in the list are already being updated. Used to prevent nested calls to
         * virtualRepeatUpdate.
         */
        this.isVirtualRepeatUpdating = false;

        /**
         * Recently seen length of items.
         */
        this.itemsLength = 0;

        /**
         * Unwatch callback for item size (when aw-items-size is not specified), or angular.noop otherwise.
         */
        this.unwatchItemSize = ngModule.noop;

        /**
         * Presently rendered blocks by repeat index.
         */
        this.blocks = [];

        /**
         * A pool of presently unused blocks.
         */
        this.pooledBlocks = [];

        this.scrolling = false;

        $scope.$on( '$destroy', function() {
            self.cleanupBlocks();
        } );

        /**
         * Triggered at startup by the aw-virtual-repeat postLink function.
         *
         * @param {Controller} container - The container's controller.
         * @param {Function} transclude - The repeated element's bound transclude function.
         * @param {String} repeatName - The left hand side of the repeat expression, indicating the name for each
         *            item in the array.
         * @param {Function} repeatListExpression - A compiled expression based on the right hand side of the repeat
         *            expression. Points to the array to repeat over.
         */
        this.init = function( container, transclude, repeatName, repeatListExpression ) {
            this.container = container;
            this.transclude = transclude;
            this.repeatName = repeatName;
            this.rawRepeatListExpression = repeatListExpression;
            this.sized = false;
            this.parentNode = this.$element[ 0 ].parentNode;
            this.firstBlock = this.getBlock( 0 );

            this.itemWidth = this.firstBlock.element[ 0 ].offsetWidth;
            self.setColSize();

            this.repeatListExpression = ngModule.bind( this, this.repeatListExpression );
            this.container.initialize( this );

            // remove first block after calculating the column size
            this.parentNode.removeChild( this.firstBlock.element[ 0 ] );
        };

        /**
         * Calculate number of columns fitted based on the available space and set it.
         *
         * @private
         */
        this.setColSize = function() {
            var containerWidth = self.parentNode.clientWidth;

            /**
             * Column size should never be 0. Set it to 1 by default, if for some reason it couldn't calculate the
             * column size correctly
             *
             * Ex: When container width is less than item width
             */
            this.container.columnSize = 1;

            if( containerWidth && this.itemWidth && containerWidth >= this.itemWidth ) {
                this.container.columnSize = Math.floor( containerWidth / this.itemWidth );
            }
        };

        /**
         * Cleans up unused blocks.
         *
         * @private
         */
        this.cleanupBlocks = function() {
            ngModule.forEach( this.pooledBlocks, function cleanupBlock( block ) {
                if( block ) {
                    block.element.remove();
                }
            } );

            this.itemSizes = {};
            this.rowHeights = {};
        };

        /**
         * Returns the user-specified repeat list, transforming it into an array-like object in the case of infinite
         * scroll/dynamic load mode.
         *
         * @param {Object} scope - scope of the directive.
         * @return {ObjectArray} An array or array-like object for iteration.
         */
        this.repeatListExpression = function( scope ) {
            var repeatList = this.rawRepeatListExpression( scope );

            if( this.onDemand && repeatList && repeatList.name ) {
                var virtualList = new VirtualRepeatModelArrayLike( repeatList );
                virtualList.$$includeIndexes( this.newStartIndex, this.newVisibleEnd, scope );
                return virtualList;
            }

            return repeatList;
        };

        /**
         * Called by the container. Informs us that the containers scroll or size has changed.
         */
        this.containerUpdated = function( scrolling ) {
            self.scrolling = scrolling;

            // ColumnSize must never be 0;
            if( this.container.columnSize === 0 ) {
                self.setColSize();
            }

            if( !self.sized ) {
                self.items = self.repeatListExpression( self.$scope );
            }

            if( !self.sized ) {
                self.unwatchItemSize();
                self.sized = true;

                self.$scope.$watchCollection( self.repeatListExpression, function( items, oldItems ) {
                    if( !self.isVirtualRepeatUpdating ) {
                        self.setColSize();
                        self.virtualRepeatUpdate( items, oldItems );
                    }
                } );
            }

            self.updateIndexes();

            if( self.newStartIndex !== self.startIndex || self.newEndIndex !== self.endIndex ||
                self.container.getScrollOffset() > self.container.getScrollSize() ) {
                if( self.items instanceof VirtualRepeatModelArrayLike ) {
                    self.items.$$includeIndexes( self.newStartIndex, self.newEndIndex, self.$scope );
                }

                self.virtualRepeatUpdate( self.items, self.items );
            }
        };

        /**
         * Called by the container. Returns the size of a single repeated item.
         *
         * @return {Number} Size of a repeated item.
         */
        this.getFixedCellHeight = function() {
            return this.container.fixedCellHeight;
        };

        /**
         * Called by the container. Returns item count.
         *
         * @return {Number} length of items
         */
        this.getItemCount = function() {
            return this.itemsLength;
        };

        /**
         * Updates the order and visible offset of repeated blocks in response to scrolling or items updates.
         *
         * @param {Array} items - array of items
         * @param {Array} oldItems - array of old items
         *
         * @private
         */
        this.virtualRepeatUpdate = function( items, oldItems ) {
            this.isVirtualRepeatUpdating = true;

            var itemsLength = items && items.length || 0;
            var lengthChanged = false;

            /**
             * Reset scroll position to top if the number of loaded items decreases i.e. if something is
             * deleted/removed
             */
            if( this.items && itemsLength < this.items.length && this.container.getScrollOffset() !== 0 ) {
                this.items = items;
                this.container.resetScroll();
                return;
            }

            if( itemsLength !== this.itemsLength ) {
                lengthChanged = true;
                this.itemsLength = itemsLength;
            }

            this.items = items;

            /**
             * Update start and end indexes if items are changed
             */
            if( items !== oldItems || lengthChanged ) {
                this.updateIndexes();
            }

            virtualRepeatSvc.setTransform( self.rowHeights, self.container.columnSize, self.newStartIndex,
                self.container.offsetterElem, self.getFixedCellHeight() );

            if( lengthChanged || this.adjustScroll ) {
                this.container.setScrollSize( itemsLength / this.container.columnSize *
                    self.getFixedCellHeight() );
                this.adjustScroll = false;
            }

            /**
             * At first render, scrolls to 0 or provided start index if any
             */
            if( this.isFirstRender ) {
                this.isFirstRender = false;
                var startIndex = this.$attrs.mdStartIndex ? this.$scope.$eval( this.$attrs.mdStartIndex ) :
                    this.container.topIndex;
                this.container.scrollToIndex( startIndex );
            }

            // Detach and pool any blocks that are no longer in the viewport.
            Object.keys( this.blocks ).forEach( function( blockIndex ) {
                var index = parseInt( blockIndex, 10 );
                if( index < this.newStartIndex || index >= this.newEndIndex ) {
                    this.poolBlock( index );
                }
            }, this );

            var i;
            var block;
            var newStartBlocks = [];
            var newEndBlocks = [];

            // Collect blocks at the top.
            for( i = this.newStartIndex; i < this.newEndIndex &&
                ( this.blocks[ i ] === null || this.blocks[ i ] === undefined ); i++ ) {
                block = this.getBlock( i );
                this.updateBlock( block, i );
                newStartBlocks.push( block );
            }

            // Update blocks that are already rendered.
            for( i; this.blocks[ i ] !== null && this.blocks[ i ] !== undefined; i++ ) {
                this.updateBlock( this.blocks[ i ], i );
            }

            var maxIndex = i - 1;

            // Collect blocks at the end.
            for( i; i < this.newEndIndex; i++ ) {
                block = this.getBlock( i );
                this.updateBlock( block, i );
                newEndBlocks.push( block );
            }

            // Attach collected blocks to the document.
            if( newStartBlocks.length ) {
                this.parentNode.insertBefore( this.domFragmentFromBlocks( newStartBlocks ),
                    this.$element[ 0 ].nextSibling );
            }
            if( newEndBlocks.length ) {
                this.parentNode.insertBefore( this.domFragmentFromBlocks( newEndBlocks ), this.blocks[ maxIndex ] &&
                    this.blocks[ maxIndex ].element[ 0 ].nextSibling );
            }

            this.startIndex = this.newStartIndex;
            this.endIndex = this.newEndIndex;
            this.isVirtualRepeatUpdating = false;

            // Announce cell rendered
            if( ngModule.element( this.parentNode ).scope() ) {
                ngModule.element( this.parentNode ).scope().$broadcast( 'cell.rendered' );
            }
        };

        /**
         * Get Block of the specified index
         *
         * @param {Number} index Where the block is to be in the repeated list.
         * @return {Object} A new or pooled block to place at the specified index.
         *
         * @private
         */
        this.getBlock = function( index ) {
            if( this.pooledBlocks.length ) {
                return this.pooledBlocks.pop();
            }

            var block;
            this.transclude( function( clone, scope ) {
                block = {
                    element: clone,
                    isNew: true,
                    scope: scope
                };

                self.updateScope( scope, index );
                self.parentNode.appendChild( clone[ 0 ] );
            } );

            return block;
        };

        /**
         * Updates and if not in a digest cycle, digests the specified block's scope to the data at the specified
         * index.
         *
         * @param {Object} block - The block whose scope should be updated.
         * @param {Number} index - The index to set.
         * @private
         */
        this.updateBlock = function( block, index ) {
            this.blocks[ index ] = block;

            if( block ) {
                if( !block.isNew &&
                    ( block.scope.$index === index && block.scope[ this.repeatName ] === this.items[ index ] ) ) {
                    return;
                }

                block.isNew = false;

                // Update and digest the block's scope.
                this.updateScope( block.scope, index );

                /**
                 * Perform digest before re-attaching the block. Any resulting synchronous DOM mutations should be
                 * much faster as a result.
                 */
                if( block.scope ) {
                    block.scope.$evalAsync( function() {
                        virtualRepeatSvc.setTransform( self.rowHeights, self.container.columnSize,
                            self.newStartIndex, self.container.offsetterElem, self.getFixedCellHeight() );
                        self.container.setScrollSize( self.items.length / self.container.columnSize *
                            self.getFixedCellHeight() );
                        self.adjustScroll = false;
                    } );
                }
            }
        };

        /**
         * Updates scope to the data at the specified index.
         *
         * @param {Object} scope - The scope which should be updated.
         * @param {Number} index - The index to set.
         * @private
         */
        this.updateScope = function( scope, index ) {
            scope.$index = index;
            scope[ this.repeatName ] = this.items && this.items[ index ];
        };

        /**
         * Pools the block at the specified index (Pulls its element out of the DOM and stores it).
         *
         * @param {Number} index The index at which the block to pool is stored.
         * @private
         */
        this.poolBlock = function( index ) {
            this.pooledBlocks.push( this.blocks[ index ] );

            if( this.blocks[ index ] ) {
                this.parentNode.removeChild( this.blocks[ index ].element[ 0 ] );
            }

            delete this.blocks[ index ];
        };

        /**
         * Produces a DOM fragment containing the elements from the list of blocks.
         *
         * @param {Array} blocks - The blocks whose elements should be added to the document fragment.
         * @return {DocumentFragment} document fragment
         * @private
         */
        this.domFragmentFromBlocks = function( blocks ) {
            var fragment = this.$document.createDocumentFragment();
            blocks.forEach( function( block ) {
                if( block ) {
                    fragment.appendChild( block.element[ 0 ] );
                }
            } );

            return fragment;
        };

        /**
         * Updates start and end indexes based on length of repeated items and container size.
         *
         * @private
         */
        this.updateIndexes = function() {
            self.updateIndexesUsingRowHeight();
        };

        /**
         * Updates start and end indexes based on length of repeated items and container size.
         *
         * @private
         */
        this.updateIndexesUsingRowHeight = function() {
            // total number of items loaded
            var numOfLoadedItems = this.items ? this.items.length : 0;
            var numOfItemsFitted = Math.ceil( this.container.getContainerHeight() / this.getFixedCellHeight() ) *
                this.container.columnSize;
            var scrolledItems = Math.floor( this.container.getScrollOffset() / this.getFixedCellHeight() ) *
                this.container.columnSize;

            var newStartIndx = Math.max( 0, Math.min( numOfLoadedItems - numOfItemsFitted, scrolledItems ) );

            this.newVisibleEnd = newStartIndx + numOfItemsFitted +
                localVars.NUM_EXTRA * this.container.columnSize;
            this.newEndIndex = Math.min( numOfLoadedItems, this.newVisibleEnd );

            this.newStartIndex = Math.max( 0, newStartIndx - localVars.NUM_EXTRA * this.container.columnSize );
        };

        /**
         * This VirtualRepeatModelArrayLike class enforces the interface requirements for infinite scrolling. An
         * object with this interface must implement the following interface with two (2) methods:
         *
         * getItemAtIndex: function(index) - Item at that index or null if it is not yet loaded (It should start
         * downloading the item in that case).
         *
         * getLength: function() - Number The data legnth to which the repeater container should be sized. Ideally,
         * when the count is known, this method should return it. Otherwise, return a higher number than the
         * currently loaded items to produce an infinite-scroll behavior.
         *
         */
        function VirtualRepeatModelArrayLike( model ) {
            if( !ngModule.isFunction( model.getItemAtIndex ) || !ngModule.isFunction( model.getLength ) ) {
                throw new Error(
                    'When aw-on-demand is enabled, the Object passed to aw-virtual-repeat must implement ' + //
                    'functions getItemAtIndex() and getLength() ' );
            }

            this.model = model;
        }

        VirtualRepeatModelArrayLike.prototype.$$includeIndexes = function( start, end, $scope2 ) {
            for( var i = start; i < end; i++ ) {
                if( !this.hasOwnProperty( i ) ) {
                    this[ i ] = this.model.getItemAtIndex( i, $scope2 );
                }
            }

            this.length = this.model.getLength();
        };
    }
] );
