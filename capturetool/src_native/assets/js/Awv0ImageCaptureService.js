// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0ImageCaptureService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import viewerSecondaryModelSvc from 'js/viewerSecondaryModel.service';
import dmSvc from 'soa/dataManagementService';
import fmSvc from 'soa/fileManagementService';
import cdmSvc from 'soa/kernel/clientDataModel';
import messagingService from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import viewerCtxService from 'js/viewerContext.service';
import commandPanelService from 'js/commandPanel.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import contributionService from 'js/contribution.service';

var exports = {};

var _listOfImageCaptureObjects = [];

var lastActiveCaptureObj = null;

var _imageCaptureToolAndInfoPanelCloseEventSubscription = null;
var _isImageCaptureContextPinned = false;

var _populateCaptureListEvent = null;
var _awp0MarkupEditMainEventSubscription = null;
var pinnedReferenceObject = null;

/**
 * The FMS proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_FMS_PROXY_CONTEXT = 'fms';

/**
 * Relative path to the FMS proxy download service.
 */
var CLIENT_FMS_DOWNLOAD_PATH = WEB_XML_FMS_PROXY_CONTEXT + '/fmsdownload/';

/**
 * set the pin state on the selection
 *
 */
export let pinImageCaptureContext = function() {
    _isImageCaptureContextPinned = true;
    appCtxSvc.registerCtx( 'isImageCaptureContextPinned', _isImageCaptureContextPinned );
    pinnedReferenceObject = appCtxSvc.ctx.selected.props.awb0UnderlyingObject;
};

/**
 * set the pin state on the selection
 *
 */
export let unPinImageCaptureContext = function() {
    _isImageCaptureContextPinned = false;
    appCtxSvc.registerCtx( 'isImageCaptureContextPinned', _isImageCaptureContextPinned );
};

/**
 * Get all captures data
 *
 * @param {String} searchCriteria searchString for filter
 * @returns {Object} The list of image capture objects
 */
export let getAllImageCapturesData = function( searchCriteria ) {
    var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );
    var imageCapturesData = [];
    if( currentViewerCtx.imageCapture &&
        Array.isArray( currentViewerCtx.imageCapture.listOfImageCaptureObjects ) &&
        currentViewerCtx.imageCapture.listOfImageCaptureObjects.length > 0 ) {
        imageCapturesData = currentViewerCtx.imageCapture.listOfImageCaptureObjects;
        if( !_.isNull( searchCriteria.searchString ) &&
            !_.isUndefined( searchCriteria.searchString ) &&
            !_.isEmpty( searchCriteria.searchString ) ) {
            var filterString = searchCriteria.searchString;
            var filteredListOfImageCaptureObjs = [];
            for( var i = 0; i < imageCapturesData.length; i++ ) {
                var objectFiltered = false;
                var objectName = imageCapturesData[ i ].props.awp0CellProperties.dbValues[ 0 ].split( ':' );
                if( _.includes( objectName[ 1 ].toUpperCase(), filterString.toUpperCase() ) ) {
                    objectFiltered = true;
                }
                var objectDescription = imageCapturesData[ i ].props.awp0CellProperties.dbValues[ 1 ].split( ':' );
                if( _.includes( objectDescription[ 1 ].toUpperCase(), filterString.toUpperCase() ) ) {
                    objectFiltered = true;
                }
                var owningUser = imageCapturesData[ i ].props.awp0CellProperties.dbValues[ 2 ].split( ':' );
                if( _.includes( owningUser[ 1 ].toUpperCase(), filterString.toUpperCase() ) ) {
                    objectFiltered = true;
                }
                if( objectFiltered ) {
                    filteredListOfImageCaptureObjs.push( imageCapturesData[ i ] );
                }
            }
            return {
                imageCapturesData: filteredListOfImageCaptureObjs,
                imageCapturesDataLength: filteredListOfImageCaptureObjs.length
            };
        }
    }
    return {
        imageCapturesData: imageCapturesData,
        imageCapturesDataLength: imageCapturesData.length
    };
};

/**
 * image capture panel revealed
 *
 * @function imageCapturePanelRevealed
 */
