// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This module holds threeD viewer data
 *
 * @module js/twoDViewerService
 */
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import aw3dViewerService from 'js/aw3dViewerService';
import logger from 'js/logger';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import utils2dViewer from 'js/utils2dViewer';
import localeSvc from 'js/localeService';
import msgSvc from 'js/messagingService';
import preferenceService from 'soa/preferenceService';
import AwTimeoutService from 'js/awTimeoutService';
import AwPromiseService from 'js/awPromiseService';
import AwWindowService from 'js/awWindowService';

var exports = {};

var isLoading = true;
var isShowViewerEmmProgress = false;
var isShowViewerProgress = true;
var isLoadingError = false;

/**
 * The Vis proxy servlet context. This must be the same as the VisPoolProxy mapping in the web.xml
 */
var WEB_XML_VIS_PROXY_CONTEXT = 'VisProxyServlet' + '/';

/**
 * Native viewer context data
 */
var viewerCtxData = null;

/**
 * Root node
 */
var _viewerCanvasDivElement = null;

/**
 * Total number of pages.
 */
var _numPages = 1;

/**
 * Current page number.
 */
var _currentPage = 1;

/**
 * THE rotation degree
 */
var rotation = 0;

var resizeTimeoutPromise = null;

/**
 * 2D Viewer render option
 */
var VIEWER_2D_RENDER_OPTION = null;

const viewerParentContainerClass = 'aw-2dviewerjs-viewer2DParentContainer';

var viewerContainerDivEle = null;

/**
 * Set viewer namespace
 * @returns {Object} object with viewer context namespace
 */
export let setTwoDViewerNamespace = function() {
    return {
        viewerCtxNamespace: aw3dViewerService.getDefaultViewerCtxNamespace()
    };
};

/**
 * Initialize viewer
 *
 * @function initialize2DViewer
 * @param {Object} data Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 * @param {Boolean} isReloadViewer boolean indicating if should be reloaded forcefully
 *
 * @returns {Promise} A promise that is resolved
 */
