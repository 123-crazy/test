// Copyright (c) 2020 Siemens
/**
 * This service provides keyboard interaction for list.
 *
 * @module js/ariaList
 * @requires app
 */

/* eslint-disable require-jsdoc */
import keyCode from 'js/keyCode';
import _ from 'lodash';

const ARIA_SELECTED = 'aria-selected';
const LIST_SELECTOR = '.aw-widgets-cellListItem';
const ARRAY_LIST_SELECTOR = '.aw-jswidgets-arrayValueCellListItem';

function ariaList() {
}

ariaList.prototype.init = function( node, options, childSelector ) {
    this.ROLE_OPTION = `[role="${childSelector}"]`;
    this.childSelector = childSelector;
    this.node = node;
    this.options = options;
    this.options.autoScroll = this.options.autoScroll !== false;
    this.options.listSelector = options.listSelector || LIST_SELECTOR;
    this.activeDescendant = null;
    this.resources = [];
    this.handleFocusChange = function() {};
    this.registerEvents();
};

ariaList.prototype.clean = function() {
    this.resources.forEach( ( remove )=>{ remove(); } );
};

ariaList.prototype.registerEvents = function() {
    if( !this.node ) { return; }
    this._setupFocus = this.setupFocus.bind( this );
    this._setupBlur = this.setupBlur.bind( this );
    this._checkKeyPress = this.checkKeyPress.bind( this );
    this._checkClickItem = this.checkClickItem.bind( this );
    this.node.addEventListener( 'focus', this._setupFocus );
    this.node.addEventListener( 'blur', this._setupBlur );
    this.node.addEventListener( 'keydown', this._checkKeyPress );
    this.node.addEventListener( 'click', this._checkClickItem );
    this.resources.push( ()=>{
        this.node.removeEventListener( 'focus', this._setupFocus );
        this.node.removeEventListener( 'blur', this._setupBlur );
        this.node.removeEventListener( 'keydown', this._checkKeyPress );
        this.node.removeEventListener( 'click', this._checkClickItem );
    } );
};

ariaList.prototype.setupFocus = function() {
    // with no elements in list. we still have activeDescent non-null.
    //This will ensure it will try to set-up when we have some listItems.
    if ( this.activeDescendant && this.node.getAttribute( 'tabindex' ) !== '0' ) {
        this.focusItem( this.activeDescendant );
        return;
    }

    // if any pre-selection exist
    let preSelectedItem = this.node.querySelector( `li${this.ROLE_OPTION}[${ARIA_SELECTED}="true"]` );
    if( preSelectedItem ) {
        this.activeDescendant = preSelectedItem;
        this.focusItem( this.activeDescendant );
    }else{
        this.focusFirstItem();
    }
};

ariaList.prototype.checkContextMenu = function( evt ) {
    evt.preventDefault();
    this.options && this.options.apis && this.options.apis.handleContextMenu( evt );
};

ariaList.prototype.setupBlur = function() {
    if ( this.activeDescendant ) {
        this.activeDescendant = null;
    }
};

ariaList.prototype.focusFirstItem = function() {
    var firstItem = this.node.querySelector( this.ROLE_OPTION );
    firstItem && this.focusItem( firstItem );
};
ariaList.prototype.focusLastItem = function() {
    var itemList = this.node.querySelectorAll( this.ROLE_OPTION );
    itemList.length && this.focusItem( itemList[itemList.length - 1] );
};
ariaList.prototype.focusNextItem = function( currentItem, next = true ) {
    var itemList = this.node.querySelectorAll( this.ROLE_OPTION );
    var nextItem = next ? currentItem.nextElementSibling : currentItem.previousElementSibling;
    // if valid nextItem
    if( nextItem && _.indexOf( itemList, nextItem ) !== -1 ) {
        this.focusItem( nextItem );
    }
};

ariaList.prototype.isFocusableListItem = function( evt ) {
    return _.isEqual( evt.target.closest( this.options.listSelector ), document.activeElement );
};

ariaList.prototype.checkClickItem = function( evt ) {
    if( !this.isFocusableListItem( evt ) ) {
        return;
    }

    let element = evt.target.closest( this.options.listSelector );
    this.focusItem( element, true );

    if( this.options.setAriaAttributes ) {
        this.toggleSelectItem( element );
    }
};
ariaList.prototype.toggleSelectItem = function( element ) {
    let existingSelectedItem = this.node.querySelector( `li${this.ROLE_OPTION}[${ARIA_SELECTED}="true"]` );
    if( existingSelectedItem && !_.isEqual( existingSelectedItem, element ) ) {
        existingSelectedItem.setAttribute( ARIA_SELECTED, 'false' );
    }
    element.setAttribute( ARIA_SELECTED, element.getAttribute( ARIA_SELECTED ) === 'true' ? 'false' : 'true' );
};

ariaList.prototype.handleEnterKey = function( evt, ctrlKey, nextItem ) {
    // only valid based on options
    // eg: input with dropdown, the input box already taken enter key, so drop down should pick a alternative
    if( evt.target.getAttribute( 'role' ) === this.childSelector && !this.options.useCtrl || this.options.useCtrl && ctrlKey ) {
        evt.preventDefault();
        if( this.options.setAriaAttributes ) {
            this.toggleSelectItem( nextItem );
        }
        //selection of item should be retained if the tabIndex is still 0. Else follow existing behavior.
        var selectItem;
        if( evt.target.tabIndex === 0 ) {
            selectItem = evt.target;
        } else {
            selectItem = nextItem;
        }
        this.options && this.options.apis && this.options.apis.selectItem( evt, selectItem );
    }
};


