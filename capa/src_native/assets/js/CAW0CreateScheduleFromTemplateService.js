// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@
/*global
 */
/**
 * @module js/CAW0CreateScheduleFromTemplateService
 */
import app from 'app';
import dateTimeService from 'js/dateTimeService';
import commandPanelService from 'js/commandPanel.service';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import listBoxService from 'js/listBoxService';
import parsingUtils from 'js/parsingUtils';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import soaService from 'soa/kernel/soaService';

var exports = {};
var getInitialLOVValueDeferred;

/**
 * Return the propObjects
 *
 * @param {Object} propObjects - The given propObjects.
 * @return {Object} propObjects - The given propObjects.
 */
export let getSaw1DeliverableObject = function( propObjects ) {
    if( appCtxService.ctx.activeToolsAndInfoCommand && appCtxService.ctx.activeToolsAndInfoCommand.commandId === 'Awp0AssignProjects' ) {
        return appCtxService.ctx.mselected;
    }
    return propObjects;
};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {date} startDate - The given start date object.
 * @param {date} finishDate - The given finish date object.
 * @param {Object} ctx The context object
 * @returns {String} The start date
 */
export let getDateString_startDate = function( startDate, finishDate, ctx ) {
    var endDateScheduling = ctx.selected.props.end_date_scheduling.dbValues[ 0 ];
    if( endDateScheduling === '1' ) {
        var finish = dateTimeService.formatUTC( finishDate );
        if( finish === '' ) {
            return dateTimeService.formatUTC( ctx.selected.props.finish_date.dbValues[ 0 ] );
        }
        return finish;
    }
    var start = dateTimeService.formatUTC( startDate );
    if( start === '' ) {
        return dateTimeService.formatUTC( ctx.selected.props.start_date.dbValues[ 0 ] );
    }
    return start;
};

export let getShiftDate = function( data ) {
    if( data.finishShiftDate.dateApi.dateObject ) {
        return dateTimeService.formatUTC( data.finishShiftDate.dateApi.dateObject );
    }
        return dateTimeService.formatUTC( data.startShiftDate.dateApi.dateObject );
};

/**
 * Returns the string value "true" or "false" for isTemplate property.
 * @param  {boolean} isTemplate - It can be true or false .
 * @returns {String} String value "true" or "false"
 */
export let getTemplateString = function( isTemplate ) {
    return isTemplate.toString();
};

/**
 * Method for checking if the end_date_scheduling property gets loaded for the selected Schedule Object.
 * @param {Object} ctx - Context Object
 * @returns {boolean} Flagto indicate if property needs to be loaded.
 */
export let checkForEndDateSchedulingProperty = function( ctx ) {
    var needToLoadProperty;
    if( typeof ctx.selected.props.end_date_scheduling === typeof undefined ) {
        needToLoadProperty = true;
    } else {
        needToLoadProperty = false;
    }
    return needToLoadProperty;
};

/**
 * Method for invoking and registering/unregistering data for the Add Work Element Panel
 *
 * @param {String} commandId - Command Id for the Add Work Element
 * @param {String} location - Location of the Add Work Element command
 */
