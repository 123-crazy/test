// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is a utility to format the classification LOVs to be compatible with the AW LOV widgets
 *
 * @module js/classifyLOVService
 */
import app from 'app';
import soaService from 'soa/kernel/soaService';
import uwPropertyService from 'js/uwPropertyService';
import _ from 'lodash';

var exports = {};

// Global map for viewProps for interdependent keyLOV attributes
var viewPropMap = {};

// Global 'const' variable definitions (Javascript doesn't support const keyword everywhere yet)
var KL_HASH_STR = '#';
var KL_SUBMENU_START = '#>';
var KL_SUBMENU_END = '#<';

/**
 * Creates a new classification LOV api given an attribute ID
 *
 * @param {String} classId - The selected class ID
 * @param {String} attributeId - the attribute ID to get the LOV API for.
 * @param {Object} keyLOVDefinition - The KeyLOV definition object
 * @param {Boolean} isInterDependentKeyLOV - true if the keyLOV attribute is an interdependent KeyLOV
 * @param {Object} dependentAttributeIds - the list of dependent attribute IDs
 * @param {Object} viewProp the current viewProp object
 * @returns {Object} the LOVApi object
 */
function ClsLovApi( data, classID, attributeID, keyLOVDefinition, isInterDependentKeyLOV, dependentAttributeIds,
    viewProp ) {
    if( !classID || classID.length < 1 ) {
        throw 'Invalid Class ID.';
    }
    if( !attributeID || attributeID.length < 1 ) {
        throw 'Invalid attribute ID.';
    }
    if( !keyLOVDefinition ) {
        throw 'Invalid keyLOV info.';
    }

    this.classID = classID;
    this.attrID = attributeID;
    this.type = 'static';
    this.klEntries = [];
    this.keyLOVDefinition = keyLOVDefinition;
    this.isInterDependentKeyLOV = isInterDependentKeyLOV;
    this.dependentAttributeIds = dependentAttributeIds;

    //below assignment is necessary to make call to SOA
    if( dependentAttributeIds !== undefined ) {
        this.dependentAttributeIdsLength = dependentAttributeIds.length;
    }

    if( keyLOVDefinition && keyLOVDefinition.keyLOVEntries ) {
        var lovSvc = this;

        if( isInterDependentKeyLOV ) {

            var klEntries = keyLOVDefinition.keyLOVEntries;
            lovSvc.klEntries = exports.buildingKeyLOVEntries( klEntries, keyLOVDefinition );

        } else {
            var recursionHelperIndexObject = {
                newIndex: 0
            };

            lovSvc.klEntries = exports.processKeyLOVEntriesForLOVApi( keyLOVDefinition, 0,
                recursionHelperIndexObject );
        }
    }

    if( viewProp ) {
        viewPropMap[ attributeID ] = viewProp;
    }

    if( viewProp && viewProp.dbValue !== null && viewProp.dbValue[ 0 ] ) {
        var depAttrValues = [];
        _.forEach( this.dependentAttributeIds, function( entry ) {
            if( entry ) {
                var viewPropForDepAttribute = viewPropMap[ entry ];
                if( viewPropForDepAttribute ) {
                    var selValue = '';
                    if( viewPropForDepAttribute.dbValue && viewPropForDepAttribute.dbValue.length > 0 ) {
                        selValue = viewPropForDepAttribute.dbValue;
                    }

                    if( _.isArray( viewPropForDepAttribute.dbValue ) ) {
                        selValue = viewPropForDepAttribute.dbValue[ 0 ];
                    } else {
                        selValue = viewPropForDepAttribute.dbValue;
                    }
                    depAttrValues.push( new DepAttrValues( exports
                        .getAttributeIntegerFromString( viewPropForDepAttribute.attributeId ), selValue ) );
                }
            }
        } );

        if( data.dependentAttributeIdsLength === dependentAttributeIds.length ) {
            data.dAttributeStruct.push( {
                classID: lovSvc.classID,
                selectedAttributeID: lovSvc.attrID,
                selectedValue: viewProp.dbValue[ 0 ],
                attributeValues: depAttrValues
            } );

            exports.getKeyLOVsForDependentAttributes(data.dAttributeStruct);
        } else {
            data.dAttributeStruct.push( {
                classID: lovSvc.classID,
                selectedAttributeID: lovSvc.attrID,
                selectedValue: viewProp.dbValue[ 0 ],
                attributeValues: depAttrValues
            } );
        }
    }
}

