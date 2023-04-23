// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aw.notification.service
 */
import app from 'app';
import soaService from 'soa/kernel/soaService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import localeSvc from 'js/localeService';
import notificationPollingSvc from 'js/notification.polling.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';

var appTypes = '';
//Number of messages to be displayed in alert popup per application.
var MESSAGE_PER_APPLICATION = 10;
/*
 * Retrieves the list of OfficeStyleSheets from the SOA Also, create a map to fetch the UID from the
 * DisplayValue @param { Object }response - Response of the SOA
 */
export let getAppTypeIndex = function( messageObjects, appType ) {
    var index = -1;
    _.some( messageObjects, function( object, i ) {
        if( object.appType.groupName === appType ) {
            index = i;
            return true;
        }
        return false;
    } );

    return index;
};

// To reduce the cognitive complexity defined a common function to return the empty value or value.
export let getUiValueOrDefault = function( value ) {
    return value ? value.uiValues[0] : '';
};

export let createLineItems = function( searchResults, messageObjects ) {
    //Parse messages (searchResults) and create a lineItems and push to messageObjects
    for( var i = 0; i < searchResults.length; i++ ) {
        if( searchResults[ i ].props.fnd0ApplicationType && searchResults[ i ].props.fnd0Subject ) {
            var appType = searchResults[ i ].props.fnd0ApplicationType.dbValues[ 0 ];
            var index = getAppTypeIndex( messageObjects, appType );

            messageObjects[ index ].appType.uiValue = searchResults[ i ].props.fnd0ApplicationType.uiValues[ 0 ] +
                '(' + messageObjects[ index ].appType.count + ')';
            var lineItem = {};
            var resource = 'NotificationMessages';
            var localTextBundle = localeSvc.getLoadedText( resource );
            if( appType === 'SUB_MAN' ) {
                messageObjects[ index ].appType.uiValue = localTextBundle.subManAppLabel + '(' +
                    messageObjects[ index ].appType.count + ')';
                lineItem.header = getUiValueOrDefault( searchResults[ i ].props.fnd0TargetObject );
            } else {
                if( searchResults[ i ].props.fnd0RelatedObjects && searchResults[ i ].props.fnd0RelatedObjects.dbValues.length > 0 ) {
                    lineItem.header = searchResults[ i ].props.fnd0RelatedObjects.uiValues[ 0 ];
                    if( searchResults[ i ].props.fnd0RelatedObjects.dbValues.length > 1 ) {
                        var msgHeader = localTextBundle.multipleObjectsMsg;
                        msgHeader = msgHeader.replace( '{0}', lineItem.header );
                        msgHeader = msgHeader.replace( '{1}', searchResults[ i ].props.fnd0RelatedObjects.dbValues.length - 1 );
                        lineItem.header = msgHeader;
                    }
                }
            }
            lineItem.subject = searchResults[ i ].props.fnd0Subject;
            lineItem.subject.uiValue = lineItem.subject.uiValues[ 0 ];
            lineItem.sentDateValue = getUiValueOrDefault( searchResults[ i ].props.fnd0SentDate );
            lineItem.sentDateHeader = searchResults[ i ].props.fnd0SentDate ? searchResults[ i ].props.fnd0SentDate.propertyDescriptor.displayName : '';
            lineItem.uid = searchResults[ i ].uid;
            var eventObj = clientDataModelSvc.getObject( searchResults[ i ].props.fnd0EventType.dbValues[ 0 ] );
            lineItem.eventType = searchResults[ i ].props.fnd0EventType.uiValues[ 0 ];
            lineItem.eventObj = eventObj;
            lineItem.object = searchResults[ i ];

            var linkObject = lineItem.subject;
            linkObject.lineItem = lineItem;
            linkObject.group = messageObjects[ index ].appType;

            messageObjects[ index ].linkObjects.push( linkObject );
            messageObjects[ index ].lineItems.push( lineItem );
        }
    }
};

/**
 * Parse message object based on application types
 *
 * @param {data} data from declViewModel *
 */
export let parseMessageObjects = function( data ) {
    var messageObjects = [];
    _.forEach( data.msgAppTypes, function( result ) {
        if( data.searchFilterMap3[ result ][ 0 ].count !== 0 ) {
            var groupObj = {
                groupName: result,
                uiValue: '',
                count: data.searchFilterMap3[ result ][ 0 ].count
            };
            var lineItems = [];
            var alertContentStructure = {
                appType : groupObj,
                lineItems : lineItems,
                linkObjects : []
            };
            messageObjects.push( alertContentStructure );
        }
    } );
    createLineItems( data.searchResults, messageObjects );

    data.messageObjects = messageObjects;
};

/*
 * Retrieves the list of OfficeStyleSheets from the SOA Also, create a map to fetch the UID from the
 * DisplayValue @param { Object }response - Response of the SOA
 */
export let getMessageObjects = function( response ) {
    response.searchResults = [];
    if (response.searchResultsJSON)
    {
        var searchResults = parsingUtils.parseJsonString(response.searchResultsJSON);
        if (searchResults && searchResults.objects.length>0) {
            response.searchResults = searchResults.objects.map( function( vmo ) {
                return clientDataModelSvc.getObject( vmo.uid );
            } );
        }
    }
    return response.searchResults;
};

/*
 * Retrieves the list of OfficeStyleSheets from the SOA Also, create a map to fetch the UID from the
 * DisplayValue @param { Object }response - Response of the SOA
 */
export let getApplicationTypes = function( response, data ) {
    var appTypeList = [];
    var appTypesString = '';
    for( var lovValRow in response.lovValues ) {
        if( response.lovValues.hasOwnProperty( lovValRow ) ) {
            appTypeList.push( response.lovValues[ lovValRow ].propInternalValues.lov_values[ 0 ] );
            appTypesString = appTypesString + ',' +
                response.lovValues[ lovValRow ].propInternalValues.lov_values[ 0 ];
        }
    }
    appTypesString = appTypesString.substring( 1 );
    appTypes = appTypesString;

    data.messageToLoad.dbValue = appTypeList.length * MESSAGE_PER_APPLICATION;
    return appTypeList;
};

/*
 * Retrieves the list of application types
 */
export let getApplicationTypeString = function() {
    return appTypes;
};

export let setPropertiesInput = function( actionableObjects ) {
    var input = {
        info: [],
        options: []
    };
    _.forEach( actionableObjects, function( result ) {
        var inputInfo = {
            object: result.object
        };
        inputInfo.vecNameVal = [];
        inputInfo.vecNameVal.push( {
            name: 'fnd0MessageReadFlag',
            values: [ 'true' ]
        } );
        input.info.push( inputInfo );
    } );
    return input;
};

export let markSubscriptionMessagesRead = function( messageObjs ) {
    var inputData2 = setPropertiesInput( messageObjs );
    if( inputData2.info.length > 0 ) {
        soaService.postUnchecked( 'Core-2010-09-DataManagement', 'setProperties', inputData2 ).then(
        function() {
            notificationPollingSvc.updateUnreadMessages();
            eventBus.publish( 'awPopupWidget.close' );
        } );
    }
};

const exports = {
    getAppTypeIndex,
    getUiValueOrDefault,
    createLineItems,
    parseMessageObjects,
    getMessageObjects,
    getApplicationTypes,
    getApplicationTypeString,
    setPropertiesInput,
    markSubscriptionMessagesRead
};
export default exports;

/**
 * awNotificationService service utility
 *
 * @memberof NgServices
 * @member awNotificationService
 */
app.factory( 'awNotificationService', () => exports );