export let getSaveAsPanel = function( commandId, location ) {
    var schedule = 'schedule';

    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {
        var parent = selectionService.getSelection().parent;

        var scheduleObj = {
            selectedObject: selection,
            scheduleTag: parent
        };

        appCtxService.registerCtx( schedule, scheduleObj );
    } else {
        appCtxService.unRegisterCtx( schedule );
    }

    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * Sets the date value for date proeprty of create schedule from template panel.
 * @param {Object} vmoProp -  ViewModelProperty
 * @param {String} dateVal - shift date
 */
var setDateValueForProp = function( vmoProp, dateVal ) {
    uwPropertyService.setValue( vmoProp, dateVal.getTime() );
    vmoProp.dateApi.dateObject = dateVal;
    vmoProp.dateApi.dateValue = dateTimeService.formatDate( dateVal, dateTimeService
        .getSessionDateFormat() );
    vmoProp.dateApi.timeValue = dateTimeService.formatTime( dateVal, dateTimeService
        .getSessionDateFormat() );
};

export let populateDefaultValuesForSaveAs = function( data ) {
    var schedule = selectionService.getSelection().selected[ 0 ];
    var isEndDateSchedule = schedule.props.end_date_scheduling.dbValues[ 0 ] === '1';
    var isTemplateDatePrefOn = data.preferences.SM_TEMPLATE_DATE[ 0 ].toUpperCase() === 'true'.toUpperCase();
    var shiftDate = new Date();
    if( isTemplateDatePrefOn ) {
        if( isEndDateSchedule ) {
            setDateValueForProp( data.finishShiftDate, new Date( schedule.props.finish_date.dbValues[ 0 ] ) );
        } else {
            setDateValueForProp( data.startShiftDate, new Date( schedule.props.start_date.dbValues[ 0 ] ) );
        }
    } else {
        if( isEndDateSchedule ) {
            setDateValueForProp( data.finishShiftDate, shiftDate );
        } else {
            setDateValueForProp( data.startShiftDate, shiftDate );
        }
    }

    var asyncProp = data.isRunAsync;
    if( asyncProp ) {
        var value = data.preferences.SM_Copy_Schedule_Async[ 0 ].toUpperCase() === 'true'.toUpperCase();
        asyncProp.dbValues[ 0 ] = value;
        asyncProp.dbValue = value;
        asyncProp.uiValue = value;
    }
};

/**
 * Method of populating shift date for create schedule from template panel.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let populateDefaultValueForShiftDate = function( data ) {
    if( data.dataProviders.getScheduleSearchProvider.selectedObjects.length === 1 ) {
        var schedule = data.dataProviders.getScheduleSearchProvider.selectedObjects[ 0 ];
        var isEndDateSchedule = schedule.props.end_date_scheduling.dbValues[ 0 ] === '1';
        var isTemplateDatePrefOn = data.preferences.SM_TEMPLATE_DATE[ 0 ].toUpperCase() === 'true'.toUpperCase();
        var shiftDate = new Date();
        if( isTemplateDatePrefOn ) {
            if( isEndDateSchedule ) {
                setDateValueForProp( data.finishShiftDate, new Date( schedule.props.finish_date.dbValues[ 0 ] ) );
            } else {
                setDateValueForProp( data.startShiftDate, new Date( schedule.props.start_date.dbValues[ 0 ] ) );
            }
        } else {
            if( isEndDateSchedule ) {
                setDateValueForProp( data.finishShiftDate, shiftDate );
            } else {
                setDateValueForProp( data.startShiftDate, shiftDate );
            }
        }
    }
};

/**
 * This operation is invoked to query the data for a property having an LOV attachment. The results returned
 * from the server also take into consideration any filter string that is in the input. This method calls
 * 'getInitialLOVValues' and returns initial set of lov values.
 *
 * @param {filterString} data - The view model
 * @param {deferred} deferred - $q object to resolve the 'promise' with a an array of LOVEntry objects.
 * @param {ViewModelProperty} prop - Property to aceess LOV values for.
 * @param {String} filterContent Filter content string
 * @param {String} defaultString To be populate on group or user LOV
 * @param {String} filterStr Filter string
 */
var getInitialLOVValues = function( data, deferred, prop, filterContent, defaultString, filterStr ) {
    if ( !getInitialLOVValueDeferred ) {
        getInitialLOVValueDeferred = deferred;

        var lovValues = [];
        exports.performUserSearchByGroup( prop, 0, filterContent, filterStr ).then( function( validObjects ) {
            if ( validObjects ) {
                lovValues = listBoxService.createListModelObjectsFromStrings( [ defaultString ] );
                // Create the list model object that will be displayed
                Array.prototype.push.apply( lovValues, validObjects );
            }
            deferred.resolve( lovValues );
            getInitialLOVValueDeferred = null;
        }, function( reason ) {
            deferred.reject( reason );
            getInitialLOVValueDeferred = null;
        } );
    }
};

/**
 * Generate the next LOV values when user is doing pagination in LOV.
 * @param {deferred} deferred - $q object to resolve the 'promise' with a an array of LOVEntry objects.
 * @param {Object} prop Property object
 * @param {String} filterContent Filter content string
 * @param {String} filterStr Filter string
 * @returns {Promise} The Prmoise for performUserSearchByGroup
 */
var getNextLOVValues = function( deferred, prop, filterContent, filterStr ) {
    var lovEntries = [];

    // Check if more values exist then only call SOA.
    if ( prop.moreValuesExist ) {
        var startIdx = prop.endIndex;
        exports.performUserSearchByGroup( prop, startIdx, filterContent, filterStr ).then( function( validObjects ) {
            lovEntries = validObjects;
            deferred.resolve( lovEntries );
        } );
    } else {
        deferred.resolve( lovEntries );
    }
    return deferred.promise;
};

/**
 * Populate the group LOV values.
 *
 * @param {Object} data Data view model object
 * @param {Object} prop Property object
 */
var populateGroupLOV = function( data, prop ) {
    var parentData = data;
    prop.lovApi = {};
    prop.contentType = 'Group';

    // This is needed to remove the first empty entry fromn LOV values
    prop.emptyLOVEntry = false;
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        getInitialLOVValues( data, deferred, prop, '', data.i18n.allGroups, filterStr );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        var filterStr = null;
        if( !prop.dbValue.uid && prop.uiValue !== data.i18n.allGroups ) {
            filterStr = prop.uiValue;
        }
        getNextLOVValues( deferred, prop, '', filterStr );
    };

    prop.lovApi.validateLOVValueSelections = function( lovEntries ) {
        parentData.groupName = null;
        if ( lovEntries[0].propInternalValue.uid ) {
            parentData.groupName = lovEntries[0].propInternalValue.props.object_full_name.dbValues[0];
            data.groupUID = lovEntries[0].propInternalValue.uid;
        } else {
            // This is needed when user entered some wrong value which is not present
            // then set to default all groups
            prop.dbValue = data.i18n.allGroups;
            prop.uiValue = data.i18n.allGroups;
            data.groupUID = '';
        }

        //reset owning user lov as All Users
        data.allUsers.dbValue = data.i18n.allUsers;
        data.allUsers.uiValue = data.i18n.allUsers;
        data.userUID = '';

        if ( parentData.additionalSearchCriteria ) {
            parentData.additionalSearchCriteria.group = parentData.groupName;
        }
        eventBus.publish( 'awPopupWidget.close', {
            propObject: prop
        } );
    };
};

