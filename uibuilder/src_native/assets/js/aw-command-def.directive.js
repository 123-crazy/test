// Copyright (c) 2020 Siemens

/**
 * @module js/aw-command-def.directive
 */
import app from 'app';
import 'js/aw-command-def.controller';
import 'js/aw-command-def-content.directive';

// eslint-disable-next-line valid-jsdoc
/**
 * Command definition summary directive. Display the command summary for a selected object.
 */
app.directive( 'awCommandDef', [
    function() {
        return {
            restrict: 'E',
            scope: {
                selection: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-command-def.directive.html',
            controller: 'awCommandDefController',
            link: function( $scope, $element, $attrs, $controller ) {
                //When the object changes
                $scope.$watch( 'selection', function() {
                    //Reload command definition summary for the current page (with the new object)
                    $controller.reloadCurrentPage();
                } );

                $scope.$on( '$destroy', function() {
                    $controller.cleanup();
                } );
            }
        };
    }
] );
