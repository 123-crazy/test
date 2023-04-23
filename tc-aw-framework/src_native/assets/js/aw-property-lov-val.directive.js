// Copyright (c) 2020 Siemens

/**
 * @module js/aw-property-lov-val.directive
 */
import app from 'app';
import 'js/localeService';
import 'js/aw.property.lov.controller';
import 'js/aw-property-error.directive';
import 'js/aw-property-image.directive';
import 'js/aw-property-lov-child.directive';
import 'js/aw-autofocus.directive';
import 'js/aw-when-scrolled.directive';
import 'js/aw-widget-initialize.directive';
import 'js/aw-validator.directive';
import 'js/aw-popup-panel2.directive';

/**
 * @example TODO
 *
 * @member aw-property-lov-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyLovVal', [
    'localeService',
    function( localeSvc ) {
        return {
            restrict: 'E',
            scope: {
                // prop comes from the parent controller's scope
                prop: '='
            },
            controller: 'awPropertyLovController',
            link: function( $scope ) {
                localeSvc.getTextPromise().then( function( localizedText ) {
                    $scope.prop.lovNoValsText = localizedText.NO_LOV_VALUES;
                } );

                $scope.popupWhenClose = function() {
                    $scope.listFilterText = '';

                    if( $scope.unbindSelectionEventListener ) {
                        $scope.unbindSelectionEventListener();
                    }

                    if( $scope.collapseList ) {
                        $scope.collapseList();
                    }

                    $scope.handleFieldExit( null, null, true );
                };

                $scope.popupTemplate = '/html/aw-property-lov-val.popup-template.html';
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-lov-val.directive.html'
        };
    }
] );
