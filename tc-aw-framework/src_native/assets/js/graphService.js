/* eslint-disable max-lines */
/* eslint-disable no-bitwise */

// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module define initial graph model and API
 *
 * @module js/graphService
 */
import app from 'app';
import iconService from 'js/iconService';
import graphTemplateService from 'js/graphTemplateService';
import _ from 'lodash';
import logSvc from 'js/logger';
import graphStyleUtils from 'js/graphStyleUtils';
import pmeiUtils from 'js/pmeiUtils';
import declUtils from 'js/declUtils';
import graphConstants from 'js/graphConstants';
import internalGraphUtils from 'js/internalGraphUtils';
import graphWordWrappingService from 'js/graphWordWrappingService';
import graphFilterSvc from 'js/graphFilterService';
import hotspotUtil from 'js/hotspotEdgeUtils';

/**
 * @exports js/graphService
 */
var exports = {};

// Diagram Foundation module will be initialized after graph libraries loaded
var SDF = null;

var portShapes = {};
var portImages = {};
var arrowShapes = {};

/**
 * Create an annotation
 *
 * @param {Sheet} sheet The sheet which holds the annotation
 * @param {String} annotationText The text of the annotation
 * @param {Number} maxWidth The maximum width of the annotation
 * @returns The created annotation
 */
var createAnnotation = function( sheet, annotationText, maxWidth, labelPreferences ) {
    var annotation = new SDF.Models.Annotation( sheet );

    if( labelPreferences.hasBackground ) {
        var backgroundSymbol = new SDF.Models.Rectangle();
        annotation.addSymbol( new SDF.Models.SymbolOccurrence( null, null, backgroundSymbol ) );
    }

    var textSymbol = new SDF.Models.TextBox();
    textSymbol.setTextString( annotationText );
    textSymbol.setAllowWrapping( labelPreferences.allowWrapping );
    textSymbol.setMaxWidth( maxWidth );
    textSymbol.setAutoFit( true );
    var textSymbolOcc = new SDF.Models.SymbolOccurrence( null, null, textSymbol );
    var textRenderProp = new SDF.Models.TextRenderingProperties();
    textSymbolOcc.setRenderingProperties( textRenderProp );

    annotation.addSymbol( textSymbolOcc );
    annotation.setAllowedTransformations( 1 );
    sheet.addSheetElement( annotation );

    return annotation;
};

/**
 * set text rect location
 *
 * @param {Number} refX the label reference x location
 * @param {Number} refY the label reference y location
 * @param {Number} labelWidth the label width
 * @param {SymbolOccurrance} textSymbolOcc the text box symbol occurrence
 * @param {SymbolOccurrance} rectSymbolOcc the rect symbol occurrence
 * @param {Label} label the reference label
 */
var setTextRectLocation = function( refX, refY, labelWidth, textSymbolOcc, rectSymbolOcc, label ) {
    var textLocation = new SDF.Models.Location();
    var rectLocation = new SDF.Models.Location();
    textLocation.setReference( label );
    rectLocation.setReference( label );

    textLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, 0 );
    textLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.Y, 0 );
    rectLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, 0 );
    rectLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.Y, 0 );

    if( refX === 0.5 && refY === 0 || refX === 0.5 && refY === 1 ) {
        // Top side or bottom of the owner
        textLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 0.5 );
        textLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, -labelWidth / 2 );
        rectLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 0.5 );
        rectLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, -labelWidth / 2 );
    } else if( refX === 1 && refY === 0.5 ) {
        // Right side
        textLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 0 );
        textLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, 0 );
        rectLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 0 );
        rectLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, 0 );
    } else if( refX === 0 && refY === 0.5 ) {
        // Left side
        textLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 1 );
        textLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, -labelWidth );
        rectLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 1 );
        rectLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, -labelWidth );
    }

    textSymbolOcc.setLocation( textLocation );
    rectSymbolOcc.setLocation( rectLocation );
};

/**
 * Create an annotation attached its owner.
 *
 * @param {Sheet} sheet the sheet the annotation locates
 * @param {Owner} owner of the annotation
 * @param {String} labelText text string of the label
 * @param {configuration} the label configuration
 * @return an Annotation
 */
var createNodeAnnotation = function( sheet, owner, labelText, configuration ) {
    // To calculate the position reference to the owner, default is center
    var orientation;
    if( configuration && configuration.orientation ) {
        orientation = graphConstants.LabelOrientations[ configuration.orientation ];
    }
    if( !orientation ) {
        orientation = graphConstants.LabelOrientations.CENTER;
    }

    var annotation = new SDF.Models.Annotation( sheet, orientation.refX, orientation.refY, owner );
    var maxWidth = owner.getWidthValue();
    if( configuration && configuration.maxWidth ) {
        maxWidth = configuration.maxWidth;
    }
    var hasBorder = false;
    if( configuration && configuration.hasBorder ) {
        hasBorder = true;
    }

    var backgroundSymbol;
    var backgroundSymbolOcc;
    if( hasBorder ) {
        backgroundSymbol = new SDF.Models.Rectangle();
        // To set the rectangle as round corner if rx&ry are already setup
        if( configuration.rx && configuration.ry ) {
            backgroundSymbol.setCornerRadius( configuration.rx, configuration.ry );
        }
        backgroundSymbol.setAnchorX( orientation.labelAnchorX );
        backgroundSymbol.setAnchorY( orientation.labelAnchorY );

        backgroundSymbolOcc = new SDF.Models.SymbolOccurrence( null, null, backgroundSymbol );
        backgroundSymbolOcc.setWidthPolicy( 0 );
        backgroundSymbolOcc.setWidth( maxWidth );
        var renderingProperties = backgroundSymbolOcc.getRenderingProperties();
        renderingProperties.setFillColor( SDF.Utils.Color.VeryLightGray );
        annotation.addSymbol( backgroundSymbolOcc );
    }

    // To create a TextBox
    var textSymbol = new SDF.Models.TextBox();
    textSymbol.setAutoFit( 1 );

    // To prepare the the context and then set the content text.
    textSymbol.setTextString( labelText );

    var allowWrapping = true;
    if( configuration && configuration.allowWrapping === false ) {
        allowWrapping = false;
    }
    textSymbol.setAllowWrapping( allowWrapping );

    var marginOffset = 0;
    if( allowWrapping ) {
        textSymbol.setTruncationMode( 0 );
    } else {
        if( maxWidth > 0 ) {
            textSymbol.setMaxWidth( maxWidth );
        }
        textSymbol.setTruncationMode( 2 );
    }

    // Set the margin
    if( configuration && configuration.margin && configuration.margin.length > 0 ) {
        var margin = configuration.margin;
        var top = 0;

        var left = 0;

        var bottom = 0;

        var right = 0;

        top = margin[ 0 ];
        if( margin.length > 1 ) {
            left = margin[ 1 ];
        }
        if( margin.length > 2 ) {
            bottom = margin[ 2 ];
        }
        if( margin.length > 3 ) {
            right = margin[ 3 ];
        }

        marginOffset = left + right;

        textSymbol.setMargin( new SDF.Utils.Margin( top, left, bottom, right ) );
    }

    textSymbol.setAnchorX( orientation.labelAnchorX );
    textSymbol.setAnchorY( orientation.labelAnchorY );

    var textSymbolOcc = new SDF.Models.SymbolOccurrence( null, null, textSymbol );
    // default DF width is 1.
    var textRenderProp = new SDF.Models.TextRenderingProperties();
    textRenderProp.setStrokeWidth( 0 );
    textRenderProp.setFontSize( null );
    textRenderProp.setFontFamily( null );
    textSymbolOcc.setRenderingProperties( textRenderProp );

    if( allowWrapping ) {
        textSymbolOcc.setWidthPolicy( 0 );
        textSymbolOcc.setWidth( maxWidth - marginOffset );
    }

    annotation.addSymbol( textSymbolOcc );

    var labelLocation = annotation.getLocation();
    labelLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, orientation.refX );
    labelLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, orientation.refY );

    if( hasBorder ) {
        setTextRectLocation( orientation.refX, orientation.refY, maxWidth, textSymbolOcc, backgroundSymbolOcc, annotation );
    }

    // Disable annotation move
    annotation.setAllowedTransformations( 0 );

    return annotation;
};

/**
 * A general function to assign a label for a sheet element. When the element already has a label, change the
 * label text; When not, create a new label.
 *
 * @param {Sheet} sheet The sheet which holds the annotation
 * @param {SheetElement} element The element to assign label
 * @param {String} labelText The text of the label
 * @param {Number} maxWidth The maximum width of the label
 * @param {PlacementRule} placementRule The placement rule
 * @param {PlacementRule} moveStrategy The move strategy
 * @param {Function} postProcess The function to post process the label. The function accepts one parament
 *            /label/, and will be invoked after the label is get/created.
 */
var assignLabelGeneral = function( sheet, element, labelText, maxWidth, placementRule, moveStrategy, labelPreferences,
    postProcess ) {
    if( !element ) {
        return;
    }

    var label = element.getLabel();
    if( !label ) {
        label = createAnnotation( sheet, labelText, maxWidth, labelPreferences );
        element.setLabel( label );
    } else {
        label.setText( labelText );
    }

    if( maxWidth > 0 && labelPreferences.allowWrapping ) {
        label.setWidthValue( maxWidth );
    }

    label.setPlacementRule( placementRule );
    label.setMoveStrategy( moveStrategy );
    postProcess( label );
};

// optimize code
var _setMinimumNodeSizeConfig = function( graphModel, defaultNodeSize, sheetConfiguration ) {
    var minimumNodeSize = graphModel.config.defaults.minimumNodeSize;
    var size = {
        width: minimumNodeSize && minimumNodeSize.width ? minimumNodeSize.width : defaultNodeSize.width,
        height: minimumNodeSize && minimumNodeSize.height ? minimumNodeSize.height : defaultNodeSize.height
    };

    sheetConfiguration.resizeMinimumWidth = size.width;
    sheetConfiguration.nestedNodeResizeMinimumWidth = size.width;
    sheetConfiguration.resizeMinimumHeight = size.height;
    sheetConfiguration.nestedNodeResizeMinimumHeight = size.height;
};

var _removeGraphItemModel = function( graphModel, graphItems ) {
    var itemModelFn = function( item ) { return item.model; };
    if( graphItems.nodes ) {
        graphModel.removeNodeModels( graphItems.nodes.map( itemModelFn ) );
    }
    if( graphItems.edges ) {
        graphModel.removeEdgeModels( graphItems.edges.map( itemModelFn ) );
    }
    if( graphItems.ports ) {
        graphModel.removePortModels( graphItems.ports.map( itemModelFn ) );
    }
};

