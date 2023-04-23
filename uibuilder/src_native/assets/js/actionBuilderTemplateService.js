// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/actionBuilderTemplateService
 */
import graphTemplateService from 'js/graphTemplateService';
import _ from 'lodash';
import logger from 'js/logger';
import graphStyleUtils from 'js/graphStyleUtils';
import nodeDefSvc from 'js/nodeDefinitionService';
import iconSvc from 'js/iconService';

var exports = {};

var THUMBNAIL_URL = 'thumbnail_image';
var TEMPLATE_ID_DELIMITER = '-';
var TEMPLATE_VALUE_CONN_CHAR = '\\:';
var NODE_TEMPLATE_NAME = 'taskNodeTemplate';
var MULTI_LEVEL_NODE_TEMPLATE_NAME = 'Gc1ThreeLevelNodeTemplate';
var GROUP_NODE_TEMPLATE_NAME = 'Gc1GroupTileNodeTemplate';
var MULTI_LEVEL_GROUP_NODE_TEMPLATE_NAME = 'Gc1TwoLevelGroupTileNodeTemplate';

var START_NODE_TEMPLATE_NAME = 'startNodeTemplate';
var END_NODE_TEMPLATE_NAME = 'endNodeTemplate';
var EVENT_TEMPLATE_NAME = 'eventTemplate';

var objectActivities;
nodeDefSvc.getNodeDefinition().then( function( nodeDefs ) {
    objectActivities = nodeDefs.objectActivities;
} );

/**
 * Binding class name for node
 */

export let NODE_HOVERED_CLASS = 'relation_node_hovered_style_svg';
/**
 * Binding class name for text inside the tile
 */

export let TEXT_HOVERED_CLASS = 'relation_TEXT_hovered_style_svg';
/**
 * Binding the color bar width for node
 */

var COLOR_BAR_WIDTH = 'barWidth';
/**
 * Binding Class Name for root node border style
 */

var ROOTNODE_BORDER_STYLE = 'rootnode_border_style';
/**
 * The interpolate delimiter used in node SVG template
 */

var _nodeTemplateInterpolate = {
    interpolate: /<%=([\s\S]+?)%>/g
};
/**
 * Determine whether to use multiple level node template
 *
 * @param {Object} nodeObject the model object of node
 * @return true if need use multiple level template, false otherwise
 */

export let useMultiLevelTemplate = function( nodeObject ) {
    if( nodeObject && ( nodeObject.type === 'Requirement Revision' || nodeObject.type === 'Requirement' ) ) {
        return true;
    }

    return false;
};
/**
 * Get node template by populate the base template with given binding property names
 */

export let getNodeTemplate = function( nodeTemplateCache, propertyNames, isGroup, useMultiLevelTemplate, category ) {
    //template doesn't exist, construct it and put in template cache
    var baseTemplateId = null;

    if( useMultiLevelTemplate ) {
        baseTemplateId = isGroup ? MULTI_LEVEL_GROUP_NODE_TEMPLATE_NAME : MULTI_LEVEL_NODE_TEMPLATE_NAME;
    } else {
        baseTemplateId = isGroup ? GROUP_NODE_TEMPLATE_NAME : NODE_TEMPLATE_NAME;
    }

    if( category ) {
        if( category === 'start' ) {
            baseTemplateId = START_NODE_TEMPLATE_NAME;
        } else if( category === 'end' ) {
            baseTemplateId = END_NODE_TEMPLATE_NAME;
        } else if( category === 'onEvent' ) {
            baseTemplateId = EVENT_TEMPLATE_NAME;
        }
    }

    var baseTemplate = nodeTemplateCache[ baseTemplateId ];

    if( !baseTemplate ) {
        logger.error( 'SVG template has not been registered. Template ID: ' + baseTemplateId );
        return null;
    }

    var templateId = baseTemplateId;

    if( propertyNames && propertyNames.length > 0 ) {
        templateId += TEMPLATE_ID_DELIMITER;
        templateId += propertyNames.join( TEMPLATE_ID_DELIMITER );
    }

    var template = nodeTemplateCache[ templateId ];

    if( template ) {
        return template;
    }

    var newTemplate = _.cloneDeep( baseTemplate );

    newTemplate.templateId = templateId;
    newTemplate.templateContent = getTemplateContent( templateId, baseTemplate.templateContent, propertyNames ); //cache the new template

    nodeTemplateCache[ templateId ] = newTemplate;
    return newTemplate;
};
/**
 * Get cell property names for the node object.
 *
 * @param nodeObject the node model object
 * @return the array of cell property names
 */

export let getBindPropertyNames = function( nodeObject ) {
    var properties = [];

    if( nodeObject.displayInfos ) {
        var propsArray = nodeObject.displayInfos;
        _.forEach( propsArray, function( prop ) {
            var nameValue = prop.split( TEMPLATE_VALUE_CONN_CHAR );
            properties.push( nameValue[ 0 ] );
        } );
    }

    return properties;
};

/**
 * Set the thumbnail image on input object.
 * @param {Object} nodeObject the node model object
 * @param {Array} bindProperties the array of properties to bind
 * @param {String} nodeType Node type. This will be used for start or finish node
 */
