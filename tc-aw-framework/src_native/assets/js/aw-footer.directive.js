// Copyright (c) 2020 Siemens

/**
 * Directive to show footer
 *
 * @module js/aw-footer.directive
 * @requires app
 * @requires lodash
 * @requires jquery
 * @requires angular
 * @requires js/eventBus
 * @requires js/aw-command-bar.controller
 * @requires js/aw-command.directive
 * @requires js/aw-icon.directive
 * @requires js/appCtxService
 * @requires js/command.service
 * @requires js/localeService
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import 'js/aw-command-bar.controller';
import 'js/aw-command.directive';
import 'js/aw-icon.directive';
import 'js/appCtxService';
import 'js/command.service';
import 'js/localeService';
import 'js/aw-include.directive';
import 'js/aw-avatar.directive';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * Directive to display the footer. This is just a differently style command bar.
 *
 * Parameters: anchor - The anchor to use when pulling commands from the command service
 *
 * @example <aw-footer anchor="aw_footer"></aw-footer>
 *
 * @member aw-footer
 * @memberof NgElementDirectives
 */
app.directive( 'awFooter', [
    'localeService',
    'appCtxService',
    'commandService',
    function( localeService, appCtxService, commandService ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-footer.directive.html',
            scope: {
                anchor: '@'
            },
            link: function( $scope, $element, $attrs, $controller ) {
                // Create a new isolated scope to evaluate commands in
                var commandScope = null;
                commandScope = $scope.$new( true );
                commandScope.ctx = appCtxService.ctx;

                if( appCtxService.ctx.user ) {
                    var ctxUser = appCtxService.ctx.user;
                    $scope.avatarSource = ctxUser.hasThumbnail ? ctxUser.thumbnailURL : ctxUser.typeIconURL;
                }

                /**
                 * Load the localized text
                 */
                localeService.getTextPromise().then( function( localTextBundle ) {
                    $scope.expandText = localTextBundle.MORE_LINK_TEXT;
                    $scope.collapseText = localTextBundle.MORE_LINK_TEXT;
                } );

                /**
                 * Load the static commands
                 */
                var loadCommands = function() {
                    if( $scope.anchor ) {
                        // Get the command overlays
                        commandService.getCommands( $scope.anchor, commandScope ).then( $controller.updateStaticCommands );
                    }
                };

                /**
                 * When the anchor option changes reload the static commands
                 */
                $scope.$watch( 'anchor', loadCommands );
                var configChangeSub = eventBus.subscribe( 'configurationChange.commandsViewModel', loadCommands );
                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( configChangeSub );
                } );

                /**
                 * When the overflow is displayed/hidden add/remove the faded class to the page.
                 */
                $scope.$watch( 'showDownArrow', function() {
                    var overlayClass = 'aw-layout-fadeInOut';
                    var locationPanel = $( '.aw-layout-locationPanel' );
                    if( locationPanel.length > 0 ) {
                        if( $scope.showDownArrow && !locationPanel.hasClass( overlayClass ) ) {
                            if( !locationPanel.hasClass( overlayClass ) ) {
                                locationPanel.addClass( overlayClass );
                            }
                        } else if( locationPanel.hasClass( overlayClass ) ) {
                            locationPanel.removeClass( overlayClass );
                        }
                    }
                } );

                /**
                 * When a command is executed close the overflow.
                 */
                $scope.$on( 'aw-command-executeCommand', function() {
                    $scope.showDownArrow = false;
                } );

                /**
                * Toggle avatar panel by publishing the sidenav open-close event
                */
                $scope.toggleAvatarPanel = function() {
                    var avatarPanelConfig = appCtxService.ctx.awSidenavConfig && appCtxService.ctx.awSidenavConfig.avatarPanel;
                    // Publish event for opening and closing the sidenav
                    eventBus.publish( 'awsidenav.openClose', {
                        id: 'globalNavigationSideNav',
                        includeView: 'avatar',
                        commandId: 'globalNavigationSideNavCommand',
                        keepOthersOpen: true,
                        config: {
                            width: avatarPanelConfig && avatarPanelConfig.width || 'STANDARD',
                            height: avatarPanelConfig && avatarPanelConfig.height || 'FULL'
                        }
                    } );
                };

                /**
                 * When user leaves narrow mode reset overflow.
                 */
                ( function handleNarrowChange() {
                    // Add listener
                    var onNarrowModeChangeListener = eventBus.subscribe( 'narrowModeChangeEvent', function(
                        data ) {
                        if( !data.isEnterNarrowMode ) {
                            $scope.$evalAsync( function() {
                                $scope.showDownArrow = false;
                            } );
                        }
                    } );

                    // And remove it when the scope is destroyed
                    $scope.$on( '$destroy', function() {
                        eventBus.unsubscribe( onNarrowModeChangeListener );
                    } );
                } )();

                /**
                 * When user clicks on something outside of the command bar hide the overflow
                 */
                ( function handleBodyClick() {
                    // Add listener
                    var bodyClickListener = function() {
                        $scope.$evalAsync( function() {
                            $scope.showDownArrow = false;
                        } );
                    };

                    ngModule.element( document.body ).on( 'click', bodyClickListener );

                    // And remove it when the scope is destroyed
                    $scope.$on( '$destroy', function() {
                        ngModule.element( document.body ).off( 'click', bodyClickListener );
                    } );
                } )();
            },
            /**
             * The directive logic is close enough to aw-command-bar to just reuse the whole controller.
             */
            controller: 'awCommandBarController'
        };
    }
] );
