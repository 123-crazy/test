// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 closeDropdown,
 escapeKeyBind
 */

/**
 * @module js/aw-xrteditor-dropdown.directive
 */
import * as app from 'app';
import AwDocumentService from 'js/awDocumentService';
import ngModule from 'angular';

let exports = {};

var openScope = null;

export let open = function( dropdownScope ) {
    if( !openScope ) {
        AwDocumentService.instance.bind( 'click', closeDropdown );
        AwDocumentService.instance.bind( 'keydown', escapeKeyBind );
    }

    if( openScope && openScope !== dropdownScope ) {
        openScope.isOpen = false;
    }

    openScope = dropdownScope;
};

export let close = function( dropdownScope ) {
    if( openScope === dropdownScope ) {
        openScope = null;
        AwDocumentService.instance.unbind( 'click', closeDropdown );
        AwDocumentService.instance.unbind( 'keydown', escapeKeyBind );
    }
};

var closeDropdown = function( evt ) {
    // This method may still be called during the same mouse event that
    // unbound this event handler. So check openScope before proceeding.
    if( !openScope ) {
        return;
    }

    var toggleElement = openScope.getToggleElement();
    if( evt && toggleElement && toggleElement[ 0 ].contains( evt.target ) ) {
        return;
    }

    openScope.$apply( function() {
        openScope.isOpen = false;
    } );
};

var escapeKeyBind = function( evt ) {
    if( evt.which === 27 ) {
        openScope.focusToggleElement();
        closeDropdown();
    }
};

export default exports = {
    open,
    close
};
/**
 * TODO
 *
 * @member dropdownService
 * @memberof NgServices
 */
app.factory( 'dropdownService', () => exports );

/**
 * TODO
 *
 * @member DropdownController
 * @memberof NgControllers
 */
app
    .controller(
        'DropdownController',
        [
            '$scope',
            '$attrs',
            '$parse',
            'dropdownService',
            '$animate',
            function( $scope, $attrs, $parse, dropdownService, $animate ) {
                var self = this,
                    scope = $scope.$new(), // create a child scope so we are not
                    // polluting original one
                    openClass = 'open',
                    getIsOpen, setIsOpen = ngModule.noop,
                    toggleInvoker = $attrs.onToggle ? $parse( $attrs.onToggle ) :
                    ngModule.noop;

                this.init = function( element ) {
                    self.$element = element;

                    if( $attrs.isOpen ) {
                        getIsOpen = $parse( $attrs.isOpen );
                        setIsOpen = getIsOpen.assign;

                        $scope.$watch( getIsOpen, function( value ) {
                            scope.isOpen = !!value;
                        } );
                    }
                };

                this.toggle = function( open ) {
                    scope.isOpen = arguments.length ? !!open : !scope.isOpen;
                    return scope.isOpen;
                };

                // Allow other directives to watch status
                this.isOpen = function() {
                    return scope.isOpen;
                };

                scope.getToggleElement = function() {
                    return self.toggleElement;
                };

                scope.focusToggleElement = function() {
                    if( self.toggleElement ) {
                        self.toggleElement[ 0 ].focus();
                    }
                };

                scope.$watch( 'isOpen', function( isOpen, wasOpen ) {
                    $animate[ isOpen ? 'addClass' : 'removeClass' ]( self.$element, openClass );

                    if( isOpen ) {
                        scope.focusToggleElement();
                        dropdownService.open( scope );
                    } else {
                        dropdownService.close( scope );
                    }

                    setIsOpen( $scope, isOpen );
                    if( ngModule.isDefined( isOpen ) && isOpen !== wasOpen ) {
                        toggleInvoker( $scope, {
                            open: !!isOpen
                        } );
                    }
                } );

                $scope.$on( '$locationChangeSuccess', function() {
                    scope.isOpen = false;
                } );

                $scope.$on( '$destroy', function() {
                    scope.$destroy();
                } );
            }
        ] );

/**
 * TODO
 *
 * @example TODO
 *
 * @member dropdown
 * @memberof NgMixedDirectives
 */
app.directive( 'dropdown', function() {
    return {
        controller: 'DropdownController',
        link: function( scope, $element, attrs, dropdownCtrl ) {
            dropdownCtrl.init( $element );
        }
    };
} );

/**
 * TODO
 *
 * @example TODO
 *
 * @member dropdown-toggle
 * @memberof NgMixedDirectives
 */
app.directive( 'dropdownToggle', function() {
    return {
        require: '?^dropdown',
        link: function( scope, $element, attrs, dropdownCtrl ) {
            if( !dropdownCtrl ) {
                return;
            }

            dropdownCtrl.toggleElement = $element;

            var toggleDropdown = function( event ) {
                event.preventDefault();

                if( !$element.hasClass( 'disabled' ) && !attrs.disabled ) {
                    scope.$apply( function() {
                        dropdownCtrl.toggle();
                    } );
                }
            };

            $element.bind( 'click', toggleDropdown );

            // WAI-ARIA
            $element.attr( {
                'aria-haspopup': true,
                'aria-expanded': false
            } );
            scope.$watch( dropdownCtrl.isOpen, function( isOpen ) {
                $element.attr( 'aria-expanded', !!isOpen );
            } );

            scope.$on( '$destroy', function() {
                $element.unbind( 'click', toggleDropdown );
            } );
        }
    };
} );
