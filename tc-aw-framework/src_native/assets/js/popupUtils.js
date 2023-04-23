/* eslint-disable require-jsdoc */
// Copyright (c) 2021 Siemens

/**
 * Thue module defines helpful shared APIs and constants used throughout the popup code base.
 * <P>
 * Note: This modules does not create an injectable service.
 *
 * @module js/popupUtils
 */
import _ from 'lodash';
import ngUtils from 'js/ngUtils';
import domUtils from 'js/domUtils';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import panelContentService from 'js/panelContentService';
import viewModelService from 'js/viewModelService';
import { checkResize, resizeDetector } from 'js/resizeDetector';
import { getElement, checkIgnore } from 'js/popupHelper';

// Service
import AwPromiseService from 'js/awPromiseService';
import AwHttpService from 'js/awHttpService';
import wcagService from 'js/wcagService';

var exports = {};

/**
 * The ammount the input box is allowed to move to the left/right before the UI popup (e.g. calendar, LOV ) is collapsed/hidden.
 */
var _MAX_X = 40;
var _MAX_Y = 40;

var dom = domUtils.DOMAPIs;
var POPUP_ID_ATTRIBUTE = 'data-popup-id';
var TOOLTIP_POPUP_CSS = 'aw-popup-tooltip aw_popup_easein';

let _kcEsc = 27;

// eslint-disable-next-line one-var

/**
 * A reference to a created panel. This reference contains with properties/functions used to control the panel.
 * @param {!Object} panelEl the panelEl to wrap
 * @param {!Object} options the panel options
 * @final @constructor
 */
function PanelRef( panelEl, options ) {
    this.id = getId( panelEl, options.forceUid );
    this.panelEl = panelEl;
    this.options = options;
    this.isAttached = false;
    this._removeListeners = [];
    this.intercepters = {};
}
PanelRef.prototype.attach = function() {
    this.updateBackReferce( true );
    activateLifeCycleHooks( this );
    addEventListeners( this );
    processEnablers( this );
    processMultipleLevel( this );
    this.intercepters.open && this.intercepters.open( this.panelEl );
    this.isAttached = true;
};
PanelRef.prototype.detach = function() {
    this.updateBackReferce();
    removeEventListeners( this );
    var elem = this.panelEl;
    if( elem ) {
        ngUtils.destroyNgElement( elem );
        // ensure destroy any viewModel on the original scope
        if( this.options._scope ) {
            this.options._scope.$destroy();
            delete this.options._scope;
        }
    }

    this.intercepters.close && this.intercepters.close( this.panelEl );
    this.intercepters = {};

    // Remove the DOM reference
    this.panelEl = null;
    this.isAttached = false;
};
PanelRef.prototype.updateBackReferce = function( isAdd ) {
    if( !this.options.reference ) { return; }
    var referenceEl = this.options.reference;
    var value = isAdd ? this.id : null;
    referenceEl.setAttribute( POPUP_ID_ATTRIBUTE, value );
};
/**
 * Schedules an update. It will run on the next UI update available.
 */
PanelRef.prototype.scheduleUpdate = function() {
    requestAnimationFrame( () => {
        this.options.api.updatePosition( this );
    } );
};
PanelRef.prototype.canClose = function() {
    return this.options && !this.options.disableClose;
};
export { PanelRef as PanelRef };

/**
 * A panel manager to track and manage all panel reference .
 * @final @constructor
 */