export let initialize2DViewer = function(  data, subPanelContext, isReloadViewer ) {

    var returnPromise = AwPromiseService.instance.defer();

    setViewerCtx(subPanelContext.datasetData);

    VIEWER_2D_RENDER_OPTION = preferenceService.getLoadedPrefs().AWV02DViewerRenderOption;

    setViewerLoadingStatus(true);

    // Callbacks
    utils2dViewer.setPageCallback( page );
    utils2dViewer.setFit2DCallback( fit2DView );
    utils2dViewer.setRotateCWCallback( rotate2DCW90 );
    utils2dViewer.setRotateCCWCallback( rotate2DCCW90 );

    utils2dViewer.setMouseMovePanCallback( setMouseMovePan );
    utils2dViewer.setPageIndexCallback( getPageIndex );
    utils2dViewer.setCurrentPageCallback( setPage );

    /**
     * Set callback on set viewport for markup
     * This gives utils2dViewer a function to call here.  This allows another user, such as Markup2d.js
     * to be able to call the utils2dViewer, which will call this one, which is able to call into
     * JSCom such as ViewImpl2DPicSling to be able to call down into the Vis server.
     */
    utils2dViewer.setViewportForMarkupCallback( setViewportForMarkup );

    if( data && data.viewContainerProp && data.viewContainerProp.viewerContainerDiv ) {
        viewerContainerDivEle = data.viewContainerProp.viewerContainerDiv;
    } else {
        throw 'The viewer container div can not be null';
    }

    resizeViewer();

    if (!isReloadViewer)
    {
        _checkIfVisIsInstalled();
    }
    else
    {
        showViewerEmmProgress(true);
        _setupViewer();
    }

    rotation = 0;

    var pageValues = {
        numPages: _numPages,
        currentPage: _currentPage
    };

    appCtxSvc.updateCtx( 'awTwoDViewer', pageValues );

    // Handle Window resize event
    let self = this;
    AwWindowService.instance.onresize = function() {
        if( this.resizeTimeoutPromise ) {
            AwTimeoutService.instance.cancel( this.resizeTimeoutPromise );
        }
        this.resizeTimeoutPromise = AwTimeoutService.instance( function() {
            self.resizeTimeoutPromise = null;
            resizeViewer();
        }, 250 );
    };

    /**
     * Check if Vis Server is Installed
     */
    function _checkIfVisIsInstalled() {
        var url = browserUtils.getBaseURL() + WEB_XML_VIS_PROXY_CONTEXT;

        showViewerEmmProgress(true);

        window.JSCom.Health.HealthUtils.getServerHealthInfo( url ).then( function( health ) {
            var poolManagers = health.getPoolManagers();
            if( poolManagers.length > 0 ) {
                utils2dViewer.setUsePictureSlinging( true );
                _setupViewer();
            } else {
                utils2dViewer.setUsePictureSlinging( false );

                setLoadingErrorStatus(true);
                setViewerLoadingStatus(false);
                showViewerEmmProgress(false);

                getViewerMessage( 'viewerNotConfigured2D', 'Viewer2DMessages' ).then( function( localizedErrorMsg ) {
                    msgSvc.showError( localizedErrorMsg );
                } );
            }
        }, function( error ) {
            logger.error( 'Server Health: ' + error );

            setLoadingErrorStatus(true);
            setViewerLoadingStatus(false);
            showViewerEmmProgress(false);

            getViewerMessage( 'viewerNotConfigured2D', 'Viewer2DMessages' ).then( function( localizedErrorMsg ) {
                msgSvc.showError( localizedErrorMsg );
            } );
        } );
    }

    /**
     * Setup the viewer
     */
    function _setupViewer() {
        var width = computeViewerWidth();
        var height = computeViewerHeight();

        var selectedDataset = subPanelContext.datasetData;

        if( isReloadViewer || !aw3dViewerService.isSameProductOpenedAsPrevious( selectedDataset ) ) {
            aw3dViewerService.cleanUpPreviousView();

            var viewerLoadInputParams = aw3dViewerService.getViewerLoadInputParameter( selectedDataset, width, height - 5 );

            if(selectedDataset.type === 'Zip')
            {
                viewerLoadInputParams.setAdditionalInfo( {'FileTypeID':'ImageView.Document'} );
            }
            else
            {
                viewerLoadInputParams.setAdditionalInfo( {} );
            }

            viewerLoadInputParams.set2DRenderer( true );
            viewerLoadInputParams.initializeViewerContext();
            viewerCtxData = viewerLoadInputParams.getViewerContext();
            viewerCtxData.addViewerConnectionProblemListener( reloadViewer );

            aw3dViewerService.getViewerView( viewerLoadInputParams ).then( function( viewerData ) {
                _setupViewerAfterLoad( viewerContainerDivEle, viewerData, selectedDataset );
                resizeViewer();

                var matrix = {
                    a: 1,
                    b: 0,
                    c: 0,
                    d: 1,
                    e: 0,
                    f: 0
                };

                viewerData[ 0 ].setViewUpdateCallback( resizeMarkups, matrix );

                if( isSSR() ) {
                    resizeMarkups( viewerCtxData.getSize() );
                } else {
                    var viewport = viewerCtxData.getSize();
                    viewerCtxData.setSize( viewport.width, viewport.height );
                }

                showViewerEmmProgress(false);

                returnPromise.resolve( viewerData[ 0 ] );
            }, function( errorMsg ) {
                logger.error( 'Failed to load viewer : ' + errorMsg );
                setLoadingErrorStatus(true);
                returnPromise.reject( errorMsg );
            } );
        } else {
            aw3dViewerService.restorePreviousView().then( function( viewerData ) {
                _setupViewerAfterLoad( viewerContainerDivEle, viewerData, selectedDataset );
                viewerCtxData.addViewerConnectionProblemListener( reloadViewer );
                var dim = getComputedViewerDimensions();
                viewerCtxData.setSize( dim.viewerWidth, dim.viewerHeight - 5 );
                resizeViewer();

                var matrix = {
                    a: 1,
                    b: 0,
                    c: 0,
                    d: 1,
                    e: 0,
                    f: 0
                };

                viewerData[ 0 ].setViewUpdateCallback( resizeMarkups, matrix );

                showViewerEmmProgress(false);

                // Notify Markup Service to load markups
                let ctx = appCtxSvc.getCtx( 'viewerContext' );
                if ( ctx ) {
                    appCtxSvc.registerCtx( 'viewerContext', ctx );
                } else {
                    setViewerCtx(subPanelContext.datasetData);
                }

                returnPromise.resolve( viewerData[ 0 ] );
            }, function( errorMsg ) {
                logger.error( 'Failed to restore viewer : ' + errorMsg );
                setLoadingErrorStatus(true);
                returnPromise.reject( errorMsg );
            } );
        }

        /**
         * Registers Product Context launch api
         * @param {Object} viewerElement viewer div element
         * @param {Object} viewerData viewer Data
         * @param {Object} viewerContextObj viewer context data object
         */
        function _setupViewerAfterLoad( viewerElement, viewerData, viewerContextObj ) {
            if( _viewerCanvasDivElement ) {
                _viewerCanvasDivElement.remove();
            }

            _viewerCanvasDivElement = viewerData[ 1 ];

            if( _viewerCanvasDivElement ) {
                _viewerCanvasDivElement.lastElementChild.addEventListener( 'transform', function( eventData ) {
                    var viewport = viewerCtxData.getSize();
                    resizeMarkups( viewport, eventData.detail.matrix );
                } );
            }

            viewerElement.append( _viewerCanvasDivElement );

            setLoadingErrorStatus(false);
            setViewerLoadingStatus(false);
            viewerCtxData = viewerData[ 0 ];
            viewerCtxData.updateCurrentViewerProductContext( viewerContextObj );

            var awTwoDViewerNavMode = appCtxSvc.getCtx( 'awTwoDViewerNavMode' );

            var bPan = true;

            if( awTwoDViewerNavMode && awTwoDViewerNavMode === 'zoom' ) {
                bPan = false;
            }

            setMouseMovePan(bPan);
        }
    }


};

