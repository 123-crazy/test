// Copyright (c) 2020 Siemens

/**
 * Directive to display tree's node
 *
 * @module js/aw-node.directive
 */
import app from 'app';
import 'js/aw-node.controller';
import 'js/aw-transclude.directive';
import 'js/aw-property-image.directive';

/**
 * Directive to display tree of nodes
 *
 * @example <aw-node tree="myNodes"><div>Sample tree item</div></aw-node>
 *
 * @member aw-node
 * @memberof NgElementDirectives
 */
app.directive( 'awNode', [ function() {
    return {
        restrict: 'E',
        controller: 'awNodeController',
        transclude: true,
        scope: {
            tree: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-node.directive.html'
    };
} ] );
