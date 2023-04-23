// Copyright (c) 2020 Siemens

/**
 * Directive to display tree of nodes
 * @module js/wys-canvas-editor.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/wys-canvas-editor.controller';
import 'js/wys-canvas-container.directive';
import 'js/wysiwygUtilService';

/**
 * Directive to display tree of nodes
 *
 * @example <wys-canvas-editor></wys-canvas-editor>
 *
 * @member wysCanvasEditor
 * @memberof NgElementDirectives
 */
app.directive( 'wysCanvasEditor', [ 'wysiwygUtilService', function( wysiwygUtilService ) {
    return {
        restrict: 'E',
        controller: 'wysCanvasEditorCtrl',
        scope: {
            canvasData: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/wys-canvas-editor.directive.html',
        link: function( scope ) {
            eventBus.publish( 'wysiwyg.reloadWysiwygEditor' );
            scope.config = {};

            var resetConfigurations = function() {
                scope.config.isStandardWidthPanel = false;
                scope.config.isVerticalStandardPanel = false;
                scope.config.isVerticalWidePanel = false;
                scope.config.isVerticalLargePanel = false;
                scope.config.isNormalPanel = false;
            };

            eventBus.subscribe( 'aw.canvas.configuration', function( data ) {
                resetConfigurations();
                scope.config.width = data.widthRadio.dbValue;
                scope.config.height = data.heightRadio.dbValue;
                scope.config.layoutConfiguration = data.layout.dbValue;

                if( scope.config.layoutConfiguration === 'cp' ) {
                    scope.config.isStandardWidthPanel = scope.config.width === true;

                    scope.config.isVerticalStandardPanel = scope.config.height === 'def' && scope.config.isStandardWidthPanel;
                    scope.config.isVerticalWidePanel = scope.config.height === 'def' && !scope.config.isStandardWidthPanel;
                    scope.config.isVerticalLargePanel = scope.config.height === 'large';
                } else if( scope.config.layoutConfiguration === 'normal' ) {
                    scope.config.isNormalPanel = true;
                }

                wysiwygUtilService.setLayoutConfigData( scope.config );
            } );
        }
    };
} ] );
