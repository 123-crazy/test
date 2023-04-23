// Copyright (c) 2020 Siemens

/**
 * Module for various FMS related utilities
 *
 * @module js/fmsUtils
 *
 * @namespace fmsUtils
 */
import app from 'app';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

/**
 * The FMS proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_FMS_PROXY_CONTEXT = 'fms';

/**
 * Relative path to the FMS proxy download service.
 */
var CLIENT_FMS_DOWNLOAD_PATH = WEB_XML_FMS_PROXY_CONTEXT + '/fmsdownload/';

/**
 * Relative path to the FMS proxy download service.
 */
var CLIENT_FMS_UPLOAD_PATH = WEB_XML_FMS_PROXY_CONTEXT + '/fmsupload/';

/**
 * Build url from a file ticket.
 *
 * @param {String} fileTicket - The file ticket
 * @param {String} openFileName - open file with this name.
 *
 * @return {String} url
 */
var _buildUrlFromFileTicket = function( fileTicket, openFileName ) {
    var fileName;

    if( !_.isEmpty( openFileName ) ) {
        // Remove special characters because IIS does not allow special characters in file name
        var validOpenFileName = openFileName;
        var extensionIndex = openFileName.lastIndexOf( '.' );
        if( extensionIndex > 0 ) {
            var extension = openFileName.substring( extensionIndex + 1 );
            var fileNameWithoutExtension = openFileName.substring( 0, extensionIndex );
            validOpenFileName = fileNameWithoutExtension.replace( /[<>*%:&]/, '' ) + '.' + extension;
        } else {
            validOpenFileName = openFileName.replace( /[<>*%:&]/, '' );
        }
        fileName = encodeURIComponent( validOpenFileName );
    } else {
        fileName = exports.getFilenameFromTicket( fileTicket );
    }

    var downloadUri = CLIENT_FMS_DOWNLOAD_PATH + fileName + '?ticket=' + encodeURIComponent( fileTicket );

    return browserUtils.getBaseURL() + downloadUri;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Get the file name from FMS ticket
 *
 * @param {String} ticket - The file ticket
 * @return {String} File name
 */
export let getFilenameFromTicket = function( ticket ) {
    // Check for forward or backslash in the ticket string
    var lastfslash = ticket.lastIndexOf( '/' );
    var lastbslash = ticket.lastIndexOf( '\\' );

    var fnamestart = Math.max( lastfslash, lastbslash ) + 1;

    if( fnamestart > 0 && fnamestart < ticket.length ) {
        return ticket.substring( fnamestart );
    }

    // Check for a URL Encoded forward or backslash in the ticket string
    var lastEncodedFS = ticket.lastIndexOf( '%2f' );
    var lastEncodedBS = ticket.lastIndexOf( '%5c' );

    var encodedfnamestart = Math.max( lastEncodedFS, lastEncodedBS ) + 3;

    if( encodedfnamestart > 0 && encodedfnamestart < ticket.length ) {
        return ticket.substring( encodedfnamestart );
    }

    // Return empty string
    return '';
};

/**
 * Get the FMS Url
 *
 * @return {String} The FMS Url
 */
export let getFMSUrl = function() {
    return CLIENT_FMS_DOWNLOAD_PATH;
};

/**
 * Looks up and returns the <b>full</b> FMS upload URL.
 *
 * @return {String} The fms upload url.
 */
export let getFMSFullUploadUrl = function() {
    return browserUtils.getBaseURL() + CLIENT_FMS_UPLOAD_PATH;
};

/**
 * Get the URI to load the file from FMS given a ticket and original filename.
 *
 * @param {String} ticket - FMS ticket
 * @param {String} originalFilename - (Optional) The original file name to include on the Uri and returned in
 *            content-disposition. The filename will be generated from the ticket it not included.
 *
 * @return {String} The Uri to access the file.
 */
export let getFileUri = function( ticket, originalFilename ) {
    var filename = !_.isEmpty( originalFilename ) ? originalFilename : exports.getFilenameFromTicket( ticket );

    // Double encoding ticket here because it will be re-encoded by FmsProxyServlet.
    return app.getBaseUrlPath() + '/' + exports.getFMSUrl() + encodeURIComponent( filename ) +
        '?ticket=' + encodeURIComponent( ticket );
};

/**
 * Get the FSC URI from given file ticket
 *
 * @param {String} fileTicket - The File ticket
 *
 * @return {String} The FSC URI
 */
export let getFscUri = function( fileTicket ) {
    var fscUri = '';
    var httpLocation = fileTicket.indexOf( 'http' );
    var percentSign = fileTicket.lastIndexOf( '%' );

    if( httpLocation !== -1 && percentSign !== -1 ) {
        fscUri = fileTicket.substring( httpLocation, percentSign );

        var decodedUri = decodeURIComponent( fscUri );

        if( decodedUri ) {
            decodedUri = decodedUri.replace( ';', '/' );
            fscUri = decodedUri;
        }
    }

    return fscUri;
};

/**
 * Open a file given the file ticket
 *
 * @param {String} fileTicket - The file ticket
 * @param {String} openFileName - open file with this name.
 */
export let openFile = function( fileTicket, openFileName ) {
    if( _.isString( fileTicket ) && fileTicket.length > 0 ) {
        window.open( _buildUrlFromFileTicket( fileTicket, openFileName ), '_self', 'enabled' );
    }
};

/**
 * Open one or more files given one or more file tickets
 *
 * @param {OBJECTARRAY} fileNameAndTicketsArr - The array of structure of file name and file ticket
 */
export let openFiles = function( fileNameAndTicketsArr ) {
    _.forEach( fileNameAndTicketsArr, function( fileNameAndTicket ) {
        if( _.isString( fileNameAndTicket.fileName ) && _.isString( fileNameAndTicket.fileTicket ) && fileNameAndTicket.fileName !== '' && fileNameAndTicket.fileTicket !== '' ) {
            // window.open does NOT work in a for loop and fails after the first iteration with the below chrome error 
            // 'Resource interpreted as Document but transferred with MIME type application/octet-stream' , hence commenting 
            // and replacing the logic to behave like file downloads in polarion 
            //  window.open( _buildUrlFromFileTicket( fileNameAndTicket.fileTicket, fileNameAndTicket.fileName ), '_self', 'enabled' );
            var link = document.createElement( 'a' );
            link.target = '_blank';
            link.href = _buildUrlFromFileTicket( fileNameAndTicket.fileTicket, fileNameAndTicket.fileName );
            document.body.appendChild( link );
            link.click();
            link.remove();
        }
    } );
};

/**
 * Open the file in new window
 *
 * @param {String} fileTicket - The file ticket
 */
export let openFileInNewWindow = function( fileTicket ) {
    if( _.isString( fileTicket ) && fileTicket.length > 0 ) {
        window.open( _buildUrlFromFileTicket( fileTicket ), '_blank', 'enabled' );
    }
};

exports = {
    getFilenameFromTicket,
    getFMSUrl,
    getFMSFullUploadUrl,
    getFileUri,
    getFscUri,
    openFile,
    openFiles,
    openFileInNewWindow
};
export default exports;
