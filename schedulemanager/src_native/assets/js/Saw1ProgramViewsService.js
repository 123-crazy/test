// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/*global
*/

/**
 * Service that provides utility APIs for Program Views.
 *
 * @module js/Saw1ProgramViewsService
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Initializes the list box value.
 *
 * @function initialize
 * @param {Object} data data
 */
export let initialize = function( data ) {
    data.option.dbValue = AwStateService.instance.params.option;
};

var _getEmptyListModel = function _getEmptyListModel() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

export let getProgramViewsOptions = function( data ) {
    var optionListArray = [];

    var listModel = _getEmptyListModel();

    listModel.propDisplayValue = data.i18n.myProgramViews;
    listModel.propInternalValue = 'myProgramViews';
    optionListArray.push( listModel );

    var allPrgViewListModel = _getEmptyListModel();

    allPrgViewListModel.propDisplayValue = data.i18n.allProgramViews;
    allPrgViewListModel.propInternalValue = 'allProgramViews';
    optionListArray.push( allPrgViewListModel );

    data.optionList = optionListArray;
};

/**
 * Sets the selected option as the new params and
 * re-run the search.
 *
 * @function setSelectedProgramViewsOption
 * @param {Object} data data
 */
export let setSelectedProgramViewsOption = function( data ) {
    var currentRole = AwStateService.instance.params.option;
    var activeFilter = AwStateService.instance.params.filter;

    if( currentRole !== data.option.dbValue ) {
        AwStateService.instance.go( '.', {
            filter: '', // Clear the filters when the option is changed.
            option: data.option.dbValue
        } );

        if( !activeFilter ) {
            eventBus.publish( 'primaryWorkarea.reset' );
        }
    }
};

/**
 * Returns the Program Views search criteria that includes the option criteria.
 *
 * @function getProgramViewsSearchCriteria
 * @param {Object} stateParams state params
 * @param {Object} searchCriteria search params
 * @returns {Object} The search criteria
 */
export let getProgramViewsSearchCriteria = function( stateParams, searchCriteria ) {
    var userCtx = appCtxService.getCtx( 'user' );
    var userSessionCtx = appCtxService.getCtx( 'userSession' );

    searchCriteria.DatasetType = 'ProgramView';

    searchCriteria.queryName = 'Dataset...';
    searchCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    searchCriteria.lastEndIndex = '0';

    if( stateParams.option === 'myProgramViews' ) {
        searchCriteria.OwningUser = userCtx.cellHeader2;
        searchCriteria.OwningGroup = userSessionCtx.props.group.uiValues[0];
    } else {
        searchCriteria.OwningUser = '*';
        searchCriteria.OwningGroup = '*';
    }

    if( stateParams.option ) {
        searchCriteria.option = stateParams.option;
    }
    return searchCriteria;
};

exports = {
    initialize,
    getProgramViewsOptions,
    setSelectedProgramViewsOption,
    getProgramViewsSearchCriteria
};

export default exports;

/**
 * The factory to create the Program View service.
 *
 * @member Saw1ProgramViewsService
 * @memberof NgServices
 */
app.factory( 'Saw1ProgramViewsService', () => exports );
