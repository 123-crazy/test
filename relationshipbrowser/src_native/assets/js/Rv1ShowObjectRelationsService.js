//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Rv1ShowObjectRelationsService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import clientDataModel from 'soa/kernel/clientDataModel';
import RBService from 'js/Rv1RelationBrowserService';
import RBDrawNode from 'js/Rv1RelationBrowserDrawNode';
import RBDrawEdge from 'js/Rv1RelationBrowserDrawEdge';
import RBDrawService from 'js/Rv1RelationBrowserDrawService';
import legendSvc from 'js/Rv1RelationBrowserLegendService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import rbUtils from 'js/Rv1RelationBrowserUtils';
import performanceUtils from 'js/performanceUtils';

var _filtersParsed = null;

var _allDirections = [];

var exports = {};

var _IncomingFirst = true;

var _rootId = null;

var _propertyDescriptor = {
    valueType: null,
    displayName: null,
    lovs: false,
    anArray: false,
    maxLength: 256
};

var _nodeEdgesMapping = {};

var _modelObjectNodeMapping = {};

/**
 * Set the hidden property on the model object for cell rendering
 * @param {IModelObject} modelObject model object to set the properties on
 * @param {boolean} isHidden whether the model object is hidden on the graph or shown
 */
function _setObjectVisibility( modelObject, isHidden ) {
    if( modelObject.props.halfTone ) {
        modelObject.props.halfTone.dbValue = isHidden;
        modelObject.props.halfTone.dbValues = [ isHidden ];
    } else {
        var _halfToneProp = {
            dbValue: isHidden,
            dbValues: [ isHidden ],
            propertyDescriptor: _propertyDescriptor
        };
        modelObject.props.halfTone = _halfToneProp;
    }
}

/**
 * Set the direction and hidden property on the model object for cell rendering
 * @param {IModelObject} modelObject model object to set the properties on
 * @param {string} direction direction of the connection (incoming/outgoing/both)
 * @param {boolean} isHidden whether the model object is hidden on the graph or shown
 */
function _setModelProp( modelObject, direction, isHidden ) {
    var foundDirection = false;
    _.forEach( modelObject.props.awp0CellProperties.dbValues, function( dbVal ) {
        if( dbVal === direction ) {
            foundDirection = true;
        }
    } );

    if( !foundDirection ) {
        modelObject.props.awp0CellProperties.dbValues.push( direction );
    }
    _setObjectVisibility( modelObject, isHidden );
}

/**
 * Gets the directions for the connected nodes
 * @param {String} rootUid UID of the selected node
 * @param {Edge[]} edges edge information from the SOA
 * @param {String[]} filteredRelations filtered out relations
 * @return {map} map of other end UID v/s direction of connection with the rootUid
 */
function _getNodeDirections( rootUid, edges, filteredRelations ) {
    var nodeDirections = [];
    _.forEach( edges, function( edge ) {
        if( _.includes( filteredRelations, edge.relationType ) ) {
            return;
        }
        var direction = null;
        var otherEndUid = null;
        if( edge.rightId === rootUid ) {
            direction = 'incoming';
            otherEndUid = edge.leftId;
        } else if( edge.leftId === rootUid ) {
            direction = 'outgoing';
            otherEndUid = edge.rightId;
        }
        if( !direction || !otherEndUid ) {
            logger.error( 'Failed to get direction for edge with rightId=\'' +
                edge.rightId + '\' and leftId=\'' + edge.leftId + '\'' );
            return; // this means continue for _.forEach()
        }
        var existing = nodeDirections[ otherEndUid ];

        if( direction === existing ) {
            return;
        } else if( existing ) {
            direction = 'both';
        }

        nodeDirections[ otherEndUid ] = direction;
    } );
    return nodeDirections;
}

/**
 * Sets the filtered types
 * @param {Category[]} categories list of legend categories
 * @return {String[]} types filtered based on legend categories
 */
function _setFilteredTypes( categories ) {
    var filteredTypes = [];
    _.forEach( categories, function( category ) {
        if( category.isFiltered === true ) {
            filteredTypes.push( category.internalName );
        }
    } );
    return filteredTypes;
}

/**
 * checkFilter
 */
function checkFilter( list, filter ) {
    var rData = [];
    for( var i = 0; i < list.length; ++i ) {
        var _isFiltered = legendSvc.isObjectFiltered( list[ i ] );
        if( _isFiltered ) {
            continue;
        }
        if( filter !== '' ) {
            // We have a filter, don't add nodes unless the filter matches a cell property
            for( var idx = 0; idx < list[ i ].props.awp0CellProperties.dbValues.length; idx++ ) {
                var property = list[ i ].props.awp0CellProperties.dbValues[ idx ].toLocaleLowerCase().replace(
                    /\\|\s/g, '' );
                if( property.indexOf( filter.toLocaleLowerCase().replace( /\\|\s/g, '' ) ) !== -1 ) {
                    // Filter matches a property, add node to output list and go to next node
                    rData.push( list[ i ] );
                    break;
                }
            }
        } else {
            // No filter, just add the node to output list
            rData.push( list[ i ] );
        }
    }
    return rData;
}

