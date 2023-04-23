// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/NetworkGraphTemplateService
 */
import app from 'app';
import iconService from 'js/iconService';
import graphTemplateService from 'js/graphTemplateService';
import _ from 'lodash';
import logger from 'js/logger';
import graphStyleUtils from 'js/graphStyleUtils';
import awIconSvc from 'js/awIconService';

var exports = {};

var PROPERTY_NAME = 'awp0CellProperties';
var THUMBNAIL_URL = 'thumbnail_image';
var TEMPLATE_ID_DELIMITER = '-';
var TEMPLATE_VALUE_CONN_CHAR = '\\:';

var NODE_TEMPLATE_NAME = 'NetworkNodeTemplate';

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
 * Binding Class Name for out degree number
 */
var NETWORK_IN_DEGREE = 'in_degree'; //$NON-NLS-1$

/**
 * Binding Class Name for out degree number
 */
var NETWORK_OUT_DEGREE = 'out_degree'; //$NON-NLS-1$

/**
 * Binding class name for in degree button
 */
var NETWORK_IN_DEGREE_BUTTON_BG_CLASS = 'network_in_degree_button_style_svg'; //$NON-NLS-1$

/**
 * Binding class name for out degree button
 */
var NETWORK_OUT_DEGREE_BUTTON_BG_CLASS = 'network_out_degree_button_style_svg'; //$NON-NLS-1$

/**
 * Binding Class Name for out degree number
 */
var NETWORK_OUT_DEGREE_NUMBER_CLASS = 'network_out_degree_number_style_svg'; //$NON-NLS-1$

/**
 * Binding Class Name for out degree number rectangle to check the button click
 */
var NETWORK_OUT_DEGREE_RECT_CLASS = 'network_out_degree_target_style_svg'; //$NON-NLS-1$

/**
 * Binding Class Name for in degree rectangle to check the button click
 */
var NETWORK_IN_DEGREE_RECT_CLASS = 'network_in_degree_target_style_svg'; //$NON-NLS-1$

/**
 * Binding Class Name for in degree number
 */
var NETWORK_IN_DEGREE_NUMBER_CLASS = 'network_in_degree_number_style_svg'; //$NON-NLS-1$

/**
 * Node Expand Up Target Svg CSS class
 */
var NODE_EXPAND_UP_TARGET_SVG = 'aw-relations-nodeExpandUpTargetSvg aw-graph-tileCommand'; //$NON-NLS-1$

/**
 * Node Expand Down Target Svg CSS class
 */
var NODE_EXPAND_DOWN_TARGET_SVG = 'aw-relations-nodeExpandDownTargetSvg aw-graph-tileCommand'; //$NON-NLS-1$

/**
 * Binding Field Name for image expand down
 */
var NETWORK_EXPAND_DOWN_IMG = 'network_image_expand_down'; //$NON-NLS-1$

/**
 * Binding Field Name for image expand up
 */
var NETWORK_EXPAND_UP_IMG = 'network_image_expand_up'; //$NON-NLS-1$

/**
 * Binding Field Name for expand all incoming menu
 */
var NETWORK_EXPAND_ALL_INCOMING_MENU = 'expand_all_incoming_menu'; //$NON-NLS-1$

/**
 * Binding Field Name for expand all outgoing menu
 */
var NETWORK_EXPAND_ALL_OUTGOING_MENU = 'expand_all_outgoing_menu'; //$NON-NLS-1$

/**
 * Binding in degree tooltip
 */
var NETWORK_INCOMING_TOOLTIP = 'network_incoming_tooltip'; //$NON-NLS-1$

/**
 * Binding in degree tooltip
 */
var NETWORK_OUTGOING_TOOLTIP = 'network_outgoing_tooltip'; //$NON-NLS-1$

/**
 * The interpolate delimiter used in node SVG template
 */
var _nodeTemplateInterpolate = {
    interpolate: /<%=([\s\S]+?)%>/g
};

/**
 * The template for property interpolate placeholder <%=PROPERTY_LIST%>.
 */
var _propertyTextTemplate = _
    .template(
        '<text y="<%=y%>" id="<%=id%>" class=\'{ BooleanPropertyBinding("<%=propertyName%>_editable", "GC_NODE_MODIFIABLE_PROPERTY_CLASS", "GC_NODE_PROPERTY_CLASS") }\' ' +
        'data-property-name="<%=propertyName%>" data-width="100%-80">{PropertyBinding("<%=propertyName%>")}</text>',
        _nodeTemplateInterpolate );