let reloadViewer = function() {
    eventBus.publish( 'twoDViewer.reloadViewer', {
        viewerContext: aw3dViewerService.getDefaultViewerCtxNamespace()
    } );
};

/**
 * Resize markups so they match the base doc
 *
 *  @param {object} viewport - the current viewport data
 *  @param {object} matrix - the current matrix data
 */
function resizeMarkups( viewport, matrix ) {
    if( isSSR() ) {
        resizeMarkupsPicSling( viewport );
    } else {
        resizeMarkupsVectorSling( viewport, matrix );
    }
}

/**
 * Check if server side rendering
 *
 * @return {boolean} True if is server side rendering
 */
function isSSR() {
    if( !VIEWER_2D_RENDER_OPTION || VIEWER_2D_RENDER_OPTION.length === 0 ) {
        VIEWER_2D_RENDER_OPTION = [ 'SSR' ];
    }

    if( Array.isArray( VIEWER_2D_RENDER_OPTION ) && VIEWER_2D_RENDER_OPTION[ 0 ] === 'CSR' ) {
        return false;
    }

    return true;
}

/**
 * Calculate the pixel density in dots per unit (pixels per document unit).
 *
 * @param {integer} units - the units
 * @return {double} the unit multiplier
 */
function unitsMultiplier( units ) {
    var multiplier = 1.0; // Inches

    if( units === 2 ) { // Millimeters
        multiplier *= 25.4;
    } else if( units === 4 ) { // Feet
        multiplier /= 12.0;
    } else if( units === 12 ) { // Yards
        multiplier /= 36.0;
    } else if( units === 10 ) { // Centimeters
        multiplier *= 2.54;
    } else if( units === 15 ) { // Decimeters
        multiplier *= 0.254;
    } else if( units === 6 ) { // Meters
        multiplier *= 0.0254;
    } else if( units === 7 ) { // Kilometers
        multiplier *= 0.0000254;
    }
    return multiplier;
}

/**
 * Calculate the markups viewport.
 *
 * @param {object} viewport - the viewport
 * @return {object} the markup viewport
 */
