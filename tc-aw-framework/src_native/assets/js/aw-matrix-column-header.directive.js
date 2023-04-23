// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to support custom matrix column header implementation.
 *
 * @module js/aw-matrix-column-header.directive
 */
import * as app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';
import hammer from 'hammer';
import 'js/awIconService';
import 'js/viewModelObjectService';

/**
 * Directive for custom matrix column header implementation.
 *
 * @example <aw-matrix-column-header prop="prop"></aw-matrix-column-header>
 *
 * @member aw-matrix-column-header
 * @memberof NgElementDirectives
 */
app.directive( 'awMatrixColumnHeader', [
    'awIconService',
    'viewModelObjectService',
    function( awIconSvc, viewModelObjectSvc ) {
        return {
            restrict: 'E',
            scope: {
                prop: '<',
                colindex: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-matrix-column-header.directive.html',
            link: function( $scope, $elt ) {
                var _watchPropFileUrl = function() {
                    $scope.typeIconFileUrl = '';

                    if( $scope.prop ) {
                        var newVMO = viewModelObjectSvc
                            .createViewModelObject( $scope.prop.colDef.field, "Edit" );
                        $scope.typeIconFileUrl = awIconSvc.getThumbnailFileUrl( newVMO );
                        if( $scope.typeIconFileUrl === "" ) {
                            $scope.typeIconFileUrl = awIconSvc.getTypeIconFileUrl( newVMO );
                        }
                        if( newVMO.hasThumbnail ) {
                            $scope.imageAltText = newVMO.cellHeader1;
                        } else if( newVMO.props && newVMO.props.object_type && newVMO.props.object_type.uiValue ) {
                            $scope.imageAltText = newVMO.props.object_type.uiValue;
                        } else {
                            $scope.imageAltText = newVMO.modelType && newVMO.modelType.displayName ? newVMO.modelType.displayName : '';
                        }
                    }
                };

                var infoPanelUpdatedEventDef = eventBus.subscribe( "cdm.updated", function( eventData ) {
                    var dispProp = $scope.prop.colDef.displayProperty;
                    var modelObj = eventData.updatedObjects[ 0 ];
                    if( modelObj && $scope.prop.field === modelObj.uid ) {
                        if( modelObj.props[ dispProp ] ) {
                            var displayName = modelObj.props[ dispProp ].uiValues[ 0 ];
                            if( $scope.prop.displayName !== displayName ) {
                                $scope.prop.displayName = displayName;
                                $scope.prop.colDef.displayName = displayName;
                            }
                        }
                    }
                } );

                $scope.$watch( 'prop', _watchPropFileUrl );

                var hammerMgr = new hammer.Manager( $elt[ 0 ], {} );

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
                    var renderIndex = parsingUtils.parentGet( $scope, 'renderIndex' );
                    var colIndex = renderIndex - 1;
                    var colData = parsingUtils.parentGet( $scope, 'col' );
                    if( colData.colDef && colData.colDef.isColSelected ) {
                        colData.colDef.isColSelected = false;
                    } else {
                        colData.colDef.isColSelected = true;
                    }
                    var newVMO = viewModelObjectSvc.createViewModelObject( colData.field );
                    var singleClickData = {
                        "grid": grid,
                        "renderIndex": colIndex,
                        "col": newVMO,
                        "colObj": colData
                    };
                    eventBus.publish( gridId + ".colSingleClick", singleClickData );
                } );

                hammerMgr.on( "doubleTap", function( event ) {
                    var grid = parsingUtils.parentGet( $scope, 'grid' );
                    var gridId = grid.appScope.gridid;
                    var newVMO = viewModelObjectSvc.createViewModelObject( $scope.prop.colDef.field );
                    var doubleClickData = {
                        "doubleClickedObject": newVMO
                    };
                    eventBus.publish( gridId + ".colDoubleClick", doubleClickData );
                } );
                $scope.$on( '$destroy', function() {
                    hammerMgr.destroy();
                    eventBus.unsubscribe( infoPanelUpdatedEventDef );
                } );
            }

        };
    }
] );
