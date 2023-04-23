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
 * Definition for the 'aw-matrix-pinned-column.directive' directive used to add html template to Pinned column of matrix.
 *
 * @module js/aw-matrix-pinned-column.directive
 */
import * as app from 'app';
import _ from 'lodash';
import hammer from 'hammer';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';
import 'js/viewModelObjectService';

/**
 * Definition for the 'aw-matrix-pinned-column.directive' directive used to add html template to Pinned column of
 * matrix.
 *
 * @member aw-matrix-pinned-column.directive
 */
app.directive( 'awMatrixPinnedColumn', [ 'viewModelObjectService',
    function( viewModelObjectSvc ) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                prop: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-matrix-pinned-column.directive.html',
            link: function( $scope, $element ) {

                var initializeOrUpdatePinnedColumn = function() {
                    var cols = $scope.prop.colDef.pinnedColumVMO;
                    var displayProp = $scope.prop.colDef.displayProperty;
                    if( cols && cols.length > 0 ) {
                        var display = {};
                        //creating map of the pinned col display value
                        _.forEach( cols, function( col ) {
                            display[ col.uid ] = col.props[ displayProp ].uiValues[ 0 ];
                        } );
                        $scope.displayVals = display;
                    }
                };

                //update the model object tied to grid with any change in model object
                var objectUpdated = eventBus.subscribe( "cdm.updated", function( eventData ) {
                    var dispProp = $scope.prop.colDef.displayProperty;
                    var modelObj = eventData.updatedObjects[ 0 ];
                    var cols = $scope.prop.colDef.pinnedColumVMO;
                    if( cols && cols.length > 0 ) {
                        _.forEach( cols, function( col ) {
                            if( modelObj && col.uid === modelObj.uid ) {
                                if( modelObj.props[ dispProp ] ) {
                                    var displayName = modelObj.props[ dispProp ].uiValues[ 0 ];
                                    $scope.displayVals[ col.uid ] = displayName;
                                }
                            }
                        } );
                    }
                } );

                initializeOrUpdatePinnedColumn();
                var grid = parsingUtils.parentGet( $scope, 'grid' );
                var gridId = grid.appScope.gridid;
                var matrixUpdated = eventBus.subscribe( gridId + ".nativeData.loaded", function() {
                    initializeOrUpdatePinnedColumn();
                } );

                var hammerMgr = new hammer.Manager( $element[ 0 ], {} );

                var singleTap = new hammer.Tap( {
                    event: 'singleTap'
                } );

                hammerMgr.add( [ singleTap ] );

                hammerMgr.on( "singleTap", function( event ) {
                    var grid = parsingUtils.parentGet( $scope, 'grid' );
                    var gridId = grid.appScope.gridid;
                    var colData = parsingUtils.parentGet( $scope, 'col' );
                    if( colData.colDef && colData.colDef.isColSelected ) {
                        colData.colDef.isColSelected = false;
                    } else {
                        colData.colDef.isColSelected = true;
                    }
                    //Selection of pinned column will always choose the first object displayed
                    var colUid = colData.colDef.pinnedColumVMO[ 0 ].uid;
                    var newVMO = viewModelObjectSvc.createViewModelObject( colUid );
                    if( newVMO ) {
                        var selectionData = {
                            "selection": newVMO,
                            "grid": grid,
                            "colObj": colData
                        };
                        eventBus.publish( gridId + ".pinnedColSelected", selectionData );
                    }
                } );

                $scope.$on( '$destroy', function() {
                    hammerMgr.destroy();
                    initializeOrUpdatePinnedColumn = null;
                    eventBus.unsubscribe( objectUpdated );
                    eventBus.unsubscribe( matrixUpdated );
                    matrixUpdated = null;
                } );
            }
        };
    }
] );
