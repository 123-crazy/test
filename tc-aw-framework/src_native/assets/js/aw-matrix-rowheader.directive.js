// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This directive supports commands inside table cells
 *
 * @module js/aw-matrix-rowheader.directive
 */
import * as app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';
import hammer from 'hammer';
import 'js/viewModelObjectService';
import 'js/awIconService';

/**
 * Directive for custom matrix row header implementation.
 *
 * @example <aw-matrix-row-header prop="prop" commands="commands" vmo="vmo" ></aw-matrix-row-header>
 *
 * @member aw-matrix-rowheader
 * @memberof NgElementDirectives
 */
app.directive( 'awMatrixRowHeader', [
    'viewModelObjectService', 'awIconService',
    function( viewModelObjectService, awIconSvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            var scope = $scope;
            var grid = parsingUtils.parentGet( $scope, 'grid' );

            $scope.isMultiSelectEnabled = false;
            $scope.prop = scope.prop;

            if( grid && grid.options ) {
                $scope.isMultiSelectEnabled = grid.options.multiSelect;
            }

            /**
             * Listener for multi select mode changed
             */
            $scope.$on( 'table.multiSelectModeChanged', function( event, isEnabled ) {
                $scope.isMultiSelectEnabled = isEnabled;
            } );
        }

        myController.$inject = [ '$scope' ];

        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '<',
                row: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-matrix-rowheader.directive.html',
            controller: myController,
            link: function( $scope, $element ) {
                var _watchPropFileUrl = function() {
                    if( $scope.prop && $scope.row.entity.hasThumbnail === true ) {
                        $scope.prop.typeIconURL = awIconSvc.getThumbnailFileUrl( $scope.row.entity );
                        $scope.imageAltText = $scope.row.entity.cellHeader1;
                    } else {
                        $scope.prop.typeIconURL = $scope.row.entity.typeIconURL;
                        if( $scope.row.entity.props && $scope.row.entity.props.object_type && $scope.row.entity.props.object_type.uiValue ) {
                            $scope.imageAltText = $scope.row.entity.props.object_type.uiValue;
                        } else {
                            $scope.imageAltText = $scope.row.entity.modelType && $scope.row.entity.modelType.displayName ? $scope.row.entity.modelType.displayName : '';
                        }
                    }
                };
                var grid = parsingUtils.parentGet( $scope, 'grid' );
                var dataProvider = parsingUtils.parentGet( grid.appScope, 'dataprovider' );
                $scope.$watch( function() {
                    var rowHeaderDiv = $element.parent().parent();
                    var rowHeader = $element;
                    if( $scope.row !== undefined ) {
                        if( $scope.row.entity.isRowSelected ) {
                            if( !( rowHeaderDiv.hasClass( 'ui-grid-column-header-selected' ) ) ) {
                                rowHeaderDiv.addClass( 'ui-grid-column-header-selected' );
                            }
                        } else {
                            if( rowHeaderDiv.hasClass( 'ui-grid-column-header-selected' ) ) {
                                rowHeaderDiv.removeClass( 'ui-grid-column-header-selected' );
                            }
                            if( rowHeader.hasClass( 'ui-grid-column-header-selected' ) ) {
                                rowHeader.removeClass( 'ui-grid-column-header-selected' );
                            }
                        }
                    }
                } );

                var infoPanelUpdatedEventDef = eventBus.subscribe( "cdm.updated", function( eventData ) {
                    var dispProp = $scope.row.entity.displayProperty;
                    var modelObj = eventData.updatedObjects[ 0 ];
                    var updatedVMOs = {
                        'viewModelObjects': []
                    };
                    if( modelObj && $scope.row.entity.uid === modelObj.uid ) {
                        if( modelObj.props[ dispProp ] ) {
                            var displayName = modelObj.props[ dispProp ].uiValues[ 0 ];
                            if( $scope.row.entity.props.object_name.displayValues[ 0 ] !== displayName ) {
                                $scope.row.entity.props.object_name.displayValues[ 0 ] = displayName;
                                var viewModelColl = dataProvider.getViewModelCollection();
                                var loadedVMOs = viewModelColl.getLoadedViewModelObjects();
                                _.forEach( loadedVMOs, function( vmo ) {
                                    if( vmo.uid === $scope.row.entity.uid ) {
                                        vmo.props.object_name.displayValues[ 0 ] = displayName;
                                        vmo.props.object_name.uiValue = displayName;
                                    }
                                    updatedVMOs.viewModelObjects.push( vmo );
                                } );
                                dataProvider.update( updatedVMOs.viewModelObjects,
                                    updatedVMOs.viewModelObjects.length );
                            }
                        }
                    }
                } );
                $scope.$watch( 'prop', _watchPropFileUrl );
                var hammerMgr = new hammer.Manager( $element[ 0 ], {} );

                var singleTap = new hammer.Tap( {
                    event: 'singleTap'
                } );
                var doubleTap = new hammer.Tap( {
                    event: 'doubleTap',
                    taps: 2
                } );

                hammerMgr.add( [ doubleTap, singleTap ] );
                singleTap.requireFailure( doubleTap );

                hammerMgr.on( "singleTap", function( event ) {
                    var grid = parsingUtils.parentGet( $scope, 'grid' );
                    var gridId = grid.appScope.gridid;
                    var colData = parsingUtils.parentGet( $scope, 'col' );
                    if( $scope.row.entity && $scope.row.entity.isRowSelected ) {
                        $scope.row.entity.isRowSelected = false;
                    } else {
                        $scope.row.entity.isRowSelected = true;
                    }
                    var rowRenderIndex = $scope.row.entity.props[ 'object_name' ].propertyDescriptor[ 'rowIdx' ];
                    var newVMO = viewModelObjectService.createViewModelObject( $scope.row.entity.uid );
                    var singleClickData = {
                        "grid": grid,
                        "row": $scope.row,
                        "col": colData,
                        "rowRenderIndex": rowRenderIndex,
                        "rowVMO": newVMO
                    };
                    eventBus.publish( gridId + ".rowSingleClick", singleClickData );
                } );

                hammerMgr.on( "doubleTap", function( event ) {
                    var grid = parsingUtils.parentGet( $scope, 'grid' );
                    var gridId = grid.appScope.gridid;
                    var rowId = $scope.row.entity.props[ 'object_name' ].propertyDescriptor[ 'rowId' ];
                    var newVMO = viewModelObjectService.createViewModelObject( rowId, "Edit" );
                    var doubleClickData = {
                        "doubleClickedObject": newVMO
                    };
                    eventBus.publish( gridId + ".rowDoubleClick", doubleClickData );
                } );

                $scope.$on( '$destroy', function() {
                    hammerMgr.destroy();
                    eventBus.unsubscribe( infoPanelUpdatedEventDef );
                } );
            }
        };
    }
] );
