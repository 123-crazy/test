// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines the required extended functions for SDF lib
 *
 * @module js/SDFExtension
 */
import _ from 'lodash';
import graphConstants from 'js/graphConstants';

'use strict';

var exports = {};

export let extend = function( SDF ) {
    /**
     * get label position
     *
     * @return label position, format is \{x: x, y: y\}
     */
    SDF.Models.Annotation.prototype.getPosition = function() {
        return this.getRenderingPosition();
    };
    /**
     * set label position
     *
     * @param position the position, format is \{x: x, y: y\}. if set to null will reset position to default
     */
    SDF.Models.Annotation.prototype.setPosition = function( position ) {
        var rule = this.getPlacementRule();
        if( !position && rule ) {
            // reset position
            rule.resetPosition();
        } else if( position ) {
            this.setRenderingPosition( position.x, position.y );
        }
    };

    /**
     * api to reset label position
     */
    SDF.Models.Annotation.prototype.resetPosition = function() {
        this.setPosition();
    };

    /**
     * get textBoxOcc, backgroundOcc for this label
     *
     * @return [ textBoxOcc, backgroundOcc ]
     */
    SDF.Models.Annotation.prototype.getOccurrences = function() {
        var symbolOccs = this.getSymbols();
        var textBoxOcc = null;
        var backgroundOcc = null;

        for( var i = 0; i < symbolOccs.length; i++ ) {
            var symbol = symbolOccs[ i ].getSymbol();
            if( symbol instanceof SDF.Models.TextBox ) {
                textBoxOcc = symbolOccs[ i ];
            } else if( symbol instanceof SDF.Models.Rectangle ) {
                backgroundOcc = symbolOccs[ i ];
            }
        }

        return [ textBoxOcc, backgroundOcc ];
    };

    /**
     * Set the CSS for label content and its border
     *
     * @param cssLabelContent CSS name for label content
     * @param cssBackground CSS name for background and border
     */
    SDF.Models.Annotation.prototype.setStyle = function( cssLabelContent, cssBackground ) {
        var occs = this.getOccurrences();
        var textBoxOcc = occs[ 0 ];
        var backgroundOcc = occs[ 1 ];

        if( textBoxOcc ) {
            var textRenderingProperties = textBoxOcc.getRenderingProperties();
            textRenderingProperties.setStyleClass( cssLabelContent );

            // Clear the inline style of fontfamily and fontsize which DF creates
            textRenderingProperties.setFontFamily();
            textRenderingProperties.setFontSize();
        }

        if( backgroundOcc ) {
            backgroundOcc.getRenderingProperties().setStyleClass( cssBackground );
        }
    };

    /**
     * Set the anchor for label content and its border
     *
     * @param contentAnchor
     * @param backgroundAnchor
     */
    SDF.Models.Annotation.prototype.setAnchor = function( contentAnchor, backgroundAnchor ) {
        var occs = this.getOccurrences();
        var textBoxOcc = occs[ 0 ];
        var backgroundOcc = occs[ 1 ];

        if( textBoxOcc && contentAnchor ) {
            textBoxOcc.getSymbol().setAnchorX( contentAnchor[ 0 ] );
            textBoxOcc.getSymbol().setAnchorY( contentAnchor[ 1 ] );
        }

        if( backgroundOcc && backgroundAnchor ) {
            backgroundOcc.getSymbol().setAnchorX( backgroundAnchor[ 0 ] );
            backgroundOcc.getSymbol().setAnchorY( backgroundAnchor[ 1 ] );
        }
    };

    /**
     * Set the color for label content and it's background
     *
     * @param contentColor
     * @param backgroundColor
     */
    SDF.Models.Annotation.prototype.setColor = function( contentColor, backgroundColor ) {
        var occs = this.getOccurrences();
        var textBoxOcc = occs[ 0 ];
        var backgroundOcc = occs[ 1 ];

        if( textBoxOcc && contentColor ) {
            textBoxOcc.getRenderingProperties().setFillColor( contentColor );
        }

        if( backgroundOcc && backgroundColor ) {
            backgroundOcc.getRenderingProperties().setFillColor( backgroundColor );
        }
    };

    /**
     * Set allowWrapping
     *
     * @param allowWrapping allowWrapping or not
     */
    SDF.Models.Annotation.prototype.allowWrapping = function( allowWrapping ) {
        var symbolOccs = this.getSymbols();
        var textBox = null;

        for( var i = 0; i < symbolOccs.length; i++ ) {
            var symbol = symbolOccs[ i ].getSymbol();
            if( symbol instanceof SDF.Models.TextBox ) {
                textBox = symbol;
                break;
            }
        }

        if( textBox !== null ) {
            textBox.setAllowWrapping( allowWrapping );
        }
    };

    /**
     * Set text alignment mode of the label
     *
     * @param textAlignment 0-10 for left, center, right, justified, starting, middle, ending, top, alphabetical,
     *            central, hanging
     */
    SDF.Models.Annotation.prototype.setTextAlignment = function( textAlignment ) {
        var symbolOccs = this.getSymbols();
        var textBox = null;

        for( var i = 0; i < symbolOccs.length; i++ ) {
            var symbol = symbolOccs[ i ].getSymbol();
            if( symbol instanceof SDF.Models.TextBox ) {
                textBox = symbol;
                break;
            }
        }

        if( textBox !== null ) {
            textBox.setAlignment( textAlignment );
        }
    };
    /**
     * Set the margin for the text within the TextBox
     *
     * @param top top margin
     * @param left left margin
     * @param bottom bottom margin
     * @param right right margin
     */
    SDF.Models.Annotation.prototype.setTextMargin = function( top, left, bottom, right ) {
        var symbolOccs = this.getSymbols();
        var textBox = null;

        for( var i = 0; i < symbolOccs.length; i++ ) {
            var symbol = symbolOccs[ i ].getSymbol();
            if( symbol instanceof SDF.Models.TextBox ) {
                textBox = symbol;
                break;
            }
        }

        if( textBox !== null ) {
            textBox.setMargin( new SDF.Utils.Margin( top, left, bottom, right ) );
        }
    };

    /**
     * Get the margin for the text within the TextBox
     *
     * @return integer array if the margin existing.
     */
    SDF.Models.Annotation.prototype.getTextMargin = function() {
        var symbolOccs = this.getSymbols();
        var textBox = null;
        var marginArray = [];

        for( var i = 0; i < symbolOccs.length; i++ ) {
            var symbol = symbolOccs[ i ].getSymbol();
            if( symbol instanceof SDF.Models.TextBox ) {
                textBox = symbol;
                break;
            }
        }

        if( textBox !== null ) {
            var labelMargin = textBox.getMargin();
            if( labelMargin ) {
                marginArray[ 0 ] = labelMargin.top;
                marginArray[ 1 ] = labelMargin.left;
                marginArray[ 2 ] = labelMargin.bottom;
                marginArray[ 3 ] = labelMargin.right;
            }
        }

        return marginArray;
    };

    SDF.DiagramView.prototype.update = function( action ) {
        if( typeof action === 'function' ) {
            this.beginTransaction();
            action();
            this.endTransaction();
        }
    };

    SDF.DiagramView.prototype.initRenderingPerformanceStopWatch = function() {
        var startDate;
        console.log( 'Init a rendering stop watch ...' );
        this.getPerformanceCounter().registerWorkerTaskCallback( function() {
            startDate = new Date();
        }, function() {
            var currentDate = new Date();
            var duration = ( currentDate.getTime() - startDate.getTime() ) / 1000;
            if( duration > 0.5 ) {
                var str = 'Capture event: graphRenderDone.' + ' Details: start=' + startDate.toISOString() +
                    ', duration=' + duration.toString() + 's';
                console.log( str );
            }
            var detailData = {
                'GCF.graphRenderDone.startedDateTime.Render_Start_Time': startDate.toISOString(),
                'GCF.graphRenderDone.time.Render_Duration': duration.toString()
            };
            // On IE11, While a window.CustomEvent object exists, it cannot be called as a constructor. Instead of new CustomEvent(...),
            // you must use document.createEvent('CustomEvent') and then e.initCustomEvent(...)
            var event;
            if( CustomEvent instanceof Function ) {
                event = new CustomEvent( 'graphRenderDone', {
                    detail: detailData
                } );
            } else {
                event = document.createEvent( 'CustomEvent' );
                event.initCustomEvent( 'graphRenderDone', true, true, detailData );
            }

            if( event ) {
                document.dispatchEvent( event );
            }
        } );
    };

    // extend DF models to add more useful APIs
    SDF.Models.Node.prototype.getSVG = function() {
        var svg = null;
        if( this.hasSymbol() ) {
            var symbol = this.getSymbols()[ 0 ].getSymbol();
            if( symbol instanceof SDF.Models.SVG ) {
                svg = symbol;
            }
        }

        return svg;
    };

    SDF.Models.Connection.prototype.getSourceNode = function() {
        var sourcePort = this.getStart();
        if( sourcePort ) {
            return sourcePort.getOwner();
        }
        return null;
    };
    SDF.Models.Connection.prototype.getTargetNode = function() {
        var targetPort = this.getEnd();
        if( targetPort ) {
            return targetPort.getOwner();
        }
        return null;
    };
    SDF.Models.Connection.prototype.getSourcePort = function() {
        return this.getStart();
    };
    SDF.Models.Connection.prototype.getTargetPort = function() {
        return this.getEnd();
    };

    /**
     * Get the sheet element filter state
     *
     * @return the items is filtered or not
     */
    SDF.Models.SheetElement.prototype.isFiltered = function() {
        return !this.isPrimitiveVisible();
    };

    SDF.Models.SheetElement.prototype.getItemType = function() {
        var type = this.getTypeName();
        if( this instanceof SDF.Models.Connection ) {
            type = 'Edge';
        } else if( this instanceof SDF.Models.Annotation ) {
            type = 'Label';
        } else if( type === 'Node' && this.getIsContainer() ) {
            type = 'Boundary';
        }
        return type;
    };

    /**
     * Get the edges connected to the port with given direction
     *
     * @return edges connected to the port with given direction
     */
    SDF.Models.Port.prototype.getEdges = function( direction ) {
        var self = this;
        if( !direction ) {
            direction = graphConstants.EdgeDirection.BOTH;
        }

        var connectedEdges = self.getConnections();
        var edges = _.filter( connectedEdges, function( edge ) {
            if( direction === graphConstants.EdgeDirection.IN ) {
                return self === edge.getEnd();
            } else if( direction === graphConstants.EdgeDirection.OUT ) {
                return self === edge.getStart();
            }
            return self === edge.getEnd() || self === edge.getStart();
        } );
        return edges;
    };

    /**
     * indicate whether node is root
     *
     * @return true or false
     */
    SDF.Models.Node.prototype.isRoot = function() {
        if( arguments && arguments.length > 0 ) {
            this.rootFlag = arguments[ 0 ];
        } else {
            return this.rootFlag;
        }
    };

    /**
     * Get the edges connected to the node with given direction
     *
     * @param node the graph node
     *
     * @return the edges connected to the node with given direction
     */
    SDF.Models.Node.prototype.getEdges = function( direction ) {
        var self = this;
        var edges = [];
        var ports = self.getPorts();
        _.forEach( ports, function( port ) {
            edges = edges.concat( port.getEdges( direction ) );
        } );

        return edges;
    };

    /**
     * Get the property binding value
     *
     * @param property the binding property
     *
     * @return the property binding value
     */
    SDF.Models.Node.prototype.getProperty = function( property ) {
        var obj = this.getAppObj();

        if( !property || !obj || _.isUndefined( obj[ property ] ) ) {
            return;
        }

        return obj[ property ];
    };

    /**
     * EnhanceDF, gets attached element with the specified tag
     *
     * @param {String} tag The tag name
     * @returns The attached element; if not found, null
     */
    SDF.Models.SheetElement.prototype.getAttachedSheetElementWithTagName = function( tag ) {
        var returned = null;
        var refLocs = this.getReferencingLocations();

        if( refLocs && refLocs.length > 0 ) {
            for( var jj = 0; jj < refLocs.length; jj++ ) {
                var owningElement = refLocs[ jj ].getOwner();

                if( owningElement instanceof SDF.Models.SheetElement ) {
                    var appObj = owningElement.getAppObj();
                    if( appObj && appObj === tag ) {
                        returned = owningElement;
                        break;
                    }
                }
            }
        }
        return returned;
    };

    /**
     * EnhanceDF, helper method to calculate the percentage and segment index
     *
     * @param relativeLoc desired relative location
     * @return the result object
     */
    SDF.Models.Connection.prototype.calculatePercentageAndSegmentIndex = function( relativeLoc ) {
        var returned = [];
        var lines = this.getLines();
        var midIndex = 0;
        var percentage = 0.0;
        var totalLength = 0.0;
        var lineLengths = [];
        for( var h = 0; h < lines.length; h++ ) {
            var len = lines[ h ].getLength();
            lineLengths[ h ] = len;
            totalLength += len;
        }
        var remainder = totalLength * relativeLoc;
        for( var i = 0; i < lineLengths.length; i++ ) {
            if( lineLengths[ i ] >= remainder ) {
                percentage = remainder / lineLengths[ i ];
                midIndex = i;
                break;
            } else {
                remainder -= lineLengths[ i ];
            }
        }
        returned[ 0 ] = midIndex;
        returned[ 1 ] = percentage;
        return returned;
    };

    /**
     * adds inline symbol to the specified relative location
     *
     * @param symbol the template symbol
     * @param relativeLoc the relative location on the entire connection
     * @param index the percentage
     * @param percentage the relative distance from one end of the connection
     * @param width the width of the desired symbol occ
     * @param height height of the desired symbol occ
     * @param offsetX the offset x
     * @param offsetY the offset y
     * @param locationRule the locationRule to use
     * @return the added sheet element
     */
    SDF.Models.Connection.prototype.addInlineSymbolToRelativeLoc = function( symbol, relativeLoc, index,
        percentage, width, height, offsetX, offsetY, locationRule ) {
        var returned;
        returned = this.addInlineElement( symbol, index, percentage, width, height, offsetX, offsetY );

        if( returned !== null ) {
            returned.getLocation().setLocationRule( new locationRule( relativeLoc ) );
        }
        return returned;
    };

    /**
     * updates the inline element's relative location
     *
     * @param symbol the template symbol
     * @param relativeLoc the relative distance from one end of the connection
     * @param midIndex the segment identifier
     * @param locationRule the new location rule to set
     */
    SDF.Models.Connection.prototype.updateInlineSymbolRelativeLoc = function( symbol, relativeLoc, midIndex,
        locationRule ) {
        // set the location of the inline element
        var inlineElementLoc = new SDF.Models.ConnectionLocation();
        if( symbol ) {
            symbol.setLocation( inlineElementLoc );
        }
        inlineElementLoc.setSegmentIdentifier( midIndex );

        inlineElementLoc.setInput( SDF.Utils.CoordinateMode.PERCENT, SDF.Utils.Axis.Y, relativeLoc );
        inlineElementLoc.setReference( this, true );
        if( symbol !== null ) {
            symbol.getLocation().setLocationRule( new locationRule( relativeLoc ) );
        }
    };

    /**
     * gets the location rule function
     *
     * @return the locationRule
     */
    SDF.Models.Connection.prototype.getInlineElementLocationRule = function() {
        /**
         * InlineElementLocationRule
         */
        return window.SDF.Models.InlineElementLocationRule;
    };

    /**
     * define property: boundObject
     *
     * @property {array}  boundObject
     */
    if( !SDF.Models.Node.prototype.boundObject ) {
        Object.defineProperty( SDF.Models.Node.prototype, 'boundObject', {
            get: function() {
                if( this.getSVG() && this.getSVG().boundObject ) {
                    return this.getSVG().boundObject;
                }
                return {};
            }
        } );
    }
};

export default exports = {
    extend
};
