//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Saw1BaselineScheduleService
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import appCtxService from 'js/appCtxService';
import selectionService from 'js/selection.service';
import soa_dataManagementService from 'soa/dataManagementService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import dataSource from 'js/Saw1SchGanttDataSource';
import soaSvc from 'soa/kernel/soaService';
import $ from 'jquery';
import _ from 'lodash';

import 'jquery';

var exports = {};

export let openCreateBaselinePanel = function( commandId, location, ctx ) {
    var sch_tag = appCtxService.ctx.selected.uid;

    var deferred = AwPromiseService.instance.defer();

    soa_dataManagementService.getProperties( [ sch_tag ], [ 'activeschbaseline_tag' ] ).then( function() {
        var schedule = cdm.getObject( sch_tag );

        var isActiveFlag;
        var flag;
        var Scheduletag = 'Scheduletag';
        var selection = selectionService.getSelection().selected;
        if( selection && selection.length > 0 ) {
            flag = selection[ 0 ].props.activeschbaseline_tag.dbValues[ 0 ];

            if( flag === '' ) {
                isActiveFlag = false;
            } else {
                isActiveFlag = true;
            }

            var scheduleObject = {
                selected: selection[ 0 ],
                isActiveBaseline: isActiveFlag
            };
            appCtxService.registerCtx( Scheduletag, scheduleObject );
            var testVar;
        } else {
            appCtxService.unRegisterCtx( Scheduletag );
        }

        deferred.resolve();
    } );

    commandPanelService.activateCommandPanel( commandId, location );
};

export let checkIsActiveChkboxVisibility = function( data, ctx ) {
    var selection = ctx.Scheduletag.selected;
    var flag;
    if( selection ) {
        flag = selection.props.activeschbaseline_tag.dbValues[ 0 ];
        if( flag === '' ) {
            return true;
        }
            return data.isActive.dbValue;
    }
};

var baselineCellHeader = function( data, resultObject ) {
    var props = [];

    var cellHeader1 = resultObject.props.object_string.uiValues[ 0 ];

    props.push(  String( data.i18n.baselineName ) + '\\:' + cellHeader1 );

    var cellHeader2 = '';
    var activeBaselineSchedule = appCtxService.ctx.selected.props.activeschbaseline_tag.dbValues[ 0 ];
    if( activeBaselineSchedule === resultObject.uid ) {
        data.activeBaseline = resultObject;
    }
    props.push( String( data.i18n.saw1ActiveBaseline ) + '\\: ' + cellHeader2 );

    var cellHeader3 = resultObject.props.creation_date.uiValues[ 0 ];

    props.push( String( data.i18n.creationDate ) + '\\:' + cellHeader3 );

    var cellHeader4 = resultObject.props.owning_user.uiValues[ 0 ];

    props.push( String( data.i18n.owner ) + '\\:' + cellHeader4 );

    if( props ) {
        resultObject.props.awp0CellProperties.dbValues = props;
        resultObject.props.awp0CellProperties.uiValues = props;
    }
};

var processProviderResponse = function( data, response ) {
    var outputData;
    var sch_tag = [];
    var i = 0;
    var deferred = AwPromiseService.instance.defer();
    //Adding uids into list for loading creation_date properties
    if( response.searchResults ) {
        response.searchResults.forEach( function( res ) {
            sch_tag.push( res.uid );
        } );
        soa_dataManagementService.getProperties( sch_tag, [ 'creation_date' ] ).then( function() {
            // Check if response is not null and it has some search results then iterate for each result to formulate the
            // correct response
            if( response && response.searchResults ) {
                response.searchResults.forEach( function( result ) {
                    // Get the model object for search result object UID present in response
                    var resultObject = cdm.getObject( result.uid );

                    if( resultObject ) {
                        baselineCellHeader( data, resultObject );
                    }
                } );
            }

            //remove selected baseline from response
            let scheduleNavigationCtx = appCtxService.getCtx( 'scheduleNavigationCtx' );
            if( scheduleNavigationCtx && scheduleNavigationCtx.baselines ) {
                scheduleNavigationCtx.baselines.forEach( ( baseline ) => {
                    const index = _.findIndex( response.searchResults, ( res ) => baseline.uid === res.uid );
                    if( index > -1 ) {
                        response.searchResults.splice( index, 1 );
                        response.totalFound--;
                        response.totalLoaded--;
                    }
                } );
            }

            //remove active baseline from response
            if ( data.activeBaseline && data.dataProviders.activeBaseline ) {
                var exists = $.inArray( data.activeBaseline, response.searchResults );
                if ( exists !== -1 ) {
                    response.searchResults.splice( exists, 1 );
                    response.totalFound--;
                    response.totalLoaded--;
                }
            }

            // Construct the output data that will contain the results
            outputData = {
                searchResults: response.searchResults,
                totalFound: response.totalFound,
                totalLoaded: response.totalLoaded
            };
            deferred.resolve( outputData );
        } );
    }
    return deferred.promise;
};

/**
 * Do the perform search call to populate baselines
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {Object} ctx - The Context object
 */
export let performSearch = function( data, dataProvider, ctx ) {
    var outputData;
    var selection = selectionService.getSelection().selected;
    // Check is data provider is null or undefined then no need to process further
    // and return from here
    if( !dataProvider ) {
        return;
    }

    var searchString = data.filterBox.dbValue;
    var scheduleUid = ctx.selected.uid;
    var inputData = {
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Saw1TaskSearchProvider',
            searchCriteria: {
                searchContentType: 'ScheduleBaseline',
                scheduleUid: scheduleUid,
                searchString: searchString
            },
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap: {},
            searchSortCriteria: [],

            startIndex: dataProvider.startIndex
        }
    };

    var policy = {
        types: [ {
            name: 'WorkspaceObject',
            properties: [ {
                name: 'object_desc'
            } ]
        } ]
    };

    //Register Policy
    var policyId = propPolicySvc.register( policy );

    var deferred = AwPromiseService.instance.defer();

    // SOA call made to get the content
    soaSvc.post( 'Query-2014-11-Finder', 'performSearch', inputData ).then( function( response ) {
        //UnRegister Policy
        if( policyId ) {
            propPolicySvc.unregister( policyId );
        }

        var outputData = processProviderResponse( data, response );

        deferred.resolve( outputData );
    } );
    return deferred.promise;
};

export let getSelectedBaseline = function( data ) {
    data.saw1viewBtn = false;
    var baselineObjs = [];

    let scheduleNavigationCtx = appCtxService.getCtx( 'scheduleNavigationCtx' );
    if( scheduleNavigationCtx && !_.isEmpty( scheduleNavigationCtx.baselines ) ) {
        let baselines = scheduleNavigationCtx.baselines;
        baselines.forEach( baselineVMO => {
            let baseline = cdm.getObject( baselineVMO.uid );
            if( baseline ) {
                baselineObjs.push( baseline );
                baselineCellHeader( data, baseline );
            }
        } );
    }
    //Need this for showing replace command on baseline.
    scheduleNavigationCtx.selectedBaselines = baselineObjs;
    appCtxService.updateCtx('scheduleNavigationCtx', scheduleNavigationCtx);

    return baselineObjs;
};


export default exports = {
    openCreateBaselinePanel,
    checkIsActiveChkboxVisibility,
    performSearch,
    getSelectedBaseline
};
app.factory( 'Saw1BaselineScheduleService', () => exports );
