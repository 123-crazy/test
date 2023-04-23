// Copyright (c) 2019 Siemens

/* global
 define
 */

import DF from '@diagramming/foundation';
/**
 * This module define a customized connection style provider
 *
 * @module js/CustomConnectionStyleProvider
 */

    var IConnectionStyleProvider = DF.Models.IConnectionStyleProvider;

    /**
     * This object provides connection styles, such as rendering properties, start arrowhead and end arrowhead.
     *
     * @constructor
     */
    function CustomConnectionStyleProvider( properties, startArrow, endArrow ) {
        IConnectionStyleProvider.call( this );

        this.startArrowForRollup = startArrow;
        this.endArrowForRollup = endArrow;

        // rollup properties
        this.rollUpProperties = properties;
    }

    DF.Models.CustomConnectionStyleProvider = CustomConnectionStyleProvider;

    CustomConnectionStyleProvider.prototype.getRenderingProperties = function( connection ) {
        if( connection.isStartPortProxy() || connection.isEndPortProxy() ) {
            return this.rollUpProperties;
        }

        return null;
    };

    CustomConnectionStyleProvider.prototype.getStartArrow = function( connection ) {
        // / <summary>
        // / Gets start arrowhead.
        // / </summary>
        if( connection.isStartPortProxy() ) {
            return this.startArrowForRollup;
        }
        return null;
    };

    CustomConnectionStyleProvider.prototype.getEndArrow = function( connection ) {
        // / <summary>
        // / Gets end arrowhead.
        // / </summary>
        if( connection.isEndPortProxy() ) {
            return this.endArrowForRollup;
        }
        return null;
    };

    IConnectionStyleProvider.inheritedBy( CustomConnectionStyleProvider );

    export default CustomConnectionStyleProvider;

