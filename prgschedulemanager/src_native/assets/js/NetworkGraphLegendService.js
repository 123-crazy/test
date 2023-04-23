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
 * @module js/NetworkGraphLegendService
 */
import app from 'app';
import legendSvc from 'js/graphLegendService';

var exports = {};

var constructLegendNodeCategory = function( internalName, displayName, borderColor ) {
    return {
        internalName: internalName,
        displayName: displayName,
        categoryType: "objects",
        isFiltered: false,
        creationMode: 0,
        isAuthorable: false,
        style: {
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: borderColor
        },
        subCategories: []
    };
};

var constructLegendSimpleEdgeCategory = function( name ) {
    return {
        internalName: name,
        displayName: name,
        categoryType: "relations",
        isFiltered: false,
        isAuthorable: true,
        style: {
            borderWidth: "2px",
            borderStyle: "solid",
            arrowOption: "TARGET",
            isHotSpotEdge: true,
            targetArrow: {
                arrowShape: "SIMPLE",
                arrowScale: 1.0
            }
        },
        subCategories: []
    };
};

export let createLegendViewsData = function() {
    var formattedLegendViewsData = {};

    var legendViews = [ {
        displayName: "Network Diagram",
        internalName: "Network Diagram",
        expand: true,
        showExpand: true,
        categoryTypes: []
    } ];

    var nodeCategoryType = {
        internalName: "objects",
        displayName: "objects",
        categories: []
    };

    var relationCategoryType = {
        internalName: "relations",
        displayName: "relations",
        categories: []
    };

    var eventNodeCategory = constructLegendNodeCategory( "Prg0Event", "Event", "rgb( 86, 151, 207 )" );

    nodeCategoryType.categories.push( eventNodeCategory );

    var delRevisionNodeCategory = constructLegendNodeCategory( "Psi0PrgDelRevision",
        "Program Deliverable Revision", "rgb(  121, 210, 121 )" );

    nodeCategoryType.categories.push( delRevisionNodeCategory );

    var workspaceObjectNodeCategory = constructLegendNodeCategory( "WorkspaceObject", "WorkspaceObject",
        "rgb( 196, 189, 151 )" );

    nodeCategoryType.categories.push( workspaceObjectNodeCategory );

    var workelementNodeCategory = constructLegendNodeCategory( "Psi0WorkElementRevision", "Work Element Revision",
        "rgb( 255, 182, 121 )" );

    nodeCategoryType.categories.push( workelementNodeCategory );

    var deliverableInstanceNodeCategory = constructLegendNodeCategory( "Psi0DelInstancesRevision",
        "Program Deliverable Instance", "rgb( 76, 157, 155)" );

    nodeCategoryType.categories.push( deliverableInstanceNodeCategory );

    legendViews[ 0 ].categoryTypes.push( nodeCategoryType );

    var prgDelRelationCategory = constructLegendSimpleEdgeCategory( "Psi0EventPrgDel" );
    prgDelRelationCategory.style.color = "rgb( 86, 151, 207 )";

    relationCategoryType.categories.push( prgDelRelationCategory );

    var delInstanceRelationCategory = constructLegendSimpleEdgeCategory( "Psi0DelInstances" );
    delInstanceRelationCategory.style.color = "rgb( 121, 210, 121  )";

    relationCategoryType.categories.push( delInstanceRelationCategory );

    var workElementPDIRelationCategory = constructLegendSimpleEdgeCategory( "Psi0WorkElementPDI" );
    workElementPDIRelationCategory.style.color = "rgb( 138, 182, 121 )";
    workElementPDIRelationCategory.isAuthorable = true;
    workElementPDIRelationCategory.subCategories.push( workElementPDIRelationCategory );

    relationCategoryType.categories.push( workElementPDIRelationCategory );

    var predecessorWorkElementRelationCategory = constructLegendSimpleEdgeCategory( "Psi0PredecessorWorkElement" );
    predecessorWorkElementRelationCategory.style.color = "rgb( 221, 115, 115 )";
    predecessorWorkElementRelationCategory.isAuthorable = true;
    predecessorWorkElementRelationCategory.subCategories.push( predecessorWorkElementRelationCategory );

    relationCategoryType.categories.push( predecessorWorkElementRelationCategory );

    legendViews[ 0 ].categoryTypes.push( relationCategoryType );

    formattedLegendViewsData.legendViews = legendViews;

    legendSvc.initLegendViewsData( formattedLegendViewsData );

    return formattedLegendViewsData;
};

export default exports = {
    createLegendViewsData
};
app.factory( 'NetworkGraphLegendService', () => exports );
