// Copyright (c) 2019 Siemens

/* global
 define
 */
import DF from '@diagramming/foundation';
/**
 * This module define a customized connection style provider for ishikawa
 *
 * @module js/IshikawaConnectionStyleProvider
 */

/**
 * This object provides connection styles, such as rendering properties, start arrowhead and end arrowhead.
 *
 * @constructor
 */
function IshikawaConnectionStyleProvider( edgeStyle ) {
    DF.Models.IConnectionStyleProvider.call( this );

    this.startArrow = edgeStyle.startArrow;
    this.endArrow = edgeStyle.targetArrow;

    this.strokeColor = edgeStyle.strokeColor;
    this.thickness = edgeStyle.thickness;
    this.segments = edgeStyle.segments;
}

IshikawaConnectionStyleProvider.prototype.getRenderingProperties = function( connection ) {
    var propertyObj = connection.getRenderingProperties();
    if( propertyObj ) {
        propertyObj.setStrokeColor( this.strokeColor );
        propertyObj.setStrokeWidth( this.thickness );
        propertyObj.setStrokeDashArray( this.segments );

        return propertyObj;
    }
    return null;
};

IshikawaConnectionStyleProvider.prototype.getStartArrow = function( connection ) {
    return this.startArrow;
};

IshikawaConnectionStyleProvider.prototype.getEndArrow = function( connection ) {
    return this.endArrow;
};

DF.Models.IConnectionStyleProvider.inheritedBy( IshikawaConnectionStyleProvider );

export default IshikawaConnectionStyleProvider;
