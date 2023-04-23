// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwyg-view-editorUtils.service
 */
import app from 'app';
import _ from 'lodash';
import Debug from 'Debug';
import wysiwygXmlParserService from 'js/wysiwygXmlParserService';
import appCtxService from 'js/appCtxService';
import wysiwygLoadAndSaveService from 'js/wysiwygLoadAndSaveService';

var trace = new Debug( 'wysiwygCanvasService' );
var exports = {};
/**
 * This is a temporary arranagement, till there is a way to figure out
 * which is directive and which is html element.
 */

var prefifixWiseDirectives;
/**
 * <aw-button action="applySetting"></aw-button>
 * action attribute maps to "actions" section in htmlModel file ("refVMLookup" : "actions")
 * definition is blank, because action name is directly specified (e.g.applySetting) .
 *
 * <aw-list dataprovider="data.dataProviders.getAssignedProjectsProvider"></aw-list>
 * dataprovider attribute maps to "dataproviders" section in htmlModel file ("refVMLookup" : "dataproviders")
 * we specify dataprovider value in view file as "data.dataProviders.abcdDataProvider",so the definition is "data.dataproviders"
 *
 * This config would allow us to generically parse the view file.
 */

var attrConfigurations;
var templates;
var vmTemplate;
var vmContributor;
const SWF_WIDGET_ATTRS = [ 'dataprovider', 'gridid', 'prop', 'caption', 'source', 'name', 'chip', 'action' ];

/**
 *
 * @param {*} elementName.
 * @returns {boolean} true/false.
 * @description {*} This method validated of an element is directive.
 */

var isDirective = function isDirective( elementName ) {
    var directiveList = prefifixWiseDirectives && prefifixWiseDirectives.filter( function( prefix ) {
        return _.startsWith( elementName, prefix );
    } );
    return directiveList.length > 0;
};
/**
 *
 * @param {*} attrNode
 */

var AttrributeNode = function AttrributeNode( attrNode ) {
    var self = this;

    if( attrNode ) {
        self.name = attrNode.name;
        self.value = attrNode.value;
        self.template = {};
        self.isDirective = isDirective( self.name );
    }
};

var ViewModelTree = function ViewModelTree( viewDoc ) {
    /*eslint-disable */
    var _self = this;
    /*eslint-enable */

    _self.attributes = [];
    _self.childrens = [];
    _self.name = viewDoc.nodeName;
    _self.id = Math.floor( Math.random() * 100 + 1 ); // crude logic(wrong assumption), need to figure out some smart way
    // $injector will not also help.

    _self.isDirective = isDirective( _self.name );

    if( viewDoc.attributes ) {
        _.forEach( viewDoc.attributes, function( attr ) {
            _self.attributes.push( new AttrributeNode( attr ) );
        } );
    }

    if( viewDoc.childNodes && viewDoc.childNodes.length > 0 ) {
        _.forEach( viewDoc.childNodes, function( childNode ) {
            if( childNode.nodeValue ) {
                var nodeValue = childNode.nodeValue.trim();

                if( nodeValue.indexOf( 'i18n.' ) !== -1 ) {
                    _self.text = nodeValue;
                    _self.hasi18nText = true;
                }
            }

            if( childNode.nodeName !== '#text' ) {
                _self.childrens.push( new ViewModelTree( childNode ) );
            }
        } );
    }
};

var HTMLModel = function HTMLModel( viewDoc ) {
    var self = this;
    viewDoc.normalize();
    self.viewModelTree = new ViewModelTree( viewDoc );
    self.getNodes = function() {
        var nodes = [];
        if( this.viewModelTree && this.viewModelTree.childrens ) {
            _.forEach( this.viewModelTree.childrens, function traverse( childNode ) {
                nodes.push( childNode );
                if( childNode.childrens.length > 0 ) {
                    _.forEach( childNode.childrens, traverse );
                }
            } );
        }
        return nodes;
    };
    return self;
};

export let createHTMLModel = function( viewXML ) {
    if( viewXML ) {
        var viewDoc = wysiwygXmlParserService.parseViewXML( viewXML );

        return new HTMLModel( viewDoc );
    }

    return {};
};

/**
 *  This function expects the HTMLModel type
 */
