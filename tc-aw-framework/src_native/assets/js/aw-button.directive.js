// Copyright (c) 2020 Siemens

/**
 * Directive to display a block button using xrt styling.
 *
 * @module js/aw-button.directive
 */
import app from 'app';
import analyticsSvc from 'js/analyticsService';
import buttonStyles from 'js/buttonStyles';
import 'js/viewModelService';
import 'js/aw-click.directive';

const DEFAULT_BUTTON_STYLE = 'accent-high-contrast';

/**
 * Directive to display a block button using xrt styling.
 *
 * @example <aw-button action="submit">Submit</aw-button>
 * @attribute action - the action will be called when clicked. This is a mandatory attribute.
 * @attribute default - for the default button.
 * @attribute buttonType - It takes one of the values ['base', 'sole', 'positive', 'accent-positive', 'negative', 'accent-negative',
 *   'caution', 'accent-caution', 'accent-high-contrast', 'accent-mid-contrast', 'accent-marketing', 'chromeless'].
 *   This is an optional attribute.
 * @attribute size - This is an optional attribute and can be used to dictate the horizontal layout. It can take one of the two value ['stretched', 'auto']. By default button is stretched.
 * @member aw-button
 * @memberof NgElementDirectives
 */
app.directive( 'awButton', [
    'viewModelService',
    function( viewModelSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                action: '@',
                default: '=?',
                buttonType: '@?',
                size: '@?'
            },
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.doit = function( action, $event ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    // application require the native event for follow-up actions
                    // eg: position the popup at click position
                    $scope.$event = $event;

                    // get activeButtonDimension
                    var elementPosition = $element[ 0 ].getBoundingClientRect();
                    declViewModel.activeButtonDimension = {
                        offsetHeight: elementPosition.height,
                        offsetLeft: elementPosition.left,
                        offsetTop: elementPosition.top,
                        offsetWidth: elementPosition.width
                    };
                    viewModelSvc.executeCommand( declViewModel, action, $scope );

                    var sanCommandData = {
                        sanAnalyticsType: 'Button',
                        sanCommandId: 'action_' + action,
                        sanPanelID: declViewModel.getPanelId() && declViewModel.getPanelId() !== 'undefined' ? declViewModel.getPanelId() : ''
                    };
                    analyticsSvc.logCommands( sanCommandData );
                };
                if( $scope.default !== undefined && !$scope.default ) {
                    $element.addClass(  buttonStyles.getButtonStyle( 'base' ) );
                }
            } ],
            link: function( $scope, $element ) {
                $element.addClass( buttonStyles.getButtonStyle( $scope.buttonType, DEFAULT_BUTTON_STYLE ) );

                if( $scope.size === 'auto' ) {
                    $element.addClass( 'aw-base-size-auto' );
                }
            },
            template: '<button class="aw-base-blk-button" aw-click="doit(action, $event)" aw-click-options="{ debounceDoubleClick: true }" ng-transclude ></button>',
            replace: true
        };
    }
] );