export let imageCapturePanelRevealed = function() {
    eventBus.publish( 'imageCapture.currentSelectionUpdated', {} );
    eventBus.publish( 'Awp0MarkupMain.contentUnloaded', {} );
    var markupCtx = appCtxSvc.getCtx( 'markup' );
    if( !markupCtx ) {
        appCtxSvc.registerCtx( 'markup', {} );
        markupCtx = appCtxSvc.getCtx( 'markup' );
    }
    markupCtx.showPanel = false;
    _subscribeForImageCapturePanelCloseEvent();
    _subscribeForAwp0MarkupEditMainEvent();

    var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );
    var imageCapture = {
        listOfImageCaptureObjects: {}
    };
    currentViewerCtx.imageCapture = imageCapture;
    appCtxSvc.updateCtx( currentViewerCtxNamespace, currentViewerCtx );
    exports.populateCaptureList( currentViewerCtxNamespace );
};

var _subscribeForAwp0MarkupEditMainEvent = function() {
    if( _awp0MarkupEditMainEventSubscription === null ) {
        _awp0MarkupEditMainEventSubscription = eventBus.subscribe( 'awsidenav.openClose', function(
            eventData ) {
            if( eventData.commandId === 'Awp0MarkupEditMain' ) {
                var markupCtx = appCtxSvc.getCtx( 'markup' );
                if( !markupCtx ) {
                    appCtxSvc.registerCtx( 'markup', {} );
                    markupCtx = appCtxSvc.getCtx( 'markup' );
                }
                markupCtx.showPanel = true;
            }
        } );
    }
};
/**
 * Clear previous selection and populate capture list
 *
 * @function clearPreviousSelectionAndPopulateCaptureList
 */
export let clearPreviousSelectionAndPopulateCaptureList = function() {
    deactivateCapturedObject();
    viewerCtxService.setMarkupCommandVisibility( false, null );
    viewerSecondaryModelSvc.closeImageCaptureView( _getCurrentViewerCtxNamespace() );
    AwTimeoutService.instance( function() {
        exports.populateCaptureList( _getCurrentViewerCtxNamespace() );
    }, 200 );
};

/**
 * Clear previous selection
 *
 * @function clearPreviousImageCaptureSelection
 * @param {Object} -- ImageCaptureDataProvider
 */
export let clearPreviousImageCaptureSelection = function( dataProvider ) {
    var viewModelObject = dataProvider.selectedObjects;
    if( viewModelObject && viewModelObject.length > 0 && dataProvider.selectionModel ) {
        dataProvider.selectionModel.setSelection( [] );
        deactivateCapturedObject();
        viewerCtxService.setMarkupCommandVisibility( false, null );
        viewerSecondaryModelSvc.closeImageCaptureView( _getCurrentViewerCtxNamespace() );
        lastActiveCaptureObj = null;
    }
};

/**
 * Clear previous selection and populate capture list
 *
 * @function initializeCaptureGalleryListSubView
 */
export let initializeCaptureGalleryListSubView = function() {
    let returnPromise = AwPromiseService.instance.defer();
    contributionService.require( 'createSnapshotService' ).then( function( depModule ) {
        if( Array.isArray( depModule ) && depModule.length > 0 ) {
            returnPromise.resolve( {
                'showSnapshotTab': true,
                'activeView': 'Awv0CaptureGalleryListSub'
            } );
        } else {
            returnPromise.resolve( {
                'showSnapshotTab': false,
                'activeView': 'Awv0CaptureGalleryListSub'
            } );
        }
    } ).catch( error => {
        logger.info( 'Failed to get the snapshot contribution : ' + error );
        returnPromise.resolve( {
            'showSnapshotTab': false,
            'activeView': 'Awv0CaptureGalleryListSub'
        } );
    } );
    return returnPromise.promise;
};

/**
 * Subscribe for image capture panel close event
 */
var _subscribeForImageCapturePanelCloseEvent = function() {
    if( _imageCaptureToolAndInfoPanelCloseEventSubscription === null ) {
        _imageCaptureToolAndInfoPanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function(
            eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' ) {
                if( eventData.value ) {
                    if( eventData.value.commandId === 'Awp0Markup' || eventData.value.commandId === 'Awp0MarkupEditMain' ||
                        eventData.value.commandId === 'Awp0MarkupMain' || eventData.value.commandId === 'Awv0CaptureGallery' ) {
                        // do nothing
                    } else {
                        _unSubscribeForImageCapturePanelCloseEvent();
                    }
                } else {
                    _unSubscribeForImageCapturePanelCloseEvent();
                }
            }
        }, 'Awv0ImageCapture' );
    }
};

/**
 * Unsubscribe for image capture panel close event
 */