/**
 * Define Graph API
 *
 * @class
 * @param graphModel the graph model object
 * @param diagramView the diagram view object
 */
export let Graph = function( graphModel, diagramView, graphContainer ) {
    SDF = window.SDF;
    if( !SDF ) {
        throw 'Failed to create Graph instance. Diagram Foundation module has not been loaded.';
    }

    var sheet = new SDF.Models.Sheet( null );
    diagramView.render( sheet );

    // Disable the tab stop temporarily
    diagramView.getVirtualCanvas().getWrapper().setAttribute( 'tabindex', -1 );

    this._graphModel = graphModel;
    this._diagramView = diagramView;
    this._graphContainer = graphContainer;
    this._sheet = diagramView.getManager().getSheet();

    this._labelPreferences = _.clone( graphConstants.LabelPreferences );

    var defaultNodeSize = {
        width: graphConstants.DefaultNodeWidth,
        height: graphConstants.DefaultNodeHeight
    };
    if( graphModel.config.defaults.nodeSize ) {
        _.assign( defaultNodeSize, graphModel.config.defaults.nodeSize );
    }
    this._defaultNodeSize = defaultNodeSize;

    var sheetConfiguration = this._diagramView.getSheetConfigurationData();

    _setMinimumNodeSizeConfig( graphModel, this._defaultNodeSize, sheetConfiguration );

    // set truncationMode
    sheetConfiguration.truncationMode = graphConstants.TextOverflow[ this._labelPreferences.textOverflow ];

    // the DF default is nested mode. set to network mode if application configure it.

    if( graphModel.config.isNetworkMode === true ) {
        diagramView.switchGroupViewMode( SDF.Utils.GroupViewMode.Tree );
    } else {
        graphModel.config.isNetworkMode = false;
    }

    this._templateID2WordWrapPropertyMap = {};
};

/**
 * Consolidate bind data to the first argument object.
 */
var _consolidateBindData = function() {
    if( arguments.length < 2 ) {
        return;
    }

    var args = Array.prototype.slice.call( arguments );
    var target = args.shift();

    for( var i = 0; i < args.length; i++ ) {
        if( args[ i ] ) {
            declUtils.consolidateObjects( target, args[ i ] );
        }
    }
};

/**
 * Get node template ID from node style. If the node style is multiple level SVG template, return the ID of sub
 * template which should be applied in current zoom ratio.
 */
var getTemplateId = function( style, diagramView ) {
    var templateId = style.templateId;

    // for multiple level template, get the sub template Id in current room ratio
    if( style.subTemplateIds && style.subTemplateIds.length > 0 ) {
        var minZoom = diagramView.getSheetConfigurationData().minZoomRatio;
        var maxZoom = diagramView.getSheetConfigurationData().maxZoomRatio;
        var len = style.subTemplateIds.length;
        var partitionZooms = style.partitionZooms;

        // if partition zoom isn't defined, then equally divide the graph room range
        if( !partitionZooms ) {
            partitionZooms = [];

            for( var i = 1; i < len; i++ ) {
                partitionZooms.push( ( maxZoom - minZoom ) * i / len );
            }
            style.partitionZooms = partitionZooms;
        } else if( partitionZooms.length + 1 !== len ) {
            logSvc
                .error(
                    'The partition zoom array length should less than the sub templates array length by 1. Node template ID:',
                    templateId );
        }

        var zoom = diagramView.getCurrentZoomRatio();
        var j = 0;
        for( ; j < partitionZooms.length; j++ ) {
            var partition = partitionZooms[ j ];
            if( !_.isNumber( partition ) ) {
                logSvc.error( 'The partition zoom value', partition,
                    'is not a valid number. Node template ID: ', templateId );
                j = len;
                break;
            }

            if( partition < minZoom || partition > maxZoom ) {
                logSvc.error( 'The partition zoom value', partition, 'is out of graph zoom range [', minZoom,
                    ',', maxZoom, ']. Node template ID: ', templateId );
            }

            if( zoom < partition ) {
                break;
            }
        }

        if( j < len ) {
            templateId = style.subTemplateIds[ j ];
        } else {
            // use the last sub template if the index beyond template length
            templateId = style.subTemplateIds[ len - 1 ];
        }
    }

    return templateId;
};