/**
 * Construct node SVG template from a base template by interpolate the binding properties into the property
 * binding placeholder. The constant interpolate placeholder <%=PROPERTY_LIST%> is especially supported to bind
 * a list of properties.
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
var constructNodeTemplate = function( baseTemplateString, templateData ) {
    if( !baseTemplateString ) {
        return '';
    }

    var bindData = {};
    if( templateData ) {
        bindData = _.clone( templateData );
        bindData.PROPERTY_LIST = '';
        bindData.topAlignOfCommand = 'subTitle';

        var propertyList = templateData.PROPERTY_LIST || templateData.property_list;
        if( propertyList && propertyList instanceof Array ) {
            for( var i = 0; i < propertyList.length; ++i ) {
                var propertyListData = {
                    y: ( i + 1 ) * 15,
                    id: 'DProp' + i,
                    propertyName: propertyList[ i ]
                };

                bindData.PROPERTY_LIST += _propertyTextTemplate( propertyListData, _nodeTemplateInterpolate );
                if( i !== propertyList.length - 1 ) {
                    bindData.PROPERTY_LIST += '\n';
                } else {
                    bindData.topAlignOfCommand = propertyListData.id;
                }
            }
        }

        bindData.property_list = bindData.PROPERTY_LIST;
    }

    var nodeTemplate = _.template( baseTemplateString, _nodeTemplateInterpolate );
    return nodeTemplate( bindData );
};

/**
 * Construct the node template from a base template with the bind properties. The first two properties will be
 * interpolate to title and sub_title. The remaining properties will bind to property list.
 *
 *
 * @param templateId the template ID of the constructed template. If not given, the template ID will be the
 *            string of bind property Names joined by '-'.
 * @param baseTemplateString the base template string with interpolate delimiter '<%= %>'.
 * @param propertyNames the array of bind property names
 * @return the generated template string with bind property names been interpolated.
 */
var getTemplateContent = function( templateId, baseTemplateString, propertyNames ) {
    var templateData = {};
    templateData.sub_title = null;

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
            templateData.property_list = propertyNames.slice( 3 );
        }
    }

    if( templateId ) {
        templateData.template_id = templateId;
    }
    return constructNodeTemplate( baseTemplateString, templateData );
};

/**
 * Get node template by populate the base template with given binding property names
 */
export let getNodeTemplate = function( nodeTemplateCache, propertyNames, isGroup, useMultiLevelTemplate ) {
    //template doesn't exist, construct it and put in template cache
    var baseTemplateId = NODE_TEMPLATE_NAME;

    var baseTemplate = nodeTemplateCache.networkNodeTemplate;
    if( !baseTemplate ) {
        logger.error( 'SVG template has not been registered. Template ID: ' + baseTemplateId );
        return null;
    }

    var templateId = baseTemplateId;
    if( propertyNames && propertyNames.length > 0 ) {
        templateId += TEMPLATE_ID_DELIMITER;
        templateId += propertyNames.join( TEMPLATE_ID_DELIMITER );
    }
    var newTemplate = _.cloneDeep( baseTemplate );
    newTemplate.templateId = templateId;
    newTemplate.templateContent = getTemplateContent( templateId, baseTemplate.templateContent, propertyNames );

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
    if( nodeObject.props && nodeObject.props[ PROPERTY_NAME ] ) {
        var propsArray = nodeObject.props[ PROPERTY_NAME ].uiValues;
        _.forEach( propsArray, function( prop ) {
            var nameValue = prop.split( TEMPLATE_VALUE_CONN_CHAR );
            properties.push( nameValue[ 0 ] );
        } );
    }
    return properties;
};

var setNodeThumbnailProperty = function( nodeObject, bindProperties ) {
    if( !awIconSvc ) {
        return;
    }

    var imageUrl = awIconSvc.getThumbnailFileUrl( nodeObject );

    //show type icon instead if thumbnail doesn't exist
    if( !imageUrl ) {
        imageUrl = awIconSvc.getTypeIconFileUrl( nodeObject );
    }

    bindProperties[ THUMBNAIL_URL ] = graphStyleUtils.getSVGImageTag( imageUrl );
};

/**
 * Get the binding properties for the given node object
 *
 * @param nodeObject the node model object
 * @param propertyNames the names of node object property to display
 * @return the object including all the required binding properties for a node template
 */
