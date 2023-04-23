//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/downloadRequirementsService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import reqACEUtils from 'js/requirementsACEUtils';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';

var exports = {};

var PAGE_SIZE = 3;

/**
 * Download Requirement contents.
 *
 * @param {IModelObject} selectedObject - The selected object.
 */
export let downloadRequirementContent = function( selectedObject ) {

    var prodCtxt = occMgmtStateHandler.getProductContextInfo();
    if( prodCtxt ) {
        var baseURL = browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
        var mathJaxScript = "<script type=\"text/javascript\" src=\"" + browserUtils.getBaseURL() +
            app.getBaseUrlPath() + "/lib/mathJax/MathJax.js?config=TeX-AMS-MML_HTMLorMML\"" + "></script>";

        var requestPref = {
            'base_url': baseURL,
            'mathJaxScript': mathJaxScript
        };

        var occConfigInfo = reqACEUtils.prepareOccConfigInfo( prodCtxt, false );
        var inContext = reqACEUtils.prepareInputContext( occConfigInfo, PAGE_SIZE, null, prodCtxt, requestPref );

        var goForward = true;
        var nxtChildOccData = reqACEUtils.getCursorInfoForFirstFetch( prodCtxt, PAGE_SIZE, goForward );

        // firstLevelOnly = false implies fetch whole document
        var firstLevelOnly = false;
        var isEditMode = false;
        var soaInput = reqACEUtils.prepateSpecificationSegmentInput( selectedObject, inContext, firstLevelOnly,
            false, nxtChildOccData, isEditMode );

        soaSvc.postUnchecked( 'Internal-AwReqMgmtSe-2019-06-SpecNavigation', 'getSpecificationSegment',
            soaInput ).then( function( response ) {
            if( response.output.fileTicket ) {
                var fileTicket = response.output.fileTicket;

                var fileName = fmsUtils.getFilenameFromTicket( fileTicket );
                var downloadUri = fmsUtils.getFMSUrl() + fileName + "?ticket=" + fileTicket;
                var baseUrl = browserUtils.getBaseURL();
                var urlFullPath = baseUrl + downloadUri;

                window.open( urlFullPath, "", "" );
            }
        } );
    }

};

/**
 * Service for Download Requirement contents.
 *
 * @member downloadRequirementsService
 */

export default exports = {
    downloadRequirementContent
};
app.factory( 'downloadRequirementsService', () => exports );