Graph.prototype = {

    /**
     * This method re-renders the graph
     */
    refresh: function() {
        var sheet = this._sheet;
        var diagramView = this._diagramView;

        diagramView.refreshSheet( sheet );
    },

    /**
     * Creates the node with specified layout rectangle, style and tag object.
     *
     * @param {object} rect - The node layout rectangle
     * @param {object} style - The node style instance. Can be null.
     * @param {object} bindData - The node bind data. Can be null.
     * @return the new node instance
     */
    createNodeWithBoundsStyleAndTag: function( rect, style, bindData ) {
        var graphModel = this._graphModel;
        var diagramView = this._diagramView;

        // set default node size
        var defaultNodeSize = _.clone( this._defaultNodeSize );
        var nodeRect = {
            width: defaultNodeSize.width,
            height: defaultNodeSize.height,
            x: 0,
            y: 0
        };
        _.assign( nodeRect, rect );

        var nodeStyle = style;

        // set default node style
        if( !style ) {
            style = graphModel.config.defaults.nodeStyle;
        }

        if( style && style.templateId && !style.templateContent ) {
            nodeStyle = graphModel.nodeTemplates[ style.templateId ];
        }

        diagramView.beginTransaction();

        var tag = {};

        // apply initial binding data
        // regardless of bindData, don't check, someone mislead on this.
        if( nodeStyle ) {
            _consolidateBindData( tag, graphConstants.StaticBindData, this._graphModel.nodeCommandBindData,
                nodeStyle.initialBindData, nodeStyle.wordWrap, bindData );
        }

        // Create a property with an unique id for clip path
        tag.rectClipId = _.uniqueId( 'rc_' );
        if( _.has( graphModel.config, 'shadowEffects' ) ) {
            tag.nodeFilterStyle = 'aw-graph-node-filter';
        }

        var node = null;
        if( nodeStyle && nodeStyle.templateId && nodeStyle.templateContent ) {
            var templateId = getTemplateId( nodeStyle, diagramView );
            var svgObject = SDF.Models.SVG.create( null );
            node = SDF.Models.Node.createNode( this._sheet, nodeRect.width, nodeRect.height, nodeRect.x, nodeRect.y, svgObject );
            node.setAppObj( tag );
            var templateElement = graphTemplateService.getTemplateElement( templateId,
                nodeStyle.templateContent, nodeStyle );
            svgObject.bindSvgTemplateDomToObject( templateId, tag, templateElement );
            node.style = nodeStyle;

            // Set special style
            if( _.has( nodeStyle, 'isResizable' ) && !nodeStyle.isResizable ) {
                node.setAllowedTransformations( 1 ); // Only move gesture is allowed
            }
            if( nodeStyle.isResizable ) {
                node.setResizeOption( 2 ); // Resize same ratio
            }
            if( nodeStyle.minNodeSize ) {
                var minNodeSize = [ nodeStyle.minNodeSize.width, nodeStyle.minNodeSize.height ];
                node.setMinNodeSize( minNodeSize );
                node.minSizeConfig = minNodeSize;
            }
        } else {
            var symbol;
            if( nodeStyle && graphConstants.NodeShape[ style.shape ] === graphConstants.NodeShape.ELLIPSE ) {
                symbol = new SDF.Models.Ellipse();
            } else {
                symbol = new SDF.Models.Rectangle();
            }

            node = SDF.Models.Node.createNode( this._sheet, nodeRect.width, nodeRect.height, nodeRect.x, nodeRect.y, symbol );
            node.setAppObj( tag );

            if( nodeStyle ) {
                this._setBasicNodeStyle( node, nodeStyle );
            }

            node.style = nodeStyle;
        }
        diagramView.endTransaction();

        return node;
    },

    createEdge: function( sourceNode, targetNode ) {
        var newConnection = SDF.Models.Connection.createConnection( sourceNode, targetNode );
        newConnection.setAllowedTransformations( 1 );
        newConnection.autoRouting();
        return newConnection;
    },

    /**
     * Create a location
     *
     * @param {Number} x - x coordinator of a location
     * @param {Number} y - y coordinator of a location
     *
     * @returns {Object} - Location
     */
    createLocation: function( x, y ) {
        return new SDF.Models.Location( x, y );
    },

    /**
     * Get port position
     *
     * @param port the port to set position
     */
    getPortPosition: function( port ) {
        var portPosition = {};
        if( port ) {
            portPosition.x = port.getLocation().getEvaluatedX();
            portPosition.y = port.getLocation().getEvaluatedY();
        }
        return portPosition;
    },

    /**
     * Set port position
     *
     * @param port the port to set position
     * @param position the port position
     */
    setPortPosition: function( port, position ) {
        if( port && position && port.getOwner() && port.getLocation() ) {
            // To convert the location
            var portOwner = port.getOwner(); // SheetElement
            var portLocation = port.getLocation();
            var ownerPos = this.getBounds( portOwner );

            if( ownerPos.width > 0 && ownerPos.height > 0 ) {
                var offsetX = Math.abs( position.x - ownerPos.x );
                var offsetY = Math.abs( position.y - ownerPos.y );
                var percentX = offsetX / ownerPos.width;
                var percentY = offsetY / ownerPos.height;

                var perX = -1;
                var perY = -1;

                var precision = 0.001;

                if( percentX < precision ) {
                    perX = 0;
                } else if( Math.abs( 1 - percentX ) < precision ) {
                    perX = 1;
                }

                if( percentY < precision ) {
                    perY = 0;
                } else if( Math.abs( 1 - percentY ) < precision ) {
                    perY = 1;
                }

                // set the location
                if( perX === 0 || perX === 1 ) {
                    portLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, perX );
                    portLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, 0 );
                    portLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, 0 );
                } else {
                    portLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, offsetX );
                }

                if( perY === 0 || perY === 1 ) {
                    portLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 0 );
                    portLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.Y, 0 );
                    portLocation.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, perY );
                } else {
                    portLocation.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.Y, offsetY );
                }
            }
        }
    },

    /**
     * Set edge position
     *
     * @param edge the edge to set position
     * @param positions the segments points for the edge
     */
    setEdgePosition: function( edge, positions ) {
        var diagramView = this._diagramView;
        if( !edge || !positions || !diagramView ) {
            return;
        }

        var polyline = edge.getGeometry();
        if( polyline ) {
            var points = polyline.getPoints();
            var length = positions.length;
            points.length = length;
            for( var j = 0; j < length; j++ ) {
                var point = positions[ j ];
                points[ j ] = point;
                if( j === 0 && !edge.getStart().hasSymbol() ) {
                    this.setPortPosition( edge.getSourcePort(), point );
                }
                if( j === length - 1 && !edge.getEnd().hasSymbol() ) {
                    this.setPortPosition( edge.getTargetPort(), point );
                }
            }

            this.update( function() {
                edge.setPath( points );
            } );
        }
    },

    /**
     * Get edge position
     *
     * @param edge edge
     * @return edge position
     */
    getEdgePosition: function( edge ) {
        var edgePosition = [];
        if( edge ) {
            var polyline = edge.getGeometry();
            if( polyline ) {
                edgePosition = polyline.getPoints();
            }
        }
        return edgePosition;
    },

    /**
     * Add port at location with given style
     *
     * @param portOwner the owner Node
     * @param location the port location
     * @param style the port style
     * @return port created port
     */
    addPortAtLocationWithStyle: function( portOwner, location, style ) {
        if( !style ) {
            style = this._graphModel.config.defaults.portStyle;
        }
        if( !portOwner || !style ) {
            return null;
        }

        var port = new SDF.Models.Port( this._sheet, style.size, style.size, null, null, null, portOwner );
        port.setParentSides( SDF.Utils.AllowedSides.ALL );
        portOwner.addPort( SDF.Utils.Direction.BOTH, port );
        if( location ) {
            this.setPortPosition( port, location );
        }
        this.setPortStyle( port, style );
        return port;
    },

    /**
     * Update node property values.
     *
     * @param node The node to update
     * @param properties the properties. It can accept different type of input: undefine: update all properties
     *            bind on node.  {}: update node property with new property value, eg: \{binding_key1: value,
     *            binding_key2:value, ...\}
     */
    updateNodeBinding: function( node, properties ) {
        if( !node ) {
            return;
        }

        var appObj = node.getAppObj();
        var svg = node.getSVG();
        if( !appObj || !svg ) {
            logSvc.warn( 'No appObj or no SVG for this node, skip the binding. node is: ' + node.toString() );
            return;
        }

        var self = this;
        var updateTextOverflow = false;
        var textProperties = this._templateID2WordWrapPropertyMap[ node.style.templateId ];
        this.update( function() {
            if( properties && _.isObject( properties ) ) {
                if( !textProperties ) {
                    var textOverflow = node.style ? node.style.textOverflow : 'NONE';
                    if( textOverflow && textOverflow !== 'NONE' ) {
                        var textElements = graphWordWrappingService.getTextOverflowElements( svg.getEvaluatedSvgContent() );
                        textProperties = _.map( textElements, function( textElement ) {
                            return textElement.getAttribute( 'data-property-name' );
                        } );
                    }

                    if( !textProperties ) {
                        textProperties = [];
                    }

                    // for a given node template, the wordwrap properties are fixed, so cache it to improve performance
                    self._templateID2WordWrapPropertyMap[ node.style.templateId ] = textProperties;
                }

                _.each( properties, function( value, key ) {
                    var oldValue = appObj[ key ];
                    if( oldValue !== value ) {
                        if( !updateTextOverflow && textProperties.length > 0 && textProperties.includes( key ) ) {
                            updateTextOverflow = true;
                        }

                        appObj[ key ] = value;
                        svg.bindNewValues( key );
                    }
                } );
            } else {
                // DF api svg.updateBinding() takes no parameters. we should correct the previous usage.
                svg.updateBinding();
            }
        } );

        if( updateTextOverflow ) {
            this.updateWordWrapping( [ node ] );
        }
    },

    /**
     * Set node the origin minimum node size for resize.
     *
     * @param node The node that will be assigned the min node size
     * @param minSize The minimum node size to resize.
     */
    setNodeMinSizeConfig: function( node, minSize ) {
        if( node instanceof SDF.Models.Node ) {
            node.setMinNodeSize( minSize );
            node.minSizeConfig = minSize;
        }
    },

    /**
     * Get node the origin minimum node size for resize.
     *
     * @param node The node that will be assigned the min node size
     * @return minSize The minimum node size to resize.
     */
    getNodeMinSizeConfig: function( node ) {
        var minSize;
        if( node instanceof SDF.Models.Node ) {
            if( node.minSizeConfig ) {
                minSize = node.minSizeConfig;
            } else {
                var sheetConfiguration = this._diagramView.getSheetConfigurationData();
                minSize = [ sheetConfiguration.resizeMinimumWidth, sheetConfiguration.resizeMinimumHeight ];
            }
        }
        return minSize;
    },

    /**
     * Set node style.
     *
     * @param node The node that will be assigned the new style
     * @param style The style instance that will be assigned to the node.
     * @param bindData the node bind data. Can be null.
     */
    setNodeStyle: function( node, style, bindData ) {
        if( !node || !style ) {
            return;
        }

        var nodeStyle = style;
        var graphModel = this._graphModel;
        var diagramView = this._diagramView;
        if( style.templateId && !style.templateContent ) {
            nodeStyle = graphModel.nodeTemplates[ style.templateId ];
        }

        if( nodeStyle ) {
            node.style = nodeStyle;
            if( nodeStyle.templateId ) {
                diagramView.beginTransaction();
                var templateId = getTemplateId( nodeStyle, diagramView );
                var templateElement = graphTemplateService.getTemplateElement( templateId,
                    node.style.templateContent, nodeStyle );
                var svgObject = node.getSVG();
                if( svgObject ) {
                    var tag = node.getAppObj();
                    if( !tag ) {
                        tag = {};
                        node.setAppObj( tag );
                        _consolidateBindData( tag, graphConstants.StaticBindData,
                            this._graphModel.nodeCommandBindData, nodeStyle.initialBindData, nodeStyle.wordWrap );
                    }

                    if( bindData ) {
                        _consolidateBindData( tag, bindData );
                    }

                    svgObject.bindSvgTemplateDomToObject( templateId, tag, templateElement );
                }
                diagramView.endTransaction();

                var textOverflow = nodeStyle.textOverflow;
                var self = this;
                if( textOverflow && textOverflow !== 'NONE' ) {
                    _.defer( function() {
                        self.updateWordWrapping( [ node ] );
                    } );
                }

                if( _.has( nodeStyle, 'isResizable' ) && !nodeStyle.isResizable ) {
                    node.setAllowedTransformations( 1 ); // Only move gesture is allowed
                }
            } else {
                this._setBasicNodeStyle( node, nodeStyle );
            }
        }
    },

    _setBasicNodeStyle: function( node, style ) {
        if( !node || !style ) {
            return;
        }

        var symbolOccs = node.getSymbols();
        if( !symbolOccs || symbolOccs.length === 0 ) {
            return;
        }

        var diagramView = this._diagramView;
        diagramView.beginTransaction();

        var symbolOcc = symbolOccs[ 0 ];
        var symbol = symbolOcc.getSymbol();
        var renderProperties = symbolOcc.getRenderingProperties();
        if( style.fillColor ) {
            renderProperties.setFillColor( graphStyleUtils.parseColor( style.fillColor ) );
        }

        if( style.borderColor ) {
            renderProperties.setStrokeColor( graphStyleUtils.parseColor( style.borderColor ) );
        }

        if( style.thickness ) {
            renderProperties.setStrokeWidth( style.thickness );
        }

        if( style.strokeDash ) {
            renderProperties.setStrokeDashArray( graphStyleUtils.generateDashSegments( style.strokeDash ) );
        }

        renderProperties.setStyleClass( style.styleClass );

        // add the flag
        if( style.flagWidth && style.flagWidth > 0 ) {
            var flagSymbolOcc;
            if( symbolOccs.length > 1 ) {
                flagSymbolOcc = symbolOccs[ 1 ];
            } else {
                flagSymbolOcc = new SDF.Models.SymbolOccurrence( style.flagWidth, 0, symbol );
                node.addSymbol( flagSymbolOcc );
            }

            if( flagSymbolOcc ) {
                var flagRenderProperties = flagSymbolOcc.getRenderingProperties();
                if( style.borderColor ) {
                    flagRenderProperties.setFillColor( graphStyleUtils.parseColor( style.borderColor ) );
                    flagRenderProperties.setStrokeColor( graphStyleUtils.parseColor( style.borderColor ) );
                }
            }
        }

        if( symbol && symbol instanceof SDF.Models.Rectangle && style.roundedCorner ) {
            symbol.setCornerRadius( style.roundedCorner.x, style.roundedCorner.y );
        }

        diagramView.endTransaction();
    },

    /**
     * Set the port style class
     */
    setPortStyleClass: function( port, portStyleClass ) {
        if( port && port.hasSymbol() ) {
            this._diagramView.beginTransaction();
            var symbols = port.getSymbols();
            symbols[ 0 ].getRenderingProperties().setStyleClass( portStyleClass );
            this._diagramView.endTransaction();
        }
    },

    /**
     * Set port style
     *
     * @param port The port instance
     * @param portStyle The style instance that will be assigned to the port
     */
    setPortStyle: function( port, portStyle ) {
        if( !port || !portStyle ) {
            return;
        }

        var diagramView = this._diagramView;
        var portSymbolOcc = null;
        var portImageOcc = null;
        diagramView.beginTransaction();
        if( port.hasSymbol() ) {
            var symbols = port.getSymbols();
            portSymbolOcc = symbols[ 0 ];
            removeImageAlreadyExists( symbols, port );
        } else {
            portSymbolOcc = createPortSymbolOccurrence( portStyle );
        }
        if( !portSymbolOcc ) {
            return;
        }
        var propertyObj = portSymbolOcc.getRenderingProperties();

        // throw exception on "transparent", not supported in DF for color keyword "transparent"
        // LCS-76250 - Port Style Bug - Diagram Foundation
        var fillColor = graphStyleUtils.parseColor( 'argb(1,255,255,255)' );
        var strokeColor = null;
        if( portStyle.fillColor ) {
            fillColor = graphStyleUtils.parseColor( portStyle.fillColor );
        }
        if( portStyle.borderColor ) {
            strokeColor = graphStyleUtils.parseColor( portStyle.borderColor );
        }
        propertyObj.setFillColor( fillColor );
        if( strokeColor ) {
            propertyObj.setStrokeColor( strokeColor );
        }
        if( portStyle.thickness ) {
            propertyObj.setStrokeWidth( portStyle.thickness );
        }
        // support set empty
        if( portStyle.styleClass !== undefined ) {
            propertyObj.setStyleClass( portStyle.styleClass );
        }

        if( !port.hasSymbol() ) {
            port.addSymbol( portSymbolOcc );
        }

        portImageOcc = createPortImageOccurrence( portStyle );
        if( portImageOcc ) {
            var portImagePropertyObj = portImageOcc.getRenderingProperties();

            // LCS-466853 - BASH Oct2020: Ports icon color is in incorrect. Always displays as black.

            // portImagePropertyObj.setFillColor( strokeColor );

            // In order to get the correct rendering effort by default, set the stroke and its width as follows.
            // The apps should define its own CSS class inside the image definition if the apps need more configuration
            // portImagePropertyObj.setStrokeColor( graphStyleUtils.getTransparentColor() );

            portImagePropertyObj.setFillColor( fillColor );
            portImagePropertyObj.setStrokeColor( strokeColor );

            portImagePropertyObj.setStrokeWidth( 0 );

            port.addSymbol( portImageOcc );
        }
        port.setWidthValue( portStyle.size );
        port.setHeightValue( portStyle.size );
        port.setAllowedTransformations( 1 );
        port.style = portStyle;
        diagramView.endTransaction();
    },

    /**
     * Get node position
     *
     * @param node the graph node
     * @return node position
     */
    getBounds: function( node ) {
        return internalGraphUtils.getBounds( node );
    },

    /**
     * Sets the bounds of the given node to the new values.
     *
     * @param node the node
     * @param rect the new bounds of node to be set
     */
    setBounds: function( node, rect ) {
        if( node && rect ) {
            if( rect.x ) {
                node.setAnchorPositionX( rect.x );
            }
            if( rect.y ) {
                node.setAnchorPositionY( rect.y );
            }
            if( rect.width ) {
                node.setWidthValue( rect.width );
            }
            if( rect.height ) {
                node.setHeightValue( rect.height );
            }
        }
    },

    /**
     * Clears the graph instance, removing all entities in proper order.
     */
    clear: function() {
        // TODO cleanupPmeiIndicators
        if( this._diagramView ) {
            this._diagramView.deleteAll( this._sheet );
        }

        internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.graphCleared' );
    },

    /**
     * Create a connection between two ports
     *
     * @param sourcePort the source port used to create connection
     * @param targetPort the target port used to create connection
     * @return newConnection new created edge
     */
    createEdgeWithPorts: function( sourcePort, targetPort ) {
        var newConnection = new SDF.Models.Connection( this._sheet, sourcePort, targetPort );
        newConnection.setAllowedTransformations( 1 );
        newConnection.autoRouting();
        return newConnection;
    },

    /**
     * Convenience method that creates and returns an edge that connects to the given node instances using the
     * given style instance.
     *
     * @param sourceNode source node
     * @param targetNode target node
     * @param style style
     * @param edgeAttributes the edge attributes
     * @return edge created edge
     */
    createEdgeWithNodesStyleAndTag: function( sourceNode, targetNode, style, edgeAttributes ) {
        if( !style ) {
            style = this._graphModel.config.defaults.edgeStyle;
        }
        var edge = this.createEdge( sourceNode, targetNode );
        if( edge ) {
            edge.getStart().setAllowedTransformations( 0 );
            edge.getEnd().setAllowedTransformations( 0 );
            var bindObject = {};
            declUtils.consolidateObjects( bindObject, edgeAttributes );
            edge.setAppObj( bindObject );
            this.setEdgeStyle( edge, style );
            edge.updatePortProxyState( null, null );
        }
        return edge;
    },

    /**
     * Create an edge between two nodes with specified start location and target location, currently these locations
     *  are the center points of TOP, RIGHT, BOTTOM, and LEFT side
     *
     * @param {Node} sourceNode  - start node
     * @param {string} sourceLocation - start location
     * @param {Node} targetNode - target node
     * @param {string} targetLocation - end locaiton
     * @param {Object} style - style of the edge
     * @param {Object} edgeAttributes - additive attributes to bind
     * @returns {Edge} new created edge
     */
    createEdgeWithNodesStyleAndLocation: function( sourceNode, sourceLocation, targetNode, targetLocation, style, edgeAttributes ) {
        if( !style ) {
            style = this._graphModel.config.defaults.edgeStyle;
        }
        var sourcePort = this._createSharedPort( sourceNode, sourceLocation );
        var targetPort = this._createSharedPort( targetNode, targetLocation );

        var edge = this.createEdgeWithPorts( sourcePort, targetPort );
        if( edge ) {
            var bindObject = {};
            declUtils.consolidateObjects( bindObject, edgeAttributes );
            edge.setAppObj( bindObject );
            this.setEdgeStyle( edge, style );
            edge.updatePortProxyState( null, null );
        }
        return edge;
    },

    /**
     * relocate the port to center point of its owner's specified side.
     *
     * @param {Object} port - the port needs to set position
     * @param {String} portPosition - string to describe the port position
     */
    centerPortOnNodeSide: function( port, portPosition ) {
        if( port ) {
            var percentX = 0.5;
            var percentY = 0;

            switch ( portPosition ) {
                case graphConstants.NodePortPosition.TOP:
                    break;
                case graphConstants.NodePortPosition.RIGHT:
                    percentX = 1;
                    percentY = 0.5;
                    break;
                case graphConstants.NodePortPosition.BOTTOM:
                    percentX = 0.5;
                    percentY = 1;
                    break;
                case graphConstants.NodePortPosition.LEFT:
                    percentX = 0;
                    percentY = 0.5;
                    break;
            }

            // Set the port position
            var portLocation = port.getLocation();
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, percentX );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, percentY );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y, 0 );
        }
    },

    /**
     * Check whether there exists a port on specified position
     *
     * @param {Object} node - node
     * @param {string} portPosition - port position, currently support TOP, RIGHT, BOTTOM, and LEFT.
     *
     * @returns {Port} if there exists a port, otherwise
     */
    getPortOnPosition: function( node, portPosition ) {
        var ports = node.getPorts();
        if( ports && ports.length > 0 ) {
            var percentX = 0.5;
            var percentY = 0;
            switch ( portPosition ) {
                case graphConstants.NodePortPosition.TOP:
                    break;
                case graphConstants.NodePortPosition.RIGHT:
                    percentX = 1;
                    percentY = 0.5;
                    break;
                case graphConstants.NodePortPosition.BOTTOM:
                    percentX = 0.5;
                    percentY = 1;
                    break;
                case graphConstants.NodePortPosition.LEFT:
                    percentX = 0;
                    percentY = 0.5;
                    break;
            }
            return _.find( ports, function( port ) {
                var portLocation = port.getLocation();
                var portPercentX = portLocation.getInputPercentX();
                var portPercentY = portLocation.getInputPercentY();
                if( portPercentX === 0 ) {
                    if( portLocation.getInputValueX() > 0 ) {
                        portPercentX = 0.5;
                    }
                }
                if( portPercentY === 0 ) {
                    if( portLocation.getInputValueY() > 0 ) {
                        portPercentY = 0.5;
                    }
                }
                return portPercentX === percentX && portPercentY === percentY;
            } );
        }
    },

    /**
     * If there is an existing port at the port location, return it, otherwise create a new one.
     * @param {Node} node - Node who owns the port
     * @param {String} portLocation - port location, currently it supports TOP, RIGHT, BOTTOM, LEFT.
     * @return {Object} port - port on the position
     */
    _createSharedPort: function( node, portLocation ) {
        var sheet = this._diagramView.getManager().getSheet();

        var port = this.getPortOnPosition( node, portLocation );

        if( !port ) {
            port = new window.SDF.Models.Port( sheet, 0, 0, null, null, null, node );
            node.addPort( null, port );
        }
        // Reset the port position
        port.setPinned( true );
        this.centerPortOnNodeSide( port, portLocation );

        return port;
    },

    /**
     * Convenience method that creates and returns an edge that connects to the given port instances using the
     * given style instance.
     *
     * @param sourcePort source port
     * @param targetPort target port
     * @param style style
     * @param edgeAttributes the edge attributes
     * @return edge created edge
     */
    createEdgeWithPortsStyleAndTag: function( sourcePort, targetPort, style, edgeAttributes ) {
        if( !style ) {
            style = this._graphModel.config.defaults.edgeStyle;
        }

        var edge = this.createEdgeWithPorts( sourcePort, targetPort );
        if( edge ) {
            edge.getStart().setAllowedTransformations( 1 );
            edge.getEnd().setAllowedTransformations( 1 );
            var bindObject = {};
            declUtils.consolidateObjects( bindObject, edgeAttributes );
            edge.setAppObj( bindObject );
            this.setEdgeStyle( edge, style );
        }
        return edge;
    },

    /**
     * Remove the ports or not associated with edge based on the removeSingle flag.
     * The port can be set to hide if all of edges is hidden and the hide sigle flag is true
     *
     * @param {Array} candidatePorts the candidate ports .
     * @param {Boolean} isHideSingle hide the single port or not.
     * @param {Boolean} isRemoveSingle remove the single port or not.
     * @returns {Array} the removed ports
     */
    _removeEdgeRelatedPorts: function( candidatePorts, isHideSingle, isRemoveSingle ) {
        var result = classifyPortsForHideRemove( candidatePorts, isHideSingle, isRemoveSingle );
        if( result.removePorts.length > 0 ) {
            this._deleteElements( result.removePorts );
        }

        if( result.hidePorts.length > 0 ) {
            this.setVisible( result.hidePorts, false );
        }

        return result.removePorts;
    },

    /**
     * Hide the ports or not associated with edge based on the isHideSingle flag.
     *
     * @param {Array} candidatePorts the candidate ports .
     * @param {Boolean} isHideSingle hide the single port or not.
     * @returns {Array} the hidden ports
     */
    _hideEdgeRelatedPorts: function( candidatePorts, isHideSingle ) {
        var result = classifyPortsForHideRemove( candidatePorts, isHideSingle );
        var hiddenPorts = [];
        this.update( function() {
            _.forEach( result.hidePorts, function( port ) {
                if( !port.isFiltered() ) {
                    port.setVisible( false );
                    hiddenPorts.push( port );
                }
            } );
        } );

        return hiddenPorts;
    },

    /**
     * Remove items from graph.  The 'awGraph.itemsRemoved' event will be fired.
     *
     * @param {Array} items the items to remove.
     * @param {Boolean} isRemoveSinglePort remove the single port or not when remove the associated edge.
     * @returns {Array} the removed items
     */
    removeItems: function( items, isRemoveSinglePort ) {
        if( !items || items.length === 0 ) {
            return;
        }

        var aggregatedItems = _.groupBy( items, function( item ) {
            return item.getItemType();
        } );

        var removedItems = { nodes: [], edges: [], ports: [], boundaries: [] };
        if( aggregatedItems.Node ) {
            var toRemovedNodes = this._getToRemoveItemsWithNodes( aggregatedItems.Node );
            removedItems.nodes = removedItems.nodes.concat( toRemovedNodes.nodes );
            removedItems.edges = removedItems.edges.concat( toRemovedNodes.edges );
            removedItems.ports = removedItems.ports.concat( toRemovedNodes.ports );
        }

        if( aggregatedItems.Edge ) {
            removedItems.edges = removedItems.edges.concat( aggregatedItems.Edge );
        }

        if( aggregatedItems.Port ) {
            var toRemovedPorts = this._getToRemoveItemsWithPorts( aggregatedItems.Port );
            removedItems.edges = removedItems.edges.concat( toRemovedPorts.edges );
            removedItems.ports = removedItems.ports.concat( toRemovedPorts.ports );
        }

        if( aggregatedItems.Boundary ) {
            var removedBoundary = aggregatedItems.Boundary;
            removedItems.boundaries = removedItems.boundaries.concat( removedBoundary );
        }

        if( removedItems.nodes.length > 0 || removedItems.edges.length > 0 ||
            removedItems.ports.length > 0 || removedItems.boundaries.length > 0 ) {
            var relatedPorts = getEdgeRelatedPorts( removedItems.edges, removedItems.ports );
            this._deleteElements( removedItems.nodes.concat( removedItems.edges, removedItems.ports ) );

            var removePorts = this._removeEdgeRelatedPorts( relatedPorts, this._graphModel.config.syncPortEdgeVisibility, isRemoveSinglePort );
            removedItems.ports = removedItems.ports.concat( removePorts );

            // update graph data model cache on removal
            _removeGraphItemModel( this._graphModel, removedItems );
            internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.itemsRemoved', removedItems );
        }

        return removedItems;
    },

    /**
     * Remove nodes from graph. This implementation will also remove connected edges and corresponding ports in
     * proper order before nodes have been removed. The 'awGraph.itemsRemoved' event will be fired.
     *
     * @param {Array} nodes the nodes to remove.
     * @param {Boolean} isRemoveSinglePort remove the single port or not when remove the associated edge.
     * @returns {Array} the removed items
     */
    removeNodes: function( nodes, isRemoveSinglePort ) {
        if( !nodes || nodes.length === 0 ) {
            return;
        }

        var toRemovedItems = this._getToRemoveItemsWithNodes( nodes );
        var relatedPorts = getEdgeRelatedPorts( toRemovedItems.edges, toRemovedItems.ports );

        var removeItems = toRemovedItems.nodes.concat( toRemovedItems.edges, toRemovedItems.ports );
        this._deleteElements( removeItems );

        var removePorts = this._removeEdgeRelatedPorts( relatedPorts, this._graphModel.config.syncPortEdgeVisibility, isRemoveSinglePort );
        toRemovedItems.ports = toRemovedItems.ports.concat( removePorts );

        // update graph data model cache on removal
        _removeGraphItemModel( this._graphModel, toRemovedItems );
        internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.itemsRemoved', toRemovedItems );
        return toRemovedItems;
    },

    /**
     * Remove edges from graph. The implementation may decide to remove the corresponding ports which have no
     * geometry symbols from the node if no other edge connects to them after the given edge has been removed.
     * Also this will trigger the removal of all labels and bends owned by this instance. The
     * 'awGraph.itemsRemoved' event will be fired.
     *
     * @param {Array} edges edges to remove
     * @param {Boolean} isRemoveSinglePort remove the single port or not when remove the associated edge.
     * @returns {Array} the removed items
     */
    removeEdges: function( edges, isRemoveSinglePort ) {
        if( !edges || edges.length === 0 ) {
            return;
        }

        var toRemovedItems = {
            edges: edges
        };

        var relatedPorts = getEdgeRelatedPorts( edges );
        this._deleteElements( edges );

        var removePorts = this._removeEdgeRelatedPorts( relatedPorts, this._graphModel.config.syncPortEdgeVisibility, isRemoveSinglePort );
        toRemovedItems.ports = removePorts;

        // update graph data model cache on removal
        _removeGraphItemModel( this._graphModel, toRemovedItems );
        internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.itemsRemoved', toRemovedItems );
        return toRemovedItems;
    },

    /**
     * Remove ports. This implementation will also remove the edges connected to the given ports. The
     * 'awGraph.itemsRemoved' event will be fired.
     *
     * @param {Array} ports array of port to remove
     * @param {Boolean} isRemoveSinglePort remove the single port or not when remove the associated edge.
     * @returns {Array} the removed items
     */
    removePorts: function( ports, isRemoveSinglePort ) {
        if( !ports || ports.length === 0 ) {
            return;
        }

        var toRemovedItems = this._getToRemoveItemsWithPorts( ports );
        var relatedPorts = getEdgeRelatedPorts( toRemovedItems.edges, ports );
        this._deleteElements( toRemovedItems.edges.concat( ports ) );

        var removePorts = this._removeEdgeRelatedPorts( relatedPorts, this._graphModel.config.syncPortEdgeVisibility, isRemoveSinglePort );
        toRemovedItems.ports = toRemovedItems.ports.concat( removePorts );

        // update graph data model cache on removal
        _removeGraphItemModel( this._graphModel, toRemovedItems );
        internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.itemsRemoved', toRemovedItems );
        return toRemovedItems;
    },

    _deleteElements: function( items ) {
        var self = this;

        // remove from diagramView
        this.update( function() {
            self._diagramView.deleteElements( items );
        } );
    },

    _getToRemoveItemsWithNodes: function( nodes ) {
        // collect all ports on the removed nodes
        // remove connected edges first
        // use common method
        var results = getRelatedNodesEdgesAndPorts( nodes, true );
        if( results ) {
            var allNodes = [].concat( nodes, results.nodes );
            var toRemoveItems = {
                nodes: allNodes,
                edges: results.edges,
                ports: results.ports
            };
            return toRemoveItems;
        }

        return null;
    },

    _getToRemoveItemsWithPorts: function( ports ) {
        // remove connected edges at port first
        var edges = [];
        _.forEach( ports, function( port ) {
            edges = edges.concat( port.getConnections() );
        } );

        var toRemoveItems = {
            edges: edges,
            ports: ports
        };

        return toRemoveItems;
    },

    /**
     * Show or hide graph items.
     *
     * @param items the array of graph items to set visibility.
     * @param visible the visibility flag
     * @param syncGroupDescendantsVisibility, default true, flag to control
     *        whether or not to sync visibilty for a Group node and it's descendants
     */
    setVisible: function( items, visible, syncGroupDescendantsVisibility ) {
        if( !items || items.length === 0 ) {
            return;
        }

        // set default value
        if( syncGroupDescendantsVisibility === undefined ) {
            syncGroupDescendantsVisibility = true;
        }

        var self = this;
        var group = null;
        var visibilityChangedItems = [];
        var relatedPorts = [];
        // if hide, also hide the related items
        if( !visible ) {
            var results = [];

            group = internalGraphUtils.groupItems( items );
            var nodes = group.Node;
            var edges = group.Edge;
            var ports = group.Port;

            if( nodes && nodes.length > 0 ) {
                results = getRelatedNodesEdgesAndPorts( nodes, syncGroupDescendantsVisibility );
                if( results ) {
                    items = items.concat( results.nodes, results.edges, results.ports );
                }
            }

            var visibleChangeEdges = [];
            var visibleChangePorts = [];
            if( edges ) {
                visibleChangeEdges = visibleChangeEdges.concat( edges );
            }
            if( results && results.edges ) {
                visibleChangeEdges = visibleChangeEdges.concat( results.edges );
            }
            if( ports ) {
                visibleChangePorts = visibleChangePorts.concat( ports );
            }
            if( results && results.ports ) {
                visibleChangePorts = visibleChangePorts.concat( results.ports );
            }
            relatedPorts = getEdgeRelatedPorts( visibleChangeEdges, visibleChangePorts );
        }

        items = _.uniq( items );
        self.update( function() {
            _.forEach( items, function( item ) {
                if( visible === item.isFiltered() ) {
                    item.setVisible( visible );
                    visibilityChangedItems.push( item );
                }
            } );

            // clear selection for invisible items
            if( !visible ) {
                var remainedHiddenPorts = self._hideEdgeRelatedPorts( relatedPorts, self._graphModel.config.syncPortEdgeVisibility );
                visibilityChangedItems = visibilityChangedItems.concat( remainedHiddenPorts );

                // DF defect, don't work for false!
                // self.setSelection( items, false );
            }
        } );

        group = internalGraphUtils.groupItems( visibilityChangedItems );
        if( group && ( group.Node || group.Edge || group.Port || group.Boundary ) ) {
            // update the edges related to ports
            if( group.Port ) {
                var needUpdateEdges = [];
                _.each( group.Port, function( item ) {
                    var connectedEdges = item.getConnections();
                    if( connectedEdges && connectedEdges.length > 0 ) {
                        needUpdateEdges = needUpdateEdges.concat( connectedEdges );
                    }
                } );
                needUpdateEdges = _.uniq( needUpdateEdges );
                _.each( needUpdateEdges, function( edge ) {
                    if( edge.isVisible() ) {
                        edge.setUpToDate( false );
                    }
                } );
            }

            var result = {
                nodes: group.Node || [],
                edges: group.Edge || [],
                ports: group.Port || [],
                boundaries: group.Boundary || [],
                visible: visible
            };
            internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.visibilityChanged', result );

            return result;
        }
    },

    /**
     * Get the rollup style for edge
     */
    _getRollUpEdgeStyle: function( styleInfo ) {
        var sourceArrowType, targetArrowType, arrowScale;
        var strokeColor = styleInfo.color;
        var strokeThickness = styleInfo.thickness;

        if( _.has( styleInfo, 'rollupStyle.sourceArrow' ) ) {
            arrowScale = _.get( styleInfo, 'rollupStyle.sourceArrow.arrowScale', 1.0 );
            sourceArrowType = _.get( styleInfo, 'rollupStyle.sourceArrow.arrowShape', 'LINE_END_TEE' );
        }
        if( _.has( styleInfo, 'rollupStyle.targetArrow' ) ) {
            arrowScale = _.get( styleInfo, 'rollupStyle.targetArrow.arrowScale', 1.0 );
            targetArrowType = _.get( styleInfo, 'rollupStyle.targetArrow.arrowShape', 'LINE_END_TEE' );
        }

        return {
            dashStyle: styleInfo.dashStyle,
            thickness: strokeThickness,
            color: strokeColor,
            sourceArrow: {
                arrowShape: sourceArrowType,
                arrowScale: arrowScale,
                fillInterior: true
            },
            targetArrow: {
                arrowShape: targetArrowType,
                arrowScale: arrowScale,
                fillInterior: true
            }
        };
    },

    /**
     * Sets roll up edge style provider based on roll up style
     *
     * @param rollUpStyle the roll up edge style
     * @param edge the df edge
     */
    _setRollUpEdgeStyleProvider: function( rollUpStyle, edge ) {
        var startArrow;
        var endArrow;
        var rollupProperty = new SDF.Models.RenderingProperties();
        var color = graphStyleUtils.parseColor( rollUpStyle.color );

        rollupProperty.setStrokeColor( color );
        rollupProperty.setStrokeWidth( rollUpStyle.thickness );
        rollupProperty.setStrokeDashArray( rollUpStyle.dashStyle );

        if( _.has( rollUpStyle, 'sourceArrow.arrowShape' ) ) {
            startArrow = createEdgeArrow( rollUpStyle.sourceArrow, rollUpStyle.color, rollUpStyle.thickness );
        }

        if( _.has( rollUpStyle, 'targetArrow.arrowShape' ) ) {
            endArrow = createEdgeArrow( rollUpStyle.targetArrow, rollUpStyle.color, rollUpStyle.thickness );
        }

        edge.setStyleProvider( new SDF.Models.CustomConnectionStyleProvider( rollupProperty, startArrow,
            endArrow ) );
    },

    /**
     * Set edge style
     *
     * @param edge the edge
     * @param style the style
     */
    setEdgeStyle: function( edge, style ) {
        if( !edge || !style ) {
            return;
        }

        var diagramView = this._diagramView;
        diagramView.beginTransaction();
        // set edge arrow
        if( style.sourceArrow ) {
            var startArrow = createEdgeArrow( style.sourceArrow, style.color, style.thickness );
            edge.setStartArrow( startArrow );
        } else {
            edge.setStartArrow( null );
        }
        if( style.targetArrow ) {
            var endEdgeArrow = createEdgeArrow( style.targetArrow, style.color, style.thickness );
            edge.setEndArrow( endEdgeArrow );
        } else {
            edge.setEndArrow( null );
        }

        var segments = graphStyleUtils.generateDashSegments( style.dashStyle );

        var propertyObj = edge.getRenderingProperties();

        var strokeColor = graphStyleUtils.parseColor( style.color );

        propertyObj.setStrokeColor( strokeColor );
        propertyObj.setStrokeWidth( style.thickness );
        propertyObj.setStrokeDashArray( segments );

        edge.setRenderingProperties( propertyObj );

        // for rollup style
        if( _.has( style, 'rollupStyle' ) ) {
            this._setRollUpEdgeStyleProvider( this._getRollUpEdgeStyle( style ), edge );
        }

        // create ports
        this.setPortStyle( edge.getStart(), style.sourcePortStyle );
        this.setPortStyle( edge.getEnd(), style.targetPortStyle );

        // Set the connection type
        var itemData = edge.getAppObj();
        if( itemData ) {
            itemData.isHotSpotEdge = style.isHotSpotEdge;
        }

        // if edge is edge with indicator, then set indicator styles
        if( style.indicator ) {
            var indicator = style.indicator;
            var options = {
                strokesWidth: indicator.strokesWidth,
                strokesColor: graphStyleUtils.parseColor( indicator.strokesColor ),
                fillColor: graphStyleUtils.parseColor( indicator.fillColor ),
                scale: indicator.scale,
                position: indicator.position
            };

            if( !edge.pmei ) {
                edge.pmei = pmeiUtils.createPMEI( edge, options );
            }
            edge.pmei.show();
        }

        edge.style = style;
        diagramView.endTransaction();
    },

    createIshikawaEdgeStyle: function( style ) {
        if( !style ) {
            return null;
        }
        var startArrow = null;
        var targetArrow = null;
        var thickness = style.thickness;

        if( style.sourceArrow ) {
            startArrow = createEdgeArrow( style.sourceArrow, style.color, thickness );
        }
        if( style.targetArrow ) {
            targetArrow = createEdgeArrow( style.targetArrow, style.color, thickness );
        }

        var segments = graphStyleUtils.generateDashSegments( style.dashStyle );

        var strokeColor = graphStyleUtils.parseColor( style.color );

        return { strokeColor, thickness, segments, startArrow, targetArrow };
    },

    /**
     * Get the labels contained in this graph
     *
     * @return the labels contained in this graph
     */
    getLabels: function() {
        return this._diagramView.getElementsByType( 'Annotation' );
    },

    /**
     * Get the nodes contained in this graph
     *
     * @return the nodes contained in this graph
     */
    getNodes: function() {
        return _.filter( this._diagramView.getElementsByType( 'Node' ), function( node ) {
            return !node.getIsContainer();
        } );
    },

    /**
     * Get the edges contained in this graph
     *
     * @return the edges contained in this graph
     */
    getEdges: function() {
        return this._diagramView.getElementsByType( 'Connection' );
    },

    /**
     * Get the ports contained in this graph
     *
     * @return the ports contained in this graph
     */
    getPorts: function() {
        return this._diagramView.getElementsByType( 'Port' );
    },

    /**
     * Get the boundaries contained in this graph
     *
     * @return the boundaries contained in this graph
     */
    getBoundaries: function() {
        return _.filter( this._diagramView.getElementsByType( 'Node' ), function( node ) {
            return node.getIsContainer();
        } );
    },

    /**
     * Get the visible labels contained in this graph
     *
     * @return the visible labels contained in this graph
     */
    getVisibleLabels: function() {
        return internalGraphUtils.getVisibleItems( this.getLabels() );
    },

    /**
     * Get the visible nodes contained in this graph
     *
     * @return the visible nodes contained in this graph
     */
    getVisibleNodes: function() {
        return internalGraphUtils.getVisibleItems( this.getNodes() );
    },

    /**
     * Get the visible edges contained in this graph
     *
     * @return the visible edges contained in this graph
     */
    getVisibleEdges: function() {
        return internalGraphUtils.getVisibleItems( this.getEdges() );
    },

    /**
     * Get the visible ports contained in this graph
     *
     * @return the visible ports contained in this graph
     */
    getVisiblePorts: function() {
        return internalGraphUtils.getVisibleItems( this.getPorts() );
    },

    /**
     * Get the visible boundaries contained in this graph
     *
     * @return the visible boundaries contained in this graph
     */
    getVisibleBoundaries: function() {
        return internalGraphUtils.getVisibleItems( this.getBoundaries() );
    },

    /**
     * Assign label Content for graph node/port/edge/label items
     *
     * @param {Node | Port | Edge | Label } the item to assign label
     * @param {String} labelText the text of the label
     * @param {value} the node label configuration {hasBorder : show border for the label, default is false;
     *            orientation : Put the label depends on node , default is center; width : the label max width,
     *            wordWrap : true wrap the text based on the width. default is true; textAlignment : the text
     *            alignment. textStyle: the text style; backgroundStyle: the background style; rx, ry: the
     *            radii for the border}.
     */
    setLabel: function( item, labelText, configuration ) {
        if( !item ) {
            return;
        }

        this._diagramView.beginTransaction();

        var sheet = this._sheet;
        var defaults = this._graphModel.config.defaults;
        var labelPreferences = {};
        var _labelPreferences = _.assign( labelPreferences, this._labelPreferences, defaults.label );
        if( item instanceof SDF.Models.Node ) {
            // maxWidth is a default property for all label, but not suitable for node label since node label width is defined by its owner
            delete _labelPreferences.maxWidth;
            if( item.getItemType() === 'Boundary' ) {
                assignNodeLabel( sheet, item, labelText, _.assign( _labelPreferences, defaults.boundaryLabel, configuration ) );
            } else {
                assignNodeLabel( sheet, item, labelText, _.assign( _labelPreferences, defaults.nodeLabel, configuration ) );
            }
        } else if( item instanceof SDF.Models.Port ) {
            assignPortLabel( sheet, item, labelText, _.assign( _labelPreferences, defaults.portLabel ) );
        } else if( item instanceof SDF.Models.Connection ) {
            assignEdgeLabel( sheet, item, labelText, _.assign( _labelPreferences, defaults.edgeLabel ) );
        } else if( item instanceof SDF.Models.Annotation ) {
            item.setText( labelText );
        }

        this._diagramView.endTransaction();
    },

    /**
     * Api to set / get textOverflow
     *
     * @param { mode } the mode, options are: TextOverflow.NONE, TextOverflow.TRUNCATE, TextOverflow.ELLIPSIS
     * @return {value} the mode
     */
    labelTextOverflow: function( mode ) {
        if( arguments && arguments.length > 0 ) {
            if( this._labelPreferences.textOverflow !== arguments[ 0 ] ) {
                this._labelPreferences.textOverflow = arguments[ 0 ];
                this._diagramView.getSheetConfigurationData().truncationMode = graphConstants.TextOverflow[ this._labelPreferences.textOverflow ];
            }
        } else {
            return this._labelPreferences.textOverflow;
        }
    },

    /**
     * Show or hide all labels for current graph
     *
     * @param visible true for show, false for hide
     */
    showLabels: function( visible ) {
        this.setVisible( this.getLabels(), visible );
    },

    /**
     * Update graph without caring about the disgusting beginTransaction and endTransaction.
     *
     * @param actionFn the action function passed to modify the graph
     */
    update: function( actionFn ) {
        this._diagramView.update( actionFn );
    },

    /**
     * Update graph on new graph items added. Graph filters will be applied to the new items.
     * Event "awGraph.itemsAdded" will be fired.
     *
     * @param {Array} items the new added graph items
     */
    updateOnItemsAdded: function( items ) {
        if( !_.isArray( items ) || items.length === 0 ) {
            return;
        }

        var groupedItems = internalGraphUtils.groupItems( items );
        graphFilterSvc.applyFilter( this._graphModel );

        internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.itemsAdded', {
            nodes: groupedItems.Node || [],
            edges: groupedItems.Edge || [],
            ports: groupedItems.Port || [],
            boundaries: groupedItems.Boundary || []
        } );
    },

    /**
     * The graph view is network mode or not
     *
     * @return true of false true: network mode, false: nested mode
     *
     */
    isNetworkMode: function() {
        return this._diagramView.getManager().getSheet().getGroupViewMode();
    },

    /**
     * Creates the boundary with specified rectangle, style.
     *
     * @param {object} rect - The boundary rectangle
     * @param {object} style - The boundary style instance. Can be null.
     * @return the new boundary instance
     */
    createBoundary: function( rect, style ) {
        this._diagramView.beginTransaction();
        if( style && style.styleClass ) {
            style.styleClass = style.styleClass && style.styleClass.indexOf( 'aw-graph-boundary' ) < 0 ? 'aw-graph-boundary ' + style.styleClass : style.styleClass;
        } else {
            if( !style ) {
                style = {};
            }
            style.styleClass = 'aw-graph-boundary';
        }
        var node = this.createNodeWithBoundsStyleAndTag( rect, style );
        if( !node ) {
            return;
        }
        node.setIsContainer( true );
        if( style.boundaryPaddings ) {
            var paddings = [ style.boundaryPaddings.top,
                style.boundaryPaddings.bottom,
                style.boundaryPaddings.left,
                style.boundaryPaddings.right
            ];
            node.setNodePaddings( paddings );
        }
        this._diagramView.endTransaction();
        return node;
    },

    /**
     * Remove boundaries from graph.
     * The 'awGraph.itemsRemoved' event will be fired.
     *
     * @param boundaries the boundaries to remove.
     */
    removeBoundaries: function( boundaryList ) {
        if( !boundaryList || boundaryList.length <= 0 ) {
            return;
        }
        this._deleteElements( boundaryList );

        internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.itemsRemoved', {
            boundaries: boundaryList
        } );
    },

    /**
     * Set boundary style.
     *
     * @param boundary The boundary that will be assigned the new style
     * @param style The style instance that will be assigned to the boundary.
     */
    setBoundaryStyle: function( boundary, boundaryStyle ) {
        if( !boundary || !boundaryStyle ) {
            return;
        }
        this.setNodeStyle( boundary, boundaryStyle );
    },
    /**
     * Set the view mode of the graph view to network mode or not
     *
     * @param isNetworkMode set network view mode or not. true: network mode, false: nested mode
     *
     */
    setNetworkMode: function( isNetworkMode ) {
        this._graphModel.config.isNetworkMode = isNetworkMode;
        if( isNetworkMode ) {
            this._diagramView.switchGroupViewMode( SDF.Utils.GroupViewMode.Tree );
        } else {
            this._diagramView.switchGroupViewMode( SDF.Utils.GroupViewMode.Nested );
        }
    },

    /**
     * Update word wrapping on node.
     *
     * @param nodes the nodes needing to wrap word
     *
     */
    updateWordWrapping: function( nodes ) {
        if( !nodes ) {
            return;
        }
        var graphOverlay = this._graphOverlay;
        if( graphOverlay ) {
            var overlayNode = graphOverlay.getOverlayNode();
            if( overlayNode ) {
                var overlayNodeChange = graphWordWrappingService.applyWordWrap( this._graphContainer,
                    overlayNode, true );
                if( overlayNodeChange ) {
                    graphOverlay.setHeightValue( overlayNodeChange.currentWrappedHeight );
                }
            }
        }

        var wrappedHeightChangedNodes = [];
        for( var index = 0; index < nodes.length; ++index ) {
            var changedNode = graphWordWrappingService.applyWordWrap( this._graphContainer,
                nodes[ index ], true );

            if( changedNode ) {
                wrappedHeightChangedNodes.push( changedNode );
            }
        }

        if( wrappedHeightChangedNodes.length > 0 ) {
            graphWordWrappingService.updateNodeHeightForWrapping( this._graphModel, wrappedHeightChangedNodes );

            internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.wrappedHeightChanged', {
                wrappedHeightChangedNodes: wrappedHeightChangedNodes
            } );
        }
    },

    // 07/26/2021 Add the following APIs
    /**
     * This method returns the rotation angle. The origin of the rotation is the element's anchor point.
     *
     * @param {SheetElement} item - the element needs to get the rotation
     *
     */
    getRotation: function ( item ) {
        return item.getRotation();
    },

    /**
     * Set the rotation angle. The origin of the rotation is the element's anchor point.
     * @param {SheetElement} item - the element needs to set the rotation
     * @param {Number} angle
     */
    setRotation: function( item, angle ) {
        item.setRotation( angle );
    },

    /**
     * Get the mirror status along x-axis in the SheetElement’s coordinate system
     *
     * @param {SheetElement} item
     * @returns {Boolean} - true - the element has been mirrored along x-axis, otherwise not
     */
    getMirrorX: function( item ) {
        return item.getMirrorX();
    },

    /**
     * Set the element along x-axis mirrored in the SheetElement’s coordinate system.
     *
     * @param {SheetElement} item - the element needs to set the flag
     * @param {Boolean} mirrorX - flag will be set
     */
    setMirrorX: function( item, mirrorX ) {
        item.setMirrorX( mirrorX );
    },

    /**
     * Get the mirror status along y-axis in the SheetElement’s coordinate system
     *
     * @param {SheetElement} item - the element needs to get the mirror status along y-axis
     * @returns {Boolean} - true - the element has been mirrored along y-axis, otherwise not
     */
     getMirrorY: function( item ) {
        return item.getMirrorY();
    },

    /**
     * Set the element along y-axis mirrored in the SheetElement’s coordinate system.
     *
     * @param {SheetElement} item - the element needs to set the y-axis mirror flag
     * @param {Boolean} mirrorY - flag will be set
     */
     setMirrorY: function( item, mirrorY ) {
        item.setMirrorY( mirrorY );
    }
};

