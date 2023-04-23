// Copyright (c) 2020 Siemens

/**
 * @module js/aw-property-lov-child.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.property.lov.child.controller';
import 'js/aw-property-image.directive';
import 'js/aw-pic.directive';

/**
 * @example TODO
 *
 * @member aw-property-lov-child
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyLovChild', [
    '$compile',
    function( $compile ) {
        return {
            restrict: 'E',
            scope: {
                // prop comes from the parent controller's scope
                prop: '=?',
                lovEntry: '=',
                pickleaf: '=?'
            },
            controller: 'awPropertyLovChildController',
            link: function( scope, $element ) {
                // if the child value has children of its own, insert dynamically to
                // avoid recursion in the template
                if( scope.lovEntry.hasChildren ) {
                    var lovChildrenHtml = ngModule.element( '<ul ng-show="lovEntry.expanded">' + //
                        '<li class="aw-jswidgets-nestingListItem" ng-repeat="child in lovEntry.children">' + //
                        '<aw-property-lov-child lov-entry="child" prop="prop" pickleaf="pickleaf"></aw-property-lov-child></li></ul>' );
                    $element.append( lovChildrenHtml );
                    $compile( lovChildrenHtml )( scope );
                }
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-lov-child.directive.html'
        };
    }
] );
