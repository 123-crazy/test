// Copyright (c) 2020 Siemens

/**
 * @module js/aw-workarea-title.directive
 */
import app from 'app';
import 'js/aw-search-breadcrumb.directive';
import 'js/aw-navigate-breadcrumb.directive';
import 'js/exist-when.directive';

/**
 * Definition for the (aw-workarea-title) directive.
 *
 * @member aw-workarea-title
 * @memberof NgElementDirectives
 */
app.directive( 'awWorkareaTitle', [ function() {
    return {
        restrict: 'E',
        scope: {
            provider: '=', // BreadCrumbProvider
            breadcrumbConfig: '='
        },
        replace: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-workarea-title.directive.html'
    };
} ] );
