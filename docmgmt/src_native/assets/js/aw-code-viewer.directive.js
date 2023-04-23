// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Directive to show code viewer
 * 
 * @module js/aw-code-viewer.directive
 */
import * as app from 'app';
import 'js/aw-universal-viewer.controller';
import 'js/aw-code-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/aw-source-editor.directive';
import 'js/aw-row.directive';
import 'js/exist-when.directive';
import 'js/viewModelService';
import 'js/appCtxService';
import localeSvc from 'js/localeService';

'use strict';

/**
 * Directive to show native code viewer. Accepts viewer data through isolated scope. The structure of 
 * viewer data is defined in universal controller.
 * }
 * 
 * @example <aw-code-viewer data='viewerData'></aw-code-viewer>
 * @member aw-code-viewer
 * @memberof NgElementDirectives
 * 
 * @return {Void}
 */
app.directive( 'awCodeViewer', [ 'viewModelService', 'appCtxService',
    function( viewModelSvc, appCtxSvc ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + "/html/aw-code-viewer.directive.html",
            scope: {
                data: '='
            },

            link: function( $scope, $element, attrs, controller ) {
                $scope.whoAmI = "awCodeViewer"; 
                
                $scope.initCodeViewer = function() {
                    var declViewModel = viewModelSvc.getViewModel( $scope, false );
                    var dataset = declViewModel.datasetData;
                    var filename =  declViewModel.fileData.fileUrl;
                    var ext = filename.split( '.' ).pop();
                    var lang = ext === 'txt' ? 'plaintext' : ext === 'js' ? 'javascript' :
                               ext === 'xml' || ext === 'html' || ext === 'json' ? ext : 'plaintext';
                    var tab = lang === 'plaintext' ? 8 : 4;

                    $scope.editor = {
                        dataset: dataset,
                        content: '',
                        config: {
                            language: lang,
                            theme: 'vs',
                            automaticLayout: true,
                            formatOnType: true,
                            readOnly: true,
                            lineNumbers: true,
                            tabSize: tab
                        }
                    };

                    var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
                    if( viewerCtx ) {
                        viewerCtx.showWordWrap = true;
                        viewerCtx.wordWrapped = false;
                        var locale = localeSvc.getLocale();
                        var charset = {
                            ja_JP: 'Shift-JIS',
                            zh_CN: 'GB2312',
                            zh_TW: 'Big5',
                            ko_KR: 'EUC-KR'
                        };

                        viewerCtx.textLocale = charset[ locale ];
                        viewerCtx.textUnicode = 'UTF-8';
                        viewerCtx.textEncoding = viewerCtx.textUnicode;
                    }

                    $scope.load();
                };

                controller.initViewer( $element ).then( $scope.initCodeViewer );
            },

            controller: 'awCodeViewerController'
        };
    }
] );
