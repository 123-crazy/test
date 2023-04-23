// Copyright (c) 2020 Siemens

/**
 * Transclusion directive that replaces instead of appending. Adapted from
 * https://github.com/angular/angular.js/blob/master/src/ng/directive/ngTransclude.js.
 *
 * @module js/aw-transclude-replace.directive
 */
import app from 'app';
import logger from 'js/logger';

/**
 * Definition for the <aw-transclude-replace> directive.
 *
 * @example <div aw-transclude-replace="body"></div>
 *
 * @member aw-transclude-replace
 * @memberof NgElementDirectives
 */
app.directive( 'awTranscludeReplace', [
    '$compile',
    function( $compile ) {
        return {
            restrict: 'EAC',
            terminal: true,
            compile: function( tElement ) {
                // Remove and cache any original content to act as a fallback
                var fallbackLinkFn = $compile( tElement.contents() );
                tElement.empty();

                return function ngTranscludePostLink( $scope, $element, $attrs, controller, $transclude ) {
                    var useFallbackContent = function() {
                        // Since this is the fallback content rather than the transcluded content,
                        // we link against the scope of this directive rather than the transcluded scope
                        fallbackLinkFn( $scope, function( clone ) {
                            $element.replaceWith( clone );
                        } );
                    };

                    var ngTranscludeCloneAttachFn = function( clone, transcludedScope ) {
                        if( clone.length ) {
                            $element.replaceWith( clone );
                        } else {
                            useFallbackContent();
                            // There is nothing linked against the transcluded scope since no content was available,
                            // so it should be safe to clean up the generated scope.
                            transcludedScope.$destroy();
                        }
                    };

                    // If the attribute is of the form: `ng-transclude="ng-transclude"` then treat it like the default
                    if( $attrs.awTranscludeReplace === $attrs.$attr.awTranscludeReplace ) {
                        $attrs.awTranscludeReplace = '';
                    }
                    var slotName = $attrs.awTranscludeReplace || $attrs.awTranscludeReplaceSlot;

                    if( !$transclude ) {
                        logger.error( 'orphan', 'Illegal use of ngTransclude directive in the template! ' +
                            'No parent directive that requires a transclusion found. ' + 'Element: {0}',
                            $element );
                    } else {
                    // If the slot is required and no transclusion content is provided then this call will throw an error
                    $transclude( ngTranscludeCloneAttachFn, null, slotName );
                    // If the slot is optional and no transclusion content is provided then use the fallback content
                    if( slotName && !$transclude.isSlotFilled( slotName ) ) {
                        useFallbackContent();
                    }
                    }
                };
            }
        };
    }
] );
