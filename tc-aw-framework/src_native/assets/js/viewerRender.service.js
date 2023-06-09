// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines {@link NgServices.viewerRenderService} which provides utility functions to render viewer
 *
 * @module js/viewerRender.service
 * @requires app
 * @requires lodash
 */
import * as app from 'app';
import frameAdapterService from 'js/frameAdapter.service';
import viewerContextService from 'js/viewerContext.service';
import localeSvc from 'js/localeService';
import msgSvc from 'js/messagingService';
import viewerPreferenceService from 'js/viewerPreference.service';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import preferenceService from 'soa/preferenceService';
import viewerProgIndicatorService from 'js/viewerProgressIndicatorService';
import viewerSecurityMarkingService from 'js/viewerSecurityMarkingService';
import viewerReconcileService from 'js/viewerReconcileService';
import viewer3DConnectionManager from 'js/viewer3DConnectionManager';
import _ from 'lodash';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import 'jscom';
import 'manipulator';
/**
 * self object pointing to this instance
 */
let exports = {};

/**
 * A default viewer context namespace
 */
var DEFAULT_VIEWER_CONTEXT = 'awDefaultViewer';

/**
 * Host config token
 */
var AW_HOST_CONFIG_TOKEN = 'aw_hosting_config';

/**
 * Is viewer supported token
 */
var IS_VIEWER_SUPPORTED_TOKEN = 'IS_VIEWER_SUPPORTED';

/**
 * 2D Viewer render option
 */
var VIEWER_2D_RENDER_OPTION = preferenceService.getLoadedPrefs().AWV02DViewerRenderOption;

/**
 * Returns the default viewer context name space
 *
 * @returns {String} default viewer context name space
 */
export let getDefaultViewerNamespace = function() {
    return DEFAULT_VIEWER_CONTEXT;
};

/**
 * This utility function helps to create the viewer parameters that needs to be passed to a
 * function to load the viewer
 *
 * @param {Object} viewerContainer A div element that holds the viewer
 * @param {Number} width Width of the viewer
 * @param {Number} height Height of the viewer
 * @returns {Object} View parameter object that is required while loading viewer
 */
export let createViewerLoadParams = function( viewerContainer, width, height ) {
    var location = browserUtils.getWindowLocation();
    var cursorUrlRelativePath = location.pathname + app.getBaseUrlPath() + '/cursor';
    return new window.JSCom.Render.View.Params( viewerContainer, parseInt( width ),
        parseInt( height ), cursorUrlRelativePath );
};

/**
 * Update viewer context with viewer visibility
 *
 * @param {ViewerContextData} viewerCtxData viewer context data.
 * @param {Boolean} isVisible true if viewer tab is visible
 */
export let updateViewerContextWithVisibility = function( viewerCtxData, isVisible ) {
    viewerContextService.updateRegisteredViewerContext( viewerCtxData.getViewerCtxNamespace(),
        viewerCtxData );
    exports.updateViewerVisibility( viewerCtxData.getViewerCtxNamespace(), isVisible );
};

/**
 * Update viewer visibility context
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered.
 * @param {Boolean} isVisible true if viewer tab is visible
 */
export let updateViewerVisibility = function( viewerCtxNamespace, isVisible ) {
    if( isVisible ) {
        let is2D = false;
        let viewerCtx = viewerContextService.getRegisteredViewerContext( viewerCtxNamespace );
        if( !_.isUndefined( viewerCtx ) ) {
            is2D = viewerCtx.getIs2D();
        }

        if( is2D ) {
            viewerContextService.updateViewerApplicationContext( viewerCtxNamespace,
                viewerContextService.VIEWER_VIEW_MODE_TOKEN,
                viewerContextService.ViewerViewModes.VIEWER2D );
        } else {
            viewerContextService.updateViewerApplicationContext( viewerCtxNamespace,
                viewerContextService.VIEWER_VIEW_MODE_TOKEN,
                viewerContextService.ViewerViewModes.VIEWER3D );
        }
    } else {
        viewerContextService.updateViewerApplicationContext( viewerCtxNamespace,
            viewerContextService.VIEWER_VIEW_MODE_TOKEN,
            viewerContextService.ViewerViewModes.NOVIEWER );
    }
    viewerContextService.updateViewerApplicationContext( viewerCtxNamespace,
        viewerContextService.VIEWER_VISIBILITY_TOKEN, isVisible );
};

