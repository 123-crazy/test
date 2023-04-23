// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.commandOverflowService} which manages command panels.
 *
 * @module js/commandOverflow.service
 */

import eventBus from 'js/eventBus';
import popupSvc from 'js/popupService';

/**
 * Command service to manage commands.
 */
let exports = {};

/**
 * Toggle command overflow popup
 *
 * Ensure only one group command popup in command bar overflow,
 * close the previous group command popup when open another group command
 *
 * @returns {Object} APIs to handle group command popup in command overflow
 *
 */
export let overflowPopupHandler = function() {
    var popupRefSaved = null;
    var overflowPopupCloseHandle;

    return {
        toggleOverflowPopup: function( refElement, placement, scope ) {
            //close the popup if already opened
            if( popupRefSaved ) {
                return popupSvc.hide( popupRefSaved ).then( ( res ) => {
                    popupRefSaved = null;
                    return res;
                } );
            }

            // merge the user options
            var options = {
                whenParentScrolls: 'follow',
                resizeToClose: true,
                placement: placement,
                reference: refElement,
                autoFocus: true,
                forceCloseOthers: false,
                ignoreClicksFrom: [ 'div.noty_bar' ],
                hooks: {
                    whenClosed: () => {
                        popupRefSaved = null;
                        this.dispose();
                    }
                }
            };
            return popupSvc.show( {
                templateUrl: '/html/aw-popup-command-bar.overflow-popup-template.html',
                context: scope,
                options
            } ).then( ( popupRef ) => {
                popupRefSaved = popupRef;

                // make sure command overflow popup closed when any group child command executed
                this.ensureCloseOverflowPopupWhenGroupCmdExecuted();
            } );
        },
        // make sure overflow popup close properly when any child command from group command executed on command overflow popup
        // for group command popup in overflow popup case, it works like secondary menu, so need setup close reaction
        ensureCloseOverflowPopupWhenGroupCmdExecuted: function() {
            overflowPopupCloseHandle = eventBus.subscribe( 'awPopupCommandCell.commandExecuted', function( data ) {
                popupSvc.hide( popupRefSaved );
            } );
        },
        dispose: function() {
            if( overflowPopupCloseHandle ) {
                eventBus.unsubscribe( overflowPopupCloseHandle );
                overflowPopupCloseHandle = null;
            }
        }
    };
};

/**
 * Checks if overflow occurred on the specified command on the command bar.
 *
 * The closure function arguments:
 * @param {Element} cmdBarElem the command bar element
 * @param {String} cmdBarAlignment the command bar alignment
 * @param {Element} cmdElem the command element to check overflow.
 *                  Optional, if not specified, will check the last command element in command container.
 * @returns {Boolean} A boolean telling whether overflow occurred or not.
 */
export let hasOverflow = ( cmdBarElem, cmdBarAlignment, cmdElem ) => {
    let propName = cmdBarAlignment === 'HORIZONTAL' ? 'offsetTop' : 'offsetLeft';
    let commandElem = cmdElem || cmdBarElem.querySelector( '.aw-commands-wrapper:not(.aw-commands-overflow)' ).lastElementChild;

    //We just check the element's offsetTop against the container's offset top to determine if there's an overflow
    //Same for the vertical bar
    if( !cmdBarElem || !commandElem ) {
        return false;
    }

    return commandElem[ propName ] > cmdBarElem[ propName ];
};

export let updateTabIndexOnOverflow = function( cmdBarElem, cmdBarAlignment ) {
    let commandElems = cmdBarElem.querySelectorAll( '.aw-commands-wrapper:not(.aw-commands-overflow)>aw-command' );
    for( var i = commandElems.length - 1; i >= 0; i-- ) {
        var commandElementButton = commandElems[ i ].querySelector( 'button:not(.disabled)' );
        if( commandElementButton ) {
            if( hasOverflow( cmdBarElem, cmdBarAlignment, commandElems[ i ] ) ) {
                commandElementButton.setAttribute( 'tabindex', -1 );
            } else {
                commandElementButton.setAttribute( 'tabindex', 0 );
            }
        }
    }
};

/**
 * Calculate the command overflow break point in command bar. The closure funtion
 *
 * The closure function arguments:
 * @param {Element} cmdBarElem the command bar element
 * @param {Number} moreButtonSize the more button element size
 * @param {String} cmdBarAlignment the command bar alignment
 * @returns {Function} the function to calculate command overflow break point.
 */
export let overflowBreakPointCalculator = function() {
    var commandElems;
    var breakIndex = 0;

    return function( cmdBarElem, cmdBarAlignment ) {
        if( !cmdBarElem ) {
            return breakIndex;
        }

        if( !commandElems ) {
            commandElems = cmdBarElem.querySelectorAll( '.aw-commands-wrapper:not(.aw-commands-overflow)>aw-command' );
        }

        breakIndex = commandElems.length;
        for( var i = commandElems.length - 1; i >= 0; i-- ) {
            // find the first command which doesn't have overflow in reverse order
            if( !hasOverflow( cmdBarElem, cmdBarAlignment, commandElems[ i ] ) ) {
                breakIndex = i + 1;
                break;
            }
        }

        return breakIndex;
    };
};

exports = {
    overflowBreakPointCalculator,
    overflowPopupHandler,
    hasOverflow,
    updateTabIndexOnOverflow
};
export default exports;
