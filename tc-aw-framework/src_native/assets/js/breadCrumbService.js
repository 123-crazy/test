// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.breadCrumbService} which provides the data for navigation bread crumb from url.
 *
 * @module js/breadCrumbService
 * @requires app
 */
import app from 'app';
import navBreadCrumbSvc from 'js/aw.navigateBreadCrumbService';
import searchFilterSvc from 'js/aw.searchFilter.service';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Reset the breadcrumb provider to loading
 *
 * @param {Object} breadCrumbConfig - bread crumb config info
 * @return {Object} breadcrumb provider
 */
export let resetBreadcrumbProvider = function( breadCrumbConfig ) {
    var breadCrumbProvider;
    if( breadCrumbConfig && breadCrumbConfig.type === 'navigate' ) {
        breadCrumbProvider = navBreadCrumbSvc
            .buildBreadcrumbProviderSkeleton( breadCrumbProvider );
    }

    return breadCrumbProvider;
};

/**
 * Refresh the breadcrumb provider
 *
 * @param {Object} breadCrumbConfig - bread crumb config info
 * @param {Object} pwaSelectionModel - selection model of primary workarea
 * @param {Object} searchFilterCategories - search filter categories
 * @param {Object} searchFilterMap - search filter map
 * @param {Object} searchCriteria - search criteria
 * @param {Object} label - breadcrumb label when there is no search criteria
 * @param {Object} secondarySearchEnabled - true if secondary search is enabled
 *
 * @return {Object} breadcrumb provider and total found information
 */
export let refreshBreadcrumbProvider = function( breadCrumbConfig, pwaSelectionModel,
    searchFilterCategories, searchFilterMap, searchCriteria, label, secondarySearchEnabled ) {
    var breadCrumbProvider;
    if( breadCrumbConfig && breadCrumbConfig.type === 'navigate' ) {
        eventBus.publish( 'navigateBreadcrumb.refresh', breadCrumbConfig.id );
        eventBus.publish( breadCrumbConfig.vm + '.refresh', breadCrumbConfig.id );
    } else {
        breadCrumbProvider = searchFilterSvc.buildBreadcrumbProvider(
            breadCrumbConfig,
            searchCriteria ? searchCriteria : label, appCtxSvc.getCtx( 'search.totalFound' ),
            pwaSelectionModel, searchFilterCategories, searchFilterMap, secondarySearchEnabled, searchCriteria );
    }
    return breadCrumbProvider;
};

exports = {
    resetBreadcrumbProvider,
    refreshBreadcrumbProvider
};
export default exports;
/**
 * Service to manage navigate bread crumb
 *
 * @class commandService
 * @param contributionService {Object} - Contribution service
 * @memberOf NgServices
 */
app.factory( 'breadCrumbService', () => exports );
