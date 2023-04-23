// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module define graph wordwrapping service
 *
 * @module js/graphWordWrappingService
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import logSvc from 'js/logger';
import graphConstants from 'js/graphConstants';
import internalGraphUtils from 'js/internalGraphUtils';

'use strict';

var exports = {};

/**
 * The namespace URI of SVG
 */
var nameSpaceURIOfSVG = 'http://www.w3.org/2000/svg';

/**
 * The tag for tspan element
 */
var TSPAN_TAG = 'tspan';

var WORD_DELIMITER = ' ';

var _getWrappedElement = function( nodeSVGElement ) {
    var wrappedElement = null;
    var realWrappedElement = $( nodeSVGElement ).find( '.aw-graph-wordwrap' );
    if( realWrappedElement.length > 0 ) {
        wrappedElement = realWrappedElement[ 0 ];
    }

    return wrappedElement;
};

/**
 * Get the text elements to do overflow
 *
 * @param nodeSVGElement the topmost element of node
 * @return the text element need to text overflow
 */
export let getTextOverflowElements = function( nodeSVGElement ) {
    return $( nodeSVGElement ).find( '.aw-graph-wordwrap text,text.aw-graph-wordwrap' );
};

/**
 * Do word-wrapping on all children text elements of element whose class has aw-graph-wordwrap, and adjust
 * position of children elements of "nodeSVGElement" based on word-wrapping result
 *
 * @param nodeSVGElement the topmost element of node
 * @param nodeWidth the node width
 * @param wrapType clip, ellipsis(...) or wrap the text
 * @return the wrapped element height
 */
export let wrappingWordOfTextsInNode = function( graphNode, nodeSVGElement, nodeWidth, wrapType ) {
    var height;

    if( nodeSVGElement && nodeWidth > 0.0 ) {
        var ownerSVGElement = nodeSVGElement.ownerSVGElement;
        var wrappedElement = null;
        if( ownerSVGElement ) {
            wrappedElement = _getWrappedElement( nodeSVGElement );
            var textElements = exports.getTextOverflowElements( nodeSVGElement );
            // clear all the text content and child elements
            textElements.attr( 'text-rendering', 'geometricPrecision' ).empty();

            // set text string to text
            textElements.each( function( index, element ) {
                if( element.hasAttribute( 'data-property-name' ) ) {
                    element.textContent = graphNode.getProperty( element.getAttribute( 'data-property-name' ) );
                } else {
                    logSvc.error( 'The word wrap text element does not have required property "data-property-name".' );
                    return;
                }

                // the default text has 5 padding on both left and right of node boundary
                var width = nodeWidth - 10;
                if( element.hasAttribute( 'data-width' ) ) {
                    width = calculateWidthByExpression( element.getAttribute( 'data-width' ), nodeWidth );
                }

                // For some reason unknown, in some cases, svg element's textContent.length > element's getNumberOfChars()
                // it makes the word wrapping thrown an exception as there are continuous spaces in string
                // LCS-535025 - Relation Browser : Data is not populated on Card - error thrown on console
                if( element.textContent.length > element.getNumberOfChars() ) {
                    let textContent = element.textContent;
                    element.textContent = textContent.replace( /\s+/g, ' ' );
                }

                doWordWrapping( element, width, wrapType );
            } );

            // handle auto position if apply word wrap
            if( wrapType === graphConstants.TextOverflow.WRAP ) {
                handleTransformDependency( nodeSVGElement );
            }
        }

        if( wrappedElement ) {
            height = wrappedElement.getBBox().height;
        }
    }

    return height;
};

/**
 * Calculate the width by expression, the expression format is "xxx% -yyy", "xxx%", "yyy"
 *
 * @param expression the width expression
 * @param nodeWidth the width of node
 * @return the expression value
 */
var calculateWidthByExpression = function( expression, nodeWidth ) {
    var indexOfPercentage = expression.indexOf( '%' ); // $NON-NLS-1$
    var indexOfMinus = expression.indexOf( '-' ); // $NON-NLS-1$
    var length = expression.length;
    var percentage;
    if( indexOfPercentage >= 1 && indexOfMinus >= 2 && length >= 4 ) {
        percentage = expression.substring( 0, indexOfPercentage );
        var subtractedValue = expression.substring( indexOfMinus + 1 );

        return percentage * 0.01 * nodeWidth - subtractedValue;
    } else if( indexOfPercentage >= 1 && indexOfMinus < 0 ) {
        percentage = expression.substring( 0, indexOfPercentage );
        return percentage * 0.01 * nodeWidth;
    }
    return expression;
};

