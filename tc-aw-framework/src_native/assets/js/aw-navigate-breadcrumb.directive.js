// Copyright (c) 2020 Siemens

/**
 * Directive to display navigation breadcrumb.
 *
 * @module js/aw-navigate-breadcrumb.directive
 */
import app from 'app';
import 'js/aw-navigate-breadcrumb.controller';
import 'js/aw-property-image.directive';
import 'js/localeService';
import 'js/aw-repeat.directive';
import 'js/exist-when.directive';
import 'js/aw-list.directive';
import 'js/aw-default-cell.directive';
import 'js/aw-popup-panel.directive';
import 'js/aw-scrollpanel.directive';

/**
 * Directive to display the navigation bread crumb
 *
 * @example <aw-navigate-breadcrumb></aw-navigate-breadcrumb>
 * @member aw-navigate-breadcrumb
 * @memberof NgElementDirectives
 */
app.directive( 'awNavigateBreadcrumb', [ 'localeService', function( localeSvc ) {
    return {
        restrict: 'E',
        scope: {
            provider: '=?',
            breadcrumbConfig: '=',
            compact: '@?'
        },
        link: function( scope ) {
            localeSvc.getTextPromise().then( function( localTextBundle ) {
                scope.loadingMsg = localTextBundle.LOADING_TEXT;
                scope.breadCrumb = localTextBundle.BREADCRUMB;
            } );
        },
        controller: 'awNavigateBreadcrumbController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-navigate-breadcrumb.directive.html'
    };
} ] );
