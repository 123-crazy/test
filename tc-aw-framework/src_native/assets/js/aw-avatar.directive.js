// Copyright (c) 2020 Siemens

/**
 * Directive to display a thumbnail avatar using xrt thumbnail image styling
 *
 * @module js/aw-avatar.directive
 */
import app from 'app';
import _ from 'lodash';
import logger from 'js/logger';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/appCtxService';
import declUtils from 'js/declUtils';
import wcagSvc from 'js/wcagService';
import AwTimeoutSvc from 'js/awTimeoutService';

/**
 *  Directive to display a thumbnail avatar using xrt thumbnail image styling.
 *
 * @example <aw-avatar source="data.imageLink" size="small" name="Beatrice Howell"></aw-avatar>
 * @attribute source : URL to image for avatar icon.
 * size : specify avatar size; it can take a value from xsmall, small, medium, large, xlarge.
 * name : name to create initials for avatar. The first letter of each word will be used for display.
 * icon : icon to show in avatar, if not specified, it would show a placeholder icon.
 * full-layout : set to "true" to show avatar with full name. If full-layout is specified, text-position needs to be given.
 * text-position : Specify where to show the full name. It can take a value from "RIGHT", "BOTTOM". If "RIGHT" is specified,
 * it shows the name on the right of icon, and it shows below icon if "BOTTOM" is specified.
 * @member aw-avatar
 * @memberof NgElementDirectives
 */
app.directive( 'awAvatar', [
    'viewModelService',
    'appCtxService',
    function( viewModelSvc, appCtxSvc ) {
        return {
            restrict: 'E',
            scope: {
                action: '@',
                source: '=',
                size: '@',
                name: '=',
                icon: '@',
                fullLayout: '=',
                textPosition: '@'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-avatar.directive.html',
            controller: [ '$scope', function( $scope ) {
                $scope.ctx = appCtxSvc.ctx;

                if( $scope.fullLayout && !$scope.name ) {
                    logger.error( 'name attribute is required if full-layout is used' );
                }

                // default placeholder icon and size values
                $scope.icon = $scope.icon || 'cmdUser';
                $scope.size = $scope.size || 'small';

                var getInitialsFromString = function( str ) {
                    var output = '';
                    var strings = str.split( ' ' );

                    _.forEach( strings, function( word ) {
                        if( word !== '' ) {
                            output += word[ 0 ];
                        }
                    } );

                    return output;
                };

                if( $scope.name ) {
                    $scope.initials = getInitialsFromString( $scope.name.propertyDisplayName );

                    if( $scope.initials.length > 2 ) {
                        $scope.initials = '';
                    }
                }

                $scope.onClick = function() {
                    if( $scope.action ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    }
                };

                $scope.handleKeyPress = function( event ) {
                    if ( wcagSvc.isValidKeyPress( event ) ) {
                        $scope.onClick();
                    }
                };
            } ],
            link: function( $scope, $element ) {
                if( !declUtils.isNil( $scope.source ) ) {
                    $scope.source = $scope.source.replace( /\bassets\b\//gm, app.getBaseUrlPath() + '/' );
                }
                AwTimeoutSvc.instance( function() {
                    wcagSvc.updateArialabel( $element[ 0 ], '.aw-generic-avatar', 'UIElementsMessages' );
                } );
            }
        };
    }
] );