/**
 * Adjust text element to top
 *
 * @param {SVGElement} svgTextElement the text element whose transform to be adjusted
 */
var adjustTextTransform = function( svgTextElement ) {
    var e = 0.0;
    var f = 0.0;
    var textTransform = getFirstBaseTransform( svgTextElement );
    if( textTransform && textTransform.matrix ) {
        // Update the matrix property directly is a high cost operation, should be avoided invoked as much as possible
        // textTransformMatrix.f = 0;
        e =  textTransform.matrix.e;
        // f = textTransformMatrix.f;
    }

    var yOffset = 0.0;
    if( svgTextElement.hasAttribute( 'dy' ) ) {
        var attrY = svgTextElement.getAttribute( 'dy' );
        if( attrY ) {
            yOffset += parseFloat( attrY );
        }
    }

    // f = f - svgTextElement.getBBox().y + yOffset;
    f = -svgTextElement.getBBox().y + yOffset;
    setTranslate( svgTextElement, e, f, textTransform );
};

/**
 * Get transform matrix of element
 *
 * @param {SVGElement} element the SVG element
 * @return {SVGMatrix} the matrix
 */
var getTransformMatrix = function( element ) {
    var transform = element.transform;
    if( transform && transform.baseVal.numberOfItems > 0 ) {
        return transform.baseVal.getItem( 0 ).matrix;
    }

    return null;
};

/**
 * Get the first transform of the element
 *
 * @param {SVGElement} element the svg element
 * @return {SVGTransform} the first transform of baseval
 */
var getFirstBaseTransform = function( element ) {
    var transform = element.transform;
    if( transform && transform.baseVal.numberOfItems > 0 ) {
        return transform.baseVal.getItem( 0 );
    }

    return null;
};

/**
 * Set the translate information of element
 *
 * @param {SVGElement} element the SVG element
 * @param {number} tx the translate in x-coordinate
 * @param {number} ty the translate in y-coordinate
 * @param {SVGTransform} originalTransform of the element
 */
var setTranslate = function( element, tx, ty, originalTransform ) {
    if( element ) {
        var svgRoot = element.ownerSVGElement;
        if( svgRoot ) {
            // Both clear and appendItem are DOM rendering operation with high cost,
            // so replace them with setTranslate API directly when the transform is existing
            if( originalTransform ) {
                originalTransform.setTranslate( tx, ty );
            } else {
                var newTransform = svgRoot.createSVGTransform();
                newTransform.setTranslate( tx, ty );
                element.transform.baseVal.clear();
                element.transform.baseVal.appendItem( newTransform );
            }
        }
    }
};

/**
 * Function to adjust position of elements whose transform is dependent on a particular element.
 * Wordwrap should have been applied before call this function.
 *
 * @param nodeSvgElement the node element
 */
var handleTransformDependency = function( nodeSvgElement ) {
    var autoPosElems = $( nodeSvgElement ).find( '.aw-graph-autoPosition' );
    autoPosElems.each( function( index, element ) {
        var dependedElement = element.previousElementSibling;

        // set transform for the top most text element
        if( !dependedElement ) {
            adjustTextTransform( element );
            return;
        }

        var yOffset = 0;
        var firstBaseTransform = getFirstBaseTransform( element );
        if( firstBaseTransform && firstBaseTransform.matrix ) {
            firstBaseTransform.matrix.f = 0.0;
        }

        // var transformMatrix = getTransformMatrix( element );
        // if( transformMatrix ) {
        //     transformMatrix.f = 0.0;
        // }

        var transform = null;
        if( typeof element.getTransformToElement !== 'undefined' ) {
            transform = element.getTransformToElement( dependedElement );
        } else {
            transform = dependedElement.getScreenCTM().inverse().multiply( element.getScreenCTM() );
        }
        var attrY;
        if( element.nodeName === 'text' ) {
            if( element.hasAttribute( 'dy' ) ) {
                attrY = element.getAttribute( 'dy' );
                if( attrY ) {
                    yOffset = parseFloat( attrY );
                }
            }

            yOffset -= element.getBBox().y;
        } else {
            if( element.hasAttribute( 'data-translate-y' ) ) {
                attrY = element.getAttribute( 'data-translate-y' );
                if( attrY ) {
                    yOffset = parseFloat( attrY );
                }
            }
        }

        var e = 0;
        var f = 0;
        if( transform ) {
            e = transform.e;
            f = transform.f;
        }
        dependedElement.setAttribute( 'text-rendering', 'geometricPrecision' ); // $NON-NLS-1$ //$NON-NLS-2$
        var dependedBBox = dependedElement.getBBox();
        f = dependedBBox.height - f + dependedBBox.y;
        f += yOffset;

        setTranslate( element, e, f, firstBaseTransform );
    } );
};

