// Copyright (c) 2020 Siemens

/* eslint-disable require-jsdoc */
/* global angular */

/**
 * @module js/popupService
 */
import app from 'app';
import RootScope from 'js/awRootScopeService';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import AwCompileService from 'js/awCompileService';
import panelContentService from 'js/panelContentService';
import panelViewModelService from 'js/viewModelService';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import Debug from 'Debug';
import eventBus from 'js/eventBus';
import utils from 'js/popupUtils';
import domUtils from 'js/domUtils';
import ngUtils from 'js/ngUtils';
import positionSrv from 'js/positionService';
import logger from 'js/logger';
import 'js/aw-popup2.directive';
import 'js/aw-balloon-popup-panel.directive';
import wcagSvc from 'js/wcagService';


var trace = new Debug( 'popupService' );
let exports = {};

const POPUP_WRAPPER = '<aw-popup-panel2><div class="aw-layout-flexColumnContainer"></div></aw-popup-panel2>';
var manager = new utils.PopupManager();
var dom = domUtils.DOMAPIs;
let MIN_SIZE = 50;
let BUFFER_SIZE = 20;

// the default popup options
var _defaultOptions = {
    // enable open multiple popups at the same time
    // multiple: false,
    // enable close the popup when click outside the popup
    clickOutsideToClose: true,
    // auto update popup position or close popup when the reference element moves, accept values: 'follow', 'close'
    whenParentScrolls: 'follow',
    // modal mode
    hasMask: false,
    // has arrow / bubble
    hasArrow: false,
    arrowOptions: {
        // specify where to align the arrow, relative to reference element,
        // valid value: auto / center / start / end
        // auto: based on the popup alignment, arrow should be smart position itself.
        alignment: 'auto',
        // specify the alignment offset in px, relative to reference element,
        // could be positive / negative
        // special used for start / end case.
        offset: 0,
        // specify the shift offset in px, relative to popup element,
        // must be positive
        shift: 5
    },
    // the default parent element where the popup element mount to, accept native Element or css selector
    parent: document.body,
    // the reference element which trigger the popup, accept native Element or css selector
    reference: null,
    // targetEvent the native targetEvent which triggers to show/close the popup
    targetEvent: null,
    // support add custom styles from application.
    // required for aw-navigate-breadcrumb and aw-search-breadcrumb
    customClass: '',
    // popup container size. optional
    // required for aw-popup
    height: '',
    width: '',
    // define the minimal size a popup could be, it's required because:
    // 1, prevent popup too small
    // 2, smart filp side and alignment to support smart position
    minSize: MIN_SIZE,
    // UX requirement: define the gap/buffer size for drop shadow when the available space is highly limited
    marginBufferSize: BUFFER_SIZE,
    // enable popup draggable or not
    draggable: false,
    enableResize: false,
    // placement options: ['top-start','top','top-end','right-start','right','right-end',
    // 'bottom-end','bottom','bottom-start','left-end','left','left-start']
    placement: 'bottom-start',
    // smart position behavior, accept values: 'fixed', 'opposite', 'clockwise', 'counterclockwise'
    // define how the position engine to search a available space to place the popup.
    flipBehavior: 'opposite',
    // popup lifeCycle hooks
    hooks: {
        whenOpened: null,
        whenUpdated: null,
        whenClosed: null
    }
};

/**
 * the default preset options for AFX provided popups,
 * user can override by explicitely configure options
 */
let _popupPresets = {
    'aw-popup2': {
        options: {
            hasMask: true,
            customClass: 'aw-popup-panelContainer',
            clickOutsideToClose: false,
            adaptiveShift: true
        }
    },
    'aw-balloon-popup-panel': {
        options: {
            ownContainer: true,
            hasArrow: true,
            customClass: 'aw-popup-balloon',
            clickOutsideToClose: true,
            adaptiveShift: true,
            placement: [ 'top', 'bottom', 'left', 'right' ],
            flipBehavior: 'clockwise',
            padding: {
                x: 4,
                y: 4
            },
            arrowOptions: {
                // specify where to align the arrow, relative to reference element,
                // valid value: auto / center / start / end
                alignment: 'auto',
                // specify the alignment offset in px, relative to reference element,
                // could be positive / negative
                // special used for start / end case.
                offset: 5,
                // specify the shift offset in px, relative to popup element,
                // must be positive
                shift: 15
            }
        }
    }
    // EXTENDED FUTURE
};

// popup node name,
// WILL RENAME TO aw-popup-panel when all refactor work finished.
let POPUP_NODE_NAME = 'aw-popup-panel2';

