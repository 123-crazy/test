// Copyright (c) 2019 Siemens

// Global variables not defined within this file - required for JSHint
/*
global
define
globals DiagramFoundation: false
globals GraphOverlaySupport: false
globals SDF: false
*/

/**
 * Add a zoom-invariant HTML pop-up component on top of the graph control to display additional information for graph
 * items.
 */
/**
 * This module provides host interface for layout
 *
 * @module js/GraphOverlay
 */
import GraphOverlaySupport from 'js/GraphOverlaySupport';
import _ from 'lodash';

'use strict';

/**
 * Constructor to create graph overlay
 * @param {Element} graphContainer the graph container element
 * @param {SDF.DiagramView} mainDiagram the main diagram
 */
var GraphOverlay = function( graphContainer, mainDiagram ) {
    var SDF = window.SDF;
    if( !SDF ) {
        throw 'Failed to create graph overlay. The Diagram Foundation module is not properly initialized.';
    }

    /** @type {SDF.Models.Node} */
    this.overLayNode = null;

    /** @type {SDF.DiagramView} */
    this.overlayDiagram = null;

    /** @type {SDF.DiagramView} */
    this.mainDiagram = mainDiagram;

    /** @type SDF.Models.Sheet */
    this.sheet = null;

    /** @type GraphOverlaySupport */
    this.nodePopup = null;

    /** @type Element */
    this.nodePopupDiv = null;

    this.nodePopupDiv = document.createElement( 'div' );
    this.nodePopupDiv.setAttribute( 'class', 'aw-graph-overlay' );
    this.nodePopupDiv.style.position = 'absolute';

    graphContainer.appendChild( this.nodePopupDiv );

    // TODO mark to remove in future
    this.overlayDiagram = new SDF.DiagramView( this.nodePopupDiv, 300, 125, SDF.RenderingMode.Svg );

    // add this to make overlay graph same structure as graph
    this._diagramView = this.overlayDiagram;

    /**
     * Init the overlay graph widget
     */
    this.initOverlayGraph = function() {
        this.overlayDiagram.disableAllCommands();
        this.overlayDiagram.enableCommand( 'HoverHighlightCommand' );
        var config = this.overlayDiagram.getSheetConfigurationData();
        config.maxZoomRatio = 1.0;
        config.minZoomRatio = 1.0;
        config.defaultAnchorX = 0.0;
        config.defaultAnchorY = 0.0;
        config.handleSize = 0;
        config.selectionColor = null;
        config.preSelectionColor = null;
        config.showGrid = false;
        config.svgTemplateSettings = {
            interpolate: /{([\s\S]+?)}/g
        };

        this.sheet = new SDF.Models.Sheet( null );
        this.sheet.setAllowJumpers( true );
        this.sheet.getSession().getViewConfig().keepZoomRatio = true;
        this.overlayDiagram.render( this.sheet );
    };
    this.initOverlayGraph();

    /**
     * Clear the overlay graph
     */
    this.clear = function() {
        if( this.overlayDiagram ) {
            this.overlayDiagram.deleteAll( this.sheet );
            // clear() cause SDF crash, raise issue for DF team
            // this.overlayDiagram.clear();
        }
    };

    /**
     * Get the current active overlay node
     */
    this.getOverlayNode = function() {
        return this.overLayNode;
    };

    /**
     * Destroy the overlay graph
     */
    this.destroy = function() {
        if( this.overlayDiagram ) {
            this.overlayDiagram.destroy();
            this.overlayDiagram = null;
        }
        if( graphContainer && this.nodePopupDiv ) {
            graphContainer.removeChild( this.nodePopupDiv );
            this.nodePopupDiv = null;
        }
    };

    if( mainDiagram ) {
        this.nodePopup = new GraphOverlaySupport( this.mainDiagram, this.nodePopupDiv, this.overlayDiagram );
    }

    /**
     * Set the height of the overlay node
     *
     * @param {nubmer} newValue
     */
    this.setHeightValue = function( newValue ) {
        var newHeight = newValue + 60;

        var svgObject = this.overLayNode.getSVG();
        var bindData = this.overLayNode.getAppObj();

        this.overlayDiagram.beginTransaction();
        // To check the height to make it >= height of minNodeSize (LCS-224817)
        if( this.nodePopup && this.nodePopup.getCurrentItem() ) {
            var minHeight = this.nodePopup.getCurrentItem().getMinNodeSize()[ 1 ];
            if( minHeight && newHeight < minHeight ) {
                newHeight = minHeight;
            }
        }

        bindData.HEADER_HEIGHT = newHeight;
        svgObject.bindNewValues( 'HEADER_HEIGHT' );
        this.overLayNode.setHeightValue( newHeight );
        this.overlayDiagram.endTransaction();

        this.nodePopupDiv.style.width = 300 + 'px';
        this.nodePopupDiv.style.height = newHeight + 'px';
        this.overlayDiagram.setViewportSize( 300, newHeight );
        this.overlayDiagram.setSelected( null );
    };

    /**
     * Show graph overlay for the given node. Close graph overlay if node is null.
     *
     * @param {SDF.Models.Node} node - node
     * @param {Element} templateElement - overlay node template
     * @param {Double} overlayNodeWidth - overlay node width
     * @param {Double} overlayNodeHeight - overlay node height
     * @param {Point} overlayLocation - overlay node location
     * @param {Object} tag - tag
     */
    this.setOverlay = function( node, templateElement, overlayNodeWidth, overlayNodeHeight, overlayLocation, tag ) {
        if( this.nodePopup.getCurrentItem() === node && this.nodePopup.getOverlayLocation() === overlayLocation ) {
            return;
        }

        this.nodePopup.setCurrentItem( node );
        this.nodePopup.setOverlayLocation( overlayLocation );

        if( node !== null && templateElement !== null ) {
            var appObject = tag === null ? node.getAppObj() : tag;

            this.overlayDiagram.beginTransaction();
            if( this.overLayNode ) {
                this.overlayDiagram.deleteElements( [ this.overLayNode ] );
            }
            var sym = SDF.Models.SVG.create();
            this.overLayNode = SDF.Models.Node.createNode( this.sheet, overlayNodeWidth, overlayNodeHeight, 0, 0, sym );
            this.overLayNode.setAllowedTransformations( 0 );
            this.overLayNode.setAppObj( appObject );

            var templateID = templateElement.getAttribute( 'id' );

            appObject.HEADER_HEIGHT = overlayNodeHeight;
            appObject.rectClipId = _.uniqueId( 'rc_' );

            sym.bindSvgTemplateDomToObject( templateID, appObject, templateElement );
            this.overLayNode.style = {};
            this.overLayNode.style.textOverflow = node.style.textOverflow;

            this.overlayDiagram.setSelected( null );
            this.overlayDiagram.endTransaction();

            this.nodePopupDiv.style.width = overlayNodeWidth + 'px';
            this.nodePopupDiv.style.height = this.overLayNode.getHeightValue() + 'px';
            this.overlayDiagram.setViewportSize( overlayNodeWidth, this.overLayNode.getHeightValue() );
        } else if( this.overLayNode ) {
            this.overlayDiagram.deleteElements( [ this.overLayNode ] );
            this.overLayNode = null;
        }
    };
};

export default GraphOverlay;