export let getBindProperties = function( nodeObject, propertyNames ) {
    var properties = {};

    if( nodeObject && nodeObject.props && nodeObject.props[ PROPERTY_NAME ] ) {
        var propsArray = nodeObject.props[ PROPERTY_NAME ].uiValues;
        for( var i = 0; i < propsArray.length; ++i ) {
            var nameValue = propsArray[ i ].split( TEMPLATE_VALUE_CONN_CHAR );
            properties[ nameValue[ 0 ] ] = i > 1 ? nameValue[ 0 ] + ': ' + nameValue[ 1 ] : nameValue[ 1 ];
        }
    }

    exports.setHoverNodeProperty( properties, null );
    exports.setRootNodeProperty( properties, false );
    //get thumbnail for node
    setNodeThumbnailProperty( nodeObject, properties );

    properties.children_full_loaded = true;
    return properties;
};

export let setHoverNodeProperty = function( properties, hoveredClass ) {
    if( hoveredClass ) {
        properties[ exports.NODE_HOVERED_CLASS ] = hoveredClass;
        properties[ exports.TEXT_HOVERED_CLASS ] = hoveredClass;
    } else {
        properties[ exports.NODE_HOVERED_CLASS ] = 'aw-relations-noeditable-area';
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

var setIconBackground = function( numOfUnloadedRelations, bindProperties, buttonStyleKey ) {
    if( numOfUnloadedRelations === 0 ) {
        // BCN_[IN/OUT]_DEGREE_BUTTON_BG_CLASS
        bindProperties[ buttonStyleKey ] = 'hidden';
    } else {
        // BCN_[IN/OUT]_DEGREE_BUTTON_BG_CLASS,
        bindProperties[ buttonStyleKey ] = 'aw-state-selected';
    }
};

var setNumberStyle = function( visibleEdgeCount, edgeDirection, bindProperties, numberStyleKey ) {
    if( visibleEdgeCount > 0 ) {
        // BCN_[IN/OUT]_DEGREE_NUMBER_CLASS
        bindProperties[ numberStyleKey ] = 'hidden';
    } else {
        if( edgeDirection === 'IN' ) {
            // BCN_[IN/OUT]_DEGREE_NUMBER_CLASS
            bindProperties[ numberStyleKey ] = 'aw-widgets-propertyLabel aw-base-small aw-relations-nodeInDegreeSvg'; //$NON-NLS-1$
        } else {
            // BCN_[IN/OUT]_DEGREE_NUMBER_CLASS
            bindProperties[ numberStyleKey ] = 'aw-widgets-propertyLabel aw-base-small aw-relations-nodeOutDegreeSvg'; //$NON-NLS-1$
        }
    }
};

var setIconTooltip = function( degree, numOfUnloadedRelations, edgeDirection, bindProperties, data ) {
    if( numOfUnloadedRelations === degree ) {
        if( edgeDirection === 'IN' ) {
            bindProperties[ NETWORK_INCOMING_TOOLTIP ] = data.i18n.showIncomingRelationTooltip;
        } else {
            bindProperties[ NETWORK_OUTGOING_TOOLTIP ] = data.i18n.showOutgoingRelationTooltip;
        }
    } else if( numOfUnloadedRelations !== 0 && numOfUnloadedRelations < degree ) {
        if( edgeDirection === 'IN' ) {
            bindProperties[ NETWORK_INCOMING_TOOLTIP ] = data.i18n.showAllIncomingRelations
                .replace( '{0}', degree );
        } else {
            bindProperties[ NETWORK_OUTGOING_TOOLTIP ] = data.i18n.showAllOutgoingRelations
                .replace( '{0}', degree );
        }
    } else if( numOfUnloadedRelations === 0 ) {
        if( edgeDirection === 'IN' ) {
            bindProperties[ NETWORK_INCOMING_TOOLTIP ] = data.i18n.hideIncomingRelationTooltip;
        } else {
            bindProperties[ NETWORK_OUTGOING_TOOLTIP ] = data.i18n.hideOutgoingRelationTooltip;
        }
    }
};

/**
 * Get the whole image string of the button
 *
 * @param imageKey key of the button image
 * @return string of the image content
 */
var getButtonImage = function( imageKey ) {
    var commandIcon = iconService.getCmdIcon( imageKey );
    if( commandIcon ) {
        var svgString = '<svg class="aw-base-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
        return commandIcon.replace( '<svg class="aw-base-icon"', svgString );
    }
    return null;
};

var setIconImage = function( degree, numOfUnloadedRelations, edgeDirection, bindProperties, data ) {
    if( numOfUnloadedRelations > 0 && numOfUnloadedRelations < degree ) {
        if( edgeDirection === 'IN' ) {
            bindProperties[ NETWORK_EXPAND_UP_IMG ] = getButtonImage( 'IncomingPartial' );
            bindProperties[ NETWORK_EXPAND_ALL_INCOMING_MENU ] = data.i18n.showAllIncomingRelations.replace(
                '{0}', degree );
        } else {
            bindProperties[ NETWORK_EXPAND_DOWN_IMG ] = getButtonImage( 'OutgoingPartial' );
            bindProperties[ NETWORK_EXPAND_ALL_INCOMING_MENU ] = data.i18n.showAllOutgoingRelations.replace(
                '{0}', degree );
        }
    } else {
        if( degree > 0 ) {
            if( edgeDirection === 'IN' ) {
                bindProperties[ NETWORK_EXPAND_UP_IMG ] = getButtonImage( 'ShowIncomingRelations' );
                bindProperties[ NETWORK_EXPAND_ALL_INCOMING_MENU ] = '';
            } else {
                bindProperties[ NETWORK_EXPAND_DOWN_IMG ] = getButtonImage( 'ShowOutgoingRelations' );
                bindProperties[ NETWORK_EXPAND_ALL_OUTGOING_MENU ] = '';
            }
        }
    }
};

export let getDegree = function( degree, visibleEdgeCount, numOfUnloadedRelations, edgeDirection, bindProperties,
    data ) {
    var degreeKey;
    var buttonStyleKey;
    var targetStyleKey;
    var targetSvgKey;
    var numberStyleKey;

    if( edgeDirection === 'IN' ) {
        degreeKey = NETWORK_IN_DEGREE;
        buttonStyleKey = NETWORK_IN_DEGREE_BUTTON_BG_CLASS;
        targetStyleKey = NETWORK_IN_DEGREE_RECT_CLASS;
        targetSvgKey = NODE_EXPAND_UP_TARGET_SVG;
        numberStyleKey = NETWORK_IN_DEGREE_NUMBER_CLASS;
    } else {
        degreeKey = NETWORK_OUT_DEGREE;
        buttonStyleKey = NETWORK_OUT_DEGREE_BUTTON_BG_CLASS;
        targetStyleKey = NETWORK_OUT_DEGREE_RECT_CLASS;
        targetSvgKey = NODE_EXPAND_DOWN_TARGET_SVG;
        numberStyleKey = NETWORK_OUT_DEGREE_NUMBER_CLASS;
    }

    var numOfUnloadedRelationsString;
    if( numOfUnloadedRelations === 0 ) {
        numOfUnloadedRelationsString = '';
    } else {
        numOfUnloadedRelationsString = numOfUnloadedRelations.toString();
    }

    // set meta data for total edge count. [IN/OUT]_DEGREE
    bindProperties[ degreeKey ] = numOfUnloadedRelationsString;

    // set icon background solid or transparent
    setIconBackground( numOfUnloadedRelations, bindProperties, buttonStyleKey );

    // set button style
    if( degree > 0 ) {
        // NETWORK_[IN/OUT]_DEGREE_RECT_CLASS, NODE_EXPAND_UP_TARGET_SVG
        bindProperties[ targetStyleKey ] = targetSvgKey;

        // set degree number style
        setNumberStyle( visibleEdgeCount, edgeDirection, bindProperties, numberStyleKey );

        // set icon image
        setIconImage( degree, numOfUnloadedRelations, edgeDirection, bindProperties, data );

        // set the tooltip
        setIconTooltip( degree, numOfUnloadedRelations, edgeDirection, bindProperties, data );
    } else {
        // hide total number and icon

        // NETWORK_[IN/OUT]_DEGREE_NUMBER_CLASS
        bindProperties[ numberStyleKey ] = 'hidden';
        // NETWORK_[IN/OUT]_DEGREE_RECT_CLASS
        bindProperties[ targetStyleKey ] = 'hidden';
    }

    return bindProperties;
};

export default exports = {
    NODE_HOVERED_CLASS,
    TEXT_HOVERED_CLASS,
    getNodeTemplate,
    getBindPropertyNames,
    getBindProperties,
    setHoverNodeProperty,
    setRootNodeProperty,
    getDegree
};
app.factory( 'NetworkGraphTemplateService', () => exports );
