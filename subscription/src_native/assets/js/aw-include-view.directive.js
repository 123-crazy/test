// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aw-include-view.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import assert from 'assert';
import ngModule from 'angular';
import $ from 'jquery';
import 'js/Sub0SubscribeCommandPanelService';

/**
 * Defines aw-include-view element.
 * <P>
 * Define an element that is used to include other layout files. The "when" attribute is optional and may be used to
 * select layouts based on predefined condition names. The "sub-panel-context" attribute is also optional, and
 * should be used, when some information needs to be passed on to the child layout file.
 *
 * @example <aw-include-view view="viewContent" viewmodel="viewModelContent"></aw-include-view>
 *
 * @memberof NgDirectives
 * @member aw-include-view
 */
app.directive( 'awIncludeView', [
    '$compile',
    'sub0SubscribeCommandPanelService',
    function( $compile, subscribeCommandPanelService ) {
        return {
            restrict: 'E',
            scope: {
                view: '=',
                viewModel: '='
            },
            template: '<div class="aw-jswidget-summaryPage aw-layout-flexColumn"></div>',
            link: function( $scope, $element ) {
                //Automatically add class to aw-include-view
                //Should probably be done with aw-include-view element selector instead
                $element.addClass( 'aw-layout-flexbox' );

                var _getInsertionPoint = function( element ) {
                    assert( element !== null && element !== undefined, 'invalid element' );
                    var jQElement = ngModule.element( element );
                    var insertionPoint = jQElement.find( '.aw-jswidget-summaryPage.aw-layout-flexColumn' );
                    insertionPoint = ngModule.element( insertionPoint );
                    return insertionPoint;
                };

                var _decodeXML = function( text ) {
                    if( !text ) {
                        return null;
                    }

                    return text.replace( /&amp;/g, '&' ).replace( /&quot;/g, '"' ).replace( /&lt;/g, '<' )
                    .replace( /&gt;/g, '>' );
                };
                /**
                 * When the "name" changes do a full rebuild of the embedded view.
                 *
                 * This means destroy the child scope and any view models associated with it and then create a new
                 * scope and attach the new view model to it.
                 *
                 * This works similar to ng-if. See the source of that directive for more information.
                 */
                $scope.$watch( 'viewModel', function() {
                    var response = {};
                    response.view = $scope.view;
                    response.viewModel = $scope.viewModel;

                    if( $scope.viewModel ) {
                        //And initialize "when" conditions and load view / view model
                        var insertionPoint = _getInsertionPoint( $element );
                        var insertionPointScope = ngModule.element( insertionPoint ).scope().$new();
                        var htmlString = $( _decodeXML( $scope.view ) );
                        var xrtViewElement = ngModule.element( htmlString );
                        $compile( xrtViewElement )( insertionPointScope );
                        subscribeCommandPanelService.loadAssociatedViewModelAndView( response, insertionPointScope );
                        insertionPoint.empty();
                        insertionPoint.append( xrtViewElement );
                    }
                } );

                /**
                 * Fire the ng-include "$includeContentLoaded" angular event into the event bus
                 */
                $scope.$on( '$includeContentLoaded', function( $event ) {
                    eventBus.publish( $scope.currentLayoutName + '.contentLoaded', {
                        scope: $scope
                    } );
                    $event.stopPropagation();
                } );

                $scope.$on( '$destroy', function() {
                    //Clear child element contents and remove aw-include-view listeners
                    eventBus.publish( $scope.currentLayoutName + '.contentUnloaded' );
                } );
            }
        };
    }
] );
