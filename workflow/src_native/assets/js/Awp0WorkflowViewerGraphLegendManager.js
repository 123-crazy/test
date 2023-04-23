// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0WorkflowViewerGraphLegendManager
 */
import * as app from 'app';
import graphLegendSvc from 'js/graphLegendService';
import eventBus from 'js/eventBus';


/**
 * Define public API
 */
var exports = {};

var formatLegendViewsData = function( legendViewsData ) {
    var formattedLgendViewsData = [];
    if( !legendViewsData ) {
        return [];
    }
    for( var i = 0; i < legendViewsData.length; i++ ) {
        var view = legendViewsData[ i ];
        //order the category types
        var orderedCategoryTypes = [];
        var formattedView = {
            displayName: 'Change',
            internalName: 'Change',
            expand: false,
            showExpand: true,
            categoryTypes: []
        };
        var objectGroup = view.objectGroup;
        if( objectGroup ) {
            var objectCategoryType = {
                internalName: 'objects',
                categories: []
            };
            for( var k = 0; k < objectGroup.length; k++ ) {
                var objectFilter = objectGroup[ k ];
                var objectCategory = {
                    internalName: objectFilter.name,
                    displayName: objectFilter.displayName,
                    categoryType: 'objects',
                    style: {
                        borderWidth: '5px',
                        borderStyle: 'solid'
                    },
                    subCategories: []
                };

                objectCategory.style.color = graphLegendSvc.colorTemplate( objectFilter.color );
                objectCategory.style.borderColor = objectCategory.style.color;
                var types = objectFilter.types;
                if( types ) {
                    for( var l = 0; l < types.length; l++ ) {
                        var type = types[ l ];
                        var subCategory = {
                            internalName: type.typeName,
                            displayName: type.displayName,
                            categoryType: objectCategory.categoryType
                        };
                        objectCategory.subCategories.push( subCategory );
                    }
                }
                objectCategoryType.categories.push( objectCategory );
            }
        }
        var relationGroup = view.relationGroup;
        if( relationGroup ) {
            var relationCategoryType = {
                internalName: 'relations',
                categories: []
            };
            for( var j = 0; j < relationGroup.length; j++ ) {
                var relationFilter = relationGroup[ j ];
                var relationCategory = {
                    internalName: relationFilter.name,
                    displayName: relationFilter.displayName,
                    categoryType: 'relations',
                    style: {
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        dashStyle: 'SOLID',
                        targetArrow: {
                            arrowShape: 'TRIANGLE',
                            arrowScale: 1.0,
                            fillInterior: true
                        },
                        thickness: 2.0
                    },
                    subCategories: []
                };

                relationCategory.style.color = graphLegendSvc.colorTemplate( relationFilter.color );
                relationCategory.style.borderColor = relationCategory.style.color;
                relationCategoryType.categories.push( relationCategory );
            }
        }
        orderedCategoryTypes.push( relationCategoryType );
        formattedView.categoryTypes.push( objectCategoryType );
        orderedCategoryTypes.push( objectCategoryType );
        formattedView.categoryTypes.push( relationCategoryType );
        formattedView.categoryTypes = orderedCategoryTypes;
        formattedLgendViewsData.push( formattedView );
    }
    return formattedLgendViewsData;
};

export let initLegendData = function( ctx, data ) {
    if( data.legend ) {
        var legendViewsData = data.legendData;
        var formattedLgendViewsData = formatLegendViewsData( legendViewsData );
        if( formattedLgendViewsData.length === 1 ) {
            formattedLgendViewsData[ 0 ].expand = true;
            data.legend.defaultActiveView = formattedLgendViewsData[ 0 ].internalName;
        } else if( formattedLgendViewsData.length > 1 ) {
            formattedLgendViewsData[ 1 ].expand = true;
            data.legend.defaultActiveView = formattedLgendViewsData[ 1 ].internalName;
        }
        //init legend
        data.legend.legendViews = formattedLgendViewsData;
        eventBus.publish( 'Awp0Workflow.legendInitialized' );
    }
};

/**
 * Initialize the category API on graph model. The APIs will be used to calculate legend count.
 *
 * @param graphModel the graph model object
 */
var initGraphCategoryApi = function( graphModel ) {
    graphModel.categoryApi = {
        getNodeCategory: function( node ) {
            if( node && node.appData ) {
                return node.appData.category;
            }

            return null;
        },
        getEdgeCategory: function( edge ) {
            if( edge ) {
                return edge.category;
            }
            return null;
        },
        getGroupRelationCategory: function() {
            return 'Structure';
        },
        getPortCategory: function( port ) {
            if( port ) {
                return port.category;
            }
            return null;
        }
    };
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0WorkflowViewerGraphLegendManager
 */

export default exports = {
    initGraphCategoryApi,
    initLegendData
};
app.factory( 'Awp0WorkflowViewerGraphLegendManager', () => exports );