var _unSubscribeForImageCapturePanelCloseEvent = function() {
    try {
        if( _imageCaptureToolAndInfoPanelCloseEventSubscription !== null ) {
            eventBus.unsubscribe( _imageCaptureToolAndInfoPanelCloseEventSubscription );
            _imageCaptureToolAndInfoPanelCloseEventSubscription = null;
        }

        if( _awp0MarkupEditMainEventSubscription !== null ) {
            eventBus.unsubscribe( _awp0MarkupEditMainEventSubscription );
            _awp0MarkupEditMainEventSubscription = null;
        }
        lastActiveCaptureObj = null;
        viewerSecondaryModelSvc.closeImageCaptureView( _getCurrentViewerCtxNamespace() );
    } catch {
        logger.warn( 'Failed to close gallery panel since the viewer is not alive' );
    }
};

/**
 * activate or deactivate the capture depending on selection/deselection
 *
 */
export let onSelectionChange = function( dataProvider ) {
    var viewModelObject = dataProvider.selectedObjects;
    if( viewModelObject.length !== 0 ) {
        var promise = activateCapturedObject( viewModelObject[ 0 ] );
        viewerCtxService.setMarkupCommandVisibility( true, viewModelObject[ 0 ] );
    } else {
        deactivateCapturedObject();
        viewerCtxService.setMarkupCommandVisibility( false, null );
        lastActiveCaptureObj = null;
    }
};

/**
 * Cleanup image capture data on panel closure
 *
 */
export let cleanupImageCapturePanel = function() {
    if( appCtxSvc.getCtx( 'activeToolsAndInfoCommand.commandId' ) !== 'Awv0CaptureGallery' ) {
        exports.unPinImageCaptureContext();
    }
};

/**
 * Create image capture
 *
 * @param {String} captureName image capture name
 * @param {String} captureDesc image capture description
 */
export let createImageCapture = function( captureName, captureDesc ) {
    var viewerCtxNameSpace = _getCurrentViewerCtxNamespace();
    var contextObjectUid = null;
    if( _isImageCaptureContextPinned ) {
        var contextObject = pinnedReferenceObject;
        contextObjectUid = contextObject.dbValues[ 0 ];
    } else {
        if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.props.awb0UnderlyingObject ) {
            var contextObject = appCtxSvc.ctx.selected.props.awb0UnderlyingObject;
            contextObjectUid = contextObject.dbValues[ 0 ];
        } else {
            var selection = getCurrentSelection()[ 0 ];
            contextObjectUid = selection.uid;
        }
    }
    var promise = viewerSecondaryModelSvc.createImageCapture( contextObjectUid, viewerCtxNameSpace, captureName, captureDesc );

    promise.then( function() {
        eventBus.publish( 'imageCapture.imageCaptureSubViewUpdated', {} );
        exports.loadCreatedCapture();
    } );
};

/**
 * Notify capture list updated
 */
var _notifyCaptureListupdated = function() {
    eventBus.publish( 'imageCapture.imageCaptureListupdated', {} );
};

/**
 * activate or deactivate the capture depending on selection/deselection
 * @param {Object} dataProvider list data provider
 */
export let setExistingSelection = function( dataProvider ) {
    var viewModelCollection = dataProvider.getViewModelCollection().getLoadedViewModelObjects();
    for( var i = 0; i < viewModelCollection.length; i++ ) {
        var imageCaptureObj = viewModelCollection[ i ];
        if( lastActiveCaptureObj && lastActiveCaptureObj.uid === imageCaptureObj.uid ) {
            dataProvider.selectionModel.setSelection( [ imageCaptureObj ] );
            break;
        }
    }
};
/**
 * Load the created captured object.
 */
export let loadCreatedCapture = function() {
    var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );
    var imageCaptureUids = [];
    imageCaptureUids.push( currentViewerCtx.imageCapture.imageCaptureUids );
    var policy = getPropertyPolicies();
    propertyPolicySvc.register( policy );
    dmSvc.loadObjects( imageCaptureUids ).then( function() {
        if( policy ) {
            propertyPolicySvc.unregister( policy );
        }
        var imageCaptureObject = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdmSvc
            .getObject( imageCaptureUids[ 0 ] ), 'EDIT' );
        lastActiveCaptureObj = imageCaptureObject;
        _listOfImageCaptureObjects.unshift( imageCaptureObject );
        var currentCaptureContext = currentViewerCtx.imageCapture;
        currentCaptureContext.listOfImageCaptureObjects.unshift( _listOfImageCaptureObjects[ 0 ] );
        viewerCtxService.updateViewerApplicationContext( currentViewerCtxNamespace, 'imageCapture', currentCaptureContext );
        _notifyCaptureListupdated();
    }, function() {
        logger.error( 'SOA error :: cannot load objects.' );
    } );
};

