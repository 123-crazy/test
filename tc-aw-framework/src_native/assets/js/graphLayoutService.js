// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph layout support
 *
 * @module js/graphLayoutService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import graphConstants from 'js/graphConstants';
import internalGraphUtils from 'js/internalGraphUtils';
import logSvc from 'js/logger';
import declUtils from 'js/declUtils';

/**
 * Define public API
 */
var exports = {};

var layoutLibsMap = {
    IncUpdateLayout: 'js/incUpdateLayoutService',
    SortedLayout: 'js/sortedLayoutService',
    BranchLayout: 'js/branchLayoutService',
    ColumnLayout: 'js/columnLayoutService',
    IshikawaLayout: 'js/ishikawaLayoutService'
};

/**
 * Create a layout and install on graph control.
 *
 * @param graphControl the graphControl
 * @param layoutMode the layoutMode. value limit to graphConstants.DFLayoutTypes
 * @param layoutConfig the layout configurations. This will override the default layout configurations.
 *
 * @returns {promise} promise resolved with layout object
 */
export let createLayout = function( graphControl, layoutMode, layoutConfig ) {
    if( !graphControl || !layoutMode || !_.has( graphConstants.DFLayoutTypes, layoutMode ) ) {
        var msg = 'Failed to set layout, layout mode \'' + layoutMode + '\' is unsupported! ';
        logSvc.error( msg );
        return AwPromiseService.instance.reject( msg );
    }

    var defer = AwPromiseService.instance.defer();

    // deactivate old one
    var oldLayout = graphControl.layout;
    if( oldLayout && oldLayout.isActive && oldLayout.isActive() && oldLayout.deactivate ) {
        oldLayout.deactivate();
    }

    if( !layoutLibsMap[ layoutMode ] ) {
        return defer.reject( 'The configured layout "' + layoutMode + '" is not supported.' );
    }

    // create new one and initialize it
    var layoutLibs = [ 'js/layouthostinterface' ];
    layoutLibs.push( layoutLibsMap[ layoutMode ] );

    declUtils.loadImports( layoutLibs, AwPromiseService.instance ).then( function( modules ) {
        var layoutHostInterface = modules[ 0 ];
        var layoutService = modules[ 1 ];
        var diagramView = graphControl._diagramView;
        var hostInterface = layoutHostInterface.createLayoutHostInterface( diagramView, layoutConfig );
        layoutService.createLayout( diagramView, hostInterface, layoutConfig ).then( function( layout ) {
            graphControl.layout = layout;
            defer.resolve( layout );
        } );
    }, function( error ) {
        defer.reject( error );
    } );

    return defer.promise;
};

/**
 * Set layout type and direction by layout option.
 *
 * @param layout the layout instance
 * @param layoutOption the layout option. The supported layout options are defined by graphConstants.LayoutOptions.
 * If the layout option is only about direction, the layout type is default to 'Hierarchical'. If the layout option is
 *  only about layout type, the layout direction is default to 'TopToBottom'.
 */
export let setLayoutOption = function( layout, layoutOption ) {
    if( !layout || !layoutOption ) {
        return;
    }

    var globalLayout = internalGraphUtils.convertToLayout( layoutOption );
    if( globalLayout ) {
        layout.setLayoutType( globalLayout.layoutType );
        layout.setLayoutDirection( globalLayout.layoutDirection );
    }
};

export default exports = {
    createLayout,
    setLayoutOption
};
/**
 * The service to provide graph layout support.
 *
 * @member graphLayoutService
 * @memberof NgServices
 */
app.factory( 'graphLayoutService', () => exports );
