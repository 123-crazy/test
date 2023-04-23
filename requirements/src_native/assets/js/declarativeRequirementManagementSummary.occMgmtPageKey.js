// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the declarative Requirement occ mgmt page contribution.
 *
 * @module js/declarativeRequirementManagementSummary.occMgmtPageKey
 */

import _appCtxService from 'js/appCtxService';
import _cdm from 'soa/kernel/clientDataModel';

'use strict';

var contribution = {
    label: {
        source: '/i18n/RequirementsCommandPanelsMessages',
        key: 'documentationTitle'
    },
    id: 'tc_xrt_Documentation',
    priority: 3,
    pageNameToken: 'Arm0RequirementDocumentationACEEditor',
    condition: function( selection ) {
        var isValidSelection = false;

        if( !( _appCtxService.ctx.splitView && _appCtxService.ctx.splitView.mode ) ) {
            for( let i = 0; i < selection.length; i++ ) {
                var obj = selection[ i ];
                var typesToCheck = null;
                if( _appCtxService && _appCtxService.ctx && _appCtxService.ctx.preferences && _appCtxService.ctx.preferences.AWC_show_documentation_tab_for_types ) {
                    var revObject = null;
                    typesToCheck = _appCtxService.ctx.preferences.AWC_show_documentation_tab_for_types;
                    if( obj.props && obj.props.awb0UnderlyingObject && obj.props.awb0UnderlyingObject.dbValues[ 0 ] ) {
                        revObject = _cdm.getObject( obj.props.awb0UnderlyingObject.dbValues[ 0 ] );
                        isValidSelection = isValidObjectType( revObject, typesToCheck );
                        continue;
                    }
                    isValidSelection = isValidObjectType( obj, typesToCheck );
                    continue;
                }
                typesToCheck = [ 'Arm0RequirementSpecElement', 'Arm0RequirementElement', 'Arm0ParagraphElement' ];
                isValidSelection = isValidObjectType( obj, typesToCheck );
                if( !isValidSelection ) {
                    break;
                }
            }
        }
        return isValidSelection;
    }
};

/**
 *  Checks if valid object type
 *
 * @param {Object} object - object to be validate
 * @param {Array} typesToCheck - array of types of objects allowed to show
 * @returns {Boolean} if valid object type or not
 */
function isValidObjectType( object, typesToCheck ) {
    for( var i = 0; i < typesToCheck.length; i++ ) {
        if( object.modelType.typeHierarchyArray.indexOf( typesToCheck[ i ] ) > -1 ) {
            return true;
        }
    }
    return false;
}

export default function( key, deferred ) {
    if( key === 'occMgmtPageKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
