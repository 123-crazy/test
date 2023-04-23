// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global*/

/**
 * This module provides advanced search lov service in native.
 *
 * @module js/advancedSearchLovService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import ngModule from 'angular';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import preferredAdvancedSearchService from 'js/preferredAdvancedSearchService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
'use strict';

/**
* Concatenate property values array and returns property string
*
* @param {propValues} propValues - property values array
* @return {propVal} concatenated property value string
*/
let processLovEntryInternal = function( propValues ) {
    var propVal = '';
    if( propValues !== null && propValues.length > 0 ) {
        propVal = propValues[ 0 ];
        for( var i = 1; i < propValues.length; i++ ) {
            if( propValues[ i ] !== null ) {
                propVal += propVal + ';' + propValues[ i ];
            }
        }
    }
    return propVal;
};

/**
 * LOVEntry object
 *
 * @class LOVEntry
 *
 * @param {Array} lovRowValue - LOV Values.
 * @param {String} lovType - The type of the LOV. e.g. String, Integer etc. This has to be same as the property
 *            type.
 * @param {String} lovValueProp - LOV Value Property.
 * @param {String} lovDescProp - LOV Description Property.
 */
var LOVEntry = function( lovRowValue, lovType, lovValueProp, lovDescProp ) {
    var self = this;

    self.lovRowValue = lovRowValue;
    self.lovType = lovType;
    self.lovDescProp = lovDescProp;
    self.lovValueProp = lovValueProp;
    self.propHasValidValues = true;
    if( lovRowValue.propInternalValues ) {
        self.propInternalValue = lovRowValue.propInternalValues[ lovValueProp ][ 0 ];
    } else {
        self.propInternalValue = {};
    }

    /** property display description */

    /**
     * set flag 'propHasValidValues'
     *
     * @param {propHasValidValues} propHasValidValues - flag
     */
    self.setPropHasValidValues = function( propHasValidValues ) {
        self.propHasValidValues = propHasValidValues;
    };

    /**
     * Concatenate property values array and returns property string
     *
     * @param {propValues} propValues - property values array
     * @return {propVal} concatenated property value string
     */
    self.getPropertyString = function( propValues ) {
        return processLovEntryInternal( propValues );
    };

    /**
     * Concatenate property display values
     *
     * @return {propDisplayValue} concatenated property display values
     */
    self.getPropDisplayValues = function() {
        var propDisplayValue = null;

        if( self.lovRowValue && self.lovRowValue.propDisplayValues &&
            self.lovRowValue.propDisplayValues[ self.lovValueProp ] ) {
            propDisplayValue = self.getPropertyString( self.lovRowValue.propDisplayValues[ self.lovValueProp ] );
        }

        return propDisplayValue;
    };

    /**
     * Concatenate property display description values
     *
     * @return {propDisplayDescription} concatenated property display description values
     */
    self.getPropDisplayDescriptions = function() {
        var propDisplayDescription = null;

        if( self.lovRowValue && self.lovRowValue.propDisplayValues &&
            self.lovRowValue.propDisplayValues[ lovDescProp ] ) {
            propDisplayDescription = self.getPropertyString( self.lovRowValue.propDisplayValues[ lovDescProp ] );
        }

        return propDisplayDescription;
    };

    /** property display value and decription */
    if( self.lovRowValue.propDisplayValues ) {
        self.propDisplayValue = self.getPropDisplayValues();
        self.propDisplayDescription = self.getPropDisplayDescriptions();
    } else {
        self.propDisplayValue = {};
        self.propDisplayDescription = {};
    }
    /**
     * Returns true/false whether the lovRowValue has children.
     *
     * @return {hasChildren} true/false
     */
    self.checkHasChildren = function() {
        return self.lovRowValue.childRows && self.lovRowValue.childRows.length > 0;
    };

    /** checks whether lov has children */
    self.hasChildren = self.checkHasChildren();

    /**
     * Get children lov, used for hierarical lovs
     *
     * @return {list} list array which contains child rows
     */
    self.getChildren = function() {
        var lovEntries = [];
        if( self.checkHasChildren() ) {
            for( var lovValue in self.lovRowValue.childRows ) {
                if( self.lovRowValue.childRows.hasOwnProperty( lovValue ) ) {
                    lovEntries.push( new LOVEntry( self.lovRowValue.childRows[ lovValue ], self.lovType,
                        self.lovValueProp, self.lovDescProp ) );
                }
            }
        }

        return lovEntries;
    };
}; // LOVEntry

