// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/uwListService
 */
import app from 'app';
import AwTimeoutService from 'js/awTimeoutService';
import popupSrv from 'js/popupService';
import viewModelSvc from 'js/viewModelService';
import $ from 'jquery';
import logger from 'js/logger';

/**
 * Define local variables for commonly used key-codes.
 */
var _kcTab = 9;
var _kcEnter = 13;
var _kcEscape = 27;
var _kcUpArrow = 38;
var _kcDnArrow = 40;

// popup content is moved under body element
var _POPUP_SELECTOR = 'body>*>div.aw-layout-popup .aw-jswidgets-drop';

var exports = {};

// legacy code for aw-pattern, will removed when aw-pattern refactored
export let _adjustPositionForValues = function( scope, $element ) {
    scope.$evalAsync( function() {
        // now that we have the list of items determine if we should be above or below the choice
        var $choiceElem = $element.find( '.aw-jswidgets-choice' );
        var dropElem = $element.find( '.aw-jswidgets-drop' )[ 0 ];
        var dropRect = dropElem.getBoundingClientRect();

        if( !scope.forceDropPosition ) {
            var choiceElem = $choiceElem[ 0 ];
            var choiceRect = choiceElem.getBoundingClientRect();
            var spaceBelow = window.innerHeight - choiceRect.bottom;
            scope.dropPosition = spaceBelow < dropRect.height ? 'above' : 'below';

            // Get the border width from the CSS
            if( scope.dropPosition === 'above' ) {
                scope.dropDownVerticalAdj = -Math.abs( dropRect.bottom - dropRect.top ) + 'px';
            } else {
                scope.dropDownVerticalAdj = choiceRect.bottom - choiceRect.top + 'px';
            }
        }
    } );
};
// end

/**
 * This gets called when we exit the control by clicking outside.
 * <P>
 * Note: More ideally, it would be invoked on blur, but blur events are not well-supported across browsers. In the
 * case of Input blur, we want to ignore clicks inside the drop, so we need to know the target that caused the blur.
 * In chrome, it's 'relatedTarget', in IE you have to use 'document.activeElement', in FF you have
 * 'explicitOriginalTarget', etc. Instead, this is using a document click listener.
 *
 * @private
 *
 * @param {Object} scope - The 'scope' all controller level values are defined on.
 * @param {DOMEvent} event - The associated event object
 *
 */
export let _exitField = function( scope, event ) {
    var targetScope = $( event.target ).scope();
    var choiceScope = $( event.target ).parents( '.aw-jswidgets-choice' ).scope();
    var dropScope = $( event.target ).parents( '.aw-jswidgets-drop' ).scope();
    var targetScopeId = -1;
    var choiceScopeId = -1;
    var dropScopeId = -1;

    if( targetScope ) {
        targetScopeId = targetScope.$id;
    }

    if( choiceScope ) {
        choiceScopeId = choiceScope.$id;
    }

    if( dropScope ) {
        dropScopeId = dropScope.$id;
    }

    // Some platforms, such as iPAD Safari, send erroneous field exit events, check to make sure this isn't one
    if( targetScopeId === scope.$id || choiceScopeId === scope.$id || dropScopeId === scope.$id ) {
        return;
    }

    if( scope.expanded ) {
        exports.collapseList( scope );
        scope.handleFieldExit( null, null, true );
    }
};

/**
 * Exit field handler which gets triggered when user clicks outside of the LOV
 *
 * @param {DOMEvent} event -
 *
 */
export let exitFieldHandler = function( event ) {
    exports._exitField( event.data, event );
};

/**
 * Collapse the drop-down
 *
 * @param {Object} scope - The object holding all the state within the 'scope' of the widget needing the list.
 *
 */
export let collapseList = function( scope ) {
    scope.listFilterText = '';

    if( scope.unbindSelectionEventListener ) {
        scope.unbindSelectionEventListener();
    }

    if( scope.collapseList ) {
        scope.collapseList();
    }

    scope.expanded = false;
    scope.popupRef && ( popupSrv.hide( scope.popupRef ), scope.popupRef = null );
};

/**
 * Show the popup list of lovEntries.
 *
 * @param {Object} scope - The object holding all the state within the 'scope' of the widget needing the list.
 * @param {JqliteElement} $element - TODO
 *
 */