function calculateMarkupViewport( viewport ) {
    var scale = Math.max( Math.min( viewport.width / viewport.docPixelWidth, viewport.height / viewport.docPixelHeight, 100 ), 0.001 );

    // adjust for units so Vis markups align with image
    var docRatioInInches = viewport.startWidth / viewport.pageWidth;
    var unitsMult = unitsMultiplier( viewport.units ); // Inches is 1.0
    docRatioInInches *= unitsMult;
    var adjust = viewport.startScale * docRatioInInches / 96.0;

    var xOffset = 0;
    var yOffset = 0;
    var angle = (rotation/90)*(Math.PI/2);

    // handle pan and zoom translations
    var transX = viewport.startWidth * ( 0.5 - viewport.startTranslationX ) * viewport.startScale;
    var transY = viewport.startHeight * ( 0.5 - viewport.startTranslationY ) * viewport.startScale;

    if( rotation % 360 !== 0 )
    {
        var cos = Math.cos( angle );
        var sin = Math.sin( angle );

        xOffset = viewport.width / 2 - (viewport.startScale) * ( viewport.docPixelWidth * cos - viewport.docPixelHeight * sin ) / 2;
        yOffset = viewport.height / 2 - (viewport.startScale) * ( viewport.docPixelWidth * sin + viewport.docPixelHeight * cos ) / 2;

        if( rotation === 180 || rotation === -180 )
        {
            xOffset -= transX;
            yOffset += transY;
        }
        else
        {
            xOffset += transX*cos + transY*sin;
            yOffset += transX*sin + transY*cos;
        }
    }
    else
    {
        var aspectRatio = viewport.docPixelHeight / viewport.docPixelWidth;
        var canvasRatio = viewport.height / viewport.width;

        var d = 0;

        // padding is added to the image on one side so markups need to account for it
        if( canvasRatio < aspectRatio ) {
            aspectRatio = viewport.docPixelWidth / viewport.docPixelHeight;
            d = viewport.height / viewport.width * aspectRatio;
            xOffset = Math.abs( viewport.width - viewport.width * d ) / 2.0;
        } else {
            d = viewport.width / viewport.height * aspectRatio;
            yOffset = Math.abs( viewport.height - viewport.height * d ) / 2.0;
        }

        // correct padding offset based on scale
        xOffset -= viewport.width / 2;
        yOffset -= viewport.height / 2;

        viewport.startScale = Math.abs( viewport.startScale );

        xOffset *= viewport.startScale / scale;
        yOffset *= viewport.startScale / scale;

        // adjust for units so Vis markups align with image
        xOffset *= unitsMult;
        yOffset *= unitsMult;

        xOffset += viewport.width / 2;
        yOffset += viewport.height / 2;

        xOffset += transX;
        yOffset -= transY;
    }

    var vp = {
        scale: adjust,
        x: xOffset,
        y: yOffset,
        angle2: angle
    };
    return vp;
}

/**
 * Resize markups so they match the base doc.
 *
 * @param {object} viewport - the current viewport data
 */
function resizeMarkupsPicSling( viewport ) {
    setNumPages( viewport.numPages );
    var vp = calculateMarkupViewport( viewport );
    utils2dViewer.resize( vp );
}

/**
 * Resize markups so they match the base doc
 *
 *  @param {object} viewport - the current viewport data
 *  @param {object} matrix - the transform matrix data
 */
function resizeMarkupsVectorSling( viewport, matrix ) {
    setNumPages( viewport.numPages );

    var unitsToInches = 1;

    if( viewport.units === 2 ) { // millimeters
        unitsToInches *= 25.4;
    } else if( viewport.units === 4 ) { // Feet
        unitsToInches /= 12.0;
    } else if( viewport.units === 12 ) { // Yards
        unitsToInches /= 36.0;
    } else if( viewport.units === 10 ) { // Centimeters
        unitsToInches *= 2.54;
    } else if( viewport.units === 15 ) { // Decimeters
        unitsToInches *= 0.254;
    } else if( viewport.units === 6 ) { // Meters
        unitsToInches *= 0.0254;
    } else if( viewport.units === 7 ) { // Kilometers
        unitsToInches *= 0.0000254;
    }

    var theScale = Math.max( Math.abs(matrix.a), Math.abs(matrix.b), Math.abs(matrix.c), Math.abs(matrix.d) );
    var angle = (rotation/90)*(Math.PI/2);

    var vp = {
        scale: theScale / 96.0 * unitsToInches,
        x: matrix.e,
        y: matrix.f,
        angle2: angle
    };

    utils2dViewer.resize( vp );
}

