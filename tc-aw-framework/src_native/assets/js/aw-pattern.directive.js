// Copyright (c) 2020 Siemens

/**
 * Directive to display pattern(s) associated with a property.
 *
 * The property must have an attribute named 'patterns' which is an array of pattern strings. The property can
 * additionally have a 'preferredPettern' attribute. It must be a string and a member in the 'patterns' array.
 *
 * If the 'patterns' array contains a single entry, then that pattern will be displayed as a String within brackets.
 *
 * If the 'patterns' array contains more than one entries, then those patterns will be displayed in a listbox. The entry
 * specified in 'preferredPattern' will be default selected in the listbox. If no 'preferredPattern'is present, then the
 * first entry in 'patterns' will be default selected. Upon changing the selection in the listbox, an event named
 * 'awPattern.newPatternSelected' is fired. The associated eventData contains the property and the newly selected
 * pattern string.
 *
 * @module js/aw-pattern.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'js/aw-property-image.directive';
import 'js/uwListService';
import 'js/modelPropertyService';
import 'js/localeService';
import 'js/uwPropertyService';

/**
 * Directive to display pattern(s) associated with a property.
 *
 * @example <aw-pattern prop="data.xxx"></aw-pattern>
 *
 * @member aw-pattern
 * @memberof NgElementDirectives
 */
app.directive( 'awPattern', [
    'uwListService',
    'modelPropertyService',
    'localeService',
    'uwPropertyService',
    function( uwListSvc, modelPropSvc, localeSvc, uwPropSvc ) {
        return {
            restrict: 'E',
            scope: {
                prop: '='
            },
            controller: [
                '$scope',
                '$element',
                function( $scope, $element ) {
                    if( !$scope.prop ) {
                        logger.warn( 'aw-pattern (controller): $scope.prop is undefined!' );
                        return;
                    }

                    $scope.setSelectedPattern = function( pattern ) {
                        uwListSvc.collapseList( $scope );

                        $scope.patternProp.dbValue = pattern;

                        var $choiceElem = $element.find( '.aw-jswidgets-choice' );
                        if( $scope.prop.selectedPattern !== pattern ) {
                            $choiceElem.addClass( 'ng-dirty' );
                        }
                        $choiceElem.focus();
                    };

                    $scope.toggleDropdown = function() {
                        if( $scope.expanded ) {
                            uwListSvc.collapseList( $scope );
                        } else {
                            uwListSvc.expandList( $scope, $element );
                        }
                        // Necessary for IOS to allow toggling after intial opening.
                        $element.find( '.aw-jswidgets-choice' ).off( 'touchstart' );
                        $element.find( '.aw-jswidgets-choice' ).on( 'touchstart', function() {
                            $scope.toggleDropdown();
                        } );
                    };

                    // The function will read the pattern from patternProp and will publish an event which will generate the next value as per the pattern
                    $scope.autoAssignIDs = function() {
                        var pattern = $scope.prop.preferredPattern;
                        if( $scope.patternProp && $scope.patternProp.dbValue ) {
                            pattern = $scope.patternProp.dbValue;
                        }
                        eventBus.publish( 'awPattern.newPatternSelected', {
                            prop: $scope.prop,
                            newPattern: pattern
                        } );
                    };
                    localeSvc.getLocalizedText( 'awAddDirectiveMessages', 'assignButtonTitle' ).then( function( result ) {
                        $scope.assignBtnTitle = result;
                    } );

                    $scope.isSinglePattern = false;
                    $scope.isMultiplePattern = false;
                    if( $scope.prop.patterns && _.isArray( $scope.prop.patterns ) ) {
                        if( $scope.prop.patterns.length === 1 ) {
                            $scope.isSinglePattern = true;
                        } else if( $scope.prop.patterns.length > 1 ) {
                            $scope.isMultiplePattern = true;

                            // Create a view model property for the patterns drop down
                            var listBoxProp = {
                                type: 'STRING'
                            };

                            $scope.patternProp = modelPropSvc.createViewModelProperty( listBoxProp );

                            // Set the default value on the view model prop
                            if( $scope.prop.preferredPattern &&
                                $scope.prop.patterns.indexOf( $scope.prop.preferredPattern ) !== -1 ) {
                                $scope.patternProp.dbValue = $scope.prop.preferredPattern;
                            } else {
                                $scope.patternProp.dbValue = $scope.prop.patterns[ 0 ];
                            }
                            $scope.prop.selectedPattern = $scope.patternProp.dbValue;
                        }
                    }
                }
            ],
            link: function( scope ) {
                if( scope.patternProp ) {
                    // Publish an event when a new pattern is selected from drop down.
                    scope.$watch( 'patternProp.dbValue', function( newValue, oldValue ) {
                        if( !_.isUndefined( newValue ) && newValue !== oldValue ) {
                            if( scope.prop.patterns.indexOf( newValue ) > -1 ) {
                                if( newValue !== scope.prop.selectedPattern ) {
                                    scope.prop.selectedPattern = newValue;
                                    if( scope.prop.isAutoAssign === undefined || scope.prop.isAutoAssign === true ) {
                                        eventBus.publish( 'awPattern.newPatternSelected', {
                                            prop: scope.prop,
                                            newPattern: newValue
                                        } );
                                    } else {
                                        uwPropSvc.setValue( scope.prop, '' );
                                    }
                                }
                            } else {
                                // Revert to earlier selection
                                scope.patternProp.dbValue = scope.prop.selectedPattern;
                            }
                        }
                    } );
                }
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-pattern.directive.html'
        };
    }
] );
