// Copyright (c) 2020 Siemens

/**
 * Defines {@link wcagService} which provides services for accessibility related functionalities
 *
 * @module js/wcagService
 */
import $ from 'jquery';
import localeSvc from 'js/localeService';
import { checkIgnore } from 'js/popupHelper';
import logger from 'js/logger';
import _ from 'lodash';
import domUtils from 'js/domUtils';

let exports = {};
let dom = domUtils.DOMAPIs;
let groupCmdParent = null;
let focusableCandidates = [ 'button:not(.disabled), [href]:not(.disabled), input:not(.disabled), select:not(.disabled), textarea:not(.disabled), [tabindex]:not(.disabled)' ];
const ENTER_KEY_CODE_VALUE = 'Enter';
const SPACE_KEY_CODE_VALUE = 'Space';
const MAIN_SELECTOR = 'main.aw-layout-workareaMain';

/**
 * Helper function to update aria-label on targetelement located by childlocator
 * @param {Object} containerDOMElement - The element which contains landmark element
 * @param {string} childLocator - string identifying landmakr element within containerDOMElement
 * @param {string} messageFile Name of file containing messages
 */
export let updateArialabel = function( containerDOMElement, childLocator, messageFile ) {
    let targetElement = null;
    if( containerDOMElement === null ) {
        targetElement = $( childLocator ).length > 0 ? $( childLocator )[ 0 ] : null;
    } else if( $( containerDOMElement ).find( childLocator ).length > 0 ) {
        targetElement = $( containerDOMElement ).find( childLocator )[ 0 ];
    } else if( childLocator.length === 0 ) {
        targetElement = containerDOMElement;
    }
    if( targetElement !== null ) {
        let ariaLabelKey = targetElement.getAttribute( 'aria-label' ).substring( 5 );
        localeSvc.getLocalizedText( messageFile, ariaLabelKey ).then( function( localizedVal ) {
            targetElement.setAttribute( 'aria-label', localizedVal );
        } );
    }
};

/**
 * This API is a helper function to add aria-label to duplicate 'main' landmarks.
 *
 */
export let updateArialabelForDuplicateLandmarks = function() {
    let mainEls = document.querySelectorAll( MAIN_SELECTOR );
    let cnt = 1;
    // below check is to ensure we do not have this attribute set in case there is just one
    // instance of the landmark on a page
    if( mainEls && mainEls.length !== 1 ) {
        for( let i = 0; i < mainEls.length; i++ ) {
            localeSvc.getLocalizedText( 'UIElementsMessages', 'mainLabel' ).then( function( localizedVal ) {
                let ariaLabelledByAttr = document.createAttribute( 'aria-label' );
                ariaLabelledByAttr.value = localizedVal + cnt;
                cnt++;
                mainEls[ i ].setAttributeNode( ariaLabelledByAttr );
            } );
        }
    }
};

/**
 * This API is a helper function to add missing button in form to avoid SiteImprove violations.
 *
 */
export let updateMissingButtonInForm = function( containerDOMElement ) {
    if( containerDOMElement ) {
        let BUTTON_CLASS = 'aw-hide-form-button';
        let BUTTON_EL = 'button';
        let formElem = null;
        if( containerDOMElement.tagName && containerDOMElement.tagName === 'FORM' ) {
            formElem = containerDOMElement;
        } else {
            formElem = containerDOMElement.querySelector( 'form' );
        }
        // intent is to check for the presence of dummy hidden disabled button. Not necessary to check the
        // presence of an already existing functional button within the form since even if one or more
        // functional buttons exist within the form , it does not cause any functional failures because
        // the dummy button is disabled and hence not submit-able.
        if( !formElem.querySelector( BUTTON_EL + '.' + BUTTON_CLASS ) ) {
            let buttonNode = document.createElement( BUTTON_EL );
            buttonNode.type = 'submit';
            buttonNode.classList.add( BUTTON_CLASS );
            buttonNode.disabled = true;
            buttonNode.setAttribute( 'aria-hidden', true );
            formElem.appendChild( buttonNode );
        }
    }
};


/**
 * This API is a helper function to find all the focusable children of a DOMElement.
 *
 * @param {DOMElement} containerElement the container to look for focusable children
 * @return {NodeList} all the focusable children
 */
