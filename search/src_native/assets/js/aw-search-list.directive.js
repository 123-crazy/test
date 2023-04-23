// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-search-list.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';

'use strict';

app.directive( 'awSearchList', function() {
    return {
        restrict: 'A',
        scope: {
            callback: '&activeAction'
        },

        link: function( scope, element ) {
            /**
             * Highlights selected list element
             * @param {Object} eventData eventData
             */
            function setListItemActive( eventData ) {
                var currentIndex = eventData.currentIndex;
                var keyCode = eventData.keyCode;

                var allLists = element.find( "li" );

                if( currentIndex >= allLists.length ) {
                    currentIndex = -1;
                    scope.$parent.currentIndex = currentIndex;
                }
                if( currentIndex < 0 && allLists.length > 0 ) {
                    currentIndex = 0;
                    scope.$parent.currentIndex = currentIndex;
                }
                _.forEach( allLists, function( li ) {
                    if( li.tabIndex === currentIndex ) {
                        //if up arrow or down arrow was pressed, call the parent's callback
                        //this is to populate search box, but really you could potentially
                        //call any function
                        if( ( keyCode === 38 || keyCode === 40 ) && li.title ) {
                            scope.callback( { item: li.title } );
                        }

                        li.classList.add( 'aw-widgets-cellListItemSelected' );
                    } else {
                        li.classList.remove( 'aw-widgets-cellListItemSelected' );
                    }
                } );
            }

            //Update the selection icon when this event is fired
            var searchBoxKeyEvent = eventBus.subscribe( "searchbox.keypressed",
                function( eventData ) {
                    setListItemActive( eventData );
                } );

            //Unsubscribe events when scope is destroyed
            scope.$on( '$destroy', function() {
                eventBus.unsubscribe( searchBoxKeyEvent );
            } );
        }
    };
} );