/**
 * functionHiddenNodeList
 */
export let functionHiddenNodeList = function( data, incoming, outgoing, both ) {
    var rData = [];

    if( typeof incoming !== 'undefined' && typeof outgoing !== 'undefined' && typeof both !== 'undefined' ) {
        if( 'preferences' in data && 'RV1_DARB_Hide_Unhide_List_Order_Incoming_First' in data.preferences ) {
            var incomingFirst = data.preferences.RV1_DARB_Hide_Unhide_List_Order_Incoming_First[ 0 ];

            if( incomingFirst === 'true' ) {
                _IncomingFirst = true;
            } else {
                _IncomingFirst = false;
            }
        }

        var filter = '';
        if( 'filterBox' in data && 'dbValue' in data.filterBox ) {
            filter = data.filterBox.dbValue;
        }

        if( _IncomingFirst ) {
            rData = checkFilter( incoming, filter );
            rData = rData.concat( checkFilter( both, filter ) );
            rData = rData.concat( checkFilter( outgoing, filter ) );
        } else {
            rData = checkFilter( outgoing, filter );
            rData = rData.concat( checkFilter( both, filter ) );
            rData = rData.concat( checkFilter( incoming, filter ) );
        }
    }

    return rData;
};

/**
 * This will identify which types or relations are hidden
 * @param {Object} relationContext relation browser context (i.e. ctx.RelationBrowser)
 * @param {Object} graph graph context (i.e. ctx.graph)
 */
export let setFilterInfo = function( relationContext, graph ) {
    _filtersParsed = AwPromiseService.instance.defer();
    var filteredTypes = null;
    var filteredRelations = null;
    _.forEach( graph.legendState.activeView.categoryTypes, function( categoryType ) {
        if( categoryType.internalName === 'objects' ) {
            filteredTypes = _setFilteredTypes( categoryType.categories );
        } else if( categoryType.internalName === 'relations' ) {
            filteredRelations = _setFilteredTypes( categoryType.categories );
        }
    } );

    var filterInfo = {
        filteredTypes: filteredTypes,
        filteredRelations: filteredRelations
    };
    _filtersParsed.resolve( filterInfo );
};

/**
 * Hides or unhides nodes in the graph
 * @param {Object} ctx the context
 * @param {Object} data data
 * @param {Object} relationContext Relation Browser context (i.e. ctx.RelationBrowser)
 * @param {Object} graph graph context (i.e. ctx.graph)
 * @param {Object} sortedLayoutPreferenceValue sorted layout preference value
 */
export let functionHideUnhideNodes = function( ctx, data, relationContext, graph, sortedLayoutPreferenceValue ) {
    var selectedObject = null;
    if( data.dataProviders.dataProviderHiddenNodeList.selectedObjects[ 0 ] ) {
        selectedObject = data.dataProviders.dataProviderHiddenNodeList.selectedObjects[ 0 ];

        var isHidden = selectedObject.props.halfTone.dbValue;
        var direction = _allDirections[ selectedObject.uid ];

        if( direction === 'incoming' ) {
            data.expandDirection = 'backward';
        } else if( direction === 'outgoing' ) {
            data.expandDirection = 'forward';
        } else if( direction === 'both' ) {
            data.expandDirection = 'all';
        }

        if( isHidden ) {
            isHidden = false;
        } else {
            isHidden = true;
        }

        var modelObject = clientDataModel.getObject( selectedObject.uid );
        _setModelProp( modelObject, data.i18n.direction + '\\:' + data.i18n[ direction ], isHidden );

        if( isHidden ) {
            var removedNode = RBService.getNodeFromModelObjectId( selectedObject.uid );
            graph.graphModel.graphControl.graph.removeNodes( [ removedNode ] );
            rbUtils.resolveConnectedGraph( graph.graphModel );
        } else {
            var addedNode = _modelObjectNodeMapping[ modelObject.uid ];

            var graphUpdated = graph.graphModel.graphControl.graph;

            var graphData = data.graphData;

            graphData.nodes = [];
            graphData.nodes.push( addedNode );

            graphData.edges = [];
            graphData.edges = _nodeEdgesMapping[ addedNode.id ].slice( 0 );

            graphUpdated.graphData = graphData;

            var addedNodes = [];
            var edges = [];
            addedNodes = RBDrawNode.processNodeData( graph.graphModel, graphUpdated.graphData, graph.legendState.activeView );
            edges = RBDrawEdge.processEdgeData( graph.graphModel, graphUpdated.graphData, graph.legendState.activeView );

            if( graph.graphModel.isShowLabel === false ) {
                graph.graphModel.graphControl.graph.showLabels( graph.graphModel.isShowLabel );
            }

            var performanceTimer = performanceUtils.createTimer();
            RBDrawService.applyGraphLayout(
                ctx, data, graph.graphModel, addedNodes, edges, false, performanceTimer, sortedLayoutPreferenceValue );
        }
        eventBus.publish( 'updateHiddenList', {} );
    }
};