/**
 * launch markup panel.
 */
export let launchMarkup = function( commandId, location, vmo ) {
    vmo.selected = true;
    var promise = activateCapturedObject( vmo );
    promise.then( function() {
        commandPanelService.activateCommandPanel( commandId, location );
    }, function() {
        logger.error( 'launchMarkup (activateCapturedObject) failed.' );
    } );
};

/**
 * Activate the current selected capture
 */
var activateCapturedObject = function( viewModelObject ) {
    var viewerCtxNameSpace = _getCurrentViewerCtxNamespace();
    var returnPromise = AwPromiseService.instance.defer();
    lastActiveCaptureObj = viewModelObject;
    appCtxSvc.registerCtx( 'lastActiveCaptureObj', lastActiveCaptureObj );
    var promise = ensureResolveImageUrlFromObject( lastActiveCaptureObj );
    promise.then( function( resultUrl ) {
        viewerSecondaryModelSvc.displayImageCapture( viewerCtxNameSpace, resultUrl, lastActiveCaptureObj );
        returnPromise.resolve();
    }, function() {
        logger.error( 'Image URL for captured image could not be retrieved.' );
    } );
    return returnPromise.promise;
};

/**
 * deactivate the current selected capture.
 */
var deactivateCapturedObject = function() {
    var viewerCtxNameSpace = _getCurrentViewerCtxNamespace();
    var captureObjCameraToBeApplied = lastActiveCaptureObj;
    AwTimeoutService.instance( function() {
        try {
            viewerSecondaryModelSvc.deactivateCapturedObject( viewerCtxNameSpace, captureObjCameraToBeApplied );
            captureObjCameraToBeApplied = null;
        } catch {
            logger.warn( 'Failed to close gallery panel since the viewer is not alive' );
        }
    } );
};

/**
 *  Ensure the file reference property is loaded before trying resolving the image url. This method is going to the
 * server, thus more costly, so only call this when needed info is not available on client.
 * @param {Object} targetObj targetObj
 */
var ensureResolveImageUrlFromObject = function( targetObj ) {
    var returnPromise = AwPromiseService.instance.defer();
    var objects = [];
    objects.push( targetObj );
    dmSvc.getProperties( objects, [ 'ref_list' ] ).then( function( result ) {
        var promiseResolve = resolveImageUrlFromObject( targetObj );
        promiseResolve.then( function( resultUrl ) {
            returnPromise.resolve( resultUrl );
        }, function() {
            logger.error( 'Ref-list property in capture data set is null.' );
        } );
    }, function() {
        logger.error( 'properties are not loaded.' );
    } );
    return returnPromise.promise;
};

/**
 * Try resolving the image url from given capture object.
 * @param {Object} targetObj targetObj
 */
var resolveImageUrlFromObject = function( targetObj ) {
    var returnPromise = AwPromiseService.instance.defer();
    var refList = null;
    if( targetObj !== null ) {
        refList = targetObj.props.ref_list;
    }
    if( refList === null ) {
        logger.error( 'Ref-list property in capture data set is null.' );
    } else {
        var fileList = refList.dbValues;
        var imageFiles = refList.uiValues;
        var imanFiles = cdmSvc.getObjects( fileList );

        if( fileList === null ) {
            logger.error( 'File reference in capture data set is empty.' );
        } else {
            var imanFile = pullHDImageFromRefList( imageFiles );
            var promiseIman = processImanObject( imanFiles[ imanFile ] );
            promiseIman.then( function( resultUrl ) {
                returnPromise.resolve( resultUrl );
            }, function() {
                logger.error( 'failed to process iman object' );
            } );
        }
    }
    return returnPromise.promise;
};

/**
 * Get image file reference from the files list for the image capture
 *@param refList list of file references
 */
var pullHDImageFromRefList = function( refList ) {
    var returnFile = null;
    var index;
    for( var i = 0; i < refList.length; i++ ) {
        if( refList[ i ] !== null ) {
            var name = refList[ i ];
            if( name !== null && name.match( '.png$' ) ) {
                index = i;
                break;
            }
        }
    }
    return index;
};

