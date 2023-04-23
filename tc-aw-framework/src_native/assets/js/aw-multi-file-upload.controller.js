// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 fileInputForms
 */

/**
 * Defines controller for <aw-multi-file-upload> directive
 *
 * @module js/aw-multi-file-upload.controller
 */
import * as app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'js/dragAndDropService';
import 'js/viewModelService';
import 'js/on-file-change.directive';

/**
 * Defines awMultiFileUploadController controller
 *
 * @member awMultiFileUploadController
 * @memberof NgControllers
 */
app
    .controller(
        'awMultiFileUploadController',
        [
            '$scope', 'viewModelService', 'dragAndDropService',
            function( $scope, viewModelSvc, dragAndDropSvc ) {
                var self = this;

                self._frameTemplate = //
                    '<iframe name=\'{formTarget}\' title=\'\' tabindex=\'-1\' style=\'position:absolute;width:0;height:0;border:0\'>#document<html><head></head><body></body></html></iframe>';

                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                var baseFileInputFormId = 'fileInputForm';
                var baseButtonId = 'addRemoveButton';

                var filedrag = $( '#filedrag' )[ 0 ];

                // Add drag and drop style
                function FileDragOver( e ) {
                    if( dragAndDropSvc.dataTransferContainsFiles( e ) ) {
                        if( e.dataTransfer ) {
                            e.dataTransfer.dropEffect = 'copy';
                            e.preventDefault();
                            e.stopPropagation();
                        }

                        if( !filedrag.classList.contains( 'aw-widgets-dropframe' ) ) {
                            filedrag.classList.add( 'aw-theme-dropframe' );
                            filedrag.classList.add( 'aw-widgets-dropframe' );
                        }
                    } else {
                        e.dataTransfer.dropEffect = 'none';
                        e.stopPropagation();
                    }
                }

                function FileDragEnter( e ) {
                    if( e.dataTransfer ) {
                        e.dataTransfer.dropEffect = 'copy';
                        e.preventDefault();
                    }

                    if( !filedrag.classList.contains( 'aw-widgets-dropframe' ) ) {
                        filedrag.classList.add( 'aw-theme-dropframe' );
                        filedrag.classList.add( 'aw-widgets-dropframe' );
                    }
                }

                // remove drag and drop style
                function FileDragClear( e ) {
                    if( e.dataTransfer ) {
                        e.dataTransfer.dropEffect = 'none';
                        e.preventDefault();
                    }

                    if( filedrag.classList.contains( 'aw-widgets-dropframe' ) ) {
                        filedrag.classList.remove( 'aw-theme-dropframe' );
                        filedrag.classList.remove( 'aw-widgets-dropframe' );
                    }
                }

                $scope.setDataToBeRelated = function() {
                    var dataToBeRelated = [];

                    if( declViewModel.pasteInputForms ) {
                        for( let i = 0; i < declViewModel.pasteInputForms.length; ++i ) {
                            if( declViewModel.pasteInputForms[ i ].selectedFile ) {
                                dataToBeRelated.push( declViewModel.pasteInputForms[ i ].selectedFile );
                            }
                        }
                    }

                    if( declViewModel.fileInputForms ) {
                        for( let i = 0; i < declViewModel.fileInputForms.length; ++i ) {
                            if( declViewModel.fileInputForms[ i ].selectedFile ) {
                                dataToBeRelated.push( declViewModel.fileInputForms[ i ].selectedFile );
                            }
                        }
                    }

                    declViewModel.dataToBeRelated = {
                        attachFiles: dataToBeRelated
                    };
                };

                $scope.updateFile = function( files, index ) {
                    if( !files || files.length === 0 || !declViewModel || !declViewModel.fileInputForms ) {
                        return;
                    }

                    var iIndex = parseInt( index );
                    for( let x = 0; x < files.length; ++x ) {
                        if( declViewModel.fileInputForms.length <= iIndex + x ) {
                            var inputForm = $scope.createFileInputForm();
                            declViewModel.fileInputForms.push( inputForm );
                        }
                        declViewModel.fileInputForms[ iIndex + x ].selectedFile = files[ x ].name;
                        declViewModel.fileInputForms[ iIndex + x ].file = files[ x ];
                    }

                    $scope.setDataToBeRelated();
                    $scope.addFileInputForm();
                };

                $scope.addFileInputForm = function() {
                    if( declViewModel.fileInputForms[ declViewModel.fileInputForms.length - 1 ].selectedFile !== null ) {
                        var inputForm = $scope.createFileInputForm();
                        declViewModel.fileInputForms.push( inputForm );
                        if( declViewModel.fileInputForms.length > 1 ) {
                            $scope.$apply();

                            $scope.setDropElementSize( declViewModel.fileInputForms.length - 1 );
                        }
                    }
                };

                $scope.removeFileInputForm = function( index ) {
                    if( !declViewModel || !declViewModel.fileInputForms || index < 0 || index >= declViewModel.fileInputForms.length ) {
                        return;
                    }
                    _.pullAt( declViewModel.fileInputForms, index );

                    $scope.setDataToBeRelated();

                    // don't let there be no file inputs
                    if( declViewModel.fileInputForms.length === 0 ) {
                        var inputForm = $scope.createFileInputForm();
                        declViewModel.fileInputForms.push( inputForm );
                    }
                };

                $scope.removePasteFileInput = function( index ) {
                    if( !declViewModel || !declViewModel.pasteInputForms || index < 0 || index >= declViewModel.pasteInputForms.length ) {
                        return;
                    }
                    _.pullAt( declViewModel.pasteInputForms, index );

                    $scope.setDataToBeRelated();
                };

                $scope.createFileInputForm = function() {
                    var idNum = declViewModel.fileInputForms.length;
                    return {
                        id: baseFileInputFormId + idNum.toString(),
                        buttonId: baseButtonId + idNum.toString(),
                        removeTooltip: $scope.removeTooltip,
                        selectedFile: null,
                        fmsTicket: null,
                        updateFile: function( event ) { $scope.updateFile( event.target.files, event.target.form.getAttribute( 'index' ) ); },
                        addForm: function() { $scope.addFileInputForm(); },
                        removeForm: function( index ) { $scope.removeFileInputForm( index ); },
                        removeFile: function( index ) { $scope.removePasteFileInput( index ); }
                    };
                };

                $scope.updateStyle = function( style, height, width, zIndex ) {
                    if( style === null ) { style = ''; }
                    var n = style.search( /(height: )\d+(px)/ );
                    if( n !== -1 ) {
                        style = style.replace( /(height: )\d+(px)/, 'height: ' + height.toString() + 'px' );
                    } else {
                        style += 'height: ' + height.toString() + 'px; ';
                    }

                    n = style.search( /(width: )\d+(px)/ );
                    if( n !== -1 ) {
                        style = style.replace( /(width: )\d+(px)/, 'max-width: ' + width.toString() + 'px' );
                    } else {
                        style += 'width: ' + width.toString() + 'px; ';
                    }

                    n = style.search( /(z-index: )\d/ );
                    if( n !== -1 ) {
                        style = style.replace( /(z-index: )\d/, 'z-index: ' + zIndex.toString() );
                    } else {
                        style += 'z-index: ' + zIndex.toString();
                    }

                    return style;
                };

                $scope.setDropElementSize = function( idNum ) {
                    // get element and set its size
                    for( let x = 0; x < idNum; ++x ) {
                        let inputId = '#fmsFile' + x.toString();
                        let fileChooser = $( inputId )[ 0 ];
                        if( fileChooser ) {
                            let height = 0;
                            let width = 0;

                            let style = fileChooser.getAttribute( 'style' );
                            style = $scope.updateStyle( style, height, width, -1 );
                            fileChooser.setAttribute( 'style', style );

                            fileChooser.parentElement.getAttribute( 'style' );
                            style = $scope.updateStyle( style, height, width, -1 );
                            fileChooser.parentElement.setAttribute( 'style', style );
                        }
                    }

                    let inputId = '#fmsFile' + idNum.toString();
                    let fileChooser = $( inputId )[ 0 ];
                    if( fileChooser ) {
                        let height = 50;
                        let width = 250;

                        let dropbox = $( '#filedrag' )[ 0 ];
                        if( dropbox ) {
                            height = dropbox.clientHeight;
                            width = dropbox.clientWidth;
                        }

                        fileChooser.addEventListener( 'dragenter', FileDragEnter, false );
                        fileChooser.addEventListener( 'dragover', FileDragOver, false );
                        fileChooser.addEventListener( 'dragleave', FileDragClear, false );
                        fileChooser.addEventListener( 'drop', FileDragClear, false );

                        let style = fileChooser.getAttribute( 'style' );
                        style = $scope.updateStyle( style, height, width, 1 );
                        fileChooser.setAttribute( 'style', style );

                        fileChooser.parentElement.getAttribute( 'style' );
                        style = $scope.updateStyle( style, height, width, 0 );
                        fileChooser.parentElement.setAttribute( 'style', style );
                    }
                };

                // Initialize fileInputForms array
                declViewModel.fileInputForms = [];
                declViewModel.pasteInputForms = [];
                declViewModel.pasteInputFiles = [];

                // Add drag and dropped files
                if( $scope.ctx && $scope.ctx.createDocument && $scope.ctx.createDocument.pasteFilesInput ) {
                    for( let i = 0; i < $scope.ctx.createDocument.pasteFilesInput.length; ++i ) {
                        let fileInput = $scope.ctx.createDocument.pasteFilesInput[ i ];
                        for( let z = 0; z < fileInput.sourceObjects.length; ++z ) {
                            let inputForm = $scope.createFileInputForm();

                            inputForm.selectedFile = fileInput.sourceObjects[ z ].name;
                            declViewModel.pasteInputForms.push( inputForm );
                            declViewModel.pasteInputFiles.push( fileInput.sourceObjects[ z ] );
                        }
                    }

                    // clear ctx var
                    $scope.ctx.createDocument.pasteFilesInput = [];
                }

                if( declViewModel.pasteInputFiles.length > 0 ) {
                    $scope.setDataToBeRelated();
                }

                // Add empty form
                let inputForm = $scope.createFileInputForm();
                declViewModel.fileInputForms.push( inputForm );

                var initFormTarget = function() {
                    var formTargetFrameHtml = self._frameTemplate.replace( '{formTarget}',
                        $scope.formTarget );

                    var dummy = document.createElement( 'div' );
                    dummy.innerHTML = formTargetFrameHtml;
                    var formTargetFrame = dummy.firstChild;
                    document.body.appendChild( formTargetFrame );

                    return formTargetFrame;
                };

                /**
                 * Listen for DnD highlight/unhighlight event from dragAndDropService
                 *
                 */
                var multiFileDragDropLsnr = eventBus.subscribe( 'dragDropEvent.highlight', function( eventData ) {
                    if( !_.isUndefined( eventData ) && !_.isUndefined( eventData.targetElement ) && eventData.targetElement.classList ) {
                        var isHighlightFlag = eventData.isHighlightFlag;
                        var target = eventData.targetElement;

                        if( target.classList.contains( 'aw-widgets-chooseordropfile' ) ) {
                            if( isHighlightFlag ) {
                                target.classList.add( 'aw-widgets-dropframe' ); // on entering a valid cell item within a cellList, apply stlye as in LCS-148724
                                target.classList.add( 'aw-theme-dropframe' );
                            } else {
                                target.classList.remove( 'aw-theme-dropframe' );
                                target.classList.remove( 'aw-widgets-dropframe' );
                            }
                        }
                    }
                } );

                // Attach a hidden iframe as the form target to avoid page redirection when submit form
                $scope.formTarget = 'FormPanel_' + app.getBaseUrlPath();

                var formTargetFrame = initFormTarget();

                $scope.$on( '$destroy', function() {
                    // Detach iframe when panel unloaded
                    if( formTargetFrame ) {
                        formTargetFrame.onload = null;
                        document.body.removeChild( formTargetFrame );
                    }
                    if( multiFileDragDropLsnr ) {
                        eventBus.unsubscribe( multiFileDragDropLsnr );
                    }
                } );

                // defer some setup until panel is complete
                _.defer( function() {
                    // Add handler for drag & drop to add the outline style
                    if( filedrag ) {
                        filedrag.addEventListener( 'dragenter', FileDragEnter, false );
                        filedrag.addEventListener( 'dragover', FileDragOver, false );
                    }

                    // Add handler for drag & drop to clear the outline style
                    var inputId = '#fmsFile0';
                    var fileChooser = $( inputId )[ 0 ];
                    if( fileChooser ) {
                        fileChooser.addEventListener( 'dragenter', FileDragEnter, false );
                        fileChooser.addEventListener( 'dragover', FileDragOver, false );
                        fileChooser.addEventListener( 'dragleave', FileDragClear, false );
                        fileChooser.addEventListener( 'dragend', FileDragClear, false );
                        fileChooser.addEventListener( 'drop', FileDragClear, false );
                    }
                } );
            }
        ] );