/**
 *
 * @param {SVG Text Element} svgTextElement the SVG text element, text or tspan.
 * @param {Number} maxWidth the max text line width
 */
var getApproximateOneLineCharCount = function( svgTextElement, maxWidth ) {
    var text = svgTextElement.textContent;
    var avgCharWidth = svgTextElement.getComputedTextLength() / text.length;
    return Math.ceil( maxWidth / avgCharWidth );
};

/**
 * Do word-wrapping on text. The SVG text element should have intial text content.
 *
 * @param svgTextElement the SVG text element to be word-wrapped
 * @param totalLineWidth the text width in one line
 * @param lineHeight the text height in one line
 * @param maxWidth the maximum width of each text line
 */
var wrapWord = function( svgTextElement, totalLineWidth, lineHeight, maxWidth ) {
    var textElem = $( svgTextElement );
    var text = svgTextElement.textContent;

    textElem.empty();

    // Splitter of word
    var words = text.split( WORD_DELIMITER );
    var unProcessedWords = _.clone( words ).reverse();

    var textLine = '';
    var textLineWithNextWord = '';
    var testWidth = 0;
    var testingTSPAN = document.createElementNS( nameSpaceURIOfSVG, TSPAN_TAG );
    testingTSPAN.setAttribute( 'dy', 0 );
    svgTextElement.appendChild( testingTSPAN );
    while( unProcessedWords && unProcessedWords.length > 0 ) {
        var currentWord = unProcessedWords.pop();
        textLineWithNextWord = textLine + currentWord;
        testingTSPAN.textContent = textLineWithNextWord;
        testWidth = testingTSPAN.getComputedTextLength();

        if( testWidth > maxWidth ) {
            // If width of first word exceeds line width, needs to split the word into two lines
            if( textLine === '' ) {
                var clipPos = clipWord( testingTSPAN, maxWidth );
                unProcessedWords.push( currentWord.substring( clipPos ) );
            } else {
                testingTSPAN.textContent = textLine;
                unProcessedWords.push( currentWord );
            }

            // split into new line
            testingTSPAN = document.createElementNS( nameSpaceURIOfSVG, TSPAN_TAG );
            testingTSPAN.setAttribute( 'x', 0 );
            testingTSPAN.setAttribute( 'dy', lineHeight );
            svgTextElement.appendChild( testingTSPAN );

            textLine = '';
        } else {
            textLine = textLineWithNextWord + WORD_DELIMITER;
        }
    }
};

/**
 * Clip word using the given string. The text element should have set initial text context.
 *
 * @param {SVGTextElement}svgTextElement the SVG text element to be word-wrapped
 * @param {Number} maxWidth the maximum width of each text line
 * @param {String} clipString the given string to truncate text
 * @return {Number} the line clip position
 */
var clipWord = function( svgTextElement, maxWidth, clipString ) {
    var textString = svgTextElement.textContent;

    // set the initial line break position to the approximate line char count
    var startIndex = getApproximateOneLineCharCount( svgTextElement, maxWidth );
    if( startIndex > textString.length ) {
        startIndex = textString.length - 1;
    }

    // find the precise line break position around the approximate position
    var testWidth = svgTextElement.getSubStringLength( 0, startIndex );
    var initialSign = Math.sign( maxWidth - testWidth );
    var sign = initialSign;
    while( sign === initialSign && startIndex > 0 && startIndex < textString.length ) {
        startIndex += initialSign;
        testWidth = svgTextElement.getSubStringLength( 0, startIndex );
        sign = Math.sign( maxWidth - testWidth );
    }

    if( initialSign === 1 ) {
        startIndex -= 1;
    }

    // clip few more chars to append clip text
    svgTextElement.textContent = textString.substring( 0, startIndex );
    if( clipString ) {
        svgTextElement.textContent += clipString;
        while( svgTextElement.getComputedTextLength() > maxWidth ) {
            startIndex--;
            svgTextElement.textContent = textString.substring( 0, startIndex ) + clipString;
        }
    }

    return startIndex;
};