export let findFocusableChildren = function( containerElement ) {
    return containerElement.querySelectorAll( focusableCandidates );
};

/**
 * Finds the next focusable child in the containing element if one child is already focused.
 * Otherwise, can send first focusable child
 *
 * @param {DOMElement} containerElement Element to seach through for children
 * @param {boolean} returnFirstChildIfNone whether to return first focusable child if no next child found
 * @return {Node} next focusable child, or first focusable child if none found (option)
 */
export let findNextFocusableChild = function( containerElement, returnFirstChildIfNone ) {
    let nextFocusableChild = null;
    const focusableElements = findFocusableChildren( containerElement );
    if( focusableElements && focusableElements.length ) {
        for( let i = 0; i < focusableElements.length; i++ ) {
            if( focusableElements[ i ] === document.activeElement ) {
                if( i + 1 < focusableElements.length ) {
                    nextFocusableChild = focusableElements[ i + 1 ];
                }
                break;
            }
        }
        if( !nextFocusableChild && returnFirstChildIfNone ) {
            nextFocusableChild = focusableElements[ 0 ];
        }
    }
    return nextFocusableChild;
};

/**
 * Finds the previous focusable child in the containing element if one child is already focused.
 * Otherwise, can send last focusable child
 *
 * @param {DOMElement} containerElement Element to seach through for children
 * @param {boolean} returnLastChildIfNone whether to return last focusable child if no previous child found
 * @return {Node} previous focusable child, or last focusable child if none found (option)
 */
export let findPreviousFocusableChild = function( containerElement, returnLastChildIfNone ) {
    let previousFocusableChild = null;
    const focusableElements = findFocusableChildren( containerElement );
    if( focusableElements && focusableElements.length ) {
        for( let i = 0; i < focusableElements.length; i++ ) {
            if( focusableElements[ i ] === document.activeElement ) {
                if( i > 0 ) {
                    previousFocusableChild = focusableElements[ i - 1 ];
                }
                break;
            }
        }
        if( !previousFocusableChild && returnLastChildIfNone ) {
            previousFocusableChild = focusableElements[ focusableElements.length - 1 ];
        }
    }
    return previousFocusableChild;
};

export let setParentOfGroupCmds = function( referenceElement ) {
    groupCmdParent = referenceElement;
};

export let getParentOfGroupCmds = function() {
    return groupCmdParent;
};

let isNotyMsgPresentInDOM = function( notyMessageContainer ) {
    return document.body.contains( notyMessageContainer );
};

let isNotyMsgNotfocussed = function( focussableElements ) {
    return document.activeElement !== focussableElements[ 0 ];
};

let renderFocusToNotyMsg = function() {
    let notyMsgContainerId = 'noty_bottom_layout_container';
    let notyMessageContainer = document.getElementById( notyMsgContainerId );

    if( isNotyMsgPresentInDOM( notyMessageContainer ) ) {
        let focussableElements = findFocusableChildren( notyMessageContainer );
        if( isNotyMsgNotfocussed( focussableElements ) ) {
            focussableElements[ 0 ].focus();
        }
    }
};

export let skipToFirstFocusableElement = function( container, checkActiveFocusInContainer, selectedElementCSS ) {
    // If there is already focused element in container, donot skip to focusbale ele
    let currentFocusedEle = document.activeElement;
    if( container === undefined || container === null || checkActiveFocusInContainer !== false && container.contains( currentFocusedEle ) ) {
        return true;
    }

    let elementLoading = $( container ).find( '.aw-element-loading' );
    if( elementLoading.length === 0 ) {
        // If there is no element in loading state, then only start focus
        //Try focus on first selected element
        if( selectedElementCSS && selectedElementCSS.length > 0 ) {
            let elementToFocus = $( container ).find( selectedElementCSS );
            if( elementToFocus.length > 0 ) {
                elementToFocus[ 0 ].focus();
                renderFocusToNotyMsg();
                if( document.activeElement === elementToFocus[ 0 ] ) {
                    //Focus successful
                    return true;
                }
            }
        }
        let focusable = findFocusableChildren( container );
        if( focusable && focusable.length > 0 ) {
            for( let focusableEle of focusable ) {
                if( $( focusableEle ).is( ':visible' ) ) {
                    focusableEle.focus();
                    renderFocusToNotyMsg();
                    return true;
                }
            }
        } else {
            //Check if element it self is focusable
            container.focus();
            renderFocusToNotyMsg();
            if( document.activeElement === container ) {
                //Focus successful
                return true;
            }
        }
    }
    return false;
};

