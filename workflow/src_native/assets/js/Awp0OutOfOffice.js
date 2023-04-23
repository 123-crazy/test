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
 * @module js/Awp0OutOfOffice
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import messagingSvc from 'js/messagingService';
import dateTimeService from 'js/dateTimeService';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

/**
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer will
 * be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {object} selection - the current selection object
 */
export let populatePanelData = function( data ) {
    data.activeView = 'Awp0OutOfOfficeSub';

    // Set the context for loading project and selection mode on user panel
    var wrkContext = {
        loadProjectData: false,
        selectionModelMode: 'single'
    };

    appCtxSvc.registerCtx( 'workflow', wrkContext );

    //Save data from parent panel for later use adding users from user panel
    exports.setCurrentOutOfOfficeDelegate( data );
};

export let setCurrentOutOfOfficeDelegate = function( data ) {
    var currentUser = appCtxSvc.ctx.xrtSummaryContextObject;
    if( currentUser && currentUser.props && currentUser.props.inbox_delegate ) {
        var inboxDelegateUID = currentUser.props.inbox_delegate.dbValues[ 0 ];
        if( inboxDelegateUID !== '' ) {
            data.inboxDelegateUID = inboxDelegateUID;
            var uidsToLoad = [];
            uidsToLoad.push( inboxDelegateUID );
            return dmSvc.getProperties( uidsToLoad, [ 'group', 'role', 'user' ] ).then( function() {
                var inboxDelegateObject = cdm.getObject( inboxDelegateUID );
                var formattedVMO = exports.formatDelegateViewModelObject( inboxDelegateObject );
                var delegateArray = [];
                delegateArray.push( formattedVMO );
                exports.addUser( data, false, delegateArray );
            } );
        }
    }
};

export let formatDelegateViewModelObject = function( user ) {
    var group = user.props.group.uiValues[ 0 ];
    var role = user.props.role.uiValues[ 0 ];
    var userName = user.props.user.uiValues[ 0 ];
    var newCellProps = [];
    newCellProps.push( ' User Name \\:' + userName );
    newCellProps.push( ' Group Role Name \\:' + group + '/' + role );
    user.props.awp0CellProperties.dbValues = newCellProps;
    user.props.awp0CellProperties.uiValues = newCellProps;
    return user;
};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {date} dateObject {String} dateValue - UTC format date.
 */
export let getDateString = function( dateObject ) {
    var dateValue;
    dateValue = dateTimeService.formatUTC( dateObject );
    return dateValue;
};

export let getNewResourceInput = function( data ) {
    var newResource = data.users[ 0 ];
    var newInput = {};
    newInput.uid = newResource.uid;
    newInput.type = newResource.type;
    return newInput;
};

export let getExistingResourceInput = function() {
    var existingResourceUID = appCtxSvc.ctx.xrtSummaryContextObject.uid;

    var existingInput = {};
    existingInput.uid = existingResourceUID;
    existingInput.type = 'User';
    return existingInput;
};

export let getNullResourceInput = function() {
    var nullInput = {};
    nullInput.uid = 'AAAAAAAAAAAAAA';
    nullInput.type = 'unknownType';
    return nullInput;
};

// Validate the end date
export let validateAndSetOutOfOffice = function( data ) {
    var dateComparisonResult = 0;
    var startDate = data.startDate.dateApi.dateObject;
    var startDateString = dateTimeService.formatUTC( startDate );
    var endDate = data.endDate.dateApi.dateObject;
    var endDateString = dateTimeService.formatUTC( endDate );

    // This code is needed if both start date and end date are empty string then we really
    // don't need to compare the dates as start date will be picked up default today date.
    // Second check is for if end date is empty string that means user has not set the end date
    // or don't want to set the end date then date comparison doesn't really matter and we need
    // to set the out of office. So we are setting skipComparision flag to tue. Fix for defect # LCS-672295
    var skipComparision =  startDateString === '' && endDateString === '' || endDateString === '';

    if( startDateString === '' ) {
        startDate = dateTimeService.getDefaultDate( data.startDate.dateApi );
    }

    // If end date is empty then we need to use default date from start date only
    // for date comparison
    if( endDateString === '' ) {
        endDate = dateTimeService.getDefaultDate( data.startDate.dateApi );
    }

    // date1 - 1st date to compare. date2 - 2nd date to compare.
    //
    // The value <code>0</code> if the 'date2' is equal to 'date1'; a value less than <code>0</code> if 'date1'
    // is less than 'date2'; and a value greater than <code>0</code> if 'date1' is greater than 'date2'.

    dateComparisonResult = dateTimeService.compare( startDate, endDate );

    var currentUser = appCtxSvc.ctx.xrtSummaryContextObject.uid;
    var selectedUser = data.users[ 0 ].props.user.dbValue;

    if( selectedUser === currentUser ) {
        messagingSvc.reportNotyMessage( data, data._internal.messages, 'invalidUser' );
    } else if( skipComparision || dateComparisonResult < 0 ) {
        eventBus.publish( 'outOfOffice.set', {
            scope: {
                data: data
            }
        } );
    } else if( dateComparisonResult >= 0 ) {
        messagingSvc.reportNotyMessage( data, data._internal.messages, 'endDateBeforeStartDateMessage' );
    }
};

export let clearOutOfOfficePanel = function( data ) {
    data.users = [];
    data.inboxDelegateUID = '';
    data.userUids = '';
    data.dataProviders.getUsers.update( data.users, data.users.length );
    var jsDate = dateTimeService.getNullDate();
    data.startDate.dateApi.setApiValues( jsDate.getTime() );
    data.endDate.dateApi.setApiValues( jsDate.getTime() );
};

/**
 * Add new user to out of office user list.
 *
 * @param {String} data - The view model data
 * @param {String} newAttachment - The new attachment to be added
 */
export let addUser = function( data, multiSelectEnabled, selection ) {
    if( data ) {
        if( !data.users ) {
            data.users = [];
        }

        if( !data.usersUids ) {
            data.userUids = [];
        }

        if( selection ) {
            data.users[ 0 ] =  selection[ 0 ];
            data.userUids[ 0 ] =  selection[ 0 ].uid;
            data.users[ 0 ].selected = false;
        }

        if( data.dataProviders && data.dataProviders.getUsers ) {
            //update data provider
            data.dataProviders.getUsers.update( data.users, data.users.length );

            //clear selection
            data.dataProviders.getUsers.changeObjectsSelection( 0, data.dataProviders.getUsers.getLength() - 1,
                false );
        }
    }
};

/**
 * Add new user to out of office user list.
 *
 * @param {String} data - The view model data
 * @param {String} newAttachment - The new attachment to be added
 */
export let addSelectedUsers = function( data ) {
    if( data && data.selectedObjects && data.selectedObjects.length > 0 ) {
        exports.addUser( data, false, data.selectedObjects );
    }
};

/**
 * This factory creates a service and returns exports
 *
 * @member AddParticipant
 */

export default exports = {
    populatePanelData,
    setCurrentOutOfOfficeDelegate,
    formatDelegateViewModelObject,
    getDateString,
    getNewResourceInput,
    getExistingResourceInput,
    getNullResourceInput,
    validateAndSetOutOfOffice,
    clearOutOfOfficePanel,
    addUser,
    addSelectedUsers
};
app.factory( 'Awp0OutOfOffice', () => exports );
