// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-native-table-prop-val) directive.
 *
 * @module js/aw-property-native-table-prop-val.directive
 */
import app from 'app';
import $ from 'jquery';
import 'js/localeService';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-val.directive';

/**
 * Definition for the (aw-property-native-table-prop-val) directive.
 * <P>
 * TODO: Will need to be unified with aw-table-cell.
 *
 * @example <aw-property-native-table-prop-val></aaw-property-native-table-prop-val>
 *
 * @member aw-property-native-table-prop-val
 * @memberof NgElementDirectives
 * @deprecated afx@4.4.0, not required anymore
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awPropertyNativeTablePropVal', [
    '$timeout',
    'localeService',
    function( $timeout, localeSvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            // walk up the scope hierarchy to find the grid from the cell
            var getGridOverlay = function() {
                var parentScope = $scope.$parent;
                while( parentScope ) {
                    if( parentScope.hasOwnProperty( 'gridOverlay' ) ) {
                        return parentScope.gridOverlay;
                    }
                    parentScope = parentScope.$parent;
                }
                return undefined;
            };

            var isPopUpVisible = function( stopTarget ) {
                var isVisible = false;
                if( stopTarget !== null ) {
                    var arrLength = $( stopTarget ).find( '.aw-jswidgets-popUpVisible' ).length;
                    if( arrLength > 0 ) {
                        isVisible = true;
                    }
                }
                return isVisible;
            };
            // /// checks the property is textarea or not
            var checkRendering = function( scope ) {
                if( scope.prop.renderingHint === 'textarea' || scope.prop.maxLength >= 60 ) {
                    return true;
                }
                return false;
            };
            // this gets called too much... TODO: find a better way. create a ref between the cell scope and
            // container scope (at link time) to avoid re-walking the tree or?
            $scope.isContainerEditable = function() {
                var grid = getGridOverlay();
                if( grid ) {
                    return grid.editable;
                }
                return false;
            };

            var originalVal = null;
            var nonEditDiv = null;

            $scope.startEdit = function( ev ) {
                // get the scope of the container to see if it supports edit
                var gridOverlay = getGridOverlay();

                if( gridOverlay && gridOverlay.editable && $scope.prop.isEditable ) {
                    // for some reason, when this event triggers the stopEdit, the parent cell can't be found...
                    // so, stopping propagation for now... means you can be in edit mode for multiple cells fttb
                    ev.stopPropagation();

                    if( $scope.prop && !$scope.prop.isEditing ) {
                        // trigger any existing stopEdit event in case another cell is in edit mode
                        $( 'body' ).triggerHandler( 'mousedown touchstart' );

                        nonEditDiv = ev.currentTarget; // .parentElement;

                        // need to fully populate overlay here if we haven't already...
                        $scope.prop.isEnabled = true;
                        $scope.prop.isEditing = true;
                        $scope.prop.autofocus = true;

                        if( $scope.prop.type === 'BOOLEAN' || $scope.prop.type === 'BOOLEANARRAY' ) {
                            localeSvc.getTextPromise().then( function( localTextBundle ) {
                                $scope.prop.propertyRadioTrueText = localTextBundle.RADIO_TRUE;
                                $scope.prop.propertyRadioFalseText = localTextBundle.RADIO_FALSE;

                                /**
                                 * Handles setting of custom labels and vertical alignment attributes when
                                 * directives are used natively
                                 */
                                if( $scope.prop.radioBtnApi && $scope.prop.radioBtnApi.customTrueLabel ) {
                                    $scope.prop.propertyRadioTrueText = $scope.prop.radioBtnApi.customTrueLabel;
                                }

                                if( $scope.prop.radioBtnApi && $scope.prop.radioBtnApi.customFalseLabel ) {
                                    $scope.prop.propertyRadioFalseText = $scope.prop.radioBtnApi.customFalseLabel;
                                }

                                if( $scope.prop.radioBtnApi && $scope.prop.radioBtnApi.vertical ) {
                                    $scope.prop.vertical = $scope.prop.radioBtnApi.vertical;
                                }
                            } );
                        }

                        /**
                         * Need to check whether the property is text area or not so as to apply correct css to it
                         */
                        var isTextArea = checkRendering( $scope );

                        var parentRow = $( nonEditDiv ).parents( 'div.ui-grid-row.ng-scope' );

                        if( isTextArea ) {
                            if( parentRow[ 0 ] &&
                                !parentRow[ 0 ].classList.contains( 'aw-jswidgets-tablePropertyEditTextAreaCell' ) ) {
                                parentRow[ 0 ].classList.add( 'aw-jswidgets-tablePropertyEditTextAreaCell' );
                                parentRow[ 0 ].classList.remove( 'aw-jswidgets-tablePropertyEditCell' );
                            } else if( !parentRow.context.classList
                                .contains( 'aw-jswidgets-tablePropertyEditTextAreaCell' ) ) {
                                parentRow.context.classList.add( 'aw-jswidgets-tablePropertyEditTextAreaCell' );
                                parentRow.context.classList.remove( 'aw-jswidgets-tablePropertyEditCell' );
                            }
                        } else {
                            if( parentRow[ 0 ] &&
                                !parentRow[ 0 ].classList.contains( 'aw-jswidgets-tablePropertyEditTextAreaCell' ) ) {
                                if( !parentRow[ 0 ].classList.contains( 'aw-jswidgets-tablePropertyEditCell' ) ) {
                                    parentRow[ 0 ].classList.add( 'aw-jswidgets-tablePropertyEditCell' );
                                }
                            } else {
                                if( !parentRow.context.classList

                                    .contains( 'aw-jswidgets-tablePropertyEditCell' ) ) {
                                    parentRow.context.classList.add( 'aw-jswidgets-tablePropertyEditCell' );
                                }
                            }
                        }

                        originalVal = $scope.prop.uiValue;

                        ev.currentTarget.classList.add( 'ng-dirty' );
                        ev.currentTarget.classList.add( 'aw-jswidgets-editableProp' );
                        ev.currentTarget.classList.remove( 'aw-jswidgets-uicell' );

                        $( 'body' ).off( 'mousedown touchstart', $scope.stopEdit ).on( 'mousedown touchstart',
                            $scope.stopEdit );
                    }
                }
            };

            $scope.stopEdit = function( event ) {
                var gridOverlay = getGridOverlay();
                var cell = $( event.target ).closest( '.aw-widgets-cellTop' );
                var stopTarget = nonEditDiv;
                var popUpVisible = isPopUpVisible( stopTarget );
                var parentFinal = $( nonEditDiv ).parents( 'div.ui-grid-viewport.ng-isolate-scope' );
                var modifiedVal = $scope.prop.uiValue;
                var changedVal = true;

                if( modifiedVal === originalVal ) {
                    changedVal = false;
                }

                if( !popUpVisible ) {
                    nonEditDiv.classList.remove( 'changed' );
                    // ///Removes the dirtyness of the property if the command is clicked directly without clicking outside the property widget.
                    if( gridOverlay && !gridOverlay.editable ) {
                        parentFinal[ 0 ].classList.remove( 'aw-jswidgets-tablePropertyContentChanged' );
                    } else if( stopTarget.classList.contains( 'ng-dirty' ) && changedVal ) {
                        nonEditDiv.classList.add( 'changed' );
                        if( parentFinal[ 0 ] &&
                            !parentFinal[ 0 ].classList.contains( 'aw-jswidgets-tablePropertyContentChanged' ) ) {
                            parentFinal[ 0 ].classList.add( 'aw-jswidgets-tablePropertyContentChanged' );
                        } else {
                            parentFinal.context.classList.add( 'aw-jswidgets-tablePropertyContentChanged' );
                        }
                    }

                    var parentRow = $( nonEditDiv ).parents( 'div.ui-grid-row.ng-scope' );

                    if( parentRow[ 0 ] &&
                        parentRow[ 0 ].classList.contains( 'aw-jswidgets-tablePropertyEditTextAreaCell' ) ) {
                        parentRow[ 0 ].classList.remove( 'aw-jswidgets-tablePropertyEditTextAreaCell' );
                    } else {
                        parentRow.context.classList.remove( 'aw-jswidgets-tablePropertyEditTextAreaCell' );
                    }

                    if( parentRow[ 0 ] && parentRow[ 0 ].classList.contains( 'aw-jswidgets-tablePropertyEditCell' ) ) {
                        parentRow[ 0 ].classList.remove( 'aw-jswidgets-tablePropertyEditCell' );
                    } else {
                        parentRow.context.classList.remove( 'aw-jswidgets-tablePropertyEditCell' );
                    }

                    stopTarget.classList.remove( 'aw-jswidgets-uicell' );
                    stopTarget.classList.add( 'aw-jswidgets-uiNonEditCell' );
                }

                if( cell.length === 0 || !cell.scope() || !cell.scope().prop.isEditing ) {
                    $scope.$evalAsync( function() {
                        if( $scope.prop.dateApi !== null && popUpVisible && $scope.prop.dateApi.timeValue === '' ) {
                            $scope.prop.isEditing = true;
                            $scope.prop.isEnabled = true;
                            $scope.prop.autofocus = true;
                        } else {
                            $scope.prop.isEditing = false;
                            $scope.prop.isEnabled = true;
                            $scope.prop.autofocus = true;
                        }
                    } );

                    $( 'body' ).off( 'mousedown touchstart', $scope.stopEdit );
                }
            };
        }

        myController.$inject = [ '$scope', '$element' ];

        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-native-table-prop-val.directive.html',
            link: function( $scope, $element ) {
                var tableFunc = function() {
                    if( $scope.prop.dbValue ) {
                        var size = $scope.prop.dbValue.length;
                        if( size > 30 ) {
                            $element.parent().css( 'justify-content', 'space-between' );
                            $element.parent().mouseenter( function() {
                                $( this ).css( 'overflow-y', 'auto' ); // eslint-disable-line no-invalid-this
                            } ).mouseleave( function() {
                                $( this ).css( 'overflow-y', '' ); // eslint-disable-line no-invalid-this
                            } );
                        }
                    }
                };
                $timeout( tableFunc );

                $scope.$parent.$watch( 'row', function _watchRow( newValue, oldValue ) { // eslint-disable-line no-unused-vars
                    tableFunc();
                } );
            },
            controller: myController
        };
    }
] );
