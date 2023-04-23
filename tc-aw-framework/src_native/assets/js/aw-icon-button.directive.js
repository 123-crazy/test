// Copyright (c) 2020 Siemens

/**
 * Directive to display an Icon Button.
 *
 * @module js/aw-icon-button.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import analyticsSvc from 'js/analyticsService';
import $ from 'jquery';
import 'js/iconService';
import 'js/viewModelService';

/**
 * Directive to display an icon button. It can execute an action or do sub panel navigation.
 * @attribute command - an object { "action": "actionName", "iconName": "someIconName", "tooltip": "tooltip Text" }
 * @attribute size - size of the button, one of the list ['large', 'small']
 *
 * @example "<aw-icon-button class="aw-layout-right" command="buttonCommand"></aw-icon-button>";
 *
 * The command definition should be one of the two pattern:
 *
 * Use case #1: Execute an action by clicking the icon button, the command should have 'action' property:
 * buttonCommand: { "action": "actionName", "iconName": "Add", "tooltip": "Add Project" }
 *
 * Use case #2: Navigate to destination panel by clicking the icon button, the command should have 'destPanelId'
 * property, it supports an optional property 'recreatePanel' to indicate whether need recreate the destination
 * panel. Default is false, means the previously created panel is reused, panel state will be retained. 'action'
 * property is ignored in this case.
 *
 * buttonCommand: { "iconName": "Add", "tooltip": "Add Project", "destPanelId": "assignProjectSub",
 * "recreatePanel": true }
 *
 * @member aw-icon-button class
 * @memberof NgElementDirectives
 */
app.directive( 'awIconButton', [
    'iconService', 'viewModelService',
    function( iconSvc, viewModelSvc ) {
        return {
            restrict: 'E',
            scope: {
                buttonType: '@?',
                command: '=',
                size: '@?'
            },
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.action = $scope.command.action;
                if( $scope.size === 'large' ) {
                    $scope.isLarge = true;
                }
                if( $scope.buttonType === undefined || $scope.buttonType === null ) {
                    $scope.buttonType = 'submit';
                }
                $scope.doit = function( action, event ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    // Do panel navigation when there is destPanelId in command definition
                    if( $scope.command.destPanelId ) {
                        var context = {
                            destPanelId: $scope.command.destPanelId,
                            title: $scope.command.tooltip,
                            recreatePanel: $scope.command.recreatePanel,
                            mainPanelCaption: $scope.command.mainPanelCaption,
                            isolateMode: $scope.command.isolateMode,
                            supportGoBack: true
                        };
                        if( $( event.target ).closest( '.aw-command-panelContainer' ).attr( 'id' ) ) {
                            context.id = $( event.target ).closest( '.aw-command-panelContainer' ).attr( 'id' );
                        }
                        eventBus.publish( 'awPanel.navigate', context );
                    } else {
                        // get button icon Dimension
                        var elementPosition = $element[ 0 ].getBoundingClientRect();
                        declViewModel.activeCommandDimension = {
                            offsetHeight: elementPosition.height,
                            offsetLeft: elementPosition.left,
                            offsetTop: elementPosition.top,
                            offsetWidth: elementPosition.width
                        };
                        viewModelSvc.executeCommand( declViewModel, action, $scope );
                        // Log the icon-command to Analytics.
                        var sanIconCommandData = {
                            sanAnalyticsType: 'Commands',
                            sanCommandId: 'action_' + action,
                            sanPanelID: declViewModel.getPanelId() && declViewModel.getPanelId() !== 'undefined' ? declViewModel.getPanelId() : ''
                        };
                        analyticsSvc.logCommands( sanIconCommandData );
                    }
                };

                var iconImage = iconSvc.getCmdIcon( $scope.command.iconName );
                if( !iconImage ) {
                    iconImage = iconSvc.getIcon( $scope.command.iconName );
                }
                if( iconImage ) {
                    $element.html( iconImage );
                }
            } ],
            template: '<button aria-label="{{command.tooltip}}" type="{{buttonType}}" ng-class="{large:isLarge}" class="aw-base-iconButton aw-aria-border" ng-click="doit(action,$event)" title="{{command.tooltip}}"></button>',

            replace: true
        };
    }
] );
