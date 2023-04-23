// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to display a file upload
 *
 * @module js/aw-multi-file-upload.directive
 */
import * as app from 'app';
import 'js/aw-i18n.directive';
import 'js/localeService';
import 'js/aw-multi-file-upload.controller';
import 'js/on-file-change.directive';
import 'js/aw-icon.directive';
import 'js/aw-break.directive';

/**
 * Directive to display an multi-file upload. The user is presented with a file input and may add more files if needed.
 * Information about the files selected and data needed to upload the files is stored in the data.fileInputForms array.
 * Unlike the aw-file-upload, there is no fmsTicket variable that can have its value set in order to prepare the upload,
 * because there's an arbitrary number of file upload forms present.
 *
 *  removeTooltip: the tooltip for the remove file button.
 *
 * @example <aw-multi-file-upload remove-tooltip="{{i18n.removeFileBtnTooltip}}"></aw-multi-file-upload>
 *
 * @member aw-multi-file-upload
 * @memberof NgElementDirectives
 */
app.directive( 'awMultiFileUpload', [ 'localeService', function( localeService ) {
    return {
        restrict: 'E',
        scope: {
            removeTooltip: '@',
            formData: '='
        },
        controller: 'awMultiFileUploadController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-multi-file-upload.directive.html',
        replace: true,
        link: function( $scope ) {
            $scope.i18n = {};
            localeService.getLocalizedTextFromKey( 'UIElementsMessages.dropHere' ).then( result => $scope.i18n.dropHere = result );
            localeService.getLocalizedTextFromKey( 'UIElementsMessages.chooseFile' ).then( result => $scope.i18n.chooseFile = result );
        }
    };
} ] );