/**
 * Assign node label
 *
 * @param {Sheet} the sheet as the label container
 * @param {node} node the node to assign label
 * @param {String} labelText the text of the label
 */
var assignNodeLabel = function( sheet, node, labelText, configuration ) {
    var label = node.getLabel();
    if( !label ) {
        label = createNodeAnnotation( sheet, node, labelText, configuration );
        node.setLabel( label );
    } else {
        label.setText( labelText );
    }

    if( node.getItemType() === 'Boundary' ) {
        if( configuration ) {
            configuration.contentStyleClass = configuration.contentStyleClass || 'aw-graph-boundaryLabel';
            if( configuration.contentStyleClass.indexOf( 'aw-graph-boundaryLabel' ) === -1 ) {
                configuration.contentStyleClass += ' aw-graph-boundaryLabel';
            }
        } else {
            configuration = {};
            configuration.contentStyleClass = 'aw-graph-boundaryLabel';
        }
    }

    if( configuration ) {
        if( configuration.contentStyleClass || configuration.backgroundStyleClass ) {
            label.setStyle( configuration.contentStyleClass, configuration.backgroundStyleClass );
        }
        var symOcc = label.getOccurrences();
        var textSymbol = symOcc[ 0 ].getSymbol();
        // add observer must be called after set style class, or the default style can't be removed.
        if( configuration.sizeBinding ) {
            var sizeObserverObject = new SDF.Models.SizeObserverObject( sheet );
            sizeObserverObject.setObserverObject( node );
            sizeObserverObject.setReferenceObject( label );
            sizeObserverObject.setWidth( configuration.maxWidth );
            sizeObserverObject.setHeight( 'h' ); // $NON-NLS-1$

            textSymbol.addObserver( sizeObserverObject );
        }

        if( configuration.textAlignment ) {
            textSymbol.setAlignment( graphConstants.TextAlignment[ configuration.textAlignment ] );
        }
    }
};

