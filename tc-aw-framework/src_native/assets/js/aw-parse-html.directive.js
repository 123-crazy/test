// Copyright (c) 2020 Siemens

/**
 * Definition for the 'aw-parse-html' directive used to parse URL text and replace them with actual links.
 *
 * @module js/aw-parse-html.directive
 */
import app from 'app';
import 'js/sanitizer';
import 'js/appCtxService';

/**
 * Definition for the 'aw-parse-html' directive used to parse URL text and replace them with actual links.
 *
 * @member aw-parse-html
 * @memberof NgAttributeDirectives
 */
app.directive( 'awParseHtml', [
    'sanitizer', 'appCtxService',
    function( sanitizer, appCtxService ) {
        /**
         * @private
         */
        return {
            restrict: 'A',
            replace: true,
            scope: {
                displayVal: '<',
                isRichText: '<',
                renderingHint: '<'
            },
            link: function( $scope, $element ) {
                $scope.$watchGroup( [ function _watchHighlighter() {
                        var highlighter = appCtxService.ctx.highlighter;
                        if( highlighter ) {
                            return highlighter.regEx;
                        }
                    }, 'displayVal' ],
                    function() {
                        var parsedHtml = $scope.displayVal;

                        var highlighter = appCtxService.ctx.highlighter;

                        if( parsedHtml ) {
                            var isRichText = $scope.isRichText;

                            if( !isRichText || isRichText && $scope.renderingHint ) {
                                // escape HTML string
                                parsedHtml = sanitizer.htmlEscapeAllowEntities( parsedHtml, true, true );
                            }
                        }
                        if( highlighter ) {
                            parsedHtml = parsedHtml.replace( highlighter.regEx, ( match, chk, param ) => chk ? match : highlighter.style.replace( '$1', param ) );
                        }
                        parsedHtml = !parsedHtml ? '' : parsedHtml;
                        if( $element[ 0 ].innerHTML !== parsedHtml ) {
                            $element.html( parsedHtml );
                        }
                    } );
            }
        };
    }
] );
