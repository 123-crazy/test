// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Module for various CellList utilities
 *
 * @module js/Awp0ViewerGalleryUtils
 */
import * as app from 'app';
import viewModelObjectService from 'js/viewModelObjectService';
import appCtx from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import propPolicyService from 'soa/kernel/propertyPolicyService';
import $ from 'jquery';
import sourceEditorSvc from 'js/sourceEditor.service';

var exports = {};

/**
 * Gets the file URL from ticket
 *
 * @param {String} ticket the file ticket
 * @return {String} file URL resolved from ticket
 */
var getFileUrl = function( ticket ) {
    return 'fms/fmsdownload/?ticket=' + ticket;
};

/**
 * Builds the header properties with commands to be shown over the viewer
 *
 * @param {String} ticket the file ticket
 * @param {Object} object whose property needs to be extracted
 * @param {ObjectArray} property list
 * @param {ObjectArray} command list
 * @param {Boolean} whether to attach command
 */
var buildHeaderProperties = function( headerProperties, object, viewerHeaderProps, commands, addCommand ) {
    for( var idx in headerProperties.dbValue ) {
        var propertyName = headerProperties.dbValue[ idx ];
        var eachHeaderProp = {};
        eachHeaderProp.property = object.props[ propertyName ];

        if( propertyName === 'object_name' && eachHeaderProp.property ) {
            eachHeaderProp.property.propertyDisplayName = eachHeaderProp.property.uiValue;
        }
        if( idx === '0' && addCommand ) {
            eachHeaderProp.commands = [ commands.dbValue[ 2 ], commands.dbValue[ 3 ], commands.dbValue[ 4 ],
                commands.dbValue[ 5 ]
            ];
        }

        viewerHeaderProps.push( eachHeaderProp );
    }
};

/**
 * Get the default data set
 *
 * @param {Object} inData - declarative data
 */
export let showViewer = function( inData ) {
    var datasetVM = null;
    var fileVM = null;

    //viewmodelobjectservice logs console error in case nulltag i.e. AAAAAAAAAAAAAA uid is sent to it
    //prevent such errors by creating view model object for non-null uid's only. Null tags are represented
    //by objectID holding value ""
    if( inData && inData.viewerData && !inData.viewerData.headerProperties ) {
        if( inData.viewerData.dataset && inData.viewerData.dataset.objectID !== '' ) {
            datasetVM = viewModelObjectService.createViewModelObject( inData.viewerData.dataset.uid, '' );
        }

        if( inData.viewerData.views && inData.viewerData.views.length > 0 &&
            inData.viewerData.views[ 0 ].file.objectID !== '' ) {
            fileVM = viewModelObjectService.createViewModelObject( inData.viewerData.views[ 0 ].file.uid, '' );
        }

        if( datasetVM !== null && fileVM !== null ) {
            inData.viewerData = {
                datasetData: datasetVM,
                fileData: inData.viewerData.views[ 0 ],
                hasMoreDatasets: inData.viewerData.hasMoreDatasets
            };

            inData.viewerData.fileData.file = fileVM;
            inData.viewerData.fileData.fileUrl = getFileUrl( inData.viewerData.fileData.fmsTicket );

            var viewerHeaderProperties = [];
            if( inData.headerProperties1 ) {
                buildHeaderProperties( inData.headerProperties1, datasetVM, viewerHeaderProperties,
                    inData.commands, true );
            }
            if( inData.headerProperties2 ) {
                buildHeaderProperties( inData.headerProperties2, fileVM, viewerHeaderProperties, inData.commands,
                    false );
            }
            inData.viewerData.headerProperties = viewerHeaderProperties;
        } else {
            // LCS-168799
            // Check if fileData is already on viewerData - happen when showViewer is called twice
            if( inData.viewerData && !inData.viewerData.fileData ) {
                inData.viewerData = {
                    fileData: {
                        file: {},
                        fmsTicket: '',
                        viewer: inData.viewerData.views[ 0 ].viewer
                    },
                    hasMoreDatasets: inData.viewerData.hasMoreDatasets
                };
            }
        }
    }
};

/**
 * Toggle the word wrap in text viewer
 */
export let toggleWordWrap = function() {
    var ctx = appCtx.getCtx( 'viewerContext' );
    if( ctx && ctx.showWordWrap ) {
        ctx.wordWrapped = !ctx.wordWrapped;

        var textPage = $( '#aw-text-page' );
        var textLines = $( '#aw-text-lines' );
        if( textPage.length > 0 && textLines.length > 0 ) {
            textLines.toggleClass( 'aw-viewerjs-wordWrapped' );
            textPage.css( 'width', ctx.wordWrapped ? 'auto' : textPage.css( 'maxWidth' ) );
        } else {
            sourceEditorSvc.updateOptions( 'awCodeEditor', { wordWrap: ctx.wordWrapped } );
        }
    }
};

/**
 * Retrieve and reloads the viewer.
 *
 * @param {Object} declViewModel - view model
 * @returns {Promise} promise after loading viewer data
 */
export let refetchViewer = function( declViewModel ) {
    var selectedObject = appCtx.getCtx( 'selected' );

    var getViewerDataInput = {
        inputs: {
            dataset: '',
            direction: '',
            obj: selectedObject
        }
    };

    var propPolicy = {
        types: [ {
            name: 'Dataset',
            properties: [ {
                name: 'object_name'
            }, {
                name: 'object_type'
            }, {
                name: 'last_mod_date'
            }, {
                name: 'ref_list',
                modifiers: [ {
                    name: 'withProperties',
                    Value: 'true'
                } ]
            }, {
                name: 'checked_out'
            }, {
                name: 'checked_out_user'
            }, {
                name: 'is_modifiable'
            }, {
                name: 'fnd0IsCheckoutable'
            } ]
        }, {
            name: 'ImanFile',
            properties: [ {
                name: 'file_size'
            } ]
        } ]
    };

    var propPolicyId = propPolicyService.register( propPolicy );

    return soaService.post( 'Internal-AWS2-2017-06-DataManagement', 'getViewerData', getViewerDataInput ).then(
        function( response ) {
            if( response.output ) {
                declViewModel.viewerData = response.output;

                declViewModel.headerProperties1 = {
                    isArray: 'true',
                    dbValue: [ 'object_name', 'object_type', 'last_mod_date' ]
                };

                declViewModel.headerProperties2 = {
                    isArray: 'true',
                    dbValue: [ 'file_size' ]
                };

                declViewModel.commands = {
                    isArray: 'true',
                    dbValue: [ {
                            action: 'onPreviousChevronClick',
                            iconName: 'miscChevronLeft',
                            tooltip: '{{i18n.previousButtonTitle}}'
                        },
                        {
                            action: 'onNextChevronClick',
                            iconName: 'miscChevronRight',
                            tooltip: '{{i18n.nextButtonTitle}}'
                        }
                    ]
                };

                exports.showViewer( declViewModel );
            }
            propPolicyService.unregister( propPolicyId );
        }
    );
};

export default exports = {
    showViewer,
    toggleWordWrap,
    refetchViewer
};

/**
 * This service provides view model object
 *
 * @memberof NgServices
 * @member viewModelObject
 */
app.factory( 'Awp0ViewerGalleryUtils', () => exports );
