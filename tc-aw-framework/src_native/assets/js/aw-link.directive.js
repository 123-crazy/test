// Copyright (c) 2020 Siemens

/**
 * Directive to display a link element
 *
 * @module js/aw-link.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/command.service';
import 'js/aw-transclude.directive';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display a link element
 *
 * <pre>
 * {String} action - The action to be performed when the link is clicked
 * {Object} prop - The property to display in the link
 * {Object} selectedprop (optional) - The property to be set when a link is selected. Used when you have
 *            multiple links calling the same action.
 * </pre>
 *
 * @example <aw-link action="clickAction" prop="linkProp" selectedProp="selectedProp"></aw-navigation-widget>
 *
 * @member aw-navigation-widget
 * @memberof NgElementDirectives
 */
app.directive( 'awLink', [
    'viewModelService', 'commandService',
    function( viewModelSvc, commandService ) {
        return {
            restrict: 'E',
            scope: {
                action: '@',
                prop: '=',
                commandId: '@',
                linkId: '@',
                context: '=?',
                selectedprop: '=?',
                tabindex: '=?'
            },

            controller: [ '$scope', '$element', function( $scope, $element ) {
                /*
                 * This is used for the automation as automation need the unique id for the locator . If
                 * parent is passing the ID and it will get assigned to the link . This is for the
                 * internal purpose.
                 */

                if( $scope.$parent ) {
                    // retained 'id' to keep supporting non-AW SWF consumers, to be obsoleted
                    if( $scope.$parent.id ) {
                        $scope.linkId = $scope.$parent.id;
                    }
                    if( $scope.$parent.linkId ) {
                        $scope.linkId = $scope.$parent.linkId;
                    }
                }
                $scope.doit = function( action, selectedProp ) {
                    if( $scope.commandId ) {
                        $scope.commandContext = $scope.prop;
                        commandService.executeCommand( $scope.commandId, null, $scope, null );
                    } else if( action ) {
                        $scope.selectedprop = selectedProp;
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );

                        // adding Active link dimension positions
                        var elementPosition = $element[ 0 ].getBoundingClientRect();
                        declViewModel.activeLinkDimension = {
                            offsetHeight: elementPosition.height,
                            offsetLeft: elementPosition.left,
                            offsetTop: elementPosition.top,
                            offsetWidth: elementPosition.width
                        };
                        viewModelSvc.executeCommand( declViewModel, action, $scope );
                    }
                };

                $scope.onKeyDown = function ( action, prop ) {
                    if ( wcagSvc.isValidKeyPress( event ) ) {
                        $scope.doit( action, prop );
                    }
                };
            } ],

            templateUrl: app.getBaseUrlPath() + '/html/aw-link.directive.html'
        };
    }
] );
