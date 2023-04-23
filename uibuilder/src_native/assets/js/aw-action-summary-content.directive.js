// Copyright (c) 2020 Siemens

/**
 * @module js/aw-action-summary-content.directive
 */
import app from 'app';
import logger from 'js/logger';
import 'js/aw-action-summary-content.controller';

// eslint-disable-next-line valid-jsdoc
/**
 * Display a view model that is already loaded
 *
 * @example <aw-action-summary-content view-model="viewModel"></aw-action-summary-content>
 *
 * @memberof NgDirectives
 * @member aw-action-summary-content
 */
app.directive( 'awActionSummaryContent', [
    function() {
        return {
            restrict: 'E',
            scope: {
                /**
                 * An already created and initialized view model to render.
                 */
                viewModel: '='
            },
            controller: 'awActionSummaryContentController',
            link: function( $scope, $element, $attrs, $ctrl ) {
                //Render the already loaded view model
                $scope.$watch( 'viewModel', function( newVm, oldVm ) {
                    if( oldVm && oldVm !== newVm ) {
                        $ctrl.detachViewModel( $element );
                    }
                    if( newVm ) {
                        $ctrl.attachViewModel( $element, newVm );
                    }
                    logger.trace( 'View model changed', newVm, oldVm );
                } );

                $scope.$on( '$destroy', function() {
                    if( $scope.viewModel ) {
                        $ctrl.detachViewModel( $element );
                    }
                } );
            }
        };
    }
] );
