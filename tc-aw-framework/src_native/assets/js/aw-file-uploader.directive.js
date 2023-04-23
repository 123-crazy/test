// Copyright (c) 2020 Siemens

/**
 * Directive to display multi file upload
 *
 * @module js/aw-file-uploader.directive
 */
import * as app from 'app';
import 'js/aw-i18n.directive';
import 'js/localeService';
import 'js/aw-click.directive';
import 'js/aw-file-uploader.controller';
import 'js/on-file-change.directive';
import 'js/aw-icon.directive';
import 'js/aw-break.directive';

/**
 * Directive to display multi file upload. The user is presented with a file input and may add more files if needed.
 *  removeTooltip: the tooltip for the remove file button.
 * @example <aw-file-upload ></aw-file-uploader>
 *
 * @member aw-file-uploader
 * @memberof NgElementDirectives
 */
app.directive( 'awFileUploader', [ 'localeService', function( localeService ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            formData: '=',
            typeFilter: '@'
        },
        controller: 'awFileUploaderController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-file-uploader.directive.html',
        link: function( $scope ) {
            $scope.i18n = {};
            localeService.getLocalizedTextFromKey( 'UIElementsMessages.dropHere' ).then( result => $scope.i18n.dropHere = result );
            localeService.getLocalizedTextFromKey( 'UIElementsMessages.chooseFile' ).then( result => $scope.i18n.chooseFile = result );
        }
    };
} ] );