/**
 *  Retrieve a uri for a Iman model object.
 *  @param (Object) imanFile iman model object.
 */
var processImanObject = function( imanFile ) {
    var returnPromise = AwPromiseService.instance.defer();
    if( imanFile !== null ) {
        var objects = [];
        objects[ 0 ] = imanFile;
        fmSvc.getFileReadTickets( objects ).then( function( result ) {
            var ticket = result.tickets[ 1 ];
            var fileName = fmsUtils.getFilenameFromTicket( ticket[ 0 ] );
            var uri = buildUrlFromFileTicket( ticket, fileName );
            returnPromise.resolve( uri );
        }, function() {
            logger.error( 'Returned file ticket is null.' );
        } );
    }
    return returnPromise.promise;
};

/**
 * Build url from a file ticket.
 *
 * @param {String} fileTicket - The file ticket
 * @param {String} openFileName - open file with this name.
 * @return url
 */
var buildUrlFromFileTicket = function( fileTicket, openFileName ) {
    var fileName = '';
    if( openFileName && openFileName.length > 0 ) {
        fileName = encodeURIComponent( openFileName );
    } else {
        fileName = fmsUtils.getFilenameFromTicket( fileTicket );
    }

    var downloadUri = CLIENT_FMS_DOWNLOAD_PATH + fileName + '?ticket=' + encodeURIComponent( fileTicket );
    var baseUrl = browserUtils.getBaseURL();
    return baseUrl + downloadUri;
};

/**
 * Get viewer context
 */
var _getCurrentViewerCtxNamespace = function() {
    var viewerCtx = appCtxSvc.getCtx( 'viewer' );

    if( viewerCtx.activeViewerCommandCtx ) {
        return viewerCtx.activeViewerCommandCtx;
    }
    return 'awDefaultViewer'; // passing default as snapshot can be created from one step command
};

/**
 * update name and description of capture
 */
export let updateCaptureNameAndDescription = function() {
    var selection = null;
    var selectedObjectName = null;
    if( _isImageCaptureContextPinned ) {
        selection = cdmSvc.getObject( pinnedReferenceObject.dbValues[ 0 ] );
        selectedObjectName = selection.props.object_name.dbValues[ 0 ];

    } else {
        selection = getCurrentSelection();
        selectedObjectName = selection[ 0 ].props.object_string.dbValues[ 0 ];
    }
    var captureString = 'Capture For {0}'.replace( '{0}', selectedObjectName );
    appCtxSvc.updateCtx( 'captureName', captureString );
    appCtxSvc.updateCtx( 'captureDescription', captureString );
    eventBus.publish( 'imageCapture.showImageCaptureCreateSubPanel', {} );
};

/**
 * get current selection
 */
export let getImageCaptureContext = function() {
    if( _isImageCaptureContextPinned ) {
        return;
    }
    var selection = getCurrentSelection();
    pinnedReferenceObject = null;
    return {
        currentSelectionData: selection,
        totalFound: selection.length
    };
};

/**
 * Show delete confirmation
 *
 * @param {Object} data object
 */
export let deleteSelectedImageCapture = function( data ) {
    var msg = data.i18n.captureDeleteConfirmation.replace( '{0}', appCtxSvc.ctx.imageCaptureToBeDeleted.captureText );
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.delete,
        onClick: function( $noty ) {
            $noty.close();
            exports.deleteSelectedImageCaptureAction();
        }
    } ];
    messagingService.showWarning( msg, buttons );
};

var soaSvcDeleteRelation = function( input, imageCaptureModelObject ) {
    soaSvc.post( 'Core-2006-03-DataManagement', 'deleteRelations', input ).then( function() {
        exports.deleteImageCaptureObjectFromList( imageCaptureModelObject );
        AwTimeoutService.instance( function() {
            viewerSecondaryModelSvc.closeImageCaptureView( _getCurrentViewerCtxNamespace() );
        } );
    }, function() {
        logger.error( 'SOA error :: failed to delete capture.' );
    } );
};

/**
 * Delete all capture images
 */