var setNodeThumbnailProperty = function( nodeObject, bindProperties, nodeType ) {
    if( objectActivities[ nodeType ] ) {
        var imageUrl = iconSvc.getTypeIconFileUrl( objectActivities[ nodeType ].icon + '24.svg' );
        bindProperties[ THUMBNAIL_URL ] = graphStyleUtils.getSVGImageTag( imageUrl );
    }
};

/**
 * Get the binding properties for the given node object
 *
 * @param {Object} nodeObject the node model object
 * @param {Array} propertyNames the names of node object property to display
 * @return {Object} the object including all the required binding properties for a node template
 */
export let getBindProperties = function( nodeObject, propertyNames ) {
    var properties = {};

    if( nodeObject.displayInfos ) {
        var propsArray = nodeObject.displayInfos;
        for( var i = 0; i < propsArray.length; ++i ) {
            var nameValue = propsArray[ i ].split( TEMPLATE_VALUE_CONN_CHAR );
            properties[ nameValue[ 0 ] ] = i > 2 ? nameValue[ 0 ] + ': ' + nameValue[ 1 ] : nameValue[ 1 ];
        }
    }

    exports.setHoverNodeProperty( properties, null );
    exports.setRootNodeProperty( properties, false ); //get thumbnail for node

    if( nodeObject ) {
        //get thumbnail for node
        setNodeThumbnailProperty( nodeObject, properties, nodeObject.type );
    }

    properties.children_full_loaded = true;
    return properties;
};
/**
 * Construct the node template from a base template with the bind properties. The first two properties will be
 * interpolate to title and sub_title. The remaining properties will bind to property list.
 *
 *
 * @param {String} templateId the template ID of the constructed template. If not given, the template ID will be the string
 *            of bind property Names joined by '-'.
 * @param {String} baseTemplateString the base template string with interpolate delimiter '<%= %>'.
 * @param {Array} propertyNames the array of bind property names
 * @return {String} the generated template string with bind property names been interpolated.
 */
var getTemplateContent = function getTemplateContent( templateId, baseTemplateString, propertyNames ) {
    var templateData = {};

    if( propertyNames instanceof Array ) {
        if( !templateId ) {
            templateId = propertyNames.join( '-' );
        }

        var len = propertyNames.length;

        if( len > 0 ) {
            templateData.title = propertyNames[ 0 ];
            templateData.title_editable = propertyNames[ 0 ] + graphTemplateService.EDITABLE_PROPERTY_SURFIX;
        }

        if( len > 1 ) {
            templateData.sub_title = propertyNames[ 1 ];
            templateData.sub_title_editable = propertyNames[ 1 ] + graphTemplateService.EDITABLE_PROPERTY_SURFIX;
        }

        if( len > 2 ) {
            templateData.property_list = propertyNames.slice( 2 );
        }
    }

    if( templateId ) {
        templateData.template_id = templateId;
    }

    return constructNodeTemplate( baseTemplateString, templateData );
};
/**
 * Construct node SVG template from a base template by interpolate the binding properties into the property binding
 * placeholder. The constant interpolate placeholder <%=PROPERTY_LIST%> is especially supported to bind a list of
 * properties.
 *
 * The binding placeholder may like: <%=title%>, <%=sub_title%>, <%=PROPERTY_LIST%>.
 *
 * @param baseTemplateString the base template string with interpolate delimiter '<%= %>'.
 * @param templateData {Object} the template data used for template interpolate. The constant array property
 *            'PROPERTY_LIST' should be defined in templateData if it's been used in node template. For example:
 *            <p>
 *            baseTemplateString='<g><text>{PropertyBinding("<%=title%>")}</text><g><%=PROPERTY_LIST%></g></g>'
 *
 * templateData = { title: 'object_name', sub_title: 'object_id', PROPERTY_LIST: ['propName1', 'propName2'] }
 * </p>
 * @return the constructed template string
 */

var constructNodeTemplate = function constructNodeTemplate( baseTemplateString, templateData ) {
    if( !baseTemplateString ) {
        return '';
    }

    var bindData = {};

    if( templateData ) {
        bindData = _.clone( templateData );
    }

    if( !bindData.property_list ) {
        bindData.property_list = [];
    }

    var nodeTemplate = _.template( baseTemplateString, _nodeTemplateInterpolate );

    return nodeTemplate( bindData );
};

export let setHoverNodeProperty = function( properties, hoveredClass ) {
    if( hoveredClass ) {
        properties[ exports.NODE_HOVERED_CLASS ] = hoveredClass;
        properties[ exports.TEXT_HOVERED_CLASS ] = hoveredClass;
    } else {
        properties[ exports.NODE_HOVERED_CLASS ] = 'aw-graph-noeditable-area';
        properties[ exports.TEXT_HOVERED_CLASS ] = '';
    }
};

export let setRootNodeProperty = function( properties, isRoot ) {
    if( isRoot ) {
        properties[ ROOTNODE_BORDER_STYLE ] = 'aw-relations-seedNodeSvg';
        properties[ COLOR_BAR_WIDTH ] = 15;
    } else {
        properties[ ROOTNODE_BORDER_STYLE ] = 'aw-relations-noneSeedNodeSvg';
        properties[ COLOR_BAR_WIDTH ] = 10;
    }
};

exports = {
    NODE_HOVERED_CLASS,
    TEXT_HOVERED_CLASS,
    useMultiLevelTemplate,
    getNodeTemplate,
    getBindPropertyNames,
    getBindProperties,
    setHoverNodeProperty,
    setRootNodeProperty
};
export default exports;