export let createNestedViewTreeModel = function( htmlModel, currentViewName ) {
    return exports.getViewModelData().then( function( viewModel ) {
        htmlModel = htmlModel && htmlModel.viewModelTree ? htmlModel.viewModelTree : {};
        var data = [ {
            label: currentViewName,
            expanded: true,
            children: []
        } ];

        var nestedElements = appCtxService.getCtx( 'wysiwyg.canvas.configurations' ).nestedViewElements;

        if( viewModel && _.isString( viewModel ) ) {
            viewModel = JSON.parse( viewModel );
        }

        try {
            _.forEach( htmlModel.childrens, function traverseTree( htmlNode ) {
                var nodeName = htmlNode.name;

                var index = _.findIndex( nestedElements, function( nestedElem ) {
                    return nestedElem.name === nodeName;
                } );

                if( index !== -1 ) {
                    var nestedElem = nestedElements[ index ];
                    var attrNameToFind = nestedElem.attr;
                    var attributeNodes = htmlNode.attributes;
                    var attrNode = attributeNodes.filter( function( attr ) {
                        return attr.name === attrNameToFind;
                    } )[ 0 ];

                    if( nestedElem.resolve && nestedElem.resolve.attr ) {
                        var resolve = nestedElem.resolve;

                        var resolvedValue = _.get( viewModel, attrNode.value );

                        if( resolvedValue && resolvedValue.length > 0 && resolve.type === 'array' ) {
                            resolvedValue.forEach( function( currentValue ) {
                                data[ 0 ].children.push( {
                                    label: currentValue[ resolve.attr ]
                                } );
                            } );
                        }
                    } else {
                        data[ 0 ].children.push( {
                            label: attrNode.value
                        } );
                    }
                }

                if( htmlNode.childrens && htmlNode.childrens.length > 0 ) {
                    _.forEach( htmlNode.childrens, traverseTree );
                }

                return data;
            } );

            return data;
        } catch ( e ) {
            trace( 'createNestedViewTreeModel : Cannot create nested view tree' );
        }
    } );
};

/**
 *  Function to create a template
 */
export let createTemplate = function( templateKey, jsonModelEntry ) {
    var template = _.cloneDeep( templates[ templateKey ] );

    template[ jsonModelEntry ] = template[ '@name' ]; // The below logic is to replace the displayname with vm model key.
    //example:

    /**
     * data : {
     *  "@name":{
     *      "displayName": "{{i18n.@name}}",
            "type": "STRING",
            "isRequired": "true",
            "dispValue": "",
     *  }
     * }
     * replace @name with propertyname in both occurences
     *
     * "ADDRESS":{
     *      "displayName": "{{i18n.ADDRESS}}",
            "type": "STRING",
            "isRequired": "true",
            "dispValue": "",
     *  }
     *
     */

    _.forEach( template[ jsonModelEntry ], function( value, key ) {
        if( _.isString( value ) && value.indexOf( '@name' ) !== -1 ) {
            value = value.replace( '@name', jsonModelEntry );
            template[ jsonModelEntry ][ key ] = value;
        }
    } );

    delete template[ '@name' ];
    return template;
};

