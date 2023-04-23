// Copyright (c) 2020 Siemens

/**
 * Directive to show commands inside a cell template of list.
 *
 * @module js/aw-command.directive
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-command.controller';
import 'js/aw-popup-command-list.directive';
import 'js/aw-popup-panel.directive';
import 'js/aw-icon.directive';
import 'js/aw-pic.directive';
import 'js/appCtxService';
import 'js/aw-include.directive';
import 'js/aw-click.directive';
import 'js/aw-popup-command-bar.directive';
import 'js/extended-tooltip.directive';

/**
 * Directive to show commands inside a cell template of list.
 *
 * @example <aw-command command="command" ></aw-command>
 *
 * @member awCommand
 * @memberof NgElementDirectives
 */

app.directive( 'awCommand', [ '$sce', '$compile', 'appCtxService', function( $sce, $compile, appCtx ) {
    return {
        restrict: 'E',
        scope: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-command.directive.html',
        controllerAs: 'ctrl',
        controller: 'awCommandController',
        link: function( $scope, $element ) {
            /**
             * {ObjectArray} Collection of eventBus subscription definitions to be un-subscribed from when
             * this controller's $scope is later destroyed.
             */
            var _eventBusSubDefs = [];

            /**
             * Set element title to command title. Done here instead of on button to
             * support title on disabled commands
             *
             * @param t Command title
             */
            $scope.$watch( 'command.title', function _updateElementTitle( t ) {
                $element.prop( 'title', t );
            } );

            /**
             * Note: This relies on $scope.command.template already being set. Checking initially allows us to avoid a
             * watch that is only necessary in very specific cases. This will not work when aw-command is virtualized
             * (inside of a table for example)
             */
            if( $scope.command.template ) {
                var childScope = null;
                var childElement = null;
                var templateParent = $element.find( '.aw-commands-cellDecorator' );
                $scope.$watch( 'command.template', function _watchCommandTemplate( childElementHtml ) {
                    // Clear out current contents and destroy child scope
                    templateParent.empty();
                    if( childScope ) {
                        childScope.$destroy();
                    }
                    // Compile the new contents with a new child scope
                    childScope = $scope.$new();
                    childScope.ctx = appCtx.ctx;
                    childElement = $compile( childElementHtml )( childScope );
                    templateParent.append( childElement );
                } );
            }

            /**
             * Don't allow group command popup to close while a command is executing
             */
            _eventBusSubDefs.push( eventBus.subscribe( $scope.command.commandId + '.popupCommandExecuteStart', function() {
                if( $scope.popupRef ) {
                    $scope.popupRef.options.disableClose = true;
                }
            } ) );
            _eventBusSubDefs.push( eventBus.subscribe( $scope.command.commandId + '.popupCommandExecuteEnd', function() {
                if( $scope.popupRef ) {
                    $scope.popupRef.options.disableClose = false;
                }
            } ) );

            $scope.$on( '$destroy', function() {
                _.forEach( _eventBusSubDefs, function( subDef ) {
                    eventBus.unsubscribe( subDef );
                } );
            } );
        }
    };
} ] );