function PopupManager() {
    this._previousPopupRef = null;
    this._popupMaps = {};
}
PopupManager.prototype.get = function( id ) {
    if( id && this._popupMaps[ id ] ) {
        return this._popupMaps[ id ];
    }
    return null;
};
PopupManager.prototype.add = function( panelRef ) {
    if( !panelRef ) { return; }
    var id = panelRef.id;
    let isPanelRefTooltip = panelRef.panelEl && panelRef.panelEl.querySelector( '.aw-layout-popup.aw-popup-tooltip' ) !== null;
    if( !this._popupMaps[ id ] ) {
        let validPanelRef = null;
        for( const k of Object.keys( this._popupMaps ).reverse() ) {
            let validEl = dom.get( '.aw-hierarchical-popup', this._popupMaps[ k ].panelEl );
            // reference of next and parent popup should not be maintained if panelRef is a tooltip
            if( validEl !== null && !isPanelRefTooltip ) {
                validPanelRef = this._popupMaps[ k ];
                break;
            }
        }
        if( validPanelRef !== null ) {
            // Maintain reference of next and parent popup
            validPanelRef.nextPopup = panelRef;
            panelRef.parentPopup = validPanelRef;
        }
        this._popupMaps[ id ] = panelRef;
    }
};
PopupManager.prototype.remove = function( panelRef ) {
    if( !panelRef ) { return; }
    var id = panelRef.id;
    this._popupMaps[ id ] && delete this._popupMaps[ id ];
};
Object.defineProperty( PopupManager.prototype, 'previousPopupRef', {
    enumerable: true,
    configurable: true,
    get: function() { return this._previousPopupRef; },
    set: function( value ) {
        this._previousPopupRef = value;
    }
} );
export { PopupManager as PopupManager };

export let handleOpenedPopup = function( referenceEl, manager ) {
    var id = referenceEl ? referenceEl.getAttribute( POPUP_ID_ATTRIBUTE ) : null;
    var popupRef = manager.get( id );
    // force bring to foreground by re-append
    if( id ) { dom.append( popupRef.panelEl ); }
    return popupRef;
};

function removeEventListeners( panelRef ) {
    panelRef._removeListeners && panelRef._removeListeners.forEach( function( removeFn ) {
        removeFn();
    } );
    panelRef._removeListeners = [];
}

function processEnablers( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;
    options.handle = options.handle || '.aw-layout-panelTitle';

    if( options.draggable ) {
        var setDraggable = function( enableDrag ) {
            var element = ngUtils.element( popupEl );
            var objectToDrag = ngUtils.element( element.find( '.aw-layout-popup' ) );
            var handle = ngUtils.element( element.find( options.handle ) );
            if( enableDrag === true && handle.length > 0 ) {
                handle.css( 'cursor', 'move' );
                objectToDrag.draggable( {
                    handle: handle,
                    containment: 'document',
                    // LCS-337929: expect popup to remain where it was dragged
                    // add flag 'disableUpdate' to prevent auto update position if have been dragged
                    start: function() {
                        if( !options.disableUpdate ) {
                            options.disableUpdate = true;
                        }
                        // remove right / bottom to ensure element draggable
                        dom.setStyles( objectToDrag[ 0 ], { right: null, bottom: null } );
                    }

                } );
            } else {
                objectToDrag.draggable( {
                    disabled: true
                } );
            }
        };

        setDraggable( true );
    }
}

function activateLifeCycleHooks( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;
    if( _.isObject( options.hooks ) ) {
        var intercepters = popupRef.intercepters;
        _.each( options.hooks, function( value, key ) {
            switch ( key ) {
                case 'whenOpened':
                    intercepters.open = value;
                    break;
                case 'whenUpdated':
                    intercepters.update = value;
                    break;
                case 'whenClosed':
                    intercepters.close = value;
                    break;
            }
        } );
    }

    // ensure close any orphan popup in case scope was destroyed
    var scope = ngUtils.getElementScope( popupEl );
    scope.$on( '$destroy', function() {
        // clear this flag so that this popup could be closed.
        delete options.disableClose;
        popupRef.panelEl && options.api.hide( popupEl );
    } );
}

function configureEscapeToClose( popupRef ) {
    var options = popupRef.options;
    const handleEscape = ( event ) => {
        if( popupRef && popupRef.options && popupRef.options.customClass !== TOOLTIP_POPUP_CSS ) {
            let key = event.which || event.keyCode;
            if( key === _kcEsc && popupRef.options.closeWhenEsc !== false && ( popupRef.nextPopup === undefined || popupRef.nextPopup === null ) ) {
                event.stopPropagation();
                options.api.hide( popupRef );
                wcagService.skipToFirstFocusableElement( options.reference );
            }
        }
    };

    // Add listeners
    document.addEventListener( 'keyup', handleEscape );

    // Queue remove listeners function
    popupRef._removeListeners.push( () => {
        document.removeEventListener( 'keyup', handleEscape );
    } );
}
/**
 *
 * @param {JQLite} popupRef The panel element.
 */
