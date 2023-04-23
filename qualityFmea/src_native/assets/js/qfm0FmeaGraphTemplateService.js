// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/qfm0FmeaGraphTemplateService
 */
import app from 'app';
import graphTemplateService from 'js/graphTemplateService';
import _ from 'lodash';
import logger from 'js/logger';
import graphStyleUtils from 'js/graphStyleUtils';
import awIconSvc from 'js/awIconService';
import _localeSvc from 'js/localeService';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import actionGroupView from 'js/qfm0ActionGroupTreeViewService';

'use strict';

var exports = {};

var PROPERTY_NAME = 'awp0CellProperties';
var THUMBNAIL_URL = 'thumbnail_image';
var TEMPLATE_ID_DELIMITER = '-';
var TEMPLATE_VALUE_CONN_CHAR = '\\:';
var MAX_TILE_TEXT_LINES = 3;
var FAKE_PROPERTY = 'Fake_Property';
var basePathForIcon = 'assets/image';
var riskEstimationMethod = '';
var rpnPropLabel = '';
var actionPriorityPropLabel = '';

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

var DUMMYNODE = 'DummyNode';

var START_NODE = 'Start';

var END_NODE = 'End';

const BASE_PATH = app.getBaseUrlPath();
const FUNCTION_ELEMENT = 'FunctionElement';
const FAILURE_ELEMENT = 'FailureElement';
const PFC_SYSTEM_ELEMENT = 'PFC_SystemElement';
const CURRENT_CONTROL_ACTION_GROUP = 'CurrentControlActionGroup';
const CURRENT_OPTIMIZATION_ACTION_GROUP = 'OptimizationActionGroup';
const SYSTEM_ELEMENT_ICON_PROP = 'system_element_icon';
const FUNCTION_ELEMENT_ICON_PROP = 'function_element_icon';
const FUNCTION_PROP = 'Function';
const SYSTEM_ELEMENT_PROP = 'System Element';
const IS_EXTERNAL_FAILURE_PROP = 'isExternalFailure';
const IS_EXTERNAL_FUNCTION_PROP = 'isExternalFunction';
const SEVERITY_PROP = 'Severity';
const SEVERITY_PROP_LABEL = 'severity_label';
const OCCURRENCE_PROP = 'Occurrence';
const OCCURRENCE_PROP_LABEL = 'occurrence_label';
const DETECTION_PROP = 'Detection';
const DETECTION_PROP_LABEL = 'detection_label';
const NODE_TEMPLATE_NAME = 'Gc1TileNodeTemplate';
const GROUP_NODE_TEMPLATE_NAME = 'Gc1GroupTileNodeTemplate';
const BIG_NODE_TEMPLATE_NAME = 'Gc1BigTileNodeTemplate';
const BIG_GROUP_NODE_TEMPLATE_NAME = 'Gc1BigGroupTileNodeTemplate';
const ACTION_GROUP_NODE_TEMPLATE = 'Gc1ActionGroupTileNodeTemplate';
const ACTION_GROUP_NODE_GROUP_TEMPLATE = 'Gc1ActionGroupTileGroupNodeTemplate';
const RPN_PROP = 'RPN';
const RPN_PROP_LABEL = 'rpn_label';
const ACTION_PRIORITY_PROP = 'Action_Priority';
const ACTION_PRIORITY_PROP_LABEL = 'action_priority_label';
const RISK_METHOD_AP = 'Action Priority';
const RISK_METHOD_RPN = 'Risk Priority Number';

/**
 * Get node template by populate the base template with given binding property names
 */
