// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-search.directive
 */
import app from 'app';
import 'js/aw-i18n.directive';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-search-box.directive';
import 'js/aw-search.controller';
import 'js/awSearchService';
import 'js/Awp0SearchHighlightingService';
import 'js/aw-link.directive';
import 'js/aw-repeat.directive';
import 'js/aw-search-list.directive';

'use strict';

/**
 * Directive to show search box and suggestions
 *
 * @example <aw-search suggestions="true" suggestion-action="getSuggestions" show-popup="showPopup"></aw-search>
 *
 *
 * @member aw-search
 * @memberof NgElementDirectives
 */
app.directive( 'awSearch', [
    function() {
        return {

            restrict: 'E',
            scope: {
                showSuggestions: '=',
                suggestionAction: '=',
                showPopup: '=',
                prop: '='
            },
            controller: 'awSearchController',
            link: function( scope, elem, $attr, $controller ) {
                scope.displayClearAll = true;
                scope.showMoreFlag = true;

                $controller.handleSearchListener();
                $controller.initWidget();

                scope.$watch( 'data.searchBox.dbValue', function( value ) {
                    if( !scope.disableListUpdate ) {
                        scope.filterItems = value;
                    }
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-search.directive.html'
        };
    }
] );

/**
 * Filter to filter and rank recent search objects based on the search criteria provided
 */
app.filter( 'recentSearchFilter', [ 'Awp0SearchHighlightingService', function( Awp0SearchHighlightingService ) {
    return function( items, criteria ) {
        if( items === undefined || !items || items.length === 0 ) {
            return [];
        }

        if( criteria === undefined || !criteria || criteria.length === 0 ) {
            for( var i = 0; i < items.length; i++ ) {
                items[ i ].score = 0;
            }
            return items;
        }

        // split search criteria on space
        var searchTerms = criteria.split( ' ' );

        for( var k = 0; k < items.length; k++ ) {
            items[ k ].score = 0;
            searchTerms.forEach( function( term ) {
                if( term && term.length ) {
                    var regExp = new RegExp( Awp0SearchHighlightingService.escapeRegexSpecialChars( term ), 'gi' );
                    var result = items[ k ].value.criteria.match( regExp );
                    if( result ) {
                        for( var j = 0; j < result.length; j++ ) {
                            items[ k ].score += result[ j ].length;
                        }
                    }
                }
            } );

        }
        //return only the items that match something
        return items.filter( function( item ) {
            return item.score > 0;
        } );

    };
} ] );