/**
 * LOVDataValidationResult object
 *
 * @constructor
 */
var LOVDataValidationResult = function() {
    var self = this;

    self.updatedPropValueMap = {};
    self.updatedPropDisplayValueMap = {};

    /**
     * The parent view model object
     */
    self.setViewModelObject = function( vmObj ) {
        self.viewModelObj = vmObj;
    };

    /**
     * This structure contains the LOV results from the getInitialLOVValues or getNextLOVValues operations
     */
    self.addUpdatedPropertyValue = function( propName, propValues, propDisplayValues ) {
        self.updatedPropValueMap[ propName ] = propValues;
        self.updatedPropDisplayValueMap[ propName ] = propDisplayValues;
    };

    /**
     * This structure contains the LOV results from the getInitialLOVValues or getNextLOVValues operations
     */
    self.setValid = function( valid ) {
        self.valid = valid;
    };

    /**
     * This structure contains the LOV results from the getInitialLOVValues or getNextLOVValues operations
     */
    self.setError = function( error ) {
        self.error = error;
    };
}; // LOVDataValidationResult

var exports = {};

/**
 * Cache document ng element to retrieve the scope and trigger digest cycle.
 *
 * @private
 */
var docNgElement = ngModule.element( document.body );

/**
 * Trigger digest cycle of root scope so that widgets get reflected to the overlay object updates.
 */
var triggerDigestCycle = function() {
    // trigger angular digest cycle on root scope so that value updates get reflected
    if( docNgElement && docNgElement.scope() ) {
        docNgElement.scope().$evalAsync();
    }
};

/**
 * Implementation of LOV Service (these api's are only compatible with Teamcenter 9)
 *
 * @constructor
 *
 * @param {QueueService} $q - Queue service
 *
 * @param {notifyService} notifySvc -
 *
 * @param {dateTimeService} dateTimeSvc - SOA's LOV Access service
 *
 * @param {clientDataModel} clientDataModel - SOA's clientDataModel service
 */
