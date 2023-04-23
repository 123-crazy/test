// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This is the declarative Requirement Management Compare Text page occurrence.
 *
 * @module js/declarativeRequirementManagementMultiSelectCompareText.occMgmtPageKey
 */

'use strict';

var contribution = {
    label: {
        source: '/i18n/RequirementsCommandPanelsMessages',
        key: 'arm0CompareText'
    },
    priority: 100,
    pageNameToken: 'multiSelectCompareText',
    condition: function( selection ) {
        var requirementTypesToCheck = [ 'Arm0RequirementElement', 'Arm0ParagraphElement' ];
        var requirementSpecsTypesToCheck = [ 'Arm0RequirementSpecElement' ];
        var typesToCheck = requirementTypesToCheck.concat( requirementSpecsTypesToCheck );
        var isValid = true;
        if ( selection.length === 2 ) {
            for( let i = 0; i < selection.length; i++ ) {
                if( !typesToCheck.some( value => selection[i].modelType.typeHierarchyArray.includes( value ) ) ) {
                    isValid = false;
                    break;
                }
            }
            if( !isValid ) {
                for( let i = 0; i < selection.length; i++ ) {
                    if( !requirementSpecsTypesToCheck.some( value => selection[i].modelType.typeHierarchyArray.includes( value ) ) ) {
                        isValid = false;
                        break;
                    } else {
                        isValid = true;
                    }
                }
            }
            return isValid;
        }
            return false;
    }
};


/**
 *  Checks if valid object type
 *
 * @param {String} key - 
 * @param {Promise} deferred - 
 */
export default function( key, deferred ) {
    if( key === 'occMgmtPageKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
