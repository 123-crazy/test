// Copyright (c) 2020 Siemens

/**
 * Directive to display the secondary workarea.
 *
 * @module js/aw-secondary-workarea.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-xrt-summary.directive';
import 'js/aw-selection-summary.directive';
import 'js/appCtxService';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * Directive to display the secondary workarea.
 *
 * @example <aw-secondary-workarea selected="modelObjects"></aw-secondary-workarea>
 *
 * @member aw-secondary-workarea
 * @memberof NgElementDirectives
 */
app.directive( 'awSecondaryWorkarea', [ 'appCtxService', function( appCtxSvc ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/aw-secondary-workarea.directive.html',
        scope: {
            selected: '=?', // The currently selected model objects,
            context: '<?'
        },
        link: function( $scope, $element ) {
            if( !$scope.context ) {
                $scope.context = {
                    isXrtApplicable: !_.isUndefined( appCtxSvc.ctx.tcSessionData )
                };
            } else if( !$scope.context.hasOwnProperty( 'isXrtApplicable' ) ) {
                $scope.context.isXrtApplicable = !_.isUndefined( appCtxSvc.ctx.tcSessionData );
            }

            $scope.$watch( 'selected.length', function( newSelectedLength ) {
                $scope.selectedLength = newSelectedLength;
            } );

            // Set selection source to secondary workarea
            $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
                data.source = 'secondaryWorkArea';
                if( data.clearSelections ) {
                    $scope.$broadcast( 'dataProvider.selectAction', { selectAll: false } );
                }
            } );
        }
    };
} ] );
