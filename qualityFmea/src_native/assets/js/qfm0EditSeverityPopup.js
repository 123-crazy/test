// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/qfm0EditSeverityPopup
 */
 import app from 'app';
 import eventBus from 'js/eventBus';
 import AwPromiseService from 'js/awPromiseService';
 import messagingService from 'js/messagingService';
 import soaSvc from 'soa/kernel/soaService';
 import appCtxService from 'js/appCtxService';
 import qfm0FmeaManagerUtils from 'js/qfm0FmeaManagerUtils';
 import _ from 'lodash';
 
 var exports = {};

 /**
 * getSeverityLovUID
 * @param {Object} response the response of the getAttachedLOVs soa
 */
export let getSeverityLovUID = function( response ) {
    return response.inputTypeNameToLOVOutput.Qfm0FailureElement[ 0 ].lov.uid;
};

/**
 * This method is used to get the Severity LOV values.
 * @param {Object} response the response of the getInitialLOVValues soa
 */
 export let getSeverityLOVList = function( response ) {
    if(response.lovValues !== undefined && response.lovValues !== null){
        return response.lovValues.map( function( obj ) {
            if(obj !== null && obj.propDisplayValues.lov_values !== undefined && obj.propDisplayValues.lov_values !== null && obj.propDisplayValues.lov_values.length > 0){
                return {
                    propDisplayValue: obj.propDisplayValues.lov_values[0],
                    propInternalValueType: obj.propInternalValueTypes.lov_values,
                    propInternalValue: obj.propInternalValues.lov_values[0]                              
                };
            }
        } );
    }
};

 /**
 * This method will update the severity of the selected failure object
 * @param {object} data contains the new modified severity value 
  */
export let commitSeverity = function (data) {
    var deferred = AwPromiseService.instance.defer();
    
    if(data.SeverityProp.newValue !== undefined && data.SeverityProp.newValue !== null && data.SeverityProp.newValue !== appCtxService.ctx.selected.props.qfm0Severity.dbValues[0]){
        var relInput = {
            inputs:
            [
                {
                    selectedObject:appCtxService.getCtx('selected'),
                    severity:parseInt(data.SeverityProp.newValue)
                }
            ],
            runInBackground: true
        };
        soaSvc.post( 'Internal-FmeaManager-2022-06-FMEADataManagement', 'cascadeSeverity', relInput ).then(
        function(response){
            if ( response.updated !== undefined ){               
                deferred.resolve();
            }
        },
        function(error){
            var errMessage = messagingService.getSOAErrorMessage( error );

            var msgObj = {
                msg: '',
                level: 0
            };
            var informationMsg = {
                compltdMsg: '',
                inProgressMsg: ''
            };

            if( error.cause ) {
                if ( error.cause.partialErrors ) {
                    var partialErrors = error.cause.partialErrors;
                    for (var i = 0; i < partialErrors.length; i++) {
                        qfm0FmeaManagerUtils.getMessageString( partialErrors[i].errorValues, msgObj );
                        qfm0FmeaManagerUtils.getInformationMessageString( partialErrors[i].errorValues, informationMsg );
                    }                  
                } 
            }         

            if(informationMsg.compltdMsg || informationMsg.inProgressMsg){
                let updatedFailureObject = appCtxService.getCtx('selected');
                let modelObjects = error && error.cause ? error.cause.modelObjects : null;
                let updatedObjectsUids = error && error.cause ? error.cause.updated : [];
                let eventData = {
                    dataSource: {
                        modelObjects: modelObjects,
                        updatedObjectsUids: updatedObjectsUids
                    }
                };
                if(informationMsg.compltdMsg && informationMsg.inProgressMsg){
                    var combinedMessage = {};
                    combinedMessage += informationMsg.compltdMsg;
                    combinedMessage += '<BR/>';
                    combinedMessage += informationMsg.inProgressMsg;
                    messagingService.showInfo(combinedMessage);
                }else if(informationMsg.compltdMsg){
                    deferred.resolve();
                    eventBus.publish( 'severityUpdatedByRHEditSeverityCmd', eventData );
                    messagingService.showInfo(informationMsg.compltdMsg);
                }else if(informationMsg.inProgressMsg){
                    eventBus.publish( 'severityUpdatedByRHEditSeverityCmd', eventData );
                    messagingService.showInfo(informationMsg.inProgressMsg);
                }    
            }
            if(msgObj.msg){
                messagingService.showError(msgObj.msg );
            }            
        });
        eventBus.publish( 'showcaseApp.closePopup' );        
    }
    return deferred.promise;
};

 export default exports = {
    commitSeverity,
    getSeverityLovUID,
    getSeverityLOVList
};
/**
 * @memberof NgServices
 * @member qfm0EditSeverityPopup
 */
app.factory('qfm0EditSeverityPopup', () => exports);