export let getKeyLOVsForDependentAttributes = function( depAttrStruct ){
    soaService.post( 'Classification-2015-03-Classification', 'getKeyLOVsForDependentAttributes', {
        dependencyAttributeStruct: depAttrStruct
    } ).then( function( response ) {
        exports.getResponse( response );
    } ); // End of SOA service call
};

/**
 * Validates if the input is a valid KeyLOV Submenu start indicator
 *
 * @param {String} keyString - the input key.
 * @returns {bool} true if input string is "#>", false otherwise
 */
export let isSubmenuStart = function( keyString ) {
    if( keyString === KL_SUBMENU_START ) {
        return true;
    }
    return false;
};

/**
 * Validates if the input is a valid KeyLOV Submenu end indicator
 *
 * @param {String} keyString - the input key.
 * @returns {bool} true if input string is "#<", false otherwise
 */
export let isSubmenuEnd = function( keyString ) {
    if( keyString === KL_SUBMENU_END ) {
        return true;
    }
    return false;
};

/**
 * Validates if the input is a valid KeyLOV Submenu start indicator
 *
 * @param {Object} keyLOVDefinition - the keyLOVDefinition object.
 * @param {Integer} indexOfKLEntryToBeProcessed - the index of the KeyLOV entry to be processed from the
 *            keyLOVEntries array
 * @param {Object} recursionHelperIndexObject - the output object containing next index of the KeyLOV entry to
 *            be processed from the keyLOVEntries array when the recursively called function returns back to the
 *            original call.
 * @returns {ObjectArray} the array of processed KeyLOV entry Objects which could directly be used by ClsLOVApi;
 */
export let processKeyLOVEntriesForLOVApi = function( keyLOVDefinition, indexOfKLEntryToBeProcessed,
    recursionHelperIndexObject ) {
    var subMenuObjects = [];

    if( keyLOVDefinition && keyLOVDefinition.keyLOVEntries ) {
        var localIndex = 0;
        for( ; localIndex < keyLOVDefinition.keyLOVEntries.length; localIndex++ ) {
            if( indexOfKLEntryToBeProcessed > localIndex ) {
                continue;
            }
            var keyLOVEntry = keyLOVDefinition.keyLOVEntries[ localIndex ];
            var subStr = keyLOVEntry.keyLOVkey.substring( 0, 2 );
            if( exports.isSubmenuStart( subStr ) ) {
                var subMenuObject = {};
                // For Submenus, do not display the key, just the value
                subMenuObject.propDisplayValue = keyLOVEntry.keyLOVValue;
                subMenuObject.propInternalValue = keyLOVEntry.keyLOVkey;
                subMenuObject.propDisplayDescription = '';
                subMenuObject.sel = false;
                subMenuObject.hasChildren = true;

                // increment the indexOfKLEntryToBeProcessed
                indexOfKLEntryToBeProcessed = localIndex + 1;
                // Get the children by recursing
                subMenuObject.children = exports.processKeyLOVEntriesForLOVApi( keyLOVDefinition,
                    indexOfKLEntryToBeProcessed, recursionHelperIndexObject );

                indexOfKLEntryToBeProcessed = recursionHelperIndexObject.newIndex;

                // Add the SubMenus as children
                subMenuObjects.push( subMenuObject );
            } else if( exports.isSubmenuEnd( subStr ) ) {
                indexOfKLEntryToBeProcessed = localIndex + 1;
                break;
            } else {
                // Regular entry
                var subMenuRegObject = {};
                subMenuRegObject.propDisplayValue = keyLOVDefinition.keyLOVOptions === 1 ? keyLOVEntry.keyLOVValue :
                    keyLOVEntry.keyLOVkey + ' ' + keyLOVEntry.keyLOVValue;
                subMenuRegObject.propInternalValue = keyLOVEntry.keyLOVkey;
                subMenuRegObject.propDisplayDescription = '';
                subMenuRegObject.hasChildren = false;
                subMenuRegObject.children = {};
                subMenuRegObject.sel = false;
                subMenuObjects.push( subMenuRegObject );
            }
        }
        recursionHelperIndexObject.newIndex = localIndex + 1;
    }
    return subMenuObjects;
};