export let deleteAllCaptureImages = function() {
    var currentSubLoc = null;
    var selectedModelObj = null;
    currentSubLoc = appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ];
    if( _.isEqual( currentSubLoc, 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) ) {
        if( pinnedReferenceObject !== null ) {
            var contextObjectUid = pinnedReferenceObject.dbValues[ 0 ];
            selectedModelObj = cdmSvc.getObject( contextObjectUid );
        } else {
            var contextObject = appCtxSvc.ctx.selected.props.awb0UnderlyingObject;
            var contextObjectUid = contextObject.dbValues[ 0 ];
            selectedModelObj = cdmSvc.getObject( contextObjectUid );
        }
    }
    var listOfImageCaptureModelObjects = appCtxSvc.getCtx( _getCurrentViewerCtxNamespace() ).imageCapture.listOfImageCaptureObjects;
    var relInputArray = [];
    _.forEach( listOfImageCaptureModelObjects, imageCaptureModelObject => {
        relInputArray.push( {
            relationType: 'Fnd0ViewCapture',
            primaryObject: selectedModelObj,
            secondaryObject: imageCaptureModelObject
        } );
    } );
    var input = {
        input: relInputArray
    };
    soaSvcDeleteRelation( input, listOfImageCaptureModelObjects );
};

/**
 * Message before cancelling/deleting all images
 *
 * @param  {Object} data view model
 */
export let deleteAllImages = function( data ) {
    var msg = data.i18n.allImagesDeleteConfirmationText;
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.delete,
        onClick: function( $noty ) {
            $noty.close();
            exports.deleteAllCaptureImages();
        }
    } ];
    messagingService.showWarning( msg, buttons );
};

/**
 * Delete selected image capture
 */
export let deleteSelectedImageCaptureAction = function() {
    var currentSubLoc = null;
    var selectedModelObj = null;
    currentSubLoc = appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ];
    if( _.isEqual( currentSubLoc, 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) ) {
        if( pinnedReferenceObject !== null ) {
            var contextObjectUid = pinnedReferenceObject.dbValues[ 0 ];
            selectedModelObj = cdmSvc.getObject( contextObjectUid );
        } else {
            var contextObject = appCtxSvc.ctx.selected.props.awb0UnderlyingObject;
            var contextObjectUid = contextObject.dbValues[ 0 ];
            selectedModelObj = cdmSvc.getObject( contextObjectUid );
        }
    } else if( _.isEqual( currentSubLoc, 'com.siemens.splm.client.ewi:ewiSubLocation' ) ) {
        selectedModelObj = appCtxSvc.ctx.workinstr0Vis.selectedRevObj;
    } else if( _.isEqual( currentSubLoc, 'showObject' ) || _.isEqual( currentSubLoc, 'teamcenter.search.search' ) ) {
        selectedModelObj = appCtxSvc.ctx.selected;
    }

    var imageCaptureModelObject = appCtxSvc.ctx.imageCaptureToBeDeleted.selectedModelObject;
    var relInputArray = [];
    var rel = {
        relationType: 'Fnd0ViewCapture',
        primaryObject: selectedModelObj,
        secondaryObject: imageCaptureModelObject
    };
    relInputArray.push( rel );
    var input = {
        input: relInputArray
    };

    soaSvcDeleteRelation( input, [ imageCaptureModelObject ] );
};

/**
 * delete the capture from listOfImageCaptureObjects.
 */
export let deleteImageCaptureObjectFromList = function( vmo ) {
    soaSvc.post( 'Core-2006-03-DataManagement', 'deleteObjects', {
            objects: vmo
        } )
        .then(
            function() {
                var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
                var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );
                var listOfImageCaptureObjects = currentViewerCtx.imageCapture.listOfImageCaptureObjects;
                if( vmo.length === listOfImageCaptureObjects.length ) {
                    currentViewerCtx.imageCapture.listOfImageCaptureObjects = [];
                    viewerCtxService.setMarkupCommandVisibility( false, null );
                    _notifyCaptureListupdated();
                    return;
                }
                var deletedUid = vmo[ 0 ].uid;

                for( var i = 0; i < listOfImageCaptureObjects.length; i++ ) {
                    if( deletedUid === listOfImageCaptureObjects[ i ].uid ) {
                        currentViewerCtx.imageCapture.listOfImageCaptureObjects.splice( i, 1 );
                        viewerCtxService.setMarkupCommandVisibility( false, null );
                        _notifyCaptureListupdated();
                    }
                }
            },
            function() {
                logger.error( 'SOA error :: failed to delete capture.' );
            } );
};

/**
 * populate existing capture list from context object
 * @param {String} viewerCtxNamespace viewer context name space
 */
