// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to support default cell implementation.
 * 
 * @module js/aw-editable-cell.directive
 */
import * as app from 'app';
import $ from 'jquery';
import parsingUtils from 'js/parsingUtils';
import eventBus from 'js/eventBus';
import 'js/aw-list.controller';
import 'js/aw-model-icon.directive';
import 'js/aw-editable-cell-content.directive';
import 'js/editHandlerService';

/**
 * Directive for editable cell implementation.
 * 
 * @example <aw-editable-cell vmo="model"></aw-editable-cell>
 * 
 * @member aw-editable-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awEditableCell', [
    'editHandlerService',
    function( editService ) {
        return {
            restrict: 'E',
            scope: {
                vmo: '='
            },
            controller: [
                '$scope',
                function( $scope ) {
                    $scope.isProgressEditing = false;

                    /**
                     * Start edit the list cell
                     * 
                     * @return {Void}
                     */
                    $scope.startCellEdit = function( event ) {
                        var editableVmObj = parsingUtils.parentGet( $scope, 'data.editableProps' );
                        $scope.editableProps = editableVmObj.dbValues;
                        if( $scope.editableProps && !$scope.isProgressEditing ) {

                            event.stopPropagation();
                            var editHandler = editService.getEditHandler( "LIST_CELL_CONTEXT" );
                            if( editHandler ) {
                                editHandler.startEdit();
                                $scope.$broadcast( 'startEdit', true );
                            }

                            // trigger click event for stooping the editability of other cell if open
                            $( 'body' ).triggerHandler( 'click' );
                            for( var i = 0; i < $scope.editableProps.length; i++ ) {
                                var prop = $scope.vmo.props[ $scope.editableProps[ i ] ];
                                if( prop ) {
                                    prop.autofocus = true;
                                }
                            }

                            $scope.isProgressEditing = true;
                            $scope._bodyClickListener = function( event2 ) {
                                $scope.stopCellEdit( $scope, event2 );
                            };

                            $( 'body' ).off( 'click touchstart', $scope._bodyClickListener ).on(
                                'click touchstart', $scope._bodyClickListener );
                        }
                    };

                    /**
                     * Stop edit the list cell
                     * 
                     * @return {Void}
                     */
                    $scope.stopCellEdit = function( $scope, event ) {
                        var target = $( event.target );
                        var cell = target.closest( '.aw-widgets-propertyValContainer' );
                        if( cell.length === 0 || !cell.scope() || !cell.scope().prop ) {

                            $scope.isProgressEditing = false;
                            var editHandler = editService.getEditHandler( "LIST_CELL_CONTEXT" );
                            if( editHandler ) {
                                editHandler.saveEdits();
                                $scope.$broadcast( 'saveEdit', false );
                                for( var i = 0; i < $scope.editableProps.length; i++ ) {
                                    var prop = $scope.vmo.props[ $scope.editableProps[ i ] ];
                                    if( prop ) {
                                        prop.autofocus = false;
                                    }
                                }
                                var parentDataProvider = parsingUtils.parentGet( $scope, 'dataprovider' );
                                $scope.$evalAsync( function() {
                                    $scope.vmo.selected = false;
                                    parentDataProvider.selectionModel
                                        .addOrRemoveSelectedObjects( $scope.vmo, false );

                                } );
                            }

                            $( 'body' ).off( 'click touchstart', $scope._bodyClickListener );
                            delete $scope._bodyClickListener;
                        }
                    };
                    /**
                     * destroy
                     * 
                     * @return {Void}
                     */

                    $scope.$on( '$destroy', function handleDestroy() {
                        //remove edit handler 
                        $( 'body' ).off( 'click touchstart', $scope._bodyClickListener );
                        delete $scope._bodyClickListener;
                        editService.removeEditHandler( "LIST_CELL_CONTEXT" );

                    } );
                }
            ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-editable-cell.directive.html'
        };
    }
] );
