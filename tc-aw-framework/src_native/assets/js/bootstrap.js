// Copyright (c) 2020 Siemens

/* global afxDynamicImport jQuery */

/**
 * @module js/bootstrap
 */

/**
 * Load the main application JS file and 'bootstrap' the AngularJS system on this page's document.
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import Debug from 'Debug';
import appCtxService from 'js/appCtxService';
import contributionService from 'js/contribution.service';
import routeChangeHandler from 'js/routeChangeHandler';
import cfgSvc from 'js/configurationService';
import stateResolveService from 'js/stateResolveService';
import serviceUtils from 'js/serviceUtils';
import awConfiguration from 'js/awConfiguration';
import 'config/states';
import 'js/aw_polyfill';
// ES6ImportInsertHere

// to know app is built using SWF
window.isSWFApp = true;

// Expose jQuery to the window object as $
window.$ = jQuery;

// LCS-293699: CKEditor 4 is not compatible with webpack by default. Work around by setting the basepath variable
// which CKEditor reads for determining where to required assets. This workaround should not be needed once CKEditor
// is updated to version 5, which has native webpack support.
// This variable is not used by Ckeditor5, its only specific to Ckeditor4
window.CKEDITOR_BASEPATH = location.protocol + '//' + location.host +
    location.pathname.substr( 0, location.pathname.lastIndexOf( '/' ) + 1 ) + 'assets/lib/ckeditor4/';

var trace = new Debug( 'bootstrap' );

trace( 'postES6ImportInsertHere:pre' );
// postES6ImportInsertHere
trace( 'postES6ImportInsertHere:post' );

contributionService.requireBeforeAppInitialize( 'states', function( states ) {
    // TODO: should probably use require.toUrl('') instead of build processing
    trace( 'states', states );
    var baseUrl = 'assets';

    var statesCfg = cfgSvc.getCfgCached( 'states' );
    var mergedRoutes = _.merge.apply( this, [ statesCfg ].concat( states ) ); // eslint-disable-line no-invalid-this

    // Global parameters that apply to every route
    var globalParameters = [
        'ah', // hosting enablement
        'debugApp', // debug
        'locale', // locale override
        'logActionActivity',
        'logEventBusActivity',
        'logLevel',
        'logLifeCycle'
    ];

    // Parameters that should not be in the URL (runtime only)
    var nonUrlParameters = [
        'validateDefaultRoutePath' // workspace validation
    ];

    var defaultPage = '{{defaultPage}}';

    /**
     * Async load dependency for given state object.
     *
     * @param {Object} state - Object who's dependencies to load.
     *
     * @returns {Promise} Resolved when the dependencies are loaded.
     */
    function createLoad( state ) {
        return [ '$q', function( $q ) {
            return $q( function( resolve ) {
                afxDynamicImport( state.dependencies, resolve );
            } );
        } ];
    }

    /**
     * Update given object with global parameters.
     *
     * @param {Object} state - Object to update.
     */
    function updateWithParameters( state ) {
        var params = globalParameters.slice(); // copy globalParameters

        if( state.params ) {
            params = _.union( params, Object.keys( state.params ) );
        }

        if( state.parent ) {
            var parent = mergedRoutes[ state.parent ];
            if( parent && parent.params ) {
                params = _.union( params, Object.keys( parent.params ) );
            }
        }

        var urlParams = params.filter( function( p ) {
            return nonUrlParameters.indexOf( p ) === -1;
        } );

        if( urlParams.length > 0 ) {
            var haveQueryParam = state.url.indexOf( '?' ) !== -1;
            state.url += ( haveQueryParam ? '&' : '?' ) + urlParams.join( '&' );
        }
    }

    _.forEach( mergedRoutes, function( route ) {
        if( route.dependencies ) {
            if( route.resolve ) {
                route.resolve.load = createLoad( route );
            } else {
                route.resolve = {
                    load: createLoad( route )
                };
            }
        }

        // Create the declarative functions from resolveActions map and set it on the state/route resolve.
        if( route.resolveActions ) {
            stateResolveService.updateResolveOnState( route );
        }

        if( route.url && !route.abstract ) {
            updateWithParameters( route );
        }
    } );

    var routesConfig = {
        defaultRoutePath: defaultPage,
        routes: mergedRoutes
    };

    let configMapPromise = serviceUtils.httpGetJsonObject( 'assets/config/configurationMap.json' ).then( function( resp ) {
        cfgSvc.setMap( resp.data );
    } );

    let imagePromise = serviceUtils.httpGetJsonObject( 'assets/config/images.json' ).then( function( resp ) {
        cfgSvc.add( 'images', resp.data.images );
    } );
    let promises = [ imagePromise, configMapPromise ];

    Promise.all( promises ).then( function() {
        app.initModule( 'AwRootAppModule', [], true, baseUrl, routesConfig, routeChangeHandler );
        // Initialize the appCtxService with state information, ideally this should be call inside appWrapper but due to circular dependency it's here.
        appCtxService.loadConfiguration();

        trace( 'postInitInsertHere:pre' );
        // postInitInsertHere
        trace( 'postInitInsertHere:post' );

        app.constant( 'globalParameters', globalParameters );

        var baseUrlPath = app.getBaseUrlPath();

        var mainLink = document.createElement( 'link' );

        mainLink.type = 'text/css';
        mainLink.rel = 'stylesheet';
        mainLink.href = baseUrlPath + '/main.css';

        var uiGridLink = document.createElement( 'link' );
        uiGridLink.type = 'text/css';
        uiGridLink.rel = 'stylesheet';
        uiGridLink.href = baseUrlPath + '/lib/uigrid/ui-grid.min.css';

        $( 'head' ).append( mainLink ).append( uiGridLink );
    } );
} );
