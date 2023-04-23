// Copyright (c) 2020 Siemens

/**
 * @module js/aw-search-box.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-property-text-box-val.directive';
import 'js/aw-enter-key.directive';
import 'js/aw-icon.directive';
import 'js/localeService';
import 'js/extended-tooltip.directive';
import wcagSvc from 'js/wcagService';

/**
 * This is the directive for a search box. It takes a property to bind to the search string and an action as
 * parameters
 *
 * @example <aw-search-box prop="searchStringProperty" action="searchAction"></aw-search-box>
 *
 * @member aw-search-box
 * @memberof NgElementDirectives
 */
app.directive( 'awSearchBox', [
    'viewModelService',
    'localeService',
    function( viewModelSvc, _localeSvc ) {
        return {
            restrict: 'E',
            scope: {
                action: '@',
                prop: '=',
                placeholder: '=',
                selectAction: '@',
                changeAction: '@?'
            },
            controller: [ '$scope', '$element', function( $scope, $element ) {
                _localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.resetText = localTextBundle.CLEAR_TEXT;
                } );

                $scope.i18n = {};
                _localeSvc.getLocalizedTextFromKey( 'SearchCoreMessages.searchBox', true ).then( result => $scope.i18n.searchBox = result ).catch( () => {} );

                $scope.focused = false;
                $scope.doit = function( action ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    viewModelSvc.executeCommand( declViewModel, action, $scope );
                };

                $scope.doChangeAction = function() {
                    if( $scope.changeAction ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.changeAction, $scope );
                    }
                };

                $scope.searchBoxSelected = function( $event ) {
                    $event.target.select();
                };

                $scope.setFocus = function( isFocused ) {
                    $scope.focused = isFocused;
                    if( $scope.focused && $scope.prop ) {
                        $scope.prop.isEnabled = true;
                    }
                    if( $scope.$parent.focusEvent ) {
                        $scope.$parent.focusEvent( isFocused );
                    }
                };

                $scope.getPlaceHolder = function() {
                    if( $scope.placeholder && $scope.placeholder.dbValue ) {
                        return $scope.placeholder.dbValue;
                    }

                    return '';
                };

                $scope.selectSearchBox = function() {
                    var searchBox = $element.find( 'input' )[ 0 ];
                    if( searchBox ) {
                        searchBox.focus();
                    }
                };

                $scope.reset = function( $event ) {
                    $event.stopPropagation();
                    $scope.prop.dbValue = '';
                    $scope.doChangeAction();
                };

                var doSuggestionItemSelectionListener = eventBus.subscribe( 'search.selectSearchBox', function( eventData ) {
                    if( eventData.action && eventData.action === $scope.action ) {
                        $scope.selectSearchBox();
                    }
                } );

                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( doSuggestionItemSelectionListener );
                } );

                /**
                 * Check to see if space or enter were pressed on clear in searchbox
                 */
                $scope.resetKeyPress = function( $event ) {
                    $event.stopPropagation();
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.reset( $event );
                    }
                };

                /**
                 * Check to see if space or enter were pressed on perform search in searchbox
                 */
                $scope.performSearchKeyPress = function( $event, action ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.doit( action );
                    }
                };
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-search-box.directive.html'
        };
    }
] );
