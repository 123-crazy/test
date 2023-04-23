// Copyright (c) 2020 Siemens

/**
 * @module js/aw-lov-edit.directive
 */
import app from 'app';
import 'js/localeService';
import 'js/aw-property-lov-val.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-lov-edit.controller';

/**
 * @example TODO
 *
 * @member aw-lov-edit
 * @memberof NgElementDirectives
 */
app.directive( 'awLovEdit', [
    function() {
        return {
            restrict: 'E',
            scope: {
                prop: '='
            },
            controller: 'awLovEditController',
            templateUrl: app.getBaseUrlPath() + '/html/aw-lov-edit.directive.html'
        };
    }
] );
