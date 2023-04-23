// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This file is used as utility file for Specification manager from quality center foundation module
 *
 * @module js/qfm0FormsheetDataService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import policySvc from 'soa/kernel/propertyPolicyService';
import messagingService from 'js/messagingService';
import _ from 'lodash';

var exports = {};

export let getFormsheetData = function( startIndex, pageSize, addElementInput, formsheetColIdx ) {
    var deferred = AwPromiseService.instance.defer();
    var policyId = policySvc.register( {
        types: [ {
                name: 'Qfm0FMEANode',
                properties: [ {
                    name: 'qfm0FMEAType'
                } ]
            },
            {
                name: 'Qfm0FailureElement',
                properties: [ {
                    name: 'qfm0MaxSeverity'
                } ]
            },
            {
                name: 'Qfm0Cause',
                properties: [ {
                        name: "qfm0ActionPriority"
                    },
                    {
                        name: "qfm0FinalActionPriority"
                    },
                    {
                        name: "primary_object"
                    },
                    {
                        name: "secondary_object"
                    }
                ]
            },
            {
                name: 'Qfm0Effect',
                properties: [ {
                        name: "qfm0Severity"
                    },
                    {
                        name: "primary_object"
                    },
                    {
                        name: "secondary_object"
                    }
                ]
            },
            {
                name: 'Qam0QualityAction',
                properties: [ {
                        name: "qam0Occurrence"
                    },
                    {
                        name: "qam0Detection"
                    },
                    {
                        name: "fnd0ResponsibleUser"
                    },
                    {
                        name: "qam0DueDate"
                    },
                    {
                        name: "qam0CompletionDate"
                    },
                    {
                        name: "qam0Comment"
                    },
                    {
                        name: "qam0QualityActionStatus"
                    }
                ]
            }
        ]
    } );

    var soaInput2 = {
        input: {
          includeFSHeader: true,
          businessObject: {
            uid: appCtxService.ctx.xrtSummaryContextObject.uid,
            type: appCtxService.ctx.xrtSummaryContextObject.type
          },
          cursor: {
            startIndex: startIndex,
            pageSize: pageSize,
            selectedObject: {
              colIndex: formsheetColIdx,
              cellObject: addElementInput
            }
          }
        }
      };

    soaSvc.post( 'Internal-FmeaManager-2020-05-FMEADataManagement', 'getFormSheetData2', soaInput2 ).then(
        function( response ) {
            if( policyId ) {
                policySvc.unregister( policyId );
            }
            deferred.resolve( response );
        },
        function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            messagingService.showError( errMessage );
            throw error;
        }
    );
    return deferred.promise;
};

export default exports = {
    getFormsheetData
};
app.factory( 'qfm0FormsheetDataService', () => exports );
