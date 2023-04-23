// Copyright (c) 2020 Siemens

/**
 * This represents bread crumb widget
 *
 * @module js/aw-search-breadcrumb.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'js/aw.searchFilter.service';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/panelContentService';
import 'js/adapterService';
import 'js/selectionModelFactory';
import wcagSvc from 'js/wcagService';

/**
 * @member awSearchBreadcrumbController
 * @memberof NgControllers
 *
 * @param {$scope} $scope - Service to use.
 * @param {$element} $element - Service to use.
 * @param {$state} $state - Service to use.
 * @param {$timeout} $timeout - Service to use.
 * @param {searchFilterService} searchFilterService - Service to use.
 * @param {viewModelService} viewModelSvc - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @param {panelContentService} panelContentService - Service to use.
 * @param {adapterService} adapterSvc - Service to use.
 */
app.controller( 'awSearchBreadcrumbController', [
    '$scope',
    '$element',
    '$state',
    '$timeout',
    'searchFilterService',
    'viewModelService',
    'appCtxService',
    'panelContentService',
    'adapterService',
    'selectionModelFactory',
    function( $scope, $element, $state, $timeout, searchFilterService, viewModelSvc, appCtxService,
        panelContentService, adapterSvc, selectionModelFactory ) {
        if( $scope.breadcrumbConfig && !$scope.breadcrumbConfig.id ) {
            $scope.breadcrumbConfig.id = 'wabc';
        }
        // default position for showing overflow icon
        if( $scope.breadcrumbConfig && !$scope.breadcrumbConfig.overflowIndex ) {
            $scope.breadcrumbConfig.overflowIndex = 0;
        }

        var popuplist = '/html/defaultbreadcrumblist.html';
        var breadcrumbReFocus = false;

        if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.popuplist ) {
            popuplist = $scope.breadcrumbConfig.popuplist;
        }
        $scope.popuplist = app.getBaseUrlPath() + popuplist;

        var breadcrumbValueUpdated = function( mo, element ) {
            adapterSvc.getAdaptedObjects( [ mo ] ).then( function( adaptedObj ) {
                if( element.displayName !== adaptedObj[ 0 ].props.object_string.uiValues[ 0 ] ) {
                    element.displayName = adaptedObj[ 0 ].props.object_string.uiValues[ 0 ];
                    return true;
                }
                return false;
            } );
        };

        var checkForBreadcrumbDisplayNameChangeInt = function( valueUpdated, mo ) {
            $scope.$evalAsync( function() {
                if( $scope.provider && $scope.provider.crumbs ) {
                    $scope.provider.crumbs.forEach( function( element ) {
                        checkForBreadcrumbDisplayNameChangeIntInternal( element, valueUpdated, mo );
                    } );
                }
            } );
        };

        var checkForBreadcrumbDisplayNameChangeIntInternal = function( element, valueUpdated, mo ) {
            if( !valueUpdated && element.scopedUid &&
                mo.props.object_string && element.scopedUid === mo.uid ) {
                return breadcrumbValueUpdated( mo, element );
            }
        };

        var checkForBreadcrumbDisplayNameChange = function( data ) {
            if( data.modifiedObjects && data.modifiedObjects.length > 0 ) {
                checkForBreadcrumbDisplayNameChangeInternal( data );
            }
        };

        var checkForBreadcrumbDisplayNameChangeInternal = function( data ) {
            var valueUpdated = false;
            data.modifiedObjects.forEach( function( mo ) {
                if( !valueUpdated ) {
                    checkForBreadcrumbDisplayNameChangeInt( valueUpdated, mo );
                }
            } );
        };

        if( !( $scope.breadcrumbConfig && $scope.breadcrumbConfig.noUpdate ) ) {
            // Add listener to check the change of object's property value ( which is shown in breadcrumb )
            var breadCrumbChangeListener = eventBus.subscribe( 'cdm.modified', function( data ) {
                checkForBreadcrumbDisplayNameChange( data );
            } );

            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( breadCrumbChangeListener );
            } );
        }

        var setConditions = function( declViewModel ) {
            viewModelSvc
                .populateViewModelPropertiesFromJson( declViewModel.viewModel )
                .then(
                    function( customPanelViewModel ) {
                        $scope.data = customPanelViewModel;
                        viewModelSvc.bindConditionStates( customPanelViewModel, $scope );
                        $scope.conditions = customPanelViewModel.getConditionStates();
                    },
                    function() {
                        logger
                            .error( 'Failed to resolve declarative view model for search bread crumb' );
                    } );
        };

        // use the .breadcrumbConfig.vm to pass value into the aw-include
        if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.vm ) {
            panelContentService
                .getViewModelById( $scope.breadcrumbConfig.vm )
                .then(
                    function( declViewModel ) {
                        setConditions( declViewModel );
                    } );
        }

        var toggleCrumbPopUp = function( selectedCrumb ) {
            $scope.currentCrumb = selectedCrumb;

            if( selectedCrumb.clicked === false ) {
                appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Chevron' );
            } else if( selectedCrumb.clicked === true ) {
                appCtxService.registerCtx( $scope.breadcrumbConfig.id + 'Chevron', selectedCrumb );
                eventBus.publish( $scope.breadcrumbConfig.id + '.chevronClicked', selectedCrumb );
            }
        };

        // When a chevron in bread crumb is clicked
        $scope.onChevronClick = function( selectedCrumb, event ) {
            $scope.$evalAsync( function() {
                $scope.data.loading = true;
                $scope.chevronClickEvent = event;
                $scope.provider.crumbs.forEach( function( element ) {
                    if( element === selectedCrumb ) {
                        element.clicked = !element.clicked;
                    } else {
                        element.clicked = false;
                    }
                } );

                $scope.leftPosition = event.clientX;
                toggleCrumbPopUp( selectedCrumb );
                var currElement = ngModule.element( event.currentTarget.parentElement );
                currElement.scope().$broadcast( 'awPopupWidget.open', {
                    popupUpLevelElement: ngModule.element( event.currentTarget.parentElement )
                } );
            } );
        };

        var showChevronPopupDataListener = eventBus.subscribe( 'settingChevronPopupPosition',
            function() {
                $scope.data.showPopup = true;
                var event = $scope.chevronClickEvent;
                var currElement = ngModule.element( event.currentTarget.parentElement );
                currElement.scope().$broadcast( 'awPopupWidget.reposition', {
                    popupUpLevelElement: ngModule.element( event.currentTarget.parentElement )
                } );
            } );

        $scope.addNewCrumbs = function( selectedCrumb, newCrumbs ) {
            for( var i = 0; i < $scope.provider.crumbs.length; i++ ) {
                var element = $scope.provider.crumbs;

                if( element[ i ].scopedUid ) {
                    if( element[ i ].scopedUid === selectedCrumb.scopedUid ) {
                        newCrumbs.push( element[ i ].scopedUid );
                        break;
                    } else {
                        newCrumbs.push( element[ i ].scopedUid );
                    }
                }
            }
        };

        $scope.setScopedCrumbInt = function( selectedCrumb ) {
            var newCrumbs = [];
            $scope.addNewCrumbs( selectedCrumb, newCrumbs );
            $state.params[ $scope.breadcrumbConfig.id ] = newCrumbs.join( '^' );
            $state.go( '.', $state.params );

            appCtxService.registerCtx( $scope.breadcrumbConfig.id + 'Link', selectedCrumb );
        };

        // When a link in bread crumb is clicked
        $scope.setScopedCrumb = function( selectedCrumb ) {
            // close the pop-up if opened
            $scope.provider.crumbs.forEach( function( element ) {
                element.clicked = false;
            } );

            toggleCrumbPopUp( selectedCrumb );

            if( !$scope.breadcrumbConfig.noUpdate && !$scope.provider.onSelect ) {
                $scope.setScopedCrumbInt();
            }

            // building url
            if( $scope.provider.onSelect ) {
                $scope.provider.onSelect( selectedCrumb );
            }
        };

        $scope.$on( '$destroy', function() {
            if( $scope.breadcrumbConfig ) {
                appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Chevron' );
                appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Link' );

                $scope.breadcrumbConfig.id = null;
                $scope.breadcrumbConfig = null;
            }

            $( 'body' ).off( 'click', $scope.hideChevronPopUp );
            eventBus.unsubscribe( showChevronPopupDataListener );
        } );

        $scope.hideChevronPopUp = function( event ) {
            event.stopPropagation();
            var parent = event.target;
            // chevron is clicked to show popup OR something is selected inside chevron popup
            while( parent &&
                parent.className !== 'aw-layout-popup aw-popup-overlay' &&
                parent.className !== 'aw-jswidget-controlArrowNoFloat aw-jswidget-controlArrowRotateRight' ) {
                parent = parent.parentNode;
            }

            if( !parent ) {
                // reset crumbs.
                $scope.provider.crumbs.forEach( function( element ) {
                    element.clicked = false;
                } );

                // hide chevron popup
                $scope.data.showPopup = false;
                appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Chevron' );
            }
        };

        /**
         * Called when a change is made in window size or the collection of crumbs. It sets which crumbs
         * are to be consider in the 'overflow' chevron.
         */
        $scope.checkBreadcrumbOverflow = function() {
            var clearCrumbLinkWidth = $( '.aw-widgets-clearCrumbLink' ).width();
            if( isNaN( clearCrumbLinkWidth ) ) {
                //Set Focus on Close in filter panel or first prefilter
                if ( breadcrumbReFocus ) {
                    var filterPanelClose = $( '.aw-commandId-Awp0CloseCommandPanel' );
                    if ( filterPanelClose && filterPanelClose.length > 0 ) {
                        filterPanelClose[0].focus();
                    } else {
                        var preFilterBox = $( '.aw-jswidgets-choice' );
                        if ( preFilterBox && preFilterBox.length > 0 ) {
                            preFilterBox[ 0 ].focus();
                        }
                    }
                    breadcrumbReFocus = false;
                }
                return;
            }
            // overflow icon shown at the start of crumb i.e first position
            if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.overflowIndex === 0 ) {
                $scope.overflowAtStart = true;
            }

            var bcWidth = 0;
            var crumbCount = 0;
            var doubleLeftIconWidth = 24; // default width of overflow icon

            $element.find( 'div.aw-layout-eachCrumb.ng-scope' ).each( function() {
                if( !$scope.provider.crumbs[ crumbCount ].width || $( this ).width() > 0 ) {
                    $scope.provider.crumbs[ crumbCount ].width = $( this ).width();
                }
                crumbCount++;
            } );

            $scope.provider.crumbs.forEach( function( element ) {
                bcWidth += element.width;
            } );
            if( isNaN( bcWidth ) ) {
                return;
            }
            if( $scope.provider.crumbs.length > 0 ) {
                var lastCrumb = $scope.provider.crumbs[ $scope.provider.crumbs.length - 1 ];
                lastCrumb.selectedCrumb = true;
            }
            var resultsFoundAreaWidth = $( '.aw-search-resultsCountArea' ).width();
            var workareaWidth = $(
                '.aw-layout-workareaTitle.aw-layout-justifyFlexStart' ).width();
            var actualDoubleLeftIconWidth = $(
                '.aw-jswidget-controlArrowNoFloat.aw-widgets-overflowChevronIcon' ).width();
            bcWidth += resultsFoundAreaWidth + clearCrumbLinkWidth;
            var crumbLength = bcWidth;
            if( !isNaN( actualDoubleLeftIconWidth ) ) {
                crumbLength += actualDoubleLeftIconWidth;
            }
            if( workareaWidth < crumbLength ) {
                $scope.handleOverflowCrumbs( workareaWidth, doubleLeftIconWidth, bcWidth );
            } else {
                $scope.handleNoOverflowCrumbs();
            }

            //Set focus on first breadcrumb
            if ( breadcrumbReFocus ) {
                var closestBreadcrumb = $( '.aw-layout-eachCrumb' )[ 0 ];
                var closestRemoveButton = $( closestBreadcrumb ).find( '.aw-widgets-removeCrumb' );
                if ( closestRemoveButton && closestRemoveButton.length > 0 ) {
                    closestRemoveButton[0].focus();
                }
                breadcrumbReFocus = false;
            }
        };

        $scope.handleOverflowCrumbsStep1 = function( workareaWidth, doubleLeftIconWidth, bcWidth ) {
            for( var i1 = 0; i1 < $scope.provider.crumbs.length; i1++ ) {
                if( i1 === $scope.breadcrumbConfig.overflowIndex - 1 ) {
                    $scope.provider.crumbs[ i1 ].overflowIconPosition = true;
                } else {
                    $scope.provider.crumbs[ i1 ].overflowIconPosition = false;
                }
            }
            // recalculating the available width & breadcrumbWidth if overflow index is not at the start of breadcrumb
            for( var i2 = 0; i2 < $scope.breadcrumbConfig.overflowIndex; i2++ ) {
                workareaWidth -= $scope.provider.crumbs[ i2 ].width;
                bcWidth -= $scope.provider.crumbs[ i2 ].width;
            }
        };

        $scope.handleOverflowCrumbsStep2_NoOverflow = function( crumbPopListInCrumbLine, crumbPopListInChevron, workareaWidth, doubleLeftIconWidth, bcWidth, i ) {
            // make the hidden display name visible.
            $scope.provider.crumbs[ i ].displayName = $scope.provider.crumbs[ i ].displayNameHidden;
            var newBreadcrumb = {
                displayName: $scope.provider.crumbs[ i ].displayNameHidden,
                displayNameHidden: $scope.provider.crumbs[ i ].displayNameHidden,
                internalName: $scope.provider.crumbs[ i ].internalName,
                internalValue: $scope.provider.crumbs[ i ].internalValue,
                value: $scope.provider.crumbs[ i ].value,
                filterType: $scope.provider.crumbs[ i ].filterType,
                indexBreadCrumb: $scope.provider.crumbs[ i ].indexBreadCrumb,
                selectedCrumb: $scope.provider.crumbs[ i ].selectedCrumb,
                showRemoveButton: $scope.provider.crumbs[ i ].showRemoveButton
            };
            if( crumbPopListInChevron.length === 0 ) {
                crumbPopListInChevron[ 0 ] = newBreadcrumb;
            } else {
                crumbPopListInChevron.push( newBreadcrumb );
            }
            bcWidth -= $scope.provider.crumbs[ i ].width;
            $scope.provider.crumbs[ i ].willOverflow = true;
        };

        $scope.handleOverflowCrumbsStep2_Overflow = function( crumbPopListInCrumbLine, crumbPopListInChevron, workareaWidth, doubleLeftIconWidth, bcWidth, i ) {
            $scope.provider.crumbs[ i ].displayName = $scope.provider.crumbs[ i ].displayNameHidden;
            // hide or show category name
            if( crumbPopListInCrumbLine.length > 0 ) {
                var foundCategory = _.findIndex( crumbPopListInCrumbLine,
                    function( aCategory ) {
                        return aCategory.displayName === $scope.provider.crumbs[ i ].displayNameHidden;
                    } );
                if( foundCategory >= 0 ) {
                    crumbPopListInCrumbLine[ foundCategory ].displayName = '';
                }
            }

            $scope.provider.crumbs[ i ].willOverflow = false;
            if( crumbPopListInCrumbLine.length === 0 ) {
                crumbPopListInCrumbLine[ 0 ] = $scope.provider.crumbs[ i ];
            } else {
                crumbPopListInCrumbLine.push( $scope.provider.crumbs[ i ] );
            }
        };

        $scope.handleOverflowCrumbsStep2 = function( crumbPopListInCrumbLine, crumbPopListInChevron, workareaWidth, doubleLeftIconWidth, bcWidth, i ) {
            if( bcWidth + doubleLeftIconWidth > workareaWidth ) {
                $scope.handleOverflowCrumbsStep2_NoOverflow( crumbPopListInCrumbLine, crumbPopListInChevron, workareaWidth, doubleLeftIconWidth, bcWidth, i );
            } else {
                $scope.handleOverflowCrumbsStep2_Overflow( crumbPopListInCrumbLine, crumbPopListInChevron, workareaWidth, doubleLeftIconWidth, bcWidth, i );
            }
        };

        $scope.handleOverflowCrumbs = function( workareaWidth, doubleLeftIconWidth, bcWidth ) {
            // if the overflow icon position is zero(i.e. at the start of crumbs) then overflow icon will take extra width.
            if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.overflowIndex === 0 ) {
                workareaWidth -= doubleLeftIconWidth;
            }

            var crumbPopListInCrumbLine = [];
            var crumbPopListInChevron = [];

            $scope.handleOverflowCrumbsStep1( crumbPopListInCrumbLine, crumbPopListInChevron, workareaWidth, doubleLeftIconWidth, bcWidth );

            for( var i = $scope.provider.crumbs.length - 1; $scope.breadcrumbConfig &&
                i >= $scope.breadcrumbConfig.overflowIndex; i-- ) {
                    $scope.handleOverflowCrumbsStep2( crumbPopListInCrumbLine, crumbPopListInChevron, workareaWidth, doubleLeftIconWidth, bcWidth, i );
            }

            $scope.provider.overflowCrumbList = crumbPopListInChevron;

            if( $scope.provider.overflowCrumbList.length ) {
                $scope.showOverflowAtStart = true;
            }
        };

        $scope.handleNoOverflowCrumbsInt = function() {
            var categoriesDisplayed = [];
            for( var i = 0; i < $scope.provider.crumbs.length; i++ ) {
                var crumb = $scope.provider.crumbs[ i ];
                crumb.willOverflow = false;
                // hide or show category name
                if( _.indexOf( categoriesDisplayed, crumb.displayNameHidden ) === -1 ) {
                    crumb.displayName = crumb.displayNameHidden;
                    categoriesDisplayed.push( crumb.displayNameHidden );
                } else {
                    crumb.displayName = '';
                }
            }

            $scope.provider.overflowCrumbList = [];
        };

        $scope.handleNoOverflowCrumbs = function() {
            // no overflow : form linear crumbs
            $scope.showOverflowAtStart = false;

            if( $scope.provider.crumbs && $scope.provider.crumbs.length > 0 ) {
                $scope.handleNoOverflowCrumbsInt();
            }
        };

        $scope.$on( 'windowResize', $scope.checkBreadcrumbOverflow );

        /**
         * timeout for breadcrumb Overflow
         */
        function breadcrumbOverflow() {
            $timeout( function() {
                $scope.checkBreadcrumbOverflow();
            }, 200 );
        }

        var filterPanelOpenListener = eventBus.subscribe( 'awPanel.reveal', function() {
            breadcrumbOverflow();
        } );
        var filterPanelCloseListener = eventBus.subscribe( 'Awp0SearchFilter.contentUnloaded', function() {
            breadcrumbOverflow();
        } );
        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( filterPanelOpenListener );
            eventBus.unsubscribe( filterPanelCloseListener );
        } );

        $scope.onOverflowChevronClick = function( event ) {
            $scope.$evalAsync( function() {
                var currElement = ngModule.element( event.currentTarget.parentElement );
                currElement.scope().$broadcast( 'awPopupWidget.open', {
                    popupUpLevelElement: ngModule.element( event.currentTarget.parentElement )
                } );
            } );
        };

        $scope.$watch( 'data.showPopup', function( newValue, oldValue ) {
            if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) && newValue !== oldValue ) {
                if( newValue === true ) {
                    $timeout( function() {
                        $( 'body' ).on( 'click', $scope.hideChevronPopUp );
                    }, 200 );
                } else {
                    $scope.chevronDataProvider.selectNone();
                    $timeout( function() {
                        $( 'body' ).off( 'click', $scope.hideChevronPopUp );
                    }, 200 );
                }
            }
        } );

        $scope.$watch( 'provider.crumbs', function( newValue, oldValue ) {
            if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) && newValue !== oldValue ) {
                $timeout( function() {
                    $scope.checkBreadcrumbOverflow();
                }, 200 );
            }
        } );

        $scope.isShapeSearchContext = function() {
            return searchFilterService.isShapeSearchContext();
        };

        $scope.doit = function() {
            eventBus.publish( 'selectSeedItem' );
        };

        /**
         * Check to see if space or enter were pressed on the overflowchevron
         */
        $scope.onOverflowChevronClickKeyPress = function( $event ) {
            if( wcagSvc.isValidKeyPress( $event ) ) {
                $scope.onOverflowChevronClick( $event );
            }
        };

        /**
         * Check to see if space or enter were pressed on the breadcrumb
         */
        $scope.breadcrumbOnSelectKeyPress = function( $event, crumb ) {
            if( wcagSvc.isValidKeyPress( $event ) ) {
                $scope.provider.onSelect( crumb );
            }
        };

        /**
         * Check to see if space or enter were pressed to remove breadcrumb
         */
        $scope.removeBreadcrumbKeyPress = function( $event, crumb ) {
            if( wcagSvc.isValidKeyPress( $event ) ) {
                breadcrumbReFocus = true;
                $scope.provider.onRemove( crumb );
            }
        };

        /**
         * Check to see if space or enter were pressed to clear breadcrumb
         */
        $scope.clearBreadcrumbKeyPress = function( $event, crumb ) {
            if( wcagSvc.isValidKeyPress( $event ) ) {
                breadcrumbReFocus = true;
                $scope.provider.clear();
            }
        };
    }
] );