/**
 * Populate the user LOV values.
 *
 * @param {Object} data Data view model object
 * @param {Object} prop Property object
 */
var populateUserLOV = function( data, prop ) {
    var parentData = data;
    prop.lovApi = {};
    prop.contentType = 'Users';

    // Check if searchSubGroup present on data that means we need
    // to search user inside sub group
    if ( data.searchSubGroup ) {
        prop.searchSubGroup = true;
    }

    // This is needed to remove the first empty entry fromn LOV values
    prop.emptyLOVEntry = false;
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        getInitialLOVValues( data, deferred, prop, data.groupName, data.i18n.allUsers, filterStr );
    };

    prop.lovApi.getNextValues = function( deferred ) {
        var filterStr = null;
        if( !prop.dbValue.uid && prop.uiValue !== data.i18n.allUsers ) {
            filterStr = prop.uiValue;
        }
        getNextLOVValues( deferred, prop, data.groupName, filterStr );
    };

    prop.lovApi.validateLOVValueSelections = function( lovEntries ) {
        if ( lovEntries[0].propInternalValue.uid ) {
            parentData.userpName = lovEntries[0].propInternalValue.props.user.uiValues[0];
            data.userUID = lovEntries[0].propInternalValue.props.user.dbValues[0];
        } else {
            // This is needed when user entered some wrong value which is not present
            // then set to default all users
            prop.dbValue = data.i18n.allUsers;
            prop.uiValue = data.i18n.allUsers;
            data.userUID = '';
        }

        if ( parentData.additionalSearchCriteria ) {
            parentData.additionalSearchCriteria.user = parentData.userpName;
        }

        eventBus.publish( 'awPopupWidget.close', {
            propObject: prop
        } );
    };
};


export let revealGroupUserLOV = function( data ) {
    if ( !data.additionalSearchCriteria ) {
        data.additionalSearchCriteria = {};
    }

    populateGroupLOV( data, data.allGroups );
    data.userName = '';
    data.groupName = '';
    var defaultGroupValue = data.i18n.allGroups;
    var defaultUserValue = data.i18n.allUsers;
    data.searchSubGroup = true;
    if ( data.additionalSearchCriteria && data.additionalSearchCriteria.group ) {
        defaultGroupValue = data.additionalSearchCriteria.group;

        // Set the group value on data to support filtering in LOV.
        data.groupName = defaultGroupValue;

        // Check if searchSubGroup is true then set this variable on data
        if ( data.additionalSearchCriteria.searchSubGroup && data.additionalSearchCriteria.searchSubGroup === 'false' ) {
            data.searchSubGroup = false;
        }
    }

    data.allGroups.dbValue = defaultGroupValue;
    data.allGroups.uiValue = defaultGroupValue;

    populateUserLOV( data, data.allUsers );
    if ( data.additionalSearchCriteria && data.additionalSearchCriteria.user ) {
        defaultUserValue = data.additionalSearchCriteria.user;
        // Set the user value on data to support filtering in LOV.
        data.userName = defaultUserValue;
    }
    data.allUsers.dbValue = defaultUserValue;
    data.allUsers.uiValue = defaultUserValue;
};

/**
 * Get the user content based on input values and created LOV entries and return.
 *
 * @param {Object} prop Property obejct whose properties needs to be populated
 * @param {int} startIndex Start index value
 * @param {Object} filterContent Filter content object that can be filter user
 * @param {Object} filterStr Filter string to filter group or user. This is when user is tryong on LOV
 *
 * @returns {Promise} Promise object
 */