function addEventListeners( popupRef ) {
    configureWatchSizeChange( popupRef );
    configureAutoFocus( popupRef );
    // conflict with the behavior to make Escape clear selection in a list. That missed 4.2 but might be planned for 4.3
    configureEscapeToClose( popupRef );
    configureClickOutsideToClose( popupRef );
    configureScrollListener( popupRef );
    configureResizeListener( popupRef );
}

// MultipleLevel popup command bar case:
// build cascade MultipleLevel popup menus
// and define the event ignore list between them
function processMultipleLevel( popupRef ) {
    let { options, panelEl } = popupRef;
    let { reference, manager } = options;
    if( !reference || !manager ) { return; }

    // add current popup to ignore click list of all up Level popups
    while( reference && dom.closest( reference, 'aw-popup-panel2' ) ) {
        let upLevelElement = dom.closest( reference, 'aw-popup-panel2' );
        if( upLevelElement && manager ) {
            let ref = manager.get( upLevelElement.id );
            ref.options.ignoreClicksFrom = ref.options.ignoreClicksFrom || [];
            ref.options.ignoreClicksFrom.push( panelEl );

            // check upper level recursively
            reference = ref.options.reference;
            manager = ref.options.manager;
        }
    }
}

function configureAutoFocus( popupRef ) {
    const { options, _removeListeners } = popupRef;
    let { autoFocus, selectedElementCSS } = options;
    if( autoFocus === true ) {
        let handlers = wcagService.configureAutoFocus( popupRef );
        wcagService.focusFirstDescendantWithDelay( popupRef.panelEl, selectedElementCSS );
        _removeListeners.push( ...handlers );
    }
}

function configureWatchSizeChange( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;
    // ease the cost, or will cause mouseenter/mouseleave flickering issue in tooltip
    var debouncedUpdatePosition = throttle( options.api.updatePosition );
    var listener = addWatchHandle( popupEl, function() {
        debouncedUpdatePosition( popupRef );
    } );

    // Queue remove listeners function
    popupRef._removeListeners.push( listener );
}

function configureClickOutsideToClose( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;
    var target = options.parent;
    var reference = options.reference;
    if( options.clickOutsideToClose ) {
        var sourceEl;

        // Keep track of the element on which the mouse originally went down
        // so that we can only close the backdrop when the 'click' started on it.
        // A simple 'click' handler does not work, it sets the target object as the
        // element the mouse went down on.
        // var mousedownHandler = function( ev ) {
        //     sourceEl = ev.target;
        // };

        // We check if our original element and the target is the backdrop
        // because if the original was the backdrop and the target was inside the
        // panel we don't want to panel to close.
        var mouseupHandler = function( ev ) {
            // We check if the sourceEl of the event is the panel element or one
            // of it's children. If it is not, then close the panel.
            sourceEl = ev.target;
            if( sourceEl !== popupEl && !popupEl.contains( sourceEl ) ) {
                if( !checkIgnore( options, sourceEl ) ) {
                    options.api.hide( popupRef );
                }
            }
        };

        // Add listeners
        target.addEventListener( 'click', mouseupHandler );

        // Queue remove listeners function
        popupRef._removeListeners.push( function() {
            target.removeEventListener( 'click', mouseupHandler );
        } );
    }
}

function configureResizeListener( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;
    var handler = null;
    if( options.resizeToClose ) {
        var debouncedHide = throttle( options.api.hide );
        handler = () => { debouncedHide( popupRef ); };
    } else {
        var debouncedUpdatePosition = throttle( options.api.updatePosition );
        handler = () => { debouncedUpdatePosition( popupRef ); };
    }

    // Add listeners, use framework's event 'windowResize' instead of native event 'resize'
    var scope = ngUtils.getElementScope( popupEl );
    var removeListener = scope.$on( 'windowResize', handler );
    // Queue remove listeners function
    popupRef._removeListeners.push( function() {
        removeListener();
    } );

    if( options.listenAreaChanges !== false ) {
        // FUTURE: use referce elelemt's resize event, whitch needs framework's support.
        var sub = eventBus.subscribe( 'aw-splitter-update', handler );
        popupRef._removeListeners.push( () => { eventBus.unsubscribe( sub ); } );
    }
}

