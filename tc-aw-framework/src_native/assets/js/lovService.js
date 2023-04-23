// Copyright (c) 2020 Siemens

/**
 * This module provides lov service in native.
 *
 * @module js/lovService
 */
import app from 'app';
import assert from 'assert';
import _ from 'lodash';
import soaSvc from 'soa/kernel/soaService';
import clientDataModel from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';

// Services
import AwPromiseService from 'js/awPromiseService';

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
     * Concatenate property display values
     *
     * @return {propDisplayValue} concatenated property display values
     */
    self.getPropDisplayValues = function() {
        var propDisplayValue;
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
        var propDisplayDescription;
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

/**
 * @param {ViewModelProperty} viewProp -view model Property
 * @param {filterString} filterString - filter string for lov's
 * @param {String} opName - operation Name
 * @param {ViewModelObject} viewModelObj -view model object
 * @param {Number} maxResults - Maximum no of results.
 * @param {Number} lovPageSize - The count of LOVs to be returned in a single server call.
 * @param {String} sortPropertyName - The property on which to sort LOV results on.
 * @param {String} sortOrder - Sort order.
 * @param {String} owningObjUid - The UID of owning object
 */
var createInitialData = function( viewProp, filterString, assert, operationName, viewModelObj, appCtxService,
    maxResults, lovPageSize, sortPropertyName, sortOrder, owningObjUid ) {
    var viewObject = viewModelObj;

    var contextObject = appCtxService.getCtx( 'InitialLovDataAdditionalProps' );
    var tablePropObject = appCtxService.getCtx( 'InitialSaveDataAdditionalProps' );

    assert( viewObject, 'LOV property: Missing parent viewObject on viewProp: ' + viewProp.name );

    var initialData = {};

    initialData.propertyName = uwPropertyService.getBasePropertyName( viewProp.propertyName );
    initialData.filterData = {
        filterString: filterString ? filterString : '',
        maxResults: maxResults ? maxResults : 2000,
        numberToReturn: lovPageSize ? lovPageSize : 25,
        order: sortOrder ? sortOrder : 1,
        sortPropertyName: sortPropertyName ? sortPropertyName : ''
    };

    initialData.lov = {
        uid: '',
        type: ''
    };

    // For Dcp properties, use intermediate object's type, else use the type of the parent object.
    var objName = viewProp.srcObjectTypeName || viewObject.modelType.owningType || viewObject.modelType.name;

    operationName = exports.formatOperationName( operationName );

    var sourceObjectUid = uwPropertyService.getSourceObjectUid( viewProp );

    var owningObjectUid = owningObjUid || sourceObjectUid;
    var modelObject = clientDataModel.getObject( owningObjectUid );
    if( !modelObject ) {
        owningObjectUid = clientDataModel.NULL_UID;
    }

    initialData.lovInput = {
        owningObject: {
            uid: owningObjectUid,
            type: owningObjUid || sourceObjectUid ? objName : viewObject.type
        },
        operationName: operationName,
        boName: objName,
        propertyValues: {}
    };

    // var modifiedProps = _.union( viewObject.getSaveableDirtyProps(), viewObject.getAutoAssignableProps() );
    var modifiedProps = viewObject.getSaveableDirtyProps();

    if( modifiedProps && modifiedProps.length > 0 ) {
        for( var prop in modifiedProps ) {
            if( modifiedProps.hasOwnProperty( prop ) ) {
                var modifiedPropName = uwPropertyService.getBasePropertyName( modifiedProps[ prop ].name );
                initialData.lovInput.propertyValues[ modifiedPropName ] = modifiedProps[ prop ].values;
            }
        }
    }

    if( tablePropObject ) {
        tablePropObject = _.isArray( tablePropObject ) ? tablePropObject : [ tablePropObject ];
        _.forEach( tablePropObject, function( value, key ) {
            _.forEach( value, function( nestedValue, nestedKey ) {
                delete initialData.lovInput.propertyValues[ nestedKey ];
            } );
        } );
    }

    if( contextObject ) {
        for( var addProp in contextObject ) {
            initialData.lovInput.propertyValues[ addProp ] = [ contextObject[ addProp ] ];
        }
    }

    return initialData;
};

/**
 * Implementation of LOV Service (these api's are only compatible with Teamcenter 9)
 *
 * @param {module:scripts/services/notifyService} notifySvc -
 *
 * @param {module:js/dateTimeService} dateTimeSvc - SOA's LOV Access service
 *
 * @param {module:soa/kernel/clientDataModel} clientDataModel - SOA's clientDataModel service
 */
let exports;

/**
 * Add the 'lovApi' function set object to the given ViewModelProperty
 *
 * @param {ViewModelProperty} viewProp -view model property
 *
 * @param {module:angular~Scope} scope - angular scope for the element
 *
 * @param {ViewModelObject} viewModelObj -view model Object
 *
 * @param {String} owningObjUid - The UID of owning object
 *
 */
export let initNativeCellLovApi = function( viewProp, scope, operationName, viewModelObj, owningObjUid ) {
    viewProp.lovApi = {};
    viewProp.lovApi.operationName = operationName;
    viewProp.lovApi.getInitialValues = function( filterStr, deferred, name, maxResults, lovPageSize,
        sortPropertyName, sortOrder ) {
        exports.getInitialValues( filterStr, deferred, viewProp, viewProp.lovApi.operationName, viewModelObj,
            maxResults, lovPageSize, sortPropertyName, sortOrder, owningObjUid );
    };

    viewProp.lovApi.getNextValues = function( deferred ) {
        exports.getNextValues( deferred, viewProp );
    };

    viewProp.lovApi.validateLOVValueSelections = function( lovEntries ) {
        return exports.validateLOVValueSelections( lovEntries, viewProp, viewProp.lovApi.operationName,
            viewModelObj, owningObjUid );
    };
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
 * @param {String} owningObjUid - The UID of owning object
 */
export let getInitialValues = function( filterString, deferred, viewProp, operationName, viewModelObj, maxResults,
    lovPageSize, sortPropertyName, sortOrder, owningObjUid ) {
    var initialData = createInitialData( viewProp, filterString, assert, operationName, viewModelObj,
        appCtxService, maxResults, lovPageSize, sortPropertyName, sortOrder, owningObjUid );

    var serviceInput = {
        initialData: initialData
    };

    soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', serviceInput ).then( function( responseData ) {
        viewProp.searchResults = responseData; // using for LOV getNextLOVValues SOA call
        viewProp.lovApi.result = responseData; // using for validateLOVValuesSelections()
        var lovEntries = exports.createLOVEntries( responseData, viewProp.type );
        deferred.resolve( lovEntries );
    }, function( reason ) {
        deferred.reject( reason );
    } );
};

