// Copyright (c) 2020 Siemens

/**
 * Defines controller for <aw-link-with-popup-menu> directive.
 *
 * @module js/aw-link-with-popup-menu.controller
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import popupService from 'js/popupService';
import wcagSvc from 'js/wcagService';
import _ from 'lodash';

/**
 * Defines awLinkWithPopupMenu controller
 *
 * @member awLinkWithPopupMenuController
 * @memberof NgControllers
 */
app.controller( 'awLinkWithPopupMenuController', [
    '$scope',
    '$element',
    '$timeout',
    'viewModelService',
    function( $scope, $element, $timeout, viewModelSvc ) {
        $scope.showPopupMenu = false;
        var declViewModel = viewModelSvc.getViewModel( $scope, true );
        viewModelSvc.bindConditionStates( declViewModel, $scope );
        $scope.conditions = declViewModel.getConditionStates();

        let createPopupObject = () => {
            $scope.items = [];
            let len = $scope.dataprovider.getLength();
            for( var i = 0; i < len; i++ ) {
                var popObject = $scope.dataprovider.createPopupObject( i, $scope,
                    $scope.dataprovider.json.dataProviderType );
                popObject.isSelected = false;
                if( $scope.prop.uiValue !== '' ? $scope.prop.uiValue === popObject.listElementDisplayValue : $scope.prop.propertyDisplayName === popObject.listElementDisplayValue ) {
                    popObject.isSelected = true;
                }
                $scope.items.push( popObject );
            }
            // if nothing in dataProvider response, mark noResults equals to true
            if( $scope.items.length === 0 ) {
                var popLinkObject = $scope.dataprovider.createPopupObject( 0, $scope );
                $scope.items.push( popLinkObject );
            }
        };

        $scope.loadContent = () => {
            if( isEnableCaching() ) {
                $scope.isLoading = true;
                $scope.dataprovider.initialize( $scope )
                    .then( () => {
                        $scope.isLoading = false;
                        // will get the real text in async case
                        createPopupObject();
                    } )
                    .catch( () => { $scope.isLoading = false; } );
            }

            // always createPopupObject, it will ensure loading text in async case
            createPopupObject();
        };

        /**
         * Check if the response from the data provider need to cache or not
         *
         * @returns {boolean} if caching is enable ot not
         */

        var isEnableCaching = function() {
            if( $scope.isCache === 'false' || $scope.dataprovider.viewModelCollection.getTotalObjectsFound() === 0 ) {
                return true;
            }
            return false;
        };

        var setSelection = function( current ) {
            $scope.items.forEach( item => {
                item.isSelected = false;
            } );
            current.isSelected = true;

            var eventData = {
                property: $scope.prop,
                previousSelect: $scope.previousSelect,
                propScope: $scope
            };
            eventBus.publish( 'awlinkPopup.selected', eventData );
        };

        $scope.closePopupMenu = function( event, item ) {
            event.stopImmediatePropagation();
            $scope.prevSelectedProp = $scope.prop;
            if( $scope.prop.uiValue !== '' ) {
                $scope.previousSelect = $scope.prop.uiValue;
            } else {
                $scope.previousSelect = $scope.prop.propertyDisplayName;
            }

            // if selected a different item,then do the validation
            if( item !== null && item !== undefined && item !== $scope.prop ) {
                if( $scope.prop.uiValue !== '' ) {
                    $scope.prop.uiValue = item.listElementDisplayValue;
                } else {
                    $scope.prop.propertyDisplayName = item.listElementDisplayValue;
                }
                $scope.prop.dbValue = item.listElementObject;

                // reset selection
                setSelection( item );
            }

            // close the popup
            popupService.hide( null, event );
        };

        // the index is the number which the scrollbar scrollTo which part.
        $scope.handleScroll = function( containerElement ) {
            let element = containerElement || $element;
            let scrollerElem = element.find( '.aw-base-scrollPanel' );
            if( scrollerElem.length > 0 ) {
                $scope.scrollerElem = scrollerElem[ 0 ];
            } else {
                $element.find( '.aw-widgets-cellListContainer' ).addClass( 'aw-base-scrollPanel' );
                $scope.scrollerElem = element.find( '.aw-widgets-cellListContainer' )[ 0 ];
            }
            // if scroll to the end and moreValuesExist equals true
            if( $scope.scrollerElem.scrollHeight - Math.ceil( $scope.scrollerElem.scrollTop ) <= $scope.scrollerElem.parentElement.scrollHeight &&
            $scope.dataprovider.viewModelCollection.moreValuesExist ) {
                $scope.dataprovider.someDataProviderSvc.getNextPage( $scope.dataprovider.action,
                    $scope.dataprovider.json, $scope ).then( function( response ) {
                        if( response.totalFound > 0 ) {
                            $scope.dataprovider.viewModelCollection.updateModelObjects( response.results, $scope.dataprovider.uidInResponse,
                                $scope.dataprovider.preSelection );
                        }
                        for( var j = 0; j < response.totalFound; j++ ) {
                            if( $scope.dataprovider.json.dataProviderType ) {
                                let popObject = $scope.dataprovider.createPopupObject( $scope.items.length + j, $scope,
                                    $scope.dataprovider.json.dataProviderType );
                                popObject.isSelected = false;
                                if( $scope.prop.uiValue !== '' ? $scope.prop.uiValue === popObject.listElementDisplayValue : $scope.prop.propertyDisplayName === popObject.listElementDisplayValue ) {
                                    popObject.isSelected = true;
                                }
                                $scope.items.push( popObject );
                            }
                        }
                } );
                $scope.$apply();
            }
        };

        $scope.onKeyDown = function( event, item ) {
            if( wcagSvc.isValidKeyPress( event ) ) {
                $scope.closePopupMenu( event, item );
            } else {
                wcagSvc.handleMoveUpOrDown( event, event.currentTarget.parentElement );
            }
        };

        $scope.$on( '$destroy', function() {
            $scope.scrollerElem = null;
        } );
        // end
    }
] );