/**
 * show a popup with specified template and options and binding context
 *
 * @param {Object} params - the popup configurations. Object with the following argument properties:
 *      {String} template - templateHtmlString, define your view in any of these types: template/templateUrl/declView
 *      {String} templateUrl - templateUrl, define your view in any of these types: template/templateUrl/declView
 *      {String} declView - declView, define your view in any of these types: template/templateUrl/declView
 *      {Object} context - Optional. the contextScope which provide the popup binding context
 *      {Object} subPanelContext - Optional. Used when some information needs to be passed on from parent context.
 *      {Object} locals - @deprecated Optional. customized local binding data
 *      {Object} options - Optional.  popup options, valid properties and complete format please reference _defaultOptions.
 *
 * @returns {Promise} promise with the created popupRef element
 */
let show = function( { template, templateUrl, declView, domElement, options, context, subPanelContext, locals } ) {
    options = consolidateOptions( options );
    context = consolidateContext( context, options, subPanelContext, locals );

    return processExistingPopups( options )
        .then( ( popupRef ) => {
            // multiple mode - prevent create duplicate popup instance for one referenceEl
            if ( popupRef && popupRef.panelEl ) {
                return AwPromiseService.instance.resolve( popupRef );
            }

            // only create new instance if referenceEl not have one
            return processTemplate( template, templateUrl, declView, domElement, context )
                .then( ( html ) => compile( html, context, options ) )
                .then( ( popupRef ) => popIn( popupRef ) )
                .then( ( popupRef ) => done( popupRef ) );
        } );
};

/**
 * Schedules an update by popupEl or popupRef. It will run on the next UI update available.
 *
 * @param {Object} popupEl - the popupEl / popupRef to update.
 *
 * @returns {Promise} promise with the updated popupRef
 */
let update = function( popupEl ) {
    var popupRef = manager.get( popupEl.id );
    popupRef && popupRef.scheduleUpdate();
    return AwPromiseService.instance.resolve( popupRef );
};

/**
 * close popup by the popupEl or target event. null to force close all popups
 *
 * @param {Object | String} popupEl - the popupEl to close. accept native Element element or css selector
 * @param {Object} targetEvent - the targetEvent which trigger the invocation, specified for declarative usage
 * @param {Boolean} hideAllAncestorPopups - true or false, flag to hide/close all the ancestor popups of current popup
 *
 * @returns {Promise} promise with the close result, true or false
 */
let hide = function( popupEl, targetEvent, hideAllAncestorPopups = false ) {
    if ( popupEl && popupEl.options && popupEl.options.disableClose ) {
        return AwPromiseService.instance.resolve( false );
    }
    return hideByContext( targetEvent, hideAllAncestorPopups )
        .then( ( result ) => {
            if ( !result ) {
                return hideById( popupEl );
            }
            return result;
        } );
};

function processExistingPopups( options ) {
    var result = false;
    if ( options.multiple === true ) {
        // prevent create duplicate popup instance for one referenceEl
        // if the referenceEl already has a popup, show again just by bring the popup to foreground
        result = utils.handleOpenedPopup( options.reference, manager );
    } else {
        // if in singleton mode, always force close others
        if ( options.forceCloseOthers !== false ) {
            result = hide();
        }
    }
    return AwPromiseService.instance.resolve( result );
}

function consolidateOptions( options ) {
    // override options
    if ( options && !_.isUndefined( options.isModal ) ) {
        // rename this option for internal use
        options.hasMask = options.isModal;
    }
    var userOptions = _.cloneDeep( options );

    options = _.assign( {}, _defaultOptions, options );
    options.userOptions = userOptions;
    options.api = { setPosition, updatePosition, hide };
    options.parent = utils.getElement( utils.extendSelector( options.parent ) ) || document.body;
    options.reference = utils.getElement( utils.extendSelector( options.reference ) );
    options.manager = manager;
    inflateOptions( options );

    return options;
}

function inflateOptions( options ) {
    if ( options.multiple === true ) {
        options.forceUid = true;
        options.useCloseContext = true;
    }
    if ( options.whenParentScrolls === 'follow' ) {
        options.followParentScroll = true;
    } else {
        options.followParentScroll = false;
        options.closeWhenParentScroll = true;
    }

    // improve the flexibility to support both single value and array values.
    if ( options.placement && _.isArray( options.placement ) ) {
        [ options.placement, ...options.alternativePlacements ] = options.placement;
    }
}