/**
 * This operation is invoked after a call to getInitialLOVValues if the moreValuesExist flag is true in the
 * LOVSearchResults output returned from a call to the getInitialLOVValues operation. The operation will
 * retrieve the next set of LOV values.
 *
 * @param {deferred} deferred - promise object
 * @param {ViewModelProperty} viewProp - Lov object value
 * @return {deferred.promise} promise object
 */
export let getNextValues = function( deferred, viewProp ) {
    var lovEntries = [];

    if( viewProp.searchResults ) {
        var serviceInput = {};

        serviceInput.lovData = viewProp.searchResults.lovData;

        soaSvc.post( 'Core-2013-05-LOV', 'getNextLOVValues', serviceInput ).then( function( responseData ) {
            viewProp.searchResults = responseData;
            lovEntries = exports.createLOVEntries( responseData, viewProp.type );
            deferred.resolve( lovEntries );
        } );
    } else {
        deferred.resolve( lovEntries );
    }

    return deferred.promise;
};

/**
 * This is a reusable function to create LOV entries from SOA response
 *
 * @param {responseData} SOA response structure from LOV
 * @param {propertyType} Type of Property
 * @return {lovEntries} Array of LOV entry objects
 */
export let createLOVEntries = function( responseData, propertyType ) {
    var lovEntries = [];
    var lovValueProp = responseData.behaviorData.columnNames.lovValueProp;
    var lovDescProp = responseData.behaviorData.columnNames.lovDescrProp;
    for( var lovValue in responseData.lovValues ) {
        if( responseData.lovValues.hasOwnProperty( lovValue ) ) {
            lovEntries.push( new LOVEntry( responseData.lovValues[ lovValue ], propertyType, lovValueProp,
                lovDescProp ) );
        }
    }
    // push the moreValuesExist to the lovEntries. if it is true, then call getNextValues ; else not call getNextValues
    if( responseData.moreValuesExist ) {
        lovEntries.moreValuesExist = responseData.moreValuesExist;
    } else {
        lovEntries.moreValuesExist = false;
    }
    return lovEntries;
};