/**
 * Gets the initial values for the LOV
 *
 * @param {String} filterStr - the filter string
 * @param {Object} deferred - the deferred to be resolved with the entries.
 * @param {String} name - the name
 */
ClsLovApi.prototype.getInitialValues = function( filterStr, deferred, name ) {
     return deferred.resolve( this.klEntries );
};

/**
 * Gets the initial values for the LOV After Clear All
 *
 * @param {String} filterStr - the filter string
 * @param {Object} deferred - the deferred to be resolved with the entries.
 * @param {String} name - the name
 */
ClsLovApi.prototype.getInitialValuesAfterClearAll = function( filterStr, deferred, name ) {

    var buildLOV = this;
    var keyLOVDefinition = this.keyLOVDefinition;
    var klEntries = this.keyLOVDefinition.keyLOVEntries;
    buildLOV.klEntries = [];
    var recursionHelperIndexObject = {
        newIndex: 0
    };
    buildLOV.klEntries= exports.buildingKeyLOVEntries( klEntries, keyLOVDefinition );
    buildLOV.klEntries = exports.processKeyLOVEntriesForLOVApi( keyLOVDefinition, 0,
        recursionHelperIndexObject );
    return deferred.resolve( buildLOV );
};

export let buildingKeyLOVEntries = function( klEntries, keyLOVDefinition ) {
    var keyEntries = klEntries;
    var buildLOV = [];

    _.forEach( keyEntries, function( entry ) {
        buildLOV.push( {
            propDisplayValue: keyLOVDefinition.keyLOVOptions === 1 ? entry.keyLOVValue : entry.keyLOVkey + ' ' + entry.keyLOVValue,
            propInternalValue: entry.keyLOVkey,
            propDisplayDescription: '',
            hasChildren: false,
            children: {},
            sel: false
        } );
    } );

    return buildLOV;
};

/**
 * Gets the initial values for the LOV
 *
 * @param {String} filterStr - the filter string
 * @param {Object} deferred - the deferred to be resolved with the entries.
 * @param {String} name - the name
 */
ClsLovApi.prototype.getInitialValuesLOV = function( filterStr, deferred, name ) {
    return deferred.resolve( this.keyLOVDefinition.klEntries.keyLOVEntries );
};

/**
 * gets the next values for the LOV. The classification SOAs do not support paging currently, so resolve the
 * promise to null.
 *
 * @param {Object} promise - to be resolved with the next value of the LOV
 */
ClsLovApi.prototype.getNextValues = function( promise ) {
    //Classification LOVs do not support paging.
    promise.resolve( null );
};

/**
 * Helper function
 *
 * @param {String} attrID the Attribute ID
 * @param {String} selectedValue the selected value
 */
function DepAttrValues( attrID, selectedValue ) {
    this.attributeID = attrID;
    this.value = selectedValue;
}

/**
 * Validates the LOV selection. Because this is a static LOV, there is no validation.
 *
 * @param {Object} values - the value to validate.
 */
