// Copyright (c) 2020 Siemens

/**
 * This is a utility service for drag-n-drop operations.
 *
 * @module js/dragAndDropUtils
 */
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import adapterSvc from 'js/adapterService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';

var exports = {};

let hasTCSessionData = appCtxSvc && appCtxSvc.ctx && !_.isUndefined( appCtxSvc.ctx.tcSessionData );

const fetchObjects = ( uids ) => {
    let missingSourceUIDs = [];
    let objsCorrespondingToUids = [];
    if( uids.length > 0 && cdm ) {
        uids.forEach( ( uid ) => {
            /**
             * Attempt to locate the 'source' objects in this browser's CDM cache.
             * <P>
             * Note: When 'source' objects are being dragged from another browser they may not have been loaded into
             * the 'target' browser.
             */
            let object = cdm.getObject( uid );
            if( !object ) {
                missingSourceUIDs.push( uid );
            } else {
                objsCorrespondingToUids.push( object );
            }
        } );
    }

    return {
        missingSourceUIDs,
        objsCorrespondingToUids
    };
};

export const getObjects = ( sourceVMOs ) => {
    let modelObjects = [];
    if( sourceVMOs ) {
        sourceVMOs.forEach( ( modelObject ) => {
            if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', modelObject.modelType ) ) {
                var adaptedObjs = adapterSvc.getAdaptedObjectsSync( [ modelObject ] );
                modelObjects.push( adaptedObjs[ 0 ] );
            } else {
                modelObjects.push( modelObject );
            }
        } );
    }
    return modelObjects;
};

export const loadVMOsIfNotAlreadyLoaded = ( uids ) => {
    let objects = fetchObjects( uids );

    if( objects.missingSourceUIDs.length > 0 && hasTCSessionData ) {
        dms.loadObjects( objects.missingSourceUIDs );
    }
};

export const getObjectByUidAsync = ( uids ) => {
    let objects = fetchObjects( uids );

    if( objects.missingSourceUIDs.length > 0 && hasTCSessionData ) {
        return dms.loadObjects( objects.missingSourceUIDs ).then( () => {
            return [ ...objects.objsCorrespondingToUids, ...fetchObjects( objects.missingSourceUIDs ).objsCorrespondingToUids ];
        } );
    }
    return Promise.resolve( objects.objsCorrespondingToUids );
};

exports = {
    getObjects,
    loadVMOsIfNotAlreadyLoaded,
    getObjectByUidAsync
};
export default exports;