export let populateCaptureList = function( viewerCtxNamespace ) {
    var currentViewerCtxNamespace = viewerCtxNamespace;
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );
    var currentCaptureContext = currentViewerCtx.imageCapture;
    var occMgmtCtxNameKey = currentViewerCtx.occmgmtContextName;
    var contextObject = null;
    var currentSubLoc = null;
    var capturedList = [];
    var filter = [];
    var relationFilter = {
        relationTypeName: 'Fnd0ViewCapture'
    };
    filter[ 0 ] = relationFilter;
    var preferenceInfo = {
        info: filter
    };
    currentSubLoc = appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ];
    if( _isImageCaptureContextPinned ) {
        let underlyingObject = pinnedReferenceObject;
        if( underlyingObject ) {
            var contextObjectUid = underlyingObject.dbValues[ 0 ];
            contextObject = cdmSvc.getObject( contextObjectUid );
        }
    } else {
        if( _.isEqual( currentSubLoc, 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) ) {
            if( Array.isArray( appCtxSvc.ctx[ occMgmtCtxNameKey ].selectedModelObjects ) && appCtxSvc.ctx[ occMgmtCtxNameKey ].selectedModelObjects.length > 0 ) {
                let lastIndex = appCtxSvc.ctx[ occMgmtCtxNameKey ].selectedModelObjects.length - 1;
                contextObject = appCtxSvc.ctx[ occMgmtCtxNameKey ].selectedModelObjects[ lastIndex ];
            } else {
                contextObject = appCtxSvc.ctx.selected;
            }
            if( contextObject.props ) {
                let underlyingObject = contextObject.props.awb0UnderlyingObject;
                if( underlyingObject ) {
                    var contextObjectUid = underlyingObject.dbValues[ 0 ];
                    contextObject = cdmSvc.getObject( contextObjectUid );
                }
            }
        } else if( _.isEqual( currentSubLoc, 'showObject' ) || _.isEqual( currentSubLoc, 'teamcenter.search.search' ) ) {
            contextObject = appCtxSvc.ctx.selected;
        } else if( _.isEqual( currentSubLoc, 'com.siemens.splm.client.ewi:ewiSubLocation' ) ) {
            contextObject = appCtxSvc.ctx.workinstr0Vis.selectedRevObj;
        } else {
            var selection = getCurrentSelection()[ 0 ];
            var contextObjectUid = selection.uid;
            contextObject = cdmSvc.getObject( contextObjectUid );
        }
    }
    var contextObjects = [];
    contextObjects.push( contextObject );
    var inputData = {
        primaryObjects: contextObjects,
        pref: preferenceInfo
    };
    var policy = getPropertyPolicies();
    propertyPolicySvc.register( policy );
    soaSvc.post( 'Core-2007-09-DataManagement', 'expandGRMRelationsForPrimary', inputData ).then(
        function( result ) {
            if( policy ) {
                propertyPolicySvc.unregister( policy );
            }
            var captureObjects = result.ServiceData.modelObjects;
            if( captureObjects ) {
                currentCaptureContext.listOfImageCaptureObjects = [];
                _.forEach( captureObjects, function( captureObject ) {
                    var captureDataType = captureObject.type;

                    if( captureDataType === 'SnapShotViewData' ) {
                        capturedList.push( captureObject );
                    }
                } );
                //Sort images in decending order based on created date
                capturedList.sort( ( capturedObjA, capturedObjB ) => {
                    var createdDateA = new Date( capturedObjA.props.creation_date.dbValues[ '0' ] );
                    var createdDateB = new Date( capturedObjB.props.creation_date.dbValues[ '0' ] );
                    return createdDateB - createdDateA;
                } );
                currentCaptureContext.listOfImageCaptureObjects = capturedList;
                viewerCtxService.updateViewerApplicationContext( currentViewerCtxNamespace, 'imageCapture', currentCaptureContext );
                _notifyCaptureListupdated();
            }
            eventBus.publish( 'imageCapture.currentSelectionUpdated', {} );
        },
        function() {
            logger.error( 'SOA error :: expandGRMRelations (Fnd0ViewCapture) failed.' );
        } );
};

/**
 * To download captured snap shot in high resolution format i.e. png
 *
 * @param {String} objUid current selected model object uid.
 */