function consolidateContext( context, options, subPanelContext, locals ) {
    // default inherited from parent scope
    var isolated = RootScope.instance.$new();
    var parentScope = context;
    if ( !parentScope ) {
        parentScope = options.reference ? ngUtils.getElementScope( options.reference ) : isolated;
    }
    var childScope = parentScope.$new( false );
    // detachMode should be careful to use, whoever uses detach mode needs to be responsible for closing
    if ( options.detachMode ) {
        childScope = isolated;
    }

    // mixin locals and controller
    childScope.hasMask = options.hasMask;
    childScope.hasArrow = options.hasArrow;
    childScope.ownContainer = options.ownContainer;
    childScope.enableResize = options.enableResize;
    if ( locals && _.isObject( locals ) ) {
        _.assign( childScope, locals );
    }
    if ( subPanelContext && _.isObject( subPanelContext ) ) {
        let [ overrideValue, baseValue ] = [ subPanelContext, childScope.subPanelContext ];
        childScope.subPanelContext = _.assign( {}, baseValue, overrideValue );
    }
    // alias controller to 'vm' for template concise usage
    // if ( controller && _.isObject( controller ) ) {
    //     _.assign( childScope.vm, controller );
    // }

    // keep a reference for viewModel destroy, will be deleted when popup detached.
    options._scope = childScope;
    return childScope;
}

function detachPopupRef( popupRef ) {
    if ( popupRef && !popupRef.canClose() ) { return; }

    if ( popupRef && popupRef.isAttached ) {
        // set opacity to 0 for the popup container element
        dom.setStyle( popupRef.panelEl.lastChild, 'opacity', 0 );
        if( popupRef.parentPopup ) {
            if( popupRef.nextPopup ) {
                popupRef.parentPopup.nextPopup = popupRef.nextPopup;
                popupRef.nextPopup.parentPopup = popupRef.parentPopup;
            } else {
                popupRef.parentPopup.nextPopup = null;
            }
        }
        // Need the timeout for transition animation to complete before detaching element.
        AwTimeoutService.instance( function() {
            popupRef.detach();
            manager.remove( popupRef );
        }, 200 );
    }
}

function hideById( popupEl ) {
    var elements = [];
    // if specified and still available on DOM
    popupEl = utils.getElement( utils.extendSelector( popupEl ) );
    if ( popupEl ) {
        elements = _.concat( [], popupEl );
    }
    // default to force close all popups if no element specified.
    if ( !popupEl ) {
        elements = dom.getAll( POPUP_NODE_NAME );
    }

    _.forEach( elements, function( elem ) {
        var popupRef = manager.get( elem.id );
        detachPopupRef( popupRef );
    } );
    return AwPromiseService.instance.resolve( true );
}

function hideByContext( targetEvent, hideAllAncestorPopups ) {
    var successed = false;
    // based on the native event, get the target popup
    // only process it when it's a valid native event
    if ( targetEvent && targetEvent.target ) {
        var popupEl = getTargetPopup( targetEvent );
        var popupRef = popupEl ? manager.get( popupEl.id ) : null;
        do {
            if ( popupRef && ( popupRef.options.useCloseContext || popupEl ) ) {
                wcagSvc.skipToFirstFocusableElement( popupRef.options.reference, popupRef.options.checkActiveFocusInContainer );
                wcagSvc.setParentOfGroupCmds( popupRef.options.reference );
                detachPopupRef( popupRef );
                successed = true;
                popupRef = hideAllAncestorPopups && popupRef.parentPopup;
            }
        } while( popupRef );
    }
    return AwPromiseService.instance.resolve( successed );
}

function getTargetPopup( targetEvent ) {
    return dom.closest( targetEvent.target, POPUP_NODE_NAME );
}

function processTemplate( template, templateUrl, declView, domElement, contextScope ) {
    var html = null;
    if ( !template && !templateUrl && !declView && !domElement ) {
        return AwPromiseService.instance.reject( 'missing require template parameter' );
    }

    if ( templateUrl ) {
        var url = app.getBaseUrlPath() + templateUrl;
        html = utils.getTemplateFromUrl( url );
    } else if ( declView ) {
        html = utils.getTemplateFromView( declView, contextScope );
    } else if ( template || domElement ) {
        html = template || domElement;
    }

    return AwPromiseService.instance.resolve( html );
}

