// Copyright (c) 2020 Siemens

/**
 * Directive to display panel section.
 *
 * @module js/aw-panel-section.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-property-image.directive';
import 'js/viewModelService';
import 'js/localeService';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display panel section. Requires caption and name. The collapsed variable on scope is optional and by
 * default, all sections are set to collapsed = false in case the variable does not exist on the scope.
 *
 * @example <aw-panel-section caption="" name="" collapsed=""></aw-panel-section>
 *
 * @member aw-panel-section
 * @memberof NgElementDirectives
 */
app.directive( 'awPanelSection', [
    'viewModelService', 'localeService',
    function( viewModelSvc, localeSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                caption: '@?',
                name: '@?',
                collapsed: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-panel-section.directive.html',
            replace: true,
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );
                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.expand = localTextBundle.EXPAND;
                    $scope.collapse = localTextBundle.COLLAPSE;
                } );

                $scope.flipSectionDisplay = function() {
                    $scope.$evalAsync( function() {
                        if( $scope.isCollapsible ) {
                            $scope.collapsed = $scope.collapsed === 'true' ? 'false' : 'true';
                            eventBus.publish( 'awPanelSection.collapse', {
                                isCollapsed: $scope.collapsed === 'true',
                                name: $scope.name,
                                caption: $scope.caption
                            } );
                        }
                    } );
                };

                $scope.handleKeyPress = function( event ) {
                    if( wcagSvc.isValidKeyPress( event ) ) {
                        $scope.flipSectionDisplay();
                    }
                };
            } ],
            link: function( $scope, element ) {
                // developer test - collapse all sections by default. Will be deleted once getDeclarativeStylesheets
                // SOA starts providing this input
                // $scope.isCollapsed = true;

                $scope.$evalAsync( function() {
                    $scope.isCollapsible = $scope.collapsed && $scope.collapsed.length > 0;
                    if( $scope.isCollapsible ) {
                        element[ 0 ].querySelector( '.aw-layout-panelSectionTitle' ).setAttribute( 'tabindex', 0 );
                    }
                } );

                // caption not have to be in "i18n.xxx" format
                if( _.startsWith( $scope.caption, 'i18n.' ) ) {
                    $scope.$watch( 'data.' + $scope.caption, function _watchPanelCaption( value ) {
                        _.defer( function() {
                            // if the i18n text is not available, assign the key to caption
                            $scope.caption = value !== undefined ? value : $scope.caption.slice( 5 ); // eslint-disable-line no-negated-condition
                            $scope.$apply();
                        } );
                    } );
                }
                // add listener for panel section's title state update
                $scope.$on( 'captionTitleState.updated', function( event, eventData ) {
                    $scope.hideTitle = eventData.hideCaptionTitle;
                } );
                $scope.$applyAsync( function() {
                    wcagSvc.updateMissingButtonInForm( element[0] );
                } );
                // wcag attributes to address form elements are not grouped
                element.attr( 'role', 'group' );
                element.attr( 'aria-label', $scope.caption ? $scope.caption : _.uniqueId( 'Group ' ) );
            }
        };
    }
] );