export let downloadSnapShotFile = function( objUid ) {
    var contextObject = cdmSvc.getObject( objUid );
    if( contextObject && contextObject.props ) {
        var imanFiles = contextObject.props.ref_list;
        if( imanFiles && imanFiles.uiValues.length > 0 ) {
            var imanFileUid = null;
            var i;
            for( i = 0; i < imanFiles.uiValues.length; i++ ) {
                if( _.endsWith( imanFiles.uiValues[ i ], 'png' ) ) {
                    imanFileUid = imanFiles.dbValues[ i ];
                    break;
                }
            }
            var imanFileModelObject = cdmSvc.getObject( imanFileUid );
            var files = [ imanFileModelObject ];
            fmSvc.getFileReadTickets( files ).then(
                function( readFileTicketsResponse ) {
                    if( readFileTicketsResponse && readFileTicketsResponse.tickets &&
                        readFileTicketsResponse.tickets.length > 1 ) {
                        var ticketsArray = readFileTicketsResponse.tickets[ 1 ]; //1st element is array of iman file while 2nd element is array of tickets
                        if( ticketsArray && ticketsArray.length > 0 ) {
                            var fileName = fmsUtils.getFilenameFromTicket( ticketsArray[ 0 ] );
                            fmsUtils.openFile( ticketsArray[ 0 ], fileName );
                        } else {
                            logger.error( 'No tickets were found in the response data for snap shot model object.' );
                        }
                    } else {
                        logger.error( 'File read tickets response data for snap shot model object is empty. ' );
                    }
                } );
        } else {
            logger.error( 'Image model object property \'ref_list\' is missing.' );
        }
    } else {
        logger.error( 'Model object associated with select captured image is missing.' );
    }
};

/**
 * return the property policies
 */
var getPropertyPolicies = function() {
    return {
        types: [ {
            name: 'SnapShotViewData',
            properties: [ {
                    name: 'object_name'
                },
                {
                    name: 'object_desc'
                },
                {
                    name: 'object_type'
                },
                {
                    name: 'release_status_list'
                },
                {
                    name: 'date_released'
                },
                {
                    name: 'creation_date'
                },
                {
                    name: 'owning_user',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                },
                {
                    name: 'fnd0HasMarkupData'
                },
                {
                    name: 'fnd0ContextObjects',
                    properties: []
                },
                {
                    name: 'ref_list',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                },
                {
                    name: 'ref_names'
                }
            ],
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        } ]
    };
};

/**
 * Returns current selection object.
 *
 * @return {Object} - Current selection.
 */
var getCurrentSelection = function() {
    var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );
    var selectionLength = 0;
    if( currentViewerCtx.viewerSelectionModels ) {
        selectionLength = currentViewerCtx.viewerSelectionModels.length;
    }
    var currentSelection = null;
    if( selectionLength > 0 ) {
        currentSelection = currentViewerCtx.viewerSelectionModels[ selectionLength - 1 ];
    } else if( currentViewerCtx.rootModelObject ) {
        currentSelection = currentViewerCtx.rootModelObject;
    } else {
        currentSelection = currentViewerCtx.viewerCurrentProductContext;
    }
    var selection = [];
    selection.push( currentSelection );
    return selection;
};

/**
 * Subscribe for populateImageCaptureList event.
 */
var registerPopulateImageCaptureEvent = function() {
    if( _populateCaptureListEvent === null ) {
        _populateCaptureListEvent = eventBus.subscribe( 'imageCapture.populateImageCaptureList', function( eventData ) {
            exports.populateCaptureList( eventData.viewerCtxNameSpace );
        }, 'Awv0ImageCapture' );
    }
};

registerPopulateImageCaptureEvent();

export default exports = {
    pinImageCaptureContext,
    unPinImageCaptureContext,
    getAllImageCapturesData,
    imageCapturePanelRevealed,
    clearPreviousSelectionAndPopulateCaptureList,
    clearPreviousImageCaptureSelection,
    onSelectionChange,
    createImageCapture,
    setExistingSelection,
    loadCreatedCapture,
    launchMarkup,
    updateCaptureNameAndDescription,
    getImageCaptureContext,
    deleteSelectedImageCapture,
    deleteSelectedImageCaptureAction,
    deleteImageCaptureObjectFromList,
    populateCaptureList,
    downloadSnapShotFile,
    deleteAllImages,
    deleteAllCaptureImages,
    initializeCaptureGalleryListSubView,
    cleanupImageCapturePanel
};
/**
 * @member Awv0ImageCaptureService
 * @memberof NgServices
 */
app.factory( 'Awv0ImageCaptureService', () => exports );
