// Copyright (c) 2019 Siemens

// Global variables not defined within this file - required for JSHint
/* globals SDF: false
define
*/

/**
 * Adds a HTML panel on top of the contents of the mainDiagram that can display
 * arbitrary information about a graph node
 */
/**
 * This module provides host interface for layout
 *
 * @module js/GraphOverlaySupport
 */

/**
 *
 * @param {DiagramView} mainDiagram the main diagram
 * @param {*} div the overlay graph container element
 * @param {*} overlayDiagram the overlay diagram
 */
function GraphOverlaySupport( mainDiagram, div, overlayDiagram ) {
    /**
     * @type {SDF.DiagramView}
     * @private
     */
    this.mainDiagram = mainDiagram;

    /**
     * @type {SDF.Models.Node}
     * @private
     */
    this.currentItemField = null;

    /**
     * @type {SDF.Utils.Point}
     * @private
     */
    this.location = null;

    /**
     * @type {HTMLElement}
     * @private
     */
    this.divField = div;
    div.style.visibility = 'hidden';
    div.style.display = 'none';

    /** @private */
    this.registerListeners = function() {
        this.divField.addEventListener( 'click', function( evt ) {
            evt.stopPropagation();
        }, false );

        this.divField.addEventListener( 'contextmenu', function( evt ) {
            evt.stopPropagation();
            evt.preventDefault();
        }, false );
    };
    this.registerListeners();

    /**
     * Gets or sets the node to display information for. Setting this property to a value other than null shows the
     * pop-up. Setting the property to null hides the pop-up.
     *
     * @type {SDF.Models.Node}
     */
    this.getCurrentItem = function() {
        return this.currentItemField;
    };

    /**
     * @param {SDF.Models.Node} value - value
     */
    this.setCurrentItem = function( value ) {
        if( value === this.currentItemField ) {
            return;
        }

        this.currentItemField = value;
        if( value !== null ) {
            this.show();
        } else {
            this.hide();
        }
    };

    this.getOverlayLocation = function() {
        return this.location;
    };

    /**
     * @param {SDF.Utils.Point} value - the overlay node location
     */
    this.setOverlayLocation = function( value ) {
        this.location = value;
        this.updateLocation();
    };

    /**
     * Makes this pop-up visible near the given item.
     *
     * @private
     */
    this.show = function() {
        this.divField.style.display = 'block';
        this.divField.style.visibility = 'visible';
    };

    /**
     * Hides this pop-up.
     *
     * @private
     */
    this.hide = function() {
        this.divField.style.display = 'none';
        this.divField.style.visibility = 'hidden';
    };

    /**
     * Changes the location of this pop-up to the location calculated by the GraphOverlaySupport#labelModelParameter.
     * Currently, this implementation does not support rotated pop-ups.
     */
    this.updateLocation = function() {
        if( !this.currentItemField ) {
            return;
        }
        var outerCanvas = mainDiagram.getVirtualCanvas().getWrapper();

        var graphContainer = overlayDiagram.getVirtualCanvas().getWrapper();
        var maxLeft = outerCanvas.clientWidth - graphContainer.clientWidth;
        var maxTop = outerCanvas.clientHeight - graphContainer.clientHeight;
        if( !this.location ) {
            var dataModelMgr = this.mainDiagram.getManager();
            var m = dataModelMgr.getSheetToScreenTransform();
            var renderPoint = this.currentItemField.getRenderingPosition();
            var position = m.transformPoint( new SDF.Utils.Point( renderPoint.x, renderPoint.y ) );
            if( maxLeft + graphContainer.offsetLeft > position.x + graphContainer.offsetLeft ) {
                if( maxTop + graphContainer.offsetTop > position.y + graphContainer.offsetTop ) {
                    this.setLocation( position.x + graphContainer.offsetLeft, position.y + graphContainer.offsetTop );
                } else {
                    this.setLocation( position.x + graphContainer.offsetLeft, maxTop );
                }
            } else {
                if( maxTop + graphContainer.offsetTop > position.y + graphContainer.offsetTop ) {
                    this.setLocation( maxLeft, position.y + graphContainer.offsetTop );
                } else {
                    this.setLocation( maxLeft, maxTop );
                }
            }
        } else {
            var matrixPageToView = this.mainDiagram.getViewToPageTransform().invert();
            var viewLocation = matrixPageToView.transformPoint( this.location );
            if( maxLeft + graphContainer.offsetLeft > viewLocation.x + graphContainer.offsetLeft ) {
                if( maxTop + graphContainer.offsetTop > viewLocation.y + graphContainer.offsetTop ) {
                    this.setLocation( viewLocation.x + graphContainer.offsetLeft, viewLocation.y +
                        graphContainer.offsetTop );
                } else {
                    this.setLocation( viewLocation.x + graphContainer.offsetLeft, maxTop );
                }
            } else {
                if( maxTop + graphContainer.offsetTop > viewLocation.y + graphContainer.offsetTop ) {
                    this.setLocation( maxLeft, viewLocation.y + graphContainer.offsetTop );
                } else {
                    this.setLocation( maxLeft, maxTop );
                }
            }
        }
    };

    /**
     * Sets the location of this pop-up to the given world coordinates.
     *
     * @param {Number} x - The target x-coordinate of the pop-up.
     * @param {Number} y - The target y-coordinate of the pop-up.
     * @private
     */
    this.setLocation = function( x, y ) {
        // Calculate the view coordinates since we have to place the div in the
        // regular HTML coordinate space
        this.divField.style.left = x + 'px';
        this.divField.style.top = y + 'px';
    };
}

export default GraphOverlaySupport;