/**
 * setCurrentPage
 *
 * @param {Integer} currentPage page number
 */
function setCurrentPage( currentPage ) {
    _currentPage = currentPage;

    var pageValues = {
        numPages: _numPages,
        currentPage: _currentPage
    };

    appCtxSvc.updateCtx( 'awTwoDViewer', pageValues );
}

/**
 * setNumPages
 * @param {Integer} numPages total number of pages
 */
function setNumPages( numPages ) {
    _numPages = numPages;

    var pageValues = {
        numPages: _numPages,
        currentPage: _currentPage
    };

    appCtxSvc.updateCtx( 'awTwoDViewer', pageValues );
}

/**
 * Set viewer loading status
 * @param {Boolean} status is viewer loading
 */
export let setViewerLoadingStatus = function( status ) {
    if (status !== isLoading)
    {
        isLoading = status;
        eventBus.publish( 'twoDViewer.viewerLoadingStatus', {
            viewerContext: aw3dViewerService.getDefaultViewerCtxNamespace(),
            loadingStatus: isLoading
        } );
    }

    return isLoading;
};

/**
 * Set Emm Progress status
 * @param {Boolean} status show progress
 */
export let showViewerEmmProgress = function( status ) {
    if (status !== undefined && status !== isShowViewerEmmProgress)
    {
        isShowViewerEmmProgress = status;
        eventBus.publish( 'twoDViewer.emmProgressStatus', {
            viewerContext: aw3dViewerService.getDefaultViewerCtxNamespace(),
            emmProgressIndicatorStatus: isShowViewerEmmProgress
        } );
    }

    return isShowViewerEmmProgress;
};

/**
 * Set Progress status
 * @param {Boolean} status show progress
 */
export let showViewerProgress = function( status ) {
    if (status !== undefined && status !== isShowViewerProgress)
    {
        isShowViewerProgress = status;
        eventBus.publish( 'progressIndicator', {
            viewerContext: aw3dViewerService.getDefaultViewerCtxNamespace(),
            progressIndicatorStatus: isShowViewerProgress
        } );
    }

    return isShowViewerProgress;
};

/**
 * Set Loading Error status
 * @param {Boolean} status is error
 */
export let setLoadingErrorStatus = function( status ) {
    if (status !== undefined && status !== isLoadingError)
    {
        isLoadingError = status;
        eventBus.publish( 'twoDViewer.loadingErrorStatus', {
            viewerContext: aw3dViewerService.getDefaultViewerCtxNamespace(),
            loadingErrorStatus: isLoadingError
        } );
    }

    return isLoadingError;
};

/**
 * Sets context for viewer command bar
 */
function setViewerCtx( contextObject ) {
    if( !appCtxSvc.getCtx( 'viewerContext' ) ) {
        var type = "aw-2d-viewer";

        var ctx = {
            vmo: contextObject,
            commands: {
                fullViewMode: {
                    visible: true
                }
            },
            type: type
        };

        if( appCtxSvc.getCtx( 'fullscreen' ) === true ) {
            ctx.commands.fullViewMode.visible = false;
        }
        appCtxSvc.registerCtx( 'viewerContext', ctx );
    }
}

export let page = function( param ) {
    var page = _currentPage;

    if( param === 'up' ) {
        ++page;
    } else if( param === 'down' ) {
        --page;
    } else {
        page = parseInt( param );
    }

    if( viewerCtxData && page > 0 && page <= _numPages ) {
        setCurrentPage( page );
        viewerCtxData.setCurrentPage( page );
    }
};

export let getPageIndex = function() {
    return _currentPage - 1;
};

export let setPage = function( pageNum ) {
    viewerCtxData.setCurrentPage( pageNum );
    setCurrentPage( pageNum );
};

export let fit2DView = function() {
    viewerCtxData.fit2DView();
};

export let rotate2DCW90 = function() {
    rotation += 90;
    if( rotation > 180 )
    {
        rotation -= 360;
    }
    viewerCtxData.rotate2DCW90();
};

export let rotate2DCCW90 = function() {
    rotation -= 90;
    if( rotation < -180 )
    {
        rotation += 360;
    }
    viewerCtxData.rotate2DCCW90();
};

