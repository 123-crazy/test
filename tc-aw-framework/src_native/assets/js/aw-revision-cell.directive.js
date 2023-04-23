// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Image cell directive to be used within a cell list
 *
 * @module js/aw-revision-cell.directive
 * @requires app
 * @requires js/aw-revision-cell.controller
 * @requires js/aw-default-cell-content.directive
 */
import * as app from 'app';
import 'js/aw-revision-cell.controller';
import 'js/aw-default-cell-content.directive';
import 'js/aw-warning-label.directive';
import 'js/localeService';
import 'js/aw-model-icon.directive';

'use strict';

/**
 * Revision cell directive to be used within a cell list
 *
 * @example <aw-revision-cell vmo="model"></aw-revision-cell>
 *
 * @member aw-image-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awRevisionCell', [
    'localeService',
    function( localeSvc ) {
        return {
            restrict: 'E',
            scope: {
                vmo: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-revision-cell.directive.html',
            controller: 'RevisionCellCtrl',
            link: function( $scope, $element, $attr, $controller ) {
                $scope.$watch( 'vmo', $controller.updateIcon );
                localeSvc.getTextPromise( 'AdobeMessages' ).then( function( localTextBundle ) {
                    $scope.i18n = {
                        typeLabel: localTextBundle.typeLabel,
                        revisionLabel: localTextBundle.revisionLabel,
                        quantityLabel: localTextBundle.quantityLabel,
                        expectedLabel: localTextBundle.expectedLabel
                    };
                } );
            }
        };
    }
] );
