// Copyright (c) 2020 Siemens

/**
 * @module js/aw-in-content-search-box.directive
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
 * This is the directive for an in-content search box. It takes a property to bind to the search string and an action as
 * parameters
 *
 * @example <aw-in-content-search-box prop="searchStringProperty" action="searchAction"></aw-in-content-search-box>
 *
 * @member aw-in-content-search-box
 * @memberof NgElementDirectives
 */
app.directive( 'awInContentSearchBox', [
    'viewModelService', 'localeService',
    function( viewModelSvc, localeSvc ) {
        return {
            restrict: 'E',
            scope: {
                action: '@',
                prop: '=',
                selectAction: '@'
            },
            controller: [ '$scope', '$element', function( $scope, $element ) {
                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.resetText = localTextBundle.RESET_TEXT;
                } );
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
                    if( $scope.$parent.focusEvent ) {
                        $scope.$parent.focusEvent( isFocused );
                    }
                };

                localeSvc.getLocalizedTextFromKey( 'SearchCoreMessages.inContentSearchPlaceHolder' ).then( result => $scope.inContentSearchPlaceHolder = result );

                $scope.selectSearchBox = function() {
                    var searchBox = $element.find( 'input' )[ 0 ];
                    if( searchBox ) {
                        searchBox.focus();
                    }
                };

                var clearSearchBoxListener = eventBus.subscribe( 'search.clearSearchBox', function() {
                    $scope.prop.dbValue = '';
                } );

                $scope.reset = function( isFocused ) {
                    $scope.prop.dbValue = '';
                    $scope.doChangeAction();
                };

                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( clearSearchBoxListener );
                } );

                /**
                 * Check to see if space or enter were pressed on perform search in content searchbox
                 */
                $scope.performSearchInContentKeyPress = function( $event, action ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.doit( action );
                    }
                };

                /**
                 * Check to see if space or enter were pressed on clear search in content searchbox
                 */
                $scope.clearInContentKeyPress = function( $event, action ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.reset();
                    }
                };
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-in-content-search-box.directive.html'
        };
    }
] );
