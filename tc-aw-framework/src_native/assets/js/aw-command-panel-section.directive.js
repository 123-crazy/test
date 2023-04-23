// Copyright (c) 2020 Siemens

/**
 * Directive to display a panel section.
 *
 * @module js/aw-command-panel-section.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-icon-button.directive';
import 'js/visible-when.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-property-image.directive';
import 'js/viewModelService';
import 'js/localeService';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display a panel section.
 *
 * @example <aw-command-panel caption="i18n.Workflow_Title">
 *
 * @member aw-command-panel-section
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.2.0.
 * @alternative AwPanelSection
 * @obsoleteIn afx@5.1.0
 */
app.directive( 'awCommandPanelSection', [
    'viewModelService', 'localeService',
    function( viewModelSvc, localeSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                caption: '@?',
                name: '@?',
                commands: '=?',
                anchor: '=?',
                context: '=?',
                collapsed: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-command-panel-section.directive.html',
            replace: true,
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );

                // initialize all default command condition to true
                _.forEach( $scope.commands, function( command ) {
                    if( command.condition === undefined ) {
                        command.condition = true;
                    }
                } );

                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.expand = localTextBundle.EXPAND;
                    $scope.collapse = localTextBundle.COLLAPSE;
                } );
                $scope.flipSectionDisplay = function() {
                    $scope.$evalAsync( function() {
                        if( $scope.isCollapsible ) {
                            $scope.collapsed = $scope.collapsed === 'true' ? 'false' : 'true';
                            eventBus.publish( 'awCommandPanelSection.collapse', {
                                isCollapsed: $scope.collapsed === 'true',
                                name: $scope.name,
                                caption: $scope.caption
                            } );
                        }
                    } );
                };

                $scope.handleKeyPress = function( event ) {
                    if ( wcagSvc.isValidKeyPress( event ) ) {
                        $scope.flipSectionDisplay();
                    }
                };
            } ],
            link: function( $scope, element ) {
                $scope.$evalAsync( function() {
                    $scope.isCollapsible = $scope.collapsed && $scope.collapsed.length > 0;
                    if( $scope.isCollapsible ) {
                        element[0].querySelector( '.aw-layout-panelSectionTitle' ).setAttribute( 'tabindex', 0 );
                    }
                } );

                // caption not have to be in "i18n.xxx" format
                if( _.startsWith( $scope.caption, 'i18n.' ) ) {
                    $scope.$watch( 'data.' + $scope.caption, function( value ) {
                        _.defer( function() {
                            // if the i18n text is not available, assign the key to caption
                            $scope.caption = value !== undefined ? value : $scope.caption.slice( 5 ); // eslint-disable-line no-negated-condition
                            $scope.$apply();
                        } );
                    } );
                }
            }
        };
    }
] );