/**
 * New API to clip the string of svg text
 *
 * @param {SVGElement} svgTextElement svg text element
 * @param {number} totalLineWidth the rendering width of the entire string
 * @param {number} maxWidth the field width
 * @param {string} clipString surfix when the string is overflow
 */
var clipWordNew = ( svgTextElement, totalLineWidth, maxWidth, clipString ) => {
    var textString = svgTextElement.textContent;

    if( clipString ) {
        svgTextElement.textContent += clipString;
    }

    let charWidthMap = calCharWidthInString( svgTextElement, svgTextElement.textContent );

    if( clipString ) {
        var clipStrWidth = 0;
        for( let j = 0; j < clipString.length; j++ ) {
            clipStrWidth += charWidthMap.get( clipString[j] );
        }
        maxWidth -= clipStrWidth;
    }

    var tempWidth = 0;
    var endIndex = 0;

    for( let i = 0; i < textString.length; i++ ) {
        let charWidth = charWidthMap.get( textString[i] );
        if( tempWidth + charWidth > maxWidth ) {
            break;
        }
        endIndex++;
        tempWidth += charWidth;
    }

    var resultSubstring = textString.substring( 0, endIndex );

    if( clipString ) {
        resultSubstring += clipString;
    }

    svgTextElement.textContent = resultSubstring;
};

/**
 * Calculate the rendering each char width of svg text element
 *
 * @param {SVGTextElement} svgTextElement svg text element
 * @param {string} textString string the text element holds
 *
 * @returns {Map} map {char => rendering width in the DOM tree}
 */
var calCharWidthInString = ( svgTextElement, textString ) => {
    var charWidthMap = new Map();
    for( let i = 0; i < textString.length; i++ ) {
        charWidthMap.set( textString[i], svgTextElement.getSubStringLength( i, 1 ) );
    }
    return charWidthMap;
};

/**
 * Calculate the longest sub-string which can be contained in field with specific width
 *
 * @param {string} textString the entire string to handle
 * @param {number} startIndex the start index of the substring
 * @param {number} maxWidth the width of the field holds the string
 * @param {Map} charWidthMap map of char and its width
 *
 * @returns {number} end index of the sub string
 */
var getFirstMaxSubString = ( textString, startIndex, maxWidth, charWidthMap ) => {
    var delimiterIndex = -1;
    var subStrWidth = 0;
    for( let i = startIndex; i < textString.length; i++ ) {
        if ( textString[i] === WORD_DELIMITER ) {
            delimiterIndex = i;
        }

        var charWidth = charWidthMap.get( textString[i] );

        if( subStrWidth + charWidth > maxWidth ) {
            if( delimiterIndex >= startIndex ) {
                return delimiterIndex + 1;
            }
            return i;
        }
        subStrWidth += charWidth;
    }
    return textString.length;
};

/**
 * Wrap the string when the string is overflow
 *
 * @param {SVGTextElement} svgTextElement element holds the text
 * @param {number} totalLineWidth total rendering width of the entire svg text
 * @param {number} lineHeight height of the line
 * @param {number} maxWidth the max width of the text field
 * @param {Map} charWidthMap map of char and its rendering width
 */
var wrapWordNew = function( svgTextElement, totalLineWidth, lineHeight, maxWidth, charWidthMap ) {
    var textElem = $( svgTextElement );
    var text = svgTextElement.textContent;

    textElem.empty();

    var startSubStrIndex = 0;
    var endSubStrIndex = 0;
    var lineNum = 0;

    while( endSubStrIndex > -1 && startSubStrIndex < text.length ) {
        endSubStrIndex = getFirstMaxSubString( text, startSubStrIndex, maxWidth, charWidthMap );
        if( endSubStrIndex > startSubStrIndex ) {
            var curSubString = text.substring( startSubStrIndex, endSubStrIndex );
            var testingTSPAN = document.createElementNS( nameSpaceURIOfSVG, TSPAN_TAG );

            if( lineNum === 0 ) {
                testingTSPAN.setAttribute( 'dy', 0 );
            } else {
                testingTSPAN.setAttribute( 'x', 0 );
                testingTSPAN.setAttribute( 'dy', lineHeight );
            }

            testingTSPAN.textContent = curSubString;

            svgTextElement.appendChild( testingTSPAN );

            startSubStrIndex = endSubStrIndex;

            lineNum++;
        }
    }
};