var AdvancedSearchLovService = function() {
    var self = this;

    /**
     * Store the deferred promise from validateLovValueSelections to prevent multiple calls
     */
    self.validateLOVValueDeferred;

    /**
     * Store the deferred promise from getInitialLovValues to prevent multiple calls
     */
    self.getInitialLovValueDeferred;

    localeService.getTextPromise( 'SearchCoreMessages', true ).then(
        function( localTextBundle ) {
            self.lovEntryPreferred = new LOVEntry( '', 'String', 'preferredSearches', localTextBundle.preferredSearches );
            self.lovEntryRegular = new LOVEntry( '', 'String', 'regularSearches', localTextBundle.regularSearches );
        } );
    /**
     * @param {ViewModelProperty} viewProp -view model Property
     * @param {filterString} filterString - filter string for lov's
     * @param {String} opName - operation Name
     * @param {ViewModelObject} viewModelObj -view model object
     * @param {Number} maxResults - Maximum no of results.
     * @param {Number} lovPageSize - The count of LOVs to be returned in a single server call.
     * @param {String} sortPropertyName - The property on which to sort LOV results on.
     * @param {String} sortOrder - Sort order.
     *
     */
    var createInitialData = function( viewProp, filterString, operationName, viewModelObj, appCtxSvc, maxResults,
        lovPageSize, sortPropertyName, sortOrder ) {
        var viewObject = viewModelObj;

        var contextObject = appCtxSvc.getCtx( 'InitialLovDataAdditionalProps' );

        var initialData = {};
        var opName = operationName[ 0 ].toUpperCase() + operationName.slice( 1 ).toLowerCase();

        initialData.propertyName = viewProp.propertyName;
        initialData.filterData = {
            filterString: filterString ? filterString : '',
            maxResults: maxResults ? maxResults : 0,
            numberToReturn: lovPageSize ? lovPageSize : 50,
            order: sortOrder ? sortOrder : 1,
            sortPropertyName: sortPropertyName ? sortPropertyName : ''
        };

        initialData.lov = {
            uid: '',
            type: ''
        };

        initialData.lovInput = {
            owningObject: {
                uid: viewObject.uid,
                type: viewObject.type
            },
            operationName: opName,
            boName: viewObject.modelType.name,
            propertyValues: {}
        };

        if( viewObject.modelType.owningType ) {
            initialData.lovInput.boName = viewObject.modelType.owningType;
        }

        var modifiedProps = viewObject.getSaveableDirtyProps();

        if( modifiedProps && modifiedProps.length > 0 ) {
            for( var prop in modifiedProps ) {
                if( modifiedProps.hasOwnProperty( prop ) ) {
                    var modifiedPropName = modifiedProps[ prop ].name;

                    initialData.lovInput.propertyValues[ modifiedPropName ] = modifiedProps[ prop ].values;
                }
            }
        }

        if( contextObject ) {
            for( var addProp in contextObject ) {
                initialData.lovInput.propertyValues[ addProp ] = [ contextObject[ addProp ] ];
            }
        }

        return initialData;
    };

    self.isAdvancedSearchLOVDropDown = function( viewProp ) {
        if( viewProp && viewProp.propertyName === 'awp0AdvancedQueryName' ) {
            return true;
        }
        return false;
    };

    /**
     * Add the 'lovApi' function set object to the given ViewModelProperty
     *
     * @param {ViewModelProperty} viewProp -view model property
     *
     * @param {$Scope} scope - angular scope for the element
     *
     * @param {ViewModelObject} viewModelObj -view model Object
     *
     */
    self.initNativeCellLovApi = function( viewProp, scope, operationName, viewModelObj ) {
        viewProp.lovApi = {};
        var isAdvancedSearchLOVDropDown = self.isAdvancedSearchLOVDropDown( viewProp );
        viewProp.lovApi.getInitialValues = function( filterStr, deferred, name, maxResults, lovPageSize,
            sortPropertyName, sortOrder ) {
            if( !isAdvancedSearchLOVDropDown ) {
                self.getInitialValues( filterStr, deferred, viewProp, operationName, viewModelObj, maxResults,
                    lovPageSize, sortPropertyName, sortOrder );
            } else {
                self.getInitialValuesWithPreferredSearches( filterStr, deferred, viewProp, operationName, viewModelObj, maxResults,
                    lovPageSize, sortPropertyName, sortOrder );
            }
        };

        viewProp.lovApi.getNextValues = function( deferred ) {
            if( !isAdvancedSearchLOVDropDown ) {
                self.getNextValues( deferred, viewProp );
            } else {
                self.getNextValuesWithPreferredSearches( deferred, viewProp );
            }
        };

        viewProp.lovApi.validateLOVValueSelections = function( lovEntries ) {
            return self.validateLOVValueSelections( lovEntries, viewProp, operationName, viewModelObj );
        };
    };

    let showErrors = function( reason, deferred ) {
        messagingService.showError( reason.toString() );
        deferred.reject( reason );
        self.getInitialLovValueDeferred = null;
    };

    self.getInitialValuesWithPreferredSearches = function( filterString, deferred, viewProp, operationName, viewModelObj, maxResults,
        lovPageSize, sortPropertyName, sortOrder ) {
        if( !self.getInitialLovValueDeferred ) {
            var isPreferredSearchEnabled = false;
            var preferredSearchObject = {};
            soaSvc.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
                searchSettingInput: {
                    inputSettings: {
                        getQRYColumnsShownPref: [ 'true' ]
                    }
                }
            } ).then( function( result ) {
                if( result && result.outputValues && result.outputValues.getQRYColumnsShownPref && result.outputValues.getQRYColumnsShownPref.length > 0 ) {
                    var values = result.outputValues.getQRYColumnsShownPref;
                    values = preferredAdvancedSearchService.removeEmptyValues( values );
                    preferredSearchObject.count = values.length;
                    preferredSearchObject.values = values;
                }
            } ).then( function() {
                self.getInitialLovValueDeferred = deferred;
                if( preferredSearchObject && preferredSearchObject.count > 0 ) {
                    isPreferredSearchEnabled = true;
                }
                var initialData = createInitialData( viewProp, filterString, operationName, viewModelObj,
                    appCtxService, maxResults, lovPageSize, sortPropertyName, sortOrder );

                var serviceInput = {
                    initialData: initialData
                };
                soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', serviceInput ).then( function( responseData ) {
                    viewProp.searchResults = responseData; // using for LOV getNextLOVValues SOA call
                    viewProp.lovApi.result = responseData; //using for validateLOVValuesSelections()
                    if( preferredSearchObject && preferredSearchObject.count > 0 ) {
                        preferredAdvancedSearchService.addPreferredSearchNamesToCtx( filterString, responseData, preferredSearchObject );
                        self.regularLineAdded = false;
                    }

                    var lovEntries = self.createLOVEntries( responseData, viewProp.type, isPreferredSearchEnabled, true );
                    deferred.resolve( lovEntries );
                    self.getInitialLovValueDeferred = null;
                }, function( reason ) {
                    showErrors( reason, deferred );
                } );
            } );
        }
    };

    /**
     * This operation is invoked to query the data for a property having an LOV attachment. The results returned
     * from the server also take into consideration any filter string that is in the input. This method calls
     * 'getInitialLOVValues' and returns initial set of lov values. This is only compatible with 'Teamcenter 10'
     *
     * @param {filterString} filterString - The filter text for lov's
     * @param {deferred} deferred - $q object to resolve the 'promise' with a an array of LOVEntry objects.
     * @param {ViewModelProperty} viewProp - Property to aceess LOV values for.
     * @param {String} operationName - The operation being performed e.g. Edit, Create, Revise, Save As etc.
     * @param {ViewModelObject} viewModelObj - The view model object which LOV property is defined on.
     * @param {Number} maxResults - Maximum no of results.
     * @param {Number} lovPageSize - The count of LOVs to be returned in a single server call.
     * @param {String} sortPropertyName - The property on which to sort LOV results on.
     * @param {String} sortOrder - Sort order.
     * @param {Boolean} preferredSearchEnabled - if there are preferred searches available
     */

    self.getInitialValues = function( filterString, deferred, viewProp, operationName, viewModelObj, maxResults,
        lovPageSize, sortPropertyName, sortOrder ) {
        if( !self.getInitialLovValueDeferred ) {
            self.getInitialLovValueDeferred = deferred;
            var initialData = createInitialData( viewProp, filterString, operationName, viewModelObj,
                appCtxService, maxResults, lovPageSize, sortPropertyName, sortOrder );

            var serviceInput = {
                initialData: initialData
            };
            soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', serviceInput ).then( function( responseData ) {
                viewProp.searchResults = responseData; // using for LOV getNextLOVValues SOA call
                viewProp.lovApi.result = responseData; //using for validateLOVValuesSelections()

                var lovEntries = self.createLOVEntries( responseData, viewProp.type, false, true );
                deferred.resolve( lovEntries );
                self.getInitialLovValueDeferred = null;
                eventBus.publish( 'checkboxListComplete' );
            }, function( reason ) {
                showErrors( reason, deferred );
                eventBus.publish( 'checkboxListComplete' );
            } );
        }
    };

    self.getNextValues = function( deferred, viewProp ) {
        var lovEntries = [];
        if( viewProp.searchResults && viewProp.searchResults.moreValuesExist ) {
            var serviceInput = {};
            serviceInput.lovData = viewProp.searchResults.lovData;
            soaSvc.post( 'Core-2013-05-LOV', 'getNextLOVValues', serviceInput ).then( function( responseData ) {
                viewProp.searchResults = responseData;
                var lovEntries = self.createLOVEntries( responseData, viewProp.type, false, false );
                deferred.resolve( lovEntries );
            }, function( reason ) {
                showErrors( reason, deferred );
            } );
        } else {
            deferred.resolve( lovEntries );
        }

        return deferred.promise;
    };

    /**
     * This operation is invoked after a call to getInitialLOVValues if the moreValuesExist flag is true in the
     * LOVSearchResults output returned from a call to the getInitialLOVValues operation. The operation will
     * retrieve the next set of LOV values.
     *
     * @param {deferred} deferred - promise object
     * @param {ViewModelProperty} viewProp - Lov object value
     * @param {Boolean} preferredSearchEnabled - if there are preferred searches available
     * @return {deferred.promise} promise object
     */
    self.getNextValuesWithPreferredSearches = function( deferred, viewProp ) {
        var lovEntries = [];
        var isPreferredSearchEnabled = false;
        var preferredSearchesCtx = appCtxService.getCtx( 'advancedSearch.preferredSearches' );
        if( preferredSearchesCtx && preferredSearchesCtx.count > 0  ) {
            isPreferredSearchEnabled = true;
        }
        if( viewProp.searchResults && viewProp.searchResults.moreValuesExist ) {
            var serviceInput = {};
            serviceInput.lovData = viewProp.searchResults.lovData;
            var filterString;
            if( serviceInput.lovData && serviceInput.lovData.filterData ) {
                filterString = serviceInput.lovData.filterData.filterString;
            }
            soaSvc.post( 'Core-2013-05-LOV', 'getNextLOVValues', serviceInput ).then( function( responseData ) {
                viewProp.searchResults = responseData;
                if( preferredSearchesCtx && preferredSearchesCtx.moreValuesExist ) {
                    preferredAdvancedSearchService.addNextLovValuesToPreferredSearchCtx( filterString, responseData, preferredSearchesCtx );
                }
                var lovEntries = self.createLOVEntries( responseData, viewProp.type, isPreferredSearchEnabled, false );
                deferred.resolve( lovEntries );
            }, function( reason ) {
                messagingService.showError( reason.toString() );
                deferred.reject( reason );
            } );
        } else {
            deferred.resolve( lovEntries );
        }

        return deferred.promise;
    };

    /**
     * This is a reusable function to create LOV entries from SOA response
     *
     * @param {responseData} responseData - SOA response structure from LOV
     * @param {propertyType} propertyType - Type of Property
     * @param {Boolean} preferredSearchEnabled - if there are preferred searches available
     * @param {Boolean} isGettingInitialValues - flag to add the preferred searches header at the top of the list
     * @return {lovEntries} Array of LOV entry objects
     */
    self.createLOVEntries = function( responseData, propertyType, preferredSearchEnabled, isGettingInitialValues ) {
        var lovEntries = [];
        var lovValueProp = responseData.behaviorData.columnNames.lovValueProp;
        var lovDescProp = responseData.behaviorData.columnNames.lovDescrProp;

        var preferredLineAdded = {
            hasPreferredLine: false
        };

        for( var lovValue in responseData.lovValues ) {
            if( responseData.lovValues.hasOwnProperty( lovValue ) ) {
                var lovEntry = new LOVEntry( responseData.lovValues[ lovValue ], propertyType, lovValueProp,
                    lovDescProp );
                if ( !lovEntries.hasChildren && lovEntry.hasChildren ) {
                    lovEntries.hasChildren = true;
                }
                if( !self.isAdminQuery( lovEntry ) ) {
                    self.addPreferredHeaders( preferredSearchEnabled, isGettingInitialValues, preferredLineAdded, lovEntries, lovEntry );
                    lovEntries.push( lovEntry );
                }
            }
        }
        // push the moreValuesExist to the lovEntries. if it is true, then call getNextValues ; else not call getNextValues
        if( responseData.moreValuesExist ) {
            lovEntries.moreValuesExist = responseData.moreValuesExist;
        }
        return lovEntries;
    };

    self.isPreferred = function( lovEntry, preferredSearchesList ) {
        var isPreferred = false;
        var propDisplayValue = lovEntry.getPropDisplayValues();
        var found = _.indexOf( preferredSearchesList, propDisplayValue );
        if( found > -1 ) {
            isPreferred = true;
        }
        return isPreferred;
    };

    self.addPreferredHeaders = function( isPreferredSearchEnabled, isGettingInitialValues, preferredLineAdded, lovEntries, lovEntry ) {
        var advancedSearchCtx = appCtxService.getCtx( 'advancedSearch' );
        var preferredSearchObject;
        if( advancedSearchCtx && advancedSearchCtx.preferredSearches ) {
            preferredSearchObject = advancedSearchCtx.preferredSearches;
        }
        var isAdvancedTab = advancedSearchCtx && advancedSearchCtx.tabModels && advancedSearchCtx.tabModels.dbValue &&
            advancedSearchCtx.tabModels.dbValue[1] && advancedSearchCtx.tabModels.dbValue[1].pageId === 1 && advancedSearchCtx.tabModels.dbValue[1].selectedTab;
        if( isPreferredSearchEnabled && preferredSearchObject && preferredSearchObject.count > 0 && isAdvancedTab ) {
            if( isGettingInitialValues ) {
                if( !preferredLineAdded.hasPreferredLine && self.isPreferred( lovEntry, preferredSearchObject.preferredSearches ) ) {
                    lovEntries.push( self.lovEntryPreferred );
                    preferredLineAdded.hasPreferredLine = true;
                }
                if( !self.regularLineAdded && !self.isPreferred( lovEntry, preferredSearchObject.preferredSearches ) ) {
                    lovEntries.push( self.lovEntryRegular );
                    preferredLineAdded.hasPreferredLine = true;
                    self.regularLineAdded = true;
                }
            } else {
                if( !self.regularLineAdded && !self.isPreferred( lovEntry, preferredSearchObject.preferredSearches ) ) {
                    lovEntries.push( self.lovEntryRegular );
                    self.regularLineAdded = true;
                }
            }
        }
    };

    self.isAdminQuery = function( lovEntry ) {
        var isAdmin = false;
        var propDisplayValue = lovEntry.getPropDisplayValues();
        if( propDisplayValue && self.strStartsWith( propDisplayValue, '__' ) ) {
            isAdmin = true;
        }
        return isAdmin;
    };

    //This function adds a custom implementation for String.prototype.startsWith, which is not supported
    //by IE11
    self.strStartsWith = function( baseString, searchPrefix ) {
        if( !String.prototype.startsWtih ) {
            return baseString.indexOf( searchPrefix ) === 0;
        }

        return baseString.startsWith( searchPrefix );
    };

    /**
     * This operation can be invoked after selecting a value from the LOV. Use this operation to do additional
     * validation to be done on server such as validating Range value, getting the dependent properties values in
     * case of interdependent LOV (resetting the dependendent property values), Coordinated LOVs ( populating
     * dependent property values ).
     *
     * @param {uid} lovEntries - uid of selected row's
     *
     * @param {viewProp} viewProp - Lov object value
     *
     * @return {deferred.promise} promise object resolved with an instance of LOVDataValidationResult.
     */
    self.validateLOVValueSelections = function( lovEntries, viewProp, operationName, viewModelObj ) {
        if( !self.validateLOVValueDeferred ) {
            var viewObject = viewModelObj;
            var contextObject = appCtxService.getCtx( 'InitialLovDataAdditionalProps' );

            var lovValueProp = null;
            if( viewProp.lovApi.result ) {
                lovValueProp = viewProp.lovApi.result.behaviorData.columnNames.lovValueProp;
            }

            var propName = viewProp.propertyName;

            var objName = viewObject.modelType.owningType ? viewObject.modelType.owningType :
                viewObject.modelType.name;

            var serviceInput = {};
            var opName = operationName[ 0 ].toUpperCase() + operationName.slice( 1 ).toLowerCase();
            serviceInput.lovInput = {
                owningObject: {
                    uid: viewObject.uid,
                    type: viewObject.type
                },
                operationName: opName,
                boName: objName,
                propertyValues: {}
            };

            serviceInput.propName = propName;
            serviceInput.uidOfSelectedRows = [];
            serviceInput.lovInput.propertyValues[ propName ] = [];

            // First add all the selected LOV entries
            serviceInput = processLovEntries( propName, lovEntries, lovValueProp, serviceInput );

            // Now populate all the other modified properties.
            var modifiedProps = viewObject.getSaveableDirtyProps();
            if( modifiedProps && modifiedProps.length > 0 ) {
                serviceInput = processModifiedProps( propName, modifiedProps, serviceInput );
            }

            if( contextObject ) {
                for( var addProp in contextObject ) {
                    serviceInput.lovInput.propertyValues[ addProp ] = [ contextObject[ addProp ] ];
                }
            }

            self.validateLOVValueDeferred = AwPromiseService.instance.defer();

            soaSvc.postUnchecked( 'Core-2013-05-LOV', 'validateLOVValueSelections', serviceInput )
                .then(
                    function( responseData ) {
                        var validationResult = new LOVDataValidationResult();

                        validationResult.setValid( responseData.propHasValidValues );
                        validationResult.setViewModelObject( viewModelObj );

                        var updatedValues = responseData.updatedPropValues;

                        for( var propName in responseData.dependentPropNames ) {
                            if( responseData.dependentPropNames.hasOwnProperty( propName ) ) {
                                var prop = responseData.dependentPropNames[ propName ];
                                if( updatedValues.propInternalValues.hasOwnProperty( prop ) ) {
                                    validationResult.addUpdatedPropertyValue( prop,
                                        updatedValues.propInternalValues[ prop ],
                                        updatedValues.propDisplayValues[ prop ] );
                                }
                            }
                        }

                        self.validateLOVValueDeferred.resolve( validationResult );
                        self.validateLOVValueDeferred = null;
                    },
                    function( error ) {
                        self.validateLOVValueDeferred.reject( error );
                        self.validateLOVValueDeferred = null;
                    } );
        }
        return self.validateLOVValueDeferred.promise;
    };
};


