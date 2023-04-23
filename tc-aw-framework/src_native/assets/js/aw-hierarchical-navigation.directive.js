// Copyright (c) 2020 Siemens

/**
 * Directive to display a hierarchy navigation widget
 *
 * @module js/aw-hierarchical-navigation.directive
 */
import app from 'app';
import 'js/aw-hierarchical-navigation.controller';

/**
 * Directive to display a hierarchy navigation widget
 *
 * <pre>
 *  Directive Attribute Usage:
 *      childNodes - (Required) Array of children nodes to display.
 *      displayNameProp - (Required) The property on each node to display as the node text.
 *      parentNodes - (Optional) Array of parent nodes to display. If left unset, the parent array will be constructed automatically as the user drills down the hierarhcy
 *      maxChildrenToShow - (Optional) The number of children to display before the 'More...' option appears. If left unset, all children will be shown.
 *      displayCountProp - (Optional) The property on each child node to display as the 'count'. If left unset, the count will be hidden.
 *      toolTipProp - (Optional) The property on each node to display as the tooltip text. If left unset, the tooltip will not be displayed.
 *      action - (Optional) The action that will be triggered when a node is selected.
 * </pre>
 *
 * @example <aw-hierarchical-navigation childNodes="data.children" displayNameProp="'className'"
 *          maxChildrenToShow="3" parentNodes="data.parents" displayCountProp="'count'" toolTipProp="'classID'"></aw-hierarchical-navigation>
 *
 * @member aw-hierarchical-navigation
 * @memberof NgElementDirectives
 */
app.directive( 'awHierarchicalNavigation', [ function() {
    return {
        restrict: 'E',
        controller: 'awHierarchicalNavigationController',
        transclude: true,
        scope: {
            childnodes: '=',
            displaynameprop: '=',
            maxchildrentoshow: '=?',
            parentnodes: '=?',
            displaycountprop: '=?',
            tooltipprop: '=?',
            action: '=?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-hierarchical-navigation.directive.html'
    };
} ] );