/**
 * Assign edge label.
 *
 * @param {Sheet} the sheet as the label container
 * @param {Connection} edge the edge to assign label
 * @param {String} labelText the text of the label
 */
var assignEdgeLabel = function( sheet, edge, labelText, labelPreferences ) {
    var placementRule = new SDF.Models.ConnectionLabelPlacementRule();
    var placementPosition = SDF.Utils.ConnectionLabelPositionOption.CENTER_OF_LONGEST_SEGMENT_HORIZONTAL;
    if( labelPreferences.placementRule && labelPreferences.placementRule.positionOption ) {
        var positionOption = labelPreferences.placementRule.positionOption;
        if( SDF.Utils.ConnectionLabelPositionOption[ positionOption ] ) {
            placementPosition = SDF.Utils.ConnectionLabelPositionOption[ positionOption ];
        }
    }
    placementRule.setPlacementPosition( placementPosition );
    var rotationMode = SDF.Utils.ConnectionLabelRotationMode.AlongWithSegment;
    if( labelPreferences.placementRule && labelPreferences.placementRule.rotationMode ) {
        var rotationModeConfig = labelPreferences.placementRule.rotationMode;
        if( SDF.Utils.ConnectionLabelRotationMode[ rotationModeConfig ] ) {
            rotationMode = SDF.Utils.ConnectionLabelRotationMode[ rotationModeConfig ];
        }
    }
    placementRule.setRotationMode( rotationMode );
    placementRule.setUserOffsetUpdateMode( SDF.Utils.ConnectionLabelOffsetUpdateMode.NONE );

    var locationRule = new SDF.Models.ConnectionLabelLocationRule();
    locationRule.setOffsetPosition( SDF.Utils.ConnectionLabelOffsetOption.NONE );

    var strategy = new SDF.Utils.EdgeLabelMoveStrategy( edge, labelPreferences.maxMoveDistance );

    assignLabelGeneral( sheet, edge, labelText, labelPreferences.maxWidth, placementRule, strategy, labelPreferences,
        function( label ) {
            var location = label.getLocation();

            location.setReference( edge, false );
            location.setLocationRule( locationRule );
            location.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, 0 );
            location.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.Y, 0 );
            location.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 0 );
            location.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, 0 );

            label.setStyle( labelPreferences.contentStyleClass, labelPreferences.backgroundStyleClass );
            label.setColor( null, graphStyleUtils.parseColor( labelPreferences.backgroundFillColor ) );
            label.setAnchor( labelPreferences.textAnchor, labelPreferences.backgroundAnchor );
        } );
};

