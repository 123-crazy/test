// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define, window
 */

/**
 * This module defines the classes, services
 *
 * @module js/hosting/hostObjectRefService
 * @namespace hostObjectRefService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import awDragAndDropService from 'js/awDragAndDropService';
import dragAndDropService from 'js/dragAndDropService';
import hostBaseRefSvc from 'js/hosting/hostBaseRefService';
import _ from 'lodash';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create a new InteropObjectRef (_2014_02 version) based on the given IModelObject.
 *
 * @memberof hostObjectRefService
 *
 * @param {IModelObject} modelObject - The {@link IModelObject} to create an {@link InteropObjectRef} from.
 *
 * @return {InteropObjectRef} A new  InteropObjectRef(s) necessary to reference the given IModelObject.
 */
export let createBasicRefByModelObject = function( modelObject ) {
    return hostBaseRefSvc.createBasicObjectRef( '', modelObject.uid, modelObject.type );
};

/**
 * Create a new InteropObjectRef based on the given IModelObject.
 *
 * @memberof hostObjectRefService
 *
 * @param {IModelObject} modelObject - The {@link IModelObject} to create an {@link InteropObjectRef} from.
 *
 * @return {InteropObjectRefArray} A new *array* containing the InteropObjectRef(s) necessary to reference
 *         the given IModelObject.
 */
export let createObjectRefsByModelObject = function( modelObject ) {
    var interopObjects = [];

    var hostingState = appCtxSvc.ctx.aw_hosting_state;

    var encoderMap = hostingState.map_ref_type_to_encoder;
    var factoryMap = hostingState.map_ref_type_to_factory;

    var defaultEncoder = encoderMap[ hostBaseRefSvc.DEFAULT_TYPE ];
    var defaultFactory = factoryMap[ hostBaseRefSvc.DEFAULT_TYPE ];

    if( defaultEncoder && defaultEncoder.isObjectSupported( modelObject ) &&
        defaultFactory && defaultFactory.isObjectSupported( modelObject ) ) {
        var refs = defaultFactory.createInteropObjectRef( modelObject, defaultEncoder );

        _.forEach( refs, function( ref ) {
            interopObjects.push( ref );
        } );
    }

    _.forEach( encoderMap, function( encoder, eType ) {
        if( eType === hostBaseRefSvc.DEFAULT_TYPE ) {
            return;
        }

        if( encoder.isObjectSupported( modelObject ) ) {
            _.forEach( factoryMap, function( factory, fType ) {
                if( fType === hostBaseRefSvc.DEFAULT_TYPE ) {
                    return;
                }

                if( factory.isObjectSupported( modelObject ) ) {
                    var refs2 = factory.createInteropObjectRef( modelObject, encoder );

                    _.forEach( refs2, function( ref ) {
                        interopObjects.push( ref );
                    } );
                }
            } );
        }
    } );

    return interopObjects;
};

/**
 * Initialize this service.
 *
 * @memberof hostObjectRefService
 *
 * @returns {Promise} Resolved when this service is fully initialized.
 */
export let initialize = function() {
    /**
     * Set a callback function into the 'awDragAndDropService' so that it can create {InteropObjectRef}
     * objects.
     */
    awDragAndDropService.setCreateInteropObjectRef( exports.createObjectRefsByModelObject );

    dragAndDropService.setCreateInteropObjectRef( exports.createObjectRefsByModelObject );

    return AwPromiseService.instance.resolve();
};

export default exports = {
    createBasicRefByModelObject,
    createObjectRefsByModelObject,
    initialize
};
/**
 * Register this service with AngularJS.
 *
 * @member hostObjectRefService
 * @memberof NgServices
 *
 * @param {AwPromiseService.instance} AwPromiseService.instance - Service to use.
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {awDragAndDropService} awDragAndDropService - Service to use.
 * @param {hostBaseRefService} hostBaseRefSvc - Service to use.
 *
 * @returns {hostObjectRefService} Reference to service's API object.
 */
app.factory( 'hostObjectRefService', () => exports );
