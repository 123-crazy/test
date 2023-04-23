// Copyright (c) 2020 Siemens

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/fileManagementService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';

/**
 * @private
 *
 * @property {soa_kernel_soaService} Cached reference to the injected AngularJS service.
 */

var exports = {};

/**
 * This operation obtains File Management System (FMS) read tickets for a set of supplied ImanFile objects. The
 * supplied tickets are used to transfer files from a Teamcenter volume to local storage. The files input parameter
 * contains a list of the ImanFile objects to be read from the Teamcenter volume and transferred to local storage.
 * FMS requires tickets for all file transfers An FMS read ticket is required to obtain a file from a Teamcenter
 * volume. It is often times more expedient to request several tickets at one time, especially if it is known ahead
 * of time that many files will need to be moved. For this reason, the caller may supply multiple ImanFile objects,
 * for which FMS tickets are desired, in the input vector.
 *
 * @param {ObjectArray} files - array of ImanFile object
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getFileReadTickets = function( files ) {
    var imanFiles = [];

    _.forEach( files, function( file ) {
        if( file.type === 'ImanFile' ) {
            // download the first ImanFile only
            imanFiles.push( file );
            return false;
        }
    } );

    return soaSvc.post( 'Core-2006-03-FileManagement', 'getFileReadTickets', {
        files: imanFiles
    } );
};

exports = {
    getFileReadTickets
};
export default exports;
/**
 * The 'soa_fileManagementService' exposes FMS related operations to be used from native/declarative framework
 * storage'.
 *
 * @memberof NgServices
 * @member soa_fileManagementService
 */
app.factory( 'soa_fileManagementService', () => exports );
