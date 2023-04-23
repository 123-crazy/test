// Copyright (c) 2020 Siemens

/* global CKEDITOR */

/**
 * Definition for the (aw-property-rich-text-area-val) directive.
 *
 * @module js/aw-property-rich-text-area-val.directive
 */
import app from 'app';
import $ from 'jquery';
import 'js/uwUtilService';
import 'js/uwPropertyService';
import 'js/localeService';
import 'js/appCtxService';
import 'js/aw-property-error.directive';
import 'js/aw-autofocus.directive';


/**
 * Definition for the (aw-property-rich-text-area-val) directive.
 *
 * @member aw-property-rich-text-area-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyRichTextAreaVal', [
    'uwUtilService', 'uwPropertyService', 'localeService', 'appCtxService',
    function( uwUtilSvc, uwPropertySvc, localeService, appCtxSvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            $scope.changeFunction = function() {
                if( !$scope.prop.isArray ) {
                    var uiProperty = $scope.prop;
                    // this is needed for test harness
                    uiProperty.dbValues = [ uiProperty.dbValue ];
                    uwPropertySvc.updateViewModelProperty( uiProperty );
                }
            };
        }

        myController.$inject = [ '$scope' ];

        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '='
            },
            controller: myController,
            link: function( scope, element ) {
                import( 'js/awRichTextEditorService' ).then(
                    function( awCkeService ) {
                        var config;
                        var setupEditor;
                        var editor = null;
                        var inTable = false;
                        var cellRendered = false;
                        var allowRichTextImage = false;
                        if ( appCtxSvc.ctx && appCtxSvc.ctx.preferences && appCtxSvc.ctx.preferences.AW_AllowRichTextImage && appCtxSvc.ctx.preferences.AW_AllowRichTextImage[0].toUpperCase() === 'TRUE' ) {
                            allowRichTextImage = true;
                        }
                        // .dataGridCell check to be removed once GWT Table is obsolete
                        var tableElem = element.closest( '.dataGridCell' ) ||
                            element.closest( '.aw-jswidgets-tablecell' );
                        var formElem = element.closest( '.aw-base-scrollPanel' );

                        if( formElem.length === 0 || tableElem.length === 1 ) {
                            inTable = true;
                        }

                        if( formElem.length === 1 && tableElem.length === 1 ) {
                            cellRendered = true;
                        }

                        // CKEditor configuration
                        if( inTable ) {
                            config = {
                                toolbar: [
                                    'Undo', 'Redo', '|',
                                    'Bold', 'Italic', 'Underline', 'Strikethrough', 'Subscript', 'Superscript', '|',
                                    'RemoveFormat', '|',
                                    'NumberedList', 'BulletedList', 'Outdent', 'Indent', '|',
                                    'Heading', 'FontFamily', 'FontSize', '|',
                                    'FontColor', 'FontBackgroundColor'
                                ],
                                startupFocus: false
                            };
                        } else {
                            if ( allowRichTextImage ) {
                                config = {
                                    toolbar: [
                                        'Undo', 'Redo', '|',
                                        'Bold', 'Italic', 'Underline', 'Strikethrough', 'Subscript', 'Superscript', '|',
                                        'RemoveFormat', '|',
                                        '/',
                                        'NumberedList', 'BulletedList', 'Outdent', 'Indent', '|',
                                        'FontColor', 'FontBackgroundColor', '|',
                                        '/',
                                        'Heading', 'FontFamily', 'FontSize', '|', 'ImageUpload'
                                    ],
                                    startupFocus: false // N/A CKEDITOR5
                                };
                            } else {
                                config = {
                                    toolbar: [
                                        'Undo', 'Redo', '|',
                                        'Bold', 'Italic', 'Underline', 'Strikethrough', 'Subscript', 'Superscript', '|',
                                        'RemoveFormat', '|',
                                        '/',
                                        'NumberedList', 'BulletedList', 'Outdent', 'Indent', '|',
                                        'FontColor', 'FontBackgroundColor', '|',
                                        '/',
                                        'Heading', 'FontFamily', 'FontSize'
                                    ],
                                    startupFocus: false // N/A CKEDITOR5
                                };
                            }
                        }
                        config.extraPlugins = [ 'clientImage' ];
                        config.language = localeService.getLanguageCode();
                        config.title = false;   // N/A CKEDITOR5
                        config.pasteFromWordRemoveFontStyles = false;   // N/A CKEDITOR5
                        config.disableNativeSpellChecker = false;   // N/A CKEDITOR5
                        // contextmenu plugin is required by tabletools plugin and tabletools ir required by tableselection plugin
                        // So, to remove contextmenu and tabletools we need to remove tableselection plugin
                        config.removePlugins = [ 'liststyle', 'tableselection' ];
                        config.extraAllowedContent = 'img[src,width,height,alt,title]'; // N/A CKEDITOR5
                        if( 'CKEDITOR' in window ) {
                            CKEDITOR.disableAutoInline = true;  // N/A CKEDITOR5
                        }

                        /**
                         * @return {Object} Updated value
                         */
                        function updateModel() {
                            $( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] ).addClass(
                                'changed' );

                            scope.prop.dbValue = editor.getData();

                            var uiProperty = scope.prop;

                            // this is needed for test harness
                            uiProperty.dbValues = [ uiProperty.dbValue ];

                            uwPropertySvc.updateViewModelProperty( uiProperty );

                            return scope.prop.dbValue;
                        }

                        /**
                         */
                        function setCurserToEnd() {
                            if( editor.createRange ) {
                                var range = editor.createRange();
                                range.moveToElementEditEnd( range.root );
                                var editorSelection = editor.getSelection();
                                if( editorSelection ) {
                                    editorSelection.selectRanges( [ range ] );
                                }
                            }
                        }

                        /**
                         */
                        function setRequiredText() {
                            if( scope.prop.isRequired && scope.prop.dbValue === '' &&
                                element.find( '.aw-widgets-required' ).length === 0 ) {
                                var requiredIndicator = '<span class=\'aw-widgets-required usingPlaceHolder\'>' +
                                    scope.prop.propertyRequiredText + '</span>';

                                $( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] ).prepend(
                                    requiredIndicator );
                            }
                        }

                        /**
                         */
                        function removeRequiredText() {
                            if( element.find( '.aw-widgets-required' ).length === 1 ) {
                                element.find( '.aw-widgets-required' ).detach();
                            }
                        }

                        // Blur and Focus overrides necessary.
                        setupEditor = function() {
                            editor
                                .on( 'instanceReady',
                                    function() {
                                        $( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                            .removeClass( 'aw-jswidgets-popUpVisible' );

                                        $(
                                                document
                                                .getElementById( 'cke_' +
                                                    $( $( element[ 0 ] ).find(
                                                        '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )[ 0 ].id ) )
                                            .find( '.cke_toolbox' ).focus(
                                                function() {
                                                    if( !$(
                                                            $( element[ 0 ] ).find(
                                                                '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                                        .hasClass( 'aw-jswidgets-popUpVisible' ) ) {
                                                        $(
                                                                $( element[ 0 ] ).find(
                                                                    '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                                            .addClass( 'aw-jswidgets-popUpVisible' );
                                                    }
                                                } ).blur(
                                                function() {
                                                    $(
                                                            $( element[ 0 ] ).find(
                                                                '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                                        .removeClass( 'aw-jswidgets-popUpVisible' );
                                                } );

                                        editor.setData( scope.prop.dbValue );

                                        if( inTable ) {
                                            setCurserToEnd();
                                        }

                                        setRequiredText();

                                        editor.on( 'change', updateModel );

                                        scope.$on( '$destroy', function() {
                                            if( element ) {
                                                element.remove();
                                                element.empty();
                                                element = null;
                                            }
                                        } );

                                        element.bind( '$destroy', function() {
                                            if( editor ) {
                                                editor.destroy( true );
                                            }
                                        } );

                                        if( scope.prop.autofocus ) {
                                            $( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )[0].focus();
                                        }
                                    } );

                            editor.on( 'blur', function( e ) {
                                if( scope.prop.error && scope.$parent.$$childTail.hideErrorFunction ) {
                                    scope.$parent.$$childTail.hideErrorFunction( e );
                                }
                                $( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                    .toggleClass( 'aw-jswidgets-popUpVisible' );
                                setRequiredText();

                                if( inTable ) {
                                    scope.$destroy();
                                }
                            } );

                            $( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] ).blur(
                                function() {
                                    if( !$( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                        .hasClass( 'aw-jswidgets-popUpVisible' ) ) {
                                        if( inTable ) {
                                            editor.destroy();
                                        }
                                    }
                                } );

                            editor
                                .on( 'focus',
                                    function( e ) {
                                        if( !editor ) {
                                            awCkeService.createInline( $( element[ 0 ] ).find(
                                                '.aw-widgets-propertyRichTextEditValue' )[ 0 ], config ).then(
                                                    function( cke ) {
                                                        editor = cke;
                                                        setupEditor();
                                                    } );
                                        }
                                        $( $( element[ 0 ] ).find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                            .removeClass( 'aw-jswidgets-popUpVisible' );

                                        $(
                                                document
                                                .getElementById( 'cke_' +
                                                    $( $( element[ 0 ] ).find(
                                                        '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )[ 0 ].id ) )
                                            .find( '.cke_toolbox' ).click(
                                                function() {
                                                    if( !$(
                                                            $( element[ 0 ] ).find(
                                                                '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                                        .hasClass( 'aw-jswidgets-popUpVisible' ) ) {
                                                        $(
                                                                $( element[ 0 ] ).find(
                                                                    '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                                            .addClass( 'aw-jswidgets-popUpVisible' );
                                                    }
                                                } ).blur(
                                                function() {
                                                    $(
                                                            $( element[ 0 ] ).find(
                                                                '.aw-widgets-propertyRichTextEditValue' )[ 0 ] )
                                                        .removeClass( 'aw-jswidgets-popUpVisible' );
                                                } );

                                        if( !inTable ) {
                                            setCurserToEnd();
                                        }

                                        removeRequiredText();

                                        if( scope.prop.error && scope.$parent.$$childTail.showErrorFunction ) {
                                            scope.$parent.$$childTail.showErrorFunction( e );
                                        }
                                    } );
                            editor
                                .on( 'paste',
                                    function( e ) {
                                        var html = e.data.dataValue;
                                        html.replace( /<img([\w\W]+?)/g, function( img ) {
                                            if ( !allowRichTextImage ) {
                                                html = '';
                                            }
                                        } );
                                        e.data.dataValue = html;
                                    } );
                            setRequiredText();

                            /**
                             * CKEditor does not provide a 'scroll' event to listen to the scrolling movement.
                             * Hence,attaching the scroll listener to the CK Editor toolbox to listen to scroll
                             * movements
                             */
                            uwUtilSvc.handleScroll( scope, element, 'CKEditorInline', function() {
                                if( element ) {
                                    element.find( '.aw-widgets-propertyRichTextEditValue' ).blur();
                                }
                            } );
                        };

                        if( inTable ) {
                            if( cellRendered ) {
                                awCkeService.createInline( $( element[ 0 ] ).find(
                                    '.aw-widgets-propertyRichTextEditValue' )[ 0 ], config ).then(
                                        function( cke ) {
                                            editor = cke;
                                            setupEditor();
                                        } );
                            }
                        } else {
                            awCkeService.createInline( $( element[ 0 ] )
                                .find( '.aw-widgets-propertyRichTextEditValue' )[ 0 ], config ).then(
                                    function( cke ) {
                                        editor = cke;
                                        setupEditor();
                                    } );
                        }
                    } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-rich-text-area-val.directive.html'
        };
    }
] );