export let setMouseMovePan = function( bPan ) {
    viewerCtxData.setMouseMovePan( bPan );
};

/**
 * Make the viewport calculations needed for setting the viewport for Server Side Rendering
 * where a new PNG image will be rendered on the server for display.
 *
 * @param {object} markup the markup
 * @param {object} ctxVpt viewer context
 * @returns {object} viewport
 */
function setViewportForMarkupSSR( markup, ctxVpt ) {
    var mrkViewParam = markup.viewParam;

    // Calculate the pixels-per-unit density.
    var screenDim = ctxVpt.startWidth;
    var docDimInUnits = ctxVpt.pageWidth;
    var unitsMult = unitsMultiplier( ctxVpt.units );
    var density = screenDim / docDimInUnits * unitsMult; // Inches is 1.0

    // Calculate the original scale factor in effect when the markup was created.
    var originalScale = mrkViewParam.scale * 96.0 * ( 1.0 / density );

    // Calculate the markup center in document units.
    var markupStartInDocUnits = {
        x: markup.start.x * unitsMult / 96.0,
        y: ctxVpt.pageHeight - markup.end.y * unitsMult / 96.0 // flip back to 0.0 at lower left.
    };
    var markupEndInDocUnits = {
        x: markup.end.x * unitsMult / 96.0,
        y: ctxVpt.pageHeight - markup.start.y * unitsMult / 96.0 // flip back to 0.0 at lower left.
    };
    var mrkCenter = {
        x: markupStartInDocUnits.x + ( markupEndInDocUnits.x - markupStartInDocUnits.x ) * 0.5,
        y: markupStartInDocUnits.y + ( markupEndInDocUnits.y - markupStartInDocUnits.y ) * 0.5
    };

    return { scale: originalScale, center: { x: mrkCenter.x, y: mrkCenter.y } };
}

/**
 * Make the viewport calculations needed for setting the viewport for Client Side Rendering
 * where a transform matrix will be used with the current canvas and SVG.
 *
 * @param {object} markup the markup
 * @param {object} ctxVpt viewer context
 * @returns {object} viewport
 */
function setViewportForMarkupCSR( markup, ctxVpt ) {
    var mrkViewParam = markup.viewParam;

    var unitsMult = unitsMultiplier( ctxVpt.units );

    var originalScale = mrkViewParam.scale * 96.0 * ( 1.0 / unitsMult );
    var mrkCenter = {
        x: -( mrkViewParam.x * mrkViewParam.scale ),
        y: -( mrkViewParam.y * mrkViewParam.scale )
    };

    return { scale: originalScale, center: { x: mrkCenter.x, y: mrkCenter.y } };
}

/**
 * Set the viewport based on the vp info calculated when the markup was created.
 * Call the appropriate function to do the calculations based on whether Server or
 * Client Side Rendering is currently in effect.
 *
 * @param {object} markup the markup
 */
export let setViewportForMarkup = function( markup ) {
    if ( viewerCtxData ) {
        var vpt = null;

        if( isSSR() ) {
            vpt = setViewportForMarkupSSR( markup, viewerCtxData.getSize() );
        } else {
            vpt = setViewportForMarkupCSR( markup, viewerCtxData.getSize() );
        }
        viewerCtxData.set2DViewport( vpt.scale, vpt.center.x, vpt.center.y );
    }
};

/**
 * Resize 2D viewer
 * @param {Object} data Data from viewmodel
 */
export let set2DViewerSize = function( data ) {
    let self = this;

    if( this.resizeTimeoutPromise ) {
        AwTimeoutService.instance.cancel( this.resizeTimeoutPromise );
    }
    this.resizeTimeoutPromise = AwTimeoutService.instance( function() {
        self.resizeTimeoutPromise = null;
        resizeViewer();
    }, 250 );
};

/**
 * Resize viewer function
 *
 * @function resizeViewer
 */
function resizeViewer() {
    var dimensions = getComputedViewerDimensions();

    if( viewerCtxData ) {
        viewerCtxData.setSize( dimensions.viewerWidth, dimensions.viewerHeight - 5 );
        //utils2dViewer.clearCanvas();
    }
}

