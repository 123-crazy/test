// Copyright (c) 2020 Siemens

/**
 * Directive to support configurable clickable cell title implementation.
 *
 * @module js/aw-clickable-title.directive
 */
import app from 'app';
import 'js/aw-property-non-edit-val.directive';
import 'js/exist-when.directive';
import 'js/configurationService';
import 'js/clickableTitleService';
import _ from 'lodash';

/**
 * Directive for default cell content implementation.
 *
 * @example <aw-clickable-title title="Clicktable title text" clickable-title-id="CellTitle"></aw-clickable-title>
 * @example <aw-clickable-title prop="prop" clickable-title-id="CellTitle"></aw-clickable-title>
 *
 * @member aw-clickable-title
 * @memberof NgElementDirectives
 */
// app.directive( 'awClickableTitle', [ 'configurationService', '$timeout', 'clickableTitleService',
// function( configurationService, $timeout, clickableTitleService ) {
app.directive( 'awClickableTitle', [ 'clickableTitleService',
    function( clickableTitleService ) {
        return {
            replace: true,
            restrict: 'E',
            scope: {
                cellTitleId: '@?',
                prop: '=?',
                source: '@',
                title: '@?',
                vmo: '='
            },
            transclude: true,
            templateUrl: app.getBaseUrlPath() + '/html/aw-clickable-title.directive.html',
            link: function( $scope ) {
                $scope.commandContext = {
                    vmo: $scope.vmo
                };
                $scope.isTitleClickable = clickableTitleService.hasClickableCellTitleActions();
                $scope.doIt = function( $event ) {
                    clickableTitleService.doIt( $event, $scope );
                };
            }
        };
    }
] );
