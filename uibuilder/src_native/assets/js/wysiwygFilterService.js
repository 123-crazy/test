// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/wysiwygFilterService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';

let exports;
export let ctx = {};

var SPEC_CHAR_REGEXP = /[!#)($%&'*+[.^_`|~]+/;

function getTreeNodesWithIsFilteredFlag( node ) {
    var mainResult = [];
    mainResult.children = [];
    if( node.children.length > 0 ) {
        var i;
        var childResult = [];
        for( i = 0; i < node.children.length; i++ ) {
            var outNode = getTreeNodesWithIsFilteredFlag( node.children[ i ] );
            if( outNode._node || outNode.length > 0 ) {
                if( outNode._isFiltered === true || outNode._node._isFiltered === true ) {
                    childResult.push( outNode );
                }
            }
        }
        node.children = childResult;
    }
    return node;
}

/**
 *  the given related parameters
 *
 * @param {Object} secondLevelNode - node object that has children
 * @param {Object} nodeObj - Tree elements
 *
 */
function setFlagForSubNode( secondLevelNode, nodeObj ) {
    secondLevelNode._isFiltered = true;
    var i;
    for( i = 0; i < secondLevelNode.length; i++ ) {
        secondLevelNode[ i ]._isFiltered = true;
        if( secondLevelNode[ i ].children ) {
            setFlagForSubNode( secondLevelNode[ i ].children, nodeObj );
        }
    }
}

/**
 *  the given related parameters
 *
 * @param {Object} matchingNodes - filtered list of node
 * @param {Object} nodeObj - Tree elements
 *
 */
function setParentSearchFlag( matchingNodes, nodeObj ) {
    if( matchingNodes.length > 0 ) {
        var i;
        for( i = 0; i < matchingNodes.length; i++ ) {
            var childChildNodesArray = matchingNodes[ i ];
            if( childChildNodesArray.length > 0 ) {
                var j;
                for( j = 0; j < childChildNodesArray.length; j++ ) {
                    var levelTwoChild = childChildNodesArray[ j ];
                    if( levelTwoChild.children > 0 || levelTwoChild.length > 0 ) {
                        setParentSearchFlag( levelTwoChild, nodeObj );
                    } else {
                        // for root and thrid level element
                        // for root iterate
                        let parentLevelNode = nodeObj[ levelTwoChild._ctx[ 0 ] ];
                        parentLevelNode._isFiltered = true;
                        parentLevelNode.expanded = true;
                        if( levelTwoChild._ctx.length === 3 ) {
                            const pathCom = levelTwoChild._ctx[ 0 ] + '.' + levelTwoChild._ctx[ 1 ];
                            let leafNode = _.get( nodeObj, pathCom );
                            leafNode._isFiltered = true;
                            leafNode.expanded = true;
                        }
                        if( levelTwoChild.children ) {
                            setFlagForSubNode( levelTwoChild.children, nodeObj );
                        }
                    }
                }
            } else {
                //for second level node
                var ctxVal = childChildNodesArray._ctx;
                var path = ctxVal.join();
                const pathCom = path.replace( /,/g, '.' );
                let leafNode = _.get( nodeObj, pathCom );
                leafNode._isFiltered = true;
                leafNode.expanded = true;
                let parentLevelNode = nodeObj[ childChildNodesArray._ctx[ 0 ] ];
                parentLevelNode._isFiltered = true;
                parentLevelNode.expanded = true;
                if( leafNode.children ) {
                    setFlagForSubNode( leafNode.children, nodeObj );
                }
            }
        }
    }
}

/**
 *  the given related parameters
 * @param {Object} key - Parameter name from data value
 * @param {Object} regex - Regular expression for matching value based on entered value
 * @param {Object} node - Tree elements
 */
function searchTreeOnEnteredValue( key, regex, node ) {
    var tempNode = node.getNode();
    var keyStr = _.get( tempNode, key );
    if( regex.test( keyStr ) ) {
        node._isFiltered = true;
        return node;
    } else if( node.children !== null ) {
        var i;
        var result = [];
        for( i = 0; i < node.children.length; i++ ) {
            var outNode = searchTreeOnEnteredValue( key, regex, node.children[ i ] );
            if( outNode._node || outNode.length > 0 ) {
                result.push( outNode );
            }
        }
        return result;
    }
    return null;
}

export let filterNodesOnSearchValue = function( data, nodeObj ) {
    if( data.searchBox.dbValue !== '' ) {
        if( SPEC_CHAR_REGEXP.test( data.searchBox.dbValue ) ) {
            return;
        }
        var val = '.*' + data.searchBox.dbValue + '.*';
        var regex = new RegExp( val, 'i' );

        var totalMatchingNodes = [];

        var sortedNodes = searchTreeOnEnteredValue( 'name', regex, nodeObj );
        if( sortedNodes.length > 0 ) {
            totalMatchingNodes.push( sortedNodes );
        }
        if( totalMatchingNodes.length > 0 ) {
            setParentSearchFlag( totalMatchingNodes, nodeObj );
            getTreeNodesWithIsFilteredFlag( nodeObj );
        }
        if( nodeObj ) {
            eventBus.publish( 'wysiwygTree.filteredNodes', nodeObj.children );
        } else {
            eventBus.publish( 'wysiwygCommonFrameLocation.contentLoaded' );
        }
    }
};

exports = {
    ctx,
    filterNodesOnSearchValue
};
export default exports;
/**
 * Return an Object of WysiwygActions
 *
 * @memberof NgServices
 * @member createChangeService
 */
app.factory( 'wysiwygFilterService', () => exports );