export let expandList = function( scope, $element ) {
    scope.unbindSelectionEventListener = scope.$on( 'dataProvider.selectionChangeEvent', function( event ) {
        // Prevent selection event (fired by the listbox dataProvider, if any)
        // to bubble-up to primary/secondary workarea and trigger a selection change.
        event.stopPropagation();
    } );

    if( !scope.expanded ) {
        /**
         * For now, do this regardless of whether we already have value data - this is necessary
         * to deal with interdep lovEntries.
         * <P>
         * In the future, we can improve this for efficiency with something like: if (
         * $scope.moreValuesExist && !$scope.lovInitialized )
         */
        if( scope.requestInitialLovEntries ) {
            scope.requestInitialLovEntries();
        }

        // Position the dropdown list element
        var choiceElem = $element.find( '.aw-jswidgets-choice' );
        var widgetContainer = $element.parents( '.aw-jswidgets-arrayEditableWidget' );
        if( choiceElem.length === 0 ) {
            logger.warn( 'uwListService.expandList: Unable to find choice input field element' );
            return;
        }

        // Fix Date Array popup reference issue
        var padding = null;
        var reference = choiceElem[ 0 ];
        if( widgetContainer.length > 0 ) {
            reference = widgetContainer[ 0 ];
            // array widget has border width: 1px
            padding = { y: 1 };
        }
        scope.lovDDWidth = reference.offsetWidth;

        // .aw-layout-popup has min-width: 100px;
        // restrict the the min-width to that value to avoid blank margin
        if( scope.lovDDWidth < 100 ) {
            scope.lovDDWidth = 100;
        }

        // will delete this when all refactor finished.
        scope.expanded = true;
        // end

        // legacy code for aw-pattern, will removed when aw-pattern refactored
        if( /AW-PATTERN/i.test( $element[ 0 ].nodeName ) ) {
            scope.lovDDLeft = choiceElem.offset().left;
            scope.lovDDTop = window.pageYOffset + choiceElem.offset().top;
            scope.listener = scope.$watch( function _watchListHeight() {
                return $element.find( '.aw-widgets-cellListWidget' )[ 0 ].clientHeight;
            }, function( newValue, oldValue ) {
                if( newValue !== oldValue && newValue > 0 ) {
                    exports._adjustPositionForValues( scope, $element );
                }
            } );

            return;
        }
        // end

        // reorganize the legacy event hooks
        var popupWhenOpened = function() {
            scope.popupWhenOpen && scope.popupWhenOpen();
            scope.expanded = true;

            // scroll as-needed
            exports.scrollAttention();
        };
        var popupWhenClosed = function() {
            scope.popupWhenClose && scope.popupWhenClose();
            scope.expanded = false;
        };
        // get panel specific popup styles
        var getCustomClass = function() {
            var popupCustomClass = scope.popupCustomClass;
            try {
                var declViewModel = viewModelSvc.getViewModel( scope );
                if( declViewModel && declViewModel.context && declViewModel.context.popupCustomClass ) {
                    popupCustomClass = declViewModel.context.popupCustomClass;
                }
            } catch ( error ) {
                // DO Nothing
            }

            return popupCustomClass;
        };
        popupSrv.show( {
                templateUrl: scope.popupTemplate,
                context: scope,
                options: {
                    reference: reference,
                    whenParentScrolls: 'close',
                    padding,
                    customClass: getCustomClass(),
                    forceCloseOthers: false,
                    hooks: {
                        whenOpened: popupWhenOpened,
                        whenClosed: popupWhenClosed
                    }
                }
            } )
            .then( ( popupRef ) => { scope.popupRef = popupRef; } );
    }
};

/**
 * Evaluate a key press in the input
 *
 * @param {Object} scope - associated scope
 * @param {Object} event - associated event object
 * @param {Object} $element - associated element
 */
export let evalKey = function( scope, event, $element ) {
    // find the index in the lovEntries array of the value of current attention
    var getAttnIndex = function() {
        if( scope.lovEntries.length && scope.expanded ) {
            return scope.lovEntries.map( function( lovEntry ) {
                return lovEntry.attn;
            } ).indexOf( true );
        }
    };

    var code = event.keyCode;

    if( code === _kcTab || code === _kcEnter || code === _kcEscape || code === _kcUpArrow || code === _kcDnArrow ) {
        var attnIndex = getAttnIndex();
        var selectIndex = -1;
        if( code === _kcTab ) {
            // on tab, accept the current text, don't auto-complete
            scope.handleFieldExit( event, null );
        } else if( code === _kcEnter ) {
            // on enter, autocomplete if there is a matching index
            scope.handleFieldExit( event, attnIndex );
        } else if( code === _kcUpArrow || code === _kcDnArrow ) {
            // arrow keys
            if( !scope.expanded ) {
                scope.toggleDropdown();
            }
            // if attn isn't yet set, set it to the first val
            if( attnIndex < 0 ) {
                scope.lovEntries[ 0 ].attn = true;
                selectIndex = 0;
            } else {
                if( code === _kcDnArrow ) {
                    // down arrow: move the attention down
                    if( scope.lovEntries.length > attnIndex + 1 ) {
                        scope.lovEntries[ attnIndex ].attn = false;
                        scope.lovEntries[ attnIndex + 1 ].attn = true;
                        selectIndex = attnIndex + 1;
                    }
                } else {
                    // up arrow
                    if( attnIndex > 0 ) {
                        scope.lovEntries[ attnIndex ].attn = false;
                        scope.lovEntries[ attnIndex - 1 ].attn = true;
                        selectIndex = attnIndex - 1;
                    }
                }
            }
            // scroll as-needed
            exports.scrollAttention();

            if( scope.handleFieldSelect ) {
                scope.handleFieldSelect( selectIndex );
            }
        } else if( code === _kcEscape ) {
            if( scope.expanded ) {
                event.stopPropagation();
            }
            exports.collapseList( scope );

            scope.handleFieldEscape();
        }
    }
};

/**
 * Scroll to the list item of attention.
 *
 *
 */
export let scrollAttention = function() {
    var dropElem = $( _POPUP_SELECTOR );
    if( dropElem.length === 0 ) {
        logger.warn( 'uwListService.scrollAttention: Unable to find dropdown list container element' );
        return;
    }

    AwTimeoutService.instance( function() {
        var $chosenElem = dropElem.find( 'div.aw-jswidgets-nestingListItemDisplay.aw-state-attention' );

        if( $chosenElem && $chosenElem.length ) {
            // Calculate where to scroll to show the selected item in the LOV drop down
            var calcTop = dropElem.scrollTop() + $chosenElem.position().top - dropElem.height() / 2;
            dropElem.animate( {
                scrollTop: calcTop
            }, 'fast' );
        }
    } );
};

exports = {
    _adjustPositionForValues,
    _exitField,
    exitFieldHandler,
    collapseList,
    expandList,
    evalKey,
    scrollAttention
};
export default exports;
/**
 * Definition for the uwListService service used by (aw-property-lov-val) and (aw-property-time-val).
 *
 * @memberof NgServices
 * @member uwListService
 *
 * @returns {Object} exports
 */
app.factory( 'uwListService', () => exports );
