/* eslint-disable no-invalid-this */
// Copyright (c) 2020 Siemens

/**
 * Customizing and overriding functions from (jquery.noty.js)
 *
 * @module js/jquery.noty.customized
 */
import $ from 'jquery';
import ngModule from 'angular';
import ngUtils from 'js/ngUtils';
import wcagSvc from 'js/wcagService';
import localeSvc from 'js/localeService';
import 'noty';

$.noty.pinnedMessage = [];

var _iconSvc;

/**
 * Brings focus on the element after tab press form keyboard
 * related to WCAG work
 * @param {popup} notification message popup
 */
var makeCloseButtonKeyboardAccessible = function( popup ) {
    let closeButton = popup.$closeButton;
    closeButton.attr( 'tabindex', '0' );
    closeButton.attr( 'role', 'button' );
    localeSvc.getLocalizedText( 'NotyMessages', 'closeNotification' ).then( function( localizedVal ) {
        closeButton.attr( 'aria-label', localizedVal );
    } ).catch( () => {} );
    closeButton.keydown( function( evt ) {
        if( wcagSvc.isValidKeyPress( evt ) ) {
            popup.stopPropagation( evt );
            popup.close();
        }
    } );
};

/**
 * Has user pressed click or enter key on noty message
 *
 * @param {event}
 */
var hasUserClickedOrPressesEnter = function( evt ) {
    return evt.type &&
           evt.type === 'click' ||
           evt.type === 'keydown' && wcagSvc.isValidKeyPress( evt );
};

/**
 * @param {Object} notification - notification
 * @returns {Object} notification
 */
var customizedShow = function( notification ) {
    var self = notification; // eslint-disable-line consistent-this
    self.key = new Date().getTime();

    // adding new css class if buttons are present
    if( self.options.buttons ) {
        self.$bar.find( '.noty_message' ).addClass( 'message_with_buttons' );
    }

    self.options.custom ? self.options.custom.find( self.options.layout.container.selector ).append( self.$bar ) : $( self.options.layout.container.selector ).append( self.$bar );

    if( self.options.theme && self.options.theme.style ) {
        self.options.theme.style.apply( self );
    }

    $.type( self.options.layout.css ) === 'function' ? notification.options.layout.css.apply( self.$bar ) : self.$bar.css( notification.options.layout.css || {} );

    self.$bar.addClass( self.options.layout.addClass );
    if( !self.options.custom ) {
        // Add the image to pin icon and hide the icon in the beginning
        self.$closeButton.empty();
        self.$closeButton.hide();
        if( $.inArray( 'X', self.options.closeWith ) > -1 ) {
            self.$closeButton.append( _iconSvc.getIcon( 'uiClose' ) );
        } else {
            self.$closeButton.append( _iconSvc.getCmdIcon( 'Pin' ) );
        }

        // following WCAG
        makeCloseButtonKeyboardAccessible( self );
    }

    self.options.layout.container.style.apply( $( self.options.layout.container.selector ) );

    self.showing = true;

    if( self.options.theme && self.options.theme.style ) {
        self.options.theme.callback.onShow.apply( notification );
    }

    if( $.inArray( 'click', self.options.closeWith ) > -1 ) {
        self.$bar.css( 'cursor', 'pointer' ).one( 'click', function( evt ) {
            self.stopPropagation( evt );
            if( self.options.callback.onCloseClick ) {
                self.options.callback.onCloseClick.apply( self );
            }
            self.close();
        } );
    }

    if( $.inArray( 'hover', self.options.closeWith ) > -1 ) {
        self.$bar.one( 'mouseenter', function() {
            self.close();
        } );
    }

    if( $.inArray( 'button', self.options.closeWith ) > -1 ||
        $.inArray( 'X', self.options.closeWith ) > -1 ) {
        self.$closeButton.one( 'click', function( evt ) {
            self.stopPropagation( evt );
            self.close();
        } );
    }

    // feature which makes the popup to stay when user clicks on it
    if( $.inArray( 'stayOnClick', self.options.closeWith ) > -1 ) {
        self.$bar.one( 'click keydown', function( evt ) {
            // If there is previously pinned message, clear it first
            /* if( $.noty.pinnedMessage !== undefined ) {
                $.noty.pinnedMessage.close();
                $.noty.pinnedMessage = undefined;
            }*/

            if( hasUserClickedOrPressesEnter( evt ) ) {
                $.noty.pinnedMessage.push( self.key );

                self.stopPropagation( evt );

                // clear the auto-dismissal of the notifications.
                clearTimeout( self.$timeout );
                self.isTimeoutActive = false;

                self.$closeButton.one( 'click', function( evt ) {
                    self.stopPropagation( evt );
                    self.close();
                    var position = $.noty.pinnedMessage.indexOf( self.key );
                    // remove from pinned array
                    if( position > -1 ) {
                        $.noty.pinnedMessage.splice( position, 1 );
                    }
                } );
            }
        } );
    }

    // We want $closeButton to still be available because we are using 'stayOnClick' for closeWith option.
    // When notifications are pinned, the only way to close them would be using the $closeButton click.
    // Note that $closeButton is jQuery reference to div element with class '.noty_close' defined in the default template.
    // See $.noty.defaults.template in jquery.noty.js; Override this behavior from default.
    if( $.inArray( 'button', self.options.closeWith ) === -1 &&
        $.inArray( 'X', self.options.closeWith ) === -1 &&
        $.inArray( 'stayOnClick', self.options.closeWith ) === -1 ) {
        self.$closeButton.remove();
    }

    if( self.options.callback.onShow ) {
        self.options.callback.onShow.apply( self );
    }

    self.$bar.animate( self.options.animation.open, self.options.animation.speed, self.options.animation.easing,
        function() {
            if( !self.options.custom ) {
                self.$closeButton.show();
            }
            if( self.options.callback.afterShow ) {
                self.options.callback.afterShow.apply( self );
            }
            self.showing = false;
            self.shown = true;
        } );

    // If noty is have a timeout option
    if( self.options.timeout ) {
        self.$timeout = setTimeout( function() {
            self.close();
        }, self.options.timeout );
        self.isTimeoutActive = true;
    }

    //wcag region violation fix. role='complementary' for notifications
    self.$bar.find( '.noty_bar' ).attr( 'role', 'alert' );
    self.$bar.find( '.noty_bar' ).attr( 'tabindex', '0' );
    self.$bar.attr( 'aria-live', 'assertive' );
    self.$bar.find( '.noty_bar' ).addClass( 'noty_msg' );

    return notification;
};