/**
 * Firefox and Qt browser have scroll issues: scroll event is firing multiple times even when mouse moves or hover on any element
 * Solution: for these browser, need to remember the last reported scroll position and check it against each new reported scroll position
 *
 * @returns {boolean} result - true for Firefox or Qt browser, false for others
 */
function checkBrowser() {
    return browserUtils.isFirefox || browserUtils.isQt;
}

function checkOutsideScrollEvent( event, popupEl ) {
    var path = eventPath( event );
    return _.indexOf( path, popupEl ) === -1;
}

function checkAncestorScrollEvent( event, popupEl, options ) {
    let { reference, useOutsideScrollEvent } = options;
    if( !reference || useOutsideScrollEvent ) {
        return checkOutsideScrollEvent( event, popupEl );
    }
    let path = composedPath( reference );
    return _.indexOf( path, event.target ) !== -1;
}

function configureScrollListener( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;
    var onScroll;

    var target = null;
    var onScrollWrapper = null;
    if( options.closeWhenParentScroll ) {
        var debouncedHide = throttle( options.api.hide );

        var processScrollEvent = function( event ) {
            debouncedHide( popupRef );
        };

        var checkScrollPosition = function( target ) {
            var oldY = target.scrollTop;
            var oldX = target.scrollLeft;

            var wrapper = function( event ) {
                if( event.target !== target ) { return; }
                var curY = event.target.scrollTop;
                var curX = event.target.scrollLeft;

                if( Math.abs( oldX - curX ) > _MAX_X || Math.abs( oldY - curY ) > _MAX_Y ) {
                    oldX = curX;
                    oldY = curY;
                    processScrollEvent( event );
                }
            };

            window.removeEventListener( 'scroll', onScroll, true );
            target.addEventListener( 'scroll', wrapper, true );

            return wrapper;
        };

        onScroll = function( event ) {
            // skip if scroll happens inside any ancestor node
            if( !checkAncestorScrollEvent( event, popupEl, options ) ) { return; }

            // Firefox issue: scroll event is firing multiple times even when mouse moves or hover on any element
            // Solution: need to remember the last reported scroll position and check it against each new reported scroll position
            if( checkBrowser() ) {
                target = event.target;
                onScrollWrapper = checkScrollPosition( target );
                return;
            }

            processScrollEvent( event );
        };
    } else if( options.followParentScroll ) {
        var debouncedUpdatePosition = throttle( options.api.updatePosition );
        onScroll = function( event ) {
            if( checkAncestorScrollEvent( event, popupEl, options ) ) { debouncedUpdatePosition( popupRef ); }
        };
    }

    if( onScroll ) {
        // Add listeners.
        window.addEventListener( 'scroll', onScroll, true );

        // Queue remove listeners function.
        popupRef._removeListeners.push( function() {
            window.removeEventListener( 'scroll', onScroll, true );
            if( checkBrowser() && target ) {
                target.removeEventListener( 'scroll', onScrollWrapper, true );
            }
        } );
    }
}

export let getContainerElement = function( popupEl ) {
    return dom.get( '.aw-layout-popup.aw-layout-popupOverlay', popupEl );
};

export let processOptions = function( popupEl, options ) {
    var container = getContainerElement( popupEl );
    if( !container ) { return; }
    if( options.customClass ) {
        let customClasses = options.customClass.split( /\s+|,/ );
        customClasses.forEach( ( i ) => { dom.addClass( container, i ); } );
    }
    var sizeCss = {};
    var needUpdateStyle = false;
    if( options.containerWidth ) {
        sizeCss.width = options.containerWidth;
        sizeCss[ 'max-width' ] = null;
        needUpdateStyle = true;
    }
    if( options.containerHeight ) {
        sizeCss.height = options.containerHeight;
        sizeCss[ 'max-height' ] = null;
        needUpdateStyle = true;
    }

    needUpdateStyle && dom.setStyles( container, sizeCss );
};

export let getTemplateFromUrl = function( url ) {
    return AwHttpService.instance.get( url, { cache: true } )
        .then( ( response ) => response.data )
        .catch( () => AwPromiseService.instance.reject( url + ' type "url" not found! please check your resource!' ) );
};

