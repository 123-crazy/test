// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define JSCom */

/**
 * This pmi service provider
 *
 * @module js/viewerPmiManagerProvider
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import assert from 'assert';
import logger from 'js/logger';
import messagingService from 'js/messagingService';

import 'jscom';
import 'manipulator';

var exports = {};

/**
 * Provides an instance of viewer pmi manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerPmiManager} Returns viewer pmi manager
 */
export let getPmiManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerPmiManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Provides an instance of viewer model view manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {viewerModelViewManager} Returns viewer pmi manager
 */
export let getModelViewManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerModelViewManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * resolve Pmi entities promise
 *
 * @param {Object} entitiesPromise promise that resolves to entities
 * @param {Object} dataPromise data promise that resolves to entity objects
 */
var _resolvePMIEntitiesPromise = function( entitiesPromise, dataPromise ) {
    entitiesPromise.then( function( pmiList ) {
        var deferredArray = [];
        var entityObjectPromises = [];

        for( var idx = 0; idx < pmiList.length; idx++ ) {
            deferredArray.push( pmiList.getPMI( idx ) );
        }

        JSCom.jQueryPLMVis.when( deferredArray ).done( function() {
            for( var idx = 0; idx < deferredArray.length; idx++ ) {
                entityObjectPromises.push( _createPMIEntityObj( idx, arguments[ idx ] ) );
            }

            AwPromiseService.instance.all( entityObjectPromises ).then( function( entityObjects ) {
                dataPromise.resolve( entityObjects );
            } );
        } );
    }, function( reason ) {
        logger.warn( 'Could not fetch entities from server: ' + reason );
        dataPromise.resolve( [] );
    } );
};

/**
 * creates pmi entity object
 *
 * @param {Object} idx ids
 * @param {Object} entity entities
 * @return {Promise} A promise resolves to entity object promise
 */
var _createPMIEntityObj = function( idx, entity ) {
    var deferred = AwPromiseService.instance.defer();
    var nameP = entity.getName();
    var typeP = entity.getType();
    var visibleP = entity.getVisible();
    var selectedP = entity.getSelected();

    JSCom.jQueryPLMVis.when( nameP, typeP, visibleP, selectedP ).done( function( name, type, visibility, selected ) {
        var visibilityStr = visibility ? 'true' : 'false';
        deferred.resolve( [ idx, name, type, visibilityStr, entity.visObject.resourceID, selected ] );
    } );
    return deferred.promise;
};

/**
 * Class to hold the viewer pmi data
 *
 * @constructor viewerPmiManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerPmiManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Gets PMI data availability
     *
     * @param {Promise} deferred promise that resolves to application of property
     */
    self.getHasPMI = function( deferred ) {
        _viewerView.pmiMgr.getHasPMI().then( function( retValue ) {
            deferred.resolve( { hasPMIData: retValue } );
        } ).catch( function( error ) {
            deferred.reject( error );
        } );
    };

    /**
     * Sets pmi elements selected/visible property
     *
     * @param {Boolean} perOccurrence true/false
     * @param {String[]} elementIds ids
     * @param {Boolean[]} isChecked new state array
     * @param {String[]} types state names
     * @param {Promise} deferred promise that resolves to application of property
     */
    self.setPmiElementProperty = function( perOccurrence, elementIds, isChecked, types,
        deferred ) {
        var props = [];

        for( var idx = 0; idx < elementIds.length; idx++ ) {
            var propName = null;

            if( types[ idx ] === 'VISIBLE' ) {
                propName = JSCom.Consts.PMIProperties.VISIBLE;
            } else if( types[ idx ] === 'SELECTED' ) {
                propName = JSCom.Consts.PMIProperties.SELECTED;
            }

            props.push( {
                index: elementIds[ idx ],
                name: propName,
                value: isChecked[ idx ]
            } );
        }

        _getElementListForActiveOccs().then( function( elementList ) {
            elementList.setPropertiesOnPMI( props ).then( function() {
                deferred.resolve();
            }, function( reason ) {
                deferred.reject( reason );
            } );
        }, function( reason ) {
            deferred.reject( reason );
        } );
    };

    /**
     * request pmi elements Data ByParts
     *
     * @param {String[]} occIds - occ csids for parts
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     *
     */
    self.requestPmiElementsDataByParts = function( occIds, deferred ) {
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ] ) );
        }
        logger.debug( 'Vis: evaluate pmi for csids:' + JSON.stringify( occList, [ 'theStr' ] ) );
        var entitiesPromise = _viewerView.pmiMgr.getOccurrencesPMI( occList );
        entitiesPromise.then( pmiList => {
            return pmiList.isSupported();
        } ).then( isSupported => {
            if( isSupported ) {
                _resolvePMIEntitiesPromise( entitiesPromise, deferred );
            } else {
                messagingService.showError( _viewerContextData.getThreeDViewerMsg( 'pmiNotSupported' ) );
                deferred.reject( 'Unsupported PMI data.' );
            }
        } ).catch( error => {
            logger.debug( 'Failed to load PMI entities data :' + error );
            deferred.reject( 'Failed to load PMI entities data :' + error );
        } );
    };

    /**
     * Re orients the pmis in the viewer
     *
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     *
     */
    self.reorientText = function( deferred ) {
        _viewerView.pmiMgr.reorientText().then( function() {
            deferred.resolve();
        }, function( reason ) {
            deferred.reject( reason );
        } );
    };

    /**
     * Sets the 'inPlane' property for PMI
     *
     * @param {Boolean} isInPlane - Boolean indicating inPlane property.
     */
    self.setInPlane = function( isInPlane ) {
        return _viewerView.pmiMgr.setInPlane( isInPlane );
    };

    /**
     * Gets the In Plane property of all PMI in the view. When set to true, the PMI
     * will be parrallel to the XY plane. When set to false, the PMI will be parrallel with the camera's viewing plane.
     *
     * @return {Promise} Promise that resolves to providing inplane property.
     */
    self.getInPlane = function() {
        return _viewerView.pmiMgr.getInPlane();
    };

    /**
     * Gets PMI Element list
     * @return {Promise} Promise that resolves to list of pmi objects.
     */
    var _getElementListForActiveOccs = function() {
        var occIds = appCtxService.getCtx( _viewerContextNamespace ).pmiToolCtx.targetCSIDs;
        var occList = [];

        _.forEach( occIds, function( occId ) {
            occList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occId ) );
        } );

        if( occList.length === 0 ) {
            return _viewerView.pmiMgr.getAllPMI();
        }
        return _viewerView.pmiMgr.getOccurrencesPMI( occList );
    };

    /**
     * Request pmi elements data
     *
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     *
     */
    self.requestPmiElementsData = function( deferred ) {
        var entitiesPromise = _viewerView.pmiMgr.getAllPMI();
        _resolvePMIEntitiesPromise( entitiesPromise, deferred );
    };
};