/**
 * Returns SOA policy required to ensure filter properties are loaded with SOA response
 * @param {Object} ctx application context
 * @param {Object[]} filterList filter list
 * @return {Object} SOA policy
 */
export let getQueryNetworkPolicy = function( ctx, filterList ) {
    return RBService.getQueryNetworkPolicy( ctx, filterList );
};

/**
 * when app detects node addition/removal event, should update the Model Object opacity in the relations panel.
 * @param {Object} eventData Items added to graph
 * @param {Array} listedNodes nodes listed on the panel
 * @param {Boolean} isHidden specify if the object is hidden on graph now
 */
export let graphVisibilityChanged = function( eventData, listedNodes, isHidden ) {
    try {
        if( !eventData ) {
            return;
        }
        var _changedCount = 0;
        _.forEach( eventData.nodes, function( graphNode ) {
            _.forEach( listedNodes, function( modelObject ) {
                if( modelObject.uid !== graphNode.appData.nodeObject.uid ) {
                    return;
                }
                _setObjectVisibility( modelObject, isHidden );
                ++_changedCount;
            } );
        } );
        if( _changedCount > 0 ) {
            eventBus.publish( 'updateHiddenList', {} );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

/**
 * Parses the response from the queryNetwork2 SOA
 * @param {Object} data
 * @param {Object} relationContext Relation Browser context (i.e. ctx.RelationBrowser)
 * @param {Object} graph graph context (i.e. ctx.graph)
 */
export let parseRelatedObjects = function( data, relationContext, graph ) {
    if( !_filtersParsed.promise ) {
        return;
    }
    _rootId = null;
    _filtersParsed.promise.then( function( filterInfo ) {
        relationContext.incoming = [];
        relationContext.outgoing = [];
        relationContext.both = [];

        var graphData = data.graphData;
        if( graphData === null ) {
            graphData = graph.graphModel.graphData;
        }
        _allDirections = _getNodeDirections( graphData.rootIds[ 0 ],
            graphData.edges, filterInfo.filteredRelations );

        _.forEach( graphData.nodes, function( nodeData ) {
            if( _.includes( graphData.rootIds, nodeData.metaObject.uid ) ) {
                if( _rootId === null ) {
                    _rootId = nodeData.metaObject.uid;
                }
                return;
            }

            if( nodeData.metaObject.uid === _rootId ) {
                return;
            }

            if( _.includes( filterInfo.filteredTypes, nodeData.props.Group ) ) {
                logger.debug( 'Filtering out ' + nodeData.metaObject.uid + ' based on object type' );
                return;
            }

            var modelObject = clientDataModel.getObject( nodeData.metaObject.uid );
            var graphNodeData = graph.graphModel.nodeMap[ modelObject.uid ];
            var isHidden = false;

            if( !graphNodeData ) {
                isHidden = true;
            }

            var direction = _allDirections[ modelObject.uid ];

            if( !direction || direction.length === 0 ) {
                logger.debug( 'Failed to get direction for ' + modelObject.uid );
                return;
            }

            if( direction === 'incoming' ) {
                relationContext.incoming.push( modelObject );
            } else if( direction === 'outgoing' ) {
                relationContext.outgoing.push( modelObject );
            } else {
                relationContext.both.push( modelObject );
            }

            for( var i = 0; i < graphData.edges.length; i++ ) {
                if( modelObject.uid === graphData.edges[ i ].rightId || modelObject.uid === graphData.edges[ i ].leftId ) {
                    var edges = [];
                    if( _nodeEdgesMapping[ nodeData.id ] !== undefined ) {
                        edges = _nodeEdgesMapping[ nodeData.id ].slice( 0 );
                        edges.push( graphData.edges[ i ] );
                        delete _nodeEdgesMapping[ nodeData.id ];
                    } else {
                        edges.push( graphData.edges[ i ] );
                    }
                    _nodeEdgesMapping[ nodeData.id ] = edges;
                }
            }
            _modelObjectNodeMapping[ modelObject.uid ] = nodeData;

            _setModelProp( modelObject, data.i18n.direction + '\\:' + data.i18n[ direction ], isHidden );
        } ); // end _.forEach
        eventBus.publish( 'updateHiddenList', {} );
    } ); // end .promise.then()
};

/**
 * Rv1ShowObjectRelationsService factory
 */

export default exports = {
    functionHiddenNodeList,
    setFilterInfo,
    functionHideUnhideNodes,
    getQueryNetworkPolicy,
    graphVisibilityChanged,
    parseRelatedObjects
};
app.factory( 'Rv1ShowObjectRelationsService', () => exports );
