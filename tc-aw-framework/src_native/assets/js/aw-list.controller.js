// Copyright (c) 2020 Siemens

/**
 * Defines controller for '<aw-list>' directive.
 *
 * @module js/aw-list.controller
 */
import app from 'app';
import $ from 'jquery';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import cellListUtils from 'js/cellListUtils';
import parsingUtils from 'js/parsingUtils';
import ngUtils from 'js/ngUtils';
import awEventHelperService from 'js/awEventHelperService';
import viewModelSvc from 'js/viewModelService';
import declDragAndDropService from 'js/declDragAndDropService';
import domUtils from 'js/domUtils';
import 'js/awVirtualRepeatService';
import 'js/dragAndDropService';
import 'js/selectionHelper';
import 'js/conditionService';
import 'js/appCtxService';
import 'js/command.service';
import 'js/contextMenuService';
import ariaList from 'js/ariaList';
import wcagSvc from 'js/wcagService';

const dom = domUtils.DOMAPIs;

/**
 * Local variables
 *
 * @private
 */
var localVars = {};

/**
 * CSS height property
 */
localVars.HEIGHT = 'height';

// eslint-disable-next-line valid-jsdoc
/**
 * Defines awList controller
 *
 * @member awListController
 * @memberof NgControllers
 */
app.controller( 'awListController', [
    '$scope',
    '$element',
    '$timeout',
    '$$rAF',
    '$attrs',
    'virtualRepeatService',
    'dragAndDropService',
    'selectionHelper',
    'conditionService',
    'appCtxService',
    'commandService',
    'contextMenuService',
    function( $scope, $element, $timeout, $$rAF, $attrs, virtualRepeatSvc, dragAndDropSvc, selectionHelper,
        conditionService, appCtxService, commandSvc, cnxtMenuSvc ) {
        var self = this;
        var listDragDropLsnr = null;
        var list = null;
        const FOCUSED_ITEM_CLASS = 'aw-list-itemFocused';

        $scope.initialize = false;

        /**
         * Height of the container
         */
        self.containerHeight = 0;

        /**
         * Scroll height of the scroller element
         */
        self.scrollSize = 0;

        /**
         * scrollLeft or scrollTop of the scroller
         */
        self.scrollOffset = 0;

        /**
         * Virtual repeat controller
         */
        self.awVirtualRepeatCtrl = null;

        /**
         * Original container size
         */
        self.originalSize = null;

        /**
         * Number of Columns
         */
        this.columnSize = 1;

        /**
         * Amount to offset the total scroll size by
         */
        self.offsetSize = 0;

        /**
         * Element height on the container prior to auto-shrinking.
         */
        self.oldElementSize = null;

        /**
         * Container's top index
         */
        self.topIndex = 0;

        self.isScroll = false;

        /**
         * {Boolean} TRUE if we have already started an async load of a page of items for this list.
         */
        self._pageLoadInProgress = false;

        /**
         * Reference to request animation frame ($$rAF)
         */
        self.$$rAF = $$rAF;

        if( $attrs.showDecorators ) {
            if( appCtxService.ctx.decoratorToggle ) {
                $scope.dataprovider.showDecorators = true;
            } else {
                $scope.dataprovider.showDecorators = false;
            }

            $scope.$watch( function() {
                return appCtxService.ctx.decoratorToggle;
            }, function( newVal, oldVal ) {
                if( newVal !== oldVal ) {
                    var decoratorObj = {};
                    decoratorObj.toggleState = newVal;
                    eventBus.publish( $scope.dataprovider.name + '.toggleCellDecorators', decoratorObj );
                }
            } );
        }

        /**
         * List resizer, which is an empty element used for setting up the height of the scrollbar.
         */
        self.resizerElem = $element.find( '.aw-widgets-cellListResizer' )[ 0 ];

        var _cellCmdElem;

        var _CLASS_LIST_COMPILED_ELEMENT = 'aw-list-compiled-element';

        /**
         * List offsetter element
         */
        self.offsetterElem = $element.find( '.aw-widgets-cellListOffsetter' )[ 0 ];

        /**
         * set the cell height for fixed cell height virtual mode.
         */
        self.fixedCellHeight = 0;
        if( $scope.fixedCellHeight ) {
            self.fixedCellHeight = parseInt( $scope.fixedCellHeight );
            $scope.staticRowHeight = {
                height: self.fixedCellHeight
            };
        }

        /**
         * Scroller element where virtualization is enforced. Look up the DOM structure and find closest scroll
         * panel if present, else attach scroll panel class to cell list container element.
         */
        if( $element.closest( '.aw-base-scrollPanel' ).length > 0 ) {
            self.scrollerElem = $element.closest( '.aw-base-scrollPanel' )[ 0 ];
        } else {
            $element.find( '.aw-widgets-cellListContainer' ).addClass( 'aw-base-scrollPanel' );
            self.scrollerElem = $element.find( '.aw-widgets-cellListContainer' )[ 0 ];
        }

        var highlightListWidget = function( target ) {
            target.classList.add( 'aw-widgets-dropframe' );
            target.classList.add( 'aw-theme-dropframe' );
        };

        var unHighlightListWidget = function( target ) {
            target.classList.remove( 'aw-theme-dropframe' );
            target.classList.remove( 'aw-widgets-dropframe' );
        };

        const highlightUnhighlightList = ( eventData ) => {
            if( !_.isUndefined( eventData ) && !_.isUndefined( eventData.targetElement ) && eventData.targetElement.classList ) {
                var event = eventData.event;
                var isHighlightFlag = eventData.isHighlightFlag;
                var target = eventData.targetElement;
                if( target.classList.contains( 'aw-widgets-cellListItemContainer' ) ) {
                    target = target.parentElement;
                }
                var isGlobalArea = eventData.isGlobalArea;
                if( isGlobalArea ) { // OBJECT DRAG OVER GLOBAL AREA
                    if( isHighlightFlag ) {
                        if( target.classList.contains( 'aw-widgets-cellListContainer' ) || target.children[ 0 ].classList.contains( 'aw-widgets-cellListContainer' ) ) {
                            highlightListWidget( target );
                        }
                    } else {
                        if( target.classList.contains( 'aw-widgets-cellListContainer' ) || target.classList.contains( 'aw-widgets-cellListItem' ) || target.children.length > 0 && target
                            .children[ 0 ].classList.contains( 'aw-widgets-cellListContainer' ) ) {
                            unHighlightListWidget( target );
                        }
                    }
                } else { // OBJECT DRAG OVER APPLICABLE AREA
                    if( isHighlightFlag ) {
                        if( target.classList.contains( 'aw-widgets-cellListContainer' ) || target.classList.contains( 'aw-widgets-cellListItem' ) || target.children.length > 0 && target
                            .children[ 0 ].classList.contains( 'aw-widgets-cellListContainer' ) ) {
                            highlightListWidget( target );
                        }
                    } else {
                        unHighlightListWidget( target );
                    }
                }
            }
        };

        /**
         * Use the given DOM Element to find the ViewModelObject(s) associated with that element.
         *
         * @param {Element} element - The 'source' or 'target' DOM element to query.
         *
         * @param {boolean} isTarget - TRUE if the given element is a 'target' and so only a single
         *            ViewModelObject is expected. FALSE if the given element is a 'source' and so multiple
         *            ViewModelObjects are possible (e.g. all currently selected objects in the collection).
         *
         * @return {ViewModelObjectArray} The ViewModelObject(s) associated with the given DOM Element (or NULL
         *         if none can be determined).
         */
        const getTargetVmo = function( element, isTarget ) {
            var selectionModel = $scope.dataprovider.selectionModel;

            /**
             * Check if selection is NOT enabled<BR>
             * If so: do not allow Drag-n-Drop UI
             */
            if( selectionModel && !selectionModel.isSelectionEnabled() ) {
                return null;
            }

            var elemScope = ngModule.element( element ).scope();

            if( elemScope ) {
                /**
                 * Merge event 'target' with any other objects currently selected.
                 */
                var targetObjs = [];
                var targetUid = '';

                if( elemScope.item ) {
                    targetObjs.push( elemScope.item );
                    targetUid = elemScope.item.uid;
                } else if( elemScope.vmo ) {
                    targetObjs.push( elemScope.vmo );
                    targetUid = elemScope.vmo.uid;
                } else {
                    var objUid = parsingUtils.parentGet( elemScope, 'data.uid' );
                    if( objUid ) {
                        targetObjs.push( dragAndDropSvc.getTargetObjectByUid( objUid ) );
                        targetUid = objUid;
                    }
                }

                if( !isTarget ) {
                    var sourceObjects = dragAndDropSvc.getSourceObjects( $scope.dataprovider, targetUid )
                        .filter( function( obj ) {
                            return targetObjs.indexOf( obj ) === -1;
                        } );
                    targetObjs = targetObjs.concat( sourceObjects );
                }

                return targetObjs;
            }

            return null;
        };

        let existingCallbackAPIs = {
            getElementViewModelObjectFn: getTargetVmo,
            /**
             * Use the given ViewModelObject(s) .
             */
            clearSelection: function() {
                // Handle clear previous selection
                $scope.dataprovider.selectNone();
            },
            /**
             * Use the given ViewModelObject ...
             *
             * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject being dropped onto.
             */
            setSelection: function( targetElement, targetVMO ) {
                // Handle select result
                var subDef = null;

                subDef = eventBus.subscribe( 'cdm.relatedModified', function() {
                    eventBus.unsubscribe( subDef );

                    targetVMO.selected = true;

                    // Handle select result
                    $scope.dataprovider.selectionModel.setSelection( [ targetVMO ], $scope );
                } );
            }
        };

        let newCallbackApis = {
            /**
             * Use the given ViewModelObject(s) .
             */
            clearSelection: function() {
                // Handle clear previous selection
                $scope.dataprovider.selectNone();
            },
            /**
             * Use the given ViewModelObject ...
             *
             * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject being dropped onto.
             */
            setSelection: function( targetVMO ) {
                // Handle select result
                var subDef = null;

                subDef = eventBus.subscribe( 'cdm.relatedModified', function() {
                    eventBus.unsubscribe( subDef );

                    targetVMO.selected = true;

                    // Handle select result
                    $scope.dataprovider.selectionModel.setSelection( [ targetVMO ], $scope );
                } );
            },
            getTargetElementAndVmo: ( event, isSourceEle ) => {
                let targetVMO = null;
                let target = dom.closest( event.target, '.aw-widgets-cellListItem' ) || dom.closest( event.target, '.aw-widgets-droppable' );
                if( target ) {
                    targetVMO = getTargetVmo( target, !isSourceEle );
                }
                return {
                    targetElement: target,
                    targetVMO: targetVMO
                };
            },
            highlightTarget: highlightUnhighlightList
        };

        if( $scope.showDropArea !== 'false' || $scope.showDropArea !== false ) {
            /**
             * LCS-315044: Setup the drag and drop with the new design pattern if drag and drop
             * handlers are defined for list's container view.
             *
             * The branching is done to support AW, as AW is still consuming the old drag and drop pattern.
             */
            let declViewModel = viewModelSvc.getViewModel( $scope, true );
            if( declDragAndDropService.areDnDHandelersDefined( declViewModel ) ) {
                declDragAndDropService.setupDragAndDrop( $element[ 0 ], newCallbackApis, declViewModel, $scope.dataprovider );
            } else {
                //Setup drag and drop with the old design
                dragAndDropSvc.setupDragAndDrop( $element[ 0 ], existingCallbackAPIs );
            }
            //Listen for DnD highlight/unhighlight event from declDragAndDropService/dragAndDropService
            listDragDropLsnr = eventBus.subscribe( 'dragDropEvent.highlight', highlightUnhighlightList );
        }else {
            dragAndDropSvc.disableDragAndDrop( $element[ 0 ] );
        }

        /**
         * --------------------------------------------------------------<br>
         * Non-Virtualized List <BR>
         * --------------------------------------------------------------<br>
         */

        /**
         * Handle scrolling for non-virtualized list to support pagination.
         *
         * @memberof NgControllers.awListController
         */
        self.handleNonVirtualizedScroll = function() {
            /**
             * Check if we are NOT waiting on a previous page load.
             */
            if( !self._pageLoadInProgress ) {
                /**
                 * Check if the list is still visible
                 */
                var isVisible = cellListUtils.elemIsVisible( $element );

                if( isVisible && $scope.dataprovider ) {
                    /**
                     * Trigger next page when scroll reaches to end. Adding '+ 5' buffer because, for Chrome
                     * verticalScrollPostion is less by 1 unit than maxVerticalScrollPosition even when the scroll
                     * position is at the bottom
                     */
                    var dataProvider = $scope.dataprovider;

                    var cursorObject = dataProvider.cursorObject;

                    var raw = $( self.scrollerElem )[ 0 ];

                    if( raw.scrollTop <= 5 && cursorObject && !cursorObject.startReached && dataProvider.previousAction ) {
                        var previousScrollHeight = raw.scrollHeight;

                        self._pageLoadInProgress = true;

                        dataProvider.getPreviousPage( $scope ).then( function() {
                            self._pageLoadInProgress = false;

                            $timeout( function() {
                                raw.scrollTop = raw.scrollHeight - previousScrollHeight;
                            } );
                        }, function( err ) {
                            logger.error( 'Page load failed: ' + err );

                            self._pageLoadInProgress = false;
                        } );
                    } else if( raw.scrollTop + raw.offsetHeight + 5 >= raw.scrollHeight ) {
                        if( cursorObject && cursorObject.endReached ) {
                            return;
                        }

                        self._pageLoadInProgress = true;

                        dataProvider.getNextPage( $scope ).then( function() {
                            self._pageLoadInProgress = false;
                        }, function( err ) {
                            logger.error( 'Page load failed: ' + err );

                            self._pageLoadInProgress = false;
                        } );
                    }
                }
            }
        };
        /**
         * If the element should be able to scroll (have more pages) and the required scroll height is less than or
         * equal to the current client height the view will not be able to scroll
         */
        self.autoPageNonScrollable = function() {
            // This needs to execute after the list is done rendering so it is deferred
            var renderTimer = $timeout( function() {
                var scrollElement = $( self.scrollerElem )[ 0 ];
                if( $scope.dataprovider && $scope.dataprovider.hasMorePages() && scrollElement.clientHeight > 0 &&
                    scrollElement.scrollHeight <= scrollElement.clientHeight ) {
                    // manually trigger the pagination
                    if( $scope.dataprovider.cursorObject && $scope.dataprovider.cursorObject.endReached ) {
                        if( !$scope.dataprovider.cursorObject.startReached ) {
                            var promise = $scope.dataprovider.getPreviousPage( $scope );
                            promise.then( function() {
                                var renderTimer = $timeout( function() {
                                    var scrollElement = $( self.scrollerElem )[ 0 ];
                                    var selectedElement = $element.find( '.aw-widgets-cellListItemSelected' );
                                    self.scrollToElement( scrollElement, selectedElement[ 0 ] );
                                    $timeout.cancel( renderTimer );
                                } );
                            } );
                        }
                    } else {
                        $scope.dataprovider.getNextPage( $scope ).then( function() {
                            var renderTimer = $timeout( function() {
                                var scrollElement = $( self.scrollerElem )[ 0 ];
                                var selectedElement = $element.find( '.aw-widgets-cellListItemSelected' );
                                self.scrollToElement( scrollElement, selectedElement[ 0 ] );
                                $timeout.cancel( renderTimer );
                            } );
                        } );
                    }
                }

                $timeout.cancel( renderTimer );
            } );
        };

        /**
         * Only applicable for Non-virtualized list
         */
        if( !$attrs.useVirtual || $attrs.useVirtual !== 'true' ) {
            $( self.scrollerElem ).on( 'scroll.list', self.handleNonVirtualizedScroll );

            // This is necessary for zoom use-case as the scroll bar disappears and does not trigger the scroll event
            $scope.$on( 'windowResize', function() {
                self.handleNonVirtualizedScroll();
            } );

            if( $scope.dataprovider ) {
                // Listen for model objects updated and see if auto pagination applicable
                var modelObjsLsnr = eventBus.subscribe( $scope.dataprovider.name + '.modelObjectsUpdated',
                    function( context ) {
                        if( context && ( context.firstPage || context.nextPage ) &&
                            $scope.dataprovider.hasMorePages() ) {
                            self.autoPageNonScrollable();
                        }

                        let ul = $element[ 0 ].querySelector( '[role="listbox"]' );
                        if( $scope.dataprovider.viewModelCollection.totalFound > 0 ) {
                            ul.setAttribute( 'tabindex', 0 );
                        }
                    } );

                var focusSelectLsnr = eventBus.subscribe( $scope.dataprovider.name + '.focusSelection', function() {
                    var renderTimer = $timeout( function() {
                        var scrollElement = $( self.scrollerElem )[ 0 ];
                        var selectedElement = $element.find( '.aw-widgets-cellListItemSelected' );
                        self.scrollToElement( scrollElement, selectedElement[ 0 ] );
                        $timeout.cancel( renderTimer );
                    } );
                } );

                /**
                 * Resets the scroll position to the top when the dataprovider is re-initialized
                 * to avoid any re-paging of data.
                 */
                var scrollLsnr = eventBus.subscribe( $scope.dataprovider.name + '.resetScroll', function() {
                    $( self.scrollerElem )[ 0 ].scrollTop = 0;
                } );

                if( $scope.hasFloatingCellCommands !== false ) {
                    var selectAllEvent = eventBus.subscribe( $scope.dataprovider.name + '.selectAll', function() {
                        updateCellSelection( true );
                    } );

                    var selectNoneEvent = eventBus.subscribe( $scope.dataprovider.name + '.selectNone', function() {
                        updateCellSelection( false );
                    } );

                    var selectSingleEvent = eventBus.subscribe( $scope.dataprovider.name + '.selectionChangeEvent', function() {
                        updateCellSelection( true );
                    } );
                }
            }

            /**
             * Listen for viewModeChange and see if auto pagination applicable this only applies when changing from
             * list with summary to list view
             */
            $scope.$on( 'viewModeChanged', function( event, context ) {
                if( context && context.primaryWorkArea === 'list' && $scope.dataprovider.hasMorePages() ) {
                    self.autoPageNonScrollable();
                }
            } );
        }

        /**
         * Handles (long press/press and hold) event
         *
         * @param {Event} hammerEvent - the event object of hammer
         */
        $scope.handlePressAndHold = function( hammerEvent ) {
            var event = hammerEvent.srcEvent || hammerEvent;
            if( !event.target ) {
                return;
            }
            if( !$scope.disableSelection ) {
                let declViewModel = viewModelSvc.getViewModel( $scope, true );
                if( !declViewModel._swDragging ) {
                    handleSelection( event );
                }
            }
        };

        /**
         * Compile list cell command and append it to cell
         *
         * @param {Event} hammerEvent - the event object of hammer
         */
        $scope.compileListCellCommandsAndAppend = function( hammerEvent, selectedItem ) {
            let listItem = selectedItem;
            if( !selectedItem ) {
                var event = hammerEvent.srcEvent || hammerEvent;
                if( !event.target ) {
                    return;
                }
                listItem = $( event.target ).closest( 'li' )[ 0 ]; // to make sure we are on list item
            }

            var cellTop = listItem.getElementsByClassName( 'aw-widgets-cellListItemContainer' )[ 0 ]; // element to append cell commands.

            if( cellTop && cellTop.lastElementChild && !cellTop.lastElementChild.classList.contains( 'aw-widgets-cellListCellCommands' ) ) {
                var listScope = ngUtils.getElementScope( listItem, false );
                var vmo = listScope.item;
                var dataProvider = listScope.$parent.dataprovider;
                var isPrevVisitedListItemSelected;
                if( _cellCmdElem && _cellCmdElem.parentElement ) {
                    var prevVisitedListItem = $( _cellCmdElem ).closest( '.aw-widgets-cellListItem' );
                    isPrevVisitedListItemSelected = prevVisitedListItem[ 0 ].classList.contains( 'aw-widgets-cellListItemSelected' );
                    if( !isPrevVisitedListItemSelected ) {
                        if( _cellCmdElem && _cellCmdElem.parentElement ) {
                            if( !hammerEvent ) {
                                _cellCmdElem.parentElement && _cellCmdElem.parentElement.classList.remove( FOCUSED_ITEM_CLASS );
                            }

                            _cellCmdElem.parentElement.removeChild( _cellCmdElem );
                        }
                    }
                }
                // If previously visited listItem is selected then create a new cellCmdElem and append it to currently visited element.
                // Prevent creation of empty DOM element when there is no commandsAnchor defined in dataprovider.
                // This was causing space being occupied when and pull the notification cell to shift left.
                // eslint-disable-next-line no-extra-parens
                if( dataProvider.json === null || ( ( !dataProvider.json.commandsAnchor && dataProvider.commands ) || dataProvider.json.commandsAnchor ) ) {
                    if( !_cellCmdElem || isPrevVisitedListItemSelected ) {
                        _cellCmdElem = createCellCommandElementInternal( $element, vmo, dataProvider );
                    } else {
                        applyCommandCellScope( _cellCmdElem, vmo, dataProvider );
                    }
                    cellTop.appendChild( _cellCmdElem );

                    if( !hammerEvent ) {
                        $scope.$applyAsync( function() {
                            cellTop.classList.add( FOCUSED_ITEM_CLASS );
                        } );
                    }
                }
            }
        };

        let removeCellCommands = function( listItem, nextFocusedItem ) {
            if( nextFocusedItem.closest( '.aw-widgets-cellListItemContainer' ) ) {
                return;
            }

            var cellTop = listItem.getElementsByClassName( 'aw-widgets-cellListItemContainer' )[ 0 ]; // element to append cell commands.
            if( cellTop && cellTop.lastElementChild && cellTop.lastElementChild.classList.contains( 'aw-widgets-cellListCellCommands' ) ) {
                let cellCommands = cellTop.getElementsByClassName( 'aw-widgets-cellListCellCommands' )[ 0 ];
                var prevVisitedListItem = $( cellCommands ).closest( '.aw-widgets-cellListItem' );
                let isPrevVisitedListItemSelected = prevVisitedListItem[ 0 ].classList.contains( 'aw-widgets-cellListItemSelected' );

                cellTop.classList.remove( FOCUSED_ITEM_CLASS );
                if( !isPrevVisitedListItemSelected && cellCommands && cellCommands.parentElement ) {
                    cellCommands.parentElement.removeChild( cellCommands );
                }
            }
        };

        /**
         * Update cell selection on the event of selectAll and selectNone
         *
         * @param {boolean} selectAllFlag - to decide it's a select all or select none
         */

        var updateCellSelection = function( selectAllFlag ) {
            var listElements = $element[ 0 ].getElementsByClassName( 'aw-widgets-cellListItem' );
            if( listElements && listElements.length === 0 ) {
                $timeout( function() {
                    updateCellSelection( selectAllFlag );
                }, 0, false );
            }
            for( var i = 0; i < listElements.length; i++ ) {
                var listElement = listElements[ i ];
                var cellTop = listElement.getElementsByClassName( 'aw-widgets-cellListItemContainer' )[ 0 ]; // element to append cell commands.
                if( selectAllFlag ) {
                    if( cellTop && cellTop.lastElementChild && !cellTop.lastElementChild.classList.contains( 'aw-widgets-cellListCellCommands' ) ) {
                        var listScope = ngUtils.getElementScope( listElement, false );
                        if( listScope && listScope.item.selected ) {
                            var vmo = listScope.item;
                            var dataProvider = listScope.$parent.dataprovider;
                            if( !dataProvider.json.commandsAnchor && dataProvider.commands || dataProvider.json.commandsAnchor ) {
                                var _cellCmdElemLocal = createCellCommandElementInternal( $element, vmo, dataProvider );
                                cellTop.appendChild( _cellCmdElemLocal );
                            }
                        }
                    }
                } else {
                    var _cellCmdElemToRemove = listElement.getElementsByClassName( 'aw-widgets-cellListCellCommands' )[ 0 ];
                    if( _cellCmdElemToRemove && _cellCmdElemToRemove.parentElement ) {
                        _cellCmdElemToRemove.parentElement.classList.remove( FOCUSED_ITEM_CLASS );
                        _cellCmdElemToRemove.parentElement.removeChild( _cellCmdElemToRemove );
                    }
                }
            }
        };

        var createCellCommandElementInternal = function( listContainer, vmo, dataProvider ) {
            var elem = createCompiledCellCommandElement( listContainer );
            applyCommandCellScope( elem, vmo, dataProvider );
            return elem;
        };

        var createCompiledCellCommandElement = function( listContainer ) {
            //  cellCommandBarHtml is same as aw-static-list-command.directive.html, be cautious while modifying it that we need to modify them together.
            var cellCommandBarHtml = '<div class="aw-widgets-cellListCellCommands aw-widgets-cellInteraction">' + //
                '<div ng-show="!dataprovider.selectionModel.multiSelectEnabled && (dataprovider.selectedObjects.length === 1 || !item.selected)" class="aw-widgets-cellCommandsContainer">' + //
                '<aw-list-command ng-if="!dataprovider.json.commandsAnchor" ng-repeat="command in dataprovider.commands | filter:conditionFilter(item)" vmo="item" command="command"></aw-list-command>' +
                //
                '<aw-cell-command-bar ng-if="dataprovider.json.commandsAnchor" anchor="{{dataprovider.json.commandsAnchor}}" context="commandContext"></aw-cell-command-bar>' + //
                '</div>' + //
                '</div>'; //

            var cellScope = {};
            return createNgElement( cellCommandBarHtml, listContainer, cellScope );
        };

        var createNgElement = function( htmlContent, parentElement, scopeData, declViewModel ) {
            var appCtx = null;
            var eleScope = ngUtils.getElementScope( parentElement, true );
            var ctxObj;
            if( eleScope ) {
                ctxObj = eleScope.$parent.ctx;
            } else {
                ctxObj = {};
            }
            appCtx = {
                ctx: ctxObj
            };
            var currentElement = ngUtils.element( htmlContent );
            currentElement.on( '$destroy', function() {
                _cellCmdElem = null;
            } );
            var compiledResult = ngUtils.compile( parentElement, currentElement, appCtx, declViewModel, scopeData );

            // more than 1 element is not supported
            if( compiledResult && compiledResult.length === 1 ) {
                compiledResult[ 0 ].classList.add( _CLASS_LIST_COMPILED_ELEMENT );
                return compiledResult[ 0 ];
            } else if( compiledResult && compiledResult.length > 1 ) {
                compiledResult.scope().$destroy();
            }
            return undefined;
        };

        var applyCommandCellScope = function( cellCmdElem, vmoObj, dataProviderObj ) {
            var scope = ngUtils.getElementScope( cellCmdElem );
            scope.dataprovider = dataProviderObj;
            if( scope.dataprovider.commands ) {
                scope.conditionFilter = self.conditionFilter;
            }
            scope.item = vmoObj;
            scope.commandContext = {
                vmo: vmoObj
            };
        };

        /**
         * Listen for DnD highlight/unhighlight event from dragAndDropService
         */
        var listDragDropLsnr = eventBus.subscribe( 'dragDropEvent.highlight', function( eventData ) {
            if( !_.isUndefined( eventData ) && !_.isUndefined( eventData.targetElement ) && eventData.targetElement.classList ) {
                var event = eventData.event;
                var isHighlightFlag = eventData.isHighlightFlag;
                var target = eventData.targetElement;
                if( target.classList.contains( 'aw-widgets-cellListItemContainer' ) ) {
                    target = target.parentElement;
                }
                var isGlobalArea = eventData.isGlobalArea;
                if( isGlobalArea ) { // OBJECT DRAG OVER GLOBAL AREA
                    if( isHighlightFlag ) {
                        if( target.classList.contains( 'aw-widgets-cellListContainer' ) ) {
                            highlightListWidget( target );
                        } else if( target.classList.contains( 'aw-widgets-cellListItem' ) ) {
                            // look for closest cellListContainer or listContainer (a valid drop target), if outer cellListContainer or listContainer
                            // is not a valid target , highlight the cellItem only and unhighlight the listContainer , if highlighted
                            var closestContainerToCellItem = ngUtils.closestElement( target, '.aw-widgets-droppable' );
                            if( closestContainerToCellItem && ( closestContainerToCellItem.classList.contains( 'aw-widgets-cellListContainer' ) || closestContainerToCellItem.children[ 0 ]
                                    .classList.contains( 'aw-widgets-cellListContainer' ) ) ) {
                                if( !dragAndDropSvc.isValidObjectToDrop( event, closestContainerToCellItem ) ) {
                                    if( closestContainerToCellItem.classList.contains( 'aw-widgets-dropframe' ) ) {
                                        unHighlightListWidget( closestContainerToCellItem );
                                    }
                                    highlightListWidget( target );
                                }
                            } else {
                                highlightListWidget( target );
                            }
                        } else if( target.children[ 0 ].classList.contains( 'aw-widgets-cellListContainer' ) ) {
                            highlightListWidget( target );
                        }
                    } else {
                        if( target.classList.contains( 'aw-widgets-cellListContainer' ) || target.classList.contains( 'aw-widgets-cellListItem' ) || target.children.length > 0 && target
                            .children[ 0 ].classList.contains( 'aw-widgets-cellListContainer' ) ) {
                            unHighlightListWidget( target );
                        }
                    }
                } else { // OBJECT DRAG OVER APPLICABLE AREA
                    if( isHighlightFlag ) {
                        if( target.classList.contains( 'aw-widgets-cellListContainer' ) || target.classList.contains( 'aw-widgets-cellListItem' ) || target.children.length > 0 && target
                            .children[ 0 ].classList.contains( 'aw-widgets-cellListContainer' ) ) {
                            highlightListWidget( target );
                        }
                    } else {
                        unHighlightListWidget( target );
                    }
                }
            }
        } );

        $scope.$on( '$destroy', function() {
            $( self.scrollerElem ).off( 'scroll.list', self.handleNonVirtualizedScroll );

            if( modelObjsLsnr ) {
                eventBus.unsubscribe( modelObjsLsnr );
            }
            if( focusSelectLsnr ) {
                eventBus.unsubscribe( focusSelectLsnr );
            }

            if( scrollLsnr ) {
                eventBus.unsubscribe( scrollLsnr );
            }

            if( selectAllEvent ) {
                eventBus.unsubscribe( selectAllEvent );
            }

            if( selectNoneEvent ) {
                eventBus.unsubscribe( selectNoneEvent );
            }

            if( listDragDropLsnr ) {
                eventBus.unsubscribe( listDragDropLsnr );
            }
            if( selectSingleEvent ) {
                eventBus.unsubscribe( selectSingleEvent );
            }

            if( list ) {
                list.clean();
            }

            ngUtils.destroyChildNgElements( $element[ 0 ], _CLASS_LIST_COMPILED_ELEMENT );
        } );

        /**
         * --------------------------------------------------------------<br>
         * Virtualized List <BR>
         * --------------------------------------------------------------<br>
         */

        /**
         * Triggered by aw-virtual-repeat at start-up
         *
         * @memberof NgControllers.awListController
         * @param {Object} repeaterCtrl - virtual repeat controller
         */
        self.initialize = function( repeaterCtrl ) {
            self.awVirtualRepeatCtrl = repeaterCtrl;

            // Bind Scroll Event to self.handleScroll
            ngModule.element( self.scrollerElem ).on( 'scroll touchmove touchend',
                ngModule.bind( this, self.handleScroll ) );

            // Add cell list container size watcher.
            $scope.$watch( function() {
                return self.scrollerElem.offsetHeight + self.scrollerElem.offsetWidth;
            }, function( newValue, oldValue ) {
                if( newValue !== oldValue ) {
                    self.handleResize();
                }
            } );
        };

        self.scrollToElement = function( scrollElement, selectedElement ) {
            if( $scope.dataprovider && selectedElement ) {
                // check if it is currently in view
                var scrollEleDim = scrollElement.getBoundingClientRect();
                var selectedEleDim = selectedElement.getBoundingClientRect();

                if( selectedEleDim.top + selectedEleDim.height > scrollEleDim.bottom ) {
                    self.scrollerElem.scrollTop += selectedEleDim.bottom - scrollEleDim.bottom;
                } else if( selectedEleDim.bottom - selectedEleDim.height < scrollEleDim.top ) {
                    self.scrollerElem.scrollTop -= scrollEleDim.top - selectedEleDim.top;
                } else if ( self.scrollerElem.scrollTop === 0 && selectedElement.previousElementSibling ) {
                    // case where there could be an incompleteHead, leave room to scroll up...
                    self.scrollerElem.scrollTop = 40;
                }
            }
        };

        /**
         * Returns the height of the container
         *
         * @memberof NgControllers.awListController
         * @return {Number} client height of container element.
         */
        self.getContainerHeight = function() {
            return self.scrollerElem.clientHeight;
        };

        /**
         * Update the sizes
         *
         * @memberof NgControllers.awListController
         */
        self.updateSize = function() {
            if( self.originalSize ) {
                return;
            }
            self.containerHeight = $element[ 0 ].clientHeight;

            /**
             * Recheck the scroll position after updating the size. This resolves problems that can result if the
             * scroll position was measured while the element was display: none or detached from the document.
             */
            self.handleScroll();

            if( self.awVirtualRepeatCtrl ) {
                self.awVirtualRepeatCtrl.containerUpdated();
            }
        };

        /**
         * Returns container's scroll height.
         *
         * @memberof NgControllers.awListController
         * @return {Number} scroll height of container element.
         */
        self.getScrollSize = function() {
            return self.scrollSize;
        };

        /**
         * Sets the scrollHeight. Triggered by virtual repeat controller based on its item count and item size.
         *
         * @memberof NgControllers.awListController
         * @param {Number} itemsSize - The total size of the items.
         */
        self.setScrollSize = function( itemsSize ) {
            if( self.offsetSize === 0 ) {
                self.offsetSize = self.getPredecessorsSize();
            }

            var size = itemsSize + self.offsetSize;
            if( self.scrollSize === size ) {
                return;
            }

            virtualRepeatSvc.setScrollerSize( size, self.resizerElem );
            self.scrollSize = self.offsetSize + size;
        };

        /**
         * Return height of predecessor elements which are present inside scroller element.
         *
         * @memberof NgControllers.awListController
         * @return {Number} client height of predecessor elements.
         */
        self.getPredecessorsSize = function() {
            var totalHeight = 0;
            $( self.scrollerElem ).children().each( function() {
                totalHeight += $( this )[ 0 ].clientHeight;
            } );

            return totalHeight;
        };

        /**
         * Return scroll offset
         *
         * @memberof NgControllers.awListController
         * @return {Number} The container's current scroll offset.
         */
        self.getScrollOffset = function() {
            return self.scrollOffset;
        };

        /**
         * Scrolls to a given scrollTop position
         *
         * @memberof NgControllers.awListController
         * @param {Number} position - scroll top position
         */
        self.scrollTo = function( position ) {
            self.scrollerElem.scrollTop = position;
            self.handleScroll();
        };

        /**
         * Scrolls the item with the given index to the top of the scroll container
         *
         * @memberof NgControllers.awListController
         * @param {Number} index - index to which it should scroll to
         */
        self.scrollToIndex = function( index ) {
            var itemsLength = self.awVirtualRepeatCtrl.itemsLength;
            if( index > itemsLength ) {
                index = itemsLength - 1;
            }
            self.scrollTo( self.fixedCellHeight * index );
        };

        /**
         * Resets scroll to zero
         *
         * @memberof NgControllers.awListController
         */
        self.resetScroll = function() {
            self.scrollTo( 0 );
        };

        /**
         * Handle scroll method which triggers on scroll
         *
         * @memberof NgControllers.awListController
         */
        self.handleResize = function() {
            self.awVirtualRepeatCtrl.setColSize();
            self.resetScroll();

            self.awVirtualRepeatCtrl.startIndex = 0;
            self.awVirtualRepeatCtrl.newStartIndex = 0;

            if( !self.fixedCellHeight ) {
                return;
            }

            /**
             * When there are predecessor items in the page, it will only virtualize once scroll passes through the
             * predecessor DOM elements.
             */
            if( self.scrollerElem.scrollTop >= self.offsetSize ) {
                self.scrollOffset = self.scrollerElem.scrollTop - self.offsetSize;
                self.awVirtualRepeatCtrl.containerUpdated( true );
            }
        };

        /**
         * Set transform once the stop scrolling event is fired
         *
         * @memberof NgControllers.awListController
         */
        self.stoppedScrolling = function() {
            if( self && self.awVirtualRepeatCtrl ) {
                virtualRepeatSvc.setTransform( self.awVirtualRepeatCtrl.rowHeights, self.columnSize,
                    self.awVirtualRepeatCtrl.newStartIndex, self.offsetterElem, self.fixedCellHeight );
            }
            self.isScroll = false;
        };

        /**
         * Main method which gets triggered as user scrolls
         *
         * @memberof NgControllers.awListController
         */
        self.scrolling = function() {
            var offset = self.scrollerElem.scrollTop;

            /**
             * do nothing and return if scrolling is invalid
             */
            if( offset === self.scrollOffset || offset > self.scrollSize - self.containerHeight ) {
                return;
            }

            if( !self.fixedCellHeight ) {
                return;
            }

            /**
             * When there are predecessor items in the page, it will only virtualize once scroll passes through the
             * predecessor DOM elements.
             */
            if( offset >= self.offsetSize ) {
                offset -= self.offsetSize;

                self.scrollOffset = offset;
                self.awVirtualRepeatCtrl.containerUpdated( true );
            }
        };

        /**
         * Handle scroll method which triggers on scroll
         *
         * @memberof NgControllers.awListController
         */
        self.handleScroll = function() {
            self.scrolling();

            clearTimeout( $.data( this, 'scrollCheck' ) );
            $.data( this, 'scrollCheck', setTimeout( function() {
                if( !self.isScroll ) {
                    self.$$rAF( self.stoppedScrolling );
                }
                self.isScroll = true;
            }, 250 ) );
        };

        // ///
        // Selection
        // ///
        /* Initialize the Hammer event handler */
        // LCS-286849 - jQuery has issues with handling touch to click events on mobile
        let target = {
            default: $element,
            mobile: $element[ 0 ]
        };
        let eventObject = {
            click: 'touchend'
        };
        let eventHandler = function( event ) {
            if( !$scope.disableSelection ) {
                handleSelection( event );
            }
        };

        awEventHelperService.subscribeMouseEvent( target, eventObject, eventHandler );

        /**
         *  Gives selected obj
         *
         * @param {Event} event - the event object generated by hammer
         * @return {Object} selectedObj
         */
        function _getSelectedObject( event, selectedItem ) {
            let selectedListItem = selectedItem;
            if( !selectedItem ) {
                var commandCell = $( event.target ).closest( 'aw-list-command' );
                if( commandCell.length > 0 ) {
                    return undefined;
                }

                selectedListItem = $( event.target ).closest( '.aw-widgets-cellListItem' );
            }

            var scope = selectedListItem.scope();
            if( !scope || !scope.item ) {
                return undefined;
            }

            return scope.item;
        }

        let handleContextMenu = ( event ) => {
            // to stop it firing due to hold and press touch event
            if( event.type !== 'contextmenu' && event.code !== 'ContextMenu' ) {
                return undefined;
            }
            if( event.target.tagName.toLowerCase() === 'a' && event.target.href !== '' ) {
                return undefined;
            }
            event.stopImmediatePropagation();

            var currentSelectedObj = _getSelectedObject( event );
            var selectionModel = $scope.dataprovider.selectionModel;
            if( currentSelectedObj && !selectionModel.isSelected( currentSelectedObj ) ) {
                handleSelection( event );
            }

            if( !$scope.contextMenuUsed ) {
                $scope.contextMenuUsed = true;
                /**
                 * Note: Normally, calling $digest directly is a serious antipattern since it can cause an 'inprog'
                 * exception to be thrown by AngularJS if a $digest is already in progress. However, in this case
                 * use of $evalAsync, while it works interactly, does not work when running selenium-base cucumber
                 * tests and so $digest is being left around.
                 */
                $scope.$digest();
            }

            $scope.contextMenu = $element.find( 'aw-popup-command-bar' );
            if( $scope.contextMenu.length > 0 ) {
                var menuScope = ngUtils.getElementScope( $scope.contextMenu, true );
                var options = {
                    whenParentScrolls: 'close',
                    autoFocus: true,
                    reference: $element.find( 'li[tabindex="0"][role="option"]' )[ 0 ]
                };
                menuScope.showPopup( event, options ).then( ( popupRef ) => {
                    logger.info( popupRef );
                } );
            }

            return false;
        };

        /**
         * Handles right click to show selection or context menu
         *
         * @param {Event} event - the event object generated by hammer
         */
        $element.contextmenu( handleContextMenu );

        /**
         * Handles double click
         *
         */
        $element.dblclick( function( event ) {
            var selectedObject = _getSelectedObject( event );
            eventBus.publish( $scope.dataprovider.name + '.listDoubleClick', {
                eventTargetObjs: [ selectedObject ]
            } );
        } );

        /**
         * Handles cell list selection
         *
         * @param {Event} event - the event object generated by hammer
         */
        function handleSelection( event, selectedItem ) {
            if( !event.target && !selectedItem ) {
                return;
            }

            // Filter out selection of a command
            var selectedObject = _getSelectedObject( event, selectedItem );
            var selectionModel = $scope.dataprovider.selectionModel;

            // No selected object if user has clicked in empty area and not in cell
            if( selectedObject ) {
                selectionHelper.handleSelectionEvent( [ selectedObject ], selectionModel, event, $scope.dataprovider );
            }

            $scope.$evalAsync();
        }

        // 'awList.removeObjects' event is fired in Remove cell command
        $scope.$on( 'awList.removeObjects', function( event, data ) {
            var allLoadedObjects = $scope.dataprovider.viewModelCollection.getLoadedViewModelObjects();
            var remainObjects = _.difference( allLoadedObjects, data.toRemoveObjects );
            $scope.dataprovider.update( remainObjects, remainObjects.length );
        } );

        // Fired when an external tool (such as a command panel) wants to reset the data provider (and selection)
        $scope.$on( 'dataProvider.reset', function() {
            if( $scope.dataprovider.json && $scope.dataprovider.json.firstPage ) {
                delete $scope.dataprovider.json.firstPage;
            }

            $scope.dataprovider.initialize( $scope );
        } );

        /**
         * Filter commands if they have a condition attached.
         */

        self.conditionFilter = function( vmo ) {
            return function( command ) {
                return !command.condition || conditionService.evaluateCondition( {
                    vmo: vmo
                }, command.condition );
            };
        };

        if( $scope.hasFloatingCellCommands === false ) {
            $scope.conditionFilter = self.conditionFilter;
        }

        // Test port
        self.test = {
            handleSelection: handleSelection
        };

        if( self.fixedCellHeight > 0 ) {
            /**
             * After the dom stablizes, measure the initial size of the container and make a best effort at
             * re-measuring as it changes.
             */
            var boundUpdateSize = ngModule.bind( this, self.updateSize );

            $$rAF( function() {
                boundUpdateSize();
            } );
        }

        let setupWCAG = () => {
            //WCAG keyboard handling
            list = new ariaList();
            let ul = $element[ 0 ].querySelector( '[role="listbox"]' );
            if( !ul ) { return; }

            ul.setAttribute( 'aria-label', 'i18n.listAriaLabel' );
            wcagSvc.updateArialabel( ul, '', 'UIElementsMessages' );

            var obj = {
                apis: {
                    selectItem: ( event, selectedItem ) => {
                        handleSelection( event, $( selectedItem ) );
                    },
                    handleContextMenu: ( event ) => {
                        handleContextMenu( event );
                    },
                    handleBlurOnItem: ( selectedItem, nextFocusedItem ) => {
                        if( $scope.hasFloatingCellCommands === true || $scope.hasFloatingCellCommands === undefined ) {
                            removeCellCommands( selectedItem, nextFocusedItem );
                        }
                    }
                },
                setAriaAttributes: false
            };

            let childSelector = 'option';
            list.init( ul, obj, childSelector );
            if( $scope.hasFloatingCellCommands === true || $scope.hasFloatingCellCommands === undefined ) {
                list.setHandleFocusChange( $scope.compileListCellCommandsAndAppend );
            }
        };

        setupWCAG();
    }
] );