/**
 * Create a new child scope based on the document's scope.
 * <P>
 * Note: We do not want to use the 'root' scope for inserting new elements into since it has been shown to not be
 * the one the API is eventually added to (it will be a child of it anyway).
 * <P>
 * Insert and compile directives into notification pop-up
 *
 * @param {Object} notification - notification
 */
var insertCustomElement = function( notification ) {
    if( !notification || !notification.options || !notification.options.messageData ||
        !notification.options.messageData.isCustomElem ) {
        return;
    }

    if( notification && notification.$bar && notification.options.text ) {
        var docNgElement = ngModule.element( document.body );
        var docScope = docNgElement.scope();

        var parentScope = docScope.$new();

        $( 'ul#noty_bottom_layout_container' ).data( '$scope', parentScope );

        var parentElement = $( notification.$bar[ 0 ] ).find( 'span.noty_text' );

        /**
         * Create an 'outer' <DIV> (to hold the given 'inner' HTML) and create the angular controller on it.
         * <P>
         * Remove any existing 'children' of the given 'parent'
         * <P>
         * Add this new element as a 'child' of the given 'parent'
         */
        var ctrlElement = ngModule.element( '<div class="aw-jswidgets-notyContainer" ></div>' );

        ctrlElement.html( notification.options.text );

        if( parentElement ) {
            $( parentElement ).empty();
            $( parentElement ).append( ctrlElement );
        }

        parentScope.subPanelContext = notification.options.messageData;

        ngUtils.include( parentElement, ctrlElement );
    }
};

/**
 * Prepare an object like one for aw-popup-panel-2. This is consumed by wcag service to return focus
 * back to the sorce element.
 *
 * @param {*} notification
 * @param {sourceElement} which had focus before the noty message was displayed
 */
var mimicNotyMsgLikePopup = function( notification, sourceElement ) {
    let popupRef = {
        panelEl: '',
        options: {
            reference: ''
        },
        sourceElement: ''
    };
    popupRef.panelEl = notification.$bar.parent()[ 0 ];
    popupRef.options.reference = sourceElement;
    return popupRef;
};

/**
 * Determine if focus is inside the noty msg
 *
 * @param {notification} notification
 */
var isFocusInsideNotyMsg = function( notification ) {
    let msgHTMLcontent = notification.$bar.parent();
    let focusedElementsInsideNoty = msgHTMLcontent.find( document.activeElement );
    return focusedElementsInsideNoty.length !== 0;
};

/**
 * As soon as noty msg opens up, it should get the focus
 *
 * @param {notification} notification
 */