/**
 * Do word-wrapping on text
 *
 * @param {SVGElement} svgTextElement the SVG text element to be word-wrapped
 * @param {number} maxWidth the maximum width of each text line
 * @param {TextOverFlow} wrapType the wrap type, clip, ellipsis or wrap
 *
 * @returns {boolean} flag to indicate whether wordwrap has really applied
 */
var doWordWrapping = function( svgTextElement, maxWidth, wrapType ) {
    var wrapped = false;
    var oneLineTextWidth = svgTextElement.getComputedTextLength();
    if( oneLineTextWidth > maxWidth ) {
        if( wrapType === graphConstants.TextOverflow.WRAP ) {
            let charWidthMap = calCharWidthInString( svgTextElement, svgTextElement.textContent );
            wrapWordNew( svgTextElement, oneLineTextWidth, svgTextElement.getBBox().height, maxWidth, charWidthMap );
            wrapped = true;
        } else if( wrapType === graphConstants.TextOverflow.ELLIPSIS ) {
            clipWordNew( svgTextElement, oneLineTextWidth, maxWidth, '...' );
        } else if( wrapType === graphConstants.TextOverflow.TRUNCATE ) {
            clipWordNew( svgTextElement, oneLineTextWidth, maxWidth );
        }
    }

    return wrapped;
};

/**
 * Wrap the text of node and return the wrapped text height if the height change.
 *
 * @param graphContainer the graph container
 * @param node the node to word wrap
 * @param toWordWrap won't check the width changing and force to wrap word
 * @return the node or null. if the wrapped height change, return node with cached wrapped height and current
 *         wrapped height
 */
export let applyWordWrap = function( graphContainer, node, toWordWrap ) {
    var changedNode;
    var cachedWrapHeight = node.cachedWrappedHeight;
    var cachedWidth = node.cachedWidth;
    var cachedTemplateId = node.cachedTemplateId;

    if( !toWordWrap ) {
        var currentWidth = node.getWidthValue();
        if( !cachedWidth || currentWidth - cachedWidth !== 0 || node.style.templateId !== cachedTemplateId ) {
            toWordWrap = true;
        } else {
            return changedNode;
        }
    }

    var dummySVGElement = null;
    var oldParent = null;
    var svgObject = node.getSVG();
    var svgContent;
    if( svgObject ) {
        svgContent = svgObject.getEvaluatedSvgContent();
        // if the node doesn't be added into DOM
        if( svgContent && !svgContent.ownerSVGElement ) {
            var graphContainerJq = $( graphContainer );
            dummySVGElement = graphContainerJq.find( 'aw-graph-dummyNodeContainer' );
            if( dummySVGElement.length === 0 ) {
                // only create the dummy node container one time, reuse it later
                dummySVGElement = $( '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="aw-graph-dummyNodeContainer" visibility="hidden"></svg>' );
                graphContainerJq.append( dummySVGElement );
            }

            oldParent = svgContent.parentNode;
            dummySVGElement.append( svgContent );
        }
    }

    if( toWordWrap ) {
        var width = node.getWidthValue();
        node.cachedWidth = width;
        node.cachedTemplateId = node.style.templateId;

        if( svgContent ) {
            var wrappedHeight = exports.wrappingWordOfTextsInNode( node, svgContent, width,
                graphConstants.TextOverflow[ node.style.textOverflow ] );
            node.cachedWrappedHeight = wrappedHeight;
        }
    }

    if( dummySVGElement ) {
        if( oldParent ) {
            oldParent.appendChild( svgContent );
        } else {
            dummySVGElement.empty();
        }
    }

    // the cached wrap height and current wrapped height
    if( node.cachedWrappedHeight && cachedWrapHeight !== node.cachedWrappedHeight &&
        node.style.textOverflow === 'WRAP' ) {
        changedNode = {
            node: node,
            cachedWrappedHeight: cachedWrapHeight,
            currentWrappedHeight: node.cachedWrappedHeight
        };
    }
    return changedNode;
};