/**
 * Get viewer message for key
 *
 * @function setLoadingMsg
 */
var _getViewerMessage = function( key ) {
    var returnPromise = AwPromiseService.instance.defer();
    localeSvc.getTextPromise( 'Awv0threeDViewerMessages' ).then(
        function( localTextBundle ) {
            returnPromise.resolve( localTextBundle[ key ] );
        },
        function( error ) {
            returnPromise.reject( error );
        } );
    return returnPromise.promise;
};

/**
 * Sets license level in the context.
 *
 * @param  {Object} viewerView viewer view
 */
var _setLicenseLevelInCtx = function( viewerView ) {
    var viewerLicenseCtxPath = viewerContextService.VIEWER_NAMESPACE_TOKEN + '.' + viewerContextService.VIEWER_LICENSE_LEVEL_TOKEN;
    viewerView.getVisLicenseLevels( window.JSCom.Consts.LICENSE_LEVELS.ALL ).then( function( licLevels ) {
        appCtxService.updatePartialCtx( viewerLicenseCtxPath, licLevels.iCO_VisUserLicense );
    }, function( reason ) {
        logger.error( 'viewerRender: Failed to fetch viewer license level:' + reason );
        appCtxService.updatePartialCtx( viewerLicenseCtxPath, viewerContextService.ViewerLicenseLevels.BASE );
    } );
};

/**
 * Evaluates if hosting is supported
 *
 * @returns {Boolean} true if supported
 */
var _evaluateAvailabilityInHosting = function() {
    var hostConfig = appCtxService.getCtx( AW_HOST_CONFIG_TOKEN );
    var isSupported = true;

    if( !_.isUndefined( hostConfig ) ) {
        isSupported = hostConfig[ IS_VIEWER_SUPPORTED_TOKEN ];

        if( !_.isUndefined( isSupported ) && !isSupported ) {
            _getViewerMessage( 'viewerEnvironmentNotSupported' ).then( function( localizedErrorMsg ) {
                msgSvc.showError( localizedErrorMsg );
            } );
        }
    }

    return isSupported === true;
};

/**
 * Load viewer by model object
 *
 * @param {Object} targetObject Model object for which viewer needs to be loaded
 * @param {Array} productUIDs List of UIDs to associate with the session.
 * @param {Object} additionalInfo Additional name=values to be passed during the vvi generation.
 * @param {Object} loadParams Initial load parameters required to load viewer
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered. Optional
 *            parameter with default value 'awDefaultViewer'
 * @param {String} viewerType {@link viewerCtxNamespace.ViewerType} specifies the type of
 *            viewer. Optional parameter with default value
 *            {@link viewerCtxNamespace.ViewerType.JsViewer}
 * @param {Boolean} isShowAll Sets whether or not all geometry should be visible in the 3D scene.
 * @returns {Object} Promise once resolved will provide a Viewer View object that controls
 *          viewer
 *
 * @deprecated use loadByModelObjectInputParam
 */
