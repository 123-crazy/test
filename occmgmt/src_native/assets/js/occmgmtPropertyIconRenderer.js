// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 *
 * @module js/occmgmtPropertyIconRenderer
 * @requires app
 */
import app from 'app';
import AwRootScopeService from 'js/awRootScopeService';
import AwInjectorService from 'js/awInjectorService';
import AwCompileService from 'js/awCompileService';
import _ from 'lodash';
import $ from 'jquery';

var exports = {};

var viewToRenderToViewAndViewModelResponselMap = {};
var viewToRenderToDeclarativeViewModelMap = {};

var compileElement = function( panelViewModelService, viewAndViewModelResponse, declarativeViewModel, containerElem, vmo, propName ) {

    var scope = AwRootScopeService.instance.$new();

    declarativeViewModel.vmoHovered = vmo;
    declarativeViewModel.propHovered = propName;

    panelViewModelService.setupLifeCycle( scope, declarativeViewModel );
    var element = $( viewAndViewModelResponse.view );
    element.appendTo( containerElem );
    AwCompileService.instance( element )( scope );
};

export let  loadViewAndAppendIcon = function( viewToRender, vmo, containerElem, propName ) {
    AwInjectorService.instance.invoke( [ 'panelContentService',
        'viewModelService',
        function( panelContentService, panelViewModelService ) {
            if( !viewToRenderToViewAndViewModelResponselMap.hasOwnProperty( viewToRender ) ) {
                panelContentService.getPanelContent( viewToRender ).then(
                    function( viewAndViewModelResponse ) {
                        panelViewModelService.populateViewModelPropertiesFromJson( viewAndViewModelResponse.viewModel )
                            .then( function( declarativeViewModel ) {
                                viewToRenderToViewAndViewModelResponselMap[ viewToRender ] = viewAndViewModelResponse;
                                viewToRenderToDeclarativeViewModelMap[ viewToRender ] = declarativeViewModel;
                                compileElement( panelViewModelService, viewAndViewModelResponse, declarativeViewModel, containerElem, vmo, propName );
                            } );
                    } );
            } else {
                var viewAndViewModelResponse = Object.assign( {}, viewToRenderToViewAndViewModelResponselMap[ viewToRender ] );
                var declarativeViewModel = Object.assign( {}, viewToRenderToDeclarativeViewModelMap[ viewToRender ] );
                compileElement( panelViewModelService, viewAndViewModelResponse, declarativeViewModel, containerElem, vmo, propName );
            }
        }
    ] );
};

/**
 * Generates DOM Element for awb0HasInContextOverrides
 * @param { Object } vmo - ViewModelObject for which element config is being rendered
 * @param { Object } containerElem - The container DOM Element inside which element config will be rendered
 */
export let propertyIconRenderer = function( vmo, containerElem, propName ) {
    var _propertyToBeRendered = vmo.props && vmo.props[ propName ] && vmo.props[ propName ].dbValue;
    var viewToRender = propName + 'Renderer';
    if( _propertyToBeRendered ) {
        loadViewAndAppendIcon( viewToRender, vmo, containerElem, propName );
    }
};

export let overriddenPropRenderer = function( vmo, containerElem, propName ) {
    var _contextList = null;
    var _propList = null;
    if( vmo.props && vmo.props.awb0OverrideContexts && vmo.props.awb0OverriddenProperties ) {
        _contextList = vmo.props.awb0OverrideContexts.dbValues;
        _propList = vmo.props.awb0OverriddenProperties.dbValues;
        for( var idx = 0; idx < _contextList.length; idx++ ) {
            var _prop = _propList[ idx ];
            if( _prop === propName ) {
                var overrideContext = _prop + 'Context';
                if( !vmo.overrideContexts ) {
                    vmo.overrideContexts = {};
                }
                vmo.overrideContexts[ overrideContext ] = _contextList[ idx ];
                containerElem.title = '';
                loadViewAndAppendIcon( 'awb0OverridenPropertyRenderer', vmo, containerElem, propName );
                break;
            }
        }
    }
};

export default exports = {
    loadViewAndAppendIcon,
    propertyIconRenderer,
    overriddenPropRenderer
};
app.factory( 'occmgmtPropertyIconRenderer', () => exports );
