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
 * @module js/aw-xrt.directive
 */
import * as app from 'app';
import _ from 'lodash';
import 'js/aw-xrt.controller';
import 'js/editHandlerService';
import 'js/xrtParser.service';
import 'js/aw-tab-container.directive';
import 'js/aw-tab.directive';

/**
 * Display the piece of UI defined by XRT. It will call getDeclarativeStyleSheets SOA to get declarative Supported
 * type attribute could be "CREATE", "SUMMARY", "INFO".
 * 
 * @example <aw-xrt type="INFO" target-page="attachments" vmo="{{ctx.selected}}"></aw-xrt>
 * 
 * @memberof NgDirectives
 * @member aw-xrt
 */
app.directive( 'awXrt', [
    'xrtParserService',
    'editHandlerService', //
    function( xrtParserSvc, editHandlerService ) {
        return {
            restrict: 'E',
            scope: {
                type: '@',
                objectType: '@?',
                vmo: '=?',
                viewModel: '=?',
                includeTabs: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-xrt.directive.html',
            controller: 'awXrtController',
            link: function( $scope, element, attrs, ctrl ) {

                if( $scope.hasOwnProperty( 'vmo' ) ) {
                    $scope.$watch( 'vmo', function _watchXrtVmo( newValue, oldValue ) {

                        var editHandlerContextConstant = {
                            INFO: "INFO_PANEL_CONTEXT",
                            SUMMARY: "NONE"
                        };

                        var handler = function() {
                            // If VMO is changing, that means new object has been selected or existing object has been unselected.
                            // Hence we need reset the target page to blank.
                            // If object is visible in secondary and we are changing tab, vmo watcher is not fired that time.
                            $scope.targetPage = "";
                            if( _.isNull( newValue ) || _.isUndefined( newValue ) ) {
                                ctrl.clearXrtContent( $scope.targetPage );
                            } else if( newValue.uid ) {
                                // The newValue is valid as it has a uid.
                                // Check if it is different from the oldValue.
                                if( !oldValue || ( oldValue.uid !== newValue.uid ) ) {
                                    ctrl.updateSummary( $scope.type, $scope.targetPage, $scope.vmo );
                                }
                            }
                        };

                        var vmoUidChanged = ( newValue && oldValue && newValue.uid !== oldValue.uid ) ||
                            !newValue || !oldValue;
                        var eh = editHandlerService.getEditHandler( editHandlerContextConstant[ $scope.type ] );
                        if( eh && vmoUidChanged ) {
                            eh.leaveConfirmation( handler );
                        } else {
                            handler();
                        }

                    } );
                }

                //If the xrt is given a view model to display 
                if( $scope.hasOwnProperty( 'viewModel' ) ) {
                    //watch the viewModel for changes
                    $scope.$watch( 'viewModel', ctrl.onViewModelChange );
                }

                $scope.$watch( 'objectType', function _watchXrtObjectType( newObjectType, oldObjectType ) {
                    if( newObjectType && newObjectType !== oldObjectType ) {
                        if( !$scope.targetPage ) {
                            $scope.targetPage = "";
                        }

                        ctrl.clearXrtContent( $scope.targetPage );
                        ctrl.updateSummary( $scope.type, $scope.targetPage, $scope.vmo, newObjectType );
                    }
                } );
            },
            replace: true
        };
    }
] );