ClsLovApi.prototype.validateLOVValueSelections = function( values ) {
    var lovSvc = this;
    if( lovSvc.isInterDependentKeyLOV && values ) {
        // Set the currently selected value
        uwPropertyService.setValue( viewPropMap[ lovSvc.attrID ], values[ 0 ].propInternalValue );

        // Prior to making the SOA call, we need to get the Dependent attributes' selected Keys to pass to the SOA.
        var depAttrValues = [];
        _.forEach( this.dependentAttributeIds, function( entry ) {
            if( entry ) {
                var viewPropForDepAttribute = viewPropMap[ entry ];
                if( viewPropForDepAttribute ) {
                    var selValue = '';
                    if( viewPropForDepAttribute.dbValue && viewPropForDepAttribute.dbValue.length > 0 ) {
                        if( _.isArray( viewPropForDepAttribute.dbValue ) ) {
                            selValue = viewPropForDepAttribute.dbValue[ 0 ];
                        } else {
                            selValue = viewPropForDepAttribute.dbValue;
                        }
                    }
                    //We currently need to transform these IDs into an int, this will need to be changed in future
                    depAttrValues.push( new DepAttrValues( exports
                        .getAttributeIntegerFromString( viewPropForDepAttribute.attributeId ), selValue ) );
                }
            }
        } );

        // Call getKeyLOVsForDependentAttributes to get the dependent attributes' info, so that the UI could be updated accordingly
        soaService.post( 'Classification-2015-03-Classification', 'getKeyLOVsForDependentAttributes', {
            dependencyAttributeStruct: [ {
                classID: lovSvc.classID,
                selectedAttributeID: lovSvc.attrID,
                selectedValue: values[ 0 ].propInternalValue,
                attributeValues: depAttrValues
            } ]

        } ).then( function( response ) {
            exports.getResponse( response );
        } ); // End of SOA service call
    }

    return false;
};

/**
 * function to process the response
 *
 * @param {Object} response
 */
export let getResponse = function( response ) {
    if( response ) {
        if( response.partialErrors || response.PartialErrors ) {
            throw exports.createError( response );
        }

        if( response.ServiceData && response.ServiceData.partialErrors ) {
            throw exports.createError( response.ServiceData );
        }

        if( response.dependencyKeyLOVs ) {
            // Loop on each dependent KL Attribute response object.
            _
                .forEach(
                    response.dependencyKeyLOVs,
                    function( depKLEntryFromResp ) {
                        // Clearing off the Earlier selected values
                        if( !depKLEntryFromResp.selectedKeys[ 0 ] ||
                            depKLEntryFromResp.keyLOVDefinition.keyLovEntries.length === 0 ) {
                            viewPropMap[ depKLEntryFromResp.attributeID ].uiValue = '';
                            uwPropertyService.setValue( viewPropMap[ depKLEntryFromResp.attributeID ], '' );
                        }

                        // For the current Attribute ID, populate klEntries and set the 'sel'=true for the entry matching the entry.selectedKeys[0];
                        var depKLEntries = [];
                        _
                            .forEach(
                                depKLEntryFromResp.keyLOVDefinition.keyLovEntries,
                                function( entry ) {
                                    // First, update the selected Key for this dependent attribute
                                    if( entry.lovKey === depKLEntryFromResp.selectedKeys[ 0 ] ) {
                                        viewPropMap[ depKLEntryFromResp.attributeID ].uiValue = depKLEntryFromResp.keyLOVDefinition.options === 1 ? entry.lovValue :
                                            entry.lovKey + ' ' + entry.lovValue;
                                        uwPropertyService.setValue( viewPropMap[ depKLEntryFromResp.attributeID ],

                                            entry.lovKey );
                                    }

                                    var subStr = entry.lovKey.substring( 0, 1 );
                                    if( subStr !== KL_HASH_STR ) {
                                        depKLEntries
                                            .push( {
                                                propDisplayValue: depKLEntryFromResp.keyLOVDefinition.options === 1 ? entry.lovValue : entry.lovKey + ' ' + entry.lovValue,
                                                propInternalValue: entry.lovKey,
                                                propDisplayDescription: '',
                                                hasChildren: false,
                                                children: {},
                                                sel: entry.lovKey === depKLEntryFromResp.selectedKeys[ 0 ]
                                            } );
                                    }
                                } ); // End of forEach
                        // Set the newly found klEntries to the existing viewProp in the map
                        viewPropMap[ depKLEntryFromResp.attributeID ].lovApi.klEntries = depKLEntries;
                    } ); //End of _forEach
        }
    }
};

/**
 * Return lovEntry for the provided filter text if found else return null.
 *
 * @param {String} filter text.
 * @return {Object} lovEntry
 */
ClsLovApi.prototype.retrieveLovEntry = function( lovEntries, filterText ) {
    var lovEntry = null;
    for( var i = 0; i < lovEntries.length; i++ ) {
        if( lovEntries[ i ].propInternalValue === filterText ) {
            lovEntry = lovEntries[ i ];
            break;
        }
    }
    return lovEntry;
};