export let performUserSearchByGroup = function( prop, startIndex, filterContent, filterStr ) {
    var deferred = AwPromiseService.instance.defer();
    var contentType = prop.contentType;
    var searchCriteria = {
        resourceProviderContentType: contentType
    };

    if ( contentType === 'Users' && filterContent ) {
        searchCriteria.group = filterContent;
    }

    if ( filterStr ) {
        searchCriteria.searchString = filterStr;
    }

    // Check if sub group need to be search. Pass that value to server
    if ( prop.searchSubGroup ) {
        searchCriteria.searchSubGroup = 'true';
    }

    var resourceProvider = 'Awp0ResourceProvider';

    var inputData = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: ''
        },
        inflateProperties: false,
        saveColumnConfigData: {},
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: resourceProvider,
            searchCriteria: searchCriteria,
            cursor: {
                startIndex: startIndex,
                endReached: false,
                startReached: false,
                endIndex: 0
            },
            searchSortCriteria: [],
            searchFilterFieldSortType: 'Alphabetical'
        }
    };

    // SOA call made to get the content
    soaService.post( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then( function( response ) {
        var lovEntries = [];
        var modelObjects = [];

        if( response.searchResultsJSON ) {
            var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
            if( searchResults ) {
                for( var i = 0; i < searchResults.objects.length; i++ ) {
                    var uid = searchResults.objects[ i ].uid;
                    var obj = response.ServiceData.modelObjects[ uid ];
                    modelObjects.push( obj );
                }
            }
            // Create the list model object that will be displayed
            var groups = listBoxService.createListModelObjects( modelObjects, 'props.object_string' );
            Array.prototype.push.apply( lovEntries, groups );
        }

        // Populate the end index and more values present or not
        var endIndex = response.cursor.endIndex;
        var moreValuesExist = !response.cursor.endReached;
        if ( endIndex > 0 && moreValuesExist ) {
            endIndex += 1;
        }
        prop.endIndex = endIndex;
        prop.moreValuesExist = moreValuesExist;
        deferred.resolve( lovEntries );
    } );

    return deferred.promise;
};


export let addSchedules = function( data ) {
    data.currentSchedule = data.dataProviders.getScheduleSearchProvider.selectedObjects[0];

    data.objectName = data.object_name.dbValue;
    data.isTemplateValue = data.isTemplate.dbValue;
    data.isRunAsyncValue = data.isRunAsync.dbValue;
    data.openOnCreateValue = data.openOnCreate.dbValue;
    if( data.currentSchedule.props && data.currentSchedule.props.end_date_scheduling.dbValue === true ) {
        data.finishShiftDateValue = data.finishShiftDate;
    } else {
        data.startShiftDateValue = data.startShiftDate;
    }
};

export let getSelectedSchedules = function( data ) {
    if ( data.currentSchedule ) {
        data.dataProviders.selectedSchedules.viewModelCollection.loadedVMObjects.push( data.currentSchedule );
    }

    if ( data.objectName ) {
        data.object_name.dbValue = data.objectName;
    }
    if ( data.isTemplateValue ) {
        data.isTemplate.dbValue = data.isTemplateValue;
    }
    if ( data.isRunAsyncValue ) {
        data.isRunAsync.dbValue = data.isRunAsyncValue;
    }
    if ( data.openOnCreateValue ) {
        data.openOnCreate.dbValue = data.openOnCreateValue;
    }
    if ( data.finishShiftDateValue ) {
        data.finishShiftDate = data.finishShiftDateValue;
    }
    if ( data.startShiftDateValue ) {
        data.startShiftDate = data.startShiftDateValue;
    }
};

export let removeTemplateFromProvider = function( commandContext ) {
    commandContext.dataProviders.selectedSchedules.viewModelCollection.loadedVMObjects.pop();
    commandContext.dataProviders.selectedSchedules.selectedObjects.pop();
};

exports = {
    getSaw1DeliverableObject,
    getDateString_startDate,
    getShiftDate,
    getTemplateString,
    checkForEndDateSchedulingProperty,
    getSaveAsPanel,
    populateDefaultValuesForSaveAs,
    populateDefaultValueForShiftDate,
    revealGroupUserLOV,
    performUserSearchByGroup,
    addSchedules,
    getSelectedSchedules,
    removeTemplateFromProvider
};

export default exports;
/**
 * Create Schedule from template panel service utility
 *
 * @memberof NgServices
 * @member ShowPanel
 */
app.factory( 'CAW0CreateScheduleFromTemplateService', () => exports );