export let getNodeTemplate = function( nodeTemplateCache, propertyNames, isGroup, nodeCategory, ctx ) {
    //template doesn't exist, construct it and put in template cache

    var baseTemplateId = null;
    let primaryXrtType = appCtxService.getCtx( 'xrtPageContext.primaryXrtPageID' );
    let secondaryXrtType = appCtxService.getCtx( 'xrtPageContext.secondaryXrtPageID' );
    if( ( nodeCategory === FAILURE_ELEMENT || nodeCategory === CURRENT_CONTROL_ACTION_GROUP || nodeCategory === CURRENT_OPTIMIZATION_ACTION_GROUP ) && ( secondaryXrtType === 'tc_xrt_Failure_Analysis' || primaryXrtType === 'tc_xrt_Failure_Analysis' )
       || nodeCategory === FUNCTION_ELEMENT && ( secondaryXrtType === 'tc_xrt_Function_Analysis' || primaryXrtType === 'tc_xrt_Function_Analysis' )
    ) {
        // For action groups, if 'RPN' needs to be displayed then use template BIG_GROUP_NODE_TEMPLATE_NAME/BIG_NODE_TEMPLATE_NAME. But in all other 
        // cases (like displaying 'Action Priority' OR neither RPN nor AP should be displayed) ACTION_GROUP_NODE_GROUP_TEMPLATE/ACTION_GROUP_NODE_TEMPLATE template
        // should be used
        if( (nodeCategory === CURRENT_CONTROL_ACTION_GROUP || nodeCategory === CURRENT_OPTIMIZATION_ACTION_GROUP) && riskEstimationMethod !== RISK_METHOD_RPN ) {
            baseTemplateId = isGroup ? ACTION_GROUP_NODE_GROUP_TEMPLATE : ACTION_GROUP_NODE_TEMPLATE;           
        }
        else {
            baseTemplateId = isGroup ? BIG_GROUP_NODE_TEMPLATE_NAME : BIG_NODE_TEMPLATE_NAME;
        }
    } else {
        baseTemplateId = isGroup ? GROUP_NODE_TEMPLATE_NAME : NODE_TEMPLATE_NAME;
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
    newTemplate.templateContent = getTemplateContent( templateId, baseTemplate.templateContent, propertyNames, nodeCategory );

    //cache the new template
    nodeTemplateCache[ templateId ] = newTemplate;
    return newTemplate;
};

/**
 * Get cell property names for the node object.
 *
 * @param nodeObject the node model object
 * @return the array of cell property names
 */
export let getBindPropertyNames = function( nodeObject, nodeCategory, nodeName ) {
    var properties = [];
if( nodeObject === null && nodeCategory === DUMMYNODE && ( nodeName === START_NODE || nodeName === END_NODE ) ) {
    properties.push( 'Name' );
}
if( nodeObject && nodeObject.props && nodeObject.props[ PROPERTY_NAME ] ) {
        var propsArray = nodeObject.props[ PROPERTY_NAME ].uiValues;
        _.forEach( propsArray, function( prop ) {
            var nameValue = prop.split( TEMPLATE_VALUE_CONN_CHAR );
            properties.push( nameValue[ 0 ] );
        } );

        if( nodeCategory === 'CurrentControlAction' || nodeCategory === 'OptimizationAction' ) {
            properties.push( 'qam0QualityActionSubType' );
        } else if( nodeCategory === PFC_SYSTEM_ELEMENT ) {
            properties.push( nodeObject.props.qfm0SysEleSubType.propertyDescriptor.displayName );
            properties.push( nodeObject.props.qfm0SystemElementType.propertyDescriptor.displayName );
            properties.push( nodeObject.props.qfm0Sequence.propertyDescriptor.displayName );
            properties.push( 'process_type_icon' );
        } else if( nodeCategory === CURRENT_OPTIMIZATION_ACTION_GROUP || nodeCategory === CURRENT_CONTROL_ACTION_GROUP ) {
            properties.push( OCCURRENCE_PROP );
            properties.push( OCCURRENCE_PROP_LABEL );
            properties.push( DETECTION_PROP );
            properties.push( DETECTION_PROP_LABEL );
            if( riskEstimationMethod === RISK_METHOD_RPN) {
                properties.push( RPN_PROP );
                properties.push( RPN_PROP_LABEL );
            }
            else if( riskEstimationMethod === RISK_METHOD_AP ) {
                properties.push( ACTION_PRIORITY_PROP );
                properties.push( ACTION_PRIORITY_PROP_LABEL );
            }
        } else if( nodeObject && nodeCategory === FAILURE_ELEMENT ) {
            properties.push( SEVERITY_PROP );
            properties.push( SEVERITY_PROP_LABEL );
            properties.push( IS_EXTERNAL_FAILURE_PROP );
            if( nodeObject && nodeObject.props.qfm0FmeaRoot && nodeObject.props.qfm0ParentElement && nodeObject.props.qfm0FmeaRoot.dbValues[0] !== nodeObject.props.qfm0ParentElement.dbValues[0] ) {
                // If it is NOT an External Failure
                properties.push( SYSTEM_ELEMENT_ICON_PROP );
                properties.push( FUNCTION_ELEMENT_ICON_PROP );
            }
        } else if( nodeObject && nodeCategory === FUNCTION_ELEMENT ) {
            properties.push( IS_EXTERNAL_FUNCTION_PROP );
            if( nodeObject && nodeObject.props.qfm0FmeaRoot && nodeObject.props.qfm0ParentElement && nodeObject.props.qfm0FmeaRoot.dbValues[0] !== nodeObject.props.qfm0ParentElement.dbValues[0] ) {
                // If it is NOT an External Function
                properties.push( SYSTEM_ELEMENT_PROP );
                properties.push( SYSTEM_ELEMENT_ICON_PROP );
            }
        }
    }
    return properties;
};

var setNodeThumbnailProperty = function( nodeObject, bindProperties, nodeCategory ) {
    if( !awIconSvc ) {
        return;
    }

    var imageUrl = awIconSvc.getThumbnailFileUrl( nodeObject );

    //show type icon instead if thumbnail doesn't exist
    if( !imageUrl ) {
        imageUrl = awIconSvc.getTypeIconFileUrl( nodeObject );
    }

    let iconUrlForSubType;
    if( nodeObject && nodeCategory === PFC_SYSTEM_ELEMENT ) {
        let systemEleSubTypePropVal = nodeObject.props.qfm0SysEleSubType.dbValues[0];
        if( systemEleSubTypePropVal === 'Operation' ) {
            iconUrlForSubType = BASE_PATH + '/image/typeOperation48.svg';
        } else if( systemEleSubTypePropVal === 'Storage' ) {
            iconUrlForSubType = BASE_PATH + '/image/typePartStorage48.svg';
        }else if( systemEleSubTypePropVal === 'Transportation' ) {
            iconUrlForSubType = BASE_PATH + '/image/typeTransport48.svg';
        } else if( systemEleSubTypePropVal === 'Test Characteristic' ) {
            iconUrlForSubType = BASE_PATH + '/image/typeTestCharacteristic48.svg';
        }
    } else if( nodeCategory === DUMMYNODE && bindProperties.Name === START_NODE ) {
        imageUrl = BASE_PATH + '/image/typeFlowStartTask48.svg';
    } else if( nodeCategory === DUMMYNODE && bindProperties.Name === END_NODE ) {
        imageUrl = BASE_PATH + '/image/typeFlowStopTask48.svg';
    } else if( nodeCategory === FAILURE_ELEMENT || nodeCategory === FUNCTION_ELEMENT ) {
        // For failure element node also fetch system element and function element icons for showing parent SE and Parent Function details with icons
        let systemElementIconUrl = BASE_PATH + '/image/typeQcFMEASystemElementRepresentation48.svg';
        let functionElementIconUrl = BASE_PATH + '/image/typeQcFMEAFunctionRepresentation48.svg';
        if( !bindProperties[IS_EXTERNAL_FAILURE_PROP] && !bindProperties[IS_EXTERNAL_FUNCTION_PROP] ) {
            // If it is NOT External Failure/ External Function then show icons
            bindProperties[ SYSTEM_ELEMENT_ICON_PROP ] = graphStyleUtils.getSVGImageTag( systemElementIconUrl );
            if( nodeCategory === FAILURE_ELEMENT ) {
                bindProperties[ FUNCTION_ELEMENT_ICON_PROP ] = graphStyleUtils.getSVGImageTag( functionElementIconUrl );
            }
        }
    }
    bindProperties.process_type_icon = graphStyleUtils.getSVGImageTag( iconUrlForSubType );

    bindProperties[ THUMBNAIL_URL ] = graphStyleUtils.getSVGImageTag( imageUrl );
};

/**
 * Get the binding properties for the given node object
 *
 * @param nodeObject the node model object
 * @param propertyNames the names of node object property to display
 * @return the object including all the required binding properties for a node template
 */
export let getBindProperties = function( nodeObject, propertyNames, nodeCategory, nodeName ) {
    var properties = {};

    if( nodeObject === null && nodeCategory === DUMMYNODE && nodeName === START_NODE ) {
        properties.Name = START_NODE;
        properties.object_name = START_NODE;
    }
    if( nodeObject === null && nodeCategory === DUMMYNODE && nodeName === END_NODE ) {
        properties.Name = END_NODE;
        properties.object_name = END_NODE;
    }
    if( nodeObject && nodeObject.props && nodeObject.props[ PROPERTY_NAME ] ) {
        var propsArray = nodeObject.props[ PROPERTY_NAME ].uiValues;
        for( var i = 0; i < propsArray.length; ++i ) {
            var nameValue = propsArray[ i ].split( TEMPLATE_VALUE_CONN_CHAR );
            properties[ nameValue[ 0 ] ] =  i > 1 && !( nameValue[ 0 ] === SYSTEM_ELEMENT_PROP || nameValue[ 0 ] === FUNCTION_PROP ) ? nameValue[ 0 ] + ': ' + nameValue[ 1 ] : nameValue[ 1 ];
        }
    }

    if( nodeObject && nodeCategory === PFC_SYSTEM_ELEMENT ) {
        properties['System Element Type'] = nodeObject.props.qfm0SystemElementType.dbValues[0];
        properties['System Element Sub-Type'] = nodeObject.props.qfm0SysEleSubType.dbValues[0];
        properties.Sequence = nodeObject.props.qfm0Sequence.uiValues[0];
        properties.process_type_icon = '';
    } else if( nodeObject && nodeCategory === FAILURE_ELEMENT ) {
        properties[ SEVERITY_PROP ] = nodeObject.props.qfm0Severity.uiValues[0];
        properties[ SEVERITY_PROP_LABEL ] = nodeObject.props.qfm0Severity.propertyDescriptor.displayName + ":";
        if( nodeObject && nodeObject.props.qfm0FmeaRoot && nodeObject.props.qfm0ParentElement && nodeObject.props.qfm0FmeaRoot.dbValues[0] === nodeObject.props.qfm0ParentElement.dbValues[0] ) {
            properties[ IS_EXTERNAL_FAILURE_PROP ] = true;
        } else {
            properties[ IS_EXTERNAL_FAILURE_PROP ] = false;
            properties[ SYSTEM_ELEMENT_ICON_PROP ] = '';
            properties[ FUNCTION_ELEMENT_ICON_PROP ] = '';
        }
    } else if( nodeObject && nodeCategory === FUNCTION_ELEMENT ) {
        if( nodeObject && nodeObject.props.qfm0FmeaRoot && nodeObject.props.qfm0ParentElement && nodeObject.props.qfm0FmeaRoot.dbValues[0] === nodeObject.props.qfm0ParentElement.dbValues[0] ) {
            properties[ IS_EXTERNAL_FUNCTION_PROP ] = true;
        } else {
            properties[ IS_EXTERNAL_FUNCTION_PROP ] = false;
            properties[ SYSTEM_ELEMENT_PROP ] = nodeObject.props.qfm0ParentElement ? nodeObject.props.qfm0ParentElement.uiValues[0] : '';
            properties[ SYSTEM_ELEMENT_ICON_PROP ] = '';
        }
    } else if( nodeObject && nodeCategory === CURRENT_CONTROL_ACTION_GROUP  || nodeObject && nodeCategory === CURRENT_OPTIMIZATION_ACTION_GROUP ) {
        properties[OCCURRENCE_PROP] =  nodeObject.props.qam0Occurrence ? nodeObject.props.qam0Occurrence.uiValues[0] : '';
        properties[OCCURRENCE_PROP_LABEL] = nodeObject.props.qam0Occurrence ? nodeObject.props.qam0Occurrence.propertyDescriptor.displayName + ': ' : '';
        properties[DETECTION_PROP] =  nodeObject.props.qam0Detection ? nodeObject.props.qam0Detection.uiValues[0] : '';
        properties[DETECTION_PROP_LABEL] = nodeObject.props.qam0Detection ? nodeObject.props.qam0Detection.propertyDescriptor.displayName + ': ' : '';
   
        if( riskEstimationMethod === RISK_METHOD_RPN) {
            properties[RPN_PROP_LABEL] = rpnPropLabel + ':';
            properties[RPN_PROP] = '' + nodeObject.qfm0RPN;
        }
        else if( riskEstimationMethod === RISK_METHOD_AP ) {
            properties[ACTION_PRIORITY_PROP_LABEL] = actionPriorityPropLabel + ':';
            properties[ACTION_PRIORITY_PROP] = '' + nodeObject.qfm0ActionPriority;
        }
    }

    exports.setHoverNodeProperty( properties, null );
    exports.setRootNodeProperty( properties, false );

    setNodeThumbnailProperty( nodeObject, properties, nodeCategory );

    properties.children_full_loaded = true;
    return properties;
};

/**
 * Construct the node template from a base template with the bind properties. The first two properties will be
 * interpolate to title and sub_title. The remaining properties will bind to property list.
 *
 *
 * @param templateId the template ID of the constructed template. If not given, the template ID will be the string
 *            of bind property Names joined by '-'.
 * @param baseTemplateString the base template string with interpolate delimiter '<%= %>'.
 * @param propertyNames the array of bind property names
 * @param nodeCategory this property define node type
 * @return the generated template string with bind property names been interpolated.
 */
var getTemplateContent = function( templateId, baseTemplateString, propertyNames, nodeCategory ) {
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
            var indexesToSlice = 2;
            if( nodeCategory === PFC_SYSTEM_ELEMENT ) { indexesToSlice = 4; }
            templateData.property_list = propertyNames.slice( indexesToSlice );

            if( nodeCategory === PFC_SYSTEM_ELEMENT ) {
                templateData.Sequence_editable = templateData.property_list[ 2 ] + graphTemplateService.EDITABLE_PROPERTY_SURFIX;
            }

            if( nodeCategory === FAILURE_ELEMENT ) {
                templateData.Severity_editable = templateData.property_list[ 4 ] + graphTemplateService.EDITABLE_PROPERTY_SURFIX;
            }

            if( nodeCategory === CURRENT_OPTIMIZATION_ACTION_GROUP || nodeCategory === CURRENT_CONTROL_ACTION_GROUP ) {
                templateData.Occurrence_editable = templateData.property_list[ 0 ] + graphTemplateService.EDITABLE_PROPERTY_SURFIX;
                templateData.Detection_editable = templateData.property_list[ 1 ] + graphTemplateService.EDITABLE_PROPERTY_SURFIX;
            }
        }
    }
    templateData.nodeCategory = nodeCategory;
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
var constructNodeTemplate = function( baseTemplateString, templateData ) {
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
export let setRiskEstimationMethod = function( riskEstimationMethodName ) {
    riskEstimationMethod = riskEstimationMethodName;
};

export let setLabelsValueForRPNAndAP = function() {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    rpnPropLabel = localTextBundle.qfm0RPN;
    actionPriorityPropLabel = localTextBundle.qfm0ActionPriority;
};

export default exports = {
    NODE_HOVERED_CLASS,
    TEXT_HOVERED_CLASS,
    getNodeTemplate,
    getBindPropertyNames,
    getBindProperties,
    setHoverNodeProperty,
    setRootNodeProperty,
    setRiskEstimationMethod,
    setLabelsValueForRPNAndAP
};