function compile( html, contextScope, options ) {
    if ( !html ) {
        return AwPromiseService.instance.reject( 'missing require html parameter' );
    }
    let isElement = _.isObject( html );
    let $element = ngUtils.element( isElement ? POPUP_WRAPPER : html );
    let popupEl = utils.cleanNode( AwCompileService.instance( $element )( contextScope ) );
    if ( !popupEl ) {
        return AwPromiseService.instance.reject( 'compile failed for template: ' + html );
    }

    // container compilation takes time, wait on next cycle
    return AwTimeoutService.instance( function() {
        isElement && $element.find( '.aw-layout-flexColumnContainer' ).append( html );
        popupEl = processCompiledContent( popupEl, contextScope, options );
    } ).then( () => {
        return AwPromiseService.instance.resolve( new utils.PanelRef( popupEl, options ) );
    } );
}

function processCompiledContent( compiledEl, context, options ) {
    var popupEl = compiledEl;

    var nodeName = String.prototype.toLowerCase.call( compiledEl.nodeName );
    var reNodeName = new RegExp( '^' + POPUP_NODE_NAME, 'i' );
    if ( !reNodeName.test( nodeName ) ) {
        mergePresetOptions( nodeName, context, options );
        // mount the popup element only
        popupEl = dom.get( POPUP_NODE_NAME, compiledEl );
    }
    utils.processOptions( popupEl, options );
    return popupEl;
}

function mergePresetOptions( preset, context, options ) {
    // if has valid preset, then retrive the preset options
    if ( preset && _.has( _popupPresets, preset ) ) {
        let value = _popupPresets[preset];

        // mixin preset's default options,
        // user's override has the top priority
        let override = _.cloneDeep( options.userOptions );
        let presets = _.cloneDeep( value.options );
        let userArrowOptions = null;
        if ( override ) {
            delete override.parent;
            delete override.reference;
            userArrowOptions = override.arrowOptions;
            delete override.arrowOptions;
        }
        presets.arrowOptions && mergeArrowOptions( options, presets, userArrowOptions );
        _.extend( options, presets, override );

        inflateOptions( options );
        updateContext( context, options );
    }
}

function mergeArrowOptions( options, presets = {}, userArrowOptions = null ) {
    let defaults = options.arrowOptions || {};
    let others = presets.arrowOptions || null;
    _.extend( defaults, others, userArrowOptions );
    options.arrowOptions = _.keys( defaults ).length > 0 ? defaults : null;
    delete presets.arrowOptions;
}

function updateContext( context, options ) {
    context.hasMask = options.hasMask;
    context.width = options.width;
    context.height = options.height;
    context.hasArrow = options.hasArrow;
    context.arrowOptions = options.arrowOptions;
    context.ownContainer = options.ownContainer;
    context.enableResize = options.enableResize;
}

/**
 * popin
 *
 * @param {Object} popupRef popup element
 *
 * @returns {Object} Promise
 */
function popIn( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;
    options.parent.appendChild( popupEl );
    updatePosition( popupRef );
    return AwPromiseService.instance.resolve( popupRef );
}

function done( popupRef ) {
    // succefully show the popup
    popupRef.attach();
    manager.add( popupRef );
    return AwPromiseService.instance.resolve( popupRef );
}

function setPositionAtMousePosition( popupEl, event ) {
    var popup = utils.getContainerElement( popupEl );
    var resizeContainer = utils.getResizeContainer( popupEl );
    var height = popup.offsetHeight;
    const width = popup.offsetWidth;
    var position = utils.getMousePosition( event );
    var left = position.x;
    var top = position.y;


    // Check if context menu would go outside of visible window, and move up if needed
    let resizeInfo = null;
    var maxYNeeded = top + height;
    if ( maxYNeeded >= window.innerHeight ) {
        top -= height;
        // case go out of boundary
        if ( top <= 0 ) {
            resizeInfo = { ...resizeInfo, 'max-height': position.y };
            top = 0;
        }
    }
    const maxXNeeded = left + width;
    if ( maxXNeeded >= window.innerWidth ) {
        left -= width;
        // case go out of boundary
        if ( left < 0 ) {
            resizeInfo = { ...resizeInfo, 'max-width': position.x };
            left = 0;
        }
    }

    // clear resize info case application use cache
    if ( resizeContainer ) {
        dom.setStyles( resizeContainer, { 'max-height': null, 'max-width': null } );
        resizeInfo && dom.setStyles( resizeContainer, resizeInfo );
    }
    dom.setStyles( popup, {
        left: left + 'px',
        top: top + 'px'
    } );
}


