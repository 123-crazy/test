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
 * @module js/NetworkGraphDataService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

var exports = {};

var populateNodeData = function( createdObject, nodeObjects ) {

    var nodeObject = {};

    nodeObject.metaObject = createdObject;
    nodeObject.name = createdObject.props.object_string.dbValues[ 0 ];
    nodeObject.nodeId = createdObject.uid;

    nodeObject.properties = {
        Group: createdObject.type,
        StyleTag: "ObjectStyle",
        in_degree: 1,
        out_degree: 0
    };

    nodeObject.appData = {
        id: createdObject.uid,
        nodeObject: createdObject,
        isGroup: true,
        category: createdObject.type
    };
    nodeObject.itemType = "Node";
    nodeObjects.push( nodeObject );
};

var populateEdgeData = function( relationData, leftnode, rightNode, edgeObjects ) {

    var edgeObject = {};
    var relationObject = cdm.getObject( relationData.relation.uid );

    edgeObject.metaObject = relationObject;
    edgeObject.relationType = relationData.relation.type;
    edgeObject.properties = {
        StyleTag: "StructureRelationStyle"
    };
    edgeObject.leftNodeId = leftnode;
    edgeObject.rightNodeId = rightNode;
    edgeObjects.push( edgeObject );
};

export let populateNetworkGraphData = function( ctx, data, networkGraphData ) {

    var nodeObjects = [];
    var edgeObjects = [];

    if( data.eventMap.workElementCreateSuccessful ) {

        var selectedObject = data.eventMap.workElementCreateSuccessful.eventMap.workElementCreateRelationEvent.selectedObject.uid;

        _.forEach( data.graphModel.nodeMap, function( value ) {
            if( value.appData.id === selectedObject ) {
                var outDegrees = parseInt( value.appData.outDegrees, 10 );
                value.appData.outDegrees = outDegrees + 1;
            }
        } );

        var newcreateobject = data.eventMap.workElementCreateSuccessful.eventMap.workElementCreateRelationEvent.createdMainObject.uid;

        populateNodeData( data.eventMap.workElementCreateSuccessful.createdMainObject, nodeObjects );
        networkGraphData.nodes = nodeObjects;

        populateEdgeData( data.eventMap.workElementCreateSuccessful.newRelationCreated[ 0 ], selectedObject,
            newcreateobject, edgeObjects );
        networkGraphData.edges = edgeObjects;
        data.eventMap.workElementCreateSuccessful = null;

    } else {
        networkGraphData.rootIds = data.graphData.rootIds;
        networkGraphData.nodes = data.graphData.nodes;
        networkGraphData.edges = data.graphData.edges;
    }

};

export default exports = {
    populateNetworkGraphData
};
app.factory( 'NetworkGraphDataService', () => exports );
