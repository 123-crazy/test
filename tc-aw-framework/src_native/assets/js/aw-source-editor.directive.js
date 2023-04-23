// Copyright (c) 2020 Siemens

/**
 * This directive is used to show code of different languages.
 *
 * @module js/aw-source-editor.directive
 * @param {string} content - content to show on Source editor
 * @param {string} config - config for the Source editor
 * @param {string} filePath - file path of item to show on Source editor
 * @example <aw-source-editor src="data.src" config="data.config"></aw-source-editor>
 */
import app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'js/sourceEditor.service';

/**
 * Display example .
 *
 * @example <aw-source-editor name="data.name" content=""data.editor.data" config="data.config"></aw-source-editor>
 * @example <aw-source-editor name="data.name" file-path="{{filePath}}"></aw-source-editor>
 *
 * @memberof NgDirectives
 * @member aw-source-editor
 */
app.directive( 'awSourceEditor', [
    '$http', 'sourceEditorService',
    function( $http, sourceEditorSvc ) {
        return {
            restrict: 'E',
            scope: {
                name: '@',
                content: '=?',
                config: '<?',
                filePath: '@?'
            },
            link: function( $scope, $element ) {
                var elem = $element[ 0 ];
                var name = $scope.name;

                var defaultConfig = {
                    language: 'text',
                    domReadOnly: true,
                    readOnly: false,
                    wordWrap: 'off',
                    lineNumbers: 'on',
                    automaticLayout: false,
                    minimap: {}
                };
                var fileTypeLanguageMap = {
                    js: 'javascript',
                    txt: 'text',
                    ts: 'typescript'
                };
                var config = _.defaults( $scope.config, defaultConfig );

                var initSourceEditor = function( name, elem, config, editorContent ) {
                    config.value = config.language === 'json' && _.isObject( editorContent ) ? JSON.stringify( editorContent, null, 4 ) : editorContent;
                    elem.style.height = config.height ? config.height + 'px' : 'inherit';
                    elem.style.width = config.width ? config.width + 'px' : 'inherit';
                    var sourceEditor = sourceEditorSvc.createSourceEditor( name, elem, config );
                    if( config.theme ) {
                        sourceEditorSvc.setTheme( config.theme );
                    }

                    var updateContent = _.debounce( function() {
                        var contentString = sourceEditor.getValue();
                        if( config.language === 'json' ) {
                            try {
                                JSON.parse( contentString );
                            } catch ( error ) {
                                eventBus.publish( 'sourceEditor.invalidContent', { name: name } );
                            }
                        }
                        $scope.$evalAsync( function() {
                            $scope.content = config.language === 'json' && contentString !== '' ? JSON.parse( contentString ) : contentString;
                            eventBus.publish( 'sourceEditor.contentChanged', { name: name, content: $scope.content } );
                        } );
                    }, 250 );
                    sourceEditor.onDidChangeModelContent( function() {
                        updateContent();
                    } );
                    sourceEditor.onDidBlurEditorText( function() {
                        eventBus.publish( 'sourceEditor.contentBlur', { name: name, content: sourceEditor.getValue() } );
                    } );

                    if( $scope.content !== undefined ) {
                        $scope.$watch( 'content', function( newvalue ) {
                            newvalue = config.language === 'json' && _.isObject( newvalue ) ? JSON.stringify( newvalue, null, 4 ) : newvalue;
                            if( sourceEditor.getValue() !== newvalue && newvalue !== undefined ) {
                                sourceEditor.setValue( newvalue );
                            }
                        } );
                    } else {
                        $scope.$watch( 'filePath', function( newValue, oldValue ) {
                            if( newValue !== oldValue ) {
                                $http.get( newValue, {
                                    cache: true
                                } ).then( function( source ) {
                                    var fileType = newValue.split( '.' ).pop();
                                    var language = fileTypeLanguageMap[ fileType.toLowerCase() ] !== undefined ? fileTypeLanguageMap[ fileType ] : fileType;
                                    if( language ) {
                                        config.language = language;
                                        sourceEditorSvc.setLanguage( name, language );
                                    }
                                    var value = fileType === 'json' ? JSON.stringify( source.data, null, 4 ) : source.data;
                                    sourceEditor.setValue( value );
                                } );
                            }
                            eventBus.publish( 'sourceEditor.filePathChanged', { name: name, filePath: newValue } );
                        } );
                    }
                };

                if( name ) {
                    if( $scope.content !== undefined ) {
                        // eslint-disable-next-line sonarjs/no-use-of-empty-return-value
                        $scope.$evalAsync( initSourceEditor( name, elem, config, $scope.content ) );
                    } else if( $scope.filePath !== undefined ) {
                        $http.get( $scope.filePath, {
                            cache: true
                        } ).then( function( source ) {
                            var fileType = $scope.filePath.split( '.' ).pop();
                            config.language = fileTypeLanguageMap[ fileType.toLowerCase() ] !== undefined ? fileTypeLanguageMap[ fileType ] : fileType;
                            // eslint-disable-next-line sonarjs/no-use-of-empty-return-value
                            $scope.$evalAsync( initSourceEditor( name, elem, config, source.data ) );
                        } );
                    }
                    $scope.$on( '$destroy', function() {
                        sourceEditorSvc.removeSourceEditor( name );
                    } );
                }
            }
        };
    }
] );
