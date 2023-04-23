// Copyright (c) 2020 Siemens

/**
 * @module js/wysMockDataContributorService
 */
import app from 'app';
import wygVMEditUtilsSvc from 'js/wysiwyg-view-editorUtils.service';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';

// TODO: maybe this should be class
var exports = {};

var wysiygConfiguration;
var vmContributor;

export let contributeMockData = function( viewXml, viewModelJson ) {
    if( _.isString( viewModelJson ) ) {
        viewModelJson = JSON.parse( viewModelJson );
    }
    var mockModel = {};

    var htmlModel = wygVMEditUtilsSvc.createHTMLModel( viewXml );
    if( !_.isEmpty( htmlModel ) ) {
        var nodes = htmlModel.getNodes();
        _.forEach( nodes, function traverse( childNode ) {
            if( wysiygConfiguration.mockDataElements.includes( childNode.name ) ) {
                if( viewModelJson.mock ) {
                    mockModel = viewModelJson.mock;
                }

                _.forEach( childNode.attributes, function( attr ) {
                    if( wysiygConfiguration.mockDataProperties.includes( attr.name ) ) {
                        var attrConfig = wysiygConfiguration.attrConfigurations[ attr.name ];
                        var mappedTemplateEntry = attrConfig.refVMLookup;
                        var definition = attrConfig.definition;

                        var defLen = definition.length > 0 ? definition.length + 1 : 0;
                        var vmEntryName = attr.value.substring( defLen );

                        if( wysiygConfiguration.referenceProperties[ attr.name ] ) {
                            var propertyObj = _.get( viewModelJson, mappedTemplateEntry + '.' + vmEntryName );
                            _.forEach( wysiygConfiguration.referenceProperties[ attr.name ], function( property ) {
                                var attrConfig = wysiygConfiguration.attrConfigurations[ property.toLowerCase() ];
                                var mappedTemplateEntry = attrConfig.refVMLookup;
                                var propValue = propertyObj[ property ];
                                getMockData( mockModel, childNode, propValue, mappedTemplateEntry );
                            } );
                        } else {
                            getMockData( mockModel, childNode, vmEntryName, mappedTemplateEntry );
                        }
                    }
                } );
            }
        } );
    }

    if( viewModelJson ) {
        viewModelJson.mock = _.merge( viewModelJson.mock, mockModel );
    }

    return viewModelJson;
};

var getMockData = function( mockModel, childNode, vmEntryName, mappedTemplateEntry ) {
    var template = null;
    if( !mockModel[ mappedTemplateEntry ] ) {
        mockModel[ mappedTemplateEntry ] = {};
    }
    if( !mockModel[ mappedTemplateEntry ][ vmEntryName ] ) {
        template = _.cloneDeep( vmContributor[ childNode.name ].mock[ mappedTemplateEntry ] );
        var staticTemplateKey = Object.keys( vmContributor[ childNode.name ].mock[ mappedTemplateEntry ] )[ 0 ];
        mockModel[ mappedTemplateEntry ][ vmEntryName ] = template[ staticTemplateKey ];
    }
};

export let init = function() {
    wysiygConfiguration = appCtxService.getCtx( 'wysiwyg.configurations' );
    vmContributor = appCtxService.getCtx( 'wysiwyg.contributions' );
};

exports = {
    init,
    contributeMockData
};
export default exports;
init();
app.factory( 'wysMockDataContributorService', () => exports );
