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
 * @module js/Awp0AddSurrogate
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
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
    data.users = [];
    data.currentUser = appCtxSvc.ctx.locationContext.modelObject;
    data.activeView = "Awp0AddSurrogateSub";

    // Set the context for loading project and selection mode on user panel
    var wrkContext = {
        "loadProjectData": false,
        "selectionModelMode": "single"
    };

    appCtxSvc.registerCtx( "workflow", wrkContext );

};

export let getStartDateTimeString = function( startDate ) {
    var currentStartDateObj = new Date( startDate );
    return dateTimeService.formatDate( currentStartDateObj, dateTimeService.getSessionDateFormat() ) +" 00:00";
};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {date} dateObject {String} dateValue - UTC format date.
 */
export let getDateString = function( dateObject ) {
    return dateTimeService.formatUTC( dateObject );
};

export let getNullDateString = function() {
    return "0001-01-01T00:00:00";
};

export let getNewResourceInput = function( data ) {
    var newResource = data.users[ 0 ];
    var newInput = {};
    newInput.uid = newResource.uid;
    newInput.type = newResource.type;
    return newInput;
};

export let getNewUserInput = function( data ) {
    var newInput = {};
    newInput.uid = data.userUids[ 0 ];
    newInput.type = "User";
    return newInput;
};

export let getExistingResourceInput = function() {
    var existingResourceUID = appCtxSvc.ctx.selected.uid;

    var existingInput = {};
    existingInput.uid = existingResourceUID;
    existingInput.type = "User";
    return existingInput;
};

export let getNullResourceInput = function() {
    var nullInput = {};
    nullInput.uid = "AAAAAAAAAAAAAA";
    nullInput.type = "unknownType";
    return nullInput;
};

// Validate the end date
export let validateAndSetSurrogate = function( data ) {

    var dateComparisonResult = 0;
    var startDate = data.startDate.dateApi.dateObject;
    var startDateString = dateTimeService.formatUTC( startDate );
    var endDate = data.endDate.dateApi.dateObject;
    var endDateString = dateTimeService.formatUTC( endDate );

    var skipComparision = ( startDateString === "" && endDateString === "" );

    if( startDateString === "" ) {
        startDate = dateTimeService.getDefaultDate( data.startDate.dateApi );
    }

    if( endDateString === "" ) {
        endDate = dateTimeService.getDefaultDate( data.startDate.dateApi );
    }

    // date1 - 1st date to compare. date2 - 2nd date to compare.
    //
    // The value <code>0</code> if the 'date2' is equal to 'date1'; a value less than <code>0</code> if 'date1'
    // is less than 'date2'; and a value greater than <code>0</code> if 'date1' is greater than 'date2'.

    dateComparisonResult = dateTimeService.compare( startDate, endDate );

    var currentUser = appCtxSvc.ctx.selected.uid;
    var selectedUser = data.users[ 0 ].props.user.dbValue;

    if( selectedUser === currentUser ) {
        messagingSvc.reportNotyMessage( data, data._internal.messages, "invalidUser" );

    } else if( skipComparision || dateComparisonResult < 0 ) {

        eventBus.publish( "surrogate.set", {
            "scope": {
                "data": data
            }
        } );

    } else if( dateComparisonResult >= 0 ) {
        messagingSvc.reportNotyMessage( data, data._internal.messages, "endDateBeforeStartDateMessage" );
    }

};

/**
 * Check if surrogate list for open user and check if new group member object user is already present
 * then Add button should not be visible and return false from here.
 *
 * @param {object} data - The view model data
 * @param {object} selectedUser - The user that is selected
 */
var isValidToAdd = function( data, selectedUser ) {

    data.isValidToShowAddButton = true;
    //if review task has a parent, then get its parent route task.
    if( data.currentUser && data.currentUser.props.surrogate_list && data.currentUser.props.surrogate_list.dbValues ) {
        var surrogateList = data.currentUser.props.surrogate_list.dbValues;

        if( selectedUser && selectedUser.props.user && selectedUser.props.user.dbValues ) {
            var userDBValue = selectedUser.props.user.dbValues[ 0 ];

            if( surrogateList && surrogateList.indexOf( userDBValue ) > -1 ) {
                data.isValidToShowAddButton = false;
            }
        }

    }
    return true;
};

/**
 * Add new user to out of office user list.
 *
 * @param {String} data - The view model data
 * @param {String} newAttachment - The new attachment to be added
 */
export let addUser = function( data, multiSelectEnabled, selection ) {
    if( data && selection ) {

        if( !data.users ) {
            data.users = [];
        }
        if( !data.usersUids ) {
            data.userUids = [];
        }
        // Check before adding the user to check if selected user is already present in surrogate_list
        // if yes then don't add the new user to user list
        if( isValidToAdd( data, selection[ 0 ] ) ) {
            data.users[ 0 ] = ( selection[ 0 ] );
            data.userUids[ 0 ] = ( selection[ 0 ].props.user.dbValue );
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
 * @member Awp0AddSurrogate
 */

export default exports = {
    populatePanelData,
    getStartDateTimeString,
    getNullDateString,
    getNewResourceInput,
    getNewUserInput,
    getExistingResourceInput,
    getNullResourceInput,
    validateAndSetSurrogate,
    addUser,
    addSelectedUsers,
    getDateString
};
app.factory( 'Awp0AddSurrogate', () => exports );
