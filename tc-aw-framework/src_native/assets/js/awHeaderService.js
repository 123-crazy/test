// Copyright (c) 2020 Siemens
/**
 * @module js/awHeaderService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';
import configurationService from 'js/configurationService';
import breadCrumbService from 'js/breadCrumbService';
import _ from 'lodash';
import logger from 'js/logger';
var contextName = 'location.titles';

var exports = {};

export let getTitles = function() {
    var output = {};
    var promises = [];

    promises.push( configurationService.getCfg( 'solutionDef' ).then( function( solution ) {
        var browserTitle = solution ? solution.browserTitle : 'Apollo';
        output.browserTitle = browserTitle;
        return output;
    } ) );

    [ 'browserSubTitle', 'headerTitle' ].forEach( function( key ) {
        var property = AwStateService.instance.current.data[ key ];
        if( property ) {
            if( typeof property === 'string' ) {
                output[ key ] = property;
                promises.push( AwPromiseService.instance.when( output ) );
            } else {
                promises.push( localeService.getLocalizedText( property.source, property.key )
                    .then( function( result ) {
                        output[ key ] = result;
                        return output;
                    } ) );
            }
        }
    } );

    return AwPromiseService.instance.all( promises ).then( function() {
        return output;
    } );
};

export let updateBreadCrumb = function( eventData ) {
    var output = {};
    const data = AwStateService.instance.current.data;
    var searchCriteria = data.params && data.params.searchCriteria ? AwStateService.instance.current.data.params.searchCriteria : '';
    var label = data.label ? AwStateService.instance.current.data.label : '';
    output.breadcrumbConfig = appCtxService.getCtx( 'breadCrumbConfig' );
    output.breadCrumbProvider = breadCrumbService.refreshBreadcrumbProvider( output.breadcrumbConfig,
        appCtxService.getCtx( 'mselected' ),
        eventData.searchFilterCategories, eventData.searchFilterMap,
        searchCriteria, label, true );

    return output;
};

export let resetBreadCrumb = function() {
    var output = {};
    output.breadCrumbProvider = breadCrumbService.resetBreadcrumbProvider( appCtxService.getCtx( 'breadCrumbConfig' ) );
    return output;
};

export let updateDocumentTitles = function() {
    document.title = appCtxService.ctx[ contextName ].browserTitle +
        ( appCtxService.ctx[ contextName ].browserSubTitle ? ' - ' + appCtxService.ctx[ contextName ].browserSubTitle : '' );
};

export let constructTabs = function( subPages ) {
    var subLocationTabs = [];
    var promises = [];

    var constructTabFromState = function( name, pageId, priority, isSelected, stateName, selectWhen, isCloseable ) {
        return {
            classValue: 'aw-base-tabTitle',
            name: name,
            displayTab: true,
            pageId: pageId,
            priority: priority,
            selectedTab: isSelected,
            state: stateName,
            selectWhen: selectWhen,
            visible: true,
            closeable: isCloseable,
            closeCommandIcon: 'cmdCloseTab',
            closeCallback: 'closeTab',
            closeCommandTitle: 'Close Tab'
        };
    };

    subPages.sort( function( obj1, obj2 ) {
        return obj1.data.priority - obj2.data.priority;
    } );

    _.forEach( subPages, function( page, index ) {
        var label = page.data.label;
        var isCloseable = page.data.closeable;
        var isSelectedTab = page === AwStateService.instance.current;
        var priority = page.data.priority ? page.data.priority : 0;
        var stateName = page.name;
        if( label ) {
            var selectWhen = 'data.subLocationTabCond.currentTab === \'' + stateName + '\'';
            if( _.isString( label ) ) {
                subLocationTabs.push( constructTabFromState( label, index, priority, isSelectedTab, stateName, selectWhen, isCloseable ) );
                promises.push( AwPromiseService.instance.when() );
            } else {
                promises.push( localeService.getLocalizedText( label.source, label.key ).then( function( result ) {
                    subLocationTabs.push( constructTabFromState( result, index, priority, isSelectedTab, stateName, selectWhen, isCloseable ) );
                } ) );
            }
        }
    } );

    return AwPromiseService.instance.all( promises ).then( function() {
        return subLocationTabs;
    } );
};

export let switchSubLocation = function( pageId, tabTitle, tabsModel ) {
    var title = tabTitle || pageId;
    var tabToSelect = tabsModel.find( function( tab ) {
        return tab.name === title;
    } );

    if( tabToSelect ) {
        // When the tab widget is forced to update after the state has already changed it will still trigger callback
        if( tabToSelect.state !== AwStateService.instance.current.name ) {
            if( tabToSelect.params ) {
                AwStateService.instance.go( tabToSelect.state, tabToSelect.params );
            } else {
                AwStateService.instance.go( tabToSelect.state );
            }
        }
    } else {
        logger.error( 'Missing tab was selected: ' + tabTitle );
    }
};

export let closeTab = function( subLocationTabs, removedTab ) {
    if( removedTab !== undefined ) {
        const index = subLocationTabs.indexOf( removedTab );
        if( index >= 0 ) {
            subLocationTabs.splice( index, 1 );
        }
    }
};

exports = {
    getTitles,
    updateBreadCrumb,
    resetBreadCrumb,
    updateDocumentTitles,
    constructTabs,
    switchSubLocation,
    closeTab
};
export default exports;
/**
 * @memberof NgServices
 * @member mockTableDataService
 */
app.factory( 'awHeaderService', () => exports );
