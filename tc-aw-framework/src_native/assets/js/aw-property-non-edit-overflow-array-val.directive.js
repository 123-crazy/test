// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-non-edit-overflow-array-val) directive.
 *
 * @module js/aw-property-non-edit-overflow-array-val.directive
 */
import app from 'app';
import $ from 'jquery';
import 'js/aw-property-image.directive';
import 'js/showObjectCommandHandler';

/**
 * Definition for the (aw-property-non-edit-overflow-array-val) directive.
 *
 * <aw-property-non-edit-overflow-array-val prop="<scope_property_object>"/>
 *
 * @member aw-property-non-edit-overflow-array-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyNonEditOverflowArrayVal', [
    '$timeout',
    '$sce',
    'showObjectCommandHandler',
    function( $timeout, $sce, showObjectSvc ) {
        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '<'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-non-edit-overflow-array-val.directive.html',
            link: function( $scope, $element ) {
                $scope.isClicked = false;
                $scope.directiveElem = $element;
                $scope.isOverflow = false;
                $scope.fitIndex = $scope.prop ? $scope.prop.displayValsModel.length : 0;
                $scope.overflowIndex = 0;
                $scope.availableWidth = '100%';
                $scope.isHeaderProperty = false;

                $scope.stringValue = '';

                $scope.$on( '$destroy', function() {
                    // Clear the element
                    $element.remove();
                    $element.empty();

                    // Clear events
                    $( document ).unbind( 'click' );

                    // Clear timeout(s)
                    $timeout.cancel( $scope.handleOverflow );
                    $timeout.cancel( $scope.createStringValue );
                } );

                /**
                 * Opens the overflow popup
                 *
                 * @param event The MouseEvent when chevron is clicked
                 * @return {void}
                 */
                $scope.openOverflowPopup = function( event ) {
                    // Toggle popup display with isClicked
                    $scope.isClicked = !$scope.isClicked;
                    // Set the popup position below chevron
                    $scope.leftPosition = event.clientX;
                    // Stop event bubbling
                    event.stopPropagation();
                };

                /**
                 * Opens a URL when value anchor is clicked.
                 *
                 * @param index The index of property value clicked from overflow popup
                 * @return {void}
                 */
                $scope.openObjectLinkPage = function( index ) {
                    var uiProperty = $scope.prop;
                    var uid = '';

                    if( !index ) {
                        index = this.$index;
                    }

                    // Get UID
                    uid = uiProperty.dbValue[ index ];

                    if( uid && uid.length > 0 ) {
                        if( uiProperty.whatAmI === 'propDC' ) {
                            window.location = '#com.siemens.splm.clientfx.tcui.xrt.showObject;uid=' + uid;
                        } else {
                            showObjectSvc.execute( {
                                propertyName: uiProperty.propertyName,
                                uid: uid
                            } );
                        }
                    }

                    $scope.isClicked = false;
                };

                /**
                 * Opens a URL when value anchor is clicked and closes the overflow popup
                 *
                 * @return {void}
                 */
                $scope.openObjectLinkFromOverflow = function() {
                    $scope.openObjectLinkPage( this.$parent.$index );
                };

                /**
                 * Adds a click handler on document so that popup is closed when user clicks anywhere else than
                 * popup $return {void}
                 */
                $( document ).bind( 'click', function() {
                    $scope.isClicked = false;
                    $scope.$apply();
                } );

                /**
                 * Computes if property values are overflowing and displays overflow chevron Behavior specific to
                 * OBJECT or OBJECTARRAY property
                 *
                 * @return {void}
                 */
                $scope.handleOverflow = $timeout( function() {
                    var container = $scope.directiveElem.closest( '.aw-layout-headerProperty' );
                    if( container.hasClass( 'aw-layout-headerProperty' ) ) {
                        $scope.isHeaderProperty = true;
                    }

                    // Handle OBJECTARRAY values
                    if( $scope.prop && ( $scope.prop.type === 'OBJECT' || $scope.prop.type === 'OBJECTARRAY' ) ) {
                        var propValueCnt = $scope.prop.displayValsModel.length;
                        var popupIndex = 0;
                        if( $scope.isHeaderProperty ) {
                            for( var i = propValueCnt - 1; i > -1; i-- ) {
                                if( $scope.getWidgetSize() > 300 ) {
                                    $scope.isOverflow = true;
                                    popupIndex = i;

                                    $(
                                            $scope.directiveElem
                                            .find( 'ul.aw-jswidgets-arrayNonEditValueOverflowCellList li' )[ i ] )
                                        .remove();
                                }
                            }
                        }

                        // Set index where overflow starts
                        $scope.fitIndex = popupIndex === 0 ? propValueCnt - 1 : popupIndex - 1;
                        $scope.overflowIndex = popupIndex;
                    }

                    // Handle STRINGARRAY values
                    if( $scope.prop && ( $scope.prop.type !== 'OBJECT' && $scope.prop.type !== 'OBJECTARRAY' ) ) {
                        if( $scope.prop.displayValues.length > 0 ) {
                            for( var j = 0; j < $scope.prop.displayValues.length; j++ ) {
                                $scope.stringValue += $scope.prop.displayValues[ j ];
                                if( j < $scope.prop.displayValues.length - 1 ) {
                                    $scope.stringValue += ', ';
                                }
                            }
                        }
                        // Perform width computation
                        var propertyLabelEl = $scope.directiveElem.closest(
                            'div.aw-widgets-propertyLabelTopValueContainer' ).prev();
                        var propLabelW = propertyLabelEl[ 0 ].clientWidth;
                        if( $scope.isHeaderProperty ) {
                            $scope.availableWidth = 300 - propLabelW + 'px';
                        }
                    }
                } );

                /**
                 * Adds a comma(,) separator after each uiValue, excludes last value Uses Strict Content Escaping to
                 * return 'comma' and '&nbsp;' where applicable
                 *
                 * @param index the index of current uiValue
                 * @return Comma(,) symbol
                 */
                $scope.addSeparator = function( index ) {
                    var trustedString = $scope.prop.displayValsModel[ index ].displayValue;
                    if( $scope.prop ) {
                        if( index < $scope.fitIndex ) {
                            trustedString += ',&nbsp;';
                        }
                    }
                    return $sce.trustAsHtml( trustedString );
                };

                /**
                 * Returns the width consumed by property widget
                 *
                 * @return {void}
                 */
                $scope.getWidgetSize = function() {
                    var propertyValueEl = $scope.directiveElem
                        .closest( 'div.aw-widgets-propertyLabelTopValueContainer' );
                    var propertyLabelEl = propertyValueEl.prev();
                    var propLabelW = propertyLabelEl[ 0 ].clientWidth;
                    var propValueW = propertyValueEl[ 0 ].clientWidth;
                    return propLabelW + propValueW + 24; // 24 added against chevron width
                };
            }
        };
    }
] );
