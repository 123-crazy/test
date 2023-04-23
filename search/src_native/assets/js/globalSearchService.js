// Copyright 2018 Siemens Product Lifecycle Management Software Inc.
/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */

/* global*/

/**
 * @module js/globalSearchService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import appCtxSvc from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import soaService from 'soa/kernel/soaService';
import searchFilterSvc from 'js/aw.searchFilter.service';
import viewModelObjectSvc from 'js/viewModelObjectService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import localeSvc from 'js/localeService';
import awSearchLocationFilterPanelService from 'js/awSearchLocationFilterPanelService';
import searchCommonUtils from 'js/searchCommonUtils';
import searchPrefilterSvc from 'js/searchPrefilterService';
import AwBaseService from 'js/awBaseService';
import analyticsSvc from 'js/analyticsService';

export default class GlobalSearchService extends AwBaseService {
    constructor() {
        super();
        this._selectPrefilterText = '';
        this._anyPrefilterText = '';
        this.SEARCH_NAME_TOKEN = 'teamcenter_search_search';
        this.ADVANCED_SEARCH_NAME_TOKEN = 'teamcenter_search_advancedSearch';
        this.PREFILTER_PREFIX = 'AWS_SearchPreFilter_Property';
        this.SELECTED_VALUE = '_SelectedValue';
        this.PREFILTER_SEPARATOR = ': ';
        this._preFilters = [];
        this.currentCriteria = null;
        this.currentFilterString = null;
        localeSvc.getTextPromise( 'SearchMessages', true ).then( ( localTextBundle ) => {
            this._selectPrefilterText = localTextBundle.selectPrefilter;
            this._anyPrefilterText = localTextBundle.any;
        } );
        GlobalSearchService.getAdvancedSearchVisibility();
    }

    set_SEARCH_NAME_TOKEN( token = 'teamcenter_search_search' ) {
        this.SEARCH_NAME_TOKEN = token;
    }

    /**
     * addPrefixForPrefilter
     *
     * @param {*} filterMap filterMap
     */
    addPrefixForPrefilter( filterMap ) {
        _.forEach( filterMap, function( value ) {
            // add prefix for prefilter
            if ( value && Array.isArray( value ) ) {
                _.forEach( value, function( addprefix, index, arr ) {
                    if ( addprefix.trim().length !== 0 ) {
                        if ( addprefix !== '$TODAY' && addprefix !== '$THIS_WEEK' && addprefix !== '$THIS_MONTH' ) {
                            arr[index] = 'AW_PreFilter_' + addprefix;
                        }
                    }
                } );
            }
        } );
    }

    /**
     * selectPrefilter
     *
     * @param {*} data data
     */
    selectPrefilter( data ) {
        var context = data.eventData;
        if ( context.property.propertyName === 'selectPrefilter1' ||
            context.property.propertyName === 'selectPrefilter2' ) {
            this.updatePrefilterText( data, context, true );
        }
    }

    /**
     * Update prefilters for narrow mode
     *
     * @param {*} data data
     */
    selectNarrowModePrefilter( data ) {
        var context = data.eventData;
        if ( context.property.propertyName === 'selectPrefilter1' ||
            context.property.propertyName === 'selectPrefilter2' ) {
            this.updatePrefilterText( data, context, false );
        }
    }

    /**
     * updateSinglePrefilterText
     * @function updateSinglePrefilterText
     * @param {Integer} id id
     * @param {Integer} index index
     * @param {Boolean} bSetPref true to set preference
     * @param {Object} currProp current Property
     * @param {Object} data data
     * @param {Object} property property
     * @param {Object} ctx ctx
     */
    updateSinglePrefilterText( id, index, bSetPref, currProp, data, property, ctx ) {
        var idString = ( id + 1 ).toString();
        var newProp = '';
        if ( index > 0 && currProp && currProp.substring( index ) === property.propertyDisplayName ) {
            newProp = currProp;
        } else {
            var defaultText = this._selectPrefilterText + this._preFilters[id].displayName;
            var tmpProp = this.getPrefilterText( property, this._preFilters[id].displayName + this.PREFILTER_SEPARATOR,
                defaultText, this._preFilters[id] );
            if ( tmpProp.isDefault ) {
                data['selectPrefilter' + idString].dbValue = '';
            }
            newProp = tmpProp.newProp;
        }
        data['selectPrefilter' + idString].propertyDisplayName = newProp;
        if ( ctx !== undefined ) {
            if ( id === 0 ) {
                ctx.ownPrefilters.propDisplayName = newProp;
                ctx.ownPrefilters.selectedOwner = property.dbValue;
            } else {
                ctx.catPrefilters.propDisplayName = newProp;
                ctx.catPrefilters.selectedCategory = property.dbValue;
            }
        }
        this._preFilters[id].propDisplayName = newProp;
    }

    /**
     * updatePrefilterText
     * @function updatePrefilterText
     * @param {Object} data data
     * @param {Object} eventData eventData
     * @param {Boolean} bSetPref true to set preference
     */
    updatePrefilterText( data, eventData, bSetPref ) {
        var id = 0;
        var currProp = eventData.previousSelect;
        var property = eventData.property;
        var ctx = appCtxSvc.getCtx( 'searchPreFilters' );
        var index = currProp === undefined ? -1 : currProp.indexOf( property.propertyDisplayName );
        if ( property.propertyLabelDisplay === 'PROPERTY_LABEL_AT_SIDE' ) {
            id = 1;
        } else if ( property.propertyLabelDisplay === 'PROPERTY_LABEL_AT_RIGHT' ) {
            id = 2;
        }
        this.updateSinglePrefilterText( id - 1, index, bSetPref, currProp, data, property, ctx );
        if ( currProp !== undefined ) {
            var name = this.getPrefilterName( id );
            var values = [];
            values[0] = property.dbValue;
          if ( bSetPref ) {
                preferenceSvc.setStringValue( name, values );
            }
        }
        if ( ctx !== undefined ) {
            appCtxSvc.updateCtx( 'searchPreFilters', ctx );
        }
    }

    /**
     * getPrefilterText
     * @function getPrefilterText
     * @param {Object} property property
     * @param {Object} prefix prefix
     * @param {String} defaultText defaultText
     * @param {Object} _preFilter _preFilter
     * @returns {Object} updated filter property
     */
    getPrefilterText( property, prefix, defaultText, _preFilter ) {
        var prop = {};
        prop.isDefault = false;
        if ( property.dbValue && property.dbValue !== 'ANY' ) {
            if ( !property.propertyDisplayName ) {
                var index = _.findIndex( _preFilter.listItems, ( listItem ) => {
                    return listItem.staticElementObject === property.dbValue;
                } );
                if ( index > -1 ) {
                    property.propertyDisplayName = _preFilter.listItems[index].staticDisplayValue;
                } else {
                    prop.isDefault = true;
                }
            }
        } else {
            prop.isDefault = true;
        }
        prop.newProp = prop.isDefault ? defaultText : prefix + property.propertyDisplayName;
        return prop;
    }

    /**
     * getPrefilterName
     * @function getPrefilterName
     * @param {Integer} id id
     * @returns {String} prefilter name
     */
    getPrefilterName( id ) {
        return this.PREFILTER_PREFIX + id + this.SELECTED_VALUE;
    }

    /**
     * getAdvancedSearchVisibility
     * @function getAdvancedSearchVisibility
     * @returns {Object} promise
     */
    static getAdvancedSearchVisibility() {
        var deferred = AwPromiseService.instance.defer();

        preferenceSvc.getStringValue( 'AW_Advanced_Search_Visibility' ).then( ( prefValue ) => {
            appCtxSvc.updateCtx( 'advancedSearchVisibility', prefValue );
            deferred.resolve( prefValue );
        } );
        return deferred.promise;
    }

    /**
     * getPrefilterValue
     * @function getPrefilterValue
     * @param {Object} viewProp viewProp
     * @param {Integer} id id
     * @param {String} prefix prefix
     * @param {String} defaultText defaultText
     * @param {Object} _preFilter _preFilter
     * @returns {Object} updated filter property
     */
    getPrefilterValue( viewProp, id, prefix, defaultText, _preFilter ) {
        var name = this.getPrefilterName( id );
        var value = '';
        var deferred = AwPromiseService.instance.defer();

        preferenceSvc.getStringValue( name ).then( ( prefValue ) => {
            prefValue = prefValue === null ? value : prefValue;
            viewProp.dbValue = prefValue;
            var tmpProp = this.getPrefilterText( viewProp, prefix, defaultText, _preFilter );
            searchPrefilterSvc.updatePrefiltersCtx( tmpProp, viewProp, id, prefValue );
            deferred.resolve( prefValue );
        } );
        return deferred.promise;
    }

    /**
     * @function initialize
     * @param {Object} data data
     * @param {Object} eventData eventData
     */
    initialize( data, eventData ) {
        if ( this._preFilters.length === 0 ) {
            eventBus.publish( 'awPrefilter.getPrefilters' );
        }
        if ( this._preFilters.length > 0 ) {
            this.populateDataProviders( data );
        }
        searchCommonUtils.updateSearchCriteria( data, eventData );
    }

    /**
     * @function setPrefilters
     * @param {Object} data data
     */
    setPrefilters( data ) {
        this.setPrefilterText( data.selectPrefilter1, 0 );
        this.setPrefilterText( data.selectPrefilter2, 1 );
    }

    /**
     * @function setPrefilterText
     * @param {Object} prop prop
     * @param {Integer} id id
     */
    setPrefilterText( prop, id ) {
        var defaultText = this._selectPrefilterText + this._preFilters[id].displayName;
        this.getPrefilterValue( prop, id + 1, this._preFilters[id].displayName + this.PREFILTER_SEPARATOR, defaultText,
            this._preFilters[id] );
    }

    /**
     * Returns categories from search response
     *
     *
     * @returns {ObjectArray} The array of child node objects to be displayed.
     */
    populateOwnerPrefilters() {
        var ownPrefilters = {};
        ownPrefilters.response = null;
        ownPrefilters.totalFound = 0;

        if ( this._preFilters.length > 0 ) {
            ownPrefilters.response = this._preFilters[0].listItems;
            ownPrefilters.totalFound = this._preFilters[0].listItems.length;
            ownPrefilters.displayName = this._preFilters[0].displayName;
            ownPrefilters.filterInternalName = this._preFilters[0].internalName;
        }

        ownPrefilters.selectedOwner = null;

        return ownPrefilters;
    }

    /**
     * Returns categories from search response
     *
     *
     * @returns {ObjectArray} The array of child node objects to be displayed.
     */
    populateCategoryPrefilters() {
        var catPrefilters = {};
        catPrefilters.response = null;
        catPrefilters.totalFound = 0;

        if ( this._preFilters.length > 0 ) {
            catPrefilters.response = this._preFilters[1].listItems;
            catPrefilters.totalFound = this._preFilters[0].listItems.length;
            catPrefilters.displayName = this._preFilters[1].displayName;
            catPrefilters.filterInternalName = this._preFilters[1].internalName;
        }

        catPrefilters.selectedCategory = null;

        return catPrefilters;
    }

    /**
     * @function populatePrefilters
     * @param {Object} response response
     * @returns {ObjectArray} prefilters.
     */
    populatePrefilters( response ) {
        this._preFilters = searchCommonUtils.processSoaResponse( response.properties );
        return this._preFilters;
    }

    /**
     * @function populateDataProviders
     * @param {Object} data data
     * @returns {ObjectArray} prefilters.
     */
    populateDataProviders( data ) {
        if ( this._preFilters.length === 0 ) {
            this._preFilters = searchCommonUtils.processSoaResponse( data.response.properties );
        }
        var prefilters = appCtxSvc.getCtx( 'searchPreFilters' );
        if ( prefilters === undefined ) {
            //populate prefilters again
            prefilters = {};

            prefilters.ownPrefilters = this.populateOwnerPrefilters();
            prefilters.catPrefilters = this.populateCategoryPrefilters();
            appCtxSvc.registerCtx( 'searchPreFilters', prefilters );
        }
        data.dataProviders.ownerPrefilterProvider.update( prefilters.ownPrefilters.response,
            prefilters.ownPrefilters.totalFound );
        data.dataProviders.categoryPrefilterProvider.update( prefilters.catPrefilters.response,
            prefilters.catPrefilters.totalFound );

        this.setPrefilters( data );
        return prefilters;
    }

    /**
     * @function registerSearchSearch
     */
    registerSearchSearch() {
        var ctxDisableAutoOpenFilterPanel = appCtxSvc.ctx.preferences.AW_Disable_Auto_Open_Filter_Panel;
        if ( ctxDisableAutoOpenFilterPanel && ctxDisableAutoOpenFilterPanel[0] === 'TRUE' ) {
            awSearchLocationFilterPanelService.filterPanelForceClose();
        }

        var ctx = appCtxSvc.getCtx( 'searchSearch' );
        if ( ctx === undefined || ctx === null ) {
            ctx = {};
            appCtxSvc.registerCtx( 'searchSearch', ctx );
        }
    }
    /**
     * @function performGlobalSearch2
     * @param {Object} criteria criteria
     * @param {Object} ownerPrefilter ownerPrefilter
     * @param {Object} categoryPrefilter categoryPrefilter
     */
    performGlobalSearch2( criteria, ownerPrefilter, categoryPrefilter ) {
        this.registerSearchSearch();
        this.performGlobalSearch( criteria, ownerPrefilter, categoryPrefilter );
    }
    /**
     * @function performGlobalSearch
     * @param {Object} criteria criteria
     * @param {Object} ownerPrefilter ownerPrefilter
     * @param {Object} categoryPrefilter categoryPrefilter
     */
    performGlobalSearch( criteria, ownerPrefilter, categoryPrefilter ) {
        var analyticsEvtData = this.populateAnalyticsParams( 'cmdSearch', 'Global Search' );
        if ( criteria ) {
            analyticsEvtData.sanSearchType = this.populateSearchType( criteria, ownerPrefilter, categoryPrefilter );
        }
        analyticsSvc.logNonDeclarativeCommands( analyticsEvtData );

        var locationContext = appCtxSvc.getCtx( 'locationContext.ActiveWorkspace:Location' );
        if ( locationContext &&
            locationContext !== 'com.siemens.splm.client.search.SearchLocation' &&
            locationContext !== 'showGatewayLocation' ) {
            if ( !criteria || criteria.trim().length === 0 ) {
                eventBus.publish( 'search.emptySearch' );
                return;
            }
        }

        var filterMap = {};
        var filter = this.getFilter( 0, ownerPrefilter );
        filterMap[filter.key] = filter.values;

        filter = this.getFilter( 1, categoryPrefilter );
        filterMap[filter.key] = filter.values;

        this.forceSearch( criteria, filterMap );
    }

    forceSearch2( criteria, filterMap ) {
        this.registerSearchSearch();
        this.forceSearch( criteria, filterMap );
    }

    forceSearch( criteria, filterMap ) {
        var siteFilter = this.getSitePreFilter();
        if ( siteFilter ) {
            filterMap[siteFilter.key] = siteFilter.values;
        }
        var filterString = searchFilterSvc.buildFilterString( filterMap );

        this.addPrefixForPrefilter( filterMap );

        var context = {
            source: 'globalSearch',
            criteria: criteria,
            filterString: filterString,
            filterMap: filterMap
        };

        this.removeSavedSearchUidFromCtx();
        this.clearListOfExpandedCategoriesFromCtx( 'searchFilterPanel' );
        this.clearSortValuesFromCtx();

        var ctx = appCtxSvc.getCtx( 'searchSearch' );
        ctx.criteria = criteria;
        delete ctx.searchStringPrimary;
        if ( ctx.searchStringSecondary ) {
            delete ctx.searchStringSecondary;
            eventBus.publish( 'search.clearSearchBox' );
        }
        var searchInfoCtx = appCtxSvc.getCtx( 'searchInfo' );
        if ( !searchInfoCtx ) {
            searchInfoCtx = {};
        }
        searchInfoCtx.globalSearch = true;
        appCtxSvc.registerCtx( 'searchInfo', searchInfoCtx );
        appCtxSvc.updateCtx( 'searchSearch', ctx );
        //If the search context is exactly the same, fire search.doSearch event
        if ( AwStateService.instance.current.name === this.SEARCH_NAME_TOKEN && this.currentCriteria === criteria &&
            this.currentFilterString === filterString ) {
            eventBus.publish( 'search.doSearch', context );
        } else {
            //Recent search directive listens for this event (and search.doSearch) to save a search as recent
            eventBus.publish( 'search.doSearch2', context );
        }
        searchFilterSvc.doSearch( this.SEARCH_NAME_TOKEN, criteria, filterMap );

        this.currentCriteria = criteria;
        this.currentFilterString = filterString;
    }

    /**
     * Simple wrapper around $state.go with new searchCriteria
     * @function advancedSearchLink
     * @returns {NULL} null.
     */
    advancedSearchLink() {
        //There is a known issue with angularJs 1.6.x below that the below call would display a "Transition Prevented"
        //even for a legitimate call to a different url that does not want to inherit the state and parameters.
        //(https://github.com/christopherthielen/ui-router-extras/issues/356)
        //Here we ignore the return, because after all we just need to GO TO that url which is accomplished within AwStateService.instance.go,
        //so the return value has no use for us.
        // Clear the advancedSearch context when the link is clicked.
        appCtxSvc.updateCtx( 'advancedSearch', {} );
        AwStateService.instance.go( this.ADVANCED_SEARCH_NAME_TOKEN );

        var analyticsEvtData = this.populateAnalyticsParams( 'Awp0AdvancedSearch', 'Advanced Search' );
        analyticsSvc.logNonDeclarativeCommands( analyticsEvtData );

        return null;
    }

    /**
     * Wrapper around getSuggestions SOA
     *
     * @function getSuggestions
     * @param {String} searchString searchString
     * @param {Integer} maxCount maxCount
     * @param {Object} data data
     * @returns {Object} data data
     */
    getSuggestions( searchString, maxCount, data ) {
        var request2 = {
            searchInput: {
                searchString: searchString,
                maxCount: maxCount
            }
        };

        soaService.postUnchecked( 'Internal-AWS2-2012-10-FullTextSearch', 'getSuggestions', request2 )
            .then( ( response ) => {
                if ( response.ServiceData && response.ServiceData.partialErrors &&
                    response.ServiceData.partialErrors.length > 0 &&
                    response.ServiceData.partialErrors[0].errorValues[0].code === 141151 ) {
                    console.log( 'Solr is down, cannot show suggestions.\n\t' );
                } else {
                    data.suggestions = response.suggestions;
                }

                data.showPopup = true;
            } );

        return data;
    }

    /**
     * Function to remove Saved Search UID from the context
     */
    removeSavedSearchUidFromCtx() {
        // Clear savedSearchUid in "searchSearch" context
        var ctx = appCtxSvc.getCtx( 'searchSearch' );
        if ( ctx === undefined || ctx === null ) {
            ctx = {};
            appCtxSvc.registerCtx( 'searchSearch', ctx );
        } else {
            delete ctx.savedSearchUid;
        }

        // Clear savedSearchUid in "savedSearch" context
        var savedSearchCtx = appCtxSvc.getCtx( 'savedSearch' );
        if ( savedSearchCtx !== undefined && savedSearchCtx !== null ) {
            delete savedSearchCtx.savedSearchUid;
            appCtxSvc.updateCtx( 'savedSearch', savedSearchCtx );
        }

        // Clear savedSearchUid in "savedSearch" context
        var searchCtx = appCtxSvc.getCtx( 'search' );
        if ( searchCtx !== undefined && searchCtx !== null && searchCtx.criteria !== null && searchCtx.criteria !== undefined ) {
            delete searchCtx.criteria.savedSearchUid;
            appCtxSvc.updateCtx( 'search', searchCtx );
        }
    }

    /**
     * Function to clear sort values from context
     */
    clearSortValuesFromCtx() {
        var searchRespInfoContext = appCtxSvc.getCtx( 'searchResponseInfo' );
        if ( typeof searchRespInfoContext !== 'undefined' && searchRespInfoContext !== null ) {
            if ( typeof searchRespInfoContext.currentSortCriteria !== 'undefined' && searchRespInfoContext.currentSortCriteria !== null ) {
                delete searchRespInfoContext.currentSortCriteria;
                appCtxSvc.updateCtx( 'searchResponseInfo', searchRespInfoContext );
            }
        }

        var awp0SearchResultsContext = appCtxSvc.getCtx( 'Awp0SearchResults' );
        if ( typeof awp0SearchResultsContext !== 'undefined' && awp0SearchResultsContext !== null ) {
            if ( typeof awp0SearchResultsContext.sortCriteria !== 'undefined' && awp0SearchResultsContext.sortCriteria !== null ) {
                delete awp0SearchResultsContext.sortCriteria;
                appCtxSvc.updateCtx( 'Awp0SearchResults', awp0SearchResultsContext );
            }
        }
        var sublocation = appCtxSvc.getCtx( 'sublocation' );
        if ( typeof sublocation !== 'undefined' && sublocation !== null ) {
            if ( typeof sublocation.sortCriteria !== 'undefined' && sublocation.sortCriteria !== null ) {
                delete sublocation.sortCriteria;
                appCtxSvc.updateCtx( 'sublocation', sublocation );
            }
        }
    }

    /**
     * @function getFilter
     * @param {Integer} id id
     * @param {Object} prefilter prefilter
     * @returns {Object} categoryPrefilter categoryPrefilter
     */
    getFilter( id, prefilter ) {
        return {
            key: this._preFilters[id].internalName,
            values: [ prefilter ]
        };
    }

    /**
     * Return owning site prefilter information if AWC_Search_DisplayODSContent preference is set.
     * @function getSitePreFilter
     * @returns {Object} site prefilter
     */
    getSitePreFilter() {
        var ctxPreference = appCtxSvc.getCtx( 'preferences.AWC_Search_DisplayODSContent' );
        if ( ctxPreference ) {
            var values = ctxPreference[0];
            if ( _.toLower( values ) === 'true' ) {
                return {
                    /*
                     * the OwningSite.owning_site is a property which server side filters on to return local or remote
                     * objects. This property does not exists in DB. It's a hardcoded value that server side expects.
                     */
                    key: 'OwningSite.owning_site',
                    values: [ 'local' ]
                };
            }
        }
        return undefined;
    }

    /**
     * @function initialize2
     * @param {Object} data data
     * @param {Object} eventData eventData
     */
    initialize2( data, eventData ) {
        if ( this._preFilters.length === 0 ) {
            eventBus.publish( 'awPrefilter.getPrefilters' );
        }
        if ( this._preFilters.length > 0 ) {
            this.populateDataProviders2( data );
        }
        var revRuleViewPropName;

        try {
            revRuleViewPropName = appCtxSvc.ctx.userSession.props.awp0RevRule.propertyName;
        } catch ( ex ) {
            //no op
        }
        if ( appCtxSvc.ctx.userSession && appCtxSvc.ctx.userSession.uid && !revRuleViewPropName ) {
            appCtxSvc.ctx.userSession = viewModelObjectSvc.createViewModelObject(
                appCtxSvc.ctx.userSession.uid, 'Edit' );
        }
        searchCommonUtils.updateSearchCriteria( data, eventData );
    }

    /**
     * Populate data providers
     * @function populateDataProviders
     * @param {Object} data data
     */
    populateDataProviders2( data ) {
        this.populatePrefilters2( data );
        this.setPrefilters2( data );
    }

    /**
     * Populate prefilters
     * @param {*} data data
     * @returns {object} prefilters
     */
    populatePrefilters2( data ) {
        // If the cache is empty, process the search response
        if ( this._preFilters.length === 0 ) {
            this._preFilters = searchCommonUtils.processSoaResponse( data.response.properties );
        }
        // Read prefilters saved in the context
        var prefilters = appCtxSvc.getCtx( 'searchPreFilters' );
        if ( prefilters === undefined ) {
            // populate prefilters again
            prefilters = {};
            prefilters.ownPrefilters = this.populatePrefilterValues( this._preFilters, 0 );
            prefilters.catPrefilters = this.populatePrefilterValues( this._preFilters, 1 );

            appCtxSvc.registerCtx( 'searchPreFilters', prefilters );
        }
        // populate the prefilter list that aw-listBox need
        data.defaultPrefilter1Value.dispValue = this.getDefaultPrefilterPrefix() + ' ' + prefilters.ownPrefilters.displayName;
        data.defaultPrefilter2Value.dispValue = this.getDefaultPrefilterPrefix() + ' ' + prefilters.catPrefilters.displayName;
        data.prefilterList1 = this.createListModelObjectsFromPrefilters( prefilters.ownPrefilters.displayName, prefilters.ownPrefilters.response );
        data.prefilterList2 = this.createListModelObjectsFromPrefilters( prefilters.catPrefilters.displayName, prefilters.catPrefilters.response );

        return prefilters;
    }

    /**
     * @function setPrefilters
     * @param {Object} data data
     */
    setPrefilters2( data ) {
        this.setPrefilterText2( data.selectPrefilter1, 0 );
        this.setPrefilterText2( data.selectPrefilter2, 1 );
    }

    /**
     * @function setPrefilterText
     * @param {Object} prop prop
     * @param {Integer} id id
     */
    setPrefilterText2( prop, id ) {
        var defaultText = this.getDefaultPrefilterPrefix() + ' ' + this._preFilters[id].displayName;
        this.getPrefilterValue2( prop, id + 1, defaultText,
            this._preFilters[id] );
    }

    /**
     * getPrefilterValue
     * @function getPrefilterValue
     * @param {Object} viewProp viewProp
     * @param {Integer} id id
     * @param {String} prefix prefix
     * @param {String} defaultText defaultText
     * @param {Object} _preFilter _preFilter
     * @returns {Object} updated filter property
     */
    getPrefilterValue2( viewProp, id, defaultText, _preFilter ) {
        var name = this.getPrefilterName( id );
        var value = '';
        var deferred = AwPromiseService.instance.defer();

        preferenceSvc.getStringValue( name ).then( ( prefValue ) => {
            prefValue = prefValue === null ? value : prefValue;
            viewProp.dbValue = prefValue;
            var tmpProp = this.getUpdatedPrifilterProperty( viewProp, defaultText, _preFilter );
            searchPrefilterSvc.updatePrefiltersCtx( tmpProp, viewProp, id, prefValue );
            deferred.resolve( prefValue );
        } );
        return deferred.promise;
    }

    /**
     * @function updatePrefilter1
     * @param {Object} data data
     */
    updatePrefilter1( data ) {
        this.updatePrefilterText2( data.selectPrefilter1, 0, data, true );
    }

    /**
     * @function updatePrefilter2
     * @param {Object} data data
     */
    updatePrefilter2( data ) {
        this.updatePrefilterText2( data.selectPrefilter2, 1, data, true );
    }

    /**
     * @function updateNarrowModePrefilter1
     * @param {Object} data data
     */
    updateNarrowModePrefilter1( data ) {
        this.updatePrefilterText2( data.selectPrefilter1, 0, data, false );
        var context = {
            updatedProp: data.selectPrefilter1
        };
        eventBus.publish( 'narrowMode.prefilter1Updated', context );
    }

    /**
     * @function updateNarrowModePrefilter2
     * @param {Object} data data
     */
    updateNarrowModePrefilter2( data ) {
        this.updatePrefilterText2( data.selectPrefilter2, 1, data, false );
        var context = {
            updatedProp: data.selectPrefilter2
        };
        eventBus.publish( 'narrowMode.prefilter2Updated', context );
    }

    /**
     * updatePrefilterText2
     * @function updatePrefilterText
     * @param {Object} prop prop
     * @param {Object} id id
     * @param {Boolean} data data
     * @param {Boolean} updatePreference If the preference is to be updated
     */
    updatePrefilterText2( prop, id, data, updatePreference ) {
        var eventData = data.eventData;
        if ( eventData && eventData.updatedProp ) {
            if ( prop === eventData.updatedProp ) {
                updatePreference = false;
                delete eventData.updatedProp;
            } else {
                prop = eventData.updatedProp;
            }
        }
        var ctx = appCtxSvc.getCtx( 'searchPreFilters' );
        this.updateSinglePrefilterText2( id, data, prop, ctx );

        if ( prop && updatePreference ) {
            var name = this.getPrefilterName( id + 1 );
            var values = [];
            values[0] = prop.dbValue;
            preferenceSvc.setStringValue( name, values );
        }
        if ( ctx ) {
            appCtxSvc.updateCtx( 'searchPreFilters', ctx );
        }
    }

    /**
     * updateSinglePrefilterText2
     * @function updateSinglePrefilterText2
     * @param {Integer} id id
     * @param {Object} data data
     * @param {Object} property property
     * @param {Object} ctx ctx
     */
    updateSinglePrefilterText2( id, data, property, ctx ) {
        //Default text to display
        var defaultText = this.getDefaultPrefilterPrefix() + ' ' + this._preFilters[id].displayName;
        var idString = ( id + 1 ).toString();

        var activeProp = data['selectPrefilter' + idString];
        if ( activeProp.propertyName === property.propertyName && activeProp.dbValue !== property.dbValue ) {
            activeProp = property;
            data['selectPrefilter' + idString] = property;
        }

        //Get property
        var newProperty = this.getUpdatedPrifilterProperty( property, defaultText, this._preFilters[id] );
        if ( newProperty.isDefault ) {
            activeProp.dbValue = '';
        }
        var newProp = newProperty.newProp;
        data['selectPrefilter' + idString].propertyDisplayName = newProp;

        if ( ctx !== undefined ) {
            if ( id === 0 ) {
                ctx.ownPrefilters.propDisplayName = newProp;
                ctx.ownPrefilters.selectedOwner = activeProp.dbValue;
            } else {
                ctx.catPrefilters.propDisplayName = newProp;
                ctx.catPrefilters.selectedCategory = activeProp.dbValue;
            }
        }
        if ( this._preFilters[id].propDisplayName !== newProp ) {
            this.populatePrefilterAnalytics( property, id );
        }
        this._preFilters[id].propDisplayName = newProp;
    }

    /**
     * getUpdatedPrifilterProperty
     * @function getUpdatedPrifilterProperty Gets the updated prefilter property
     * @param {Object} property property
     * @param {String} defaultText defaultText
     * @param {Object} preFilter _preFilter
     * @returns {Object} updated filter property
     */
    getUpdatedPrifilterProperty( property, defaultText, preFilter ) {
        var prop = {};
        prop.isDefault = false;
        if ( property.dbValue && property.dbValue !== 'ANY' ) {
            var index = _.findIndex( preFilter.listItems, ( listItem ) => {
                return listItem.staticElementObject === property.dbValue;
            } );
            if ( index > -1 ) {
                property.propertyDisplayName = preFilter.listItems[index].staticDisplayValue;
            } else {
                prop.isDefault = true;
            }
        } else {
            prop.isDefault = true;
        }
        prop.newProp = prop.isDefault ? defaultText : property.propertyDisplayName;
        return prop;
    }

    /**
     * Return the default pre-filter prefix value
     */
    getDefaultPrefilterPrefix() {
        return this._anyPrefilterText;
    }

    /**
     * Populates prefilters from server response
     *
     * @returns {ObjectArray} The array of prefilter objects to be displayed
     */
    populatePrefilterValues( preFilterValues, id ) {
        var prefilterSet = {};
        prefilterSet.response = null;
        prefilterSet.totalFound = 0;

        if ( preFilterValues.length > 0 ) {
            prefilterSet.response = preFilterValues[id].listItems;
            prefilterSet.totalFound = preFilterValues[id].listItems.length;
            prefilterSet.displayName = preFilterValues[id].displayName;
            prefilterSet.filterInternalName = preFilterValues[id].internalName;
        }
        if ( id === 0 ) {
            prefilterSet.selectedOwner = null;
        } else {
            prefilterSet.selectedCategory = null;
        }

        return prefilterSet;
    }

    /**
     * Given an array of Strings to be represented in listbox, this function returns an array of ListModel objects for
     * consumption by the listbox widget.
     * @param {ObjectArray} listName - The list name
     * @param {ObjectArray} listItems - The Strings array
     *
     * @return {ObjectArray} - Array of ListModel objects.
     */
    createListModelObjectsFromPrefilters( listName, listItems ) {
        var listModels = [];
        _.forEach( listItems, ( item ) => {
            var listModel = {
                propDisplayValue: '',
                propInternalValue: '',
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false
            };
            if ( item.staticElementObject === 'ANY' ) {
                listModel.propDisplayValue = this.getDefaultPrefilterPrefix() + ' ' + listName;
            } else {
                listModel.propDisplayValue = item.staticDisplayValue;
            }

            listModel.propInternalValue = item.staticElementObject;
            listModels.push( listModel );
        } );

        return listModels;
    }

    getGlobalSearchParametersForURL( selectedObject ) {
        //If this is a FullText Saved Search, process criteria and filter
        var searchCriteria = selectedObject.props.awp0search_string.dbValues[0];
        var filter = appCtxSvc.ctx.savedSearch.filterString;
        var searchParam = {};
        searchParam.searchCriteria = searchCriteria;
        searchParam.filter = filter;
        searchParam.refresh = '';
        return searchParam;
    }

    /**
     * @function clearListOfExpandedCategoriesFromCtx - removes the categories expanded by user if a new global search is performed
     * @param { String } filterPanelLocation - the location of the filter panel for which the list of the expanded categories needs to be removed
     */

    clearListOfExpandedCategoriesFromCtx( filterPanelLocation ) {
        var searchFilterPanelCtx = appCtxSvc.getCtx( filterPanelLocation );
        if ( searchFilterPanelCtx && searchFilterPanelCtx.listOfExpandedCategories ) {
            delete searchFilterPanelCtx.listOfExpandedCategories;
        }
        appCtxSvc.updatePartialCtx( filterPanelLocation, searchFilterPanelCtx );
    }

    /**
     * populatePrefilterAnalytics
     * @function populatePrefilterAnalytics
     * @param {Object} criteria criteria
     * @param {Object} ownerPrefilter ownerPrefilter
     * @param {Object} categoryPrefilter categoryPrefilter
     * @returns {String} sanSearchType
     */
    populateSearchType( criteria, ownerPrefilter, categoryPrefilter ) {
        var searchType = 'phrase';
        var searchStrArray = criteria.toString().split( ' ' );
        if (  searchStrArray.length === 1  &&  criteria === '*'  ) {
            searchType = 'wildcard_without_prefilter';
            if (  categoryPrefilter !== ""  ||  ownerPrefilter !== ""  ) {
                searchType = 'wildcard_with_prefilter';
            }
        } else if (  searchStrArray.length === 1  ||  searchStrArray.length === 2  ) {
            searchType = searchStrArray.length.toString() + ' word';
        }

        return searchType;
    }

    /**
     * populatePrefilterAnalytics
     * @function populatePrefilterAnalytics
     * @param {Object} prop prop
     * @param {Object} id id
     */
    populatePrefilterAnalytics( prop, id ) {
        if ( prop.displayValues  &&  prop.displayValues.length > 0 ) {
            var analyticsData = {};
            if ( prop.dbValue === '' ) {
                analyticsData = this.populateAnalyticsParams( this.PREFILTER_PREFIX + ( id + 1 ).toString(), 'Remove Prefilter ' + ( id + 1 ).toString() );
                analyticsSvc.logNonDeclarativeCommands( analyticsData );
            } else {
                analyticsData = this.populateAnalyticsParams( this.PREFILTER_PREFIX + ( id + 1 ).toString(), 'Apply Prefilter ' + ( id + 1 ).toString() );
                analyticsSvc.logNonDeclarativeCommands( analyticsData );
            }
        }
    }

    /**
     * Populates parameters for analytics variable
     * @function populateAnalyticsParams
     * @param {String} commandId command id
     * @param {String} commandTitle command title
     * @returns {Object} sanEvent
     */
    populateAnalyticsParams( commandId, commandTitle ) {
        var sanEvent = {};

        sanEvent.sanAnalyticsType = 'Commands';
        sanEvent.sanCommandId = commandId;
        sanEvent.sanCommandTitle = commandTitle;

        return sanEvent;
    }
}

/**
 *
 * @memberof NgServices
 * @member globalSearchService
 */
app.factory( 'globalSearchService', () => GlobalSearchService.instance );