ariaList.prototype.handleTabKey = function( evt, shiftKey ) {
    // 1. aw-numeric tab  - ARRAY_LIST_SELECTOR
    // tab key skipped focus once no element left selected.
    // if tabindex is set on node, but no element selected, next focus should be on input element
    // shift key to be false for a forward tabflow.
    if( this.options.listSelector === ARRAY_LIST_SELECTOR
        && this.node.querySelectorAll( this.ROLE_OPTION ).length > 0
        && this.node.querySelectorAll( 'li.aw-state-selected' ).length === 0 && !shiftKey ) {
        evt.preventDefault();
        if( this.node.parentNode
            && this.node.parentNode.nextElementSibling
            && this.node.parentNode.nextElementSibling.querySelector( 'input,textarea' ) ) {
                this.node.parentNode.nextElementSibling.querySelector( 'input,textarea' ).focus();
        }
    }
};

// eslint-disable-next-line complexity
ariaList.prototype.checkKeyPress = function( evt ) {
    if( !this.isFocusableListItem( evt ) ) {
        return;
    }

    var key = evt.key || evt.code;
    var ctrlKey = evt.ctrlKey || evt.metaKey;
    var shiftKey = evt.shiftKey || evt.metaKey;

    // once you remove the last element in the list, activeDescendant should be set to null since its already removed from the actual list.
    if( !_.includes( this.node.querySelectorAll( this.ROLE_OPTION ), this.activeDescendant ) ) {
        this.activeDescendant = null;
    }
    var nextItem = this.activeDescendant || this.node.querySelector( `li${this.ROLE_OPTION}[${ARIA_SELECTED}="true"]` );

    // if no pre - selections, we select the first one and return directly
    if ( !nextItem ) {
        this.setupFocus();
        return;
    }

    switch ( key ) {
    case keyCode.PAGE_UP:
    case keyCode.PAGE_DOWN:
    case keyCode.UP:
    case keyCode.ARROW_UP:
    case keyCode.DOWN:
    case keyCode.ARROW_DOWN:
    case keyCode.LEFT:
    case keyCode.ARROW_LEFT:
    case keyCode.RIGHT:
    case keyCode.ARROW_RIGHT:
        evt.preventDefault();
        if ( key === keyCode.PAGE_UP || key === keyCode.UP || key === keyCode.ARROW_UP || key === keyCode.LEFT || key === keyCode.ARROW_LEFT ) {
            this.focusNextItem( nextItem, false );
        } else {
            this.focusNextItem( nextItem );
        }
        break;
    case keyCode.HOME:
        evt.preventDefault();
        this.focusFirstItem();
        break;
    case keyCode.END:
        evt.preventDefault();
        this.focusLastItem();
        break;
    case keyCode.SPACE:
    case keyCode.RETURN:
    case keyCode.ENTER:
        this.handleEnterKey( evt, ctrlKey, nextItem );
        break;
    case keyCode.TAB: // tabstop fix
        this.handleTabKey( evt, shiftKey );
        break;
    case keyCode.CONTEXTMENU:
        this.checkContextMenu( evt );
        break;
    default:
        break;
    }
};

ariaList.prototype.roveTabIndex = function( activeElement ) {
    if ( !activeElement ) { return; }
    activeElement.setAttribute( 'tabindex', -1 );
};

ariaList.prototype.focusItem = function( element, isMouseClick ) {
    this.roveTabIndex( this.activeDescendant );
    //Set tabindex='-1' on the element that needs JS focus
    element.setAttribute( 'tabindex', 0 );
    element.focus();

    this.setHandleFocusChangeOnItem( element );
    this.activeDescendant = element;

    if( this.options.autoScroll && !isMouseClick ) {
        element.scrollIntoView( { behavior: 'smooth', block: 'center', inline: 'nearest' } );
    }
    this.handleFocusChange( null, element );

    //Remove tabindex from parent(ul) as one of the child elements(li) now have tabindex set
    if( this.node.getAttribute( 'tabindex' ) === '0' ) {
        this.node.setAttribute( 'tabindex', -1 );
    }
};
ariaList.prototype.setHandleFocusChange = function( focusChangeHandler ) {
    this.handleFocusChange = focusChangeHandler;
};

ariaList.prototype.setHandleFocusChangeOnItem = function( element ) {
    let handleFocusChangeOnItem = () => {
        this.handleFocusChange( null, element );
    };

    let handleBlurOnItem = ( ) => {
        setTimeout( () => {
            // timeout is required to get the next focused element
            this.options.apis.handleBlurOnItem( element, document.activeElement );
        } );
    };

    if( this.activeDescendant ) {
        this.activeDescendant.removeEventListener( 'focus', handleFocusChangeOnItem );
        this.activeDescendant.removeEventListener( 'blur', handleBlurOnItem );
    }

    element.addEventListener( 'focus', handleFocusChangeOnItem );
    element.addEventListener( 'blur', handleBlurOnItem );
};

export default ariaList;