/**
 * Assign port label
 *
 * @param {Sheet} the sheet as the label container
 * @param {Port} port the port to assign label
 * @param {String} labelText the text of the label
 */
var assignPortLabel = function( sheet, port, labelText, labelPreferences ) {
    var placementRule = SDF.Models.PortLabelPlacementRule.getDefaultRule();
    var flipOption = 0;
    if( labelPreferences.placementRule ) {
        var portLabelPlacementRuleConfig = labelPreferences.placementRule;
        if( graphConstants.PortLabelPlacementRule[ portLabelPlacementRuleConfig ] ) {
            flipOption = graphConstants.PortLabelPlacementRule[ portLabelPlacementRuleConfig ];
        }
    }
    if( placementRule ) {
        placementRule.setFlipOption( flipOption );
    }

    var strategy = new SDF.Utils.InsideBoundaryMoveStrategy( port, labelPreferences.maxMoveDistance );

    assignLabelGeneral( sheet, port, labelText, labelPreferences.maxWidth, placementRule, strategy, labelPreferences,
        function( label ) {
            // AW-66824 - GC: Save/recall port label get wrong offset
            // to make the anchor works
            label.setStyle( labelPreferences.contentStyleClass, labelPreferences.backgroundStyleClass );
            label.setColor( null, graphStyleUtils.parseColor( labelPreferences.backgroundFillColor ) );
            label.setAnchor( labelPreferences.textAnchor, labelPreferences.backgroundAnchor );

            var location = label.getLocation();
            location.setReference( port, false );
            location.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.X, 0 );
            location.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, 0 );
            location.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.X, 0 );
            location.setInput( SDF.Utils.CoordinateMode.ABSOLUTE, SDF.Utils.Axis.Y, 0 );
        } );
};

