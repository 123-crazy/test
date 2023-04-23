// Copyright (c) 2020 Siemens

/**
 * Directive to display a popup-widget by clicking on the link, and showing up the list of items in the popup widget.
 *
 * @module js/aw-link-with-popup-menu.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-link-with-popup-menu.controller';
import 'js/aw-link-with-popup.directive';
import 'js/aw-click.directive';

/**
 * Directive to display a popup-widget by clicking on the link and show the list of items in the popup widget.
 *
 * @example <aw-link-with-popup-menu prop = "data.textLink" dataprovider= "data.revRule"></aw-link-with-popup-menu>
 *@attribute isCache : a consumer can specify true or false for the attribute.
 * If set to true/undefined : if the provided value is true, the dataProvider is initialized on the click of the link and it's response will be cached
 * and the this will be used in subsequent click on the link.
 * If set to false : if the provided value is false, the dataProvider is initialized on every click of the link.
 * <aw-link-with-popup-menu prop="ctx.userSession.props.awp0RevRule" dataprovider="data.dataProviders.revisionLink" is-cache="false"></aw-link-with-popup-menu>
 * @member aw-link-with-popup-menu
 * @memberof NgElementDirectives
 *
 *
 * @deprecated afx@4.2.0.
 * @alternative AwLink
 * @obsoleteIn afx@5.1.0
 *
 */
app.directive( 'awLinkWithPopupMenu', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=',
            id: '@',
            linkPopupMenuId: '@',
            dataprovider: '=',
            displayProperty: '@',
            useIcon: '<?',
            disable: '<',
            isCache: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-link-with-popup-menu.directive.html',
        controller: 'awLinkWithPopupMenuController',
        link: function( $scope ) {
            if( !$scope.linkPopupMenuId && $scope.id ) {
                $scope.linkPopupMenuId = $scope.id;
            }
            $scope.$watch( 'prop.uiValue', function( newValue ) {
                _.defer( function() {
                    if( newValue && newValue !== '' && newValue !== undefined ) {
                        $scope.prop.propertyDisplayName = newValue;
                    }
                } );
            } );
        }
    };
} ] );
