// Copyright (c) 2020 Siemens

/**
 * @module js/aw-command-def-content.directive
 */
import app from 'app';
import logger from 'js/logger';
import 'js/aw-command-def-content.controller';

// eslint-disable-next-line valid-jsdoc
/**
 * Display a view model that is already loaded
 *
 * @example <aw-command-def-content view-model="viewModel"></aw-command-def-content>
 *
 * @memberof NgDirectives
 * @member aw-command-def-content
 */
app.directive( 'awCommandDefContent', [
    function() {
        return {
            restrict: 'E',
            scope: {
                /**
                 * An already created and initialized view model to render.
                 */
                viewModel: '='
            },
            controller: 'awCommandDefContentController',
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
