// Copyright (c) 2020 Siemens

/**
 * Directive to display a file upload
 *
 * @module js/aw-file-upload.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import awFileNameUtils from 'js/awFileNameUtils';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/on-file-change.directive';
import 'js/aw-button.directive';
import 'js/aw-i18n.directive';
import 'js/localeService';

/**
 * Directive to display a file upload.
 *
 * fileChangeAction: the action that will be performed when file changed. typeFilter: the file type filter in
 * file selection dialog. isRequired: boolean flag indicate whether the file input field is required or not.
 * formData: the form data to be post to server URL on form submit.
 *
 * @example <aw-file-upload file-change-action="validateFile" type-filter="image/..." is-required="true">...</aw-file-upload>
 *
 * @member aw-file-upload
 * @memberof NgElementDirectives
 */
app.directive( 'awFileUpload', [
    'viewModelService',
    'appCtxService',
    function( viewModelSvc, appCtxService ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                fileChangeAction: '@',
                typeFilter: '@',
                isRequired: '=?',
                formData: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-file-upload.directive.html',
            replace: true,
            controller: [
                '$scope', 'localeService',
                function( $scope, localeSvc ) {
                    var self = this; // eslint-disable-line no-invalid-this
                    $scope.fileUploadBtnLabel = 'ChooseFile';
                    $scope.noFileChosenText = 'NoFileChosen';
                    localeSvc.getLocalizedTextFromKey( 'UIMessages.ChooseFile' ).then( result => {
                        if( result ) {
                            $scope.fileUploadBtnLabel = result;
                        }
                    } );
                    localeSvc.getLocalizedTextFromKey( 'UIMessages.NoFileChosen' ).then( result => {
                        if( result ) {
                            $scope.noFileChosenText = result;
                        }
                    } );
                    self._frameTemplate = //
                        '<iframe name=\'{formTarget}\' title=\'\' tabindex=\'-1\' style=\'position:absolute;width:0;height:0;border:0\'>#document<html><head></head><body></body></html></iframe>';

                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    $scope.updateFile = function( event ) {
                        var fileCtx = appCtxService.getCtx( 'HostedFileNameContext' );
                        if( fileCtx ) {
                            appCtxService.unRegisterCtx( 'HostedFileNameContext' );
                        }

                        declViewModel.files = event.target.files;
                        declViewModel.fileName = awFileNameUtils.getFileFromPath( event.target.value );
                        declViewModel.fileNameNoExt = awFileNameUtils
                            .getFileNameWithoutExtension( declViewModel.fileName );

                        if( $scope.typeFilter ) {
                            var validFileExtensions = $scope.typeFilter.split( ',' );
                            var fileExt = awFileNameUtils.getFileExtension( declViewModel.fileName );
                            if( fileExt !== '' ) {
                                fileExt = _.replace( fileExt, '.', '' );
                            }
                            declViewModel.validFile = false;
                            for( var ndx = 0; ndx < validFileExtensions.length; ndx++ ) {
                                var validFileExt = validFileExtensions[ ndx ].trim();
                                if( validFileExt !== null ) {
                                    validFileExt = _.replace( validFileExt, '.', '' );
                                    if( fileExt !== '' &&
                                        fileExt.toLowerCase() === validFileExt.toLowerCase() ) {
                                        declViewModel.validFile = true;
                                    }
                                }
                                declViewModel.fileExt = fileExt;
                            }
                        } else {
                            declViewModel.validFile = true;
                        }
                        if( !declViewModel.autoClicking ) {
                            $scope.$apply();
                        }
                        if( declViewModel.fileName !== '' && !declViewModel.validFile ) {
                            eventBus.publish( 'invalidFileSelected', {} );
                        }

                        if( declViewModel.fileName !== '' ) {
                            event.target.title = declViewModel.fileName;
                            retainFocusOnFileNameElement();
                        }

                        // call action when file selection changed
                        if( $scope.fileChangeAction ) {
                            viewModelSvc
                                .executeCommand( declViewModel, $scope.fileChangeAction, $scope );
                        }
                    };

                    // Attach a hidden iframe as the form target to avoid page redirection when submit form
                    $scope.formTarget = 'FormPanel_' + app.getBaseUrlPath();

                    var initFormTarget = function() {
                        var formTargetFrameHtml = self._frameTemplate.replace( '{formTarget}',
                            $scope.formTarget );

                        var dummy = document.createElement( 'div' );
                        dummy.innerHTML = formTargetFrameHtml;
                        var formTargetFrame = dummy.firstChild;
                        document.body.appendChild( formTargetFrame );
                        return formTargetFrame;
                    };

                    var formTargetFrame = initFormTarget();

                    var fileCtx = appCtxService.getCtx( 'HostedFileNameContext' );
                    var addObject = appCtxService.getCtx( 'addObject' );

                    if( fileCtx && addObject && addObject.showDataSetUploadPanel ) {
                        declViewModel.fileName = awFileNameUtils.getFileFromPath( fileCtx.filename );
                        declViewModel.fileNameNoExt = awFileNameUtils
                            .getFileNameWithoutExtension( declViewModel.fileName );
                        var FileExt = awFileNameUtils
                            .getFileExtension( declViewModel.fileName );
                        if( FileExt !== '' ) {
                            FileExt = _.replace( FileExt, '.', '' );
                        }
                        declViewModel.fileExt = FileExt;
                        if( $scope.fileChangeAction ) {
                            viewModelSvc
                                .executeCommand( declViewModel, $scope.fileChangeAction, $scope );
                        }

                        viewModelSvc.executeCommand( declViewModel, 'initiateCreation', $scope );
                    } else {
                        declViewModel.fileName = null;
                        declViewModel.fileNameNoExt = null;
                        declViewModel.fileExt = null;
                    }

                    var fileLabelElement;
                    var fileNameElement;
                    var fileNameElementAfterFileUploaded;
                    var classesForFileLabelElementFocus = [
                        'aw-file-uploadFocus',
                        'aw-file-uploadFileLabelFocus'
                    ];
                    var classesForFileNameElementFocus = [
                        'aw-file-uploadFocus',
                        'aw-file-uploadFileNameFocus'
                    ];

                    /**
                     * After the file is uploaded the focus shuould be on the file-upload
                     * Since the aw-file-upload-fileName div changes after file upload, focus has to be set on this explicitly
                     */
                    function retainFocusOnFileNameElement() {
                        fileNameElementAfterFileUploaded = new HandleFileUploadFocusBorder( 'file-upload-selected-file' );
                        fileNameElementAfterFileUploaded.addClass( classesForFileNameElementFocus );
                    }

                    /**
                     * Adds or Removes various classes on an element to bring border on focus
                     * @param {elementClass} HTML class of the elemnt to be handled
                     */
                    function HandleFileUploadFocusBorder( elementClass ) {
                        this.element = document.getElementsByClassName( elementClass )[ 0 ];
                        this.addClass = function( classesToBeAdded ) {
                            let elementClassList = this.element.classList;
                            elementClassList.add( ...classesToBeAdded );
                        };
                        this.removeClass = function( classesToBeRemoved ) {
                            let elementClassList = this.element.classList;
                            elementClassList.remove( ...classesToBeRemoved );
                        };
                    }

                    /**
                     * When the focus goes on 'input' element, the border is set on it's siblings
                     * Setting border on 'input' makes no effect, hence border is set on it's siblings
                     */
                    function addBorderOnFocus() {
                        fileLabelElement = new HandleFileUploadFocusBorder( 'aw-file-upload-fileLabel' );
                        fileNameElement = new HandleFileUploadFocusBorder( 'aw-file-upload-fileName' );
                        fileLabelElement.addClass( classesForFileLabelElementFocus );
                        fileNameElement.addClass( classesForFileNameElementFocus );
                    }

                    /**
                     * Remove border when the focus is taken off from 'input' element
                     */
                    function removeBorderAfterOutOfFocus() {
                        fileLabelElement.removeClass( classesForFileLabelElementFocus );
                        fileNameElement.removeClass( classesForFileNameElementFocus );
                        if( fileNameElementAfterFileUploaded ) {
                            fileNameElementAfterFileUploaded.removeClass( classesForFileNameElementFocus );
                        }
                    }

                    //handle focus on input element
                    $scope.handleFocus = function() {
                        addBorderOnFocus();
                    };

                    //handle blur out of input element
                    $scope.handleBlur = function() {
                        removeBorderAfterOutOfFocus();
                    };

                    $scope.$on( '$destroy', function() {
                        // Detach iframe when panel unloaded
                        if( formTargetFrame ) {
                            formTargetFrame.onload = null;
                            document.body.removeChild( formTargetFrame );
                        }
                    } );
                }
            ]
        };
    }
] );
