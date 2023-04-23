// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/CAW0AnalysisDataService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';
import localeSvc from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import vmoSvc from 'js/viewModelObjectService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import graphLegendSvc from 'js/graphLegendService';
import 'js/graphFilterService';

var exports = {};
var METHODOLOGY_VIEW = 'CAPA';

var formatLegendViewsData = function( data ) {
    var legendViewsData = data.legendData;
    var formattedLgendViewsData = [];
    if( !legendViewsData ) {
        return [];
    }

    for( var i = 0; i < legendViewsData.length; i++ ) {
        var view = legendViewsData[ i ];
        var formattedView = {
            displayName: view.displayName,
            internalName: view.name,
            expand: false,
            showExpand: true,
            categoryTypes: []
        };

        var groups = view.groups;
        if( groups ) {
            for( var j = 0; j < groups.length; j++ ) {
                var group = groups[ j ];
                var categoryType = {
                    internalName: group.name,
                    categories: []
                };

                // The display name is derived from the categoryType.internalName (group.name above) as it maps
                // to the localized i18n string defined in ...Messages.json and referenced in ...ViewModel.json.
                // If there is no mapping, provide a fallback.
                categoryType.displayName = data.i18n[ categoryType.internalName ];
                if( typeof categoryType.displayName !== 'string' ) { // if no mapping...
                    if( categoryType.internalName === 'objects' ) {
                        categoryType.displayName = data.i18n.objects;
                    } else if( categoryType.internalName === 'relations' ) {
                        categoryType.displayName = data.i18n.relations;
                    }
                    if( typeof categoryType.displayName !== 'string' ) { // if still no mapping...
                        categoryType.displayName = data.i18n.objects;
                        logger.error( 'Setting up Legend View Categories: Failed to find localized text for category type: ' + categoryType.internalName + '.  Using \'' + data.i18n.objects + '\'.' );
                    }
                }

                var filters = group.filters;
                if( filters ) {
                    for( var k = 0; k < filters.length; k++ ) {
                        var filter = filters[ k ];
                        var category = {
                            internalName: filter.name,
                            displayName: filter.displayName,
                            categoryType: group.name,
                            isFiltered: false,
                            creationMode: 0,
                            isAuthorable: true,
                            style: {
                                borderWidth: '1px',
                                borderStyle: 'solid'
                            },
                            subCategories: []
                        };

                        category.style.color = graphLegendSvc.colorTemplate( filter.color );
                        category.style.borderColor = category.style.color;
                        var types = filter.types;
                        if( types ) {
                            for( var l = 0; l < types.length; l++ ) {
                                var type = types[ l ];
                                var subCategory = {
                                    internalName: type.internalName,
                                    displayName: type.displayName,
                                    categoryType: category.categoryType,
                                    creationMode: 0
                                };
                                category.subCategories.push( subCategory );
                            }
                        }
                        categoryType.categories.push( category );
                    }
                }
                formattedView.categoryTypes.push( categoryType );
            }
        }

        // order the category types by grouping them together
        var orderedCategoryTypes = [];
        var appendCategoryTypesObjects = function( categoryType ) {
            if( categoryType.internalName === 'objects' ) {
                orderedCategoryTypes.push( categoryType );
            }
        };

        var appendCategoryTypesRelations = function( categoryType ) {
            if( categoryType.internalName === 'relations' ) {
                orderedCategoryTypes.push( categoryType );
            }
        };

        _.forEach( formattedView.categoryTypes, appendCategoryTypesObjects );

        _.forEach( formattedView.categoryTypes, appendCategoryTypesRelations );

        formattedView.categoryTypes = orderedCategoryTypes;
        formattedLgendViewsData.push( formattedView );
    }
    return formattedLgendViewsData;
};

export let initLegendData = function( ctx, data ) {
    if( data.legendData ) {
        var legendViewsData = formatLegendViewsData( data );

        // Set first view as default
        if( legendViewsData.length > 0 ) {
            legendViewsData[ 0 ].expand = true;
            data.legend.defaultActiveView = METHODOLOGY_VIEW;
        }

        // init legend
        data.legend.legendViews = legendViewsData;

        // the graph would set the active view eventually but not necessarily
        // before we need to access it, so we are forcing it here.
        if( !ctx.graph.legendState.activeView ) {
            graphLegendSvc.initLegendActiveView( data.legend, ctx.graph.legendState );
        }

        eventBus.publish( 'Caw0Methodology.legendInitialized' );
    }
};

/**
 * CAW0AnalysisDataService factory
 */

export default exports = {
    initLegendData
};
app.factory( 'CAW0AnalysisDataService', () => exports );