/**
 * Creates a new classification LOV api given an attribute ID
 *
 * @param {Object} data - Parent DeclviewModel
 * @param {String} classId - The selected class ID
 * @param {String} attributeId - the attribute ID to get the LOV API for.
 * @param {Object} keyLOVDefinition - The KeyLOV definition object
 * @param {Boolean} isInterDependentKeyLOV - true if the keyLOV attribute is an interdependent KeyLOV
 * @param {Object} dependentAttributeIds - the list of dependent attribute IDs
 * @param {Object} viewProp the current viewProp object
 */
export let getLOVApi = function( data, classId, attributeId, keyLOVDefinition, isInterDependentKeyLOV,
    dependentAttributeIds, viewProp ) {

    return new ClsLovApi( data, classId, attributeId, keyLOVDefinition, isInterDependentKeyLOV,
        dependentAttributeIds, viewProp );
};

/**
 * Returns an integer of a string attribute id by removing the prefix from the beginning of it, if has one
 *
 * @param {String} attributeId - The string attributeId to convert to integer
 */
export let getAttributeIntegerFromString = function( attributeId ) {
    var attrIdInt = 0;
    var tempAttributeId = attributeId;

    var prefix = attributeId.substring( 0, 4 );
    if( prefix === 'sml0' ) {
        tempAttributeId = tempAttributeId.substring( 4 );
    }
    attrIdInt = parseInt( tempAttributeId );
    return attrIdInt;
};

/**
 * Returns true if a passed in attribute is a keylov
 *
 * @param {Object} data the data global variable
 * @param {Object} attribute - The attribute
 * @param {Object} currentUnitSystem - The unit system object of attribute
 * @param {String} metricKeyLovIrdi - The string irdi of attribute, if the unit system is metric. Only used for
 *            CST KeyLOVs.
 * @param {String} nonMetricKeyLovIrdi - The string irdi of attribute, if the unit system is non-metric. Only
 *            used for CST KeyLOVs.
 */
export let isKeyLov = function( data, attribute, currentUnitSystem, metricKeyLovIrdi, nonMetricKeyLovIrdi ) {
    var isKeyLov = false;
    if( currentUnitSystem.formatDefinition.formatType === -1 ||
        metricKeyLovIrdi && metricKeyLovIrdi !== '' || nonMetricKeyLovIrdi && metricKeyLovIrdi !== '' ) {
        isKeyLov = true;
    }

    return isKeyLov;
};

/**
 * Returns the keylov id of an attribute
 *
 * @param {Object} data the data global variable
 * @param {Object} attribute - The attribute
 * @param {Object} attrDefn - attribute definition
 * @param {Boolean} isMetric - True if the current unitsystem in panel is metric, false if it is non-metric
 */
export let getKeyLOVID = function( data, attribute, attrDefn, isMetric ) {
    var KeyLOVID = null;
    var metricKeyLovIrdi = attrDefn.metricKeyLovIrdi;
    var nonMetricKeyLovIrdi = attrDefn.nonMetricKeyLovIrdi;
    var unitSystem = attrDefn.unitSystem;
    if( metricKeyLovIrdi && metricKeyLovIrdi !== '' || nonMetricKeyLovIrdi && metricKeyLovIrdi !== '' ) {
        if( isMetric || attrDefn.attrType === 'STRING' ) {
            KeyLOVID = metricKeyLovIrdi;
        } else {
            KeyLOVID = nonMetricKeyLovIrdi;
        }
    } else {
        KeyLOVID = unitSystem.formatDefinition.formatLength;
    }
    return KeyLOVID;
};

export default exports = {
    isSubmenuStart,
    isSubmenuEnd,
    processKeyLOVEntriesForLOVApi,
    buildingKeyLOVEntries,
    getResponse,
    getLOVApi,
    getAttributeIntegerFromString,
    isKeyLov,
    getKeyLOVID,
    getKeyLOVsForDependentAttributes
};
/**
 * Classification LOV service
 *
 * @memberof NgServices
 * @member classifyLOVService
 */
app.factory( 'classifyLOVService', () => exports );
