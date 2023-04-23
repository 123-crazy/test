// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-search-snippets.directive
 */
import app from 'app';
import 'js/aw-icon.directive';
import 'js/localeService';
import 'jquery';
'use strict';
/*eslint-disable-next-line valid-jsdoc*/
/**
 * Directive to show Chart and selectors
 *
 * @example <aw-search-snippets></aw-search-snippets>
 *
 */
app.directive( 'awSearchSnippets', [
    function() {
        return {
            restrict: 'E',
            scope: {
                vmo: '='
            },

            transclude: true,
            templateUrl: app.getBaseUrlPath() + '/html/aw-search-snippets.directive.html',

            controller: [ '$scope', 'localeService', function( $scope, localeSvc ) {
                $scope.i18n = {};
                localeSvc.getLocalizedTextFromKey( 'SearchMessages.fileNameSnippetMessage', true ).then( result => $scope.i18n.fileNameSnippetTitle = result );
             } ]
        };
    }
] );
