// Copyright (c) 2020 Siemens

/**
 * Defines controller for <aw-file-uploader> directive
 *
 * @module js/aw-file-uploader.controller
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import { dataTransferContainsFiles } from 'js/dragAndDropService';
import 'js/viewModelService';
import 'js/on-file-change.directive';

/**
 * Defines awFileUploaderController controller
 *
 * @member awFileUploaderController
 * @memberof NgControllers
 */
app.controller( 'awFileUploaderController', [
    '$scope', '$element', 'viewModelService',
    function awFileUploaderController( $scope, $element, viewModelSvc ) {
        const dragContainer = $element.find( '.aw-upload-drop-container' )[ 0 ];
        const fileInput = $element.find( '.aw-upload > input' )[ 0 ];
        const dragInThemeClass = 'aw-theme-dropframe';
        const dragInWidgetClass = 'aw-widgets-dropframe';
        var declViewModel = viewModelSvc.getViewModel( $scope, true );
        let typesSet = null;
        if( $scope.typeFilter && '*' !== $scope.typeFilter && '.' !== $scope.typeFilter ) {
            typesSet = new Set( $scope.typeFilter.split( ',' ).map( item => {
                const validFileExt = item.trim();
                return _.replace( validFileExt, '.', '' );
            } ) );
        }

        //form data, where reserved the attachedFiles
        declViewModel.attachedFiles = new FormData();
        declViewModel.uploadListItems = null;

        // update the upload list item infos
        const updateLoadedListItems = () => {
            declViewModel.uploadListItems = Array.from( declViewModel.attachedFiles.keys() );
        };

        /**
         *
         * @param { File[] } files - files
         */
        const updateAttachedFiles = ( files ) => {
            const typeFilterFiles = filterTypes( files );
            typeFilterFiles.forEach( ( file ) => {
                declViewModel.attachedFiles.set( file.name, file );
            } );
            updateLoadedListItems();
            $scope.$applyAsync();
        };

        // remove the selected item by index
        $scope.removeItem = function( index ) {
            const removeItem = declViewModel.uploadListItems[ index ];
            declViewModel.attachedFiles.delete( removeItem );
            updateLoadedListItems();
        };

        // fire the input to select
        $scope.clickFireInput = function() {
            fileInput.click();
        };

        const allFileMatchTypes = ( items ) => {
            if( !typesSet ) { return true; }
            let allMatched = true;
            const fileItemsArray = Array.from( items );
            fileItemsArray.forEach( fileItem => {
                const fileType = fileItem.type.split( '/' )[ 1 ];
                if( !typesSet.has( fileType ) ) {
                    allMatched = false;
                }
            } );
            return allMatched;
        };
        /**
         * @param { File[] } files - files
         * @return {File[] } resultFiles
         */
        const filterTypes = function( files ) {
            let allMatchedType = true;

            if( !typesSet ) {
                return files;
            }
            const resultFiles = files.filter( file => {
                const fileTypes = file.name.split( '.' );
                // in case of 1.x.dat
                const fileType = fileTypes[ fileTypes.length - 1 ];
                if( typesSet.has( fileType ) ) {
                    return true;
                }
                allMatchedType = false;
                return false;
            } );
            if( !allMatchedType ) {
                eventBus.publish( 'invalidFileSelected', {} );
            }
            return resultFiles;
        };

        /**
         * @param {ChangeEvent<HtmlInputElement>} e : the input change event
         */
        $scope.updateFile = function( e ) {
            const files = e.target.files;
            if( !files ) {
                return;
            }
            const filesArray = Array.from( files );
            updateAttachedFiles( filesArray );
        };

        const initFormTarget = () => {
            // Attach a hidden iframe as the form target to avoid page redirection when submit form
            const formTarget = 'FormPanel_' + app.getBaseUrlPath();
            const formTargetFrameHtml = `
                    <iframe name=${formTarget} tabindex = -1 style='position:absolute;width:0;height:0;border:0'>
                        #document<html>
                            <head>
                            </head>
                            <body>
                            </body>
                        </html>
                    </iframe>`;

            const dummy = document.createElement( 'div' );
            dummy.innerHTML = formTargetFrameHtml;
            const formTargetFrame = dummy.firstChild;
            document.body.appendChild( formTargetFrame );

            return formTargetFrame;
        };
        const formTargetFrame = initFormTarget(); // may not need the form in this directive

        // drop and drag

        // Add drag and drop style
        /**
         * @param {DragEvent<HtmlElement>} e : the drag event
         */
        function FileDragOver( e ) {
            if( dataTransferContainsFiles( e ) && allFileMatchTypes( e.dataTransfer.items ) ) {
                e.dataTransfer.dropEffect = 'copy';
                e.preventDefault();
                e.stopPropagation();
                if( !dragContainer.classList.contains( dragInThemeClass ) ) {
                    dragContainer.classList.add( dragInThemeClass );
                    dragContainer.classList.add( dragInWidgetClass );
                }
            } else {
                e.dataTransfer.dropEffect = 'none';
                e.preventDefault();
                e.stopPropagation();
            }
        }

        /**
         * @param {DragEvent<HtmlElement>} e : the drag event
         */
        function FileDragEnter( e ) {
            if( e.dataTransfer && allFileMatchTypes( e.dataTransfer.items ) ) {
                e.dataTransfer.dropEffect = 'copy';
                e.preventDefault();
                if( !dragContainer.classList.contains( dragInWidgetClass ) ) {
                    dragContainer.classList.add( dragInThemeClass );
                    dragContainer.classList.add( dragInWidgetClass );
                }
            } else {
                e.dataTransfer.dropEffect = 'none';
                e.preventDefault();
                e.stopPropagation();
            }
        }

        /**
         * @param {DragEvent<HtmlElement>} e : the drag event
         */
        function FileDragDrop( e ) {
            if( e.dataTransfer ) {
                e.dataTransfer.dropEffect = 'none';
                e.preventDefault();
            }
            if( dragContainer.classList.contains( dragInWidgetClass ) ) {
                dragContainer.classList.remove( dragInThemeClass );
                dragContainer.classList.remove( dragInWidgetClass );
            }
            const filesArray = Array.from( e.dataTransfer.files );
            updateAttachedFiles( filesArray );
        }

        // clear the drag style after drop or drop leave
        /**
         * @param {DragEvent<HtmlElement>} e : the drag event
         */
        function FileDragClear( e ) {
            if( e.dataTransfer ) {
                e.dataTransfer.dropEffect = 'none';
                e.preventDefault();
            }

            if( dragContainer.classList.contains( dragInWidgetClass ) ) {
                dragContainer.classList.remove( dragInThemeClass );
                dragContainer.classList.remove( dragInWidgetClass );
            }
        }

        // defer some setup until panel is complete
        _.defer( function() {
            // Add handler for drag & drop to add the outline style
            if( dragContainer ) {
                dragContainer.addEventListener( 'dragenter', FileDragEnter, false );
                dragContainer.addEventListener( 'dragover', FileDragOver, false );
                dragContainer.addEventListener( 'dragleave', FileDragClear, false );
                dragContainer.addEventListener( 'dragend', FileDragDrop, false );
                dragContainer.addEventListener( 'drop', FileDragDrop, false );
            }

            // Add handler for drag & drop to clear the outline style
            const inputId = '#dragContainer';
            var fileChooser = $( inputId )[ 0 ];
            if( fileChooser ) {
                fileChooser.addEventListener( 'dragenter', FileDragEnter, false );
                fileChooser.addEventListener( 'dragover', FileDragOver, false );
                fileChooser.addEventListener( 'dragleave', FileDragClear, false );
                fileChooser.addEventListener( 'dragend', FileDragClear, false );
                fileChooser.addEventListener( 'drop', FileDragClear, false );
            }
        } );

        $scope.$on( '$destroy', function() {
            // Detach iframe when panel unloaded
            if( formTargetFrame ) {
                formTargetFrame.onload = null;
                document.body.removeChild( formTargetFrame );
            }
        } );
    }
] );