function setPositionAtPage( popupEl, options ) {
    const { placement, disableUpdate, preventExceedBoundary } = options;
    var popup = utils.getContainerElement( popupEl );
    var height = popup.offsetHeight;
    var width = popup.offsetWidth;
    var oleft = popup.offsetLeft;
    var otop = popup.offsetTop;

    var w = window.innerWidth;
    var h = window.innerHeight;

    if ( preventExceedBoundary ) {
        let sizeCss = {};
        let offsetCss = {};
        if ( height > h ) {
            height = h;
            sizeCss.height = height;
        }
        if ( width > w ) {
            width = w;
            sizeCss.width = width;
        }
        if( otop + height >= h ) {
            offsetCss.top = ( h - height ) / 2;
        }
        if( oleft + width >= w ) {
            offsetCss.left = ( w - width ) / 2;
        }
        let ele = dom.get( '.aw-layout-panelContent', popupEl );
        ele && Object.keys( sizeCss ).length > 0 && dom.setStyles( ele, sizeCss );
        Object.keys( offsetCss ).length > 0 && dom.setStyles( popup, offsetCss );
    }

    if ( !disableUpdate ) {
        var left = ( w - width ) / 2;
        var top = ( h - height ) / 2;
        if ( placement === 'top' ) {
            top = 0;
        }
        dom.setStyles( popup, { top, left } );
    }
}

// positioning
function updatePosition( popupRef ) {
    var options = popupRef.options;
    var popupEl = popupRef.panelEl;

    // case1: position at the mouse position
    if ( options.targetEvent && options.targetEvent.type !== 'keydown' && !options.disableUpdate ) {
        setPositionAtMousePosition( popupEl, options.targetEvent );
        // case2: position relative to reference element
    } else if ( options.reference && !options.disableUpdate ) {
        let reference = options.reference;
        // referenceEl could be destroyed in detachMode. need to get it again.
        if ( options.detachMode ) { reference = utils.getElement( utils.extendSelector( options.userOptions.reference ) ); }
        setPosition( popupEl, reference, options );
    } else {
        // case3: position at the page center by default, or top center
        setPositionAtPage( popupEl, options );
    }

    popupRef.intercepters.update && popupRef.intercepters.update( popupEl );
}

function setPosition( popupEl, referenceEl, options ) {
    var containerEl = utils.getContainerElement( popupEl );
    if ( !referenceEl || !containerEl ) { return; }

    // if referenceEl not exist by any reason, popup has no meaning to stay.
    if ( !dom.inDOM( referenceEl ) ) {
        hide( popupEl );
        return;
    }

    if ( options && options.placement ) {
        var offset = positionSrv.calculateOffsets( referenceEl, containerEl, options );

        let { popup, arrow } = offset;
        let { top, bottom, left, right } = popup;
        dom.setStyles( containerEl, { top, bottom, left, right } );

        if ( options.hasArrow && arrow ) {
            let arrowEl = utils.getArrowElement( containerEl );
            arrowEl && dom.setStyles( arrowEl, arrow, true );
        }
    }
}

/**
 * @deprecated afx@3.2.0, use `popupService.update` instead
 * @alternative popupService.update
 * @obsoleteIn afx@5.0.0
 *
 * check and reset the position of the popup , because sometimes the offsetWidth is not correct at the beginning
 *
 * @param {Object} relativeObject - the ui object to position relative to
 * @param {Object} popupWidgetElem - the ui popup object
 * @param {int} offsetWidth - offsetWidth the drop down's offset width
 * @param {int} offsetHeight - offsetHeight the drop down's offset height
 */
let resetPopupPosition = function( relativeObject, popupWidgetElem, offsetWidth, offsetHeight ) {
    var left = popupWidgetElem.offsetLeft;
    var parentEdgeToWindowsRight = popupWidgetElem.clientWidth + relativeObject[0].parentElement.clientWidth;
    var popupToLeft = $( window ).outerWidth() + $( window ).scrollLeft() - parentEdgeToWindowsRight;

    if ( popupWidgetElem.offsetLeft > popupToLeft && popupToLeft > 0 ) {
        left = popupToLeft;
    } else if ( popupWidgetElem.offsetLeft < relativeObject[0].parentElement.clientWidth && popupToLeft > 0 ) {
        left = relativeObject[0].parentElement.clientWidth;
    }
    popupWidgetElem.style.left = left + 'px';
};