/**
 * Get related graph items(nodes, edges, ports) based on the input nodes.
 *
 * @param {Array} the graph nodes array
 * @param syncGroupDescendantsVisibility, default true, flag to control
 *        whether or not to sync visibilty for a Group node and it's descendants
 * @return {Object} the related graph items
 */
var getRelatedNodesEdgesAndPorts = function( nodes, syncGroupDescendantsVisibility ) {
    if( !nodes || nodes.length === 0 ) {
        return;
    }

    // collect all related
    var allChildNodes = [];
    var edges = [];
    var ports = [];
    _.forEach( nodes, function( node ) {
        if( node.isGroupingAllowed() && syncGroupDescendantsVisibility ) {
            var childNodes = _.filter( node.getAllMembers(), function( child ) {
                return child instanceof SDF.Models.Node;
            } );
            allChildNodes = allChildNodes.concat( childNodes );

            _.forEach( childNodes, function( child ) {
                edges = edges.concat( child.getEdges() );
                ports = ports.concat( child.getPorts() );
            } );
        }
        edges = edges.concat( node.getEdges() );
        ports = ports.concat( node.getPorts() );
    } );

    return {
        nodes: _.uniq( allChildNodes ),
        edges: _.uniq( edges ),
        ports: _.uniq( ports )
    };
};

