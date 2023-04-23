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
 * Directive to support default cell content implementation.
 * 
 * @module js/aw-editable-cell-content.directive
 */
import * as app from 'app';
import parsingUtils from 'js/parsingUtils';
import 'js/aw-list.controller';
import 'js/aw-visual-indicator.directive';
import 'js/aw-widget.directive';

/**
 * Directive for editable cell content implementation.
 * 
 * @example <aw-editable-cell-content vmo="model"></aw-editable-cell-content>
 * 
 * @member aw-editable-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awEditableCellContent', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        controller: [ '$scope', function( $scope ) {
            $scope.cellEditMode = false;
            $scope.modifiable = false;
            var editableVmObj = parsingUtils.parentGet( $scope, 'data.editableProps' );
            $scope.editableProps = editableVmObj.dbValues;
            $scope.$on( 'startEdit', function( events, args ) {
                $scope.modifiable = args;
                $scope.cellEditMode = args;
            } );
            $scope.$on( 'saveEdit', function( events, args ) {
                $scope.modifiable = args;
                $scope.cellEditMode = args;
            } );
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-editable-cell-content.directive.html'
    };
} ] );
