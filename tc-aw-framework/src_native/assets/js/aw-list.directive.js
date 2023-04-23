// Copyright (c) 2020 Siemens

/**
 * Directive to display list of items
 *
 * @module js/aw-list.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-list.controller';
import 'js/aw-virtual-repeat.controller';
import 'js/aw-transclude.directive';
import 'js/aw-list-command.directive';
import 'js/aw-icon.directive';
import 'js/aw-cell-command-bar.directive';
import 'js/aw-long-press.directive';
import 'js/aw-static-list-command.directive';

/**
 * Directive to display list of items
 *
 * @example <aw-list dataprovider="dataProvider"><div>Sample list item</div></aw-list>
 *
 * @member aw-list
 * @memberof NgElementDirectives
 */
app.directive( 'awList', [ function() {
    return {
        restrict: 'E',
        controller: 'awListController',
        transclude: true,
        scope: {
            dataprovider: '=',
            showCheckBox: '=',
            useVirtual: '@',
            fixedCellHeight: '@?',
            showDropArea: '@?',
            showContextMenu: '<?',
            isGroupList: '@?',
            hasFloatingCellCommands: '<?'
        },
        templateUrl: function( elem, attrs ) {
            if( attrs.fixedCellHeight ) {
                return app.getBaseUrlPath() + '/html/aw-list.directive.html';
            }
            if( attrs.isGroupList === 'true' ) {
                return app.getBaseUrlPath() + '/html/aw-group-list.directive.html';
            }
            return app.getBaseUrlPath() + '/html/aw-static-list.directive.html';
        },
        link: function( $scope, element ) {
            if( $scope.showDropArea !== undefined && $scope.showDropArea === 'false' ) {
                element.find( '.aw-widgets-droppable' ).removeClass( 'aw-widgets-droppable' );
            }
            var selectionModel = _.get( $scope, 'dataprovider.selectionModel' );
            if( selectionModel && !selectionModel.isSelectionEnabled() ) {
                $scope.disableSelection = true;
            }
        }
    };
} ] );

/**
 * Directive to support virtualization in cell list
 *
 * @example
 * <li aw-virtual-repeat="item in dataprovider"></li>
 *
 * @member aw-virtual-repeat
 * @memberof NgAttributeDirectives
 */

app.directive( 'awVirtualRepeat', [ '$parse', function( $parse ) {
    return {
        restrict: 'A',
        multiElement: true,
        transclude: 'element',
        priority: 1000,
        require: [ 'awVirtualRepeat', '^^awList' ],
        terminal: true,
        controller: 'awVirtualRepeatController',
        // eslint-disable-next-line func-name-matching
        compile: function awVirtualRepeatCompile( $element, $attrs ) {
            var expression = $attrs.awVirtualRepeat;
            var match = expression.match( /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/ );
            var repeatName = match[ 1 ];
            var repeatListExpression = $parse( match[ 2 ] );

            return function awVirtualRepeatLink( $scope, $element, $attrs, ctrl, $transclude ) {
                ctrl[ 0 ].init( ctrl[ 1 ], $transclude, repeatName, repeatListExpression );
            };
        }
    };
} ] );
