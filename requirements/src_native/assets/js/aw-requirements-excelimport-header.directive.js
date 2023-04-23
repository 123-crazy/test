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
 * Directive to display a Widget for mapping of header and property in import panel.
 *
 * @module js/aw-requirements-excelimport-header.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-property-val.directive';
import 'js/aw-flex-column.directive';
import 'js/aw-flex-row.directive';
import 'js/viewModelService';
import 'js/uwPropertyService';

'use strict';

/**
 * Directive to display a Active Widget.
 *
 * @example <aw-requirements-excelimport-header prop="prop"></aw-requirements-excelimport-header>
 *
 * @member aw-requirements-excelimport-header class
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementsExcelimportHeader', //
    [ 'viewModelService', 'uwPropertyService', //
        function( viewModelSvc, uwPropertyService ) {
            return {
                restrict: 'E',
                scope: {
                    prop: '=',
                    modifiable: '=',
                    hint: '@',
                    event: '@'
                },
                controller: [ '$scope', function( $scope ) {
                    viewModelSvc.getViewModel( $scope, true );

                    if( $scope.prop && $scope.modifiable !== undefined ) {
                        uwPropertyService.setIsPropertyModifiable( $scope.prop, $scope.modifiable );
                    }
                } ],
                link: function link( $scope ) {
                    if( $scope.event ) {
                        $scope.$watchCollection( 'prop.dbValue', function _watchPropDbValue() {
                            var eventData = {};
                            eventData = {
                                reqObjectName: $scope.prop.dbValue,
                                reqIfObjectName: $scope.prop.propertyName,
                                reqIfObjectDisplayName: $scope.prop.propertyDisplayName,
                                reqIFPropertyParentName: $scope.prop.objectName

                            };
                            eventBus.publish( $scope.event, eventData );
                        } );
                    }
                },
                templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-excelimport-header.directive.html'
            };
        }
    ] );
