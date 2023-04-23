// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph alignment preferences and actions
 *
 * @module js/graphAlignment
 */
import _ from 'lodash';
import graphConstants from 'js/graphConstants';
import internalGraphUtils from 'js/internalGraphUtils';
import graphStyleUtils from 'js/graphStyleUtils';

'use strict';

var exports = {};

/**
 * Define graphAlignment preferences
 *
 * @class
 * @param diagramView the diagram view object
 */
export let Preferences = function( diagramView ) {
    var self = this;
    var configData = diagramView.getSheetConfigurationData();

    var MoveConstraintType = {
        Alignment: window.SDF.Utils.MoveConstraintType.Alignment,
        Snap: window.SDF.Utils.MoveConstraintType.Snap
    };

    var AlignmentType = {
        PortToPort: window.SDF.Utils.AlignmentType.PortToPort,
        NodeToNode: window.SDF.Utils.AlignmentType.NodeToNode,
        SegmentToSegment: window.SDF.Utils.AlignmentType.SegmentToSegment,
        LabelToLabel: window.SDF.Utils.AlignmentType.AnnotationToAnnotation
    };

    /**
     * set autoAlignmentEnabled
     *
     * @function
     * @param autoAlignmentEnabled This attribute indicates flag whether enable auto alignment or not. True means
     *            enable auto alignment, otherwise not. Default value: True.
     */
    this.enabled = {
        key: 'autoAlignmentEnabled'
    };
    /**
     * Controls the color of the alignment line.
     *
     * @function
     * @param newColor the new color, the default value is Color(255, 127, 39).
     */
    this.strokeColor = {
        key: 'alignmentStrokeColor',
        converter: function() {
            var results;
            if( arguments ) {
                var input = arguments[ 0 ];
                return arguments[ 1 ] ? input : graphStyleUtils.parseColor( input );
            }
            return results;
        }
    };
    /**
     * Controls the width of the alignment line.
     *
     * @function
     * @param newWidth new width, the default value is 1.
     */
    this.strokeWidth = {
        key: 'alignmentLineWidth'
    };
    /**
     * Controls the dash style of the alignment line. Example: solid line style, the value is [], dashed line with
     * even spacing : [5,5] or [5], dot dash with even spacing [5, 3, 2].
     *
     * @function
     * @param newArray the new array The default value is [5, 5].
     */
    this.strokeDashStyle = {
        key: 'alignmentLineDashArray',
        converter: function() {
            var results;
            if( arguments ) {
                var input = arguments[ 0 ];
                return arguments[ 1 ] ? input : graphStyleUtils.generateDashSegments( input );
            }
            return results;
        }
    };

    /**
     * Controls the tolerance for setting an object and a Connection segments as collinear (in pixels).
     *
     * @function
     * @param newTolerance the new tolerance. The default is set at 10.
     */
    this.tolerance = {
        key: 'alignmentTolerance'
    };
    /**
     * Set the alignableObjectTypes
     *
     * @function
     * @param objectTypes an array of object types default is ['Node', 'Port', 'Connection']; Annotation is also
     *            possible
     */
    this.alignableObjectTypes = {
        key: 'alignableObjectTypes',
        converter: internalGraphUtils.convert( graphConstants.ObjectTypes )
    };
    /**
     * Controls the priorities of alignment types.
     *
     * @function
     * @param priorityArray default value is [window.SDF.Utils.AlignmentType.PortToPort,
     *            window.SDF.Utils.AlignmentType.NodeToNode, window.SDF.Utils.AlignmentType.SegmentToSegment,
     *            window.SDF.Utils.AlignmentType.AnnotationToAnnotation];
     */
    this.alignmentPriority = {
        key: 'alignmentPriority',
        converter: internalGraphUtils.convert( AlignmentType )
    };
    /**
     * A flag that controls whether Grid Snapping will be done based on movePriority (True) or as an AlignmentType
     * (False). Default is True;
     *
     * @function
     * @param separate true base snapping on movePriority, false means separate based on alignmentType
     */
    this.separateGridSnapAndAlignment = {
        key: 'separateGridSnapAndAlignment'
    };

    /**
     * Controls the priorities of move constraints. The default value is [Alignment, Snap];
     *
     * @function
     * @param priorityArray default is [MoveConstraintType.Alignment, MoveConstraintType.Snap];
     */
    this.movePriority = {
        key: 'movePriority',
        converter: internalGraphUtils.convert( MoveConstraintType )
    };
    /**
     * A flag indicating whether dangling Connection is allowed or not.
     *
     * @function
     * @param allowed true dangling allowed, false dangling not allowed
     */
    this.danglingConnectionAllowed = {
        key: 'danglingConnectionAllowed'
    };

    // transform property name and property value between GC exposed interface and DF internal interface
    _.forOwn( self, function( value, key ) {
        Object.defineProperty( self, key, {
            enumerable: true,
            configurable: true,
            get: function() {
                var v = _.get( configData, value.key );
                return value.converter ? value.converter( v, true ) : v;
            },
            set: function( newValue ) {
                var v = value.converter ? value.converter( newValue ) : newValue;
                _.set( configData, value.key, v );
            }
        } );
    } );
};

/**
 * Define graph alignment class
 *
 * @class
 * @param diagramView the diagram view object
 */
export let graphAlignment = function( diagramView ) {
    /**
     * The Preferences object, see {@link graphAlignment.Preferences} for details
     *
     */
    this.preferences = new exports.Preferences( diagramView );

    /**
     * Aligns a given array of Sheet Element objects (alignObjects) to a given direction (alignmentDirection). The
     * sheet elements will filter out objects that has its referencing location object in the alignment list.
     *
     *
     * @param objectsToAlign The array of sheet element objects for alignment
     * @param alignmentDirection The direction of alignment. Currently supports TOP, BOTTOM, LEFT, RIGHT, MIDDLE and
     *            CENTER. See Manual Alignment Side object for information.
     * @param useAnchor Flag for using the anchor point as the origin for alignment. See
     *            MultipleObjectAlignmentTypes Enum for more information.There are two types of anchor alignment,
     *            which corresponds to the value as set for this parameter. 1 - Uses the same directional movement
     *            as a regular MOA using Bounding Box. That is, Left Alignment will align all elements vertically to
     *            the Left-most anchor point found within the union bounding box of the aligning elements. 2 - Left
     *            OR Right alignment will align the elements HORIZONTALLY to the Sheet element with the anchor point
     *            closest to the origin (top-left corner) of the union bounding box of the aligning elements.TOP OR
     *            Bottom alignment will align the elements VERTICALLY to the Sheet Element with the anchor point
     *            closest to the origin with the respective top/bottom side of the union bounding box of the
     *            aligning elements.
     */
    this.quickAlignment = function( objectsToAlign, alignmentDirection, useAnchor ) {
        diagramView.quickAlignment( objectsToAlign, window.SDF.Utils.ManualAlignmentSide[ alignmentDirection ],
            window.SDF.Utils.MultipleObjectAlignmentType[ useAnchor ] );
    };
};

/**
 * Create graph alignment instance
 *
 *
 * @param alignmentConfig the alignmentConfig
 * @param diagramView the diagram view object
 * @return graphAlignment the graphAlignment object
 */
export let create = function( alignmentConfig, diagramView ) {
    if( alignmentConfig && diagramView ) {
        var alignment = new exports.graphAlignment( diagramView );

        // initialize preferences
        _.assign( alignment.preferences, alignmentConfig );

        return alignment;
    }
};

export default exports = {
    Preferences,
    graphAlignment,
    create
};