export let loadByModelObject = function( targetObject, productUIDs, additionalInfo, loadParams,
    viewerCtxNamespace, viewerType, isShowAll ) {
    var returnPromise = AwPromiseService.instance.defer();
    var viewerCtxName = viewerCtxNamespace;
    var vType = viewerType;

    if( _.isUndefined( viewerCtxName ) || _.isNull( viewerCtxName ) ||
        _.isEmpty( viewerCtxName ) ) {
        viewerCtxName = DEFAULT_VIEWER_CONTEXT;
    }

    if( _.isUndefined( vType ) || _.isNull( vType ) || _.isEmpty( vType ) ) {
        vType = viewerContextService.ViewerType.JsViewer;
    }

    viewerContextService.createViewerApplicationContext( viewerCtxName );
    viewerContextService.updateViewerApplicationContext( viewerCtxName,
        viewerContextService.VIEWER_VIEW_MODE_TOKEN,
        viewerContextService.ViewerViewModes.NOVIEWER );
    viewerContextService.updateViewerApplicationContext( viewerCtxName,
        viewerContextService.VIEWER_VISIBILITY_TOKEN, false );

    if( !_evaluateAvailabilityInHosting() ) {
        returnPromise.reject();
        return returnPromise.promise;
    }

    var fmsTicketPromise = frameAdapterService.createLaunchFile( targetObject, additionalInfo );
    fmsTicketPromise.then( function( fmsTkt ) {
            viewerPreferenceService.getViewerPreferences( isShowAll ).then( function( viewerPreferences ) {
                var renderer = null;
                var VIEWER_RENDER_OPTION = viewerPreferenceService.getRenderSource();
                if( !VIEWER_RENDER_OPTION || VIEWER_RENDER_OPTION.length === 0 ) {
                    VIEWER_RENDER_OPTION = [ 'SSR' ];
                }
                appCtxService.updatePartialCtx( 'viewer.viewerMode', VIEWER_RENDER_OPTION[ 0 ] );
                if( Array.isArray( VIEWER_RENDER_OPTION ) && VIEWER_RENDER_OPTION[ 0 ] === 'CSR' ) {
                    let VIEWER_CSR_OPTION = viewerPreferenceService.getViewerCSRPref();
                    if( VIEWER_CSR_OPTION && VIEWER_CSR_OPTION === 'PVW' ) {
                        renderer = window.JSCom.Consts.ImplType.PLMVISWEB;
                    } else {
                        renderer = window.JSCom.Consts.ImplType.TRIANGLE;
                    }
                } else if( Array.isArray( VIEWER_RENDER_OPTION ) && VIEWER_RENDER_OPTION[ 0 ] === 'SSR' ) {
                    renderer = window.JSCom.Consts.ImplType.PICTURE;
                }

                var moniker = new window.JSCom.Render.MonikerFMSTicket(
                    frameAdapterService.getConnectionUrl(), fmsTkt, productUIDs, renderer );
                var viewerView = new window.JSCom.Render.View( loadParams );
                viewerProgIndicatorService.init( viewerView );
                viewerSecurityMarkingService.setupSecurityMarking( viewerView, loadParams.getSecurityMarkingHandler() );

                var loadingOptions = {};
                loadingOptions.preferences = viewerPreferences;
                var open3DViewPromise = viewerView.open3DModel( moniker,
                    loadingOptions );
                //Make sure both promises are resolved before proceeding
                open3DViewPromise.then( function() {
                    var viewerCtxDataObj = viewerContextService
                        .registerViewerContext( viewerCtxName, vType,
                            viewerView );

                    _setLicenseLevelInCtx( viewerView );
                    exports.updateViewerVisibility( viewerCtxName, true );

                    returnPromise.resolve( viewerCtxDataObj );
                }, function( errorMsg ) {
                    returnPromise.reject( errorMsg );
                    if( errorMsg.message ) {
                        if( errorMsg.message === 'All Pool Managers are full' ) {
                            _getViewerMessage( 'poolManagerFull' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( errorMsg.message === 'No Pool Managers were found' ) {
                            _getViewerMessage( 'poolManagerDown' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( errorMsg.message === 'ErrorName:' || _.includes( errorMsg.message, 'Failed to connect to server' ) ) {
                            _getViewerMessage( 'viewerNotConfigured' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message,
                                'MMV is not supported for Client Side rendering' ) ) {
                            _getViewerMessage( 'mmvDataNotViewable' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message,
                                'Not enough storage is available to complete this operation' ) ) {
                            _getViewerMessage( 'notEnoughBrowserStorage' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message, 'Problem processing HTTP request' ) ) {
                            _getViewerMessage( 'problemInHttpReq' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message, 'Could not initialize the rendering component due to web browser limitations' ) ) {
                            _getViewerMessage( 'browserLimitation' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else {
                            _getViewerMessage( 'vviLaunchFailed' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        }
                    } else {
                        _getViewerMessage( 'vviLaunchFailed' ).then( function( localizedErrorMsg ) {
                            msgSvc.showError( localizedErrorMsg );
                        } );
                    }
                } );
            } );
        },
        function( errorMsg ) {
            returnPromise.reject( errorMsg );
            msgSvc.showError( errorMsg );
        } ).catch( error => {
        returnPromise.reject( error );
        msgSvc.showError( error );
    } );
    return returnPromise.promise;
};

/**
 * Get viewer loading input parameters
 *
 * @returns {ViewerLoadInputParameters} Object that should have all input parameters to load the viewer
 */
export let getViewerLoadInputParameters = function() {
    return new ViewerLoadInputParameters();
};

/**
 * Load viewer by model object
 *
 * @param {ViewerLoadInputParameters} viewerLoadInputParameters Model object for which viewer needs to be loaded
 * @returns {Object} Promise once resolved will provide a Viewer View object that controls
 *          viewer
 */
export let loadByModelObjectInputParam = function( viewerLoadInputParameters ) {
    var returnPromise = AwPromiseService.instance.defer();
    var viewerCtxName = viewerLoadInputParameters.getViewerCtxNamespace();
    var vType = viewerLoadInputParameters.getViewerType();

    if( _.isUndefined( viewerCtxName ) || _.isNull( viewerCtxName ) ||
        _.isEmpty( viewerCtxName ) ) {
        viewerCtxName = DEFAULT_VIEWER_CONTEXT;
    }

    if( _.isUndefined( vType ) || _.isNull( vType ) || _.isEmpty( vType ) ) {
        vType = viewerContextService.ViewerType.JsViewer;
    }

    viewerContextService.createViewerApplicationContext( viewerCtxName );
    viewerContextService.updateViewerApplicationContext( viewerCtxName,
        viewerContextService.VIEWER_VIEW_MODE_TOKEN,
        viewerContextService.ViewerViewModes.NOVIEWER );
    viewerContextService.updateViewerApplicationContext( viewerCtxName,
        viewerContextService.VIEWER_VISIBILITY_TOKEN, false );

    if( !_evaluateAvailabilityInHosting() ) {
        returnPromise.reject();
        return returnPromise.promise;
    }

    var fmsTicketPromise = frameAdapterService.createLaunchFile( viewerLoadInputParameters.getTargetObject(), viewerLoadInputParameters.getAdditionalInfo(), viewerLoadInputParameters
        .getPVOpenConfig() );
    fmsTicketPromise.then( function( fmsTkt ) {
            viewerPreferenceService.getViewerPreferences( viewerLoadInputParameters.isShowAll(), viewerLoadInputParameters.isApplyBookmarkApplicable(),
                viewerLoadInputParameters.isDisableBookMarkApplicable(), viewerLoadInputParameters.isShowSuppressed(), viewerLoadInputParameters.getSelectionLimit() ).then( function(
                viewerPreferences ) {
                var renderer = null;
                var VIEWER_RENDER_OPTION = viewerPreferenceService.getRenderSource();

                if( !VIEWER_RENDER_OPTION || VIEWER_RENDER_OPTION.length === 0 ) {
                    VIEWER_RENDER_OPTION = [ 'SSR' ];
                }
                appCtxService.updatePartialCtx( 'viewer.viewerMode', VIEWER_RENDER_OPTION[ 0 ] );
                if( Array.isArray( VIEWER_RENDER_OPTION ) && VIEWER_RENDER_OPTION[ 0 ] === 'CSR' ) {
                    let VIEWER_CSR_OPTION = viewerPreferenceService.getViewerCSRPref();
                    if( VIEWER_CSR_OPTION && VIEWER_CSR_OPTION === 'PVW' ) {
                        renderer = window.JSCom.Consts.ImplType.PLMVISWEB;
                    } else {
                        renderer = window.JSCom.Consts.ImplType.TRIANGLE;
                    }
                } else if( Array.isArray( VIEWER_RENDER_OPTION ) && VIEWER_RENDER_OPTION[ 0 ] === 'SSR' ) {
                    renderer = window.JSCom.Consts.ImplType.PICTURE;
                }

                // Override renderer if this is a 2D document
                if( viewerLoadInputParameters.get2DRenderer() ) {
                    if( !VIEWER_2D_RENDER_OPTION || VIEWER_2D_RENDER_OPTION.length === 0 ) {
                        VIEWER_2D_RENDER_OPTION = [ 'SSR' ];
                    }

                    if( Array.isArray( VIEWER_2D_RENDER_OPTION ) && VIEWER_2D_RENDER_OPTION[ 0 ] === 'CSR' ) {
                        renderer = window.JSCom.Consts.ImplType.VECTOR2D;
                    } else {
                        renderer = window.JSCom.Consts.ImplType.PICTURE2D;
                    }
                }

                var moniker = new window.JSCom.Render.MonikerFMSTicket(
                    frameAdapterService.getConnectionUrl(), fmsTkt, viewerLoadInputParameters.getProductUids(), renderer );
                if( !viewerLoadInputParameters.hasInitialized() ) {
                    viewerLoadInputParameters.initializeViewerContext();
                }
                var viewerView = viewerLoadInputParameters.getViewerView();
                viewerProgIndicatorService.init( viewerView, viewerCtxName );
                if( viewerLoadInputParameters.getSecurityMarkingHandlerKey() ) {
                    viewerSecurityMarkingService.setupSecurityMarkingWithHandlerFnKey( viewerView, viewerLoadInputParameters.getSecurityMarkingHandlerKey() );
                } else {
                    viewerSecurityMarkingService.setupSecurityMarking( viewerView, viewerLoadInputParameters.getSecurityMarkingHandler() );
                }
                viewerReconcileService.setupReconcile( viewerView, viewerLoadInputParameters.getReconcileHandler() );

                var loadingOptions = {};
                loadingOptions.preferences = viewerPreferences;
                var open3DViewPromise = viewerView.openMoniker( moniker,
                    loadingOptions );
                //Make sure both promises are resolved before proceeding
                open3DViewPromise.then( function() {
                    _setLicenseLevelInCtx( viewerView );
                    viewer3DConnectionManager.registerBrowserUnloadListener();
                    exports.updateViewerVisibility( viewerCtxName, true );
                    if( !viewerLoadInputParameters.get2DRenderer() ) {
                        viewerContextService.getModelUnit( viewerCtxName ).then( function( modelUnit ) {
                            viewerPreferenceService.setModelUnit( modelUnit );
                        }, function( reason ) {
                            logger.error( 'viewerRender: Failed to get model unit:' + reason );
                        } );

                        viewerPreferenceService.loadViewerPreferencesFromVisSession( viewerLoadInputParameters.getViewerContext() );
                         // eslint-disable-next-line max-len
                         var navigationMode = Object.keys( viewerPreferenceService.ViewerNavigationModes ).find( key => viewerPreferenceService.ViewerNavigationModes[key] === viewerPreferences.navigation.defaultAction );
                        viewerContextService.updateViewerApplicationContext( viewerCtxName,
                            viewerContextService.VIEWER_PREFERENCE_TOKEN + '.' + viewerPreferenceService.NAVIGATION_MODE, navigationMode );
                    }
                    viewerContextService.turnOffGlobalCutlinesForSection( viewerView );
                    returnPromise.resolve( viewerLoadInputParameters.getViewerContext() );
                }, function( errorMsg ) {
                    returnPromise.reject( errorMsg );
                    if( errorMsg.message ) {
                        if( _.includes( errorMsg.message, 'All Pool Managers are full' ) ) {
                            _getViewerMessage( 'poolManagerFull' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message, 'No Pool Managers were found' ) ) {
                            _getViewerMessage( 'poolManagerDown' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( errorMsg.message === 'ErrorName:' || _.includes( errorMsg.message, 'Failed to connect to server' ) ) {
                            _getViewerMessage( 'viewerNotConfigured' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message,
                                'MMV is not supported for Client Side rendering' ) ) {
                            _getViewerMessage( 'mmvDataNotViewable' ).then( function( localizedErrorMsg ) {
                                msgSvc.showInfo( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message,
                                'Not enough storage is available to complete this operation' ) ) {
                            _getViewerMessage( 'notEnoughBrowserStorage' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message, 'Problem processing HTTP request' ) ) {
                            _getViewerMessage( 'problemInHttpReq' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message, 'Could not initialize the rendering component due to web browser limitations' ) ) {
                            _getViewerMessage( 'browserLimitation' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } else if( _.includes( errorMsg.message,
                                'The connection from the servlet to the Vis process failed.  Perhaps the Vis process timed out or the Vis processes crashed or the Vis process closed.'
                            ) ) {
                            logger.error( errorMsg.message );
                        } else if( _.includes( errorMsg.message, 'Server Side rendering without a server graphics card is not supported' ) ) {
                            logger.error( errorMsg.message );
                            _getViewerMessage( 'ssrNotSupported' ).then( function( localizedErrorMsg ) {
                                msgSvc.showInfo( localizedErrorMsg );
                            } );
                        } else {
                            _getViewerMessage( 'vviLaunchFailed' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        }
                    } else {
                        _getViewerMessage( 'vviLaunchFailed' ).then( function( localizedErrorMsg ) {
                            msgSvc.showError( localizedErrorMsg );
                        } );
                    }
                } );
            } );
        },
        function( errorMsg ) {
            returnPromise.reject( errorMsg );
            msgSvc.showError( errorMsg );
        } ).catch( error => {
        returnPromise.reject( error );
        msgSvc.showError( error );
    } );
    return returnPromise.promise;
};

/**
 * Set the target object
 *
 * @constructor ViewerLoadInputParameters
 */
var ViewerLoadInputParameters = function() {
    var self = this;
    var _targetObject = null;
    var _productUIDs = null;
    var _additionalInfo = null;
    var _viewerContainer = null;
    var _height = null;
    var _width = null;
    var _viewerCtxNamespace = null;
    var _viewerType = null;
    var _isShowAll = null;
    var _hasInitialized = false;
    var _viewerContext = null;
    var _securityMarkingHandler = null;
    var _securityMarkingHandlerKey = null;
    var _viewerView = null;
    var _is2DRenderer = false; // flag - is Document a 2D file
    var _reconcileHandler = null;
    var _isApplyBookmarkApplicable = true;
    var _pvOpenConfig = null;
    var _disableBookMark = false;
    var _showSuppressed = false;
    var _visSelectionLimit = null;

    /**
     * Set the target object
     *
     * @param {Object} targetObject target object
     */
    self.setTargetObject = function( targetObject ) {
        _targetObject = targetObject;
    };

    /**
     * Get the target Object
     *
     * @returns {Object} target object
     */
    self.getTargetObject = function() {
        return _targetObject;
    };

    /**
     *
     * @returns {Object} selection limit
     */
    self.getSelectionLimit = function() {
        return _visSelectionLimit === null ? 0 : _visSelectionLimit;
    };

    /**
     *
     * @param {Object} visSelectionLimit selection limit
     */
    self.setSelectionLimit = function( visSelectionLimit ) {
        _visSelectionLimit = visSelectionLimit;
    };

    /**
     * Set the product UID's
     *
     * @param {Object} productUIDs product UID's
     */
    self.setProductUids = function( productUIDs ) {
        _productUIDs = productUIDs;
    };

    /**
     * Get the product UID's
     *
     * @returns {Object} product UID's
     */
    self.getProductUids = function() {
        return _productUIDs;
    };

    /**
     * Set the additional info
     *
     * @param {Object} additionalInfo Additional info
     */
    self.setAdditionalInfo = function( additionalInfo ) {
        _additionalInfo = additionalInfo;
    };

    /**
     * Get the additional info
     *
     * @returns {Object} Additional info
     */
    self.getAdditionalInfo = function() {
        return _additionalInfo;
    };

    /**
     * Set the viewer container
     *
     * @param {Object} viewerContainer Viewer container
     */
    self.setViewerContainer = function( viewerContainer ) {
        _viewerContainer = viewerContainer;
    };

    /**
     * Get the viewer container
     *
     * @returns {Object} Viewer container
     */
    self.getViewerContainer = function() {
        return _viewerContainer;
    };

    /**
     * Set the viewer height
     *
     * @param {Object} height Viewer container
     */
    self.setHeight = function( height ) {
        _height = height;
    };

    /**
     * Get the viewer height
     *
     * @returns {Object} Viewer height
     */
    self.getHeight = function() {
        return _height;
    };

    /**
     * Set the viewer width
     *
     * @param {Object} width Viewer width
     */
    self.setWidth = function( width ) {
        _width = width;
    };

    /**
     * Get the viewer width
     *
     * @returns {Object} Viewer width
     */
    self.getWidth = function() {
        return _width;
    };

    /**
     * Set the viewer context namespace
     *
     * @param {Object} viewerCtxNamespace Viewer Context Namespace
     */
    self.setViewerCtxNamespace = function( viewerCtxNamespace ) {
        _viewerCtxNamespace = viewerCtxNamespace;
    };

    /**
     * Get the viewer context namespace
     *
     * @returns {Object} Viewer Context Namespace
     */
    self.getViewerCtxNamespace = function() {
        return _viewerCtxNamespace;
    };

    /**
     * Set the viewer type
     *
     * @param {Object} viewerType Viewer type
     */
    self.setViewerType = function( viewerType ) {
        _viewerType = viewerType;
    };

    /**
     * Get the viewer type
     *
     * @returns {Object} Viewer type
     */
    self.getViewerType = function() {
        return _viewerType;
    };

    /**
     * Set is show all
     *
     * @param {Boolean} isShowAll Is show all
     */
    self.setShowAll = function( isShowAll ) {
        _isShowAll = isShowAll;
    };

    /**
     * Get is show all
     *
     * @returns {Boolean} Is show all
     */
    self.isShowAll = function() {
        return _isShowAll;
    };

    /**
     * Get has initialized
     *
     * @returns {Boolean} true if parameter has initialized
     */
    self.hasInitialized = function() {
        return _hasInitialized;
    };

    /**
     * Get viewer view
     *
     * @returns {Object} viewer view
     */
    self.getViewerView = function() {
        return _viewerView;
    };

    /**
     * Get viewer context
     *
     * @returns {Object} viewer context
     */
    self.getViewerContext = function() {
        return _viewerContext;
    };

    /**
     * Set pv open config
     *
     * @param {Object} pvOpenConfig target object
     */
    self.setPVOpenConfig = function( pvOpenConfig ) {
        _pvOpenConfig = pvOpenConfig;
    };

    /**
     * Get pv open config
     *
     * @returns {Object} pv open config object
     */
    self.getPVOpenConfig = function() {
        return _pvOpenConfig;
    };

    /**
     * Set security marking handler key
     *
     * @param {Function} securityMarkingHandler security marking handler
     */
    self.setSecurityMarkingHandlerKey = function( key ) {
        _securityMarkingHandlerKey = key;
    };

    /**
     * Get security marking handler
     *
     * @returns {Function} security marking handler
     */
    self.getSecurityMarkingHandlerKey = function() {
        return _securityMarkingHandlerKey;
    };

    /**
     * Set security marking handler
     *
     * @param {Function} securityMarkingHandler security marking handler
     */
    self.setSecurityMarkingHandler = function( securityMarkingHandler ) {
        _securityMarkingHandler = securityMarkingHandler;
    };

    /**
     * Get security marking handler
     *
     * @returns {Function} security marking handler
     */
    self.getSecurityMarkingHandler = function() {
        return _securityMarkingHandler;
    };

    /**
     * Set reconcile handler
     *
     * @param {Function} reconcileHandler reconcile handler
     */
    self.setReconcileHandler = function( reconcileHandler ) {
        return _reconcileHandler = reconcileHandler;
    };

    /**
     * Get reconcile handler
     *
     * @returns {Function} reconcile handler
     */
    self.getReconcileHandler = function() {
        return _reconcileHandler;
    };

    /**
     * Set if this is a 2D renderer
     *
     * @param {Object} 2D Renderer
     */
    self.set2DRenderer = function( is2DRenderer ) {
        _is2DRenderer = is2DRenderer;
    };

    /**
     * Set if apply bookmark is applicable for session/product
     *
     * @param {Boolean} applybookmark is applicable or not for session/product
     */
    self.setApplyBookmarkApplicable = function( applybookmark ) {
        _isApplyBookmarkApplicable = applybookmark;
    };

    /**
     * Get if applybookmark is applicable for session/product
     *
     */
    self.isApplyBookmarkApplicable = function() {
        return _isApplyBookmarkApplicable;
    };

    /**
     * Disables bookmark for sesssion/product
     *
     * @param {Boolean} disableBookMark is applicable or not for session/product
     */
    self.setDisableBookMarkApplicable = function( disableBookMark ) {
        _disableBookMark = disableBookMark;
    };

    /**
     * Get if disableBookMark is applicable for session/product
     *
     */
    self.isDisableBookMarkApplicable = function() {
        return _disableBookMark;
    };

    /**
     * Renders Suppressed elements in the viewer.
     *
     * @param {Boolean} showSuppressed should render suppressed elements
     */
    self.setShowSuppressed = function( showSuppressed ) {
        _showSuppressed = showSuppressed;
    };

    /**
     * Get if the viewer should show suppressed elements
     *
     */
    self.isShowSuppressed = function() {
        return _showSuppressed;
    };

    /**
     * Get if this is a 2D renderer
     *
     * @returns {Object} 2D Renderer
     */
    self.get2DRenderer = function() {
        return _is2DRenderer;
    };
    /**
     * This utility function helps to create the viewer parameters that needs to be passed to a
     * function to load the viewer
     *
     * @returns {Object} View parameter object that is required while loading viewer
     */
    var _createViewerLoadParams = function() {
        var location = browserUtils.getWindowLocation();
        var cursorUrlRelativePath = location.pathname + app.getBaseUrlPath() + '/cursor';
        return new window.JSCom.Render.View.Params( _viewerContainer, parseInt( _width ),
            parseInt( _height ), cursorUrlRelativePath );
    };

    /**
     * Creates the viewer view
     *
     * @returns {Object} Viewer view
     */
    var _createViewerView = function() {
        return new window.JSCom.Render.View( _createViewerLoadParams() );
    };

    /**
     * This utility function helps to create the viewer parameters that needs to be passed to a
     * function to load the viewer
     */
    self.initializeViewerContext = function() {
        _hasInitialized = true;
        _viewerView = _createViewerView();
        var viewerCtxName = self.getViewerCtxNamespace();
        var vType = self.getViewerType();
        if( _.isUndefined( viewerCtxName ) || _.isNull( viewerCtxName ) ||
            _.isEmpty( viewerCtxName ) ) {
            viewerCtxName = DEFAULT_VIEWER_CONTEXT;
        }

        if( _.isUndefined( vType ) || _.isNull( vType ) || _.isEmpty( vType ) ) {
            vType = viewerContextService.ViewerType.JsViewer;
        }
        _viewerContext = viewerContextService.registerViewerContext( viewerCtxName, vType, _viewerView, self.get2DRenderer() );
    };
};

export default exports = {
    getDefaultViewerNamespace,
    createViewerLoadParams,
    updateViewerContextWithVisibility,
    updateViewerVisibility,
    loadByModelObject,
    getViewerLoadInputParameters,
    loadByModelObjectInputParam
};
/**
 * Set of utility functions for viewer
 *
 * @class viewerRenderService
 * @param appCtxService {Object} - appCtxService
 * @memberOf NgServices
 */
app.factory( 'viewerRenderService', () => exports );