var grabFocusOnNotyMsg = function( notification ) {
    let removeListeners = [];

    let elementTriggeringNotyMsg = document.activeElement.parentElement;

    var giveFocusBackToSourceElement = function() {
        if( this && isFocusInsideNotyMsg( this ) ) {
            // If a child command trigerrs noty msg then elementTriggeringNotyMsg points to the child command
            // But on popup closure the parent command gets the focus and hence should be used as elementTriggeringNotyMsg
            let parentCommand = wcagSvc.getParentOfGroupCmds();
            if( parentCommand ) {
                elementTriggeringNotyMsg = parentCommand;
                wcagSvc.setParentOfGroupCmds( null );
            }
            wcagSvc.skipToFirstFocusableElement( elementTriggeringNotyMsg );
        }
        this.options.removeListeners.forEach( listener => {
            listener();
        } );
    };
    notification.options.callback.afterClose = giveFocusBackToSourceElement;

    let notyParentElement = notification.$bar.parent();
    wcagSvc.skipToFirstFocusableElement( notyParentElement[ 0 ] );

    let popupRef = mimicNotyMsgLikePopup( notification, notyParentElement[ 0 ] );
    let handlers = wcagSvc.configureAutoFocus( popupRef );
    removeListeners.push( ...handlers );
    notification.options.removeListeners = removeListeners;
};

/**
 * overriding show method of '$.notyRenderer'
 *
 * @param {Object} notification - notification
 */
export let show = function( notification ) {
    if( notification.options.modal ) {
        $.notyRenderer.createModalFor( notification );
        $.notyRenderer.setModalCount( +1 );
    }

    // Where is the container?
    if( notification.options.custom ) {
        if( notification.options.custom.find( notification.options.layout.container.selector ).length === 0 ) {
            notification.options.custom.append( $( notification.options.layout.container.object ).addClass(
                'layoutContainer' ) );
        } else {
            notification.options.custom.find( notification.options.layout.container.selector ).removeClass(
                'layoutContainer' );
        }
    } else {
        if( $( notification.options.layout.container.selector ).length === 0 ) {
            $( 'body' ).append( $( notification.options.layout.container.object ).addClass( 'layoutContainer' ) );
        } else {
            $( notification.options.layout.container.selector ).removeClass( 'layoutContainer' );
        }
    }

    $.notyRenderer.setLayoutCountFor( notification, +1 );

    // customized show method
    customizedShow( notification );

    grabFocusOnNotyMsg( notification );

    insertCustomElement( notification );
};
$.notyRenderer.show = show;

/**
 * Fix for 'modal option with custom css theme', which is fixed in release 2.2.2.<br>
 * Remove this once upgraded to Noty 2.2.2
 *
 * @param {Object} notification - notification
 */
export let createModalFor = function( notification ) {
    if( $( '.noty_modal' ).length === 0 ) {
        var modal = $( '<div></div>' ).addClass( 'noty_modal' ).addClass( notification.options.theme ).data(
            'noty_modal_count', 0 );

        if( notification.options.theme.modal && notification.options.theme.modal.css ) {
            modal.css( notification.options.theme.modal.css );
        }

        modal.prependTo( $( 'body' ) ).fadeIn( 'fast' );
    }
};
$.notyRenderer.createModalFor = createModalFor;

/**
 * Sets the svg content for the icons - pin and unpin+
 *
 * @param {Object} iconSvc - icon service
 */
export let setIconService = function( iconSvc ) {
    _iconSvc = iconSvc;
};
$.notyRenderer.setIconService = setIconService;

/**
 * Passthrough method for close.
 *
 */
export let close = function() {
    $.noty.clearQueue();
    $.each( $.noty.store, function( id, noty ) {
        if( $.noty.pinnedMessage.indexOf( noty.key ) <= -1 ) {
            noty.close();
        }
    } );
};
$.notyRenderer.close = close;

/** **************************************************************************** */
/** Customizing JavaScript for noty bottom layout (bottom.js) * */
/** **************************************************************************** */
$.noty.layouts.bottom = {
    name: 'bottom',
    options: {},
    container: {
        object: '<ul id="noty_bottom_layout_container" ></ul>',

        selector: 'ul#noty_bottom_layout_container',

        style: function() {
            $( this ).css( {
                //
            } );
        }
    },
    parent: {
        object: '<li ></li>',
        selector: 'li',
        css: {}
    },
    css: {
        display: 'none'
    },
    addClass: ''
};

export let init = $.notyRenderer.init;
export let render = $.notyRenderer.render;

export let getModalCount = $.notyRenderer.getModalCount;
export let setModalCount = $.notyRenderer.setModalCount;

export let getLayoutCountFor = $.notyRenderer.getLayoutCountFor;
export let setLayoutCountFor = $.notyRenderer.setLayoutCountFor;

export default $.notyRenderer;