function getComputedViewerDimensions() {
    var viewerComputedWidth = computeViewerWidth();
    var viewerComputedHeight = computeViewerHeight();

    return {
        viewerWidth: viewerComputedWidth,
        viewerHeight: viewerComputedHeight
    };
}

/**
 * Compute viewer width
 *
 * @returns {Number} computed client width
 */
function computeViewerWidth() {
    if (!viewerContainerDivEle) {
        return 0;
    }

    let currElement = viewerContainerDivEle.prevObject[ 0 ];
    while( currElement && !_.includes( currElement.className, viewerParentContainerClass ) ) {
        currElement = currElement.parentElement;
    }

    if (currElement) {
        return currElement.clientWidth;
    }

    return 0;
}

/**
 * Compute viewer height
 *
 * @returns {Number} computed client height
 */
function computeViewerHeight() {
    if (!viewerContainerDivEle) {
        return 0;
    }

    let currElement = viewerContainerDivEle.prevObject[ 0 ];
    while( currElement && !_.includes( currElement.className, viewerParentContainerClass ) ) {
        currElement = currElement.parentElement;
    }

    let parentElement = currElement.parentElement;

    // try to find height using right command bar
    let navElements = document.getElementsByTagName( 'nav' );
    for (let i = 0; i < navElements.length; ++i) {
        let commandBars = navElements[i].getElementsByTagName( 'aw-command-bar' );
        for (let j = 0; j < commandBars.length; ++j) {
            if ( commandBars[j].outerHTML && commandBars[j].outerHTML.indexOf( 'aw_rightWall' ) > 0 ) {
                parentElement.style.height = commandBars[j].clientHeight - 30 - 70 + 'px';
                currElement.style.height = commandBars[j].clientHeight - 30 - 70 - 75 + 'px';

                return commandBars[j].clientHeight - 30 - 70 - 75;
            }
        }
    }

    // calculate best height based an upper element
    let heightElement = viewerContainerDivEle.prevObject[ 0 ];
    while( heightElement && ( !_.includes( heightElement.className, 'aw-base-scrollPanel' ) ? true : heightElement && heightElement.tagName !== 'DIV' ) &&
        !_.includes( heightElement.className, 'aw-viewerjs-dimensions' ) ) {
        heightElement = heightElement.parentElement;
    }

    let panelSectionElement = heightElement;
    while( panelSectionElement && !_.includes( panelSectionElement.className, 'aw-layout-panelSection ' ) && panelSectionElement.parentElement ) {
        panelSectionElement = panelSectionElement.parentElement;
    }

    if( !_.isNull( panelSectionElement ) || !_.isUndefined( panelSectionElement ) ) {
        heightElement = panelSectionElement;

        parentElement.style.height = heightElement.clientHeight - 28 - 70 + 'px';
        currElement.style.height = heightElement.clientHeight - 28 - 70 - 50 + 'px';

        return heightElement.clientHeight - 70 - 50;

    } else if( !_.isNull( heightElement ) || !_.isUndefined( heightElement ) ) {
        parentElement.style.height = heightElement.clientHeight + 'px';
        currElement.style.height = heightElement.clientHeight - 75 + 'px';

        return heightElement.clientHeight - 75;
    }

    if (currElement) {
        return currElement.clientHeight;
    }

    return 0;
}

/**
 * Get viewer message for key
 *
 * @function getViewerMessage
 *
 * @param {String} key Key to search
 * @param {String} i18nFile file to search
 * @return {Promise} A promise resolved once message is retrieved
 */
function getViewerMessage( key, i18nFile ) {
    var returnPromise = AwPromiseService.instance.defer();
    localeSvc.getTextPromise( i18nFile ).then(
        function( localTextBundle ) {
            returnPromise.resolve( localTextBundle[ key ] );
        } );
    return returnPromise.promise;
}

/**
 * cleanup 2D view
 * @param {String} viewerCtxNamespace viewer namespace
 */
export let cleanup2DViewer = function( viewerCtxNamespace ) {
    appCtxSvc.unRegisterCtx( 'viewerContext' );
};

export default exports = {
    setTwoDViewerNamespace,
    initialize2DViewer,
    setViewerLoadingStatus,
    showViewerEmmProgress,
    showViewerProgress,
    setLoadingErrorStatus,
    set2DViewerSize,
    cleanup2DViewer
};