/**
 * Get all ports with the related edges.
 *
 * @param edges the edge array
 * @param excludedPorts the port won't be get.
 * @return the candidate ports
 */
var getEdgeRelatedPorts = function( edges, excludedPorts ) {
    var relatedPorts = [];
    _.forEach( edges, function( edge ) {
        var startPort = edge.getStart();
        var endPort = edge.getEnd();
        if( startPort ) {
            relatedPorts.push( startPort );
        }

        if( endPort ) {
            relatedPorts.push( endPort );
        }
    } );

    relatedPorts = _.uniq( relatedPorts );
    if( excludedPorts ) {
        relatedPorts = _.difference( relatedPorts, excludedPorts );
    }

    return relatedPorts;
};

/**
 * Classify the related ports to remove or hide based on the flags.
 *
 * @param {Array} ports the port array
 * @param {Boolean} hideSingle hide single port or not
 * @param {Boolean} removeSingle remove single port or not
 * @return {Array} the candidate ports
 */
var classifyPortsForHideRemove = function( ports, hideSingle, removeSingle ) {
    var hidePorts = [];
    var removePorts = [];
    if( ports ) {
        _.forEach( ports, function( port ) {
            var edges = port.getConnections();
            if( port.getConnections().length === 0 ) {
                if( removeSingle || !port.hasSymbol() ) {
                    removePorts.push( port );
                }
            } else {
                var isAllHidden = true;
                for( var index = 0; index < edges.length; ++index ) {
                    if( !edges[ index ].isFiltered() ) {
                        isAllHidden = false;
                        break;
                    }
                }

                if( isAllHidden && ( hideSingle || !port.hasSymbol() ) ) {
                    hidePorts.push( port );
                }
            }
        } );
    }

    var result = {
        removePorts: removePorts,
        hidePorts: hidePorts
    };

    return result;
};
/**
 * Remove already existed images
 *
 * @param symbols symbols which includes images
 * @param dfport port object
 */
var removeImageAlreadyExists = function( symbols, port ) {
    if( symbols.length > 1 ) {
        var imageSymbolOcc = symbols[ 1 ];
        imageSymbolOcc.setVisible( false );
        imageSymbolOcc.remove();
        port.removeSymbol( imageSymbolOcc );
    }
};

/**
 * Create port image occurrence
 *
 * @param style the port style
 * @return the created port image occurrence
 */
var createPortImageOccurrence = function( style ) {
    if( !style ) {
        return;
    }
    var iconId = style.iconId;
    var imageSVGString = null;
    if( iconId ) {
        imageSVGString = iconService.getIcon( iconId );
    }
    if( !imageSVGString ) {
        imageSVGString = style.imageSVGString;
    }
    if( imageSVGString && imageSVGString.length > 1 ) {
        var portImageSVG = SDF.Models.SVG.create( imageSVGString );
        portImageSVG.setAnchorX( 0.5 );
        portImageSVG.setAnchorY( 0.5 );
        return new SDF.Models.SymbolOccurrence( 0, 0, portImageSVG );
    }
    var imageUrl = style.imageUrl;
    if( imageUrl && imageUrl.length > 1 ) {
        var portImage = new SDF.Models.BitMap( imageUrl );
        portImage.setAnchorX( 0.5 );
        portImage.setAnchorY( 0.5 );
        portImages.imageUrl = portImage;
        return new SDF.Models.SymbolOccurrence( 0, 0, portImage );
    }
    return null;
};

/**
 * Create port symbol occurrence.
 *
 * @param style the port style
 * @return created occurrence
 */
var createPortSymbolOccurrence = function( style ) {
    var portSymbol = null;
    var portShape = style.portShape;
    if( portShape && portShapes && portShapes[ portShape ] ) {
        portSymbol = portShapes[ portShape ];
    }
    if( !portSymbol ) {
        if( portShape === graphConstants.PortShape.VOID ) {
            portSymbol = new SDF.Models.Symbol();
        } else if( portShape === graphConstants.PortShape.SQUARE ) {
            portSymbol = new SDF.Models.Rectangle();
            if( style.rx && style.ry ) {
                portSymbol.setCornerRadius( style.rx, style.ry );
            }
        } else {
            portSymbol = new SDF.Models.Ellipse();
        }
        portSymbol.setAnchorX( 0.5 );
        portSymbol.setAnchorY( 0.5 );
        portShapes[ portShape ] = portSymbol;
    }
    if( portSymbol ) {
        return new SDF.Models.SymbolOccurrence( 0, 0, portSymbol );
    }
    return null;
};

/**
 * Create symbol occurrence for edge arrow
 *
 * @param arrowColor the arrow color
 * @param arrowStyle the arrow style
 * @param inStrokeWidth the arrow stroke width
 * @return symbol occurrence for edge arrow
 */
var createEdgeArrow = function( arrowStyle, arrowColor, inStrokeWidth ) {
    var arrowSymbol = null;
    var arrowShape = arrowStyle.arrowShape;
    var size = 10.0 * arrowStyle.arrowScale;
    var strokeWidth = inStrokeWidth;
    var arrowSymbolOcc = null;
    if( arrowShape === graphConstants.ArrowType.SIMPLE ) {
        arrowSymbol = arrowShapes[ arrowShape ];
        if( !arrowSymbol ) {
            arrowSymbol = new SDF.Models.Arrow( 0 );
            arrowShapes[ arrowShape ] = arrowSymbol;
        }
    } else if( arrowShape === graphConstants.ArrowType.CIRCLE ) {
        arrowSymbol = arrowShapes[ arrowShape ];
        if( !arrowSymbol ) {
            arrowSymbol = new SDF.Models.Ellipse();
            arrowShapes[ arrowShape ] = arrowSymbol;
        }
    } else if( arrowShape === graphConstants.ArrowType.TRIANGLE ) {
        size = 8.66 * arrowStyle.arrowScale;
        if( arrowStyle.fillInterior ) {
            var arrowName = arrowShape + '_fillInterior'; // $NON-NLS-1$
            arrowSymbol = arrowShapes[ arrowName ];
            if( !arrowSymbol ) {
                var arrow = '<g><svg width=\'100%\' height= \'100%\' viewBox=\'0 0 8.66 10\' preserveAspectRatio=\'none\'><path d=\'M 0 0 L 8.66 5 0 10z\' style=\'stroke-width:0\' ></path></svg></g>';
                arrowSymbol = new SDF.Models.Arrow( arrow );
                arrowShapes[ arrowName ] = arrowSymbol;
            }
        } else {
            arrowSymbol = arrowShapes[ arrowShape ];
            if( !arrowSymbol ) {
                var arrow2 = '<g><svg width=\'100%\' height= \'100%\' viewBox=\'0 0 8.66 10\' preserveAspectRatio=\'none\'><path d=\'M 0 0 L 8.66 5 0 10z\' fill=\'rgba(244,244,244,1)\' style=\'stroke-width:' +
                    strokeWidth + '\'></path></svg></g>';
                arrowSymbol = new SDF.Models.Arrow( arrow2 );
                arrowShapes[ arrowShape ] = arrowSymbol;
            }
        }
    } else if( arrowShape === graphConstants.ArrowType.LINE_END_TEE ) {
        arrowSymbol = arrowShapes[ arrowShape ];
        if( !arrowSymbol ) {
            arrowSymbol = new SDF.Models.Arrow( 3 );
            arrowShapes[ arrowShape ] = arrowSymbol;
        }
        strokeWidth *= 2;
    } else {
        var arrowShapeName = graphConstants.ArrowType.DEFAULT;
        arrowSymbol = arrowShapes[ arrowShapeName ];
        if( !arrowSymbol ) {
            arrowSymbol = new SDF.Models.Arrow( 0 );
            arrowShapes[ arrowShapeName ] = arrowSymbol;
        }
    }
    arrowSymbolOcc = createSymbolOccurrence( arrowSymbol, size, size );
    var propertyObj = arrowSymbolOcc.getRenderingProperties();

    var color = graphStyleUtils.parseColor( arrowColor );

    if( arrowStyle.fillInterior ) {
        propertyObj.setFillColor( color );
    }
    propertyObj.setStrokeColor( color );
    propertyObj.setStrokeWidth( strokeWidth );
    return arrowSymbolOcc;
};

/**
 * create arrow symbol occurrence
 *
 * @param arrowSymbol arrow symbol
 * @param width width
 * @param height height
 * @return symbol occurrence
 */
var createSymbolOccurrence = function( arrowSymbol, width, height ) {
    arrowSymbol.setAnchorX( 1.0 );
    arrowSymbol.setAnchorY( 0.5 );
    return new SDF.Models.SymbolOccurrence( width, height, arrowSymbol );
};

/**
 * Helper method to create a graph instance.
 *
 * @param graphModel the graph model object
 * @param diagramView the diagram view object
 */
export let createGraph = function( graphModel, diagramView, graphContainer ) {
    return new exports.Graph( graphModel, diagramView, graphContainer );
};

export default exports = {
    Graph,
    createGraph
};
/**
 * The factory to create graph service.
 *
 * @member graphService
 * @memberof NgServices
 */
app.factory( 'graphService', () => exports );
