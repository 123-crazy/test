// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This module provides graph style support
 *
 * @module js/Rv1RelationBrowserGraphStyles
 */
import app from 'app';
import notyModule from 'js/NotyModule';
import localeSvc from 'js/localeService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';

// Internal storage for the parsed presentation styles.
var _EdgePresentations = null;
var _NodePresentations = null;

// Noty service.

// Localized Error Messages.
var _warningFailedToParseGraphStyleXMLDocument;

var exports = {};

/**
 * Maps the parameter names in the GraphStyle XML document to
 * the expected names used internally by the graphing component
 * and sets the value on the Style object accordingly.
 *
 * @param {Style} the Style object.
 * @param {ParameterName} name of the parameter in the GraphStyle XML document.
 * @param {ParameterValue} value of the parameter in the GraphStyle XML document.
 * @return matching internal name used by the graphing component.
 */
var setStyleParameter = function( Style, ParameterName, ParameterValue ) {
    switch ( ParameterName ) {
        case 'lineStyle':
            ParameterName = 'dashStyle';
            break;
        case 'lineWidth':
            ParameterName = 'thickness';
            break;
        case 'lineColor':
            ParameterName = 'color';
            break;
        case 'arrowSourceShape':
            ParameterName = 'sourceArrow.arrowShape';
            break;
        case 'arrowSourceFillInterior':
            ParameterName = 'sourceArrow.fillInterior';
            break;
        case 'arrowSourceScale':
            ParameterName = 'sourceArrow.arrowScale';
            break;
        case 'arrowTargetShape':
            ParameterName = 'targetArrow.arrowShape';
            break;
        case 'arrowTargetFillInterior':
            ParameterName = 'targetArrow.fillInterior';
            break;
        case 'arrowTargetScale':
            ParameterName = 'targetArrow.arrowScale';
            break;
    }

    // Lodash's _.set() will automatically create objects along the path
    // if they are undefined. This prevents "object does not exist" errors
    // on nested properties... i.e.
    _.set( Style, ParameterName, ParameterValue.toUpperCase() );
};

/**
 * Modifies the style based on the arrowOption setting as follows:
 *  * BOTH: Nothing is changed.
 *  * NONE: Both the source and target arrow styles are nullified.
 *  * SOURCE: The target arrow style is nullified.
 *  * TARGET: The source arrow style is nullified.
 *
 * In all instances, we nullify (instead of undefined) so that when
 * we aggregate properties from a lower precedence style (i.e. the
 * default or legend style) it isn't overwriten.
 *
 * @param {EdgeStyle} the Edge Style object.
 * @return the modified style.
 */
var applyArrowOption = function( EdgeStyle ) {
    if( EdgeStyle && EdgeStyle.arrowOption ) {
        if( EdgeStyle.arrowOption === 'NONE' || EdgeStyle.arrowOption === 'TARGET' ) {
            EdgeStyle.sourceArrow = null;
        }

        if( EdgeStyle.arrowOption === 'NONE' || EdgeStyle.arrowOption === 'SOURCE' ) {
            EdgeStyle.targetArrow = null;
        }
    }
};

/**
 * Parses the Parameters of a Presentation element in the GraphStyles
 * XML document and returns them as an objects of name-value pairs.
 *
 * This was extracted as a seperate function
 *
 * @param {Presentation} Edge, Node or Port Presentation XML element.
 * @return A style object containing the pairs of parameter names
 * and values for the specified presentation element.
 */
var parsePresentationElementStyleParameters = function( PresentationElement ) {
    var Style = {};
    var ParameterElements = $( PresentationElement ).find( 'parameter' );

    _.each( ParameterElements, function( ParameterElement ) {
        var ParameterName = ParameterElement.attributes.name.value;
        var ValueElements = $( ParameterElement ).find( 'value' );

        _.each( ValueElements, function( ValueElement ) {
            setStyleParameter( Style, ParameterName, ValueElement.textContent );
        } );
    } );

    return Style;
};

/**
 * Retreives an Edge Style by name.
 *
 * @param {edgeStyleName} name of the Edge Style.
 * @return An object containing the pairs of parameter names
 * and values for the specified style.
 */
export let getEdgeStyle = function( edgeStyleName ) {
    if( edgeStyleName && _EdgePresentations !== null && _EdgePresentations[ edgeStyleName ] !== undefined ) {
        return _.clone( _EdgePresentations[ edgeStyleName ] );
    }
};

/**
 * Retreives a Node Style by name.
 *
 * @param {nodeStyleName} name of the Edge Style.
 * @return An object containing the pairs of parameter names
 * and values for the specified style.
 */
export let getNodeStyle = function( nodeStyleName ) {
    if( nodeStyleName && _NodePresentations !== null && _NodePresentations[ nodeStyleName ] !== undefined ) {
        return _.clone( _NodePresentations[ nodeStyleName ] );
    }
};

/**
 * Parses the presentation elements of the GraphStyle XML document
 * and stores them on the exports.
 *
 * @param {results} the results of the SOA call to getGraphStyleDef.
 */
export let parseGraphStyleXML = function( results ) {
    _EdgePresentations = {};
    _NodePresentations = {};

    try {
        var xmlDoc = $.parseXML( results.styleXMLStr );
        var $xmlObject = $( xmlDoc );
        var $EdgePresentationElements = $( $xmlObject.find( 'EdgePresentation' ) );
        var $NodePresentationElements = $( $xmlObject.find( 'NodePresentation' ) );

        _.each( $EdgePresentationElements, function( EdgePresentationElement ) {
            var StyleTypeName = EdgePresentationElement.attributes.id.value;

            var EdgeStyle = parsePresentationElementStyleParameters( EdgePresentationElement );
            EdgeStyle.thickness = parseFloat( EdgeStyle.thickness );

            applyArrowOption( EdgeStyle );

            _EdgePresentations[ StyleTypeName ] = EdgeStyle;
        } );

        _.each( $NodePresentationElements, function( NodePresentationElement ) {
            var StyleTypeName = NodePresentationElement.attributes.id.value;

            var NodeStyle = parsePresentationElementStyleParameters( NodePresentationElement );

            _NodePresentations[ StyleTypeName ] = NodeStyle;
        } );
    } catch ( e ) {
        notyModule.showWarning( _warningFailedToParseGraphStyleXMLDocument );

        _EdgePresentations = {};
        _NodePresentations = {};
    }
};

export let initGraphStyle = function() {
    if( _EdgePresentations === null || _NodePresentations === null ) {
        eventBus.publish( 'Rv1RelationsBrowser.queryGraphStyleDef' );
    }
};

/**
 * Initialization
 */
const loadConfiguration = () => {
    localeSvc.getTextPromise( 'RelationBrowserMessages', true ).then(
        function( localTextBundle ) {
            _warningFailedToParseGraphStyleXMLDocument = localTextBundle.warningFailedToParseGraphStyleXMLDocument;
        }
    );
};

loadConfiguration();

export default exports = {
    getEdgeStyle,
    getNodeStyle,
    parseGraphStyleXML,
    initGraphStyle
};
app.factory( 'Rv1RelationBrowserGraphStylesService', () => exports );