/**
 * @deprecated afx@3.2.0, not required anymore
 * @obsoleteIn afx@5.0.0
 *
 *
 * if the position has changed from left-aline to right-aline, then doubleCheck the position
 *
 * @param {Object} relativeObject - the ui object to position relative to
 * @param {Object} popupWidgetElem - the ui popup object
 * @param {int} left - current left value of the popup
 */
let setPositionAfterAlineChange = function( relativeObject, popupWidgetElem, left ) {
    var popupHeaderElem = relativeObject;
    var textBoxOffsetWidth = popupHeaderElem[0].offsetWidth;
    var offsetWidth = popupWidgetElem.offsetWidth;

    var offsetWidthDiff = offsetWidth - textBoxOffsetWidth;
    var RaletiveLeft = $( popupHeaderElem ).offset().left;
    if ( RaletiveLeft - left < offsetWidthDiff ) {
        left = RaletiveLeft - offsetWidthDiff;
    }
    return left;
};

/**
 * @deprecated afx@3.2.0, not required anymore
 * @obsoleteIn afx@5.0.0
 *
 * Set the fixed pop panel position relative to body element.
 */
let setFixedPopupPosition = function( relativeObject, popupWidgetElem ) {
    var offset = relativeObject.offset();
    var width = relativeObject.width();
    var height = relativeObject.height();

    // Distance from the left edge of the text box to the right edge
    // of the window
    // Distance from the left edge of the text box to the left edge of the
    // window
    // If there is not enough space for the overflow of the popup's
    // width to the right of hte text box, and there IS enough space for the
    // overflow to the left of the text box, then right-align the popup.
    // However, if there is not enough space on either side, then stick with
    // left-alignment.

    var left = offset.left;
    var top = offset.top;

    if ( offset.left + width > window.outerWidth ) {
        left = window.outerWidth - width;
    }

    if ( top + height + popupWidgetElem.height() > document.body.offsetHeight ) {
        top -= popupWidgetElem.height();
    } else {
        top += height;
    }

    popupWidgetElem[0].style.left = left + 'px';
    popupWidgetElem[0].style.top = top + 'px';
};

/**
 * @deprecated afx@3.2.0, use `popupService.update` instead
 * @alternative popupService.update
 * @obsoleteIn afx@5.0.0
 *
 * set the position for the popup, using for group-command popup and link-with-popup
 *
 * @param {Object} relativeObject - the ui object to position relative to
 * @param {Object} popupWidgetElem - the ui popup object
 * @param {int} offsetWidth - offsetWidth the drop down's offset width
 * @param {int} offsetHeight - offsetHeight the drop down's offset height
 */