/**
 * Class to hold the viewer model view data
 *
 * @constructor viewerModelViewManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerModelViewManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Request model view data
     *
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     */
    self.requestModelViewsData = function( deferred ) {
        var occList = []; // Viewer takes empty occ list to return model view for part.
        var mvsPromise = _viewerView.modelViewMgr.getModelViews( occList );
        _resolveMVsPromise( mvsPromise, deferred );
    };

    /**
     * request Model Views Data ByParts
     *
     * @param {String[]} occIds - occ csids for parts
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     *
     */
    self.requestModelViewsDataByParts = function( occIds, deferred ) {
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ] ) );
        }
        logger.info( 'Vis: evaluate model view pmi for csids:' + JSON.stringify( occList, [ 'theStr' ] ) );
        var mvsPromise = _viewerView.modelViewMgr.getModelViews( occList );
        _resolveMVsPromise( mvsPromise, deferred );
    };

    /**
     * requests elements data for given model view
     *
     * @param {String} modelViewId - model view id
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     *
     */
    self.requestModelViewElementsData = function( modelViewId, deferred ) {
        var occIds = appCtxService.getCtx( _viewerContextNamespace ).pmiToolCtx.targetCSIDs;
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ] ) );
        }

        _viewerView.modelViewMgr.getModelViews( occList ).then( function( mvList ) {
            mvList.getModelView( modelViewId ).then( function( modelView ) {
                var entitiesPromise = modelView.getPMIList();
                _resolvePMIEntitiesPromise( entitiesPromise, deferred );
            } );
        } );
    };

    /**
     * Sets model view visibility
     *
     * @param {String} modelViewId id for model view
     * @param {Boolean} isChecked true/false
     * @param {promise} deferred that resolves to application of model view
     */
    self.setModelViewVisibility = function( modelViewId, isChecked, deferred ) {
        var occIds = appCtxService.getCtx( _viewerContextNamespace ).pmiToolCtx.targetCSIDs;
        self.setModelViewVisibilityForOccurance( occIds, modelViewId, isChecked, deferred );
    };

    /**
     * Sets model view visibility for occurances provided as input
     *
     * @param {Object} occIds Array of csids of occurances
     * @param {String} modelViewId id for model view
     * @param {Boolean} isChecked true/false
     * @param {promise} deferred that resolves to application of model view
     */
    self.setModelViewVisibilityForOccurance = function( occIds, modelViewId, isChecked, deferred ) {
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ] ) );
        }
        _viewerView.modelViewMgr.getModelViews( occList ).then( function( mvList ) {
            mvList.getModelView( modelViewId ).then( function( modelView ) {
                modelView.setVisible( isChecked ).then( function() {
                    deferred.resolve();
                } );
            } );
        } );
    };

    /**
     * Add the model view dataset
     *
     * @param {Object} modelViewOwner An array of Occurence
     * @param {String} modelViewDatasetUID
     * @param {String} mappingObjectUID   Optional
     * @param {String} mappingPropName    Optional
     * @param {promise} deferred that resolves to application of model view
     * @returns {promise} promise
     */
    self.addModelViewDataset = function( modelViewOwner, modelViewDatasetUID, mappingObjectUID, mappingPropName, deferred ) {
        _viewerView.modelViewMgr.addModelViewDataset( modelViewOwner, modelViewDatasetUID, mappingObjectUID, mappingPropName )
            .then( function() {
                deferred.resolve();
            }, function( reason ) {
                deferred.reject( reason );
            } );
    };

    /**
     * Gets the model view on the root or on the Occurrences passed in.
     * @param {Object} occList An array of Occurrence
     * @param {promise} deferred that resolves to application of model view
     * @returns {ModelViewList} returns a list of model views
     */
    self.getModelViews = function( occList, deferred ) {
        _viewerView.modelViewMgr.getModelViews( occList )
            .then( function( ModelViewList ) {
                deferred.resolve( ModelViewList );
            }, function( reason ) {
                deferred.reject( reason );
            } );
    };

    /**
     * Applies the model view
     * @param {Object} modelViewOwner An array of Occurence
     * @param {String} modelViewCADID
     * @param {Object} scopeVisibilitySet An array of Occurence
     * @param {promise} deferred that resolves to application of model view
     * @returns {promise} promise
     */
    self.invoke = function( modelViewOwner, modelViewCADID, scopeVisibilitySet, deferred ) {
        _viewerView.modelViewMgr.invoke( modelViewOwner, modelViewCADID, scopeVisibilitySet )
            .then( function() {
                deferred.resolve();
            }, function( reason ) {
                deferred.reject( reason );
            } );
    };

    /**
     * Apply model view proxy
     * @param {String} modelViewCADID
     * @param {promise} deferred that resolves to application of model view
     * @returns {promise} promise
     */
    self.invokeModelViewProxy = function( mvProxyUid, deferred ) {
        if( !deferred ) {
            deferred = AwPromiseService.instance.defer();
        }
        _viewerView.modelViewMgr.invokeModelViewProxy( mvProxyUid ).then( () => {
            deferred.resolve();
        } ).catch( ( error ) => {
            deferred.reject( error );
        } );
        return deferred.promise;
    };

    /**
     * Sets the Model view properties indicated by the array of objects
     *
     * @param {Object} modelViewList An array of objects specifying the ModelView, property to change, and new value
     * @param {Object} deferred that resolves to application of model view
     * @returns {promise} A jQuery promise that is either resolved or rejected with an Error when the operation has completed
     */
    self.setPropertiesOnModelViews = function( modelViewList, deferred ) {
        var occIds = appCtxService.getCtx( _viewerContextNamespace ).pmiToolCtx.targetCSIDs;
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ] ) );
        }
        _viewerView.modelViewMgr.getModelViews( occList ).then( function( mvList ) {
            mvList.setPropertiesOnModelViews( modelViewList ).then( function() {
                deferred.resolve();
            } );
        } );
    };

    /**
     * creates Model view object properties array
     *
     * @param {Object} idx index for model view
     * @param {Object} mv model view
     * @return {Promise} A promise resolves to entity object promise
     */
    var _createMVObjPropArray = function( idx, mv ) {
        var deferred = AwPromiseService.instance.defer();
        var nameP = mv.getName();
        var visibleP = mv.getVisible();

        JSCom.jQueryPLMVis.when( nameP, visibleP ).done( function( name, visibility ) {
            var visibilityStr = visibility ? 'true' : 'false';
            deferred.resolve( [ idx, name, visibilityStr, mv.visObject.resourceID ] );
        } );
        return deferred.promise;
    };

    /**
     * resolve Model views Pmi promise
     *
     * @param {Object} mvsPromise promise that resolves to model views
     * @param {Object} dataPromise data promise that resolves to entity objects
     */
    var _resolveMVsPromise = function( mvsPromise, dataPromise ) {
        mvsPromise.then( function( modelViewList ) {
            var deferredArray = [];
            var mvObjectPromises = [];

            for( var idx = 0; idx < modelViewList.length; idx++ ) {
                deferredArray.push( modelViewList.getModelView( idx ) );
            }

            JSCom.jQueryPLMVis.when( deferredArray ).done( function() {
                for( var idx = 0; idx < deferredArray.length; idx++ ) {
                    mvObjectPromises.push( _createMVObjPropArray( idx, arguments[ idx ] ) );
                }

                AwPromiseService.instance.all( mvObjectPromises ).then( function( mvObjects ) {
                    dataPromise.resolve( mvObjects );
                } );
            } );
        }, function( reason ) {
            logger.warn( 'Could not fetch model views from server: ' + reason );
            dataPromise.resolve( [] );
        } );
    };
};

export default exports = {
    getPmiManager,
    getModelViewManager
};
/**
 * This service is used to get viewerPmiManager
 *
 * @memberof NgServices
 */
app.factory( 'viewerPmiManagerProvider', () => exports );