var _updateMinNodeSize = function( graphControl, node, currentWrappedHeight ) {
    var graph = graphControl.graph;
    var padding = 0;
    if( node.style && node.style.padding ) {
        padding = node.style.padding;
    }

    var newHeight = currentWrappedHeight + padding;
    var orignMinNodeSize = graph.getNodeMinSizeConfig( node );
    if( newHeight < orignMinNodeSize[ 1 ] ) {
        newHeight = orignMinNodeSize[ 1 ];
    }

    var layout = graphControl.layout;
    if( layout && ( layout.type === graphConstants.DFLayoutTypes.IncUpdateLayout || layout.type === graphConstants.DFLayoutTypes.SortedLayout ) ) {
        var layoutHostInterface = layout._hostInterface;
        if( layoutHostInterface ) {
            var edgeToEdgeDist = layoutHostInterface.getEdgeToEdgeDist().y;
            newHeight = Math.ceil( newHeight / edgeToEdgeDist ) * edgeToEdgeDist;
        }
    }

    var newMinSize = [ orignMinNodeSize[ 0 ], newHeight ];
    node.setMinNodeSize( newMinSize );

    return newHeight;
};

/**
 * Update the node height as the strategy.
 *
 * @param {Object} graphModel graph model
 * @param {Node} nodes the nodes needing to update height
 *
 */
export let updateNodeHeightForWrapping = function( graphModel, nodes ) {
    var strategy = graphModel.config.nodeHeightUpdateStrategy;

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var groupGraph = graphControl.groupGraph;
    if( !strategy ) {
        strategy = graphConstants.NodeHeightUpdateStrategy.KEEP_LARGE;
    }

    // For the browser IE and early Edge not based on Chromium
    var needPolyFil = window.navigator.userAgent.search( /(trident|edge)/i ) > -1;

    var sizeChangedNodes = [];
    var length = nodes.length;
    for( var index = 0; index < length; ++index ) {
        var nodeTextInfo = nodes[ index ];

        var currentWrappedHeight = nodeTextInfo.currentWrappedHeight;
        var node = nodeTextInfo.node;

        if( currentWrappedHeight ) {
            var currentHeight = node.getHeight();
            var newHeight = _updateMinNodeSize( graphControl, node, currentWrappedHeight );
            if( !needPolyFil && strategy && strategy === graphConstants.NodeHeightUpdateStrategy.NONE ) {
                continue;
            }

            var isResize = false;
            if( groupGraph.isGroup( node ) ) {
                if( groupGraph.isExpanded( node ) && !graph.isNetworkMode() ) {
                    var offset = graphControl.updateHeaderHeight( node, newHeight );
                    newHeight = currentHeight + offset;
                } else if( newHeight > currentHeight && strategy === graphConstants.NodeHeightUpdateStrategy.KEEP_LARGE ||
                    strategy === graphConstants.NodeHeightUpdateStrategy.FIT_WRAP ) {
                    graphControl.updateHeaderHeight( node, newHeight );
                }
            }

            if( newHeight > currentHeight && strategy === graphConstants.NodeHeightUpdateStrategy.KEEP_LARGE ||
                newHeight !== currentHeight && strategy === graphConstants.NodeHeightUpdateStrategy.FIT_WRAP ) {
                isResize = true;
            }

            // Workaround for LCS-400543 - CMDI-Project objects Relation information truncated in Internet Explorer.
            // Root cause: IE and early Edge can not update some elements out of view windows as Chrome/Firefox,
            // using the following code forces the browsers update all elements.
            if( needPolyFil ) {
                var mainCanvas = graph._diagramView.getVirtualCanvas().getMainCanvas();
                var svgContent = node.getSVGDom();
                if( svgContent && !svgContent.ownerSVGElement ) {
                    mainCanvas.appendChild( svgContent );
                }
            }

            if( isResize ) {
                graph.update( function() {
                    node.setHeight( newHeight );
                } );

                sizeChangedNodes.push( node );
            }
        }
    }

    if( sizeChangedNodes.length > 0 ) {
        internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.graphItemsResized', {
            items: sizeChangedNodes
        } );
    }
};

export default exports = {
    getTextOverflowElements,
    wrappingWordOfTextsInNode,
    applyWordWrap,
    updateNodeHeightForWrapping
};