let setPopupPosition = function( relativeObject, popupWidgetElem, offsetWidth, offsetHeight, options ) {
    relativeObject = ngModule.element( relativeObject );
    var popupHeaderElem = relativeObject[0];

    // if popupHeaderElem not exists by any reason, popup has no meaning to stay.
    if ( !dom.inDOM( popupHeaderElem ) ) {
        hide( popupWidgetElem );
        logger.error( `Invalid reference element: ${popupHeaderElem}` );
        return;
    }

    if ( options && options.placement ) {
        const offset = positionSrv.calculateOffsets( popupHeaderElem, popupWidgetElem, options );
        let { popup, arrow } = offset;
        dom.setStyles( popupWidgetElem, {
            top: popup.top,
            left: popup.left
        } );
        if ( options.hasArrow && arrow ) {
            let arrowEl = utils.getArrowElement( popupWidgetElem );
            arrowEl && dom.setStyles( arrowEl, arrow, true );
        }
        return;
    }

    // Calculate left position for the popup. The computation for
    // the left position is bidi-sensitive.
    var textBoxOffsetWidth = popupHeaderElem.offsetWidth;
    var offsetWidthDiff = offsetWidth - textBoxOffsetWidth;

    // Calculate adsolute position for the popup
    // var offset = relativeObject.offset();
    const offset = dom.getOffset( popupHeaderElem );
    var left = offset.left;
    var top = offset.top;

    // Left-align the popup.
    if ( offsetWidthDiff > 0 ) {
        // Make sure scrolling is taken into account, since

        var windowRight = window.outerWidth + window.pageXOffset;
        var windowLeft = window.pageXOffset;
        // Distance from the left edge of the text box to the right edge
        // of the window
        var distanceToWindowRight = windowRight - left;
        // Distance from the left edge of the text box to the left edge of the
        // window
        var distanceFromWindowLeft = left - windowLeft;
        // If there is not enough space for the overflow of the popup's
        // width to the right of hte text box, and there IS enough space for the
        // overflow to the left of the text box, then right-align the popup.
        // However, if there is not enough space on either side, then stick with
        // left-alignment.
        if ( distanceToWindowRight <= offsetWidth && distanceFromWindowLeft >= offsetWidthDiff ) {
            if ( left === popupHeaderElem.offsetLeft ) {
                // Align with the right edge of the text box.
                left -= offsetWidthDiff;
                popupWidgetElem.style.left = left + 'px';
                left = setPositionAfterAlineChange( relativeObject, popupWidgetElem, left );
            } else {
                left = popupHeaderElem.offsetLeft - offsetWidthDiff;
            }
        }
    }

    // Make sure scrolling is taken into account, since
    var windowTop = window.pageYOffset;
    var windowBottom = window.pageYOffset + window.innerHeight;

    // Reference element height
    // offsetHeight only works for block element, using getBoundingClientRect().height to get height for inline element
    var popupHeaderHeight = popupHeaderElem.offsetHeight || popupHeaderElem.getBoundingClientRect().height;

    // Distance from the top edge of the window to the top edge of the
    // text box
    var distanceFromWindowTop = top - windowTop;
    // Distance from the bottom edge of the window to the bottom edge of
    // the text box
    var distanceToWindowBottom = windowBottom - ( top + popupHeaderHeight );

    // If there is not enough space for the popup's height below the text
    // box and there IS enough space for the popup's height above the text
    // box, then position the popup above the text box. However, if there
    // is not enough space on either side, then stick with displaying the
    // popup below the text box.
    // NOTES: this whole section regard positioning will be removed, postionService will take over when all popup revamp work finished.
    var minimumHeight = 80; //experions value from ACE team, check LCS-257608
    var limit = Math.max( minimumHeight, offsetHeight );
    if ( distanceToWindowBottom < limit && // If there is not enough space for the popup's height below and
        ( distanceFromWindowTop >= limit || // or there IS enough space for the popup's height above
            distanceFromWindowTop - distanceToWindowBottom > 0 // or the above space is larger than below space
        )
    ) {
        // then position the popup above
        top -= offsetHeight;
    } else {
        // otherwise stick with displaying the popup below
        top += popupHeaderHeight;
    }

    popupWidgetElem.style.top = top + 'px';
    popupWidgetElem.style.left = left + 'px';

    utils.setMaxHeight( popupHeaderElem, popupWidgetElem );
};

/**
 * @deprecated afx@3.2.0, use `popupService.update` instead
 * @alternative popupService.update
 * @obsoleteIn afx@5.0.0
 *
 * set the position for the popup for orientation case
 *
 * @param {Object} relativeObject - the ui object to position relative to
 * @param {Object} popupWidgetElem - the ui popup object
 */
let setPopupPositionForOrientation = function( relativeObject, popupWidgetElem ) {
    var top = 0;
    var left = 0;

    // Get the width and Height of popup from relative Object
    var popupwidth = parseInt( relativeObject.width, 10 );
    var popupHeight = parseInt( relativeObject.height, 10 );

    // This updated popup top and left is used for reposition the popup according to popup height and width
    var popuptop = parseInt( relativeObject.popuptop, 10 );
    var popupleft = parseInt( relativeObject.popupleft, 10 );

    var speechBubbleHeight = 20;
    var speechBubbleWidth = 15;
    // These values are based on how the position of speech bubble
    // is set in createPopupSpeechBubble of aw-balloon-popup-panel.controller.js
    var popupSpeechBubbleOffset = 5;

    // calculate left and top position for the popup with respect to element
    if ( relativeObject.orientation === 'left' ) {
        top = popuptop;
        left = relativeObject.element.offsetLeft - popupwidth - speechBubbleWidth;
    } else if ( relativeObject.orientation === 'right' ) {
        top = popuptop;
        left = relativeObject.element.offsetLeft + relativeObject.element.offsetWidth + speechBubbleHeight / 2;
        left += popupSpeechBubbleOffset - 2;
    } else if ( relativeObject.orientation === 'top' ) {
        top = relativeObject.element.offsetTop - popupHeight - speechBubbleHeight / 2;
        top -= popupSpeechBubbleOffset;
        left = popupleft;
    } else if ( relativeObject.orientation === 'bottom' ) {
        top = relativeObject.element.offsetTop + speechBubbleHeight / 2 + relativeObject.element.offsetHeight;
        top += popupSpeechBubbleOffset;
        left = popupleft;
    }

    // Assign the width and height to popup from relative Object

    // if block needs to execute only if it is extended tooltip because we need to provide max height and width to popup whereas in other
    // popup flovors like balloonpopup their is no requirement of max limits its has its own width/height configuration.
    try {
        if ( relativeObject.element.popupType && relativeObject.element.popupType === 'extendedTooltip' ) {
            popupWidgetElem.style.maxWidth = 360 + 'px';
            popupWidgetElem.style.maxHeight = 360 + 'px';
            popupWidgetElem.style.minWidth = 0 + 'px';
        } else {
            popupWidgetElem.style.width = popupwidth + 'px';
            popupWidgetElem.style.height = popupHeight + 'px';
        }
    } catch ( e ) {
        trace( 'Error in popup creation', e, relativeObject.element );
    }

    popupWidgetElem.style.top = top + 'px';
    popupWidgetElem.style.left = left + 'px';

    utils.setMaxHeight( relativeObject[0], popupWidgetElem );
};