/**
 * This operation can be invoked after selecting a value from the LOV. Use this operation to do additional
 * validation to be done on server such as validating Range value, getting the dependent properties values in
 * case of interdependent LOV (resetting the dependendent property values), Coordinated LOVs ( populating
 * dependent property values ).
 *
 * @param {LovEntry[]} lovEntries - Array of LOV values selected
 *
 * @param {viewProp} viewProp - The property being modified
 *
 * @return {String} operationName The operation being performed. e.g. Edit, Create, Revise, Save As etc
 *
 * @return {ViewModelObject} viewModelObj The object for which property is being modified
 *
 * @param {String} owningObjUid - The UID of owning object
 */
export let validateLOVValueSelections = function( lovEntries, viewProp, operationName, viewModelObj, owningObjUid ) {
    var viewObject = viewModelObj;
    var contextObject = appCtxService.getCtx( 'InitialLovDataAdditionalProps' );
    var tablePropObject = appCtxService.getCtx( 'InitialSaveDataAdditionalProps' );

    assert( viewObject, 'LOV property: Missing parent viewObject on viewProp: ' + viewProp.name );

    var lovValueProp = null;
    if( viewProp.lovApi.result ) {
        lovValueProp = viewProp.lovApi.result.behaviorData.columnNames.lovValueProp;
    }
    var propName = uwPropertyService.getBasePropertyName( viewProp.propertyName );

    var objName = viewProp.srcObjectTypeName || viewObject.modelType.owningType || viewObject.modelType.name;

    var serviceInput = {};

    var sourceObjectUid = uwPropertyService.getSourceObjectUid( viewProp );

    var owningObjectUid = owningObjUid || sourceObjectUid;
    var modelObject = clientDataModel.getObject( owningObjectUid );
    if( !modelObject ) {
        owningObjectUid = clientDataModel.NULL_UID;
    }

    serviceInput.lovInput = {
        owningObject: {
            uid: owningObjectUid,
            type: owningObjUid || sourceObjectUid ? objName : viewObject.type
        },
        operationName: operationName,
        boName: objName,
        propertyValues: {}
    };

    serviceInput.propName = propName;
    serviceInput.uidOfSelectedRows = [];
    serviceInput.lovInput.propertyValues[ propName ] = [];

    if( viewProp.isArray && viewProp.dbValues ) {
        _.forEach( viewProp.dbValues, function( val ) {
            if( val ) {
                serviceInput.lovInput.propertyValues[ propName ].push( val );
            }
        } );
    }

    // First add all the selected LOV entries
    for( var ii = 0; ii < lovEntries.length; ii++ ) {
        // account for simplified lov format
        if( 'propInternalValue' in lovEntries[ ii ] ) {
            serviceInput.lovInput.propertyValues[ propName ]
                .push( String( lovEntries[ ii ].propInternalValue !== null ? lovEntries[ ii ].propInternalValue :
                    '' ) );
        } else if( lovValueProp && lovEntries[ ii ].lovRowValue ) {
            serviceInput.lovInput.propertyValues[ propName ]
                .push( String( lovEntries[ ii ].lovRowValue.propInternalValues[ lovValueProp ][ 0 ] ) );
        }
        //append selected row uid to fix dynamic LOV defect LCS-351651
        if( lovEntries[ ii ].lovRowValue && !_.isEmpty( lovEntries[ ii ].lovRowValue.uid ) ) {
            serviceInput.uidOfSelectedRows.push( String( lovEntries[ ii ].lovRowValue.uid ) );
        }
    }

    // Now populate all the other modified properties.
    // var modifiedProps = _.union( viewObject.getSaveableDirtyProps(), viewObject.getAutoAssignableProps() );
    var modifiedProps = viewObject.getSaveableDirtyProps();
    if( modifiedProps && modifiedProps.length > 0 ) {
        for( var prop in modifiedProps ) {
            if( modifiedProps.hasOwnProperty( prop ) ) {
                var modifiedPropName = uwPropertyService.getBasePropertyName( modifiedProps[ prop ].name );
                if( modifiedPropName !== propName ) {
                    serviceInput.lovInput.propertyValues[ modifiedPropName ] = modifiedProps[ prop ].values;
                }
            }
        }
    }

    if( tablePropObject ) {
        _.forEach( tablePropObject, function( value, key ) {
            delete serviceInput.lovInput.propertyValues[ key ];
        } );
    }

    if( contextObject ) {
        for( var addProp in contextObject ) {
            serviceInput.lovInput.propertyValues[ addProp ] = [ contextObject[ addProp ] ];
        }
    }

    var deferred = AwPromiseService.instance.defer();

    soaSvc.post( 'Core-2013-05-LOV', 'validateLOVValueSelections', serviceInput ).then(
        function( responseData ) {
            var validationResult = new LOVDataValidationResult();

            validationResult.setValid( responseData.propHasValidValues );
            validationResult.setViewModelObject( viewModelObj );

            var updatedValues = responseData.updatedPropValues;

            for( var propName in responseData.dependentPropNames ) {
                if( responseData.dependentPropNames.hasOwnProperty( propName ) ) {
                    var prop = responseData.dependentPropNames[ propName ];
                    if( updatedValues.propInternalValues.hasOwnProperty( prop ) ) {
                        validationResult.addUpdatedPropertyValue( prop, updatedValues.propInternalValues[ prop ],
                            updatedValues.propDisplayValues[ prop ] );
                    }
                }
            }

            deferred.resolve( validationResult );
        },
        function( error ) {
            deferred.reject( error );
        } );

    return deferred.promise;
};

/**
 * Converts operation names to camel case.
 *
 * @param {String} operationName The operation being performed. e.g. Edit, Create, Revise, Save As etc.
 *
 * @return {String} operationName The operation formatted into camelCase.
 *
 */
export let formatOperationName = function( operationName ) {
    if( operationName.toUpperCase() === 'EDIT' ) {
        operationName = 'Edit';
    } else if( operationName.toUpperCase() === 'CREATE' ) {
        operationName = 'Create';
    } else if( operationName.toUpperCase() === 'REVISE' ) {
        operationName = 'Revise';
    } else if( operationName.toUpperCase() === 'SAVEAS' ) {
        operationName = 'SaveAs';
    }
    return operationName;
};

exports = {
    initNativeCellLovApi,
    getInitialValues,
    getNextValues,
    createLOVEntries,
    validateLOVValueSelections,
    formatOperationName
};
export default exports;

/**
 * Used for LOV service
 *
 * @memberof NgServices
 * @member lovService
 */
app.factory( 'lovService', () => exports );
