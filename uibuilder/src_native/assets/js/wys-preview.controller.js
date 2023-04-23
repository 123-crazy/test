// Copyright (c) 2020 Siemens

/**
 * Defines controller for '<wys-preview>' directive.
 * @module js/wys-preview.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import ngUtils from 'js/ngUtils';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/wysiwygLoadAndSaveService';
import 'js/wysiwygUtilService';

/**
 * Defines wysPreviewCtrl controller. Extends the {@link  NgControllers.wysPreviewCtrl}.
 *
 * @member wysPreviewCtrl
 * @memberof NgControllers.wysPreviewCtrl
 */
app.controller( 'wysPreviewCtrl', [
    '$scope', '$element', 'wysiwygLoadAndSaveService', 'wysiwygUtilService', 'viewModelService',
    function( $scope, $element, wysiwygLoadAndSaveService, wysiwygUtilService, viewModelSvc ) {
        //Get the canvas layout saved by canvas editor
        $scope.config = wysiwygUtilService.getLayoutConfigData() || { isStandardWidthPanel: true };

        var loadPreview = function( viewXML, viewModel ) {
            if( viewXML && viewModel ) {
                var viewElement = null;
                viewModel._viewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
                viewModelSvc.populateViewModelPropertiesFromJson( viewModel ).then(
                    function( declViewModel ) {
                        var container = $element.find( 'wys-canvas-container' ).children().first();
                        viewElement = ngModule.element( viewXML );
                        container.append( viewElement );
                        var dataCtxNode = ngModule.element( container[ 0 ].childNodes[ 0 ] ).scope();
                        dataCtxNode.isWysiwygMode = true;
                        viewModelSvc.setupLifeCycle( dataCtxNode, declViewModel );

                        ngUtils.include( container, viewElement );
                        _.defer( function() {
                            eventBus.publish( declViewModel._internal.panelId + '.contentLoaded' );
                        } );
                    } );
            }
        };

        wysiwygLoadAndSaveService.getViewModelData().then( function( viewModel ) {
            loadPreview( wysiwygLoadAndSaveService.getViewData(), viewModel );
        } );
    }
] );