let trapFocus = ( panelRef ) => ( event ) => {
    let { panelEl: element, options } = panelRef;

    // apply exclude cases- LCS-443560 - Commands in overflow do not process events after SOA completion
    if( checkIgnore( options, event.target ) ) { return; }

    // If new focus element is NOT in current popup element, focus on reference and hide
    if( !element.contains( event.target )  && ( panelRef.nextPopup === undefined || panelRef.nextPopup === null ) ) {
        let isSkippedFocus = false;
        // only do this when tab move to the last element
        if( event.target.id && event.target.id.includes( element.id ) ) {
            skipToFirstFocusableElement( panelRef.options.reference, panelRef.options.checkActiveFocusInContainer );
            isSkippedFocus = true;

            // do not hide an element if the api not available, for example noty_msg should not be hidden
            // once focus reaches the sentinel
            if( panelRef.options.api ) {
                panelRef.options.api.hide( panelRef, isSkippedFocus );
            }
        }
    }
};

// Bracket the dialog node with two invisible, focusable nodes.
// While this dialog is open, we use these to make sure that focus never
// leaves the document even if dialogNode is the first or last node.
let createSentinel = ( element ) => {
    let preDiv = document.createElement( 'div' );
    let preNode = element.parentNode.insertBefore( preDiv, element );
    preNode.tabIndex = 0;
    preNode.id = `pre-${element.id}`;

    let postDiv = document.createElement( 'div' );
    let postNode = element.parentNode.insertBefore( postDiv, element.nextSibling );
    postNode.tabIndex = 0;
    postNode.id = `post-${element.id}`;
    return () => {
        if( element.parentNode ) {
            //check for presence before removing
            if( _.includes( element.parentNode.childNodes, preNode ) ) {
                element.parentNode.removeChild( preNode );
            }
            if( _.includes( element.parentNode.childNodes, postNode ) ) {
                element.parentNode.removeChild( postNode );
            }
        }
    };
};

let configureFocusListener = ( panelRef ) => {
    const focusHandler = trapFocus( panelRef );
    document.addEventListener( 'focus', focusHandler, true );

    return () => {
        document.removeEventListener( 'focus', focusHandler, true );
    };
};

export let configureAutoFocus = function( panelRef ) {
    const removeHandlers = [];
    removeHandlers.push( createSentinel( panelRef.panelEl ) );
    removeHandlers.push( configureFocusListener( panelRef ) );

    return removeHandlers;
};

export let focusFirstDescendantWithDelay = function( element, selectedElementCSS ) {
    let timer = setInterval( () => {
        // if not existed anymore or element is already rendered
        if( !element ) {
            clearInterval( timer );
            return;
        }
        // still available
        if( element.childNodes ) {
            for( var i = 0; i < element.childNodes.length; i++ ) {
                var child = element.childNodes[ i ];
                if( child.tagName && skipToFirstFocusableElement( child, null, selectedElementCSS ) ) {
                    clearInterval( timer );
                    return true;
                }
            }
        }
    }, 50 );
    // clean resource when reach max limit
    setTimeout( () => clearInterval( timer ), 5000 );
};

/**
 * Helper function to add 'Skip to Main' functionality in order to support
 * enter/click option on 'Skip to Main' Bypass block
 * @param {data} Viewmodel data
 */
export let initializeSkipToMain = function( data ) {
    data.skipToMainClickEvent = function() {
        let mainElement = document.querySelector( MAIN_SELECTOR );
        if( mainElement ) {
            let focusable = findFocusableChildren( mainElement );
            if( focusable && focusable.length > 0 ) {
                let firstFocusable = focusable[ 0 ];
                firstFocusable.focus();
            }
        } else {
            logger.error( 'missing main landmark' );
        }
    };
};

/**
 *  Helper function to apply/unapply focus to 'main' landmark when
 *  a page is focussed for the first time using tab click and when
 *  Skip to main link gets focussed
 */
