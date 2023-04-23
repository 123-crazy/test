// Copyright (c) 2020 Siemens

/* global angular */

/**
 * @module js/aw-popup.directive
 */
import app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'js/viewModelService';
import 'js/popupService';
import 'js/aw-icon-button.directive';
import 'js/exist-when.directive';
import 'js/aw-command-bar.directive';
import ngUtils from 'js/ngUtils';
import wcagSvc from 'js/wcagService';

/**
 * Directive to hold content in a popup.
 * @example <aw-popup></aw-popup>
 * @attribute isModal : a consumer can provide an indicator whether it is a modal or modeless, if the attribute is
 *            skipped it would create a modal popup dialog.
 * @member aw-popup class
 * @memberof NgElementDirectives
 *
 * @deprecated afx@3.2.0, Moving away from angular based popup to a fully declarative widget.
 * @alternative AwPopup
 * @obsoleteIn afx@4.3.0
 */
app.directive( 'awPopup', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        replace: false,
        scope: {
            caption: '@',
            commands: '=',
            anchor: '@',
            isModal: '@?'
        },
        controller: [ '$scope', '$element', '$attrs', 'popupService', function( $scope, $element, $attrs, popupSvc ) {
            $scope.showPopup = true;

            var declViewModel = viewModelSvc.getViewModel( $scope, true );

            $scope.conditions = declViewModel.getConditionStates();
            $scope.data = declViewModel;

            // setting customize height and width
            if( angular.isDefined( popupSvc.popupInfo ) ) {
                $scope.height = popupSvc.popupInfo.height;
                $scope.width = popupSvc.popupInfo.width;
            }

            // initialize all default command condition to true
            _.forEach( $scope.commands, function( command ) {
                if( command.condition === undefined ) {
                    command.condition = true;
                }
            } );

            $scope.$on( 'awPopup.close', function() {
                $scope.closePopup();
            } );

            var closeEventRegistrationDef = eventBus.subscribe( 'awPopup.close', function( eventData ) {
                if( !eventData ) {
                    // To support existing consumers of popup
                    $scope.closePopup();
                } else if( eventData && $attrs.id === eventData.popupId ) {
                    $scope.closePopup();
                }
            } );

            $scope.$on( '$destroy', function() {
                if( closeEventRegistrationDef ) {
                    eventBus.unsubscribe( closeEventRegistrationDef );
                    closeEventRegistrationDef = null;
                }
            } );
            $scope.closePopup = function() {
                $scope.showPopup = false;

                // avoid any comment/invalid node, such as copyrights or comments in html
                var target = _.find( $element, ( item ) => {
                    return new RegExp( '^AW-POPUP$', 'i' ).test( item.nodeName );
                } );
                ngUtils.destroyNgElement( target );
                // ensure destroy any viewModel on the original scope
                var originalScope = $scope.originalScope;
                if( originalScope ) {
                    originalScope.$destroy();
                    delete $scope.originalScope;
                }

                eventBus.publish( 'awPopup.destroyed' );
            };

            this.setDraggable = function( enableDrag ) { // eslint-disable-line no-invalid-this
                var element = ngModule.element( $element );
                var objectTodragg = element.find( '.aw-popup-screenMask' ).length > 0 ? ngModule.element( element.find( '.aw-popup-contentContainer' ) ) : ngModule.element( element
                    .find( '.aw-layout-flexRowContainer' ) );
                if( enableDrag === true ) {
                    objectTodragg.draggable( {
                        handle: ngModule.element( element.find( '.aw-layout-panelTitle' ) ),
                        containment: 'document'
                    } );
                } else {
                    objectTodragg.draggable( {
                        disabled: true
                    } );
                }
            };

            wcagSvc.focusFirstDescendantWithDelay( $element[ 0 ] );
        } ],

        link: function( scope ) {
            scope.modal = Boolean( scope.isModal === undefined || scope.isModal === 'true' );
            if( _.startsWith( scope.caption, 'i18n.' ) ) {
                scope.$watch( 'data.' + scope.caption, function _watchPopupCaption( value ) {
                    scope.caption = value;
                } );
            }
            var eventData = {
                data: scope.data
            };
            eventBus.publish( 'awPopup.reveal', eventData );
        },

        templateUrl: app.getBaseUrlPath() + '/html/aw-popup.directive.html'
    };
} ] );