/**
 * processModifiedProps - Helper function for validateLOVValueSelections
 * @function processModifiedProps
 * @param {Object} propName - Property Name
 * @param {Object} modifiedProps - The category that must be added to the filter map
 * @param {Object} serviceInput - The selected filters
 * @returns {Object} serviceInput
 */
let processModifiedProps = function( propName, modifiedProps, serviceInput ) {
    for( var prop in modifiedProps ) {
        if( modifiedProps.hasOwnProperty( prop ) ) {
            var modifiedPropName = modifiedProps[ prop ].name;

            if( modifiedPropName !== propName ) {
                serviceInput.lovInput.propertyValues[ modifiedPropName ] = modifiedProps[ prop ].values;
            }
        }
    }

    return serviceInput;
};

/**
 * processLovEntries - Helper function for validateLOVValueSelections
 * @function processLovEntries
 * @param {Object} propName - Property Name
 * @param {uid} lovEntries - UIDs of selected row's
 * @param {Object} lovValueProp - The category that must be added to the filter map
 * @param {Object} serviceInput - The selected filters
 * @returns {Object} serviceInput
 */
let processLovEntries = function( propName, lovEntries, lovValueProp, serviceInput ) {
    for( var ii = 0; ii < lovEntries.length; ii++ ) {
        // account for simplified lov format
        if( 'propInternalValue' in lovEntries[ ii ] ) {
            serviceInput.lovInput.propertyValues[ propName ]
                .push( String( lovEntries[ ii ].propInternalValue ) );
        } else if( lovValueProp && lovEntries[ ii ].lovRowValue ) {
            serviceInput.lovInput.propertyValues[ propName ]
                .push( String( lovEntries[ ii ].lovRowValue.propInternalValues[ lovValueProp ][ 0 ] ) );
        }
    }

    return serviceInput;
};


export default new AdvancedSearchLovService();
app.factory( 'advancedSearchLovService', () => new AdvancedSearchLovService() );
