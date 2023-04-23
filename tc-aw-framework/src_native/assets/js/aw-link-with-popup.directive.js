// Copyright (c) 2020 Siemens

/**
 * Directive to display a popup-widget by clicking on the link, and showing up the transcluded stuff in the popup
 * widget.
 *
 * @module js/aw-link-with-popup.directive
 */
import app from 'app';
import 'js/aw-link.directive';
import 'js/aw-icon.directive';
import 'js/aw-popup-panel2.directive';
import 'js/aw-property-image.directive';
import popupService from 'js/popupService';
import ngUtils from 'js/ngUtils';
import eventBus from 'js/eventBus';
import wcagSvc from 'js/wcagService';
import _ from 'lodash';

/**
 * Directive to display a popup-widget by clicking on the link and show the transcluded stuff in the popup widget.
 *
 * @example <aw-link-with-popup prop = "data.textLink"></aw-link-with-popup>
 *
 * @member aw-link-with-popup
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.2.0.
 * @alternative AwLink
 * @obsoleteIn afx@5.1.0
 *
 */
app.directive( 'awLinkWithPopup', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            prop: '=',
            id: '@',
            linkPopupId: '@',
            useIcon: '<?',
            disabled: '<'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-link-with-popup.directive.html',
        link: function( $scope, $element, $attrs, ctrl, $transclude ) {
            let pop = null;
            let scrollHandle = null;

            if ( !$scope.linkPopupId && $scope.id ) {
                $scope.linkPopupId = $scope.id;
            }
            $scope.showLinkPopUp = () => {
                if ( !$scope.disabled ) {
                    if ( $scope.popupElement ) {
                        popupService.hide( $scope.popupElement );
                    } else {
                        // legacy compatible, REMOVE IN FUTURE
                        legacyAdaptor();

                        // link content and show it in popup
                        $transclude( ( clone, transcludedScope ) => { showInternal( clone, transcludedScope ); } );
                    }
                }
            };
            $scope.onKeyDown = function( event ) {
                if ( wcagSvc.isValidKeyPress( event ) ) {
                    $scope.showLinkPopUp();
                }
            };

            let popupWhenOpened = ( popupElement ) => {
                $scope.popupElement = popupElement;
                pop = ngUtils.element( popupElement );
                $scope.popupElement.addEventListener( 'scroll', scrollHandle, true );
            };
            let popupWhenClosed = ( transcludedScope ) => () => {
                // ensure destroy any view/viewModel for the transclude content
                transcludedScope.$destroy();

                $scope.popupElement.removeEventListener( 'scroll', scrollHandle );
                $scope.popupElement = null;
                pop = null;
            };
            let showInternal = ( domElement, context ) => {
                // init scrollHandle and data if defined
                // support auto scroll into view feature if defined
                scrollHandle = _.debounce( () => { pop && context.handleScroll && context.handleScroll( pop ); }, 500 );
                // get popup data
                context.loadContent && context.loadContent();

                // show popup
                popupService.show( {
                    domElement,
                    context,
                    options: {
                        whenParentScrolls: 'follow',
                        reference: $element[0],
                        ignoreReferenceClick: true,
                        ignoreClicksFrom: [ 'div.ui-datepicker' ],
                        flipBehavior: 'opposite',
                        resizeToClose: true,
                        autoFocus: true,
                        selectedElementCSS: '.aw-widgets-cellListItemSelected',
                        forceCloseOthers: false,
                        hooks: {
                            whenOpened: popupWhenOpened,
                            whenClosed: popupWhenClosed( context )
                        }
                    }
                } );
            };

            // legacy compatible, REMOVE IN FUTURE
            let legacyAdaptor = () => {
                let eventData = { popupUpLevelElement: $element };
                let hide = () => { $scope.popupElement && popupService.hide( $scope.popupElement ); };
                $scope.$emit( 'awPopupWidget.init', eventData );
                $scope.$broadcast( 'awPopupWidget.open', eventData );

                $scope.$on( 'awPopupWidget.close', hide );
                let subscriber = eventBus.subscribe( 'awPopupWidget.close', hide );
                $scope.$on( '$destroy', () => { eventBus.unsubscribe( subscriber ); } );
            };
            // end
        }
    };
} ] );