/**
 * @deprecated afx@3.2.0, use `popupService.hide` instead
 * @alternative popupService.hide
 * @obsoleteIn afx@5.0.0
 *
 * close the popup widget on the event
 *
 * @deprecated, use `hide` instead
 */
let hidePopUp = function( event ) {
    event.stopPropagation();
    var popupWidgetElem = event.data[0];
    var $scope = event.data[1];
    // check if we click on the same link , or if we selected an item
    if ( popupWidgetElem.find( event.target ).length > 0 &&
        popupWidgetElem.find( event.target )[0] === event.target && event.target.localName !== 'li' ) {
        return;
    }

    // if this time the selected item isn't the same with the previous one,then close the popup
    if ( $scope.showPopup && ( event.target.innerText !== $scope.previousSelect || !$scope.previousSelect ) ) {
        var eventData = {
            property: $scope.prop,
            previousSelect: $scope.previousSelect
        };
        // only if we select an item (and not the same with previous selected one), we publish the "awPopupItem.selected" event
        if ( popupWidgetElem.find( event.target ).length > 0 ) {
            eventBus.publish( 'awPopupItem.selected', eventData );
        }
        $scope.$apply( function() {
            $scope.showPopup = false;
        } );
        if ( popupWidgetElem[0].children.length > 1 ) {
            var element = ngModule.element( popupWidgetElem[0].children[1].children );
            element.remove();
        }
    }
    $( 'body' ).off( 'click', hidePopUp );
};

/**
 * @deprecated afx@3.2.0, use `popupService.show` instead
 * @alternative popupService.show
 * @obsoleteIn afx@5.0.0
 *
 * Load view and view model for the provided panel ID and show the UI in a popup.
 *
 * @param {String} popupId - panel id
 *
 * @deprecated, use `show` instead
 */
let showPopup = function( popupId, popUpHeight, popUpWidth ) {
    exports.popupInfo = {};
    if ( angular.isDefined( popUpHeight ) || angular.isDefined( popUpWidth ) ) {
        exports.popupInfo = {
            height: popUpHeight,
            width: popUpWidth
        };
    }

    panelContentService.getPanelContent( popupId ).then(
        function( viewAndViewModelResponse ) {
            panelViewModelService.populateViewModelPropertiesFromJson( viewAndViewModelResponse.viewModel )
                .then( function( declarativeViewModel ) {
                    var scope = RootScope.instance.$new();

                    panelViewModelService.setupLifeCycle( scope, declarativeViewModel );

                    var body = $( 'body' );
                    var element = $( viewAndViewModelResponse.view );

                    element.appendTo( body );

                    AwCompileService.instance( element )( scope );

                    AwTimeoutService.instance( function() {
                        // fix bad design issue of `aw-popup-topAligned`
                        if ( element.find( 'div.aw-popup-topAligned' ).length > 0 ) {
                            element[0].nodeName === 'AW-POPUP' && element.css( { position: 'static' } );
                        }
                        // always keep a reference to original scope for later viewModel destroy, will be deleted when popup detached.
                        var popupScope = ngUtils.getElementScope( element, true );
                        popupScope.originalScope = scope;
                    } );
                } );
        } );
};

let popupService = {
    show,
    update,
    hide
};
export { popupService };

exports = {
    show,
    update,
    hide,
    resetPopupPosition,
    setPositionAfterAlineChange,
    setFixedPopupPosition,
    setPopupPosition,
    setPopupPositionForOrientation,
    hidePopUp,
    showPopup
};
export default exports;

/**
 *
 * @memberof NgServices
 * @member popupService
 */
app.factory( 'popupService', () => exports );