export let generateViewModel = function( htmlModel, viewModel ) {
    if( !viewModel || _.isEmpty( viewModel ) ) {
        viewModel = _.cloneDeep( vmTemplate );
    }
    var newJsonModel = viewModel;
    if( htmlModel.viewModelTree && htmlModel.viewModelTree.childrens ) {
        _.forEach( htmlModel.viewModelTree.childrens, function traverse( childNode ) {
            if( childNode.isDirective ) {
                // update Import Section
                exports.updateImport( newJsonModel, childNode );
            }
            // Assumption here, only aw-button uses aw-i18n.
            if( childNode.hasi18nText ) {
                var text = childNode.text;
                var vmEntryName = text.split( '.' )[ 1 ];
                var template = exports.createTemplate( 'i18n', vmEntryName );
                if( !newJsonModel.i18n ) {
                    newJsonModel.i18n = {};
                }
                exports.updateEntry( newJsonModel, 'i18n', vmEntryName, template );
                var sampleTemplate = _.cloneDeep( vmContributor[ childNode.name ] );
                _.merge( newJsonModel, sampleTemplate );
            } else if( childNode.attributes ) {
                var hasVMContributor = vmContributor[ childNode.name ];
                _.forEach( childNode.attributes, function( attr ) {
                    if( attr.isDirective ) {
                        // update Import Section
                        exports.updateImport( newJsonModel, attr );
                    }
                    if( hasVMContributor ) {
                        if( attrConfigurations[ attr.name ] ) {
                            var attrConfig = attrConfigurations[ attr.name ];
                            var mappedTemplateEntry = attrConfig.refVMLookup;
                            var definition = attrConfig.definition;
                            var defLen = definition.length > 0 ? definition.length + 1 : 0;
                            var vmEntryName = attr.value.startsWith( definition ) ? attr.value.substring( defLen ) : attr.value;
                            if( SWF_WIDGET_ATTRS.includes( attr.name ) ) {
                                //if value doesn't exist that means it has incremented properties
                                var prop = _.get( newJsonModel, mappedTemplateEntry + '.' + vmEntryName );
                                if( !prop ) {
                                    var staticTemplateKey;
                                    var viewModelTemplate = _.cloneDeep( vmContributor[ childNode.name ] );
                                    var templateEntry = viewModelTemplate[ mappedTemplateEntry ];
                                    // Match the viewTemplateKey with viewModelTemplate
                                    for( var key in templateEntry ) {
                                        if( vmEntryName.includes( key ) ) {
                                            staticTemplateKey = key;
                                        } else {
                                            //delete remaining key from the nested object
                                            delete viewModelTemplate[ mappedTemplateEntry ][ key ];
                                        }
                                    }

                                    // Update the attributes in increment props
                                    if( staticTemplateKey && vmEntryName !== staticTemplateKey ) {
                                        viewModelTemplate[ mappedTemplateEntry ][ vmEntryName ] = viewModelTemplate[ mappedTemplateEntry ][ staticTemplateKey ];
                                        delete viewModelTemplate[ mappedTemplateEntry ][ staticTemplateKey ];
                                        if( viewModelTemplate.mock ) {
                                            viewModelTemplate.mock[ mappedTemplateEntry ][ vmEntryName ] = viewModelTemplate.mock[ mappedTemplateEntry ][ staticTemplateKey ];
                                            delete viewModelTemplate.mock[ mappedTemplateEntry ][ staticTemplateKey ];
                                        }
                                    }
                                    _.merge( newJsonModel, viewModelTemplate );
                                }
                            }
                        }
                    } else if( attr.value.indexOf( 'conditions' ) !== -1 ) {
                        var regex = /(conditions.\w*)/mg;
                        var group;

                        while( ( group = regex.exec( attr.value ) ) !== null ) {
                            // This is necessary to avoid infinite loops with zero-width matches
                            if( group.index === regex.lastIndex ) {
                                regex.lastIndex++;
                            }
                            var vmConditionName = group[ 0 ].split( '.' )[ 1 ];
                            var conditionTemplate = exports.createTemplate( 'conditions', vmConditionName );
                            if( !newJsonModel.conditions ) {
                                newJsonModel.conditions = {};
                            }
                            exports.updateEntry( newJsonModel, 'conditions', vmConditionName, conditionTemplate );
                        }
                    }
                } );
            }
            if( childNode.childrens.length > 0 ) {
                _.forEach( childNode.childrens, traverse );
            }
        } );
    }
    return newJsonModel;
};

export let updateEntry = function( vmEditorJSON, sectionToUpdate, key, entry ) {
    if( vmEditorJSON[ sectionToUpdate ] ) {
        var exist = vmEditorJSON[ sectionToUpdate ][ key ];

        if( !exist ) {
            vmEditorJSON[ sectionToUpdate ][ key ] = entry[ key ];
        }
    }
};

export let updateImport = function( vmEditorJSON, childNode ) {
    var directiveName = 'js/' + childNode.name + '.directive';

    if( _.indexOf( vmEditorJSON.imports, directiveName ) === -1 ) {
        vmEditorJSON.imports.push( directiveName );
    }
};

export let getViewModelPropFormat = function() {
    return templates;
};

export let getViewModelTemplate = function() {
    return vmTemplate;
};
export let getViewData = function() {
    return wysiwygLoadAndSaveService.getViewData();
};

export let getViewModelData = function() {
    return wysiwygLoadAndSaveService.getViewModelData();
};

export let init = function() {
    var wysiygConfiguration = appCtxService.getCtx( 'wysiwyg.configurations' );

    if( wysiygConfiguration ) {
        templates = wysiygConfiguration.vmPropFormat;
        vmTemplate = wysiygConfiguration.viewModelTemplate;
        attrConfigurations = wysiygConfiguration.attrConfigurations;
        prefifixWiseDirectives = wysiygConfiguration.prefifixWiseDirectives;
        vmContributor = appCtxService.getCtx( 'wysiwyg.contributions' );
    }
};

exports = {
    init,
    createHTMLModel,
    createNestedViewTreeModel,
    createTemplate,
    generateViewModel,
    updateEntry,
    updateImport,
    getViewModelPropFormat,
    getViewModelTemplate,
    getViewData,
    getViewModelData
};
export default exports;

init();

app.factory( 'wygVMEditUtilsSvc', () => exports );