export let getTemplateFromView = function( viewId, contextScope ) {
    var subPanelContext = contextScope ? contextScope.subPanelContext : null;
    return panelContentService.getPanelContent( viewId )
        .catch( () => AwPromiseService.instance.reject( viewId + ' type "declView" not found! please check your resource!' ) )
        .then( ( viewAndViewModelResponse ) => {
            return viewModelService.populateViewModelPropertiesFromJson( viewAndViewModelResponse.viewModel, false, null, null, null, subPanelContext )
                .then( ( declarativeViewModel ) => {
                    // to post compatible with the ugly event hook introduced unwisely,
                    // application are listening this event to retrieve data for that view
                    eventBus.publish( viewId + '.contentLoaded' );
                    viewModelService.setupLifeCycle( contextScope, declarativeViewModel );
                    return AwPromiseService.instance.resolve( viewAndViewModelResponse.view );
                } );
        } );
};

function getId( panelEl, forceUid ) {
    if( !panelEl ) { return null; }
    // force generate uid if
    // 1, not have a id
    // 2, multiple mode open
    if( forceUid && panelEl.id ) { panelEl.id = ''; }
    if( !panelEl.id ) { dom.uniqueId( panelEl ); }
    return panelEl.id;
}

// ONLY FOR declarative usage due to principle: CSS selectors should not be exposed to view model
// extend selector by add id sign
export let extendSelector = function( element ) {
    var reValidSelector = /^(\.|#|aw)/i;
    if( _.isString( element ) && !reValidSelector.test( element ) ) {
        element = element + ', #' + element;
    }
    return element;
};

export let getArrowElement = function( popupEl ) {
    return dom.get( '.popupArrow', popupEl );
};

function addWatchHandle( popupEl, cb ) {
    let containerEl = getContainerElement( popupEl );
    let fn = () => {
        if( cb && _.isFunction( cb ) ) { cb(); }
    };
    return resizeDetector( containerEl, fn );
}

/**
 * @deprecated afx@3.2.0, not required anymore
 * @obsoleteIn afx@5.0.0
 *
 */
// restrict the popup element full display in the page, either above or below
// if no enough space detected, ensure show a scroll bar in the popup container
export let setMaxHeight = function( popupHeaderElem, popupElem ) {
    var scrollerElems = dom.getAll( '.aw-base-scrollPanel', popupElem );
    if( scrollerElems.length > 0 ) {
        var clientHeight = window.innerHeight;

        var actualMaxHeight = parseInt( dom.getStyle( popupElem, 'max-height' ) );
        if( !actualMaxHeight ) {
            actualMaxHeight = parseInt( dom.getStyle( popupElem, 'height' ) );
        }

        var popupTop = dom.getOffset( popupElem ).top;
        var popupRefTop = dom.getOffset( popupHeaderElem ).top;
        var popupIsAbove = popupTop < popupRefTop;

        var expectedMaxHeight = clientHeight - popupTop;
        if( popupIsAbove ) {
            expectedMaxHeight = popupRefTop;
        }

        // unless space is highly limited, leave a gap for the drop shadow, etc
        expectedMaxHeight = Math.max( expectedMaxHeight - 20, 0 );

        // only set maxHeight when there is no enough space for the container
        if( expectedMaxHeight < actualMaxHeight ) {
            _.forEach( scrollerElems, function( elem ) {
                elem.style.maxHeight = expectedMaxHeight + 'px';

                // adjust the top when changed the maxHeight
                if( popupIsAbove ) {
                    var diff = actualMaxHeight - expectedMaxHeight;
                    var expectedTop = popupTop + diff;
                    popupElem.style.top = expectedTop + 'px';
                }
            } );
        }
    }
};

// provide opportunity for user to specify the resizeContainer selector
export let getResizeContainer = function( element, containerSelector ) {
    if( containerSelector && dom.match( element, containerSelector ) ) {
        return element;
    }
    let selector = containerSelector || '.aw-base-scrollPanel';
    if( !containerSelector && dom.get( '.aw-popup-contentContainer', element ) ) {
        selector = '.aw-popup-contentContainer';
    }
    return dom.get( selector, element );
};

export let getMousePosition = function( event ) {
    let target = { clientX: 0, clientY: 0 };
    if( event ) {
        target = event;
        if( _.isUndefined( event.clientX ) ) { target = event.touches[ 0 ]; }
    }
    let { clientX, clientY } = target;
    return { x: clientX, y: clientY };
};

// it implements a window frame based throttle function to ease intensively triggered window events.
// motivation is to improve performance, to ensure callback will only be fired once per frame for intensively triggered window events.
// references: $mdDialog using a throttle decorator to decorate $$rAF service. popper.js implement it's own window frame based throttle method.
function throttle( fn ) {
    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    var supportsMicroTasks = isBrowser && window.Promise;
    // eslint-disable-next-line one-var
    var queuedArgs, alreadyQueued, queueCb, context;

    var microtaskThrottle = function( fn ) {
        alreadyQueued = false;
        return function throttled() {
            queuedArgs = arguments;
            context = this;
            queueCb = fn;
            if( alreadyQueued ) {
                return;
            }
            alreadyQueued = true;
            window.Promise.resolve().then( () => {
                alreadyQueued = false;
                queueCb.apply( context, Array.prototype.slice.call( queuedArgs ) );
            } );
        };
    };

    var taskThrottle = function( fn ) {
        var scheduled = false;
        var task = window.requestAnimationFrame || window.setTimeout;
        return function throttled() {
            var queuedArgs = arguments;
            context = this;
            queueCb = fn;
            if( !scheduled ) {
                scheduled = true;
                task( () => {
                    scheduled = false;
                    queueCb.apply( context, Array.prototype.slice.call( queuedArgs ) );
                } );
            }
        };
    };

    return ( supportsMicroTasks ? microtaskThrottle : taskThrottle )( fn );
}

function composedPath( el ) {
    let path = [];
    while( el ) {
        path.push( el );
        if( el.tagName === 'HTML' ) {
            path.push( document );
            path.push( window );
            return path;
        }
        el = el.parentElement;
    }
    return path;
}

// get the event path in dom event bubbling
function eventPath( event ) {
    var path = event.path || event.composedPath && event.composedPath();
    // event.path always has wrong value for Qt browser
    if( !path || browserUtils.isQt ) {
        return composedPath( event.target );
    }
    return path;
}

// return the first clean node by skip any comment node.
export let cleanNode = ( nodesArray ) => {
    let result = null;
    if( nodesArray && nodesArray.length > 0 ) {
        result = _.find( nodesArray, ( item ) => {
            return item.nodeType !== HTMLElement.COMMENT_NODE;
        } );
    }
    return result;
};

// verify whether have any plain string content loaded
let verifyText = ( node ) => {
    return Boolean( ( node.innerText || '' ).replace( /\s|\r|\n/g, '' ) );
};

// verify whether have any media content loaded
let verifyMedia = ( node ) => {
    return Boolean( dom.get( 'img, svg', node ) );
};

export let tooltipAdapteStyle = ( node ) => {
    // tooltip expected parent element to have "display: block" other than "display: flex"
    dom.removeClass( node, 'aw-layout-flexbox' );
    dom.setStyle( node, 'overflow', 'hidden' );
};

// getLoadingStatus by check transclude / plainHtml contents
// used for balloon and tooltip
let getLoadingStatus = ( container, adapteStyle ) => {
    let [ container_css, transclude_css ] = [ '.aw-layout-flexColumnContainer',
        'aw-include>div.aw-layout-include, div.aw-base-scrollPanel>ng-transclude'
    ];
    var content = dom.get( container_css, container );
    if( !content ) { return false; }
    var transclude = dom.get( transclude_css, content );
    var transcluded = Boolean( transclude ) && Boolean( cleanNode( transclude.childNodes ) );
    if( transcluded && adapteStyle ) { tooltipAdapteStyle( transclude ); }
    return verifyText( content ) || verifyMedia( content );
};

export let runLoadingCheck = ( context, container, adapteStyle = false ) => {
    let loaded = () => getLoadingStatus( container, adapteStyle );
    let apply = ( loading = false ) => {
        context.loading = loading;
        context.$apply && context.$apply();
    };
    return new Promise( ( resolve ) => {
        // defer to next cycle to avoid show loading in cache case
        setTimeout( () => {
            let loading = !loaded();
            apply( loading );
            if( !loading ) {
                resolve();
                return;
            }
            let timer = setInterval( () => {
                if( loaded() ) { apply( false ); }
                if( !context.loading || !dom.inDOM( container ) ) {
                    clearInterval( timer );
                    resolve();
                }
            }, 50 );
        } );
    } );
};

const RESIZE_POLLING_TIMEOUT = 500;
export let runResizeCheck = ( container ) => {
    let oldSize = { width: container.offsetWidth, height: container.offsetHeight };
    let noResizeTimeStart = Date.now();
    return new Promise( ( resolve ) => {
        let timer = setInterval( () => {
            if( checkResize( container, oldSize )() ) {
                noResizeTimeStart = Date.now();
            } else {
                let noResizeTime = Date.now() - noResizeTimeStart;
                // size got stable till now, safe to resolve.
                if( noResizeTime > RESIZE_POLLING_TIMEOUT ) {
                    clearInterval( timer );
                    resolve();
                }
            }
        }, 50 );
    } );
};

export let tooltipProgressCheck = ( cb, progress ) => {
    let timer = setInterval( () => {
        if( !progress.busy ) {
            clearInterval( timer );
            cb && cb();
        }
    }, 50 );
};

export let closeExistingTooltip = () => {
    let nodes = dom.getAll( 'div.aw-popup-tooltip' );
    let results = dom.getParent( nodes );
    results && results.length > 0 && dom.remove( results );
};

let checkWithinRightSide = ( node ) => {
    return window.innerWidth / 3 - node.getBoundingClientRect().left < 0;
};
export let tooltipAdapteOption = ( raw, target ) => {
    let result = Object.assign( {}, raw );
    // backward compatible
    if( raw.alignment && !raw.placement ) {
        if( raw.alignment === 'VERTICAL' ) {
            result.placement = 'right';
            // if target element locate at the right side of the page, then flip the placement
            if( checkWithinRightSide( target ) ) { result.placement = 'left'; }
        } else if( /^(RIGHT|LEFT)/.test( raw.alignment ) ) {
            result.placement = 'right';
        } else if( /^(TOP|BOTTOM)/.test( raw.alignment ) ) {
            result.placement = 'top';
        }
    }
    return result;
};

export let processTooltipOptions = ( rawOptions, target, popupOpenedCb, popupClosedCb ) => {
    let options = {
        ownContainer: true,
        placement: [ 'top', 'bottom', 'right', 'left' ],
        flipBehavior: 'opposite',
        whenParentScrolls: 'close',
        adaptiveShift: true, // prevent tooltip cut off in corner case
        resizeToClose: true,
        advancePositioning: true, // prevent overlap or flash when popup content growing
        hasArrow: true,
        padding: { x: 4, y: 4 },
        arrowOptions: {
            alignment: 'center'
        },
        reference: target,
        minSize: 5,
        forceCloseOthers: false,
        customClass: 'aw-popup-tooltip aw_popup_easein',
        hooks: {
            whenOpened: ( element ) => { popupOpenedCb && popupOpenedCb( element ); },
            whenClosed: ( element ) => { popupClosedCb && popupClosedCb( element ); }
        }
    };
    if( _.keys( rawOptions ).length > 0 ) { Object.assign( options, tooltipAdapteOption( rawOptions, target ) ); }
    return options;
};

export let removeNativeTitle = ( node ) => {
    dom.removeAttribute( node, 'title' );
    let results = dom.getAll( '[title]', node );
    results.length > 0 && dom.removeAttribute( results, 'title' );
};

exports = {
    PanelRef,
    PopupManager,
    handleOpenedPopup,
    processOptions,
    getTemplateFromUrl,
    getTemplateFromView,
    getElement,
    extendSelector,
    getContainerElement,
    getArrowElement,
    setMaxHeight,
    getResizeContainer,
    getMousePosition,
    cleanNode,
    runLoadingCheck,
    runResizeCheck,
    tooltipProgressCheck,
    closeExistingTooltip,
    tooltipAdapteOption,
    tooltipAdapteStyle,
    processTooltipOptions,
    removeNativeTitle
};
export default exports;