export let applyFocusOnMain = function() {
    let skipToMainLinkElem = null;
    let mainElement = document.querySelector( MAIN_SELECTOR );
   // skipToMainLinkElem = $( 'a.aw-skip-to-main' );
    skipToMainLinkElem = document.querySelector( 'a.aw-skip-to-main' );
    if( skipToMainLinkElem !== null ) {
        dom.on( skipToMainLinkElem, 'focus', () => {
            mainElement.classList.add( 'aw-apply-focus-to-main' );
        } );
        dom.on( skipToMainLinkElem, 'blur', () => {
            mainElement.classList.remove( 'aw-apply-focus-to-main' );
        } );
    }
};

/**
 * get key name - supports modern browsers and IE11
 *
 * @param {Object} event keyboard event object ($event)
 * @returns {String} key name
 */
export let getKeyName = function( event ) {
    // change space key to string literal 'Space'
    return event.key === ' ' ? SPACE_KEY_CODE_VALUE : event.key;
};

/**
 * check if the keyboard event is equivalent to a mouse click
 *
 * @param {Object} event keyboard event object ($event)
 * @param {boolean} ignoreSpacebar - if the element accepts space as a valid key stroke eg: lov
 * @returns {boolean} true if valid synthetic 'click' pressed
 */
let isValidKeyPress = function( event, ignoreSpacebar ) {
    let keyPressed = getKeyName( event );
    if( ignoreSpacebar ) {
        if( keyPressed === ENTER_KEY_CODE_VALUE ) {
            return true;
        }
    } else {
        // Default space bar press scrolls the page. Preventing that behavior
        if( keyPressed === SPACE_KEY_CODE_VALUE ) {
            event.preventDefault();
        }
        // Check if keyboard event is equivalent to a mouse click
        if( keyPressed === ENTER_KEY_CODE_VALUE || keyPressed === SPACE_KEY_CODE_VALUE ) {
            return true;
        }
    }
    return false;
};

export let handleMoveUpOrDown = ( event, container ) => {
    let keyPressed = getKeyName( event );
    if( keyPressed === 'ArrowUp' || keyPressed === 'ArrowDown' ) {
        if( event.key === 'ArrowUp' ) {
            event.preventDefault();
            const nextChildUp = findPreviousFocusableChild( container, true );
            nextChildUp && nextChildUp.focus();
        } else {
            event.preventDefault();
            const nextChildDown = findNextFocusableChild( container, true );
            nextChildDown && nextChildDown.focus();
        }
    }
};

// When Element is removed from DOM/ mouse clicked, then focus is lost and then
// on next press of tab, where should be focus starting point- we have to manually manage focus
// In order to do this, we add 'aw-focus-startpoint' CSS to element that will be focus starting
// point on next press of tab key press -check solution below
//https://sarahmhigley.com/writing/focus-navigation-start-point/#assistive-tech-support
export let updateFocusStartPoint = ( eletoUpdateFocus ) => {
    if( eletoUpdateFocus !== null ) {
        //Remove flying focus from any existing elements
        $( '.aw-focus-startpoint' ).removeClass( 'aw-focus-startpoint' );
        //Update flying focus on
        eletoUpdateFocus.classList.add( 'aw-focus-startpoint' );
    }
};

/**
 * use this function when you want to programatically focus an element
 * and show the focus style normally reserved for keyboard-mode.
 * @param {Object} elementToFocus - dom element about to get focus
 */
export let afxFocusElement = ( elementToFocus ) => {
    elementToFocus.focus();
    document.body.classList.add( 'keyboard' );
};

/**
 * use this function to check if the user is operating in keyboard-mode.
 * This is determined based on the user's most recent action.
 * returns true if from keyboard. 'false' if from mouse.
 */
export let areWeInKeyboardMode = () => {
    if( document.body.classList.contains( 'keyboard' ) ) {
        return true;
    }
    return false;
};


exports = {
    updateArialabel,
    updateArialabelForDuplicateLandmarks,
    updateMissingButtonInForm,
    initializeSkipToMain,
    findFocusableChildren,
    findNextFocusableChild,
    findPreviousFocusableChild,
    skipToFirstFocusableElement,
    focusFirstDescendantWithDelay,
    applyFocusOnMain,
    isValidKeyPress,
    configureAutoFocus,
    setParentOfGroupCmds,
    getParentOfGroupCmds,
    getKeyName,
    handleMoveUpOrDown,
    updateFocusStartPoint,
    afxFocusElement,
    areWeInKeyboardMode
};

export default exports;
