// Copyright (c) 2020 Siemens

/**
 * @module js/aw-primary-workarea.directive
 */
import app from 'app';
import 'js/aw-primary-workarea.controller';
import 'js/aw-include.directive';
import 'js/aw-layout-slot.directive';
import 'js/exist-when.directive';
import 'js/aw-in-content-search-box.directive';

/**
 * Definition for the <aw-primary-workarea> directive.
 *
 * @example <aw-primary-workarea view="'table'"></aw-primary-workarea>
 *
 * @member aw-primary-workarea
 * @memberof NgElementDirectives
 */
app.directive( 'awPrimaryWorkarea', [ function() {
    return {
        restrict: 'E',
        scope: {
            // Base name of the view models to use (ex 'inbox')
            viewBase: '=',
            // Name of the specific view that should be active (ex 'List')
            view: '=',
            // Additional context that should be passed to the view model (ex selection model)
            context: '=?',
            breadcrumbConfig: '='
        },
        controller: 'awPrimaryWorkareaCtrl',
        templateUrl: app.getBaseUrlPath() + '/html/aw-primary-workarea.directive.html',
        link: function( scope, element, attrs ) {
            element[ 0 ].addEventListener( 'focus', function( event ) {
                // Only emit event if focus was within table
                if( event.target.closest( 'aw-splm-table' ) ) {
                    scope.$emit( 'PWAFocused' );
                }
            }, true );
        }
    };
} ] );
