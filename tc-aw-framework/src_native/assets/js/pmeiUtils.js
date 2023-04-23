// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides pmei functions for edge.
 *
 * @module js/pmeiUtils
 */
import eventBus from 'js/eventBus';
import graphConstants from 'js/graphConstants';
import _ from 'lodash';

'use strict';

var exports = {};

/**
 * Define the PMEI class
 *
 * @class
 * @param edge the edge
 * @param style the pmei style, styles format as: \{ strokesWidth: _style.strokesWidth, strokesColor:
 *            _style.strokesColor, scale: _style.scale, fillColor: _style.fillColor, position: _style.position,
 *            visibility: _style.visibility \}
 *
 */
export let PMEI = function( edge, style ) {
    var self = this;

    var _style = _.merge( {
        strokesWidth: 2,
        strokesColor: 'rgba(0,0,0,255)',
        fillColor: 'rgba(0,0,0,255)',
        scale: 1,
        widthFactor: 30,
        position: 0.4,
        visibility: false
    }, style );

    var _indicator = createIndicator();

    /**
     * Show Pmei Indicator in the middle of the edge
     */
    this.show = function() {
        if( _indicator ) {
            _style.visibility = true;
            _indicator.setVisible( _style.visibility );
        }
    };

    /**
     * Hide Pmei Indicator
     */
    this.hide = function() {
        if( _indicator ) {
            _style.visibility = false;
            _indicator.setVisible( _style.visibility );
        }
    };

    /**
     * get the visibility status of the indicator
     *
     * @return true if indicator is shown false if hidden
     */
    this.isShown = function() {
        var returned = false;

        if( _indicator ) {
            returned = _style.visibility;
        }

        return returned;
    };

    /**
     * update styles for Pmei Indicator
     *
     * @param styles the styles format as: \{ strokesWidth: _style.strokesWidth, strokesColor:
     *            _style.strokesColor, scale: _style.scale, fillColor: _style.fillColor, position:
     *            _style.position, visibility: _style.visibility \}
     */
    this.applyStyles = function( styles ) {
        setStyles( styles );

        if( _indicator !== null ) {
            applyStyles();
        }
    };

    /**
     * Remove the Pmei
     *
     */
    this.remove = function() {
        if( _indicator ) {
            self.removeClickedHandler();
            _indicator.remove();
            _indicator = null;
        }
    };

    /**
     * get the current styles of the indicator,
     *
     * @return style styles format as: \{ strokesWidth: _style.strokesWidth, strokesColor: _style.strokesColor,
     *         scale: _style.scale, fillColor: _style.fillColor, position: _style.position, visibility:
     *         _style.visibility \}
     */
    this.getStyles = function() {
        return _style;
    };

    /**
     * Add Clicked Handler
     *
     * @param handler the click handler
     */
    this.addClickedHandler = function( handler ) {
        if( _indicator ) {
            _indicator.on( 'click', function( evt ) {
                handler( evt );
            } );

            _indicator.on( 'touchend', function( evt ) {
                handler( evt );
            } );
        }
    };

    /**
     * Remove Clicked Handler
     *
     * @param handler the click handler to remove
     *
     */
    this.removeClickedHandler = function( handler ) {
        if( _indicator ) {
            _indicator.off( 'click' );

            _indicator.off( 'touchend' );
        }
    };

    // ----------------private functions-----------------
    /**
     * get indicator width
     *
     * @private
     */
    function getWidth() {
        return _style.scale * _style.widthFactor;
    }

    /**
     * sets the new styles of the indicator, styles format as: { strokesWidth: _style.strokesWidth,
     * strokesColor: _style.strokesColor, scale: _style.scale, fillColor: _style.fillColor, position:
     * _style.position, visibility: _style.visibility }
     *
     * @private
     *
     */
    function setStyles( styles ) {
        if( styles === null ) {
            return;
        }

        if( isFinite( styles.strokesWidth ) ) {
            _style.strokesWidth = styles.strokesWidth;
        }
        if( isFinite( styles.scale ) ) {
            _style.scale = styles.scale;
        }
        if( styles.strokesColor ) {
            _style.strokesColor = styles.strokesColor;
        }
        if( styles.fillColor ) {
            _style.fillColor = styles.fillColor;
        }
        if( styles.position ) {
            _style.position = styles.position;
        }
        if( typeof styles.visibility === 'boolean' ) {
            _style.visibility = styles.visibility;
        }
    }

    /**
     * indicatorTemplate with alternative styles
     *
     * @private
     * @param fill the fill color
     * @param strokeColor the stroke color
     * @param strokeWidth the width
     * @return the diamond
     */
    function indicatorTemplate( fill, strokeColor, strokeWidth ) {
        var content = '<g transform=\'scale(1, 1)\'><svg width=\'100%\' height=\'100%\' viewBox=\'0 0 300 300\' preserveAspectRatio=\'none\'>' +
            '<g transform=\'translate(0.0,300) scale(0.1,-0.1)\' fill=\'' +
            fill +
            '\' stroke=\'' +
            strokeColor +
            '\' stroke-width=\'' +
            strokeWidth *
            100 +
            '\'><path pointer-events=\'visible\' d=\'M745 2250 l-750 -750 753 -753 752 -752 752 752 753 753 -750 750 c-412 412 -752 750 -755 750 -3 0 -343 -338 -755 -750z\' >' +
            '</path></g></svg></g>';
        return content;
    }

    /**
     * createIndicator
     *
     * @private
     */
    function createIndicator() {
        var symbol = new window.SDF.Models.SVG.create( indicatorTemplate( _style.fillColor,
            _style.strokesColor, _style.strokesWidth ) );
        symbol.setAnchorX( 0.5 );
        symbol.setAnchorY( 0.5 );

        var index = edge.calculatePercentageAndSegmentIndex( _style.position );
        var indicator = edge.addInlineSymbolToRelativeLoc( symbol, _style.position, index[ 0 ], index[ 1 ],
            getWidth(), getWidth(), 0, 0, edge.getInlineElementLocationRule() );

        // Set the owner of this inline element
        indicator.setOwner( edge );
        indicator.setAppObj( 'gc-pmeiIndicator' );

        // Do not allow this symbol transform
        indicator.setAllowedTransformations( 0 );
        var renderingProperties = indicator.getSymbols()[ 0 ].getRenderingProperties();
        renderingProperties.setStyleClass( 'aw-graph-pmeiIndicator' );

        return indicator;
    }

    /**
     * applyStyles to this indicator
     *
     * @private
     */
    function applyStyles() {
        var symbols = _indicator.getSymbols();
        if( !symbols || symbols.length === 0 ) {
            return;
        }

        // apply styles inline.
        var newContent = indicatorTemplate( _style.fillColor, _style.strokesColor, _style.strokesWidth );

        var symbol = symbols[ 0 ].getSymbol();
        symbol.setSvgContent( newContent );

        // scale
        _indicator.setWidthValue( getWidth() );
        _indicator.setHeightValue( getWidth() );

        // visibility
        _indicator.setVisible( _style.visibility );

        // position
        var index = edge.calculatePercentageAndSegmentIndex( _style.position );
        edge.updateInlineSymbolRelativeLoc( _indicator, _style.position, index[ 0 ], edge
            .getInlineElementLocationRule() );
    }
    // ----------------end private functions-----------------
};

/**
 * Create PMEI instance for this edge.
 *
 * @param edge the edge
 * @param style the pmei style, styles format as: \{ strokesWidth: _style.strokesWidth, strokesColor:
 *            _style.strokesColor, scale: _style.scale, fillColor: _style.fillColor, position: _style.position,
 *            visibility: _style.visibility \}
 */
export let createPMEI = function( edge, style ) {
    return new exports.PMEI( edge, style );
};

export default exports = {
    PMEI,
    createPMEI
};
