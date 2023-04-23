// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define */

/**
 * Service that provides utility APIs for Schedule/ScheduleTask search filter.
 *
 * @module js/Saw1SearchFilterService
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Initializes the list box value.
 *
 * @function initialize
 * @param {Object} data data
 */
export let initialize = function( data ) {
    data.privilege.dbValue = AwStateService.instance.params.privilege;
};

var _getEmptyListModel = function() {
    var listModel = {
        propDisplayValue: "",
        propInternalValue: "",
        propDisplayDescription: "",
        hasChildren: false,
        children: {},
        sel: false
    };

    return listModel;
};

export let populatePrivilegeList = function( data ) {

    var privilegeListArray = [];

    var listModel = _getEmptyListModel();
    listModel.propDisplayValue = data.i18n.coordinator;
    listModel.propInternalValue = "coordinator";
    privilegeListArray.push( listModel );

    var listModel1 = _getEmptyListModel();
    listModel1.propDisplayValue = data.i18n.participant;
    listModel1.propInternalValue = "participant";
    privilegeListArray.push( listModel1 );

    var listModel2 = _getEmptyListModel();
    listModel2.propDisplayValue = data.i18n.observer;
    listModel2.propInternalValue = "observer";
    privilegeListArray.push( listModel2 );

    data.privilegeList = privilegeListArray;

    if( AwStateService.instance.params.privilege ) {
        data.privilege.dbValue = AwStateService.instance.params.privilege;
        data.privilege.uiValue = data.i18n[ data.privilege.dbValue ];
    } else {
        data.privilege.dbValue = privilegeListArray[ 0 ].propInternalValue;
        data.privilege.uiValue = privilegeListArray[ 0 ].propDisplayValue;
        AwStateService.instance.go( ".", {
            filter: "",
            privilege: data.privilege.dbValue
        } );
    }
};

export let prepareSubscribedResourcePoolList = function( data ) {

    var additionalContextArray = [];

    // Add the default "All" at the top of the list.
    var listModel = _getEmptyListModel();
    listModel.propInternalValue = "allTeams";
    listModel.propDisplayValue = data.i18n.allTeams;
    additionalContextArray.push( listModel );

    if( data.resourcePoolSearchResults && data.resourcePoolSearchResults.length > 0 ) {

        for( var i = 0; i < data.resourcePoolSearchResults.length; ++i ) {
            var objectUid = data.resourcePoolSearchResults[ i ].uid;
            var modelObject = data.resourcePoolModelObjects[ objectUid ];

            if( modelObject && modelObject.props.object_string ) {
                var listModel1 = _getEmptyListModel();
                listModel1.propInternalValue = objectUid;
                listModel1.propDisplayValue = modelObject.props.object_string.uiValues[ 0 ];
                additionalContextArray.push( listModel1 );
            }
        }
    }

    data.additionalContextList = additionalContextArray;

    if( AwStateService.instance.params.team ) {
        data.additionalContext.dbValue = AwStateService.instance.params.team;
    } else {
        data.additionalContext.dbValue = additionalContextArray[ 0 ].propInternalValue;
        AwStateService.instance.go( ".", {
            filter: "",
            team: data.additionalContext.dbValue
        } );
    }
};

export let prepareAdditionalContextList = function( data ) {
    if( AwStateService.instance.params.hasOwnProperty( 'team' ) ) {
        exports.prepareSubscribedResourcePoolList( data );
    }
};

/**
 * Sets the selected additional search context as the new params and
 * re-run the search.
 *
 * @function setSelectedContext
 * @param {Object} data data
 */
export let setSelectedContext = function( data ) {

    if( AwStateService.instance.params.hasOwnProperty( 'team' ) ) {
        var currentInbox = AwStateService.instance.params.team;

        if( currentInbox !== data.additionalContext.dbValue ) {
            AwStateService.instance.go( ".", {
                filter: "", // Clear the filters when the team is changed.
                team: data.additionalContext.dbValue
            } );
        }
    }
};

/**
 * Sets the selected privilege as the new params and
 * re-run the search.
 *
 * @function setSelectedPrivilege
 * @param {Object} data data
 */
export let setSelectedPrivilege = function( data ) {
    var currentRole = AwStateService.instance.params.privilege;
    var activeFilter = AwStateService.instance.params.filter;

    if( currentRole !== data.privilege.dbValue ) {

        AwStateService.instance.go( ".", {
            filter: "", // Clear the filters when the privilege is changed.
            privilege: data.privilege.dbValue
        } );

        if( !activeFilter ) {
            eventBus.publish( 'primaryWorkarea.reset' );
        }
    }
};

/**
 * Returns the schedules search criteria that includes the privilege criteria.
 *
 * @function getSchedulesSearchCriteria
 * @param {Object} stateParams state params
 * @param {Object} searchCriteria search params
 */
export let getSchedulesSearchCriteria = function( stateParams, searchCriteria ) {

    if( stateParams.privilege ) {
        searchCriteria.privilege = stateParams.privilege;
    }
    return searchCriteria;
};

export default exports = {
    initialize,
    populatePrivilegeList,
    prepareSubscribedResourcePoolList,
    prepareAdditionalContextList,
    setSelectedContext,
    setSelectedPrivilege,
    getSchedulesSearchCriteria
};
/**
 * The factory to create the search filter service.
 *
 * @member Saw1SearchFilterService
 * @memberof NgServices
 */
app.factory( 'Saw1SearchFilterService', () => exports );
